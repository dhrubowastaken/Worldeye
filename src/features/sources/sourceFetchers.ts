import {
  buildEntity,
  buildSourceHealth,
  emptySourceResult,
  isFiniteCoordinate,
  nowIso,
} from '@/features/sources/sourceCore';
import { OrbitalRuntime } from '@/features/sources/orbitalRuntime';
import type {
  SourceDefinition,
  SourceFetchContext,
  SourceFetcher,
  SourceIndicator,
  SourceResult,
} from '@/features/sources/types';
import type { EntitySeverity, TrackedEntity } from '@/features/traffic/types';

const orbitalRuntime = new OrbitalRuntime();

interface RawAircraft {
  hex?: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | 'ground';
  track?: number;
  gs?: number;
  t?: string;
  mil?: boolean;
}

interface RawAircraftResponse {
  ac?: RawAircraft[];
}

export function getOrbitPath(entityId: string): Array<[number, number]> {
  return orbitalRuntime.getOrbitPath(entityId);
}

export const SOURCE_FETCHERS: Record<string, SourceFetcher> = {
  'air.adsb': fetchAdsb,
  'space.celestrak': fetchCelestrak,
  'events.usgs-earthquakes': fetchEarthquakes,
  'events.nasa-eonet': fetchEonet,
  'events.gdacs': fetchGdacs,
  'weather.open-meteo': fetchWeather,
  'air-quality.open-meteo': fetchAirQuality,
  'marine.open-meteo': fetchMarine,
  'flood.open-meteo': fetchFlood,
  'space-weather.noaa-swpc': fetchSpaceWeather,
  'media.gdelt': fetchGdeltMediaSignals,
  'imagery.earth-search': fetchImageryPlaceholder,
  'imagery.gibs': fetchImageryPlaceholder,
};

export async function fetchSourceSnapshot(
  definition: SourceDefinition,
  context: SourceFetchContext,
): Promise<SourceResult> {
  const fetcher = SOURCE_FETCHERS[definition.id];
  if (!fetcher) {
    return emptySourceResult(
      definition,
      'unsupported_region',
      `${definition.label} is not implemented in this build`,
    );
  }

  return fetcher(definition, context);
}

async function fetchAdsb(
  source: SourceDefinition,
  context: SourceFetchContext,
): Promise<SourceResult> {
  if (context.zoom < 3.8) {
    return emptySourceResult(source, 'ready', 'Zoom in to load live aircraft');
  }

  const [longitude, latitude] = context.center;
  const radiusNm = context.zoom >= 7 ? 120 : context.zoom >= 4.5 ? 220 : 320;
  const response = await fetch(
    `/api/adsb/v2/lat/${latitude.toFixed(3)}/lon/${longitude.toFixed(3)}/dist/${radiusNm}`,
    { signal: context.signal },
  );

  if (!response.ok) {
    return emptySourceResult(source, 'degraded', 'ADSB.lol aircraft feed unavailable');
  }

  const payload = (await response.json()) as RawAircraftResponse;
  const entities = (payload.ac ?? [])
    .map((record) => normalizeAircraft(record, source.id))
    .filter((entity): entity is TrackedEntity => Boolean(entity));

  return readyResult(source, entities, [], `Tracking ${entities.length} aircraft`);
}

export function normalizeAircraft(record: RawAircraft, sourceId = 'air.adsb'): TrackedEntity | null {
  if (!record.hex || !isFiniteCoordinate(record.lon, record.lat)) {
    return null;
  }

  const longitude = Number(record.lon);
  const latitude = Number(record.lat);
  const label = record.flight?.trim() || record.hex.toUpperCase();
  const military =
    Boolean(record.mil) ||
    record.t?.startsWith('F') ||
    record.t?.startsWith('C1') ||
    label.startsWith('RCH') ||
    label.startsWith('AF1');
  const altitude = typeof record.alt_baro === 'number' ? record.alt_baro * 0.3048 : 0;

  return buildEntity({
    id: `AIR-${record.hex}`,
    kind: 'air',
    label,
    category: military ? 'military' : 'civilian',
    severity: military ? 'moderate' : 'info',
    system: military ? 'Defense Air' : label !== record.hex.toUpperCase() ? label.slice(0, 3) : 'Aircraft',
    longitude,
    latitude,
    altitude,
    sourceId,
    metrics: {
      heading: record.track ?? 0,
      speed: record.gs ?? 0,
    },
    metadata: {
      transponder: record.t ?? 'unknown',
      hex: record.hex,
    },
  });
}

