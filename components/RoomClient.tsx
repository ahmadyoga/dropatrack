'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/names';
import { useAntiDebug } from '@/lib/antiDebug';
import UsernameModal from '@/components/UsernameModal';
import type { Room, QueueItem, UserRole } from '@/lib/types';
import type { YTPlayer } from './room/hooks/useYouTubePlayer';
import { electTimeSource, type PlaybackAnchor } from '@/lib/playbackSync';
import { usePlaybackSync } from './room/hooks/usePlaybackSync';
import { setTime as setStoreTime } from './room/playbackTimeStore';
import { useTheme } from './ThemeProvider';

// Hooks
import { useIdentity } from './room/hooks/useIdentity';
import { useRoomSync } from './room/hooks/useRoomSync';
import { useYouTubePlayer } from './room/hooks/useYouTubePlayer';
import { usePlayback } from './room/hooks/usePlayback';
import { useQueue } from './room/hooks/useQueue';
import { useAutoSuggest } from './room/hooks/useAutoSuggest';
import { useDiscovery } from './room/hooks/useDiscovery';
import { useChat } from './room/hooks/useChat';

// Context
import { RoomProvider } from './room/RoomContext';

// New components
import Header from './room/Header';
import Player from './room/Player';
import ReactionBar from './room/ReactionBar';
import CrewStrip from './room/CrewStrip';
import Queue from './room/Queue';
import Discover from './room/Discover';
import Chat from './room/Chat';
import MobileNav from './room/MobileNav';
import StarField from './room/ui/StarField';
import SettingsModal from './room/modals/SettingsModal';
import ImagePreviewModal from './room/modals/ImagePreviewModal';

function detectTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta'; }
  catch { return 'Asia/Jakarta'; }
}

interface RoomClientProps {
  initialRoom: Room;
  initialQueue: QueueItem[];
}

type MobileTab = 'player' | 'queue' | 'discover' | 'chat';

