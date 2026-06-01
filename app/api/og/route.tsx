import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { supabase } from '@/lib/supabase';

export const dynamic = "force-dynamic";

// v2 design tokens (hex — Satori has no oklch/CSS-vars support)
const CORAL   = '#ff7a4d';
const YELLOW  = '#ffd23f';
const VIOLET  = '#9d7bff';
const MAGENTA = '#ff5da2';
const LIME    = '#b6f24d';
const BG      = '#14101f';
const BG_GRAD = '#241640';
const PANEL   = '#241c3a';
const INK     = '#f7eeda';
const INK_SOFT = '#b9acd6';
const INK_DIM  = '#8a7db0';
const OUTLINE  = '#0b0814';
const SHADOW   = '#070510';
const STAR     = '#fff4d0';
const AVATAR_COLORS = [VIOLET, CORAL, YELLOW, MAGENTA, LIME];

// oklch(0.72 0.2 14) ≈ bright coral-orange for vinyl hole
const VINYL_HOLE = '#f56b35';
// art hero background: radial gradient coral→dark-red→near-black
const ART_HERO_BG = 'radial-gradient(120% 110% at 30% 12%, #e8502a 0%, #7a3800 58%, #1a1a05 100%)';

const LOCAL_FONTS: Record<string, string> = {
  'Bungee-400': 'Bungee-Regular.ttf',
};

const fontCache = new Map<string, ArrayBuffer>();

