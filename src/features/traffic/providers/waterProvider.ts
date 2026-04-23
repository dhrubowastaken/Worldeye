import type { DataProvider, ProviderFetchResult } from '@/features/traffic/providers/types';
import type { TrackedEntity } from '@/features/traffic/types';

function health(): ProviderFetchResult<TrackedEntity>['health'] {
  return {
    providerId: 'water-provider',
    status: 'unsupported_region',
    summary: 'No verified no-key live maritime vessel source is configured.',
    updatedAt: new Date().toISOString(),
    retryable: false,
  };
}

export function normalizeAisMessage(): TrackedEntity | null {
  return null;
}

export function createWaterProvider(): DataProvider<TrackedEntity> {
  return {
    id: 'water-provider',
    kind: 'earth',
    capabilities: {
      mode: 'pull',
      supportsViewportQueries: false,
    },
    async fetchSnapshot(): Promise<ProviderFetchResult<TrackedEntity>> {
      return {
        entities: [],
        health: health(),
      };
    },
    teardown() {
      return undefined;
    },
  };
}
