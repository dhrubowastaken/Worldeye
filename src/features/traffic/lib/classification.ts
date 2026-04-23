import type { EntityClassification } from '@/features/traffic/types';
import { SATELLITE_CLASSIFICATION } from '@/features/traffic/config/satelliteClassification';

const SYSTEMS = SATELLITE_CLASSIFICATION.systems as Record<string, string>;

function matchKeyword(name: string, keywords: readonly string[]): string | null {
  return keywords.find((keyword) => name.includes(keyword)) ?? null;
}

export function classifySatellite(fullName: string): EntityClassification {
  const normalized = fullName.toUpperCase();

  const civilianMatch = matchKeyword(
    normalized,
    SATELLITE_CLASSIFICATION.keywords.civilian,
  );
  if (civilianMatch) {
    return {
      category: 'civilian',
      system: SYSTEMS[civilianMatch] ?? 'Unknown',
    };
  }

  const researchMatch = matchKeyword(
    normalized,
    SATELLITE_CLASSIFICATION.keywords.research,
  );
  if (researchMatch) {
    return {
      category: 'research',
      system: SYSTEMS[researchMatch] ?? 'Science/Gov',
    };
  }

  const militaryMatch = matchKeyword(
    normalized,
    SATELLITE_CLASSIFICATION.keywords.military,
  );
  if (militaryMatch) {
    return {
      category: 'military',
      system: SYSTEMS[militaryMatch] ?? 'Defense',
    };
  }

  if (SATELLITE_CLASSIFICATION.fallbackRegex.research.test(normalized)) {
    return { category: 'research', system: 'Science/Gov' };
  }

  if (SATELLITE_CLASSIFICATION.fallbackRegex.militaryUsa.test(normalized)) {
    return { category: 'military', system: 'Defense/USA' };
  }

  if (SATELLITE_CLASSIFICATION.fallbackRegex.military.test(normalized)) {
    return { category: 'military', system: 'Defense' };
  }

  if (SATELLITE_CLASSIFICATION.fallbackRegex.numericNorad.test(normalized)) {
    return { category: 'research', system: 'Unknown' };
  }

  return { category: 'civilian', system: 'Unknown' };
}

export function shortenEntityLabel(fullName: string, maxLength = 28): string {
  const cleaned = fullName.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const breakIndex = cleaned.lastIndexOf(' ', maxLength);
  if (breakIndex > maxLength * 0.6) {
    return `${cleaned.slice(0, breakIndex).trim()}...`;
  }

  return `${cleaned.slice(0, maxLength).trim()}...`;
}
