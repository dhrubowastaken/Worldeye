'use client';

import { useEffect, useRef } from 'react';

import { DATA_POINT_GROUPS } from '@/features/sources/sourceRegistry';
import type { EntityCategory } from '@/features/traffic/types';

interface DataPointsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeSourceIds: string[];
  activeCategories: Record<EntityCategory, boolean>;
  onToggleCategory: (category: EntityCategory, value: boolean) => void;
  onToggleSource: (sourceId: string, value: boolean) => void;
}

export function DataPointsMenu({
  isOpen,
  onClose,
  activeSourceIds,
  activeCategories,
  onToggleCategory,
  onToggleSource,
}: DataPointsMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const active = new Set(activeSourceIds);

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
      className="data-menu-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.4)',
      }}
    >
      <div
        ref={panelRef}
        className="data-menu-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          margin: '0 20px',
          borderRadius: '8px',
          background: 'var(--we-surface)',
          border: '1px solid var(--we-surface-border)',
          backdropFilter: 'var(--we-glass-blur)',
          WebkitBackdropFilter: 'var(--we-glass-blur)',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--we-text)',
            letterSpacing: '0',
          }}>
            Data Sources
          </h2>
          <button
            type="button"
            aria-label="Close menu"
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

        <div style={{ marginBottom: '18px' }}>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            color: 'var(--we-text-tertiary)',
            marginBottom: '12px',
          }}>
            Classification
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(['civilian', 'military', 'research'] as EntityCategory[]).map((category) => {
              const isActive = activeCategories[category];
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onToggleCategory(category, !isActive)}
                  className="data-menu-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    border: 'none',
                    background: isActive ? 'var(--we-accent-dim)' : 'transparent',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: category === 'civilian' ? '#5AC8FA' : category === 'military' ? '#FF6B6B' : '#FBBF24',
                    flexShrink: 0,
                    opacity: isActive ? 1 : 0.4,
                  }} />

                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: isActive ? 'var(--we-text)' : 'var(--we-text-secondary)',
                    flex: 1,
                    textTransform: 'capitalize',
                  }}>
                    {category}
                  </span>

                  <span
                    className="toggle-switch"
                    data-active={isActive ? 'true' : undefined}
                    role="switch"
                    aria-checked={isActive}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {DATA_POINT_GROUPS.map((group, groupIdx) => (
          <div key={group.id}>
            {groupIdx > 0 && (
              <div style={{
                height: '1px',
                background: 'var(--we-surface-border)',
                margin: '16px 0',
              }} />
            )}

            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: 'var(--we-text-tertiary)',
              marginBottom: '12px',
            }}>
              {group.label}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {group.sources.map((source) => {
                const isActive = active.has(source.sourceId);
                return (
                  <button
                    key={source.sourceId}
                    type="button"
                    onClick={() => onToggleSource(source.sourceId, !isActive)}
                    className="data-menu-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      border: 'none',
                      background: isActive ? 'var(--we-accent-dim)' : 'transparent',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: source.color,
                      flexShrink: 0,
                      opacity: isActive ? 1 : 0.4,
                    }} />

                    <span style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: isActive ? 'var(--we-text)' : 'var(--we-text-secondary)',
                      flex: 1,
                    }}>
                      {source.label}
                    </span>

                    <span
                      className="toggle-switch"
                      data-active={isActive ? 'true' : undefined}
                      role="switch"
                      aria-checked={isActive}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
