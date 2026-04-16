'use client';

import dynamic from 'next/dynamic';
import { LoadingProvider } from '@/components/LoadingContext';
import LoadingBar from '@/components/LoadingBar';

// Dynamically import GlobeMonitor with SSR disabled (deck.gl requires browser APIs)
const GlobeMonitor = dynamic(() => import('@/components/GlobeMonitor'), { ssr: false });

export default function Home() {
  return (
    <LoadingProvider>
      <div className="w-full h-screen bg-black overflow-hidden relative font-mono text-white select-none">
        {/* HUD Header */}
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
          <div>
            <h1 className="text-3xl font-bold tracking-[0.5em] text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">WORLD EYE</h1>
          </div>
        </div>

        {/* Main Globe Component */}
        <GlobeMonitor />

        {/* Loading Bars */}
        <LoadingBar type="general" />
        <LoadingBar type="auth" />
      </div>
    </LoadingProvider>
  );
}
