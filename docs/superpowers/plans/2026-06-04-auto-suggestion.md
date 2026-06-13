# Auto-Suggestion Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the queue nears its end and repeat is off, auto-fetch YouTube songs from the room's current queue context and queue them in a separate "Suggested" section, controllable by an admin/moderator toggle.

**Architecture:** Suggested songs are stored as rows in the existing `queue_items` table flagged `is_suggested=true` and ordered by a separate `suggested_position` column. They live in the same combined `queue` array (regular songs first, suggested after), so playback advances into them with no special-casing. A Postgres trigger atomically "graduates" a suggested song to the regular queue when `current_song_index` advances onto it. Only the elected playback-sync authority (lowest `user_id` among speakers) calls the YouTube search and inserts new suggestions; all other clients receive the rows via Supabase Realtime.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres + Realtime), React 19, TypeScript, Vitest, YouTube Data API v3 (via existing `/api/youtube/search` proxy).

---

## Design Decisions (resolving spec ambiguities)

1. **`usePlayback` is NOT modified.** The spec's component table lists removing the "unconditional pause at queue end." Analysis of the code shows suggested items are part of the same `queue`/`queueRef` array, so `handleNext` advances into them normally and the end-of-playlist pause only fires at the true end of the combined array. No change needed — leaving it untouched avoids regressions.

2. **Low-watermark refill instead of literal `length < 5`.** Because graduation appends the just-played suggested song to the regular tail, `current_song_index === regularQueue.length - 1` stays true throughout suggested playback. A literal `suggested.length < 5` trigger would refetch (100 quota) on every song — exactly the "never fetch one-at-a-time" anti-goal in the spec. Resolution: refill only when the buffer drains to `REFILL_AT = 1`, topping back up to `BUFFER_SIZE = 5` in a single batch insert. Net: ~1 search per 4 songs played, batched. This honors the spec's stated intent ("one search fills the buffer", "quota cost scales with refetch frequency").

3. **Rendering uses an inline divider, not a separate `suggestedQueue` prop.** The `Queue` component keeps iterating the combined `queue` (so `current_song_index` math is untouched) and renders a "✦ Suggested" divider before the first `is_suggested` item. The regular/suggested split is only computed inside the fetch hook where counts matter.

---

## File Structure

| File | Responsibility | Create/Modify |
|---|---|---|
| `supabase/migrations/20260604000001_auto_suggest.sql` | New columns, nullable `position`, graduation trigger, OG filter | Create |
| `supabase/migrations/20240101000000_initial_schema.sql` (+3 more) | Existing loose SQL moved into migration history | Create (copies) |
| `supabase-schema.sql` | Fresh-install schema gains the same columns + trigger | Modify |
| `lib/types.ts` | `auto_suggest` on `Room`; `is_suggested`, `suggested_position` on `QueueItem` | Modify |
| `lib/suggestionQuery.ts` | Pure `buildSuggestionQuery(titles)` — title cleaning + query construction | Create |
| `lib/suggestionQuery.test.ts` | Unit tests for the pure function | Create |
| `app/[slug]/page.tsx` | Initial server queue fetch ordered by combined ordering | Modify |
| `components/room/hooks/useRoomSync.ts` | Realtime queue fetch ordering + `auto_suggest_toggle` broadcast handler | Modify |
| `components/room/hooks/useAutoSuggest.ts` | Authority-gated fetch + batch insert of suggestions | Create |
| `components/room/RoomContext.tsx` | Add `canAutoSuggest` to context | Modify |
| `components/RoomClient.tsx` | `handleToggleAutoSuggest`, `canAutoSuggest`, wire `useAutoSuggest`, pass props | Modify |
| `components/room/Queue.tsx` | `[✦ auto]` toggle button + Suggested divider/tag rendering | Modify |

---

## Task 1: Database — migration structure + columns + graduation trigger

**Files:**
- Create: `supabase/migrations/20260604000001_auto_suggest.sql`
- Create: `supabase/migrations/20240101000000_initial_schema.sql` (copy of `supabase-schema.sql`)
- Create: `supabase/migrations/20240101000001_add_playback_updated_at.sql` (copy)
- Create: `supabase/migrations/20240101000002_og_snapshot.sql` (copy)
- Create: `supabase/migrations/20240101000003_og_tokens.sql` (copy)
- Modify: `supabase-schema.sql`

