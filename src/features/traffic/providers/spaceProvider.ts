import type { DataProvider, ProviderFetchResult } from '@/features/traffic/providers/types';
import type { TrackedEntity } from '@/features/traffic/types';
import {
  OrbitalRuntime,
  parseTleCatalog,
} from '@/features/sources/orbitalRuntime';

const runtime = new OrbitalRuntime();

export interface SpaceProvider extends DataProvider<TrackedEntity> {
  getOrbitPath(entityId: string): Array<[number, number]>;
}

export { parseTleCatalog };

export function toSpaceEntity(input: {
  name: string;
  noradId: string;
  longitude: number;
  latitude: number;
  altitude: number;
}): TrackedEntity {
  runtime.replaceCatalog(`${input.name}
1 ${input.noradId.padStart(5, '0')}U 98067A   23060.52302325  .00016717  00000-0  30164-3 0  9995
2 ${input.noradId.padStart(5, '0')}  51.6419 220.7303 0005959  51.6441  74.0537 15.49502919385203
`);
  return runtime.propagate('space.celestrak', 1)[0];
}

export function createSpaceProvider(
  fetcher: typeof fetch = fetch,
): SpaceProvider {
  return {
    id: 'space-provider',
    kind: 'space',
    capabilities: {
      mode: 'pull',
      supportsViewportQueries: true,
    },
    async fetchSnapshot(_query, signal): Promise<ProviderFetchResult<TrackedEntity>> {
      const response = await fetcher(
        '/api/celestrak/NORAD/elements/gp.php?GROUP=active&FORMAT=tle',
        { signal },
      );

      if (!response.ok) {
        return {
          entities: [],
          health: {
            providerId: 'space-provider',
            status: response.status === 403 ? 'rate_limited' : 'degraded',
            summary: 'CelesTrak GP feed unavailable',
            updatedAt: new Date().toISOString(),
            retryable: true,
          },
        };
      }

      runtime.replaceCatalog(await response.text());
      const entities = runtime.propagate('space.celestrak');

      return {
        entities,
        health: {
          providerId: 'space-provider',
          status: 'ready',
          summary: `Tracking ${entities.length} orbital objects`,
          updatedAt: new Date().toISOString(),
          retryable: true,
        },
      };
    },
    getOrbitPath(entityId: string): Array<[number, number]> {
      return runtime.getOrbitPath(entityId);
    },
    teardown() {
      runtime.replaceCatalog('');
    },
  };
}
