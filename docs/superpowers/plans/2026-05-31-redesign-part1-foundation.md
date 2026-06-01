# DropATrack v2 Redesign — Part 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the design system (globals.css, layout.tsx), create all UI primitives, refactor the broadcast channel pattern, and add RoomContext — so every subsequent plan builds on a clean foundation.

**Architecture:** New CSS design system uses CSS custom properties for theming (dark/light via `[data-theme]`), utility classes (`.pop`, `.btn`, `.chip`, `.display`, `.mono`) for visual identity, and Tailwind only for layout/spacing/breakpoints. `useRoomSync` becomes self-contained (internal channelRef) and returns a stable `broadcast` function. `RoomContext` provides core shared state to the room component tree.

**Tech Stack:** Next.js 16, Tailwind CSS v4, TypeScript, Supabase Realtime, React Context

---

## File Map

| Action | Path |
|--------|------|
| Replace | `app/globals.css` |
| Modify | `app/layout.tsx` |
| Modify | `components/ThemeProvider.tsx` |
| Create | `components/room/ui/spawnReactions.ts` |
| Create | `components/room/ui/StarField.tsx` |
| Create | `components/room/ui/Avatar.tsx` |
| Create | `components/room/ui/Logo.tsx` |
| Create | `components/room/ui/Scrubber.tsx` |
| Create | `components/room/ui/LiveDot.tsx` |
| Modify | `components/room/hooks/useRoomSync.ts` |
| Modify | `components/room/hooks/usePlayback.ts` |
| Modify | `components/room/hooks/useQueue.ts` |
| Modify | `components/room/hooks/useIdentity.ts` |
| Create | `components/room/RoomContext.tsx` |

---

### Task 1: Replace globals.css

**Files:**
- Replace: `app/globals.css`

- [ ] **Step 1: Write the new globals.css**

