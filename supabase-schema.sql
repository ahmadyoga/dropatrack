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

-- 3. Indexes
CREATE INDEX idx_rooms_slug ON rooms(slug);
CREATE INDEX idx_queue_room_position ON queue_items(room_id, position);

-- 4. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE queue_items;

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

-- 7. Server-side cleanup function (deletes rooms inactive for 5+ minutes)
-- Queue items are cascade-deleted automatically
CREATE OR REPLACE FUNCTION cleanup_stale_rooms()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rooms
  WHERE last_active_at < NOW() - INTERVAL '5 minutes';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Optional: enable pg_cron to auto-run cleanup every minute
-- Uncomment the line below if pg_cron extension is enabled in your Supabase project:
-- SELECT cron.schedule('cleanup-stale-rooms', '* * * * *', 'SELECT cleanup_stale_rooms()');
