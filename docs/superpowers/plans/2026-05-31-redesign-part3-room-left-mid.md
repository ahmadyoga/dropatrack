# DropATrack v2 Redesign — Part 3: Room Left + Mid Columns

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the room's left column (Header, Player, ReactionBar, CrewStrip) and middle column (Queue). These are new component files only — `RoomClient.tsx` is not touched yet (Part 4 wires everything).

**Architecture:** Each component reads shared state via `useRoom()` from `RoomContext`. Handlers that are too specialized (drag events, player refs) are imported from context or passed as props in Part 4. Components in this plan are written to accept their needed data either from context or as explicit props — whichever is leaner.

**Tech Stack:** Next.js 16, Tailwind (layout/spacing), custom design system classes, `useRoom` context hook.

**Prerequisite:** Part 1 complete (globals.css, primitives, RoomContext exist).

---

## File Map

| Action | Path |
|--------|------|
| Create | `components/room/Header.tsx` |
| Create | `components/room/Player.tsx` |
| Create | `components/room/ReactionBar.tsx` |
| Create | `components/room/CrewStrip.tsx` |
| Create | `components/room/Queue.tsx` |

---

### Task 1: Header

**Files:**
- Create: `components/room/Header.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/room/Header.tsx
'use client';

import LiveDot from './ui/LiveDot';
import { useRoom } from './RoomContext';

interface HeaderProps {
  onLeave: () => void;
  onOpenSettings: () => void;
}

export default function Header({ onLeave, onOpenSettings }: HeaderProps) {
  const { room, users, theme, toggleTheme } = useRoom();

  return (
    <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
      {/* left: back + room info */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          className="btn pop-sm btn-icon"
          onClick={onLeave}
          title="Back to rooms"
          style={{ flexShrink: 0 }}
        >
          ←
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1
              className="display"
              style={{
                fontSize: 'clamp(22px, 3vw, 32px)',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '46vw',
              }}
            >
              {room.name}
            </h1>
            <span className="chip" style={{ background: 'var(--panel)', flexShrink: 0 }}>
              <LiveDot />LIVE
            </span>
          </div>
          <div
            className="mono"
            style={{ fontSize: 11, color: 'var(--ink-dim)', letterSpacing: '.06em', marginTop: 2 }}
          >
            /{room.slug}
          </div>
        </div>
      </div>

      {/* right: user count + theme + settings */}
      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
        <span
          className="chip"
          style={{ background: 'var(--accent-2)', color: '#140f1f' }}
        >
          👥 {users.length} aboard
        </span>
        <button
          className="btn pop-sm"
          onClick={toggleTheme}
          title="Toggle lights"
          style={{ gap: 8 }}
        >
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span style={{ fontSize: 12 }}>{theme === 'dark' ? 'LIGHTS ON' : 'LIGHTS OFF'}</span>
        </button>
        <button
          className="btn pop-sm btn-icon"
          onClick={onOpenSettings}
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep Header
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/room/Header.tsx
git commit -m "feat: add Header — room name, live chip, user count, theme toggle"
```

---

### Task 2: Player

**Files:**
- Create: `components/room/Player.tsx`

This wraps the existing `YouTubePlayer` component and adds the new visual shell: 16/9 video stage, now-playing strip, transport controls, Scrubber for progress + volume.

- [ ] **Step 1: Write the component**

