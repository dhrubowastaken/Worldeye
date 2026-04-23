import {
  DEFAULT_SOURCE_IDS,
  SOURCE_DEFINITIONS,
} from '@/features/sources/sourceRegistry';
import type { EntityCategory, LayerVisibility } from '@/features/traffic/types';

export interface DataPointState {
  layers: LayerVisibility;
  categories: Record<EntityCategory, boolean>;
  activeSourceIds: string[];
}

export const DEFAULT_DATA_POINT_CATEGORIES: Record<EntityCategory, boolean> = {
  civilian: true,
  military: true,
  research: true,
  environment: true,
  hazard: true,
  weather: true,
  disaster: true,
  media: true,
  'space-weather': true,
  imagery: true,
};

export const DEFAULT_DATA_POINT_LAYERS: LayerVisibility = {
  air: true,
  space: true,
  earth: true,
  weather: true,
  disaster: true,
  'space-weather': true,
  media: true,
  imagery: true,
};

export const HIDDEN_DATA_POINT_LAYERS: LayerVisibility = {
  air: false,
  space: false,
  earth: false,
  weather: false,
  disaster: false,
  'space-weather': false,
  media: false,
  imagery: false,
};

export function buildResetDataPointState(): DataPointState {
  return {
    layers: { ...HIDDEN_DATA_POINT_LAYERS },
    categories: { ...DEFAULT_DATA_POINT_CATEGORIES },
    activeSourceIds: [],
  };
}

export function buildDefaultDataPointState(): DataPointState {
  return {
    layers: { ...DEFAULT_DATA_POINT_LAYERS },
    categories: { ...DEFAULT_DATA_POINT_CATEGORIES },
    activeSourceIds: [...DEFAULT_SOURCE_IDS],
  };
}

export function activeSourceIdsToLayers(activeSourceIds: string[]): LayerVisibility {
  const active = new Set(activeSourceIds);
  const layers = { ...HIDDEN_DATA_POINT_LAYERS };

  SOURCE_DEFINITIONS.forEach((source) => {
    if (active.has(source.id)) {
      layers[source.domain === 'space-weather' ? 'space-weather' : source.domain] = true;
    }
  });

  return layers;
}
