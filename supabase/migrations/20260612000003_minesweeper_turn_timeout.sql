ALTER TABLE minesweeper_matches
  ADD COLUMN IF NOT EXISTS current_turn_started_at TIMESTAMPTZ NOT NULL DEFAULT now();
