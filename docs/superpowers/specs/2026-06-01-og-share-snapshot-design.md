# OG Share-Time Snapshot + Pre-Warm — Design

**Date:** 2026-06-01
**Status:** Approved (pending spec review)

## Problem

Two issues with the room Open Graph (OG) image (`/api/og`):

1. **Cold-start latency (~5s).** First request to a room's OG pays ~5s (serverless cold boot + Satori render of heavy JSX + sequential DB queries). Warm requests are 100–500ms. When a user shares a fresh room link, the social-media scraper hits the cold endpoint and may time out or show a blank preview.

2. **Wrong listener source.** The OG derives "listeners" from the last 30 `chat_messages` (unique usernames). Chat authors ≠ current listeners. The real listener list lives in Supabase Presence, which is ephemeral and **not readable server-side**, so the OG route cannot access it.

## Goals

- Scraper never waits on a cold render — it gets a warm CDN-cached PNG.
- OG listener avatars/count reflect who was actually in the room at share time.
- Each new share regenerates a fresh image (no stale cache served for a new snapshot).
- Reduce the cold-render cost the sharer waits on.

## Non-Goals

- Live, always-current listener count in the OG (rejected: would need a heartbeat table + cleanup job). "As of last share" is sufficient.
- Real-time OG updates as the room changes without a share.

## Approach Overview

When a user clicks **Share**, the client snapshots the current Presence list into the `rooms` row, then pre-warms the CDN by fetching the OG URL itself. The room page's `generateMetadata` emits a **versioned** OG URL (`?v=<snapshot_at>`) so each new snapshot is a new CDN cache key — always fresh, never serving a stale image for a new share. The 5s cold cost is paid once, on the share click (behind a button spinner), off the scraper's path.

Cold render is additionally reduced by (a) baking the static OG layout into a single PNG so Satori composites only dynamic text, and (b) collapsing the OG's DB reads into one Postgres RPC.

## Data Model

New columns on `rooms` (no new table):

```sql
ALTER TABLE rooms
  ADD COLUMN listener_snapshot jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN snapshot_at timestamptz;
```

- `listener_snapshot` — array of usernames captured at share time, e.g. `["Kijang Ceria","Kerbau Malu"]`. Capped at the first ~8 names (OG shows max 4 avatars + an overflow count).
- `snapshot_at` — timestamp of the last snapshot; also the cache-bust version for the OG URL. `NULL` until first share.

## Components

### 1. Share button + handler (RoomClient + new ShareButton)

- **Net-new** Share control in the room header (any v1 share/copy-link control is removed if present).
- Reads the live Presence list from `useRoomSync` (`users: RoomUser[]`, each has `username`).
- On click:
  1. `const names = users.map(u => u.username).slice(0, 8)`.
  2. `update rooms set listener_snapshot = names, snapshot_at = now() where id = roomId` returning `snapshot_at`.
  3. Build `/api/og?t=<slug>&v=<epoch(snapshot_at)>` and `fetch()` it (fire-and-forget) to populate the CDN cache.
  4. Surface the share link: `navigator.share()` where available (mobile), else copy `https://dropatrack.vercel.app/<slug>` to clipboard + toast.
- Button shows a spinner during steps 2–3 (the cold render happens here). Steps 3 and 4 can run concurrently; the copied/shared link is the room page URL, not the OG URL.

### 2. Versioned OG metadata (`app/[slug]/page.tsx` → `generateMetadata`)

- Add `snapshot_at` to the room `select`.
- Compute `v = snapshot_at ? Math.floor(new Date(snapshot_at).getTime()/1000) : 0`.
- Emit OG + Twitter image URL `/api/og?t=${slug}&v=${v}`.
- Scraper fetches the room page → reads the latest `snapshot_at` → requests the matching versioned OG → hits the warm CDN entry the share click just populated.

### 3. OG route (`app/api/og/route.tsx`)

