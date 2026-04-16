import { render, screen } from '@testing-library/react';

import { InsightPanel } from '@/features/world-eye/components/InsightPanel';
import { StatusBanner } from '@/features/world-eye/components/StatusBanner';
import type { ProviderHealth } from '@/features/traffic/types';

const providerHealth: Record<string, ProviderHealth> = {
  'air-provider': {
    providerId: 'air-provider',
    status: 'ready',
    summary: 'Tracking aircraft',
    updatedAt: '2026-04-17T00:00:00.000Z',
    retryable: true,
  },
  'space-provider': {
    providerId: 'space-provider',
    status: 'degraded',
    summary: 'Catalog fallback active',
    updatedAt: '2026-04-17T00:00:00.000Z',
    retryable: true,
  },
};

describe('InsightPanel', () => {
  test('renders totals and provider summaries for the intelligence shell', () => {
    render(
      <InsightPanel
        counts={{ air: 12, water: 8, space: 24 }}
        filteredCount={21}
        lastUpdated="2026-04-17T00:00:00.000Z"
        providerHealth={providerHealth}
      />,
    );

    expect(screen.getByText('Operational Picture')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('Catalog fallback active')).toBeInTheDocument();
  });
});

describe('StatusBanner', () => {
  test('shows degraded providers and exposes retry affordance', () => {
    render(
      <StatusBanner
        appStatus="degraded"
        providerHealth={providerHealth}
        onRetry={() => undefined}
      />,
    );

    expect(screen.getByText(/degraded provider/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry sync/i })).toBeInTheDocument();
  });
});
