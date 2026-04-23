import type { CSSProperties } from 'react';
import type { TrackedEntity } from '@/features/traffic/types';

interface SelectionCardProps {
  selectedEntity: TrackedEntity | null;
  hoveredEntity: TrackedEntity | null;
  onClearSelection: () => void;
}

export function SelectionCard({
  selectedEntity,
  hoveredEntity,
  onClearSelection,
}: SelectionCardProps) {
  const entity = selectedEntity ?? hoveredEntity;
  const summary = stringMetadata(entity?.metadata.summary);
  const affectedArea = stringMetadata(entity?.metadata.affectedArea);
  const whyItMatters = stringMetadata(entity?.metadata.whyItMatters);
  const alertLevel = stringMetadata(entity?.metadata.alertLevel);
  const confidence =
    typeof entity?.confidence === 'number'
      ? `${Math.round(entity.confidence * 100)}%`
      : null;
  const updatedAt = entity?.updatedAt ?? entity?.freshness.updatedAt;

  if (!entity) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '28px',
        left: '28px',
        zIndex: 25,
        width: '100%',
        maxWidth: '360px',
        borderRadius: '8px',
        background: 'var(--we-surface)',
        border: '1px solid var(--we-surface-border)',
        backdropFilter: 'var(--we-glass-blur)',
        WebkitBackdropFilter: 'var(--we-glass-blur)',
        padding: '16px 20px',
        pointerEvents: 'auto',
      }}
    >
      {selectedEntity && (
        <button
          type="button"
          aria-label="Clear selection"
          onClick={onClearSelection}
          className="icon-btn"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: 'none',
            background: 'var(--we-surface-hover)',
            color: 'var(--we-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
          }}
        >
          x
        </button>
      )}

      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '10px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: 'var(--we-text-tertiary)',
        }}
      >
        {entity.kind} · {entity.classification.category}
      </p>

      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '17px',
          fontWeight: 600,
          color: 'var(--we-text)',
          marginTop: '6px',
          letterSpacing: '0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          paddingRight: selectedEntity ? '32px' : '0',
        }}
      >
        {entity.label}
      </h3>

      <div
        style={{
          marginTop: '12px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px 16px',
        }}
      >
        {[
          { label: 'Lat', value: entity.coordinates.latitude.toFixed(2) },
          { label: 'Lon', value: entity.coordinates.longitude.toFixed(2) },
          { label: 'Alt', value: `${Math.round(entity.coordinates.altitude).toLocaleString()} m` },
          { label: 'Spd', value: Math.round(entity.metrics.speed).toLocaleString() },
          { label: 'Src', value: entity.sourceId ?? entity.providerId },
          { label: 'Risk', value: entity.severity ?? 'info' },
          ...(confidence ? [{ label: 'Conf', value: confidence }] : []),
          ...(alertLevel ? [{ label: 'Alert', value: alertLevel }] : []),
        ].map((stat) => (
          <p
            key={stat.label}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              fontWeight: 400,
              color: 'var(--we-text-secondary)',
            }}
          >
            <span style={{ color: 'var(--we-text-tertiary)', marginRight: '4px' }}>
              {stat.label}
            </span>
            {stat.value}
          </p>
        ))}
      </div>

      {(summary || affectedArea || whyItMatters || updatedAt) && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {summary && (
            <p style={detailStyle}>
              {summary}
            </p>
          )}
          {updatedAt && (
            <p style={detailStyle}>
              <span style={detailLabelStyle}>Updated</span>
              {new Date(updatedAt).toLocaleString()}
            </p>
          )}
          {affectedArea && (
            <p style={detailStyle}>
              <span style={detailLabelStyle}>Area</span>
              {affectedArea}
            </p>
          )}
          {whyItMatters && (
            <p style={detailStyle}>
              <span style={detailLabelStyle}>Why</span>
              {whyItMatters}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function stringMetadata(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

const detailStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '12px',
  fontWeight: 400,
  color: 'var(--we-text-secondary)',
  lineHeight: 1.5,
};

const detailLabelStyle: CSSProperties = {
  color: 'var(--we-text-tertiary)',
  marginRight: '6px',
};
