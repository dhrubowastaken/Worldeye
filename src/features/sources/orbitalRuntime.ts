import { classifySatellite, shortenEntityLabel } from '@/features/traffic/lib/classification';
import {
  degreesLat,
  degreesLong,
  eciToGeodetic,
  gstime,
  propagate,
  twoline2satrec,
  type SatRec,
} from '@/lib/satelliteRuntime';
import { buildEntity } from '@/features/sources/sourceCore';
import type { TrackedEntity } from '@/features/traffic/types';

interface ParsedOrbitalRecord {
  name: string;
  catalogId: string;
  satrec: SatRec;
}

export class OrbitalRuntime {
  private records: ParsedOrbitalRecord[] = [];
  private readonly recordsByCatalogId = new Map<string, ParsedOrbitalRecord>();

  replaceCatalog(tleData: string): void {
    const nextRecords = parseTleCatalog(tleData);
    this.records = nextRecords;
    this.recordsByCatalogId.clear();
    nextRecords.forEach((record) => {
      this.recordsByCatalogId.set(record.catalogId, record);
    });
  }

  get size(): number {
    return this.records.length;
  }

  propagate(sourceId: string, limit = 6000): TrackedEntity[] {
    const now = new Date();
    const gmstValue = gstime(now);
    const entities: TrackedEntity[] = [];

    for (const record of this.records.slice(0, limit)) {
      try {
        const propagated = propagate(record.satrec, now);
        if (!propagated.position || typeof propagated.position === 'boolean') {
          continue;
        }

        const geodetic = eciToGeodetic(propagated.position, gmstValue);
        const longitude = degreesLong(geodetic.longitude);
        const latitude = degreesLat(geodetic.latitude);
        const altitude = geodetic.height * 1000;
        const classification = classifySatellite(record.name);

        entities.push(
          buildEntity({
            id: `NORAD-${record.catalogId}`,
            kind: 'space',
            label: shortenEntityLabel(record.name),
            category: classification.category,
            severity: 'info',
            system: classification.system,
            longitude,
            latitude,
            altitude,
            sourceId,
            confidence: 0.82,
            metadata: {
              fullName: record.name,
              catalogId: record.catalogId,
              catalogNumberTransition:
                Number(record.catalogId) >= 69_000
                  ? 'CelesTrak warns that TLE catalog numbers are near the 5-digit limit in 2026.'
                  : undefined,
            },
            renderables: [
              {
                overlayType: 'trail',
                priority: 5,
                payload: { selectedOnly: false },
              },
            ],
          }),
        );
      } catch {
        continue;
      }
    }

    return entities;
  }

  getOrbitPath(entityId: string): Array<[number, number]> {
    const catalogId = entityId.replace('NORAD-', '');
    const record = this.recordsByCatalogId.get(catalogId);
    if (!record) {
      return [];
    }

    return computeOrbitPath(record);
  }
}

export function parseTleCatalog(tleData: string): ParsedOrbitalRecord[] {
  const lines = tleData
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const records: ParsedOrbitalRecord[] = [];

  for (let index = 0; index < lines.length; index += 3) {
    const name = lines[index];
    const tleLine1 = lines[index + 1];
    const tleLine2 = lines[index + 2];

    if (!name || !tleLine1 || !tleLine2) {
      continue;
    }

    const catalogId = extractCatalogId(tleLine1);
    if (!catalogId) {
      continue;
    }

    try {
      records.push({
        name,
        catalogId,
        satrec: twoline2satrec(tleLine1, tleLine2),
      });
    } catch {
      continue;
    }
  }

  return records;
}

function extractCatalogId(tleLine1: string): string | null {
  const match = tleLine1.match(/^\s*1\s+(\d+)/);
  return match ? match[1] : null;
}

function computeOrbitPath(record: ParsedOrbitalRecord): Array<[number, number]> {
  const now = new Date();
  const path: Array<[number, number]> = [];
  const periodMinutes = (2 * Math.PI) / record.satrec.no;

  for (let step = 0; step <= 96; step += 1) {
    const timestamp = new Date(now.getTime() + (step / 96) * periodMinutes * 60000);
    try {
      const propagated = propagate(record.satrec, timestamp);
      if (!propagated.position || typeof propagated.position === 'boolean') {
        continue;
      }

      const gmstValue = gstime(timestamp);
      const geodetic = eciToGeodetic(propagated.position, gmstValue);
      let longitude = degreesLong(geodetic.longitude);
      const latitude = degreesLat(geodetic.latitude);

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
