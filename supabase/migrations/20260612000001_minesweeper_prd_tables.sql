-- PRD Minesweeper multiplayer session model.
-- Keeps the earlier generic game tables intact while adding dedicated tables.

CREATE TABLE IF NOT EXISTS minesweeper_sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  music_room_id UUID       NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  difficulty    TEXT       NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  status        TEXT       NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  created_by    TEXT       NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS minesweeper_players (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID       NOT NULL REFERENCES minesweeper_sessions(id) ON DELETE CASCADE,
  user_id    TEXT       NOT NULL,
  username   TEXT       NOT NULL DEFAULT 'Unknown',
  wins       INT        NOT NULL DEFAULT 0,
  losses     INT        NOT NULL DEFAULT 0,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

CREATE TABLE IF NOT EXISTS minesweeper_matches (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID       NOT NULL REFERENCES minesweeper_sessions(id) ON DELETE CASCADE,
  match_number  INT        NOT NULL,
  status        TEXT       NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'finished')),
  loser_user_id TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_turn_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  UNIQUE (session_id, match_number)
);

CREATE TABLE IF NOT EXISTS minesweeper_turns (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   UUID NOT NULL REFERENCES minesweeper_matches(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  turn_order INT  NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (match_id, user_id),
  UNIQUE (match_id, turn_order)
);

CREATE TABLE IF NOT EXISTS minesweeper_cells (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id       UUID NOT NULL REFERENCES minesweeper_matches(id) ON DELETE CASCADE,
  x              INT  NOT NULL,
  y              INT  NOT NULL,
  is_mine        BOOLEAN NOT NULL DEFAULT false,
  is_opened      BOOLEAN NOT NULL DEFAULT false,
  adjacent_count INT NOT NULL DEFAULT 0,
  opened_by      TEXT,
  opened_at      TIMESTAMPTZ,
  UNIQUE (match_id, x, y)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_minesweeper_one_active_per_room
  ON minesweeper_sessions (music_room_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_minesweeper_sessions_room ON minesweeper_sessions(music_room_id);
CREATE INDEX IF NOT EXISTS idx_minesweeper_players_session ON minesweeper_players(session_id);
CREATE INDEX IF NOT EXISTS idx_minesweeper_matches_session ON minesweeper_matches(session_id);
CREATE INDEX IF NOT EXISTS idx_minesweeper_turns_match ON minesweeper_turns(match_id);
CREATE INDEX IF NOT EXISTS idx_minesweeper_cells_match ON minesweeper_cells(match_id);

ALTER TABLE minesweeper_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE minesweeper_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE minesweeper_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE minesweeper_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE minesweeper_cells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "minesweeper_sessions_select" ON minesweeper_sessions FOR SELECT USING (true);
CREATE POLICY "minesweeper_sessions_insert" ON minesweeper_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "minesweeper_sessions_update" ON minesweeper_sessions FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "minesweeper_players_select" ON minesweeper_players FOR SELECT USING (true);
CREATE POLICY "minesweeper_players_insert" ON minesweeper_players FOR INSERT WITH CHECK (true);
CREATE POLICY "minesweeper_players_update" ON minesweeper_players FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "minesweeper_matches_select" ON minesweeper_matches FOR SELECT USING (true);
CREATE POLICY "minesweeper_matches_insert" ON minesweeper_matches FOR INSERT WITH CHECK (true);
CREATE POLICY "minesweeper_matches_update" ON minesweeper_matches FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "minesweeper_turns_select" ON minesweeper_turns FOR SELECT USING (true);
CREATE POLICY "minesweeper_turns_insert" ON minesweeper_turns FOR INSERT WITH CHECK (true);
CREATE POLICY "minesweeper_turns_update" ON minesweeper_turns FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "minesweeper_cells_select" ON minesweeper_cells FOR SELECT USING (true);
CREATE POLICY "minesweeper_cells_insert" ON minesweeper_cells FOR INSERT WITH CHECK (true);
CREATE POLICY "minesweeper_cells_update" ON minesweeper_cells FOR UPDATE USING (true) WITH CHECK (true);

ALTER TABLE minesweeper_sessions REPLICA IDENTITY FULL;
ALTER TABLE minesweeper_players REPLICA IDENTITY FULL;
ALTER TABLE minesweeper_matches REPLICA IDENTITY FULL;
ALTER TABLE minesweeper_turns REPLICA IDENTITY FULL;
ALTER TABLE minesweeper_cells REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'minesweeper_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE minesweeper_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'minesweeper_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE minesweeper_players;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'minesweeper_matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE minesweeper_matches;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'minesweeper_turns'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE minesweeper_turns;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'minesweeper_cells'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE minesweeper_cells;
  END IF;
END $$;
