import type { ProviderHealth, TrackedEntity, ViewportQuery } from '@/features/traffic/types';

export interface ProviderCapabilities {
  mode: 'pull' | 'stream' | 'hybrid';
  supportsViewportQueries: boolean;
}

export interface ProviderFetchResult<T extends TrackedEntity> {
  entities: T[];
  health: ProviderHealth;
}

export interface DataProvider<T extends TrackedEntity> {
  id: string;
  kind: T['kind'];
  capabilities: ProviderCapabilities;
  fetchSnapshot(
    query: ViewportQuery,
    signal?: AbortSignal,
  ): Promise<ProviderFetchResult<T>>;
  subscribe?(
    query: ViewportQuery,
    emit: (result: ProviderFetchResult<T>) => void,
  ): () => void;
  teardown?(): void;
}
