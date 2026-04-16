import * as satellite from 'satellite.js';

import { classifySatellite, shortenEntityLabel } from '@/features/traffic/lib/classification';
import type { TrackedEntity } from '@/features/traffic/types';
import type { DataProvider, ProviderFetchResult } from '@/features/traffic/providers/types';

const FALLBACK_TLES = `ISS (ZARYA)
1 25544U 98067A   23060.52302325  .00016717  00000-0  30164-3 0  9995
2 25544  51.6419 220.7303 0005959  51.6441  74.0537 15.49502919385203
HUBBLE SPACE TELESCOPE
1 20580U 90037B   23060.16641204  .00001099  00000-0  48227-4 0  9997
2 20580  28.4691 140.7580 0002882 329.1765 190.1706 15.09346648430752
`;

interface SatelliteNameEntry {
  primaryName: string;
}

interface SatelliteNameCache {
  satellites: Record<string, SatelliteNameEntry>;
}

export interface ParsedTleRecord {
  name: string;
  noradId: string;
  satrec: satellite.SatRec;
}

export interface SpaceProvider extends DataProvider<TrackedEntity> {
  getOrbitPath(entityId: string): Array<[number, number]>;
}

export function extractNoradIdFromTle(tleLine1: string): string | null {
  const match = tleLine1.match(/^\s*1\s+(\d+)/);
  return match ? match[1] : null;
}

export function parseTleCatalog(tleData: string): ParsedTleRecord[] {
  const lines = tleData
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const records: ParsedTleRecord[] = [];

  for (let index = 0; index < lines.length; index += 3) {
    const name = lines[index];
    const tleLine1 = lines[index + 1];
    const tleLine2 = lines[index + 2];

    if (!name || !tleLine1 || !tleLine2) {
      continue;
    }

    const noradId = extractNoradIdFromTle(tleLine1);
    if (!noradId) {
      continue;
    }

    try {
      records.push({
        name,
        noradId,
        satrec: satellite.twoline2satrec(tleLine1, tleLine2),
      });
    } catch {
      // Skip malformed records.
    }
  }

  return records;
}

export function toSpaceEntity(input: {
  name: string;
  noradId: string;
  longitude: number;
  latitude: number;
  altitude: number;
}): TrackedEntity {
  const classification = classifySatellite(input.name);

  return {
    id: `NORAD-${input.noradId}`,
    kind: 'space',
    label: shortenEntityLabel(input.name),
    classification,
    coordinates: {
      longitude: input.longitude,
      latitude: input.latitude,
      altitude: input.altitude,
    },
    freshness: {
      updatedAt: new Date().toISOString(),
      stale: false,
    },
    providerId: 'space-provider',
    metrics: {
      heading: 0,
      speed: 0,
    },
    metadata: {
      fullName: input.name,
      noradId: input.noradId,
    },
    renderables: [
      {
        overlayType: 'trail',
        priority: 5,
        payload: { selectedOnly: false },
      },
    ],
  };
}

function buildHealth(
  summary: string,
  status: 'ready' | 'degraded' | 'loading' = 'ready',
): ProviderFetchResult<TrackedEntity>['health'] {
  return {
    providerId: 'space-provider',
    status,
    summary,
    updatedAt: new Date().toISOString(),
    retryable: true,
  };
}

async function loadSatelliteNameCache(
  fetcher: typeof fetch,
): Promise<SatelliteNameCache> {
  try {
    const response = await fetcher('/data/satellite-names.json');
    if (response.ok) {
      return (await response.json()) as SatelliteNameCache;
    }
  } catch {
    // Use an empty cache when the static catalog is unavailable.
  }

  return { satellites: {} };
}

function mergeRecords(records: ParsedTleRecord[]): ParsedTleRecord[] {
  const map = new Map<string, ParsedTleRecord>();

  records.forEach((record) => {
    map.set(record.noradId, record);
  });

  return [...map.values()];
}

