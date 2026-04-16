import { test, expect } from '@playwright/test';

test('loads the intelligence shell and key controls', async ({ page }) => {
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

  await page.route('**/data/satellite-names.json', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        satellites: {
          '25544': {
            primaryName: 'ISS (ZARYA)',
          },
        },
      }),
    });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: /global intelligence surface/i })).toBeVisible();
  await expect(page.getByText(/operational picture/i)).toBeVisible();
  await expect(page.getByText(/view controls/i)).toBeVisible();
  await expect(page.getByText(/cross-domain activity/i)).toBeVisible();
});
