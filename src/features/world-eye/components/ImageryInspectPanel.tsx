import Image, { type ImageLoaderProps } from 'next/image';
import type { ImageryInspection } from '@/features/sources/types';

interface ImageryInspectPanelProps {
  inspection: ImageryInspection | null;
  onClose: () => void;
}

function passthroughLoader({ src }: ImageLoaderProps): string {
  return src;
}

export function ImageryInspectPanel({ inspection, onClose }: ImageryInspectPanelProps) {
  if (!inspection) return null;

  const imageUrl = inspection.previewUrl ?? inspection.tileUrl;

  return (
    <div
      style={{
        position: 'fixed',
        top: '88px',
        right: '28px',
        zIndex: 30,
        width: 'min(360px, calc(100vw - 40px))',
        borderRadius: '8px',
        background: 'var(--we-surface)',
        border: '1px solid var(--we-surface-border)',
        backdropFilter: 'var(--we-glass-blur)',
        WebkitBackdropFilter: 'var(--we-glass-blur)',
        overflow: 'hidden',
      }}
    >
      {imageUrl && (
        <Image
          alt="Latest available satellite imagery preview"
          src={imageUrl}
          loader={passthroughLoader}
          unoptimized
          width={360}
          height={360}
          sizes="(max-width: 400px) calc(100vw - 40px), 360px"
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            aspectRatio: '1 / 1',
            objectFit: 'cover',
            background: '#050505',
          }}
        />
      )}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <p style={{
              color: 'var(--we-text-tertiary)',
              fontFamily: 'var(--font-body)',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}>
              Imagery Inspect
            </p>
            <h3 style={{
              color: 'var(--we-text)',
              fontFamily: 'var(--font-display)',
              fontSize: '16px',
              fontWeight: 600,
              marginTop: '4px',
            }}>
              {inspection.status === 'loading' ? 'Searching imagery...' : inspection.provider ?? 'Open imagery'}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close imagery inspect"
            onClick={onClose}
            className="icon-btn"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '1px solid var(--we-surface-border)',
              background: 'transparent',
              color: 'var(--we-text-secondary)',
              cursor: 'pointer',
            }}
          >
            x
          </button>
        </div>

        <p style={{
          marginTop: '10px',
          color: 'var(--we-text-secondary)',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          lineHeight: 1.5,
        }}>
          {inspection.summary}
        </p>

        <dl style={{
          marginTop: '12px',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '6px 10px',
          color: 'var(--we-text-secondary)',
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
        }}>
          <dt style={{ color: 'var(--we-text-tertiary)' }}>Scene</dt>
          <dd>{inspection.sceneDate ?? 'Searching'}</dd>
          <dt style={{ color: 'var(--we-text-tertiary)' }}>Layer</dt>
          <dd>{inspection.collection ?? inspection.layer ?? 'Open imagery'}</dd>
          <dt style={{ color: 'var(--we-text-tertiary)' }}>Cloud</dt>
          <dd>{typeof inspection.cloudCover === 'number' ? `${inspection.cloudCover.toFixed(1)}%` : 'n/a'}</dd>
          <dt style={{ color: 'var(--we-text-tertiary)' }}>Point</dt>
          <dd>{inspection.coordinate[1].toFixed(3)}, {inspection.coordinate[0].toFixed(3)}</dd>
        </dl>

        {inspection.sourceUrl && (
          <a
            href={inspection.sourceUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-block',
              marginTop: '12px',
              color: 'var(--we-accent)',
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              textDecoration: 'none',
            }}
          >
            Open source
          </a>
        )}
      </div>
    </div>
  );
}
