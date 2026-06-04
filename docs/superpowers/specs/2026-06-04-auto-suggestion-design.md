# Auto-Suggestion Feature Design

**Date:** 2026-06-04
**Status:** Approved

## Overview

When the queue is approaching its end and repeat is off, the system automatically fetches and queues suggested songs based on the room's current listening context (the queue itself). Users can still add songs manually at any time — suggestions are non-blocking and displayed in a separate section below the regular queue.

---

## Data Model

### `rooms` table — add column

```sql
ALTER TABLE rooms ADD COLUMN auto_suggest boolean NOT NULL DEFAULT false;
```

Room-wide setting. Persisted to DB, synced to all clients via broadcast.

### `queue_items` table — add columns

```sql
ALTER TABLE queue_items ADD COLUMN is_suggested boolean NOT NULL DEFAULT false;
ALTER TABLE queue_items ADD COLUMN suggested_position integer NULL;
```

- `is_suggested`: flags auto-suggested items; regular items always have `false`
- `suggested_position`: ordering within the suggested section only; `NULL` for regular songs
- Regular songs use existing `position` column (unchanged)
- Suggested songs: `position = NULL`, ordered by `suggested_position`

### Queue array construction

```
[...regularItems ORDER BY position ASC] + [...suggestedItems ORDER BY suggested_position ASC]
```

`current_song_index` indexes into this combined array, unchanged from current behavior.

---

## Suggestion Source: Queue-as-Signal

Suggestions are derived from the room's current queue — no user history, no external ML. The queue represents the room's collective vibe.

### Query building

1. Take last 3 regular queue items
2. Clean each title — strip noise tokens:
   - Brackets: `[Official Video]` `[Official Audio]` `[Lyrics]` `[HD]` `[HQ]` `[Full Album]`
   - Parens: `(Official)` `(Lyrics)` `(feat. ...)` `(ft. ...)`
   - Pipe segments: `| No Copyright Music` `| Royalty Free`
   - Emojis and unicode symbols
3. Attempt artist extraction via ` - ` separator on cleaned titles
   - If dominant artist found (appears in 2+ of last 3 titles) → query: `"[artist] similar mix"`
   - Otherwise → join all cleaned titles with space as query
4. Pass query to existing `/api/youtube/search`
5. Filter results: exclude any `youtube_id` already in `queue_items` for this room

### Examples

```
Queue last 3: ["Nujabes - Feather", "Nujabes - Luv Sic", "J Dilla - Donuts"]
→ dominant artist: "Nujabes"
→ query: "Nujabes similar mix"

Queue last 3: ["lofi hip hop radio beats to study", "Nujabes Feather", "Bonobo Kong"]
→ no dominant artist
→ query: "lofi hip hop beats study Nujabes Bonobo Kong"

Queue last 3: ["Drake - God's Plan", "Kendrick - HUMBLE", "Travis - SICKO MODE"]
→ all different artists
→ query: "Drake God's Plan Kendrick HUMBLE Travis SICKO MODE"
```

---

## Buffer Strategy

Keep **2 suggested songs** visible at all times while `auto_suggest` is on. Modeled after YouTube Music's sliding window pattern, scaled down for YouTube Data API quota constraints (each search = 100 quota units).

### Trigger: fetch while last song is playing

**NOT** at queue end — at last song start. This prevents the jarring "song appeared from nowhere" UX.

```
Trigger condition:
  current_song_index === regularQueue.length - 1
  AND room.auto_suggest === true
  AND room.repeat === false
  AND suggestedQueue.length < 2
```

### Rolling buffer flow

```
Queue: [A, B, C]   Suggested: []

→ C starts playing (last regular song)
  → fetch 2 suggestions → Suggested: [D, E]

→ C ends → D auto-plays, graduates to regular queue
  → Queue: [A, B, C, D]   Suggested: [E]
  → D is now last regular song → fetch 1 more → Suggested: [E, F]

→ user skips D → D removed, E plays, graduates
  → Queue: [A, B, C, E]   Suggested: [F]
  → fetch replacement → Suggested: [F, G]

→ user manually adds H
  → Queue: [A, B, C, E, H]   Suggested: [F, G]  ← suggested untouched
```

