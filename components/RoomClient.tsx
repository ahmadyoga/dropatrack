'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/names';
import { formatDuration, extractYouTubeId } from '@/lib/youtube';
import { useAntiDebug } from '@/lib/antiDebug';
import ThemeToggle from '@/components/ThemeToggle';
import type { Room, QueueItem, RoomUser, UserRole, PlaybackSyncEvent, TrendingVideo, ChatMessage } from '@/lib/types';
import type { CuratedSection } from '@/lib/curatedPlaylists';
import '@/app/room.css';

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
type RpTabType = 'users' | 'chat';
// Detect region from timezone first (more accurate), then fallback to language
const TIMEZONE_TO_REGION: Record<string, string> = {
  'Asia/Jakarta': 'ID', 'Asia/Makassar': 'ID', 'Asia/Jayapura': 'ID', 'Asia/Pontianak': 'ID',
  'Asia/Seoul': 'KR', 'Asia/Tokyo': 'JP', 'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK',
  'Asia/Taipei': 'TW', 'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Bangkok': 'TH',
  'Asia/Manila': 'PH', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Kolkata': 'IN', 'Asia/Karachi': 'PK',
  'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA',
  'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL', 'Europe/Moscow': 'RU', 'Europe/Istanbul': 'TR',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US',
  'America/Sao_Paulo': 'BR', 'America/Mexico_City': 'MX', 'America/Toronto': 'CA',
  'America/Buenos_Aires': 'AR', 'America/Bogota': 'CO', 'America/Lima': 'PE',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Pacific/Auckland': 'NZ',
  'Africa/Lagos': 'NG', 'Africa/Cairo': 'EG', 'Africa/Johannesburg': 'ZA',
};

function detectRegion(): string {
  if (typeof Intl !== 'undefined') {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && TIMEZONE_TO_REGION[tz]) return TIMEZONE_TO_REGION[tz];
    } catch { /* fallback */ }
  }
  if (typeof navigator === 'undefined') return 'ID';
  const lang = navigator.language || '';
  const parts = lang.split('-');
  const country = (parts[1] || parts[0]).toUpperCase();
  if (country.length === 2) return country;
  return 'ID';
}

