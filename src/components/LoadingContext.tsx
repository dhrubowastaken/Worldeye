'use client';

import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface LoadingState {
  id: string;
  isVisible: boolean;
  progress: number;
  message: string;
  color?: string;
}

interface LoadingContextType {
  loadingStates: Record<string, LoadingState>;
  showLoading: (id: string, message: string, color?: string) => void;
  updateProgress: (id: string, progress: number, message?: string) => void;
  hideLoading: (id: string) => void;
  getLoadingState: (id: string) => LoadingState | undefined;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingState>>({});

  const showLoading = (id: string, message: string, color: string = 'bg-cyan-400') => {
    setLoadingStates(prev => ({
      ...prev,
      [id]: { id, isVisible: true, progress: 0, message, color }
    }));
  };

  const updateProgress = (id: string, progress: number, message?: string) => {
    setLoadingStates(prev => {
      const current = prev[id];
      if (!current) return prev;
      return {
        ...prev,
        [id]: {
          ...current,
          progress: Math.min(100, Math.max(0, progress)),
          message: message ?? current.message
        }
      };
    });
  };

  const hideLoading = (id: string) => {
    setLoadingStates(prev => {
      const current = prev[id];
      if (!current) return prev;
      return { ...prev, [id]: { ...current, isVisible: false } };
    });
  };

  const getLoadingState = (id: string) => loadingStates[id];

  return (
    <LoadingContext.Provider value={{ loadingStates, showLoading, updateProgress, hideLoading, getLoadingState }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
