import { buildViewportQuery } from '@/features/globe/lib/viewport';
import { buildRenderIntents, getVisibleRenderIntents } from '@/features/traffic/render/renderIntents';
import { ALL_VISIBLE_LAYERS } from '../helpers/layerVisibility';
import type { TrackedEntity } from '@/features/traffic/types';

const trackedEntity: TrackedEntity = {
  id: 'space-1',
  kind: 'space',
  label: 'Orbiter',
  classification: { category: 'research', system: 'Orbital' },
  coordinates: { longitude: 5, latitude: 5, altitude: 400000 },
  freshness: { updatedAt: '2026-04-17T00:00:00.000Z', stale: false },
  providerId: 'space',
  metrics: { heading: 0, speed: 17000 },
  metadata: {},
  renderables: [{ overlayType: 'trail', priority: 2, payload: { length: 24 } }],
};

describe('buildRenderIntents', () => {
  test('creates stable marker and overlay intents for a tracked entity', () => {
    const intents = buildRenderIntents([trackedEntity], 'space-1');

    expect(intents.map((intent) => intent.overlayType)).toEqual(['marker', 'label', 'orbit', 'trail']);
    expect(intents.every((intent) => intent.entityId === 'space-1')).toBe(true);
  });
});

describe('getVisibleRenderIntents', () => {
  test('filters selected-only overlays outside of focused selection state', () => {
    const intents = buildRenderIntents([trackedEntity], null);
    const visible = getVisibleRenderIntents(
      intents,
      buildViewportQuery(
        { longitude: 5, latitude: 5, zoom: 6, pitch: 35, bearing: 0 },
        ALL_VISIBLE_LAYERS,
      ),
      null,
    );

    expect(visible.map((intent) => intent.overlayType)).toEqual(['marker', 'label', 'trail']);
  });
});
