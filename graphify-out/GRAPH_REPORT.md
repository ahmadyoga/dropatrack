# Graph Report - .  (2026-06-08)

## Corpus Check
- 170 files · ~251,371 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 906 nodes · 1406 edges · 90 communities (47 shown, 43 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Room Hooks & Playback|Room Hooks & Playback]]
- [[_COMMUNITY_Game System (Minesweeper)|Game System (Minesweeper)]]
- [[_COMMUNITY_API Routes & Supabase|API Routes & Supabase]]
- [[_COMMUNITY_Performance Optimization Plan|Performance Optimization Plan]]
- [[_COMMUNITY_Room UI Components|Room UI Components]]
- [[_COMMUNITY_Playback Sync Plan|Playback Sync Plan]]
- [[_COMMUNITY_YouTube API Rotation|YouTube API Rotation]]
- [[_COMMUNITY_Browser Extension Logic|Browser Extension Logic]]
- [[_COMMUNITY_Reactions System|Reactions System]]
- [[_COMMUNITY_Project Architecture & Docs|Project Architecture & Docs]]
- [[_COMMUNITY_Discover.tsx|Discover.tsx]]
- [[_COMMUNITY_2026-05-29-floating-emoji-reac|2026-05-29-floating-emoji-reac]]
- [[_COMMUNITY_metadata|metadata]]
- [[_COMMUNITY_2026-05-29-time-level-playback|2026-05-29-time-level-playback]]
- [[_COMMUNITY_ACCENT_MAP|ACCENT_MAP]]
- [[_COMMUNITY_addAllQueueTracks()|addAllQueueTracks()]]
- [[_COMMUNITY_addVideosToRoom()|addVideosToRoom()]]
- [[_COMMUNITY_avatarFor()|avatarFor()]]
- [[_COMMUNITY_2026-05-29-floating-emoji-reac|2026-05-29-floating-emoji-reac]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_addPlaylist()|addPlaylist()]]
- [[_COMMUNITY_Header.tsx|Header.tsx]]
- [[_COMMUNITY_2026-05-29-roomclient-performa|2026-05-29-roomclient-performa]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_route.tsx|route.tsx]]
- [[_COMMUNITY_useAutoSuggest.ts|useAutoSuggest.ts]]
- [[_COMMUNITY_Player.tsx|Player.tsx]]
- [[_COMMUNITY_Chat.tsx|Chat.tsx]]
- [[_COMMUNITY_SettingsModal.tsx|SettingsModal.tsx]]
- [[_COMMUNITY_MobileNav.tsx|MobileNav.tsx]]
- [[_COMMUNITY_codebash (cp .env.example .en|code:bash (cp .env.example .en]]
- [[_COMMUNITY_Chat Fetch API|Chat Fetch API]]
- [[_COMMUNITY_CrewStrip.tsx|CrewStrip.tsx]]
- [[_COMMUNITY_Add External API|Add External API]]
- [[_COMMUNITY_ReactionBar.tsx|ReactionBar.tsx]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_useChat|useChat]]
- [[_COMMUNITY_Bubble()|Bubble()]]
- [[_COMMUNITY_App()|App()]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_EmojiPicker.tsx|EmojiPicker.tsx]]
- [[_COMMUNITY_HTML_PATH|HTML_PATH]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_ExtensionPopup.tsx|ExtensionPopup.tsx]]
- [[_COMMUNITY_ImagePreviewModal.tsx|ImagePreviewModal.tsx]]
- [[_COMMUNITY_ChatBox|ChatBox]]
- [[_COMMUNITY_Agent Documentation|Agent Documentation]]
- [[_COMMUNITY_puppeteer|puppeteer]]
- [[_COMMUNITY_nextConfig|nextConfig]]
- [[_COMMUNITY_config|config]]
- [[_COMMUNITY_eslintConfig|eslintConfig]]
- [[_COMMUNITY_graphify|graphify]]
- [[_COMMUNITY_YouTube Fresh API|YouTube Fresh API]]
- [[_COMMUNITY_Stale Room Cleanup|Stale Room Cleanup]]
- [[_COMMUNITY_Anti-Debug Hook|Anti-Debug Hook]]
- [[_COMMUNITY_Curated Content Provider|Curated Content Provider]]
- [[_COMMUNITY_QueueList|QueueList]]
- [[_COMMUNITY_cleanup_stale_rooms Function|cleanup_stale_rooms Function]]
- [[_COMMUNITY_QueueItem Interface|QueueItem Interface]]
- [[_COMMUNITY_ThemeProvider|ThemeProvider]]
- [[_COMMUNITY_Discovery|Discovery]]
- [[_COMMUNITY_PlayerBar|PlayerBar]]
- [[_COMMUNITY_MobileNav|MobileNav]]
- [[_COMMUNITY_useDiscovery|useDiscovery]]
- [[_COMMUNITY_ExtensionPopup|ExtensionPopup]]
- [[_COMMUNITY_ImagePreviewModal|ImagePreviewModal]]
- [[_COMMUNITY_SettingsModal|SettingsModal]]
- [[_COMMUNITY_README|README]]
- [[_COMMUNITY_Extension Popup|Extension Popup]]
- [[_COMMUNITY_Window Icon|Window Icon]]
- [[_COMMUNITY_Vercel Logo|Vercel Logo]]
- [[_COMMUNITY_File Icon|File Icon]]
- [[_COMMUNITY_Globe Icon|Globe Icon]]
- [[_COMMUNITY_Next.js Logo|Next.js Logo]]
- [[_COMMUNITY_OpenGraph Image|OpenGraph Image]]
- [[_COMMUNITY_App Favicon|App Favicon]]
- [[_COMMUNITY_Extension Icon (16x16)|Extension Icon (16x16)]]
- [[_COMMUNITY_Extension Icon (48x48)|Extension Icon (48x48)]]
- [[_COMMUNITY_Extension Icon (128x128)|Extension Icon (128x128)]]

