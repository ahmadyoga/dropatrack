import { NextRequest } from 'next/server';
import { getCuratedSections } from '@/lib/curatedPlaylists';
import { getRegionCodeFromTimezone } from '@/lib/region';

// Serves curated playlist sections based on user's region
// No YouTube API quota cost — data is static/hardcoded

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const regionCode = getRegionCodeFromTimezone(searchParams.get('timezone'));

  const sections = getCuratedSections(regionCode);

  // Fetch thumbnails for each playlist from YouTube API (optional, 1 quota unit per playlist)
  const apiKey = process.env.YOUTUBE_API_KEY;
  const referer = "https://dropatrack.vercel.app";

  if (apiKey) {
    // Collect all playlist IDs to batch-fetch thumbnails
    const allPlaylistIds = sections.flatMap(s => s.playlists.map(p => p.id));

    try {
      // Fetch playlist details in batches of 50
      const batchSize = 50;
      const thumbnails: Record<string, { thumbnail: string; itemCount: number }> = {};

      for (let i = 0; i < allPlaylistIds.length; i += batchSize) {
        const batch = allPlaylistIds.slice(i, i + batchSize);
        const ids = batch.join(',');
        const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${encodeURIComponent(ids)}&key=${apiKey}`;

        const res = await fetch(url, {
          headers: { Referer: referer },
          next: { revalidate: 3600 }, // Cache 1 hour
        });

        if (res.ok) {
          const data = await res.json();
          if (data.items) {
            for (const item of data.items) {
              thumbnails[item.id] = {
                thumbnail:
                  item.snippet.thumbnails?.standard?.url ||
                  item.snippet.thumbnails?.high?.url ||
                  item.snippet.thumbnails?.medium?.url || '',
                itemCount: item.contentDetails?.itemCount || 0,
              };
            }
          }
        }
      }

      // Enrich sections with thumbnails
      const enriched = sections.map(section => ({
        ...section,
        playlists: section.playlists.map(pl => ({
          ...pl,
          thumbnail: thumbnails[pl.id]?.thumbnail || '',
          itemCount: thumbnails[pl.id]?.itemCount || 0,
        })),
      }));

      return Response.json({ sections: enriched });
    } catch (err) {
      console.error('Failed to fetch playlist thumbnails:', err);
    }
  }

  // Fallback: return sections without thumbnails
  const fallback = sections.map(section => ({
    ...section,
    playlists: section.playlists.map(pl => ({
      ...pl,
      thumbnail: '',
      itemCount: 0,
    })),
  }));

  return Response.json({ sections: fallback });
}
