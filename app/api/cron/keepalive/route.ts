import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// This endpoint is triggered daily by Vercel Cron to:
// 1. Keep the Supabase project active (prevent pausing)
// 2. Clean up orphaned storage files from deleted rooms
export async function GET() {
  try {
    // 1. Ping Supabase to keep project active
    const { error: pingErr } = await supabase
      .from('rooms')
      .select('id')
      .limit(1);

    if (pingErr) {
      console.error('Error pinging Supabase:', pingErr);
      return NextResponse.json(
        { error: 'Failed to ping database', details: pingErr.message },
        { status: 500 }
      );
    }

    // 2. Clean up orphaned storage folders
    //    pg_cron `cleanup_stale_rooms` deletes rooms from DB (cascade deletes chat_messages),
    //    but storage files remain. We list all folders in chat-images and remove any
    //    whose room_id no longer exists in the DB.
    let cleanedFolders = 0;
    try {
      const { data: folders } = await supabase.storage
        .from('chat-images')
        .list('', { limit: 200 });

      if (folders && folders.length > 0) {
        // Each "folder" is named after a room_id
        const folderNames = folders
          .map((f) => f.name);

        if (folderNames.length > 0) {
          // Check which room_ids still exist
          const { data: existingRooms } = await supabase
            .from('rooms')
            .select('id')
            .in('id', folderNames);

          const existingIds = new Set((existingRooms || []).map((r) => r.id));

          // Delete folders for rooms that no longer exist
          for (const folderName of folderNames) {
            if (!existingIds.has(folderName)) {
              // List files in the orphaned folder
              const { data: files } = await supabase.storage
                .from('chat-images')
                .list(folderName);

              if (files && files.length > 0) {
                const paths = files.map((f) => `${folderName}/${f.name}`);
                await supabase.storage.from('chat-images').remove(paths);
              }
              cleanedFolders++;
            }
          }
        }
      }
    } catch (storageErr) {
      // Storage cleanup is best-effort — don't fail the whole cron
      console.error('Storage cleanup error:', storageErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase pinged successfully',
      cleaned_storage_folders: cleanedFolders,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Unexpected error processing keepalive cron:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
