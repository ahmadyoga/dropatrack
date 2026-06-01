# DropATrack v2 Redesign — Part 4: Room Right + Wiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Discover, Chat, MobileNav, modals, then rewrite RoomClient to wire everything together and delete all old component files.

**Architecture:** `RoomClient` becomes the orchestrator — runs all hooks, creates `RoomProvider`, renders the 3-column grid with new components. Old files (Sidebar, PlayerBar, Discovery, ChatBox, EmojiPicker, QueueList, UserList, RightPanel, FloatingReactions, reactionsStore, ProgressFill, TimeLabel, room.css, room/_mobile.css) are deleted in the final task.

**Tech Stack:** Next.js 16, Tailwind (layout/breakpoints), Supabase, RoomContext

**Prerequisite:** Parts 1–3 complete.

---

## File Map

| Action | Path |
|--------|------|
| Create | `components/room/Discover.tsx` |
| Create | `components/room/Chat.tsx` |
| Replace | `components/room/MobileNav.tsx` |
| Replace | `components/room/modals/SettingsModal.tsx` |
| Replace | `components/room/modals/ImagePreviewModal.tsx` |
| Replace | `components/RoomClient.tsx` |
| Delete | `components/room/Sidebar.tsx` |
| Delete | `components/room/PlayerBar.tsx` |
| Delete | `components/room/Discovery.tsx` |
| Delete | `components/room/ChatBox.tsx` |
| Delete | `components/room/EmojiPicker.tsx` |
| Delete | `components/room/QueueList.tsx` |
| Delete | `components/room/UserList.tsx` |
| Delete | `components/room/RightPanel.tsx` |
| Delete | `components/room/FloatingReactions.tsx` |
| Delete | `components/room/reactionsStore.ts` |
| Delete | `components/room/reactionsStore.test.ts` |
| Delete | `components/room/ProgressFill.tsx` |
| Delete | `components/room/TimeLabel.tsx` |
| Delete | `app/room.css` |
| Delete | `app/room/_mobile.css` (if exists) |

---

### Task 1: Discover

**Files:**
- Create: `components/room/Discover.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/room/Discover.tsx
'use client';

import { useRoom } from './RoomContext';
import type { TrendingVideo, YouTubeSearchResult } from '@/lib/types';

function fmt(s: number): string {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface DiscoverProps {
  searching: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: YouTubeSearchResult[];
  nextPageToken: string | null;
  loadingMore: boolean;
  addingUrl: boolean;
  trendingVideos: TrendingVideo[];
  latestVideos: TrendingVideo[];
  freshVideos: TrendingVideo[];
  trendingLoading: boolean;
  latestLoading: boolean;
  freshLoading: boolean;
  onSearch: (e: React.FormEvent) => void;
  onLoadMore: () => void;
  onAddSong: (youtubeId: string, title: string, thumbnail: string, durationSeconds: number) => Promise<void>;
  queuedVideoIds: Set<string>;
}

export default function Discover({
  searching,
  searchQuery,
  setSearchQuery,
  searchResults,
  nextPageToken,
  loadingMore,
  addingUrl,
  trendingVideos,
  latestVideos,
  freshVideos,
  trendingLoading,
  latestLoading,
  freshLoading,
  onSearch,
  onLoadMore,
  onAddSong,
  queuedVideoIds,
}: DiscoverProps) {
  const showResults = searchQuery.trim().length > 0 && searchResults.length > 0;
  const showTrending = !showResults && trendingVideos.length > 0;

  return (
    <div
      className="pop wobble col overflow-hidden"
      style={{ flex: 1, minHeight: 0, boxShadow: '7px 7px 0 var(--shadow)' }}
    >
      {/* header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '13px 15px', borderBottom: '3px solid var(--outline)' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 19 }}>⚡</span>
          <div className="display" style={{ fontSize: 18 }}>Discover</div>
        </div>
        <span className="chip" style={{ background: 'var(--accent-2)', color: '#140f1f' }}>
          fresh drops
        </span>
      </div>

      {/* search bar */}
      <form onSubmit={onSearch} style={{ padding: '10px 12px', borderBottom: '2px solid var(--line)' }}>
        <div className="flex gap-2">
          <input
            className="field"
            style={{ fontSize: 13, padding: '9px 13px', flex: 1 }}
            placeholder="Search YouTube or paste URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={addingUrl}
          />
          <button
            type="submit"
            className="btn btn-accent"
            disabled={searching || addingUrl || !searchQuery.trim()}
            style={{ padding: '9px 14px', flexShrink: 0 }}
          >
            {searching || addingUrl ? '...' : '🔍'}
          </button>
        </div>
      </form>

      {/* content */}
      <div className="scroll col" style={{ flex: 1, overflowY: 'auto', padding: 8, gap: 4 }}>

        {/* search results */}
        {showResults && (
          <>
            {searchResults.map((v) => (
              <TrackRow
                key={v.id}
                id={v.id}
                title={v.title}
                sub={v.channelTitle}
                duration={fmt(v.durationSeconds)}
                thumbnail={v.thumbnail}
                queued={queuedVideoIds.has(v.id)}
                onAdd={() => onAddSong(v.id, v.title, v.thumbnail, v.durationSeconds)}
              />
            ))}
            {nextPageToken && (
              <button
                className="btn pop-sm"
                onClick={onLoadMore}
                disabled={loadingMore}
                style={{ margin: '4px auto', fontSize: 12 }}
              >
                {loadingMore ? '...' : 'LOAD MORE'}
              </button>
            )}
          </>
        )}

        {/* trending */}
        {showTrending && (
          <>
            <SectionLabel label="🔥 Trending" loading={trendingLoading} />
            {trendingVideos.map((v) => (
              <TrackRow
                key={v.id}
                id={v.id}
                title={v.title}
                sub={v.channelTitle}
                duration={v.duration}
                thumbnail={v.thumbnail}
                queued={queuedVideoIds.has(v.id)}
                onAdd={() => onAddSong(v.id, v.title, v.thumbnail, v.durationSeconds)}
              />
            ))}
          </>
        )}

        {/* latest */}
        {!showResults && latestVideos.length > 0 && (
          <>
            <SectionLabel label="🆕 Latest" loading={latestLoading} />
            {latestVideos.map((v) => (
              <TrackRow
                key={v.id}
                id={v.id}
                title={v.title}
                sub={v.channelTitle}
                duration={v.duration}
                thumbnail={v.thumbnail}
                queued={queuedVideoIds.has(v.id)}
                onAdd={() => onAddSong(v.id, v.title, v.thumbnail, v.durationSeconds)}
              />
            ))}
          </>
        )}

        {/* fresh */}
        {!showResults && freshVideos.length > 0 && (
          <>
            <SectionLabel label="✨ Fresh" loading={freshLoading} />
            {freshVideos.map((v) => (
              <TrackRow
                key={v.id}
                id={v.id}
                title={v.title}
                sub={v.channelTitle}
                duration={v.duration}
                thumbnail={v.thumbnail}
                queued={queuedVideoIds.has(v.id)}
                onAdd={() => onAddSong(v.id, v.title, v.thumbnail, v.durationSeconds)}
              />
            ))}
          </>
        )}

        {/* empty state */}
        {!searching && !showResults && !showTrending && !trendingLoading && (
          <div
            className="mono"
            style={{ fontSize: 11, color: 'var(--ink-dim)', textAlign: 'center', margin: 'auto', padding: '20px 12px', lineHeight: 1.7 }}
          >
            search youtube or paste a link<br />to add tracks to the queue ✨
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ label, loading }: { label: string; loading: boolean }) {
  return (
    <div className="mono flex items-center gap-2" style={{ fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '.1em', padding: '8px 4px 4px' }}>
      {label}
      {loading && <span style={{ opacity: .6 }}>…</span>}
    </div>
  );
}

function TrackRow({
  id, title, sub, duration, thumbnail, queued, onAdd,
}: {
  id: string; title: string; sub: string; duration: string;
  thumbnail: string; queued: boolean; onAdd: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2"
      style={{ padding: '7px 8px', borderRadius: 12, border: '2.5px solid var(--line)' }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 9, overflow: 'hidden', border: '2.5px solid var(--outline)', flexShrink: 0 }}>
        {thumbnail
          ? <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div className="ph" style={{ width: '100%', height: '100%' }} />
        }
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {sub} · {duration}
        </div>
      </div>
      <button
        className={`btn pop-sm btn-icon ${queued ? '' : 'btn-accent'}`}
        onClick={onAdd}
        disabled={queued}
        style={{ flexShrink: 0, padding: 8, opacity: queued ? .6 : 1 }}
        title={queued ? 'Already in queue' : 'Add to queue'}
      >
        {queued ? '✓' : '+'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep "Discover.tsx"
```

