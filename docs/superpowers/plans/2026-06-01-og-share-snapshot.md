# OG Share-Time Snapshot + Pre-Warm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the room OG image render listeners from a share-time snapshot and serve a warm CDN-cached PNG to social scrapers, with reduced cold-render cost.

**Architecture:** A Share button snapshots the live Presence list into new `rooms` columns, then pre-warms a versioned OG URL (`?v=<snapshot_at>`) so each share is a fresh CDN cache key. `generateMetadata` emits the matching versioned URL. The OG route reads listeners from the snapshot (chat query removed), loads room+queue via a single RPC, and composites only dynamic text over a pre-baked static PNG frame.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres + RPC), `next/og` (Satori/ImageResponse), Vitest, puppeteer-core (unused here), TypeScript.

**Spec:** `docs/superpowers/specs/2026-06-01-og-share-snapshot-design.md`

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `supabase-schema.sql` | Canonical schema — add columns + RPC | Modify |
| `supabase-migration-og-snapshot.sql` | Apply changes to existing DB | Create |
| `lib/share.ts` | Pure helpers: snapshot names, OG version, OG path | Create |
| `lib/share.test.ts` | Unit tests for helpers | Create |
| `components/room/ShareButton.tsx` | Share control: snapshot → pre-warm → share/copy | Create |
| `components/room/Header.tsx` | Render ShareButton in header | Modify |
| `app/[slug]/page.tsx` | `generateMetadata` emits versioned OG URL | Modify |
| `app/api/og/route.tsx` | RPC fetch, snapshot listeners, baked-frame overlay | Modify |
| `scripts/gen-og-frame.tsx` | One-time render of static frame → PNG | Create |
| `public/og/frame.png` | Baked static OG chrome (committed asset) | Create (generated) |

---

## Task 1: Database — snapshot columns + `get_room_og` RPC

**Files:**
- Modify: `supabase-schema.sql`
- Create: `supabase-migration-og-snapshot.sql`

> No automated DB test (no database in CI). Verification is manual via the Supabase SQL editor.

- [ ] **Step 1: Create the migration file**

Create `supabase-migration-og-snapshot.sql`:

```sql
-- OG share-time snapshot: listener snapshot + cache-bust version on rooms
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS listener_snapshot jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS snapshot_at timestamptz;

-- Single-round-trip fetch for the OG image: room + ordered queue + count
CREATE OR REPLACE FUNCTION get_room_og(p_slug text)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'room', (
      SELECT json_build_object(
        'id', r.id,
        'name', r.name,
        'current_song_index', r.current_song_index,
        'is_public', r.is_public,
        'is_playing', r.is_playing,
        'listener_snapshot', r.listener_snapshot
      )
      FROM rooms r WHERE r.slug = p_slug
    ),
    'queue', COALESCE((
      SELECT json_agg(
        json_build_object('title', q.title, 'added_by', q.added_by)
        ORDER BY q.position
      )
      FROM queue_items q
      JOIN rooms r2 ON r2.id = q.room_id
      WHERE r2.slug = p_slug
    ), '[]'::json),
    'queue_count', (
      SELECT count(*)
      FROM queue_items q
      JOIN rooms r3 ON r3.id = q.room_id
      WHERE r3.slug = p_slug
    )
  );
$$;

-- Allow the anon role (used by the public client) to call it
GRANT EXECUTE ON FUNCTION get_room_og(text) TO anon, authenticated;
```

- [ ] **Step 2: Mirror the changes into the canonical schema**

In `supabase-schema.sql`, find the `CREATE TABLE rooms (...)` block and add these two columns alongside the existing column definitions (after `is_public`):

```sql
  listener_snapshot jsonb DEFAULT '[]'::jsonb,
  snapshot_at timestamptz,
```

Then append the entire `CREATE OR REPLACE FUNCTION get_room_og(...)` block and its `GRANT` (copy verbatim from Step 1) to the end of `supabase-schema.sql`.

- [ ] **Step 3: Apply the migration**

Run `supabase-migration-og-snapshot.sql` in the Supabase SQL editor (or via `psql`).

- [ ] **Step 4: Verify manually**

Run in the SQL editor (replace `your-existing-slug`):

```sql
SELECT get_room_og('your-existing-slug');
```

