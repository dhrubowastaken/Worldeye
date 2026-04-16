import type { ProviderHealth } from '@/features/traffic/types';

interface InsightPanelProps {
  counts: Record<'air' | 'water' | 'space', number>;
  filteredCount: number;
  lastUpdated: string | null;
  providerHealth: Record<string, ProviderHealth>;
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'Waiting for first sync';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

export function InsightPanel({
  counts,
  filteredCount,
  lastUpdated,
  providerHealth,
}: InsightPanelProps) {
  return (
    <aside className="pointer-events-auto flex w-full max-w-[340px] flex-col gap-4 rounded-[28px] border border-white/10 bg-slate-950/75 p-5 shadow-[0_30px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-300/70">
          Operational Picture
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          Cross-domain activity
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Rendering only what matters inside the current view while keeping provider
          health and future overlay contracts visible.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Air</p>
          <p className="mt-2 text-3xl font-semibold text-white">{counts.air}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Sea</p>
          <p className="mt-2 text-3xl font-semibold text-white">{counts.water}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Space</p>
          <p className="mt-2 text-3xl font-semibold text-white">{counts.space}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/5 p-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-200/75">
          Visible Targets
        </p>
        <p className="mt-2 text-4xl font-semibold text-white">{filteredCount}</p>
        <p className="mt-2 text-sm text-slate-300">
          Last updated {formatTimestamp(lastUpdated)}
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
          Provider Health
        </p>
        {Object.values(providerHealth).map((provider) => (
          <div
            key={provider.providerId}
            className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{provider.providerId}</p>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                  provider.status === 'ready'
                    ? 'bg-emerald-400/15 text-emerald-200'
                    : provider.status === 'loading'
                      ? 'bg-cyan-400/15 text-cyan-200'
                      : 'bg-amber-400/15 text-amber-200'
                }`}
              >
                {provider.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300">{provider.summary}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