- [ ] **Step 1: Create the migrations directory and seed it from existing loose SQL**

Run:
```bash
mkdir -p supabase/migrations
cp supabase-schema.sql            supabase/migrations/20240101000000_initial_schema.sql
cp add-playback-updated-at.sql    supabase/migrations/20240101000001_add_playback_updated_at.sql
cp supabase-migration-og-snapshot.sql supabase/migrations/20240101000002_og_snapshot.sql
cp og_tokens_migration.sql        supabase/migrations/20240101000003_og_tokens.sql
ls supabase/migrations
```
Expected: the four files listed. (The loose root `.sql` files stay in place for now; remove only after the user confirms the Supabase GitHub integration works.)

- [ ] **Step 2: Write the new feature migration**

Create `supabase/migrations/20260604000001_auto_suggest.sql`:
```sql
-- Auto-suggestion feature: columns + graduation trigger

-- Room-wide toggle
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS auto_suggest boolean NOT NULL DEFAULT false;

-- Suggested-song flags
ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS is_suggested boolean NOT NULL DEFAULT false;
ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS suggested_position integer NULL;

-- Suggested songs carry a NULL position (ordered by suggested_position instead)
ALTER TABLE queue_items ALTER COLUMN position DROP NOT NULL;

-- Trigger: auto-graduate a suggested song to the regular queue when
-- current_song_index advances onto it.
CREATE OR REPLACE FUNCTION graduate_suggested_song()
RETURNS TRIGGER AS $$
DECLARE
  v_item_id uuid;
  v_max_pos integer;
BEGIN
  IF OLD.current_song_index = NEW.current_song_index THEN
    RETURN NEW;
  END IF;

  -- Find the item at the new index, mirroring client array ordering:
  -- regular songs first (by position), then suggested (by suggested_position).
  SELECT id INTO v_item_id
  FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        ORDER BY is_suggested ASC,
        CASE WHEN is_suggested = false THEN position
             ELSE suggested_position END ASC
      ) - 1 AS idx
    FROM queue_items WHERE room_id = NEW.id
  ) ranked
  WHERE idx = NEW.current_song_index AND is_suggested = true;

  IF v_item_id IS NOT NULL THEN
    SELECT COALESCE(MAX(position), 0) INTO v_max_pos
    FROM queue_items WHERE room_id = NEW.id AND is_suggested = false;

    UPDATE queue_items
    SET is_suggested = false, position = v_max_pos + 1, suggested_position = NULL
    WHERE id = v_item_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_graduate_suggested ON rooms;
CREATE TRIGGER trg_graduate_suggested
AFTER UPDATE OF current_song_index ON rooms
FOR EACH ROW EXECUTE FUNCTION graduate_suggested_song();

-- Keep suggested songs out of the OG share snapshot
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
      WHERE r2.slug = p_slug AND q.is_suggested = false
    ), '[]'::json),
    'queue_count', (
      SELECT count(*)
      FROM queue_items q
      JOIN rooms r3 ON r3.id = q.room_id
      WHERE r3.slug = p_slug AND q.is_suggested = false
    )
  );
$$;

GRANT EXECUTE ON FUNCTION get_room_og(text) TO anon, authenticated;
```

- [ ] **Step 3: Mirror the columns + trigger into the fresh-install schema**

