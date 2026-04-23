import { getInitialLoadingPhase } from '@/features/world-eye/loadingScreenState';

describe('getInitialLoadingPhase', () => {
  test('skips the intro when the user has already seen it', () => {
    expect(getInitialLoadingPhase(true)).toBe('done');
  });

  test('starts in intro mode for first-time visitors', () => {
    expect(getInitialLoadingPhase(false)).toBe('intro');
  });
});
