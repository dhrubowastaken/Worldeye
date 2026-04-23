import { parseTleCatalog, toSpaceEntity } from '@/features/traffic/providers/spaceProvider';

describe('parseTleCatalog', () => {
  test('extracts named TLE records with NORAD ids', () => {
    const records = parseTleCatalog(`ISS (ZARYA)
1 25544U 98067A   23060.52302325  .00016717  00000-0  30164-3 0  9995
2 25544  51.6419 220.7303 0005959  51.6441  74.0537 15.49502919385203
`);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      name: 'ISS (ZARYA)',
      catalogId: '25544',
    });
  });

  test('skips incomplete TLE records instead of fabricating entities', () => {
    expect(
      parseTleCatalog(`BROKEN SAT
1 99999U 98067A   23060.52302325  .00016717  00000-0  30164-3 0  9995
`),
    ).toEqual([]);
  });
});

describe('toSpaceEntity', () => {
  test('builds a typed tracked entity from propagated satellite data', () => {
    const entity = toSpaceEntity({
      name: 'STARLINK-1234',
      noradId: '1234',
      longitude: 10,
      latitude: 20,
      altitude: 500000,
    });

    expect(entity).toMatchObject({
      id: 'NORAD-01234',
      kind: 'space',
      sourceId: 'space.celestrak',
      classification: {
        category: 'civilian',
        system: 'SpaceX Starlink',
      },
    });
  });
});
