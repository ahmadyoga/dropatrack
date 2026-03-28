import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Called periodically to delete rooms inactive for 5+ minutes
// Can be triggered by: Vercel Cron, pg_cron, or client-side on page load
export async function POST() {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: staleRooms, error: fetchError } = await supabase
      .from('rooms')
      .select('id, slug, last_active_at')
      .lt('last_active_at', fiveMinutesAgo);

    if (fetchError) {
      console.error('Error finding stale rooms:', fetchError);
      return Response.json({ error: 'Failed to query stale rooms' }, { status: 500 });
    }

    if (!staleRooms || staleRooms.length === 0) {
      return Response.json({ deleted: 0 });
    }

    const staleIds = staleRooms.map((r) => r.id);

    // Queue items are cascade-deleted automatically
    const { error: deleteError } = await supabase
      .from('rooms')
      .delete()
      .in('id', staleIds);

    if (deleteError) {
      console.error('Error deleting stale rooms:', deleteError);
      return Response.json({ error: 'Failed to delete stale rooms' }, { status: 500 });
    }

    return Response.json({ deleted: staleRooms.length, rooms: staleRooms.map((r) => r.slug) });
  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
