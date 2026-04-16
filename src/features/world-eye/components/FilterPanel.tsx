import type { EntityCategory, LayerVisibility, TrackedEntity } from '@/features/traffic/types';

interface FilterPanelProps {
  layerVisibility: LayerVisibility;
  onLayerChange: (kind: keyof LayerVisibility, value: boolean) => void;
  categoryFilters: Record<EntityCategory, boolean>;
  onCategoryChange: (category: EntityCategory, value: boolean) => void;
  selectedSystem: string;
  onSystemChange: (system: string) => void;
  systems: string[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchResults: TrackedEntity[];
  onSelectEntity: (entity: TrackedEntity) => void;
}

export function FilterPanel({
  layerVisibility,
  onLayerChange,
  categoryFilters,
  onCategoryChange,
  selectedSystem,
  onSystemChange,
  systems,
  searchTerm,
  onSearchChange,
  searchResults,
  onSelectEntity,
}: FilterPanelProps) {
  return (
    <aside className="pointer-events-auto flex w-full max-w-[360px] flex-col gap-4 rounded-[28px] border border-white/10 bg-slate-950/75 p-5 shadow-[0_30px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-300/70">
          View Controls
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          Filter the current scene
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(['air', 'water', 'space'] as const).map((layer) => (
          <label
            key={layer}
            className="flex cursor-pointer flex-col items-center rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center"
          >
            <input
              type="checkbox"
              className="accent-cyan-300"
              checked={layerVisibility[layer]}
              onChange={(event) => onLayerChange(layer, event.target.checked)}
            />
            <span className="mt-3 text-sm font-medium uppercase tracking-[0.2em] text-slate-100">
              {layer}
            </span>
          </label>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(['civilian', 'military', 'research'] as const).map((category) => (
          <label
            key={category}
            className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-sm text-slate-100"
          >
            <span className="uppercase tracking-[0.2em]">{category}</span>
            <input
              type="checkbox"
              className="accent-cyan-300"
              checked={categoryFilters[category]}
              onChange={(event) =>
                onCategoryChange(category, event.target.checked)
              }
            />
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
          System
        </label>
        <select
          value={selectedSystem}
          onChange={(event) => onSystemChange(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300"
        >
          <option value="ALL">All systems</option>
          {systems.map((system) => (
            <option key={system} value={system}>
              {system}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
          Search
        </label>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Entity name, NORAD id, callsign..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300"
        />
        {searchTerm && searchResults.length > 0 ? (
          <div className="max-h-56 space-y-2 overflow-auto pr-1">
            {searchResults.slice(0, 6).map((entity) => (
              <button
                key={entity.id}
                type="button"
                onClick={() => onSelectEntity(entity)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-cyan-300/50 hover:bg-white/8"
              >
                <span>
                  <span className="block text-sm font-medium text-white">
                    {entity.label}
                  </span>
                  <span className="block text-xs uppercase tracking-[0.2em] text-slate-400">
                    {entity.classification.system}
                  </span>
                </span>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {entity.kind}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
