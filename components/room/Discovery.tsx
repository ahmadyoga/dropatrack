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
      <div className="main-top">
        <form onSubmit={onSearch} className="search-bar">
          <span className="s-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
          </span>
          <input
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

      <div className="main-scroll">
        {(searchResults.length > 0 || searching) ? (
          <>
            <div className="section-header">
              <span className="sec-title">Search Results</span>
              <span className="sec-see" onClick={() => { setSearchResults([]); setSearchQuery(''); }}>Clear</span>
            </div>
            <div className="search-results-grid">
              {searchResults.map((result) => {
                const isAdded = queuedVideoIds.has(result.id);
                return (
                  <div
                    key={result.id}
                    className={`search-result-row ${isAdded ? 'added' : ''}`}
                    onClick={() => onAddSong(result.id, result.title, result.thumbnail, result.durationSeconds)}
                  >
                    <div style={{ width: 84, height: 58, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                      <img src={result.thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="thumb" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--theme-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', marginTop: 4 }}>{result.channelTitle} · {formatDuration(result.durationSeconds)}</div>
                    </div>
                    {isAdded
                      ? <div style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600 }}>Added</div>
                      : <div style={{ fontSize: 26, color: 'var(--theme-text-muted)' }}>+</div>
                    }
                  </div>
                );
              })}
            </div>
            {nextPageToken && (
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                style={{ background: 'rgba(29,185,84,0.1)', color: '#1db954', border: '1px solid rgba(29,185,84,0.2)', width: '100%', padding: '8px 0', borderRadius: 8, marginTop: 12, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            )}
          </>
        ) : (
          <>
            {/* Latest Drops */}
            {!showAllPlaylists && !selectedPlaylist && (
              <>
                <div className="section-header" style={{ marginTop: 18 }}>
                  <span className="sec-title">Latest drops</span>
                  <span className="sec-see" onClick={onRefreshLatest}>{latestLoading ? '...' : 'Refresh'}</span>
                </div>
                <div className="drops-row">
                  {latestLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="drop-card" style={{ height: 160 }}>
                        <div className="skeleton-box" style={{ width: '100%', height: '100%' }} />
                      </div>
                    ))
                  ) : (
                    latestVideos.map((video, index) => {
                      const isAdded = queuedVideoIds.has(video.id);
                      return (
                        <div key={video.id} className="drop-card" onClick={() => onAddSong(video.id, video.title, video.thumbnail, video.durationSeconds)}>
                          <div className="dc-thumb">
                            <img src={video.thumbnail} alt={video.title} />
                            <div className="dc-overlay" />
                            <div className="dc-badge">
                              {index === 0 ? <span className="badge b-hot">ON TRENDING</span> : <span className="badge b-new">NEW</span>}
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
                              <span className="dc-views">{formatViewCount(video.viewCount)} views</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* Playlist view */}
            {selectedPlaylist ? (
              <>
                <div className="section-header" style={{ marginTop: 18 }}>
                  <span className="sec-title" style={{ cursor: 'pointer' }} onClick={() => setSelectedPlaylist(null)}>← {selectedPlaylist.title}</span>
                  <span className="sec-see" onClick={() => setSelectedPlaylist(null)}>Back</span>
                </div>
                <div className="trend-list">
                  {playlistVideosLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="trend-row">
                          <div className="tr-rank" style={{ opacity: 0.3 }}>{i + 1}</div>
                          <div className="skeleton-box" style={{ width: 32, height: 32, borderRadius: 6, flexShrink: 0 }} />
                          <div className="tr-info">
                            <div className="skeleton-text" style={{ width: '70%', height: 10 }} />
                            <div className="skeleton-text" style={{ width: '50%', height: 8, marginTop: 4 }} />
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
                            {isAdded ? <button className="tr-btn done">✓ Added</button> : <button className="tr-btn add">+ Add</button>}
                          </div>
                        );
                      })
                  }
                </div>
              </>
            ) : showAllPlaylists ? (
              <>
                <div className="section-header" style={{ marginTop: 18 }}>
                  <span className="sec-title" style={{ cursor: 'pointer' }} onClick={() => setShowAllPlaylists(false)}>← All Curated Playlists</span>
                  <span className="sec-see" onClick={() => setShowAllPlaylists(false)}>Back</span>
                </div>
                {curatedSections.map((section, sIdx) => (
                  <div key={sIdx} style={{ marginBottom: 20 }}>
                    <div className="section-header" style={{ marginTop: 12, marginBottom: 12 }}>
                      <span className="sec-title" style={{ fontSize: 13, color: 'var(--theme-text-primary)' }}>{section.title}</span>
                    </div>
                    <div className="mix-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                      {section.playlists.map((pl, idx) => (
                        <div key={pl.id} className="mix-card" onClick={() => onOpenPlaylist(pl.id, pl.title)}>
                          <div className="mix-bg" style={{ background: GRADIENT_COLORS[idx % 4] }}>
                            {pl.thumbnail ? <img src={pl.thumbnail} alt={pl.title} /> : section.emoji}
                          </div>
                          <div className="mix-overlay"></div>
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
              <div className="lower-grid">
                {/* Trending Now */}
                <div>
                  <div className="section-header">
                    <span className="sec-title">Trending now</span>
                    <span className="sec-see" onClick={onRefreshTrending}>{trendingLoading ? '...' : 'Refresh'}</span>
                  </div>
                  <div className="trend-list">
                    {trendingLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="trend-row">
                            <div className="tr-rank" style={{ opacity: 0.4 }}>{i + 1}</div>
                            <div className="skeleton-box" style={{ width: 32, height: 32, borderRadius: 6, flexShrink: 0 }} />
                            <div className="tr-info">
                              <div className="skeleton-text" style={{ width: '70%', height: 10 }} />
                              <div className="skeleton-text" style={{ width: '50%', height: 8, marginTop: 4 }} />
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
                              {isAdded ? <button className="tr-btn done">✓ Added</button> : <button className="tr-btn add">+ Add</button>}
                            </div>
                          );
                        })
                    }
                  </div>
                </div>

                {/* Music Playlists */}
                <div className="playlist-panel">
                  <div className="section-header">
                    <span className="sec-title">Music playlists</span>
                    <span className="sec-see" onClick={() => setShowAllPlaylists(true)}>See all</span>
                  </div>
                  <div className="mix-grid mix-grid-panel">
                    {curatedLoading
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="mix-card skeleton-box" style={{ borderRadius: 10 }} />
                        ))
                      : curatedSections.length > 0
                        ? curatedSections[0].playlists.slice(0, 4).map((pl, idx) => (
                            <div key={pl.id} className="mix-card mix-card-panel" onClick={() => onOpenPlaylist(pl.id, pl.title)}>
                              <div className="mix-bg" style={{ background: GRADIENT_COLORS[idx % 4] }}>
                                {pl.thumbnail ? <img src={pl.thumbnail} alt={pl.title} /> : curatedSections[0].emoji}
                              </div>
                              <div className="mix-overlay"></div>
                              <div className="mix-plus">+{pl.itemCount}</div>
                              <div className="mix-content">
                                <div className="mix-label">{pl.title}</div>
                                <div className="mix-count">{pl.itemCount} songs</div>
                              </div>
                              <div className="mix-play">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                              </div>
                            </div>
                          ))
                        : null
                    }
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
