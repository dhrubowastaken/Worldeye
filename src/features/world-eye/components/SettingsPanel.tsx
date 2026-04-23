'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { MAP_STYLE_OPTIONS, type MapStyleId } from '@/features/globe/lib/mapStyle';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  mapStyle: MapStyleId;
  onMapStyleChange: (style: MapStyleId) => void;
  mapQuality: number;
  onMapQualityChange: (quality: number) => void;
}

const QUALITY_LABELS = ['Low', 'Medium', 'High'];

export function SettingsPanel({
  isOpen,
  onClose,
  mapStyle,
  onMapStyleChange,
  mapQuality,
  onMapQualityChange,
}: SettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="settings-panel"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '320px',
        maxWidth: '100vw',
        zIndex: 40,
        background: 'var(--we-surface)',
        borderLeft: '1px solid var(--we-surface-border)',
        backdropFilter: 'var(--we-glass-blur)',
        WebkitBackdropFilter: 'var(--we-glass-blur)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 0' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '20px',
          fontWeight: 600,
          color: 'var(--we-text)',
          letterSpacing: '0',
        }}>
          Settings
        </h2>
        <button
          type="button"
          aria-label="Close settings"
          onClick={onClose}
          className="icon-btn"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '1px solid var(--we-surface-border)',
            background: 'transparent',
            color: 'var(--we-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}
        >
          x
        </button>
      </div>

      <div style={{ padding: '28px 24px 0' }}>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: 'var(--we-text-tertiary)',
          marginBottom: '14px',
        }}>
          Map Style
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {MAP_STYLE_OPTIONS.map((option, index) => {
            const selected = mapStyle === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onMapStyleChange(option.id)}
                className="map-style-btn"
                data-selected={selected || undefined}
                style={{
                  border: selected ? '2px solid var(--we-accent)' : '1px solid var(--we-surface-border)',
                  borderRadius: '8px',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '0',
                  overflow: 'hidden',
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <div style={{
                  aspectRatio: '16 / 10',
                  overflow: 'hidden',
                  borderRadius: selected ? '6px 6px 0 0' : '7px 7px 0 0',
                }}>
                  <Image
                    src={option.preview}
                    alt={`${option.label} style preview`}
                    width={320}
                    height={200}
                    sizes="(max-width: 320px) 50vw, 140px"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 300ms var(--ease-out)',
                    }}
                  />
                </div>
                <div style={{ padding: '8px 10px', textAlign: 'left' }}>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: selected ? 'var(--we-text)' : 'var(--we-text-secondary)',
                    transition: 'color 200ms var(--ease-out)',
                  }}>
                    {option.label}
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '11px',
                    fontWeight: 400,
                    color: 'var(--we-text-tertiary)',
                    marginTop: '2px',
                  }}>
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '28px 24px 24px' }}>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: 'var(--we-text-tertiary)',
          marginBottom: '14px',
        }}>
          Map Quality
        </p>

        <input
          type="range"
          className="we-slider"
          min={0}
          max={2}
          step={1}
          value={mapQuality}
          onChange={(e) => onMapQualityChange(Number(e.target.value))}
          style={{ width: '100%' }}
        />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '8px',
        }}>
          {QUALITY_LABELS.map((label, i) => (
            <span
              key={label}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                fontWeight: mapQuality === i ? 600 : 400,
                color: mapQuality === i ? 'var(--we-text)' : 'var(--we-text-tertiary)',
                transition: 'color 200ms var(--ease-out), font-weight 200ms var(--ease-out)',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