- [ ] **Step 3: Commit**

```bash
git add components/room/Discover.tsx
git commit -m "feat: add Discover — search, trending/latest/fresh sections, add-to-queue rows"
```

---

### Task 2: Chat

**Files:**
- Create: `components/room/Chat.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/room/Chat.tsx
'use client';

import { useRef } from 'react';
import Avatar from './ui/Avatar';
import { useRoom } from './RoomContext';
import type { ChatMessage } from '@/lib/types';

function relTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

interface ChatProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (s: string) => void;
  sendingChat: boolean;
  uploadingImage: boolean;
  unreadChatCount: number;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  onSendChat: () => Promise<void>;
  onImageUpload: (file: File) => Promise<void>;
  onChatPaste: (e: React.ClipboardEvent) => void;
  onAddSongFromChat: (youtubeId: string, title: string, artist: string, duration: string) => void;
  onPreviewImage: (url: string) => void;
  onSeen: () => void;
}

export default function Chat({
  chatMessages,
  chatInput,
  setChatInput,
  sendingChat,
  uploadingImage,
  unreadChatCount,
  chatEndRef,
  onSendChat,
  onImageUpload,
  onChatPaste,
  onAddSongFromChat,
  onPreviewImage,
  onSeen,
}: ChatProps) {
  const { currentUser } = useRoom();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendChat();
    }
  };

  return (
    <div
      className="pop wobble col overflow-hidden"
      style={{ flex: 1, minHeight: 0, boxShadow: '7px 7px 0 var(--shadow)' }}
      onClick={onSeen}
    >
      {/* header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '13px 15px', borderBottom: '3px solid var(--outline)', background: 'var(--panel)' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 20 }}>💬</span>
          <div className="display" style={{ fontSize: 18 }}>Chat</div>
        </div>
        {unreadChatCount > 0 && (
          <span className="chip" style={{ background: 'var(--accent)', color: '#140f1f' }}>
            {unreadChatCount} new
          </span>
        )}
      </div>

      {/* messages */}
      <div
        className="scroll col"
        style={{ flex: 1, overflowY: 'auto', padding: 14, gap: 13 }}
      >
        {chatMessages.length === 0 && (
          <div
            className="mono"
            style={{ fontSize: 11, color: 'var(--ink-dim)', textAlign: 'center', margin: 'auto', lineHeight: 1.7 }}
          >
            no messages yet —<br />say something ✨
          </div>
        )}
        {chatMessages.map((msg) => (
          <Bubble
            key={msg.id}
            msg={msg}
            isMe={msg.user_id === currentUser?.user_id}
            onAddSongFromChat={onAddSongFromChat}
            onPreviewImage={onPreviewImage}
          />
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* input */}
      <div
        style={{ padding: '10px 12px', borderTop: '3px solid var(--outline)', background: 'var(--panel)' }}
      >
        <div className="flex items-end gap-2">
          <textarea
            className="field"
            style={{ fontSize: 14, padding: '10px 12px', resize: 'none', minHeight: 44, maxHeight: 120, flex: 1 }}
            placeholder="Say something..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKey}
            onPaste={onChatPaste}
            disabled={sendingChat}
            rows={1}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files?.[0]) onImageUpload(e.target.files[0]); }}
          />
          <button
            className="btn pop-sm btn-icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            title="Upload image"
            style={{ flexShrink: 0, padding: 10 }}
          >
            {uploadingImage ? '...' : '🖼️'}
          </button>
          <button
            className="btn btn-accent"
            onClick={onSendChat}
            disabled={sendingChat || (!chatInput.trim())}
            style={{ flexShrink: 0, padding: '10px 14px' }}
            title="Send"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  msg,
  isMe,
  onAddSongFromChat,
  onPreviewImage,
}: {
  msg: ChatMessage;
  isMe: boolean;
  onAddSongFromChat: (youtubeId: string, title: string, artist: string, duration: string) => void;
  onPreviewImage: (url: string) => void;
}) {
  return (
    <div
      className="flex items-start gap-2"
      style={{ flexDirection: isMe ? 'row-reverse' : 'row' }}
    >
      <div
        className="pop-sm"
        style={{ borderRadius: '50%', overflow: 'hidden', border: '2.5px solid var(--outline)', width: 34, height: 34, flexShrink: 0, background: 'var(--panel-2)' }}
      >
        <Avatar seed={msg.user_id} size={34} />
      </div>
      <div style={{ maxWidth: '76%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        <div
          className="flex items-center gap-1"
          style={{ marginBottom: 3, flexDirection: isMe ? 'row-reverse' : 'row' }}
        >
          <span style={{ fontWeight: 700, fontSize: 12, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isMe ? 'You' : msg.username}
          </span>
          <span className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', flexShrink: 0 }}>
            {relTime(msg.created_at)}
          </span>
        </div>

        {/* bubble */}
        {(msg.message || msg.image_url) && (
          <div
            className="pop-sm"
            style={{
              padding: msg.image_url && !msg.message ? 5 : '9px 12px',
              borderRadius: 13,
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.4,
              background: isMe ? 'var(--accent)' : 'var(--panel-2)',
              color: isMe ? '#140f1f' : 'var(--ink)',
              wordBreak: 'break-word',
            }}
          >
            {msg.image_url && (
              <img
                src={msg.image_url}
                onClick={() => onPreviewImage(msg.image_url!)}
                style={{ display: 'block', maxWidth: 220, maxHeight: 200, borderRadius: 9, border: '2px solid var(--outline)', cursor: 'zoom-in', objectFit: 'cover' }}
                alt=""
              />
            )}
            {msg.message && (
              <div style={{ padding: msg.image_url ? '6px 4px 2px' : 0 }}>{msg.message}</div>
            )}
          </div>
        )}

        {/* song card */}
        {msg.song_ref && (
          <div
            className="flex items-center gap-2 pop-sm"
            style={{ marginTop: 7, borderRadius: 11, padding: 8, maxWidth: 300, boxShadow: '3px 3px 0 var(--accent-2)' }}
          >
            <div style={{ width: 46, height: 46, borderRadius: 9, overflow: 'hidden', border: '2.5px solid var(--outline)', flexShrink: 0 }}>
              <div className="ph" style={{ width: '100%', height: '100%' }} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div className="mono" style={{ fontSize: 8, color: 'var(--ink-dim)', letterSpacing: '.1em' }}>YOUTUBE</div>
              <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {msg.song_ref.title}
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
                {msg.song_ref.artist} · {msg.song_ref.duration}
              </div>
            </div>
            <button
              className="btn btn-accent btn-icon pop-sm"
              onClick={() => onAddSongFromChat(msg.song_ref!.youtube_id, msg.song_ref!.title, msg.song_ref!.artist, msg.song_ref!.duration)}
              style={{ flexShrink: 0, padding: 8 }}
              title="Add to queue"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep "Chat.tsx"
```

