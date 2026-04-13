import { NextRequest } from 'next/server';
import { parseISO8601Duration } from '@/lib/youtube';
import { getRegionCodeFromTimezone } from '@/lib/region';

// Fresh This Week — music released in the last 7 days ordered by view count.
// Step 1: search.list (100 quota units) to find new music videos.
// Step 2: videos.list (1 quota unit) to enrich with duration + view count.
// Total: ~101 quota units per uncached call; cached for 30 min.

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const regionCode = getRegionCodeFromTimezone(searchParams.get('timezone'));
  const maxResults = parseInt(searchParams.get('maxResults') || '8', 10);

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'YouTube API key not configured' }, { status: 500 });
  }

  const rawReferer = request.headers.get('referer');
  const referer = rawReferer ? new URL(rawReferer).origin : request.nextUrl.origin;

  try {
    // 7 days ago in RFC 3339 format
    const publishedAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Step 1 — search.list: fresh music videos this week, ordered by view popularity
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('videoCategoryId', '10'); // Music
    searchUrl.searchParams.set('order', 'viewCount');
    searchUrl.searchParams.set('publishedAfter', publishedAfter);
    searchUrl.searchParams.set('regionCode', regionCode);
    searchUrl.searchParams.set('maxResults', String(maxResults));
    searchUrl.searchParams.set('key', apiKey);

    const searchRes = await fetch(searchUrl.toString(), {
      headers: { Referer: referer },
      next: { revalidate: 1800 }, // Cache 30 minutes
    });

    if (!searchRes.ok) {
      const err = await searchRes.text();
      console.error('YouTube fresh search error:', err);
      return Response.json({ error: 'YouTube fresh fetch failed' }, { status: searchRes.status });
    }

    const searchData = await searchRes.json();

    if (!searchData.items || searchData.items.length === 0) {
      return Response.json({ results: [] });
    }

    // Step 2 — videos.list: get duration + stats for the discovered video IDs
    const videoIds = searchData.items
      .map((item: { id: { videoId: string } }) => item.id.videoId)
      .filter(Boolean)
      .join(',');

    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    videosUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
    videosUrl.searchParams.set('id', videoIds);
    videosUrl.searchParams.set('key', apiKey);

    const videosRes = await fetch(videosUrl.toString(), {
      headers: { Referer: referer },
      next: { revalidate: 1800 },
    });

    if (!videosRes.ok) {
      const err = await videosRes.text();
      console.error('YouTube fresh videos.list error:', err);
      return Response.json({ error: 'YouTube videos detail fetch failed' }, { status: videosRes.status });
    }

    const videosData = await videosRes.json();

    if (!videosData.items) {
      return Response.json({ results: [] });
    }

    const results = videosData.items.map(
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

    return Response.json({ results, regionCode });
  } catch (error) {
    console.error('YouTube fresh error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
