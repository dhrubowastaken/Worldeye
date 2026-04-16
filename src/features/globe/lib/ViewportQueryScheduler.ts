import { hasMeaningfulViewportChange } from '@/features/globe/lib/viewport';
import type { ViewportQuery } from '@/features/traffic/types';

function resolveTtlMilliseconds(detail: ViewportQuery['detail']): number {
  switch (detail) {
    case 'high':
      return 12_000;
    case 'medium':
      return 40_000;
    default:
      return 75_000;
  }
}

export class ViewportQueryScheduler {
  private lastQuery: ViewportQuery | null = null;
  private lastFetchedAt = -1;

  shouldFetch(query: ViewportQuery, now: number): boolean {
    if (!this.lastQuery) {
      return true;
    }

    if (hasMeaningfulViewportChange(this.lastQuery, query)) {
      return true;
    }

    return now - this.lastFetchedAt >= resolveTtlMilliseconds(query.detail);
  }

  markFetched(query: ViewportQuery, now: number): void {
    this.lastQuery = query;
    this.lastFetchedAt = now;
  }
}
