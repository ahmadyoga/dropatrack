import { useState, useEffect, useCallback, useRef } from 'react';
import type { Room, QueueItem } from '@/lib/types';

// ── YT IFrame API types ──────────────────────────────────────────────
declare global {
  interface Window {
    YT: {
      Player: new (
        el: string | HTMLElement,
        config: {
          height?: string | number;
          width?: string | number;
          videoId?: string;
          playerVars?: Record<string, number | string>;
          events?: Record<string, (event: YTEvent) => void>;
        }
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTEvent {
  target: YTPlayer;
  data: number;
}

export interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  loadVideoById: (videoId: string) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getPlayerState: () => number;
  destroy: () => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
}

interface UseYouTubePlayerProps {
  room: Room;
  roomRef: React.RefObject<Room>;
  currentSong: QueueItem | null;
  isSpeakerRef: React.RefObject<boolean>;
  handleNextRef: React.RefObject<() => void>;
  isTransitioningRef: React.RefObject<boolean>;
  isLoadingVideoRef: React.RefObject<boolean>;
  playerRef: React.RefObject<YTPlayer | null>;
}

export function useYouTubePlayer({
  room,
  roomRef,
  currentSong,
  isSpeakerRef,
  handleNextRef,
  isTransitioningRef,
  isLoadingVideoRef,
  playerRef,
}: UseYouTubePlayerProps) {
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(room.current_playback_time || 0);
  const [duration, setDuration] = useState(0);
  const [showPlayerOverlay, setShowPlayerOverlay] = useState(true);

  const playerReadyRef = useRef(playerReady);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedVideoIdRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  useEffect(() => { playerReadyRef.current = playerReady; }, [playerReady]);

  // Restore speaker mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`dropatrack_speaker_${room.slug}`);
    if (saved !== null) setIsSpeaker(saved === 'true');
  }, [room.slug]);

  // Keep isSpeakerRef in sync
  useEffect(() => { isSpeakerRef.current = isSpeaker; }, [isSpeaker, isSpeakerRef]);

  // Auto-hide play overlay
  useEffect(() => {
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    if (room.is_playing) {
      overlayTimerRef.current = setTimeout(() => setShowPlayerOverlay(false), 2000);
    } else {
      setShowPlayerOverlay(true);
    }
    return () => { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); };
  }, [room.is_playing]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeaker((prev) => {
      const next = !prev;
      localStorage.setItem(`dropatrack_speaker_${room.slug}`, String(next));
      return next;
    });
  }, [room.slug]);

  // Silent audio keepalive — keeps AudioContext alive on mobile/iOS
  // but suspends when paused so the browser tab doesn't show a sound icon
  const startSilentAudio = useCallback(() => {
    if (audioContextRef.current) return;
    try {
      const AudioCtx = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      oscillatorRef.current = osc;
      const resumeOnce = () => {
        ctx.resume().catch(() => { /* ignore */ });
        document.removeEventListener('touchstart', resumeOnce);
        document.removeEventListener('click', resumeOnce);
      };
      document.addEventListener('touchstart', resumeOnce, { passive: true });
      document.addEventListener('click', resumeOnce, { passive: true });
    } catch { /* AudioContext not available */ }
  }, []);

  const stopSilentAudio = useCallback(() => {
    try {
      oscillatorRef.current?.stop();
      oscillatorRef.current = null;
      audioContextRef.current?.close();
      audioContextRef.current = null;
    } catch { /* ignore */ }
  }, []);

  // Start/stop the AudioContext with speaker mode
  useEffect(() => {
    if (isSpeaker) startSilentAudio();
    else stopSilentAudio();
    return () => { stopSilentAudio(); };
  }, [isSpeaker, startSilentAudio, stopSilentAudio]);

  // Suspend AudioContext when paused (removes tab sound icon),
  // resume it when playing (re-activates iOS keepalive)
  useEffect(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (room.is_playing) {
      ctx.resume().catch(() => { /* ignore */ });
    } else {
      ctx.suspend().catch(() => { /* ignore */ });
    }
  }, [room.is_playing]);

  // YouTube IFrame player lifecycle
  useEffect(() => {
    if (!isSpeaker) {
      if (playerRef.current && playerReady) {
        try { playerRef.current.pauseVideo(); playerRef.current.mute(); } catch { /* */ }
      }
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
      return;
    }

    // Already initialized — unmute and resume
    if (playerRef.current && playerReady) {
      try {
        playerRef.current.unMute();
        if (currentTime > 0) playerRef.current.seekTo(currentTime, true);
        if (room.is_playing) playerRef.current.playVideo();
      } catch { /* */ }
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = setInterval(() => {
        if (playerRef.current) {
          try {
            setCurrentTime(playerRef.current.getCurrentTime());
            setDuration(playerRef.current.getDuration());
          } catch { /* */ }
        }
      }, 500);
      return;
    }

    // Load API script
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const initPlayer = () => {
      if (playerRef.current) return;
      if (!currentSong) return;
      loadedVideoIdRef.current = currentSong.youtube_id;
      playerRef.current = new window.YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: currentSong.youtube_id,
        playerVars: {
          autoplay: roomRef.current.is_playing ? 1 : 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onStateChange: (event: YTEvent) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              if (isLoadingVideoRef.current) return;
              handleNextRef.current();
            }
          },
          onReady: () => {
            setPlayerReady(true);
            if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
            timeIntervalRef.current = setInterval(() => {
              if (playerRef.current) {
                try {
                  setCurrentTime(playerRef.current.getCurrentTime());
                  setDuration(playerRef.current.getDuration());
                } catch { /* */ }
              }
            }, 500);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) initPlayer();
    else window.onYouTubeIframeAPIReady = initPlayer;

    return () => { if (timeIntervalRef.current) clearInterval(timeIntervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaker, currentSong?.youtube_id]);

  // Load new video when song changes
  useEffect(() => {
    if (!playerRef.current || !playerReady || !currentSong || !isSpeaker) return;
    if (loadedVideoIdRef.current === currentSong.youtube_id) return;
    loadedVideoIdRef.current = currentSong.youtube_id;
    setCurrentTime(0);
    setDuration(0);
    isLoadingVideoRef.current = true;
    playerRef.current.loadVideoById(currentSong.youtube_id);
    setTimeout(() => { isLoadingVideoRef.current = false; }, 1500);
    setTimeout(() => { isTransitioningRef.current = false; }, 2000);
  }, [room.current_song_index, currentSong?.youtube_id, isSpeaker, playerReady, currentSong]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync player with is_playing
  useEffect(() => {
    if (!playerRef.current || !playerReady || !isSpeaker) return;
    try {
      if (room.is_playing) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    } catch { /* */ }
  }, [room.is_playing, isSpeaker, playerReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync player with volume
  useEffect(() => {
    if (!playerRef.current || !playerReady || !isSpeaker) return;
    try {
      playerRef.current.setVolume(room.volume);
      if (room.volume === 0) playerRef.current.mute();
      else playerRef.current.unMute();
    } catch { /* */ }
  }, [room.volume, isSpeaker, playerReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Page visibility recovery
  useEffect(() => {
    const onVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      isTransitioningRef.current = false;
      isLoadingVideoRef.current = false;
      if (audioContextRef.current && audioContextRef.current.state !== 'running') {
        audioContextRef.current.resume().catch(() => { /* ignore */ });
      }
      if (!isSpeakerRef.current || !playerRef.current || !playerReadyRef.current) return;
      try {
        const state = playerRef.current.getPlayerState();
        const latestRoom = roomRef.current;
        if (state === window.YT?.PlayerState?.ENDED) {
          handleNextRef.current();
        } else if (
          latestRoom.is_playing &&
          state !== window.YT?.PlayerState?.PLAYING &&
          state !== window.YT?.PlayerState?.BUFFERING
        ) {
          playerRef.current.playVideo();
        }
      } catch { /* */ }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isSpeaker,
    toggleSpeaker,
    playerReady,
    playerReadyRef,
    currentTime,
    setCurrentTime,
    duration,
    showPlayerOverlay,
    setShowPlayerOverlay,
    overlayTimerRef,
    loadedVideoIdRef,
  };
}