function computeOrbitPath(record: ParsedTleRecord): Array<[number, number]> {
  const now = new Date();
  const path: Array<[number, number]> = [];
  const periodMinutes = (2 * Math.PI) / record.satrec.no;

  for (let step = 0; step <= 96; step += 1) {
    const timestamp = new Date(now.getTime() + (step / 96) * periodMinutes * 60000);
    try {
      const propagated = satellite.propagate(record.satrec, timestamp);
      if (
        !propagated.position ||
        typeof propagated.position === 'boolean'
      ) {
        continue;
      }

      const gmst = satellite.gstime(timestamp);
      const geodetic = satellite.eciToGeodetic(propagated.position, gmst);
      let longitude = satellite.degreesLong(geodetic.longitude);
      const latitude = satellite.degreesLat(geodetic.latitude);

      if (path.length > 0) {
        const previousLongitude = path[path.length - 1][0];
        while (longitude - previousLongitude > 180) {
          longitude -= 360;
        }
        while (longitude - previousLongitude < -180) {
          longitude += 360;
        }
      }

      path.push([longitude, latitude]);
    } catch {
      continue;
    }
  }

  return path;
}

export function createSpaceProvider(
  fetcher: typeof fetch = fetch,
): SpaceProvider {
  let records: ParsedTleRecord[] = [];
  let namesCache: SatelliteNameCache = { satellites: {} };
  let initPromise: Promise<void> | null = null;

  const initialize = async (): Promise<void> => {
    if (initPromise) {
      return initPromise;
    }

    initPromise = (async () => {
      namesCache = await loadSatelliteNameCache(fetcher);

      try {
        const [stationsResponse, activeResponse] = await Promise.all([
          fetcher('/api/celestrak/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle'),
          fetcher('/api/celestrak/NORAD/elements/gp.php?GROUP=active&FORMAT=tle'),
        ]);

        const catalogs = await Promise.all([
          stationsResponse.ok ? stationsResponse.text() : Promise.resolve(''),
          activeResponse.ok ? activeResponse.text() : Promise.resolve(''),
        ]);

        records = mergeRecords(catalogs.flatMap(parseTleCatalog));
      } catch {
        records = parseTleCatalog(FALLBACK_TLES);
      }

      if (records.length === 0) {
        records = parseTleCatalog(FALLBACK_TLES);
      }

      records = records.slice(0, 2000);
    })();

    return initPromise;
  };

  return {
    id: 'space-provider',
    kind: 'space',
    capabilities: {
      mode: 'pull',
      supportsViewportQueries: true,
    },
    async fetchSnapshot(): Promise<ProviderFetchResult<TrackedEntity>> {
      await initialize();

      if (records.length === 0) {
        return {
          entities: [],
          health: buildHealth('No orbital catalog available', 'degraded'),
        };
      }

      const now = new Date();
      const gmst = satellite.gstime(now);

      const entities = records
        .map((record) => {
          try {
            const propagated = satellite.propagate(record.satrec, now);
            if (
              !propagated.position ||
              typeof propagated.position === 'boolean'
            ) {
              return null;
            }

            const geodetic = satellite.eciToGeodetic(
              propagated.position,
              gmst,
            );
            const longitude = satellite.degreesLong(geodetic.longitude);
            const latitude = satellite.degreesLat(geodetic.latitude);
            const altitude = geodetic.height * 1000;
            const resolvedName =
              namesCache.satellites[record.noradId]?.primaryName ?? record.name;

            return toSpaceEntity({
              name: resolvedName,
              noradId: record.noradId,
              longitude,
              latitude,
              altitude,
            });
          } catch {
            return null;
          }
        })
        .filter((entity): entity is TrackedEntity => Boolean(entity));

      return {
        entities,
        health: buildHealth(`Tracking ${entities.length} orbital objects`),
      };
    },
    getOrbitPath(entityId: string): Array<[number, number]> {
      const noradId = entityId.replace('NORAD-', '');
      const record = records.find((entry) => entry.noradId === noradId);
      return record ? computeOrbitPath(record) : [];
    },
    teardown() {
      records = [];
      initPromise = null;
    },
  };
}
