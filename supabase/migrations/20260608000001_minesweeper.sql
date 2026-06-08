-- Minesweeper game: game_sessions + game_moves tables

CREATE TABLE IF NOT EXISTS game_sessions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id            UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  chat_message_id    TEXT,
  level              TEXT        NOT NULL CHECK (level IN ('easy', 'medium', 'hard')),
  status             TEXT        NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  host_id            TEXT        NOT NULL,
  host_username      TEXT        NOT NULL,
  players            JSONB       NOT NULL DEFAULT '[]',
  current_turn_index INT         NOT NULL DEFAULT 0,
  board              JSONB,
  winner_id          TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at         TIMESTAMPTZ,
  finished_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS game_moves (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id  UUID        NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id          TEXT        NOT NULL,
  row              INT         NOT NULL,
  col              INT         NOT NULL,
  action           TEXT        NOT NULL CHECK (action IN ('reveal', 'flag', 'chord')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_room_id      ON game_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_game_session_id ON game_moves(game_session_id);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;

-- game_sessions: anyone can select; anon key can insert/update (room members)
CREATE POLICY "game_sessions_select" ON game_sessions FOR SELECT USING (true);
CREATE POLICY "game_sessions_insert" ON game_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "game_sessions_update" ON game_sessions FOR UPDATE USING (true) WITH CHECK (true);

-- game_moves: anyone can select; anyone can insert
CREATE POLICY "game_moves_select" ON game_moves FOR SELECT USING (true);
CREATE POLICY "game_moves_insert" ON game_moves FOR INSERT WITH CHECK (true);
