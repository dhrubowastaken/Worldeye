import { useState, useEffect, useRef } from 'react';
import * as satellite from 'satellite.js';

// Parses TLE string into an array of satellite records
function parseTLE(tleData: string) {
  const lines = tleData.split('\n');
  const satellites = [];
  for (let i = 0; i < lines.length; i += 3) {
    if (lines[i] && lines[i + 1] && lines[i + 2]) {
      const name = lines[i].trim();
      const tleLine1 = lines[i + 1].trim();
      const tleLine2 = lines[i + 2].trim();
      try {
        const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
        satellites.push({ name, satrec });
      } catch (e) {
        // Skip invalid records
      }
    }
  }
  return satellites;
}

const FALLBACK_TLES = `
ISS (ZARYA)
1 25544U 98067A   23060.52302325  .00016717  00000-0  30164-3 0  9995
2 25544  51.6419 220.7303 0005959  51.6441  74.0537 15.49502919385203
HUBBLE SPACE TELESCOPE
1 20580U 90037B   23060.16641204  .00001099  00000-0  48227-4 0  9997
2 20580  28.4691 140.7580 0002882 329.1765 190.1706 15.09346648430752
`;

export default function useSpaceTraffic() {
  const [satelliteData, setSatelliteData] = useState<any[]>([]);
  const isFetched = useRef(false);
  const satRecords = useRef<any[]>([]);

  useEffect(() => {
    if (isFetched.current) return;
    isFetched.current = true;

    fetch('/api/celestrak/NORAD/elements/gp.php?GROUP=active&FORMAT=tle')
      .then(res => {
         if (!res.ok) throw new Error("CelesTrak 500 Error");
         return res.text();
      })
      .then(data => {
        satRecords.current = parseTLE(data);
      })
      .catch(err => {
        console.warn("Using fallback TLEs because CelesTrak failed:", err.message);
        satRecords.current = parseTLE(FALLBACK_TLES);
      });
  }, []);

  // Compute positions dynamically every frame (or every 1000ms to save CPU since it's a huge array)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = 0;

    const updatePositions = (timestamp: number) => {
      // Throttle updates to ~15fps or less to keep the UI snappy with 8000 satellites
      if (timestamp - lastTime > 1000) {
        lastTime = timestamp;
        const now = new Date();
        const positions = satRecords.current.map(sat => {
          const positionAndVelocity = satellite.propagate(sat.satrec, now);
          if (positionAndVelocity.position && typeof positionAndVelocity.position !== 'boolean') {
            const gmst = satellite.gstime(now);
            const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
            const longitude = satellite.degreesLong(positionGd.longitude);
            const latitude = satellite.degreesLat(positionGd.latitude);
            const altitude = positionGd.height * 1000; // to meters
            return {
              id: sat.name,
              name: sat.name,
              coordinates: [longitude, latitude, altitude]
            };
          }
          return null;
        }).filter(Boolean);

        setSatelliteData(positions);
      }
      animationFrameId = requestAnimationFrame(updatePositions);
    };

    animationFrameId = requestAnimationFrame(updatePositions);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return satelliteData;
}
