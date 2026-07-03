import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { newestPageForDisplay } from '@/lib/chatPaging';

// Server-side Supabase client (uses service role for direct DB access)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/chat?room_id=... — fetch recent chat messages for a room
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const roomId = searchParams.get('room_id');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const before = searchParams.get('before');

  if (!roomId) {
    return Response.json({ error: 'Missing room_id' }, { status: 400 });
  }

  try {
    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (before) query = query.lt('created_at', before);

    const { data, error } = await query.limit(limit);

    if (error) {
      console.error('Chat fetch error:', error);
      return Response.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return Response.json({
      messages: newestPageForDisplay(data || []),
      has_more: (data || []).length === limit,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/chat — send a new chat message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { room_id, user_id, username, avatar_color, message, image_url, song_ref, type, payload, reply_to_id, reply_snippet } = body;

    // type-only messages (e.g. game_invite) don't require message/image
    if (!room_id || !user_id || !username || (!message?.trim() && !image_url && !type)) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newMessage = {
      room_id,
      user_id,
      username,
      avatar_color: avatar_color || '#6366f1',
      message: (message || '').trim().substring(0, 500),
      image_url: image_url || null,
      song_ref: song_ref || null,
      ...(type ? { type } : {}),
      ...(payload ? { payload } : {}),
      ...(reply_to_id ? { reply_to_id, reply_snippet } : {}),
    };

    const { data, error } = await supabase
      .from('chat_messages')
      .insert(newMessage)
      .select()
      .single();

    if (error) {
      console.error('Chat insert error:', error, '| room_id:', room_id, '| user:', username);
      return Response.json({ error: 'Failed to send message', detail: error.message }, { status: 500 });
    }

    return Response.json({ message: data });
  } catch (error) {
    console.error('Chat POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
