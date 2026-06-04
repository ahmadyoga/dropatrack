-- Replace the graduation trigger with an explicit RPC called at play points.
-- The trigger fired on every current_song_index UPDATE and could not resolve
-- "play this specific suggested song now". play_song_at() sets the index +
-- playback fields and graduates the target suggested song atomically.

DROP TRIGGER IF EXISTS trg_graduate_suggested ON rooms;
DROP FUNCTION IF EXISTS graduate_suggested_song();

CREATE OR REPLACE FUNCTION play_song_at(
  p_room_id uuid,
  p_index integer,
  p_is_playing boolean,
  p_current_time double precision
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_item_id uuid;
  v_is_suggested boolean;
  v_max_pos integer;
  v_resolved_index integer;
BEGIN
  -- Resolve the item at the requested combined index (regular by position,
  -- then suggested by suggested_position) — mirrors the client array order.
  SELECT id, is_suggested INTO v_item_id, v_is_suggested
  FROM (
    SELECT id, is_suggested,
      ROW_NUMBER() OVER (
        ORDER BY is_suggested ASC,
        CASE WHEN is_suggested = false THEN position
             ELSE suggested_position END ASC
      ) - 1 AS idx
    FROM queue_items WHERE room_id = p_room_id
  ) ranked
  WHERE idx = p_index;

  v_resolved_index := p_index;

  -- If the target is a suggested song, graduate it to the regular tail.
  IF v_is_suggested THEN
    SELECT COALESCE(MAX(position), 0) INTO v_max_pos
    FROM queue_items WHERE room_id = p_room_id AND is_suggested = false;

    UPDATE queue_items
    SET is_suggested = false, position = v_max_pos + 1, suggested_position = NULL
    WHERE id = v_item_id;

    -- After graduation it is the last regular song; its combined index is
    -- (number of regular songs) - 1.
    SELECT count(*) - 1 INTO v_resolved_index
    FROM queue_items WHERE room_id = p_room_id AND is_suggested = false;
  END IF;

  UPDATE rooms
  SET current_song_index = v_resolved_index,
      is_playing = p_is_playing,
      current_playback_time = p_current_time,
      playback_updated_at = now()
  WHERE id = p_room_id;

  RETURN v_resolved_index;
END;
$$;

GRANT EXECUTE ON FUNCTION play_song_at(uuid, integer, boolean, double precision) TO anon, authenticated;
