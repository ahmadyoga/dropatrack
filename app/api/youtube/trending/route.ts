import { NextRequest } from 'next/server';
import { parseISO8601Duration } from '@/lib/youtube';

// Server-side only — fetches trending music videos from YouTube Data API v3
// Uses videos.list with chart=mostPopular and videoCategoryId=10 (Music)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const regionCode = searchParams.get('regionCode') || 'ID';
  const maxResults = searchParams.get('maxResults') || '10';

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'YouTube API key not configured' },
      { status: 500 }
    );
  }

  const referer = "https://dropatrack.vercel.app";

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&videoCategoryId=10&regionCode=${encodeURIComponent(regionCode)}&maxResults=${encodeURIComponent(maxResults)}&key=${apiKey}`;
    console.log(url);

    const res = await fetch(url, {
      headers: { Referer: referer },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('YouTube trending API error:', err);
      return Response.json(
        { error: 'YouTube trending fetch failed' },
        { status: res.status }
      );
    }

    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      return Response.json({ results: [] });
    }

    const results = data.items.map(
      (item: {
        id: string;
        snippet: {
          title: string;
          thumbnails: { medium: { url: string }; high?: { url: string } };
          channelTitle: string;
          publishedAt: string;
        };
        contentDetails: { duration: string };
        statistics: { viewCount?: string; likeCount?: string };
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
    console.error('YouTube trending error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
