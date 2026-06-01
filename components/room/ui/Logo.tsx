export default function Logo({ size = 34 }: { size?: number }) {
  const outer = size * 1.25;
  return (
    <div className="row" style={{ gap: 12, alignItems: 'center' }}>
      <div style={{ position: 'relative', width: outer, height: outer, flexShrink: 0 }}>
        <div
          className="spin"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid var(--outline)',
            background: 'var(--accent-3)',
            boxShadow: '3px 3px 0 var(--shadow)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: size * 0.42,
            height: size * 0.42,
            transform: 'translate(-50%,-50%)',
            borderRadius: '50%',
            background: 'var(--accent)',
            border: '3px solid var(--outline)',
          }}
        />
        <div className="spin" style={{ position: 'absolute', inset: 0 }}>
          <div
            style={{
              position: 'absolute',
              top: -4,
              left: '50%',
              width: 9,
              height: 9,
              marginLeft: -4,
              borderRadius: '50%',
              background: 'var(--accent-2)',
              border: '2px solid var(--outline)',
            }}
          />
        </div>
      </div>
      <div className="display" style={{ fontSize: size * 0.82, lineHeight: 0.9 }}>
        Drop<span style={{ color: 'var(--accent)' }}>A</span>Track
      </div>
    </div>
  );
}
