import { supabase } from '@/lib/supabase';
import RoomClient from '@/components/RoomClient';

export default async function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch room data server-side
  let { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('slug', slug)
    .single();

  // If room doesn't exist (e.g. deleted by inactivity cron), auto-create it
  // so bookmarked/shared URLs never 404.
  if (!room) {
    // Derive a display name from the slug: "my-cool-room" → "My Cool Room"
    const name = slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const { data: created } = await supabase
      .from('rooms')
      .insert({
        slug,
        name,
        created_by: 'system',
        is_playing: false,
        current_song_index: 0,
        is_public: true,
      })
      .select()
      .single();

    // Handle race condition: another request may have created it between
    // our SELECT and INSERT. If INSERT fails due to unique constraint, re-fetch.
    if (!created) {
      const { data: reFetched } = await supabase
        .from('rooms')
        .select('*')
        .eq('slug', slug)
        .single();
      room = reFetched;
    } else {
      room = created;
    }
  }

  // Final safety net — should never happen but prevents runtime crash
  if (!room) {
    const { notFound } = await import('next/navigation');
    notFound();
  }

  // Fetch queue
  const { data: queue } = await supabase
    .from('queue_items')
    .select('*')
    .eq('room_id', room.id)
    .order('position', { ascending: true });

  return <RoomClient initialRoom={room} initialQueue={queue || []} />;
}
