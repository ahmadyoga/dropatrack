# DropATrack — Agent Documentation

> A collaborative music room app inspired by jukebox.today. Built with Next.js 16 (App Router), Supabase (PostgreSQL + Realtime), Tailwind CSS v4, and YouTube IFrame/Data APIs.

## Quick Start

```bash
# Use Node 22 (pinned in .nvmrc)
nvm use

# Install dependencies
npm install

# Set environment variables in .env.local
# See .env.local for the template

# Run the Supabase schema (supabase-schema.sql) in Supabase SQL Editor

# Start dev server
npm run dev
```

## Architecture Overview

### Tech Stack
| Layer | Tech | Purpose |
|-------|------|---------|
| Framework | Next.js 16 (App Router) | SSR, routing, API routes |
| Realtime | Supabase Realtime (Broadcast + Presence) | Playlist sync, user presence |
| Database | Supabase PostgreSQL | Rooms, queue persistence |
| Styling | Tailwind CSS v4 (CSS-first config) | Utility-first responsive UI |
| Media | YouTube IFrame API + YouTube Data API v3 | Playback + search |

### Important Next.js 16 Patterns
- **`params` is a Promise**: Always `await params` in page/layout/route components
- **`PageProps<'/route'>`**: Use global type helper instead of manual typing
- **Route Handlers**: Use `route.ts` files in `app/api/` for server-side API endpoints
- **`'use client'`**: Required directive for any component using hooks, state, or browser APIs
- **Environment variables**: Only `NEXT_PUBLIC_*` vars are exposed to the browser. `YOUTUBE_API_KEY` stays server-side

### Key Design Decisions

1. **Sync is playlist-level, NOT time-level**: When someone skips a track, all users skip. But each user's playback position within a track is independent. This is by design.

2. **Speaker Mode**: Each client decides if their device plays audio/video (`localStorage`). Speaker OFF = remote control only (controls playback for everyone, but no local audio/video).

3. **Anonymous Users**: No auth required. Users get random cute names (e.g., "Kijang Ceria", "Kerbau Malu") with generated avatar colors. Stored in `localStorage`.

4. **YouTube API Key Security**: The `YOUTUBE_API_KEY` is NEVER exposed to the browser. All YouTube searches go through `/api/youtube/search` route handler which runs server-side.

5. **Supabase Keys**: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are intentionally public (Supabase anon keys are safe to expose — RLS policies protect data).

## Project Structure

```
app/
├── layout.tsx              # Root layout with Google Fonts + meta
├── page.tsx                # Homepage — create/join room
├── globals.css             # Tailwind v4 + custom glassmorphic styles
├── rooms/
│   └── page.tsx            # Public rooms listing
├── [slug]/
│   └── page.tsx            # Room page — main player UI
└── api/
    └── youtube/
        └── search/
            └── route.ts    # YouTube search proxy (hides API key)

lib/
├── supabase.ts             # Supabase client singleton
├── youtube.ts              # YouTube API helpers
├── names.ts                # Random cute name generator
└── types.ts                # Shared TypeScript types

components/
├── RoomClient.tsx          # Main room client component (all interactive logic)
├── CreateRoom.tsx          # Homepage room creation form
├── PublicRooms.tsx         # Public rooms listing component
├── YouTubePlayer.tsx       # YouTube IFrame API wrapper
├── PlayerControls.tsx      # Play/Pause/Skip/Seek bar
├── QueueList.tsx           # Song queue display
├── AddSong.tsx             # YouTube search/URL input
├── UserList.tsx            # Connected users with presence
└── NowPlaying.tsx          # Current track display card
```

## Sync Engine

The sync engine uses two Supabase Realtime features:

### 1. Broadcast (ephemeral, low-latency)
Used for playlist-level sync events. Channel name: `room:{slug}`

Events:
- `playback_sync` → `{ type: 'play' | 'pause' | 'next' | 'prev', song_index: number }`
- Never broadcasts seek position (sync is playlist-level only)

### 2. Presence (user tracking)
Tracks who's in the room with metadata:
- `{ user_id, username, avatar_color, role, is_speaker }`

### 3. Database Changes (persistent state)
- `rooms` table: `current_song_index`, `is_playing` updated on play/pause/skip
- `queue_items` table: rows inserted/deleted on add/remove songs
- Supabase Realtime auto-broadcasts row changes to subscribed clients

### Flow: New User Joins a Room
1. Fetch room state from DB (`rooms` table)
2. Fetch queue from DB (`queue_items` table)
3. Subscribe to Supabase Realtime channel `room:{slug}`
4. Set presence with user metadata
5. Load the current song (by `current_song_index`) in YouTube player
6. If `is_playing` is true, start playback from beginning of that track

### Flow: User Clicks "Next"
1. Client broadcasts `playback_sync` with `{ type: 'next', song_index: current + 1 }`
2. Client updates `rooms` row: `current_song_index = current + 1`
3. All other clients receive broadcast → load new song, start playing

## Database Schema

See `supabase-schema.sql` for the full SQL. Key tables:

### `rooms`
- `slug` (TEXT UNIQUE): URL-friendly room name
- `current_song_index` (INTEGER): Currently playing track index
- `is_playing` (BOOLEAN): Global play/pause state
- `is_public` (BOOLEAN): Show in public listing

### `queue_items`
- `room_id` (UUID FK): References rooms
- `youtube_id` (TEXT): YouTube video ID
- `title`, `thumbnail_url`, `duration_seconds`: Video metadata
- `added_by` (TEXT): Username of who added it
- `position` (INTEGER): Order in queue

## Role System
Roles: `admin` | `moderator` | `dj` | `listener`
- **Admin**: Full control (assigned to room creator)
- **Moderator**: Can skip, pause, remove songs
- **DJ**: Can add songs, skip
- **Listener**: Can only add songs

## Deferred Features (not yet implemented)
- Real-time chat (broadcast-based)
- Playlist save/load
- Time-level sync between devices
- Drag-to-reorder queue
- Room password protection

## Common Tasks for Agents

### Adding a new feature
1. Read this doc and understand the sync engine
2. Check if it needs `'use client'` (interactive = yes)
3. For new API routes, create `app/api/[feature]/route.ts`
4. For new realtime events, add to the broadcast handler in `RoomClient.tsx`

### Modifying the sync engine
- All sync logic lives in `RoomClient.tsx` in the `useEffect` that sets up the Supabase channel
- Broadcast events are ephemeral — they're not stored
- DB changes are persistent — they survive page refreshes

### Styling
- Tailwind CSS v4 with CSS-first config (no `tailwind.config.ts`)
- Glassmorphic theme: white background, `backdrop-blur`, green (#22c55e) accents
- Custom CSS classes defined in `app/globals.css`