async function fetchCelestrak(
  source: SourceDefinition,
  context: SourceFetchContext,
): Promise<SourceResult> {
  const primaryResponse = await fetch(
    '/api/celestrak/NORAD/elements/gp.php?GROUP=active&FORMAT=tle',
    { signal: context.signal },
  );

  let tleData: string | null = null;
  let healthStatus: SourceResult['health']['status'] = 'ready';
  let summary = 'Tracking orbital objects from CelesTrak active GP data';
  const warnings: string[] = [];

  if (primaryResponse.status === 403) {
    const fallbackResponse = await fetch(
      '/api/celestrak/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
      { signal: context.signal },
    );

    if (!fallbackResponse.ok) {
      return emptySourceResult(source, 'rate_limited', 'CelesTrak active GP feed rate limited');
    }

    tleData = await fallbackResponse.text();
    healthStatus = 'degraded';
    summary = 'CelesTrak active GP feed rate limited; showing tracked stations fallback';
    warnings.push(
      'CelesTrak currently rate-limits repeated downloads of GROUP=active. Showing the smaller stations group until the active feed refreshes.',
    );
  } else if (!primaryResponse.ok) {
    return emptySourceResult(source, 'degraded', 'CelesTrak GP feed unavailable');
  } else {
    tleData = await primaryResponse.text();
  }

  if (!tleData) {
    return emptySourceResult(source, 'degraded', 'CelesTrak GP feed unavailable');
  }

  orbitalRuntime.replaceCatalog(tleData);
  const entities = orbitalRuntime.propagate(source.id);

  return {
    ...readyResult(
      source,
      entities,
      [],
      `${summary} (${entities.length} objects)`,
      [
        ...warnings,
        `Loaded ${orbitalRuntime.size} GP records. TLE records are approaching a 5-digit catalog-number transition in 2026.`,
      ],
    ),
    health: buildSourceHealth(
      source,
      healthStatus,
      `${summary} (${entities.length} objects)`,
    ),
  };
}

async function fetchEarthquakes(
  source: SourceDefinition,
  context: SourceFetchContext,
): Promise<SourceResult> {
  const response = await fetch(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
    { signal: context.signal },
  );

  if (!response.ok) {
    return emptySourceResult(source, 'degraded', 'USGS earthquake feed unavailable');
  }

  const payload = (await response.json()) as {
    features?: Array<{
      id?: string;
      properties?: Record<string, unknown>;
      geometry?: { coordinates?: [number, number, number?] };
    }>;
  };

  const entities = (payload.features ?? [])
    .map((feature) => {
      const coordinates = feature.geometry?.coordinates;
      const properties = feature.properties ?? {};
      if (!coordinates || !isFiniteCoordinate(coordinates[0], coordinates[1])) {
        return null;
      }

      const magnitude = numberValue(properties.mag);
      const time = dateValue(properties.time);
      const title = stringValue(properties.title) ?? 'Earthquake';

      return buildEntity({
        id: `USGS-${feature.id ?? `${coordinates[0]}-${coordinates[1]}-${time}`}`,
        kind: 'earth',
        label: title,
        category: 'hazard',
        severity: severityFromMagnitude(magnitude),
        system: 'Earthquake',
        longitude: Number(coordinates[0]),
        latitude: Number(coordinates[1]),
        altitude: (coordinates[2] ?? 0) * -1000,
        sourceId: source.id,
        observedAt: time,
        updatedAt: dateValue(properties.updated),
        metrics: { value: magnitude, unit: 'M' },
        confidence: 0.9,
        metadata: {
          ...properties,
          summary: buildEarthquakeSummary(title, magnitude, properties),
          affectedArea: `Estimated impact radius ${earthquakeImpactRadiusKm(magnitude)} km`,
          whyItMatters: buildEarthquakeImportance(magnitude, properties),
          alertLevel: stringValue(properties.alert) ?? 'n/a',
          feltReports: numberValue(properties.felt),
          tsunami: properties.tsunami === 1,
          impactRadiusKm: earthquakeImpactRadiusKm(magnitude),
        },
        renderables: [
          {
            overlayType: 'impact-radius',
            priority: 2,
            payload: {
              radiusKm: earthquakeImpactRadiusKm(magnitude),
            },
          },
        ],
        links: linkValue(properties.url, 'USGS event'),
      });
    })
    .filter((entity): entity is TrackedEntity => Boolean(entity));

  return readyResult(source, entities, [], `Tracking ${entities.length} recent earthquakes`);
}

