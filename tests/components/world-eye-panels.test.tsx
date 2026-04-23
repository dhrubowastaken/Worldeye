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
  metadata: {},
  freshness: {
    updatedAt: '2026-04-17T00:00:00.000Z',
    stale: false,
  },
  providerId: 'air-provider',
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
});