In `supabase-schema.sql`, append a new section at the end of the file (after the `get_room_og` definition, after line 224):
```sql

-- 12. Auto-suggestion feature
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS auto_suggest boolean NOT NULL DEFAULT false;
ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS is_suggested boolean NOT NULL DEFAULT false;
ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS suggested_position integer NULL;
ALTER TABLE queue_items ALTER COLUMN position DROP NOT NULL;

CREATE OR REPLACE FUNCTION graduate_suggested_song()
RETURNS TRIGGER AS $$
DECLARE
  v_item_id uuid;
  v_max_pos integer;
BEGIN
  IF OLD.current_song_index = NEW.current_song_index THEN
    RETURN NEW;
  END IF;
  SELECT id INTO v_item_id
  FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        ORDER BY is_suggested ASC,
        CASE WHEN is_suggested = false THEN position
             ELSE suggested_position END ASC
      ) - 1 AS idx
    FROM queue_items WHERE room_id = NEW.id
  ) ranked
  WHERE idx = NEW.current_song_index AND is_suggested = true;
  IF v_item_id IS NOT NULL THEN
    SELECT COALESCE(MAX(position), 0) INTO v_max_pos
    FROM queue_items WHERE room_id = NEW.id AND is_suggested = false;
    UPDATE queue_items
    SET is_suggested = false, position = v_max_pos + 1, suggested_position = NULL
    WHERE id = v_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_graduate_suggested ON rooms;
CREATE TRIGGER trg_graduate_suggested
AFTER UPDATE OF current_song_index ON rooms
FOR EACH ROW EXECUTE FUNCTION graduate_suggested_song();
```
Also update the existing `get_room_og` body in `supabase-schema.sql` (lines ~206-220): add `AND q.is_suggested = false` to both the `queue` subquery `WHERE` (after `WHERE r2.slug = p_slug`) and the `queue_count` subquery `WHERE` (after `WHERE r3.slug = p_slug`).

- [ ] **Step 4: Apply the new migration to the Supabase project (manual)**

The migration must be applied to the live database before the app code runs. Open the Supabase SQL Editor and run the full contents of `supabase/migrations/20260604000001_auto_suggest.sql`. (If the Supabase CLI is linked, `supabase db push` works instead — but `supabase init`/linking is a separate user step and not required for this plan.)
Expected: no errors; `rooms.auto_suggest`, `queue_items.is_suggested`, `queue_items.suggested_position` exist and `queue_items.position` is now nullable.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations supabase-schema.sql
git commit -m "feat(db): add auto-suggest columns and graduation trigger"
```

---

## Task 2: Types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add the room flag**

In `lib/types.ts`, inside `interface Room`, add after the `repeat: boolean;` line (line 14):
```typescript
  auto_suggest: boolean;
```

- [ ] **Step 2: Add the queue-item flags**

In `lib/types.ts`, inside `interface QueueItem`, add after the `position: number;` line (line 29):
```typescript
  is_suggested: boolean;
  suggested_position: number | null;
```

- [ ] **Step 3: Verify typecheck still passes**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). New optional fields are additive; existing inserts that omit them are fine because the DB has defaults.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add auto-suggest fields to Room and QueueItem"
```

---

## Task 3: Suggestion query builder (pure function, TDD)

**Files:**
- Create: `lib/suggestionQuery.ts`
- Test: `lib/suggestionQuery.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/suggestionQuery.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { buildSuggestionQuery } from './suggestionQuery';

describe('buildSuggestionQuery', () => {
  it('returns empty string for no titles', () => {
    expect(buildSuggestionQuery([])).toBe('');
  });

  it('uses a "similar mix" query when one artist dominates (2+ of 3)', () => {
    expect(
      buildSuggestionQuery(['Nujabes - Feather', 'Nujabes - Luv Sic', 'J Dilla - Donuts'])
    ).toBe('Nujabes similar mix');
  });

  it('strips bracket/paren/pipe noise and emojis when joining', () => {
    expect(
      buildSuggestionQuery(['Nujabes - Feather [Official Audio]'])
    ).toBe('Nujabes Feather');
  });

  it('drops everything after a pipe and removes emojis', () => {
    expect(
      buildSuggestionQuery(['lofi hip hop 🎧 | No Copyright Music'])
    ).toBe('lofi hip hop');
  });

  it('joins cleaned titles (dashes flattened) when no artist dominates', () => {
    expect(
      buildSuggestionQuery(["Drake - God's Plan", 'Kendrick - HUMBLE', 'Travis - SICKO MODE'])
    ).toBe("Drake God's Plan Kendrick HUMBLE Travis SICKO MODE");
  });

  it('ignores titles that clean to empty', () => {
    expect(buildSuggestionQuery(['🎵🎵🎵', '[Official Video]'])).toBe('');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/suggestionQuery.test.ts`
Expected: FAIL — `Failed to resolve import "./suggestionQuery"` (file does not exist yet).

- [ ] **Step 3: Implement the pure function**