```css
/* app/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Bungee&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
@import "tailwindcss";

/* ============================================================
   DropATrack — cartoon-cosmic design system
   Aurora accent · Sci-Fi type · Wobbly borders
   ============================================================ */
:root {
  --pop-yellow: #ffd23f;
  --pop-magenta: #ff5da2;
  --pop-cyan: #46e0d4;
  --pop-violet: #9d7bff;
  --pop-coral: #ff7a4d;
  --pop-lime: #b6f24d;

  /* Aurora accent palette */
  --accent: var(--pop-cyan);
  --accent-2: var(--pop-lime);
  --accent-3: var(--pop-violet);

  /* Sci-Fi type personality */
  --font-display: 'Bungee', system-ui, sans-serif;
  --font-body: 'Space Grotesk', system-ui, sans-serif;
  --font-mono: 'Space Mono', monospace;
  --display-spacing: .005em;
  --display-lh: 1.05;

  /* Shape */
  --r-wobble: 18px 22px 20px 24px / 24px 18px 22px 20px;
  --r-wobble-2: 22px 16px 24px 18px / 16px 24px 18px 22px;
  --r-pill: 40px;
}

[data-theme="dark"] {
  --bg: #14101f;
  --bg-2: #1b1430;
  --bg-grad-1: #241640;
  --bg-grad-2: #10101f;
  --panel: #241c3a;
  --panel-2: #2d2348;
  --panel-3: #352a55;
  --ink: #f7eeda;
  --ink-soft: #b9acd6;
  --ink-dim: #8a7db0;
  --outline: #0b0814;
  --line: rgba(247,238,218,.14);
  --shadow: #070510;
  --field: #1a1430;
  --field-ink: #f7eeda;
}

[data-theme="light"] {
  --bg: #f7ead0;
  --bg-2: #f1e0bf;
  --bg-grad-1: #ffe9b8;
  --bg-grad-2: #f3dcc0;
  --panel: #fffdf6;
  --panel-2: #fdf3dc;
  --panel-3: #f8ead0;
  --ink: #1c1326;
  --ink-soft: #5a4a6e;
  --ink-dim: #897a98;
  --outline: #1c1326;
  --line: rgba(28,19,38,.16);
  --shadow: #1c1326;
  --field: #fffdf6;
  --field-ink: #1c1326;
}

*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; }
body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}
::selection { background: var(--accent); color: #0b0814; }

/* ---- cosmic backdrop ---- */
.cosmos-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 80% at 80% -10%, var(--bg-grad-1) 0%, transparent 55%),
    radial-gradient(100% 70% at 0% 110%, var(--bg-grad-2) 0%, transparent 50%),
    var(--bg);
}

/* ---- pop cards ---- */
.pop {
  border: 3px solid var(--outline);
  box-shadow: 6px 6px 0 var(--shadow);
  background: var(--panel);
}
.pop-sm {
  border: 2.5px solid var(--outline);
  box-shadow: 4px 4px 0 var(--shadow);
  background: var(--panel);
}
.pop-lg { box-shadow: 9px 9px 0 var(--shadow); }

/* ---- wobble border-radius ---- */
.wobble   { border-radius: var(--r-wobble); }
.wobble-2 { border-radius: var(--r-wobble-2); }

/* ---- type ---- */
.display {
  font-family: var(--font-display);
  letter-spacing: var(--display-spacing);
  line-height: var(--display-lh);
  font-weight: 400;
}
.mono { font-family: var(--font-mono); }

/* ---- layout helpers ---- */
.row { display: flex; align-items: center; }
.col { display: flex; flex-direction: column; }

/* ---- buttons ---- */
.btn {
  font-family: var(--font-display);
  font-size: 14px;
  letter-spacing: var(--display-spacing);
  border: 3px solid var(--outline);
  background: var(--panel);
  color: var(--ink);
  box-shadow: 4px 4px 0 var(--shadow);
  border-radius: 14px;
  padding: 12px 18px;
  cursor: pointer;
  transition: transform .08s ease, box-shadow .08s ease, background .15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  user-select: none;
  font-weight: 400;
}
.btn:hover  { transform: translate(-1px,-1px); box-shadow: 6px 6px 0 var(--shadow); }
.btn:active { transform: translate(3px,3px);   box-shadow: 1px 1px 0 var(--shadow); }
.btn-accent { background: var(--accent);     color: #140f1f; }
.btn-ghost  { background: transparent; box-shadow: none; border-color: var(--line); }
.btn-ghost:hover { box-shadow: none; background: var(--panel-2); }
.btn-icon   { padding: 10px; border-radius: 12px; }

/* ---- chips / badges ---- */
.chip {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  border: 2.5px solid var(--outline);
  border-radius: var(--r-pill);
  padding: 4px 11px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--panel);
  white-space: nowrap;
}

/* ---- role badges ---- */
.role-admin    { background: var(--pop-magenta); color: #140f1f; }
.role-mod      { background: var(--pop-violet);  color: #140f1f; }
.role-dj       { background: var(--pop-yellow);  color: #140f1f; }
.role-listener { background: var(--panel-3);     color: var(--ink); }

/* ---- input field ---- */
.field {
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 600;
  background: var(--field);
  color: var(--field-ink);
  border: 3px solid var(--outline);
  border-radius: 14px;
  padding: 13px 16px;
  width: 100%;
  outline: none;
  box-shadow: inset 2px 2px 0 rgba(0,0,0,.06);
}
.field::placeholder { color: var(--ink-dim); font-weight: 600; }
.field:focus { box-shadow: 0 0 0 3px var(--accent); }

/* ---- scrollbars ---- */
.scroll { overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--accent) transparent; }
.scroll::-webkit-scrollbar { width: 10px; }
.scroll::-webkit-scrollbar-thumb { background: var(--accent); border: 2px solid var(--outline); border-radius: 20px; }
.noscb::-webkit-scrollbar { display: none; }
.noscb { scrollbar-width: none; }

/* ---- placeholder striped art ---- */
.ph {
  background-image: repeating-linear-gradient(
    45deg,
    var(--panel-2), var(--panel-2) 12px,
    var(--panel-3) 12px, var(--panel-3) 24px
  );
  position: relative;
  overflow: hidden;
}

/* ---- live dot ---- */
@keyframes livepulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--pop-magenta); }
  50%       { box-shadow: 0 0 0 5px transparent; }
}
.live-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--pop-magenta);
  border: 2px solid var(--outline);
  animation: livepulse 1.6s infinite;
  display: inline-block;
  flex-shrink: 0;
}

/* ---- floating emoji reactions ---- */
.float-emoji {
  position: absolute;
  bottom: -40px;
  will-change: transform, opacity;
  animation: floatUp var(--dur, 4s) cubic-bezier(.3,.1,.5,1) forwards;
}
@keyframes floatUp {
  0%   { transform: translateY(0) scale(.4) rotate(0deg); opacity: 0; }
  12%  { opacity: 1; transform: translateY(-8vh) scale(1.1) rotate(var(--rot, 8deg)); }
  100% { transform: translateY(-104vh) translateX(var(--drift, 0px)) scale(.9) rotate(var(--rot2,-12deg)); opacity: 0; }
}

/* ---- modal ---- */
.scrim {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(8,5,16,.62);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

/* ---- scale-in animation ---- */
@keyframes popin {
  0%   { transform: scale(.9) translateY(8px); opacity: 0; }
  100% { transform: scale(1)  translateY(0);   opacity: 1; }
}
.popin { animation: popin .22s cubic-bezier(.2,1.2,.4,1); }

/* ---- drag state ---- */
.dragging  { opacity: .4; }
.drag-over { outline: 3px solid var(--accent); outline-offset: -2px; }

/* ---- logo spin ---- */
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 8s linear infinite; }

/* ---- twinkle (StarField) ---- */
@keyframes twinkle {
  0%, 100% { opacity: .2; transform: scale(.8); }
  50%       { opacity: 1;  transform: scale(1.15); }
}
```