export default function RoomClient({ initialRoom, initialQueue }: RoomClientProps) {
  useAntiDebug();

  const { theme, toggleTheme } = useTheme();

  const [usernameState, setUsernameState] = useState<'loading' | 'modal' | 'ready'>('loading');
  const [defaultUsername, setDefaultUsername] = useState('');

  useEffect(() => {
    const user = getOrCreateUser();
    if (user?.is_default_username) {
      setDefaultUsername(user.username);
      setUsernameState('modal');
    } else {
      setUsernameState('ready');
    }
  }, []);

  const [room, setRoom] = useState<Room>(initialRoom);
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [mobileTab, setMobileTab] = useState<MobileTab>('player');
  const [isMobile, setIsMobile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [userTimezone] = useState(() => detectTimezone());

  // Shared refs
  const playerRef = useRef<YTPlayer | null>(null);
  const roomRef = useRef(initialRoom);
  const queueRef = useRef(initialQueue);
  const isSpeakerRef = useRef(false);
  const anchorRef = useRef<PlaybackAnchor>({
    base: initialRoom.current_playback_time || 0,
    receivedAt: 0,
    isPlaying: false,
  });
  const isSourceRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const isLoadingVideoRef = useRef(false);
  const handleNextRef = useRef<() => void>(() => {});
  const isChatVisibleRef = useRef(false);
  const playerContainerRef = useRef<HTMLDivElement>(null!);

  // Stable broadcast ref — populated after useRoomSync runs
  const broadcastRef = useRef<(event: string, payload: Record<string, unknown>) => void>(() => {});
  // Stable addSongToQueue ref — populated after useQueue runs
  const addSongRef = useRef<(id: string, title: string, thumb: string, dur: number) => Promise<void>>(async () => {});

  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  useEffect(() => { isChatVisibleRef.current = mobileTab === 'chat'; }, [mobileTab]);

  // ── Identity (uses broadcastRef so it can run before useRoomSync) ─────────
  const {
    currentUser, setCurrentUser, currentUserRef, myRole, myRoleRef,
    handleUsernameChange, renameSelf,
  } = useIdentity({
    initialRoom, room,
    broadcast: (e, p) => broadcastRef.current(e, p),
    onShowExtensionPopup: () => {},
    onUpdateUserRole: async (userId, newRole) => updateUserRole(userId, newRole),
  });

  // ── YouTube player ────────────────────────────────────────────────────────
  const {
    isSpeaker, toggleSpeaker, playerReady, playerReadyRef,
    duration, showPlayerOverlay, setShowPlayerOverlay, overlayTimerRef,
  } = useYouTubePlayer({
    room, roomRef,
    currentSong: queue[room.current_song_index] || null,
    isSpeakerRef, handleNextRef, isTransitioningRef, isLoadingVideoRef,
    playerRef, anchorRef,
  });
  useEffect(() => { isSpeakerRef.current = isSpeaker; }, [isSpeaker]);

  // ── Chat (before useRoomSync to provide setChatMessages) ──────────────────
  const {
    chatMessages, setChatMessages, chatInput, setChatInput,
    sendingChat, uploadingImage, unreadChatCount, setUnreadChatCount,
    chatToast, setChatToast,
    chatEndRef, handleSendChat, uploadImage,
  } = useChat({
    roomId: initialRoom.id, currentUser, currentUserRef,
    addSongToQueue: (id, title, thumb, dur) => addSongRef.current(id, title, thumb, dur),
    isChatVisibleRef,
  });

  // ── Realtime sync ─────────────────────────────────────────────────────────
  const { users, broadcast } = useRoomSync({
    initialRoom, currentUser, myRoleRef, isSpeakerRef,
    playerRef: playerRef as React.RefObject<unknown>,
    playerReadyRef, handleNextRef,
    setRoom, setQueue, setCurrentUser, setChatMessages,
    currentUserRef, isChatVisibleRef,
    isSpeaker, myRole, room,
  });

  // Sync broadcast to ref immediately (safe — refs don't trigger re-renders)
  broadcastRef.current = broadcast;

  // ── Playback ──────────────────────────────────────────────────────────────
  const { broadcastPlayback, handlePlayPause, handleNext, handlePrev, handleJumpTo } = usePlayback({
    room, roomRef, queueRef, isSpeaker, isSpeakerRef,
    playerRef, playerReadyRef, broadcast, currentUser,
    isTransitioningRef, isLoadingVideoRef, handleNextRef, setRoom, queue,
  });
  useEffect(() => { handleNextRef.current = handleNext; }, [handleNext]);

  // ── Time-level playback sync ──────────────────────────────────────────────
  usePlaybackSync({ room, roomRef, isSpeaker, playerRef, playerReadyRef, isSourceRef, anchorRef });

  // ── Auto-suggestion ───────────────────────────────────────────────────────
  useAutoSuggest({ room, queue, roomRef, queueRef, isSourceRef });

  // ── Queue ─────────────────────────────────────────────────────────────────
  const {
    searching, searchQuery, setSearchQuery, searchResults, setSearchResults,
    nextPageToken, loadingMore, addingUrl, shuffling, dragOverIndex,
    queueSearchQuery, setQueueSearchQuery, searchMatchIndices, searchMatchCurrentIdx, setSearchMatchCurrentIdx,
    handleSearch, handleLoadMore, addSongToQueue, removeSong, handleShuffle,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop, moveSongToNext,
  } = useQueue({
    room, roomRef, queue, queueRef, setQueue, setRoom, currentUser,
    canAddSongs: true,
    canPlayPause: myRole === 'admin' || myRole === 'moderator',
    broadcast, broadcastPlayback,
  });
  addSongRef.current = addSongToQueue;

  // ── Discovery ─────────────────────────────────────────────────────────────
  const {
    trendingVideos, latestVideos, freshVideos,
    trendingLoading, latestLoading, freshLoading,
    fetchTrending,
  } = useDiscovery({ userTimezone });

  // ── Role + privacy callbacks ──────────────────────────────────────────────
  const updateUserRole = useCallback(async (userId: string, newRole: UserRole) => {
    const updatedRoles = { ...(room.user_roles || {}), [userId]: newRole };
    setRoom((prev) => ({ ...prev, user_roles: updatedRoles }));
    await supabase.from('rooms').update({ user_roles: updatedRoles }).eq('id', room.id);
    broadcast('role_update', { default_role: room.default_role, user_roles: updatedRoles });
  }, [room.id, room.user_roles, room.default_role, broadcast]);

  const updateDefaultRole = useCallback(async (newRole: UserRole) => {
    setRoom((prev) => ({ ...prev, default_role: newRole }));
    await supabase.from('rooms').update({ default_role: newRole }).eq('id', room.id);
    broadcast('role_update', { default_role: newRole, user_roles: room.user_roles });
  }, [room.id, room.user_roles, broadcast]);

  const updatePrivacy = useCallback(async (isPrivate: boolean) => {
    setRoom((prev) => ({ ...prev, is_public: !isPrivate }));
    await supabase.from('rooms').update({ is_public: !isPrivate }).eq('id', room.id);
    broadcast('role_update', { default_role: room.default_role, user_roles: room.user_roles });
  }, [room.id, room.default_role, room.user_roles, broadcast]);

  // ── Time source election ──────────────────────────────────────────────────
  useEffect(() => {
    const sourceId = electTimeSource(users);
    isSourceRef.current = !!currentUser && currentUser.user_id === sourceId;
  }, [users, currentUser?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Volume + seek ─────────────────────────────────────────────────────────
  const handleVolumeChange = useCallback((v: number) => {
    const db = Math.round(v * 100);
    setRoom((prev) => ({ ...prev, volume: db }));
    broadcast('volume_change', { volume: db });
    supabase.from('rooms').update({ volume: db }).eq('id', initialRoom.id).then(() => {});
  }, [broadcast, initialRoom.id]);

  const handleToggleRepeat = useCallback(() => {
    const next = !room.repeat;
    setRoom((prev) => ({ ...prev, repeat: next }));
    broadcast('repeat_toggle', { repeat: next });
    supabase.from('rooms').update({ repeat: next }).eq('id', initialRoom.id).then(() => {});
  }, [room.repeat, broadcast, initialRoom.id]);

  const handleToggleAutoSuggest = useCallback(() => {
    const next = !room.auto_suggest;
    setRoom((prev) => ({ ...prev, auto_suggest: next }));
    broadcast('auto_suggest_toggle', { auto_suggest: next });
    supabase.from('rooms').update({ auto_suggest: next }).eq('id', initialRoom.id).then(() => {});
  }, [room.auto_suggest, broadcast, initialRoom.id]);

  const handleSeek = useCallback((t: number) => {
    setStoreTime(t);
    broadcast('seek_request', { time: t });
    supabase.from('rooms').update({
      current_playback_time: t,
      playback_updated_at: new Date().toISOString(),
    }).eq('id', initialRoom.id).then(() => {});
  }, [broadcast, initialRoom.id]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentSong = queue[room.current_song_index] || null;
  const canPlayPause = myRole === 'admin' || myRole === 'moderator';
  const canSeek = myRole === 'admin' || myRole === 'moderator';
  const canVolume = myRole === 'admin' || myRole === 'moderator';
  const canRearrange = myRole === 'admin' || myRole === 'moderator';
  const canAutoSuggest = myRole === 'admin' || myRole === 'moderator';
  const queuedVideoIds = useMemo(() => new Set(queue.map((q) => q.youtube_id)), [queue]);

  const leave = useCallback(() => { window.location.href = '/'; }, []);

  const handleChatTabSwitch = (tab: MobileTab) => {
    setMobileTab(tab);
    if (tab === 'chat') setUnreadChatCount(0);
  };

  // ── Context value ─────────────────────────────────────────────────────────
  const contextValue = {
    room, queue, users, currentUser, myRole, currentSong,
    canPlayPause, canSeek, canVolume, canRearrange, canAutoSuggest, isSpeaker, duration,
    broadcast, theme, toggleTheme,
  };

  // Shared Queue props (used in both desktop and mobile)
  const queueProps = {
    queueSearchQuery, setQueueSearchQuery,
    searchMatchIndices, searchMatchCurrentIdx, setSearchMatchCurrentIdx,
    shuffling, dragOverIndex,
    onJumpTo: handleJumpTo,
    onRemoveSong: removeSong,
    onMoveSongToNext: (e: React.MouseEvent, sourceIndex: number) => moveSongToNext(e, sourceIndex),
    onShuffle: handleShuffle,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onAdd: addSongToQueue,
    onToggleRepeat: handleToggleRepeat,
    onToggleAutoSuggest: handleToggleAutoSuggest,
  };

  const playerProps = {
    playerRef, playerContainerRef, playerReady,
    showPlayerOverlay, setShowPlayerOverlay, overlayTimerRef,
    isSpeaker,
    onPlayPause: handlePlayPause,
    onNext: handleNext,
    onPrev: handlePrev,
    onShuffle: handleShuffle,
    onToggleSpeaker: toggleSpeaker,
    onSeek: handleSeek,
    volume: (room.volume ?? 80) / 100,
    onVolumeChange: handleVolumeChange,
  };

  const discoverProps = {
    searching, searchQuery, setSearchQuery,
    searchResults, nextPageToken, loadingMore, addingUrl,
    trendingVideos, latestVideos, freshVideos,
    trendingLoading, latestLoading, freshLoading,
    onSearch: handleSearch,
    onLoadMore: handleLoadMore,
    onAddSong: addSongToQueue,
    queuedVideoIds,
  };

  const chatProps = {
    chatMessages, chatInput, setChatInput,
    sendingChat, uploadingImage, unreadChatCount,
    chatEndRef,
    onSendChat: handleSendChat,
    onUploadImage: uploadImage,
    onAddSongFromChat: (youtubeId: string, title: string, artist: string, duration: string) =>
      addSongToQueue(youtubeId, title, '', 0),
    onPreviewImage: setPreviewImage,
    onSeen: () => setUnreadChatCount(0),
  };

  if (usernameState === 'loading') {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div className="live-dot" style={{ width: 14, height: 14 }} />
      </div>
    );
  }

  if (usernameState === 'modal') {
    return (
      <UsernameModal
        currentName={defaultUsername}
        onConfirm={(updatedUser) => {
          setCurrentUser(updatedUser);
          setUsernameState('ready');
        }}
        onSkip={() => setUsernameState('ready')}
      />
    );
  }

  return (
    <RoomProvider value={contextValue}>
      <div style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column', zIndex: 1 }}>
        <div className="cosmos-bg" />
        <StarField n={24} seed={initialRoom.slug.length + 3} />

        <div
          style={{
            flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
            padding: isMobile ? '16px 14px 92px' : '20px 22px 22px',
            overflow: isMobile ? 'auto' : 'hidden',
            position: 'relative',
          }}
        >
          <Header onLeave={leave} onOpenSettings={() => setShowSettings(true)} canOpenSettings={myRole === 'admin'} />

          {!isMobile ? (
            <div
              style={{
                flex: 1, minHeight: 0,
                display: 'grid',
                gridTemplateColumns: 'minmax(320px, 1.1fr) minmax(300px, 1fr) minmax(330px, 1.12fr)',
                gap: 18,
              }}
            >
              {/* Left col: Player + ReactionBar + Discover */}
              <div className="col noscb" style={{ gap: 14, minHeight: 0, overflowY: 'auto', padding: '2px 10px 10px 2px' }}>
                <Player {...playerProps} />
                <ReactionBar />
                <Discover {...discoverProps} />
              </div>

              {/* Mid col: Queue */}
              <div className="col" style={{ minHeight: 0 }}>
                <Queue {...queueProps} />
              </div>

              {/* Right col: CrewStrip + Chat */}
              <div className="col" style={{ minHeight: 0, gap: 14 }}>
                <CrewStrip onUpdateUserRole={updateUserRole} onRenameMe={renameSelf} />
                <Chat {...chatProps} />
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {mobileTab === 'player' && (
                <div className="col" style={{ gap: 14 }}>
                  <Player {...playerProps} />
                  <ReactionBar />
                </div>
              )}
              {mobileTab === 'queue' && (
                <div style={{ display: 'flex', minHeight: 460, flex: 1 }}>
                  <Queue {...queueProps} />
                </div>
              )}
              {mobileTab === 'discover' && (
                <div style={{ display: 'flex', minHeight: 460, flex: 1 }}>
                  <Discover {...discoverProps} />
                </div>
              )}
              {mobileTab === 'chat' && (
                <div style={{ display: 'flex', minHeight: 520, flex: 1 }}>
                  <Chat {...chatProps} />
                </div>
              )}
            </div>
          )}
        </div>

        {isMobile && (
          <MobileNav
            activeTab={mobileTab}
            setActiveTab={handleChatTabSwitch}
            unreadChatCount={unreadChatCount}
          />
        )}

        {showSettings && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
            onUpdateDefaultRole={updateDefaultRole}
            onUpdatePrivacy={updatePrivacy}
          />
        )}
        {previewImage && (
          <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
        )}

        {/* Chat toast */}
        {chatToast && (
          <div
            className="pop wobble popin"
            style={{
              position: 'fixed', bottom: isMobile ? 80 : 20, right: 20, zIndex: 250,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', cursor: 'pointer', maxWidth: 300,
            }}
            onClick={() => {
              setChatToast(null);
              setUnreadChatCount(0);
              handleChatTabSwitch('chat');
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: chatToast.color, border: '2px solid var(--outline)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: '#140f1f', fontSize: 14,
            }}>
              {chatToast.username.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{chatToast.username}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {chatToast.message}
              </div>
            </div>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-dim)', flexShrink: 0 }}
              onClick={(e) => { e.stopPropagation(); setChatToast(null); }}
            >✕</button>
          </div>
        )}
      </div>
    </RoomProvider>
  );
}