Create `lib/suggestionQuery.ts`:
```typescript
// Builds a YouTube search query from the room's recent queue titles.
// Strategy: clean noise, detect a dominant artist via " - " separator,
// otherwise join the cleaned titles. Pure + deterministic for testing.

const NOISE_BRACKETS = /\[[^\]]*\]/g;   // [Official Video], [HD], ...
const NOISE_PARENS = /\([^)]*\)/g;      // (Official), (feat. ...), ...
const PIPE_SEG = /\|.*/;                // drop everything from the first pipe on
// Keep letters, numbers, whitespace, apostrophe, ampersand, hyphen. Drop emojis/symbols.
const SYMBOLS = /[^\p{L}\p{N}\s'&-]/gu;

function cleanTitle(t: string): string {
  return t
    .replace(NOISE_BRACKETS, ' ')
    .replace(NOISE_PARENS, ' ')
    .replace(PIPE_SEG, ' ')
    .replace(SYMBOLS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSuggestionQuery(titles: string[]): string {
  const cleaned = titles.map(cleanTitle).filter(Boolean);
  if (cleaned.length === 0) return '';

  // Count artists (text before the first " - ").
  const counts = new Map<string, number>();
  for (const t of cleaned) {
    const idx = t.indexOf(' - ');
    if (idx > 0) {
      const artist = t.slice(0, idx).trim().toLowerCase();
      counts.set(artist, (counts.get(artist) ?? 0) + 1);
    }
  }

  let dominant: string | null = null;
  for (const [artist, c] of counts) {
    if (c >= 2 && (dominant === null || c > (counts.get(dominant) ?? 0))) {
      dominant = artist;
    }
  }

  if (dominant) {
    const orig = cleaned.find((t) => t.toLowerCase().startsWith(dominant + ' - '));
    const name = orig ? orig.slice(0, orig.indexOf(' - ')).trim() : dominant;
    return `${name} similar mix`;
  }

  return cleaned
    .map((t) => t.replace(/ - /g, ' '))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/suggestionQuery.test.ts`
Expected: PASS — 6 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/suggestionQuery.ts lib/suggestionQuery.test.ts
git commit -m "feat(suggest): add buildSuggestionQuery query builder"
```

---

## Task 4: Combined queue ordering (server + realtime fetch)

The queue must be ordered `[regular by position] ++ [suggested by suggested_position]` everywhere it is loaded, so `current_song_index` matches the trigger's `ROW_NUMBER()` ordering.

**Files:**
- Modify: `app/[slug]/page.tsx:122-126`
- Modify: `components/room/hooks/useRoomSync.ts:200-205`

- [ ] **Step 1: Order the initial server-side fetch**

In `app/[slug]/page.tsx`, replace the queue fetch (lines 122-126):
```typescript
  const { data: queue } = await supabase
    .from('queue_items')
    .select('*')
    .eq('room_id', room.id)
    .order('position', { ascending: true });
```
with:
```typescript
  const { data: queue } = await supabase
    .from('queue_items')
    .select('*')
    .eq('room_id', room.id)
    .order('is_suggested', { ascending: true })
    .order('position', { ascending: true, nullsFirst: false })
    .order('suggested_position', { ascending: true, nullsFirst: false });
```

- [ ] **Step 2: Order the realtime refetch**

In `components/room/hooks/useRoomSync.ts`, replace the fetch inside the `queue_items` subscription (lines 200-205):
```typescript
          const { data } = await supabase
            .from('queue_items')
            .select('*')
            .eq('room_id', initialRoom.id)
            .order('position', { ascending: true });
          if (data) setQueue(data);
```
with:
```typescript
          const { data } = await supabase
            .from('queue_items')
            .select('*')
            .eq('room_id', initialRoom.id)
            .order('is_suggested', { ascending: true })
            .order('position', { ascending: true, nullsFirst: false })
            .order('suggested_position', { ascending: true, nullsFirst: false });
          if (data) setQueue(data);
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/\[slug\]/page.tsx components/room/hooks/useRoomSync.ts
git commit -m "feat(queue): order combined queue regular-then-suggested"
```

---

## Task 5: Toggle plumbing (broadcast handler, context, RoomClient, button)

**Files:**
- Modify: `components/room/hooks/useRoomSync.ts:119-121` (after the `repeat_toggle` handler)
- Modify: `components/room/RoomContext.tsx:19`
- Modify: `components/RoomClient.tsx` (handler, derived flag, context value, queueProps)
- Modify: `components/room/Queue.tsx` (props + button)

- [ ] **Step 1: Add the `auto_suggest_toggle` broadcast receiver**

In `components/room/hooks/useRoomSync.ts`, immediately after the `repeat_toggle` handler block (after line 121, before the `role_update` handler):
```typescript
    channel.on('broadcast', { event: 'auto_suggest_toggle' }, ({ payload }) => {
      setRoom((prev) => ({ ...prev, auto_suggest: payload.auto_suggest as boolean }));
    });
