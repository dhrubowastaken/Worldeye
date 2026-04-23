import { twoline2satrec } from '../../node_modules/satellite.js/dist/io.js';
import { gstime, propagate } from '../../node_modules/satellite.js/dist/propagation.js';
import {
  degreesLat,
  degreesLong,
  eciToGeodetic,
} from '../../node_modules/satellite.js/dist/transforms.js';

import type { SatRec } from '../../node_modules/satellite.js/dist/propagation/SatRec.js';

export const SATELLITE_RUNTIME_IMPORTS = [
  'satellite.js/dist/io.js',
  'satellite.js/dist/propagation.js',
  'satellite.js/dist/transforms.js',
] as const;

export {
  degreesLat,
  degreesLong,
  eciToGeodetic,
  gstime,
  propagate,
  twoline2satrec,
};

export type { SatRec };
