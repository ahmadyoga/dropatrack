-- Auto-suggestion feature: columns + graduation trigger

-- Room-wide toggle
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS auto_suggest boolean NOT NULL DEFAULT false;

-- Suggested-song flags
ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS is_suggested boolean NOT NULL DEFAULT false;
ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS suggested_position integer NULL;

-- Suggested songs carry a NULL position (ordered by suggested_position instead)
ALTER TABLE queue_items ALTER COLUMN position DROP NOT NULL;

-- Trigger: auto-graduate a suggested song to the regular queue when
-- current_song_index advances onto it.
CREATE OR REPLACE FUNCTION graduate_suggested_song()
RETURNS TRIGGER AS $$
DECLARE
  v_item_id uuid;
  v_max_pos integer;
BEGIN
  IF OLD.current_song_index = NEW.current_song_index THEN
    RETURN NEW;
  END IF;

  -- Find the item at the new index, mirroring client array ordering:
  -- regular songs first (by position), then suggested (by suggested_position).
  SELECT id INTO v_item_id
  FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        ORDER BY is_suggested ASC,
        CASE WHEN is_suggested = false THEN position
             ELSE suggested_position END ASC
      ) - 1 AS idx
    FROM queue_items WHERE room_id = NEW.id
  ) ranked
  WHERE idx = NEW.current_song_index AND is_suggested = true;

  IF v_item_id IS NOT NULL THEN
    SELECT COALESCE(MAX(position), 0) INTO v_max_pos
    FROM queue_items WHERE room_id = NEW.id AND is_suggested = false;

    UPDATE queue_items
    SET is_suggested = false, position = v_max_pos + 1, suggested_position = NULL
    WHERE id = v_item_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_graduate_suggested ON rooms;
CREATE TRIGGER trg_graduate_suggested
AFTER UPDATE OF current_song_index ON rooms
FOR EACH ROW EXECUTE FUNCTION graduate_suggested_song();

-- Keep suggested songs out of the OG share snapshot
CREATE OR REPLACE FUNCTION get_room_og(p_slug text)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'room', (
      SELECT json_build_object(
        'id', r.id,
        'name', r.name,
        'current_song_index', r.current_song_index,
        'is_public', r.is_public,
        'is_playing', r.is_playing,
        'listener_snapshot', r.listener_snapshot
      )
      FROM rooms r WHERE r.slug = p_slug
    ),
    'queue', COALESCE((
      SELECT json_agg(
        json_build_object('title', q.title, 'added_by', q.added_by)
        ORDER BY q.position
      )
      FROM queue_items q
      JOIN rooms r2 ON r2.id = q.room_id
      WHERE r2.slug = p_slug AND q.is_suggested = false
    ), '[]'::json),
    'queue_count', (
      SELECT count(*)
      FROM queue_items q
      JOIN rooms r3 ON r3.id = q.room_id
      WHERE r3.slug = p_slug AND q.is_suggested = false
    )
  );
$$;

GRANT EXECUTE ON FUNCTION get_room_og(text) TO anon, authenticated;
