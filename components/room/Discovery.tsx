'use client';

import type { TrendingVideo, RoomUser } from '@/lib/types';
import type { CuratedSection } from '@/lib/curatedPlaylists';
import { formatDuration } from '@/lib/youtube';

interface EnrichedPlaylist { id: string; title: string; description: string; thumbnail: string; itemCount: number; }
interface EnrichedSection extends Omit<CuratedSection, 'playlists'> { playlists: EnrichedPlaylist[]; }

function formatViewCount(count: number): string {
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

const GRADIENT_COLORS = [
  'linear-gradient(135deg, #f037a5, #880e4f)',
  'linear-gradient(135deg, #1DB954, #127435)',
  'linear-gradient(135deg, #ff9800, #e65100)',
  'linear-gradient(135deg, #2979ff, #0d47a1)',
];

interface DiscoveryProps {
  users: RoomUser[];
  queuedVideoIds: Set<string>;
  searching: boolean;
  addingUrl: boolean;
  canAddSongs: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: Array<{ id: string; title: string; thumbnail: string; channelTitle: string; duration: string; durationSeconds: number; }>;
  setSearchResults: (r: Array<{ id: string; title: string; thumbnail: string; channelTitle: string; duration: string; durationSeconds: number; }>) => void;
  nextPageToken: string | null;
  loadingMore: boolean;
  latestVideos: TrendingVideo[];
  latestLoading: boolean;
  trendingVideos: TrendingVideo[];
  trendingLoading: boolean;
  curatedSections: EnrichedSection[];
  curatedLoading: boolean;
  selectedPlaylist: { id: string; title: string } | null;
  setSelectedPlaylist: (p: { id: string; title: string } | null) => void;
  playlistVideos: TrendingVideo[];
  playlistVideosLoading: boolean;
  showAllPlaylists: boolean;
  setShowAllPlaylists: (v: boolean) => void;
  onSearch: (e: React.FormEvent) => void;
  onLoadMore: () => void;
  onAddSong: (id: string, title: string, thumbnail: string, durationSeconds: number) => void;
  onOpenPlaylist: (id: string, title: string) => void;
  onRefreshTrending: () => void;
  onRefreshLatest: () => void;
}

export default function Discovery({
  users, queuedVideoIds, searching, addingUrl, canAddSongs,
  searchQuery, setSearchQuery, searchResults, setSearchResults,
  nextPageToken, loadingMore,
  latestVideos, latestLoading, trendingVideos, trendingLoading,
  curatedSections, curatedLoading,
  selectedPlaylist, setSelectedPlaylist, playlistVideos, playlistVideosLoading,
  showAllPlaylists, setShowAllPlaylists,
  onSearch, onLoadMore, onAddSong, onOpenPlaylist, onRefreshTrending, onRefreshLatest,
}: DiscoveryProps) {
  return (
    <main className="main">

      {/* ── Search header ── */}
      <div className="main-top" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <form onSubmit={onSearch} className="search-bar" style={{ flex: 1 }}>
          <span className="s-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
          </span>
          <input
            id="discovery-search"
            className="search-input"
            type="text"
            placeholder="Search artists, songs, albums or YouTube URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={searching || addingUrl || !canAddSongs}
          />
          <button type="submit" className="search-btn" disabled={searching || !searchQuery.trim() || !canAddSongs}>
            {searching ? '...' : (addingUrl ? 'Adding...' : 'Search')}
          </button>
        </form>
        <div className="active-users-stack" style={{ display: 'flex', alignItems: 'center' }}>
          {users.map((u, i) => (
            <div key={u.user_id} className="avatar-circle" title={u.username} style={{ background: u.avatar_color, zIndex: 10 - i, marginLeft: i > 0 ? -8 : 0, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 'bold', border: '2px solid var(--theme-glass-bg)', color: 'var(--theme-text-primary)' }}>
              {u.username.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="main-scroll">

        {/* ══ SEARCH RESULTS ══ */}
        {(searchResults.length > 0 || searching) ? (
          <>
            <div className="section-header">
              <span className="sec-title">Search Results</span>
              <span className="sec-see" onClick={() => { setSearchResults([]); setSearchQuery(''); }}>✕ Clear</span>
            </div>
            <div className="search-results-grid">
              {searching && searchResults.length === 0
                ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="search-result-row">
                    <div className="skeleton-box" style={{ width: 84, height: 54, borderRadius: 6, flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="skeleton-text" style={{ width: '75%' }} />
                      <div className="skeleton-text" style={{ width: '45%' }} />
                    </div>
                  </div>
                ))
                : searchResults.map((result) => {
                  const isAdded = queuedVideoIds.has(result.id);
                  return (
                    <div
                      key={result.id}
                      className={`search-result-row ${isAdded ? 'added' : ''}`}
                      onClick={() => onAddSong(result.id, result.title, result.thumbnail, result.durationSeconds)}
                    >
                      <div className="sr-thumb">
                        <img src={result.thumbnail} alt={result.title} />
                      </div>
                      <div className="sr-info">
                        <div className="sr-title">{result.title}</div>
                        <div className="sr-meta">{result.channelTitle} · {formatDuration(result.durationSeconds)}</div>
                      </div>
                      <div className={`sr-add ${isAdded ? 'sr-add--added' : ''}`}>
                        {isAdded
                          ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg> Added</>
                          : <><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg> Add</>
                        }
                      </div>
                    </div>
                  );
                })
              }
            </div>
            {nextPageToken && (
              <button className="load-more-btn" onClick={onLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            )}
          </>

        ) : selectedPlaylist ? (
          /* ══ PLAYLIST DETAIL ══ */
          <>
            <div className="section-header">
              <span className="sec-title sec-title--back" onClick={() => setSelectedPlaylist(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
                {selectedPlaylist.title}
              </span>
              <span className="sec-see" onClick={() => setSelectedPlaylist(null)}>Back</span>
            </div>
            <div className="trend-list">
              {playlistVideosLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="trend-row">
                    <div className="tr-rank" style={{ opacity: 0.3 }}>{i + 1}</div>
                    <div className="skeleton-box" style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0 }} />
                    <div className="tr-info">
                      <div className="skeleton-text" style={{ width: '70%', marginBottom: 6 }} />
                      <div className="skeleton-text" style={{ width: '45%' }} />
                    </div>
                  </div>
                ))
                : playlistVideos.map((video, index) => {
                  const isAdded = queuedVideoIds.has(video.id);
                  return (
                    <div key={video.id} className={`trend-row ${isAdded ? 'trend-added' : ''}`} onClick={() => onAddSong(video.id, video.title, video.thumbnail, video.durationSeconds)}>
                      <div className="tr-rank" style={{ opacity: 0.4 }}>{index + 1}</div>
                      <div className="tr-av"><img src={video.thumbnail} alt={video.title} /></div>
                      <div className="tr-info">
                        <div className="tr-title">{video.title}</div>
                        <div className="tr-meta">{video.channelTitle} · {formatViewCount(video.viewCount)} views</div>
                      </div>
                      {isAdded
                        ? <button className="tr-btn done">✓ Added</button>
                        : <button className="tr-btn add">+ Add</button>
                      }
                    </div>
                  );
                })
              }
            </div>
          </>

        ) : showAllPlaylists ? (
          /* ══ ALL PLAYLISTS VIEW ══ */
          <>
            <div className="section-header">
              <span className="sec-title sec-title--back" onClick={() => setShowAllPlaylists(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
                All Playlists
              </span>
              <span className="sec-see" onClick={() => setShowAllPlaylists(false)}>Back</span>
            </div>
            {curatedSections.map((section, sIdx) => (
              <div key={sIdx} className="playlist-section">
                <div className="section-header" style={{ marginTop: 12 }}>
                  <span className="sec-title">{section.emoji} {section.title}</span>
                </div>
                <div className="mix-grid mix-grid--4col">
                  {section.playlists.map((pl, idx) => (
                    <div key={pl.id} className="mix-card" onClick={() => onOpenPlaylist(pl.id, pl.title)}>
                      <div className="mix-bg" style={{ background: GRADIENT_COLORS[idx % 4] }}>
                        {pl.thumbnail ? <img src={pl.thumbnail} alt={pl.title} /> : section.emoji}
                      </div>
                      <div className="mix-overlay" />
                      <div className="mix-plus">+{pl.itemCount}</div>
                      <div className="mix-content">
                        <div className="mix-label">{pl.title}</div>
                        <div className="mix-count">{pl.itemCount} songs</div>
                      </div>
                      <div className="mix-play">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>

        ) : (
          /* ══ DEFAULT DISCOVERY VIEW ══ */
          <>
            {/* Hero & Popular Layout */}
            <div className="hero-popular-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '24px', marginBottom: '32px' }}>

              {/* Left Column: Hero */}
              <div className="hero-col">
                <div className="section-header" style={{ marginTop: 0 }}>
                  <span className="sec-title">Home &gt; Artists</span>
                </div>
                {trendingVideos[0] && (() => {
                  const v = trendingVideos[0];
                  const isAdded = queuedVideoIds.has(v.id);
                  return (
                    <div className="hero-banner" style={{ background: `url(${v.thumbnail}) center/cover no-repeat`, borderRadius: '24px', padding: '40px 32px 32px', position: 'relative', overflow: 'hidden', minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }} />
                      <div style={{ position: 'relative', zIndex: 2 }}>
                        <h1 style={{ fontSize: '48px', fontWeight: 800, margin: '0 0 16px', lineHeight: 1.1 }}>{v.title}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                          <button onClick={() => onAddSong(v.id, v.title, v.thumbnail, v.durationSeconds)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '30px' }}>
                            {isAdded ? '✓ Added' : '▶ Play'}
                          </button>
                          <button className="btn-ghost" style={{ borderRadius: '30px', borderColor: 'var(--theme-glass-border)' }}>Following</button>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--theme-text-muted)', fontWeight: 500 }}>{formatViewCount(v.viewCount)} monthly listeners ({v.channelTitle})</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Fans Also Like (Square grid) */}
                <div className="section-header" style={{ marginTop: '32px' }}>
                  <span className="sec-title" style={{ fontSize: '16px', fontWeight: 700, textTransform: 'none', color: 'var(--theme-text-primary)' }}>Fans Also Like</span>
                  <span className="sec-see" onClick={onRefreshLatest}>{latestLoading ? '...' : 'View All'}</span>
                </div>
                <div className="fans-also-like-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                  {latestVideos.slice(0, 4).map((v) => {
                    const isAdded = queuedVideoIds.has(v.id);
                    return (
                      <div key={v.id} className="fan-card" onClick={() => onAddSong(v.id, v.title, v.thumbnail, v.durationSeconds)} style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', aspectRatio: '1' }}>
                        <img src={v.thumbnail} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px' }}>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--theme-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>16 Tracks</span>
                            <span style={{ fontSize: '11px', color: '#8b87a6' }}>View All</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Popular */}
              <div className="popular-col">
                <div className="section-header" style={{ marginTop: 0 }}>
                  <span className="sec-title" style={{ fontSize: '16px', fontWeight: 700, textTransform: 'none', color: 'var(--theme-text-primary)' }}>Popular</span>
                </div>
                <div className="popular-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {trendingVideos.slice(1, 6).map((video, index) => {
                    const isAdded = queuedVideoIds.has(video.id);
                    return (
                      <div key={video.id} className={`popular-item ${isAdded ? 'added' : ''}`} onClick={() => onAddSong(video.id, video.title, video.thumbnail, video.durationSeconds)} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s' }}>
                        <img src={video.thumbnail} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--theme-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{video.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--theme-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{video.channelTitle} • {formatDuration(video.durationSeconds)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </>
        )}

      </div>
    </main>
  );
}
