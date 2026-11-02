-- Server-authoritative skip for tracks YouTube refuses to play.
--
-- Clients report "song X is unplayable"; any number of them may call this at
-- about the same time. The room row is locked and the skip only applies while
-- song X is STILL the current song, so duplicates and late callers are no-ops.
--
-- Returns:
--   >= 0  the new current index (played via play_song_at, which also graduates
--         a suggested song exactly like a normal skip)
--   -1    stale: the room already moved past p_song_id (someone else skipped)
--   -2    nothing playable remains: the room is paused instead
CREATE OR REPLACE FUNCTION skip_unplayable_song(
  p_room_id uuid,
  p_song_id uuid,
  p_skip_ids uuid[] DEFAULT '{}'
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_current integer;
  v_repeat boolean;
  v_ids uuid[];
  v_count integer;
  v_try integer;
  v_next integer := NULL;
BEGIN
  SELECT current_song_index, COALESCE(repeat, false)
    INTO v_current, v_repeat
  FROM rooms WHERE id = p_room_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  -- Same combined order the client renders: regular songs by position,
  -- then suggested songs by suggested_position (see play_song_at).
  SELECT array_agg(id ORDER BY is_suggested ASC,
    CASE WHEN is_suggested = false THEN position ELSE suggested_position END ASC)
    INTO v_ids
  FROM queue_items WHERE room_id = p_room_id;

  v_count := COALESCE(array_length(v_ids, 1), 0);

  -- Compare-and-set guard: only act if the reported song is still playing.
  IF v_current IS NULL OR v_current < 0 OR v_current >= v_count
     OR v_ids[v_current + 1] <> p_song_id THEN
    RETURN -1;
  END IF;

  -- Find the next song that is not known to be unplayable.
  FOR step IN 1 .. GREATEST(v_count - 1, 0) LOOP
    v_try := v_current + step;
    IF v_try >= v_count THEN
      EXIT WHEN NOT v_repeat;
      v_try := v_try - v_count;
    END IF;
    IF v_ids[v_try + 1] <> p_song_id AND NOT (v_ids[v_try + 1] = ANY (p_skip_ids)) THEN
      v_next := v_try;
      EXIT;
    END IF;
  END LOOP;

  IF v_next IS NULL THEN
    UPDATE rooms
    SET is_playing = false,
        current_playback_time = 0,
        playback_updated_at = now()
    WHERE id = p_room_id;
    RETURN -2;
  END IF;

  RETURN play_song_at(p_room_id, v_next, true, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION skip_unplayable_song(uuid, uuid, uuid[]) TO anon, authenticated;
