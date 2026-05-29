-- Time-level playback sync: anchor timestamp for current_playback_time.
-- (updated_at can't be reused — its trigger bumps on every unrelated write.)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS playback_updated_at TIMESTAMPTZ DEFAULT NOW();