- [ ] **Step 2: Verify no compile errors**

```bash
npm run build 2>&1 | head -40
```

Expected: build completes (existing pages may still compile using old class names — that's OK for now).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: replace globals.css with cartoon-cosmic design system"
```

---

### Task 2: Update layout.tsx

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update layout.tsx**

```tsx
// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from '@/components/ThemeProvider';
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://dropatrack.vercel.app'
  ),
  title: "DropATrack — Collaborative Music Rooms",
  description:
    "Share music across devices in real-time. Create a room, drop tracks, and listen together with friends.",
  keywords: ["music", "collaborative", "jukebox", "youtube", "rooms", "sync"],
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "DropATrack — Collaborative Music Rooms",
    description:
      "Share music across devices in real-time. Create a room, drop tracks, and listen together.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-type="scifi" data-accent="aurora">
      <body className="antialiased">
        <ThemeProvider>
          {/* emoji burst layer — spawnReactions appends .float-emoji divs here */}
          <div
            id="react-layer"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              pointerEvents: 'none',
              overflow: 'hidden',
            }}
          />
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update ThemeProvider.tsx to default to dark**

```tsx
// components/ThemeProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const resolved = (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
    setTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

- [ ] **Step 3: Verify**

```bash
npm run dev
```

Open `http://localhost:3000`. Body should use Space Grotesk font, dark purple background. No `bg-pattern` div.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx components/ThemeProvider.tsx
git commit -m "feat: update layout — Bungee/Space Grotesk fonts, react-layer div, dark default"
```

---

### Task 3: spawnReactions utility

**Files:**
- Create: `components/room/ui/spawnReactions.ts`

- [ ] **Step 1: Create the file**

```ts
// components/room/ui/spawnReactions.ts

