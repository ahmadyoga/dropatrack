import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { supabase } from '@/lib/supabase';
import {
  CORAL, PANEL, INK, INK_SOFT, INK_DIM,
  OUTLINE, SHADOW, AVATAR_COLORS,
} from './StaticFrame';

export const dynamic = "force-dynamic";

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

let frameCache: string | null = null;
async function loadFrame(): Promise<string> {
  if (frameCache) return frameCache;
  const buf = await fs.readFile(path.join(process.cwd(), 'public/og/frame.png'));
  frameCache = `data:image/png;base64,${buf.toString('base64')}`;
  return frameCache;
}

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
      const [rpcRes] = await Promise.all([
        supabase.rpc('get_room_og', { p_slug: t }),
        loadFont('Bungee', 400), // warm cache in parallel with DB
      ]);
      dbLog.rpcRes = { data: rpcRes.data, error: rpcRes.error };

      const payload = rpcRes.data as {
        room: {
          id: string;
          name: string;
          current_song_index: number | null;
          is_public: boolean | null;
          is_playing: boolean | null;
          listener_snapshot: string[] | null;
        } | null;
        queue: { title: string; added_by: string }[];
        queue_count: number;
      } | null;

      const roomRow = payload?.room ?? null;
      if (roomRow) {
        room = roomRow.name || t;
        isPublic = roomRow.is_public ?? true;

        const queue = payload?.queue ?? [];
        const idx = roomRow.current_song_index ?? 0;
        track = queue[idx]?.title ?? '';
        artist = queue[idx]?.added_by ?? '';
        queueLen = payload?.queue_count ?? queue.length;

        const snap = Array.isArray(roomRow.listener_snapshot) ? roomRow.listener_snapshot : [];
        listenersRaw = snap.slice(0, 4).join(',');
        extraCount = snap.length > 4 ? String(snap.length - 4) : '0';
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

    const [bungee, frame] = await Promise.all([loadFont('Bungee', 400), loadFrame()]);

    return new ImageResponse(
      (
        <div style={{ display: 'flex', position: 'relative', width: 1200, height: 630 }}>
          {/* baked static chrome */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={frame} width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0 }} alt="" />

          {/* now-playing track + artist (left card text area) */}
          <div style={{ position: 'absolute', left: 42, top: 536, width: 386, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 21, fontWeight: 700, color: INK, lineHeight: 1.1, display: 'flex' }}>{track || 'Queue is empty'}</div>
            {artist && (
              <div style={{ fontSize: 13, color: INK_DIM, fontFamily: 'monospace', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex' }}>{artist}</div>
            )}
          </div>

          {/* room name */}
          <div style={{ position: 'absolute', left: 522, top: 196, width: 626, display: 'flex', fontFamily: 'Bungee, system-ui', fontSize: 60, lineHeight: 0.98, color: INK }}>{roomDisplay}</div>

          {/* listener avatars + hosted-by */}
          <div style={{ position: 'absolute', left: 522, top: 296, width: 626, display: 'flex', alignItems: 'center', gap: 12 }}>
            {listeners.length > 0 && (
              <div style={{ display: 'flex' }}>
                {listeners.map((name, i) => (
                  <div key={i} style={{ width: 40, height: 40, borderRadius: '50%', background: AVATAR_COLORS[i % AVATAR_COLORS.length], border: `3px solid ${OUTLINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#140f1f', boxShadow: `3px 3px 0 ${SHADOW}`, marginLeft: i === 0 ? 0 : -10 }}>{name.charAt(0).toUpperCase()}</div>
                ))}
                {extra > 0 && (
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: PANEL, border: `2.5px solid ${OUTLINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: INK_SOFT, marginLeft: -10 }}>+{extra}</div>
                )}
              </div>
            )}
            {artist && (
              <div style={{ display: 'flex', fontSize: 18, fontWeight: 600, color: INK_SOFT }}>hosted by <span style={{ color: INK, fontWeight: 700, marginLeft: 6 }}>@{artist}</span></div>
            )}
          </div>

          {/* stat numbers */}
          <div style={{ position: 'absolute', left: 524, top: 374, fontFamily: 'Bungee, system-ui', fontSize: 28, lineHeight: 1, color: CORAL, display: 'flex' }}>{listeners.length > 0 ? String(listeners.length + extra) : '—'}</div>
          <div style={{ position: 'absolute', left: 736, top: 374, fontFamily: 'Bungee, system-ui', fontSize: 28, lineHeight: 1, color: CORAL, display: 'flex' }}>{queueDisplay}</div>
          <div style={{ position: 'absolute', left: 948, top: 374, fontFamily: 'Bungee, system-ui', fontSize: 28, lineHeight: 1, color: CORAL, display: 'flex' }}>{isPublic ? 'OPEN' : 'PRIV'}</div>

          {/* URL slug — overlays the baked pill background */}
          {t && (
            <div style={{ position: 'absolute', left: 576, top: 559, display: 'flex', fontFamily: 'monospace', fontSize: 17, fontWeight: 700, color: INK }}>{`/${t}`}</div>
          )}
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          { name: 'Bungee', data: bungee, weight: 400 as const, style: 'normal' as const },
        ],
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(`OG generation failed: ${msg}`, { status: 500 });
  }
}
