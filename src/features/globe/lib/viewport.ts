import type {
  GlobeViewState,
  LayerVisibility,
  ViewportBounds,
  ViewportQuery,
} from '@/features/traffic/types';

function clampLatitude(value: number): number {
  return Math.max(-85, Math.min(85, value));
}

function normalizeLongitude(value: number): number {
  if (value < -180) {
    return value + 360;
  }

  if (value > 180) {
    return value - 360;
  }

  return value;
}

function resolveDetail(zoom: number): ViewportQuery['detail'] {
  if (zoom < 3.5) {
    return 'low';
  }

  if (zoom < 7) {
    return 'medium';
  }

  return 'high';
}

export function buildViewportBounds(viewState: GlobeViewState): ViewportBounds {
  const latSpan = Math.max(8, 130 / Math.max(1.5, viewState.zoom));
  const lonSpan =
    latSpan /
    Math.max(0.35, Math.cos((Math.abs(viewState.latitude) * Math.PI) / 180));

  return {
    north: clampLatitude(viewState.latitude + latSpan / 2),
    south: clampLatitude(viewState.latitude - latSpan / 2),
    east: normalizeLongitude(viewState.longitude + lonSpan / 2),
    west: normalizeLongitude(viewState.longitude - lonSpan / 2),
  };
}

export function buildViewportQuery(
  viewState: GlobeViewState,
  layerVisibility: LayerVisibility,
): ViewportQuery {
  const bounds = buildViewportBounds(viewState);
  const detail = resolveDetail(viewState.zoom);
  const visibleLayerKinds = (Object.entries(layerVisibility) as Array<
    [keyof LayerVisibility, boolean]
  >)
    .filter(([, visible]) => visible)
    .map(([kind]) => kind);

  const latBucket = Math.round(viewState.latitude * 4) / 4;
  const lonBucket = Math.round(viewState.longitude * 4) / 4;
  const zoomBucket =
    detail === 'low' ? 'z1' : detail === 'medium' ? 'z2' : 'z3';

  return {
    center: [viewState.longitude, viewState.latitude],
    zoom: viewState.zoom,
    pitch: viewState.pitch,
    detail,
    bounds,
    visibleLayerKinds,
    key: `${lonBucket.toFixed(2)}:${latBucket.toFixed(2)}:${zoomBucket}:${visibleLayerKinds.join(',')}`,
  };
}

export function hasMeaningfulViewportChange(
  previousQuery: ViewportQuery | null,
  nextQuery: ViewportQuery,
): boolean {
  if (!previousQuery) {
    return true;
  }

  return previousQuery.key !== nextQuery.key;
}
