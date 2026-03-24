// @ts-nocheck
import React, { useState, useCallback, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { _GlobeView as GlobeView } from '@deck.gl/core';
import { ScatterplotLayer, BitmapLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';

import useAirTraffic from '../hooks/useAirTraffic';
import useSpaceTraffic from '../hooks/useSpaceTraffic';
import useWaterTraffic from '../hooks/useWaterTraffic';

const INITIAL_VIEW_STATE = {
  longitude: -74,
  latitude: 40,
  zoom: 4,
  minZoom: 0,
  maxZoom: 10,
};

export default function GlobeMonitor() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  
  const [showAir, setShowAir] = useState(true);
  const [showSpace, setShowSpace] = useState(true);
  const [showWater, setShowWater] = useState(true);

  const airTraffic = useAirTraffic(viewState);
  const spaceTraffic = useSpaceTraffic();
  const waterTraffic = useWaterTraffic(viewState);

  const onViewStateChange = useCallback(({ viewState }: any) => {
    setViewState(viewState);
  }, []);

  const layers = useMemo(() => [
    // 1. High-Res Satellite Imagery Base (Photorealistic)
    new TileLayer({
      id: 'satellite-tiles',
      data: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      minZoom: 0,
      maxZoom: 19,
      tileSize: 256,
      renderSubLayers: props => {
        const { bbox: {west, south, east, north} } = props.tile;
        return new BitmapLayer(props, {
          data: null,
          image: props.data,
          bounds: [west, south, east, north]
        });
      }
    }),
    
    // 2. Space Traffic Layer (Teal glowing dots)
    showSpace && new ScatterplotLayer({
      id: 'space-traffic',
      data: spaceTraffic,
      pickable: true,
      opacity: 0.9,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 2,
      radiusMaxPixels: 6,
      lineWidthMinPixels: 1,
      getPosition: (d: any) => d.coordinates,
      getFillColor: [0, 255, 200, 200], // Teal core
      getLineColor: [0, 255, 200, 100], // Teal glow ring
      getRadius: 100000, 
    }),

    // 3. Air Traffic Layer (Cyan blinking blip style)
    showAir && new ScatterplotLayer({
      id: 'air-traffic',
      data: airTraffic,
      pickable: true,
      opacity: 1,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 3,
      radiusMaxPixels: 10,
      lineWidthMinPixels: 2,
      getPosition: (d: any) => d.coordinates,
      getFillColor: [20, 220, 255, 255], // Bright Cyan Core
      getLineColor: [255, 255, 255, 255], // White halo
      getRadius: 15000, 
    }),

    // 4. Water Traffic Layer (Dark Blue dots)
    showWater && new ScatterplotLayer({
      id: 'water-traffic',
      data: waterTraffic,
      pickable: true,
      opacity: 0.9,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 2,
      radiusMaxPixels: 8,
      lineWidthMinPixels: 1,
      getPosition: (d: any) => d.coordinates,
      getFillColor: [10, 80, 255, 255], // Blue
      getLineColor: [100, 150, 255, 150], // Soft border
      getRadius: 5000,
    })

  ].filter(Boolean), [viewState, showAir, showSpace, showWater, airTraffic, spaceTraffic, waterTraffic]);

  return (
    <div className="absolute inset-0 w-full h-full bg-black">
       <DeckGL
        views={new GlobeView({
          id: 'globe',
          resolution: 2 
        })}
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers as any}
        onViewStateChange={onViewStateChange}
        parameters={{
          clearColor: [0, 0, 0, 1] 
        }}
        getTooltip={({object}: any) => object && {
           html: `<div>
              <b>${object.name || object.callsign || object.id}</b><br/>
              Lat: ${object.coordinates[1].toFixed(2)}<br/>
              Lon: ${object.coordinates[0].toFixed(2)}<br/>
              Alt: ${Math.round(object.coordinates[2])}m
            </div>`,
           style: {
             backgroundColor: 'rgba(5, 10, 15, 0.9)',
             color: '#22d3ee',
             border: '1px solid #22d3ee',
             fontFamily: 'monospace',
             fontSize: '12px'
           }
        }}
      />
      
      {/* Telemetry Display (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-10 text-xs text-cyan-400 font-mono flex flex-col gap-1 opacity-80 pointer-events-none backdrop-blur-sm bg-black/30 p-2 border border-cyan-900/50">
        <div>MGRS: --</div>
        <div>LAT: {viewState.latitude.toFixed(4)}</div>
        <div>LON: {viewState.longitude.toFixed(4)}</div>
        <div>ALT: {(viewState.zoom * 1000).toFixed(0)} KM</div>
      </div>
      
      {/* Panoptic Controls (Right Panel) */}
      <div className="absolute top-20 right-6 z-10 w-64 bg-black/60 backdrop-blur-md border border-cyan-500/30 text-white font-mono text-sm shadow-[0_0_15px_rgba(0,255,255,0.1)]">
        <div className="bg-cyan-950/80 p-2 text-cyan-300 font-bold tracking-widest text-xs border-b border-cyan-500/30">
          DATA LAYERS
        </div>
        <div className="p-4 flex flex-col gap-3">
           <label className="flex items-center justify-between cursor-pointer hover:text-cyan-300 transition-colors">
              <span>AIR TRAFFIC</span>
              <input type="checkbox" checked={showAir} onChange={e => setShowAir(e.target.checked)} className="accent-cyan-500" />
           </label>
           <label className="flex items-center justify-between cursor-pointer hover:text-cyan-300 transition-colors">
              <span>SPACE TRAFFIC</span>
              <input type="checkbox" checked={showSpace} onChange={e => setShowSpace(e.target.checked)} className="accent-cyan-500" />
           </label>
           <label className="flex items-center justify-between cursor-pointer hover:text-cyan-300 transition-colors">
              <span>MARITIME AIS</span>
              <input type="checkbox" checked={showWater} onChange={e => setShowWater(e.target.checked)} className="accent-cyan-500" />
           </label>
        </div>
        <div className="p-3 text-[10px] text-gray-500 border-t border-cyan-500/30 leading-tight">
          Progressive loading active. Fetching data for current viewport bounds only. Space layer operates on local physics propagation (zero API cost).
        </div>
      </div>
    </div>
  );
}
