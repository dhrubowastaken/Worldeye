import { DEFAULT_SOURCE_IDS } from '@/features/sources/sourceRegistry';
import type { EntityCategory, LayerVisibility } from '@/features/traffic/types';

export interface Preferences {
  layers: LayerVisibility;
  categories: Record<EntityCategory, boolean>;
  activeSourceIds: string[];
  mapStyle: 'satellite' | 'political' | 'dark' | 'terrain';
  mapQuality: number;
  hasSeenIntro: boolean;
}

const STORAGE_KEY = 'worldeye_preferences';

export const DEFAULT_PREFERENCES: Preferences = {
  layers: {
    air: true,
    space: true,
    earth: true,
    weather: true,
    disaster: true,
    'space-weather': true,
    media: true,
    imagery: true,
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
  activeSourceIds: DEFAULT_SOURCE_IDS,
  mapStyle: 'satellite',
  mapQuality: 1,
  hasSeenIntro: false,
};

export function loadPreferences(): Preferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_PREFERENCES };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PREFERENCES };
    }

    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      layers: { ...DEFAULT_PREFERENCES.layers, ...(parsed.layers ?? {}) },
      categories: { ...DEFAULT_PREFERENCES.categories, ...(parsed.categories ?? {}) },
      activeSourceIds: Array.isArray(parsed.activeSourceIds)
        ? parsed.activeSourceIds.filter((value): value is string => typeof value === 'string')
        : DEFAULT_PREFERENCES.activeSourceIds,
      mapStyle: parsed.mapStyle ?? DEFAULT_PREFERENCES.mapStyle,
      mapQuality: parsed.mapQuality ?? DEFAULT_PREFERENCES.mapQuality,
      hasSeenIntro: parsed.hasSeenIntro ?? DEFAULT_PREFERENCES.hasSeenIntro,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(partial: Partial<Preferences>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const current = loadPreferences();
    const merged: Preferences = {
      ...current,
      ...partial,
      layers: { ...current.layers, ...(partial.layers ?? {}) },
      categories: { ...current.categories, ...(partial.categories ?? {}) },
      activeSourceIds: partial.activeSourceIds ?? current.activeSourceIds,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Silently ignore storage errors (e.g. private browsing quota).
  }
}