```

- [ ] **Step 2: Add `canAutoSuggest` to the context type**

In `components/room/RoomContext.tsx`, inside `interface RoomContextValue`, add after `canRearrange: boolean;` (line 19):
```typescript
  canAutoSuggest: boolean;
```

- [ ] **Step 3: Add the toggle handler + derived flag in RoomClient**

In `components/RoomClient.tsx`, add a new handler right after `handleToggleRepeat` (after line 231):
```typescript
  const handleToggleAutoSuggest = useCallback(() => {
    const next = !room.auto_suggest;
    setRoom((prev) => ({ ...prev, auto_suggest: next }));
    broadcast('auto_suggest_toggle', { auto_suggest: next });
    supabase.from('rooms').update({ auto_suggest: next }).eq('id', initialRoom.id).then(() => {});
  }, [room.auto_suggest, broadcast, initialRoom.id]);
```
In the `// ── Derived ──` block, add after `canRearrange` (line 247):
```typescript
  const canAutoSuggest = myRole === 'admin' || myRole === 'moderator';
```
In `contextValue` (lines 258-262), add `canAutoSuggest` to the object:
```typescript
    canPlayPause, canSeek, canVolume, canRearrange, canAutoSuggest, isSpeaker, duration,
```
In `queueProps` (lines 265-279), add after `onToggleRepeat: handleToggleRepeat,`:
```typescript
    onToggleAutoSuggest: handleToggleAutoSuggest,
```

- [ ] **Step 4: Accept the prop and render the toggle button in Queue**

In `components/room/Queue.tsx`, add to `interface QueueProps` after `onToggleRepeat: () => void;` (line 168):
```typescript
  onToggleAutoSuggest: () => void;
```
Destructure it in the component signature (line 176) — change:
```typescript
  onDragStart, onDragOver, onDragLeave, onDrop, onAdd, onToggleRepeat,
}: QueueProps) {
  const { queue, room, canRearrange, canPlayPause } = useRoom();
```
to:
```typescript
  onDragStart, onDragOver, onDragLeave, onDrop, onAdd, onToggleRepeat, onToggleAutoSuggest,
}: QueueProps) {
  const { queue, room, canRearrange, canPlayPause, canAutoSuggest } = useRoom();
```
Add the toggle button in the header, immediately after the repeat `<button>` block (after line 210, before the shuffle button):
```tsx
          <button
            className="btn pop-sm btn-icon"
            onClick={onToggleAutoSuggest}
            disabled={!canAutoSuggest}
            title={room.auto_suggest ? 'Auto-suggest on' : 'Auto-suggest off'}
            style={{ background: room.auto_suggest ? 'var(--accent)' : 'var(--panel)', color: room.auto_suggest ? '#140f1f' : 'var(--ink-dim)', opacity: canAutoSuggest ? 1 : 0.4 }}
          >
            <Icon name="sparkle" size={18} />
          </button>
```

- [ ] **Step 5: Verify the `sparkle` icon exists; fall back if not**

Run: `grep -n "sparkle\|bolt\|star" components/room/ui/Icon.tsx`
Expected: a list of icon names. If `sparkle` is NOT present, use an existing icon name from the output (e.g. `bolt`) in the `<Icon name="..." />` above instead. Do not invent an icon name.

