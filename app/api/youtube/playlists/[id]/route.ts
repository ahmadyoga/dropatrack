import { NextRequest } from 'next/server';
import { parseISO8601Duration } from '@/lib/youtube';

// Server-side only — fetches videos from a specific YouTube playlist
// Uses playlistItems.list (1 quota) + videos.list (1 quota) = 2 quota units

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playlistId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const maxResults = searchParams.get('maxResults') || '20';

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'YouTube API key not configured' }, { status: 500 });
  }

  const rawReferer = request.headers.get('referer');
  const referer = rawReferer ? new URL(rawReferer).origin : request.nextUrl.origin;

  try {
    // Step 1: Get playlist items (1 quota unit)
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(playlistId)}&maxResults=${encodeURIComponent(maxResults)}&key=${apiKey}`;

    const playlistRes = await fetch(playlistUrl, {
      headers: { Referer: referer },
      next: { revalidate: 300 },
    });

    if (!playlistRes.ok) {
      const err = await playlistRes.text();
      console.error('YouTube playlistItems error:', err);
      return Response.json({ error: 'Playlist fetch failed' }, { status: playlistRes.status });
    }

    const playlistData = await playlistRes.json();

    if (!playlistData.items || playlistData.items.length === 0) {
      return Response.json({ videos: [] });
    }

    // Step 2: Get video details (duration, views) — 1 quota unit
    const videoIds = playlistData.items
      .map((item: { snippet: { resourceId: { videoId: string } } }) => item.snippet.resourceId.videoId)
      .filter(Boolean)
      .join(',');

    const detailsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,statistics&id=${videoIds}&key=${apiKey}`,
      { headers: { Referer: referer }, next: { revalidate: 300 } }
    );

    if (!detailsRes.ok) {
      return Response.json({ error: 'Video details failed' }, { status: detailsRes.status });
    }

    const detailsData = await detailsRes.json();

    const videos = detailsData.items.map(
      (item: {
        id: string;
        snippet: {
          title: string;
          thumbnails: { medium: { url: string }; high?: { url: string } };
          channelTitle: string;
          publishedAt: string;
        };
        contentDetails: { duration: string };
        statistics: { viewCount?: string };
      }) => ({
        id: item.id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium.url,
        channelTitle: item.snippet.channelTitle,
        duration: item.contentDetails.duration,
        durationSeconds: parseISO8601Duration(item.contentDetails.duration),
        viewCount: item.statistics.viewCount ? parseInt(item.statistics.viewCount, 10) : 0,
        publishedAt: item.snippet.publishedAt,
      })
    );

    return Response.json({ videos });
  } catch (error) {
    console.error('YouTube playlist items error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
