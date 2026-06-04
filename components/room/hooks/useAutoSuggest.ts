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
