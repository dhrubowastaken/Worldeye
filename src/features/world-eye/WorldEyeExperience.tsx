'use client';

import { useCallback, useState } from 'react';

import { WorldMap } from '@/features/globe/components/WorldMap';
import { useWorldEyeController } from '@/features/world-eye/useWorldEyeController';
import { DataPointsMenu } from '@/features/world-eye/components/DataPointsMenu';
import { Legend } from '@/features/world-eye/components/Legend';
import { LoadingScreen } from '@/features/world-eye/components/LoadingScreen';
import { Logo } from '@/features/world-eye/components/Logo';
import { ImageryInspectPanel } from '@/features/world-eye/components/ImageryInspectPanel';
import { SelectionCard } from '@/features/world-eye/components/SelectionCard';
import { SettingsPanel } from '@/features/world-eye/components/SettingsPanel';
import { Toolbar } from '@/features/world-eye/components/Toolbar';

export function WorldEyeExperience() {
  const controller = useWorldEyeController();
  const [introComplete, setIntroComplete] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dataMenuOpen, setDataMenuOpen] = useState(false);

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
  }, []);

  const toggleSettings = useCallback(() => {
    setSettingsOpen((v) => {
      if (!v) setDataMenuOpen(false); // Exclusive panels.
      return !v;
    });
  }, []);

  const toggleDataMenu = useCallback(() => {
    setDataMenuOpen((v) => {
      if (!v) setSettingsOpen(false);
      return !v;
    });
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      {/* Globe — z-index 0 */}
      <WorldMap
        entities={controller.filteredEntities}
        inspectMode={controller.toolMode === 'inspect'}
        mapQuality={controller.mapQuality}
        mapStyleId={controller.mapStyle}
        onHoverEntity={controller.setHoveredEntityId}
        onInspectLocation={controller.inspectLocation}
        onSelectEntity={(id) => {
          if (id) {
            const entity = controller.filteredEntities.find((e) => e.id === id);
            if (entity) controller.selectEntity(entity);
          } else {
            controller.clearSelection();
          }
        }}
        onViewStateChange={controller.setViewState}
        orbitPath={controller.orbitPath}
        renderIntents={controller.renderIntents}
        selectedEntityId={controller.selectedEntity?.id ?? null}
        viewState={controller.viewState}
      />

      {/* Loading screen — z-index 50 */}
      {!introComplete && (
        <LoadingScreen
          appStatus={controller.appStatus}
          onComplete={handleIntroComplete}
        />
      )}

      {/* Corner logo — z-index 30 */}
      {introComplete && <Logo />}

      {/* Legend — z-index 20, bottom-left */}
      {introComplete && !controller.selectedEntity && (
        <Legend
          activeSourceIds={controller.activeSourceIds}
        />
      )}

      {/* Selection card — z-index 25, bottom-left (above legend) */}
      {introComplete && (
        <SelectionCard
          hoveredEntity={controller.hoveredEntity}
          onClearSelection={controller.clearSelection}
          selectedEntity={controller.selectedEntity}
        />
      )}

      {/* Toolbar — z-index 20, bottom-right */}
      {introComplete && (
        <Toolbar
          dataPointsOpen={dataMenuOpen}
          inspectActive={controller.toolMode === 'inspect'}
          onResetView={controller.resetDataPoints}
          onToggleDataPoints={toggleDataMenu}
          onToggleInspect={controller.toggleInspectMode}
          onToggleSettings={toggleSettings}
          settingsOpen={settingsOpen}
        />
      )}

      {introComplete && (
        <ImageryInspectPanel
          inspection={controller.inspection}
          onClose={controller.clearInspection}
        />
      )}

      {/* Settings panel — z-index 40, right drawer */}
      <SettingsPanel
        isOpen={settingsOpen}
        mapQuality={controller.mapQuality}
        mapStyle={controller.mapStyle}
        onClose={() => setSettingsOpen(false)}
        onMapQualityChange={controller.setMapQuality}
        onMapStyleChange={controller.setMapStyle}
      />

      {/* Data points menu — z-index 40, centered modal */}
      <DataPointsMenu
        activeCategories={controller.activeCategories}
        activeSourceIds={controller.activeSourceIds}
        isOpen={dataMenuOpen}
        onClose={() => setDataMenuOpen(false)}
        onToggleCategory={controller.updateCategory}
        onToggleSource={controller.updateSource}
      />
    </div>
  );
}