- [ ] **Step 3: Commit**

```bash
git add components/room/Chat.tsx
git commit -m "feat: add Chat — avatar bubbles, song cards, image paste/upload"
```

---

### Task 3: MobileNav

**Files:**
- Replace: `components/room/MobileNav.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/room/MobileNav.tsx
'use client';

type MobileTab = 'player' | 'queue' | 'discover' | 'chat';

interface MobileNavProps {
  activeTab: MobileTab;
  setActiveTab: (t: MobileTab) => void;
  unreadChatCount: number;
}

const TABS: { id: MobileTab; icon: string; label: string }[] = [
  { id: 'player',   icon: '▶',  label: 'Player'   },
  { id: 'queue',    icon: '≡',  label: 'Queue'    },
  { id: 'discover', icon: '⚡', label: 'Discover' },
  { id: 'chat',     icon: '💬', label: 'Chat'     },
];

export default function MobileNav({ activeTab, setActiveTab, unreadChatCount }: MobileNavProps) {
  return (
    <div
      className="pop flex"
      style={{
        position: 'fixed', left: 10, right: 10, bottom: 10,
        zIndex: 120, padding: 6, gap: 5,
        borderRadius: 18, justifyContent: 'space-around',
        boxShadow: '5px 5px 0 var(--shadow)',
      }}
    >
      {TABS.map(({ id, icon, label }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id)}
          className="col items-center"
          style={{
            flex: 1, gap: 2, padding: '8px 0', borderRadius: 12,
            border: 'none', cursor: 'pointer', position: 'relative',
            background: activeTab === id ? 'var(--accent)' : 'transparent',
            color: activeTab === id ? '#140f1f' : 'var(--ink)',
          }}
        >
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span className="mono" style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>
            {label}
          </span>
          {id === 'chat' && unreadChatCount > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: '24%',
              minWidth: 16, height: 16, padding: '0 4px',
              borderRadius: 10, background: 'var(--pop-magenta)', color: '#fff',
              fontSize: 9, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--outline)',
            }}>
              {unreadChatCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep "MobileNav"
```

