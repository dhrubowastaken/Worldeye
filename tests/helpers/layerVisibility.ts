import type { LayerVisibility } from '@/features/traffic/types';

export const ALL_VISIBLE_LAYERS: LayerVisibility = {
  air: true,
  space: true,
  earth: true,
  weather: true,
  disaster: true,
  'space-weather': true,
  media: true,
  imagery: true,
};

export const NO_EARTH_LAYERS: LayerVisibility = {
  ...ALL_VISIBLE_LAYERS,
  earth: false,
};

export const AIR_AND_SPACE_ONLY: LayerVisibility = {
  air: true,
  space: true,
  earth: false,
  weather: false,
  disaster: false,
  'space-weather': false,
  media: false,
  imagery: false,
};
