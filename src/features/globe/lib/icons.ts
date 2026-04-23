import type { EntityCategory, EntityKind } from '@/features/traffic/types';

/** Warm, luminous palette — non-military, observatory aesthetic. */
const CATEGORY_COLORS: Record<string, string> = {
  civilian: '#5AC8FA',
  military: '#FF6B6B',
  research: '#FBBF24',
  environment: '#34D399',
  hazard: '#FF9F43',
  weather: '#48BFE3',
  disaster: '#EF4444',
  media: '#F472B6',
  'space-weather': '#A78BFA',
  imagery: '#E0E7FF',
};

export const CATEGORY_HEX = CATEGORY_COLORS;

/**
 * Extended color map keyed by `kind-category` for the legend.
 * Falls back to the category-level color when a specific combo isn't defined.
 */
export const DATA_POINT_COLORS: Record<string, string> = {
  'air-civilian': '#5AC8FA',
  'air-military': '#FF6B6B',
  'space-civilian': '#A78BFA',
  'space-military': '#F472B6',
  'space-research': '#FBBF24',
  'earth-environment': '#34D399',
  'earth-hazard': '#FF9F43',
  'weather-weather': '#48BFE3',
  'disaster-disaster': '#EF4444',
  'media-media': '#F472B6',
  'space-weather-space-weather': '#A78BFA',
  'imagery-imagery': '#E0E7FF',
};

export function getEntityColor(kind: EntityKind, category: EntityCategory): string {
  return DATA_POINT_COLORS[`${kind}-${category}`] ?? CATEGORY_COLORS[category] ?? '#F5F5F7';
}

export function getIconSvg(type: 'air', category: string): string {
  const color = CATEGORY_COLORS[category] ?? '#F5F5F7';
  const svgPath = `<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="${color}" filter="drop-shadow(0px 0px 4px ${color})" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64">${svgPath}</svg>`;
}