- [ ] **Step 3: Commit**

```bash
git add components/room/MobileNav.tsx
git commit -m "feat: rewrite MobileNav — 4 tabs (player/queue/discover/chat), pop card, unread badge"
```

---

### Task 4: SettingsModal

**Files:**
- Replace: `components/room/modals/SettingsModal.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/room/modals/SettingsModal.tsx
'use client';

import { useRoom } from '../RoomContext';
import type { UserRole } from '@/lib/types';

interface SettingsModalProps {
  onClose: () => void;
  onUpdateDefaultRole: (role: UserRole) => Promise<void>;
  onUpdatePrivacy: (isPrivate: boolean) => Promise<void>;
}

function Toggle({ on, onToggle, label, sub }: { on: boolean; onToggle: () => void; label: string; sub: string }) {
  return (
    <div className="flex justify-between items-center gap-3" style={{ padding: '12px 0', borderBottom: '2px solid var(--line)' }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>{sub}</div>
      </div>
      <button
        onClick={onToggle}
        style={{
          width: 54, height: 30, borderRadius: 20,
          border: '3px solid var(--outline)',
          background: on ? 'var(--accent)' : 'var(--panel-3)',
          position: 'relative', cursor: 'pointer', flexShrink: 0,
          transition: 'background .15s',
        }}
      >
        <span style={{
          position: 'absolute', top: 1, left: on ? 25 : 1,
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--panel)', border: '2.5px solid var(--outline)',
          transition: 'left .15s',
        }} />
      </button>
    </div>
  );
}

export default function SettingsModal({ onClose, onUpdateDefaultRole, onUpdatePrivacy }: SettingsModalProps) {
  const { room, theme, toggleTheme } = useRoom();
  const currentRole = room.default_role || 'dj';
  const isPrivate = !room.is_public;

  return (
    <div className="scrim" onClick={onClose}>
      <div
        className="pop wobble-2 popin"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(480px, 94vw)', overflow: 'hidden', boxShadow: '9px 9px 0 var(--accent)' }}
      >
        {/* header bar */}
        <div
          className="flex justify-between items-center"
          style={{ padding: '16px 18px', borderBottom: '3px solid var(--outline)', background: 'var(--accent-2)', color: '#140f1f' }}
        >
          <div className="display" style={{ fontSize: 21 }}>Room settings</div>
          <button className="btn pop-sm btn-icon" onClick={onClose} style={{ color: '#140f1f', background: 'transparent' }}>✕</button>
        </div>

        <div style={{ padding: '8px 18px 18px' }}>

          {/* Section 1: Default Role */}
          <div style={{ padding: '14px 0', borderBottom: '2px solid var(--line)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Default role for new users</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', marginBottom: 12 }}>
              assigned when users join
            </div>
            <div className="flex gap-2">
              {(['moderator', 'dj'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  className={`btn pop-sm chip role-${role}`}
                  style={{
                    flex: 1, justifyContent: 'center', fontSize: 13, padding: '8px 14px',
                    border: currentRole === role ? '3px solid var(--outline)' : '2.5px solid var(--outline)',
                    background: currentRole === role ? 'var(--accent)' : `var(--panel)`,
                    color: currentRole === role ? '#140f1f' : 'var(--ink)',
                    boxShadow: currentRole === role ? '3px 3px 0 var(--shadow)' : '2px 2px 0 var(--shadow)',
                  }}
                  onClick={() => onUpdateDefaultRole(role)}
                >
                  {role === 'moderator' ? '🛡️ Moderator' : '🎧 DJ'}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Private room */}
          <Toggle
            on={isPrivate}
            onToggle={() => onUpdatePrivacy(!isPrivate)}
            label="Private room"
            sub="hide from public rooms listing"
          />

          {/* Section 3: Permissions Matrix */}
          <div style={{ padding: '12px 0', borderBottom: '2px solid var(--line)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Permissions</div>
            <div className="mono" style={{ fontSize: 11 }}>
              <div className="flex" style={{ gap: 8, marginBottom: 4, color: 'var(--ink-dim)' }}>
                <span style={{ flex: 1 }}></span>
                <span style={{ width: 40, textAlign: 'center' }}>Add</span>
                <span style={{ width: 40, textAlign: 'center' }}>Play</span>
                <span style={{ width: 48, textAlign: 'center' }}>Reorder</span>
              </div>
              {(['admin', 'moderator', 'dj'] as UserRole[]).map((r) => (
                <div key={r} className="flex items-center" style={{ gap: 8, padding: '3px 0' }}>
                  <span className={`chip role-${r}`} style={{ flex: 1, fontSize: 10, padding: '2px 8px' }}>{r}</span>
                  <span style={{ width: 40, textAlign: 'center' }}>✅</span>
                  <span style={{ width: 40, textAlign: 'center' }}>{r !== 'dj' ? '✅' : '❌'}</span>
                  <span style={{ width: 48, textAlign: 'center' }}>{r !== 'dj' ? '✅' : '❌'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Lights */}
          <Toggle
            on={theme === 'dark'}
            onToggle={toggleTheme}
            label="Lights"
            sub={theme === 'dark' ? 'deep space' : 'daylight cosmos'}
          />

          {/* Section 5: Leave Room */}
          <button
            className="btn pop-sm"
            onClick={() => window.history.back()}
            style={{ width: '100%', marginTop: 18, background: 'var(--pop-coral)', color: '#140f1f', justifyContent: 'center' }}
          >
            ← LEAVE ROOM
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep "SettingsModal"
```

- [ ] **Step 3: Commit**

```bash
git add components/room/modals/SettingsModal.tsx
git commit -m "feat: rewrite SettingsModal — default role, private room toggle, permissions, lights"
```

---

### Task 5: ImagePreviewModal