### `suggested_position` assignment

First fetch: assign `suggested_position = 1` and `suggested_position = 2`.
Each subsequent fetch: assign `suggested_position = MAX(current suggested_position) + 1`.

### Who fetches

Only the **playback sync authority** (lowest `user_id` among active speakers) fires the suggestion fetch and DB insert. All other clients wait for the Supabase Realtime row-insert event. This prevents N clients all calling `/api/youtube/search` simultaneously.

### Skip detection

A suggested song is considered skipped when:
- `removeSong` is called on an item where `is_suggested = true`, OR
- `handleNext` / `handlePrev` is called while `current_song_index` points to a suggested item (user actively moved away)

On skip: fetch 1 replacement to restore buffer to 2.

### Refetch triggers

- Suggested buffer drops below 2 (song played or removed)
- Suggested song skipped (signals rejection; fetch replacement with different query seed)

### Fetch failure

If YouTube search fails or returns no new results: suggested section stays at current count (may be 0). Queue ends normally. No crash, no retry storm.

---

## Graduation: Suggested → Regular Queue

When `current_song_index` moves to point at an `is_suggested` item:

1. The playback sync authority client (lowest `user_id` among active speakers) detects this
2. Fires Supabase update on that `queue_items` row:
   ```
   is_suggested = false
   position = MAX(regular position) + 1
   suggested_position = NULL
   ```
3. Supabase Realtime pushes row change to all clients
4. All clients re-render — item disappears from Suggested section, appears at tail of regular queue
5. No broadcast needed (Realtime handles it)

---

## Toggle

### Access control

Admin and moderator roles only. Same RBAC pattern as existing `canPlayPause`. DJs and listeners see the toggle button as dimmed/disabled (visual feedback, no action).

### Storage & sync

- Persisted in `rooms.auto_suggest` (DB)
- On toggle: update DB + broadcast `auto_suggest_toggle` event → all clients update local `room` state
- Pattern identical to existing `repeat_toggle`

### UI location: Queue panel header

Toggle button sits in the Queue panel header alongside the existing repeat button.

```
┌─ Queue ──────────────────── [⟳ repeat] [✦ auto] ─┐
│  1. Song A                                   [×]  │
│  2. Song B  ← currently playing              [×]  │
│  3. Song C  ← last song                      [×]  │
│  ── ✦ Suggested ──────────────────────────────── │
│  4. Song D  (auto)                           [×]  │
│  5. Song E  (auto)                           [×]  │
└────────────────────────────────────────────────────┘
```

- `[✦ auto]` button: accent color when on, dim when off — same visual language as repeat button
- Suggested section divider only renders when `auto_suggest=true` AND at least 1 suggested item exists
- Admin/mod: button clickable; others: `opacity: 0.4`, `pointer-events: none`

---

## Component & File Changes

| File | Change |
|---|---|
| `supabase-schema.sql` | Add `auto_suggest`, `is_suggested`, `suggested_position` columns |
| `lib/types.ts` | Add `auto_suggest: boolean` to `Room`; `is_suggested`, `suggested_position` to `QueueItem` |
| `components/room/hooks/useQueue.ts` | Split queue into `regularQueue` + `suggestedQueue`; graduation logic; `suggested_position` assignment on add |
| `components/room/hooks/usePlayback.ts` | Remove unconditional pause at queue end; trigger suggestion fetch instead |
| `components/RoomClient.tsx` | `handleAutoSuggestToggle`; wire `auto_suggest_toggle` broadcast; pass `suggestedQueue` down |
| `components/room/Queue.tsx` | Render suggested section with divider; `[✦ auto]` toggle button in header |
| `lib/youtube.ts` or new `lib/suggestionQuery.ts` | `buildSuggestionQuery(lastNTitles: string[]): string` — title cleaning + query construction |
| `app/api/youtube/search/route.ts` | No change needed — reuse as-is |

---

## Out of Scope

- Personalization by individual user history
- AI-generated queries (Claude API)
- More than 2-song buffer
- Suggested song drag-to-reorder
- Per-user auto-suggest toggle
