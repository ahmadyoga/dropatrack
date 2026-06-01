# DropATrack v2 — Full Visual Redesign Spec

**Date:** 2026-05-31
**Branch:** feat/dropatrack-html-handoff
**Scope:** Full component rewrite — new design system from `design/DropATrack.html` prototype

## Summary

Complete visual overhaul from glassmorphic OLED-dark (Poppins/violet/green) to bold cartoon-cosmic design (Bungee/Space Grotesk, hard offset shadows, wobbly borders, starfield backdrop). All existing functionality stays wired — YouTube player, Supabase Realtime sync, reactions, chat, discovery. Two Supabase integration improvements land alongside the visual work.

**Locked tweaks (non-switchable):**
- Accent palette: Aurora (`--accent:#46e0d4` cyan, `--accent-2:#b6f24d` lime, `--accent-3:#9d7bff` violet)
- Type personality: Sci-Fi (Bungee display, Space Grotesk body, Space Mono mono)
- Wobbly borders: on
- Crew layout: Top strip

**Known skip:** `playback_updated_at` multi-speaker sync bug — not touched in this rewrite, handled separately.

---

## Section 1 — Design System & Globals

### `app/globals.css` — full replacement

**CSS custom properties:**

```css
/* Accent pops (global) */
--pop-yellow: #ffd23f;
--pop-magenta: #ff5da2;
--pop-cyan: #46e0d4;
--pop-violet: #9d7bff;
--pop-coral: #ff7a4d;
--pop-lime: #b6f24d;

/* Aurora accent palette */
--accent: var(--pop-cyan);       /* #46e0d4 */
--accent-2: var(--pop-lime);     /* #b6f24d */
--accent-3: var(--pop-violet);   /* #9d7bff */

/* Type personality: Sci-Fi */
--font-display: 'Bungee', system-ui, sans-serif;
--font-body: 'Space Grotesk', system-ui, sans-serif;
--font-mono: 'Space Mono', monospace;
--display-spacing: .005em;
--display-transform: none;
--display-lh: 1.05;

/* Wobble border-radius */
--r-wobble: 18px 22px 20px 24px / 24px 18px 22px 20px;
--r-wobble-2: 22px 16px 24px 18px / 16px 24px 18px 22px;
--r-pill: 40px;
```

**Theme switching via `[data-theme]` on `<html>`:**

Dark (`data-theme="dark"`):
- `--bg: #14101f`, `--bg-2: #1b1430`
- `--bg-grad-1: #241640`, `--bg-grad-2: #10101f`
- `--panel: #241c3a`, `--panel-2: #2d2348`, `--panel-3: #352a55`
- `--ink: #f7eeda`, `--ink-soft: #b9acd6`, `--ink-dim: #8a7db0`
- `--outline: #0b0814`, `--line: rgba(247,238,218,.14)`, `--shadow: #070510`
- `--field: #1a1430`, `--field-ink: #f7eeda`

Light (`data-theme="light"`):
- `--bg: #f7ead0`, `--bg-2: #f1e0bf`
- `--bg-grad-1: #ffe9b8`, `--bg-grad-2: #f3dcc0`
- `--panel: #fffdf6`, `--panel-2: #fdf3dc`, `--panel-3: #f8ead0`
- `--ink: #1c1326`, `--ink-soft: #5a4a6e`, `--ink-dim: #897a98`
- `--outline: #1c1326`, `--line: rgba(28,19,38,.16)`, `--shadow: #1c1326`
- `--field: #fffdf6`, `--field-ink: #1c1326`

**Google Fonts import:** Bungee + Space Grotesk (wght 400;500;600;700) + Space Mono (wght 400;700)

**Utility classes (design system — not Tailwind):**

