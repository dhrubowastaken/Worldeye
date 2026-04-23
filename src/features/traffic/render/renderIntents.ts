import type { RenderIntent, TrackedEntity, ViewportQuery } from '@/features/traffic/types';

const OVERLAY_ORDER: Record<string, number> = {
  marker: 1,
  label: 2,
  orbit: 3,
  trail: 4,
};

function matchesViewport(query: ViewportQuery, intent: RenderIntent): boolean {
  if (intent.payload.kind === 'space') {
    return true;
  }

  const { longitude, latitude } = intent.anchor;
  const { east, north, south, west } = query.bounds;

  const latitudeMatch = latitude <= north && latitude >= south;
  const longitudeMatch =
    west <= east
      ? longitude >= west && longitude <= east
      : longitude >= west || longitude <= east;

  return latitudeMatch && longitudeMatch;
}

export function buildRenderIntents(
  entities: TrackedEntity[],
  selectedEntityId: string | null,
): RenderIntent[] {
  return entities.flatMap((entity) => {
    const intents: RenderIntent[] = [
      {
        entityId: entity.id,
        overlayType: 'marker',
        anchor: entity.coordinates,
        priority: 1,
        payload: { kind: entity.kind, category: entity.classification.category },
      },
      {
        entityId: entity.id,
        overlayType: 'label',
        anchor: entity.coordinates,
        priority: entity.id === selectedEntityId ? 3 : 2,
        visibility: { minZoom: 4 },
        payload: { label: entity.label },
      },
    ];

    if (entity.kind === 'space') {
      intents.push({
        entityId: entity.id,
        overlayType: 'orbit',
        anchor: entity.coordinates,
        priority: 4,
        visibility: { selectedOnly: true },
        payload: { emphasis: entity.id === selectedEntityId ? 'focused' : 'context' },
      });
    }

    entity.renderables?.forEach((renderable) => {
      intents.push({
        entityId: entity.id,
        overlayType: renderable.overlayType,
        anchor: entity.coordinates,
        priority: renderable.priority,
        visibility: {
          selectedOnly: Boolean(renderable.payload?.selectedOnly),
        },
        payload: renderable.payload ?? {},
      });
    });

    return intents.sort((left, right) => {
      const leftOrder = OVERLAY_ORDER[left.overlayType] ?? 99;
      const rightOrder = OVERLAY_ORDER[right.overlayType] ?? 99;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.priority - right.priority;
    });
  });
}

export function getVisibleRenderIntents(
  intents: RenderIntent[],
  query: ViewportQuery,
  selectedEntityId: string | null,
): RenderIntent[] {
  return intents.filter((intent) => {
    if (intent.visibility?.selectedOnly && intent.entityId !== selectedEntityId) {
      return false;
    }

    if (
      typeof intent.visibility?.minZoom === 'number' &&
      query.zoom < intent.visibility.minZoom
    ) {
      return false;
    }

    return matchesViewport(query, intent);
  });
}
