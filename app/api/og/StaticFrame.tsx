import type { CSSProperties } from 'react';

// v2 design tokens (hex — Satori has no oklch/CSS-vars support)
export const CORAL   = '#ff7a4d';
export const YELLOW  = '#ffd23f';
export const VIOLET  = '#9d7bff';
export const MAGENTA = '#ff5da2';
export const LIME    = '#b6f24d';
export const BG      = '#14101f';
export const BG_GRAD = '#241640';
export const PANEL   = '#241c3a';
export const INK     = '#f7eeda';
export const INK_SOFT = '#b9acd6';
export const INK_DIM  = '#8a7db0';
export const OUTLINE  = '#0b0814';
export const SHADOW   = '#070510';
export const STAR     = '#fff4d0';
export const AVATAR_COLORS = [VIOLET, CORAL, YELLOW, MAGENTA, LIME];
export const VINYL_HOLE = '#f56b35';
export const ART_HERO_BG = 'radial-gradient(120% 110% at 30% 12%, #e8502a 0%, #7a3800 58%, #1a1a05 100%)';

export const STAR_POS: [number, number, number][] = [
  [55, 75, 4], [175, 38, 2], [300, 115, 2], [445, 58, 3],
  [510, 158, 2], [78, 295, 2], [375, 258, 4], [490, 320, 2],
  [200, 200, 2], [560, 80, 3],
];

