export type EntityKind = 'air' | 'water' | 'space';

export type EntityCategory = 'civilian' | 'military' | 'research';

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
  water: boolean;
  space: boolean;
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
  coordinates: EntityCoordinates;
  freshness: EntityFreshness;
  providerId: string;
  metrics: EntityMetrics;
  metadata: Record<string, unknown>;
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
  status: 'idle' | 'loading' | 'ready' | 'degraded' | 'error';
  summary: string;
  updatedAt: string;
  retryable: boolean;
  details?: string;
}

export interface AppStatus {
  overall: 'ready' | 'degraded' | 'loading';
  providers: Record<string, ProviderHealth>;
}
