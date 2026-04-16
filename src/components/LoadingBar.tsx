'use client';

import React from 'react';
import { useLoading } from './LoadingContext';

interface LoadingBarProps {
  type?: 'general' | 'auth';
}

export default function LoadingBar({ type = 'general' }: LoadingBarProps) {
  const { loadingStates } = useLoading();
  
  const relevantStates = Object.values(loadingStates).filter(state => {
    if (type === 'auth') return state.id.startsWith('auth-');
    return !state.id.startsWith('auth-');
  });

  const visibleStates = relevantStates.filter(state => state.isVisible);
  if (visibleStates.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-1 items-end max-w-[320px]">
      {visibleStates.map(state => {
        const isError = state.message.toLowerCase().includes('failed') || state.message.toLowerCase().includes('error');
        return (
          <div key={state.id} className="bg-black/70 backdrop-blur-sm border border-cyan-500/30 rounded-sm overflow-hidden w-full">
            <div className={`px-2 py-1 text-xs font-mono leading-tight ${isError ? 'text-red-400' : 'text-cyan-300'}`}>
              {state.message}
            </div>
            <div className="px-2 pb-1">
              <div className="w-full bg-black/50 rounded-full h-1 overflow-hidden">
                <div
                  className={`${state.color} h-1 rounded-full transition-all duration-300 ease-out`}
                  style={{ width: `${state.progress}%` }}
                ></div>
              </div>
              <div className="text-cyan-400 text-[10px] font-mono text-right mt-0.5">
                {Math.round(state.progress)}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
