import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/names';
import type { Room, QueueItem, PlaybackSyncEvent } from '@/lib/types';
import type { YTPlayer } from './useYouTubePlayer';
import type { RealtimeChannel } from '@supabase/supabase-js';

type CurrentUser = ReturnType<typeof getOrCreateUser>;

interface UsePlaybackProps {
  room: Room;
  roomRef: React.RefObject<Room>;
  queueRef: React.RefObject<QueueItem[]>;
  currentSong: QueueItem | null;
  isSpeaker: boolean;
  isSpeakerRef: React.RefObject<boolean>;
  playerRef: React.RefObject<YTPlayer | null>;
  playerReadyRef: React.RefObject<boolean>;
  channelRef: React.RefObject<RealtimeChannel | null>;
  currentUser: CurrentUser | null;
  isTransitioningRef: React.RefObject<boolean>;
  isLoadingVideoRef: React.RefObject<boolean>;
  handleNextRef: React.RefObject<() => void>;
  setRoom: React.Dispatch<React.SetStateAction<Room>>;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  queue: QueueItem[];
}

export function usePlayback({
  room,
  roomRef,
  queueRef,
  currentSong,
  isSpeaker,
  isSpeakerRef,
  playerRef,
  playerReadyRef,
  channelRef,
  currentUser,
  isTransitioningRef,
  isLoadingVideoRef,
  handleNextRef,
  setRoom,
  setCurrentTime,
  queue,
}: UsePlaybackProps) {
  const repeatRef = useRef(room.repeat);
  useEffect(() => { repeatRef.current = room.repeat; }, [room.repeat]);

  // Remote interpolation: smoothly increment currentTime for non-speakers
  useEffect(() => {
    if (isSpeaker) return;
    if (!room.is_playing) return;
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const songDuration = currentSong?.duration_seconds ?? 0;
        if (songDuration > 0 && prev >= songDuration) return prev;
        return prev + 0.5;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isSpeaker, room.is_playing, currentSong?.duration_seconds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remote: reset time when song changes
  useEffect(() => {
    if (isSpeaker) return;
    setCurrentTime(0);
  }, [room.current_song_index]); // eslint-disable-line react-hooks/exhaustive-deps

  const broadcastPlayback = useCallback(
    (type: PlaybackSyncEvent['type'], songIndex: number) => {
      if (!channelRef.current || !currentUser) return;
      let playbackTime = 0;
      if (playerRef.current && playerReadyRef.current) {
        try { playbackTime = playerRef.current.getCurrentTime(); } catch { /* */ }
      }
      const event: PlaybackSyncEvent = {
        type,
        song_index: songIndex,
        triggered_by: currentUser.user_id,
        current_time: type === 'next' || type === 'prev' || type === 'jump' ? 0 : playbackTime,
      };
      channelRef.current.send({ type: 'broadcast', event: 'playback_sync', payload: event });
      supabase.from('rooms').update({
        current_song_index: songIndex,
        is_playing: type !== 'pause',
        current_playback_time: event.current_time,
      }).eq('id', roomRef.current.id).then();
    },
    [currentUser, playerRef, playerReadyRef, channelRef, roomRef]
  );

  const handlePlayPause = useCallback(() => {
    const newPlaying = !room.is_playing;
    setRoom((prev) => ({ ...prev, is_playing: newPlaying }));
    broadcastPlayback(newPlaying ? 'play' : 'pause', room.current_song_index);
  }, [room.is_playing, room.current_song_index, broadcastPlayback, setRoom]);

  const handleNext = useCallback(() => {
    const currentIdx = roomRef.current.current_song_index;
    const queueLen = queueRef.current.length;
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    let nextIndex: number;
    if (currentIdx >= queueLen - 1) {
      if (repeatRef.current && queueLen > 0) {
        nextIndex = 0;
      } else {
        // End of playlist — broadcast pause to all clients
        isTransitioningRef.current = false;
        setRoom((prev) => ({ ...prev, is_playing: false }));
        broadcastPlayback('pause', currentIdx);
        return;
      }
    } else {
      nextIndex = currentIdx + 1;
    }
    setRoom((prev) => ({ ...prev, current_song_index: nextIndex, is_playing: true }));
    broadcastPlayback('next', nextIndex);
  }, [broadcastPlayback, roomRef, queueRef, isTransitioningRef, setRoom]);

  // Keep handleNextRef in sync for YouTube onStateChange
  useEffect(() => { handleNextRef.current = handleNext; }, [handleNext, handleNextRef]);

  const handlePrev = useCallback(() => {
    isTransitioningRef.current = false;
    isLoadingVideoRef.current = false;
    const prevIndex = Math.max(room.current_song_index - 1, 0);
    setRoom((prev) => ({ ...prev, current_song_index: prevIndex, is_playing: true }));
    broadcastPlayback('prev', prevIndex);
  }, [room.current_song_index, broadcastPlayback, isTransitioningRef, isLoadingVideoRef, setRoom]);

  const handleJumpTo = useCallback(
    (index: number) => {
      isTransitioningRef.current = false;
      isLoadingVideoRef.current = false;
      setRoom((prev) => ({ ...prev, current_song_index: index, is_playing: true }));
      broadcastPlayback('jump', index);
    },
    [broadcastPlayback, isTransitioningRef, isLoadingVideoRef, setRoom]
  );

  // OS MediaSession handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => {
      isTransitioningRef.current = false;
      isLoadingVideoRef.current = false;
      handlePlayPause();
    });
    navigator.mediaSession.setActionHandler('pause', handlePlayPause);
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      isTransitioningRef.current = false;
      isLoadingVideoRef.current = false;
      handlePrev();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      isTransitioningRef.current = false;
      isLoadingVideoRef.current = false;
      handleNext();
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && playerRef.current && playerReadyRef.current) {
        try {
          playerRef.current.seekTo(details.seekTime, true);
          setCurrentTime(details.seekTime);
          channelRef.current?.send({
            type: 'broadcast',
            event: 'time_sync',
            payload: { time: details.seekTime },
          });
        } catch { /* ignore */ }
      }
    });
    navigator.mediaSession.playbackState = room.is_playing ? 'playing' : 'paused';
    const song = queue[room.current_song_index];
    if (song) {
      const thumb = song.thumbnail_url || '';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: 'DropATrack',
        album: 'Room',
        artwork: [
          { src: thumb, sizes: '96x96', type: 'image/jpeg' },
          { src: thumb, sizes: '128x128', type: 'image/jpeg' },
          { src: thumb, sizes: '192x192', type: 'image/jpeg' },
          { src: thumb, sizes: '256x256', type: 'image/jpeg' },
          { src: thumb, sizes: '384x384', type: 'image/jpeg' },
          { src: thumb, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    }
  }, [handlePlayPause, handleNext, handlePrev, queue, room.current_song_index, room.is_playing]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    broadcastPlayback,
    handlePlayPause,
    handleNext,
    handlePrev,
    handleJumpTo,
    repeatRef,
  };
}
