import { fetchSourceSnapshot } from '@/features/sources/sourceFetchers';
import { SOURCE_DEFINITION_BY_ID } from '@/features/sources/sourceRegistry';

const spaceSource = SOURCE_DEFINITION_BY_ID.get('space.celestrak');

describe('fetchSourceSnapshot space.celestrak', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('falls back to the smaller stations group when the active group is rate limited', async () => {
    if (!spaceSource) {
      throw new Error('space.celestrak source definition is missing');
    }

    const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(mockTextResponse('rate limited', 403))
      .mockResolvedValueOnce(mockTextResponse(`ISS (ZARYA)
1 25544U 98067A   23060.52302325  .00016717  00000-0  30164-3 0  9995
2 25544  51.6419 220.7303 0005959  51.6441  74.0537 15.49502919385203
`, 200));
    globalThis.fetch = fetchMock;

    const result = await fetchSourceSnapshot(spaceSource, {
      queryKey: 'space.celestrak:global:0',
      bounds: { north: 10, south: -10, east: 10, west: -10 },
      center: [0, 0],
      zoom: 2,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/celestrak/NORAD/elements/gp.php?GROUP=active&FORMAT=tle',
      expect.objectContaining({ signal: undefined }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/celestrak/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
      expect.objectContaining({ signal: undefined }),
    );
    expect(result.health.status).toBe('degraded');
    expect(result.health.summary).toMatch(/showing tracked stations fallback/i);
    expect(result.entities).toHaveLength(1);
    expect(result.warnings.join(' ')).toMatch(/rate-limits repeated downloads of group=active/i);
  });
});

function mockTextResponse(body: string, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as Response;
}
