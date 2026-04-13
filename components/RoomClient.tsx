'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAntiDebug } from '@/lib/antiDebug';
import type { Room, QueueItem, UserRole } from '@/lib/types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { YTPlayer } from './room/hooks/useYouTubePlayer';
import '@/app/room.css';
import '@/app/room/_mobile.css';

// Hooks
import { useIdentity } from './room/hooks/useIdentity';
import { useRoomSync } from './room/hooks/useRoomSync';
import { useYouTubePlayer } from './room/hooks/useYouTubePlayer';
import { usePlayback } from './room/hooks/usePlayback';
import { useQueue } from './room/hooks/useQueue';
import { useDiscovery } from './room/hooks/useDiscovery';
import { useChat } from './room/hooks/useChat';

// Components
import Sidebar from './room/Sidebar';
import Discovery from './room/Discovery';
import RightPanel from './room/RightPanel';
import PlayerBar from './room/PlayerBar';
import MobileNav from './room/MobileNav';
import SettingsModal from './room/modals/SettingsModal';
import ExtensionPopup from './room/modals/ExtensionPopup';
import ImagePreviewModal from './room/modals/ImagePreviewModal';

function detectTimezone(): string {
  if (typeof Intl !== 'undefined') {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) return tz;
    } catch { /* fallback */ }
  }
  return 'Asia/Jakarta';
}

interface RoomClientProps {
  initialRoom: Room;
  initialQueue: QueueItem[];
}

