import { loadContractModule } from '../helpers/noKeyContracts';

interface SourceDefinitionContract {
  id: string;
  label: string;
  domain: string;
  auth: { type: 'none'; requiresKey: false };
  coverage: string;
  cadenceMs: number;
  attribution: string;
  termsUrl: string;
  timeoutMs: number;
  concurrency: number;
  capabilities: string[];
}

interface SourceFetchContextContract {
  queryKey: string;
  bounds: { north: number; south: number; east: number; west: number };
  center: [number, number];
  zoom: number;
}

interface SourceFetchResultContract {
  sourceId: string;
  entities: Array<{
    id: string;
    freshness?: {
      stale?: boolean;
    };
  }>;
  indicators: unknown[];
  health: {
    sourceId: string;
    status: 'ready' | 'degraded' | 'timeout' | 'loading' | 'error';
    summary: string;
    updatedAt: string;
    retryable: boolean;
  };
  warnings: string[];
  links: string[];
}

type SourceFetcher = (
  definition: SourceDefinitionContract,
  context: SourceFetchContextContract,
) => Promise<SourceFetchResultContract>;

type SourceSchedulerContract = new (options?: {
  now?: () => number;
}) => {
  fetch: (
    definition: SourceDefinitionContract,
    context: SourceFetchContextContract,
    fetcher: SourceFetcher,
  ) => Promise<SourceFetchResultContract>;
};

const definition: SourceDefinitionContract = {
  id: 'test.source',
  label: 'Test Source',
  domain: 'events',
  auth: { type: 'none', requiresKey: false },
  coverage: 'Test coverage',
  cadenceMs: 1000,
  attribution: 'Test',
  termsUrl: 'https://example.com/terms',
  timeoutMs: 500,
  concurrency: 1,
  capabilities: ['snapshot'],
};

const context: SourceFetchContextContract = {
  queryKey: 'initial',
  bounds: { north: 10, south: -10, east: 10, west: -10 },
  center: [0, 0],
  zoom: 4,
};

function loadSourceScheduler(): SourceSchedulerContract {
  const { SourceScheduler } = loadContractModule<{
    SourceScheduler: SourceSchedulerContract;
  }>('@/features/sources/sourceScheduler');

  return SourceScheduler;
}

function buildResult(summary: string): SourceFetchResultContract {
  return {
    sourceId: definition.id,
    entities: [],
    indicators: [],
    health: {
      sourceId: definition.id,
      status: 'ready',
      summary,
      updatedAt: '2026-04-22T00:00:00.000Z',
      retryable: true,
    },
    warnings: [],
    links: [],
  };
}

function buildResultWithEntities(
  summary: string,
  status: SourceFetchResultContract['health']['status'],
  entities: SourceFetchResultContract['entities'],
): SourceFetchResultContract {
  return {
    sourceId: definition.id,
    entities,
    indicators: [],
    health: {
      sourceId: definition.id,
      status,
      summary,
      updatedAt: '2026-04-22T00:00:00.000Z',
      retryable: true,
    },
    warnings: [],
    links: [],
  };
}

describe('SourceScheduler', () => {
  test('dedupes in-flight fetches for the same source and query', async () => {
    const SourceScheduler = loadSourceScheduler();
    const scheduler = new SourceScheduler({ now: () => 0 });
    const fetcher = jest.fn(async () => buildResult('fresh'));

    const first = scheduler.fetch(definition, context, fetcher);
    const second = scheduler.fetch(definition, context, fetcher);

    await expect(first).resolves.toMatchObject({ health: { summary: 'fresh' } });
    await expect(second).resolves.toMatchObject({ health: { summary: 'fresh' } });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test('reuses only fresh in-memory results for the same source and query key', async () => {
    const SourceScheduler = loadSourceScheduler();
    let now = 0;
    const scheduler = new SourceScheduler({ now: () => now });
    const fetcher = jest
      .fn<ReturnType<SourceFetcher>, Parameters<SourceFetcher>>()
      .mockResolvedValueOnce(buildResult('first'))
      .mockResolvedValueOnce(buildResult('second'))
      .mockResolvedValueOnce(buildResult('third'));

    await expect(scheduler.fetch(definition, context, fetcher)).resolves.toMatchObject({
      health: { summary: 'first' },
    });

    now = 500;
    await expect(scheduler.fetch(definition, context, fetcher)).resolves.toMatchObject({
      health: { summary: 'first' },
    });

    await expect(
      scheduler.fetch(definition, { ...context, queryKey: 'moved' }, fetcher),
    ).resolves.toMatchObject({ health: { summary: 'second' } });

    now = 1500;
    await expect(scheduler.fetch(definition, context, fetcher)).resolves.toMatchObject({
      health: { summary: 'third' },
    });

    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  test('returns timeout health when a source exceeds its timeout budget', async () => {
    jest.useFakeTimers();

    try {
      const SourceScheduler = loadSourceScheduler();
      const scheduler = new SourceScheduler({ now: () => 0 });
      const fetcher = jest.fn(
        () =>
          new Promise<SourceFetchResultContract>(() => {
            return undefined;
          }),
      );

      const result = scheduler.fetch(definition, context, fetcher);
      await jest.advanceTimersByTimeAsync(definition.timeoutMs + 1);

      await expect(result).resolves.toMatchObject({
        health: {
          status: 'timeout',
          sourceId: definition.id,
          retryable: true,
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  test('keeps the last good in-memory entities visible when a later refresh degrades', async () => {
    const SourceScheduler = loadSourceScheduler();
    let now = 0;
    const scheduler = new SourceScheduler({ now: () => now });
    const fetcher = jest
      .fn<ReturnType<SourceFetcher>, Parameters<SourceFetcher>>()
      .mockResolvedValueOnce(
        buildResultWithEntities('first', 'ready', [{ id: 'entity-1' }]),
      )
      .mockResolvedValueOnce(
        buildResultWithEntities('degraded', 'degraded', []),
      );

    await expect(scheduler.fetch(definition, context, fetcher)).resolves.toMatchObject({
      health: { status: 'ready' },
      entities: [{ id: 'entity-1' }],
    });

    now = 1_500;

    await expect(scheduler.fetch(definition, context, fetcher)).resolves.toMatchObject({
      health: { status: 'degraded' },
      entities: [{ id: 'entity-1', freshness: { stale: true } }],
    });
  });
});
