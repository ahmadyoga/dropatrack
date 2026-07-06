-- Fix: submit_sudoku_cell had a board-completion race. Under READ COMMITTED,
-- two concurrent calls filling the last two open cells of a match could each
-- run `SELECT count(*) ... WHERE value IS NULL` before the other committed,
-- both observing v_remaining = 1, so neither ever took the
-- `IF v_remaining = 0` branch — the match stayed status = 'playing' forever
-- and no winner/wins/losses were ever recorded.
--
-- Fix: lock the match row (FOR UPDATE) as the very first statement in the
-- function body. Since the whole function runs inside the single implicit
-- transaction of one RPC call, this serializes concurrent calls targeting
-- the same match — the second call blocks until the first call's
-- transaction (including its cell update and remaining-count check) fully
-- commits. This closes the race for any number of concurrent submitters,
-- not just the two-last-cells case.
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
  PERFORM 1 FROM sudoku_matches WHERE id = p_match_id FOR UPDATE;

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
