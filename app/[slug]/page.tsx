import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import RoomClient from '@/components/RoomClient';

export default async function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch room data server-side
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !room) {
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
