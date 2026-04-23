import { buildResetDataPointState } from '@/features/world-eye/dataPointState';

describe('buildResetDataPointState', () => {
  test('hides all layers while preserving category filters and clearing source toggles', () => {
    expect(buildResetDataPointState()).toEqual({
      layers: {
        air: false,
        space: false,
        earth: false,
        weather: false,
        disaster: false,
        'space-weather': false,
        media: false,
        imagery: false,
      },
      categories: {
        civilian: true,
        military: true,
        research: true,
        environment: true,
        hazard: true,
        weather: true,
        disaster: true,
        media: true,
        'space-weather': true,
        imagery: true,
      },
      activeSourceIds: [],
    });
  });
});