| Class | Purpose |
|-------|---------|
| `.pop` | Card: `border: 3px solid var(--outline)`, `box-shadow: 6px 6px 0 var(--shadow)`, `background: var(--panel)` |
| `.pop-sm` | Smaller card: `border-width: 2.5px`, `box-shadow: 4px 4px 0 var(--shadow)` |
| `.pop-lg` | Larger shadow: `box-shadow: 9px 9px 0 var(--shadow)` |
| `.wobble` | `border-radius: var(--r-wobble)` |
| `.wobble-2` | `border-radius: var(--r-wobble-2)` |
| `.display` | Bungee, `font-weight: 400` (Sci-Fi), `letter-spacing: .005em`, `line-height: 1.05` |
| `.mono` | Space Mono |
| `.btn` | Display font, `border: 3px solid var(--outline)`, `box-shadow: 4px 4px 0 var(--shadow)`, `border-radius: 14px`, hover: translate(-1,-1) shadow grows |
| `.btn-accent` | `background: var(--accent)`, `color: #140f1f` |
| `.btn-ghost` | Transparent bg, no shadow, line border |
| `.btn-icon` | Square: `padding: 10px`, `border-radius: 12px` |
| `.chip` | Space Mono, uppercase, `border: 2.5px solid var(--outline)`, `border-radius: var(--r-pill)` |
| `.field` | Space Grotesk, `border: 3px solid var(--outline)`, `border-radius: 14px`, focus: accent glow ring |
| `.scroll` | Thin scrollbar, accent thumb color |
| `.noscb` | Hidden scrollbar |
| `.row` | `display: flex; align-items: center` |
| `.col` | `display: flex; flex-direction: column` |
| `.cosmos-bg` | Fixed, z-index 0, radial gradient using `--bg-grad-1/2` |
| `.live-dot` | 9px magenta pulsing circle |
| `.float-emoji` | Floating emoji burst (position absolute, `floatUp` animation) |
| `.popin` | Scale-in modal entrance animation |
| `.dragging` / `.drag-over` | Queue drag state |
| `.scrim` | Modal backdrop: fixed, dark overlay, blur |
| `.spin` | 8s linear rotate (Logo record) |
| `.role-admin` | `background: var(--pop-magenta)`, `color: #140f1f` |
| `.role-mod` | `background: var(--pop-violet)`, `color: #140f1f` |
| `.role-dj` | `background: var(--pop-yellow)`, `color: #140f1f` |
| `.role-listener` | `background: var(--panel-3)` |

**Tailwind usage:** layout/spacing/breakpoints only (`flex`, `grid`, `gap-*`, `p-*`, `w-*`, `h-*`, `min-h-0`, `overflow-*`, `sm:`, `md:`, `lg:`). Design system classes own all visual identity.

**Reaction animation (`@keyframes floatUp`):**
```css
.float-emoji {
  position: absolute;
  bottom: -40px;
  will-change: transform, opacity;
  animation: floatUp var(--dur, 4s) cubic-bezier(.3,.1,.5,1) forwards;
}
@keyframes floatUp {
  0%   { transform: translateY(0) scale(.4) rotate(0deg); opacity: 0; }
  12%  { opacity: 1; transform: translateY(-8vh) scale(1.1) rotate(var(--rot, 8deg)); }
  100% { transform: translateY(-104vh) translateX(var(--drift, 0px)) scale(.9) rotate(var(--rot2, -12deg)); opacity: 0; }
}
```

**Deleted files:**
- `app/room.css`
- `app/room/_mobile.css`
- `components/room/reactionsStore.ts`
- `components/room/reactionsStore.test.ts`
- `components/room/FloatingReactions.tsx`
- `components/room/ProgressFill.tsx`
- `components/room/TimeLabel.tsx`

---

## Section 2 — Architecture & Data Flow

### Supabase integration improvements

**Change 1: Extract `broadcast` from `useRoomSync`**

`useRoomSync` owns channel creation (already does). New: it returns a stable `broadcast(event: string, payload: object) => void` function. `RoomClient` receives it and passes it into `RoomProvider` context.

All hooks that currently receive `channelRef` — `usePlayback`, `useQueue`, `useChat`, `useIdentity` — switch to receiving `broadcast` as a typed param instead. Eliminates raw ref access and potential early-send race.

**Change 2: `RoomContext`**

New file: `components/room/RoomContext.tsx`

```ts
interface RoomContextValue {
  room: Room;
  queue: QueueItem[];
  users: PresenceUser[];
  currentUser: User | null;
  myRole: UserRole;
  currentSong: QueueItem | null;
  canPlayPause: boolean;
  canRearrange: boolean;
  broadcast: (event: string, payload: object) => void;
}
```

