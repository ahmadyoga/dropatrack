CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.process_minesweeper_timeouts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_match RECORD;
  current_turn RECORD;
  next_turn_id UUID;
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
    SELECT id, turn_order
    INTO current_turn
    FROM minesweeper_turns
    WHERE match_id = expired_match.id
    ORDER BY is_current DESC, turn_order ASC
    LIMIT 1;

    IF current_turn.id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT id
    INTO next_turn_id
    FROM minesweeper_turns
    WHERE match_id = expired_match.id
      AND turn_order > current_turn.turn_order
    ORDER BY turn_order ASC
    LIMIT 1;

    IF next_turn_id IS NULL THEN
      SELECT id
      INTO next_turn_id
      FROM minesweeper_turns
      WHERE match_id = expired_match.id
      ORDER BY turn_order ASC
      LIMIT 1;
    END IF;

    IF next_turn_id IS NULL OR next_turn_id = current_turn.id THEN
      CONTINUE;
    END IF;

    UPDATE minesweeper_turns
    SET is_current = false
    WHERE match_id = expired_match.id;

    UPDATE minesweeper_turns
    SET is_current = true
    WHERE id = next_turn_id;

    UPDATE minesweeper_matches
    SET current_turn_started_at = now()
    WHERE id = expired_match.id;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'minesweeper-timeouts'
  ) THEN
    PERFORM cron.schedule(
      'minesweeper-timeouts',
      '* * * * *',
      $job$SELECT public.process_minesweeper_timeouts();$job$
    );
  END IF;
END $$;
