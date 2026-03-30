import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service-role key for storage admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STALE_MINUTES = 5;

export async function GET() {
  try {
    // 1. Find stale rooms (inactive for 5+ minutes)
    const cutoff = new Date(Date.now() - STALE_MINUTES * 60 * 1000).toISOString();

    const { data: staleRooms, error: fetchErr } = await supabase
      .from('rooms')
      .select('id')
      .lt('last_active_at', cutoff);

    if (fetchErr) {
      console.error('Cleanup: failed to fetch stale rooms', fetchErr);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!staleRooms || staleRooms.length === 0) {
      return NextResponse.json({ deleted: 0, message: 'No stale rooms' });
    }

    const roomIds = staleRooms.map((r) => r.id);

    // 2. Delete storage files for each stale room
    for (const roomId of roomIds) {
      try {
        // List all files in the room's storage folder
        const { data: files } = await supabase.storage
          .from('chat-images')
          .list(roomId);

        if (files && files.length > 0) {
          const paths = files.map((f) => `${roomId}/${f.name}`);
          await supabase.storage.from('chat-images').remove(paths);
        }
      } catch (storageErr) {
        // Storage cleanup failed for this room — log but continue
        console.error(`Cleanup: storage delete failed for room ${roomId}`, storageErr);
      }
    }

    // 3. Delete stale rooms from DB (cascade deletes queue_items + chat_messages)
    const { error: deleteErr } = await supabase
      .from('rooms')
      .delete()
      .lt('last_active_at', cutoff);

    if (deleteErr) {
      console.error('Cleanup: failed to delete rooms', deleteErr);
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    console.log(`Cleanup: deleted ${roomIds.length} stale rooms + their storage`);

    return NextResponse.json({
      deleted: roomIds.length,
      room_ids: roomIds,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cleanup cron error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
