import { normalizeAircraft } from '@/features/traffic/providers/airProvider';

describe('normalizeAircraft', () => {
  test('maps a commercial aircraft into a tracked entity', () => {
    const entity = normalizeAircraft({
      hex: 'abc123',
      flight: 'DAL123 ',
      lat: 33.64,
      lon: -84.42,
      alt_baro: 32000,
      track: 180,
      gs: 430,
      t: 'B738',
      mil: false,
    });

    expect(entity).toMatchObject({
      id: 'abc123',
      kind: 'air',
      label: 'DAL123',
      classification: {
        category: 'civilian',
        system: 'DAL',
      },
    });
  });

  test('marks military flights with defense classification', () => {
    const entity = normalizeAircraft({
      hex: 'def456',
      flight: 'RCH210',
      lat: 38.8,
      lon: -77.1,
      alt_baro: 25000,
      track: 270,
      gs: 390,
      t: 'C17',
      mil: true,
    });

    expect(entity?.classification.category).toBe('military');
    expect(entity?.classification.system).toBe('Defense Air');
  });

  test('drops aircraft records that cannot be placed on the globe', () => {
    expect(
      normalizeAircraft({
        hex: 'no-position',
        flight: 'DAL123',
      }),
    ).toBeNull();
  });
});