```tsx
// components/room/Player.tsx
'use client';

import { useRef } from 'react';
import Scrubber from './ui/Scrubber';
import { useRoom } from './RoomContext';
import YouTubePlayer from '@/components/YouTubePlayer';
import { usePlaybackTime } from './playbackTimeStore';
import type { YTPlayer } from './hooks/useYouTubePlayer';

function fmt(s: number): string {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface PlayerProps {
  playerRef: React.RefObject<YTPlayer | null>;
  playerContainerRef: React.RefObject<HTMLDivElement>;
  playerReady: boolean;
  showPlayerOverlay: boolean;
  setShowPlayerOverlay: (v: boolean) => void;
  overlayTimerRef: React.RefObject<ReturnType<typeof setTimeout> | null>;
  isSpeaker: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onShuffle: () => void;
  onToggleSpeaker: () => void;
  onSeek: (t: number) => void;
  onVolumeChange: (v: number) => void;
}

export default function Player({
  playerRef,
  playerContainerRef,
  playerReady,
  showPlayerOverlay,
  setShowPlayerOverlay,
  overlayTimerRef,
  isSpeaker,
  onPlayPause,
  onNext,
  onPrev,
  onShuffle,
  onToggleSpeaker,
  onSeek,
  onVolumeChange,
}: PlayerProps) {
  const { room, currentSong, canPlayPause, duration } = useRoom();
  const currentTime = usePlaybackTime();
  const effectiveDuration = duration > 0 ? duration : (currentSong?.duration_seconds ?? 0);
  const volume = room.volume ?? 0.8;

  const handleOverlayClick = () => {
    if (!canPlayPause) return;
    onPlayPause();
    setShowPlayerOverlay(false);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
  };

  const handleVolumeSeek = (v: number) => {
    onVolumeChange(v);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const player = playerRef.current as any;
    if (player && playerReady) {
      try { player.setVolume(v * 100); } catch { /* */ }
    }
  };

  const handleProgressSeek = (t: number) => {
    onSeek(t);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const player = playerRef.current as any;
    if (player && playerReady) {
      try { player.seekTo(t, true); } catch { /* */ }
    }
  };

  return (
    <div className="pop wobble-2 overflow-hidden col" style={{ boxShadow: '7px 7px 0 var(--shadow)' }}>

      {/* video stage */}
      <div style={{ position: 'relative', aspectRatio: '16/9', minHeight: 0 }}>
        <div ref={playerContainerRef} style={{ position: 'absolute', inset: 0 }}>
          {currentSong && (
            <YouTubePlayer
              videoId={currentSong.youtube_id}
              playerRef={playerRef}
              isPlaying={room.is_playing}
              isSpeaker={isSpeaker}
            />
          )}
          {!currentSong && (
            <div className="ph" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', letterSpacing: '.1em' }}>
                QUEUE IS EMPTY
              </span>
            </div>
          )}
        </div>

        {/* synced overlay chip */}
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
          <span className="chip" style={{ background: 'rgba(20,15,31,.7)', color: '#fff', borderColor: 'rgba(255,255,255,.45)' }}>
            🔴 SYNCED · everyone at {fmt(currentTime)}
          </span>
        </div>

        {/* remote mode chip */}
        {!isSpeaker && (
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
            <span className="chip" style={{ background: 'var(--pop-yellow)', color: '#140f1f' }}>
              📡 REMOTE MODE
            </span>
          </div>
        )}

        {/* big play overlay (visible when paused) */}
        <button
          onClick={handleOverlayClick}
          disabled={!canPlayPause}
          style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: canPlayPause ? 'pointer' : 'default',
          }}
        >
          <div
            className="pop"
            style={{
              width: 84, height: 84, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--accent)', color: '#140f1f',
              boxShadow: '5px 5px 0 var(--shadow)',
              transform: room.is_playing ? 'scale(0)' : 'scale(1)',
              opacity: room.is_playing ? 0 : 1,
              transition: 'transform .2s, opacity .2s',
            }}
          >
            <span style={{ fontSize: 32, marginLeft: 4 }}>▶</span>
          </div>
        </button>
      </div>

      {/* now-playing strip */}
      <div style={{ padding: '14px 16px 16px', borderTop: '3px solid var(--outline)', background: 'var(--panel)' }}>
        <div className="flex items-center gap-3 mb-3">
          {/* thumbnail */}
          <div
            className="pop-sm"
            style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}
          >
            {currentSong?.thumbnail_url
              ? <img src={currentSong.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div className="ph" style={{ width: '100%', height: '100%' }} />
            }
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '.12em' }}>
              NOW PLAYING
            </div>
            <div
              className="display"
              style={{ fontSize: 20, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {currentSong?.title ?? '—'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentSong?.added_by ? `added by ${currentSong.added_by}` : 'queue is empty'}
            </div>
          </div>
        </div>

        {/* progress */}
        <div className="flex items-center gap-2 mb-3">
          <span className="mono" style={{ fontSize: 11, fontWeight: 700, width: 38, textAlign: 'right' }}>
            {fmt(currentTime)}
          </span>
          <Scrubber value={currentTime} max={effectiveDuration || 1} onChange={handleProgressSeek} />
          <span className="mono" style={{ fontSize: 11, fontWeight: 700, width: 38, color: 'var(--ink-dim)' }}>
            {fmt(effectiveDuration)}
          </span>
        </div>

        {/* transport */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button className="btn pop-sm btn-icon" onClick={onShuffle} title="Shuffle">⇄</button>
            <button className="btn pop-sm btn-icon" onClick={onPrev} title="Previous">⏮</button>
            <button
              className="btn btn-accent"
              onClick={onPlayPause}
              disabled={!canPlayPause}
              style={{ width: 58, height: 52, padding: 0 }}
              title={room.is_playing ? 'Pause' : 'Play'}
            >
              <span style={{ fontSize: 20 }}>{room.is_playing ? '⏸' : '▶'}</span>
            </button>
            <button className="btn pop-sm btn-icon" onClick={onNext} title="Next">⏭</button>
          </div>

          {/* volume */}
          <div
            className="flex items-center gap-2"
            style={{
              flex: '1 1 150px', minWidth: 140,
              padding: '0 13px 0 11px', borderRadius: 12,
              border: '2.5px solid var(--outline)',
              background: 'var(--panel)',
              boxShadow: '4px 4px 0 var(--shadow)',
              height: 48,
            }}
          >
            <button
              onClick={() => handleVolumeSeek(volume > 0 ? 0 : 0.8)}
              style={{ background: 'none', border: 'none', color: 'var(--ink)', cursor: 'pointer', flexShrink: 0, fontSize: 16 }}
              title="Mute"
            >
              {volume === 0 ? '🔇' : '🔊'}
            </button>
            <Scrubber value={volume} max={1} onChange={handleVolumeSeek} color="var(--accent-2)" height={12} />
            <span className="mono" style={{ fontSize: 11, fontWeight: 700, width: 26, textAlign: 'right', color: 'var(--ink-dim)', flexShrink: 0 }}>
              {Math.round(volume * 100)}
            </span>
          </div>

          {/* speaker toggle */}
          <button
            className="btn pop-sm"
            onClick={onToggleSpeaker}
            style={{
              gap: 8,
              background: isSpeaker ? 'var(--accent-2)' : 'var(--panel)',
              color: isSpeaker ? '#140f1f' : 'var(--ink)',
            }}
          >
            <span>{isSpeaker ? '🔊' : '📡'}</span>
            <span style={{ fontSize: 12 }}>{isSpeaker ? 'SPEAKER' : 'REMOTE'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `usePlaybackTime` export to `playbackTimeStore.ts` if missing**

```bash
grep -n "usePlaybackTime" /home/ahmadyoga/Documents/project/dropatrack/components/room/playbackTimeStore.ts
```

If not found, add this to `playbackTimeStore.ts`:

```ts
// Add at the bottom of playbackTimeStore.ts
import { useSyncExternalStore } from 'react';

