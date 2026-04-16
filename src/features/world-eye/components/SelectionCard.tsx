import type { TrackedEntity } from '@/features/traffic/types';

interface SelectionCardProps {
  selectedEntity: TrackedEntity | null;
  hoveredEntity: TrackedEntity | null;
  onClearSelection: () => void;
}

function renderEntity(entity: TrackedEntity) {
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/75">
        {entity.kind} • {entity.classification.system}
      </p>
      <h3 className="mt-2 text-xl font-semibold text-white">{entity.label}</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-300">
        <p>Lat {entity.coordinates.latitude.toFixed(2)}</p>
        <p>Lon {entity.coordinates.longitude.toFixed(2)}</p>
        <p>Alt {Math.round(entity.coordinates.altitude).toLocaleString()} m</p>
        <p>Spd {Math.round(entity.metrics.speed).toLocaleString()}</p>
      </div>
    </>
  );
}

export function SelectionCard({
  selectedEntity,
  hoveredEntity,
  onClearSelection,
}: SelectionCardProps) {
  const entity = selectedEntity ?? hoveredEntity;

  if (!entity) {
    return (
      <div className="pointer-events-auto w-full max-w-[420px] rounded-[28px] border border-white/10 bg-slate-950/70 px-5 py-4 text-sm text-slate-300 shadow-[0_20px_60px_rgba(2,6,23,0.4)] backdrop-blur-xl">
        Hover or select a target to inspect classification, location, and refresh
        status without leaving the map.
      </div>
    );
  }

  return (
    <div className="pointer-events-auto w-full max-w-[420px] rounded-[28px] border border-white/10 bg-slate-950/80 px-5 py-4 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl">
      {renderEntity(entity)}
      {selectedEntity ? (
        <button
          type="button"
          onClick={onClearSelection}
          className="mt-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white transition hover:border-cyan-300/60 hover:bg-cyan-200/10"
        >
          Clear Selection
        </button>
      ) : null}
    </div>
  );
}
