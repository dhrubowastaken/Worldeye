import type { EntitySeverity, TrackedEntity, ViewportBounds } from '@/features/traffic/types';

export type SourceDomain =
  | 'air'
  | 'space'
  | 'earth'
  | 'weather'
  | 'disaster'
  | 'space-weather'
  | 'media'
  | 'imagery';

export type SourceCapability =
  | 'snapshot'
  | 'indicator'
  | 'imagery-inspection'
  | 'raster-overlay';

export type SourceHealthStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'degraded'
  | 'rate_limited'
  | 'timeout'
  | 'unsupported_region'
  | 'offline'
  | 'error';

export interface SourceDefinition {
  id: string;
  label: string;
  domain: SourceDomain;
  auth: {
    type: 'none';
    requiresKey: false;
    notes?: string;
  };
  coverage: string;
  cadenceMs: number;
  attribution: string;
  termsUrl: string;
  timeoutMs: number;
  concurrency: number;
  capabilities: SourceCapability[];
  defaultEnabled?: boolean;
  color: string;
  usage: string;
}

export interface SourceHealth {
  sourceId: string;
  status: SourceHealthStatus;
  summary: string;
  updatedAt: string;
  retryable: boolean;
  details?: string;
}

export interface SourceLink {
  label: string;
  url: string;
}

export interface SourceIndicator {
  id: string;
  sourceId: string;
  label: string;
  value: string;
  severity: EntitySeverity;
  observedAt: string;
}

export interface SourceResult {
  sourceId: string;
  entities: TrackedEntity[];
  indicators: SourceIndicator[];
  health: SourceHealth;
  warnings: string[];
  links: SourceLink[];
}

export interface SourceFetchContext {
  queryKey: string;
  bounds: ViewportBounds;
  center: [number, number];
  zoom: number;
  signal?: AbortSignal;
}

export interface ImageryInspection {
  coordinate: [number, number];
  requestedAt: string;
  status: 'idle' | 'loading' | 'ready' | 'degraded' | 'not_found' | 'timeout' | 'error';
  provider?: string;
  collection?: string;
  layer?: string;
  sceneDate?: string;
  cloudCover?: number;
  previewUrl?: string;
  tileUrl?: string;
  sourceUrl?: string;
  summary: string;
}

export type SourceFetcher = (
  definition: SourceDefinition,
  context: SourceFetchContext,
) => Promise<SourceResult>;

export interface DataPointGroup {
  id: string;
  label: string;
  sources: Array<{
    sourceId: string;
    label: string;
    description: string;
    color: string;
  }>;
}
