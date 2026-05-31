'use client';

interface Star {
  x: number;
  y: number;
  r: number;
  delay: number;
  dur: number;
}

function makeStars(n: number, seed: number): Star[] {
  let h = seed;
  const rng = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 0xffffffff; };
  return Array.from({ length: n }, () => ({
    x: rng() * 100,
    y: rng() * 100,
    r: 1 + rng() * 2,
    delay: rng() * 3,
    dur: 2.5 + rng() * 1.5,
  }));
}

export default function StarField({ n = 24, seed = 7 }: { n?: number; seed?: number }) {
  const stars = makeStars(n, seed);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
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
            background: 'var(--ink)',
            opacity: 0.25,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
