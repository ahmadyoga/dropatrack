-- OG share-time snapshot: listener snapshot + cache-bust version on rooms
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS listener_snapshot jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS snapshot_at timestamptz;

-- Single-round-trip fetch for the OG image: room + ordered queue + count
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
      WHERE r2.slug = p_slug
    ), '[]'::json),
    'queue_count', (
      SELECT count(*)
      FROM queue_items q
      JOIN rooms r3 ON r3.id = q.room_id
      WHERE r3.slug = p_slug
    )
  );
$$;

-- Allow the anon role (used by the public client) to call it
GRANT EXECUTE ON FUNCTION get_room_og(text) TO anon, authenticated;
