'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getInitialLoadingPhase } from '@/features/world-eye/loadingScreenState';
import { loadPreferences, savePreferences } from '@/lib/preferences';

interface LoadingScreenProps {
  appStatus: 'ready' | 'degraded' | 'loading';
  onComplete: () => void;
}

export function LoadingScreen({ appStatus, onComplete }: LoadingScreenProps) {
  const [phase, setPhase] = useState<'intro' | 'shrinking' | 'done'>(() =>
    getInitialLoadingPhase(false),
  );
  const hasTriggeredShrink = useRef(false);
  const shrinkTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const statusText =
    appStatus === 'loading'
      ? 'Initializing live open-data sources...'
      : appStatus === 'degraded'
        ? 'Connected with partial source coverage...'
        : 'Ready';

  const triggerExit = useCallback(() => {
    if (hasTriggeredShrink.current) return;
    hasTriggeredShrink.current = true;

    shrinkTimerRef.current = setTimeout(() => {
      setPhase('shrinking');
      doneTimerRef.current = setTimeout(() => {
        savePreferences({ hasSeenIntro: true });
        setPhase('done');
      }, 900);
    }, 600);
  }, []);

  useEffect(() => {
    const nextPhase = getInitialLoadingPhase(loadPreferences().hasSeenIntro);
    if (nextPhase !== 'done') return;

    const timer = window.setTimeout(() => {
      setPhase('done');
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase === 'done') {
      onComplete();
      return;
    }

    const maxWaitTimer = setTimeout(() => {
      triggerExit();
    }, 5000);

    return () => clearTimeout(maxWaitTimer);
  }, [onComplete, phase, triggerExit]);

  useEffect(() => {
    return () => {
      if (shrinkTimerRef.current) clearTimeout(shrinkTimerRef.current);
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (appStatus !== 'loading' && phase === 'intro') {
      triggerExit();
    }
  }, [appStatus, phase, triggerExit]);

  if (phase === 'done') return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: phase === 'shrinking' ? 'opacity 600ms ease-out' : undefined,
        opacity: phase === 'shrinking' ? 0 : 1,
        pointerEvents: phase === 'shrinking' ? 'none' : 'auto',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: phase === 'shrinking' ? '12px' : '56px',
          fontWeight: 700,
          color: '#F5F5F7',
          letterSpacing: phase === 'shrinking' ? '0.28em' : '0',
          lineHeight: 1.07,
          textTransform: phase === 'shrinking' ? 'uppercase' : undefined,
          transition: 'all 800ms cubic-bezier(0.4, 0, 0.2, 1)',
          position: phase === 'shrinking' ? 'fixed' : 'relative',
          top: phase === 'shrinking' ? '28px' : undefined,
          left: phase === 'shrinking' ? '28px' : undefined,
          opacity: phase === 'shrinking' ? 0.7 : 1,
        }}
      >
        World Eye
      </h1>

      <div
        style={{
          marginTop: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          transition: 'opacity 300ms ease',
          opacity: phase === 'shrinking' ? 0 : 1,
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: appStatus === 'ready' ? '#5AC8FA' : 'var(--we-text-secondary)',
            animation: 'pulse-dot 1.5s ease-in-out infinite',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '15px',
            fontWeight: 400,
            color: 'var(--we-text-secondary)',
          }}
        >
          {statusText}
        </span>
      </div>
    </div>
  );
}
