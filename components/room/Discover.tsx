'use client';

import type { TrendingVideo, YouTubeSearchResult } from '@/lib/types';

function fmt(s: number): string {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface DiscoverProps {
  searching: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: YouTubeSearchResult[];
  nextPageToken: string | null;
  loadingMore: boolean;
  addingUrl: boolean;
  trendingVideos: TrendingVideo[];
  latestVideos: TrendingVideo[];
  freshVideos: TrendingVideo[];
  trendingLoading: boolean;
  latestLoading: boolean;
  freshLoading: boolean;
  onSearch: (e: React.FormEvent) => void;
  onLoadMore: () => void;
  onAddSong: (youtubeId: string, title: string, thumbnail: string, durationSeconds: number) => Promise<void>;
  queuedVideoIds: Set<string>;
}

export default function Discover({
  searching,
  searchQuery,
  setSearchQuery,
  searchResults,
  nextPageToken,
  loadingMore,
  addingUrl,
  trendingVideos,
  latestVideos,
  freshVideos,
  trendingLoading,
  latestLoading,
  freshLoading,
  onSearch,
  onLoadMore,
  onAddSong,
  queuedVideoIds,
}: DiscoverProps) {
  const showResults = searchQuery.trim().length > 0 && searchResults.length > 0;
  const showTrending = !showResults && trendingVideos.length > 0;

  return (
    <div className="pop wobble col overflow-hidden" style={{ flex: 1, minHeight: 0, boxShadow: '7px 7px 0 var(--shadow)' }}>
      {/* header */}
      <div className="flex items-center justify-between" style={{ padding: '13px 15px', borderBottom: '3px solid var(--outline)' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 19 }}>⚡</span>
          <div className="display" style={{ fontSize: 18 }}>Discover</div>
        </div>
        <span className="chip" style={{ background: 'var(--accent-2)', color: '#140f1f' }}>fresh drops</span>
      </div>

      {/* search */}
      <form onSubmit={onSearch} style={{ padding: '10px 12px', borderBottom: '2px solid var(--line)' }}>
        <div className="flex gap-2">
          <input
            className="field"
            style={{ fontSize: 13, padding: '9px 13px', flex: 1 }}
            placeholder="Search YouTube or paste URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={addingUrl}
          />
          <button
            type="submit"
            className="btn btn-accent"
            disabled={searching || addingUrl || !searchQuery.trim()}
            style={{ padding: '9px 14px', flexShrink: 0 }}
          >
            {searching || addingUrl ? '...' : '🔍'}
          </button>
        </div>
      </form>

      {/* content */}
      <div className="scroll col" style={{ flex: 1, overflowY: 'auto', padding: 8, gap: 4 }}>

        {showResults && (
          <>
            {searchResults.map((v) => (
              <TrackRow
                key={v.id}
                id={v.id}
                title={v.title}
                sub={v.channelTitle}
                duration={fmt(v.durationSeconds)}
                thumbnail={v.thumbnail}
                queued={queuedVideoIds.has(v.id)}
                onAdd={() => onAddSong(v.id, v.title, v.thumbnail, v.durationSeconds)}
              />
            ))}
            {nextPageToken && (
              <button
                className="btn pop-sm"
                onClick={onLoadMore}
                disabled={loadingMore}
                style={{ margin: '4px auto', fontSize: 12 }}
              >
                {loadingMore ? '...' : 'LOAD MORE'}
              </button>
            )}
          </>
        )}

        {showTrending && (
          <>
            <SectionLabel label="🔥 Trending" loading={trendingLoading} />
            {trendingVideos.map((v) => (
              <TrackRow
                key={v.id}
                id={v.id}
                title={v.title}
                sub={v.channelTitle}
                duration={v.duration}
                thumbnail={v.thumbnail}
                queued={queuedVideoIds.has(v.id)}
                onAdd={() => onAddSong(v.id, v.title, v.thumbnail, v.durationSeconds)}
              />
            ))}
          </>
        )}

        {!showResults && latestVideos.length > 0 && (
          <>
            <SectionLabel label="🆕 Latest" loading={latestLoading} />
            {latestVideos.map((v) => (
              <TrackRow
                key={v.id}
                id={v.id}
                title={v.title}
                sub={v.channelTitle}
                duration={v.duration}
                thumbnail={v.thumbnail}
                queued={queuedVideoIds.has(v.id)}
                onAdd={() => onAddSong(v.id, v.title, v.thumbnail, v.durationSeconds)}
              />
            ))}
          </>
        )}

        {!showResults && freshVideos.length > 0 && (
          <>
            <SectionLabel label="✨ Fresh" loading={freshLoading} />
            {freshVideos.map((v) => (
              <TrackRow
                key={v.id}
                id={v.id}
                title={v.title}
                sub={v.channelTitle}
                duration={v.duration}
                thumbnail={v.thumbnail}
                queued={queuedVideoIds.has(v.id)}
                onAdd={() => onAddSong(v.id, v.title, v.thumbnail, v.durationSeconds)}
              />
            ))}
          </>
        )}

        {!searching && !showResults && !showTrending && !trendingLoading && (
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', textAlign: 'center', margin: 'auto', padding: '20px 12px', lineHeight: 1.7 }}>
            search youtube or paste a link<br />to add tracks to the queue ✨
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ label, loading }: { label: string; loading: boolean }) {
  return (
    <div className="mono flex items-center gap-2" style={{ fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '.1em', padding: '8px 4px 4px' }}>
      {label}
      {loading && <span style={{ opacity: .6 }}>…</span>}
    </div>
  );
}

function TrackRow({ id, title, sub, duration, thumbnail, queued, onAdd }: {
  id: string; title: string; sub: string; duration: string;
  thumbnail: string; queued: boolean; onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-2" style={{ padding: '7px 8px', borderRadius: 12, border: '2.5px solid var(--line)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 9, overflow: 'hidden', border: '2.5px solid var(--outline)', flexShrink: 0 }}>
        {thumbnail
          ? <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div className="ph" style={{ width: '100%', height: '100%' }} />
        }
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {sub} · {duration}
        </div>
      </div>
      <button
        className={`btn pop-sm btn-icon ${queued ? '' : 'btn-accent'}`}
        onClick={onAdd}
        disabled={queued}
        style={{ flexShrink: 0, padding: 8, opacity: queued ? .6 : 1 }}
        title={queued ? 'Already in queue' : 'Add to queue'}
      >
        {queued ? '✓' : '+'}
      </button>
    </div>
  );
}
