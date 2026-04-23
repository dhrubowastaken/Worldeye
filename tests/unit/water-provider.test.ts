import { createWaterProvider, normalizeAisMessage } from '@/features/traffic/providers/waterProvider';
import type { ViewportQuery } from '@/features/traffic/types';

const query: ViewportQuery = {
  center: [0, 0],
  zoom: 4,
  pitch: 0,
  detail: 'medium',
  key: 'test',
  bounds: { north: 1, south: -1, east: 1, west: -1 },
  visibleLayerKinds: ['earth'],
};

describe('waterProvider no-key fallback', () => {
  test('does not require AIS credentials or retain vessel snapshots', async () => {
    const provider = createWaterProvider();

    await expect(provider.fetchSnapshot(query)).resolves.toMatchObject({
      entities: [],
      health: {
        providerId: 'water-provider',
        status: 'unsupported_region',
        retryable: false,
      },
    });
  });

  test('keeps the legacy AIS normalizer inert until a verified no-key source exists', () => {
    expect(normalizeAisMessage()).toBeNull();
  });
});
