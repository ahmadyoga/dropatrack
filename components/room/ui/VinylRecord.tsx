'use client';

interface VinylRecordProps {
  thumbnail?: string | null;
  isPlaying: boolean;
  size?: number | string;
}

export default function VinylRecord({ thumbnail, isPlaying, size = 220 }: VinylRecordProps) {
  const isStr = typeof size === 'string';
  const dim = isStr ? size : `${size}px`;
  const holeRel = 0.28; // hole radius as fraction of disc radius

  return (
    <div
      style={{
        width: dim,
        height: dim,
        position: 'relative',
        borderRadius: '50%',
        animationName: 'spin',
        animationDuration: '5s',
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
        animationPlayState: isPlaying ? 'running' : 'paused',
        filter: 'drop-shadow(0 -4px 24px rgba(70,224,212,.15)) drop-shadow(4px 6px 0 var(--shadow))',
      }}
    >
      {/* vinyl disc */}
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '3px solid var(--outline)',
          background: `
            repeating-radial-gradient(
              circle at center,
              #110b20 0px, #110b20 3px,
              #1c1337 3px, #1c1337 7px,
              #150e2a 7px, #150e2a 9px,
              #1c1337 9px, #1c1337 14px
            )
          `,
        }}
      />

      {/* subtle accent rings */}
      <div style={{ position: 'absolute', inset: '6%', borderRadius: '50%', border: '1.5px solid rgba(70,224,212,.14)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: '10%', borderRadius: '50%', border: '1.5px solid rgba(70,224,212,.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: '20%', borderRadius: '50%', border: '1.5px solid rgba(70,224,212,.1)', pointerEvents: 'none' }} />

      {/* center label with thumbnail */}
      <div
        style={{
          position: 'absolute',
          left: '50%', top: '50%',
          width: `${holeRel * 2 * 100}%`,
          height: `${holeRel * 2 * 100}%`,
          transform: 'translate(-50%,-50%)',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '3px solid var(--outline)',
          boxShadow: '0 0 0 3px rgba(70,224,212,.22)',
          background: 'var(--panel-3)',
        }}
      >
        {thumbnail
          ? <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: `radial-gradient(circle, var(--accent-3), var(--panel-3))` }} />
        }
      </div>

      {/* spindle */}
      <div
        style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 8, height: 8,
          transform: 'translate(-50%,-50%)',
          borderRadius: '50%',
          background: 'var(--outline)',
          zIndex: 2,
        }}
      />
    </div>
  );
}
