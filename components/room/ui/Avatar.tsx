function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

function avatarConfig(seed: string) {
  const h = hashSeed(seed || 'x');
  const types = ['planet', 'blob', 'star', 'moon'] as const;
  return {
    hue:   h % 360,
    type:  types[h % types.length],
    ring:  (h >> 3) % 3 === 0,
    eyes:  (h >> 5) % 4,
    mouth: (h >> 7) % 4,
    spots: (h >> 9) % 2 === 0,
    rot:   ((h >> 11) % 14) - 7,
  };
}

interface AvatarProps {
  seed: string;
  size?: number;
}

export default function Avatar({ seed, size = 44 }: AvatarProps) {
  const a = avatarConfig(seed);
  const c  = `oklch(0.72 0.17 ${a.hue})`;
  const c2 = `oklch(0.58 0.18 ${a.hue})`;
  const cx = 24, cy = 24, R = 16;
  const eyeY = a.type === 'star' ? 23 : 22;

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      style={{ display: 'block', transform: `rotate(${a.rot}deg)`, flexShrink: 0 }}
    >
      <g stroke="var(--outline)" strokeWidth="2.6" strokeLinejoin="round">
        {a.ring && (
          <ellipse cx={cx} cy={cy} rx="21" ry="8" fill="none" transform={`rotate(-18 ${cx} ${cy})`} />
        )}
        {a.type === 'star' ? (
          <polygon points="24,6 29,19 43,19 31,27 36,41 24,32 12,41 17,27 5,19 19,19" fill={c} />
        ) : (
          <circle cx={cx} cy={cy} r={R} fill={c} />
        )}
        {a.spots && a.type !== 'star' && (
          <g fill={c2} stroke="none">
            <circle cx="16" cy="18" r="2.4" />
            <circle cx="31" cy="28" r="3" />
            <circle cx="29" cy="16" r="1.8" />
          </g>
        )}
        {a.eyes === 3 ? (
          <g>
            <circle cx="24" cy={eyeY}       r="3.4" fill="#fff" />
            <circle cx="24" cy={eyeY + 0.5} r="1.5" fill="#140f1f" stroke="none" />
          </g>
        ) : (
          <g>
            <circle cx="19" cy={eyeY} r="3.1" fill="#fff" />
            <circle cx="29" cy={eyeY} r="3.1" fill="#fff" />
            <circle cx={a.eyes === 1 ? 20 : 19} cy={eyeY + 0.6} r="1.4" fill="#140f1f" stroke="none" />
            <circle cx={a.eyes === 1 ? 30 : 29} cy={eyeY + 0.6} r="1.4" fill="#140f1f" stroke="none" />
          </g>
        )}
        {a.mouth === 0 && <path d={`M19 ${eyeY + 6} q5 4 10 0`}  fill="none" />}
        {a.mouth === 1 && <path d={`M20 ${eyeY + 7} q4 -3 8 0`}  fill="none" />}
        {a.mouth === 2 && <circle cx="24" cy={eyeY + 6} r="2.3"   fill="#140f1f" stroke="none" />}
        {a.mouth === 3 && <path d={`M20 ${eyeY + 6} h8`}          fill="none" />}
      </g>
    </svg>
  );
}
