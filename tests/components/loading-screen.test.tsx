import { act, render } from '@testing-library/react';

import { LoadingScreen } from '@/features/world-eye/components/LoadingScreen';

describe('LoadingScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('completes the intro after source state degrades', () => {
    const onComplete = jest.fn();

    const view = render(
      <LoadingScreen
        appStatus="degraded"
        onComplete={onComplete}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(600);
    });

    act(() => {
      jest.advanceTimersByTime(1);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onComplete).toHaveBeenCalled();
    expect(view.container.firstChild).toBeNull();
  });
});
