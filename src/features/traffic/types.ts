export type EntityKind =
  | 'air'
  | 'space'
  | 'earth'
  | 'weather'
  | 'disaster'
  | 'space-weather'
  | 'media'
  | 'imagery';

export type EntityCategory =
  | 'civilian'
  | 'military'
  | 'research'
  | 'environment'
  | 'hazard'
  | 'weather'
  | 'disaster'
  | 'media'
  | 'space-weather'
  | 'imagery';

export type EntitySeverity = 'info' | 'low' | 'moderate' | 'high' | 'critical';

export type OverlayType = 'marker' | 'label' | 'orbit' | 'trail' | (string & {});

export interface GlobeViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface LayerVisibility {
  air: boolean;
  space: boolean;
  earth: boolean;
  weather: boolean;
  disaster: boolean;
  'space-weather': boolean;
  media: boolean;
  imagery: boolean;
}

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface ViewportQuery {
  center: [number, number];
  zoom: number;
  pitch: number;
  detail: 'low' | 'medium' | 'high';
  key: string;
  bounds: ViewportBounds;
  visibleLayerKinds: EntityKind[];
}

export interface EntityClassification {
  category: EntityCategory;
  system: string;
}

export interface EntityCoordinates {
  longitude: number;
  latitude: number;
  altitude: number;
}

export interface EntityFreshness {
  updatedAt: string;
  stale: boolean;
}

export interface EntityMetrics {
  heading: number;
  speed: number;
  value?: number;
  unit?: string;
}

export interface RenderableConfig {
  overlayType: OverlayType;
  priority: number;
  payload?: Record<string, unknown>;
}

export interface TrackedEntity {
  id: string;
  kind: EntityKind;
  label: string;
  classification: EntityClassification;
  severity?: EntitySeverity;
  coordinates: EntityCoordinates;
  freshness: EntityFreshness;
  providerId: string;
  sourceId?: string;
  observedAt?: string;
  updatedAt?: string;
  confidence?: number;
  metrics: EntityMetrics;
  metadata: Record<string, unknown>;
  links?: Array<{ label: string; url: string }>;
  renderables?: RenderableConfig[];
}

export interface RenderIntentVisibility {
  selectedOnly?: boolean;
  minZoom?: number;
}

export interface RenderIntent {
  entityId: string;
  overlayType: OverlayType;
  anchor: EntityCoordinates;
  priority: number;
  visibility?: RenderIntentVisibility;
  payload: Record<string, unknown>;
}

export interface ProviderHealth {
  providerId: string;
  status:
    | 'idle'
    | 'loading'
    | 'ready'
    | 'degraded'
    | 'rate_limited'
    | 'timeout'
    | 'unsupported_region'
    | 'offline'
    | 'error';
  summary: string;
  updatedAt: string;
  retryable: boolean;
  details?: string;
}

export interface AppStatus {
  overall: 'ready' | 'degraded' | 'loading';
  providers: Record<string, ProviderHealth>;
}