export default function RoomClient({ initialRoom, initialQueue }: RoomClientProps) {
  useAntiDebug();

  // ── Shared state ───────────────────────────────────────────────────
  const [room, setRoom] = useState<Room>(initialRoom);
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [activeTab, setActiveTab] = useState<'users' | 'chat'>('users');
  const [mobileTab, setMobileTab] = useState<'main' | 'queue' | 'chat'>('main');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExtensionPopup, setShowExtensionPopup] = useState(false);
  const [roleMenuUserId, setRoleMenuUserId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isMobile, setIsMobile] = useState(false);
  const [userTimezone] = useState(() => detectTimezone());

  // ── Shared refs (created here, passed into hooks) ──────────────────
  const channelRef = useRef<RealtimeChannel | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const roomRef = useRef(initialRoom);
  const queueRef = useRef(initialQueue);
  const isSpeakerRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const isLoadingVideoRef = useRef(false);
  const handleNextRef = useRef<() => void>(() => { });
  const isChatVisibleRef = useRef(false);
  const playerContainerRef = useRef<HTMLDivElement>(null!);
  const isResizingRef = useRef(false);

  // Keep core refs in sync
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  useEffect(() => {
    isChatVisibleRef.current = activeTab === 'chat' || mobileTab === 'chat';
  }, [activeTab, mobileTab]);

  // ── Admin: update default role ────────────────────────────────────
  const updateDefaultRole = useCallback(async (newRole: UserRole) => {
    setRoom(prev => ({ ...prev, default_role: newRole }));
    await supabase.from('rooms').update({ default_role: newRole }).eq('id', room.id);
    channelRef.current?.send({ type: 'broadcast', event: 'role_update', payload: { default_role: newRole, user_roles: room.user_roles } });
  }, [room.id, room.user_roles]);

  // ── Admin: update a specific user's role ─────────────────────────
  const updateUserRole = useCallback(async (userId: string, newRole: UserRole) => {
    const updatedRoles = { ...(room.user_roles || {}), [userId]: newRole };
    setRoom(prev => ({ ...prev, user_roles: updatedRoles }));
    await supabase.from('rooms').update({ user_roles: updatedRoles }).eq('id', room.id);
    channelRef.current?.send({ type: 'broadcast', event: 'role_update', payload: { default_role: room.default_role, user_roles: updatedRoles } });
    setRoleMenuUserId(null);
  }, [room.id, room.user_roles, room.default_role]);

  // ── Identity hook ─────────────────────────────────────────────────
  const {
    currentUser, setCurrentUser, currentUserRef, myRole, myRoleRef,
    editingUsername, setEditingUsername, newUsername, setNewUsername, handleUsernameChange,
  } = useIdentity({
    initialRoom,
    room,
    channelRef,
    onShowExtensionPopup: () => setShowExtensionPopup(true),
    onUpdateUserRole: updateUserRole,
  });

  // ── YouTube Player hook ───────────────────────────────────────────
  const {
    isSpeaker, toggleSpeaker, playerReady, playerReadyRef,
    currentTime, setCurrentTime, duration, showPlayerOverlay, setShowPlayerOverlay, overlayTimerRef,
  } = useYouTubePlayer({
    room,
    roomRef,
    currentSong: queue[room.current_song_index] || null,
    isSpeakerRef,
    handleNextRef,
    isTransitioningRef,
    isLoadingVideoRef,
    playerRef,
  });

  // Keep isSpeakerRef in sync
  useEffect(() => { isSpeakerRef.current = isSpeaker; }, [isSpeaker]);

  // ── Playback hook ─────────────────────────────────────────────────
  const { broadcastPlayback, handlePlayPause, handleNext, handlePrev, handleJumpTo } = usePlayback({
    room,
    roomRef,
    queueRef,
    currentSong: queue[room.current_song_index] || null,
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
  });

  // ── Queue hook ────────────────────────────────────────────────────
  const {
    searching, searchQuery, setSearchQuery, searchResults, setSearchResults,
    nextPageToken, loadingMore, addingUrl, shuffling, dragOverIndex,
    queueSearchQuery, setQueueSearchQuery, searchMatchIndices, searchMatchCurrentIdx, setSearchMatchCurrentIdx,
    handleSearch, handleLoadMore, addSongToQueue, removeSong, handleShuffle,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop, moveSongToNext,
  } = useQueue({
    room,
    roomRef,
    queue,
    queueRef,
    setQueue,
    setRoom,
    currentUser,
    canAddSongs: true,
    canPlayPause: myRole === 'admin' || myRole === 'moderator',
    channelRef,
    broadcastPlayback,
  });

  // ── Discovery hook ────────────────────────────────────────────────
  const {
    trendingVideos, latestVideos, trendingLoading, latestLoading,
    curatedSections, curatedLoading, selectedPlaylist, setSelectedPlaylist,
    playlistVideos, playlistVideosLoading, showAllPlaylists, setShowAllPlaylists,
    fetchTrending, fetchLatest, openPlaylist,
  } = useDiscovery({ userTimezone });

  // ── Chat hook ─────────────────────────────────────────────────────
  const {
    chatMessages, setChatMessages, chatInput, setChatInput, sendingChat, uploadingImage,
    unreadChatCount, setUnreadChatCount, chatToast, setChatToast,
    previewImage, setPreviewImage, chatEndRef,
    handleSendChat, handleImageUpload, handleChatPaste,
  } = useChat({
    roomId: initialRoom.id,
    currentUser,
    currentUserRef,
    addSongToQueue,
    isChatVisibleRef,
  });

  // ── Realtime sync hook ────────────────────────────────────────────
  const { users } = useRoomSync({
    initialRoom,
    currentUser,
    myRoleRef,
    isSpeakerRef,
    playerRef: playerRef as React.RefObject<unknown>,
    playerReadyRef,
    handleNextRef,
    setRoom,
    setQueue,
    setCurrentTime,
    setCurrentUser,
    setChatMessages,
    currentUserRef,
    isChatVisibleRef,
    channelRef,
    isSpeaker,
    myRole,
    room,
  });

  // ── Derived values ────────────────────────────────────────────────
  const currentSong = queue[room.current_song_index] || null;
  const canPlayPause = myRole === 'admin' || myRole === 'moderator';
  const canRearrange = myRole === 'admin' || myRole === 'moderator';
  const queuedVideoIds = new Set(queue.map((q) => q.youtube_id));
  const effectiveDuration = duration > 0 ? duration : (currentSong?.duration_seconds ?? 0);
  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  // ── Sidebar resizer ───────────────────────────────────────────────
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      let w = e.clientX;
      if (w < 250) w = 250;
      if (w > 450) w = 450;
      setSidebarWidth(w);
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

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="room-layout-wrapper">
      <div
        className="room-bg"
        style={currentSong?.thumbnail_url ? { backgroundImage: `url(${currentSong.thumbnail_url})` } : undefined}
      />
      <div className={`app-card ${!isRightPanelOpen ? 'rp-closed' : ''} mobile-tab-${mobileTab}`}>

        <Sidebar
          room={room}
          queue={queue}
          currentSong={currentSong}
          myRole={myRole}
          isSpeaker={isSpeaker}
          playerReady={playerReady}
          sidebarWidth={isMobile ? undefined : sidebarWidth}
          canPlayPause={canPlayPause}
          canRearrange={canRearrange}
          showPlayerOverlay={showPlayerOverlay}
          progressPercent={progressPercent}
          currentTime={currentTime}
          playerRef={playerRef}
          playerContainerRef={playerContainerRef}
          overlayTimerRef={overlayTimerRef}
          queueSearchQuery={queueSearchQuery}
          setQueueSearchQuery={setQueueSearchQuery}
          searchMatchIndices={searchMatchIndices}
          searchMatchCurrentIdx={searchMatchCurrentIdx}
          setSearchMatchCurrentIdx={setSearchMatchCurrentIdx}
          shuffling={shuffling}
          dragOverIndex={dragOverIndex}
          onPlayPause={handlePlayPause}
          onNext={handleNext}
          onPrev={handlePrev}
          onJumpTo={handleJumpTo}
          onRemoveSong={removeSong}
          onMoveToNext={moveSongToNext}
          onShuffle={handleShuffle}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          setShowSettings={setShowSettings}
          setShowPlayerOverlay={setShowPlayerOverlay}
          startResizing={startResizing}
        />

        <div className="main-col">
          <Discovery
            users={users}
            queuedVideoIds={queuedVideoIds}
            searching={searching}
            addingUrl={addingUrl}
            canAddSongs={true}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            setSearchResults={setSearchResults}
            nextPageToken={nextPageToken}
            loadingMore={loadingMore}
            latestVideos={latestVideos}
            latestLoading={latestLoading}
            trendingVideos={trendingVideos}
            trendingLoading={trendingLoading}
            curatedSections={curatedSections}
            curatedLoading={curatedLoading}
            selectedPlaylist={selectedPlaylist}
            setSelectedPlaylist={setSelectedPlaylist}
            playlistVideos={playlistVideos}
            playlistVideosLoading={playlistVideosLoading}
            showAllPlaylists={showAllPlaylists}
            setShowAllPlaylists={setShowAllPlaylists}
            onSearch={handleSearch}
            onLoadMore={handleLoadMore}
            onAddSong={addSongToQueue}
            onOpenPlaylist={openPlaylist}
            onRefreshTrending={() => fetchTrending(userTimezone)}
            onRefreshLatest={fetchLatest}
          />


          <PlayerBar
            room={room}
            queue={queue}
            currentSong={currentSong}
            isSpeaker={isSpeaker}
            canPlayPause={canPlayPause}
            currentTime={currentTime}
            duration={duration}
            progressPercent={progressPercent}
            isRightPanelOpen={isRightPanelOpen}
            setIsRightPanelOpen={setIsRightPanelOpen}
            playerRef={playerRef}
            playerReady={playerReady}
            channelRef={channelRef}
            setRoom={setRoom}
            setCurrentTime={setCurrentTime}
            onPlayPause={handlePlayPause}
            onNext={handleNext}
            onPrev={handlePrev}
            onToggleSpeaker={toggleSpeaker}
          />
        </div>

        <RightPanel
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unreadChatCount={unreadChatCount}
          setUnreadChatCount={setUnreadChatCount}
          users={users}
          currentUser={currentUser}
          room={room}
          myRole={myRole}
          editingUsername={editingUsername}
          newUsername={newUsername}
          setNewUsername={setNewUsername}
          setEditingUsername={setEditingUsername}
          roleMenuUserId={roleMenuUserId}
          setRoleMenuUserId={setRoleMenuUserId}
          onUsernameChange={handleUsernameChange}
          onUpdateUserRole={updateUserRole}
          chatMessages={chatMessages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          sendingChat={sendingChat}
          uploadingImage={uploadingImage}
          chatEndRef={chatEndRef}
          onSendChat={handleSendChat}
          onChatPaste={handleChatPaste}
          onAddSongFromChat={(youtubeId, title, _artist, _duration) => addSongToQueue(youtubeId, title, '', 0)}
          onPreviewImage={setPreviewImage}
        />
        <MobileNav
          mobileTab={mobileTab}
          setMobileTab={setMobileTab}
          unreadChatCount={unreadChatCount}
          setUnreadChatCount={setUnreadChatCount}
        />
      </div>

      {/* Modals */}
      {showSettings && (
        <SettingsModal
          room={room}
          onClose={() => setShowSettings(false)}
          onUpdateDefaultRole={updateDefaultRole}
        />
      )}
      {showExtensionPopup && <ExtensionPopup onClose={() => setShowExtensionPopup(false)} />}
      {previewImage && <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}

      {/* In-App Chat Toast */}
      {chatToast && (
        <div
          className="chat-toast"
          onClick={() => {
            setChatToast(null);
            setUnreadChatCount(0);
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
    </div>
  );
}
