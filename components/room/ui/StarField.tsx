'use client';

interface Star {
  x: number;
  y: number;
  r: number;
  delay: number;
  dur: number;
  cyan: boolean;
}

function makeStars(n: number, seed: number): Star[] {
  let h = seed;
  const rng = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 0xffffffff; };
  return Array.from({ length: n }, () => ({
    x: rng() * 100,
    y: rng() * 100,
    r: 0.8 + rng() * 2.2,
    delay: rng() * 4,
    dur: 2 + rng() * 2.5,
    cyan: rng() > 0.72,
  }));
}

export default function StarField({ n = 32, seed = 7 }: { n?: number; seed?: number }) {
  const stars = makeStars(n, seed);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}
      aria-hidden
    >
      {stars.map((s, i) => (
        <div
          key={i}
          className="twinkle"
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.r * 2,
            height: s.r * 2,
            borderRadius: '50%',
            background: s.cyan ? 'var(--accent)' : '#fff',
            boxShadow: s.cyan
              ? `0 0 ${s.r * 3}px var(--accent), 0 0 ${s.r * 6}px rgba(70,224,212,.3)`
              : `0 0 ${s.r * 2}px rgba(255,255,255,.8)`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
