import { test, expect } from '@playwright/test';

test('loads the intelligence shell and key controls', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('worldeye_preferences', JSON.stringify({
      hasSeenIntro: true,
    }));
  });

  await page.route('**/api/adsb/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ac: [
          {
            hex: 'abc123',
            flight: 'DAL123 ',
            lat: 33.64,
            lon: -84.42,
            alt_baro: 32000,
            track: 180,
            gs: 430,
          },
        ],
      }),
    });
  });

  await page.route('**/api/celestrak/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: `ISS (ZARYA)
1 25544U 98067A   23060.52302325  .00016717  00000-0  30164-3 0  9995
2 25544  51.6419 220.7303 0005959  51.6441  74.0537 15.49502919385203
`,
    });
  });

  await page.route('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        features: [
          {
            id: 'us7000test',
            properties: {
              mag: 4.8,
              time: '2026-04-22T00:00:00.000Z',
              title: 'M 4.8 - Test Region',
              url: 'https://example.test/usgs-event',
            },
            geometry: {
              coordinates: [12.4, 41.9, 10],
            },
          },
        ],
      }),
    });
  });

  await page.route('https://eonet.gsfc.nasa.gov/api/v3/events/geojson?status=open&days=30&limit=80', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        features: [
          {
            id: 'EONET-1',
            properties: {
              title: 'Wildfire Cluster',
              date: '2026-04-22T00:00:00.000Z',
              categories: [{ title: 'Wildfires' }],
              link: 'https://example.test/eonet',
            },
            geometry: {
              type: 'Point',
              coordinates: [-120.5, 37.7],
            },
          },
        ],
      }),
    });
  });

  await page.route('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        features: [
          {
            id: 'GDACS-1',
            properties: {
              alertlevel: 'red',
              name: 'Cyclone Example',
              eventtype: 'TC',
              fromdate: '2026-04-22T00:00:00.000Z',
              url: 'https://example.test/gdacs',
            },
            geometry: {
              coordinates: [88.4, 21.4],
            },
          },
        ],
      }),
    });
  });

  await page.route('https://api.open-meteo.com/v1/forecast?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        current: {
          temperature_2m: 27.4,
          wind_speed_10m: 18,
          time: '2026-04-22T00:00:00.000Z',
        },
        current_units: {
          temperature_2m: 'C',
        },
      }),
    });
  });

  await page.route('https://air-quality-api.open-meteo.com/v1/air-quality?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        current: {
          european_aqi: 42,
          time: '2026-04-22T00:00:00.000Z',
        },
      }),
    });
  });

  await page.route('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          time_tag: '2026-04-22T00:00:00.000Z',
          kp_index: 3.7,
        },
      ]),
    });
  });

  await page.route('https://earth-search.aws.element84.com/v1/search', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        features: [
          {
            id: 'S2A_TEST',
            collection: 'sentinel-2-l2a',
            properties: {
              datetime: '2026-04-20T10:12:00.000Z',
              'eo:cloud_cover': 12.3,
              platform: 'Sentinel-2A',
            },
            assets: {
              thumbnail: {
                href: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
              },
            },
            links: [
              {
                rel: 'self',
                href: 'https://example.test/earth-search/item/S2A_TEST',
              },
            ],
          },
        ],
      }),
    });
  });

  await page.goto('/');

  await expect(page.getByText('World Eye')).toBeVisible();
  await expect(page.getByRole('button', { name: /settings/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Data points', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /inspect latest imagery/i })).toBeVisible();
  await expect(page.getByText('Aircraft')).toBeVisible();
  await expect(page.getByText('Orbital Objects')).toBeVisible();

  await page.getByRole('button', { name: 'Data points', exact: true }).click();

  await expect(page.getByRole('heading', { name: /data sources/i })).toBeVisible();
  await expect(page.getByText('Traffic')).toBeVisible();
  await expect(page.getByText('Earth Events')).toBeVisible();
  await expect(page.getByText('Media & Imagery')).toBeVisible();
  await expect(page.getByText('Conflict Signals')).toBeVisible();

  await page.getByRole('button', { name: /close menu/i }).click();
  await page.getByRole('button', { name: /inspect latest imagery/i }).click();
  await page.locator('.maplibregl-canvas').click({ position: { x: 200, y: 200 } });

  await expect(page.getByRole('heading', { name: 'Sentinel-2A' })).toBeVisible();
  await expect(page.getByText(/newest scene: sentinel-2-l2a 2026-04-20t10:12:00.000z/i)).toBeVisible();
  await expect(page.getByText('12.3%')).toBeVisible();
  await expect(page.getByText('2026-04-20T10:12:00.000Z', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /open source/i })).toBeVisible();
});
