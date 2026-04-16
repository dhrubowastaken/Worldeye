// @ts-nocheck
'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import * as satellite from 'satellite.js';
import 'maplibre-gl/dist/maplibre-gl.css';

import useAirTraffic from '../hooks/useAirTraffic';
import useSpaceTraffic from '../hooks/useSpaceTraffic';
import useWaterTraffic from '../hooks/useWaterTraffic';
import { getIconSvg } from '../utils/icons';

// ─── Dark satellite style with globe projection & atmosphere ───
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'WorldEye Dark Satellite',
  projection: { type: 'globe' },
  sky: {
    'sky-color': '#000810',
    'sky-horizon-blend': 0.4,
    'horizon-color': '#061225',
    'horizon-fog-blend': 0.7,
    'fog-color': '#0a1628',
    'fog-ground-blend': 0.8,
    'atmosphere-blend': [
      'interpolate', ['linear'], ['zoom'],
      0, 1,
      5, 1,
      7, 0
    ]
  },
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: '',
      maxzoom: 19
    }
  },
  layers: [
    {
      id: 'satellite-base',
      type: 'raster',
      source: 'esri-satellite',
      paint: {
        'raster-brightness-max': 0.65,
        'raster-brightness-min': 0.0,
        'raster-saturation': -0.3,
        'raster-contrast': 0.15
      }
    }
  ]
};

const INITIAL_VIEW_STATE = {
  longitude: 30,
  latitude: 20,
  zoom: 2.8,
  pitch: 55,
  bearing: -15
};

const CAT_COLORS_HEX = {
  civilian: '#00e5ff', // cyan
  military: '#ff3b3b', // red
  research: '#bc13fe', // purple
  default: '#ffffff'
};

// ─── Compute orbit path for a satellite with continuous unwrapped longitude ───
function computeOrbitPath(satrec: any, steps = 120): number[][] {
  const period = (2 * Math.PI) / satrec.no; // orbital period in minutes
  const now = new Date();
  const path: number[][] = [];

  for (let i = 0; i <= steps; i++) {
    const time = new Date(now.getTime() + (i / steps) * period * 60000);
    try {
      const pv = satellite.propagate(satrec, time);
      if (!pv || !pv.position || typeof pv.position === 'boolean') continue;
      const gmst = satellite.gstime(time);
      const gd = satellite.eciToGeodetic(pv.position, gmst);
      let lon = satellite.degreesLong(gd.longitude);
      const lat = satellite.degreesLat(gd.latitude);
      
      // Unwrap longitude crossing the antimeridian so it doesn't draw a line through the earth
      if (path.length > 0) {
        const prevLon = path[path.length - 1][0];
        while (lon - prevLon > 180) lon -= 360;
        while (lon - prevLon < -180) lon += 360;
      }
      path.push([lon, lat]);
    } catch { /* skip */ }
  }
  return path;
}

