import type { TrackedEntity, ViewportQuery } from '@/features/traffic/types';
import type { DataProvider, ProviderFetchResult } from '@/features/traffic/providers/types';

interface RegistryFetchResult<T extends TrackedEntity> {
  results: Array<ProviderFetchResult<T>>;
}

export class ProviderRegistry<T extends TrackedEntity = TrackedEntity> {
  private readonly providers = new Map<string, DataProvider<T>>();

  register(provider: DataProvider<T>): void {
    this.providers.set(provider.id, provider);
  }

  get(providerId: string): DataProvider<T> | undefined {
    return this.providers.get(providerId);
  }

  list(): Array<DataProvider<T>> {
    return [...this.providers.values()];
  }

  async fetchActiveSnapshots(
    query: ViewportQuery,
    signal?: AbortSignal,
  ): Promise<RegistryFetchResult<T>> {
    const activeProviders = this.list().filter((provider) =>
      query.visibleLayerKinds.includes(provider.kind),
    );

    const settledResults = await Promise.allSettled(
      activeProviders.map((provider) => provider.fetchSnapshot(query, signal)),
    );

    const results = settledResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }

      const provider = activeProviders[index];

      return {
        entities: [],
        health: {
          providerId: provider.id,
          status: 'degraded' as const,
          summary: result.reason instanceof Error
            ? result.reason.message
            : 'Provider request failed',
          updatedAt: new Date().toISOString(),
          retryable: true,
        },
      };
    });

    return { results };
  }

  teardown(): void {
    this.providers.forEach((provider) => provider.teardown?.());
  }
}