/** Full OG chrome with all dynamic text blanked — used to bake the static frame PNG. */
export function StaticFrame() {
  return (
    <div style={{ display: 'flex', width: 1200, height: 630, background: BG, color: INK, overflow: 'hidden' }}>

      {/* LEFT art hero */}
      <div style={{ display: 'flex', width: 470, flexShrink: 0, position: 'relative', overflow: 'hidden', borderRight: `4px solid ${OUTLINE}`, background: ART_HERO_BG }}>
        <svg width="470" height="630" viewBox="0 0 470 630" style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          <circle cx="235" cy="290" r="220" fill="none" stroke="white" strokeWidth="1.5" opacity="0.28" />
          <circle cx="235" cy="290" r="163" fill="none" stroke="white" strokeWidth="1.5" opacity="0.22" />
          <circle cx="235" cy="290" r="106" fill="none" stroke="white" strokeWidth="1.5" opacity="0.16" />
        </svg>
        <div style={{ position: 'absolute', left: 235 - 165, top: 0.46 * 630 - 165, width: 330, height: 330, borderRadius: '50%', background: '#14101f', border: `4px solid ${OUTLINE}`, boxShadow: `10px 10px 0 rgba(7,5,16,0.45)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {[295, 265, 235, 205, 175, 145, 115, 85].map((s, i) => (
            <div key={i} style={{ position: 'absolute', width: s, height: s, borderRadius: '50%', border: i % 2 === 0 ? '1px solid rgba(255,160,80,0.18)' : '1px solid rgba(20,16,31,0.9)', display: 'flex' }} />
          ))}
          <div style={{ width: 74, height: 74, borderRadius: '50%', background: VINYL_HOLE, border: `3.5px solid ${OUTLINE}`, display: 'flex' }} />
        </div>
        <div style={{ position: 'absolute', top: 34, right: 40, fontSize: 44, display: 'flex' }}>🪩</div>
        <div style={{ position: 'absolute', top: 96, left: 34, fontSize: 38, display: 'flex' }}>🚀</div>
        {/* now-playing card chrome — eq bars + label only; track/artist overlaid by route */}
        <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, background: 'rgba(20,15,31,0.82)', border: `3px solid ${OUTLINE}`, borderRadius: 16, padding: '14px 18px', display: 'flex', flexDirection: 'column', boxShadow: `5px 5px 0 rgba(7,5,16,0.5)`, height: 96 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, color: YELLOW, fontSize: 12, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 13 }}>
              {[6, 12, 8, 13].map((h, i) => (<div key={i} style={{ width: 4, height: h, background: YELLOW, borderRadius: 2 }} />))}
            </div>
            now playing
          </div>
        </div>
      </div>

      {/* RIGHT details panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 52px', background: `radial-gradient(120% 90% at 110% -10%, ${BG_GRAD} 0%, transparent 55%), ${BG}`, position: 'relative' }}>
        {STAR_POS.map(([x, y, size], i) => (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%', background: STAR, display: 'flex' }} />
        ))}

        {/* logo + LIVE */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ position: 'relative', width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: YELLOW, border: `3px solid ${OUTLINE}`, boxShadow: `3px 3px 0 ${SHADOW}`, display: 'flex' }} />
              <div style={{ position: 'relative', width: 15, height: 15, borderRadius: '50%', background: CORAL, border: `3px solid ${OUTLINE}`, display: 'flex', zIndex: 1 }} />
              <div style={{ position: 'absolute', top: -3, left: 18, width: 10, height: 10, borderRadius: '50%', background: VIOLET, border: `2.5px solid ${OUTLINE}`, display: 'flex', zIndex: 2 }} />
            </div>
            <div style={{ display: 'flex', fontFamily: 'Bungee, system-ui', fontSize: 27, lineHeight: 0.9 }}>
              <span style={{ color: INK }}>Drop</span>
              <span style={{ color: CORAL }}>A</span>
              <span style={{ color: INK }}>Track</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 40, background: PANEL, border: `2.5px solid ${OUTLINE}`, fontFamily: 'monospace', fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', color: INK, boxShadow: `3px 3px 0 ${SHADOW}` }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: MAGENTA, border: `2.5px solid ${OUTLINE}`, display: 'flex' }} />
            LIVE
          </div>
        </div>

        {/* body — kicker + blank placeholders preserving layout height */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignSelf: 'flex-start', alignItems: 'center', gap: 8, background: YELLOW, color: '#140f1f', padding: '7px 16px', borderRadius: 40, fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', border: `2.5px solid ${OUTLINE}`, marginBottom: 18, boxShadow: `3px 3px 0 ${SHADOW}` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" style={{ display: 'flex' }}><path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="#140f1f" /></svg>
            a room is waiting for you
          </div>
          {/* room name placeholder — preserves height so stat cards sit at the same Y */}
          <div style={{ display: 'flex', fontFamily: 'Bungee, system-ui', fontSize: 60, lineHeight: 0.98, color: INK, marginBottom: 20, height: 60 }} />
          {/* listener row placeholder */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, height: 40 }} />
          {/* stat cards — labels static, numbers overlaid by route */}
          <div style={{ display: 'flex', gap: 12 }}>
            {['listening now', 'queue length', 'visibility'].map((label, i) => (
              <div key={i} style={{ flex: 1, background: PANEL, border: `3px solid ${OUTLINE}`, borderRadius: 16, boxShadow: `5px 5px 0 ${SHADOW}`, padding: '14px 18px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontFamily: 'Bungee, system-ui', fontSize: 28, lineHeight: 1, color: CORAL, display: 'flex', height: 28 }} />
                <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: INK_DIM, marginTop: 7, display: 'flex' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* footer — URL pill + JOIN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: PANEL, border: `3px solid ${OUTLINE}`, borderRadius: 40, boxShadow: `5px 5px 0 ${SHADOW}`, padding: '12px 18px 12px 14px' }}>
            <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '50%', background: VIOLET, border: `2.5px solid ${OUTLINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#140f1f', fontWeight: 700 }}>∞</div>
            <div style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 700, color: INK_SOFT, display: 'flex' }}>
              <span style={{ color: INK_DIM }}>dropatrack.vercel.app</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Bungee, system-ui', fontSize: 17, background: CORAL, color: '#140f1f', border: `3px solid ${OUTLINE}`, boxShadow: `5px 5px 0 ${SHADOW}`, borderRadius: 16, padding: '14px 22px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" style={{ display: 'flex' }}><path d="M5 12h14M12 5l7 7-7 7" stroke="#140f1f" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            JOIN
          </div>
        </div>
      </div>
    </div>
  );
}

export type Style = CSSProperties;
