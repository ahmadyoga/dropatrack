import { NextRequest } from 'next/server';
import { parseISO8601Duration } from '@/lib/youtube';
import { getYouTubeApiKey, recordApiSuccess, recordApiError } from '@/lib/youtubeKeyRotation';
import { getNextRegularQueuePosition, type QueuePositionRow } from '@/lib/queuePosition';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const REFERER = 'https://dropatrack.vercel.app';

interface VideoInput {
  youtube_id: string;
  title: string;
  thumbnail_url: string;
  duration_seconds: number;
}

// Fetch all items from a YouTube playlist
async function fetchPlaylistItems(playlistId: string): Promise<VideoInput[]> {
  const videos: VideoInput[] = [];
  let pageToken = '';
  const apiKey = getYouTubeApiKey();

  do {
    let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${encodeURIComponent(playlistId)}&key=${apiKey}`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

    const res = await fetch(url, { headers: { Referer: REFERER } });
    if (!res.ok) {
      const err = await res.text();
      console.error('YouTube playlist API error:', err);
      recordApiError(apiKey, res.status, err);
      break;
    }

    recordApiSuccess(apiKey);
    const data = await res.json();
    const videoIds = data.items
      ?.map((item: { snippet: { resourceId: { videoId: string } } }) => item.snippet.resourceId.videoId)
      .filter(Boolean)
      .join(',');

    if (videoIds) {
      // Get durations
      const detailsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${apiKey}`,
        { headers: { Referer: REFERER } }
      );

      if (detailsRes.ok) {
        recordApiSuccess(apiKey);
        const detailsData = await detailsRes.json();
        for (const item of detailsData.items) {
          videos.push({
            youtube_id: item.id,
            title: item.snippet.title,
            thumbnail_url: item.snippet.thumbnails?.medium?.url || `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`,
            duration_seconds: parseISO8601Duration(item.contentDetails.duration),
          });
        }
      } else {
        recordApiError(apiKey, detailsRes.status);
      }
    }

    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return videos;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { room_slug, videos, playlist_id, added_by } = body as {
      room_slug: string;
      videos?: VideoInput[];
      playlist_id?: string;
      added_by?: string;
    };

    if (!room_slug) {
      return jsonResponse({ error: 'Missing room_slug' }, 400);
    }

    // Find room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('slug', room_slug)
      .single();

    if (roomError || !room) {
      return jsonResponse({ error: 'Room not found' }, 404);
    }

    // Get videos to add
    let videosToAdd: VideoInput[] = [];

    if (playlist_id) {
      videosToAdd = await fetchPlaylistItems(playlist_id);
    } else if (videos && videos.length > 0) {
      videosToAdd = videos;
    } else {
      return jsonResponse({ error: 'No videos or playlist_id provided' }, 400);
    }

    if (videosToAdd.length === 0) {
      return jsonResponse({ error: 'No videos found' }, 404);
    }

    // Fetch missing durations from YouTube API
    const needDuration = videosToAdd.filter(v => !v.duration_seconds);
    if (needDuration.length > 0) {
      const ids = needDuration.map(v => v.youtube_id).join(',');
      try {
        const apiKey = getYouTubeApiKey();
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${apiKey}`,
          { headers: { Referer: REFERER } }
        );
        if (res.ok) {
          recordApiSuccess(apiKey);
          const data = await res.json();
          const durationMap: Record<string, number> = {};
          for (const item of data.items || []) {
            durationMap[item.id] = parseISO8601Duration(item.contentDetails.duration);
          }
          for (const v of videosToAdd) {
            if (!v.duration_seconds && durationMap[v.youtube_id]) {
              v.duration_seconds = durationMap[v.youtube_id];
            }
          }
        } else {
          recordApiError(apiKey, res.status);
        }
      } catch (e) {
        console.error('Failed to fetch durations:', e);
      }
      // Default any still-missing durations to 0
      for (const v of videosToAdd) {
        if (!v.duration_seconds) v.duration_seconds = 0;
      }
    }

    // Get the next regular queue position. Suggested rows use NULL position
    // and must not be considered when extension inserts append new songs.
    const { data: positionRows, error: positionError } = await supabase
      .from('queue_items')
      .select('position,is_suggested')
      .eq('room_id', room.id)
      .eq('is_suggested', false);

    if (positionError) {
      console.error('Position lookup error:', positionError);
      return jsonResponse({ error: 'Failed to inspect queue' }, 500);
    }

    const startPosition = getNextRegularQueuePosition((positionRows ?? []) as QueuePositionRow[]);

    // Insert all videos
    const inserts = videosToAdd.map((video, idx) => ({
      room_id: room.id,
      youtube_id: video.youtube_id,
      title: video.title,
      thumbnail_url: video.thumbnail_url,
      duration_seconds: video.duration_seconds,
      added_by: added_by || 'Extension',
      position: startPosition + idx,
      played: false,
    }));

    const { error: insertError } = await supabase.from('queue_items').insert(inserts);

    if (insertError) {
      console.error('Insert error:', insertError);
      return jsonResponse({ error: 'Failed to add videos' }, 500);
    }

    return jsonResponse({
      success: true,
      added: videosToAdd.length,
      message: `Added ${videosToAdd.length} video${videosToAdd.length > 1 ? 's' : ''} to ${room_slug}`,
    });
  } catch (error) {
    console.error('Add external error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

// CORS preflight for extension requests
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
