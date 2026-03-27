import { NextRequest } from 'next/server';

// Server-side only — fetches curated playlists from YouTube Music channel
// Uses playlists.list (1 quota unit per call)

const MUSIC_CHANNEL_ID = 'UC-9-kyTW8ZkZNDHQJ6FgpwQ';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const maxResults = searchParams.get('maxResults') || '12';
  const pageToken = searchParams.get('pageToken');
  const hl = searchParams.get('hl') || 'en'; // Host language for localized results

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'YouTube API key not configured' }, { status: 500 });
  }

  const referer = "https://dropatrack.vercel.app";

  try {
    let url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${MUSIC_CHANNEL_ID}&maxResults=${encodeURIComponent(maxResults)}&hl=id&key=${apiKey}`;
    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }

    const res = await fetch(url, {
      headers: { Referer: referer },
      next: { revalidate: 600 }, // Cache 10 minutes
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('YouTube playlists API error:', err);
      return Response.json({ error: 'YouTube playlists fetch failed' }, { status: res.status });
    }

    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      return Response.json({ playlists: [], nextPageToken: null });
    }

    // Filter out playlists with very few items or duplicates
    const seen = new Set<string>();
    const playlists = data.items
      .filter((item: { snippet: { title: string }; contentDetails: { itemCount: number } }) => {
        const title = item.snippet.title;
        // Skip duplicates and very small playlists
        if (seen.has(title)) return false;
        seen.add(title);
        return item.contentDetails.itemCount > 0;
      })
      .map((item: {
        id: string;
        snippet: {
          title: string;
          description: string;
          thumbnails: { medium?: { url: string }; high?: { url: string }; standard?: { url: string } };
          publishedAt: string;
        };
        contentDetails: { itemCount: number };
      }) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description || '',
        thumbnail:
          item.snippet.thumbnails.standard?.url ||
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.medium?.url || '',
        itemCount: item.contentDetails.itemCount,
        publishedAt: item.snippet.publishedAt,
      }));

    return Response.json({
      playlists,
      nextPageToken: data.nextPageToken || null,
    });
  } catch (error) {
    console.error('YouTube playlists error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
