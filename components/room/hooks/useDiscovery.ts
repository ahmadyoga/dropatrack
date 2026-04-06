import { useState, useCallback, useEffect } from 'react';
import type { TrendingVideo } from '@/lib/types';
import type { CuratedSection } from '@/lib/curatedPlaylists';

interface EnrichedPlaylist { id: string; title: string; description: string; thumbnail: string; itemCount: number; }
interface EnrichedSection extends Omit<CuratedSection, 'playlists'> { playlists: EnrichedPlaylist[]; }

interface UseDiscoveryProps {
  userTimezone: string;
}

export function useDiscovery({ userTimezone }: UseDiscoveryProps) {
  const [trendingVideos, setTrendingVideos] = useState<TrendingVideo[]>([]);
  const [latestVideos, setLatestVideos] = useState<TrendingVideo[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [latestLoading, setLatestLoading] = useState(true);
  const [curatedSections, setCuratedSections] = useState<EnrichedSection[]>([]);
  const [curatedLoading, setCuratedLoading] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ id: string; title: string } | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<TrendingVideo[]>([]);
  const [playlistVideosLoading, setPlaylistVideosLoading] = useState(false);
  const [showAllPlaylists, setShowAllPlaylists] = useState(false);

  const fetchTrending = useCallback(async (region: string) => {
    setTrendingLoading(true);
    try {
      const res = await fetch(`/api/youtube/trending?timezone=${encodeURIComponent(region)}&maxResults=10`);
      const data = await res.json();
      if (data.results) setTrendingVideos(data.results);
    } catch (err) { console.error('Trending fetch failed:', err); }
    finally { setTrendingLoading(false); }
  }, []);

  const fetchLatest = useCallback(async () => {
    setLatestLoading(true);
    try {
      const res = await fetch(`/api/youtube/latest?maxResults=10&timezone=${userTimezone}`);
      const data = await res.json();
      if (data.results) setLatestVideos(data.results);
    } catch (err) { console.error('Latest fetch failed:', err); }
    finally { setLatestLoading(false); }
  }, [userTimezone]);

  const openPlaylist = useCallback(async (playlistId: string, title: string) => {
    setSelectedPlaylist({ id: playlistId, title });
    setPlaylistVideosLoading(true);
    setPlaylistVideos([]);
    try {
      const res = await fetch(`/api/youtube/playlists/${playlistId}?maxResults=20`);
      const data = await res.json();
      if (data.videos) setPlaylistVideos(data.videos);
    } catch (err) { console.error('Playlist fetch failed:', err); }
    finally { setPlaylistVideosLoading(false); }
  }, []);

  useEffect(() => { fetchTrending(userTimezone); }, [userTimezone, fetchTrending]);
  useEffect(() => { fetchLatest(); }, [fetchLatest]);

  useEffect(() => {
    const fetchCurated = async () => {
      setCuratedLoading(true);
      try {
        const res = await fetch(`/api/youtube/curated?timezone=${userTimezone}`);
        const data = await res.json();
        if (data.sections) setCuratedSections(data.sections);
      } catch (err) { console.error('Curated fetch failed:', err); }
      finally { setCuratedLoading(false); }
    };
    fetchCurated();
  }, [userTimezone]);

  return {
    trendingVideos, latestVideos, trendingLoading, latestLoading,
    curatedSections, curatedLoading,
    selectedPlaylist, setSelectedPlaylist,
    playlistVideos, playlistVideosLoading,
    showAllPlaylists, setShowAllPlaylists,
    fetchTrending, fetchLatest, openPlaylist,
  };
}
