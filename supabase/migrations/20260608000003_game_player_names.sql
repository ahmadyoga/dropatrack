-- Add player_usernames JSONB map (user_id -> username) to game_sessions
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS player_usernames JSONB NOT NULL DEFAULT '{}';