async function fetchEonet(
  source: SourceDefinition,
  context: SourceFetchContext,
): Promise<SourceResult> {
  const response = await fetch(
    'https://eonet.gsfc.nasa.gov/api/v3/events/geojson?status=open&days=30&limit=80',
    { signal: context.signal },
  );

  if (!response.ok) {
    return emptySourceResult(source, 'degraded', 'NASA EONET feed unavailable');
  }

  const payload = (await response.json()) as {
    features?: Array<{
      id?: string;
      properties?: Record<string, unknown>;
      geometry?: { type?: string; coordinates?: unknown };
    }>;
  };

  const entities = (payload.features ?? [])
    .map((feature) => {
      const point = firstCoordinate(feature.geometry?.coordinates);
      const properties = feature.properties ?? {};
      if (!point) {
        return null;
      }

      const title = stringValue(properties.title) ?? 'Natural event';
      const date = stringValue(properties.date) ?? nowIso();
      const category = arrayTitle(properties.categories) ?? 'Natural Event';

      return buildEntity({
        id: `EONET-${feature.id ?? title}`,
        kind: 'earth',
        label: title,
        category: 'environment',
        severity: 'moderate',
        system: category,
        longitude: point[0],
        latitude: point[1],
        sourceId: source.id,
        observedAt: date,
        confidence: 0.78,
        metadata: {
          ...properties,
          summary: `${title} is active in the NASA EONET feed.`,
          affectedArea: geometryLabel(feature.geometry?.type),
          whyItMatters: 'Natural event feeds help track evolving hazards that can affect infrastructure, logistics, and safety.',
          geometryType: feature.geometry?.type,
          geometryCoordinates: feature.geometry?.coordinates,
        },
        links: linkValue(properties.link, 'NASA EONET event'),
      });
    })
    .filter((entity): entity is TrackedEntity => Boolean(entity));

  return readyResult(source, entities, [], `Tracking ${entities.length} open natural events`);
}

async function fetchGdacs(
  source: SourceDefinition,
  context: SourceFetchContext,
): Promise<SourceResult> {
  const end = new Date();
  const start = new Date(end.getTime() - 1000 * 60 * 60 * 24 * 30);
  const params = new URLSearchParams({
    eventlist: 'EQ;TC;FL;VO;DR',
    fromdate: isoDate(start),
    todate: isoDate(end),
    alertlevel: 'red;orange',
  });
  const response = await fetch(
    `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?${params}`,
    { signal: context.signal },
  );

  if (!response.ok) {
    return emptySourceResult(source, 'degraded', 'GDACS disaster feed unavailable');
  }

  const payload = (await response.json()) as {
    features?: Array<{
      id?: string;
      properties?: Record<string, unknown>;
      geometry?: { coordinates?: unknown };
    }>;
  };

  const entities = (payload.features ?? [])
    .map((feature) => {
      const point = firstCoordinate(feature.geometry?.coordinates);
      const properties = feature.properties ?? {};
      if (!point) {
        return null;
      }

      const alert = String(properties.alertlevel ?? properties.alertLevel ?? '').toLowerCase();
      return buildEntity({
        id: `GDACS-${feature.id ?? `${point[0]}-${point[1]}`}`,
        kind: 'disaster',
        label: stringValue(properties.name) ?? stringValue(properties.eventname) ?? 'GDACS alert',
        category: 'disaster',
        severity: alert === 'red' ? 'critical' : 'high',
        system: stringValue(properties.eventtype) ?? 'Disaster',
        longitude: point[0],
        latitude: point[1],
        sourceId: source.id,
        observedAt: stringValue(properties.fromdate) ?? stringValue(properties.datemodified) ?? nowIso(),
        confidence: 0.82,
        metadata: {
          ...properties,
          summary: 'GDACS is flagging a high-severity disaster alert for this area.',
          affectedArea: geometryLabel(undefined),
          whyItMatters: 'High GDACS alert levels can point to population, logistics, and emergency-response disruption.',
          alertLevel: alert || 'unknown',
        },
        links: linkValue(properties.url, 'GDACS event'),
      });
    })
    .filter((entity): entity is TrackedEntity => Boolean(entity));

  return readyResult(source, entities, [], `Tracking ${entities.length} high-severity GDACS alerts`);
}