Expected: a JSON object with non-null `room` (containing `listener_snapshot: []`), a `queue` array, and an integer `queue_count`. For a non-existent slug, `room` is `null` and `queue` is `[]`.

- [ ] **Step 5: Commit**

```bash
git add supabase-schema.sql supabase-migration-og-snapshot.sql
git commit -m "feat(db): add listener_snapshot columns and get_room_og RPC"
```

---

## Task 2: Share helper pure functions

**Files:**
- Create: `lib/share.ts`
- Test: `lib/share.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/share.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { snapshotNames, ogImageVersion, ogImagePath } from './share';
import type { RoomUser } from './types';

function user(username: string): RoomUser {
  return {
    user_id: Math.random().toString(36).slice(2),
    username,
    avatar_color: '#fff',
    role: 'listener',
    is_speaker: false,
    joined_at: new Date().toISOString(),
  };
}

describe('snapshotNames', () => {
  it('returns trimmed usernames in order', () => {
    expect(snapshotNames([user('Alice'), user('Bob')])).toEqual(['Alice', 'Bob']);
  });

  it('dedupes repeated usernames', () => {
    expect(snapshotNames([user('Alice'), user('Alice'), user('Bob')])).toEqual(['Alice', 'Bob']);
  });

  it('skips empty/whitespace usernames', () => {
    expect(snapshotNames([user('  '), user('Bob')])).toEqual(['Bob']);
  });

  it('caps at 8 names', () => {
    const many = Array.from({ length: 12 }, (_, i) => user(`U${i}`));
    expect(snapshotNames(many)).toHaveLength(8);
  });
});

describe('ogImageVersion', () => {
  it('returns 0 for null/undefined', () => {
    expect(ogImageVersion(null)).toBe(0);
    expect(ogImageVersion(undefined)).toBe(0);
  });

  it('returns epoch seconds for a valid timestamp', () => {
    expect(ogImageVersion('2026-06-01T00:00:00.000Z')).toBe(1748736000);
  });

  it('returns 0 for an invalid timestamp', () => {
    expect(ogImageVersion('not-a-date')).toBe(0);
  });
});

describe('ogImagePath', () => {
  it('builds the versioned OG path with encoded slug', () => {
    expect(ogImagePath('my room', 123)).toBe('/api/og?t=my%20room&v=123');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/share.test.ts`
Expected: FAIL — `Failed to resolve import "./share"` / functions not defined.

- [ ] **Step 3: Write the implementation**

Create `lib/share.ts`:

```ts
import type { RoomUser } from './types';

/** Usernames captured at share time: trimmed, deduped, non-empty, first 8. */
export function snapshotNames(users: RoomUser[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of users) {
    const name = u.username?.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
    if (out.length >= 8) break;
  }
  return out;
}

/** Cache-bust version derived from snapshot_at. 0 when never snapshotted. */
export function ogImageVersion(snapshotAt: string | null | undefined): number {
  if (!snapshotAt) return 0;
  const ms = new Date(snapshotAt).getTime();
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
}

/** Relative path to the room OG image for a given cache version. */
export function ogImagePath(slug: string, version: number): string {
  return `/api/og?t=${encodeURIComponent(slug)}&v=${version}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- lib/share.test.ts`
Expected: PASS — all assertions green.

- [ ] **Step 5: Commit**

```bash
git add lib/share.ts lib/share.test.ts
git commit -m "feat: add OG share helper functions"
```

---

## Task 3: ShareButton component + Header wiring

**Files:**
- Create: `components/room/ShareButton.tsx`
- Modify: `components/room/Header.tsx`

> The component's side effects (Supabase update, `fetch`, `navigator.share`) are integration-level; the pure logic is already covered by Task 2. No new automated test here — verification is manual in Step 4.

- [ ] **Step 1: Create the ShareButton component**

Create `components/room/ShareButton.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRoom } from './RoomContext';
import { snapshotNames, ogImageVersion, ogImagePath } from '@/lib/share';
import Icon from './ui/Icon';

