import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { QueueItem, Room, RoomUser, PlaybackSyncEvent } from '@/lib/types';
import { electTimeSource } from '@/lib/playbackSync';
import {
  classifyYouTubeError, nextPlayableIndex, shouldRequestSkip, unplayableReason,
  SKIP_COUNTDOWN_MS,
} from '@/lib/unplayable';

export interface UnplayableNotice {
  kind: 'skipping' | 'none-left';
  title: string;
  reason: string;
  /** Whole seconds left on the countdown (skipping only). */
  secondsLeft: number;
}

interface Pending {
  songId: string;
  title: string;
  reason: string;
  startedAt: number; // performance.now() when this device learned of it (skew-free)
}

interface Props {
  room: Room;
  queue: QueueItem[];
  users: RoomUser[];
  myId: string | undefined;
  isSpeaker: boolean;
  broadcast: (event: string, payload: Record<string, unknown>) => void;
  setRoom: React.Dispatch<React.SetStateAction<Room>>;
}

/**
 * Skips tracks YouTube refuses to play (removed, private, embedding blocked):
 * one device detects it and tells the room, everyone sees a 3 s countdown, then
 * the elected speaker asks the server to advance. The server call is
 * compare-and-set, so duplicate or late requests never double-skip.
 */
export function useUnplayableSkip({ room, queue, users, myId, isSpeaker, broadcast, setRoom }: Props) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [noneLeft, setNoneLeft] = useState<{ title: string; songId: string; queueLength: number } | null>(null);
  const [now, setNow] = useState(0);

  // Known-bad queue item ids, shared by broadcast; the server skips over them too.
  const unplayableIdsRef = useRef<Set<string>>(new Set());
  // "songId:queueLength" we already asked about: one request per song per device,
  // retried only if the queue changed (e.g. someone added a song while we were stuck).
  const requestedRef = useRef<string | null>(null);

  const live = useRef({ room, queue, users, myId, isSpeaker });
  useEffect(() => { live.current = { room, queue, users, myId, isSpeaker }; });

  const currentSong = queue[room.current_song_index] ?? null;
  const currentId = currentSong?.id ?? null;

  const codeRef = useRef<Record<string, number>>({});
  const markUnplayable = useCallback((songId: string, code: number) => {
    codeRef.current[songId] = code;
    const { queue: q, room: r } = live.current;
    const song = q[r.current_song_index];
    // Stale report (the room already moved on), or already counting down: ignore.
    if (!song || song.id !== songId) return;
    unplayableIdsRef.current.add(songId);
    // Same song reported again by another device: keep the running countdown.
    // (A repeat-mode lap minutes later starts a fresh one.)
    setPending((prev) => (prev?.songId === songId && performance.now() - prev.startedAt < 15_000 ? prev : {
      songId, title: song.title, reason: unplayableReason(code), startedAt: performance.now(),
    }));
  }, []);

  /** Called by the YouTube player's onError on a speaker device. */
  const reportPlayerError = useCallback((code: number, youtubeId: string | null) => {
    const kind = classifyYouTubeError(code, typeof navigator === 'undefined' ? true : navigator.onLine);
    if (kind === 'transient') {
      console.warn(`[DropATrack] YouTube error ${code} treated as temporary; not skipping.`);
      return;
    }
    const { queue: q, room: r } = live.current;
    const song = q[r.current_song_index];
    // The error must belong to the song the room is on, not a previous load.
    if (!song || (youtubeId && song.youtube_id !== youtubeId)) return;
    markUnplayable(song.id, code);
    broadcast('track_unplayable', { song_id: song.id, code });
  }, [broadcast, markUnplayable]);

  /** Called for the 'track_unplayable' broadcast from another participant. */
  const onTrackUnplayable = useCallback((payload: Record<string, unknown>) => {
    if (typeof payload.song_id !== 'string' || typeof payload.code !== 'number') return;
    markUnplayable(payload.song_id, payload.code);
  }, [markUnplayable]);

  // Pending and "none left" are only meaningful while the room is still on that
  // song (and, for "none left", until someone adds another one). Derived, not
  // cleared by effects: a skip, a manual jump or a new song makes them lapse.
  const activePending = pending && pending.songId === currentId ? pending : null;
  const activeNoneLeft = noneLeft && noneLeft.songId === currentId && noneLeft.queueLength === queue.length ? noneLeft : null;

  const requestSkip = useCallback(async (songId: string) => {
    const { room: r, queue: q, myId: me } = live.current;
    const key = `${songId}:${q.length}`;
    if (requestedRef.current === key) return;
    requestedRef.current = key;
    const skipIds = [...unplayableIdsRef.current];

    let result: number;
    const { data, error } = await supabase.rpc('skip_unplayable_song', {
      p_room_id: r.id, p_song_id: songId, p_skip_ids: skipIds,
    });
    if (!error && typeof data === 'number') {
      result = data;
    } else {
      // ponytail: fallback until migration 20261102000001 is applied. Not atomic
      // like the RPC, but only the elected device runs it and it re-checks the
      // room row first, which covers the realistic races.
      console.warn('[DropATrack] skip_unplayable_song unavailable, using fallback:', error?.message);
      const { data: fresh } = await supabase.from('rooms').select('current_song_index, repeat').eq('id', r.id).single();
      if (!fresh || q[fresh.current_song_index]?.id !== songId) return; // someone already moved on
      const next = nextPlayableIndex(q.map((s) => s.id), fresh.current_song_index, new Set(skipIds), !!fresh.repeat);
      if (next === null) {
        await supabase.from('rooms').update({ is_playing: false, current_playback_time: 0, playback_updated_at: new Date().toISOString() }).eq('id', r.id);
        result = -2;
      } else {
        const { data: resolved } = await supabase.rpc('play_song_at', { p_room_id: r.id, p_index: next, p_is_playing: true, p_current_time: 0 });
        result = typeof resolved === 'number' ? resolved : next;
      }
    }

    if (result === -1) return; // stale: the room already moved; realtime brings us along
    if (result === -2) {
      setRoom((prev) => ({ ...prev, is_playing: false }));
      broadcast('playback_sync', { type: 'pause', song_index: r.current_song_index, triggered_by: me ?? '', current_time: 0 } satisfies PlaybackSyncEvent as unknown as Record<string, unknown>);
      return;
    }
    // Fast path for everyone else; the rooms realtime update confirms it.
    setRoom((prev) => ({ ...prev, current_song_index: result, is_playing: true }));
    broadcast('playback_sync', { type: 'next', song_index: result, triggered_by: me ?? '', current_time: 0 } satisfies PlaybackSyncEvent as unknown as Record<string, unknown>);
  }, [broadcast, setRoom]);

  // Countdown: tick for the UI, and decide whether this device makes the call.
  useEffect(() => {
    if (!activePending) return;
    const pending = activePending;
    const tick = () => {
      const t = performance.now();
      setNow(t);
      const { users: u, myId: me, isSpeaker: speaker, room: r, queue: q } = live.current;
      const elapsed = t - pending.startedAt;
      // Late joiners missed the first broadcast: the elected device repeats it
      // about once a second during the countdown (receivers de-duplicate).
      if (elapsed < SKIP_COUNTDOWN_MS) {
        const lastSecond = Math.floor((t - 250 - pending.startedAt) / 1000);
        if (Math.floor(elapsed / 1000) !== lastSecond && electTimeSource(u) === me) {
          broadcast('track_unplayable', { song_id: pending.songId, code: codeRef.current[pending.songId] ?? 150 });
        }
        return;
      }

      // Nothing else to play? Say so instead of looping on a dead track.
      const next = nextPlayableIndex(q.map((s) => s.id), r.current_song_index, unplayableIdsRef.current, !!r.repeat);
      if (next === null) setNoneLeft({ title: pending.title, songId: pending.songId, queueLength: q.length });

      if (shouldRequestSkip({ myId: me, users: u, isSpeaker: speaker, elapsedMs: elapsed })) {
        void requestSkip(pending.songId);
      }
    };
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 250);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [activePending, requestSkip, queue.length, broadcast]);

  let notice: UnplayableNotice | null = null;
  if (activeNoneLeft) {
    notice = { kind: 'none-left', title: activeNoneLeft.title, reason: '', secondsLeft: 0 };
  } else if (activePending) {
    const elapsed = Math.max(0, now - activePending.startedAt);
    const left = Math.max(0, Math.ceil((SKIP_COUNTDOWN_MS - elapsed) / 1000));
    notice = { kind: 'skipping', title: activePending.title, reason: activePending.reason, secondsLeft: left };
  }

  return { notice, reportPlayerError, onTrackUnplayable };
}
