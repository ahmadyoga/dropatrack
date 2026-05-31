'use client';

import { useState } from 'react';
import { useRoom } from './RoomContext';
import type { QueueItem } from '@/lib/types';

function fmt(s: number): string {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface QueueProps {
  queueSearchQuery: string;
  setQueueSearchQuery: (q: string) => void;
  searchMatchIndices: number[];
  searchMatchCurrentIdx: number;
  setSearchMatchCurrentIdx: (i: number) => void;
  shuffling: boolean;
  dragOverIndex: number | null;
  onJumpTo: (index: number) => void;
  onRemoveSong: (item: QueueItem) => Promise<void>;
  onMoveSongToNext: (e: React.MouseEvent, sourceIndex: number) => void;
  onShuffle: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (index: number) => void;
}

export default function Queue({
  queueSearchQuery,
  setQueueSearchQuery,
  searchMatchIndices,
  searchMatchCurrentIdx,
  setSearchMatchCurrentIdx,
  shuffling,
  dragOverIndex,
  onJumpTo,
  onRemoveSong,
  onMoveSongToNext,
  onShuffle,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: QueueProps) {
  const { queue, room, canRearrange } = useRoom();
  const [searchOpen, setSearchOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const currentIndex = room.current_song_index;

  return (
    <div className="pop wobble col overflow-hidden" style={{ height: '100%', boxShadow: '7px 7px 0 var(--shadow)' }}>
      {/* header */}
      <div className="flex items-center justify-between" style={{ padding: '13px 15px', borderBottom: '3px solid var(--outline)' }}>
        <div className="flex items-center gap-2">
          <div className="display" style={{ fontSize: 18 }}>Queue</div>
          <span className="chip" style={{ background: 'var(--panel-2)' }}>{queue.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn pop-sm btn-icon"
            onClick={onShuffle}
            disabled={shuffling || queue.length <= 2}
            title="Shuffle"
            style={{ opacity: shuffling ? .5 : 1 }}
          >
            ⇄
          </button>
          <button
            className="btn pop-sm btn-icon"
            onClick={() => setSearchOpen((o) => !o)}
            title="Search queue"
            style={{ background: searchOpen ? 'var(--accent-2)' : 'var(--panel)', color: searchOpen ? '#140f1f' : 'var(--ink)' }}
          >
            🔍
          </button>
        </div>
      </div>

      {/* search bar */}
      {searchOpen && (
        <div style={{ padding: '8px 12px', borderBottom: '2px solid var(--line)' }}>
          <input
            className="field"
            style={{ fontSize: 13, padding: '8px 12px' }}
            placeholder="Search queue..."
            value={queueSearchQuery}
            onChange={(e) => setQueueSearchQuery(e.target.value)}
            autoFocus
          />
          {searchMatchIndices.length > 0 && (
            <div className="mono flex items-center gap-2" style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 6 }}>
              {searchMatchCurrentIdx + 1}/{searchMatchIndices.length}
              <button
                style={{ padding: '2px 6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)' }}
                onClick={() => setSearchMatchCurrentIdx((searchMatchCurrentIdx + 1) % searchMatchIndices.length)}
              >↓</button>
            </div>
          )}
        </div>
      )}

      {/* track list */}
      <div className="scroll col" style={{ flex: 1, overflowY: 'auto', padding: 8, gap: 4 }}>
        {queue.length === 0 && (
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', textAlign: 'center', margin: 'auto', padding: '20px 12px', lineHeight: 1.7 }}>
            nothing in the queue yet —<br />blast off with a track ✨
          </div>
        )}

        {queue.map((item, index) => {
          const isCurrent = index === currentIndex;
          const isMatch = searchMatchIndices.includes(index);
          const isCurrentMatch = searchMatchIndices[searchMatchCurrentIdx] === index;
          const isDragTarget = dragOverIndex === index;
          const isHovered = hoveredIndex === index;

          return (
            <div
              key={item.id}
              id={`q-item-${index}`}
              draggable={canRearrange}
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDragLeave={onDragLeave}
              onDrop={() => onDrop(index)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={isDragTarget ? 'drag-over' : ''}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 8px', borderRadius: 12,
                background: isCurrent ? 'var(--panel-2)' : isCurrentMatch ? 'rgba(70,224,212,.1)' : 'transparent',
                border: isCurrent ? '2.5px solid var(--accent)' : isMatch ? '2.5px solid rgba(70,224,212,.4)' : '2.5px solid transparent',
                transition: 'background .1s',
                cursor: 'pointer',
              }}
              onClick={() => onJumpTo(index)}
            >
              {canRearrange && (
                <div style={{ fontSize: 14, color: 'var(--ink-dim)', cursor: 'grab', flexShrink: 0 }}>⠿</div>
              )}
              <div style={{ width: 40, height: 40, borderRadius: 9, overflow: 'hidden', border: '2.5px solid var(--outline)', flexShrink: 0 }}>
                {item.thumbnail_url
                  ? <img src={item.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div className="ph" style={{ width: '100%', height: '100%' }} />
                }
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.added_by} · {fmt(item.duration_seconds)}
                </div>
              </div>
              {(isHovered || isCurrent) && canRearrange && (
                <div className="flex gap-1" style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn pop-sm btn-icon" onClick={(e) => onMoveSongToNext(e, index)} title="Play next" style={{ padding: 6 }}>⏭</button>
                  <button className="btn pop-sm btn-icon" onClick={() => onRemoveSong(item)} title="Remove" style={{ padding: 6, background: 'var(--pop-coral)', color: '#140f1f' }}>✕</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
