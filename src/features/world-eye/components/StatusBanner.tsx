import type { ProviderHealth } from '@/features/traffic/types';

interface StatusBannerProps {
  appStatus: 'ready' | 'degraded' | 'loading';
  providerHealth: Record<string, ProviderHealth>;
  onRetry: () => void;
}

export function StatusBanner({
  appStatus,
  providerHealth,
  onRetry,
}: StatusBannerProps) {
  const degradedProviders = Object.values(providerHealth).filter(
    (provider) => provider.status === 'degraded' || provider.status === 'error',
  );

  if (appStatus === 'ready' && degradedProviders.length === 0) {
    return null;
  }

  return (
    <div className="absolute left-1/2 top-5 z-30 flex w-[min(760px,calc(100%-2rem))] -translate-x-1/2 items-center justify-between gap-4 rounded-2xl border border-amber-400/20 bg-slate-950/80 px-4 py-3 shadow-[0_18px_60px_rgba(2,12,27,0.35)] backdrop-blur-xl">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-amber-300/80">
          {appStatus === 'loading' ? 'Sync In Progress' : 'Resilience Notice'}
        </p>
        <p className="mt-1 text-sm text-slate-100">
          {degradedProviders.length > 0
            ? `${degradedProviders.length} degraded provider${degradedProviders.length > 1 ? 's' : ''}: ${degradedProviders.map((provider) => provider.summary).join(' • ')}`
            : 'Refreshing the operational picture for the current view.'}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-amber-300/40 bg-amber-200/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-100 transition hover:bg-amber-200/20"
      >
        Retry Sync
      </button>
    </div>
  );
}