**Files:**
- Replace: `components/room/modals/ImagePreviewModal.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/room/modals/ImagePreviewModal.tsx
'use client';

interface ImagePreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

export default function ImagePreviewModal({ imageUrl, onClose }: ImagePreviewModalProps) {
  return (
    <div className="scrim" onClick={onClose} style={{ zIndex: 320 }}>
      <div className="popin" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <img
          src={imageUrl}
          alt="Preview"
          style={{
            maxWidth: '88vw', maxHeight: '82vh',
            borderRadius: 16, border: '4px solid var(--outline)',
            boxShadow: '10px 10px 0 var(--accent)',
          }}
        />
        <button
          className="btn btn-accent pop-sm btn-icon"
          onClick={onClose}
          style={{ position: 'absolute', top: -16, right: -16 }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/room/modals/ImagePreviewModal.tsx
git commit -m "feat: restyle ImagePreviewModal — pop card, accent shadow"
```

---

### Task 6: Rewrite RoomClient.tsx

This is the main wiring task. `RoomClient` becomes a lean orchestrator: runs all hooks, creates `RoomProvider`, renders the new 3-column layout.

**Files:**
- Replace: `components/RoomClient.tsx`

- [ ] **Step 1: Write the new RoomClient**

```tsx
// components/RoomClient.tsx
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAntiDebug } from '@/lib/antiDebug';
import type { Room, QueueItem, UserRole } from '@/lib/types';
import type { YTPlayer } from './room/hooks/useYouTubePlayer';
import { electTimeSource } from '@/lib/playbackSync';
import { usePlaybackSync } from './room/hooks/usePlaybackSync';

// Hooks
import { useIdentity } from './room/hooks/useIdentity';
import { useRoomSync } from './room/hooks/useRoomSync';
import { useYouTubePlayer } from './room/hooks/useYouTubePlayer';
import { usePlayback } from './room/hooks/usePlayback';
import { useQueue } from './room/hooks/useQueue';
import { useDiscovery } from './room/hooks/useDiscovery';
import { useChat } from './room/hooks/useChat';
import { useTheme } from './ThemeProvider';

// Context
import { RoomProvider } from './room/RoomContext';

// New components
import Header from './room/Header';
import Player from './room/Player';
import ReactionBar from './room/ReactionBar';
import CrewStrip from './room/CrewStrip';
import Queue from './room/Queue';
import Discover from './room/Discover';
import Chat from './room/Chat';
import MobileNav from './room/MobileNav';
import StarField from './room/ui/StarField';
import SettingsModal from './room/modals/SettingsModal';
import ImagePreviewModal from './room/modals/ImagePreviewModal';

function detectTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch { /* */ }
  return 'Asia/Jakarta';
}

interface RoomClientProps {
  initialRoom: Room;
  initialQueue: QueueItem[];
}

type MobileTab = 'player' | 'queue' | 'discover' | 'chat';

export default function RoomClient({ initialRoom, initialQueue }: RoomClientProps) {
  useAntiDebug();

  const { theme, toggleTheme } = useTheme();

  const [room, setRoom] = useState<Room>(initialRoom);
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [mobileTab, setMobileTab] = useState<MobileTab>('player');
  const [isMobile, setIsMobile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [userTimezone] = useState(() => detectTimezone());

  const playerRef = useRef<YTPlayer | null>(null);
  const roomRef = useRef(initialRoom);
  const queueRef = useRef(initialQueue);
  const isSpeakerRef = useRef(false);
  const anchorRef = useRef({ base: initialRoom.current_playback_time || 0, receivedAt: 0, isPlaying: false });
  const isSourceRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const isLoadingVideoRef = useRef(false);
  const handleNextRef = useRef<() => void>(() => { });
  const isChatVisibleRef = useRef(false);
  const playerContainerRef = useRef<HTMLDivElement>(null!);

  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  useEffect(() => { isChatVisibleRef.current = mobileTab === 'chat'; }, [mobileTab]);

  // ── Identity ──────────────────────────────────────────────────────────────
  const {
    currentUser, setCurrentUser, currentUserRef, myRole, myRoleRef,
    editingUsername, setEditingUsername, newUsername, setNewUsername, handleUsernameChange,
  } = useIdentity({
    initialRoom,
    room,
    broadcast: (event, payload) => broadcast(event, payload),
    onShowExtensionPopup: () => { /* ExtensionPopup removed in v2 */ },
    onUpdateUserRole: async (userId, newRole) => updateUserRole(userId, newRole),
  });

  // ── YouTube Player ────────────────────────────────────────────────────────
  const {
    isSpeaker, toggleSpeaker, playerReady, playerReadyRef,
    duration, showPlayerOverlay, setShowPlayerOverlay, overlayTimerRef,
  } = useYouTubePlayer({
    room, roomRef,
    currentSong: queue[room.current_song_index] || null,
    isSpeakerRef, handleNextRef, isTransitioningRef, isLoadingVideoRef,
    playerRef, anchorRef,
  });
  useEffect(() => { isSpeakerRef.current = isSpeaker; }, [isSpeaker]);

  // ── Realtime sync — returns broadcast ────────────────────────────────────
  const { users, broadcast } = useRoomSync({
    initialRoom, currentUser, myRoleRef, isSpeakerRef,
    playerRef: playerRef as React.RefObject<unknown>,
    playerReadyRef, handleNextRef,
    setRoom, setQueue, setCurrentUser, setChatMessages: () => { /* patched below */ },
    currentUserRef, isChatVisibleRef,
    isSpeaker, myRole, room,
  });

  // ── Playback ──────────────────────────────────────────────────────────────
  const { broadcastPlayback, handlePlayPause, handleNext, handlePrev, handleJumpTo } = usePlayback({
    room, roomRef, queueRef, isSpeaker, isSpeakerRef,
    playerRef, playerReadyRef, broadcast, currentUser,
    isTransitioningRef, isLoadingVideoRef, handleNextRef, setRoom, queue,
  });
  useEffect(() => { handleNextRef.current = handleNext; }, [handleNext]);

  // ── Playback sync ─────────────────────────────────────────────────────────
  usePlaybackSync({ room, roomRef, isSpeaker, playerRef, playerReadyRef, isSourceRef, anchorRef });

  // ── Queue ─────────────────────────────────────────────────────────────────
  const {
    searching, searchQuery, setSearchQuery, searchResults, setSearchResults,
    nextPageToken, loadingMore, addingUrl, shuffling, dragOverIndex,
    queueSearchQuery, setQueueSearchQuery, searchMatchIndices, searchMatchCurrentIdx, setSearchMatchCurrentIdx,
    handleSearch, handleLoadMore, addSongToQueue, removeSong, handleShuffle,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop, moveSongToNext,
  } = useQueue({
    room, roomRef, queue, queueRef, setQueue, setRoom, currentUser,
    canAddSongs: true,
    canPlayPause: myRole === 'admin' || myRole === 'moderator',
    broadcast, broadcastPlayback,
  });

  // ── Discovery ─────────────────────────────────────────────────────────────
  const {
    trendingVideos, latestVideos, freshVideos,
    trendingLoading, latestLoading, freshLoading,
    fetchTrending, fetchLatest, fetchFresh,
  } = useDiscovery({ userTimezone });

  // ── Chat ──────────────────────────────────────────────────────────────────
  const {
    chatMessages, setChatMessages, chatInput, setChatInput, sendingChat, uploadingImage,
    unreadChatCount, setUnreadChatCount, chatToast, setChatToast,
    chatEndRef, handleSendChat, handleImageUpload, handleChatPaste,
  } = useChat({
    roomId: initialRoom.id, currentUser, currentUserRef,
    addSongToQueue, isChatVisibleRef,
  });

  // Patch setChatMessages into useRoomSync (passed via closure above)
  // useRoomSync closes over the initial ref — keep chat in sync via effect
  useEffect(() => {
    // setChatMessages is stable; useRoomSync calls it directly via closure.
    // No patch needed — useChat + useRoomSync both hold a reference to the same setter.
  }, [setChatMessages]);

  // ── Role / privacy callbacks ──────────────────────────────────────────────
  const updateUserRole = useCallback(async (userId: string, newRole: UserRole) => {
    const updatedRoles = { ...(room.user_roles || {}), [userId]: newRole };
    setRoom((prev) => ({ ...prev, user_roles: updatedRoles }));
    await supabase.from('rooms').update({ user_roles: updatedRoles }).eq('id', room.id);
    broadcast('role_update', { default_role: room.default_role, user_roles: updatedRoles });
  }, [room.id, room.user_roles, room.default_role, broadcast]);

  const updateDefaultRole = useCallback(async (newRole: UserRole) => {
    setRoom((prev) => ({ ...prev, default_role: newRole }));
    await supabase.from('rooms').update({ default_role: newRole }).eq('id', room.id);
    broadcast('role_update', { default_role: newRole, user_roles: room.user_roles });
  }, [room.id, room.user_roles, broadcast]);

  const updatePrivacy = useCallback(async (isPrivate: boolean) => {
    setRoom((prev) => ({ ...prev, is_public: !isPrivate }));
    await supabase.from('rooms').update({ is_public: !isPrivate }).eq('id', room.id);
    broadcast('role_update', { default_role: room.default_role, user_roles: room.user_roles });
  }, [room.id, room.default_role, room.user_roles, broadcast]);

  // ── Time source election ──────────────────────────────────────────────────
  useEffect(() => {
    const sourceId = electTimeSource(users);
    isSourceRef.current = !!currentUser && currentUser.user_id === sourceId;
  }, [users, currentUser?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Volume broadcast ──────────────────────────────────────────────────────
  const handleVolumeChange = useCallback((v: number) => {
    setRoom((prev) => ({ ...prev, volume: v }));
    broadcast('volume_change', { volume: v });
  }, [broadcast, setRoom]);

  // ── Seek ──────────────────────────────────────────────────────────────────
  const handleSeek = useCallback((t: number) => {
    broadcast('seek_request', { time: t });
  }, [broadcast]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentSong = queue[room.current_song_index] || null;
  const canPlayPause = myRole === 'admin' || myRole === 'moderator';
  const canRearrange = myRole === 'admin' || myRole === 'moderator';
  const queuedVideoIds = useMemo(() => new Set(queue.map((q) => q.youtube_id)), [queue]);

  const leave = () => { window.history.back(); };

  // ── Context value ─────────────────────────────────────────────────────────
  const contextValue = {
    room, queue, users, currentUser, myRole, currentSong,
    canPlayPause, canRearrange, isSpeaker, duration, broadcast, theme, toggleTheme,
  };

  // ── Chat toast ────────────────────────────────────────────────────────────
  const handleChatTabSwitch = (tab: MobileTab) => {
    setMobileTab(tab);
    if (tab === 'chat') setUnreadChatCount(0);
  };

  return (
    <RoomProvider value={contextValue}>
      <div style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column', zIndex: 1 }}>
        <div className="cosmos-bg" />
        <StarField n={24} seed={initialRoom.slug.length + 3} />

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: isMobile ? '16px 14px 92px' : '20px 22px 22px', overflow: isMobile ? 'auto' : 'hidden' }}>
          <Header onLeave={leave} onOpenSettings={() => setShowSettings(true)} />

          {!isMobile ? (
            /* Desktop 3-column grid */
            <div
              style={{
                flex: 1, minHeight: 0,
                display: 'grid',
                gridTemplateColumns: 'minmax(440px, 1.55fr) minmax(300px, 1fr) minmax(330px, 1.12fr)',
                gap: 18,
              }}
            >
              {/* Left col */}
              <div className="col scroll noscb" style={{ gap: 14, minHeight: 0, overflowY: 'auto' }}>
                <Player
                  playerRef={playerRef}
                  playerContainerRef={playerContainerRef}
                  playerReady={playerReady}
                  showPlayerOverlay={showPlayerOverlay}
                  setShowPlayerOverlay={setShowPlayerOverlay}
                  overlayTimerRef={overlayTimerRef}
                  isSpeaker={isSpeaker}
                  onPlayPause={handlePlayPause}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  onShuffle={handleShuffle}
                  onToggleSpeaker={toggleSpeaker}
                  onSeek={handleSeek}
                  onVolumeChange={handleVolumeChange}
                />
                <ReactionBar />
                <CrewStrip onUpdateUserRole={updateUserRole} />
              </div>

              {/* Mid col */}
              <div className="col" style={{ minHeight: 0 }}>
                <Queue
                  queueSearchQuery={queueSearchQuery}
                  setQueueSearchQuery={setQueueSearchQuery}
                  searchMatchIndices={searchMatchIndices}
                  searchMatchCurrentIdx={searchMatchCurrentIdx}
                  setSearchMatchCurrentIdx={setSearchMatchCurrentIdx}
                  shuffling={shuffling}
                  dragOverIndex={dragOverIndex}
                  onJumpTo={handleJumpTo}
                  onRemoveSong={removeSong}
                  onMoveSongToNext={moveSongToNext}
                  onShuffle={handleShuffle}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />
              </div>

              {/* Right col */}
              <div className="col" style={{ minHeight: 0, gap: 14 }}>
                <Discover
                  searching={searching}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  searchResults={searchResults}
                  nextPageToken={nextPageToken}
                  loadingMore={loadingMore}
                  addingUrl={addingUrl}
                  trendingVideos={trendingVideos}
                  latestVideos={latestVideos}
                  freshVideos={freshVideos}
                  trendingLoading={trendingLoading}
                  latestLoading={latestLoading}
                  freshLoading={freshLoading}
                  onSearch={handleSearch}
                  onLoadMore={handleLoadMore}
                  onAddSong={addSongToQueue}
                  queuedVideoIds={queuedVideoIds}
                />
                <Chat
                  chatMessages={chatMessages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  sendingChat={sendingChat}
                  uploadingImage={uploadingImage}
                  unreadChatCount={unreadChatCount}
                  chatEndRef={chatEndRef}
                  onSendChat={handleSendChat}
                  onImageUpload={handleImageUpload}
                  onChatPaste={handleChatPaste}
                  onAddSongFromChat={(youtubeId, title, artist, duration) =>
                    addSongToQueue(youtubeId, title, '', 0)
                  }
                  onPreviewImage={setPreviewImage}
                  onSeen={() => setUnreadChatCount(0)}
                />
              </div>
            </div>
          ) : (
            /* Mobile single column */
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {mobileTab === 'player' && (
                <div className="col" style={{ gap: 14 }}>
                  <Player
                    playerRef={playerRef}
                    playerContainerRef={playerContainerRef}
                    playerReady={playerReady}
                    showPlayerOverlay={showPlayerOverlay}
                    setShowPlayerOverlay={setShowPlayerOverlay}
                    overlayTimerRef={overlayTimerRef}
                    isSpeaker={isSpeaker}
                    onPlayPause={handlePlayPause}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    onShuffle={handleShuffle}
                    onToggleSpeaker={toggleSpeaker}
                    onSeek={handleSeek}
                    onVolumeChange={handleVolumeChange}
                  />
                  <ReactionBar />
                </div>
              )}
              {mobileTab === 'queue' && (
                <div style={{ display: 'flex', minHeight: 460, flex: 1 }}>
                  <Queue
                    queueSearchQuery={queueSearchQuery}
                    setQueueSearchQuery={setQueueSearchQuery}
                    searchMatchIndices={searchMatchIndices}
                    searchMatchCurrentIdx={searchMatchCurrentIdx}
                    setSearchMatchCurrentIdx={setSearchMatchCurrentIdx}
                    shuffling={shuffling}
                    dragOverIndex={dragOverIndex}
                    onJumpTo={handleJumpTo}
                    onRemoveSong={removeSong}
                    onMoveSongToNext={moveSongToNext}
                    onShuffle={handleShuffle}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  />
                </div>
              )}
              {mobileTab === 'discover' && (
                <div style={{ display: 'flex', minHeight: 460, flex: 1 }}>
                  <Discover
                    searching={searching}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchResults={searchResults}
                    nextPageToken={nextPageToken}
                    loadingMore={loadingMore}
                    addingUrl={addingUrl}
                    trendingVideos={trendingVideos}
                    latestVideos={latestVideos}
                    freshVideos={freshVideos}
                    trendingLoading={trendingLoading}
                    latestLoading={latestLoading}
                    freshLoading={freshLoading}
                    onSearch={handleSearch}
                    onLoadMore={handleLoadMore}
                    onAddSong={addSongToQueue}
                    queuedVideoIds={queuedVideoIds}
                  />
                </div>
              )}
              {mobileTab === 'chat' && (
                <div style={{ display: 'flex', minHeight: 520, flex: 1 }}>
                  <Chat
                    chatMessages={chatMessages}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    sendingChat={sendingChat}
                    uploadingImage={uploadingImage}
                    unreadChatCount={unreadChatCount}
                    chatEndRef={chatEndRef}
                    onSendChat={handleSendChat}
                    onImageUpload={handleImageUpload}
                    onChatPaste={handleChatPaste}
                    onAddSongFromChat={(youtubeId, title, artist, duration) =>
                      addSongToQueue(youtubeId, title, '', 0)
                    }
                    onPreviewImage={setPreviewImage}
                    onSeen={() => setUnreadChatCount(0)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile nav */}
        {isMobile && (
          <MobileNav
            activeTab={mobileTab}
            setActiveTab={handleChatTabSwitch}
            unreadChatCount={unreadChatCount}
          />
        )}

        {/* Modals */}
        {showSettings && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
            onUpdateDefaultRole={updateDefaultRole}
            onUpdatePrivacy={updatePrivacy}
          />
        )}
        {previewImage && (
          <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
        )}

        {/* Chat toast */}
        {chatToast && (
          <div
            style={{
              position: 'fixed', bottom: isMobile ? 80 : 20, right: 20, zIndex: 250,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', cursor: 'pointer',
            }}
            className="pop wobble popin"
            onClick={() => {
              setChatToast(null);
              setUnreadChatCount(0);
              setMobileTab('chat');
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: chatToast.color, border: '2px solid var(--outline)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: '#140f1f',
            }}>
              {chatToast.username.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{chatToast.username}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                {chatToast.message}
              </div>
            </div>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-dim)', flexShrink: 0 }}
              onClick={(e) => { e.stopPropagation(); setChatToast(null); }}
            >✕</button>
          </div>
        )}
      </div>
    </RoomProvider>
  );
}
```