async function loadFont(family: string, weight = 400): Promise<ArrayBuffer> {
  const key = `${family}-${weight}`;
  if (fontCache.has(key)) return fontCache.get(key)!;

  const localFile = LOCAL_FONTS[key];
  if (localFile) {
    const buf = await fs.readFile(path.join(process.cwd(), 'public/fonts', localFile));
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    fontCache.set(key, ab);
    return ab;
  }

  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`,
    { headers: { 'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)' } }
  ).then(r => r.text());
  const fontUrl = css.match(/url\((.+?)\)/)?.[1];
  if (!fontUrl) throw new Error(`Font not found: ${family}:${weight}`);
  const ab = await fetch(fontUrl).then(r => r.arrayBuffer());
  fontCache.set(key, ab);
  return ab;
}

const STAR_POS: [number, number, number][] = [
  [55, 75, 4], [175, 38, 2], [300, 115, 2], [445, 58, 3],
  [510, 158, 2], [78, 295, 2], [375, 258, 4], [490, 320, 2],
  [200, 200, 2], [560, 80, 3],
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const debug = searchParams.get('debug') === '1';
    let room = searchParams.get('room') || 'DropATrack';
    let track = searchParams.get('track') || '';
    let artist = searchParams.get('artist') || '';
    let listenersRaw = searchParams.get('listeners') || '';
    let extraCount = searchParams.get('extra') || '0';
    let queueLen = 0;
    let isPublic = true;

    const t = searchParams.get('t');
    const dbLog: Record<string, unknown> = {};

    if (t) {
      const roomRes = await supabase
        .from('rooms')
        .select('id, name, current_song_index, is_public, is_playing')
        .eq('slug', t)
        .single();
      dbLog.roomRes = { data: roomRes.data, error: roomRes.error };

      const roomRow = roomRes.data;
      if (roomRow) {
        room = roomRow.name || t;
        isPublic = roomRow.is_public ?? true;

        const [queueRes, chatRes] = await Promise.all([
          supabase
            .from('queue_items')
            .select('title, added_by', { count: 'exact' })
            .eq('room_id', roomRow.id)
            .order('position', { ascending: true }),
          supabase
            .from('chat_messages')
            .select('username')
            .eq('room_id', roomRow.id)
            .order('created_at', { ascending: false })
            .limit(30),
        ]);
        dbLog.queueRes = { data: queueRes.data, count: queueRes.count, error: queueRes.error };
        dbLog.chatRes = { data: chatRes.data, error: chatRes.error };

        track = queueRes.data?.[roomRow.current_song_index ?? 0]?.title ?? '';
        artist = queueRes.data?.[roomRow.current_song_index ?? 0]?.added_by ?? '';
        queueLen = queueRes.count ?? queueRes.data?.length ?? 0;

        const uniqueNames = [...new Set((chatRes.data ?? []).map(c => c.username))];
        listenersRaw = uniqueNames.slice(0, 4).join(',');
        extraCount = uniqueNames.length > 4 ? String(uniqueNames.length - 4) : '0';
      } else {
        room = t.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      }
    }

    if (debug) {
      return new Response(JSON.stringify({ room, track, artist, queueLen, isPublic, listenersRaw, dbLog }, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const roomDisplay = room.replace(/-/g, ' ');
    const listeners = listenersRaw ? listenersRaw.split(',').filter(Boolean).slice(0, 4) : [];
    const extra = parseInt(extraCount) || 0;
    const queueDisplay = queueLen > 0 ? String(queueLen) : '∞';

    const bungee = await loadFont('Bungee', 400);

    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: 1200, height: 630, background: BG, color: INK, overflow: 'hidden' }}>

          {/* ══ LEFT: art hero ══ */}
          <div style={{ display: 'flex', width: 470, flexShrink: 0, position: 'relative', overflow: 'hidden', borderRight: `4px solid ${OUTLINE}`, background: ART_HERO_BG }}>

            {/* full-panel decorative rings (SVG — Satori supports it) */}
            <svg
              width="470"
              height="630"
              viewBox="0 0 470 630"
              style={{ position: 'absolute', inset: 0, display: 'flex' }}
            >
              <circle cx="235" cy="290" r="220" fill="none" stroke="white" stroke-width="1.5" opacity="0.28"/>
              <circle cx="235" cy="290" r="163" fill="none" stroke="white" stroke-width="1.5" opacity="0.22"/>
              <circle cx="235" cy="290" r="106" fill="none" stroke="white" stroke-width="1.5" opacity="0.16"/>
            </svg>

            {/* vinyl — absolute centered at left:50%, top:46% (matches HTML) */}
            <div style={{
              position: 'absolute',
              left: 235 - 165, top: 0.46 * 630 - 165, // center at 50%/46%
              width: 330, height: 330,
              borderRadius: '50%',
              background: '#14101f',
              border: `4px solid ${OUTLINE}`,
              boxShadow: `10px 10px 0 rgba(7,5,16,0.45)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* vinyl grooves — nested rings approximating repeating-radial-gradient */}
              {[295, 265, 235, 205, 175, 145, 115, 85].map((s, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  width: s, height: s, borderRadius: '50%',
                  border: i % 2 === 0
                    ? '1px solid rgba(255,160,80,0.18)'
                    : '1px solid rgba(20,16,31,0.9)',
                  display: 'flex',
                }} />
              ))}
              {/* center hole */}
              <div style={{ width: 74, height: 74, borderRadius: '50%', background: VINYL_HOLE, border: `3.5px solid ${OUTLINE}`, display: 'flex' }} />
            </div>

            {/* floating emoji — 🪩 top-right, 🚀 top-left (design spec positions) */}
            <div style={{ position: 'absolute', top: 34, right: 40, fontSize: 44, display: 'flex' }}>🪩</div>
            <div style={{ position: 'absolute', top: 96, left: 34, fontSize: 38, display: 'flex' }}>🚀</div>

            {/* now-playing tag */}
            <div style={{
              position: 'absolute', bottom: 24, left: 24, right: 24,
              background: 'rgba(20,15,31,0.82)', border: `3px solid ${OUTLINE}`,
              borderRadius: 16, padding: '14px 18px',
              display: 'flex', flexDirection: 'column',
              boxShadow: `5px 5px 0 rgba(7,5,16,0.5)`,
            }}>
              {/* eq bars + label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, color: YELLOW, fontSize: 12, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 13 }}>
                  {[6, 12, 8, 13].map((h, i) => (
                    <div key={i} style={{ width: 4, height: h, background: YELLOW, borderRadius: 2 }} />
                  ))}
                </div>
                now playing
              </div>
              <div style={{ fontSize: 21, fontWeight: 700, color: INK, lineHeight: 1.1, display: 'flex' }}>
                {track || 'Queue is empty'}
              </div>
              {artist && (
                <div style={{ fontSize: 13, color: INK_DIM, fontFamily: 'monospace', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex' }}>
                  {artist}
                </div>
              )}
            </div>
          </div>

          {/* ══ RIGHT: details panel ══ */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            padding: '48px 52px',
            background: `radial-gradient(120% 90% at 110% -10%, ${BG_GRAD} 0%, transparent 55%), ${BG}`,
            position: 'relative',
          }}>
            {/* star field */}
            {STAR_POS.map(([x, y, size], i) => (
              <div key={i} style={{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%', background: STAR, display: 'flex' }} />
            ))}

            {/* ── header: logo + LIVE ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* logo mark */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <div style={{ position: 'relative', width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* yellow ring */}
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: YELLOW, border: `3px solid ${OUTLINE}`, boxShadow: `3px 3px 0 ${SHADOW}`, display: 'flex' }} />
                  {/* orange core */}
                  <div style={{ position: 'relative', width: 15, height: 15, borderRadius: '50%', background: CORAL, border: `3px solid ${OUTLINE}`, display: 'flex', zIndex: 1 }} />
                  {/* violet orbit */}
                  <div style={{ position: 'absolute', top: -3, left: 18, width: 10, height: 10, borderRadius: '50%', background: VIOLET, border: `2.5px solid ${OUTLINE}`, display: 'flex', zIndex: 2 }} />
                </div>
                {/* "Drop A Track" split into spans so A gets coral color */}
                <div style={{ display: 'flex', fontFamily: 'Bungee, system-ui', fontSize: 27, lineHeight: 0.9 }}>
                  <span style={{ color: INK }}>Drop</span>
                  <span style={{ color: CORAL }}>A</span>
                  <span style={{ color: INK }}>Track</span>
                </div>
              </div>

              {/* LIVE chip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 40, background: PANEL, border: `2.5px solid ${OUTLINE}`, fontFamily: 'monospace', fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', color: INK, boxShadow: `3px 3px 0 ${SHADOW}` }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: MAGENTA, border: `2.5px solid ${OUTLINE}`, display: 'flex' }} />
                LIVE
              </div>
            </div>

            {/* ── body ── */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* kicker badge */}
              <div style={{ display: 'flex', alignSelf: 'flex-start', alignItems: 'center', gap: 8, background: YELLOW, color: '#140f1f', padding: '7px 16px', borderRadius: 40, fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', border: `2.5px solid ${OUTLINE}`, marginBottom: 18, boxShadow: `3px 3px 0 ${SHADOW}` }}>
                <svg width="14" height="14" viewBox="0 0 24 24" style={{ display: 'flex' }}>
                  <path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="#140f1f"/>
                </svg>
                a room is waiting for you
              </div>

              {/* room name */}
              <div style={{ display: 'flex', fontFamily: 'Bungee, system-ui', fontSize: 60, lineHeight: 0.98, color: INK, marginBottom: 20 }}>
                {roomDisplay}
              </div>

              {/* listener avatars + "hosted by" */}
              {(listeners.length > 0 || artist) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  {listeners.length > 0 && (
                    <div style={{ display: 'flex' }}>
                      {listeners.map((name, i) => (
                        <div key={i} style={{ width: 40, height: 40, borderRadius: '50%', background: AVATAR_COLORS[i % AVATAR_COLORS.length], border: `3px solid ${OUTLINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#140f1f', boxShadow: `3px 3px 0 ${SHADOW}`, marginLeft: i === 0 ? 0 : -10 }}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {extra > 0 && (
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: PANEL, border: `2.5px solid ${OUTLINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: INK_SOFT, marginLeft: -10 }}>
                          +{extra}
                        </div>
                      )}
                    </div>
                  )}
                  {artist && (
                    <div style={{ display: 'flex', fontSize: 18, fontWeight: 600, color: INK_SOFT }}>
                      hosted by <span style={{ color: INK, fontWeight: 700, marginLeft: 6 }}>@{artist}</span>
                    </div>
                  )}
                </div>
              )}

              {/* stat grid */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, background: PANEL, border: `3px solid ${OUTLINE}`, borderRadius: 16, boxShadow: `5px 5px 0 ${SHADOW}`, padding: '14px 18px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontFamily: 'Bungee, system-ui', fontSize: 28, lineHeight: 1, color: CORAL, display: 'flex' }}>{listeners.length > 0 ? String(listeners.length + extra) : '—'}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: INK_DIM, marginTop: 7, display: 'flex' }}>listening now</div>
                </div>
                <div style={{ flex: 1, background: PANEL, border: `3px solid ${OUTLINE}`, borderRadius: 16, boxShadow: `5px 5px 0 ${SHADOW}`, padding: '14px 18px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontFamily: 'Bungee, system-ui', fontSize: 28, lineHeight: 1, color: CORAL, display: 'flex' }}>{queueDisplay}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: INK_DIM, marginTop: 7, display: 'flex' }}>queue length</div>
                </div>
                <div style={{ flex: 1, background: PANEL, border: `3px solid ${OUTLINE}`, borderRadius: 16, boxShadow: `5px 5px 0 ${SHADOW}`, padding: '14px 18px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontFamily: 'Bungee, system-ui', fontSize: 28, lineHeight: 1, color: CORAL, display: 'flex' }}>{isPublic ? 'OPEN' : 'PRIV'}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: INK_DIM, marginTop: 7, display: 'flex' }}>visibility</div>
                </div>
              </div>
            </div>

            {/* ── footer: URL pill + JOIN button ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: PANEL, border: `3px solid ${OUTLINE}`, borderRadius: 40, boxShadow: `5px 5px 0 ${SHADOW}`, padding: '12px 18px 12px 14px' }}>
                <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '50%', background: VIOLET, border: `2.5px solid ${OUTLINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#140f1f', fontWeight: 700 }}>∞</div>
                <div style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 700, color: INK_SOFT, display: 'flex' }}>
                  <span style={{ color: INK_DIM }}>dropatrack.vercel.app</span>
                  {t && <span style={{ color: INK }}>{`/r/${t}`}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Bungee, system-ui', fontSize: 17, background: CORAL, color: '#140f1f', border: `3px solid ${OUTLINE}`, boxShadow: `5px 5px 0 ${SHADOW}`, borderRadius: 16, padding: '14px 22px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" style={{ display: 'flex' }}>
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="#140f1f" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                JOIN
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          { name: 'Bungee', data: bungee, weight: 400 as const, style: 'normal' as const },
        ],
      }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(`OG generation failed: ${msg}`, { status: 500 });
  }
}
