'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/names';
import { formatDuration, extractYouTubeId } from '@/lib/youtube';
import { useAntiDebug } from '@/lib/antiDebug';
import type { Room, QueueItem, RoomUser, UserRole, PlaybackSyncEvent } from '@/lib/types';

// ─── YouTube IFrame API types ────────────────────────────────────────
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

interface YTPlayer {
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

// ─── Props ───────────────────────────────────────────────────────────
interface RoomClientProps {
  initialRoom: Room;
  initialQueue: QueueItem[];
}

// ─── Tabs ────────────────────────────────────────────────────────────
type TabType = 'youtube' | 'users';

export default function RoomClient({ initialRoom, initialQueue }: RoomClientProps) {
  useAntiDebug();

  // ─── State ──────────────────────────────────────────────────────────
  const [room, setRoom] = useState<Room>(initialRoom);
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [activeTab, setActiveTab] = useState<TabType>('youtube');
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getOrCreateUser> | null>(null);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: string; title: string; thumbnail: string; channelTitle: string;
    duration: string; durationSeconds: number;
  }>>([]);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [addingUrl, setAddingUrl] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialRoom.current_playback_time || 0);
  const [duration, setDuration] = useState(0);
  const [myRole, setMyRole] = useState<UserRole>('listener');
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);
  const [showExtensionPopup, setShowExtensionPopup] = useState(false);

  const playerRef = useRef<YTPlayer | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const loadedVideoIdRef = useRef<string | null>(null);
  const handleNextRef = useRef<() => void>(() => { });
  const roomRef = useRef(initialRoom);
  const queueRef = useRef(initialQueue);

  const currentSong = queue[room.current_song_index] || null;

  // Keep refs in sync with state
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  // ─── Initialize user identity ───────────────────────────────────────
  useEffect(() => {
    const user = getOrCreateUser();
    setCurrentUser(user);

    // Show extension install popup for new users
    if (user?.isNew) {
      setShowExtensionPopup(true);
    }

    // Restore speaker mode from localStorage
    const savedSpeaker = localStorage.getItem(`dropatrack_speaker_${initialRoom.slug}`);
    if (savedSpeaker !== null) {
      setIsSpeaker(savedSpeaker === 'true');
    }

    // Check if user is creator → admin
    if (user && initialRoom.created_by === user.username) {
      setMyRole('admin');
    } else {
      setMyRole('dj'); // Default: everyone can add & skip
    }
  }, [initialRoom.slug, initialRoom.created_by]);

  // ─── Toggle speaker ─────────────────────────────────────────────────
  const toggleSpeaker = useCallback(() => {
    setIsSpeaker((prev) => {
      const next = !prev;
      localStorage.setItem(`dropatrack_speaker_${room.slug}`, String(next));
      return next;
    });
  }, [room.slug]);

  // ─── YouTube IFrame API ─────────────────────────────────────────────
  useEffect(() => {
    if (!isSpeaker) {
      // Pause and mute player instead of destroying (avoids DOM conflicts)
      if (playerRef.current && playerReady) {
        try {
          playerRef.current.pauseVideo();
          playerRef.current.mute();
        } catch {
          // Player might not be ready
        }
      }
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
      return;
    }

    // If player exists but was muted (toggled back to speaker), unmute and resume
    if (playerRef.current && playerReady) {
      try {
        playerRef.current.unMute();
        // Seek to synced time from other speakers
        if (currentTime > 0) {
          playerRef.current.seekTo(currentTime, true);
        }
        if (room.is_playing) {
          playerRef.current.playVideo();
        }
      } catch {
        // Player might not be ready
      }
      // Restart time tracking
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = setInterval(() => {
        if (playerRef.current) {
          try {
            setCurrentTime(playerRef.current.getCurrentTime());
            setDuration(playerRef.current.getDuration());
          } catch {
            // Player might be destroyed
          }
        }
      }, 500);
      return;
    }

    // Load YouTube IFrame API
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const initPlayer = () => {
      if (playerRef.current) return;
      if (!currentSong) return;

      // Track the video ID so the song-change effect knows what's already loaded
      loadedVideoIdRef.current = currentSong.youtube_id;

      playerRef.current = new window.YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: currentSong.youtube_id,
        playerVars: {
          autoplay: room.is_playing ? 1 : 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onStateChange: (event: YTEvent) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              handleNextRef.current();
            }
          },
          onReady: () => {
            setPlayerReady(true);
            // Start time tracking
            if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
            timeIntervalRef.current = setInterval(() => {
              if (playerRef.current) {
                try {
                  setCurrentTime(playerRef.current.getCurrentTime());
                  setDuration(playerRef.current.getDuration());
                } catch {
                  // Player might be destroyed
                }
              }
            }, 500);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaker, currentSong?.youtube_id]);

  // ─── Load new video when song changes ──────────────────────────────
  useEffect(() => {
    if (!playerRef.current || !playerReady || !currentSong || !isSpeaker) return;
    // Only reload if the video ID actually changed (prevents restart on queue re-fetch)
    if (loadedVideoIdRef.current === currentSong.youtube_id) return;
    loadedVideoIdRef.current = currentSong.youtube_id;
    setCurrentTime(0);
    setDuration(0);
    playerRef.current.loadVideoById(currentSong.youtube_id);
  }, [room.current_song_index, currentSong?.youtube_id, isSpeaker, playerReady]);

  // ─── Supabase Realtime Channel ──────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel(`room:${room.slug}`, {
      config: { presence: { key: currentUser.user_id } },
    });

    // Broadcast: playback sync
    channel.on('broadcast', { event: 'playback_sync' }, ({ payload }) => {
      const event = payload as PlaybackSyncEvent;
      if (event.triggered_by === currentUser.user_id) return; // Ignore own events

      setRoom((prev) => ({
        ...prev,
        current_song_index: event.song_index,
        is_playing: event.type === 'play' || event.type === 'next' || event.type === 'prev' || event.type === 'jump',
      }));
      // Sync playback time from the broadcasting device
      if (event.current_time !== undefined) {
        setCurrentTime(event.current_time);
      }
      // Player control is handled by the is_playing sync effect below
    });

    // Broadcast: song added to queue
    channel.on('broadcast', { event: 'queue_update' }, ({ payload }) => {
      if (payload.type === 'added') {
        setQueue((prev) => [...prev, payload.item as QueueItem]);
      } else if (payload.type === 'removed') {
        setQueue((prev) => prev.filter((item) => item.id !== payload.item_id));
      }
    });

    // Broadcast: volume change
    channel.on('broadcast', { event: 'volume_change' }, ({ payload }) => {
      setRoom((prev) => ({ ...prev, volume: payload.volume }));
    });

    // Presence: track users
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const roomUsers: RoomUser[] = [];
        for (const key in state) {
          const presences = state[key] as unknown as RoomUser[];
          if (presences.length > 0) {
            roomUsers.push(presences[0]);
          }
        }
        setUsers(roomUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.user_id,
            username: currentUser.username,
            avatar_color: currentUser.avatar_color,
            role: myRole,
            is_speaker: isSpeaker,
            joined_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    // Listen for DB changes on rooms table
    const roomSub = supabase
      .channel(`room-db:${room.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          setRoom((prev) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    // Listen for DB changes on queue_items table
    const queueSub = supabase
      .channel(`queue-db:${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_items', filter: `room_id=eq.${room.id}` },
        async () => {
          // Re-fetch full queue on any change
          const { data } = await supabase
            .from('queue_items')
            .select('*')
            .eq('room_id', room.id)
            .order('position', { ascending: true });
          if (data) setQueue(data);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      roomSub.unsubscribe();
      queueSub.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, room.slug, room.id, myRole]);

  // ─── Update presence when speaker changes ──────────────────────────
  useEffect(() => {
    if (!channelRef.current || !currentUser) return;
    channelRef.current.track({
      user_id: currentUser.user_id,
      username: currentUser.username,
      avatar_color: currentUser.avatar_color,
      role: myRole,
      is_speaker: isSpeaker,
      joined_at: new Date().toISOString(),
    });
  }, [isSpeaker, currentUser, myRole]);

  // ─── Room heartbeat (keeps room alive, prevents auto-delete) ───────
  useEffect(() => {
    const ping = () => {
      let playbackTime = 0;
      if (playerRef.current && playerReady && isSpeaker) {
        try { playbackTime = playerRef.current.getCurrentTime(); } catch { /* */ }
      }
      const update: Record<string, unknown> = { last_active_at: new Date().toISOString() };
      if (isSpeaker && playbackTime > 0) {
        update.current_playback_time = playbackTime;
      }
      supabase
        .from('rooms')
        .update(update)
        .eq('id', room.id)
        .then();
    };

    // Ping immediately on join
    ping();

    // Then every 60 seconds
    const interval = setInterval(ping, 60_000);
    return () => clearInterval(interval);
  }, [room.id]);

  // ─── Playback controls ─────────────────────────────────────────────
  const broadcastPlayback = useCallback(
    (type: PlaybackSyncEvent['type'], songIndex: number) => {
      if (!channelRef.current || !currentUser) return;

      // Include current playback time for cross-device sync
      let playbackTime = 0;
      if (playerRef.current && playerReady) {
        try { playbackTime = playerRef.current.getCurrentTime(); } catch { /* */ }
      }

      const event: PlaybackSyncEvent = {
        type,
        song_index: songIndex,
        triggered_by: currentUser.user_id,
        current_time: type === 'next' || type === 'prev' || type === 'jump' ? 0 : playbackTime,
      };

      channelRef.current.send({
        type: 'broadcast',
        event: 'playback_sync',
        payload: event,
      });

      // Update DB
      supabase
        .from('rooms')
        .update({
          current_song_index: songIndex,
          is_playing: type !== 'pause',
          current_playback_time: type === 'next' || type === 'prev' || type === 'jump' ? 0 : playbackTime,
        })
        .eq('id', room.id)
        .then();
    },
    [currentUser, room.id]
  );

  const handlePlayPause = useCallback(() => {
    const newPlaying = !room.is_playing;
    setRoom((prev) => ({ ...prev, is_playing: newPlaying }));
    broadcastPlayback(newPlaying ? 'play' : 'pause', room.current_song_index);
  }, [room.is_playing, room.current_song_index, broadcastPlayback]);

  // ─── Sync player with is_playing state ─────────────────────────────
  useEffect(() => {
    if (!playerRef.current || !playerReady || !isSpeaker) return;
    try {
      if (room.is_playing) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch {
      // Player might not be ready
    }
  }, [room.is_playing, isSpeaker, playerReady]);

  // ─── Sync player with volume state ──────────────────────────────────
  useEffect(() => {
    if (!playerRef.current || !playerReady || !isSpeaker) return;
    try {
      playerRef.current.setVolume(room.volume);
      if (room.volume === 0) playerRef.current.mute();
      else playerRef.current.unMute();
    } catch {
      // Player might not be ready
    }
  }, [room.volume, isSpeaker, playerReady]);

  const handleNext = useCallback(() => {
    // Use refs to always read the latest state (avoids stale closure from YouTube callback)
    const currentIdx = roomRef.current.current_song_index;
    const queueLen = queueRef.current.length;
    const nextIndex = Math.min(currentIdx + 1, queueLen - 1);
    if (nextIndex === currentIdx && queueLen > 0) return;
    setRoom((prev) => ({ ...prev, current_song_index: nextIndex, is_playing: true }));
    broadcastPlayback('next', nextIndex);
  }, [broadcastPlayback]);

  // Keep ref in sync so YouTube onStateChange always calls the latest version
  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  const handlePrev = useCallback(() => {
    const prevIndex = Math.max(room.current_song_index - 1, 0);
    setRoom((prev) => ({ ...prev, current_song_index: prevIndex, is_playing: true }));
    broadcastPlayback('prev', prevIndex);
  }, [room.current_song_index, broadcastPlayback]);

  const handleJumpTo = useCallback(
    (index: number) => {
      setRoom((prev) => ({ ...prev, current_song_index: index, is_playing: true }));
      broadcastPlayback('jump', index);
    },
    [broadcastPlayback]
  );

  // ─── Search YouTube ─────────────────────────────────────────────────
  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;

      // Check if it's a YouTube URL
      const videoId = extractYouTubeId(searchQuery);
      if (videoId) {
        await addSongByVideoId(videoId);
        return;
      }

      setSearching(true);
      setNextPageToken(null);
      try {
        const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.results) {
          setSearchResults(data.results);
          setNextPageToken(data.nextPageToken || null);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchQuery]
  );

  const handleLoadMore = useCallback(async () => {
    if (!nextPageToken || loadingMore || !searchQuery.trim()) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(searchQuery)}&pageToken=${encodeURIComponent(nextPageToken)}`
      );
      const data = await res.json();
      if (data.results) {
        setSearchResults((prev) => [...prev, ...data.results]);
        setNextPageToken(data.nextPageToken || null);
      }
    } catch (err) {
      console.error('Load more failed:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [nextPageToken, loadingMore, searchQuery]);

  // ─── Add song to queue ──────────────────────────────────────────────
  const addSongByVideoId = async (videoId: string) => {
    if (!currentUser) return;
    setAddingUrl(true);

    try {
      // Fetch video details via our API
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(videoId)}`);
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        const video = data.results[0];
        await addSongToQueue(video.id, video.title, video.thumbnail, video.durationSeconds);
      }
    } catch (err) {
      console.error('Failed to add song:', err);
    } finally {
      setAddingUrl(false);
    }
  };

  const addSongToQueue = async (
    youtubeId: string,
    title: string,
    thumbnail: string,
    durationSeconds: number
  ) => {
    if (!currentUser) return;

    const newPosition = queue.length;
    const newItem: Partial<QueueItem> = {
      room_id: room.id,
      youtube_id: youtubeId,
      title,
      thumbnail_url: thumbnail,
      duration_seconds: durationSeconds,
      added_by: currentUser.username,
      position: newPosition,
    };

    const { data, error } = await supabase
      .from('queue_items')
      .insert(newItem)
      .select()
      .single();

    if (!error && data) {
      setQueue((prev) => [...prev, data]);

      // Broadcast queue update
      channelRef.current?.send({
        type: 'broadcast',
        event: 'queue_update',
        payload: { type: 'added', item: data },
      });

      // If this is the first song, start playing
      if (queue.length === 0) {
        setRoom((prev) => ({ ...prev, is_playing: true, current_song_index: 0 }));
        broadcastPlayback('play', 0);
      }
      // Don't clear search results — user may want to add multiple songs from the same search
    }
  };

  const removeSong = async (item: QueueItem) => {
    await supabase.from('queue_items').delete().eq('id', item.id);
    setQueue((prev) => prev.filter((q) => q.id !== item.id));

    channelRef.current?.send({
      type: 'broadcast',
      event: 'queue_update',
      payload: { type: 'removed', item_id: item.id },
    });
  };

  // ─── Shuffle upcoming songs (server-side) ────────────────────────────
  const [shuffling, setShuffling] = useState(false);
  const handleShuffle = useCallback(async () => {
    if (queue.length <= 2 || shuffling) return;
    setShuffling(true);
    try {
      await fetch('/api/queue/shuffle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: room.id,
          current_song_index: room.current_song_index,
        }),
      });
      // Don't update local state — the Supabase realtime listener
      // on queue_items will automatically re-fetch the new order
    } catch (err) {
      console.error('Shuffle failed:', err);
    } finally {
      setShuffling(false);
    }
  }, [queue.length, room.id, room.current_song_index, shuffling]);

  // ─── Drag & Drop reorder ────────────────────────────────────────────
  const handleDragStart = useCallback((index: number) => {
    dragItemRef.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(async (dropIndex: number) => {
    const dragIndex = dragItemRef.current;
    setDragOverIndex(null);
    dragItemRef.current = null;

    if (dragIndex === null || dragIndex === dropIndex) return;

    const newQueue = [...queue];
    const [draggedItem] = newQueue.splice(dragIndex, 1);
    newQueue.splice(dropIndex, 0, draggedItem);

    // Update current_song_index if needed
    let newSongIndex = room.current_song_index;
    if (dragIndex === room.current_song_index) {
      newSongIndex = dropIndex;
    } else if (dragIndex < room.current_song_index && dropIndex >= room.current_song_index) {
      newSongIndex = room.current_song_index - 1;
    } else if (dragIndex > room.current_song_index && dropIndex <= room.current_song_index) {
      newSongIndex = room.current_song_index + 1;
    }

    const reordered = newQueue.map((item, idx) => ({ ...item, position: idx }));
    setQueue(reordered);
    setRoom((prev) => ({ ...prev, current_song_index: newSongIndex }));

    // Update positions in DB
    const updates = reordered.map((item) => ({
      id: item.id,
      room_id: item.room_id,
      youtube_id: item.youtube_id,
      title: item.title,
      thumbnail_url: item.thumbnail_url,
      duration_seconds: item.duration_seconds,
      added_by: item.added_by,
      position: item.position,
      played: item.played,
    }));
    await supabase.from('queue_items').upsert(updates);

    // Update room index if changed
    if (newSongIndex !== room.current_song_index) {
      await supabase.from('rooms').update({ current_song_index: newSongIndex }).eq('id', room.id);
    }

    channelRef.current?.send({
      type: 'broadcast',
      event: 'queue_update',
      payload: { type: 'reordered' },
    });
  }, [queue, room.current_song_index, room.id]);

  // ─── Helpers ────────────────────────────────────────────────────────
  const queuedVideoIds = new Set(queue.map((q) => q.youtube_id));

  // ─── Progress bar ───────────────────────────────────────────────────
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const totalQueueDuration = queue.reduce((sum, item) => sum + item.duration_seconds, 0);

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 glass-subtle mx-3 mt-3 rounded-2xl flex-shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="text-xl font-black tracking-tight no-underline" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}>
            Drop<span style={{ color: 'var(--green-primary)' }}>A</span>Track
          </a>
          <span className="text-sm font-medium px-3 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--green-primary)' }}>
            /{room.slug}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {users.length} {users.length === 1 ? 'listener' : 'listeners'}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row gap-3 p-3 min-h-0">
        {/* Left Panel: Now Playing + Queue */}
        <div className="md:w-1/2 lg:w-3/5 flex flex-col gap-3 min-h-0">
          {/* Now Playing Card */}
          <div className="glass p-5 animate-fade-in">
            <div className="flex gap-4">
              {/* Video / Thumbnail */}
              <div className="w-48 h-28 md:w-64 md:h-36 rounded-xl overflow-hidden bg-black flex-shrink-0 relative" ref={playerContainerRef}>
                {/* Always render the player div — YouTube replaces it with an iframe, so removing it from DOM causes errors */}
                <div id="yt-player" className="w-full h-full" style={{ display: isSpeaker && currentSong ? 'block' : 'none' }} />
                {/* Show thumbnail when not speaker or no player */}
                {(!isSpeaker || !playerReady) && currentSong && (
                  <img
                    src={currentSong.thumbnail_url || `https://img.youtube.com/vi/${currentSong.youtube_id}/mqdefault.jpg`}
                    alt={currentSong.title}
                    className="w-full h-full object-cover absolute inset-0"
                  />
                )}
                {!currentSong && (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white/40 text-sm">No track</span>
                  </div>
                )}
                {!isSpeaker && currentSong && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white/80 text-xs font-medium px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.5)' }}>
                      🔇 Remote Mode
                    </span>
                  </div>
                )}
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                {currentSong ? (
                  <>
                    <h2 className="font-bold text-base md:text-lg leading-snug line-clamp-2 mb-1">
                      {currentSong.title}
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Added by <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{currentSong.added_by}</span>
                    </p>
                    {isSpeaker && (
                      <p className="text-xs mt-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                        {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
                      </p>
                    )}
                  </>
                ) : (
                  <div>
                    <h2 className="font-bold text-lg" style={{ color: 'var(--text-muted)' }}>
                      No track playing
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Search for a song to get started
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Queue List */}
          <div className="glass p-4 flex-1 overflow-y-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>
                Queue
              </h3>
              <div className="flex items-center gap-2">
                {queue.length > 2 && (
                  <button
                    onClick={handleShuffle}
                    disabled={shuffling}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:bg-green-50 ${shuffling ? 'opacity-50' : ''}`}
                    style={{ color: 'var(--green-primary)', border: '1px solid rgba(34,197,94,0.2)' }}
                    title="Shuffle upcoming songs"
                  >
                    {shuffling ? (
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 3 21 3 21 8" />
                        <line x1="4" y1="20" x2="21" y2="3" />
                        <polyline points="21 16 21 21 16 21" />
                        <line x1="15" y1="15" x2="21" y2="21" />
                        <line x1="4" y1="4" x2="9" y2="9" />
                      </svg>
                    )}
                    {shuffling ? 'Shuffling...' : 'Shuffle'}
                  </button>
                )}
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {queue.length} songs · {formatDuration(totalQueueDuration)}
                </span>
              </div>
            </div>

            {queue.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">🎵</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Queue is empty. Add some tracks!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {queue.map((item, index) => (
                  <div
                    key={item.id}
                    className={`queue-item group ${index === room.current_song_index ? 'active' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                    onClick={() => handleJumpTo(index)}
                    role="button"
                    tabIndex={0}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={() => { setDragOverIndex(null); dragItemRef.current = null; }}
                  >
                    {/* Drag Handle */}
                    <div className="w-4 flex justify-center flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-40 transition-opacity">
                      <svg width="10" height="16" viewBox="0 0 10 16" fill="var(--text-muted)">
                        <circle cx="3" cy="2" r="1.5" />
                        <circle cx="7" cy="2" r="1.5" />
                        <circle cx="3" cy="8" r="1.5" />
                        <circle cx="7" cy="8" r="1.5" />
                        <circle cx="3" cy="14" r="1.5" />
                        <circle cx="7" cy="14" r="1.5" />
                      </svg>
                    </div>

                    {/* Index / Equalizer */}
                    <div className="w-6 flex justify-center flex-shrink-0">
                      {index === room.current_song_index && room.is_playing ? (
                        <div className="flex gap-px items-end h-4">
                          <div className="eq-bar" style={{ width: 2 }} />
                          <div className="eq-bar" style={{ width: 2 }} />
                          <div className="eq-bar" style={{ width: 2 }} />
                        </div>
                      ) : (
                        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${index === room.current_song_index ? 'font-bold' : 'font-medium'}`}>
                        {item.title}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {item.added_by}
                      </p>
                    </div>

                    {/* Duration */}
                    <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {index === room.current_song_index && isSpeaker
                        ? `${formatDuration(Math.floor(currentTime))} / ${formatDuration(item.duration_seconds)}`
                        : formatDuration(item.duration_seconds)}
                    </span>

                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSong(item);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50"
                      title="Remove from queue"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Tabs */}
        <div className="md:w-1/2 lg:w-2/5 glass flex flex-col animate-fade-in min-h-0" style={{ animationDelay: '0.15s' }}>
          {/* Tab Buttons */}
          <div className="flex border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <button
              className={`tab-btn flex-1 ${activeTab === 'youtube' ? 'active' : ''}`}
              onClick={() => setActiveTab('youtube')}
            >
              🔍 YouTube
            </button>
            <button
              className={`tab-btn flex-1 ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              👥 Users {users.length > 0 && <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 rounded-full">{users.length}</span>}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* YouTube Search Tab */}
            {activeTab === 'youtube' && (
              <div className="flex flex-col gap-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <input
                    id="search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter URL or Song Name"
                    className="input-glass flex-1"
                    disabled={searching || addingUrl}
                  />
                  <button
                    type="submit"
                    className="btn-primary px-4"
                    disabled={searching || !searchQuery.trim()}
                  >
                    {searching ? (
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    )}
                  </button>
                </form>

                {addingUrl && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--green-primary)' }}>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Adding track...
                  </div>
                )}

                {/* Search Results */}
                <div className="flex flex-col gap-2">
                  {searchResults.map((result) => {
                    const isAdded = queuedVideoIds.has(result.id);
                    return (
                      <button
                        key={result.id}
                        onClick={() => addSongToQueue(result.id, result.title, result.thumbnail, result.durationSeconds)}
                        className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all group ${isAdded ? 'bg-green-50/50' : 'hover:bg-green-50'}`}
                        style={{ border: `1px solid ${isAdded ? 'rgba(34,197,94,0.2)' : 'rgba(0,0,0,0.05)'}` }}
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={result.thumbnail}
                            alt={result.title}
                            className="w-20 h-14 rounded-lg object-cover"
                          />
                          {isAdded ? (
                            <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          ) : (
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-lg flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 text-white text-lg transition-opacity">+</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">{result.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {result.channelTitle} · {formatDuration(result.durationSeconds)}
                          </p>
                        </div>
                        {isAdded && (
                          <span className="text-xs font-semibold flex-shrink-0 px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--green-primary)' }}>
                            Added
                          </span>
                        )}
                      </button>
                    );
                  })}

                </div>

                {/* Load More button */}
                {nextPageToken && searchResults.length > 0 && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-green-50"
                    style={{ color: 'var(--green-primary)', border: '1px solid rgba(34,197,94,0.2)' }}
                  >
                    {loadingMore ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading...
                      </span>
                    ) : (
                      `Load More Results`
                    )}
                  </button>
                )}

                {/* Result count */}
                {searchResults.length > 0 && (
                  <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    Showing {searchResults.length} results
                  </p>
                )}

                {searchResults.length === 0 && !searching && (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3">🎶</div>
                    <p className="font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Add music from YouTube
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Search by song name, or paste a video URL
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="flex flex-col gap-2">
                {users.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">👻</div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      No one else is here yet
                    </p>
                  </div>
                ) : (
                  users.map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ border: '1px solid rgba(0,0,0,0.05)' }}
                    >
                      <div
                        className="avatar"
                        style={{ background: user.avatar_color }}
                      >
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate flex items-center gap-2">
                          {user.username}
                          {user.user_id === currentUser?.user_id && (
                            <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(you)</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`role-badge role-${user.role}`}>
                            {user.role}
                          </span>
                          {user.is_speaker && (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              🔊 Speaker
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player Bar — fixed at bottom */}
      <div className="player-bar mx-3 mb-3 px-4 md:px-6 py-3 flex-shrink-0">
        {/* Progress */}
        {isSpeaker && (
          <div
            className="progress-track mb-3"
            onClick={(e) => {
              if (!playerRef.current || !playerReady) return;
              const videoDuration = playerRef.current.getDuration();
              if (videoDuration <= 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const percent = clickX / rect.width;
              const seekTime = percent * videoDuration;
              playerRef.current.seekTo(seekTime, true);
              setCurrentTime(seekTime);
            }}
          >
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Left: Speaker Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSpeaker}
              className={`speaker-toggle ${isSpeaker ? 'on' : 'off'}`}
              title={isSpeaker ? 'Speaker ON — playing audio on this device' : 'Speaker OFF — remote control only'}
            >
              {isSpeaker ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              )}
              <span className="hidden sm:inline text-xs">
                {isSpeaker ? 'Speaker' : 'Remote'}
              </span>
            </button>
          </div>

          {/* Center: Playback Controls */}
          <div className="flex items-center gap-2">
            <button onClick={handlePrev} className="btn-icon" disabled={room.current_song_index <= 0} title="Previous">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <button onClick={handlePlayPause} className="btn-icon btn-icon-lg" title={room.is_playing ? 'Pause' : 'Play'}>
              {room.is_playing ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button onClick={handleNext} className="btn-icon" disabled={room.current_song_index >= queue.length - 1} title="Next">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>

          {/* Right: Volume + Track info */}
          <div className="hidden sm:flex items-center gap-3 text-white/70">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const newVol = room.volume > 0 ? 0 : 100;
                  setRoom((prev) => ({ ...prev, volume: newVol }));
                  supabase.from('rooms').update({ volume: newVol }).eq('id', room.id).then();
                  channelRef.current?.send({
                    type: 'broadcast',
                    event: 'volume_change',
                    payload: { volume: newVol },
                  });
                  if (playerRef.current && isSpeaker) {
                    playerRef.current.setVolume(newVol);
                    if (newVol === 0) playerRef.current.mute();
                    else playerRef.current.unMute();
                  }
                }}
                className="btn-icon"
                title={room.volume > 0 ? 'Mute' : 'Unmute'}
              >
                {room.volume === 0 ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : room.volume < 50 ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={room.volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRoom((prev) => ({ ...prev, volume: v }));
                  supabase.from('rooms').update({ volume: v }).eq('id', room.id).then();
                  channelRef.current?.send({
                    type: 'broadcast',
                    event: 'volume_change',
                    payload: { volume: v },
                  });
                  if (playerRef.current && isSpeaker) {
                    playerRef.current.setVolume(v);
                    if (v === 0) playerRef.current.mute();
                    else playerRef.current.unMute();
                  }
                }}
                className="volume-slider"
                title={`Volume: ${room.volume}%`}
              />
            </div>
            {currentSong && (
              <span className="truncate max-w-[150px] text-xs">{currentSong.title}</span>
            )}
          </div>
        </div>
      </div>

      {/* Extension Install Popup */}
      {showExtensionPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
          <div className="p-6 max-w-md w-full animate-fade-in rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(34,197,94,0.4)', boxShadow: '0 0 40px rgba(34,197,94,0.15)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: '#fff' }}>
                <span>🧩</span>
                Install DropATrack Extension
              </h3>
              <button
                onClick={() => setShowExtensionPopup(false)}
                className="text-xl leading-none px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: '#999' }}
              >
                ✕
              </button>
            </div>

            <p className="text-sm mb-4" style={{ color: '#d4d4d4' }}>
              Add YouTube videos to this room directly from YouTube! Install our Chrome extension in 3 easy steps:
            </p>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="flex gap-3 items-start p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: '#22c55e', color: '#000' }}>1</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#fff' }}>Download the extension</p>
                  <a
                    href="/extension.zip"
                    download
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                    style={{ background: '#22c55e', color: '#000' }}
                  >
                    📦 Download ZIP
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3 items-start p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: '#22c55e', color: '#000' }}>2</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#fff' }}>Unzip &amp; open Extensions page</p>
                  <p className="text-sm mt-1.5" style={{ color: '#d4d4d4' }}>
                    Extract the ZIP file, then go to <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'rgba(255,255,255,0.15)', color: '#86efac' }}>chrome://extensions</code>
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#d4d4d4' }}>
                    Turn on <strong style={{ color: '#fff' }}>Developer mode</strong> (toggle at top right)
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3 items-start p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: '#22c55e', color: '#000' }}>3</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#fff' }}>Load the extension</p>
                  <p className="text-sm mt-1.5" style={{ color: '#d4d4d4' }}>
                    Click <strong style={{ color: '#fff' }}>&quot;Load unpacked&quot;</strong> and select the unzipped <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'rgba(255,255,255,0.15)', color: '#86efac' }}>extension</code> folder
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#86efac' }}>
                    Done! Open any YouTube playlist and the DropATrack buttons will appear 🎉
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowExtensionPopup(false)}
              className="w-full mt-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
              style={{ background: '#22c55e', color: '#000' }}
            >
              Got it, let&apos;s go! 🎵
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