export default function GlobeMonitor() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const mapRef = useRef<any>(null);

  // Hover and Click state for native MapLibre logic
  const [hoverInfo, setHoverInfo] = useState<{x: number, y: number, object: any} | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // Toggles and Filters
  const [showAir, setShowAir] = useState(true);
  const [showSpace, setShowSpace] = useState(true);
  const [showWater, setShowWater] = useState(true);
  const [spaceLoadingDone, setSpaceLoadingDone] = useState(false);
  const [catFilters, setCatFilters] = useState({ civilian: true, military: true, research: true });
  const [selectedSystem, setSelectedSystem] = useState('ALL');
  const [entitySearch, setEntitySearch] = useState('');

  // Data hooks
  const airTraffic = useAirTraffic(viewState, spaceLoadingDone);
  const { satelliteData: spaceTraffic, satRecords } = useSpaceTraffic({ onLoadingComplete: () => setSpaceLoadingDone(true) });
  const waterTraffic = useWaterTraffic(viewState, spaceLoadingDone);

  const onMove = useCallback((evt: any) => setViewState(evt.viewState), []);

  const zoomToEntity = useCallback((entity: any) => {
    if (!entity?.coordinates) return;
    const [longitude, latitude] = entity.coordinates;
    setViewState(prev => ({ ...prev, longitude, latitude, zoom: 6 }));
  }, []);

  const allDataCache = useMemo(() => {
    if (!spaceLoadingDone) return [];
    const air = showAir ? airTraffic : [];
    const space = showSpace ? spaceTraffic : [];
    const water = showWater ? waterTraffic : [];
    return [...air, ...space, ...water];
  }, [airTraffic, spaceTraffic, waterTraffic, showAir, showSpace, showWater, spaceLoadingDone]);

  const handleSearchChange = useCallback((searchTerm: string) => {
    setEntitySearch(searchTerm);
    if (searchTerm.trim()) {
      const match = allDataCache.find((d: any) => {
        const normalized = `${d.id || ''} ${d.name || ''} ${d.callsign || ''}`.toLowerCase();
        return normalized.includes(searchTerm.toLowerCase());
      });
      if (match) {
        zoomToEntity(match);
        setSelectedEntityId(match.id);
      }
    }
  }, [allDataCache, zoomToEntity]);

  const uniqueSystems = useMemo(() => {
    const systems = new Set<string>();
    allDataCache.forEach((d: any) => { if (d.system) systems.add(d.system); });
    return Array.from(systems).sort();
  }, [allDataCache]);

  const filteredData = useMemo(() => {
    return allDataCache.filter((d: any) => {
      if (!catFilters[d.category as keyof typeof catFilters]) return false;
      if (selectedSystem !== 'ALL' && d.system !== selectedSystem) return false;
      if (entitySearch && !(d.name || d.callsign || d.id || '').toLowerCase().includes(entitySearch.toLowerCase())) return false;
      return true;
    });
  }, [allDataCache, catFilters, selectedSystem, entitySearch]);

  const spaceEntities = useMemo(() => filteredData.filter((d: any) => d.type === 'space'), [filteredData]);
  const airEntities = useMemo(() => filteredData.filter((d: any) => d.type === 'air'), [filteredData]);
  const waterEntities = useMemo(() => filteredData.filter((d: any) => d.type === 'water'), [filteredData]);

  // ─── Initialize MapLibre Images ───
  const onMapLoad = useCallback(async (evt: any) => {
    const map = evt.target;
    const addSvgIcon = async (id: string, type: 'air' | 'water', cat: string) => {
       if (map.hasImage(id)) return;
       const svg = getIconSvg(type, cat);
       const img = new Image();
       img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
       img.width = type === 'air' ? 64 : 48; 
       img.height = type === 'air' ? 64 : 48;
       await new Promise((r) => { img.onload = r; });
       if (!map.hasImage(id)) map.addImage(id, img);
    };

    await Promise.all([
      addSvgIcon('air-civilian', 'air', 'civilian'),
      addSvgIcon('air-military', 'air', 'military'),
      addSvgIcon('air-research', 'air', 'research'),
      addSvgIcon('water-civilian', 'water', 'civilian'),
      addSvgIcon('water-military', 'water', 'military'),
      addSvgIcon('water-research', 'water', 'research')
    ]);
  }, []);

  // ─── GeoJSON Data Sources ───
  const spaceGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: spaceEntities.map((d: any) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [d.coordinates[0], d.coordinates[1]] },
      properties: { 
        id: d.id, 
        color: CAT_COLORS_HEX[d.category] || CAT_COLORS_HEX.default, 
        selected: d.id === selectedEntityId 
      }
    }))
  }), [spaceEntities, selectedEntityId]);

  const iconsGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: [...airEntities, ...waterEntities].map((d: any) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [d.coordinates[0], d.coordinates[1]] },
      properties: { 
        id: d.id, 
        type: d.type, 
        icon: `${d.type}-${d.category || 'civilian'}`, 
        rotation: d.track || 0 
      }
    }))
  }), [airEntities, waterEntities]);

  const orbitPathGeoJSON = useMemo(() => {
    if (!selectedEntityId || !satRecords?.length) return { type: 'FeatureCollection', features: [] };
    const rec = satRecords.find((s: any) => s.name === selectedEntityId || s.noradId === selectedEntityId || `NORAD-${s.noradId}` === selectedEntityId);
    if (!rec) return { type: 'FeatureCollection', features: [] };
    const path = computeOrbitPath(rec.satrec);
    if (path.length < 2) return { type: 'FeatureCollection', features: [] };
    
    const satData = spaceEntities.find((d: any) => d.id === selectedEntityId);
    const cat = satData?.category || 'civilian';
    const color = CAT_COLORS_HEX[cat] || CAT_COLORS_HEX.default;

    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: path },
        properties: { color }
      }]
    };
  }, [selectedEntityId, satRecords, spaceEntities]);

  // ─── Map Interactions ───
  const onMouseMove = useCallback((evt: any) => {
    const feature = evt.features?.[0];
    if (feature) {
      const obj = allDataCache.find(d => d.id === feature.properties.id);
      if (obj) {
        setHoverInfo({ x: evt.point.x, y: evt.point.y, object: obj });
        // Set cursor
        if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'pointer';
        return;
      }
    }
    setHoverInfo(null);
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
  }, [allDataCache]);

  const onClick = useCallback((evt: any) => {
    const feature = evt.features?.[0];
    if (feature && (feature.source === 'satellites' || feature.source === 'icons')) {
      setSelectedEntityId(prev => prev === feature.properties.id ? null : feature.properties.id);
    } else {
      setSelectedEntityId(null);
    }
  }, []);

  const selectedEntityInfo = useMemo(() => {
    if (!selectedEntityId) return null;
    return allDataCache.find((d: any) => d.id === selectedEntityId) || null;
  }, [selectedEntityId, allDataCache]);

  return (
    <div className="absolute inset-0 w-full h-full" style={{ background: '#000810' }}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={onMove}
        interactiveLayerIds={['satellites-dots', 'air-icons', 'water-icons']}
        onMouseMove={onMouseMove}
        onClick={onClick}
        onLoad={onMapLoad}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        mapLib={maplibregl}
        maxPitch={85}
        minZoom={1.5}
        maxZoom={18}
        antialias
        attributionControl={false}
      >
        <Source id="orbit-path" type="geojson" data={orbitPathGeoJSON}>
          <Layer
            id="orbit-line"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': 2,
              'line-opacity': 0.6,
              'line-dasharray': [3, 3]
            }}
          />
        </Source>

        <Source id="satellites" type="geojson" data={spaceGeoJSON}>
          <Layer
            id="satellites-dots"
            type="circle"
            paint={{
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                2, ['case', ['get', 'selected'], 4, 1.2],
                6, ['case', ['get', 'selected'], 6, 2.5],
                10, ['case', ['get', 'selected'], 8, 4]
              ],
              'circle-color': ['get', 'color'],
              'circle-opacity': 0.8,
              'circle-stroke-width': 1,
              'circle-stroke-color': ['get', 'color'],
              'circle-stroke-opacity': 0.4
            }}
          />
        </Source>

        <Source id="icons" type="geojson" data={iconsGeoJSON}>
          <Layer
            id="air-icons"
            type="symbol"
            filter={['==', 'type', 'air']}
            layout={{
              'icon-image': ['get', 'icon'],
              'icon-size': 0.5,
              'icon-allow-overlap': true,
              'icon-rotate': ['get', 'rotation'],
              'icon-rotation-alignment': 'map',
              'icon-pitch-alignment': 'map'
            }}
          />
          <Layer
            id="water-icons"
            type="symbol"
            filter={['==', 'type', 'water']}
            layout={{
              'icon-image': ['get', 'icon'],
              'icon-size': 0.35,
              'icon-allow-overlap': true,
              'icon-rotate': ['get', 'rotation'],
              'icon-rotation-alignment': 'map'
            }}
          />
        </Source>
      </Map>

      {/* ── Tooltip Overlay ── */}
      {hoverInfo && (
        <div 
          className="absolute pointer-events-none z-50 backdrop-blur-md"
          style={{ 
            left: hoverInfo.x + 15, 
            top: hoverInfo.y + 15,
            backgroundColor: 'rgba(3, 8, 18, 0.92)',
            color: hoverInfo.object.category === 'military' ? '#ff4444' : hoverInfo.object.category === 'research' ? '#c77dff' : '#22d3ee',
            border: `1px solid ${hoverInfo.object.category === 'military' ? '#ff444440' : hoverInfo.object.category === 'research' ? '#c77dff40' : '#22d3ee40'}`,
            fontFamily: 'monospace',
            fontSize: '11px',
            padding: '8px 12px',
            borderRadius: '4px',
            lineHeight: '1.6',
            maxWidth: '260px'
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
            {hoverInfo.object.name || hoverInfo.object.callsign || hoverInfo.object.id}
          </div>
          <div><span style={{ opacity: 0.5 }}>Type:</span> {(hoverInfo.object.type || '').toUpperCase()}</div>
          <div><span style={{ opacity: 0.5 }}>System:</span> {hoverInfo.object.system || '—'}</div>
          <div><span style={{ opacity: 0.5 }}>Class:</span> {hoverInfo.object.category ? hoverInfo.object.category.toUpperCase() : 'UNKNOWN'}</div>
          <div><span style={{ opacity: 0.5 }}>Position:</span> {hoverInfo.object.coordinates[1].toFixed(3)}°, {hoverInfo.object.coordinates[0].toFixed(3)}°</div>
          {hoverInfo.object.coordinates[2] > 0 && <div><span style={{ opacity: 0.5 }}>Alt:</span> {Math.round(hoverInfo.object.coordinates[2]).toLocaleString()}m</div>}
          {(hoverInfo.object.speed || hoverInfo.object.velocity) > 0 && <div><span style={{ opacity: 0.5 }}>Speed:</span> {hoverInfo.object.speed || hoverInfo.object.velocity} kts</div>}
          {hoverInfo.object.type === 'space' && <div style={{ marginTop: '4px', opacity: 0.5, fontSize: '9px' }}>Click to show orbit</div>}
        </div>
      )}

      {/* ── Selected UI Entity info bar ── */}
      {selectedEntityInfo && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-xl border border-green-500/30 rounded flex items-center justify-between font-mono text-xs shadow-[0_0_20px_rgba(50,255,100,0.1)] w-full max-w-3xl overflow-hidden truncate">
          <div className="flex items-center gap-4 px-4 py-2 w-full truncate">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse inline-block flex-shrink-0"></span>
            <span className="font-bold text-sm text-green-300 tracking-wide truncate">{selectedEntityInfo.name || selectedEntityInfo.callsign || selectedEntityInfo.id}</span>
            <span className="text-green-600 truncate">{selectedEntityInfo.system}</span>
            <span className="text-green-600 whitespace-nowrap">
              {selectedEntityInfo.coordinates[1].toFixed(2)}°, {selectedEntityInfo.coordinates[0].toFixed(2)}°
            </span>
            {selectedEntityInfo.coordinates[2] > 0 && <span className="text-green-600 whitespace-nowrap">ALT {Math.round(selectedEntityInfo.coordinates[2] / (selectedEntityInfo.type === 'space' ? 1000 : 1))} {selectedEntityInfo.type === 'space' ? 'km' : 'm'}</span>}
            {selectedEntityInfo.velocity > 0 && <span className="text-green-600 whitespace-nowrap">SPD {selectedEntityInfo.velocity} kts</span>}
          </div>
          <button onClick={() => setSelectedEntityId(null)} className="text-green-500 hover:text-green-300 text-lg leading-none cursor-pointer h-full px-4 border-l border-green-500/20 bg-green-950/30 hover:bg-green-900/50 transition-colors">
            &times;
          </button>
        </div>
      )}

      {/* ── Coordinates HUD ── */}
      <div className="absolute bottom-6 left-6 z-10 text-xs text-cyan-400 font-mono flex flex-col gap-0.5 opacity-70 pointer-events-none backdrop-blur-sm bg-black/40 px-3 py-2 border border-cyan-900/40 rounded">
        <div>LAT {viewState.latitude.toFixed(4)}</div>
        <div>LON {viewState.longitude.toFixed(4)}</div>
        <div>ZOOM {viewState.zoom.toFixed(1)} · PITCH {viewState.pitch.toFixed(0)}°</div>
        {spaceLoadingDone && <div className="text-cyan-700 mt-1">{filteredData.length} ACTIVE</div>}
      </div>

      {/* ── Filter Panel ── */}
      <div className="absolute top-20 right-6 z-10 w-72 bg-black/75 backdrop-blur-xl border border-cyan-500/20 text-white font-mono text-sm shadow-[0_0_30px_rgba(0,255,255,0.06)] flex flex-col max-h-[80vh] rounded-sm overflow-hidden">
        <div className="bg-cyan-950/60 px-3 py-1.5 text-cyan-300 font-bold tracking-widest text-[10px] border-b border-cyan-500/20 uppercase">Layers</div>
        <div className="p-3 text-xs grid grid-cols-3 gap-2 border-b border-cyan-500/10 bg-black/30">
          <label className="flex flex-col items-center cursor-pointer hover:text-cyan-300 transition-colors">
            <input type="checkbox" checked={showAir} onChange={e => setShowAir(e.target.checked)} className="accent-cyan-500 mb-1" />
            <span>AIR</span>
            <span className="text-[9px] text-cyan-700">{airEntities.length}</span>
          </label>
          <label className="flex flex-col items-center cursor-pointer hover:text-cyan-300 transition-colors">
            <input type="checkbox" checked={showSpace} onChange={e => setShowSpace(e.target.checked)} className="accent-cyan-500 mb-1" />
            <span>SPACE</span>
            <span className="text-[9px] text-cyan-700">{spaceEntities.length}</span>
          </label>
          <label className="flex flex-col items-center cursor-pointer hover:text-cyan-300 transition-colors">
            <input type="checkbox" checked={showWater} onChange={e => setShowWater(e.target.checked)} className="accent-cyan-500 mb-1" />
            <span>SEA</span>
            <span className="text-[9px] text-cyan-700">{waterEntities.length}</span>
          </label>
        </div>

        <div className="bg-cyan-950/60 px-3 py-1.5 text-cyan-300 font-bold tracking-widest text-[10px] border-b border-cyan-500/20 uppercase">Classification</div>
        <div className="p-3 flex flex-col gap-2 border-b border-cyan-500/10 text-xs">
          <label className="flex items-center justify-between cursor-pointer text-cyan-200 hover:text-cyan-100 transition-colors">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>CIVILIAN</span>
            <input type="checkbox" checked={catFilters.civilian} onChange={e => setCatFilters(p => ({ ...p, civilian: e.target.checked }))} className="accent-cyan-500" />
          </label>
          <label className="flex items-center justify-between cursor-pointer text-red-400 hover:text-red-300 transition-colors">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>MILITARY</span>
            <input type="checkbox" checked={catFilters.military} onChange={e => setCatFilters(p => ({ ...p, military: e.target.checked }))} className="accent-red-500" />
          </label>
          <label className="flex items-center justify-between cursor-pointer text-purple-400 hover:text-purple-300 transition-colors">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>RESEARCH</span>
            <input type="checkbox" checked={catFilters.research} onChange={e => setCatFilters(p => ({ ...p, research: e.target.checked }))} className="accent-purple-500" />
          </label>
        </div>

        <div className="bg-cyan-950/60 px-3 py-1.5 text-cyan-300 font-bold tracking-widest text-[10px] border-b border-cyan-500/20 uppercase">System</div>
        <div className="p-3 text-xs border-b border-cyan-500/10">
          <select className="w-full bg-black/60 border border-cyan-500/20 text-cyan-200 p-2 outline-none focus:border-cyan-400 rounded-sm" value={selectedSystem} onChange={e => setSelectedSystem(e.target.value)}>
            <option value="ALL">ALL SYSTEMS</option>
            {uniqueSystems.map(sys => (<option key={sys} value={sys}>{sys}</option>))}
          </select>
        </div>

        <div className="bg-cyan-950/60 px-3 py-1.5 text-cyan-300 font-bold tracking-widest text-[10px] border-b border-cyan-500/20 uppercase">Search</div>
        <div className="p-3 text-xs">
          <input type="text" placeholder="Entity name or callsign..." value={entitySearch} onChange={e => handleSearchChange(e.target.value)} className="w-full bg-black/60 border border-cyan-500/20 text-cyan-200 p-2 outline-none focus:border-cyan-400 placeholder:text-cyan-800 rounded-sm" />
        </div>

        <div className="px-3 py-2 text-[9px] text-cyan-600 bg-cyan-950/20 border-t border-cyan-500/10 text-center uppercase tracking-widest">{filteredData.length} active targets</div>
      </div>
    </div>
  );
}
