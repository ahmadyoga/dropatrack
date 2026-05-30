# Graph Report - .  (2026-05-30)

## Corpus Check
- 94 files · ~61,753 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 639 nodes · 963 edges · 68 communities (27 shown, 41 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Client Core & Hooks|Client Core & Hooks]]
- [[_COMMUNITY_API & YouTube Rotation|API & YouTube Rotation]]
- [[_COMMUNITY_Performance Optimization Plan|Performance Optimization Plan]]
- [[_COMMUNITY_Playback Sync Plan|Playback Sync Plan]]
- [[_COMMUNITY_Discovery & Theme|Discovery & Theme]]
- [[_COMMUNITY_Reactions Store & Player|Reactions Store & Player]]
- [[_COMMUNITY_YouTube Rotation Docs|YouTube Rotation Docs]]
- [[_COMMUNITY_YT Music Extension|YT Music Extension]]
- [[_COMMUNITY_Architecture Docs|Architecture Docs]]
- [[_COMMUNITY_Floating Reactions Plan|Floating Reactions Plan]]
- [[_COMMUNITY_Playback Store & Progress|Playback Store & Progress]]
- [[_COMMUNITY_Playback Sync Specs|Playback Sync Specs]]
- [[_COMMUNITY_Spotify Extension|Spotify Extension]]
- [[_COMMUNITY_Generic Content Extension|Generic Content Extension]]
- [[_COMMUNITY_Floating Reactions Specs|Floating Reactions Specs]]
- [[_COMMUNITY_Extension Popup|Extension Popup]]
- [[_COMMUNITY_Performance Optimization Specs|Performance Optimization Specs]]
- [[_COMMUNITY_README Docs|README Docs]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]

## God Nodes (most connected - your core abstractions)
1. `getYouTubeApiKey()` - 22 edges
2. `recordApiSuccess()` - 22 edges
3. `recordApiError()` - 22 edges
4. `Room` - 14 edges
5. `getOrCreateUser()` - 13 edges
6. `supabase` - 13 edges
7. `RoomClient Performance Optimization Implementation Plan` - 13 edges
8. `parseISO8601Duration()` - 11 edges
9. `YouTube API Key Rotation System` - 11 edges
10. `Time-Level Playback Sync Implementation Plan` - 11 edges

## Surprising Connections (you probably didn't know these)
- `useRoomSync` --rationale_for--> `Agent Documentation`  [INFERRED]
  components/room/hooks/useRoomSync.ts → CLAUDE.md
- `useQueue` --rationale_for--> `YouTube API Rotation`  [INFERRED]
  components/room/hooks/useQueue.ts → YOUTUBE_API_ROTATION.md
- `GET()` --calls--> `getKeyRotationStats()`  [EXTRACTED]
  app/api/youtube/keys/stats/route.ts → lib/youtubeKeyRotation.ts
- `formatDuration()` --calls--> `Sidebar()`  [EXTRACTED]
  lib/youtube.ts → components/room/Sidebar.tsx
- `formatDuration()` --calls--> `PlayerBar()`  [EXTRACTED]
  lib/youtube.ts → PlayerBar.tsx

## Communities (68 total, 41 thin omitted)

### Community 0 - "Client Core & Hooks"
Cohesion: 0.05
Nodes (60): RoomClient(), RoomClientProps, CurrentUser, useChat(), UseChatProps, useDiscovery(), CurrentUser, useIdentity() (+52 more)

### Community 1 - "API & YouTube Rotation"
Cohesion: 0.1
Nodes (32): corsHeaders, fetchPlaylistItems(), jsonResponse(), POST(), supabase, VideoInput, GET(), GET() (+24 more)

