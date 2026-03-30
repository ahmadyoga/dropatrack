import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

  if (!roomId) {
    return Response.json({ error: 'Missing room_id' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Chat fetch error:', error);
      return Response.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return Response.json({ messages: data || [] });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/chat — send a new chat message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { room_id, user_id, username, avatar_color, message, image_url, song_ref } = body;

    // Either message text or image is required
    if (!room_id || !user_id || !username || (!message?.trim() && !image_url)) {
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
    };

    const { data, error } = await supabase
      .from('chat_messages')
      .insert(newMessage)
      .select()
      .single();

    if (error) {
      console.error('Chat insert error:', error);
      return Response.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return Response.json({ message: data });
  } catch (error) {
    console.error('Chat POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
