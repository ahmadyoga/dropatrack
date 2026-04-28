import puppeteer from 'puppeteer-core';
import { supabase } from '@/lib/supabase';
import type { NextRequest } from 'next/server';

// Node.js runtime — NOT edge (puppeteer needs it)
export const runtime = 'nodejs';

const COLORS = ['#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

function buildHtml(params: {
    roomName: string;
    nowPlaying: string;
    hasTrack: boolean;
    listeners: string[];
    extraCount: string;
}): string {
    const { roomName, nowPlaying, hasTrack, listeners, extraCount } = params;
    const hasListeners = listeners.length > 0;
    const hasExtra = parseInt(extraCount) > 0;

    const avatarsHtml = listeners.map((l, i) =>
        `<div class="avatar" style="background:${COLORS[i % COLORS.length]};">${l.slice(0, 1).toUpperCase()}</div>`
    ).join('');

    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #111;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .card {
      position: relative;
      width: 680px;
      height: 357px;
      border-radius: 6px;
      overflow: hidden;
      background:
        radial-gradient(ellipse at 15% 15%, rgba(124,58,237,0.45) 0%, transparent 40%),
        radial-gradient(ellipse at 85% 85%, rgba(34,197,94,0.28) 0%, transparent 35%),
        radial-gradient(ellipse at 70% 25%, rgba(124,58,237,0.2) 0%, transparent 30%),
        linear-gradient(135deg, #0d0a1e 0%, #0a0d1a 55%, #0a1a0d 100%);
    }
    .card::before {
      content: '';
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 2px;
      background: linear-gradient(90deg, #7c3aed, #22c55e);
      opacity: 0.7;
      z-index: 2;
    }
    .grid { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
    .content {
      position: relative;
      z-index: 3;
      padding: 0 40px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .live-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 48px;
      padding: 5px 14px 5px 10px;
      border-radius: 13px;
      background: rgba(34,197,94,0.12);
      border: 0.75px solid rgba(34,197,94,0.45);
      width: fit-content;
    }
    .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }
    .live-text { font-size: 10px; font-weight: 700; letter-spacing: 2px; color: #22c55e; }
    .room-name {
      margin-top: 4px;
      font-size: 70px;
      font-weight: 900;
      letter-spacing: -1px;
      line-height: 1.05;
      background: linear-gradient(90deg, #ffffff 0%, #e2d9ff 60%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .now-playing { display: flex; align-items: center; gap: 12px; margin-top: 6px; opacity: 0.9; }
    .note-icon {
      width: 24px; height: 24px; border-radius: 50%;
      background: rgba(124,58,237,0.2); border: 0.75px solid rgba(124,58,237,0.45);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; color: #a78bfa; flex-shrink: 0;
    }
    .now-playing-text { font-size: 18px; color: rgba(255,255,255,0.5); font-weight: 400; }
    .divider { width: calc(100% - 320px); height: 0.5px; background: rgba(255,255,255,0.08); margin-top: 10px; }
    .listeners { display: flex; align-items: center; gap: 4px; margin-top: 8px; }
    .avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: white; flex-shrink: 0; }
    .avatar-overflow { background: rgba(255,255,255,0.1); border: 0.75px solid rgba(255,255,255,0.2); font-size: 10px; color: rgba(255,255,255,0.5); font-weight: 400; }
    .listening-label { margin-left: 8px; font-size: 14px; color: rgba(255,255,255,0.35); }
    .tagline { margin-top: auto; margin-bottom: 22px; font-size: 15px; color: rgba(255,255,255,0.28); font-weight: 400; }
    .branding {
      position: absolute; bottom: 20px; right: 40px;
      font-size: 22px; font-weight: 900; letter-spacing: -0.5px;
      background: linear-gradient(90deg, #7c3aed, #22c55e);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      z-index: 4;
    }
    .waveform { position: absolute; right: 40px; top: 90px; opacity: 0.18; z-index: 2; }
  </style>
</head>
<body>
  <div class="card">
    <svg class="grid" width="680" height="357" xmlns="http://www.w3.org/2000/svg">
      <g stroke="rgba(255,255,255,0.035)" stroke-width="0.5">
        <line x1="0" y1="45"  x2="680" y2="45"/><line x1="0" y1="90"  x2="680" y2="90"/>
        <line x1="0" y1="135" x2="680" y2="135"/><line x1="0" y1="180" x2="680" y2="180"/>
        <line x1="0" y1="225" x2="680" y2="225"/><line x1="0" y1="270" x2="680" y2="270"/>
        <line x1="0" y1="315" x2="680" y2="315"/>
        <line x1="45"  y1="0" x2="45"  y2="357"/><line x1="90"  y1="0" x2="90"  y2="357"/>
        <line x1="135" y1="0" x2="135" y2="357"/><line x1="180" y1="0" x2="180" y2="357"/>
        <line x1="225" y1="0" x2="225" y2="357"/><line x1="270" y1="0" x2="270" y2="357"/>
        <line x1="315" y1="0" x2="315" y2="357"/><line x1="360" y1="0" x2="360" y2="357"/>
        <line x1="405" y1="0" x2="405" y2="357"/><line x1="450" y1="0" x2="450" y2="357"/>
        <line x1="495" y1="0" x2="495" y2="357"/><line x1="540" y1="0" x2="540" y2="357"/>
        <line x1="585" y1="0" x2="585" y2="357"/><line x1="630" y1="0" x2="630" y2="357"/>
      </g>
    </svg>
    <svg class="waveform" width="160" height="100" viewBox="490 95 170 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#22c55e"/>
        </linearGradient>
      </defs>
      <g stroke="url(#wg)" stroke-width="2.5" stroke-linecap="round">
        <line x1="510" y1="130" x2="510" y2="160"/><line x1="524" y1="115" x2="524" y2="175"/>
        <line x1="538" y1="105" x2="538" y2="185"/><line x1="552" y1="120" x2="552" y2="170"/>
        <line x1="566" y1="135" x2="566" y2="155"/><line x1="580" y1="125" x2="580" y2="165"/>
        <line x1="594" y1="110" x2="594" y2="180"/><line x1="608" y1="100" x2="608" y2="190"/>
        <line x1="622" y1="118" x2="622" y2="172"/><line x1="636" y1="133" x2="636" y2="157"/>
        <line x1="650" y1="122" x2="650" y2="168"/>
      </g>
    </svg>
    <div class="content">
      <div class="live-badge"><div class="live-dot"></div><span class="live-text">LIVE</span></div>
      <div class="room-name">${roomName}</div>
      ${hasTrack ? `
      <div class="now-playing">
        <div class="note-icon">♪</div>
        <span class="now-playing-text">${nowPlaying}</span>
      </div>` : ''}
      ${hasListeners ? `<div class="divider"></div>` : ''}
      ${hasListeners ? `
      <div class="listeners">
        ${avatarsHtml}
        ${hasExtra ? `<div class="avatar avatar-overflow">+${extraCount}</div>` : ''}
        <span class="listening-label">listening now</span>
      </div>` : ''}
      <div class="tagline">Listen together in real-time · dropatrack.vercel.app</div>
    </div>
    <div class="branding">DropATrack</div>
  </div>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    // Short-token lookup: ?t=slug → pull stored params from og_tokens
    let room = searchParams.get('room') || 'room';
    let track = searchParams.get('track') || '';
    let listenersRaw = searchParams.get('listeners') || '';
    let extraCount = searchParams.get('extra') || '';

    const t = searchParams.get('t');
    if (t) {
        const { data } = await supabase
            .from('og_tokens')
            .select('track, listeners, extra')
            .eq('slug', t)
            .single();
        room = t;  // slug is the room identifier
        if (data) {
            track        = data.track       ?? '';
            listenersRaw = data.listeners   ?? '';
            extraCount   = data.extra       ?? '';
        }
    }

    const roomName = room.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const nowPlaying = track;
    const listeners = listenersRaw ? listenersRaw.split(',').slice(0, 3) : [];

    const html = buildHtml({ roomName, nowPlaying, hasTrack: Boolean(track), listeners, extraCount });

    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        headless: true,
    });

    try {
        const page = await browser.newPage();
        // Card is 680×357 — set viewport to match
        await page.setViewport({ width: 690, height: 367, deviceScaleFactor: 2 }); // 2x = 1360×714 → downscale to 1200×630 on social
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Screenshot only the .card element
        const card = await page.$('.card');
        const png = await (card ?? page).screenshot({ type: 'png' });

        return new Response(Buffer.from(png), {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
            },
        });
    } finally {
        await browser.close();
    }
}