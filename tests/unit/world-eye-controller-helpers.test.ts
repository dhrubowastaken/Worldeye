import { buildSourceQueryKey } from '@/features/world-eye/useWorldEyeController';

describe('buildSourceQueryKey', () => {
  test('keeps global feeds stable across viewport changes', () => {
    expect(
      buildSourceQueryKey('space.celestrak', '10.00:10.00:z2:air,space', 0),
    ).toBe('space.celestrak:global:0');

    expect(
      buildSourceQueryKey('events.usgs-earthquakes', '12.00:12.00:z2:earth', 2),
    ).toBe('events.usgs-earthquakes:global:2');
  });

  test('keeps viewport-sensitive feeds keyed to the live view', () => {
    expect(
      buildSourceQueryKey('air.adsb', '10.00:10.00:z2:air,space', 0),
    ).toBe('air.adsb:10.00:10.00:z2:air,space:0');

    expect(
      buildSourceQueryKey('weather.open-meteo', '12.00:12.00:z2:weather', 3),
    ).toBe('weather.open-meteo:12.00:12.00:z2:weather:3');
  });
});
