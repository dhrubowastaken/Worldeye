import type {
  SourceDefinition,
  SourceHealth,
  SourceHealthStatus,
  SourceResult,
} from '@/features/sources/types';
import type {
  EntityCategory,
  EntityKind,
  EntitySeverity,
  TrackedEntity,
} from '@/features/traffic/types';

export function nowIso(): string {
  return new Date().toISOString();
}

export function buildSourceHealth(
  source: SourceDefinition,
  status: SourceHealthStatus,
  summary: string,
  details?: string,
): SourceHealth {
  return {
    sourceId: source.id,
    status,
    summary,
    updatedAt: nowIso(),
    retryable: status !== 'unsupported_region',
    details,
  };
}

export function emptySourceResult(
  source: SourceDefinition,
  status: SourceHealthStatus,
  summary: string,
  details?: string,
): SourceResult {
  return {
    sourceId: source.id,
    entities: [],
    indicators: [],
    health: buildSourceHealth(source, status, summary, details),
    warnings: [],
    links: [{ label: source.label, url: source.termsUrl }],
  };
}

export function buildEntity(input: {
  id: string;
  kind: EntityKind;
  label: string;
  category: EntityCategory;
  severity: EntitySeverity;
  system: string;
  longitude: number;
  latitude: number;
  altitude?: number;
  sourceId: string;
  observedAt?: string;
  updatedAt?: string;
  confidence?: number;
  metrics?: Partial<TrackedEntity['metrics']>;
  metadata?: Record<string, unknown>;
  links?: Array<{ label: string; url: string }>;
  renderables?: TrackedEntity['renderables'];
}): TrackedEntity {
  const updatedAt = input.updatedAt ?? nowIso();

  return {
    id: input.id,
    kind: input.kind,
    label: input.label,
    classification: {
      category: input.category,
      system: input.system,
    },
    severity: input.severity,
    coordinates: {
      longitude: input.longitude,
      latitude: input.latitude,
      altitude: input.altitude ?? 0,
    },
    freshness: {
      updatedAt,
      stale: false,
    },
    providerId: input.sourceId,
    sourceId: input.sourceId,
    observedAt: input.observedAt ?? updatedAt,
    updatedAt,
    confidence: input.confidence ?? 0.75,
    metrics: {
      heading: input.metrics?.heading ?? 0,
      speed: input.metrics?.speed ?? 0,
      value: input.metrics?.value,
      unit: input.metrics?.unit,
    },
    metadata: input.metadata ?? {},
    links: input.links ?? [],
    renderables: input.renderables,
  };
}

export function normalizeLongitude(value: number): number {
  if (value > 180) {
    return ((value + 180) % 360) - 180;
  }

  if (value < -180) {
    return ((value - 180) % 360) + 180;
  }

  return value;
}

export function isFiniteCoordinate(longitude: unknown, latitude: unknown): boolean {
  return (
    typeof longitude === 'number' &&
    typeof latitude === 'number' &&
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90
  );
}
