'use client';

import { startTransition, useEffect, useMemo, useState } from 'react';

import { ViewportQueryScheduler } from '@/features/globe/lib/ViewportQueryScheduler';
import { buildViewportQuery } from '@/features/globe/lib/viewport';
import { INITIAL_VIEW_STATE } from '@/features/globe/lib/mapStyle';
import { buildRenderIntents, getVisibleRenderIntents } from '@/features/traffic/render/renderIntents';
import { createAirProvider } from '@/features/traffic/providers/airProvider';
import { ProviderRegistry } from '@/features/traffic/providers/providerRegistry';
import { createSpaceProvider } from '@/features/traffic/providers/spaceProvider';
import { createWaterProvider } from '@/features/traffic/providers/waterProvider';
import { SceneStore } from '@/features/traffic/scene/SceneStore';
import type {
  EntityCategory,
  GlobeViewState,
  LayerVisibility,
  ProviderHealth,
  TrackedEntity,
} from '@/features/traffic/types';

const DEFAULT_LAYERS: LayerVisibility = {
  air: true,
  water: true,
  space: true,
};

const DEFAULT_CATEGORIES: Record<EntityCategory, boolean> = {
  civilian: true,
  military: true,
  research: true,
};

function refreshInterval(detail: 'low' | 'medium' | 'high'): number {
  switch (detail) {
    case 'high':
      return 12_000;
    case 'medium':
      return 40_000;
    default:
      return 75_000;
  }
}

function buildAppStatus(providerHealth: Record<string, ProviderHealth>) {
  const providers = Object.values(providerHealth);
  if (providers.length === 0) {
    return 'loading' as const;
  }
  if (providers.some((provider) => provider.status === 'degraded' || provider.status === 'error')) {
    return 'degraded' as const;
  }
  if (providers.some((provider) => provider.status === 'loading')) {
    return 'loading' as const;
  }
  return 'ready' as const;
}

export function useWorldEyeController() {
  const [retryRevision, setRetryRevision] = useState(0);

  const { registry, spaceProvider } = useMemo(() => {
    const registry = new ProviderRegistry<TrackedEntity>();
    registry.register(createAirProvider());
    registry.register(createWaterProvider());
    const spaceProvider = createSpaceProvider();
    registry.register(spaceProvider);

    return { registry, spaceProvider };
  }, []);

  const sceneStore = useMemo(() => new SceneStore(), []);
  const scheduler = useMemo(() => {
    void retryRevision;
    return new ViewportQueryScheduler();
  }, [retryRevision]);

  const [viewState, setViewState] = useState<GlobeViewState>(INITIAL_VIEW_STATE);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(DEFAULT_LAYERS);
  const [categoryFilters, setCategoryFilters] = useState(DEFAULT_CATEGORIES);
  const [selectedSystem, setSelectedSystem] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const [providerHealth, setProviderHealth] = useState<Record<string, ProviderHealth>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const query = useMemo(
    () => buildViewportQuery(viewState, layerVisibility),
    [viewState, layerVisibility],
  );

  useEffect(() => {
    const controller = new AbortController();
    const syncProviders = async (force: boolean) => {
      const now = Date.now();
      if (!force && !scheduler.shouldFetch(query, now)) {
        return;
      }

      const results = await registry.fetchActiveSnapshots(query, controller.signal);
      if (controller.signal.aborted) {
        return;
      }

      const nextHealth: Record<string, ProviderHealth> = {};
      results.results.forEach((result) => {
        sceneStore.replaceProvider(result.health.providerId, result.entities);
        nextHealth[result.health.providerId] = result.health;
      });

      scheduler.markFetched(query, now);
      startTransition(() => {
        setProviderHealth((previous) => ({ ...previous, ...nextHealth }));
        setSceneRevision((value) => value + 1);
        setLastUpdated(new Date().toISOString());
      });
    };

    void syncProviders(true);

    const intervalId = window.setInterval(() => {
      void syncProviders(false);
    }, refreshInterval(query.detail));

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [query, registry, scheduler, sceneStore]);

  useEffect(() => {
    return () => {
      registry.teardown();
    };
  }, [registry]);

  const rawVisibleEntities = useMemo(
    () => {
      void sceneRevision;
      return sceneStore.getVisibleEntities(query);
    },
    [query, sceneRevision, sceneStore],
  );

  const systems = useMemo(
    () =>
      [...new Set(rawVisibleEntities.map((entity) => entity.classification.system))]
        .filter(Boolean)
        .sort(),
    [rawVisibleEntities],
  );

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) {
      return [];
    }

    const normalizedTerm = searchTerm.toLowerCase();
    return rawVisibleEntities.filter((entity) => {
      const fullName = String(entity.metadata.fullName ?? '');
      return `${entity.id} ${entity.label} ${fullName}`.toLowerCase().includes(normalizedTerm);
    });
  }, [rawVisibleEntities, searchTerm]);

  const filteredEntities = useMemo(() => {
    return rawVisibleEntities.filter((entity) => {
      if (!categoryFilters[entity.classification.category]) {
        return false;
      }

      if (selectedSystem !== 'ALL' && entity.classification.system !== selectedSystem) {
        return false;
      }

      if (!searchTerm.trim()) {
        return true;
      }

      return searchResults.some((candidate) => candidate.id === entity.id);
    });
  }, [categoryFilters, rawVisibleEntities, searchResults, searchTerm, selectedSystem]);

  const renderIntents = useMemo(
    () =>
      getVisibleRenderIntents(
        buildRenderIntents(filteredEntities, selectedEntityId),
        query,
        selectedEntityId,
      ),
    [filteredEntities, query, selectedEntityId],
  );

  const selectedEntity = selectedEntityId
    ? sceneStore.getEntity(selectedEntityId) ?? null
    : null;
  const hoveredEntity = hoveredEntityId
    ? sceneStore.getEntity(hoveredEntityId) ?? null
    : null;

  const counts = useMemo(
    () => {
      void sceneRevision;
      return sceneStore.getCounts();
    },
    [sceneRevision, sceneStore],
  );

  const orbitPath =
    selectedEntity?.kind === 'space'
      ? spaceProvider.getOrbitPath(selectedEntity.id)
      : [];

  return {
    appStatus: buildAppStatus(providerHealth),
    categoryFilters,
    counts,
    filteredCount: filteredEntities.length,
    filteredEntities,
    hoveredEntity,
    layerVisibility,
    lastUpdated,
    orbitPath,
    providerHealth,
    renderIntents,
    searchResults,
    searchTerm,
    selectedEntity,
    selectedSystem,
    systems,
    viewState,
    clearSelection() {
      setSelectedEntityId(null);
    },
    retrySync() {
      setRetryRevision((value) => value + 1);
    },
    selectEntity(entity: TrackedEntity) {
      setSelectedEntityId(entity.id);
      setViewState((current) => ({
        ...current,
        longitude: entity.coordinates.longitude,
        latitude: entity.coordinates.latitude,
        zoom: entity.kind === 'space' ? 5.5 : 6.5,
      }));
    },
    setHoveredEntityId,
    setSearchTerm,
    setSelectedSystem,
    setViewState,
    updateCategory(category: EntityCategory, value: boolean) {
      setCategoryFilters((current) => ({ ...current, [category]: value }));
    },
    updateLayer(kind: keyof LayerVisibility, value: boolean) {
      setLayerVisibility((current) => ({ ...current, [kind]: value }));
    },
  };
}
