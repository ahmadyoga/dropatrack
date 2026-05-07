import { NextRequest } from 'next/server';
import { parseISO8601Duration } from '@/lib/youtube';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!;
const REFERER = 'https://dropatrack.vercel.app';

interface SpotifyTrackInput {
  title: string;
  artist: string;
}

interface ResolvedVideo {
  youtube_id: string;
  title: string;
  thumbnail_url: string;
  duration_seconds: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders });
}

/**
 * Resolve a single Spotify track to a YouTube video via YouTube Search API.
 * Uses videoCategoryId=10 (Music) for better match quality.
 */
async function resolveTrack(track: SpotifyTrackInput): Promise<ResolvedVideo | null> {
  const query = `${track.title} ${track.artist}`;

  try {
    // Step 1: Search for the track on YouTube
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const searchRes = await fetch(searchUrl, { headers: { Referer: REFERER } });

    if (!searchRes.ok) {
      console.error('YouTube search API error:', await searchRes.text());
      return null;
    }

    const searchData = await searchRes.json();
    const item = searchData.items?.[0];
    if (!item) return null;

    const videoId = item.id.videoId;

    // Step 2: Get video details (duration)
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;
    const detailsRes = await fetch(detailsUrl, { headers: { Referer: REFERER } });

    if (!detailsRes.ok) {
      // Return without duration if details call fails
      return {
        youtube_id: videoId,
        title: item.snippet.title,
        thumbnail_url: item.snippet.thumbnails?.medium?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        duration_seconds: 0,
      };
    }

    const detailsData = await detailsRes.json();
    const videoDetails = detailsData.items?.[0];

    return {
      youtube_id: videoId,
      title: videoDetails?.snippet?.title || item.snippet.title,
      thumbnail_url: videoDetails?.snippet?.thumbnails?.medium?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      duration_seconds: videoDetails ? parseISO8601Duration(videoDetails.contentDetails.duration) : 0,
    };
  } catch (err) {
    console.error(`Failed to resolve track: ${track.title} - ${track.artist}`, err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tracks } = body as { tracks: SpotifyTrackInput[] };

    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      return jsonResponse({ error: 'No tracks provided' }, 400);
    }

    // Limit to 10 tracks per request to control API usage
    const tracksToResolve = tracks.slice(0, 10);

    const resolved: ResolvedVideo[] = [];
    const failed: string[] = [];

    // Resolve sequentially to avoid rate-limiting
    for (const track of tracksToResolve) {
      const video = await resolveTrack(track);
      if (video) {
        resolved.push(video);
      } else {
        failed.push(`${track.title} - ${track.artist}`);
      }
    }

    return jsonResponse({
      success: true,
      resolved,
      failed,
      total: tracksToResolve.length,
      resolved_count: resolved.length,
    });
  } catch (error) {
    console.error('Spotify resolve error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

// CORS preflight for extension requests
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
