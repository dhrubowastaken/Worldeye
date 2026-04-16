'use client';

import { useCallback, useMemo } from 'react';
import Map, { Layer, Source } from 'react-map-gl/maplibre';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import maplibregl from 'maplibre-gl';
import type { MapLayerMouseEvent, ViewStateChangeEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import { CATEGORY_HEX, getIconSvg } from '@/features/globe/lib/icons';
import { MAP_STYLE } from '@/features/globe/lib/mapStyle';
import type { GlobeViewState, RenderIntent, TrackedEntity } from '@/features/traffic/types';

interface WorldMapProps {
  entities: TrackedEntity[];
  orbitPath: Array<[number, number]>;
  renderIntents: RenderIntent[];
  selectedEntityId: string | null;
  viewState: GlobeViewState;
  onHoverEntity: (entityId: string | null) => void;
  onSelectEntity: (entityId: string | null) => void;
  onViewStateChange: (viewState: GlobeViewState) => void;
}

type EntityFeature = Feature<
  Point,
  {
    id: string;
    icon?: string;
    rotation?: number;
    color?: string;
    label?: string;
  }
>;

function toFeature(entity: TrackedEntity): EntityFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [entity.coordinates.longitude, entity.coordinates.latitude],
    },
    properties: {
      id: entity.id,
      icon: entity.kind === 'space' ? undefined : `${entity.kind}-${entity.classification.category}`,
      rotation: entity.metrics.heading,
      color: CATEGORY_HEX[entity.classification.category] ?? '#dbeafe',
      label: entity.label,
    },
  };
}

function buildFeatureCollections(entities: TrackedEntity[]) {
  const air: EntityFeature[] = [];
  const water: EntityFeature[] = [];
  const space: EntityFeature[] = [];

  entities.forEach((entity) => {
    const feature = toFeature(entity);
    if (entity.kind === 'air') {
      air.push(feature);
    } else if (entity.kind === 'water') {
      water.push(feature);
    } else {
      space.push(feature);
    }
  });

  return {
    air: { type: 'FeatureCollection', features: air } satisfies FeatureCollection<Point>,
    water: { type: 'FeatureCollection', features: water } satisfies FeatureCollection<Point>,
    space: { type: 'FeatureCollection', features: space } satisfies FeatureCollection<Point>,
  };
}