- **Delete the `chat_messages` query** (current lines ~97–119).
- Read `listener_snapshot` from the room row (rides along with the existing room fetch — no extra round-trip).
- Build the `listeners` array and overflow `extra` count from `listener_snapshot` instead of chat usernames.
- The `v` query param is read for nothing in render logic; it exists only to vary the CDN cache key. (Existing `listeners`/`extra` query-param fallbacks for the no-`t` preview case are retained.)
- Keep `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.

### 4. Baked static frame (Satori speedup)

- One-time hand-baked `public/og/frame.png` (1200×630), exported from the existing v2 design (`design/` HTML handoff). Contains all static chrome: left art panel, vinyl + grooves + decorative rings, star field, logo mark, eq bars, kicker/LIVE/JOIN button shapes, panel/URL-pill backgrounds, floating emoji.
- Loaded from disk and module-cached (same pattern as the font in `loadFont`), exposed as a base64 data URI.
- OG JSX becomes: a full-bleed `<img src={frameDataUri} width={1200} height={630}>` background, then **only** absolutely-positioned dynamic nodes:
  - room name
  - now-playing track + artist
  - listener avatars (colored circles + initials; count varies) + overflow `+N`
  - 3 stat values (listening-now count, queue length, OPEN/PRIV)
  - URL slug text (`/r/<slug>`)
  - "hosted by @artist" line
- Dynamic node coordinates are absolute and must match the baked frame's empty regions exactly.
- **Maintainability note:** the frame is a frozen PNG. Design changes to static chrome require re-exporting `frame.png` from the design source. This trade-off is accepted for render speed.

### 5. DB RPC (DB speedup)

- New Postgres function `get_room_og(p_slug text)` returning the room row (incl. `listener_snapshot`, `current_song_index`, `is_public`, `name`, `id`) plus its ordered `queue_items` (title, added_by) and a queue count, in a single round-trip.
- OG route calls `supabase.rpc('get_room_og', { p_slug: t })` instead of the room-then-queue two-query sequence, run in parallel with the (now disk-cached) font load.

## Data Flow (share → preview)

```
User clicks Share
  → read Presence users
  → UPDATE rooms (listener_snapshot, snapshot_at) → returns snapshot_at
  → fetch /api/og?t=slug&v=<snapshot_at>   (cold ~Xs, fills CDN cache)
  → navigator.share() / copy link
        ↓ (user pastes link)
Scraper GET /<slug>
  → generateMetadata reads snapshot_at
  → og:image = /api/og?t=slug&v=<snapshot_at>
Scraper GET /api/og?t=slug&v=<snapshot_at>
  → CDN HIT (warm, 100–500ms) → fresh PNG matching the snapshot
```

## Performance Expectations

- **Scraper path:** always warm CDN hit (100–500ms). Cold cost removed from the scraper entirely.
- **Cold render** (sharer-perceived, behind spinner): reduced by baked frame (fewer Satori nodes) + single RPC (one DB round-trip). Target: noticeably under the current ~5s.

## Edge Cases

- **Never shared (`snapshot_at` NULL):** `v=0`; OG shows `listener_snapshot` default `[]` → "listening now" stat renders `—` (existing empty-state behavior). First share fills it.
- **Empty presence at share time:** `listener_snapshot = []`; OG shows the `—` empty state.
- **Re-share with same listeners:** `snapshot_at` still advances → new `v` → fresh render. Acceptable.
- **Room auto-created server-side** (existing flow in `page.tsx`): `listener_snapshot` defaults to `[]`, `snapshot_at` NULL until first in-room share.

## Testing

- `get_room_og` RPC returns expected shape for a room with/without queue and with/without snapshot.
- OG route: `?t=slug` with a populated `listener_snapshot` renders the correct avatar count; with `[]` renders `—`.
- `generateMetadata` emits `?v=<epoch>` when `snapshot_at` set, `?v=0` when NULL.
- Share handler: writes `listener_snapshot` + `snapshot_at`, fires the versioned pre-warm fetch, and copies/share-sheets the room URL.
- Frame asset loads from disk and is module-cached (no per-request disk read after first).
