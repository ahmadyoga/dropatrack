---
name: project-overview
description: DropATrack project architecture, tech stack, file structure, conventions, and critical gotchas. Read this FIRST before any task.
---

# DropATrack — Project Overview

> A collaborative music room app inspired by jukebox.today. Users create rooms, share links, and listen to YouTube music together in real-time.

**Live URL**: `dropatrack.vercel.app`

## Tech Stack

| Layer       | Tech                                      | Purpose                          |
|-------------|-------------------------------------------|----------------------------------|
| Framework   | Next.js 16 (App Router)                   | SSR, routing, API routes         |
| Realtime    | Supabase Realtime (Broadcast + Presence)  | Playlist sync, user presence     |
| Database    | Supabase PostgreSQL                       | Rooms, queue, chat persistence   |
| Styling     | Tailwind CSS v4 (CSS-first) + vanilla CSS | Responsive glassmorphic UI       |
| Media       | YouTube IFrame API + YouTube Data API v3  | Playback + search                |
| Deployment  | Vercel                                    | Hosting, cron jobs               |
| Node        | v22 (pinned in `.nvmrc`)                  |                                  |

## Project Structure

```
dropatrack/
├── app/
│   ├── layout.tsx                    # Root layout (Google Fonts, ThemeProvider, meta)
│   ├── page.tsx                      # Homepage — create/join room (Server Component)
│   ├── globals.css                   # Tailwind v4 + glassmorphic theme + all custom CSS
│   ├── home.css                      # Homepage-specific styles
│   ├── room.css                      # Room page styles (~54KB, big file)
│   ├── [slug]/
│   │   └── page.tsx                  # Room page — fetches room from DB, renders RoomClient
│   └── api/
│       ├── chat/
│       │   ├── route.ts              # Chat messages CRUD
│       │   └── upload/route.ts       # Chat image upload (Supabase Storage)
│       ├── cron/
│       │   ├── cleanup/route.ts      # Stale room cleanup
│       │   └── keepalive/route.ts    # Vercel cron keepalive
│       ├── queue/
│       │   ├── add-external/route.ts # Add song from browser extension
│       │   └── shuffle/route.ts      # Shuffle queue order
│       ├── rooms/
│       │   └── cleanup/route.ts      # Room cleanup endpoint
│       └── youtube/
│           ├── search/route.ts       # YouTube search proxy (hides API key)
│           ├── trending/route.ts     # Trending videos by region
│           ├── latest/route.ts       # Latest releases by region
│           ├── curated/route.ts      # Curated playlists
│           └── playlists/route.ts    # Playlist video fetcher
│
├── components/
│   ├── RoomClient.tsx                # ⭐ MAIN COMPONENT (~2700 lines, ALL room logic)
│   ├── CreateRoom.tsx                # Homepage room creation form
│   ├── PublicRooms.tsx               # Public rooms listing
│   ├── ThemeProvider.tsx             # Dark/light theme context
│   └── ThemeToggle.tsx               # Theme toggle button
│
├── lib/
│   ├── supabase.ts                   # Supabase client singleton
│   ├── types.ts                      # All TypeScript interfaces
│   ├── names.ts                      # Random username generator + localStorage identity
│   ├── youtube.ts                    # YouTube URL parser + duration formatter
│   ├── region.ts                     # IANA timezone → ISO country code mapper
│   ├── curatedPlaylists.ts           # Curated YouTube Music playlists (ID locale)
│   └── antiDebug.ts                  # Anti-devtools protection
│
├── extension/                        # Browser extension for adding songs externally
├── supabase-schema.sql               # Full database schema (run in Supabase SQL Editor)
├── vercel.json                       # Vercel cron config
└── CLAUDE.md                         # Legacy agent documentation
```

## Critical Files

### `components/RoomClient.tsx` (~2700 lines)
This is THE main file. It contains ALL room interactive logic in a single `'use client'` component:
- YouTube IFrame API player management
- Supabase Realtime channel (broadcast + presence + DB listeners)
- Playback controls (play/pause/next/prev/seek/volume)
- Queue management (add/remove/reorder/shuffle)
- Chat system (text + image + song references)
- User list + role management
- Speaker mode toggle
- Username editing
- Trending/latest/curated music discovery
- Mobile responsive tabs

### `app/[slug]/page.tsx` (Server Component)
- Fetches room from Supabase by slug
- Auto-creates room if it doesn't exist (for bookmarked/shared URLs)
- First joiner gets auto-promoted to admin client-side
- Uses `notFound()` as final safety net

### `lib/names.ts`
- Generates fun Indonesian-themed random usernames (e.g., "KucingOren Ngoding 42")
- Stores user identity in `localStorage` with 12-hour expiry
- **CRITICAL**: Uses `localStorage` — NEVER call from server components!

## Environment Variables

```env
# Public (exposed to browser — safe, protected by RLS)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Server-only (NEVER expose to browser)
YOUTUBE_API_KEY=AIza...
CRON_SECRET=xxx            # Vercel cron auth
```

## Quick Start

```bash
nvm use           # Node 22
npm install
npm run dev       # http://localhost:3000
```

## Key Conventions

1. **`'use client'`** is required for any component using hooks, state, or browser APIs
2. **`params` is a Promise** in Next.js 16 — always `await params`
3. **YouTube API key stays server-side** — all searches go through `/api/youtube/search`
4. **Supabase anon keys are public** — RLS policies protect data
5. **CSS lives in `globals.css`, `home.css`, and `room.css`** — no CSS modules
6. **No auth system** — users are anonymous with localStorage-based identity