export default function ShareButton() {
  const { room, users } = useRoom();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (busy) return;
    setBusy(true);
    try {
      const names = snapshotNames(users);
      const snapshotAt = new Date().toISOString();

      // 1. Persist the snapshot (client timestamp doubles as cache version)
      const { data } = await supabase
        .from('rooms')
        .update({ listener_snapshot: names, snapshot_at: snapshotAt })
        .eq('id', room.id)
        .select('snapshot_at')
        .single();

      const version = ogImageVersion(data?.snapshot_at ?? snapshotAt);

      // 2. Pre-warm the CDN with the versioned OG image (fire-and-forget)
      fetch(ogImagePath(room.slug, version)).catch(() => {});

      // 3. Surface the room link
      const url = `${window.location.origin}/${room.slug}`;
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: room.name, url }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className="btn pop-sm btn-icon"
      onClick={handleShare}
      disabled={busy}
      title={copied ? 'Link copied!' : 'Share room'}
    >
      <Icon name={copied ? 'check' : 'link'} size={19} />
    </button>
  );
}
```

- [ ] **Step 2: Wire it into the Header**

In `components/room/Header.tsx`, add the import after the existing `Icon` import:

```tsx
import ShareButton from './ShareButton';
```

Then render it in the right-side button group, immediately before the theme-toggle button (the `toggleTheme` button at lines ~44-46):

```tsx
        <ShareButton />
        <button className="btn pop-sm btn-icon" onClick={toggleTheme} title="Toggle lights">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
        </button>
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Verify manually**

Run `npm run dev`, open a room, click the Share (link) button. Confirm:
- Desktop: the icon flips to a check and the room URL is on the clipboard.
- Network tab shows a `GET /api/og?t=<slug>&v=<number>` request fired.
- In Supabase, the room row's `listener_snapshot` and `snapshot_at` are updated.

- [ ] **Step 5: Commit**

```bash
git add components/room/ShareButton.tsx components/room/Header.tsx
git commit -m "feat: add Share button with presence snapshot and OG pre-warm"
```

---

## Task 4: Versioned OG URL in `generateMetadata`

**Files:**
- Modify: `app/[slug]/page.tsx`

- [ ] **Step 1: Import the helpers**

In `app/[slug]/page.tsx`, add after the existing imports (after `import type { Metadata } from 'next';`):

```tsx
import { ogImageVersion, ogImagePath } from '@/lib/share';
```

- [ ] **Step 2: Select `snapshot_at` and build the versioned URL**

Replace the metadata room query and `ogImageUrl` construction (current lines ~14-27):

```tsx
  const { data: room } = await supabase
    .from('rooms')
    .select('name, slug')
    .eq('slug', slug)
    .single();

  const roomName = room?.name ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  // template in layout.tsx appends " · DropATrack" — so just use the room name here
  const title = roomName;
  const ogTitle = `${roomName} — listening now on DropATrack`;
  const description = `Drop tracks and listen together in real-time inside "${roomName}".`;

  // /api/og?t=slug fetches room, current track, and recent chatters directly from DB
  const ogImageUrl = `/api/og?t=${encodeURIComponent(slug)}`;
```

with:

```tsx
  const { data: room } = await supabase
    .from('rooms')
    .select('name, slug, snapshot_at')
    .eq('slug', slug)
    .single();

  const roomName = room?.name ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  // template in layout.tsx appends " · DropATrack" — so just use the room name here
  const title = roomName;
  const ogTitle = `${roomName} — listening now on DropATrack`;
  const description = `Drop tracks and listen together in real-time inside "${roomName}".`;

  // Versioned so each share-time snapshot is a fresh CDN cache key
  const ogImageUrl = ogImagePath(slug, ogImageVersion(room?.snapshot_at));
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify manually**

Run `npm run dev`, then:

```bash
curl -s http://localhost:3000/<existing-slug> | grep -o 'og:image[^>]*'
```

Expected: the `og:image` content URL ends with `/api/og?t=<slug>&v=<number>` (v is `0` before any share, a 10-digit epoch after a share).

- [ ] **Step 5: Commit**

```bash
git add app/[slug]/page.tsx
git commit -m "feat: emit versioned OG image URL from room metadata"
```

---

## Task 5: OG route — RPC fetch + snapshot listeners (drop chat)

**Files:**
- Modify: `app/api/og/route.tsx`

- [ ] **Step 1: Replace the DB fetch block with the RPC**

In `app/api/og/route.tsx`, replace the entire `if (t) { ... }` block (current lines ~81-123) with:

```tsx
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
```

This removes the separate `rooms`, `queue_items`, and `chat_messages` queries in favor of one RPC call. The `listeners`/`extra`/`debug` query-param fallbacks below this block (for the no-`t` preview case) are unchanged.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify the data via debug mode**

Run `npm run dev`, then (use a room that has had a share so `listener_snapshot` is populated):

```bash
curl -s "http://localhost:3000/api/og?t=<slug>&debug=1"
```

Expected JSON: `listenersRaw` reflects the snapshot names (not chat usernames), `queueLen` matches the queue size, `dbLog.rpcRes.data.room` is present. Confirm there is no `chatRes` key anymore.

- [ ] **Step 4: Verify the image still renders**

Open `http://localhost:3000/api/og?t=<slug>` in a browser. Expected: the 1200×630 image renders with the snapshot listener avatars and a "listening now" count equal to the snapshot size (or `—` when the snapshot is empty).

