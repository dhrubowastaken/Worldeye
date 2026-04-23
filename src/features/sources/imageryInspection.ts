import type { ImageryInspection } from '@/features/sources/types';

interface StacSearchResponse {
  features?: Array<{
    id?: string;
    collection?: string;
    properties?: {
      datetime?: string;
      'eo:cloud_cover'?: number;
      platform?: string;
    };
    assets?: Record<string, { href?: string; type?: string; title?: string }>;
    links?: Array<{ rel?: string; href?: string }>;
  }>;
}

export async function inspectLatestImagery(
  coordinate: [number, number],
  signal?: AbortSignal,
): Promise<ImageryInspection> {
  const requestedAt = new Date().toISOString();

  try {
    const stac = await inspectEarthSearch(coordinate, requestedAt, signal);
    if (stac.status === 'ready') {
      return stac;
    }
  } catch {
    // Fall through to GIBS.
  }

  return inspectGibs(coordinate, requestedAt);
}

async function inspectEarthSearch(
  coordinate: [number, number],
  requestedAt: string,
  signal?: AbortSignal,
): Promise<ImageryInspection> {
  const [longitude, latitude] = coordinate;
  const delta = 0.025;
  const response = await fetch('https://earth-search.aws.element84.com/v1/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal,
    body: JSON.stringify({
      collections: ['sentinel-2-l2a', 'landsat-c2-l2'],
      bbox: [longitude - delta, latitude - delta, longitude + delta, latitude + delta],
      datetime: '2020-01-01/..',
      limit: 1,
      sortby: [{ field: 'properties.datetime', direction: 'desc' }],
    }),
  });

  if (!response.ok) {
    return {
      coordinate,
      requestedAt,
      status: 'degraded',
      summary: 'Earth Search imagery lookup unavailable',
    };
  }

  const payload = (await response.json()) as StacSearchResponse;
  const item = payload.features?.[0];
  if (!item) {
    return {
      coordinate,
      requestedAt,
      status: 'not_found',
      summary: 'No recent Sentinel/Landsat scene found for this location',
    };
  }

  const preview =
    item.assets?.thumbnail?.href ??
    item.assets?.rendered_preview?.href ??
    item.assets?.visual?.href;

  return {
    coordinate,
    requestedAt,
    status: 'ready',
    provider: item.properties?.platform ?? 'Element84 Earth Search',
    collection: item.collection,
    sceneDate: item.properties?.datetime,
    cloudCover: item.properties?.['eo:cloud_cover'],
    previewUrl: preview,
    sourceUrl: item.links?.find((link) => link.rel === 'self')?.href,
    summary: `Newest scene: ${item.collection ?? 'Earth Search'} ${item.properties?.datetime ?? ''}`.trim(),
  };
}

function inspectGibs(
  coordinate: [number, number],
  requestedAt: string,
): ImageryInspection {
  const date = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().slice(0, 10);
  const [longitude, latitude] = coordinate;
  const delta = 0.35;
  const bbox = [
    (longitude - delta).toFixed(4),
    (latitude - delta).toFixed(4),
    (longitude + delta).toFixed(4),
    (latitude + delta).toFixed(4),
  ].join(',');
  const tileUrl =
    `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor&STYLES=&FORMAT=image/jpeg&TRANSPARENT=false&WIDTH=512&HEIGHT=512&CRS=EPSG:4326&BBOX=${bbox}&TIME=${date}`;

  return {
    coordinate,
    requestedAt,
    status: 'degraded',
    provider: 'NASA GIBS',
    collection: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    layer: 'True Color',
    sceneDate: date,
    tileUrl,
    sourceUrl: 'https://nasa-gibs.github.io/gibs-api-docs/access-basics/',
    summary: 'Using NASA GIBS browse imagery fallback',
  };
}