export function spawnReactions(emoji: string, n: number): void {
  const layer = document.getElementById('react-layer');
  if (!layer) return;

  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'float-emoji';
    el.textContent = emoji;

    const dur = 3.2 + Math.random() * 2.4;
    el.style.left = `${4 + Math.random() * 92}vw`;
    el.style.fontSize = `${24 + Math.random() * 26}px`;
    el.style.animationDelay = `${Math.random() * 0.5}s`;
    el.style.setProperty('--dur', `${dur}s`);
    el.style.setProperty('--drift', `${Math.random() * 160 - 80}px`);
    el.style.setProperty('--rot', `${Math.random() * 40 - 20}deg`);
    el.style.setProperty('--rot2', `${Math.random() * 60 - 30}deg`);

    layer.appendChild(el);
    setTimeout(() => el.remove(), (dur + 0.6) * 1000);
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep spawnReactions
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add components/room/ui/spawnReactions.ts
git commit -m "feat: add spawnReactions — direct DOM emoji burst utility"
```

---

### Task 4: StarField primitive

**Files:**
- Create: `components/room/ui/StarField.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/room/ui/StarField.tsx
'use client';

import { useEffect, useRef } from 'react';

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
```

- [ ] **Step 2: Commit**

```bash
git add components/room/ui/StarField.tsx
git commit -m "feat: add StarField primitive — deterministic twinkle stars"
```

---

### Task 5: Avatar primitive

**Files:**
- Create: `components/room/ui/Avatar.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/room/ui/Avatar.tsx

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
```

- [ ] **Step 2: Commit**

```bash
git add components/room/ui/Avatar.tsx
git commit -m "feat: add Avatar primitive — deterministic SVG cosmic creature"
```

---

### Task 6: Logo primitive

**Files:**
- Create: `components/room/ui/Logo.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/room/ui/Logo.tsx

export default function Logo({ size = 34 }: { size?: number }) {
  const outer = size * 1.25;
  return (
    <div className="row" style={{ gap: 12, alignItems: 'center' }}>
      <div style={{ position: 'relative', width: outer, height: outer, flexShrink: 0 }}>
        {/* spinning record */}
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
        {/* center hole */}
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
        {/* orbiting dot */}
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
```

- [ ] **Step 2: Commit**

```bash
git add components/room/ui/Logo.tsx
git commit -m "feat: add Logo primitive — spinning record + Bungee wordmark"
```

---

### Task 7: Scrubber primitive

**Files:**
- Create: `components/room/ui/Scrubber.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/room/ui/Scrubber.tsx
'use client';

import { useRef, useState, useEffect } from 'react';

interface ScrubberProps {
  value: number;
  max: number;
  onChange: (v: number) => void;
  color?: string;
  height?: number;
  knob?: boolean;
}

export default function Scrubber({
  value,
  max,
  onChange,
  color = 'var(--accent)',
  height = 14,
  knob = true,
}: ScrubberProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(false);

  const pct = max ? Math.max(0, Math.min(1, value / max)) : 0;

  const setFromX = (clientX: number) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    onChange(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * max);
  };

  useEffect(() => {
    if (!drag) return;
    const mv = (e: PointerEvent) => setFromX(e.clientX);
    const up = () => setDrag(false);
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
    };
  });

  return (
    <div
      ref={ref}
      onPointerDown={(e) => { setDrag(true); setFromX(e.clientX); }}
      style={{
        position: 'relative',
        height,
        flex: 1,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {/* track */}
      <div style={{
        position: 'absolute', left: 0, right: 0,
        height: height * 0.6, top: '50%', transform: 'translateY(-50%)',
        background: 'var(--panel-3)',
        border: '2.5px solid var(--outline)',
        borderRadius: 20,
      }} />
      {/* fill */}
      <div style={{
        position: 'absolute', left: 0,
        width: `${pct * 100}%`,
        height: height * 0.6, top: '50%', transform: 'translateY(-50%)',
        background: color,
        border: '2.5px solid var(--outline)',
        borderRadius: 20,
        transition: drag ? 'none' : 'width .15s linear',
      }} />
      {/* knob */}
      {knob && (
        <div style={{
          position: 'absolute',
          left: `${pct * 100}%`,
          top: '50%',
          transform: 'translate(-50%,-50%)',
          width: height + 8,
          height: height + 8,
          background: 'var(--panel)',
          border: '3px solid var(--outline)',
          borderRadius: '50%',
          boxShadow: '2px 2px 0 var(--shadow)',
          transition: drag ? 'none' : 'left .15s linear',
        }} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/room/ui/Scrubber.tsx
git commit -m "feat: add Scrubber primitive — pointer-drag progress/volume bar"
```

---

### Task 8: LiveDot primitive

**Files:**
- Create: `components/room/ui/LiveDot.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/room/ui/LiveDot.tsx

export default function LiveDot() {
  return <span className="live-dot" aria-hidden />;
}
```

- [ ] **Step 2: Commit**

```bash
git add components/room/ui/LiveDot.tsx
git commit -m "feat: add LiveDot primitive"
```

---

### Task 9: Broadcast refactor — useRoomSync

**Files:**
- Modify: `components/room/hooks/useRoomSync.ts`

The hook currently accepts `channelRef` from `RoomClient` and sets it. After this change it owns `channelRef` internally and returns `broadcast`.

- [ ] **Step 1: Update the interface and add broadcast**

Remove `channelRef` from `UseRoomSyncProps`. Add internal `channelRef`. Return `broadcast`.

```ts
// components/room/hooks/useRoomSync.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { capMessages } from '@/lib/chatLimit';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/names';
import { spawnReactions } from '../ui/spawnReactions';
import type { Room, QueueItem, RoomUser, UserRole, PlaybackSyncEvent, ChatMessage } from '@/lib/types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { setTime as setStoreTime } from '../playbackTimeStore';

type CurrentUser = ReturnType<typeof getOrCreateUser>;

interface UseRoomSyncProps {
  initialRoom: Room;
  currentUser: CurrentUser | null;
  myRoleRef: React.RefObject<UserRole>;
  isSpeakerRef: React.RefObject<boolean>;
  playerRef: React.RefObject<unknown>;
  playerReadyRef: React.RefObject<boolean>;
  handleNextRef: React.RefObject<() => void>;
  setRoom: React.Dispatch<React.SetStateAction<Room>>;
  setQueue: React.Dispatch<React.SetStateAction<QueueItem[]>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<CurrentUser | null>>;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  currentUserRef: React.RefObject<CurrentUser | null>;
  isChatVisibleRef: React.RefObject<boolean>;
  isSpeaker: boolean;
  myRole: UserRole;
  room: Room;
}

export function useRoomSync({
  initialRoom,
  currentUser,
  myRoleRef,
  isSpeakerRef,
  playerRef,
  playerReadyRef,
  handleNextRef,
  setRoom,
  setQueue,
  setCurrentUser,
  setChatMessages,
  currentUserRef,
  isChatVisibleRef,
  isSpeaker,
  myRole,
  room,
}: UseRoomSyncProps) {
  const [users, setUsers] = useState<RoomUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Stable broadcast — callers don't need a channelRef
  const broadcast = useCallback((event: string, payload: Record<string, unknown>) => {
    channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  // Main realtime channel setup
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel(`room:${initialRoom.slug}`, {
      config: { presence: { key: currentUser.user_id } },
    });

    channel.on('broadcast', { event: 'playback_sync' }, ({ payload }) => {
      const event = payload as PlaybackSyncEvent;
      if (event.triggered_by === currentUser.user_id) return;
      setRoom((prev) => ({
        ...prev,
        current_song_index: event.song_index,
        is_playing:
          event.type === 'play' ||
          event.type === 'next' ||
          event.type === 'prev' ||
          event.type === 'jump',
      }));
      if (event.current_time !== undefined) setStoreTime(event.current_time);
    });

    channel.on('broadcast', { event: 'queue_update' }, ({ payload }) => {
      if (payload.type === 'added') {
        setQueue((prev) => [...prev, payload.item as QueueItem]);
      } else if (payload.type === 'removed') {
        setQueue((prev) => prev.filter((item) => item.id !== payload.item_id));
        if (typeof payload.removed_index === 'number') {
          setRoom((prev) => {
            if ((payload.removed_index as number) < prev.current_song_index) {
              return { ...prev, current_song_index: prev.current_song_index - 1 };
            }
            return prev;
          });
        }
      }
    });

    channel.on('broadcast', { event: 'seek_request' }, ({ payload }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const player = playerRef.current as any;
      if (!isSpeakerRef.current || !player || !playerReadyRef.current) return;
      const time = payload.time as number;
      player.seekTo(time, true);
      setStoreTime(time);
      channel.send({ type: 'broadcast', event: 'time_sync', payload: { time } });
    });

    channel.on('broadcast', { event: 'time_sync' }, ({ payload }) => {
      setStoreTime(payload.time as number);
    });

    channel.on('broadcast', { event: 'volume_change' }, ({ payload }) => {
      setRoom((prev) => ({ ...prev, volume: payload.volume as number }));
    });

    channel.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      if (payload && typeof payload.emoji === 'string') {
        const count = Math.floor(Math.random() * 51) + 50;
        spawnReactions(payload.emoji, count);
      }
    });

    channel.on('broadcast', { event: 'repeat_toggle' }, ({ payload }) => {
      setRoom((prev) => ({ ...prev, repeat: payload.repeat as boolean }));
    });

    channel.on('broadcast', { event: 'role_update' }, ({ payload }) => {
      setRoom((prev) => ({
        ...prev,
        default_role: payload.default_role as UserRole,
        user_roles: payload.user_roles as Record<string, UserRole>,
      }));
    });

    channel.on('broadcast', { event: 'username_changed' }, ({ payload }) => {
      const { user_id, old_username, new_username } = payload as {
        user_id: string; old_username: string; new_username: string;
      };
      if (currentUserRef.current?.user_id === user_id) {
        const cur = currentUserRef.current;
        if (cur && cur.username !== new_username) {
          setCurrentUser((prev) => (prev ? { ...prev, username: new_username } : null));
        }
      }
      setChatMessages((prev) => {
        const sysMsgId = `sys_rename_${user_id}_${new_username}`;
        if (prev.some((m) => m.id === sysMsgId)) return prev;
        const systemMessage: ChatMessage = {
          id: sysMsgId,
          room_id: initialRoom.id,
          user_id: 'system',
          username: 'System',
          avatar_color: '#94a3b8',
          message: `${old_username} changed their name to ${new_username}`,
          image_url: null,
          song_ref: null,
          created_at: new Date().toISOString(),
        };
        const updated = prev.map((msg) =>
          msg.user_id === user_id ? { ...msg, username: new_username } : msg
        );
        return capMessages([...updated, systemMessage]);
      });
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const roomUsers: RoomUser[] = [];
        for (const key in state) {
          const presences = state[key] as unknown as RoomUser[];
          if (presences.length > 0) roomUsers.push(presences[presences.length - 1]);
        }
        setUsers(roomUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.user_id,
            username: currentUser.username,
            avatar_color: currentUser.avatar_color,
            role: myRoleRef.current,
            is_speaker: isSpeakerRef.current,
            joined_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    // DB: room changes
    const roomSub = supabase
      .channel(`room-db:${initialRoom.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${initialRoom.id}` },
        (payload) => { setRoom((prev) => ({ ...prev, ...payload.new })); }
      )
      .subscribe();

    // DB: queue changes
    const queueSub = supabase
      .channel(`queue-db:${initialRoom.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'queue_items', filter: `room_id=eq.${initialRoom.id}` },
        async () => {
          const { data } = await supabase
            .from('queue_items')
            .select('*')
            .eq('room_id', initialRoom.id)
            .order('position', { ascending: true });
          if (data) setQueue(data);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      roomSub.unsubscribe();
      queueSub.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.user_id, initialRoom.slug, initialRoom.id]);

  // Update presence when role/speaker/username changes
  useEffect(() => {
    if (!channelRef.current || !currentUser) return;
    channelRef.current.track({
      user_id: currentUser.user_id,
      username: currentUser.username,
      avatar_color: currentUser.avatar_color,
      role: myRole,
      is_speaker: isSpeaker,
      joined_at: new Date().toISOString(),
    }).catch(console.error);
  }, [isSpeaker, myRole, currentUser?.username, currentUser?.avatar_color]); // eslint-disable-line react-hooks/exhaustive-deps

  // Room heartbeat
  useEffect(() => {
    const ping = () => {
      supabase.from('rooms')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', initialRoom.id)
        .then();
    };
    ping();
    const worker = new Worker(
      URL.createObjectURL(new Blob([
        `setInterval(() => postMessage('ping'), 25000)`,
      ], { type: 'application/javascript' }))
    );
    worker.onmessage = ping;
    return () => worker.terminate();
  }, [initialRoom.id]);

  return { users, broadcast };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep useRoomSync
```

Expected: errors about `channelRef` prop missing in `RoomClient.tsx` — that's expected; will be fixed in Part 4.

- [ ] **Step 3: Commit**

```bash
git add components/room/hooks/useRoomSync.ts
git commit -m "refactor: useRoomSync — internal channelRef, return broadcast fn, swap addReactionBurst for spawnReactions"
```

---

### Task 10: Broadcast refactor — usePlayback

**Files:**
- Modify: `components/room/hooks/usePlayback.ts`

- [ ] **Step 1: Replace `channelRef` param with `broadcast`**

Change the interface and all `channelRef.current.send(...)` calls:

```ts
// In UsePlaybackProps, replace:
//   channelRef: React.RefObject<RealtimeChannel | null>;
// with:
  broadcast: (event: string, payload: Record<string, unknown>) => void;
```

In `broadcastPlayback`:
```ts
// Before:
channelRef.current.send({ type: 'broadcast', event: 'playback_sync', payload: event });

// After:
broadcast('playback_sync', event as unknown as Record<string, unknown>);
```

Find every other `channelRef.current` usage in `usePlayback.ts` and apply the same pattern. The full updated interface:

```ts
interface UsePlaybackProps {
  room: Room;
  roomRef: React.RefObject<Room>;
  queueRef: React.RefObject<QueueItem[]>;
  isSpeaker: boolean;
  isSpeakerRef: React.RefObject<boolean>;
  playerRef: React.RefObject<YTPlayer | null>;
  playerReadyRef: React.RefObject<boolean>;
  broadcast: (event: string, payload: Record<string, unknown>) => void;
  currentUser: ReturnType<typeof getOrCreateUser> | null;
  isTransitioningRef: React.RefObject<boolean>;
  isLoadingVideoRef: React.RefObject<boolean>;
  handleNextRef: React.RefObject<() => void>;
  setRoom: React.Dispatch<React.SetStateAction<Room>>;
  queue: QueueItem[];
}
```

Remove `import type { RealtimeChannel } from '@supabase/supabase-js'` from the file.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep usePlayback
```

Expected: only `RoomClient.tsx` errors (channelRef still passed there — fixed in Part 4).

- [ ] **Step 3: Commit**

```bash
git add components/room/hooks/usePlayback.ts
git commit -m "refactor: usePlayback — channelRef → broadcast param"
```

---

### Task 11: Broadcast refactor — useQueue + useIdentity

**Files:**
- Modify: `components/room/hooks/useQueue.ts`
- Modify: `components/room/hooks/useIdentity.ts`

- [ ] **Step 1: Update useQueue interface**

```ts
// Replace in UseQueueProps:
//   channelRef: React.RefObject<RealtimeChannel | null>;
// with:
  broadcast: (event: string, payload: Record<string, unknown>) => void;
```

In `addSongToQueue`, replace:
```ts
// Before:
channelRef.current?.send({
  type: 'broadcast',
  event: 'queue_update',
  payload: { type: 'added', item: data },
});
// After:
broadcast('queue_update', { type: 'added', item: data });
```

In `removeSong`, replace:
```ts
// Before:
channelRef.current?.send({
  type: 'broadcast',
  event: 'queue_update',
  payload: { type: 'removed', item_id: item.id, removed_index: removedIndex },
});
// After:
broadcast('queue_update', { type: 'removed', item_id: item.id, removed_index: removedIndex });
```

Remove `import type { RealtimeChannel }` from useQueue.ts.

- [ ] **Step 2: Update useIdentity interface**

```ts
// Replace in UseIdentityProps:
//   channelRef: React.RefObject<RealtimeChannel | null>;
// with:
  broadcast: (event: string, payload: Record<string, unknown>) => void;
```

In `handleUsernameChange`, replace:
```ts
// Before:
channelRef.current?.send({
  type: 'broadcast',
  event: 'username_changed',
  payload: { user_id: currentUser.user_id, old_username: oldUsername, new_username: trimmed },
});
// After:
broadcast('username_changed', {
  user_id: currentUser.user_id,
  old_username: oldUsername,
  new_username: trimmed,
});
```

Remove `import type { RealtimeChannel }` from useIdentity.ts.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -E "useQueue|useIdentity"
```

Expected: only `RoomClient.tsx` errors (fixed in Part 4).

- [ ] **Step 4: Commit**

```bash
git add components/room/hooks/useQueue.ts components/room/hooks/useIdentity.ts
git commit -m "refactor: useQueue + useIdentity — channelRef → broadcast param"
```

---

### Task 12: RoomContext

**Files:**
- Create: `components/room/RoomContext.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/room/RoomContext.tsx
'use client';

import { createContext, useContext } from 'react';
import type { Room, QueueItem, RoomUser, UserRole } from '@/lib/types';
import type { getOrCreateUser } from '@/lib/names';

type CurrentUser = ReturnType<typeof getOrCreateUser>;

export interface RoomContextValue {
  room: Room;
  queue: QueueItem[];
  users: RoomUser[];
  currentUser: CurrentUser | null;
  myRole: UserRole;
  currentSong: QueueItem | null;
  canPlayPause: boolean;
  canRearrange: boolean;
  isSpeaker: boolean;
  duration: number;
  broadcast: (event: string, payload: Record<string, unknown>) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const RoomContext = createContext<RoomContextValue | undefined>(undefined);

export function RoomProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: RoomContextValue;
}) {
  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used within RoomProvider');
  return ctx;
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep RoomContext
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/room/RoomContext.tsx
git commit -m "feat: add RoomContext — lean shared state for room component tree"
```

---

### Task 13: Final verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: errors only in `RoomClient.tsx` where `channelRef` is still passed to refactored hooks and `reactionsStore` is imported. These will be fixed in Part 4.

- [ ] **Step 2: Dev server smoke test**

```bash
npm run dev
```

- Open `http://localhost:3000` — page loads, Space Grotesk body font visible
- Dark purple background (not old OLED black)
- No console errors from the new files

- [ ] **Step 3: Tag foundation complete**

```bash
git tag foundation-done
```
