const N2YO_API_KEY = import.meta.env.VITE_N2YO_API_KEY || '';

export interface SatelliteNameEntry {
  noradId: string;
  primaryName: string;
  alternativeNames: string[];
  lastFetchedAt: string;
}

export interface SatelliteNamesCache {
  satellites: Record<string, SatelliteNameEntry>;
  lastUpdated: string;
  version: number;
}

let cachedData: SatelliteNamesCache | null = null;

export async function loadCacheFromFile(): Promise<SatelliteNamesCache> {
  if (cachedData) return cachedData;

  try {
    const response = await fetch('/data/satellite-names.json');
    if (response.ok) {
      cachedData = await response.json();
      console.log(`📡 Loaded ${Object.keys(cachedData.satellites).length} satellite names from cache`);
      return cachedData;
    }
  } catch (e) {
    console.warn('⚠️  Failed to load satellite names cache:', e);
  }

  return {
    satellites: {},
    lastUpdated: new Date().toISOString(),
    version: 1
  };
}

export async function saveCacheToFile(cache: SatelliteNamesCache): Promise<void> {
  try {
    // In production, you'd POST this to a backend
    // For now, just keep in memory
    cachedData = cache;
    console.log(`💾 Cache updated with ${Object.keys(cache.satellites).length} entries`);
  } catch (e) {
    console.error('Failed to persist cache:', e);
  }
}

export async function fetchSatelliteNameFromN2YO(noradId: string): Promise<SatelliteNameEntry | null> {
  if (!N2YO_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(`https://api.n2yo.com/rest/v1/satellite/tle/${noradId}?apiKey=${N2YO_API_KEY}`);
    if (response.ok) {
      const data = await response.json();
      const primaryName = data.info?.satname || `NORAD ${noradId}`;
      
      return {
        noradId,
        primaryName,
        alternativeNames: data.info?.intldes ? [data.info.intldes] : [],
        lastFetchedAt: new Date().toISOString()
      };
    }
  } catch (e) {
    console.warn(`Failed to fetch N2YO data for ${noradId}`);
  }

  return null;
}

export async function getSatelliteNameByNoradId(noradId: string): Promise<string> {
  const cache = await loadCacheFromFile();

  // Check cache first - no API call needed
  if (cache.satellites[noradId]) {
    return cache.satellites[noradId].primaryName;
  }

  // Only try N2YO if API key is available
  if (N2YO_API_KEY) {
    const entry = await fetchSatelliteNameFromN2YO(noradId);
    if (entry) {
      cache.satellites[noradId] = entry;
      await saveCacheToFile(cache);
      return entry.primaryName;
    }
  }

  // Fallback: keep the numeric ID, don't generate fake names
  return noradId;
}

/**
 * Extract NORAD ID from a TLE line 1
 * Format: 1 NNNNNX ...
 */
export function extractNoradIdFromTLE(tleLine1: string): string | null {
  const match = tleLine1.match(/^\s*1\s+(\d+)/);
  return match ? match[1] : null;
}
