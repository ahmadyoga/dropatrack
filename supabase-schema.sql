-- ============================================
-- DropATrack - Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Rooms table
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_by TEXT,
  current_song_index INTEGER DEFAULT 0,
  current_playback_time FLOAT DEFAULT 0,
  volume INTEGER DEFAULT 80,
  is_playing BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  default_role TEXT DEFAULT 'dj',
  user_roles JSONB DEFAULT '{}'::jsonb,
  listener_snapshot JSONB DEFAULT '[]'::jsonb,
  snapshot_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read rooms
CREATE POLICY "Anyone can read rooms" ON rooms
  FOR SELECT USING (true);

-- Allow anyone to insert rooms
CREATE POLICY "Anyone can insert rooms" ON rooms
  FOR INSERT WITH CHECK (true);

-- Allow anyone to update rooms
CREATE POLICY "Anyone can update rooms" ON rooms
  FOR UPDATE USING (true);

-- 2. Queue Items table
CREATE TABLE queue_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER NOT NULL,
  added_by TEXT NOT NULL,
  position INTEGER NOT NULL,
  played BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE queue_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read queue items
CREATE POLICY "Anyone can read queue items" ON queue_items
  FOR SELECT USING (true);

-- Allow anyone to insert queue items
CREATE POLICY "Anyone can insert queue items" ON queue_items
  FOR INSERT WITH CHECK (true);

-- Allow anyone to update queue items
CREATE POLICY "Anyone can update queue items" ON queue_items
  FOR UPDATE USING (true);

-- Allow anyone to delete queue items
CREATE POLICY "Anyone can delete queue items" ON queue_items
  FOR DELETE USING (true);

-- 3. Chat Messages table
CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#6366f1',
  message TEXT NOT NULL,
  song_ref JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read chat messages
CREATE POLICY "Anyone can read chat messages" ON chat_messages
  FOR SELECT USING (true);

-- Allow anyone to insert chat messages
CREATE POLICY "Anyone can insert chat messages" ON chat_messages
  FOR INSERT WITH CHECK (true);

-- Allow anyone to delete chat messages (for cleanup)
CREATE POLICY "Anyone can delete chat messages" ON chat_messages
  FOR DELETE USING (true);

-- 4. Indexes
CREATE INDEX idx_rooms_slug ON rooms(slug);
CREATE INDEX idx_queue_room_position ON queue_items(room_id, position);
CREATE INDEX idx_chat_room_created ON chat_messages(room_id, created_at);

-- 5. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE queue_items;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- 5. Updated_at trigger for rooms
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Last active tracking for stale room cleanup
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- Allow anyone to delete rooms (for cleanup)
CREATE POLICY "Anyone can delete rooms" ON rooms
  FOR DELETE USING (true);

-- Index for cleanup queries
CREATE INDEX idx_rooms_last_active ON rooms(last_active_at);

-- 7. Server-side cleanup function (deletes rooms inactive for 30+ minutes)
-- Queue items are cascade-deleted automatically
CREATE OR REPLACE FUNCTION cleanup_stale_rooms()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rooms
  WHERE last_active_at < NOW() - INTERVAL '30 minutes';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Optional: enable pg_cron to auto-run cleanup every minute
-- Uncomment the line below if pg_cron extension is enabled in your Supabase project:
-- SELECT cron.schedule('cleanup-stale-rooms', '* * * * *', 'SELECT cleanup_stale_rooms()');

-- 8. Repeat mode (synced across all clients in a room)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS repeat BOOLEAN DEFAULT false;

-- 9. Playback anchor timestamp (time-level sync)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS playback_updated_at TIMESTAMPTZ DEFAULT NOW();

-- 9. Chat image support
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- NOTE: You must manually create a Supabase Storage bucket called "chat-images"
-- with public access. Go to Storage > New Bucket > Name: "chat-images" > Public: ON

create policy "Allow anon upload to chat-images"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'chat-images'
);

create policy "Allow anon delete from chat-images"
on storage.objects
for delete
to anon
using (
  bucket_id = 'chat-images'
);

-- 10. Role system (per-room default role + per-user overrides)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS default_role TEXT DEFAULT 'dj';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS user_roles JSONB DEFAULT '{}'::jsonb;

-- 11. OG share-time snapshot (listener snapshot + cache-bust version)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS listener_snapshot JSONB DEFAULT '[]'::jsonb;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS snapshot_at TIMESTAMPTZ;

-- Single-round-trip fetch for the OG image: room + ordered queue + count
CREATE OR REPLACE FUNCTION get_room_og(p_slug text)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'room', (
      SELECT json_build_object(
        'id', r.id,
        'name', r.name,
        'current_song_index', r.current_song_index,
        'is_public', r.is_public,
        'is_playing', r.is_playing,
        'listener_snapshot', r.listener_snapshot
      )
      FROM rooms r WHERE r.slug = p_slug
    ),
    'queue', COALESCE((
      SELECT json_agg(
        json_build_object('title', q.title, 'added_by', q.added_by)
        ORDER BY q.position
      )
      FROM queue_items q
      JOIN rooms r2 ON r2.id = q.room_id
      WHERE r2.slug = p_slug
    ), '[]'::json),
    'queue_count', (
      SELECT count(*)
      FROM queue_items q
      JOIN rooms r3 ON r3.id = q.room_id
      WHERE r3.slug = p_slug
    )
  );
$$;

GRANT EXECUTE ON FUNCTION get_room_og(text) TO anon, authenticated;