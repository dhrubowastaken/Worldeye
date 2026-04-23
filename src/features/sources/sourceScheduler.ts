import {
  buildSourceHealth,
  emptySourceResult,
} from '@/features/sources/sourceCore';
import type {
  SourceDefinition,
  SourceFetchContext,
  SourceFetcher,
  SourceResult,
} from '@/features/sources/types';

interface SchedulerOptions {
  now?: () => number;
}

interface SourceState {
  inFlight?: {
    queryKey: string;
    promise: Promise<SourceResult>;
  };
  lastFetchedAt?: number;
  lastQueryKey?: string;
  lastResult?: SourceResult;
  lastGoodResult?: SourceResult;
}

export class SourceScheduler {
  private readonly now: () => number;
  private readonly state = new Map<string, SourceState>();

  constructor(options: SchedulerOptions = {}) {
    this.now = options.now ?? (() => Date.now());
  }

  fetch(
    definition: SourceDefinition,
    context: SourceFetchContext,
    fetcher: SourceFetcher,
  ): Promise<SourceResult> {
    const currentState = this.state.get(definition.id) ?? {};
    const timestamp = this.now();

    if (
      currentState.inFlight &&
      currentState.inFlight.queryKey === context.queryKey
    ) {
      return currentState.inFlight.promise;
    }

    if (
      currentState.lastResult &&
      currentState.lastQueryKey === context.queryKey &&
      typeof currentState.lastFetchedAt === 'number' &&
      timestamp - currentState.lastFetchedAt < definition.cadenceMs
    ) {
      return Promise.resolve(currentState.lastResult);
    }

    const promise = this.runWithTimeout(definition, context, fetcher)
      .then((result) => {
        const mergedResult = this.mergeWithLastGood(result, currentState.lastGoodResult);
        this.state.set(definition.id, {
          lastFetchedAt: this.now(),
          lastQueryKey: context.queryKey,
          lastResult: mergedResult,
          lastGoodResult:
            result.health.status === 'ready'
              ? result
              : currentState.lastGoodResult,
        });
        return mergedResult;
      })
      .catch((error: unknown) => {
        const result = emptySourceResult(
          definition,
          'error',
          `${definition.label} request failed`,
          error instanceof Error ? error.message : String(error),
        );
        this.state.set(definition.id, {
          lastFetchedAt: this.now(),
          lastQueryKey: context.queryKey,
          lastResult: result,
          lastGoodResult: currentState.lastGoodResult,
        });
        return this.mergeWithLastGood(result, currentState.lastGoodResult);
      });

    this.state.set(definition.id, {
      ...currentState,
      inFlight: {
        queryKey: context.queryKey,
        promise,
      },
    });

    return promise;
  }

  clear(sourceId?: string): void {
    if (sourceId) {
      this.state.delete(sourceId);
      return;
    }

    this.state.clear();
  }

  private runWithTimeout(
    definition: SourceDefinition,
    context: SourceFetchContext,
    fetcher: SourceFetcher,
  ): Promise<SourceResult> {
    return new Promise((resolve) => {
      const controller = new AbortController();
      const parentSignal = context.signal;
      const abort = () => controller.abort();
      parentSignal?.addEventListener('abort', abort, { once: true });

      const timer = setTimeout(() => {
        controller.abort();
        resolve({
          ...emptySourceResult(
            definition,
            'timeout',
            `${definition.label} timed out`,
          ),
          health: buildSourceHealth(
            definition,
            'timeout',
            `${definition.label} timed out`,
          ),
        });
      }, definition.timeoutMs);

      fetcher(definition, {
        ...context,
        signal: controller.signal,
      })
        .then((result) => resolve(result))
        .catch((error: unknown) => {
          resolve(
            emptySourceResult(
              definition,
              controller.signal.aborted ? 'timeout' : 'degraded',
              controller.signal.aborted
                ? `${definition.label} timed out`
                : `${definition.label} degraded`,
              error instanceof Error ? error.message : String(error),
            ),
          );
        })
        .finally(() => {
          clearTimeout(timer);
          parentSignal?.removeEventListener('abort', abort);
        });
    });
  }

  private mergeWithLastGood(
    result: SourceResult,
    lastGoodResult?: SourceResult,
  ): SourceResult {
    if (
      result.health.status === 'ready' ||
      result.entities.length > 0 ||
      !lastGoodResult ||
      lastGoodResult.entities.length === 0
    ) {
      return result;
    }

    return {
      ...result,
      entities: lastGoodResult.entities.map((entity) => ({
        ...entity,
        freshness: {
          ...entity.freshness,
          stale: true,
        },
      })),
      indicators: lastGoodResult.indicators,
      warnings: [
        ...result.warnings,
        'Showing the last successful in-memory snapshot while this source recovers.',
      ],
    };
  }
}