## God Nodes (most connected - your core abstractions)
1. `getYouTubeApiKey()` - 22 edges
2. `recordApiSuccess()` - 22 edges
3. `recordApiError()` - 22 edges
4. `useRoom()` - 19 edges
5. `getOrCreateUser()` - 17 edges
6. `Room` - 16 edges
7. `QueueItem` - 13 edges
8. `supabase` - 13 edges
9. `RoomClient()` - 13 edges
10. `RoomClient Performance Optimization Implementation Plan` - 13 edges

## Surprising Connections (you probably didn't know these)
- `useRoomSync` --rationale_for--> `Agent Documentation`  [INFERRED]
  components/room/hooks/useRoomSync.ts → CLAUDE.md
- `useQueue` --rationale_for--> `YouTube API Rotation`  [INFERRED]
  components/room/hooks/useQueue.ts → YOUTUBE_API_ROTATION.md
- `GET()` --calls--> `getKeyRotationStats()`  [EXTRACTED]
  app/api/youtube/keys/stats/route.ts → lib/youtubeKeyRotation.ts
- `formatDuration()` --calls--> `Sidebar()`  [EXTRACTED]
  lib/youtube.ts → components/room/Sidebar.tsx
- `formatDuration()` --calls--> `TimeLabel()`  [EXTRACTED]
  lib/youtube.ts → components/room/TimeLabel.tsx

## Communities (90 total, 43 thin omitted)

### Community 0 - "Room Hooks & Playback"
Cohesion: 0.06
Nodes (63): MobileTab, RoomClient(), RoomClientProps, useAutoSuggest(), CurrentUser, useChat(), UseChatProps, useDiscovery() (+55 more)

### Community 1 - "Game System (Minesweeper)"
Cohesion: 0.05
Nodes (37): GameCreateModalProps, LEVEL_ACCENT, LEVEL_ICONS, GameInviteMessageProps, ADJ_COLORS, MinesweeperBoardProps, WaitingRoomProps, UseGameSessionReturn (+29 more)

### Community 2 - "API Routes & Supabase"
Cohesion: 0.1
Nodes (32): corsHeaders, fetchPlaylistItems(), jsonResponse(), POST(), supabase, VideoInput, GET(), GET() (+24 more)

