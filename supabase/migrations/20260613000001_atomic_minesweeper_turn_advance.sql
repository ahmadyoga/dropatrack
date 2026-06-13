CREATE OR REPLACE FUNCTION public.advance_minesweeper_turn(
  p_match_id uuid,
  p_current_user_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_order int;
  turn_count int;
  next_turn_id uuid;
BEGIN
  SELECT turn_order
  INTO current_order
  FROM minesweeper_turns
  WHERE match_id = p_match_id
    AND user_id = p_current_user_id
    AND is_current = true
  LIMIT 1;

  IF current_order IS NULL THEN
    RETURN false;
  END IF;

  SELECT count(*)
  INTO turn_count
  FROM minesweeper_turns
  WHERE match_id = p_match_id;

  IF turn_count <= 1 THEN
    UPDATE minesweeper_matches
    SET current_turn_started_at = now()
    WHERE id = p_match_id
      AND status = 'playing';

    RETURN true;
  END IF;

  SELECT id
  INTO next_turn_id
  FROM minesweeper_turns
  WHERE match_id = p_match_id
    AND turn_order > current_order
  ORDER BY turn_order ASC
  LIMIT 1;

  IF next_turn_id IS NULL THEN
    SELECT id
    INTO next_turn_id
    FROM minesweeper_turns
    WHERE match_id = p_match_id
    ORDER BY turn_order ASC
    LIMIT 1;
  END IF;

  IF next_turn_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE minesweeper_turns
  SET is_current = (id = next_turn_id)
  WHERE match_id = p_match_id;

  UPDATE minesweeper_matches
  SET current_turn_started_at = now()
  WHERE id = p_match_id
    AND status = 'playing';

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_minesweeper_turn(uuid, text) TO anon, authenticated;

ALTER TABLE minesweeper_cells
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.process_minesweeper_timeouts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_match RECORD;
  current_turn RECORD;
BEGIN
  UPDATE minesweeper_sessions
  SET status = 'finished',
      finished_at = now()
  WHERE status = 'active'
    AND last_active_at < now() - interval '5 minutes';

  FOR expired_match IN
    SELECT m.id
    FROM minesweeper_matches m
    JOIN minesweeper_sessions s ON s.id = m.session_id
    WHERE m.status = 'playing'
      AND s.status = 'active'
      AND m.current_turn_started_at < now() - interval '30 seconds'
  LOOP
    SELECT user_id
    INTO current_turn
    FROM minesweeper_turns
    WHERE match_id = expired_match.id
      AND is_current = true
    LIMIT 1;

    IF current_turn.user_id IS NULL THEN
      CONTINUE;
    END IF;

    PERFORM public.advance_minesweeper_turn(expired_match.id, current_turn.user_id);
  END LOOP;
END;
$$;