- [ ] **Step 6: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/room/hooks/useRoomSync.ts components/room/RoomContext.tsx components/RoomClient.tsx components/room/Queue.tsx
git commit -m "feat(suggest): add auto-suggest toggle (RBAC, broadcast, button)"
```

---

## Task 6: Auto-suggest fetch hook

The elected playback-sync authority fetches and batch-inserts suggestions when the buffer drains and the current song is the last regular item.

**Files:**
- Create: `components/room/hooks/useAutoSuggest.ts`
- Modify: `components/RoomClient.tsx` (import + invoke, pass `isSourceRef`)

- [ ] **Step 1: Create the hook**

Create `components/room/hooks/useAutoSuggest.ts`:
```typescript
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { buildSuggestionQuery } from '@/lib/suggestionQuery';
import type { Room, QueueItem } from '@/lib/types';

const BUFFER_SIZE = 5;   // target number of suggested songs
const REFILL_AT = 1;     // refill (batched) once the buffer drains to this

interface UseAutoSuggestProps {
  room: Room;
  queue: QueueItem[];
  roomRef: React.RefObject<Room>;
  queueRef: React.RefObject<QueueItem[]>;
  isSourceRef: React.RefObject<boolean>;
}

export function useAutoSuggest({ room, queue, roomRef, queueRef, isSourceRef }: UseAutoSuggestProps) {
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!room.auto_suggest || room.repeat) return;
    if (!isSourceRef.current) return; // only the elected authority fetches
    if (fetchingRef.current) return;

    const q = queueRef.current;
    const regular = q.filter((i) => !i.is_suggested);
    const suggested = q.filter((i) => i.is_suggested);

    // Trigger only while the last regular song is current and buffer is low.
    if (room.current_song_index !== regular.length - 1) return;
    if (suggested.length > REFILL_AT) return;
    if (regular.length === 0) return;

    fetchingRef.current = true;
    (async () => {
      try {
        const query = buildSuggestionQuery(regular.slice(-3).map((i) => i.title));
        if (!query) return;

        const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const results: Array<{ id: string; title: string; thumbnail: string; durationSeconds: number }> =
          data.results || [];

        const existingIds = new Set(q.map((i) => i.youtube_id));
        const need = BUFFER_SIZE - suggested.length;
        const picks = results.filter((r) => !existingIds.has(r.id)).slice(0, need);
        if (picks.length === 0) return;

        const maxSugPos = suggested.reduce(
          (m, i) => Math.max(m, i.suggested_position ?? 0),
          0
        );
        const rows = picks.map((r, idx) => ({
          room_id: roomRef.current.id,
          youtube_id: r.id,
          title: r.title,
          thumbnail_url: r.thumbnail,
          duration_seconds: r.durationSeconds,
          added_by: 'Auto-DJ',
          position: null,
          is_suggested: true,
          suggested_position: maxSugPos + idx + 1,
        }));
        // Single batch insert; Realtime row-insert propagates to all clients (incl. self).
        await supabase.from('queue_items').insert(rows);
      } catch (err) {
        console.error('Auto-suggest fetch failed:', err);
      } finally {
        fetchingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.current_song_index, room.auto_suggest, room.repeat, queue]);
}
```

- [ ] **Step 2: Wire the hook into RoomClient**

In `components/RoomClient.tsx`, add the import after the other hook imports (after line 22):
```typescript
import { useAutoSuggest } from './room/hooks/useAutoSuggest';
```
Invoke it just after the `usePlaybackSync(...)` call (after line 168):
```typescript
  // ── Auto-suggestion ───────────────────────────────────────────────────────
  useAutoSuggest({ room, queue, roomRef, queueRef, isSourceRef });
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/room/hooks/useAutoSuggest.ts components/RoomClient.tsx
git commit -m "feat(suggest): authority-gated fetch + batch insert of suggestions"
```

---

## Task 7: Suggested section rendering in the Queue list

Render a "✦ Suggested" divider before the first suggested item and tag suggested rows, without changing `current_song_index` math.

**Files:**
- Modify: `components/room/Queue.tsx` (inside the `queue.map(...)` render, lines 265-369)

- [ ] **Step 1: Render the divider + tag**

In `components/room/Queue.tsx`, inside the `queue.map((item, index) => {` callback, the block currently `return (<div key={item.id} id={...}> ... </div>);`. Wrap the returned row so a divider renders before the first suggested item.

Change the start of the callback body — after the existing `const isDragSrc = dragSrcIdx === index;` line (line 274), add:
```typescript
          const isSuggested = item.is_suggested;
          const showSuggestedDivider =
            room.auto_suggest && isSuggested && (index === 0 || !queue[index - 1].is_suggested);
```
Then change the `return (` (line 281) to return a fragment containing the optional divider plus the existing row. Replace:
```tsx
          return (
            <div
              key={item.id}
              id={`q-item-${index}`}
```
with:
```tsx
          return (
            <div key={item.id}>
              {showSuggestedDivider && (
                <div className="mono flex items-center gap-2" style={{ fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '.1em', padding: '10px 4px 6px' }}>
                  ✦ Suggested
                </div>
              )}
            <div
              id={`q-item-${index}`}
```
and update the matching closing of the row `</div>` (the one currently at line 367, the outer wrapper closing tag just before `);`) to close both the row and the new key wrapper:
```tsx
              </div>
            </div>
            </div>
          );
```
(The original outer `<div key={item.id} id=...>` became `<div id=...>`; the new outer `<div key={item.id}>` wraps it plus the divider, so one extra closing `</div>` is added.)

- [ ] **Step 2: Tag suggested rows in the meta line**

In the meta line (line 339), change:
```tsx
                    {isNow ? '▶ now playing · ' : isPlayed ? 'played · ' : ''}{item.added_by} · {fmt(item.duration_seconds)}
```
to:
```tsx
                    {isNow ? '▶ now playing · ' : isPlayed ? 'played · ' : ''}{isSuggested ? 'auto · ' : ''}{item.added_by} · {fmt(item.duration_seconds)}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Run the full test + lint sweep**

Run: `npm run test && npx tsc --noEmit && npm run lint`
Expected: all tests pass, no type errors, lint clean.

- [ ] **Step 5: Commit**

```bash
git add components/room/Queue.tsx
git commit -m "feat(suggest): render Suggested section divider and auto tag"
```

---

## Manual Verification (after all tasks)

Run the dev server (`npm run dev`) with the migration applied, and in a room as admin:

1. **Toggle visibility/RBAC:** As admin/mod the `[✦ auto]` button is clickable and turns accent-colored when on. As a dj/listener it is dimmed and does nothing.
2. **Buffer fill:** With 2-3 songs queued and auto-suggest on, play until the last regular song — within a few seconds 5 suggested songs appear under the "✦ Suggested" divider, tagged `auto`.
3. **Graduation:** Let the last regular song end. The first suggested song plays, and it moves out of the Suggested section into the regular queue tail (no longer tagged `auto`).
4. **Refill is batched, not per-song:** Watch the network tab — `/api/youtube/search` fires roughly once per ~4 songs (when the buffer drains to 1), not once per song.
5. **Repeat overrides:** Turn repeat on — no new suggestions fetched; queue loops as before.
6. **Manual add untouched:** Add a song manually while suggestions exist — it appends to the regular queue, suggested section unchanged.
7. **Multi-client:** Open a second browser as a non-authority listener — suggested rows appear there via Realtime without that client calling the search API.

---

## Self-Review

**Spec coverage:**
- Data model (3 columns, nullable position) → Task 1. ✓
- Queue-as-signal query building → Task 3. ✓
- Buffer strategy / batch fetch / quota → Task 6 (watermark refill, documented deviation). ✓
- Graduation via Postgres trigger → Task 1. ✓
- Toggle (RBAC, storage, broadcast, UI location) → Task 5. ✓
- Suggested section UI → Task 7. ✓
- Combined-array ordering / `current_song_index` semantics → Task 4. ✓
- Migration structure setup → Task 1. ✓
- Out of scope (configurable buffer, personalization, AI queries, reorder) → not implemented. ✓

**Deviations from spec (intentional, documented above):**
- `usePlayback` left unchanged (suggested items share the queue array; pause already only fires at true end).
- Literal `suggested.length < 5` replaced with `REFILL_AT = 1` watermark to avoid per-song quota burn while keeping batched top-ups to `BUFFER_SIZE = 5`.

**Type consistency:** `buildSuggestionQuery(titles: string[]): string`, `is_suggested: boolean`, `suggested_position: number | null`, `canAutoSuggest`, `onToggleAutoSuggest`, `auto_suggest`, broadcast event `auto_suggest_toggle`, constants `BUFFER_SIZE`/`REFILL_AT` — used consistently across all tasks.
