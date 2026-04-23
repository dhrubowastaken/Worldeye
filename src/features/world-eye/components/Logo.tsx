export function Logo() {
  return (
    <div
      style={{
        position: 'fixed',
        top: '28px',
        left: '28px',
        zIndex: 30,
        fontFamily: 'var(--font-display)',
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.28em',
        color: 'var(--we-text-secondary)',
        pointerEvents: 'none',
        animation: 'fadeIn 400ms ease-out',
        userSelect: 'none',
      }}
    >
      World Eye
    </div>
  );
}
