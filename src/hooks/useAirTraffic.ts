import { useState, useEffect, useRef } from 'react';

// Use the local Vite proxy to bypass CORS
const ADSB_API = '/api/adsb/v2';

export default function useAirTraffic(viewState: any) {
  const [flights, setFlights] = useState<any[]>([]);
  const lastFetch = useRef(0);
  const debounceTimer = useRef<any>(null);

  useEffect(() => {
    const fetchFlights = async () => {
      const now = Date.now();
      // Rate limit to once every 5 seconds per viewport change
      if (now - lastFetch.current < 5000) return;
      
      const { latitude, longitude, zoom } = viewState;
      
      // Calculate a rough radius based on zoom. 
      // max API radius is 250nm (approx 460km).
      let radiusRadiusNm = 250;
      if (zoom > 5) radiusRadiusNm = 100;
      if (zoom > 8) radiusRadiusNm = 50;

      lastFetch.current = now;

      try {
        const response = await fetch(`${ADSB_API}/lat/${latitude.toFixed(3)}/lon/${longitude.toFixed(3)}/dist/${radiusRadiusNm}`);
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.ac) {
           const mappedFlights = data.ac.map((ac: any) => ({
             id: ac.hex,
             callsign: ac.flight ? ac.flight.trim() : 'UNKNOWN',
             coordinates: [ac.lon, ac.lat, (ac.alt_baro || 0) * 0.3048], // feet to meters
             track: ac.track || 0,
             velocity: ac.gs || 0 // ground speed in knots
           }));
           setFlights(mappedFlights);
        }
      } catch (err) {
        console.error("Failed to fetch air traffic", err);
      }
    };

    // Debounce the fetch so we don't spam while the user is actively dragging the globe map
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(fetchFlights, 1000);

    return () => clearTimeout(debounceTimer.current);
  }, [viewState]);

  return flights;
}
