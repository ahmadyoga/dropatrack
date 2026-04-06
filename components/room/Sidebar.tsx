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
  sidebarWidth: number;
  canPlayPause: boolean;
  canRearrange: boolean;
  showPlayerOverlay: boolean;
  progressPercent: number;
  currentTime: number;
  playerRef: React.RefObject<YTPlayer | null>;
  playerContainerRef: React.RefObject<HTMLDivElement>;
  overlayTimerRef: React.RefObject<ReturnType<typeof setTimeout> | null>;
  // Queue search
  queueSearchQuery: string;
  setQueueSearchQuery: (q: string) => void;
  searchMatchIndices: number[];
  searchMatchCurrentIdx: number;
  setSearchMatchCurrentIdx: (idx: number) => void;
  shuffling: boolean;
  dragOverIndex: number | null;
  // Handlers
  onPlayPause: () => void;
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
  onPlayPause, onJumpTo, onRemoveSong, onMoveToNext, onShuffle,
  onDragStart, onDragOver, onDragLeave, onDrop,
  setShowSettings, setShowPlayerOverlay, startResizing,
}: SidebarProps) {
  return (
    <aside className="sidebar" style={{ width: sidebarWidth }}>
      <div className="sidebar-resizer" onMouseDown={startResizing} />

      {/* Logo bar */}
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
          {!currentSong && <div style={{ fontSize: 52, opacity: 0.18, position: 'relative', zIndex: 1 }}>🎸</div>}
          <div id="yt-player" style={{ display: isSpeaker && currentSong ? 'block' : 'none', position: 'absolute', inset: 0, zIndex: 1 }} />
          {(!isSpeaker || !playerReady) && currentSong && (
            <img
              src={currentSong.thumbnail_url || `https://img.youtube.com/vi/${currentSong.youtube_id}/mqdefault.jpg`}
              alt={currentSong.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 1 }}
            />
          )}
          {!isSpeaker && currentSong && (
            <div style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 6px', fontSize: 9, borderRadius: 4, zIndex: 2 }}>
              Remote
            </div>
          )}
          <div
            className={`np-play-overlay ${showPlayerOverlay ? '' : 'np-overlay-hidden'}`}
            onMouseEnter={() => setShowPlayerOverlay(true)}
            onMouseLeave={() => {
              if (room.is_playing) {
                overlayTimerRef.current = setTimeout(() => setShowPlayerOverlay(false), 1500);
              }
            }}
          >
            <div
              className="np-play-circle"
              onClick={canPlayPause ? onPlayPause : undefined}
              style={!canPlayPause ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
            >
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
          <div className="np-meta">
            {currentSong ? currentSong.added_by : 'Search for a song'} ·{' '}
            <span>{currentSong && `${formatDuration(Math.floor(currentTime))} / ${formatDuration(currentSong.duration_seconds)}`}</span>
          </div>
        </div>
      </div>

      {/* Queue header */}
      <div className="queue-header">
        <span className="queue-label">Queue</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onShuffle}
            disabled={shuffling || queue.length <= 2}
            style={{
              background: 'none', border: 'none',
              cursor: (shuffling || queue.length <= 2) ? 'not-allowed' : 'pointer',
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

      {/* Queue search */}
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

      {/* Queue list */}
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
