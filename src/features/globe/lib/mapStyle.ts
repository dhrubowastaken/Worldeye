import type { StyleSpecification } from 'maplibre-gl';

export const MAP_STYLE: StyleSpecification = {
  version: 8,
  name: 'World Eye Intelligence',
  projection: { type: 'globe' },
  sky: {
    'sky-color': '#061521',
    'sky-horizon-blend': 0.5,
    'horizon-color': '#15384d',
    'horizon-fog-blend': 0.75,
    'fog-color': '#08111a',
    'fog-ground-blend': 0.75,
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
  },
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'satellite-base',
      type: 'raster',
      source: 'esri-satellite',
      paint: {
        'raster-brightness-max': 0.72,
        'raster-brightness-min': 0.08,
        'raster-saturation': -0.4,
        'raster-contrast': 0.18,
      },
    },
  ],
};

export const INITIAL_VIEW_STATE = {
  longitude: 18,
  latitude: 18,
  zoom: 2.5,
  pitch: 46,
  bearing: -12,
};
