import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { buildSuggestionQuery } from '@/lib/suggestionQuery';
import type { Room, QueueItem } from '@/lib/types';

const BUFFER_SIZE = 5;   // target number of suggested songs
const REFILL_AT = 1;     // refill (batched) once the buffer drains to this
const SAMPLE_SIZE = 10;  // recent regular titles sent to the AI for taste context

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
        let picks: YtResult[] = [];

        // 1. Ask the AI for similar songs, then resolve each to a YouTube video.
        try {
          const aiRes = await fetch('/api/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titles: regular.slice(-SAMPLE_SIZE).map((i) => i.title), count: need }),
          });
          const aiData = await aiRes.json();
          const songs: Array<{ artist: string; title: string }> = aiData.songs || [];
          if (songs.length > 0) {
            const searches = await Promise.all(songs.map((s) => ytSearch(`${s.artist} ${s.title}`)));
            for (const results of searches) {
              const hit = results.find(
                (r) => isReasonable(r) && !existingIds.has(r.id) && !picks.some((p) => p.id === r.id)
              );
              if (hit) picks.push(hit);
              if (picks.length >= need) break;
            }
          }
        } catch {
          /* fall through to the heuristic single-search */
        }

        // 2. Fallback: no AI key / no AI hits → one heuristic search.
        if (picks.length === 0) {
          const query = buildSuggestionQuery(regular.slice(-3).map((i) => i.title));
          if (query) {
            const results = await ytSearch(query);
            picks = results.filter((r) => !existingIds.has(r.id) && isReasonable(r)).slice(0, need);
            if (picks.length === 0) {
              picks = results
                .filter((r) => !existingIds.has(r.id) && !JUNK_TITLE.test(r.title))
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
