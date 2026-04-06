'use client';

import type { QueueItem } from '@/lib/types';
import { formatDuration } from '@/lib/youtube';

interface QueueListProps {
  queue: QueueItem[];
  currentSongIndex: number;
  isPlaying: boolean;
  canPlayPause: boolean;
  canRearrange: boolean;
  dragOverIndex: number | null;
  searchMatchIndices: number[];
  searchMatchCurrentIdx: number;
  onJumpTo: (index: number) => void;
  onRemove: (item: QueueItem) => void;
  onMoveToNext: (e: React.MouseEvent, sourceIndex: number) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
}

export default function QueueList({
  queue, currentSongIndex, isPlaying, canPlayPause, canRearrange,
  dragOverIndex, searchMatchIndices, searchMatchCurrentIdx,
  onJumpTo, onRemove, onMoveToNext,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
}: QueueListProps) {
  if (queue.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
        Queue is empty
      </div>
    );
  }

  return (
    <>
      {queue.map((item, index) => {
        const isCurrentlyPlaying = index === currentSongIndex;
        const isPast = typeof currentSongIndex === 'number' && index < currentSongIndex;
        const qClass = `qt${index % 6}`;
        const isMatch = searchMatchIndices.includes(index);
        const isActiveMatch = searchMatchIndices.length > 0 && searchMatchIndices[searchMatchCurrentIdx] === index;

        return (
          <div
            id={`q-item-${index}`}
            key={item.id}
            className={`q-item ${isCurrentlyPlaying ? 'playing' : ''} ${isPast ? 'past' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
            style={isMatch ? {
              boxShadow: isActiveMatch ? '0 0 0 2px var(--accent-primary)' : '0 0 0 1px var(--theme-glass-border)',
              backgroundColor: isActiveMatch ? 'var(--theme-hover-bg-strong)' : 'var(--theme-hover-bg)'
            } : undefined}
            onClick={() => canPlayPause ? onJumpTo(index) : undefined}
            draggable={canRearrange}
            onDragStart={canRearrange ? () => onDragStart(index) : undefined}
            onDragOver={canRearrange ? (e) => onDragOver(e, index) : undefined}
            onDragLeave={canRearrange ? onDragLeave : undefined}
            onDrop={canRearrange ? () => onDrop(index) : undefined}
            onDragEnd={canRearrange ? onDragEnd : undefined}
          >
            {isCurrentlyPlaying && isPlaying ? (
              <div className="eq-bars"><div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" /></div>
            ) : (
              <div className="q-num" style={{ display: isCurrentlyPlaying ? 'none' : 'flex' }}>{index + 1}</div>
            )}
            <div className={`q-thumb ${qClass}`}>
              {item.thumbnail_url ? <img src={item.thumbnail_url} alt="thumbnail" /> : '🎵'}
            </div>
            <div className="q-info">
              <div className={`q-title ${isCurrentlyPlaying ? 'active' : ''}`}>{item.title}</div>
              <div className="q-by">{item.added_by}</div>
            </div>
            <div className="q-dur" style={{ color: isCurrentlyPlaying ? '#1db954' : undefined }}>
              {formatDuration(item.duration_seconds)}
            </div>
            {canRearrange && !isCurrentlyPlaying && index !== (currentSongIndex ?? -1) + 1 && (
              <div className="q-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  onClick={(e) => onMoveToNext(e, index)}
                  style={{ padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, cursor: 'pointer', borderRadius: '4px', background: 'var(--theme-hover-bg)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--theme-hover-bg-strong)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = 'var(--theme-hover-bg)'; }}
                  title="Play next"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5"></line>
                    <polyline points="5 12 12 5 19 12"></polyline>
                  </svg>
                </div>
                <div
                  onClick={(e) => { e.stopPropagation(); onRemove(item); }}
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
      })}
    </>
  );
}
