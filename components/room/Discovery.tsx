'use client';

import type { TrendingVideo } from '@/lib/types';
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
  queuedVideoIds, searching, addingUrl, canAddSongs,
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
      <div className="main-top">
        <form onSubmit={onSearch} className="search-bar">
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
            {/* Latest Drops — Hero layout */}
            <div className="section-header">
              <span className="sec-title">Latest Drops</span>
              <span className="sec-see" onClick={onRefreshLatest}>{latestLoading ? '...' : 'Refresh'}</span>
            </div>

            <div className="drops-hero-grid">
              {latestLoading ? (
                /* Skeleton */
                <>
                  <div className="skeleton-box drops-hero-card" style={{ borderRadius: 12 }} />
                  <div className="drops-side-grid">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="skeleton-box" style={{ borderRadius: 10 }} />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Hero card — first video, large */}
                  {latestVideos[0] && (() => {
                    const v = latestVideos[0];
                    const isAdded = queuedVideoIds.has(v.id);
                    return (
                      <div className="drop-card drops-hero-card" onClick={() => onAddSong(v.id, v.title, v.thumbnail, v.durationSeconds)}>
                        <div className="dc-thumb">
                          <img src={v.thumbnail} alt={v.title} />
                          <div className="dc-overlay" />
                          <div className="dc-badge"><span className="badge b-hot">🔥 Trending</span></div>
                          <div className={`dc-add ${isAdded ? 'added' : ''}`}>
                            {isAdded
                              ? <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                              : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                            }
                          </div>
                          <div className="dc-dur">{formatDuration(v.durationSeconds)}</div>
                          {/* Hero title overlay */}
                          <div className="hero-title-overlay">
                            <div className="hero-title">{v.title}</div>
                            <div className="hero-meta">{v.channelTitle} · {formatViewCount(v.viewCount)} views</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Side grid — next 4 videos */}
                  <div className="drops-side-grid">
                    {latestVideos.slice(1, 5).map((video, index) => {
                      const isAdded = queuedVideoIds.has(video.id);
                      return (
                        <div key={video.id} className="drop-card" onClick={() => onAddSong(video.id, video.title, video.thumbnail, video.durationSeconds)}>
                          <div className="dc-thumb">
                            <img src={video.thumbnail} alt={video.title} />
                            <div className="dc-overlay" />
                            <div className="dc-badge">
                              {index === 0 ? <span className="badge b-new">New</span> : null}
                            </div>
                            <div className={`dc-add ${isAdded ? 'added' : ''}`}>
                              {isAdded
                                ? <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                                : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                              }
                            </div>
                            <div className="dc-dur">{formatDuration(video.durationSeconds)}</div>
                          </div>
                          <div className="dc-info">
                            <div className="dc-title">{video.title}</div>
                            <div className="dc-meta">
                              <span className="dc-channel">{video.channelTitle}</span>
                              <span className="dc-views">{formatViewCount(video.viewCount)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Lower section — 60/40 split */}
            <div className="lower-grid">

              {/* Trending — 60% */}
              <div className="trending-col">
                <div className="section-header">
                  <span className="sec-title">Trending Now</span>
                  <span className="sec-see" onClick={onRefreshTrending}>{trendingLoading ? '...' : 'Refresh'}</span>
                </div>
                <div className="trend-list">
                  {trendingLoading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="trend-row">
                          <div className="tr-rank" style={{ opacity: 0.3 }}>{i + 1}</div>
                          <div className="skeleton-box" style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0 }} />
                          <div className="tr-info">
                            <div className="skeleton-text" style={{ width: '70%', marginBottom: 6 }} />
                            <div className="skeleton-text" style={{ width: '45%' }} />
                          </div>
                        </div>
                      ))
                    : trendingVideos.map((video, index) => {
                        const isAdded = queuedVideoIds.has(video.id);
                        const rank = index + 1;
                        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
                        return (
                          <div key={video.id} className={`trend-row ${isAdded ? 'trend-added' : ''}`} onClick={() => onAddSong(video.id, video.title, video.thumbnail, video.durationSeconds)}>
                            <div className={`tr-rank ${rankClass}`}>{rank}</div>
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
              </div>

              {/* Playlists — 40% vertical list */}
              <div className="playlists-col">
                <div className="section-header">
                  <span className="sec-title">Playlists</span>
                  <span className="sec-see" onClick={() => setShowAllPlaylists(true)}>See all</span>
                </div>
                <div className="playlist-list">
                  {curatedLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="playlist-row skeleton-box" />
                      ))
                    : curatedSections[0]?.playlists.slice(0, 6).map((pl, idx) => (
                        <div key={pl.id} className="playlist-row" onClick={() => onOpenPlaylist(pl.id, pl.title)}>
                          {/* Full-bleed background */}
                          <div className="pl-art" style={!pl.thumbnail ? { background: GRADIENT_COLORS[idx % 4] } : {}}>
                            {pl.thumbnail && <img src={pl.thumbnail} alt={pl.title} />}
                            {!pl.thumbnail && <span style={{ fontSize: 24, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 2 }}>{curatedSections[0].emoji}</span>}
                          </div>
                          <div className="pl-overlay" />
                          {/* Play button */}
                          <div className="pl-play">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                          </div>
                          {/* Info overlay */}
                          <div className="pl-info">
                            <div className="pl-title">{pl.title}</div>
                            <div className="pl-count">
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                              {pl.itemCount} songs
                            </div>
                          </div>
                        </div>
                      ))
                  }
                </div>
              </div>

            </div>
          </>
        )}

      </div>
    </main>
  );
}
