'use client';

import ThemeToggle from '@/components/ThemeToggle';
import QueueList from './QueueList';
import type { Room, QueueItem, UserRole } from '@/lib/types';
import type { YTPlayer } from './hooks/useYouTubePlayer';
import { formatDuration } from '@/lib/youtube';

interface SidebarProps {
  room: Room;
  queue: QueueItem[];
  currentSong: QueueItem | null;
  myRole: UserRole;
  isSpeaker: boolean;
  playerReady: boolean;
  sidebarWidth?: number;
  canPlayPause: boolean;
  canRearrange: boolean;
  showPlayerOverlay: boolean;
  progressPercent: number;
  currentTime: number;
  playerRef: React.RefObject<YTPlayer | null>;
  playerContainerRef: React.RefObject<HTMLDivElement>;
  overlayTimerRef: React.RefObject<ReturnType<typeof setTimeout> | null>;
  queueSearchQuery: string;
  setQueueSearchQuery: (q: string) => void;
  searchMatchIndices: number[];
  searchMatchCurrentIdx: number;
  setSearchMatchCurrentIdx: (idx: number) => void;
  shuffling: boolean;
  dragOverIndex: number | null;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onJumpTo: (index: number) => void;
  onRemoveSong: (item: QueueItem) => void;
  onMoveToNext: (e: React.MouseEvent, sourceIndex: number) => void;
  onShuffle: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (index: number) => void;
  setShowSettings: (v: boolean) => void;
  setShowPlayerOverlay: (v: boolean) => void;
  startResizing: (e: React.MouseEvent) => void;
}

