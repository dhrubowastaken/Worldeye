'use client';

import { useState, useEffect, useRef } from 'react';

const ADSB_API = '/api/adsb/v2';

export default function useAirTraffic(viewState: any, enableLoading: boolean = true) {
  const [flights, setFlights] = useState<any[]>([]);
  const lastFetch = useRef(0);
  const debounceTimer = useRef<any>(null);

  useEffect(() => {
    if (!enableLoading || viewState.zoom < 4.5) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      setFlights([]);
      return;
    }

    const fetchFlights = async () => {
      const now = Date.now();
      if (now - lastFetch.current < 5000) return;
      
      const { latitude, longitude } = viewState;
      
      // Always fetch maximum 250NM radius to fill the viewport homogeneously
      const radiusNm = 250;

      lastFetch.current = now;

      try {
        const response = await fetch(`${ADSB_API}/lat/${latitude.toFixed(3)}/lon/${longitude.toFixed(3)}/dist/${radiusNm}`);
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.ac) {
           const mappedFlights = data.ac.map((ac: any) => {
             const callsign = ac.flight ? ac.flight.trim() : 'UNKNOWN';
             const isMil = ac.mil || ac.t?.startsWith('F') || ac.t?.startsWith('C1') || callsign.startsWith('RCH') || callsign.startsWith('AF1');
             const category = isMil ? 'military' : 'civilian';
             const system = callsign !== 'UNKNOWN' ? callsign.substring(0, 3) : 'General Aviation';

             return {
               id: ac.hex,
               type: 'air',
               category,
               system,
               callsign,
               coordinates: [ac.lon, ac.lat, (ac.alt_baro || 0) * 0.3048],
               track: ac.track || 0,
               velocity: ac.gs || 0 
             };
           });
           setFlights(mappedFlights);
        }
      } catch (err) {
        console.error("Failed to fetch air traffic", err);
        setFlights([]);
      }
    };

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(fetchFlights, 1000);

    return () => clearTimeout(debounceTimer.current);
  }, [viewState, enableLoading]);

  // Dead reckoning animation loop for smooth path projection
  useEffect(() => {
    if (!enableLoading) return;
    let animationFrameId: number;
    let lastTime = Date.now();

    const animateFlights = () => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setFlights(prev => {
        if (!prev || prev.length === 0) return prev;
        
        return prev.map(ac => {
          if (!ac.velocity || !ac.track) return ac;
          const speedMpS = ac.velocity * 0.514444; // knots to m/this
          if (speedMpS <= 0) return ac;

          const headingRad = ac.track * (Math.PI / 180);
          // Latitude approximation
          const dx = (speedMpS * Math.sin(headingRad) * dt) / (111320 * Math.cos(ac.coordinates[1] * Math.PI / 180));
          const dy = (speedMpS * Math.cos(headingRad) * dt) / 111320;
          
          return { ...ac, coordinates: [ac.coordinates[0] + dx, ac.coordinates[1] + dy, ac.coordinates[2]] };
        });
      });
      animationFrameId = requestAnimationFrame(animateFlights);
    };
    
    animationFrameId = requestAnimationFrame(animateFlights);
    return () => cancelAnimationFrame(animationFrameId);
  }, [enableLoading]);

  return flights;
}
