'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from './ui/Icon';
import { useRoom } from './RoomContext';
import type { QueueItem } from '@/lib/types';

function fmt(s: number): string {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface SearchResult {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  durationSeconds: number;
}

const YT_URL_RE = /(?:v=|youtu\.be\/|embed\/|shorts\/|music\.youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/;

function AddSongModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (id: string, title: string, thumb: string, dur: number) => Promise<void>;
}) {
  const { queue } = useRoom();
  const [input, setInput] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const queuedIds = new Set(queue.map((q) => q.youtube_id));
  const isUrl = YT_URL_RE.test(input);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch { /* */ }
    finally { setSearching(false); }
  }, []);

  const doUrlFetch = useCallback(async (url: string) => {
    const match = url.match(YT_URL_RE);
    if (!match) return;
    const id = match[1];
    setSearching(true);
    try {
      const res = await fetch(`/api/youtube/search?videoId=${encodeURIComponent(id)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch { /* */ }
    finally { setSearching(false); }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (isUrl) doUrlFetch(input);
    else doSearch(input);
  };

  const handleAdd = async (r: SearchResult) => {
    if (queuedIds.has(r.id)) return;
    setAddingId(r.id);
    try { await onAdd(r.id, r.title, r.thumbnail, r.durationSeconds); } finally { setAddingId(null); }
  };

  return (
    <div className="scrim" onClick={onClose} style={{ zIndex: 310 }}>
      <div
        className="pop wobble-2 popin col"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(900px,96vw)', maxHeight: '88vh', overflow: 'hidden', boxShadow: '9px 9px 0 var(--accent)' }}
      >
        <div className="flex items-center justify-between" style={{ padding: '16px 18px', borderBottom: '3px solid var(--outline)', background: 'var(--accent-3)', color: '#140f1f', flexShrink: 0 }}>
          <div className="display" style={{ fontSize: 21 }}>Add a song</div>
          <button className="btn pop-sm btn-icon" onClick={onClose} style={{ background: 'rgba(0,0,0,.15)', border: 'none', boxShadow: 'none', color: '#140f1f' }}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="col" style={{ padding: 18, gap: 14, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Single smart bar — detects URL vs search query */}
          <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-dim)', pointerEvents: 'none', display: 'flex' }}>
              <Icon name={isUrl ? 'link' : 'search'} size={18} />
            </span>
            <input
              className="field"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search or paste a YouTube URL…"
              style={{ paddingLeft: 44, paddingRight: 110 }}
            />
            <button
              type="submit"
              className="btn btn-accent pop-sm"
              disabled={searching || !input.trim()}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: '7px 14px', fontSize: 12 }}
            >
              {isUrl ? 'FETCH' : 'SEARCH'}
            </button>
          </form>

          <div className="scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, overflowY: 'auto', flex: 1, paddingRight: 4, alignContent: 'start' }}>
            {searching && <div className="mono" style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--ink-dim)', padding: 28 }}>searching the cosmos…</div>}
            {!searching && results.length === 0 && input.trim() && <div className="mono" style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--ink-dim)', padding: 28, fontSize: 13 }}>no signal out here… try another search 🛰️</div>}
            {!searching && results.length === 0 && !input.trim() && <div className="mono" style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--ink-dim)', padding: 28, fontSize: 13 }}>type to search ✨</div>}
            {results.map((r) => {
              const queued = queuedIds.has(r.id);
              const adding = addingId === r.id;
              return (
                <div key={r.id} className="flex items-center gap-3 pop-sm" style={{ padding: '8px 10px', borderRadius: 13, background: 'var(--panel-2)' }}>
                  <div style={{ width: 106, height: 72, borderRadius: 8, overflow: 'hidden', border: '2.5px solid var(--outline)', flexShrink: 0, position: 'relative' }}>
                    {r.thumbnail
                      ? <img src={r.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div className="ph" style={{ width: '100%', height: '100%' }} />
                    }
                    <span className="mono" style={{ position: 'absolute', bottom: 3, right: 3, background: 'rgba(14,10,24,.82)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}>
                      {fmt(r.durationSeconds)}
                    </span>
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.title}</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 3 }}>{r.channelTitle}</div>
                  </div>
                  <button
                    className={`btn pop-sm btn-icon ${queued ? '' : 'btn-accent'}`}
                    onClick={() => handleAdd(r)}
                    disabled={queued || !!adding}
                    style={{ flexShrink: 0, padding: 9, opacity: queued ? 0.6 : 1 }}
                  >
                    {adding ? '…' : queued ? <Icon name="check" size={16} /> : <Icon name="plus" size={18} />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
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
  onAdd: (id: string, title: string, thumb: string, dur: number) => Promise<void>;
  onToggleRepeat: () => void;
  onToggleAutoSuggest: () => void;
}

export default function Queue({
  queueSearchQuery, setQueueSearchQuery,
  searchMatchIndices, searchMatchCurrentIdx, setSearchMatchCurrentIdx,
  shuffling, dragOverIndex,
  onJumpTo, onRemoveSong, onMoveSongToNext, onShuffle,
  onDragStart, onDragOver, onDragLeave, onDrop, onAdd, onToggleRepeat, onToggleAutoSuggest,
}: QueueProps) {
  const { queue, room, canRearrange, canPlayPause, canAutoSuggest } = useRoom();
  const [showAdd, setShowAdd] = useState(false);
  const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null);
  const currentIndex = room.current_song_index;
  const upNext = Math.max(0, queue.length - currentIndex - 1);

  // scroll-to on search match change (no filtering — all items stay visible)
  useEffect(() => {
    if (searchMatchIndices.length === 0) return;
    const idx = searchMatchIndices[searchMatchCurrentIdx];
    document.getElementById(`q-item-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [searchMatchCurrentIdx, searchMatchIndices]);

  return (
    <div className="pop wobble col overflow-hidden" style={{ height: '100%', boxShadow: '7px 7px 0 var(--shadow)' }}>

      {/* header */}
      <div className="flex items-center justify-between" style={{ padding: '13px 15px', borderBottom: '3px solid var(--outline)' }}>
        <div className="flex items-center gap-2">
          <Icon name="list" size={20} />
          <div className="display" style={{ fontSize: 18 }}>Queue</div>
          <span className="chip" style={{ background: 'var(--accent-3)', color: '#140f1f' }}>{upNext} next</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn pop-sm btn-icon"
            onClick={onToggleRepeat}
            disabled={!canPlayPause}
            title={room.repeat ? 'Repeat on' : 'Repeat off'}
            style={{ background: room.repeat ? 'var(--accent-3)' : 'var(--panel)', color: room.repeat ? '#140f1f' : 'var(--ink-dim)', opacity: canPlayPause ? 1 : 0.4 }}
          >
            <Icon name="replay" size={18} />
          </button>
          <button
            className="btn pop-sm btn-icon"
            onClick={onToggleAutoSuggest}
            disabled={!canAutoSuggest || room.repeat}
            title={room.repeat ? 'Turn off repeat to use auto-suggest' : room.auto_suggest ? 'Auto-suggest on' : 'Auto-suggest off'}
            style={{ background: room.auto_suggest && !room.repeat ? 'var(--accent)' : 'var(--panel)', color: room.auto_suggest && !room.repeat ? '#140f1f' : 'var(--ink-dim)', opacity: canAutoSuggest && !room.repeat ? 1 : 0.4 }}
          >
            <Icon name="bolt" size={18} />
          </button>
          <button
            className="btn pop-sm btn-icon"
            onClick={onShuffle}
            disabled={shuffling || queue.length <= 2 || !canPlayPause}
            title="Shuffle queue"
            style={{ opacity: canPlayPause ? (shuffling ? .5 : 1) : 0.4 }}
          >
            <Icon name="shuffle" size={18} />
          </button>
          <button className="btn btn-accent pop-sm btn-icon" onClick={() => setShowAdd(true)} title="Add a song" style={{ gap: 6 }}>
            <Icon name="plus" size={18} />
            <span className="hidden md:inline" style={{ fontSize: 13, fontWeight: 700 }}>Add a song</span>
          </button>
        </div>
      </div>

      {/* always-visible search — scrolls to match, does not filter */}
      <div style={{ padding: '10px 13px', borderBottom: '3px solid var(--outline)', position: 'relative' }}>
        <span style={{ position: 'absolute', left: 26, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-dim)', pointerEvents: 'none', display: 'flex' }}>
          <Icon name="search" size={16} />
        </span>
        <input
          className="field"
          style={{ fontSize: 13, padding: '10px 14px 10px 40px', paddingRight: searchMatchIndices.length > 0 ? 72 : 14 }}
          placeholder="Jump to track…"
          value={queueSearchQuery}
          onChange={(e) => setQueueSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && searchMatchIndices.length > 0) { e.preventDefault(); setSearchMatchCurrentIdx((searchMatchCurrentIdx + 1) % searchMatchIndices.length); } }}
        />
        {searchMatchIndices.length > 0 && (
          <div className="mono flex items-center" style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--ink-dim)', whiteSpace: 'nowrap' }}>
              {searchMatchCurrentIdx + 1}/{searchMatchIndices.length}
            </span>
            <button
              className="btn pop-sm btn-icon"
              onClick={() => setSearchMatchCurrentIdx((searchMatchCurrentIdx + 1) % searchMatchIndices.length)}
              style={{ padding: 4, width: 24, height: 24 }}
              title="Next match"
            >
              <Icon name="next" size={12} />
            </button>
          </div>
        )}
      </div>

      {/* track list — full queue, no filtering */}
      <div className="scroll col" style={{ flex: 1, overflowY: 'auto', padding: 12, gap: 0 }}>
        {queue.length === 0 && (
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', textAlign: 'center', margin: 'auto', padding: '20px 12px', lineHeight: 1.7 }}>
            nothing in the queue yet —<br />hit + to blast off ✨
          </div>
        )}

        {queue.map((item, index) => {
          const status: 'played' | 'now' | 'next' =
            index < currentIndex ? 'played' : index === currentIndex ? 'now' : 'next';
          const isNow = status === 'now';
          const isPlayed = status === 'played';
          const muted = isPlayed && !room.repeat;
          const isCurrentMatch = searchMatchIndices[searchMatchCurrentIdx] === index;
          const isMatch = searchMatchIndices.includes(index);
          const isDragOver = dragOverIndex === index;
          const isDragSrc = dragSrcIdx === index;
          const isSuggested = item.is_suggested;
          const showSuggestedDivider =
            room.auto_suggest && isSuggested && (index === 0 || !queue[index - 1].is_suggested);

          let borderColor = 'var(--line)';
          if (isNow) borderColor = 'var(--accent)';
          else if (isCurrentMatch) borderColor = 'rgba(70,224,212,.7)';
          else if (isMatch) borderColor = 'rgba(70,224,212,.35)';

          return (
            <div key={item.id}>
              {showSuggestedDivider && (
                <div className="mono flex items-center gap-2" style={{ fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '.1em', padding: '10px 4px 6px' }}>
                  🔮 More like this
                </div>
              )}
            <div
              id={`q-item-${index}`}
              style={{
                // smooth insertion gap: push target item down when something hovers above it
                marginTop: isDragOver && dragSrcIdx !== null && index !== dragSrcIdx ? 10 : 0,
                marginBottom: 8,
                transition: 'margin 0.18s cubic-bezier(0.2,0,0,1), opacity 0.18s ease, transform 0.18s ease',
              }}
            >
              <div
                draggable={canRearrange && !muted && !isSuggested}
                onDragStart={isSuggested ? undefined : () => { setDragSrcIdx(index); onDragStart(index); }}
                onDragOver={isSuggested ? undefined : (e) => onDragOver(e, index)}
                onDragLeave={isSuggested ? undefined : onDragLeave}
                onDrop={isSuggested ? undefined : () => { onDrop(index); setDragSrcIdx(null); }}
                onDragEnd={isSuggested ? undefined : () => setDragSrcIdx(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 12,
                  border: `2.5px ${isPlayed ? 'dashed' : 'solid'} ${isDragOver && !isDragSrc ? 'var(--accent)' : borderColor}`,
                  background: isNow ? 'var(--panel-3)' : isPlayed ? 'transparent' : 'var(--panel-2)',
                  opacity: isDragSrc ? 0.35 : muted ? 0.42 : 1,
                  transform: isDragSrc ? 'scale(0.97)' : 'scale(1)',
                  filter: muted ? 'grayscale(0.6)' : 'none',
                  transition: 'opacity 0.18s ease, transform 0.18s ease, border-color 0.15s ease, background 0.15s ease',
                  boxShadow: isDragOver && !isDragSrc ? '0 0 0 2px var(--accent)' : 'none',
                }}
              >
                <div style={{ cursor: muted || isSuggested ? 'default' : 'grab', color: 'var(--ink-dim)', flexShrink: 0, opacity: muted || isSuggested ? 0.3 : 1 }}>
                  <Icon name="drag" size={18} />
                </div>

                <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', border: '2.5px solid var(--outline)', flexShrink: 0, position: 'relative' }}>
                  {item.thumbnail_url
                    ? <img src={item.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div className="ph" style={{ width: '100%', height: '100%' }} />
                  }
                  {isNow && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,15,31,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="flex items-end" style={{ gap: 2 }}>
                        {[8, 14, 10].map((h, bar) => (
                          <span key={bar} style={{ width: 3, height: h, background: 'var(--accent)', borderRadius: 2, display: 'block' }} />
                        ))}
                      </div>
                    </div>
                  )}
                  {isPlayed && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,15,31,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}>
                      <Icon name="check" size={18} sw={3} />
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isNow ? '▶ now playing · ' : isPlayed ? 'played · ' : ''}{isSuggested ? 'auto · ' : ''}{item.added_by} · {fmt(item.duration_seconds)}
                  </div>
                </div>

                <div className="flex gap-1" style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  {!isNow && !isSuggested && (
                    <button className="btn btn-ghost btn-icon" disabled={muted || !canPlayPause} title={isPlayed ? 'Replay' : 'Play now'}
                      onClick={() => !muted && canPlayPause && onJumpTo(index)}
                      style={{ padding: 7, opacity: muted || !canPlayPause ? 0.35 : 1, cursor: muted || !canPlayPause ? 'not-allowed' : 'pointer' }}
                    >
                      <Icon name="play" size={16} />
                    </button>
                  )}
                  {!isNow && !isSuggested && canRearrange && (
                    <button className="btn btn-ghost btn-icon" disabled={muted} title="Move to next"
                      onClick={(e) => !muted && onMoveSongToNext(e, index)}
                      style={{ padding: 7, opacity: muted ? 0.35 : 1, cursor: muted ? 'not-allowed' : 'pointer' }}
                    >
                      <Icon name="tonext" size={17} />
                    </button>
                  )}
                  {!isNow && (
                    <button className="btn btn-ghost btn-icon" title="Remove" onClick={() => onRemoveSong(item)} style={{ padding: 7 }}>
                      <Icon name="trash" size={17} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            </div>
          );
        })}
      </div>

      {showAdd && <AddSongModal onClose={() => setShowAdd(false)} onAdd={onAdd} />}
    </div>
  );
}
