import { NextRequest } from 'next/server';
import { parseISO8601Duration } from '@/lib/youtube';
import { getYouTubeApiKey, recordApiSuccess, recordApiError } from '@/lib/youtubeKeyRotation';

// Server-side only — YOUTUBE_API_KEY is never exposed to browser
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const videoId = searchParams.get('videoId');
  const pageToken = searchParams.get('pageToken');

  if (!query && !videoId) {
    return Response.json({ error: 'Missing search query' }, { status: 400 });
  }

  let apiKey: string;
  try {
    apiKey = getYouTubeApiKey();
  } catch (error) {
    return Response.json(
      { error: 'YouTube API key not configured' },
      { status: 500 }
    );
  }

  const rawReferer = request.headers.get('referer');
  const referer = rawReferer ? new URL(rawReferer).origin : request.nextUrl.origin;

  try {
    // Direct fetch by video ID — skip search step
    if (videoId) {
      const detailsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${encodeURIComponent(videoId)}&key=${apiKey}`,
        { headers: { Referer: referer }, next: { revalidate: 300 } }
      );
      if (!detailsRes.ok) {
        recordApiError(apiKey, detailsRes.status, await detailsRes.text());
        return Response.json({ error: 'Video fetch failed' }, { status: detailsRes.status });
      }
      recordApiSuccess(apiKey);
      const detailsData = await detailsRes.json();
      if (!detailsData.items?.length) return Response.json({ results: [] });
      const item = detailsData.items[0];
      return Response.json({
        results: [{
          id: item.id,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? '',
          channelTitle: item.snippet.channelTitle,
          duration: item.contentDetails.duration,
          durationSeconds: parseISO8601Duration(item.contentDetails.duration),
        }],
        nextPageToken: null,
      });
    }

    let searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=15&q=${encodeURIComponent(query!)}&key=${apiKey}`;
    if (pageToken) {
      searchUrl += `&pageToken=${encodeURIComponent(pageToken)}`;
    }
    const searchRes = await fetch(
      searchUrl,
      { headers: { Referer: referer }, next: { revalidate: 60 } }
    );
    if (!searchRes.ok) {
      const err = await searchRes.text();
      console.error('YouTube search API error:', err);
      recordApiError(apiKey, searchRes.status, err);
      return Response.json(
        { error: 'YouTube search failed' },
        { status: searchRes.status }
      );
    }

    recordApiSuccess(apiKey);

    const searchData = await searchRes.json();

    if (!searchData.items || searchData.items.length === 0) {
      return Response.json({ results: [] });
    }

    // Step 2: Get video details (duration)
    const videoIds = searchData.items
      .map((item: { id: { videoId: string } }) => item.id.videoId)
      .join(',');

    const detailsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${apiKey}`,
      { headers: { Referer: referer }, next: { revalidate: 60 } }
    );
    if (!detailsRes.ok) {
      const err = await detailsRes.text();
      console.error('YouTube details API error:', err);
      recordApiError(apiKey, detailsRes.status, err);
      return Response.json(
        { error: 'YouTube details failed' },
        { status: detailsRes.status }
      );
    }

    recordApiSuccess(apiKey);

    const detailsData = await detailsRes.json();

    const results = detailsData.items.map(
      (item: {
        id: string;
        snippet: { title: string; thumbnails: { medium: { url: string } }; channelTitle: string };
        contentDetails: { duration: string };
      }) => ({
        id: item.id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
        channelTitle: item.snippet.channelTitle,
        duration: item.contentDetails.duration,
        durationSeconds: parseISO8601Duration(item.contentDetails.duration),
      })
    );

    return Response.json({
      results,
      nextPageToken: searchData.nextPageToken || null,
    });
  } catch (error) {
    console.error('YouTube search error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