`RoomClient` creates `RoomProvider` wrapping the render tree. Leaf components call `useRoom()` hook to read state — no 20+ prop drilling.

### Component tree (desktop 3-column)

```
RoomClient (orchestrator — hooks, context provider)
├── <div class="cosmos-bg" />
├── <StarField />                    (fixed canvas, z-index 0)
├── <div id="react-layer" />         (fixed, pointer-events none — emoji burst target)
├── <Header />                       (room name, live chip, user count, theme toggle, settings)
├── <div class="lg:grid ...">        (3-column grid)
│   ├── Left col (1.55fr)
│   │   ├── <Player />               (YouTube iframe + transport + scrubber)
│   │   ├── <ReactionBar />          (emoji burst buttons)
│   │   └── <CrewStrip />            (horizontal avatar row — top strip layout)
│   ├── Mid col (1fr)
│   │   └── <Queue />                (search, drag-reorder, shuffle)
│   └── Right col (1.12fr)
│       ├── <Discover />             (search + trending + playlists)
│       └── <Chat />                 (messages + image upload + song cards)
├── <MobileNav />                    (fixed bottom, 4 tabs)
└── Modals
    ├── <SettingsModal />
    └── <ImagePreviewModal />
```

### Mobile layout

Below `lg:` breakpoint: single column, `MobileNav` fixed bottom, 4 tabs switch visible panel:
- **Player tab**: Player + ReactionBar
- **Queue tab**: Queue (full height)
- **Discover tab**: Discover (full height)
- **Chat tab**: Chat (full height)

