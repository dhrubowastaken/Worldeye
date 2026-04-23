'use client';

import { DATA_POINT_GROUPS } from '@/features/sources/sourceRegistry';

interface LegendProps {
  activeSourceIds: string[];
}

export function Legend({ activeSourceIds }: LegendProps) {
  const active = new Set(activeSourceIds);
  const entries = DATA_POINT_GROUPS.flatMap((group) => group.sources)
    .filter((source) => active.has(source.sourceId));

  if (entries.length === 0) return null;

  return (
    <div
      className="legend-container"
      style={{
        position: 'fixed',
        bottom: '28px',
        left: '28px',
        zIndex: 20,
        background: 'var(--we-surface)',
        border: '1px solid var(--we-surface-border)',
        backdropFilter: 'var(--we-glass-blur)',
        WebkitBackdropFilter: 'var(--we-glass-blur)',
        borderRadius: '8px',
        padding: '10px 14px',
        maxHeight: '220px',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {entries.map((entry) => (
          <div
            key={entry.sourceId}
            className="legend-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              className="legend-dot"
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: entry.color,
                flexShrink: 0,
                boxShadow: `0 0 6px ${entry.color}40`,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--we-text-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              {entry.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