export function usePlaybackTime(): number {
  return useSyncExternalStore(subscribe, getTime, () => 0);
}
```

Where `subscribe` and `getTime` are the existing store functions. Check the existing API in the file and add the hook using whatever subscribe/getSnapshot pattern is already there.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | grep Player
```

Expected: no errors on `Player.tsx`.

- [ ] **Step 4: Commit**

```bash
git add components/room/Player.tsx components/room/playbackTimeStore.ts
git commit -m "feat: add Player — YouTube stage, now-playing strip, transport, scrubbers"
```

---

### Task 3: ReactionBar

**Files:**
- Create: `components/room/ReactionBar.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/room/ReactionBar.tsx
'use client';

import { useState } from 'react';
import { spawnReactions } from './ui/spawnReactions';
import { useRoom } from './RoomContext';

const QUICK_EMOJI = ['❤️', '🔥', '😂', '👍', '🎉', '🙌', '🫶', '💀'];
const FULL_EMOJI = [
  '❤️','🔥','😂','👍','🎉','🙌','🫶','💀',
  '😍','🤩','😭','😤','🤯','🥹','😎','🫡',
  '💯','✨','⚡','🌊','🎵','🎶','🪩','🚀',
  '👀','💅','🫠','😴','🤌','👻','🫀','🎸',
];

export default function ReactionBar() {
  const { broadcast } = useRoom();
  const [pickerOpen, setPickerOpen] = useState(false);

  const fire = (emoji: string) => {
    const n = 50 + Math.floor(Math.random() * 45);
    spawnReactions(emoji, n);
    broadcast('reaction', { emoji });
  };

  return (
    <div
      className="pop wobble-2"
      style={{ padding: '11px 13px', boxShadow: '6px 6px 0 var(--shadow)', position: 'relative' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '.1em', flexShrink: 0 }}>
          REACT →
        </div>
        <div className="flex flex-wrap justify-center gap-1" style={{ flex: 1 }}>
          {QUICK_EMOJI.map((e) => (
            <button
              key={e}
              onClick={() => fire(e)}
              className="pop-sm"
              style={{
                fontSize: 22, width: 40, height: 40, borderRadius: 11,
                background: 'var(--panel-2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform .08s',
              }}
              onMouseDown={(ev) => { (ev.currentTarget as HTMLElement).style.transform = 'scale(.85)'; }}
              onMouseUp={(ev)   => { (ev.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              {e}
            </button>
          ))}
        </div>
        <button
          className="btn pop-sm btn-icon"
          onClick={() => setPickerOpen((p) => !p)}
          title="More emoji"
          style={{ flexShrink: 0 }}
        >
          +
        </button>
      </div>

      {/* full picker popover */}
      {pickerOpen && (
        <div
          className="pop wobble popin"
          style={{
            position: 'absolute', bottom: 'calc(100% + 10px)', right: 0,
            padding: 11, width: 286, zIndex: 40,
            boxShadow: '6px 6px 0 var(--accent)',
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <div className="mono" style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-dim)' }}>
              FULL PICKER
            </div>
            <button
              className="btn-ghost btn-icon"
              onClick={() => setPickerOpen(false)}
              style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)' }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 5 }}>
            {FULL_EMOJI.map((e) => (
              <button
                key={e}
                onClick={() => { fire(e); setPickerOpen(false); }}
                style={{
                  fontSize: 20, height: 32, borderRadius: 8,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                }}
                onMouseEnter={(ev) => { (ev.currentTarget as HTMLElement).style.background = 'var(--panel-3)'; }}
                onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep ReactionBar
```

