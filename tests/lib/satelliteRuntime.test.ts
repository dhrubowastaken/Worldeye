import { SATELLITE_RUNTIME_IMPORTS } from '@/lib/satelliteRuntime';

describe('SATELLITE_RUNTIME_IMPORTS', () => {
  test('uses the JS-only satellite.js entrypoints', () => {
    expect(SATELLITE_RUNTIME_IMPORTS).toEqual([
      'satellite.js/dist/io.js',
      'satellite.js/dist/propagation.js',
      'satellite.js/dist/transforms.js',
    ]);
  });
});
