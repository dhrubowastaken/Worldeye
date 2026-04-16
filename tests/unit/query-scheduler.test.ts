import { ViewportQueryScheduler } from '@/features/globe/lib/ViewportQueryScheduler';
import { buildViewportQuery } from '@/features/globe/lib/viewport';

describe('ViewportQueryScheduler', () => {
  test('requires an initial fetch when no query has been executed yet', () => {
    const scheduler = new ViewportQueryScheduler();
    const query = buildViewportQuery(
      { longitude: 0, latitude: 0, zoom: 4, pitch: 30, bearing: 0 },
      { air: true, water: true, space: true },
    );

    expect(scheduler.shouldFetch(query, 0)).toBe(true);
  });

  test('suppresses tiny viewport changes until the TTL expires', () => {
    const scheduler = new ViewportQueryScheduler();
    const query = buildViewportQuery(
      { longitude: 0, latitude: 0, zoom: 4, pitch: 30, bearing: 0 },
      { air: true, water: true, space: true },
    );

    scheduler.markFetched(query, 0);

    const tinyChange = buildViewportQuery(
      { longitude: 0.08, latitude: 0.06, zoom: 4.01, pitch: 30, bearing: 0 },
      { air: true, water: true, space: true },
    );

    expect(scheduler.shouldFetch(tinyChange, 15000)).toBe(false);
    expect(scheduler.shouldFetch(tinyChange, 50000)).toBe(true);
  });

  test('triggers a fetch immediately when the query key changes', () => {
    const scheduler = new ViewportQueryScheduler();
    const initialQuery = buildViewportQuery(
      { longitude: 0, latitude: 0, zoom: 4, pitch: 30, bearing: 0 },
      { air: true, water: true, space: true },
    );

    scheduler.markFetched(initialQuery, 0);

    const changedQuery = buildViewportQuery(
      { longitude: 0, latitude: 0, zoom: 7, pitch: 30, bearing: 0 },
      { air: true, water: false, space: true },
    );

    expect(scheduler.shouldFetch(changedQuery, 5000)).toBe(true);
  });
});