- [ ] **Step 5: Commit**

```bash
git add app/api/og/route.tsx
git commit -m "feat(og): read listeners from snapshot via get_room_og RPC"
```

---

## Task 6: Baked static frame (Satori speedup)

**Files:**
- Create: `scripts/gen-og-frame.tsx`
- Create (generated): `public/og/frame.png`
- Modify: `app/api/og/route.tsx`

> **Why a render script, not an HTML screenshot:** the overlay text is positioned by Satori's layout engine. A browser screenshot of `design/og-image-v2.html` would not pixel-align with Satori. Generating the frame through the same `ImageResponse` pipeline guarantees alignment. The route still only *loads* the committed PNG at request time (one-time bake), it never renders chrome per request. The script is kept for regeneration but is not part of the request path.
>
> **Strategy:** the static frame is the current full OG JSX with every *dynamic* text value blanked (room name, track, artist, listener avatars, the three stat numbers, the slug, and the "hosted by" line) so the baked layout is identical to what the live route produces. The live route then overlays only those dynamic nodes, absolutely positioned over the frame image, reusing the exact coordinates the static layout occupies.

- [ ] **Step 1: Extract the static layout into a shared module**

Create `app/api/og/StaticFrame.tsx` exporting the static chrome as JSX plus the shared design tokens, so both the generator and (optionally) future edits share one source of truth. Move the token consts and `STAR_POS`/`STAR` arrays and the full static JSX tree from `route.tsx` into it, blanking dynamic text:

```tsx
import { CSSProperties } from 'react';

// v2 design tokens (hex — Satori has no oklch/CSS-vars support)
export const CORAL = '#ff7a4d';
export const YELLOW = '#ffd23f';
export const VIOLET = '#9d7bff';
export const MAGENTA = '#ff5da2';
export const LIME = '#b6f24d';
export const BG = '#14101f';
export const BG_GRAD = '#241640';
export const PANEL = '#241c3a';
export const INK = '#f7eeda';
export const INK_SOFT = '#b9acd6';
export const INK_DIM = '#8a7db0';
export const OUTLINE = '#0b0814';
export const SHADOW = '#070510';
export const STAR = '#fff4d0';
export const AVATAR_COLORS = [VIOLET, CORAL, YELLOW, MAGENTA, LIME];
export const VINYL_HOLE = '#f56b35';
export const ART_HERO_BG = 'radial-gradient(120% 110% at 30% 12%, #e8502a 0%, #7a3800 58%, #1a1a05 100%)';

export const STAR_POS: [number, number, number][] = [
  [55, 75, 4], [175, 38, 2], [300, 115, 2], [445, 58, 3],
  [510, 158, 2], [78, 295, 2], [375, 258, 4], [490, 320, 2],
  [200, 200, 2], [560, 80, 3],
];

// Full OG chrome with all dynamic text blanked. Bungee font supplied by caller.
export function StaticFrame() {
  return (
    <div style={{ display: 'flex', width: 1200, height: 630, background: BG, color: INK, overflow: 'hidden' }}>
      {/* LEFT art hero — identical to route, but the now-playing track/artist text is blank */}
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

      {/* RIGHT details panel — chrome, kicker, logo, LIVE, stat-card frames, footer; dynamic values blank */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 52px', background: `radial-gradient(120% 90% at 110% -10%, ${BG_GRAD} 0%, transparent 55%), ${BG}`, position: 'relative' }}>
        {STAR_POS.map(([x, y, size], i) => (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%', background: STAR, display: 'flex' }} />
        ))}
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

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignSelf: 'flex-start', alignItems: 'center', gap: 8, background: YELLOW, color: '#140f1f', padding: '7px 16px', borderRadius: 40, fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', border: `2.5px solid ${OUTLINE}`, marginBottom: 18, boxShadow: `3px 3px 0 ${SHADOW}` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" style={{ display: 'flex' }}><path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="#140f1f" /></svg>
            a room is waiting for you
          </div>
          {/* room name — blank (overlaid by route) — reserve height to keep layout identical */}
          <div style={{ display: 'flex', fontFamily: 'Bungee, system-ui', fontSize: 60, lineHeight: 0.98, color: INK, marginBottom: 20, height: 60 }} />
          {/* listener row — blank but reserve the vertical space */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, height: 40 }} />
          {/* stat-card frames — labels static, numbers overlaid by route */}
          <div style={{ display: 'flex', gap: 12 }}>
            {['listening now', 'queue length', 'visibility'].map((label, i) => (
              <div key={i} style={{ flex: 1, background: PANEL, border: `3px solid ${OUTLINE}`, borderRadius: 16, boxShadow: `5px 5px 0 ${SHADOW}`, padding: '14px 18px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontFamily: 'Bungee, system-ui', fontSize: 28, lineHeight: 1, color: CORAL, display: 'flex', height: 28 }} />
                <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: INK_DIM, marginTop: 7, display: 'flex' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

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
```

