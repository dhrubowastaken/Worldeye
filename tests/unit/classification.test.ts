import { classifySatellite, shortenEntityLabel } from '@/features/traffic/lib/classification';

describe('classifySatellite', () => {
  test('maps known commercial constellations to civilian systems', () => {
    expect(classifySatellite('STARLINK-1234')).toEqual({
      category: 'civilian',
      system: 'SpaceX Starlink',
    });
  });

  test('maps defense payloads to military systems', () => {
    expect(classifySatellite('USA 245')).toEqual({
      category: 'military',
      system: 'Defense/USA',
    });
  });

  test('treats bare NORAD identifiers as research/unknown', () => {
    expect(classifySatellite('NORAD 25544')).toEqual({
      category: 'research',
      system: 'Unknown',
    });
  });
});

describe('shortenEntityLabel', () => {
  test('truncates long labels without destroying the readable prefix', () => {
    expect(shortenEntityLabel('AN EXTREMELY LONG SATELLITE DESIGNATION', 18)).toBe(
      'AN EXTREMELY LONG...',
    );
  });
});
