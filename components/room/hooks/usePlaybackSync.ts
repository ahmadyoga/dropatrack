import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Room } from '@/lib/types';
import type { YTPlayer } from './useYouTubePlayer';
import { setTime as setStoreTime } from './playbackTimeStore';
import { computeExpected, type PlaybackAnchor } from '@/lib/playbackSync';

const DRIFT_THRESHOLD_SECONDS = 1.5;
const SOURCE_WRITE_INTERVAL_MS = 10_000;
const SYNC_TICK_MS = 500;

interface UsePlaybackSyncProps {
  room: Room;
  roomRef: React.RefObject<Room>;
  isSpeaker: boolean;
  playerRef: React.RefObject<YTPlayer | null>;
  playerReadyRef: React.RefObject<boolean>;
  isSourceRef: React.RefObject<boolean>;
  anchorRef: React.RefObject<PlaybackAnchor>;
}

export function usePlaybackSync({
  room,
  roomRef,
  isSpeaker,
  playerRef,
  playerReadyRef,
  isSourceRef,
  anchorRef,
}: UsePlaybackSyncProps) {
  // Update the anchor whenever the room's authoritative position changes.
  // performance.now() at receipt makes elapsed-time computation skew-safe.
  useEffect(() => {
    anchorRef.current = {
      base: room.current_playback_time || 0,
      receivedAt: performance.now(),
      isPlaying: room.is_playing,
    };
    // Snap the non-speaker display immediately on a fresh anchor.
    if (!isSpeaker) setStoreTime(computeExpected(anchorRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.playback_updated_at, room.current_playback_time, room.is_playing]);

  // Sync tick: advance the display (non-speakers) and drift-correct
  // non-source speakers toward the expected position.
  useEffect(() => {
    if (!room.is_playing) return;
    const interval = setInterval(() => {
      const expected = computeExpected(anchorRef.current);
      if (!isSpeaker) {
        setStoreTime(expected);
        return;
      }
      if (isSourceRef.current) return; // the source is the reference — never self-correct
      const player = playerRef.current;
      if (!player || !playerReadyRef.current) return;
      try {
        const actual = player.getCurrentTime();
        if (Math.abs(actual - expected) > DRIFT_THRESHOLD_SECONDS) {
          player.seekTo(expected, true);
        }
      } catch { /* */ }
    }, SYNC_TICK_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.is_playing, isSpeaker]);

  // Elected source: periodically refresh the anchor from its real player time,
  // correcting for buffering drift during long uninterrupted playback.
  useEffect(() => {
    if (!isSpeaker) return;
    const interval = setInterval(() => {
      if (!isSourceRef.current) return;
      if (!roomRef.current.is_playing) return;
      const player = playerRef.current;
      if (!player || !playerReadyRef.current) return;
      let t = 0;
      try { t = player.getCurrentTime(); } catch { return; }
      if (t <= 0) return;
      supabase.from('rooms').update({
        current_playback_time: t,
        playback_updated_at: new Date().toISOString(),
        is_playing: true,
      }).eq('id', roomRef.current.id).then();
    }, SOURCE_WRITE_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaker]);
}
