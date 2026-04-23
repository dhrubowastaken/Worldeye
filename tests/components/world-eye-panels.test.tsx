import { render, screen } from '@testing-library/react';

import { SelectionCard } from '@/features/world-eye/components/SelectionCard';
import type { TrackedEntity } from '@/features/traffic/types';

const mockEntity: TrackedEntity = {
  id: 'test-entity-1',
  label: 'Test Aircraft',
  kind: 'air',
  classification: {
    category: 'civilian',
    system: 'ADS-B',
  },
  coordinates: {
    latitude: 51.47,
    longitude: -0.46,
    altitude: 10668,
  },
  metrics: {
    speed: 450,
    heading: 90,
  },
  freshness: {
    updatedAt: '2026-04-17T00:00:00.000Z',
    stale: false,
  },
  providerId: 'air-provider',
  observedAt: '2026-04-17T00:00:00.000Z',
  updatedAt: '2026-04-17T00:03:00.000Z',
  confidence: 0.84,
  metadata: {
    summary: 'Stable air corridor',
    whyItMatters: 'Useful for traffic monitoring.',
  },
};

describe('SelectionCard', () => {
  test('renders nothing when no entity is provided', () => {
    const { container } = render(
      <SelectionCard
        selectedEntity={null}
        hoveredEntity={null}
        onClearSelection={() => undefined}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  test('renders entity details when hovered', () => {
    render(
      <SelectionCard
        selectedEntity={null}
        hoveredEntity={mockEntity}
        onClearSelection={() => undefined}
      />,
    );

    expect(screen.getByText('Test Aircraft')).toBeInTheDocument();
    expect(screen.getByText('51.47')).toBeInTheDocument();
  });

  test('shows close button when entity is selected', () => {
    render(
      <SelectionCard
        selectedEntity={mockEntity}
        hoveredEntity={null}
        onClearSelection={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: /clear selection/i })).toBeInTheDocument();
  });

  test('surfaces richer incident details without changing the card layout', () => {
    render(
      <SelectionCard
        selectedEntity={{
          ...mockEntity,
          id: 'eq-1',
          kind: 'earth',
          label: 'M 6.1 - Test Region',
          severity: 'high',
          metadata: {
            summary: 'Strong shallow earthquake near the coast.',
            affectedArea: 'Estimated impact radius 140 km',
            whyItMatters: 'Ports and regional logistics may be disrupted.',
            tsunami: true,
            alertLevel: 'orange',
          },
        }}
        hoveredEntity={null}
        onClearSelection={() => undefined}
      />,
    );

    expect(screen.getByText('Strong shallow earthquake near the coast.')).toBeInTheDocument();
    expect(screen.getByText(/Estimated impact radius 140 km/i)).toBeInTheDocument();
    expect(screen.getByText(/Ports and regional logistics may be disrupted/i)).toBeInTheDocument();
    expect(screen.getByText(/orange/i)).toBeInTheDocument();
  });
});
