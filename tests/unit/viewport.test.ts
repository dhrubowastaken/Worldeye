import {
  buildViewportQuery,
  hasMeaningfulViewportChange,
} from '@/features/globe/lib/viewport';

describe('buildViewportQuery', () => {
  test('builds bounds and visible layer metadata from the active view', () => {
    const query = buildViewportQuery(
      {
        longitude: 12,
        latitude: 23,
        zoom: 4.2,
        pitch: 35,
        bearing: -10,
      },
      {
        air: true,
        water: false,
        space: true,
      },
    );

    expect(query.center).toEqual([12, 23]);
    expect(query.visibleLayerKinds).toEqual(['air', 'space']);
    expect(query.bounds.north).toBeGreaterThan(23);
    expect(query.bounds.south).toBeLessThan(23);
    expect(query.detail).toBe('medium');
    expect(query.key).toContain('12.00');
  });
});

describe('hasMeaningfulViewportChange', () => {
  test('ignores very small movement within the same query bucket', () => {
    const previous = buildViewportQuery(
      {
        longitude: 10,
        latitude: 10,
        zoom: 4,
        pitch: 30,
        bearing: 0,
      },
      { air: true, water: true, space: true },
    );

    const next = buildViewportQuery(
      {
        longitude: 10.08,
        latitude: 10.06,
        zoom: 4.02,
        pitch: 31,
        bearing: 1,
      },
      { air: true, water: true, space: true },
    );

    expect(hasMeaningfulViewportChange(previous, next)).toBe(false);
  });

  test('detects changes in zoom buckets and active layers', () => {
    const previous = buildViewportQuery(
      {
        longitude: 10,
        latitude: 10,
        zoom: 4,
        pitch: 30,
        bearing: 0,
      },
      { air: true, water: true, space: true },
    );

    const next = buildViewportQuery(
      {
        longitude: 10,
        latitude: 10,
        zoom: 6.5,
        pitch: 30,
        bearing: 0,
      },
      { air: true, water: false, space: true },
    );

    expect(hasMeaningfulViewportChange(previous, next)).toBe(true);
  });
});
