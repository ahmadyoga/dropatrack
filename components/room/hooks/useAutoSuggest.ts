import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { buildSuggestionQuery, normalizeTitle } from '@/lib/suggestionQuery';
import type { Room, QueueItem } from '@/lib/types';

const BUFFER_SIZE = 5;    // target number of suggested songs
const REFILL_AT = 1;      // refill (batched) once the buffer drains to this
const HISTORY_LIMIT = 40; // max unique titles sent to the AI (full taste + exclude list)

// Titles that signal compilations, DJ remixes, or non-song clips.
const JUNK_TITLE = /\b(dj|remix|nonstop|kumpulan|full album|compilation|megamix|mashup|mixtape|mix|playlist|jam session)\b/i;

type YtResult = { id: string; title: string; thumbnail: string; durationSeconds: number };

// Real tracks run ~1-10 min; compilations ("kumpulan lagu") run 20-120 min.
const isReasonable = (r: YtResult) =>
  r.durationSeconds >= 60 && r.durationSeconds <= 600 && !JUNK_TITLE.test(r.title);

async function ytSearch(query: string): Promise<YtResult[]> {
  try {
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return (data.results as YtResult[]) || [];
  } catch {
    return [];
  }
}

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
        const need = BUFFER_SIZE - suggested.length;
        const existingIds = new Set(q.map((i) => i.youtube_id));
        // Title-level dedup catches alternate uploads of a song we already have.
        const existingTitles = new Set(q.map((i) => normalizeTitle(i.title)));
        const isNew = (r: YtResult) =>
          !existingIds.has(r.id) && !existingTitles.has(normalizeTitle(r.title));

        // Full taste + exclude list: unique titles, recency-weighted, capped.
        // Dedup collapses repeated plays so the prompt stays short.
        const history: string[] = [];
        const seen = new Set<string>();
        for (let i = regular.length - 1; i >= 0 && history.length < HISTORY_LIMIT; i--) {
          const key = normalizeTitle(regular[i].title);
          if (key && !seen.has(key)) { seen.add(key); history.unshift(regular[i].title); }
        }

        let picks: YtResult[] = [];

        // 1. Ask the AI for similar songs, then resolve each to a YouTube video.
        try {
          const aiRes = await fetch('/api/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Ask for extras so the serial search loop has backups when a
            // candidate fails to resolve — the Gemini call is free; only the
            // YouTube searches (early-exited at `need`) cost quota.
            body: JSON.stringify({ titles: history, count: need + 3 }),
          });
          const aiData = await aiRes.json();
          const songs: Array<{ artist: string; title: string }> = aiData.songs || [];
          // Search one song at a time and stop as soon as the buffer is filled.
          // search.list costs 100 quota units each, so resolving 5 songs in
          // parallel burned ~500 units/batch and tripped YouTube's per-100s rate
          // limit (429). Serial + early-exit keeps it to ~need searches.
          for (const s of songs) {
            if (picks.length >= need) break;
            const results = await ytSearch(`${s.artist} ${s.title}`);
            const hit = results.find(
              (r) => isReasonable(r) && isNew(r) && !picks.some((p) => p.id === r.id)
            );
            if (hit) picks.push(hit);
          }
        } catch {
          /* fall through to the heuristic single-search */
        }

        // 2. Fallback: no AI key / no AI hits → one heuristic search.
        if (picks.length === 0) {
          const query = buildSuggestionQuery(regular.slice(-3).map((i) => i.title));
          if (query) {
            const results = await ytSearch(query);
            picks = results.filter((r) => isNew(r) && isReasonable(r)).slice(0, need);
            if (picks.length === 0) {
              picks = results
                .filter((r) => isNew(r) && !JUNK_TITLE.test(r.title))
                .slice(0, need);
            }
          }
        }

        if (picks.length === 0) return;

        const maxSugPos = suggested.reduce((m, i) => Math.max(m, i.suggested_position ?? 0), 0);
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