- [ ] **Step 3: Commit**

```bash
git add components/room/ReactionBar.tsx
git commit -m "feat: add ReactionBar — quick emoji burst + full picker, broadcast to room"
```

---

### Task 4: CrewStrip

**Files:**
- Create: `components/room/CrewStrip.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/room/CrewStrip.tsx
'use client';

import { useState } from 'react';
import Avatar from './ui/Avatar';
import { useRoom } from './RoomContext';
import type { UserRole } from '@/lib/types';

const ROLE_ORDER: UserRole[] = ['admin', 'moderator', 'dj'];

interface CrewStripProps {
  onUpdateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
}

export default function CrewStrip({ onUpdateUserRole }: CrewStripProps) {
  const { users, currentUser, myRole } = useRoom();
  const [menuUserId, setMenuUserId] = useState<string | null>(null);

  const isAdmin = myRole === 'admin';

  return (
    <div
      className="pop wobble flex items-center gap-3 scroll noscb"
      style={{ padding: '10px 14px', overflowX: 'auto', overflowY: 'visible' }}
    >
      <span className="chip" style={{ background: 'var(--panel-2)', flexShrink: 0 }}>
        👥 {users.length}
      </span>

      {users.map((u) => {
        const isMe = u.user_id === currentUser?.user_id;
        const roleClass = `role-${u.role}`;

        return (
          <div key={u.user_id} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              className="col items-center gap-1"
              onClick={() => isAdmin && !isMe && setMenuUserId(menuUserId === u.user_id ? null : u.user_id)}
              style={{
                background: 'none', border: 'none', cursor: isAdmin && !isMe ? 'pointer' : 'default',
                padding: 0,
              }}
            >
              <div
                style={{
                  borderRadius: '50%',
                  border: isMe ? '2.5px solid var(--accent)' : '2.5px solid var(--outline)',
                  padding: 2,
                }}
              >
                <Avatar seed={u.user_id} size={34} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink)' }}>
                {isMe ? 'You' : u.username}
              </span>
              <span className={`chip ${roleClass}`} style={{ fontSize: 9, padding: '2px 7px' }}>
                {u.role}
              </span>
            </button>

            {/* role menu (admin only, not self) */}
            {isAdmin && menuUserId === u.user_id && (
              <div
                className="pop wobble popin col"
                style={{
                  position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 50, padding: 8, gap: 4, minWidth: 120,
                  boxShadow: '6px 6px 0 var(--accent)',
                }}
              >
                <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '.1em', marginBottom: 4 }}>
                  SET ROLE
                </div>
                {ROLE_ORDER.filter((r) => r !== 'admin').map((role) => (
                  <button
                    key={role}
                    className={`btn pop-sm chip role-${role}`}
                    style={{ fontSize: 11, padding: '4px 10px', width: '100%', justifyContent: 'center' }}
                    onClick={async () => {
                      await onUpdateUserRole(u.user_id, role);
                      setMenuUserId(null);
                    }}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep CrewStrip
```

