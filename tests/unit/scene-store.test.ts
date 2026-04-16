import { SceneStore } from '@/features/traffic/scene/SceneStore';
import type { TrackedEntity } from '@/features/traffic/types';
import { buildViewportQuery } from '@/features/globe/lib/viewport';

const entities: TrackedEntity[] = [
  {
    id: 'air-1',
    kind: 'air',
    label: 'Air One',
    classification: { category: 'civilian', system: 'Commercial' },
    coordinates: { longitude: 12, latitude: 21, altitude: 1000 },
    freshness: { updatedAt: '2026-04-17T00:00:00.000Z', stale: false },
    providerId: 'air',
    metrics: { heading: 90, speed: 410 },
    metadata: {},
  },
  {
    id: 'space-1',
    kind: 'space',
    label: 'Space One',
    classification: { category: 'research', system: 'Orbital' },
    coordinates: { longitude: 75, latitude: 10, altitude: 400000 },
    freshness: { updatedAt: '2026-04-17T00:00:00.000Z', stale: false },
    providerId: 'space',
    metrics: { heading: 0, speed: 17000 },
    metadata: {},
    renderables: [{ overlayType: 'orbit', priority: 3, payload: { selectedOnly: true } }],
  },
];

describe('SceneStore', () => {
  test('indexes provider entities and returns visible slices for the current viewport', () => {
    const store = new SceneStore();
    store.replaceProvider('air', [entities[0]]);
    store.replaceProvider('space', [entities[1]]);

    const visible = store.getVisibleEntities(
      buildViewportQuery(
        { longitude: 10, latitude: 20, zoom: 5, pitch: 30, bearing: 0 },
        { air: true, water: true, space: true },
      ),
    );

    expect(visible.map((entity) => entity.id)).toEqual(['air-1']);
    expect(store.getCounts()).toEqual({ air: 1, water: 0, space: 1 });
  });

  test('replaces one provider without wiping unrelated providers', () => {
    const store = new SceneStore();
    store.replaceProvider('air', [entities[0]]);
    store.replaceProvider('space', [entities[1]]);
    store.replaceProvider('air', []);

    expect(store.getEntity('space-1')?.label).toBe('Space One');
    expect(store.getEntity('air-1')).toBeUndefined();
  });
});
