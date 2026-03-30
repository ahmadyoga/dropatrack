import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MAX_SIZE = 2 * 1024 * 1024; // 2MB limit

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const roomId = formData.get('room_id') as string | null;

    if (!file || !roomId) {
      return Response.json({ error: 'Missing file or room_id' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return Response.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    }

    // Only allow images
    if (!file.type.startsWith('image/')) {
      return Response.json({ error: 'Only images are allowed' }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.type.split('/')[1] || 'png';
    const filename = `${roomId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from('chat-images')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      console.error('Upload error:', uploadErr);
      return Response.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-images')
      .getPublicUrl(filename);

    return Response.json({ url: urlData.publicUrl });
  } catch (error) {
    console.error('Upload API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
