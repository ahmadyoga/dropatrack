'use client';

import Icon from './ui/Icon';
import { useRoom } from './RoomContext';

interface MiniPlayerProps {
  onPlayPause: () => void;
  onExpand: () => void;
}

export default function MiniPlayer({ onPlayPause, onExpand }: MiniPlayerProps) {
  const { room, currentSong, canPlayPause } = useRoom();
  if (!currentSong) return null;

  return (
    <div
      onClick={onExpand}
      role="region"
      aria-label="Now playing"
      className="pop flex items-center gap-2"
      style={{
        position: 'fixed', left: 10, right: 10, bottom: 88,
        zIndex: 119, padding: '8px 10px',
        borderRadius: 16, boxShadow: '5px 5px 0 var(--shadow)',
        cursor: 'pointer',
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
        {currentSong.thumbnail_url
          ? <img src={currentSong.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div className="ph" style={{ width: '100%', height: '100%' }} />}
      </div>
      <button type="button" onClick={onExpand} aria-label={`Open player: ${currentSong.title}`} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', color: 'var(--ink)', textAlign: 'left', cursor: 'pointer', padding: 0, minHeight: 44 }}>
        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentSong.title}
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
          {room.is_playing ? 'Playing' : 'Paused'}
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); if (canPlayPause) onPlayPause(); }}
        disabled={!canPlayPause}
        aria-label={!canPlayPause ? 'Only moderators can control playback' : room.is_playing ? 'Pause' : 'Play'}
        title={!canPlayPause ? 'Only moderators can control playback' : undefined}
        className="btn btn-accent btn-icon"
        style={{ width: 44, height: 44, padding: 0, flexShrink: 0 }}
      >
        <Icon name={room.is_playing ? 'pause' : 'play'} size={16} />
      </button>
    </div>
  );
}
