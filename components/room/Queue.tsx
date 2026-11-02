'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from './ui/Icon';
import Modal from './ui/Modal';
import { AddButton } from './Discover';
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

function AddSongModal({ onClose, onAdd, discover }: {
  onClose: () => void;
  onAdd: (id: string, title: string, thumb: string, dur: number) => Promise<void>;
  discover?: (onAdd: (id: string, title: string, thumb: string, dur: number) => Promise<void>) => React.ReactNode;
}) {
  const { queue } = useRoom();
  const [input, setInput] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const [failure, setFailure] = useState('');

  const queuedIds = new Set(queue.map((q) => q.youtube_id));
  const isUrl = YT_URL_RE.test(input);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setFailure('');
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
      setFailure('YouTube search isn’t responding right now. Paste a YouTube link instead, or try again in a minute.');
    }
    finally { setSearching(false); setSearched(true); }
  }, []);

  const doUrlFetch = useCallback(async (url: string) => {
    const match = url.match(YT_URL_RE);
    if (!match) return;
    const id = match[1];
    setSearching(true);
    setFailure('');
    try {
      const res = await fetch(`/api/youtube/search?videoId=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
      setFailure('Couldn’t load that link. Check it’s a public YouTube video and try again.');
    }
    finally { setSearching(false); setSearched(true); }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (isUrl) doUrlFetch(input);
    else doSearch(input);
  };

  // One add path for search results and Discover: confirmed or explained, never silent.
  const addTrack = async (id: string, title: string, thumb: string, dur: number) => {
    if (queuedIds.has(id)) return;
    setAddingId(id);
    setFailure('');
    try {
      await onAdd(id, title, thumb, dur);
      setAnnounce(`Added ${title} · #${queue.length + 1} in the queue`);
    } catch {
      setAnnounce('');
      setFailure(`Couldn’t add “${title}”. Check your connection and try again.`);
    } finally { setAddingId(null); }
  };
  const handleAdd = (r: SearchResult) => addTrack(r.id, r.title, r.thumbnail, r.durationSeconds);

  const showDiscover = !searching && results.length === 0 && !input.trim();

  return (
    // Fixed height: results loading in no longer resize (and re-centre) the dialog.
    <Modal title="Add a song" onClose={onClose} zIndex={310} width="min(900px, 96vw)" style={{ height: 'min(760px, 88vh)' }}>
      <div className="col" style={{ padding: 18, gap: 12, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Single smart bar — detects URL vs search query */}
        <form onSubmit={handleSubmit} role="search" style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-dim)', pointerEvents: 'none', display: 'flex' }}>
            <Icon name={isUrl ? 'link' : 'search'} size={18} />
          </span>
          <input
            className="field"
            autoFocus
            value={input}
            onChange={(e) => { setInput(e.target.value); setSearched(false); if (!e.target.value.trim()) setResults([]); }}
            placeholder="Search YouTube or paste a link…"
            aria-label="Search YouTube or paste a link"
            style={{ paddingLeft: 44, paddingRight: 110 }}
          />
          <button
            type="submit"
            className="btn btn-accent pop-sm"
            disabled={searching || !input.trim()}
            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: '8px 14px', fontSize: 12 }}
          >
            {isUrl ? 'Fetch' : 'Search'}
          </button>
        </form>

        {failure ? (
          <p role="alert" style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>⚠️ {failure}</p>
        ) : (
          <p aria-live="polite" className="mono" style={{ margin: 0, minHeight: 16, fontSize: 12, color: 'var(--accent-ink)' }}>{announce}</p>
        )}

        <div className="scroll" style={{ overflowY: 'auto', flex: 1, paddingRight: 4, minHeight: 0 }}>
          {showDiscover && discover?.(addTrack)}
          {searching && <div className="mono" style={{ textAlign: 'center', color: 'var(--ink-dim)', padding: 28, fontSize: 12 }}>Searching…</div>}
          {!searching && searched && !failure && results.length === 0 && (
            <div className="mono" style={{ textAlign: 'center', color: 'var(--ink-dim)', padding: 28, fontSize: 12 }}>
              Nothing found. Try another search or paste a YouTube link 🛰️
            </div>
          )}
          {!searching && results.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', columnGap: 18 }}>
              {results.map((r) => (
                <div key={r.id} className="flex items-center gap-3" style={{ padding: '10px 4px', borderBottom: '2px solid var(--line)' }}>
                  <div style={{ width: 96, height: 64, borderRadius: 8, overflow: 'hidden', border: '2.5px solid var(--outline)', flexShrink: 0, position: 'relative' }}>
                    {r.thumbnail
                      ? <img src={r.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div className="ph" style={{ width: '100%', height: '100%' }} />
                    }
                    <span className="mono" style={{ position: 'absolute', bottom: 3, right: 3, background: 'rgba(14,10,24,.85)', color: '#f7eeda', fontSize: 11, fontWeight: 700, padding: '1px 5px', borderRadius: 4 }}>
                      {fmt(r.durationSeconds)}
                    </span>
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.title}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 3 }}>{r.channelTitle}</div>
                  </div>
                  <AddButton queued={queuedIds.has(r.id)} adding={addingId === r.id} onAdd={() => handleAdd(r)} title={r.title} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
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
  onPromoteSuggestion: (item: QueueItem) => Promise<void>;
  onMoveSongToNext: (e: React.MouseEvent, sourceIndex: number) => void;
  onShuffle: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (index: number) => void;
  onAdd: (id: string, title: string, thumb: string, dur: number) => Promise<void>;
  onToggleRepeat: () => void;
  onToggleAutoSuggest: () => void;
  openAddSignal?: number;
  discover?: (onAdd: (id: string, title: string, thumb: string, dur: number) => Promise<void>) => React.ReactNode;
}

export default function Queue({
  queueSearchQuery, setQueueSearchQuery,
  searchMatchIndices, searchMatchCurrentIdx, setSearchMatchCurrentIdx,
  shuffling, dragOverIndex,
  onJumpTo, onRemoveSong, onPromoteSuggestion, onMoveSongToNext, onShuffle,
  onDragStart, onDragOver, onDragLeave, onDrop, onAdd, onToggleRepeat, onToggleAutoSuggest,
  openAddSignal = 0, discover,
}: QueueProps) {
  const { queue, room, canRearrange, canPlayPause, canAutoSuggest, currentUser } = useRoom();
  // DJs are add-only: they may take back their own songs; moderators/admin remove any.
  const canRemove = (item: QueueItem) => canRearrange || (!!currentUser && item.added_by === currentUser.username);
  const [showAdd, setShowAdd] = useState(false);
  const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null);
  // Two-step remove: anyone can remove, so make it deliberate.
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  useEffect(() => {
    if (!confirmRemoveId) return;
    const t = setTimeout(() => setConfirmRemoveId(null), 3500);
    return () => clearTimeout(t);
  }, [confirmRemoveId]);
  const moveBy = (index: number, delta: number) => { onDragStart(index); onDrop(index + delta); };
  const modHint = 'Moderators and the admin can do this';
  const currentIndex = room.current_song_index;
  const upNext = Math.max(0, queue.length - currentIndex - 1);

  // scroll-to on search match change (no filtering — all items stay visible)
  useEffect(() => {
    if (searchMatchIndices.length === 0) return;
    const idx = searchMatchIndices[searchMatchCurrentIdx];
    document.getElementById(`q-item-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [searchMatchCurrentIdx, searchMatchIndices]);

  useEffect(() => {
    let cancelled = false;
    if (openAddSignal > 0) {
      void Promise.resolve().then(() => {
        if (!cancelled) setShowAdd(true);
      });
    }
    return () => { cancelled = true; };
  }, [openAddSignal]);

  return (
    <section aria-label="Queue" className="pop col overflow-hidden" style={{ height: '100%', borderRadius: 16 }}>

      {/* header */}
      <div className="flex items-center justify-between" style={{ padding: '13px 15px', borderBottom: '3px solid var(--outline)' }}>
        <div className="flex items-center gap-2">
          <h2 className="display" style={{ fontSize: 18, margin: 0 }}>Queue</h2>
          {upNext > 0 && <span className="chip hide-mobile">{upNext} up next</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn pop-sm btn-icon"
            onClick={onToggleRepeat}
            disabled={!canPlayPause}
            aria-pressed={!!room.repeat}
            aria-label="Repeat queue"
            title={!canPlayPause ? `Repeat queue · ${modHint}` : room.repeat ? 'Repeat queue: on' : 'Repeat queue: off'}
            style={{ width: 44, height: 44, padding: 0, background: room.repeat ? 'var(--accent-2)' : 'var(--panel)', color: room.repeat ? 'var(--on-pop)' : 'var(--ink-soft)' }}
          >
            <Icon name="repeat" size={18} />
          </button>
          <button
            className="btn pop-sm btn-icon"
            onClick={onToggleAutoSuggest}
            disabled={!canAutoSuggest || room.repeat}
            aria-pressed={!!room.auto_suggest && !room.repeat}
            aria-label="Auto-suggest similar songs"
            title={!canAutoSuggest ? `Auto-suggest · ${modHint}` : room.repeat ? 'Turn off repeat to use auto-suggest' : room.auto_suggest ? 'Auto-suggest: on' : 'Auto-suggest: off'}
            style={{ width: 44, height: 44, padding: 0, background: room.auto_suggest && !room.repeat ? 'var(--accent-2)' : 'var(--panel)', color: room.auto_suggest && !room.repeat ? 'var(--on-pop)' : 'var(--ink-soft)' }}
          >
            <Icon name="wand" size={18} />
          </button>
          <button
            className="btn pop-sm btn-icon"
            onClick={onShuffle}
            disabled={shuffling || queue.length <= 2 || !canPlayPause}
            aria-label="Shuffle queue"
            title={!canPlayPause ? `Shuffle queue · ${modHint}` : 'Shuffle queue'}
            style={{ width: 44, height: 44, padding: 0 }}
          >
            <Icon name="shuffle" size={18} />
          </button>
          <button className="btn btn-accent pop-sm" onClick={() => setShowAdd(true)} aria-keyshortcuts="Control+K Meta+K" title="Add a song (Ctrl+K)" style={{ gap: 6, height: 44, padding: '0 14px' }}>
            <Icon name="plus" size={18} />
            <span style={{ fontSize: 13 }}>Add</span>
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
          placeholder="Find in queue…"
          aria-label="Find in queue"
          value={queueSearchQuery}
          onChange={(e) => setQueueSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && searchMatchIndices.length > 0) { e.preventDefault(); setSearchMatchCurrentIdx((searchMatchCurrentIdx + 1) % searchMatchIndices.length); } }}
        />
        {searchMatchIndices.length > 0 && (
          <div className="mono flex items-center" style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--ink-dim)', whiteSpace: 'nowrap' }}>
              {searchMatchCurrentIdx + 1}/{searchMatchIndices.length}
            </span>
            <button
              className="btn pop-sm btn-icon"
              onClick={() => setSearchMatchCurrentIdx((searchMatchCurrentIdx + 1) % searchMatchIndices.length)}
              style={{ padding: 4, width: 28, height: 28 }}
              aria-label="Next match"
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
          <div className="col items-center" style={{ margin: 'auto', padding: '20px 12px', gap: 12, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>The queue is empty</div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--ink-dim)', lineHeight: 1.6 }}>Anyone in the room can add songs ✨</div>
            <button className="btn btn-accent" onClick={() => setShowAdd(true)} style={{ gap: 6 }}>
              <Icon name="plus" size={18} /> Add the first song
            </button>
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
                <div className="mono flex items-center gap-2" style={{ fontSize: 11, color: 'var(--ink-soft)', letterSpacing: '.08em', padding: '10px 4px 6px' }}>
                  <Icon name="wand" size={14} /> AUTO-SUGGESTED
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
                {canRearrange && (
                  <div aria-hidden="true" className="hover-only" style={{ cursor: muted || isSuggested ? 'default' : 'grab', color: 'var(--ink-dim)', flexShrink: 0, opacity: muted || isSuggested ? 0.3 : 1 }}>
                    <Icon name="drag" size={18} />
                  </div>
                )}

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
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,15,31,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f7eeda' }}>
                      <Icon name="check" size={18} sw={3} />
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  {/* two lines so versions ("Radio Edit" vs "12\" Mix") stay distinguishable */}
                  <div title={item.title} style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.title}</div>
                  <div className="mono" style={{ fontSize: 11, color: isNow ? 'var(--accent-ink)' : 'var(--ink-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isNow ? '▶ now playing · ' : isPlayed ? 'played · ' : ''}{isSuggested ? 'auto · ' : ''}{item.added_by} · {fmt(item.duration_seconds)}
                  </div>
                </div>

                <div className="flex gap-1" style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  {!isNow && !isSuggested && canPlayPause && (
                    <button className="btn btn-ghost btn-icon row-btn" aria-label={`${isPlayed ? 'Replay' : 'Play now'}: ${item.title}`} title={isPlayed ? 'Replay' : 'Play now'}
                      onClick={() => onJumpTo(index)}
                    >
                      <Icon name="play" size={16} />
                    </button>
                  )}
                  {!isNow && !isSuggested && !isPlayed && canRearrange && (
                    <>
                      <button className="btn btn-ghost btn-icon row-btn touch-only" aria-label={`Move up: ${item.title}`}
                        disabled={index <= currentIndex + 1} onClick={() => moveBy(index, -1)}>
                        <Icon name="up" size={16} />
                      </button>
                      <button className="btn btn-ghost btn-icon row-btn touch-only" aria-label={`Move down: ${item.title}`}
                        disabled={index >= queue.length - 1 || !!queue[index + 1]?.is_suggested} onClick={() => moveBy(index, 1)}>
                        <Icon name="down" size={16} />
                      </button>
                      <button className="btn btn-ghost btn-icon row-btn hover-only" aria-label={`Play next: ${item.title}`} title="Play next"
                        onClick={(e) => onMoveSongToNext(e, index)}>
                        <Icon name="tonext" size={17} />
                      </button>
                    </>
                  )}
                  {isSuggested && (
                    <button className="btn btn-ghost btn-icon row-btn" aria-label={`Keep in queue: ${item.title}`} title="Keep in queue" onClick={() => onPromoteSuggestion(item)}>
                      <Icon name="plus" size={17} />
                    </button>
                  )}
                  {!isNow && canRemove(item) && (confirmRemoveId === item.id ? (
                    <button className="btn btn-ghost row-btn" onClick={() => { setConfirmRemoveId(null); void onRemoveSong(item); }}
                      style={{ padding: '0 10px', fontSize: 12, background: 'var(--pop-coral)', color: 'var(--on-pop)', borderColor: 'var(--outline)' }}>
                      Remove?
                    </button>
                  ) : (
                    <button className="btn btn-ghost btn-icon row-btn" aria-label={`Remove: ${item.title}`} title="Remove" onClick={() => setConfirmRemoveId(item.id)}>
                      <Icon name="trash" size={17} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            </div>
          );
        })}
      </div>

      {showAdd && <AddSongModal onClose={() => setShowAdd(false)} onAdd={onAdd} discover={discover} />}
    </section>
  );
}
