'use client';

import { useCallback, useMemo } from 'react';
import Map, { Layer, Source } from 'react-map-gl/maplibre';
import type { Feature, FeatureCollection, LineString, Point, Polygon } from 'geojson';
import maplibregl from 'maplibre-gl';
import type { MapLayerMouseEvent, ViewStateChangeEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import { CATEGORY_HEX, getIconSvg } from '@/features/globe/lib/icons';
import { buildMapStyle, type MapStyleId } from '@/features/globe/lib/mapStyle';
import type { GlobeViewState, RenderIntent, TrackedEntity } from '@/features/traffic/types';

interface WorldMapProps {
  entities: TrackedEntity[];
  inspectMode: boolean;
  orbitPath: Array<[number, number]>;
  renderIntents: RenderIntent[];
  selectedEntityId: string | null;
  viewState: GlobeViewState;
  mapStyleId: MapStyleId;
  mapQuality: number;
  onHoverEntity: (entityId: string | null) => void;
  onInspectLocation: (coordinate: [number, number]) => void;
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
      color: CATEGORY_HEX[entity.classification.category] ?? '#F5F5F7',
      label: entity.label,
    },
  };
}

function buildFeatureCollections(entities: TrackedEntity[]) {
  const air: EntityFeature[] = [];
  const space: EntityFeature[] = [];
  const events: EntityFeature[] = [];
  const areas: Array<Feature<Polygon, { id: string; color?: string }>> = [];

  entities.forEach((entity) => {
    const feature = toFeature(entity);
    if (entity.kind === 'air') {
      air.push(feature);
    } else if (entity.kind === 'space') {
      space.push(feature);
    } else {
      events.push(feature);
    }

    const radiusKm = numericMetadata(entity.metadata.impactRadiusKm);
    if (radiusKm) {
      areas.push({
        type: 'Feature',
        geometry: buildCirclePolygon(
          entity.coordinates.longitude,
          entity.coordinates.latitude,
          radiusKm,
        ),
        properties: {
          id: entity.id,
          color: feature.properties.color,
        },
      });
    }
  });

  return {
    air: { type: 'FeatureCollection', features: air } satisfies FeatureCollection<Point>,
    space: { type: 'FeatureCollection', features: space } satisfies FeatureCollection<Point>,
    events: { type: 'FeatureCollection', features: events } satisfies FeatureCollection<Point>,
    areas: { type: 'FeatureCollection', features: areas } satisfies FeatureCollection<Polygon>,
  };
}

export function WorldMap({
  entities,
  inspectMode,
  orbitPath,
  renderIntents,
  selectedEntityId,
  viewState,
  mapStyleId,
  mapQuality,
  onHoverEntity,
  onInspectLocation,
  onSelectEntity,
  onViewStateChange,
}: WorldMapProps) {
  const featureCollections = useMemo(() => buildFeatureCollections(entities), [entities]);

  const mapStyle = useMemo(() => buildMapStyle(mapStyleId, mapQuality), [mapStyleId, mapQuality]);

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
    const icons: Array<{ id: string; category: string; type: 'air'; width: number }> = [
      { id: 'air-civilian', category: 'civilian', type: 'air', width: 64 },
      { id: 'air-military', category: 'military', type: 'air', width: 64 },
      { id: 'air-research', category: 'research', type: 'air', width: 64 },
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <Map
        key={`${mapStyleId}-${mapQuality}`}
        {...viewState}
        attributionControl={false}
        interactiveLayerIds={['space-points', 'event-points', 'air-symbols', 'event-area-fill']}
        mapLib={maplibregl}
        mapStyle={mapStyle}
        maxPitch={85}
        maxZoom={18}
        minZoom={1.5}
        onClick={(event) => {
          if (inspectMode) {
            onInspectLocation([event.lngLat.lng, event.lngLat.lat]);
            return;
          }

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
          {/* Outer glow ring for visibility */}
          <Layer
            id="space-glow"
            type="circle"
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 3.5, 3, 4, 6, 6, 10, 10],
              'circle-color': ['get', 'color'],
              'circle-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.08, 4, 0.12, 8, 0.15],
              'circle-blur': 1,
            }}
          />
          {/* Core satellite dot */}
          <Layer
            id="space-points"
            type="circle"
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 1.2, 3, 1.8, 6, 3.5, 10, 6],
              'circle-color': ['get', 'color'],
              'circle-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.7, 4, 0.8, 8, 0.92],
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
                0.4,
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

        <Source id="event-point-source" type="geojson" data={featureCollections.events}>
          <Layer
            id="event-points"
            type="circle"
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 4, 4, 5, 7, 8],
              'circle-color': ['get', 'color'],
              'circle-opacity': 0.88,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-opacity': [
                'case',
                ['==', ['get', 'id'], selectedEntityId ?? ''],
                0.95,
                0.32,
              ],
              'circle-stroke-width': [
                'case',
                ['==', ['get', 'id'], selectedEntityId ?? ''],
                2,
                1,
              ],
            }}
          />
        </Source>

        <Source id="event-area-source" type="geojson" data={featureCollections.areas}>
          <Layer
            id="event-area-fill"
            type="fill"
            paint={{
              'fill-color': ['get', 'color'],
              'fill-opacity': [
                'case',
                ['==', ['get', 'id'], selectedEntityId ?? ''],
                0.18,
                0.08,
              ],
            }}
          />
          <Layer
            id="event-area-outline"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': [
                'case',
                ['==', ['get', 'id'], selectedEntityId ?? ''],
                2,
                1,
              ],
              'line-opacity': 0.5,
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
              'line-color': '#FBBF24',
              'line-width': 2,
              'line-opacity': 0.7,
              'line-dasharray': [3, 3],
            }}
          />
        </Source>
      </Map>
    </div>
  );
}

function numericMetadata(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function buildCirclePolygon(longitude: number, latitude: number, radiusKm: number): Polygon {
  const steps = 48;
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.max(0.2, Math.cos((latitude * Math.PI) / 180)));
  const ring: number[][] = [];

  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2;
    ring.push([
      longitude + lonDelta * Math.cos(angle),
      latitude + latDelta * Math.sin(angle),
    ]);
  }

  return {
    type: 'Polygon',
    coordinates: [ring],
  };
}
