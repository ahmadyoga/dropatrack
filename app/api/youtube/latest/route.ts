import { NextRequest } from 'next/server';
import { parseISO8601Duration } from '@/lib/youtube';
import { getRegionCodeFromTimezone } from '@/lib/region';

// Server-side only — fetches the latest (newest) popular music videos
// Uses videos.list with chart=mostPopular, videoCategoryId=10 (2 quota units total)
// Sorts by publishedAt to surface the newest entries first

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const maxResults = searchParams.get('maxResults') || '10';
  const regionCode = getRegionCodeFromTimezone(searchParams.get('timezone'));

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'YouTube API key not configured' },
      { status: 500 }
    );
  }

  const referer = "https://dropatrack.vercel.app";

  try {
    // Fetch most popular music videos — we'll sort by newest publish date
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&videoCategoryId=10&regionCode=${encodeURIComponent(regionCode)}&maxResults=${encodeURIComponent(maxResults)}&key=${apiKey}`;

    const res = await fetch(url, {
      headers: { Referer: referer },
      next: { revalidate: 300 }, // Cache 5 minutes
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('YouTube latest API error:', err);
      return Response.json(
        { error: 'YouTube fetch failed' },
        { status: res.status }
      );
    }

    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      return Response.json({ results: [] });
    }

    // Sort by publishedAt (newest first) and take the requested number
    const sorted = data.items
      .sort(
        (a: { snippet: { publishedAt: string } }, b: { snippet: { publishedAt: string } }) =>
          new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime()
      )
      .slice(0, parseInt(maxResults, 10));

    const results = sorted.map(
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

    return Response.json({ results });
  } catch (error) {
    console.error('YouTube latest error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