export function WorldMap({
  entities,
  orbitPath,
  renderIntents,
  selectedEntityId,
  viewState,
  onHoverEntity,
  onSelectEntity,
  onViewStateChange,
}: WorldMapProps) {
  const featureCollections = useMemo(() => buildFeatureCollections(entities), [entities]);

  const labelCollection = useMemo(
    () =>
      ({
        type: 'FeatureCollection',
        features: renderIntents
          .filter((intent) => intent.overlayType === 'label')
          .map((intent) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [intent.anchor.longitude, intent.anchor.latitude],
            },
            properties: {
              id: intent.entityId,
              label: String(intent.payload.label ?? ''),
            },
          })),
      }) satisfies FeatureCollection<Point>,
    [renderIntents],
  );

  const orbitCollection = useMemo(
    (): FeatureCollection<LineString> => ({
      type: 'FeatureCollection',
      features:
        orbitPath.length > 1
          ? [
              {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: orbitPath,
                },
                properties: {},
              },
            ]
          : [],
    }),
    [orbitPath],
  );

  const onMapLoad = useCallback((event: { target: maplibregl.Map }) => {
    const map = event.target;
    const icons: Array<{ id: string; category: string; type: 'air' | 'water'; width: number }> = [
      { id: 'air-civilian', category: 'civilian', type: 'air', width: 64 },
      { id: 'air-military', category: 'military', type: 'air', width: 64 },
      { id: 'air-research', category: 'research', type: 'air', width: 64 },
      { id: 'water-civilian', category: 'civilian', type: 'water', width: 48 },
      { id: 'water-military', category: 'military', type: 'water', width: 48 },
      { id: 'water-research', category: 'research', type: 'water', width: 48 },
    ];

    icons.forEach((icon) => {
      if (map.hasImage(icon.id)) {
        return;
      }

      const image = new Image(icon.width, icon.width);
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(getIconSvg(icon.type, icon.category))}`;
      image.onload = () => {
        if (!map.hasImage(icon.id)) {
          map.addImage(icon.id, image, { pixelRatio: 2 });
        }
      };
    });
  }, []);

  const handlePointer = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      onHoverEntity(typeof feature?.properties?.id === 'string' ? feature.properties.id : null);
    },
    [onHoverEntity],
  );

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[32px] border border-white/10">
      <Map
        {...viewState}
        attributionControl={false}
        interactiveLayerIds={['space-points', 'air-symbols', 'water-symbols']}
        mapLib={maplibregl}
        mapStyle={MAP_STYLE}
        maxPitch={85}
        maxZoom={18}
        minZoom={1.5}
        onClick={(event) => {
          const feature = event.features?.[0];
          onSelectEntity(typeof feature?.properties?.id === 'string' ? feature.properties.id : null);
        }}
        onLoad={onMapLoad}
        onMouseLeave={() => onHoverEntity(null)}
        onMouseMove={handlePointer}
        onMove={(event: ViewStateChangeEvent) => onViewStateChange(event.viewState as GlobeViewState)}
        style={{ width: '100%', height: '100%' }}
      >
        <Source id="space-points-source" type="geojson" data={featureCollections.space}>
          <Layer
            id="space-points"
            type="circle"
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 1.3, 6, 2.8, 10, 5.5],
              'circle-color': ['get', 'color'],
              'circle-opacity': 0.85,
              'circle-stroke-color': [
                'case',
                ['==', ['get', 'id'], selectedEntityId ?? ''],
                '#ffffff',
                ['get', 'color'],
              ],
              'circle-stroke-width': [
                'case',
                ['==', ['get', 'id'], selectedEntityId ?? ''],
                2,
                0.6,
              ],
            }}
          />
        </Source>

        <Source id="air-symbol-source" type="geojson" data={featureCollections.air}>
          <Layer
            id="air-symbols"
            type="symbol"
            layout={{
              'icon-image': ['get', 'icon'],
              'icon-size': 0.45,
              'icon-allow-overlap': true,
              'icon-rotate': ['get', 'rotation'],
              'icon-rotation-alignment': 'map',
              'icon-pitch-alignment': 'map',
            }}
          />
        </Source>

        <Source id="water-symbol-source" type="geojson" data={featureCollections.water}>
          <Layer
            id="water-symbols"
            type="symbol"
            layout={{
              'icon-image': ['get', 'icon'],
              'icon-size': 0.34,
              'icon-allow-overlap': true,
              'icon-rotate': ['get', 'rotation'],
              'icon-rotation-alignment': 'map',
            }}
          />
        </Source>

        <Source id="label-source" type="geojson" data={labelCollection}>
          <Layer
            id="labels"
            type="symbol"
            layout={{
              'text-field': ['get', 'label'],
              'text-font': ['Open Sans Regular'],
              'text-offset': [0, 1.2],
              'text-size': 11,
            }}
            paint={{
              'text-color': '#e2f0ff',
              'text-halo-color': 'rgba(4, 13, 22, 0.9)',
              'text-halo-width': 1,
            }}
          />
        </Source>

        <Source id="orbit-source" type="geojson" data={orbitCollection}>
          <Layer
            id="orbit-line"
            type="line"
            paint={{
              'line-color': '#facc15',
              'line-width': 2,
              'line-opacity': 0.7,
              'line-dasharray': [3, 3],
            }}
          />
        </Source>
      </Map>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.1),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(14,165,233,0.16),_transparent_38%)]" />
    </div>
  );
}