- [ ] **Step 2: Fix useRoomSync setChatMessages wiring**

`useRoomSync` receives `setChatMessages` in its props. In the new `RoomClient`, `setChatMessages` comes from `useChat`. But `useRoomSync` is called before `useChat` (hooks must be called in order). Fix: call `useChat` before `useRoomSync` and pass `setChatMessages` correctly.

Reorder the hook calls in `RoomClient`:

```
1. useIdentity (needs broadcast — use callback ref trick or call after useRoomSync)
2. useYouTubePlayer
3. useChat (before useRoomSync so setChatMessages is available)
4. useRoomSync (pass setChatMessages from useChat)
5. usePlayback (needs broadcast from useRoomSync)
6. usePlaybackSync
7. useQueue (needs broadcast from useRoomSync)
8. useDiscovery
```

The tricky part: `useIdentity` needs `broadcast` (from `useRoomSync`) but `useRoomSync` needs `setChatMessages` (from `useChat`). Solution: use a stable ref for broadcast in `useIdentity`.

Update the `RoomClient` hook order in Step 1 code — move `useChat` call above `useRoomSync`, and update `useIdentity` to accept `broadcast: (e,p) => void` that reads from a ref:

```tsx
// At top of RoomClient, before hooks:
const broadcastRef = useRef<(event: string, payload: Record<string, unknown>) => void>(() => {});

// useIdentity call — pass ref-based broadcast:
const { ... } = useIdentity({
  ...,
  broadcast: (e, p) => broadcastRef.current(e, p),
  ...
});

// useChat call (before useRoomSync):
const { chatMessages, setChatMessages, ... } = useChat({ ... });

// useRoomSync call (after useChat):
const { users, broadcast } = useRoomSync({ ..., setChatMessages, ... });

// After useRoomSync, update the ref:
useEffect(() => { broadcastRef.current = broadcast; }, [broadcast]);
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected: zero errors (or only pre-existing unrelated warnings).

- [ ] **Step 4: Commit**

```bash
git add components/RoomClient.tsx
git commit -m "feat: rewrite RoomClient — RoomProvider, 3-column grid, new component tree, broadcast refactor"
```

---

### Task 7: Delete old files

- [ ] **Step 1: Delete replaced component files**

```bash
rm -f \
  components/room/Sidebar.tsx \
  components/room/PlayerBar.tsx \
  components/room/Discovery.tsx \
  components/room/ChatBox.tsx \
  components/room/EmojiPicker.tsx \
  components/room/QueueList.tsx \
  components/room/UserList.tsx \
  components/room/RightPanel.tsx \
  components/room/FloatingReactions.tsx \
  components/room/reactionsStore.ts \
  components/room/reactionsStore.test.ts \
  components/room/ProgressFill.tsx \
  components/room/TimeLabel.tsx
