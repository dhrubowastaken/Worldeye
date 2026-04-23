import { SceneStore } from '@/features/traffic/scene/SceneStore';
import type { TrackedEntity, ViewportQuery } from '@/features/traffic/types';

function createEntity(
  id: string,
  kind: TrackedEntity['kind'],
  longitude: number,
  latitude: number,
): TrackedEntity {
  return {
    id,
    kind,
    label: id,
    classification: {
      category: 'civilian',
      system: 'Test',
    },
    coordinates: {
      longitude,
      latitude,
      altitude: kind === 'space' ? 550000 : 0,
    },
    freshness: {
      updatedAt: '2026-04-22T00:00:00.000Z',
      stale: false,
    },
    providerId: `${kind}-provider`,
    metrics: {
      heading: 0,
      speed: 0,
    },
    metadata: {},
  };
}

const query: ViewportQuery = {
  center: [0, 0],
  zoom: 2.5,
  pitch: 0,
  detail: 'low',
  key: 'test',
  bounds: {
    north: 10,
    south: -10,
    east: 10,
    west: -10,
  },
  visibleLayerKinds: ['space', 'air'],
};

describe('SceneStore.getVisibleEntities', () => {
  test('keeps space entities visible outside the current bounds', () => {
    const store = new SceneStore();
    store.replaceProvider('space-provider', [createEntity('sat-1', 'space', 140, 45)]);

    expect(store.getVisibleEntities(query).map((entity) => entity.id)).toEqual(['sat-1']);
  });

  test('honors space layer visibility even though space is globally visible', () => {
    const store = new SceneStore();
    store.replaceProvider('space-provider', [createEntity('sat-1', 'space', 140, 45)]);

    expect(
      store.getVisibleEntities({
        ...query,
        visibleLayerKinds: ['air'],
      }),
    ).toEqual([]);
  });

  test('still culls non-space entities outside the current bounds', () => {
    const store = new SceneStore();
    store.replaceProvider('air-provider', [createEntity('air-1', 'air', 140, 45)]);

    expect(store.getVisibleEntities(query)).toEqual([]);
  });
});
