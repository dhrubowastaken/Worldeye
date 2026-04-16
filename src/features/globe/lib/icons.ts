const CATEGORY_COLORS: Record<string, string> = {
  civilian: '#5eead4',
  military: '#f87171',
  research: '#facc15',
};

export const CATEGORY_HEX = CATEGORY_COLORS;

export function getIconSvg(type: 'air' | 'water', category: string): string {
  const color = CATEGORY_COLORS[category] ?? '#dbeafe';
  let svgPath = '';

  if (type === 'air') {
    svgPath = `<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="${color}" filter="drop-shadow(0px 0px 4px ${color})" />`;
  } else {
    svgPath = `<path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19z" fill="${color}" filter="drop-shadow(0px 0px 4px ${color})" />`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64">${svgPath}</svg>`;
}
