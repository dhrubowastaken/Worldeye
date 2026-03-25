import categoryMapData from '../../data/satellite-category-map.json';

export interface SatelliteCategoryInfo {
  category: 'civilian' | 'military' | 'research';
  system: string;
}

export function classifySatellite(fullName: string): SatelliteCategoryInfo {
  const name = fullName.toUpperCase();

  // Try exact keyword match first
  const civilianIdx = categoryMapData.keywords.civilian.findIndex(k => name.includes(k));
  if (civilianIdx !== -1) {
    const key = categoryMapData.keywords.civilian[civilianIdx];
    return { category: 'civilian', system: categoryMapData.systems[key as keyof typeof categoryMapData.systems] || 'Unknown' };
  }

  const researchIdx = categoryMapData.keywords.research.findIndex(k => name.includes(k));
  if (researchIdx !== -1) {
    const key = categoryMapData.keywords.research[researchIdx];
    return { category: 'research', system: categoryMapData.systems[key as keyof typeof categoryMapData.systems] || 'Science/Gov' };
  }

  const militaryIdx = categoryMapData.keywords.military.findIndex(k => name.includes(k));
  if (militaryIdx !== -1) {
    const key = categoryMapData.keywords.military[militaryIdx];
    return { category: 'military', system: categoryMapData.systems[key as keyof typeof categoryMapData.systems] || 'Defense' };
  }

  // Fallback regex patterns
  const researchRegex = new RegExp(categoryMapData.fallbackRegex.research, 'i');
  const militaryRegex = new RegExp(categoryMapData.fallbackRegex.military, 'i');
  const numericRegex = new RegExp(categoryMapData.fallbackRegex.numericNorad, 'i');

  if (researchRegex.test(name)) {
    return { category: 'research', system: 'Science/Gov' };
  }
  if (militaryRegex.test(name)) {
    return { category: 'military', system: 'Defense' };
  }
  if (numericRegex.test(name)) {
    return { category: 'research', system: 'Unknown' };
  }

  return { category: 'civilian', system: 'Unknown' };
}

export function shortenName(fullName: string, maxLength = 28): string {
  // Clean up the name: trim, collapse whitespace
  const cleaned = fullName.replace(/\s+/g, ' ').trim();
  
  // If it's already short enough, return as-is
  if (cleaned.length <= maxLength) return cleaned;
  
  // Try to find a good break point (space or dash)
  const breakIdx = cleaned.lastIndexOf(' ', maxLength);
  if (breakIdx > maxLength * 0.6) {
    // Found a space within reasonable distance
    return `${cleaned.slice(0, breakIdx).trim()}...`;
  }
  
  // Fall back to hard truncation
  return `${cleaned.slice(0, maxLength).trim()}...`;
}