### Community 2 - "Performance Optimization Plan"
Cohesion: 0.04
Nodes (45): code:json ("scripts": {), code:tsx ('use client';), code:tsx ('use client';), code:bash (git add components/room/TimeLabel.tsx components/room/Progre), code:ts (import { setTime as setStoreTime } from '../playbackTimeStor), code:ts (// Seed the external time store with the room's last known p), code:ts (const t = playerRef.current.getCurrentTime();), code:bash (git add components/room/hooks/useYouTubePlayer.ts) (+37 more)

### Community 3 - "Playback Sync Plan"
Cohesion: 0.05
Nodes (41): code:sql (-- Time-level playback sync: anchor timestamp for current_pl), code:tsx (import { electTimeSource, type PlaybackAnchor } from '@/lib/), code:tsx (const anchorRef = useRef<PlaybackAnchor>({), code:tsx (// Elect the host-less playback time source from presence.), code:tsx (// ── Time-level playback sync ─────────────────────────────), code:ts (supabase.from('rooms').update({), code:ts (// Remote interpolation: smoothly increment currentTime for ), code:ts (// Remote: reset time when song changes) (+33 more)

### Community 4 - "Discovery & Theme"
Cohesion: 0.07
Nodes (21): metadata, viewport, Theme, ThemeContext, ThemeContextType, ThemeProvider(), useTheme(), ThemeToggle() (+13 more)

### Community 5 - "Reactions Store & Player"
Cohesion: 0.15
Nodes (22): CurrentUser, UseRoomSyncProps, PlayerBar(), PlayerBarProps, REACTION_EMOJIS, addReaction(), addReactionBurst(), emit() (+14 more)

### Community 6 - "YouTube Rotation Docs"
Cohesion: 0.07
Nodes (27): All Keys Exhausted, Best Practices, Check Rotation Status, code:bash (# Using comma-separated keys (recommended)), code:typescript (import { getYouTubeApiKey, recordApiSuccess, recordApiError ), code:json ({), code:bash (curl https://yourdomain.com/api/youtube/keys/stats), code:block5 (YouTube API key quota exhausted: AIzaSyD... Will retry after) (+19 more)

### Community 7 - "YT Music Extension"
Cohesion: 0.14
Nodes (20): attachBannerEvents(), buildBannerHTML(), cleanButtons(), cleanPageTitle(), createItemButton(), extractQueueVideos(), extractShelfVideos(), extractVideoId() (+12 more)

### Community 8 - "Architecture Docs"
Cohesion: 0.08
Nodes (25): 1. Broadcast (ephemeral, low-latency), 2. Presence (user tracking), 3. Database Changes (persistent state), Adding a new feature, Architecture Overview, code:bash (# Use Node 22 (pinned in .nvmrc)), code:block2 (app/), Common Tasks for Agents (+17 more)

### Community 9 - "Floating Reactions Plan"
Cohesion: 0.08
Nodes (23): code:ts (import { describe, it, expect, beforeEach, vi } from 'vitest), code:tsx (const sendReaction = (emoji: string) => {), code:tsx (<div className="reaction-wrap" ref={reactionWrapRef} style={), code:css (.reaction-popover {), code:bash (git add components/room/PlayerBar.tsx app/room.css), code:ts (// Broadcast: emoji reaction), code:bash (git add components/room/hooks/useRoomSync.ts), code:ts (// Ephemeral store for floating emoji reactions. Lives outsi) (+15 more)

### Community 10 - "Playback Store & Progress"
Cohesion: 0.15
Nodes (14): formatDuration(), emit(), getCurrentTime(), getServerSnapshot(), listeners, _reset(), subscribe(), cb (+6 more)

### Community 11 - "Playback Sync Specs"
Cohesion: 0.1
Nodes (19): Affected Files, Clock-skew-safe elapsed time, code:block1 (expected = is_playing ? base + elapsedSinceAnchor : base), code:block2 (elapsedSinceAnchor = (performance.now() - receivedAt) / 1000), code:block3 (speakers = users.filter(u => u.is_speaker).map(u => u.user_i), code:sql (ALTER TABLE rooms ADD COLUMN IF NOT EXISTS playback_updated_), Correction loop, Design (+11 more)

### Community 12 - "Spotify Extension"
Cohesion: 0.16
Nodes (15): addAllQueueTracks(), extractSpotifyTracks(), extractTrackFromRow(), getSpotifyPageType(), init(), injectAddAllButton(), injectAll(), injectItemButtons() (+7 more)

### Community 13 - "Generic Content Extension"
Cohesion: 0.17
Nodes (14): attachBannerEvents(), buildBannerHTML(), cleanPageTitle(), extractDuration(), extractVideoInfo(), init(), injectAll(), injectBanner() (+6 more)

### Community 14 - "Floating Reactions Specs"
Cohesion: 0.12
Nodes (15): Affected Files, Basis: Supabase realtime example, Decisions (from brainstorming), Floating Emoji Reactions — Design, Goals, Isolation via a dedicated store, Non-Goals, Problem (+7 more)

### Community 15 - "Extension Popup"
Cohesion: 0.22
Nodes (12): addPlaylist(), addVideo(), allRoomSlugs, contentEl, escapeHtml(), isYTM, match, persistRoomSelection() (+4 more)

### Community 16 - "Performance Optimization Specs"
Cohesion: 0.17
Nodes (11): 1. Isolate time updates with an external store + leaf subscribers, 2. Cap chat memory, 3. Light insurance (cheap), 4. Verification, Affected Files, Design, Goals, Non-Goals (deferred) (+3 more)

### Community 17 - "README Docs"
Cohesion: 0.29
Nodes (6): code:bash (cp .env.example .env.local), code:bash (npm run dev), Deploy on Vercel, DropATrack  🎵, Getting Started, Learn More

### Community 18 - "Community 18"
Cohesion: 0.38
Nodes (7): Chat Fetch API, Chat Send API, OG Image Generator, Collaborative Real-time Playback, Chat Messages Table, Queue Items Table, Rooms Table

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (6): Add External API, Extension Room Monitor, YouTube Content Extractor, Spotify Track Extractor, YouTube ID Extractor, YouTube Key Rotation System

### Community 21 - "Community 21"
Cohesion: 0.4
Nodes (5): useChat, usePlayback, useQueue, useYouTubePlayer, YouTube API Rotation

### Community 31 - "Community 31"
Cohesion: 0.67
Nodes (3): ChatBox, RightPanel, UserList

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (3): Agent Documentation, useIdentity, useRoomSync

## Knowledge Gaps
- **291 isolated node(s):** `nextConfig`, `config`, `supabase`, `EMOJIS`, `eslintConfig` (+286 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `addReaction()` connect `Reactions Store & Player` to `Client Core & Hooks`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `nextConfig`, `config`, `supabase` to the rest of the system?**
  _291 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Client Core & Hooks` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `API & YouTube Rotation` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Performance Optimization Plan` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Playback Sync Plan` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Discovery & Theme` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._