function formatViewCount(count: number): string {
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function RoomClient({ initialRoom, initialQueue }: RoomClientProps) {
  useAntiDebug();

  // ─── State ──────────────────────────────────────────────────────────
  const [room, setRoom] = useState<Room>(initialRoom);
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [activeTab, setActiveTab] = useState<RpTabType>('users');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
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
  const [repeatMode, setRepeatMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('dropatrack_repeat') === 'true';
    return false;
  });
  const [showExtensionPopup, setShowExtensionPopup] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const isResizingRef = useRef(false);

  // ─── Trending & Latest state ───────────────────────────────────────
  const [trendingRegion] = useState(() => detectRegion());
  const [trendingVideos, setTrendingVideos] = useState<TrendingVideo[]>([]);
  const [latestVideos, setLatestVideos] = useState<TrendingVideo[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [latestLoading, setLatestLoading] = useState(true);

  // ─── Curated Playlists state ────────────────────────────────────────
  interface EnrichedPlaylist { id: string; title: string; description: string; thumbnail: string; itemCount: number; }
  interface EnrichedSection extends Omit<CuratedSection, 'playlists'> { playlists: EnrichedPlaylist[]; }
  const [curatedSections, setCuratedSections] = useState<EnrichedSection[]>([]);
  const [curatedLoading, setCuratedLoading] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ id: string; title: string } | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<TrendingVideo[]>([]);
  const [playlistVideosLoading, setPlaylistVideosLoading] = useState(false);

  // ─── Chat state ────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatSubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const playerRef = useRef<YTPlayer | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [showPlayerOverlay, setShowPlayerOverlay] = useState(true);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide play button overlay after 2s when playing
  useEffect(() => {
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    if (room.is_playing) {
      overlayTimerRef.current = setTimeout(() => setShowPlayerOverlay(false), 2000);
    } else {
      setShowPlayerOverlay(true);
    }
    return () => { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); };
  }, [room.is_playing]);
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
  }, [room.current_song_index, currentSong?.youtube_id, isSpeaker, playerReady, currentSong]);

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
  }, [isSpeaker, playerReady, room.id]);

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
    [currentUser, playerReady, room.id]
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

  const repeatRef = useRef(repeatMode);
  useEffect(() => { repeatRef.current = repeatMode; }, [repeatMode]);

  const handleNext = useCallback(() => {
    // Use refs to always read the latest state (avoids stale closure from YouTube callback)
    const currentIdx = roomRef.current.current_song_index;
    const queueLen = queueRef.current.length;

    let nextIndex: number;
    if (currentIdx >= queueLen - 1) {
      // At the end of the queue
      if (repeatRef.current && queueLen > 0) {
        nextIndex = 0; // Loop back to start
      } else {
        return; // Stop at end
      }
    } else {
      nextIndex = currentIdx + 1;
    }

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

  // ─── Resize Handler ───
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      let newWidth = e.clientX;
      if (newWidth < 250) newWidth = 250;
      if (newWidth > 450) newWidth = 450;
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // ─── Fetch Trending Music ──────────────────────────────────────────
  const fetchTrending = useCallback(async (region: string) => {
    setTrendingLoading(true);
    try {
      const res = await fetch(`/api/youtube/trending?regionCode=${encodeURIComponent(region)}&maxResults=10`);
      const data = await res.json();
      if (data.results) setTrendingVideos(data.results);
    } catch (err) {
      console.error('Trending fetch failed:', err);
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending(trendingRegion);
  }, [trendingRegion, fetchTrending]);

  // ─── Fetch Latest Music ────────────────────────────────────────────
  const fetchLatest = useCallback(async () => {
    setLatestLoading(true);
    try {
      const res = await fetch(`/api/youtube/latest?maxResults=10&regionCode=${trendingRegion}`);
      const data = await res.json();
      if (data.results) setLatestVideos(data.results);
    } catch (err) {
      console.error('Latest fetch failed:', err);
    } finally {
      setLatestLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  // ─── Fetch Curated Sections from YouTube Music channel ─────────────
  useEffect(() => {
    const fetchCurated = async () => {
      setCuratedLoading(true);
      try {
        const res = await fetch(`/api/youtube/curated?regionCode=${trendingRegion}`);
        const data = await res.json();
        if (data.sections) setCuratedSections(data.sections);
      } catch (err) {
        console.error('Curated sections fetch failed:', err);
      } finally {
        setCuratedLoading(false);
      }
    };
    fetchCurated();
  }, [trendingRegion]);

  // ─── Fetch videos for a selected playlist ──────────────────────────
  const openPlaylist = useCallback(async (playlistId: string, title: string) => {
    setSelectedPlaylist({ id: playlistId, title });
    setPlaylistVideosLoading(true);
    setPlaylistVideos([]);
    try {
      const res = await fetch(`/api/youtube/playlists/${playlistId}?maxResults=20`);
      const data = await res.json();
      if (data.videos) setPlaylistVideos(data.videos);
    } catch (err) {
      console.error('Playlist items fetch failed:', err);
    } finally {
      setPlaylistVideosLoading(false);
    }
  }, []);

  // ─── Chat: Load initial messages + subscribe ───────────────────────
  const roomId = initialRoom.id; // Stable ref — won't change on room state updates
  useEffect(() => {
    if (!roomId) return;

    // Fetch initial messages (once)
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/chat?room_id=${roomId}&limit=50`);
        const data = await res.json();
        if (data.messages) setChatMessages(data.messages);
      } catch (err) {
        console.error('Chat load failed:', err);
      }
    };
    loadMessages();

    // Subscribe to new chat messages via Supabase Realtime
    const chatChannel = supabase
      .channel(`chat-db:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setChatMessages((prev) => [...prev, msg]);
        }
      )
      .subscribe();

    chatSubRef.current = chatChannel;

    return () => {
      chatChannel.unsubscribe();
    };
  }, [roomId]);

  // ─── Chat: Auto-scroll to bottom ──────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ─── Chat: Send message ────────────────────────────────────────────
  const handleSendChat = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || sendingChat || !currentUser) return;

    const messageText = chatInput.trim();
    setChatInput('');
    setSendingChat(true);

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: room.id,
          user_id: currentUser.user_id,
          username: currentUser.username,
          avatar_color: currentUser.avatar_color,
          message: messageText,
        }),
      });
      // Supabase Realtime INSERT event will add the message to state
    } catch (err) {
      console.error('Chat send failed:', err);
    } finally {
      setSendingChat(false);
    }
  }, [chatInput, sendingChat, currentUser, room.id]);

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="room-layout-wrapper">
      <div className="room-bg" />
      <div className={isRightPanelOpen ? "app-card" : "app-card rp-closed"}>

        {/* ===== LEFT SIDEBAR ===== */}
        <aside className="sidebar" style={{ width: sidebarWidth }}>
          <div className="sidebar-resizer" onMouseDown={startResizing} />
          <div className="sb-logo">
            <span className="logo-text">Drop<span>A</span>Track</span>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="room-badge"><div className="ldot" />/{room.slug}</div>
            </div>
          </div>

          {/* Mini video player */}
          <div className="np-player">
            <div className="np-video-thumb" ref={playerContainerRef}>
              <div className="np-video-label">▶ LIVE</div>
              {/* Fallback emoji if no song is playing */}
              {!currentSong && <div style={{ fontSize: 52, opacity: 0.18, position: 'relative', zIndex: 1 }}>🎸</div>}

              {/* The Youtube IFrame Container */}
              <div id="yt-player" style={{ display: isSpeaker && currentSong ? 'block' : 'none', position: 'absolute', inset: 0, zIndex: 1 }} />

              {/* Show thumbnail if not speaker or not ready */}
              {(!isSpeaker || !playerReady) && currentSong && (
                <img
                  src={currentSong.thumbnail_url || `https://img.youtube.com/vi/${currentSong.youtube_id}/mqdefault.jpg`}
                  alt={currentSong.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 1 }}
                />
              )}
              {(!isSpeaker && currentSong) && (
                <div style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 6px', fontSize: 9, borderRadius: 4, zIndex: 2 }}>
                  Remote
                </div>
              )}

              <div
                className={`np-play-overlay ${showPlayerOverlay ? '' : 'np-overlay-hidden'}`}
                onMouseEnter={() => setShowPlayerOverlay(true)}
                onMouseLeave={() => { if (room.is_playing) { overlayTimerRef.current = setTimeout(() => setShowPlayerOverlay(false), 1500); } }}
              >
                <div className="np-play-circle" onClick={handlePlayPause}>
                  {room.is_playing ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </div>
              </div>
              <div className="np-bar-wrap">
                <div className="np-bar"><div className="np-bar-fill" style={{ width: `${progressPercent}%` }} /></div>
              </div>
            </div>
            <div className="np-info">
              <div className="np-title">{currentSong ? currentSong.title : 'No track playing'}</div>
              <div className="np-meta">{currentSong ? currentSong.added_by : 'Search for a song'} · <span>{currentSong && `${formatDuration(Math.floor(currentTime))} / ${formatDuration(currentSong.duration_seconds)}`}</span></div>
            </div>
          </div>

          {/* Queue */}
          <div className="queue-header">
            <span className="queue-label">Queue</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleShuffle}
                disabled={shuffling || queue.length <= 2}
                style={{
                  background: 'none', border: 'none', cursor: (shuffling || queue.length <= 2) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', padding: 0,
                  color: shuffling ? 'var(--accent-primary)' : 'var(--theme-text-muted)',
                  opacity: (shuffling || queue.length <= 2) ? 0.4 : 1, transition: 'color 0.15s'
                }}
                onMouseEnter={(e) => { if (!shuffling && queue.length > 2) e.currentTarget.style.color = 'var(--theme-text-primary)'; }}
                onMouseLeave={(e) => { if (!shuffling) e.currentTarget.style.color = 'var(--theme-text-muted)'; }}
                title="Shuffle Queue"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>
              </button>
              <span className="queue-count">{queue.length} songs</span>
            </div>
          </div>

          <div className="queue-list">
            {queue.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Queue is empty</div>
            ) : (
              queue.map((item, index) => {
                const isPlaying = index === room.current_song_index;
                const isPast = typeof room.current_song_index === 'number' && index < room.current_song_index;
                const qClass = `qt${index % 6}`;

                return (
                  <div
                    key={item.id}
                    className={`q-item ${isPlaying ? 'playing' : ''} ${isPast ? 'past' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                    onClick={() => handleJumpTo(index)}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={() => { setDragOverIndex(null); dragItemRef.current = null; }}
                  >
                    {isPlaying && room.is_playing ? (
                      <div className="eq-bars"><div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" /></div>
                    ) : (
                      <div className="q-num" style={{ display: isPlaying ? 'none' : 'flex' }}>{index + 1}</div>
                    )}

                    <div className={`q-thumb ${qClass}`}>
                      {item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt="thumbnail" />
                      ) : (
                        '🎵'
                      )}
                    </div>
                    <div className="q-info">
                      <div className={`q-title ${isPlaying ? 'active' : ''}`}>{item.title}</div>
                      <div className="q-by">{item.added_by}</div>
                    </div>
                    <div className="q-dur" style={{ color: isPlaying ? '#1db954' : undefined }}>{formatDuration(item.duration_seconds)}</div>

                    {/* Simplified remove button for hovering */}
                    {!isPlaying && (
                      <div
                        onClick={(e) => { e.stopPropagation(); removeSong(item); }}
                        style={{ padding: '0 4px', fontSize: 14, opacity: 0.5, cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                      >
                        ×
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ===== MAIN — Search + Trending ===== */}
        <main className="main">
          <div className="main-top">
            <form onSubmit={handleSearch} className="search-bar">
              <span className="s-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
              </span>
              <input
                className="search-input"
                type="text"
                placeholder="Search artists, songs, albums or YouTube URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={searching || addingUrl}
              />
              <button type="submit" className="search-btn" disabled={searching || !searchQuery.trim()}>
                {searching ? '...' : (addingUrl ? 'Adding...' : 'Search')}
              </button>
            </form>
          </div>

          <div className="main-scroll">

            {(searchResults.length > 0 || searching) ? (
              <>
                <div className="section-header">
                  <span className="sec-title">Search Results</span>
                  <span className="sec-see" onClick={() => { setSearchResults([]); setSearchQuery(''); }}>Clear</span>
                </div>
                <div className="search-results-grid">
                  {searchResults.map((result) => {
                    const isAdded = queuedVideoIds.has(result.id);
                    return (
                      <div
                        key={result.id}
                        className={`search-result-row ${isAdded ? 'added' : ''}`}
                        onClick={() => addSongToQueue(result.id, result.title, result.thumbnail, result.durationSeconds)}
                      >
                        <div style={{ width: 44, height: 32, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                          <img src={result.thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="thumb" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 500, color: '#ccc8c0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.title}</div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{result.channelTitle} · {formatDuration(result.durationSeconds)}</div>
                        </div>
                        {isAdded ? (
                          <div style={{ fontSize: 10, color: '#1db954', fontWeight: 600 }}>Added</div>
                        ) : (
                          <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }}>+</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {nextPageToken && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    style={{ background: 'rgba(29,185,84,0.1)', color: '#1db954', border: '1px solid rgba(29,185,84,0.2)', width: '100%', padding: '8px 0', borderRadius: 8, marginTop: 12, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </button>
                )}
              </>
            ) : (
              <>
                {/* 🔥 Latest Drops — Live from YouTube (hidden if empty) */}
                {(latestLoading || latestVideos.length > 0) && (
                  <>
                    <div className="section-header">
                      <span className="sec-title">🔥 Latest Drops</span>
                      <span className="sec-see" onClick={() => fetchLatest()}>{latestLoading ? '...' : 'Refresh'}</span>
                    </div>
                    <div className="cards-row">
                      {latestLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="music-card">
                            <div className="mc-thumb skeleton-box" />
                            <div className="skeleton-text" style={{ width: '80%', height: 10, marginTop: 7 }} />
                            <div className="skeleton-text" style={{ width: '60%', height: 8, marginTop: 4 }} />
                          </div>
                        ))
                      ) : (
                        latestVideos.map((video, index) => {
                          const isAdded = queuedVideoIds.has(video.id);
                          const isHero = index === 0;
                          return (
                            <div
                              key={video.id}
                              className={`music-card ${isHero ? 'mc-hero' : ''}`}
                              onClick={() => addSongToQueue(video.id, video.title, video.thumbnail, video.durationSeconds)}
                            >
                              <div className="mc-thumb">
                                <img src={video.thumbnail} alt={video.title} />
                                <div className="mc-new">NEW</div>
                                <div className="mc-duration">{formatDuration(video.durationSeconds)}</div>
                                {isAdded && <div className="mc-added">ADDED</div>}
                                <div className="mc-play"><div className="mc-play-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg></div></div>
                              </div>
                              <div className="mc-title">{video.title}</div>
                              <div className="mc-artist">{video.channelTitle}</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}

                {/* 📈 Trending Now — Live from YouTube */}
                <div className="section-header" style={{ marginTop: 18 }}>
                  <span className="sec-title">📈 Trending Now</span>
                  <span className="sec-see" onClick={() => fetchTrending(trendingRegion)}>{trendingLoading ? '...' : 'Refresh'}</span>
                </div>
                <div className="trending-grid">
                  {trendingLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="trend-item">
                        <div className="ti-rank" style={{ opacity: 0.3 }}>{i + 1}</div>
                        <div className="skeleton-box" style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0 }} />
                        <div className="ti-info">
                          <div className="skeleton-text" style={{ width: '70%', height: 10 }} />
                          <div className="skeleton-text" style={{ width: '50%', height: 8, marginTop: 4 }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    trendingVideos.map((video, index) => {
                      const isAdded = queuedVideoIds.has(video.id);
                      const isHero = index === 0;
                      return (
                        <div
                          key={video.id}
                          className={`trend-item ${isHero ? 'ti-hero' : ''} ${isAdded ? 'trend-added' : ''}`}
                          onClick={() => addSongToQueue(video.id, video.title, video.thumbnail, video.durationSeconds)}
                        >
                          <div className="ti-rank">{index + 1}</div>
                          <div className="ti-thumb">
                            <img src={video.thumbnail} alt={video.title} />
                          </div>
                          <div className="ti-info">
                            <div className="ti-title">{video.title}</div>
                            <div className="ti-meta">{video.channelTitle} · {formatViewCount(video.viewCount)} views</div>
                          </div>
                          {isAdded ? (
                            <div className="ti-tag tag-up">✓</div>
                          ) : index === 0 ? (
                            <div className="ti-tag tag-hot">HOT</div>
                          ) : index < 3 ? (
                            <div className="ti-tag tag-up">↑</div>
                          ) : (
                            <div className="ti-tag tag-new">NEW</div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 🎵 Curated YouTube Music Sections */}
                {selectedPlaylist ? (
                  <>
                    <div className="section-header" style={{ marginTop: 18 }}>
                      <span className="sec-title" style={{ cursor: 'pointer' }} onClick={() => setSelectedPlaylist(null)}>
                        ← {selectedPlaylist.title}
                      </span>
                      <span className="sec-see" onClick={() => setSelectedPlaylist(null)}>Back</span>
                    </div>
                    <div className="trending-grid">
                      {playlistVideosLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="trend-item">
                            <div className="ti-rank" style={{ opacity: 0.3 }}>{i + 1}</div>
                            <div className="skeleton-box" style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0 }} />
                            <div className="ti-info">
                              <div className="skeleton-text" style={{ width: '70%', height: 10 }} />
                              <div className="skeleton-text" style={{ width: '50%', height: 8, marginTop: 4 }} />
                            </div>
                          </div>
                        ))
                      ) : (
                        playlistVideos.map((video, index) => {
                          const isAdded = queuedVideoIds.has(video.id);
                          const isHero = index === 0;
                          return (
                            <div
                              key={video.id}
                              className={`trend-item ${isHero ? 'ti-hero' : ''} ${isAdded ? 'trend-added' : ''}`}
                              onClick={() => addSongToQueue(video.id, video.title, video.thumbnail, video.durationSeconds)}
                            >
                              <div className="ti-rank">{index + 1}</div>
                              <div className="ti-thumb">
                                <img src={video.thumbnail} alt={video.title} />
                              </div>
                              <div className="ti-info">
                                <div className="ti-title">{video.title}</div>
                                <div className="ti-meta">{video.channelTitle} · {formatViewCount(video.viewCount)} views</div>
                              </div>
                              {isAdded ? (
                                <div className="ti-tag tag-added">✓</div>
                              ) : (
                                <div className="ti-tag tag-new">ADD</div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (curatedSections.length > 0 || curatedLoading) && (
                  <>
                    {curatedLoading ? (
                      Array.from({ length: 2 }).map((_, si) => (
                        <div key={si}>
                          <div className="section-header" style={{ marginTop: 18 }}>
                            <div className="skeleton-text" style={{ width: 120, height: 14 }} />
                          </div>
                          <div className="playlists-grid">
                            {Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className="playlist-card">
                                <div className="pl-thumb skeleton-box" />
                                <div className="skeleton-text" style={{ width: '80%', height: 10, marginTop: 7 }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      curatedSections.map((section) => (
                        <div key={section.title}>
                          <div className="section-header" style={{ marginTop: 18 }}>
                            <span className="sec-title">{section.emoji} {section.title}</span>
                          </div>
                          <div className="playlists-grid">
                            {section.playlists.map((pl, idx) => {
                              const isBentoLarge = idx === 0;
                              const isBentoWide  = idx === 1 && section.playlists.length > 4;
                              const bentoClass = isBentoLarge ? 'bento-large' : (isBentoWide ? 'bento-wide' : '');
                              const gradientColors = [
                                'linear-gradient(135deg, #f037a5, #880e4f)',  // Pink/Purple
                                'linear-gradient(135deg, #1DB954, #127435)',  // Spotify Green
                                'linear-gradient(135deg, #ff9800, #e65100)',  // Energetic Orange
                                'linear-gradient(135deg, #2979ff, #0d47a1)',  // Ocean Blue
                                'linear-gradient(135deg, #9c27b0, #4a148c)',  // Deep Purple
                                'linear-gradient(135deg, #00bfa5, #00695c)',  // Teal
                              ];
                              // stable pseudo-random based on title length and index
                              const colorIndex = (pl.title.length + idx) % gradientColors.length;
                              const bgGradient = gradientColors[colorIndex];

                              return (
                                <div
                                  key={pl.id}
                                  className={`playlist-card ${bentoClass}`}
                                  style={{ background: bgGradient }}
                                  onClick={() => openPlaylist(pl.id, pl.title)}
                                >
                                  <div className="pl-title">{pl.title}</div>
                                  <div className="pl-thumb">
                                    {pl.thumbnail ? (
                                      <img src={pl.thumbnail} alt={pl.title} />
                                    ) : (
                                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isBentoLarge ? 48 : 24, background: 'rgba(0,0,0,0.15)' }}>{section.emoji}</div>
                                    )}
                                  </div>
                                  {pl.itemCount > 0 && <div className="pl-count">{pl.itemCount} tracks</div>}
                                  <div className="mc-play"><div className="mc-play-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="var(--theme-bg-base)"><path d="M8 5v14l11-7z" /></svg></div></div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </>
            )}

          </div>
        </main>

        {/* ===== RIGHT — Users + Chat ===== */}
        <aside className="right-panel">
          <div className="rp-tabs">
            <div className={`rp-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Users</div>
            <div className={`rp-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>Chat</div>
          </div>

          {/* Users Panel */}
          <div className={`users-panel ${activeTab !== 'users' ? 'hidden' : ''}`}>
            <div className="users-list">
              <div className="online-header">
                Online
                <span className="online-count">{users.length} {users.length === 1 ? 'listener' : 'listeners'}</span>
              </div>

              {users.map((user) => (
                <div key={user.user_id} className="user-item">
                  <div className="user-av" style={{ background: user.avatar_color }}>
                    <span>{user.username.charAt(0).toUpperCase()}</span>
                    <div className="av-dot" />
                  </div>
                  <div className="ui-info">
                    <div className="ui-name">{user.username}</div>
                    <div className="ui-status">
                      {user.is_speaker ? '🔊 Speaker' : '🎧 Listening'}
                    </div>
                  </div>
                  <div className={`ui-badge badge-${user.role === 'admin' ? 'admin' : (user.user_id === currentUser?.user_id ? 'you' : 'dj')}`}>
                    {user.user_id === currentUser?.user_id ? 'YOU' : user.role.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>

            <div className="listening-now">
              <div className="eq-bars" style={{ height: 12 }}>
                <div className="eq-bar" />
                <div className="eq-bar" />
                <div className="eq-bar" />
              </div>
              All listeners synced in real-time
            </div>
          </div>

          {/* Dynamic Chat Panel */}
          <div className={`chat-panel ${activeTab !== 'chat' ? 'hidden' : ''}`}>
            <div className="chat-messages">
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 11, color: 'var(--theme-text-muted)' }}>
                  No messages yet. Say hi! 👋
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isOwn = msg.user_id === currentUser?.user_id;
                  return (
                    <div key={msg.id} className={`chat-msg ${isOwn ? 'own' : ''}`}>
                      <div className="cm-av" style={{ background: msg.avatar_color }}>
                        {msg.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="cm-body">
                        <div className="cm-name">
                          {isOwn ? 'You' : msg.username}
                          <span className="cm-time">{timeAgo(msg.created_at)}</span>
                        </div>
                        <div className={`cm-bubble ${isOwn ? 'own' : ''}`}>{msg.message}</div>
                        {msg.song_ref && (
                          <div className="cm-song" onClick={() => addSongToQueue(msg.song_ref!.youtube_id, msg.song_ref!.title, '', 0)}>
                            <div className="cm-song-thumb">🎵</div>
                            <div className="cm-song-info">
                              <div className="cm-song-title">{msg.song_ref.title}</div>
                              <div className="cm-song-meta">{msg.song_ref.artist} · {msg.song_ref.duration}</div>
                            </div>
                            <span className="cm-song-add">+</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>
            <form className="chat-input-wrap" onSubmit={handleSendChat}>
              <input
                className="chat-input"
                type="text"
                placeholder="Say something..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={sendingChat}
                maxLength={500}
              />
              <button className="send-btn" type="submit" disabled={sendingChat || !chatInput.trim()}>
                <svg viewBox="0 0 24 24" fill="white"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" /></svg>
              </button>
            </form>
          </div>
        </aside>

        {/* ===== PLAYER BAR — FULL WIDTH ===== */}
        <div className="player-bar">
          <div className="pb-track">
            <div className="pb-thumb qt0">
              {currentSong?.thumbnail_url ? <img src={currentSong.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="thumb" /> : '🎸'}
            </div>
            <div className="pb-info">
              <div className="pb-title">{currentSong ? (currentSong.title || 'Unknown Track') : 'No track'}</div>
              <div className="pb-artist">{currentSong ? currentSong.added_by : ''}</div>
            </div>
            {currentSong && <span className="pb-heart">♥</span>}
          </div>

          <div className="pb-controls">
            <div className="pb-btns">
              <button className="ctrl" onClick={handlePrev} disabled={room.current_song_index <= 0} title="Previous">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
              </button>
              <button className="play-btn" onClick={handlePlayPause}>
                {room.is_playing ? (
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
              <button className="ctrl" onClick={handleNext} disabled={!repeatMode && room.current_song_index >= queue.length - 1} title="Next">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="m6 18 8.5-6L6 6v12zm2-8.14 4.96 3.14L8 16.14V9.86zM16 6h2v12h-2z" /></svg>
              </button>
              <button
                className={`ctrl ${repeatMode ? 'ctrl-active' : ''}`}
                title="Repeat"
                onClick={() => {
                  setRepeatMode((prev) => {
                    const next = !prev;
                    localStorage.setItem('dropatrack_repeat', String(next));
                    return next;
                  });
                }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" /></svg>
              </button>
            </div>
            <div className="pb-progress">
              <span className="pb-time">{formatDuration(Math.floor(currentTime))}</span>
              <div
                className="pb-bar"
                onMouseDown={(e) => {
                  if (!playerRef.current || !playerReady) return;
                  const videoDuration = duration;
                  if (videoDuration <= 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const percent = clickX / rect.width;
                  const seekTime = percent * videoDuration;
                  playerRef.current.seekTo(seekTime, true);
                  setCurrentTime(seekTime);
                }}
              >
                <div className="pb-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="pb-time" style={{ textAlign: 'right' }}>{formatDuration(Math.floor(duration))}</span>
            </div>
          </div>

          <div className="pb-right">
            <div className="vol-wrap">
              <span className="vol-icon" onClick={() => {
                const newVol = room.volume > 0 ? 0 : 100;
                setRoom((prev) => ({ ...prev, volume: newVol }));
                supabase.from('rooms').update({ volume: newVol }).eq('id', room.id).then();
                channelRef.current?.send({ type: 'broadcast', event: 'volume_change', payload: { volume: newVol } });
                if (playerRef.current && isSpeaker) {
                  playerRef.current.setVolume(newVol);
                  if (newVol === 0) playerRef.current.mute();
                  else playerRef.current.unMute();
                }
              }}>
                {room.volume === 0 ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" /></svg>
                )}
              </span>
              <div
                className="vol-bar"
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const v = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  const newVol = Math.round(v * 100);
                  setRoom((prev) => ({ ...prev, volume: newVol }));
                  supabase.from('rooms').update({ volume: newVol }).eq('id', room.id).then();
                  channelRef.current?.send({ type: 'broadcast', event: 'volume_change', payload: { volume: newVol } });
                  if (playerRef.current && isSpeaker) {
                    playerRef.current.setVolume(newVol);
                    if (newVol === 0) playerRef.current.mute();
                    else playerRef.current.unMute();
                  }
                }}
              >
                <div className="vol-fill" style={{ width: `${room.volume}%` }} />
              </div>
            </div>
            <div className="pb-extra">
              <button
                className={`icon-btn ${isRightPanelOpen ? 'active' : ''}`}
                title="Toggle Users/Chat"
                onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                style={{ background: isRightPanelOpen ? 'rgba(29,185,84,0.15)' : '', color: isRightPanelOpen ? '#1db954' : '' }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
              </button>
              <button
                className="icon-btn"
                title="Queue"
                onClick={() => document.querySelector('.sidebar')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" /></svg>
              </button>
              <div className={`speaker-pill ${isSpeaker ? 'active' : ''}`} onClick={toggleSpeaker} title="Toggle Speaker Mode">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                {isSpeaker ? 'Speaker' : 'Remote'}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Extension Install Popup */}
      {showExtensionPopup && (
        <div className="modal-overlay">
          <div className="ext-modal">

            <div className="ext-modal-header">
              <h3 className="ext-modal-title">
                <span>🧩</span> Install DropATrack Extension
              </h3>
              <button onClick={() => setShowExtensionPopup(false)} className="ext-close-btn">
                ✕
              </button>
            </div>

            <div className="ext-modal-desc">
              Add YouTube videos to this room directly from YouTube! Install our Chrome extension in 3 easy steps:
            </div>

            <div className="ext-steps">
              {/* Step 1 */}
              <div className="ext-step">
                <div className="ext-step-num">1</div>
                <div className="ext-step-info">
                  <div className="ext-step-title">Download the extension</div>
                  <a href="/extension.zip" download className="ext-dl-btn">
                    📦 Download ZIP
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div className="ext-step">
                <div className="ext-step-num">2</div>
                <div className="ext-step-info">
                  <div className="ext-step-title">Unzip & open Extensions page</div>
                  <div className="ext-step-text">
                    Extract the ZIP, then go to <code className="ext-code">chrome://extensions</code>
                    <br />Turn on <strong>Developer mode</strong> (top right)
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="ext-step">
                <div className="ext-step-num">3</div>
                <div className="ext-step-info">
                  <div className="ext-step-title">Load the extension</div>
                  <div className="ext-step-text" style={{ paddingBottom: 6 }}>
                    Click <strong>"Load unpacked"</strong> and select the unzipped <code className="ext-code">extension</code> folder.
                  </div>
                  <div className="ext-step-text" style={{ color: '#4ade80' }}>
                    Done! Open any YouTube playlist and the DropATrack buttons will appear 🎉
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => setShowExtensionPopup(false)} className="ext-cta-btn">
              Got it, let's go! 🎵
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
