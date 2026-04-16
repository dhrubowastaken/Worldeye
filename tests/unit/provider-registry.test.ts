import { ProviderRegistry } from '@/features/traffic/providers/providerRegistry';
import type { DataProvider, ProviderFetchResult } from '@/features/traffic/providers/types';
import type { TrackedEntity, ViewportQuery } from '@/features/traffic/types';

const emptyResult: ProviderFetchResult<TrackedEntity> = {
  entities: [],
  health: {
    providerId: 'stub',
    status: 'ready',
    summary: 'ok',
    updatedAt: '2026-04-17T00:00:00.000Z',
    retryable: true,
  },
};

function buildProvider(id: string, kind: TrackedEntity['kind']): DataProvider<TrackedEntity> {
  return {
    id,
    kind,
    capabilities: { mode: 'pull', supportsViewportQueries: true },
    async fetchSnapshot(query: ViewportQuery) {
      void query;
      return {
        ...emptyResult,
        health: {
          ...emptyResult.health,
          providerId: id,
        },
      };
    },
    teardown() {
      return undefined;
    },
  };
}

describe('ProviderRegistry', () => {
  test('registers providers and fetches snapshots for active layer kinds only', async () => {
    const registry = new ProviderRegistry();
    registry.register(buildProvider('air-provider', 'air'));
    registry.register(buildProvider('space-provider', 'space'));

    const result = await registry.fetchActiveSnapshots({
      center: [0, 0],
      zoom: 4,
      pitch: 30,
      detail: 'medium',
      key: 'query',
      bounds: { north: 1, south: -1, east: 1, west: -1 },
      visibleLayerKinds: ['space'],
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].health.providerId).toBe('space-provider');
  });

  test('reports a degraded health state when one provider throws', async () => {
    const registry = new ProviderRegistry();
    registry.register(buildProvider('air-provider', 'air'));
    registry.register({
      id: 'space-provider',
      kind: 'space',
      capabilities: { mode: 'pull', supportsViewportQueries: true },
      async fetchSnapshot() {
        throw new Error('upstream exploded');
      },
      teardown() {
        return undefined;
      },
    });

    const result = await registry.fetchActiveSnapshots({
      center: [0, 0],
      zoom: 4,
      pitch: 30,
      detail: 'medium',
      key: 'query',
      bounds: { north: 1, south: -1, east: 1, west: -1 },
      visibleLayerKinds: ['air', 'space'],
    });

    expect(result.results).toHaveLength(2);
    expect(result.results.find((entry) => entry.health.providerId === 'space-provider'))
      .toMatchObject({
        health: {
          status: 'degraded',
        },
      });
  });
});
