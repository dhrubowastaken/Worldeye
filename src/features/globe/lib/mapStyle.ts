import type { StyleSpecification } from 'maplibre-gl';

export type MapStyleId = 'satellite' | 'political' | 'dark' | 'terrain';

export interface MapStyleOption {
  id: MapStyleId;
  label: string;
  description: string;
  preview: string;
}

export const MAP_STYLE_OPTIONS: MapStyleOption[] = [
  { id: 'satellite', label: 'Satellite', description: 'High-resolution imagery', preview: '/images/map-satellite.png' },
  { id: 'political', label: 'Political', description: 'Boundaries & labels', preview: '/images/map-political.png' },
  { id: 'dark', label: 'Dark', description: 'Minimal with blue borders', preview: '/images/map-dark.png' },
  { id: 'terrain', label: 'Terrain', description: 'Elevation & contours', preview: '/images/map-terrain.png' },
];

const TILE_SIZES: Record<number, number> = {
  0: 128,
  1: 256,
  2: 512,
};

function buildSatelliteStyle(tileSize: number): StyleSpecification {
  return {
    version: 8,
    name: 'World Eye — Satellite',
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
        tileSize,
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
}

function buildPoliticalStyle(tileSize: number): StyleSpecification {
  return {
    version: 8,
    name: 'World Eye — Political',
    projection: { type: 'globe' },
    sky: {
      'sky-color': '#0a1628',
      'sky-horizon-blend': 0.4,
      'horizon-color': '#1a2a44',
      'horizon-fog-blend': 0.6,
      'fog-color': '#0a1020',
      'fog-ground-blend': 0.7,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
    },
    sources: {
      'carto-voyager': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        ],
        tileSize,
        attribution: '',
        maxzoom: 18,
      },
    },
    layers: [
      {
        id: 'political-base',
        type: 'raster',
        source: 'carto-voyager',
        paint: {
          'raster-brightness-max': 0.8,
          'raster-brightness-min': 0.05,
          'raster-saturation': -0.2,
          'raster-contrast': 0.1,
        },
      },
    ],
  };
}

function buildDarkStyle(tileSize: number): StyleSpecification {
  return {
    version: 8,
    name: 'World Eye — Dark',
    projection: { type: 'globe' },
    sky: {
      'sky-color': '#010206',
      'sky-horizon-blend': 0.2,
      'horizon-color': '#060c18',
      'horizon-fog-blend': 0.4,
      'fog-color': '#000000',
      'fog-ground-blend': 0.85,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.6, 5, 0.6, 7, 0],
    },
    sources: {
      // Base layer: near-black land with faint detail
      'dark-base-tiles': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
          'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
          'https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
        ],
        tileSize,
        attribution: '',
        maxzoom: 18,
      },
      // Overlay: boundaries layer for blue country outlines
      'dark-boundaries': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png',
          'https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png',
          'https://c.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png',
        ],
        tileSize,
        attribution: '',
        maxzoom: 18,
      },
    },
    layers: [
      // Land: very dark, almost black
      {
        id: 'dark-land',
        type: 'raster',
        source: 'dark-base-tiles',
        paint: {
          'raster-brightness-max': 0.25,
          'raster-brightness-min': 0.0,
          'raster-saturation': -0.8,
          'raster-contrast': 0.5,
        },
      },
      // Borders/labels overlay: shifted blue via hue-rotate, increased brightness
      {
        id: 'dark-borders',
        type: 'raster',
        source: 'dark-boundaries',
        paint: {
          'raster-brightness-max': 0.6,
          'raster-brightness-min': 0.0,
          'raster-saturation': 0.4,
          'raster-contrast': 0.3,
          'raster-hue-rotate': 200,
          'raster-opacity': 0.7,
        },
      },
    ],
  };
}

function buildTerrainStyle(tileSize: number): StyleSpecification {
  return {
    version: 8,
    name: 'World Eye — Terrain',
    projection: { type: 'globe' },
    sky: {
      'sky-color': '#0a1a2e',
      'sky-horizon-blend': 0.5,
      'horizon-color': '#1a3050',
      'horizon-fog-blend': 0.65,
      'fog-color': '#081420',
      'fog-ground-blend': 0.7,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
    },
    sources: {
      'opentopomap': {
        type: 'raster',
        tiles: [
          'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
          'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
          'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
        ],
        tileSize,
        attribution: '',
        maxzoom: 17,
      },
    },
    layers: [
      {
        id: 'terrain-base',
        type: 'raster',
        source: 'opentopomap',
        paint: {
          'raster-brightness-max': 0.65,
          'raster-brightness-min': 0.06,
          'raster-saturation': -0.35,
          'raster-contrast': 0.15,
        },
      },
    ],
  };
}

const STYLE_BUILDERS: Record<MapStyleId, (tileSize: number) => StyleSpecification> = {
  satellite: buildSatelliteStyle,
  political: buildPoliticalStyle,
  dark: buildDarkStyle,
  terrain: buildTerrainStyle,
};

export function buildMapStyle(styleId: MapStyleId, quality: number): StyleSpecification {
  const tileSize = TILE_SIZES[quality] ?? 256;
  const builder = STYLE_BUILDERS[styleId] ?? buildSatelliteStyle;
  return builder(tileSize);
}

export const INITIAL_VIEW_STATE = {
  longitude: 18,
  latitude: 18,
  zoom: 2.5,
  pitch: 46,
  bearing: -12,
};
