import {
  buildEntity,
  isFiniteCoordinate,
  normalizeLongitude,
} from '@/features/sources/sourceCore';

describe('sourceCore normalization helpers', () => {
  test('wraps longitudes into the renderable globe range', () => {
    expect(normalizeLongitude(190)).toBe(-170);
    expect(normalizeLongitude(-190)).toBe(170);
    expect(normalizeLongitude(45)).toBe(45);
  });

  test('rejects non-finite or out-of-range coordinates before entity creation', () => {
    expect(isFiniteCoordinate(12, 45)).toBe(true);
    expect(isFiniteCoordinate(Number.NaN, 45)).toBe(false);
    expect(isFiniteCoordinate(12, 91)).toBe(false);
    expect(isFiniteCoordinate('12', 45)).toBe(false);
  });

  test('builds normalized entities with source provenance and stable defaults', () => {
    expect(
      buildEntity({
        id: 'events.usgs-earthquakes:us7000test',
        kind: 'earth',
        label: 'M 4.8 - Test Region',
        category: 'research',
        severity: 'moderate',
        system: 'USGS Earthquakes',
        longitude: normalizeLongitude(190),
        latitude: 12,
        sourceId: 'events.usgs-earthquakes',
        updatedAt: '2026-04-22T00:00:00.000Z',
      }),
    ).toMatchObject({
      id: 'events.usgs-earthquakes:us7000test',
      kind: 'earth',
      providerId: 'events.usgs-earthquakes',
      sourceId: 'events.usgs-earthquakes',
      confidence: 0.75,
      coordinates: {
        longitude: -170,
        latitude: 12,
        altitude: 0,
      },
      freshness: {
        updatedAt: '2026-04-22T00:00:00.000Z',
        stale: false,
      },
    });
  });
});