### Community 3 - "Performance Optimization Plan"
Cohesion: 0.04
Nodes (45): code:json ("scripts": {), code:tsx ('use client';), code:tsx ('use client';), code:bash (git add components/room/TimeLabel.tsx components/room/Progre), code:ts (import { setTime as setStoreTime } from '../playbackTimeStor), code:ts (// Seed the external time store with the room's last known p), code:ts (const t = playerRef.current.getCurrentTime();), code:bash (git add components/room/hooks/useYouTubePlayer.ts) (+37 more)

### Community 4 - "Room UI Components"
Cohesion: 0.07
Nodes (26): CARD_SHADOWS, UsernameModalProps, adjectives, animals, avatarColors, confirmUsername(), generateAvatarColor(), generateRandomName() (+18 more)

### Community 5 - "Playback Sync Plan"
Cohesion: 0.05
Nodes (41): code:sql (-- Time-level playback sync: anchor timestamp for current_pl), code:tsx (import { electTimeSource, type PlaybackAnchor } from '@/lib/), code:tsx (const anchorRef = useRef<PlaybackAnchor>({), code:tsx (// Elect the host-less playback time source from presence.), code:tsx (// ── Time-level playback sync ─────────────────────────────), code:ts (supabase.from('rooms').update({), code:ts (// Remote interpolation: smoothly increment currentTime for ), code:ts (// Remote: reset time when song changes) (+33 more)

### Community 6 - "YouTube API Rotation"
Cohesion: 0.07
Nodes (27): All Keys Exhausted, Best Practices, Check Rotation Status, code:bash (# Using comma-separated keys (recommended)), code:typescript (import { getYouTubeApiKey, recordApiSuccess, recordApiError ), code:json ({), code:bash (curl https://yourdomain.com/api/youtube/keys/stats), code:block5 (YouTube API key quota exhausted: AIzaSyD... Will retry after) (+19 more)

### Community 7 - "Browser Extension Logic"
Cohesion: 0.14
Nodes (20): attachBannerEvents(), buildBannerHTML(), cleanButtons(), cleanPageTitle(), createItemButton(), extractQueueVideos(), extractShelfVideos(), extractVideoId() (+12 more)

### Community 8 - "Reactions System"
Cohesion: 0.18
Nodes (19): CurrentUser, UseRoomSyncProps, addReaction(), addReactionBurst(), emit(), EMPTY, FloatingReaction, getServerSnapshot() (+11 more)

### Community 9 - "Project Architecture & Docs"
Cohesion: 0.08
Nodes (25): 1. Broadcast (ephemeral, low-latency), 2. Presence (user tracking), 3. Database Changes (persistent state), Adding a new feature, Architecture Overview, code:bash (# Use Node 22 (pinned in .nvmrc)), code:block2 (app/), Common Tasks for Agents (+17 more)

### Community 10 - "Discover.tsx"
Cohesion: 0.09
Nodes (14): EnrichedPlaylist, EnrichedSection, UseDiscoveryProps, CuratedPlaylist, CuratedSection, SECTIONS_BY_REGION, SECTIONS_DEFAULT, SECTIONS_ID (+6 more)

### Community 11 - "2026-05-29-floating-emoji-reac"
Cohesion: 0.08
Nodes (23): code:ts (import { describe, it, expect, beforeEach, vi } from 'vitest), code:tsx (const sendReaction = (emoji: string) => {), code:tsx (<div className="reaction-wrap" ref={reactionWrapRef} style={), code:css (.reaction-popover {), code:bash (git add components/room/PlayerBar.tsx app/room.css), code:ts (// Broadcast: emoji reaction), code:bash (git add components/room/hooks/useRoomSync.ts), code:ts (// Ephemeral store for floating emoji reactions. Lives outsi) (+15 more)

### Community 12 - "metadata"
Cohesion: 0.12
Nodes (12): metadata, viewport, Theme, ThemeContext, ThemeContextType, ThemeProvider(), useTheme(), ThemeToggle() (+4 more)

### Community 13 - "2026-05-29-time-level-playback"
Cohesion: 0.1
Nodes (19): Affected Files, Clock-skew-safe elapsed time, code:block1 (expected = is_playing ? base + elapsedSinceAnchor : base), code:block2 (elapsedSinceAnchor = (performance.now() - receivedAt) / 1000), code:block3 (speakers = users.filter(u => u.is_speaker).map(u => u.user_i), code:sql (ALTER TABLE rooms ADD COLUMN IF NOT EXISTS playback_updated_), Correction loop, Design (+11 more)

### Community 14 - "ACCENT_MAP"
Cohesion: 0.1
Nodes (5): ACCENT_MAP, App(), TWEAK_DEFAULTS, TYPE_MAP, useTweaks()

### Community 15 - "addAllQueueTracks()"
Cohesion: 0.16
Nodes (15): addAllQueueTracks(), extractSpotifyTracks(), extractTrackFromRow(), getSpotifyPageType(), init(), injectAddAllButton(), injectAll(), injectItemButtons() (+7 more)

### Community 16 - "addVideosToRoom()"
Cohesion: 0.17
Nodes (14): attachBannerEvents(), buildBannerHTML(), cleanPageTitle(), extractDuration(), extractVideoInfo(), init(), injectAll(), injectBanner() (+6 more)

### Community 17 - "avatarFor()"
Cohesion: 0.11
Nodes (11): avatarFor(), CHAT_SEED, EMOJI_PICKER, QUICK_EMOJI, ROLES, ROOMS, SEARCH_POOL, TRACKS (+3 more)

### Community 18 - "2026-05-29-floating-emoji-reac"
Cohesion: 0.12
Nodes (15): Affected Files, Basis: Supabase realtime example, Decisions (from brainstorming), Floating Emoji Reactions — Design, Goals, Isolation via a dedicated store, Non-Goals, Problem (+7 more)

### Community 19 - "route.ts"
Cohesion: 0.27
Nodes (8): geminiAvailableKeyCount(), GeminiKeyRotation, getGeminiApiKey(), getRotation(), KeyStats, recordGeminiError(), recordGeminiSuccess(), POST()

### Community 20 - "addPlaylist()"
Cohesion: 0.22
Nodes (12): addPlaylist(), addVideo(), allRoomSlugs, contentEl, escapeHtml(), isYTM, match, persistRoomSelection() (+4 more)

### Community 21 - "Header.tsx"
Cohesion: 0.19
Nodes (8): Header(), HeaderProps, AddSongModal(), Queue(), QueueProps, SearchResult, useRoom(), ShareButton()

### Community 22 - "2026-05-29-roomclient-performa"
Cohesion: 0.17
Nodes (11): 1. Isolate time updates with an external store + leaf subscribers, 2. Cap chat memory, 3. Light insurance (cheap), 4. Verification, Affected Files, Design, Goals, Non-Goals (deferred) (+3 more)

### Community 23 - "page.tsx"
Cohesion: 0.33
Nodes (6): ogImagePath(), ogImageVersion(), snapshotNames(), many, RoomUser, generateMetadata()

### Community 24 - "route.tsx"
Cohesion: 0.24
Nodes (8): fontCache, GET(), loadFont(), loadFrame(), LOCAL_FONTS, AVATAR_COLORS, STAR_POS, Style

### Community 25 - "useAutoSuggest.ts"
Cohesion: 0.25
Nodes (5): UseAutoSuggestProps, YtResult, buildSuggestionQuery(), cleanTitle(), normalizeTitle()

### Community 26 - "Player.tsx"
Cohesion: 0.22
Nodes (6): usePlaybackTime(), fmt(), Player(), PlayerProps, ScrubberProps, VinylRecordProps

### Community 27 - "Chat.tsx"
Cohesion: 0.27
Nodes (8): Bubble(), Chat(), ChatProps, relTime(), Avatar(), avatarConfig(), AvatarProps, hashSeed()

### Community 28 - "SettingsModal.tsx"
Cohesion: 0.22
Nodes (6): SettingsModal(), SettingsModalProps, CurrentUser, RoomContext, RoomContextValue, RoomProvider()

### Community 29 - "MobileNav.tsx"
Cohesion: 0.22
Nodes (5): MobileNavProps, MobileTab, TABS, IconProps, PATHS

### Community 30 - "code:bash (cp .env.example .en"
Cohesion: 0.29
Nodes (6): code:bash (cp .env.example .env.local), code:bash (npm run dev), Deploy on Vercel, DropATrack  🎵, Getting Started, Learn More

### Community 31 - "Chat Fetch API"
Cohesion: 0.38
Nodes (7): Chat Fetch API, Chat Send API, OG Image Generator, Collaborative Real-time Playback, Chat Messages Table, Queue Items Table, Rooms Table

### Community 33 - "CrewStrip.tsx"
Cohesion: 0.29
Nodes (4): ASSIGNABLE_ROLES, CrewStrip(), CrewStripProps, ROLE_ORDER

### Community 34 - "Add External API"
Cohesion: 0.33
Nodes (6): Add External API, Extension Room Monitor, YouTube Content Extractor, Spotify Track Extractor, YouTube ID Extractor, YouTube Key Rotation System

### Community 35 - "ReactionBar.tsx"
Cohesion: 0.4
Nodes (4): FULL_EMOJI, QUICK_EMOJI, ReactionBar(), spawnReactions()

### Community 37 - "useChat"
Cohesion: 0.4
Nodes (5): useChat, usePlayback, useQueue, useYouTubePlayer, YouTube API Rotation

### Community 51 - "ChatBox"
Cohesion: 0.67
Nodes (3): ChatBox, RightPanel, UserList

### Community 52 - "Agent Documentation"
Cohesion: 0.67
Nodes (3): Agent Documentation, useIdentity, useRoomSync

## Knowledge Gaps
- **367 isolated node(s):** `nextConfig`, `config`, `supabase`, `EMOJIS`, `eslintConfig` (+362 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getOrCreateUser()` connect `Room UI Components` to `Room Hooks & Playback`, `SettingsModal.tsx`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `supabase` connect `Room Hooks & Playback` to `route.tsx`, `Room UI Components`, `page.tsx`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `addReaction()` connect `Reactions System` to `Room Hooks & Playback`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `nextConfig`, `config`, `supabase` to the rest of the system?**
  _367 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Room Hooks & Playback` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Game System (Minesweeper)` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `API Routes & Supabase` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._