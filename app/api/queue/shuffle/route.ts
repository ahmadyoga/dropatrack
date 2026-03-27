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

  // Fetch only upcoming queue items (skip already-played + current)
  const { data: allQueue, error } = await supabase
    .from('queue_items')
    .select('id, position')
    .eq('room_id', room_id)
    .order('position', { ascending: true });

  if (error || !allQueue) {
    return Response.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }

  // Only shuffle upcoming items (after current_song_index)
  const upcoming = allQueue.filter(item => item.position > current_song_index);

  if (upcoming.length <= 1) {
    return Response.json({ message: 'Not enough upcoming songs to shuffle' });
  }

  // Fisher-Yates shuffle on positions only
  const positions = upcoming.map(item => item.position);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // Build minimal updates — only id + position, skip unchanged
  const updates: { id: string; position: number }[] = [];
  for (let i = 0; i < upcoming.length; i++) {
    if (upcoming[i].position !== positions[i]) {
      updates.push({ id: upcoming[i].id, position: positions[i] });
    }
  }

  if (updates.length === 0) {
    return Response.json({ message: 'Shuffle resulted in same order' });
  }

  // Batch update only changed positions using parallel updates
  const batchSize = 20;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await Promise.all(
      batch.map(u =>
        supabase
          .from('queue_items')
          .update({ position: u.position })
          .eq('id', u.id)
      )
    );
  }

  return Response.json({ success: true, count: updates.length });
}
