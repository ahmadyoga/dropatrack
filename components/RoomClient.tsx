'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser, updateLocalUsername } from '@/lib/names';
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
// Detect user's IANA timezone — server-side helper converts to regionCode
function detectTimezone(): string {
  if (typeof Intl !== 'undefined') {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) return tz;
    } catch { /* fallback */ }
  }
  return 'Asia/Jakarta'; // default fallback
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
  const [mobileTab, setMobileTab] = useState<'main' | 'queue' | 'chat'>('main');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getOrCreateUser> | null>(null);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const [searchMatchIndices, setSearchMatchIndices] = useState<number[]>([]);
  const [searchMatchCurrentIdx, setSearchMatchCurrentIdx] = useState(0);
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
  const [myRole, setMyRole] = useState<UserRole>('dj');
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  const [showExtensionPopup, setShowExtensionPopup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [roleMenuUserId, setRoleMenuUserId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const isResizingRef = useRef(false);

  // ─── Trending & Latest state ───────────────────────────────────────
  const [userTimezone] = useState(() => detectTimezone());
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
  const [showAllPlaylists, setShowAllPlaylists] = useState(false);

  // ─── Chat state ────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatSubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const isChatVisibleRef = useRef(false);
  const currentUserRef = useRef<ReturnType<typeof getOrCreateUser> | null>(null);
  const myRoleRef = useRef<UserRole>('dj');
  // In-app toast notification
  const [chatToast, setChatToast] = useState<{ username: string; message: string; color: string } | null>(null);
  const chatToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
  // Refs for values needed inside channel closures (avoid stale captures)
  const isSpeakerRef = useRef(isSpeaker);
  const playerReadyRef = useRef(playerReady);
  // Guard: prevents handleNext from firing twice in rapid succession
  const isTransitioningRef = useRef(false);
  // Guard: suppresses ENDED events emitted by YouTube while loading a new video
  const isLoadingVideoRef = useRef(false);
  // Silent AudioContext — keeps JS alive when browser is minimized on mobile
  const audioContextRef = useRef<AudioContext | null>(null);
  const silentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const currentSong = queue[room.current_song_index] || null;

  // ─── Role-based permissions ───────────────────────────────────────
  const canPlayPause = myRole === 'admin' || myRole === 'moderator';
  const canRearrange = myRole === 'admin' || myRole === 'moderator';
  const canAddSongs = true;

  // Keep refs in sync with state
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { isSpeakerRef.current = isSpeaker; }, [isSpeaker]);
  useEffect(() => { playerReadyRef.current = playerReady; }, [playerReady]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { myRoleRef.current = myRole; }, [myRole]);

  // Track whether chat is currently visible (desktop or mobile)
  useEffect(() => {
    isChatVisibleRef.current = activeTab === 'chat' || mobileTab === 'chat';
  }, [activeTab, mobileTab]);

  // ─── Debounced queue search ─────────────────────────────────────────
  useEffect(() => {
    const delay = setTimeout(() => {
      if (queueSearchQuery.trim().length === 0) {
        setSearchMatchIndices([]);
        setSearchMatchCurrentIdx(0);
        return;
      }
      const q = queueSearchQuery.toLowerCase();
      const matches = queue
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.title.toLowerCase().includes(q) || (item.added_by && item.added_by.toLowerCase().includes(q)))
        .map(m => m.index);

      setSearchMatchIndices(matches);
      setSearchMatchCurrentIdx(0);

      // Auto-scroll to first match
      if (matches.length > 0) {
        const el = document.getElementById(`q-item-${matches[0]}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [queueSearchQuery, queue]);

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

    // Resolve role: explicit user_roles override > creator → admin > default_role
    const userRoles = initialRoom.user_roles || {};
    const defaultRole = initialRoom.default_role || 'dj';
    if (user && userRoles[user.user_id]) {
      setMyRole(userRoles[user.user_id]);
    } else if (user && initialRoom.created_by === user.username) {
      setMyRole('admin');
    } else {
      setMyRole(defaultRole as UserRole);
    }
  }, [initialRoom.slug, initialRoom.created_by, initialRoom.user_roles, initialRoom.default_role]);

  // ─── Re-resolve role when room settings change (admin changed default or assigned role) ──
  useEffect(() => {
    if (!currentUser) return;
    const userRoles = room.user_roles || {};
    const defaultRole = room.default_role || 'dj';
    if (userRoles[currentUser.user_id]) {
      setMyRole(userRoles[currentUser.user_id]);
    } else if (room.created_by === currentUser.username) {
      setMyRole('admin');
    } else {
      setMyRole(defaultRole as UserRole);
    }
  }, [room.user_roles, room.default_role, room.created_by, currentUser]);

  // ─── Toggle speaker ─────────────────────────────────────────────────
  const toggleSpeaker = useCallback(() => {
    setIsSpeaker((prev) => {
      const next = !prev;
      localStorage.setItem(`dropatrack_speaker_${room.slug}`, String(next));
      return next;
    });
  }, [room.slug]);

  // ─── Update Username ────────────────────────────────────────────────
  const handleUsernameChange = useCallback(async () => {
    if (!currentUser) return;
    const trimmed = newUsername.trim();
    if (!trimmed || trimmed === currentUser.username) {
      setEditingUsername(false);
      return;
    }

    const oldUsername = currentUser.username;
    const updated = updateLocalUsername(trimmed);
    if (updated) {
      setCurrentUser(updated);

      if (channelRef.current) {
        // Broadcast name change event for chat notifications
        channelRef.current.send({
          type: 'broadcast',
          event: 'username_changed',
          payload: {
            user_id: currentUser.user_id,
            old_username: oldUsername,
            new_username: trimmed
          }
        });
        // Presence update is now handled automatically by the single useEffect below
        // to prevent race conditions and stale closure overwrites.
      }
    }
    setEditingUsername(false);
  }, [currentUser, newUsername]);

  // ─── Admin: update default role ──────────────────────────────────────
  const updateDefaultRole = useCallback(async (newRole: UserRole) => {
    setRoom(prev => ({ ...prev, default_role: newRole }));
    await supabase.from('rooms').update({ default_role: newRole }).eq('id', room.id);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'role_update',
      payload: { default_role: newRole, user_roles: room.user_roles }
    });
  }, [room.id, room.user_roles]);

  // ─── Admin: update a specific user's role ────────────────────────────
  const updateUserRole = useCallback(async (userId: string, newRole: UserRole) => {
    const updatedRoles = { ...(room.user_roles || {}), [userId]: newRole };
    setRoom(prev => ({ ...prev, user_roles: updatedRoles }));
    await supabase.from('rooms').update({ user_roles: updatedRoles }).eq('id', room.id);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'role_update',
      payload: { default_role: room.default_role, user_roles: updatedRoles }
    });
    setRoleMenuUserId(null);
  }, [room.id, room.user_roles, room.default_role]);

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
              // Ignore ENDED events fired while we're loading a new video (YouTube bug)
              if (isLoadingVideoRef.current) return;
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
    // Set loading guard BEFORE calling loadVideoById to suppress spurious ENDED events
    isLoadingVideoRef.current = true;
    playerRef.current.loadVideoById(currentSong.youtube_id);
    // Clear the guard after a safe window (YouTube usually emits ENDED within ~300ms of load)
    setTimeout(() => { isLoadingVideoRef.current = false; }, 1500);
    // Clear transition guard so the next song-end can trigger auto-advance again
    setTimeout(() => { isTransitioningRef.current = false; }, 2000);
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
        // If the removed item was before the currently playing song, shift the index down.
        // payload.removed_index is the array index (not DB position) of the removed item.
        if (typeof payload.removed_index === 'number') {
          setRoom((prev) => {
            if (payload.removed_index < prev.current_song_index) {
              return { ...prev, current_song_index: prev.current_song_index - 1 };
            }
            return prev;
          });
        }
      }
    });

    // Broadcast: remote seek request — only the speaker acts on this
    channel.on('broadcast', { event: 'seek_request' }, ({ payload }) => {
      if (!isSpeakerRef.current || !playerRef.current || !playerReadyRef.current) return;
      const time = payload.time as number;
      playerRef.current.seekTo(time, true);
      setCurrentTime(time);
      // Echo confirmed position back so all remotes' bars snap to the right spot
      channel.send({ type: 'broadcast', event: 'time_sync', payload: { time } });
    });

    // Broadcast: lightweight time sync (emitted after speaker seeks)
    channel.on('broadcast', { event: 'time_sync' }, ({ payload }) => {
      setCurrentTime(payload.time as number);
    });

    // Broadcast: volume change
    channel.on('broadcast', { event: 'volume_change' }, ({ payload }) => {
      setRoom((prev) => ({ ...prev, volume: payload.volume }));
    });

    // Broadcast: repeat toggle
    channel.on('broadcast', { event: 'repeat_toggle' }, ({ payload }) => {
      setRoom((prev) => ({ ...prev, repeat: payload.repeat as boolean }));
    });

    // Broadcast: role updates
    channel.on('broadcast', { event: 'role_update' }, ({ payload }) => {
      setRoom((prev) => ({
        ...prev,
        default_role: payload.default_role,
        user_roles: payload.user_roles
      }));
    });

    // Broadcast: username changed
    channel.on('broadcast', { event: 'username_changed' }, ({ payload }) => {
      const { user_id, old_username, new_username } = payload;

      // If our own identity changed in another tab, update ourselves!
      if (currentUserRef.current && currentUserRef.current.user_id === user_id) {
        // Only update if it is different
        if (currentUserRef.current.username !== new_username) {
          setCurrentUser(prev => prev ? { ...prev, username: new_username } : null);
        }
      }

      setChatMessages((prev) => {
        const sysMsgId = `sys_rename_${user_id}_${new_username}`;
        if (prev.some(m => m.id === sysMsgId)) return prev;

        const systemMessage: ChatMessage = {
          id: sysMsgId,
          room_id: room.id,
          user_id: 'system',
          username: 'System',
          avatar_color: '#94a3b8',
          message: `${old_username} changed their name to ${new_username}`,
          image_url: null,
          song_ref: null,
          created_at: new Date().toISOString()
        };

        const updatedMessages = prev.map(msg =>
          msg.user_id === user_id ? { ...msg, username: new_username } : msg
        );
        return [...updatedMessages, systemMessage];
      });
    });

    // Presence: track users
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const roomUsers: RoomUser[] = [];
        for (const key in state) {
          const presences = state[key] as unknown as RoomUser[];
          if (presences.length > 0) {
            roomUsers.push(presences[presences.length - 1]); // Get the most recent presence for each user (handles multi-tab)
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
            role: myRoleRef.current,
            is_speaker: isSpeakerRef.current,
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
  }, [currentUser?.user_id, room.slug, room.id]);

  // ─── Update presence when role or speaker status or username changes ──
  useEffect(() => {
    if (!channelRef.current || !currentUser) return;

    const updatePresence = async () => {
      try {
        await channelRef.current?.track({
          user_id: currentUser.user_id,
          username: currentUser.username,
          avatar_color: currentUser.avatar_color,
          role: myRole,
          is_speaker: isSpeaker,
          joined_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to update presence:', err);
      }
    };

    updatePresence();
  }, [isSpeaker, myRole, currentUser?.username, currentUser?.avatar_color]);

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

      // Use ref for playerReady to avoid stale closure captures during auto-advance
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

  // ─── Remote: interpolate progress locally while playing ────────────
  // Remotes have no player, so currentTime only updates on sync events.
  // This interval increments it locally so the progress bar moves smoothly.
  // It self-corrects whenever a playback_sync or time_sync arrives.
  useEffect(() => {
    if (isSpeaker) return; // Speaker uses real player time from the YT interval
    if (!room.is_playing) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const songDuration = currentSong?.duration_seconds ?? 0;
        if (songDuration > 0 && prev >= songDuration) return prev; // stop at end
        return prev + 0.5;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isSpeaker, room.is_playing, currentSong?.duration_seconds]);

  // ─── Remote: reset time when song changes ───────────────────────────
  // roomSub (DB postgres_changes) can arrive before the playback_sync broadcast.
  // If the old currentTime > new song's duration, the interpolation guard freezes it.
  // Resetting here ensures the bar starts at 0 regardless of event ordering.
  useEffect(() => {
    if (isSpeaker) return;
    setCurrentTime(0);
  }, [room.current_song_index]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const repeatRef = useRef(room.repeat);
  useEffect(() => { repeatRef.current = room.repeat; }, [room.repeat]);

  const handleNext = useCallback(() => {
    // Use refs to always read the latest state (avoids stale closure from YouTube callback)
    const currentIdx = roomRef.current.current_song_index;
    const queueLen = queueRef.current.length;

    // Debounce: prevent rapid double-fire (e.g. ENDED + another trigger)
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    let nextIndex: number;
    if (currentIdx >= queueLen - 1) {
      // At the end of the queue
      if (repeatRef.current && queueLen > 0) {
        nextIndex = 0; // Loop back to start
      } else {
        // Reset transition guard since we're not actually advancing
        isTransitioningRef.current = false;
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
    // Clear transition guard — user-initiated, should never be blocked
    isTransitioningRef.current = false;
    isLoadingVideoRef.current = false;
    const prevIndex = Math.max(room.current_song_index - 1, 0);
    setRoom((prev) => ({ ...prev, current_song_index: prevIndex, is_playing: true }));
    broadcastPlayback('prev', prevIndex);
  }, [room.current_song_index, broadcastPlayback]);

  // ─── Sync with OS MediaSession (Notification Controls) ────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    // play / pause
    navigator.mediaSession.setActionHandler('play', () => {
      isTransitioningRef.current = false;
      isLoadingVideoRef.current = false;
      handlePlayPause();
    });
    navigator.mediaSession.setActionHandler('pause', handlePlayPause);

    // next / previous — clear all guards so OS controls are never blocked
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

    // seekto — some browsers require this handler to show next/prev buttons
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

    // playbackState — OS uses this to show play/pause icon on lock screen
    navigator.mediaSession.playbackState = room.is_playing ? 'playing' : 'paused';

    // metadata with all artwork sizes iOS & Android expect
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
  }, [handlePlayPause, handleNext, handlePrev, queue, room.current_song_index, room.is_playing]);

  // ─── MediaSession position state (moves the notification progress bar) ────
  // Update every second so the OS lock screen scrubber stays accurate.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const duration = currentSong?.duration_seconds ?? 0;
    if (duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(currentTime, duration),
      });
    } catch { /* not supported on this browser */ }
    // Update every time currentTime ticks (speaker) or every 1 s (remote interpolation)
  }, [currentTime, currentSong?.duration_seconds]);

  const handleJumpTo = useCallback(
    (index: number) => {
      // Clear guards on manual jump
      isTransitioningRef.current = false;
      isLoadingVideoRef.current = false;
      setRoom((prev) => ({ ...prev, current_song_index: index, is_playing: true }));
      broadcastPlayback('jump', index);
    },
    [broadcastPlayback]
  );

  // ─── Silent AudioContext keepalive (mobile background play) ──────────
  // Chrome aggressively suspends BufferSource loops in background. An
  // OscillatorNode at near-zero gain resists suspension much better, and we
  // add a statechange listener that auto-resumes if Chrome does suspend it.
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  const startSilentAudio = useCallback(() => {
    if (audioContextRef.current) return; // already running
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      // Create a silent oscillator (inaudible frequency at near-zero gain)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.001; // near-silent — enough to keep the context alive
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      oscillatorRef.current = osc;

      // Auto-resume if Chrome suspends the context in background
      const resumeOnInterrupt = () => {
        if (ctx.state === 'interrupted' || ctx.state === 'suspended') {
          ctx.resume().catch(() => { /* ignore */ });
        }
      };
      (ctx as unknown as { onstatechange: (() => void) | null }).onstatechange = resumeOnInterrupt;

      // Also try resuming on any user interaction (required by some browsers)
      const resumeOnce = () => {
        ctx.resume().catch(() => { /* ignore */ });
        document.removeEventListener('touchstart', resumeOnce);
        document.removeEventListener('click', resumeOnce);
      };
      document.addEventListener('touchstart', resumeOnce, { passive: true });
      document.addEventListener('click', resumeOnce, { passive: true });
    } catch {
      // AudioContext not available — silently ignore
    }
  }, []);

  const stopSilentAudio = useCallback(() => {
    try {
      oscillatorRef.current?.stop();
      oscillatorRef.current = null;
      silentSourceRef.current?.stop();
      silentSourceRef.current = null;
      audioContextRef.current?.close();
      audioContextRef.current = null;
    } catch {
      // ignore
    }
  }, []);

  // Start/stop silent audio with speaker mode
  useEffect(() => {
    if (isSpeaker) {
      startSilentAudio();
    } else {
      stopSilentAudio();
    }
    return () => { stopSilentAudio(); };
  }, [isSpeaker, startSilentAudio, stopSilentAudio]);

  // ─── Page Visibility — recover from mobile background ────────────────
  // When the user returns from background:
  //   1. Clear stale guards that may block auto-advance
  //   2. Resume AudioContext if Chrome suspended it
  //   3. Re-fetch room + queue from DB (Supabase WS silently disconnects
  //      after ~1-2 min in background, so we may have missed broadcasts)
  //   4. Check YT player state and force-resume or force-next
  useEffect(() => {
    const onVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;

      // 1. Clear guards
      isTransitioningRef.current = false;
      isLoadingVideoRef.current = false;

      // 2. Resume AudioContext if suspended by Chrome
      if (audioContextRef.current && audioContextRef.current.state !== 'running') {
        audioContextRef.current.resume().catch(() => { /* ignore */ });
      }

      // 3. Re-fetch authoritative room + queue state from DB
      //    This catches ANY changes that happened while we were backgrounded,
      //    regardless of whether the Supabase channel stayed connected.
      try {
        const [roomRes, queueRes] = await Promise.all([
          supabase.from('rooms').select('*').eq('id', room.id).single(),
          supabase.from('queue_items').select('*').eq('room_id', room.id).order('position', { ascending: true }),
        ]);
        if (roomRes.data) {
          setRoom((prev) => ({ ...prev, ...roomRes.data }));
        }
        if (queueRes.data) {
          setQueue(queueRes.data);
        }
      } catch {
        // DB fetch failed — continue with stale state
      }

      // 4. Check YT player state (speaker only)
      if (!isSpeakerRef.current || !playerRef.current || !playerReadyRef.current) return;
      try {
        const state = playerRef.current.getPlayerState();
        const latestRoom = roomRef.current;

        if (state === window.YT?.PlayerState?.ENDED) {
          // Song ended while we were in the background — advance now
          handleNextRef.current();
        } else if (latestRoom.is_playing && state !== window.YT?.PlayerState?.PLAYING && state !== window.YT?.PlayerState?.BUFFERING) {
          // Player was paused/stopped by the OS — resume it
          playerRef.current.playVideo();
        }
      } catch {
        // Player might be in an invalid state
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [room.id]); // only depends on room.id; everything else is read via refs

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
    if (!canAddSongs) return;

    // Use MAX(position)+1, not queue.length — deletions create gaps in position
    // values so queue.length can land mid-queue instead of at the end.
    const newPosition = queue.length > 0
      ? Math.max(...queue.map((q) => q.position)) + 1
      : 0;
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

      // If this is the first song, start playing ONLY if the user has play permissions
      if (queue.length === 0 && canPlayPause) {
        setRoom((prev) => ({ ...prev, is_playing: true, current_song_index: 0 }));
        broadcastPlayback('play', 0);
      }
      // Don't clear search results — user may want to add multiple songs from the same search
    }
  };

  const removeSong = async (item: QueueItem) => {
    const removedIndex = queueRef.current.findIndex((q) => q.id === item.id);
    const currentIdx = roomRef.current.current_song_index;

    await supabase.from('queue_items').delete().eq('id', item.id);

    setQueue((prev) => prev.filter((q) => q.id !== item.id));

    if (removedIndex !== -1 && removedIndex < currentIdx) {
      const newIndex = currentIdx - 1;
      setRoom((prev) => ({ ...prev, current_song_index: newIndex }));
      // Silently patch only current_song_index in the DB (no is_playing or seek changes)
      supabase
        .from('rooms')
        .update({ current_song_index: newIndex })
        .eq('id', room.id)
        .then();
    }

    channelRef.current?.send({
      type: 'broadcast',
      event: 'queue_update',
      payload: { type: 'removed', item_id: item.id, removed_index: removedIndex },
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

  const moveSongToNext = useCallback((e: React.MouseEvent, sourceIndex: number) => {
    e.stopPropagation();
    if (sourceIndex === room.current_song_index) return;
    if (sourceIndex === room.current_song_index + 1) return;

    dragItemRef.current = sourceIndex;
    const dropIndex = sourceIndex < room.current_song_index ? room.current_song_index : room.current_song_index + 1;
    handleDrop(dropIndex);
  }, [room.current_song_index, handleDrop]);

  // ─── Helpers ────────────────────────────────────────────────────────
  const queuedVideoIds = new Set(queue.map((q) => q.youtube_id));

  // ─── Progress bar ───────────────────────────────────────────────────
  const effectiveDuration = duration > 0 ? duration : (currentSong?.duration_seconds ?? 0);
  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

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
      const res = await fetch(`/api/youtube/trending?timezone=${encodeURIComponent(region)}&maxResults=10`);
      const data = await res.json();
      if (data.results) setTrendingVideos(data.results);
    } catch (err) {
      console.error('Trending fetch failed:', err);
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending(userTimezone);
  }, [userTimezone, fetchTrending]);

  // ─── Fetch Latest Music ────────────────────────────────────────────
  const fetchLatest = useCallback(async () => {
    setLatestLoading(true);
    try {
      const res = await fetch(`/api/youtube/latest?maxResults=10&timezone=${userTimezone}`);
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
        const res = await fetch(`/api/youtube/curated?timezone=${userTimezone}`);
        const data = await res.json();
        if (data.sections) setCuratedSections(data.sections);
      } catch (err) {
        console.error('Curated sections fetch failed:', err);
      } finally {
        setCuratedLoading(false);
      }
    };
    fetchCurated();
  }, [userTimezone]);

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

          // Skip notifications for own messages
          if (msg.user_id === currentUserRef.current?.user_id) return;

          // If chat tab is not visible, increment unread count + send notification
          if (!isChatVisibleRef.current) {
            setUnreadChatCount((prev) => prev + 1);

            // In-app toast notification (always works, no permission needed)
            if (chatToastTimerRef.current) clearTimeout(chatToastTimerRef.current);
            setChatToast({
              username: msg.username,
              message: msg.image_url ? '📷 Sent an image' : (msg.message.length > 60 ? msg.message.slice(0, 60) + '…' : msg.message),
              color: msg.avatar_color || '#6366f1',
            });
            chatToastTimerRef.current = setTimeout(() => setChatToast(null), 4000);

            // Browser notification (if permitted)
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              try {
                new Notification(`${msg.username}`, {
                  body: msg.message.length > 80 ? msg.message.slice(0, 80) + '…' : msg.message,
                  icon: '/favicon.ico',
                  tag: 'dropatrack-chat',
                  silent: false,
                });
              } catch { /* notification not supported */ }
            }
          }
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

  // ─── Chat: Upload image from clipboard paste ─────────────────────
  const handleImageUpload = useCallback(async (file: File) => {
    if (!currentUser || uploadingImage) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image too large (max 2MB)');
      return;
    }
    setUploadingImage(true);
    try {
      // Upload to Supabase Storage
      const formData = new FormData();
      formData.append('file', file);
      formData.append('room_id', room.id);
      const uploadRes = await fetch('/api/chat/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadData.url) throw new Error(uploadData.error || 'Upload failed');

      // Send as chat message
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: room.id,
          user_id: currentUser.user_id,
          username: currentUser.username,
          avatar_color: currentUser.avatar_color,
          message: '',
          image_url: uploadData.url,
        }),
      });
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploadingImage(false);
    }
  }, [currentUser, uploadingImage, room.id]);

  const handleChatPaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) handleImageUpload(file);
        return;
      }
    }
  }, [handleImageUpload]);

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="room-layout-wrapper">
      <div className="room-bg" />
      <div className={`app-card ${!isRightPanelOpen ? "rp-closed" : ""} mobile-tab-${mobileTab}`}>

        {/* ===== LEFT SIDEBAR ===== */}
        <aside className="sidebar" style={{ width: sidebarWidth }}>
          <div className="sidebar-resizer" onMouseDown={startResizing} />
          <div className="sb-logo">
            <span className="logo-text">Drop<span>A</span>Track</span>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="room-badge"><div className="ldot" />/{room.slug}</div>
              {myRole === 'admin' && (
                <button className="settings-gear" onClick={() => setShowSettings(true)} title="Room Settings">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" /></svg>
                </button>
              )}
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
                <div className="np-play-circle" onClick={canPlayPause ? handlePlayPause : undefined} style={!canPlayPause ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}>
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

          <div style={{ padding: '0 16px 12px' }}>
            <div className="search-bar" style={{ marginBottom: 0 }}>
              <span className="s-icon" style={{ top: '50%', transform: 'translateY(-50%)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
              </span>
              <input
                type="text"
                className="search-input"
                style={{ padding: '8px 10px 8px 34px', fontSize: '12px', width: '100%', borderRadius: '8px' }}
                placeholder="Find and scroll to song..."
                value={queueSearchQuery}
                onChange={(e) => setQueueSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchMatchIndices.length > 0) {
                    const nextIdx = (searchMatchCurrentIdx + 1) % searchMatchIndices.length;
                    setSearchMatchCurrentIdx(nextIdx);
                    const el = document.getElementById(`q-item-${searchMatchIndices[nextIdx]}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
              />
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

                const isMatch = searchMatchIndices.includes(index);
                const isActiveMatch = searchMatchIndices.length > 0 && searchMatchIndices[searchMatchCurrentIdx] === index;

                return (
                  <div
                    id={`q-item-${index}`}
                    key={item.id}
                    className={`q-item ${isPlaying ? 'playing' : ''} ${isPast ? 'past' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                    style={isMatch ? {
                      boxShadow: isActiveMatch ? '0 0 0 2px var(--accent-primary)' : '0 0 0 1px var(--theme-glass-border)',
                      backgroundColor: isActiveMatch ? 'var(--theme-hover-bg-strong)' : 'var(--theme-hover-bg)'
                    } : undefined}
                    onClick={() => canPlayPause ? handleJumpTo(index) : undefined}
                    draggable={canRearrange}
                    onDragStart={canRearrange ? () => handleDragStart(index) : undefined}
                    onDragOver={canRearrange ? (e) => handleDragOver(e, index) : undefined}
                    onDragLeave={canRearrange ? handleDragLeave : undefined}
                    onDrop={canRearrange ? () => handleDrop(index) : undefined}
                    onDragEnd={canRearrange ? () => { setDragOverIndex(null); dragItemRef.current = null; } : undefined}
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

                    {/* Actions for hovering */}
                    {canRearrange && !isPlaying && index !== (room.current_song_index ?? -1) + 1 && (
                      <div className="q-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                          onClick={(e) => moveSongToNext(e, index)}
                          style={{ padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, cursor: 'pointer', borderRadius: '4px', background: 'var(--theme-hover-bg)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--theme-hover-bg-strong)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = 'var(--theme-hover-bg)'; }}
                          title="Click to play next"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="19" x2="12" y2="5"></line>
                            <polyline points="5 12 12 5 19 12"></polyline>
                          </svg>
                        </div>
                        <div
                          onClick={(e) => { e.stopPropagation(); removeSong(item); }}
                          style={{ padding: '0 4px', fontSize: 14, opacity: 0.5, cursor: 'pointer' }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                          title="Remove from queue"
                        >
                          ×
                        </div>
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
                disabled={searching || addingUrl || !canAddSongs}
              />
              <button type="submit" className="search-btn" disabled={searching || !searchQuery.trim() || !canAddSongs}>
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
                        <div style={{ width: 84, height: 58, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                          <img src={result.thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="thumb" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--theme-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', marginTop: 4 }}>{result.channelTitle} · {formatDuration(result.durationSeconds)}</div>
                        </div>
                        {isAdded ? (
                          <div style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600 }}>Added</div>
                        ) : (
                          <div style={{ fontSize: 26, color: 'var(--theme-text-muted)' }}>+</div>
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

                {/* 1. 🚀 LATEST DROPS */}
                {!showAllPlaylists && !selectedPlaylist && (
                  <>
                    <div className="section-header" style={{ marginTop: 18 }}>
                      <span className="sec-title">Latest drops</span>
                      <span className="sec-see" onClick={() => fetchLatest()}>{latestLoading ? '...' : 'Refresh'}</span>
                    </div>
                    <div className="drops-row">
                      {latestLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="drop-card" style={{ height: 160 }}>
                            <div className="skeleton-box" style={{ width: '100%', height: '100%' }} />
                          </div>
                        ))
                      ) : (
                        latestVideos.map((video, index) => {
                          const isAdded = queuedVideoIds.has(video.id);
                          return (
                            <div key={video.id} className="drop-card" onClick={() => addSongToQueue(video.id, video.title, video.thumbnail, video.durationSeconds)}>
                              <div className="dc-thumb">
                                <img src={video.thumbnail} alt={video.title} />
                                <div className="dc-overlay" />
                                <div className="dc-badge">
                                  {index === 0 ? <span className="badge b-hot">ON TRENDING</span> : <span className="badge b-new">NEW</span>}
                                </div>
                                <div className={`dc-add ${isAdded ? 'added' : ''}`}>
                                  {isAdded ? (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                                  ) : (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                                  )}
                                </div>
                                <div className="dc-dur">{formatDuration(video.durationSeconds)}</div>
                              </div>
                              <div className="dc-info">
                                <div className="dc-title">{video.title}</div>
                                <div className="dc-meta">
                                  <span className="dc-channel">{video.channelTitle}</span>
                                  <span className="dc-views">{formatViewCount(video.viewCount)} views</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}

                {/* 🎵 Curated YouTube Music Sections (If Selected Playlist is Open) */}
                {selectedPlaylist ? (
                  <>
                    <div className="section-header" style={{ marginTop: 18 }}>
                      <span className="sec-title" style={{ cursor: 'pointer' }} onClick={() => setSelectedPlaylist(null)}>
                        ← {selectedPlaylist.title}
                      </span>
                      <span className="sec-see" onClick={() => setSelectedPlaylist(null)}>Back</span>
                    </div>
                    <div className="trend-list">
                      {playlistVideosLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="trend-row">
                            <div className="tr-rank" style={{ opacity: 0.3 }}>{i + 1}</div>
                            <div className="skeleton-box" style={{ width: 32, height: 32, borderRadius: 6, flexShrink: 0 }} />
                            <div className="tr-info">
                              <div className="skeleton-text" style={{ width: '70%', height: 10 }} />
                              <div className="skeleton-text" style={{ width: '50%', height: 8, marginTop: 4 }} />
                            </div>
                          </div>
                        ))
                      ) : (
                        playlistVideos.map((video, index) => {
                          const isAdded = queuedVideoIds.has(video.id);
                          return (
                            <div
                              key={video.id}
                              className={`trend-row ${isAdded ? 'trend-added' : ''}`}
                              onClick={() => addSongToQueue(video.id, video.title, video.thumbnail, video.durationSeconds)}
                            >
                              <div className="tr-rank" style={{ opacity: 0.4 }}>{index + 1}</div>
                              <div className="tr-av">
                                <img src={video.thumbnail} alt={video.title} />
                              </div>
                              <div className="tr-info">
                                <div className="tr-title">{video.title}</div>
                                <div className="tr-meta">{video.channelTitle} · {formatViewCount(video.viewCount)} views</div>
                              </div>
                              {isAdded ? (
                                <button className="tr-btn done">✓ Added</button>
                              ) : (
                                <button className="tr-btn add">+ Add</button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : showAllPlaylists ? (
                  <>
                    <div className="section-header" style={{ marginTop: 18 }}>
                      <span className="sec-title" style={{ cursor: 'pointer' }} onClick={() => setShowAllPlaylists(false)}>
                        ← All Curated Playlists
                      </span>
                      <span className="sec-see" onClick={() => setShowAllPlaylists(false)}>Back</span>
                    </div>
                    {curatedSections.map((section, sIdx) => (
                      <div key={sIdx} style={{ marginBottom: 20 }}>
                        <div className="section-header" style={{ marginTop: 12, marginBottom: 12 }}>
                          <span className="sec-title" style={{ fontSize: 13, color: 'var(--theme-text-primary)' }}>{section.title}</span>
                        </div>
                        <div className="mix-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                          {section.playlists.map((pl, idx) => {
                            const gradientColors = [
                              'linear-gradient(135deg, #f037a5, #880e4f)',
                              'linear-gradient(135deg, #1DB954, #127435)',
                              'linear-gradient(135deg, #ff9800, #e65100)',
                              'linear-gradient(135deg, #2979ff, #0d47a1)'
                            ];
                            const bgGradient = gradientColors[idx % 4];
                            return (
                              <div key={pl.id} className="mix-card" onClick={() => openPlaylist(pl.id, pl.title)}>
                                <div className="mix-bg" style={{ background: bgGradient }}>
                                  {pl.thumbnail ? <img src={pl.thumbnail} alt={pl.title} /> : section.emoji}
                                </div>
                                <div className="mix-overlay"></div>
                                <div className="mix-plus">+{pl.itemCount}</div>
                                <div className="mix-content">
                                  <div className="mix-label">{pl.title}</div>
                                  <div className="mix-count">{pl.itemCount} songs</div>
                                </div>
                                <div className="mix-play">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="lower-grid">
                    {/* 📈 Trending Now */}
                    <div>
                      <div className="section-header">
                        <span className="sec-title">Trending now</span>
                        <span className="sec-see" onClick={() => fetchTrending(userTimezone)}>{trendingLoading ? '...' : 'Refresh'}</span>
                      </div>
                      <div className="trend-list">
                        {trendingLoading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="trend-row">
                              <div className="tr-rank" style={{ opacity: 0.4 }}>{i + 1}</div>
                              <div className="skeleton-box" style={{ width: 32, height: 32, borderRadius: 6, flexShrink: 0 }} />
                              <div className="tr-info">
                                <div className="skeleton-text" style={{ width: '70%', height: 10 }} />
                                <div className="skeleton-text" style={{ width: '50%', height: 8, marginTop: 4 }} />
                              </div>
                            </div>
                          ))
                        ) : (
                          trendingVideos.map((video, index) => {
                            const isAdded = queuedVideoIds.has(video.id);
                            const rank = index + 1;
                            const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
                            return (
                              <div
                                key={video.id}
                                className={`trend-row ${isAdded ? 'trend-added' : ''}`}
                                onClick={() => addSongToQueue(video.id, video.title, video.thumbnail, video.durationSeconds)}
                              >
                                <div className={`tr-rank ${rankClass}`}>{rank}</div>
                                <div className="tr-av">
                                  <img src={video.thumbnail} alt={video.title} />
                                </div>
                                <div className="tr-info">
                                  <div className="tr-title">{video.title}</div>
                                  <div className="tr-meta">{video.channelTitle} · {formatViewCount(video.viewCount)} views</div>
                                </div>
                                {isAdded ? (
                                  <button className="tr-btn done">✓ Added</button>
                                ) : (
                                  <button className="tr-btn add">+ Add</button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* 🎵 Music Playlists — 2x2 grid */}
                    <div className="playlist-panel">
                      <div className="section-header">
                        <span className="sec-title">Music playlists</span>
                        <span className="sec-see" onClick={() => setShowAllPlaylists(true)}>See all</span>
                      </div>
                      <div className="mix-grid mix-grid-panel">
                        {curatedLoading ? (
                          Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="mix-card skeleton-box" style={{ borderRadius: 10 }} />
                          ))
                        ) : curatedSections.length > 0 ? (
                          curatedSections[0].playlists.slice(0, 4).map((pl, idx) => {
                            const gradientColors = [
                              'linear-gradient(135deg, #f037a5, #880e4f)',  // Pink/Purple
                              'linear-gradient(135deg, #1DB954, #127435)',  // Spotify Green
                              'linear-gradient(135deg, #ff9800, #e65100)',  // Energetic Orange
                              'linear-gradient(135deg, #2979ff, #0d47a1)'   // Ocean Blue
                            ];
                            const bgGradient = gradientColors[idx % 4];
                            return (
                              <div
                                key={pl.id}
                                className="mix-card mix-card-panel"
                                onClick={() => openPlaylist(pl.id, pl.title)}
                              >
                                <div className="mix-bg" style={{ background: bgGradient }}>
                                  {pl.thumbnail ? <img src={pl.thumbnail} alt={pl.title} /> : curatedSections[0].emoji}
                                </div>
                                <div className="mix-overlay"></div>
                                <div className="mix-plus">+{pl.itemCount}</div>
                                <div className="mix-content">
                                  <div className="mix-label">{pl.title}</div>
                                  <div className="mix-count">{pl.itemCount} songs</div>
                                </div>
                                <div className="mix-play">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                                </div>
                              </div>
                            );
                          })
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </main>

        {/* ===== RIGHT — Users + Chat ===== */}
        <aside className="right-panel">
          <div className="rp-tabs">
            <div className={`rp-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Users</div>
            <div className={`rp-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => { 
              setActiveTab('chat'); 
              setUnreadChatCount(0);
              if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                Notification.requestPermission().catch(() => {});
              }
            }}>Chat{unreadChatCount > 0 && <span className="chat-badge">{unreadChatCount > 99 ? '99+' : unreadChatCount}</span>}</div>
          </div>

          {/* Users Panel */}
          <div className={`users-panel ${activeTab !== 'users' ? 'hidden' : ''}`}>
            <div className="users-list">
              <div className="online-header">
                Online
                <span className="online-count">{users.length} {users.length === 1 ? 'listener' : 'listeners'}</span>
              </div>

              {users.map((user) => {
                const isMe = user.user_id === currentUser?.user_id;
                const isCreator = room.created_by === user.username;
                const displayRole = (room.user_roles && room.user_roles[user.user_id])
                  ? room.user_roles[user.user_id]
                  : (isCreator ? 'admin' : (room.default_role || user.role || 'dj'));

                const badgeClass = isMe ? 'badge-you'
                  : displayRole === 'admin' ? 'badge-admin'
                    : displayRole === 'moderator' ? 'badge-mod'
                      : 'badge-dj';

                const canChangeRole = myRole === 'admin' && !isMe && !isCreator;

                return (
                  <div key={user.user_id} className="user-item" style={{ position: 'relative' }}>
                    <div className="user-av" style={{ background: user.avatar_color }}>
                      <span>{user.username.charAt(0).toUpperCase()}</span>
                      <div className="av-dot" />
                    </div>
                    <div className="ui-info">
                      {isMe && editingUsername ? (
                        <div className="ui-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="text"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                handleUsernameChange();
                              }
                              if (e.key === 'Escape') {
                                e.stopPropagation();
                                setEditingUsername(false);
                                setNewUsername(currentUser?.username || '');
                              }
                            }}
                            autoFocus
                            style={{
                              width: '140px',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              border: '1px solid rgba(255,255,255,0.15)',
                              backgroundColor: 'rgba(0,0,0,0.2)',
                              color: 'inherit',
                              fontSize: '13px',
                              outline: 'none',
                              transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#1db954'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                          />
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUsernameChange(); }}
                              style={{
                                background: 'rgba(29,185,84,0.15)',
                                border: '1px solid rgba(29,185,84,0.3)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                color: '#1db954',
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '24px'
                              }}
                              title="Save"
                            >
                              ✔
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingUsername(false); setNewUsername(currentUser?.username || ''); }}
                              style={{
                                background: 'rgba(255,85,85,0.15)',
                                border: '1px solid rgba(255,85,85,0.3)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                color: '#ff5555',
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '24px'
                              }}
                              title="Cancel"
                            >
                              ✖
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="ui-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {user.username}
                          {isMe && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingUsername(true); setNewUsername(currentUser?.username || ''); }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                color: 'var(--theme-text-muted)',
                                display: 'inline-flex',
                                opacity: 0.5,
                                transition: 'opacity 0.2s, color 0.2s'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#1db954'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--theme-text-muted)'; }}
                              title="Edit Username"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                      <div className="ui-status">
                        {user.is_speaker ? '🔊 Speaker' : '🎧 Listening'}
                      </div>
                    </div>
                    <div
                      className={`ui-badge ${badgeClass} ${canChangeRole ? 'clickable' : ''}`}
                      onClick={canChangeRole ? (e) => { e.stopPropagation(); setRoleMenuUserId(roleMenuUserId === user.user_id ? null : user.user_id); } : undefined}
                      title={canChangeRole ? 'Click to change role' : undefined}
                    >
                      {isMe ? 'YOU' : (displayRole as string).toUpperCase()}
                    </div>
                    {roleMenuUserId === user.user_id && (
                      <div className="role-dropdown">
                        {(['admin', 'moderator', 'dj'] as UserRole[]).map(r => (
                          <div
                            key={r}
                            className={`role-dropdown-item ${displayRole === r ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); updateUserRole(user.user_id, r); }}
                          >
                            <span>{r === 'admin' ? '👑' : r === 'moderator' ? '🛡️' : '🎧'}</span>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
                        {msg.image_url && (
                          <div className="cm-image-wrap">
                            <img src={msg.image_url} alt="chat image" className="cm-image" loading="lazy" onClick={() => setPreviewImage(msg.image_url!)} />
                          </div>
                        )}
                        {msg.message && <div className={`cm-bubble ${isOwn ? 'own' : ''}`}>{msg.message}</div>}
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
            {uploadingImage && (
              <div className="cm-uploading">
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Uploading image…
              </div>
            )}
            <form className="chat-input-wrap" onSubmit={handleSendChat}>
              <input
                className="chat-input"
                type="text"
                placeholder={uploadingImage ? 'Uploading...' : 'Say something... (paste image)'}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onPaste={handleChatPaste}
                disabled={sendingChat || uploadingImage}
                maxLength={500}
              />
              <button className="send-btn" type="submit" disabled={sendingChat || uploadingImage || !chatInput.trim()}>
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
              <button className="ctrl" onClick={canPlayPause ? handlePrev : undefined} disabled={!canPlayPause || room.current_song_index <= 0} title="Previous" style={!canPlayPause ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
              </button>
              <button className="play-btn" onClick={canPlayPause ? handlePlayPause : undefined} style={!canPlayPause ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
                {room.is_playing ? (
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
              <button className="ctrl" onClick={canPlayPause ? handleNext : undefined} disabled={!canPlayPause || (!room.repeat && room.current_song_index >= queue.length - 1)} title="Next" style={!canPlayPause ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="m6 18 8.5-6L6 6v12zm2-8.14 4.96 3.14L8 16.14V9.86zM16 6h2v12h-2z" /></svg>
              </button>
              <button
                className={`ctrl ${room.repeat ? 'ctrl-active' : ''}`}
                title="Repeat"
                style={!canPlayPause ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
                onClick={canPlayPause ? () => {
                  const next = !room.repeat;
                  setRoom((prev) => ({ ...prev, repeat: next }));
                  // Persist to DB
                  supabase.from('rooms').update({ repeat: next }).eq('id', room.id).then();
                  // Broadcast to all clients
                  channelRef.current?.send({
                    type: 'broadcast',
                    event: 'repeat_toggle',
                    payload: { repeat: next },
                  });
                } : undefined}
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" /></svg>
              </button>
            </div>
            <div className="pb-progress">
              <span className="pb-time">{formatDuration(Math.floor(currentTime))}</span>
              <div
                className="pb-bar"
                style={{ cursor: 'pointer' }}
                onMouseDown={(e) => {
                  // Use actual player duration for speaker, fall back to metadata for remotes
                  const videoDuration = duration > 0 ? duration : (currentSong?.duration_seconds ?? 0);
                  if (videoDuration <= 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const percent = Math.max(0, Math.min(1, clickX / rect.width));
                  const seekTime = percent * videoDuration;

                  if (isSpeaker) {
                    // Speaker: seek directly and broadcast position to all remotes
                    if (!playerRef.current || !playerReady) return;
                    playerRef.current.seekTo(seekTime, true);
                    setCurrentTime(seekTime);
                    channelRef.current?.send({ type: 'broadcast', event: 'time_sync', payload: { time: seekTime } });
                  } else {
                    // Remote: optimistic local update + ask speaker to seek
                    setCurrentTime(seekTime);
                    channelRef.current?.send({ type: 'broadcast', event: 'seek_request', payload: { time: seekTime } });
                  }
                }}
              >
                <div className="pb-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="pb-time" style={{ textAlign: 'right' }}>{formatDuration(Math.floor(duration > 0 ? duration : (currentSong?.duration_seconds ?? 0)))}</span>
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
              <div className={`speaker-pill ${isSpeaker ? 'active' : ''}`} onClick={toggleSpeaker} title="Toggle Speaker Mode">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                {isSpeaker ? 'Speaker' : 'Remote'}
              </div>
            </div>
          </div>
        </div> {/* <-- CLOSE PLAYER-BAR BEFORE MOBILE-NAV */}

        {/* ===== MOBILE NAVIGATION BAR ===== */}
        <div className="mobile-nav">
          <button className={`mn-btn ${mobileTab === 'main' ? 'active' : ''}`} onClick={() => setMobileTab('main')}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
            <span>Home</span>
          </button>
          <button className={`mn-btn ${mobileTab === 'chat' ? 'active' : ''}`} onClick={() => { 
            setMobileTab('chat'); 
            setUnreadChatCount(0); 
            if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
              Notification.requestPermission().catch(() => {});
            }
          }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
            <span>Room</span>
            {unreadChatCount > 0 && <span className="chat-badge">{unreadChatCount > 99 ? '99+' : unreadChatCount}</span>}
          </button>
          <button className={`mn-btn ${mobileTab === 'queue' ? 'active' : ''}`} onClick={() => setMobileTab('queue')}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" /></svg>
            <span>Playlist</span>
          </button>
        </div>

      </div>

      {/* Room Settings Modal (Admin only) */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h3>⚙️ Room Settings</h3>
              <button onClick={() => setShowSettings(false)} className="ext-close-btn">✕</button>
            </div>
            <div className="settings-body">
              <div className="settings-group">
                <label className="settings-label">Default Role for New Users</label>
                <p className="settings-desc">Users joining the room will be assigned this role unless you set a specific role for them.</p>
                <div className="role-options">
                  {(['moderator', 'dj'] as UserRole[]).map(r => (
                    <button
                      key={r}
                      className={`role-option ${(room.default_role || 'dj') === r ? 'active' : ''}`}
                      onClick={() => updateDefaultRole(r)}
                    >
                      <span className="role-icon">{r === 'moderator' ? '🛡️' : '🎧'}</span>
                      <div className="role-option-text">
                        <span className="role-name">{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                        <span className="role-desc">
                          {r === 'moderator' ? 'Play/pause, rearrange & add songs'
                            : 'Add songs to queue only'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-group">
                <label className="settings-label">Permissions Matrix</label>
                <div className="perm-table">
                  <div className="perm-row perm-header">
                    <span></span><span>Add</span><span>Play</span><span>Reorder</span>
                  </div>
                  {(['admin', 'moderator', 'dj'] as UserRole[]).map(r => (
                    <div key={r} className="perm-row">
                      <span className="perm-role">{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                      <span>✅</span>
                      <span>{r === 'admin' || r === 'moderator' ? '✅' : '❌'}</span>
                      <span>{r === 'admin' || r === 'moderator' ? '✅' : '❌'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

            <div style={{ backgroundColor: '#2d1a1a', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', margin: '0px 0px 16px', color: '#fca5a5', fontSize: '13px' }}>
              <strong>⚠️ Peringatan Penting</strong><br />
              Jika kamu memiliki feedback atau menemukan bug, silakan perbaiki sendiri. Kami open-source!<br />
              Kunjungi repo GitHub kami: <a href="https://github.com/ahmadyoga/dropatrack" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: '#f87171', fontWeight: 'bold' }}>GitHub DropATrack</a>.<br /><br />
              <em>"tidak menerima wong ruwet, gaweo dewe bug/feature,e"</em>
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


      {/* In-App Chat Toast */}
      {chatToast && (
        <div
          className="chat-toast"
          onClick={() => {
            setChatToast(null);
            setUnreadChatCount(0);
            // Open chat on both desktop and mobile
            setActiveTab('chat');
            setMobileTab('chat');
          }}
        >
          <div className="chat-toast-avatar" style={{ background: chatToast.color }}>
            {chatToast.username.charAt(0).toUpperCase()}
          </div>
          <div className="chat-toast-body">
            <div className="chat-toast-name">{chatToast.username}</div>
            <div className="chat-toast-msg">{chatToast.message}</div>
          </div>
          <button className="chat-toast-close" onClick={(e) => { e.stopPropagation(); setChatToast(null); }}>✕</button>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-all font-bold text-xl"
            onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
