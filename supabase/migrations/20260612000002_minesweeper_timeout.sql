ALTER TABLE minesweeper_sessions
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_minesweeper_sessions_active_last_active
  ON minesweeper_sessions(last_active_at)
  WHERE status = 'active';
