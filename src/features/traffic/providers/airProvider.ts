import type { TrackedEntity, ViewportQuery } from '@/features/traffic/types';
import type { DataProvider, ProviderFetchResult } from '@/features/traffic/providers/types';

const ADSB_API = '/api/adsb/v2';

interface RawAircraft {
  hex: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number;
  track?: number;
  gs?: number;
  t?: string;
  mil?: boolean;
}

interface RawAircraftResponse {
  ac?: RawAircraft[];
}

function buildHealth(
  summary: string,
  status: 'ready' | 'degraded' | 'loading' = 'ready',
): ProviderFetchResult<TrackedEntity>['health'] {
  return {
    providerId: 'air-provider',
    status,
    summary,
    updatedAt: new Date().toISOString(),
    retryable: true,
  };
}

export function normalizeAircraft(record: RawAircraft): TrackedEntity | null {
  if (typeof record.lat !== 'number' || typeof record.lon !== 'number') {
    return null;
  }

  const label = record.flight?.trim() || 'UNKNOWN';
  const isMilitary =
    Boolean(record.mil) ||
    record.t?.startsWith('F') ||
    record.t?.startsWith('C1') ||
    label.startsWith('RCH') ||
    label.startsWith('AF1');

  return {
    id: record.hex,
    kind: 'air',
    label,
    classification: {
      category: isMilitary ? 'military' : 'civilian',
      system: isMilitary
        ? 'Defense Air'
        : label !== 'UNKNOWN'
          ? label.slice(0, 3)
          : 'Commercial',
    },
    coordinates: {
      longitude: record.lon,
      latitude: record.lat,
      altitude: (record.alt_baro ?? 0) * 0.3048,
    },
    freshness: {
      updatedAt: new Date().toISOString(),
      stale: false,
    },
    providerId: 'air-provider',
    metrics: {
      heading: record.track ?? 0,
      speed: record.gs ?? 0,
    },
    metadata: {
      transponder: record.t ?? 'unknown',
    },
  };
}

function resolveRadiusNm(query: ViewportQuery): number {
  switch (query.detail) {
    case 'high':
      return 120;
    case 'medium':
      return 220;
    default:
      return 320;
  }
}

export function createAirProvider(
  fetcher: typeof fetch = fetch,
): DataProvider<TrackedEntity> {
  return {
    id: 'air-provider',
    kind: 'air',
    capabilities: {
      mode: 'pull',
      supportsViewportQueries: true,
    },
    async fetchSnapshot(
      query: ViewportQuery,
      signal?: AbortSignal,
    ): Promise<ProviderFetchResult<TrackedEntity>> {
      if (query.zoom < 3.8) {
        // Report as READY (not loading) so the loading screen doesn't block on this.
        return {
          entities: [],
          health: buildHealth('Zoom in to load live aircraft'),
        };
      }

      const [longitude, latitude] = query.center;
      const radiusNm = resolveRadiusNm(query);

      try {
        // Race with a 6-second timeout.
        const response = await Promise.race([
          fetcher(
            `${ADSB_API}/lat/${latitude.toFixed(3)}/lon/${longitude.toFixed(3)}/dist/${radiusNm}`,
            { signal },
          ),
          new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error('ADS-B fetch timeout')), 6000),
          ),
        ]);

        if (!response.ok) {
          return {
            entities: [],
            health: buildHealth('ADS-B provider unavailable', 'degraded'),
          };
        }

        const payload = (await response.json()) as RawAircraftResponse;
        const entities = (payload.ac ?? [])
          .map(normalizeAircraft)
          .filter((entity): entity is TrackedEntity => Boolean(entity));

        return {
          entities,
          health: buildHealth(`Tracking ${entities.length} aircraft`),
        };
      } catch {
        return {
          entities: [],
          health: buildHealth('ADS-B request timed out', 'degraded'),
        };
      }
    },
    teardown() {
      return undefined;
    },
  };
}