async function fetchWeather(
  source: SourceDefinition,
  context: SourceFetchContext,
): Promise<SourceResult> {
  const [longitude, latitude] = context.center;
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: 'temperature_2m,wind_speed_10m,precipitation',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    signal: context.signal,
  });

  if (!response.ok) {
    return emptySourceResult(source, 'degraded', 'Open-Meteo weather unavailable');
  }

  const payload = (await response.json()) as {
    current?: Record<string, unknown>;
    current_units?: Record<string, string>;
  };
  const temp = numberValue(payload.current?.temperature_2m);
  const wind = numberValue(payload.current?.wind_speed_10m);
  const observedAt = stringValue(payload.current?.time) ?? nowIso();
  const severity = severityFromThresholds(wind, { high: 60, moderate: 35 });
  const entity = buildEntity({
    id: 'OPEN-METEO-WEATHER-CENTER',
    kind: 'weather',
    label: `Weather ${formatNumber(temp)}${payload.current_units?.temperature_2m ?? 'C'}`,
    category: 'weather',
    severity,
    system: 'Weather',
    longitude,
    latitude,
    sourceId: source.id,
    observedAt,
    metrics: { value: temp, unit: payload.current_units?.temperature_2m ?? 'C', speed: wind ?? 0 },
    metadata: {
      ...(payload.current ?? {}),
      summary: 'Current weather sample at the map center.',
      whyItMatters: 'Weather influences visibility, air operations, and overall regional operating conditions.',
    },
  });

  return readyResult(
    source,
    [entity],
    indicator(source, 'temperature', entity.label, temp, severity, observedAt),
    'Weather loaded for map center',
  );
}

async function fetchAirQuality(
  source: SourceDefinition,
  context: SourceFetchContext,
): Promise<SourceResult> {
  const [longitude, latitude] = context.center;
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: 'european_aqi,pm10,pm2_5',
  });
  const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`, {
    signal: context.signal,
  });

  if (!response.ok) {
    return emptySourceResult(source, 'degraded', 'Open-Meteo air quality unavailable');
  }

  const payload = (await response.json()) as { current?: Record<string, unknown> };
  const aqi = numberValue(payload.current?.european_aqi);
  const observedAt = stringValue(payload.current?.time) ?? nowIso();
  const severity = severityFromThresholds(aqi, { high: 100, moderate: 50 });
  const entity = buildEntity({
    id: 'OPEN-METEO-AIR-QUALITY-CENTER',
    kind: 'weather',
    label: `Air quality AQI ${formatNumber(aqi)}`,
    category: 'weather',
    severity,
    system: 'Air Quality',
    longitude,
    latitude,
    sourceId: source.id,
    observedAt,
    metrics: { value: aqi, unit: 'EAQI' },
    metadata: {
      ...(payload.current ?? {}),
      summary: 'Current air-quality sample at the map center.',
      whyItMatters: 'Air quality affects visibility, health risk, and how long field activity can be sustained.',
    },
  });

  return readyResult(
    source,
    [entity],
    indicator(source, 'aqi', entity.label, aqi, severity, observedAt),
    'Air quality loaded for map center',
  );
}

async function fetchMarine(
  source: SourceDefinition,
  context: SourceFetchContext,
): Promise<SourceResult> {
  const [longitude, latitude] = context.center;
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: 'wave_height,wave_direction,wave_period',
  });
  const response = await fetch(`https://marine-api.open-meteo.com/v1/marine?${params}`, {
    signal: context.signal,
  });

  if (response.status === 400) {
    return emptySourceResult(source, 'unsupported_region', 'Marine data unavailable for this location');
  }

  if (!response.ok) {
    return emptySourceResult(source, 'degraded', 'Open-Meteo marine feed unavailable');
  }

  const payload = (await response.json()) as { current?: Record<string, unknown> };
  const waveHeight = numberValue(payload.current?.wave_height);
  const observedAt = stringValue(payload.current?.time) ?? nowIso();
  const severity = severityFromThresholds(waveHeight, { high: 5, moderate: 2.5 });
  const entity = buildEntity({
    id: 'OPEN-METEO-MARINE-CENTER',
    kind: 'weather',
    label: `Marine waves ${formatNumber(waveHeight)} m`,
    category: 'weather',
    severity,
    system: 'Marine',
    longitude,
    latitude,
    sourceId: source.id,
    observedAt,
    metrics: { value: waveHeight, unit: 'm' },
    metadata: {
      ...(payload.current ?? {}),
      summary: 'Current sea-state sample at the map center.',
      whyItMatters: 'Marine conditions can constrain ports, chokepoints, and offshore activity.',
    },
  });

  return readyResult(
    source,
    [entity],
    indicator(source, 'wave-height', entity.label, waveHeight, severity, observedAt),
    'Marine data loaded for map center',
  );
}