- [ ] **Step 2: Create the generation script**

Create `scripts/gen-og-frame.tsx`:

```tsx
import fs from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { StaticFrame } from '../app/api/og/StaticFrame';

async function main() {
  const fontPath = path.join(process.cwd(), 'public/fonts', 'Bungee-Regular.ttf');
  const font = await fs.readFile(fontPath);

  const res = new ImageResponse(<StaticFrame />, {
    width: 1200,
    height: 630,
    fonts: [{ name: 'Bungee', data: font, weight: 400, style: 'normal' }],
  });

  const buf = Buffer.from(await res.arrayBuffer());
  const outDir = path.join(process.cwd(), 'public/og');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'frame.png'), buf);
  console.log(`Wrote public/og/frame.png (${buf.length} bytes)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Generate the frame**

Run: `npx tsx scripts/gen-og-frame.tsx`
Expected: `Wrote public/og/frame.png (<N> bytes)` and the file exists.

- [ ] **Step 4: Visually verify the frame**

Open `public/og/frame.png`. Expected: full OG chrome (vinyl, rings, stars, logo, LIVE/JOIN/kicker, three empty stat cards with their labels, empty now-playing card with eq bars) and **no** room name / track / listener / stat numbers / slug. Compare against `design/screenshots/og-v2-preview.png` for chrome fidelity.

- [ ] **Step 5: Add a frame loader to the route**

In `app/api/og/route.tsx`, add a frame loader next to `loadFont` (after the `loadFont` function definition):

```tsx
let frameCache: string | null = null;
async function loadFrame(): Promise<string> {
  if (frameCache) return frameCache;
  const buf = await fs.readFile(path.join(process.cwd(), 'public/og/frame.png'));
  frameCache = `data:image/png;base64,${buf.toString('base64')}`;
  return frameCache;
}
```

- [ ] **Step 6: Load the frame in parallel and replace the JSX with an overlay**

In the `GET` handler, change the final `const bungee = await loadFont('Bungee', 400);` to load the frame too:

```tsx
    const [bungee, frame] = await Promise.all([loadFont('Bungee', 400), loadFrame()]);
```

Then replace the entire `return new ImageResponse( ( <div ...> ...all chrome... </div> ), {...} )` JSX tree with the frame image plus absolutely-positioned dynamic nodes. Use these coordinates (right panel starts at x=470; panel padding is 48 top / 52 left, so panel content origin is x=522):

