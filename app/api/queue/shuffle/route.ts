import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  const { room_id, current_song_index } = await request.json();

  if (!room_id || current_song_index === undefined) {
    return Response.json({ error: 'Missing room_id or current_song_index' }, { status: 400 });
  }

  // Fetch all queue items for this room
  const { data: queue, error } = await supabase
    .from('queue_items')
    .select('*')
    .eq('room_id', room_id)
    .order('position', { ascending: true });

  if (error || !queue) {
    return Response.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }

  if (queue.length <= 1) {
    return Response.json({ message: 'Nothing to shuffle' });
  }

  // Split: keep songs up to current_song_index, shuffle only upcoming
  const before = queue.slice(0, current_song_index + 1);
  const upcoming = queue.slice(current_song_index + 1);

  if (upcoming.length <= 1) {
    return Response.json({ message: 'Not enough upcoming songs to shuffle' });
  }

  // Fisher-Yates shuffle
  for (let i = upcoming.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [upcoming[i], upcoming[j]] = [upcoming[j], upcoming[i]];
  }

  const shuffled = [...before, ...upcoming];

  // Update all positions in DB
  const updates = shuffled.map((item, idx) => ({
    id: item.id,
    room_id: item.room_id,
    youtube_id: item.youtube_id,
    title: item.title,
    thumbnail_url: item.thumbnail_url,
    duration_seconds: item.duration_seconds,
    added_by: item.added_by,
    position: idx,
    played: item.played,
  }));

  const { error: upsertError } = await supabase.from('queue_items').upsert(updates);

  if (upsertError) {
    console.error('Shuffle upsert error:', upsertError);
    return Response.json({ error: 'Failed to update queue' }, { status: 500 });
  }

  return Response.json({ success: true, count: upcoming.length });
}
