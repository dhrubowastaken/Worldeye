import { inspectLatestImagery } from '@/features/sources/imageryInspection';

describe('inspectLatestImagery', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('prefers a recent usable ground scene over a newer cloudy scene', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        features: [
          {
            id: 'cloudy-scene',
            collection: 'sentinel-2-l2a',
            properties: {
              datetime: '2026-04-22T10:00:00.000Z',
              'eo:cloud_cover': 96,
              platform: 'Sentinel-2A',
            },
            assets: {
              thumbnail: { href: 'https://example.test/cloudy.jpg' },
            },
            links: [{ rel: 'self', href: 'https://example.test/cloudy' }],
          },
          {
            id: 'usable-scene',
            collection: 'landsat-c2-l2',
            properties: {
              datetime: '2026-04-21T10:00:00.000Z',
              'eo:cloud_cover': 8,
              platform: 'Landsat 9',
            },
            assets: {
              thumbnail: { href: 'https://example.test/usable.jpg' },
            },
            links: [{ rel: 'self', href: 'https://example.test/usable' }],
          },
        ],
      }),
    } as Response)) as typeof fetch;

    await expect(inspectLatestImagery([10, 10])).resolves.toMatchObject({
      status: 'ready',
      provider: 'Landsat 9',
      previewUrl: 'https://example.test/usable.jpg',
      cloudCover: 8,
      summary: expect.stringMatching(/usable ground scene/i),
      alternates: [
        expect.objectContaining({
          id: 'cloudy-scene',
          cloudCover: 96,
          reason: expect.stringMatching(/cloud/i),
        }),
      ],
    });
  });
});
