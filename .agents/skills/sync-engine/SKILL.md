---
name: sync-engine
description: How the Supabase Realtime sync engine works — broadcast events, presence, DB listeners, and the playback flow. Read this before modifying any real-time behavior.
---

# DropATrack — Sync Engine

The sync engine uses three Supabase Realtime features on channel `room:{slug}`.

## 1. Broadcast (ephemeral, low-latency)

Broadcast events are NOT persisted — they're fire-and-forget. Used for real-time coordination.

| Event              | Payload                                           | Purpose                          |
|--------------------|---------------------------------------------------|----------------------------------|
| `playback_sync`    | `{ type, song_index, triggered_by, current_time }` | Play/pause/next/prev/jump        |
| `queue_update`     | `{ type: 'added'/'removed', item, item_id }`     | Song added or removed            |
| `seek_request`     | `{ time }`                                        | Remote asks speaker to seek      |
| `time_sync`        | `{ time }`                                        | Speaker echoes confirmed time    |
| `volume_change`    | `{ volume }`                                      | Volume slider sync               |
| `repeat_toggle`    | `{ repeat }`                                      | Repeat mode sync                 |
| `role_update`      | `{ default_role, user_roles }`                    | Admin changed roles              |
| `username_changed` | `{ user_id, old_username, new_username }`         | User renamed themselves          |

## 2. Presence (user tracking)

Tracks who's online with metadata:
```ts
{
  user_id: string,
  username: string,
  avatar_color: string,
  role: UserRole,
  is_speaker: boolean,
  joined_at: string
}
```

Key behaviors:
- Presence key = `user_id` (handles multi-tab dedup)
- On presence sync, takes the **last** presence entry per key (most recent)
- Re-tracked whenever `isSpeaker`, `myRole`, or `username` changes

## 3. Database Change Listeners (persistent state)

| Channel            | Table          | Event    | Purpose                         |
|--------------------|----------------|----------|---------------------------------|
| `room-db:{id}`     | `rooms`        | UPDATE   | Sync room state changes         |
| `queue-db:{id}`    | `queue_items`  | * (all)  | Re-fetch full queue on any change |

## Playback Sync Design

**Sync is playlist-level, NOT time-level.** When someone clicks next/prev/jump, all users switch to that song. But each user's playback position within a track is mostly independent.

### Speaker Mode

- **Speaker ON**: Device plays audio/video via YouTube IFrame API. Sends `time_sync` after seeking. Tracks `currentTime` via `setInterval(500ms)`.
- **Speaker OFF**: No YouTube player active. Shows progress bar via local interpolation (incrementing `currentTime` by 0.5 every 500ms). Self-corrects on `playback_sync` or `time_sync` events.

### Flow: User Clicks "Next"

1. Client updates local state: `current_song_index + 1`
2. Broadcasts `playback_sync { type: 'next', song_index }` to channel
3. Updates `rooms` table in DB (persistent)
4. Other clients receive broadcast → update song index, load new video
5. Speaker clients load new video via `loadVideoById()`

### Flow: Song Ends (Auto-Advance)

1. YouTube fires `ENDED` event on speaker
2. `handleNextRef.current()` fires (guarded by `isTransitioningRef` to prevent doubles)
3. If repeat mode ON → re-seek to 0 and play same song
4. If last song → pause (no wrap-around)
5. Otherwise → same as "Next" flow

### Guards and Edge Cases

- **`isTransitioningRef`**: Prevents `handleNext` from firing twice in rapid succession
- **`isLoadingVideoRef`**: Suppresses spurious `ENDED` events that YouTube emits when `loadVideoById()` is called
- **`loadedVideoIdRef`**: Prevents restarting the same video on queue re-fetch

## Room Heartbeat

Every 60 seconds, the client pings the `rooms` table with `last_active_at` and (if speaker) `current_playback_time`. This prevents auto-cleanup of active rooms.

## Adding a New Broadcast Event

1. Define the event handler in the `useEffect` that sets up the Supabase channel (~line 504 in RoomClient.tsx)
2. Add sender logic using `channelRef.current.send({ type: 'broadcast', event: 'your_event', payload })`
3. **Remember**: broadcasts are ephemeral. If the state needs to survive page refresh, also update the DB.

## Database Schema (Key Tables)

### `rooms`
- `slug` TEXT UNIQUE — URL-friendly room name
- `current_song_index` INTEGER — currently playing track index
- `current_playback_time` FLOAT — last known speaker position
- `is_playing` BOOLEAN — global play/pause state
- `volume` INTEGER — 0-100
- `repeat` BOOLEAN — repeat mode
- `default_role` TEXT — role for new joiners
- `user_roles` JSONB — `{ user_id: role }` overrides
- `last_active_at` TIMESTAMPTZ — heartbeat timestamp

### `queue_items`
- `room_id` UUID FK → rooms
- `youtube_id` TEXT — YouTube video ID
- `title`, `thumbnail_url`, `duration_seconds` — video metadata
- `added_by` TEXT — username who added it
- `position` INTEGER — order in queue

### `chat_messages`
- `room_id` UUID FK → rooms
- `user_id`, `username`, `avatar_color` — author info
- `message` TEXT — chat text
- `image_url` TEXT — optional image (Supabase Storage)
- `song_ref` JSONB — optional song reference card
