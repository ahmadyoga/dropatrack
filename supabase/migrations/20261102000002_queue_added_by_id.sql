-- Who added a song, by stable user id. added_by stays as the display name.
-- DJs may remove only songs whose added_by_id matches their own user id;
-- names are editable, so matching on added_by could be spoofed by renaming.
-- Older rows (and extension / Auto-DJ rows) have no id: moderators/admin only.
ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS added_by_id TEXT NULL;
