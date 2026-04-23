'use client';

interface ToolbarProps {
  onResetView: () => void;
  onToggleSettings: () => void;
  onToggleDataPoints: () => void;
  onToggleInspect: () => void;
  settingsOpen: boolean;
  dataPointsOpen: boolean;
  inspectActive: boolean;
}

/* ─── SVG Icons (20×20, stroke-based) ─── */

function ResetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function InspectIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

export function Toolbar({
  onResetView,
  onToggleSettings,
  onToggleDataPoints,
  onToggleInspect,
  settingsOpen,
  dataPointsOpen,
  inspectActive,
}: ToolbarProps) {
  const buttons = [
    { key: 'reset', icon: <ResetIcon />, onClick: onResetView, active: false, label: 'Hide all data points' },
    { key: 'inspect', icon: <InspectIcon />, onClick: onToggleInspect, active: inspectActive, label: 'Inspect latest imagery' },
    { key: 'settings', icon: <SettingsIcon />, onClick: onToggleSettings, active: settingsOpen, label: 'Settings' },
    { key: 'layers', icon: <LayersIcon />, onClick: onToggleDataPoints, active: dataPointsOpen, label: 'Data points' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '28px',
        right: '28px',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {buttons.map((btn, i) => (
        <button
          key={btn.key}
          type="button"
          aria-label={btn.label}
          title={btn.label}
          onClick={btn.onClick}
          className="toolbar-btn"
          data-active={btn.active ? 'true' : undefined}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: `1px solid ${btn.active ? 'var(--we-accent)' : 'var(--we-surface-border)'}`,
            background: btn.active ? 'var(--we-surface-hover)' : 'var(--we-surface)',
            backdropFilter: 'var(--we-glass-blur)',
            WebkitBackdropFilter: 'var(--we-glass-blur)',
            color: 'var(--we-text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: `slideUp 300ms var(--ease-out) ${i * 40}ms both`,
          }}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
}