```

- [ ] **Step 2: Delete old CSS files**

```bash
rm -f app/room.css
# Check if _mobile.css exists:
ls app/room/ 2>/dev/null && rm -f app/room/_mobile.css || echo "no room/ dir"
```

- [ ] **Step 3: Remove old CSS imports from any remaining files**

```bash
grep -r "room.css\|_mobile.css\|reactionsStore\|FloatingReactions\|ProgressFill\|TimeLabel\|Sidebar\|PlayerBar\b\|Discovery\b\|ChatBox\|EmojiPicker\|QueueList\|UserList\|RightPanel" \
  components/ app/ --include="*.ts" --include="*.tsx" -l
```

Fix any remaining imports found.

- [ ] **Step 4: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 5: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: delete old components — Sidebar, PlayerBar, Discovery, ChatBox, EmojiPicker, QueueList, UserList, RightPanel, reactionsStore, FloatingReactions, ProgressFill, TimeLabel, room.css"
```

---

### Task 8: Full E2E verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Homepage checks**

- `http://localhost:3000` loads with Bungee headline
- Create room form has wobble borders + decorative circles
- Theme toggle works (dark ↔ light, persists on reload)
- "BLAST OFF" creates room and navigates to `/{slug}`

- [ ] **Step 3: Room page checks**

- 3-column layout visible on desktop (> 1024px)
- Header shows room name + LIVE chip + user count
- YouTube player loads in left column
- Play/Pause/Next/Prev transport works (if admin/moderator)
- Progress scrubber drags correctly
- Volume scrubber changes volume
- Speaker/Remote toggle switches mode
- Emoji buttons in ReactionBar trigger burst animation (emojis float up, self-remove)
- Reactions broadcast to other tabs (open 2 tabs, fire reaction in one)
- CrewStrip shows all connected users with avatars
- Queue shows tracks, current track highlighted with accent border
- Discover loads trending videos, search works, add-to-queue works
- Chat sends messages, shows in bubbles with avatars
- Settings modal opens, default role toggle works, privacy toggle wired to DB

- [ ] **Step 4: Mobile checks**

Resize to < 1024px:
- MobileNav appears at bottom (4 tabs)
- Player tab: Player + ReactionBar visible
- Queue tab: Queue full height
- Discover tab: Discover full height
- Chat tab: Chat full height, unread badge on nav if unread

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: DropATrack v2 redesign complete — cartoon-cosmic design system, full component rewrite"
```
