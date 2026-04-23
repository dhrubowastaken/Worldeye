import type { TrackedEntity, ViewportBounds, ViewportQuery } from '@/features/traffic/types';

const CELL_SIZE = 10;

function toCellKey(longitude: number, latitude: number): string {
  const x = Math.floor((longitude + 180) / CELL_SIZE);
  const y = Math.floor((latitude + 90) / CELL_SIZE);

  return `${x}:${y}`;
}

function isWithinBounds(
  bounds: ViewportBounds,
  longitude: number,
  latitude: number,
): boolean {
  const latitudeMatch =
    latitude <= bounds.north && latitude >= bounds.south;

  const longitudeMatch =
    bounds.west <= bounds.east
      ? longitude >= bounds.west && longitude <= bounds.east
      : longitude >= bounds.west || longitude <= bounds.east;

  return latitudeMatch && longitudeMatch;
}

export class SceneStore {
  private readonly entities = new Map<string, TrackedEntity>();
  private readonly providerEntityIds = new Map<string, Set<string>>();
  private readonly index = new Map<string, Set<string>>();

  replaceProvider(providerId: string, entities: TrackedEntity[]): void {
    const existingIds = this.providerEntityIds.get(providerId) ?? new Set<string>();

    existingIds.forEach((entityId) => this.removeEntity(entityId));

    const nextIds = new Set<string>();
    entities.forEach((entity) => {
      this.entities.set(entity.id, entity);
      nextIds.add(entity.id);

      const cellKey = toCellKey(
        entity.coordinates.longitude,
        entity.coordinates.latitude,
      );
      const cell = this.index.get(cellKey) ?? new Set<string>();
      cell.add(entity.id);
      this.index.set(cellKey, cell);
    });

    this.providerEntityIds.set(providerId, nextIds);
  }

  getEntity(entityId: string): TrackedEntity | undefined {
    return this.entities.get(entityId);
  }

  getCounts(): Record<string, number> {
    const counts: Record<string, number> = {};

    this.entities.forEach((entity) => {
      counts[entity.kind] = (counts[entity.kind] ?? 0) + 1;
    });

    return counts;
  }

  getVisibleEntities(query: ViewportQuery): TrackedEntity[] {
    const visibleIds = new Set<string>();

    this.index.forEach((entityIds) => {
      entityIds.forEach((entityId) => {
        const entity = this.entities.get(entityId);
        if (!entity) {
          return;
        }

        if (!query.visibleLayerKinds.includes(entity.kind)) {
          return;
        }

        // Space markers need to stay globally visible on the globe.
        // A tight rectangular viewport clip causes most of the active catalog
        // to disappear at low zoom even though the globe can render them.
        if (entity.kind === 'space') {
          visibleIds.add(entityId);
          return;
        }

        if (
          isWithinBounds(
            query.bounds,
            entity.coordinates.longitude,
            entity.coordinates.latitude,
          )
        ) {
          visibleIds.add(entityId);
        }
      });
    });

    return [...visibleIds]
      .map((entityId) => this.entities.get(entityId))
      .filter((entity): entity is TrackedEntity => Boolean(entity));
  }

  private removeEntity(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return;
    }

    const cellKey = toCellKey(
      entity.coordinates.longitude,
      entity.coordinates.latitude,
    );
    const cell = this.index.get(cellKey);

    cell?.delete(entityId);
    if (cell?.size === 0) {
      this.index.delete(cellKey);
    }

    this.entities.delete(entityId);
  }
}