- [ ] **Step 3: Commit**

```bash
git add components/room/CrewStrip.tsx
git commit -m "feat: add CrewStrip — horizontal avatar row, admin role menu"
```

---

### Task 5: Queue

**Files:**
- Create: `components/room/Queue.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/room/Queue.tsx
'use client';

import { useState } from 'react';
import { useRoom } from './RoomContext';
import type { QueueItem } from '@/lib/types';

function fmt(s: number): string {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface QueueProps {
  queueSearchQuery: string;
  setQueueSearchQuery: (q: string) => void;
  searchMatchIndices: number[];
  searchMatchCurrentIdx: number;
  setSearchMatchCurrentIdx: (i: number) => void;
  shuffling: boolean;
  dragOverIndex: number | null;
  onJumpTo: (index: number) => void;
  onRemoveSong: (item: QueueItem) => Promise<void>;
  onMoveSongToNext: (id: string) => Promise<void>;
  onShuffle: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (index: number) => void;
}

export default function Queue({
  queueSearchQuery,
  setQueueSearchQuery,
  searchMatchIndices,
  searchMatchCurrentIdx,
  setSearchMatchCurrentIdx,
  shuffling,
  dragOverIndex,
  onJumpTo,
  onRemoveSong,
  onMoveSongToNext,
  onShuffle,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: QueueProps) {
  const { queue, room, canRearrange } = useRoom();
  const [searchOpen, setSearchOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const currentIndex = room.current_song_index;

  const filteredIndices = queueSearchQuery.trim()
    ? searchMatchIndices
    : queue.map((_, i) => i);

  return (
    <div
      className="pop wobble col overflow-hidden"
      style={{ height: '100%', boxShadow: '7px 7px 0 var(--shadow)' }}
    >
      {/* header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '13px 15px', borderBottom: '3px solid var(--outline)' }}
      >
        <div className="flex items-center gap-2">
          <div className="display" style={{ fontSize: 18 }}>Queue</div>
          <span className="chip" style={{ background: 'var(--panel-2)' }}>{queue.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn pop-sm btn-icon"
            onClick={onShuffle}
            disabled={shuffling || queue.length <= 2}
            title="Shuffle"
            style={{ opacity: shuffling ? .5 : 1 }}
          >
            ⇄
          </button>
          <button
            className="btn pop-sm btn-icon"
            onClick={() => setSearchOpen((o) => !o)}
            title="Search queue"
            style={{ background: searchOpen ? 'var(--accent-2)' : 'var(--panel)', color: searchOpen ? '#140f1f' : 'var(--ink)' }}
          >
            🔍
          </button>
        </div>
      </div>

      {/* search bar */}
      {searchOpen && (
        <div style={{ padding: '8px 12px', borderBottom: '2px solid var(--line)' }}>
          <input
            className="field"
            style={{ fontSize: 13, padding: '8px 12px' }}
            placeholder="Search queue..."
            value={queueSearchQuery}
            onChange={(e) => setQueueSearchQuery(e.target.value)}
            autoFocus
          />
          {searchMatchIndices.length > 0 && (
            <div className="mono flex items-center gap-2" style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 6 }}>
              {searchMatchCurrentIdx + 1}/{searchMatchIndices.length}
              <button
                className="btn-ghost btn-icon"
                style={{ padding: '2px 6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)' }}
                onClick={() => setSearchMatchCurrentIdx((searchMatchCurrentIdx + 1) % searchMatchIndices.length)}
              >↓</button>
            </div>
          )}
        </div>
      )}

      {/* track list */}
      <div className="scroll col" style={{ flex: 1, overflowY: 'auto', padding: 8, gap: 4 }}>
        {queue.length === 0 && (
          <div
            className="mono"
            style={{ fontSize: 11, color: 'var(--ink-dim)', textAlign: 'center', margin: 'auto', padding: '20px 12px', lineHeight: 1.7 }}
          >
            nothing in the queue yet —<br />blast off with a track ✨
          </div>
        )}

        {queue.map((item, index) => {
          const isCurrent = index === currentIndex;
          const isMatch = searchMatchIndices.includes(index);
          const isCurrentMatch = searchMatchIndices[searchMatchCurrentIdx] === index;
          const isDragTarget = dragOverIndex === index;
          const isHovered = hoveredIndex === index;

          return (
            <div
              key={item.id}
              id={`q-item-${index}`}
              draggable={canRearrange}
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDragLeave={onDragLeave}
              onDrop={() => onDrop(index)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={isDragTarget ? 'drag-over' : ''}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 8px', borderRadius: 12,
                background: isCurrent ? 'var(--panel-2)' : isCurrentMatch ? 'rgba(70,224,212,.1)' : 'transparent',
                border: isCurrent ? '2.5px solid var(--accent)' : isMatch ? '2.5px solid rgba(70,224,212,.4)' : '2.5px solid transparent',
                transition: 'background .1s',
                cursor: 'pointer',
              }}
              onClick={() => onJumpTo(index)}
            >
              {/* drag handle */}
              {canRearrange && (
                <div style={{ fontSize: 14, color: 'var(--ink-dim)', cursor: 'grab', flexShrink: 0 }}>⠿</div>
              )}

              {/* thumbnail */}
              <div style={{ width: 40, height: 40, borderRadius: 9, overflow: 'hidden', border: '2.5px solid var(--outline)', flexShrink: 0 }}>
                {item.thumbnail_url
                  ? <img src={item.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div className="ph" style={{ width: '100%', height: '100%' }} />
                }
              </div>

              {/* info */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.title}
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.added_by} · {fmt(item.duration_seconds)}
                </div>
              </div>

              {/* actions (on hover or current) */}
              {(isHovered || isCurrent) && canRearrange && (
                <div className="flex gap-1" style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn pop-sm btn-icon"
                    onClick={() => onMoveSongToNext(item.id)}
                    title="Play next"
                    style={{ padding: 6 }}
                  >
                    ⏭
                  </button>
                  <button
                    className="btn pop-sm btn-icon"
                    onClick={() => onRemoveSong(item)}
                    title="Remove"
                    style={{ padding: 6, background: 'var(--pop-coral)', color: '#140f1f' }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep "Queue.tsx"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/room/Queue.tsx
git commit -m "feat: add Queue — search, drag-reorder, current track highlight, remove/next actions"
```

---

### Task 6: Verify Part 3 complete

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: errors only in `RoomClient.tsx` (still uses old components + channelRef). All new Part 3 files should be error-free.

- [ ] **Step 2: Check new files exist**

```bash
ls components/room/Header.tsx components/room/Player.tsx components/room/ReactionBar.tsx components/room/CrewStrip.tsx components/room/Queue.tsx
```

Expected: all 5 files listed.

- [ ] **Step 3: Tag**

```bash
git tag room-left-mid-done
```
