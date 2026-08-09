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
      className="pop flex items-center gap-2"
      style={{
        position: 'fixed', left: 10, right: 10, bottom: 78,
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="display" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentSong.title}
        </div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)' }}>
          {room.is_playing ? 'PLAYING' : 'PAUSED'}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); if (canPlayPause) onPlayPause(); }}
        disabled={!canPlayPause}
        className="btn btn-accent btn-icon"
        style={{ width: 36, height: 36, padding: 0, flexShrink: 0, opacity: canPlayPause ? 1 : 0.4 }}
      >
        <Icon name={room.is_playing ? 'pause' : 'play'} size={16} />
      </button>
    </div>
  );
}
