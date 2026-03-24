// @ts-nocheck
import React, { useState, useCallback, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { _GlobeView as GlobeView } from '@deck.gl/core';
import { BitmapLayer, IconLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';

import useAirTraffic from '../hooks/useAirTraffic';
import useSpaceTraffic from '../hooks/useSpaceTraffic';
import useWaterTraffic from '../hooks/useWaterTraffic';
import { getIconSvg } from '../utils/icons';

const INITIAL_VIEW_STATE = { longitude: -74, latitude: 40, zoom: 4, minZoom: 0, maxZoom: 10 };

export default function GlobeMonitor() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  
  // Layer Toggles
  const [showAir, setShowAir] = useState(true);
  const [showSpace, setShowSpace] = useState(true);
  const [showWater, setShowWater] = useState(true);

  // Advanced Filters
  const [catFilters, setCatFilters] = useState({ civilian: true, military: true, research: true });
  const [selectedSystem, setSelectedSystem] = useState('ALL');

  const airTraffic = useAirTraffic(viewState);
  const spaceTraffic = useSpaceTraffic();
  const waterTraffic = useWaterTraffic(viewState);

  const onViewStateChange = useCallback(({ viewState }: any) => setViewState(viewState), []);

  const allDataCache = useMemo(() => {
     let air = showAir ? airTraffic : [];
     let space = showSpace ? spaceTraffic : [];
     let water = showWater ? waterTraffic : [];
     return [...air, ...space, ...water];
  }, [airTraffic, spaceTraffic, waterTraffic, showAir, showSpace, showWater]);

  const uniqueSystems = useMemo(() => {
     const systems = new Set<string>();
     allDataCache.forEach((d: any) => { if (d.system) systems.add(d.system); });
     return Array.from(systems).sort();
  }, [allDataCache]);

  const filteredData = useMemo(() => {
     return allDataCache.filter((d: any) => {
        if (!catFilters[d.category as keyof typeof catFilters]) return false;
        if (selectedSystem !== 'ALL' && d.system !== selectedSystem) return false;
        return true;
     });
  }, [allDataCache, catFilters, selectedSystem]);

  const layers = useMemo(() => [
    new TileLayer({
      id: 'satellite-tiles',
      data: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      minZoom: 0,
      maxZoom: 19,
      tileSize: 256,
      renderSubLayers: props => {
        const { bbox: {west, south, east, north} } = props.tile;
        return new BitmapLayer(props, { data: null, image: props.data, bounds: [west, south, east, north] });
      }
    }),
    new IconLayer({
      id: 'dynamic-icons',
      data: filteredData,
      pickable: true,
      getIcon: (d: any) => ({
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(getIconSvg(d.type, d.category))}`,
        width: 64,
        height: 64,
        anchorY: 32
      }),
      getSize: (d: any) => {
         if (d.type === 'space') return 20;
         if (d.type === 'air') return 24;
         return 18;
      },
      getPosition: (d: any) => d.coordinates,
      getAngle: (d: any) => -(d.track || 0), // Rotates icon to match heading
      sizeScale: 1,
      sizeUnits: 'pixels'
    })
  ].filter(Boolean), [filteredData]);

  return (
    <div className="absolute inset-0 w-full h-full bg-black">
       <DeckGL
        views={new GlobeView({ id: 'globe', resolution: 2 })}
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers as any}
        onViewStateChange={onViewStateChange}
        parameters={{ clearColor: [0, 0, 0, 1] }}
        getTooltip={({object}: any) => object && {
           html: `<div>
              <b>${object.name || object.callsign || object.id}</b><br/>
              <b>System:</b> ${object.system}<br/>
              <b>Category:</b> ${object.category ? object.category.toUpperCase() : 'UNKNOWN'}<br/>
              Lat: ${object.coordinates[1].toFixed(2)}<br/>
              Lon: ${object.coordinates[0].toFixed(2)}<br/>
              Alt: ${Math.round(object.coordinates[2])}m<br/>
              Vel: ${object.speed || object.velocity || 0} kts
            </div>`,
           style: {
             backgroundColor: 'rgba(5, 10, 15, 0.9)',
             color: object.category === 'military' ? '#ff3b3b' : object.category === 'research' ? '#bc13fe' : '#22d3ee',
             border: `1px solid ${object.category === 'military' ? '#ff3b3b' : object.category === 'research' ? '#bc13fe' : '#22d3ee'}`,
             fontFamily: 'monospace',
             fontSize: '12px'
           }
        }}
      />
      
      <div className="absolute bottom-6 left-6 z-10 text-xs text-cyan-400 font-mono flex flex-col gap-1 opacity-80 pointer-events-none backdrop-blur-sm bg-black/30 p-2 border border-cyan-900/50">
        <div>MGRS: --</div>
        <div>LAT: {viewState.latitude.toFixed(4)}</div>
        <div>LON: {viewState.longitude.toFixed(4)}</div>
        <div>ALT: {(viewState.zoom * 1000).toFixed(0)} KM</div>
      </div>
      
      <div className="absolute top-20 right-6 z-10 w-72 bg-black/70 backdrop-blur-md border border-cyan-500/30 text-white font-mono text-sm shadow-[0_0_15px_rgba(0,255,255,0.1)] flex flex-col max-h-[80vh]">
        <div className="bg-cyan-950/80 p-2 text-cyan-300 font-bold tracking-widest text-[10px] border-b border-cyan-500/30 uppercase">
          GLOBAL ENTITIES
        </div>
        <div className="p-3 text-xs grid grid-cols-3 gap-2 border-b border-cyan-500/20 bg-black/40">
           <label className="flex flex-col items-center cursor-pointer hover:text-cyan-300">
              <input type="checkbox" checked={showAir} onChange={e => setShowAir(e.target.checked)} className="accent-cyan-500 mb-1" /> AIR
           </label>
           <label className="flex flex-col items-center cursor-pointer hover:text-cyan-300">
              <input type="checkbox" checked={showSpace} onChange={e => setShowSpace(e.target.checked)} className="accent-cyan-500 mb-1" /> SPACE
           </label>
           <label className="flex flex-col items-center cursor-pointer hover:text-cyan-300">
              <input type="checkbox" checked={showWater} onChange={e => setShowWater(e.target.checked)} className="accent-cyan-500 mb-1" /> SEA
           </label>
        </div>

        <div className="bg-cyan-950/80 p-2 text-cyan-300 font-bold tracking-widest text-[10px] border-b border-cyan-500/30 uppercase">
          CLASSIFICATION
        </div>
        <div className="p-3 flex flex-col gap-2 border-b border-cyan-500/20 text-xs">
           <label className="flex items-center justify-between cursor-pointer text-cyan-200">
              <span>CIVILIAN</span>
              <input type="checkbox" checked={catFilters.civilian} onChange={e => setCatFilters(p => ({...p, civilian: e.target.checked}))} className="accent-cyan-500" />
           </label>
           <label className="flex items-center justify-between cursor-pointer text-red-400">
              <span>MILITARY</span>
              <input type="checkbox" checked={catFilters.military} onChange={e => setCatFilters(p => ({...p, military: e.target.checked}))} className="accent-red-500" />
           </label>
           <label className="flex items-center justify-between cursor-pointer text-purple-400">
              <span>RESEARCH</span>
              <input type="checkbox" checked={catFilters.research} onChange={e => setCatFilters(p => ({...p, research: e.target.checked}))} className="accent-purple-500" />
           </label>
        </div>

        <div className="bg-cyan-950/80 p-2 text-cyan-300 font-bold tracking-widest text-[10px] border-b border-cyan-500/30 uppercase">
          COMPANY / SYSTEM
        </div>
        <div className="p-3 overflow-y-auto custom-scrollbar flex-1 text-xs">
          <select 
            className="w-full bg-black/50 border border-cyan-500/30 text-cyan-200 p-2 outline-none focus:border-cyan-400"
            value={selectedSystem}
            onChange={e => setSelectedSystem(e.target.value)}
          >
            <option value="ALL">-- SHOW ALL SYSTEMS --</option>
            {uniqueSystems.map(sys => (
              <option key={sys} value={sys}>{sys}</option>
            ))}
          </select>
        </div>
        
        <div className="p-2 text-[9px] text-cyan-700 bg-cyan-950/30 border-t border-cyan-500/30 text-center uppercase tracking-widest">
          {filteredData.length} ACTIVE TARGETS MATCH
        </div>
      </div>
    </div>
  );
}
