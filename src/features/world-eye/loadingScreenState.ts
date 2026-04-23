export function getInitialLoadingPhase(hasSeenIntro: boolean): 'intro' | 'done' {
  return hasSeenIntro ? 'done' : 'intro';
}
