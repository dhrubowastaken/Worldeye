'use client';

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { buildViewportQuery } from '@/features/globe/lib/viewport';
import { INITIAL_VIEW_STATE, type MapStyleId } from '@/features/globe/lib/mapStyle';
import {
  DEFAULT_SOURCE_IDS,
  SOURCE_DEFINITION_BY_ID,
  SOURCE_DEFINITIONS,
} from '@/features/sources/sourceRegistry';
import { fetchSourceSnapshot, getOrbitPath } from '@/features/sources/sourceFetchers';
import { inspectLatestImagery } from '@/features/sources/imageryInspection';
import { SourceScheduler } from '@/features/sources/sourceScheduler';
import type { ImageryInspection, SourceHealth, SourceIndicator } from '@/features/sources/types';
import { buildRenderIntents, getVisibleRenderIntents } from '@/features/traffic/render/renderIntents';
import { SceneStore } from '@/features/traffic/scene/SceneStore';
import type {
  GlobeViewState,
  TrackedEntity,
} from '@/features/traffic/types';
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences } from '@/lib/preferences';
import {
  activeSourceIdsToLayers,
  buildResetDataPointState,
} from '@/features/world-eye/dataPointState';

export type ToolMode = 'select' | 'inspect';

const VIEWPORT_SENSITIVE_SOURCE_IDS = new Set([
  'air.adsb',
  'weather.open-meteo',
  'air-quality.open-meteo',
  'marine.open-meteo',
  'flood.open-meteo',
]);

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

function buildAppStatus(sourceHealth: Record<string, SourceHealth>) {
  const sources = Object.values(sourceHealth);

  if (sources.length === 0) {
    return 'loading' as const;
  }

  const hasReady = sources.some((source) => source.status === 'ready');
  const hasLimited = sources.some((source) =>
    ['degraded', 'rate_limited', 'timeout', 'unsupported_region', 'offline', 'error'].includes(source.status),
  );

  if (hasReady || hasLimited) {
    return hasLimited ? ('degraded' as const) : ('ready' as const);
  }

  return 'loading' as const;
}

function validSourceIds(sourceIds: string[]): string[] {
  const known = new Set(SOURCE_DEFINITIONS.map((source) => source.id));
  const filtered = sourceIds.filter((sourceId) => known.has(sourceId));
  return sourceIds.length === 0 || filtered.length > 0 ? filtered : DEFAULT_SOURCE_IDS;
}

export function buildSourceQueryKey(sourceId: string, queryKey: string, retryRevision: number): string {
  const scope = VIEWPORT_SENSITIVE_SOURCE_IDS.has(sourceId) ? queryKey : 'global';
  return `${sourceId}:${scope}:${retryRevision}`;
}

function sameSourceIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export function useWorldEyeController() {
  const [retryRevision, setRetryRevision] = useState(0);
  const sceneStore = useMemo(() => new SceneStore(), []);
  const scheduler = useMemo(() => new SourceScheduler(), []);
  const inspectAbortRef = useRef<AbortController | null>(null);

  const [viewState, setViewState] = useState<GlobeViewState>(INITIAL_VIEW_STATE);
  const [activeSourceIds, setActiveSourceIds] = useState<string[]>(DEFAULT_SOURCE_IDS);
  const [selectedSystem, setSelectedSystem] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const [sourceHealth, setSourceHealth] = useState<Record<string, SourceHealth>>({});
  const [sourceIndicators, setSourceIndicators] = useState<SourceIndicator[]>([]);
  const [sceneRevision, setSceneRevision] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [inspection, setInspection] = useState<ImageryInspection | null>(null);

  const [mapStyle, setMapStyleState] = useState<MapStyleId>(DEFAULT_PREFERENCES.mapStyle);
  const [mapQuality, setMapQualityState] = useState(DEFAULT_PREFERENCES.mapQuality);

  const activeSourceSet = useMemo(() => new Set(activeSourceIds), [activeSourceIds]);
  const layerVisibility = useMemo(
    () => activeSourceIdsToLayers(activeSourceIds),
    [activeSourceIds],
  );

  useEffect(() => {
    const prefs = loadPreferences();
    const timer = window.setTimeout(() => {
      const nextSourceIds = validSourceIds(prefs.activeSourceIds);
      setActiveSourceIds((current) => (
        sameSourceIds(current, nextSourceIds) ? current : nextSourceIds
      ));
      setMapStyleState((current) => (current === prefs.mapStyle ? current : prefs.mapStyle));
      setMapQualityState((current) => (current === prefs.mapQuality ? current : prefs.mapQuality));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const setMapStyle = useCallback((style: MapStyleId) => {
    setMapStyleState(style);
    savePreferences({ mapStyle: style });
  }, []);

  const setMapQuality = useCallback((quality: number) => {
    setMapQualityState(quality);
    savePreferences({ mapQuality: quality });
  }, []);

  const resetView = useCallback(() => {
    setViewState(INITIAL_VIEW_STATE);
  }, []);

  const resetDataPoints = useCallback(() => {
    const resetState = buildResetDataPointState();
    setActiveSourceIds(resetState.activeSourceIds);
    setSelectedSystem('ALL');
    setSearchTerm('');
    setSelectedEntityId(null);
    setHoveredEntityId(null);
    savePreferences({ activeSourceIds: resetState.activeSourceIds });
  }, []);

  const query = useMemo(
    () => buildViewportQuery(viewState, layerVisibility),
    [viewState, layerVisibility],
  );

  useEffect(() => {
    const controller = new AbortController();
    const context = {
      queryKey: `${query.key}:${activeSourceIds.slice().sort().join(',')}`,
      bounds: query.bounds,
      center: query.center,
      zoom: query.zoom,
      signal: controller.signal,
    };

    const syncSources = async () => {
      const activeDefinitions = SOURCE_DEFINITIONS.filter(
        (source) =>
          activeSourceSet.has(source.id) &&
          (source.capabilities.includes('snapshot') || source.capabilities.includes('indicator')),
      );

      const results = await Promise.all(
        activeDefinitions.map((definition) =>
          scheduler.fetch(
            definition,
            {
              ...context,
              queryKey: buildSourceQueryKey(definition.id, context.queryKey, retryRevision),
            },
            fetchSourceSnapshot,
          ),
        ),
      );

      if (controller.signal.aborted) {
        return;
      }

      const nextHealth: Record<string, SourceHealth> = {};
      const nextIndicators: SourceIndicator[] = [];

      results.forEach((result) => {
        sceneStore.replaceProvider(result.sourceId, result.entities);
        nextHealth[result.sourceId] = result.health;
        nextIndicators.push(...result.indicators);
      });

      startTransition(() => {
        setSourceHealth((previous) => ({ ...previous, ...nextHealth }));
        setSourceIndicators(nextIndicators);
        setSceneRevision((value) => value + 1);
        setLastUpdated(new Date().toISOString());
      });
    };

    void syncSources();

    const intervalId = window.setInterval(() => {
      void syncSources();
    }, refreshInterval(query.detail));

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [activeSourceIds, activeSourceSet, query, retryRevision, sceneStore, scheduler]);

  const rawVisibleEntities = useMemo(
    () => {
      void sceneRevision;
      return sceneStore
        .getVisibleEntities(query)
        .filter((entity) => activeSourceSet.has(entity.sourceId ?? entity.providerId));
    },
    [activeSourceSet, query, sceneRevision, sceneStore],
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
      if (selectedSystem !== 'ALL' && entity.classification.system !== selectedSystem) {
        return false;
      }

      if (!searchTerm.trim()) {
        return true;
      }

      return searchResults.some((candidate) => candidate.id === entity.id);
    });
  }, [rawVisibleEntities, searchResults, searchTerm, selectedSystem]);

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
      ? getOrbitPath(selectedEntity.id)
      : [];

  const inspectLocation = useCallback(async (coordinate: [number, number]) => {
    inspectAbortRef.current?.abort();
    const controller = new AbortController();
    inspectAbortRef.current = controller;
    setInspection({
      coordinate,
      requestedAt: new Date().toISOString(),
      status: 'loading',
      summary: 'Searching newest open satellite imagery...',
    });

    const result = await inspectLatestImagery(coordinate, controller.signal);
    if (!controller.signal.aborted) {
      setInspection(result);
    }
  }, []);

  const updateSource = useCallback((sourceId: string, value: boolean) => {
    setActiveSourceIds((current) => {
      const next = value
        ? [...new Set([...current, sourceId])]
        : current.filter((candidate) => candidate !== sourceId);

      if (!value) {
        sceneStore.replaceProvider(sourceId, []);
        scheduler.clear(sourceId);
      }

      savePreferences({ activeSourceIds: next });
      return next;
    });
  }, [sceneStore, scheduler]);

  return {
    activeSourceIds,
    appStatus: buildAppStatus(sourceHealth),
    counts,
    filteredCount: filteredEntities.length,
    filteredEntities,
    hoveredEntity,
    inspection,
    lastUpdated,
    layerVisibility,
    mapQuality,
    mapStyle,
    orbitPath,
    renderIntents,
    searchResults,
    searchTerm,
    selectedEntity,
    selectedSystem,
    sourceDefinitions: SOURCE_DEFINITIONS,
    sourceHealth,
    sourceIndicators,
    systems,
    toolMode,
    viewState,
    clearSelection() {
      setSelectedEntityId(null);
    },
    clearInspection() {
      inspectAbortRef.current?.abort();
      setInspection(null);
    },
    inspectLocation,
    resetView,
    retrySync() {
      scheduler.clear();
      setRetryRevision((value) => value + 1);
    },
    resetDataPoints,
    selectEntity(entity: TrackedEntity) {
      setSelectedEntityId(entity.id);
    },
    setHoveredEntityId,
    setMapQuality,
    setMapStyle,
    setSearchTerm,
    setSelectedSystem,
    setToolMode,
    setViewState,
    toggleInspectMode() {
      setToolMode((mode) => (mode === 'inspect' ? 'select' : 'inspect'));
    },
    updateSource,
    getSource(sourceId: string) {
      return SOURCE_DEFINITION_BY_ID.get(sourceId);
    },
  };
}