async function fetchFlood(
  source: SourceDefinition,
  context: SourceFetchContext,
): Promise<SourceResult> {
  const [longitude, latitude] = context.center;
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    daily: 'river_discharge',
    forecast_days: '1',
  });
  const response = await fetch(`https://flood-api.open-meteo.com/v1/flood?${params}`, {
    signal: context.signal,
  });

  if (response.status === 400) {
    return emptySourceResult(source, 'unsupported_region', 'Flood data unavailable for this location');
  }

  if (!response.ok) {
    return emptySourceResult(source, 'degraded', 'Open-Meteo flood feed unavailable');
  }

  const payload = (await response.json()) as { daily?: { river_discharge?: number[]; time?: string[] } };
  const discharge = payload.daily?.river_discharge?.[0];
  const observedAt = payload.daily?.time?.[0] ?? nowIso();
  const entity = buildEntity({
    id: 'OPEN-METEO-FLOOD-CENTER',
    kind: 'disaster',
    label: `River discharge ${formatNumber(discharge)} m3/s`,
    category: 'disaster',
    severity: typeof discharge === 'number' && discharge > 5000 ? 'high' : 'info',
    system: 'Flood',
    longitude,
    latitude,
    sourceId: source.id,
    observedAt,
    metrics: { value: discharge, unit: 'm3/s' },
    metadata: {
      ...(payload.daily ?? {}),
      summary: 'Current flood indicator at the map center.',
      affectedArea: 'River basin indicator',
      whyItMatters: 'High discharge can foreshadow flooding and transport disruption downstream.',
    },
  });

  return readyResult(source, [entity], indicator(source, 'river-discharge', entity.label, discharge, entity.severity ?? 'info', observedAt), 'Flood indicator loaded for map center');
}

async function fetchSpaceWeather(
  source: SourceDefinition,
  context: SourceFetchContext,
): Promise<SourceResult> {
  const response = await fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json', {
    signal: context.signal,
  });

  if (!response.ok) {
    return emptySourceResult(source, 'degraded', 'NOAA SWPC K-index feed unavailable');
  }

  const payload = (await response.json()) as Array<Record<string, unknown>>;
  const latest = payload[payload.length - 1] ?? {};
  const kp = numberValue(latest.kp_index ?? latest.Kp);
  const observedAt = stringValue(latest.time_tag) ?? nowIso();
  const severity = severityFromThresholds(kp, { critical: 7, high: 5, moderate: 4 });
  const entity = buildEntity({
    id: 'NOAA-SWPC-KP',
    kind: 'space-weather',
    label: `Planetary Kp ${formatNumber(kp)}`,
    category: 'space-weather',
    severity,
    system: 'Geomagnetic',
    longitude: context.center[0],
    latitude: context.center[1],
    sourceId: source.id,
    observedAt,
    metrics: { value: kp, unit: 'Kp' },
    metadata: {
      ...latest,
      summary: 'Latest NOAA planetary K-index reading.',
      whyItMatters: 'Geomagnetic activity can affect communications, GNSS, and satellite operations.',
    },
  });

  return readyResult(
    source,
    [entity],
    indicator(source, 'kp-index', entity.label, kp, severity, observedAt),
    'NOAA SWPC K-index loaded',
  );
}