```tsx
    return new ImageResponse(
      (
        <div style={{ display: 'flex', position: 'relative', width: 1200, height: 630 }}>
          {/* baked static chrome */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={frame} width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0 }} />

          {/* now-playing track + artist (left card text area) */}
          <div style={{ position: 'absolute', left: 42, top: 536, width: 386, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 21, fontWeight: 700, color: INK, lineHeight: 1.1, display: 'flex' }}>{track || 'Queue is empty'}</div>
            {artist && (
              <div style={{ fontSize: 13, color: INK_DIM, fontFamily: 'monospace', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex' }}>{artist}</div>
            )}
          </div>

          {/* room name */}
          <div style={{ position: 'absolute', left: 522, top: 196, width: 626, display: 'flex', fontFamily: 'Bungee, system-ui', fontSize: 60, lineHeight: 0.98, color: INK }}>{roomDisplay}</div>

          {/* listeners + hosted-by */}
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

          {/* stat numbers — three cards across the panel; numbers sit at the card tops */}
          <div style={{ position: 'absolute', left: 524, top: 374, fontFamily: 'Bungee, system-ui', fontSize: 28, lineHeight: 1, color: CORAL, display: 'flex' }}>{listeners.length > 0 ? String(listeners.length + extra) : '—'}</div>
          <div style={{ position: 'absolute', left: 736, top: 374, fontFamily: 'Bungee, system-ui', fontSize: 28, lineHeight: 1, color: CORAL, display: 'flex' }}>{queueDisplay}</div>
          <div style={{ position: 'absolute', left: 948, top: 374, fontFamily: 'Bungee, system-ui', fontSize: 28, lineHeight: 1, color: CORAL, display: 'flex' }}>{isPublic ? 'OPEN' : 'PRIV'}</div>

          {/* URL slug suffix (after the static "dropatrack.vercel.app") */}
          {t && (
            <div style={{ position: 'absolute', left: 522, top: 556, display: 'flex', fontFamily: 'monospace', fontSize: 17, fontWeight: 700, color: INK }}>{`dropatrack.vercel.app/r/${t}`}</div>
          )}
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [{ name: 'Bungee', data: bungee, weight: 400 as const, style: 'normal' as const }],
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
      }
    );
```

> Note: the URL pill text is redrawn in full (over the baked pill background) because Satori cannot append to baked text. The baked `dropatrack.vercel.app` underneath is covered by this opaque-colored overlay sitting at the same position; if a faint underlap shows in Step 7, nudge `left`/`top` by 1–2px or widen the overlay background. The `STAR`, `INK`, `CORAL`, etc. tokens must be imported into `route.tsx` from `./StaticFrame` — replace the route's local token consts with `import { CORAL, YELLOW, ..., AVATAR_COLORS, OUTLINE, SHADOW, PANEL, INK, INK_SOFT, INK_DIM } from './StaticFrame';` and delete the now-duplicated const declarations and `STAR_POS`/`STAR` from `route.tsx`.

- [ ] **Step 7: Visually verify the composited image**

Run `npm run dev`, open `http://localhost:3000/api/og?t=<slug>` (a room with a populated snapshot). Expected: identical-looking image to before this task — room name, track/artist, listener avatars, three stat numbers, and the `/r/<slug>` URL all sit correctly inside their baked frame regions with no misalignment, doubling, or clipping. Adjust the absolute coordinates in Step 6 if any element is off.

- [ ] **Step 8: Confirm the perf win**

```bash
# cold-ish: restart dev server first, then time one request
time curl -s "http://localhost:3000/api/og?t=<slug>&v=$(date +%s)" -o /dev/null
```

Expected: render completes; node count is much lower than before. (Absolute timing in dev is noisy; the goal is fewer Satori nodes, validated by the image rendering correctly with the overlay-only tree.)

- [ ] **Step 9: Commit**

```bash
git add app/api/og/StaticFrame.tsx scripts/gen-og-frame.tsx public/og/frame.png app/api/og/route.tsx
git commit -m "perf(og): composite dynamic text over pre-baked static frame"
```

---

## Final Verification

- [ ] **Run the full test suite**

Run: `npm test`
Expected: all tests pass (including `lib/share.test.ts` and existing `lib/names.test.ts`).

- [ ] **Type-check and lint the whole project**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **End-to-end manual check**

1. Apply the migration (Task 1) to the dev Supabase project.
2. Open a room with 2+ users present, click Share.
3. Confirm the room row's `listener_snapshot`/`snapshot_at` update and a pre-warm `GET /api/og?...&v=<epoch>` fires.
4. `curl` the room page HTML and confirm `og:image` carries the same `v=<epoch>`.
5. Open that exact OG URL — the snapshot listeners appear, the image is correct, and the second load is fast (warm).
