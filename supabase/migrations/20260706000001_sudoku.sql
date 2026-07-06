-- Sudoku Race: shared-board multiplayer sudoku, mirrors minesweeper_* pattern
-- but free-for-all (no turn order).

CREATE TABLE IF NOT EXISTS sudoku_sessions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  music_room_id  UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  difficulty     TEXT        NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  status         TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  created_by     TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sudoku_players (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES sudoku_sessions(id) ON DELETE CASCADE,
  user_id     TEXT        NOT NULL,
  username    TEXT        NOT NULL DEFAULT 'Unknown',
  wins        INT         NOT NULL DEFAULT 0,
  losses      INT         NOT NULL DEFAULT 0,
  wrong_count INT         NOT NULL DEFAULT 0,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

CREATE TABLE IF NOT EXISTS sudoku_matches (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES sudoku_sessions(id) ON DELETE CASCADE,
  match_number    INT         NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'finished')),
  winner_user_id  TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  UNIQUE (session_id, match_number)
);

CREATE TABLE IF NOT EXISTS sudoku_cells (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id       UUID    NOT NULL REFERENCES sudoku_matches(id) ON DELETE CASCADE,
  x              INT     NOT NULL,
  y              INT     NOT NULL,
  given          BOOLEAN NOT NULL DEFAULT false,
  solution_value INT     NOT NULL CHECK (solution_value BETWEEN 1 AND 9),
  value          INT     CHECK (value BETWEEN 1 AND 9),
  filled_by      TEXT,
  filled_at      TIMESTAMPTZ,
  UNIQUE (match_id, x, y)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sudoku_one_active_per_room
  ON sudoku_sessions (music_room_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_sudoku_sessions_room  ON sudoku_sessions(music_room_id);
CREATE INDEX IF NOT EXISTS idx_sudoku_players_session ON sudoku_players(session_id);
CREATE INDEX IF NOT EXISTS idx_sudoku_matches_session  ON sudoku_matches(session_id);
CREATE INDEX IF NOT EXISTS idx_sudoku_cells_match       ON sudoku_cells(match_id);

ALTER TABLE sudoku_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sudoku_players  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sudoku_matches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sudoku_cells    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sudoku_sessions_select" ON sudoku_sessions FOR SELECT USING (true);
CREATE POLICY "sudoku_sessions_insert" ON sudoku_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "sudoku_sessions_update" ON sudoku_sessions FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "sudoku_players_select" ON sudoku_players FOR SELECT USING (true);
CREATE POLICY "sudoku_players_insert" ON sudoku_players FOR INSERT WITH CHECK (true);
CREATE POLICY "sudoku_players_update" ON sudoku_players FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "sudoku_matches_select" ON sudoku_matches FOR SELECT USING (true);
CREATE POLICY "sudoku_matches_insert" ON sudoku_matches FOR INSERT WITH CHECK (true);
CREATE POLICY "sudoku_matches_update" ON sudoku_matches FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "sudoku_cells_select" ON sudoku_cells FOR SELECT USING (true);
CREATE POLICY "sudoku_cells_insert" ON sudoku_cells FOR INSERT WITH CHECK (true);
CREATE POLICY "sudoku_cells_update" ON sudoku_cells FOR UPDATE USING (true) WITH CHECK (true);

ALTER TABLE sudoku_sessions REPLICA IDENTITY FULL;
ALTER TABLE sudoku_players  REPLICA IDENTITY FULL;
ALTER TABLE sudoku_matches  REPLICA IDENTITY FULL;
ALTER TABLE sudoku_cells    REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sudoku_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sudoku_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sudoku_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sudoku_players;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sudoku_matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sudoku_matches;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sudoku_cells'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sudoku_cells;
  END IF;
END $$;

-- Atomic cell claim: locks the cell row, rejects an already-filled cell,
-- rejects+counts a wrong value, accepts+locks a correct value, and finishes
-- the match (computing the winner) when this fill completes the board.
CREATE OR REPLACE FUNCTION public.submit_sudoku_cell(
  p_match_id uuid,
  p_x int,
  p_y int,
  p_user_id text,
  p_value int
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_solution int;
  v_current_value int;
  v_session_id uuid;
  v_remaining int;
  v_winner text;
BEGIN
  SELECT solution_value, value
  INTO v_solution, v_current_value
  FROM sudoku_cells
  WHERE match_id = p_match_id AND x = p_x AND y = p_y
  FOR UPDATE;

  IF v_solution IS NULL OR v_current_value IS NOT NULL THEN
    RETURN 'taken';
  END IF;

  SELECT session_id INTO v_session_id FROM sudoku_matches WHERE id = p_match_id;

  UPDATE sudoku_sessions SET last_active_at = now() WHERE id = v_session_id;

  IF p_value != v_solution THEN
    UPDATE sudoku_players
    SET wrong_count = wrong_count + 1
    WHERE session_id = v_session_id AND user_id = p_user_id;

    RETURN 'wrong';
  END IF;

  UPDATE sudoku_cells
  SET value = p_value, filled_by = p_user_id, filled_at = now()
  WHERE match_id = p_match_id AND x = p_x AND y = p_y;

  SELECT count(*) INTO v_remaining
  FROM sudoku_cells
  WHERE match_id = p_match_id AND value IS NULL;

  IF v_remaining = 0 THEN
    SELECT sp.user_id
    INTO v_winner
    FROM sudoku_players sp
    LEFT JOIN sudoku_cells sc ON sc.match_id = p_match_id AND sc.filled_by = sp.user_id
    WHERE sp.session_id = v_session_id
    GROUP BY sp.user_id, sp.wrong_count
    ORDER BY (COUNT(sc.id) - sp.wrong_count) DESC, MAX(sc.filled_at) ASC
    LIMIT 1;

    UPDATE sudoku_matches
    SET status = 'finished', winner_user_id = v_winner, finished_at = now()
    WHERE id = p_match_id;

    UPDATE sudoku_players
    SET wins = wins + CASE WHEN user_id = v_winner THEN 1 ELSE 0 END,
        losses = losses + CASE WHEN user_id = v_winner THEN 0 ELSE 1 END
    WHERE session_id = v_session_id;
  END IF;

  RETURN 'correct';
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_sudoku_cell(uuid, int, int, text, int) TO anon, authenticated;