async function fetchGdeltMediaSignals(
  source: SourceDefinition,
  context: SourceFetchContext,
): Promise<SourceResult> {
  const params = new URLSearchParams({
    query: '(war OR conflict OR protest OR attack OR evacuation)',
    mode: 'artlist',
    format: 'json',
    maxrecords: '25',
    sort: 'hybridrel',
  });
  const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`, {
    signal: context.signal,
  });

  if (!response.ok) {
    return emptySourceResult(source, 'degraded', 'GDELT media signal endpoint unavailable');
  }

  const payload = (await response.json()) as { articles?: Array<Record<string, unknown>> };
  const articles = payload.articles ?? [];
  const entity = buildEntity({
    id: 'GDELT-MEDIA-SIGNAL-CENTER',
    kind: 'media',
    label: `${articles.length} conflict-related media signals`,
    category: 'media',
    severity: articles.length >= 20 ? 'high' : articles.length >= 8 ? 'moderate' : 'info',
    system: 'Media Signal',
    longitude: context.center[0],
    latitude: context.center[1],
    sourceId: source.id,
    confidence: 0.45,
    metadata: {
      caveat: 'Media-derived signal, not authoritative conflict ground truth.',
      articles: articles.slice(0, 5),
      summary: 'Media-derived signal density for conflict, protest, or disruption topics.',
      whyItMatters: 'Useful as an early lead for open-source intelligence, but not authoritative by itself.',
    },
    links: articles
      .map((article) => ({
        label: stringValue(article.title) ?? 'GDELT article',
        url: stringValue(article.url) ?? '',
      }))
      .filter((link) => link.url),
  });

  return readyResult(source, [entity], [], 'GDELT media signals loaded with caveat');
}

async function fetchImageryPlaceholder(
  source: SourceDefinition,
): Promise<SourceResult> {
  return readyResult(source, [], [], `${source.label} ready for inspect mode`);
}

function readyResult(
  source: SourceDefinition,
  entities: TrackedEntity[],
  indicators: SourceIndicator[],
  summary: string,
  warnings: string[] = [],
): SourceResult {
  return {
    sourceId: source.id,
    entities,
    indicators,
    health: buildSourceHealth(source, 'ready', summary),
    warnings,
    links: [{ label: source.label, url: source.termsUrl }],
  };
}

function indicator(
  source: SourceDefinition,
  id: string,
  label: string,
  value: number | undefined,
  severity: EntitySeverity,
  observedAt: string,
): SourceIndicator[] {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return [];
  }

  return [{
    id: `${source.id}.${id}`,
    sourceId: source.id,
    label,
    value: formatNumber(value),
    severity: severity ?? 'info',
    observedAt,
  }];
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function dateValue(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }

  return stringValue(value) ?? nowIso();
}

function formatNumber(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(value >= 10 ? 0 : 1)
    : 'n/a';
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function severityFromMagnitude(magnitude: number | undefined): EntitySeverity {
  if (typeof magnitude !== 'number') {
    return 'info';
  }

  if (magnitude >= 7) return 'critical';
  if (magnitude >= 6) return 'high';
  if (magnitude >= 4.5) return 'moderate';
  return 'low';
}

function severityFromThresholds(
  value: number | undefined,
  thresholds: {
    critical?: number;
    high?: number;
    moderate?: number;
  },
): EntitySeverity {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'info';
  }

  if (typeof thresholds.critical === 'number' && value >= thresholds.critical) {
    return 'critical';
  }

  if (typeof thresholds.high === 'number' && value >= thresholds.high) {
    return 'high';
  }

  if (typeof thresholds.moderate === 'number' && value >= thresholds.moderate) {
    return 'moderate';
  }

  return 'info';
}

function linkValue(value: unknown, label: string): Array<{ label: string; url: string }> {
  const url = stringValue(value);
  return url ? [{ label, url }] : [];
}

function earthquakeImpactRadiusKm(magnitude: number | undefined): number {
  if (typeof magnitude !== 'number' || !Number.isFinite(magnitude)) {
    return 40;
  }

  if (magnitude >= 7) return 220;
  if (magnitude >= 6) return 140;
  if (magnitude >= 5) return 80;
  return 40;
}

function buildEarthquakeSummary(
  title: string,
  magnitude: number | undefined,
  properties: Record<string, unknown>,
): string {
  const place = stringValue(properties.place);
  return `${title}${place ? ` near ${place}` : ''} was recorded at magnitude ${formatNumber(magnitude)}.`;
}

function buildEarthquakeImportance(
  magnitude: number | undefined,
  properties: Record<string, unknown>,
): string {
  const tsunami = properties.tsunami === 1
    ? ' Public tsunami messaging is present for this event.'
    : '';
  const felt = numberValue(properties.felt);
  return `Earthquakes can disrupt transport, power, ports, and communications.${typeof felt === 'number' ? ` ${formatNumber(felt)} felt reports were logged.` : ''}${tsunami}`;
}

function geometryLabel(type: unknown): string {
  if (typeof type === 'string' && type.trim()) {
    return `${type} geometry available`;
  }

  return 'Point-referenced event';
}

function arrayTitle(value: unknown): string | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const first = value[0] as { title?: unknown } | undefined;
  return stringValue(first?.title);
}

function firstCoordinate(value: unknown): [number, number] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (value.length >= 2 && isFiniteCoordinate(value[0], value[1])) {
    return [Number(value[0]), Number(value[1])];
  }

  for (const entry of value) {
    const result = firstCoordinate(entry);
    if (result) {
      return result;
    }
  }

  return null;
}
