'use client';

import { WorldMap } from '@/features/globe/components/WorldMap';
import { FilterPanel } from '@/features/world-eye/components/FilterPanel';
import { InsightPanel } from '@/features/world-eye/components/InsightPanel';
import { SelectionCard } from '@/features/world-eye/components/SelectionCard';
import { StatusBanner } from '@/features/world-eye/components/StatusBanner';
import { useWorldEyeController } from '@/features/world-eye/useWorldEyeController';

export function WorldEyeExperience() {
  const controller = useWorldEyeController();

  return (
    <div className="relative h-screen overflow-hidden bg-[linear-gradient(135deg,#020617_0%,#07111d_45%,#0f172a_100%)] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.08),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(250,204,21,0.08),_transparent_26%)]" />

      <StatusBanner
        appStatus={controller.appStatus}
        onRetry={controller.retrySync}
        providerHealth={controller.providerHealth}
      />

      <header className="absolute left-0 right-0 top-0 z-20 flex items-start justify-between px-6 py-6 lg:px-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-cyan-300/70">
            World Eye
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white lg:text-5xl">
            Global intelligence surface
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 lg:text-base">
            A modular live globe for air, maritime, and orbital activity with
            viewport-aware scheduling, provider health reporting, and future-ready
            render intents.
          </p>
        </div>
        <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200 lg:block">
          {controller.appStatus}
        </div>
      </header>

      <main className="relative z-10 h-full px-4 pb-4 pt-32 lg:px-8 lg:pb-8 lg:pt-36">
        <div className="grid h-full gap-4 lg:grid-cols-[340px_minmax(0,1fr)_360px]">
          <div className="order-2 flex min-h-0 lg:order-1">
            <InsightPanel
              counts={controller.counts}
              filteredCount={controller.filteredCount}
              lastUpdated={controller.lastUpdated}
              providerHealth={controller.providerHealth}
            />
          </div>

          <section className="order-1 relative min-h-[420px] lg:order-2">
            <WorldMap
              entities={controller.filteredEntities}
              orbitPath={controller.orbitPath}
              renderIntents={controller.renderIntents}
              selectedEntityId={controller.selectedEntity?.id ?? null}
              viewState={controller.viewState}
              onHoverEntity={controller.setHoveredEntityId}
              onSelectEntity={(entityId) => {
                if (!entityId) {
                  controller.clearSelection();
                  return;
                }

                const target = controller.filteredEntities.find((entity) => entity.id === entityId);
                if (target) {
                  controller.selectEntity(target);
                }
              }}
              onViewStateChange={controller.setViewState}
            />

            <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <SelectionCard
                hoveredEntity={controller.hoveredEntity}
                onClearSelection={controller.clearSelection}
                selectedEntity={controller.selectedEntity}
              />
              <div className="pointer-events-auto rounded-[24px] border border-white/10 bg-slate-950/70 px-5 py-4 text-sm text-slate-300 shadow-[0_20px_60px_rgba(2,6,23,0.35)] backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                  Camera
                </p>
                <p className="mt-2">Lat {controller.viewState.latitude.toFixed(2)}</p>
                <p>Lon {controller.viewState.longitude.toFixed(2)}</p>
                <p>
                  Zoom {controller.viewState.zoom.toFixed(1)} • Pitch{' '}
                  {controller.viewState.pitch.toFixed(0)}°
                </p>
              </div>
            </div>
          </section>

          <div className="order-3 flex min-h-0 lg:order-3">
            <FilterPanel
              categoryFilters={controller.categoryFilters}
              layerVisibility={controller.layerVisibility}
              onCategoryChange={controller.updateCategory}
              onLayerChange={controller.updateLayer}
              onSearchChange={controller.setSearchTerm}
              onSelectEntity={controller.selectEntity}
              onSystemChange={controller.setSelectedSystem}
              searchResults={controller.searchResults}
              searchTerm={controller.searchTerm}
              selectedSystem={controller.selectedSystem}
              systems={controller.systems}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