CrewStrip hidden on mobile (no crew panel on mobile — user list is out of scope for this rewrite's mobile view).

---

## Section 3 — Component Specifications

### Primitives (`components/room/ui/`)

**`StarField.tsx`**
- Fixed canvas behind all content (`position: fixed`, `z-index: 0`, `pointer-events: none`)
- `n=24` stars, deterministic placement via seed, twinkle CSS animation (opacity 0.25→1→0.25, scale 0.8→1.1, 3s ease-in-out infinite)

**`Avatar.tsx`**
- SVG cartoon creature, deterministic from `user_id` seed
- Hash → hue, type (planet/blob/star/moon), eyes variant, mouth variant, spots, ring, rotation
- Sizes: 34px (chat bubbles), 44px (crew strip)
- Stroke: `var(--outline)`, strokeWidth 2.6

**`Logo.tsx`**
- Spinning record SVG (`--accent-3` outer ring, `--accent` inner circle, `--accent-2` orbiting dot)
- "Drop**A**Track" in Bungee, `A` colored `var(--accent)`
- Size prop (default 34)

**`Scrubber.tsx`**
- Pointer-drag progress/volume bar (touch-safe, `touchAction: none`)
- Track: `var(--panel-3)` bg, `var(--outline)` border, rounded
- Fill: configurable `color` prop (progress=`var(--accent)`, volume=`var(--accent-2)`)
- Knob: `var(--panel)` circle, outline border, hard shadow
- Smooth transition when not dragging, instant when dragging
- Props: `value`, `max`, `onChange`, `color`, `height`, `knob`

**`LiveDot.tsx`**
- 9px circle, `background: var(--pop-magenta)`, pulsing box-shadow animation
- Renders inside `.chip` span

**`spawnReactions.ts`** (utility, not a component)
- Direct DOM manipulation on `#react-layer`
- `spawnReactions(emoji: string, n: number): void`
- Per emoji: random left 4–96vw, random `--dur` 3.2–5.6s, random `--drift` ±80px, random `--rot`/`--rot2` ±20/30deg, random font-size 24–50px, random delay 0–0.5s
- Self-removes after `(dur + 0.6) * 1000`ms

---

### Layout components

**`Header.tsx`** (`components/room/Header.tsx`)
- `.row` flex, `justify-between`, `flex-wrap gap-3 mb-4`
- Left: back arrow `.btn.pop-sm.btn-icon` → leave room, room name in `.display` (clamp 22–32px, truncated), `.chip` with `<LiveDot />` "LIVE"
- Below name: mono label `host @{slug} · {genre}` in `var(--ink-dim)`
- Right: user count chip (`--accent-2` bg), theme toggle `.btn.pop-sm` ("LIGHTS ON" / "LIGHTS OFF" + sun/moon icon), settings `.btn.pop-sm.btn-icon`

---

### Player (`components/room/Player.tsx`)

Replaces current `Sidebar.tsx` player section + `PlayerBar.tsx`.

- Outer: `.pop.wobble-2`, `overflow: hidden`, `box-shadow: 7px 7px 0 var(--shadow)`
- **Video stage**: `aspect-ratio: 16/9`, real `YouTubePlayer` component embedded (existing). Overlays:
  - Top-left: "SYNCED · everyone at X:XX" chip (`rgba(20,15,31,.7)` bg)
  - Top-right (when not speaker): "REMOTE MODE" chip (`--pop-yellow` bg)
  - Center: big play button (84×84 circle, `--accent` bg, scales to 0/opacity 0 when playing — fades in when paused)
- **Now-playing strip** (below video): `border-top: 3px solid var(--outline)`, `background: var(--panel)`, `padding: 14px 16px 16px`
  - 52×52 track thumbnail (`.pop-sm` rounded, overflow hidden)
  - Title in `.display` 20px truncated, artist 13px `var(--ink-soft)`, "NOW PLAYING" mono 9px label
- **Progress row**: time label (mono, 38px wide) + `<Scrubber>` + duration label
- **Transport row** (`flex-wrap`):
  - Group 1: shuffle, prev, play/pause (`.btn.btn-accent` 58×52px), next
  - Group 2: volume row (mute icon + `<Scrubber color="var(--accent-2)">` + percentage)
  - Speaker toggle: `.btn.pop-sm`, `--accent-2` bg when speaker, panel bg when remote

---

### ReactionBar (`components/room/ReactionBar.tsx`)

- `.pop.wobble-2`, `padding: 11px 13px`, `box-shadow: 6px 6px 0 var(--shadow)`
- "REACT →" mono label left
- 8 quick emoji buttons: 40×40, `.pop-sm`, `border-radius: 11px`, `background: var(--panel-2)`. Press: scale(0.85)
- "+" button opens full picker (8×N grid, `.pop.wobble.popin` popover above bar, `box-shadow: 6px 6px 0 var(--accent)`)
- On click: `spawnReactions(emoji, 50 + Math.floor(Math.random() * 45))`
- Remote reactions (from `useRoomSync` broadcast handler): same `spawnReactions` call

---

### CrewStrip (`components/room/CrewStrip.tsx`)

Top-strip crew layout (replaces `Sidebar` people section + `UserList.tsx`).

- `.pop.wobble`, horizontal scroll (`.scroll.noscb`), `padding: 10px 14px`
- Left: "X aboard" `.chip` with user count
- Scrolling row of user pills: `<Avatar size={34}>` + username (12px bold, max-width 80px truncated) + role badge `.chip.role-*`
- "Me" indicator: slight `--accent` border on own avatar
- Admin only: click any user → inline role menu (Mod/DJ/Listener options as `.btn.pop-sm` row). Calls `onUpdateUserRole` from context.

---

### Queue (`components/room/Queue.tsx`)

Replaces current `QueueList.tsx`.

- `.pop.wobble`, `flex flex-col`, full height, `overflow: hidden`
- **Header**: "Queue" `.display` 18px + track count `.chip` + shuffle `.btn.pop-sm.btn-icon` + search toggle
- **Search bar** (collapsible): `.field` input, filters queue in-place via `queueSearchQuery`
- **Track list** (`.scroll`):
  - Each row: 40×40 thumbnail + title (700, 13.5px, truncated) + artist mono + duration
  - Current track: `--accent` left border (3px), `--panel-2` background
  - Hover actions: move-to-next, remove buttons (`.btn.pop-sm.btn-icon`)
  - Drag handle icon, `dragging` / `drag-over` CSS classes wired to existing handlers
- **Empty state**: "nothing in the queue yet —\nblast off with a track ✨" centered mono text
- Wired to: `handleDragStart/Over/Leave/Drop`, `removeSong`, `moveSongToNext`, `handleJumpTo`, `handleShuffle`

---

### Discover (`components/room/Discover.tsx`)

Replaces current `Discovery.tsx` visually.

- `.pop.wobble`, `flex flex-col`, full height
- **Header**: bolt icon + "Discover" `.display` + "fresh drops" `.chip` (`--accent-2` bg)
- **URL/search input**: `.field` + search icon button — wired to `handleSearch`
- **Sections** (each `.scroll` scoped):
  - Trending / Latest / Fresh (from `useDiscovery`)
  - Curated playlists (grid of playlist cards, click → `openPlaylist`)
- **Track rows** (same style as Queue rows): thumbnail + title + artist + "+" `.btn.pop-sm.btn-icon` → `addSongToQueue`
- Load more button: `.btn.pop-sm` at section bottom → `handleLoadMore`
- Loading states: striped `.ph` placeholder rows

---

### Chat (`components/room/Chat.tsx`)

Replaces current `ChatBox.tsx` + `EmojiPicker.tsx`.

- `.pop.wobble`, `flex flex-col`, full height, `overflow: hidden`
- **Header**: chat icon + "Chat" `.display` + unread count `.chip` (`--accent` bg, shown when > 0)
- **Message list** (`.scroll`, flex-col, `gap: 13px`):
  - Each bubble: `<Avatar size={34}>` + name + timestamp + bubble div
  - My messages: `--accent` bg, `color: #140f1f`, right-aligned
  - Others: `--panel-2` bg, left-aligned
  - Song card attachments: `.pop-sm` mini card, `box-shadow: 3px 3px 0 var(--accent-2)` — thumbnail + title + duration + add-to-queue `.btn.btn-accent.btn-icon`
  - Image attachments: click → `ImagePreviewModal`
- **Input area**: `.field` textarea + image upload icon + send `.btn.btn-accent`
- Image paste (Ctrl+V) wired to `handleChatPaste`
- Auto-scroll to bottom on new message

---

### MobileNav (`components/room/MobileNav.tsx`)

Replaces current `MobileNav.tsx`.

- `position: fixed`, left/right 10px, bottom 10px, z-index 120
- `.pop` card, `border-radius: 18px`, `padding: 6px`, `box-shadow: 5px 5px 0 var(--shadow)`
- 4 tabs: Player / Queue / Discover / Chat
- Each tab: icon + mono label (9px uppercase), `flex: 1`, `border-radius: 12px`
- Active: `background: var(--accent)`, `color: #140f1f`
- Chat tab unread badge: magenta pill, `border: 2px solid var(--outline)`, top-right of icon

---

### SettingsModal (`components/room/modals/SettingsModal.tsx`)

- Outer: `.scrim` (click outside → close)
- Inner: `.pop.wobble-2.popin`, `width: min(480px, 94vw)`, `box-shadow: 9px 9px 0 var(--accent)`
- **Header bar**: `background: var(--accent-2)`, `color: #140f1f`, "Room settings" `.display` 21px + close X `.btn.pop-sm.btn-icon`
- **Section 1 — Default Role**: label + mono sub-label + segmented `.pop-sm` button pair (Moderator / DJ). Active: `--accent` bg. Wired to `onUpdateDefaultRole`.
- **Section 2 — Private Room**: toggle row. Label: "Private room", sub: "hide from public rooms listing". Wired to `onUpdatePrivacy(isPrivate: boolean)` → `supabase.from('rooms').update({ is_public: !isPrivate })` + broadcast.
- **Section 3 — Permissions Matrix**: mono table, roles vs capabilities (Add / Play / Reorder), ✓/✗ cells.
- **Section 4 — Lights**: label + dark/light toggle → ThemeProvider.
- **Section 5 — Leave Room**: full-width `.btn.pop-sm`, `background: var(--pop-coral)`, `color: #140f1f`, back-arrow icon.

New prop: `onUpdatePrivacy: (isPrivate: boolean) => void`

`RoomClient` gets `updatePrivacy` callback:
```ts
const updatePrivacy = useCallback(async (isPrivate: boolean) => {
  setRoom(prev => ({ ...prev, is_public: !isPrivate }));
  await supabase.from('rooms').update({ is_public: !isPrivate }).eq('id', room.id);
  broadcast('role_update', { default_role: room.default_role, user_roles: room.user_roles });
}, [room.id, room.default_role, room.user_roles, broadcast]);
```

---

## Section 4 — Homepage & Layout

### `app/layout.tsx`

```tsx
<html lang="en" data-theme="dark" data-type="scifi" data-accent="aurora">
  <head>
    {/* Google Fonts: Bungee, Space Grotesk, Space Mono */}
  </head>
  <body>
    <div id="react-layer" style={{ position:'fixed', inset:0, zIndex:200, pointerEvents:'none', overflow:'hidden' }} />
    {children}
  </body>
</html>
```

`ThemeProvider` manages `data-theme` toggle (dark ↔ light). `data-type` and `data-accent` stay static.

### Homepage (`app/page.tsx` + `components/CreateRoom.tsx` + `components/PublicRooms.tsx`)

**Full-page layout:**
- `cosmos-bg` + `<StarField />` fixed behind
- Max-width 1180px, centered, `padding: 26px 26px 80px`

**Top bar:** `<Logo size={36}>` left + theme toggle `.btn.pop-sm` ("LIGHTS ON" / "LIGHTS OFF" + sun/moon) right

**Hero:**
- Rotated chip (`--accent-3` bg, -2deg): "⚡ tune in together · across the galaxy"
- `<h1 class="display">` `clamp(44px, 7.5vw, 96px)`: "One queue. Everybody **floating** to the same beat." — "floating" in `var(--accent)` with outline stroke
- Subtitle: 18px `var(--ink-soft)`, max-width 560px

**Create room form** (`.pop.wobble-2`, `box-shadow: 8px 8px 0 var(--accent)`):
- Decorative circles: `--accent-2` (120px, top-right corner), `--accent-3` (30px, offset)
- "Start a room" `.display` 22px + "name it. you're the admin." mono sub-label
- `.field` input ("e.g. Midnight Meteor Shower") + "BLAST OFF" `.btn.btn-accent` submit
- On submit → creates room, navigates to `/{slug}`

**Public rooms:**
- Header row: "Live rooms" `.display` 30px + count chip + sort toggle (Popular / A–Z `.pop-sm` segmented)
- Grid: `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))`, `gap: 20px`
- Room card (`.pop.wobble.popin`):
  - 118px thumbnail: actual `thumbnail_url` if available, else striped `.ph`. LIVE chip top-left, listener count chip top-right
  - Card shadow: cycles through `--pop-magenta / --pop-coral / --pop-cyan / --pop-violet` per room
  - Body: room name `.display` 19px + "host @{slug} · genre" mono + now-playing mini strip (`.panel-2` bg, accent EQ bars + "NOW PLAYING" label + track title)
  - Hover: translate(-2px, -2px), shadow grows to 10px

**Footer:** centered mono, `var(--ink-dim)`: "📍 broadcasting from sector 7-G · DropATrack ©2026"

---

## Implementation Order (Approach A)

1. **Design system** — `globals.css` full replace, `layout.tsx` font + html attrs + react-layer div, delete old CSS files
2. **`useRoomSync` refactor** — extract `broadcast` function, update hook signatures to drop `channelRef`
3. **`RoomContext`** — create context + provider + `useRoom()` hook
4. **Primitives** — `StarField`, `Avatar`, `Logo`, `Scrubber`, `LiveDot`, `spawnReactions`
5. **Homepage** — `CreateRoom`, `PublicRooms`, homepage `page.tsx`
6. **Room: Header** — `Header.tsx`
7. **Room: Player** — `Player.tsx` (wraps existing `YouTubePlayer`)
8. **Room: ReactionBar** — `ReactionBar.tsx`
9. **Room: CrewStrip** — `CrewStrip.tsx`
10. **Room: Queue** — `Queue.tsx`
11. **Room: Discover** — `Discover.tsx`
12. **Room: Chat** — `Chat.tsx`
13. **Room: MobileNav** — `MobileNav.tsx`
14. **Modals** — `SettingsModal` (with `onUpdatePrivacy`), `ImagePreviewModal` restyle
15. **`RoomClient`** — rewire to new component tree + `RoomProvider`, add `updatePrivacy`
16. **Cleanup** — delete old component files, verify TypeScript, run dev server
