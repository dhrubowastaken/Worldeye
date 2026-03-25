import { useState, useEffect, useRef } from 'react';
import * as satellite from 'satellite.js';
import { useLoading } from '../components/LoadingContext';
import { classifySatellite, shortenName } from '../utils/satelliteCategoryMap';
import { loadCacheFromFile, saveCacheToFile, fetchSatelliteNameFromN2YO, extractNoradIdFromTLE } from '../utils/satelliteNameResolver';

// Parses TLE string into an array of satellite records
function parseTLE(tleData: string) {
  const lines = tleData.split('\n');
  const satellites: Array<{ name: string; satrec: any; tleLine1: string; noradId?: string }> = [];
  for (let i = 0; i < lines.length; i += 3) {
    if (lines[i] && lines[i + 1] && lines[i + 2]) {
      let name = lines[i].trim();
      const tleLine1 = lines[i + 1].trim();
      const tleLine2 = lines[i + 2].trim();

      // Extract NORAD ID from TLE line 1 if name is numeric
      let noradId: string | undefined;
      if (/^\d+$/.test(name)) {
        noradId = name;
      } else {
        noradId = extractNoradIdFromTLE(tleLine1) || undefined;
      }

      try {
        const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
        satellites.push({ name, satrec, tleLine1, noradId });
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

const SPACE_TRACK_USERNAME = import.meta.env.VITE_SPACE_TRACK_USERNAME || '';
const SPACE_TRACK_PASSWORD = import.meta.env.VITE_SPACE_TRACK_PASSWORD || '';
const N2YO_API_KEY = import.meta.env.VITE_N2YO_API_KEY || '';

console.log('Space-Track env vars loaded:', !!SPACE_TRACK_USERNAME, !!SPACE_TRACK_PASSWORD);
console.log('N2YO API key loaded:', !!N2YO_API_KEY);

export default function useSpaceTraffic(options?: { onLoadingComplete?: () => void }) {
  const [satelliteData, setSatelliteData] = useState<any[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showLoading, updateProgress, hideLoading } = useLoading();
  const isFetched = useRef(false);
  const satRecords = useRef<any[]>([]);

  useEffect(() => {
    if (isFetched.current) return;
    isFetched.current = true;

    const fetchSpaceTrack = async () => {
      if (!SPACE_TRACK_USERNAME || !SPACE_TRACK_PASSWORD) {
        console.log('Space-Track: No credentials provided');
        return null;
      }

      showLoading('auth-spacetrack', 'Authenticating with Space-Track...');
      const loginResponse = await fetch('/api/space-track/ajaxauth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `identity=${encodeURIComponent(SPACE_TRACK_USERNAME)}&password=${encodeURIComponent(SPACE_TRACK_PASSWORD)}`,
        credentials: 'include'
      });

      console.log('Space-Track login status:', loginResponse.status, loginResponse.statusText);
      if (!loginResponse.ok) {
        console.error('Space-Track login failed:', loginResponse.status);
        updateProgress('auth-spacetrack', 100, 'Space-Track authentication failed');
        setTimeout(() => hideLoading('auth-spacetrack'), 3000);
        return null;
      }

      updateProgress('auth-spacetrack', 100, 'Space-Track authentication successful');
      setTimeout(() => hideLoading('auth-spacetrack'), 1500);

      // Official documented GP class (TLEs) endpoint (from Space-Track docs):
      // /basicspacedata/query/class/gp/NORAD_CAT_ID/<100000/decay_date/null-val/epoch/>now-30/orderby/norad_cat_id/format/tle
      const gpUrl = '/api/space-track/basicspacedata/query/class/gp/NORAD_CAT_ID/%3C100000/decay_date/null-val/epoch/%3Enow-30/orderby/norad_cat_id/format/tle';
      console.log('Space-Track: Querying GP URL:', gpUrl);

      try {
        const tleResponse = await fetch(gpUrl, { credentials: 'include' });
        console.log('Space-Track GP response:', tleResponse.status, tleResponse.statusText);

        if (tleResponse.status === 401) {
          console.error('Space-Track unauthorized (401) after login; check credentials');
          return null;
        }

        if (tleResponse.status === 404) {
          console.error('Space-Track GP endpoint not found (404)');
          return null;
        }

        if (!tleResponse.ok) {
          const errorText = await tleResponse.text();
          console.error('Space-Track GP fetch failed:', tleResponse.status, errorText.slice(0, 300));
          return null;
        }

        const tleData = await tleResponse.text();
        console.log('Space-Track: Received GP TLE data, length:', tleData.length);
        const satellites = parseTLE(tleData);
        console.log('Space-Track: Parsed satellites:', satellites.length);
        return satellites;
      } catch (err) {
        console.error('Space-Track fetch error:', err);
      }
      return null;
    };

    const fetchN2YO = async () => {
      if (!N2YO_API_KEY) {
        console.log('N2YO: No API key provided');
        return [];
      }

      showLoading('auth-n2yo', 'Authenticating with N2YO...');
      const additionalSatellites = [];

      // List of satellites to try fetching from N2YO (including classified ones)
      const noradIds = [43013]; // USA 247

      for (const noradId of noradIds) {
        try {
          console.log(`N2YO: Fetching TLE for NORAD ${noradId}`);
          const response = await fetch(`https://api.n2yo.com/rest/v1/satellite/tle/${noradId}?apiKey=${N2YO_API_KEY}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.tle && data.tle.length >= 2) {
              const name = data.info?.satname || `NORAD ${noradId}`;
              const tleLine1 = data.tle[0];
              const tleLine2 = data.tle[1];
              
              try {
                const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
                additionalSatellites.push({ name, satrec, tleLine1, noradId: String(noradId) });
                console.log(`N2YO: Successfully loaded ${name}`);
              } catch (e) {
                console.warn(`N2YO: Invalid TLE for ${noradId}:`, e);
              }
            } else {
              console.log(`N2YO: No TLE data for ${noradId}`);
            }
          } else {
            console.warn(`N2YO: Failed to fetch ${noradId}, status: ${response.status}`);
            if (response.status === 401 || response.status === 403) {
              updateProgress('auth-n2yo', 100, 'N2YO authentication failed - invalid API key');
              setTimeout(() => hideLoading('auth-n2yo'), 3000);
              return [];
            }
          }
        } catch (e) {
          console.warn(`N2YO: Error fetching ${noradId}:`, e);
        }
      }

      if (additionalSatellites.length > 0) {
        updateProgress('auth-n2yo', 100, 'N2YO authentication successful');
      } else {
        updateProgress('auth-n2yo', 100, 'N2YO auth success');
      }
      setTimeout(() => hideLoading('auth-n2yo'), 1500);

      return additionalSatellites;
    };

    const fetchCelesTrak = async () => {
      // Fetch TLEs from SatNOGS database
      try {
        const response = await fetch('https://db.satnogs.org/api/tle/?format=json');
        if (!response.ok) {
          console.error('SatNOGS TLE fetch failed:', response.status);
          return [];
        }
        const data = await response.json();
        console.log('SatNOGS: Fetched', data.length, 'TLEs');

        // Convert JSON to TLE text format
        const tleData = data.map((sat: any) => `${sat.tle0}\n${sat.tle1}\n${sat.tle2}\n`).join('');
        const satellites = parseTLE(tleData);
        console.log('SatNOGS: Parsed', satellites.length, 'satellites');
        return satellites;
      } catch (err) {
        console.error('SatNOGS fetch error:', err);
        return [];
      }
    };

    (async () => {
      try {
        showLoading('space-data', 'Loading satellites from all sources...');
        updateProgress('space-data', 5);

        // Step 1: Load from all sources in parallel
        console.log('Step 1: Fetching from all sources...');
        updateProgress('space-data', 10, 'Fetching Space-Track...');
        const spaceTrackSats = await fetchSpaceTrack();
        
        updateProgress('space-data', 30, 'Fetching CelesTrak...');
        const celesTrakSats = await fetchCelesTrak();
        
        updateProgress('space-data', 50, 'Fetching N2YO...');
        const n2yoSats = await fetchN2YO();

        // Step 2: Merge all sources
        console.log('Step 2: Merging sources...');
        updateProgress('space-data', 60, 'Merging satellite data...');
        
        const mergedMap = new Map();
        
        // Add Space-Track first (highest priority)
        if (spaceTrackSats) {
          spaceTrackSats.forEach(sat => mergedMap.set(sat.name, sat));
        }
        
        // Add CelesTrak (fill gaps)
        if (celesTrakSats) {
          celesTrakSats.forEach(sat => {
            if (!mergedMap.has(sat.name)) {
              mergedMap.set(sat.name, sat);
            }
          });
        }
        
        // Add N2YO (fill specific gaps)
        if (n2yoSats) {
          n2yoSats.forEach(sat => {
            if (!mergedMap.has(sat.name)) {
              mergedMap.set(sat.name, sat);
            }
          });
        }

        let satellites = Array.from(mergedMap.values());
        console.log(`Merged satellite count: ${satellites.length}`);

        if (satellites.length === 0) {
          console.warn('Using fallback TLEs because all sources failed');
          updateProgress('space-data', 70, 'Using fallback satellite data...');
          satellites = parseTLE(FALLBACK_TLES);
        } else {
          updateProgress('space-data', 70, `Merged ${satellites.length} satellites`);
        }

        satRecords.current = satellites;

        // Step 3: Resolve names using JSON cache + N2YO (optimized batch processing)
        console.log('Step 3: Resolving satellite names...');
        updateProgress('space-data', 75, 'Resolving satellite names...');
        
        const cache = await loadCacheFromFile();

        // Classification cache to avoid redundant classifySatellite calls
        const classificationCache = new Map<string, any>();

        // Batch processing function for parallel resolution
        const resolveSatelliteBatch = async (batch: typeof satellites) => {
          return batch.map(sat => {
            if (!sat.noradId) return sat;

            // Check cache first
            if (cache.satellites[sat.noradId]) {
              const cachedName = cache.satellites[sat.noradId].primaryName;
              if (cachedName && cachedName !== sat.name) {
                sat.name = cachedName;
              }

              // Use memoized classification
              if (!classificationCache.has(sat.name)) {
                classificationCache.set(sat.name, classifySatellite(sat.name));
              }
              const classification = classificationCache.get(sat.name);
              sat.category = classification.category;
              sat.system = classification.system;
              return sat;
            }

            // Fallback for uncached satellites
            if (/^\d+$/.test(sat.name)) {
              sat.name = `NORAD ${sat.noradId}`;
              sat.category = 'research';
              sat.system = 'Unknown';
            } else {
              // Classify using memoized results
              if (!classificationCache.has(sat.name)) {
                classificationCache.set(sat.name, classifySatellite(sat.name));
              }
              const classification = classificationCache.get(sat.name);
              sat.category = classification.category;
              sat.system = classification.system;
            }

            return sat;
          });
        };

        // Process satellites in parallel batches of 200
        const BATCH_SIZE = 200;
        for (let i = 0; i < satellites.length; i += BATCH_SIZE) {
          const batch = satellites.slice(i, i + BATCH_SIZE);
          await resolveSatelliteBatch(batch);
          
          // Update progress during batch processing
          const progress = Math.min(90, 75 + Math.floor((i / satellites.length) * 15));
          updateProgress('space-data', progress, `Resolving names (${Math.min(i + BATCH_SIZE, satellites.length)}/${satellites.length})`);
        }

        cache.lastUpdated = new Date().toISOString();
        await saveCacheToFile(cache);

        satRecords.current = satellites;
        setIsReady(true);

        // Step 4: Ready for classification and display
        console.log('Step 4: Satellites ready for classification');
        updateProgress('space-data', 100, `Loaded ${satellites.length} satellites`);


      } catch (e) {
        setError(`Space traffic loading error: ${e}`);
        updateProgress('space-data', 100, 'Error loading space traffic');
      } finally {
        setTimeout(() => {
          hideLoading('space-data');
          options?.onLoadingComplete?.();
        }, 1500);
      }
    })();
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
          if (!positionAndVelocity || !positionAndVelocity.position || typeof positionAndVelocity.position === 'boolean') {
            return null;
          }

          const gmst = satellite.gstime(now);
          const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
          const longitude = satellite.degreesLong(positionGd.longitude);
          const latitude = satellite.degreesLat(positionGd.latitude);
          const altitude = positionGd.height * 1000;

          const fullName = sat.name || `NORAD ${sat.noradId || 'unknown'}`;
          const classification = sat.category ? { category: sat.category, system: sat.system } : classifySatellite(fullName);
          const cleanedName = shortenName(fullName, 28);

          const category = classification.category;
          const system = classification.system;

          // Keep full name in log data for debugging, short name for UI label
          const name = cleanedName;


          return {
            id: sat.name,
            type: 'space',
            category,
            system,
            name,
            fullName: sat.name,
            coordinates: [longitude, latitude, altitude],
            track: 0
          };
        }).filter(Boolean);

        setSatelliteData(positions);
      }
      animationFrameId = requestAnimationFrame(updatePositions);
    };

    animationFrameId = requestAnimationFrame(updatePositions);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return { satelliteData: isReady ? satelliteData : [], error };
}