export default function Sidebar({
  room, queue, currentSong, myRole, isSpeaker, playerReady, sidebarWidth,
  canPlayPause, canRearrange, showPlayerOverlay, progressPercent, currentTime,
  playerRef, playerContainerRef, overlayTimerRef,
  queueSearchQuery, setQueueSearchQuery, searchMatchIndices, searchMatchCurrentIdx, setSearchMatchCurrentIdx,
  shuffling, dragOverIndex,
  onPlayPause, onNext, onPrev, onJumpTo, onRemoveSong, onMoveToNext, onShuffle,
  onDragStart, onDragOver, onDragLeave, onDrop,
  setShowSettings, setShowPlayerOverlay, startResizing,
}: SidebarProps) {
  const effectiveDuration = currentSong?.duration_seconds ?? 0;

  return (
    <aside className="sidebar" style={sidebarWidth !== undefined ? { width: sidebarWidth } : undefined}>
      <div className="sidebar-resizer" onMouseDown={startResizing} />

      {/* ── Logo bar ── */}
      <div className="sb-logo">
        <span className="logo-text">Drop<span>A</span>Track</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <div className="room-badge"><div className="ldot" />/{room.slug}</div>
          {myRole === 'admin' && (
            <button className="settings-gear" onClick={() => setShowSettings(true)} title="Room Settings">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Now Playing Card ── */}
      <div className="now-playing-card">
        {/* Ambient background — blurred album art (only in remote/no-video mode) */}
        {!isSpeaker && (
          <div className="npc-ambient">
            {currentSong?.thumbnail_url && (
              <img src={currentSong.thumbnail_url} alt="" aria-hidden="true" />
            )}
          </div>
        )}

        {/* Speaker mode: real YouTube player fills the card */}
        {isSpeaker ? (
          <div
            ref={playerContainerRef}
            className="npc-yt-player"
            onClick={canPlayPause ? onPlayPause : undefined}
          >
            <div id="yt-player" style={{ width: '100%', height: '100%' }} />
            {/* Play/pause overlay on top of player */}
            {canPlayPause && (
              <div className={`npc-art-overlay ${showPlayerOverlay ? '' : 'npc-art-overlay--hidden'}`}
                onMouseEnter={() => setShowPlayerOverlay(true)}
                onMouseLeave={() => setShowPlayerOverlay(false)}
                style={{ pointerEvents: 'auto', borderRadius: 0 }}
              >
                {room.is_playing ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Remote mode: hidden player + visible album art */
          <>
            <div
              ref={playerContainerRef}
              style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
            >
              <div id="yt-player" />
            </div>

            <div
              className={`npc-art ${room.is_playing ? 'npc-art--playing' : ''}`}
              onClick={canPlayPause ? onPlayPause : undefined}
              onMouseEnter={() => setShowPlayerOverlay(true)}
              onMouseLeave={() => {
                if (room.is_playing && overlayTimerRef.current !== null) {
                  clearTimeout(overlayTimerRef.current);
                }
              }}
            >
              {currentSong?.thumbnail_url ? (
                <img src={currentSong.thumbnail_url} alt={currentSong.title} />
              ) : (
                <div className="npc-art-empty">🎸</div>
              )}
              <div className={`npc-art-overlay ${(!canPlayPause || !currentSong) ? 'npc-art-overlay--hidden' : ''}`}>
                {room.is_playing ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                )}
              </div>
              {room.is_playing && (
                <div className="npc-eq">
                  <div className="eq-bar" />
                  <div className="eq-bar" />
                  <div className="eq-bar" />
                  <div className="eq-bar" />
                </div>
              )}
            </div>
          </>
        )}

        {/* Track info */}
        <div className="npc-info">
          <div className="npc-live-badge">
            <div className="ldot" style={{ width: 4, height: 4 }} />
            LIVE
          </div>
          <div className="npc-title">{currentSong?.title ?? 'Nothing playing'}</div>
          <div className="npc-artist">{currentSong?.added_by ?? 'Search for something below'}</div>

          {/* Progress */}
          <div className="npc-progress">
            <span className="npc-time">{formatDuration(Math.floor(currentTime))}</span>
            <div className="npc-bar">
              <div className="npc-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="npc-time" style={{ textAlign: 'right' }}>
              {formatDuration(effectiveDuration)}
            </span>
          </div>

          {/* Speaker mode indicator */}
          {!isSpeaker && (
            <div className="npc-remote-badge">Remote</div>
          )}

          {/* Mobile playback controls */}
          <div className="npc-mobile-controls">
            <button
              className="ctrl"
              onClick={canPlayPause ? onPrev : undefined}
              disabled={!canPlayPause || room.current_song_index <= 0}
            >
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
            </button>
            <button
              className="play-btn"
              onClick={canPlayPause ? onPlayPause : undefined}
              disabled={!canPlayPause}
            >
              {room.is_playing
                ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              }
            </button>
            <button
              className="ctrl"
              onClick={canPlayPause ? onNext : undefined}
              disabled={!canPlayPause || (!room.repeat && room.current_song_index >= queue.length - 1)}
            >
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="m6 18 8.5-6L6 6v12zm2-8.14 4.96 3.14L8 16.14V9.86zM16 6h2v12h-2z" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Queue header ── */}
      <div className="queue-header">
        <span className="queue-label">Up Next</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onShuffle}
            disabled={shuffling || queue.length <= 2}
            className={`queue-shuffle-btn ${shuffling ? 'queue-shuffle-btn--active' : ''}`}
            title="Shuffle Queue"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>
          </button>
          <span className="queue-count">{queue.length} songs</span>
        </div>
      </div>

      {/* ── Queue search ── */}
      <div style={{ padding: '0 12px 8px' }}>
        <div className="queue-search-wrap">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--theme-text-muted)', flexShrink: 0 }}>
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            className="queue-search-input"
            placeholder="Search queue..."
            value={queueSearchQuery}
            onChange={(e) => setQueueSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchMatchIndices.length > 0) {
                const nextIdx = (searchMatchCurrentIdx + 1) % searchMatchIndices.length;
                setSearchMatchCurrentIdx(nextIdx);
                document.getElementById(`q-item-${searchMatchIndices[nextIdx]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
          />
        </div>
      </div>

      {/* ── Queue list ── */}
      <div className="queue-list">
        <QueueList
          queue={queue}
          currentSongIndex={room.current_song_index}
          isPlaying={room.is_playing}
          canPlayPause={canPlayPause}
          canRearrange={canRearrange}
          dragOverIndex={dragOverIndex}
          searchMatchIndices={searchMatchIndices}
          searchMatchCurrentIdx={searchMatchCurrentIdx}
          onJumpTo={onJumpTo}
          onRemove={onRemoveSong}
          onMoveToNext={onMoveToNext}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onDragEnd={() => {}}
        />
      </div>
    </aside>
  );
}
