# Username Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a username prompt modal on first interaction (create/join room on home page, or room page mount via direct URL) so users set a recognizable name before entering any room — skippable, resets on session expiry.

**Architecture:** Add `is_default_username: boolean` to the `UserIdentity` stored in localStorage. Check this flag on the two entry paths: (1) home page — intercept create/join-room clicks; (2) room page — gate `RoomClient` channel initialization on mount. A shared `UsernameModal` component handles both paths. Skipping marks the flag false so the modal never re-appears in the same 12-hour session.

**Tech Stack:** React state, localStorage (`lib/names.ts`), Next.js App Router client components, Vitest (jsdom environment for localStorage tests).

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `lib/names.ts` | Add `is_default_username` field, update all public functions, add `confirmUsername` export |
| Create | `lib/names.test.ts` | Unit tests for all `lib/names.ts` functions |
| Create | `components/UsernameModal.tsx` | Shared modal — input, confirm, skip |
| Modify | `components/CreateRoom.tsx` | Intercept submit, show modal if `is_default_username` |
| Modify | `components/PublicRooms.tsx` | Intercept room card click, show modal if `is_default_username` |
| Modify | `components/RoomClient.tsx` | On mount check flag, render modal and block init until resolved |

---

## Task 1: Extend `lib/names.ts` — add `is_default_username`

**Files:**
- Modify: `lib/names.ts`
- Create: `lib/names.test.ts`

### Background

`lib/names.ts` exports `getOrCreateUser()`, `updateLocalUsername()`, and `UserIdentity`. New users get a random name silently. We need:
- `is_default_username: true` on new/expired users
- `is_default_username: false` when user explicitly sets or skips name
- New `confirmUsername()` export for the skip path (sets flag false, keeps name)
- Backward compat: existing stored objects without the field default to `false`

- [ ] **Step 1: Write failing tests**

Create `lib/names.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getOrCreateUser,
  updateLocalUsername,
  confirmUsername,
} from './names';

const STORAGE_KEY = 'dropatrack_user';

beforeEach(() => {
  localStorage.clear();
});

describe('getOrCreateUser', () => {
  it('returns null on server (window undefined) — not testable here, skip', () => {
    // Covered by environment assumption
  });

  it('creates new user with is_default_username: true', () => {
    const user = getOrCreateUser();
    expect(user).not.toBeNull();
    expect(user!.is_default_username).toBe(true);
    expect(user!.isNew).toBe(true);
  });

  it('returns existing user with is_default_username preserved', () => {
    getOrCreateUser(); // create
    const user2 = getOrCreateUser(); // retrieve
    expect(user2!.isNew).toBe(false);
    expect(user2!.is_default_username).toBe(true);
  });

  it('defaults is_default_username to false for legacy stored objects (no field)', () => {
    const legacy = {
      user_id: 'user_legacy',
      username: 'OldName 42',
      avatar_color: '#fff',
      expiresAt: Date.now() + 99999999,
      // no is_default_username field
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    const user = getOrCreateUser();
    expect(user!.is_default_username).toBe(false);
  });

  it('regenerates user when session expired, sets is_default_username: true', () => {
    const expired = {
      user_id: 'user_old',
      username: 'OldName 1',
      avatar_color: '#aaa',
      is_default_username: false,
      expiresAt: Date.now() - 1, // already expired
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expired));
    const user = getOrCreateUser();
    expect(user!.isNew).toBe(true);
    expect(user!.is_default_username).toBe(true);
    expect(user!.user_id).not.toBe('user_old');
  });
});

describe('updateLocalUsername', () => {
  it('sets is_default_username to false', () => {
    getOrCreateUser();
    const updated = updateLocalUsername('MyCoolName');
    expect(updated!.is_default_username).toBe(false);
    expect(updated!.username).toBe('MyCoolName');
  });

  it('returns null when no stored user', () => {
    expect(updateLocalUsername('Name')).toBeNull();
  });
});

describe('confirmUsername', () => {
  it('sets is_default_username to false without changing username', () => {
    const created = getOrCreateUser();
    const originalName = created!.username;
    const confirmed = confirmUsername();
    expect(confirmed!.is_default_username).toBe(false);
    expect(confirmed!.username).toBe(originalName);
  });

  it('returns null when no stored user', () => {
    expect(confirmUsername()).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run lib/names.test.ts
```

Expected: multiple failures including `confirmUsername is not a function`, `is_default_username` undefined.

- [ ] **Step 3: Update `UserIdentity` and `StoredUser` types**

In `lib/names.ts`, update the interfaces:

```ts
export interface UserIdentity {
  user_id: string;
  username: string;
  avatar_color: string;
  is_default_username: boolean;
}

// internal type (not exported)
type StoredUser = UserIdentity & {
  expiresAt: number;
};
```

- [ ] **Step 4: Update `getOrCreateUser` — new user and existing user branches**

Replace the full `getOrCreateUser` function:

```ts
export function getOrCreateUser(): (UserIdentity & { isNew: boolean }) | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored) {
    try {
      const parsed = JSON.parse(stored) as StoredUser;

      if (Date.now() < parsed.expiresAt) {
        const { expiresAt, ...user } = parsed;
        return {
          ...user,
          is_default_username: user.is_default_username ?? false,
          isNew: false,
        };
      }

      localStorage.removeItem(STORAGE_KEY);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const user: StoredUser = {
    user_id: generateUserId(),
    username: generateRandomName(),
    avatar_color: generateAvatarColor(),
    is_default_username: true,
    expiresAt: Date.now() + EXPIRY_MS,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

  const { expiresAt, ...plainUser } = user;
  return { ...plainUser, isNew: true };
}
```

- [ ] **Step 5: Update `updateLocalUsername` — set `is_default_username: false`**

```ts
export function updateLocalUsername(newUsername: string): (UserIdentity & { isNew: boolean }) | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  let parsed: StoredUser;
  try {
    parsed = JSON.parse(stored) as StoredUser;
  } catch {
    return null;
  }

  const updatedUser: StoredUser = {
    ...parsed,
    username: newUsername,
    is_default_username: false,
    expiresAt: Date.now() + EXPIRY_MS,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));

  const { expiresAt, ...plainUser } = updatedUser;
  return { ...plainUser, isNew: false };
}
```

- [ ] **Step 6: Add `confirmUsername` export**

Add after `updateLocalUsername`:

```ts
export function confirmUsername(): (UserIdentity & { isNew: boolean }) | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  let parsed: StoredUser;
  try {
    parsed = JSON.parse(stored) as StoredUser;
  } catch {
    return null;
  }

  const updated: StoredUser = {
    ...parsed,
    is_default_username: false,
    expiresAt: Date.now() + EXPIRY_MS,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  const { expiresAt, ...plainUser } = updated;
  return { ...plainUser, isNew: false };
}
```

- [ ] **Step 7: Run tests — expect all pass**

```bash
npx vitest run lib/names.test.ts
```

Expected: all tests pass.

- [ ] **Step 8: Run full test suite — no regressions**

```bash
npx vitest run
```

Expected: all existing tests pass.

- [ ] **Step 9: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add lib/names.ts lib/names.test.ts
git commit -m "feat: add is_default_username flag to user identity"
```

---

## Task 2: Create `UsernameModal` component

**Files:**
- Create: `components/UsernameModal.tsx`

### Background

Shared modal used by both home page (CreateRoom, PublicRooms) and room page (RoomClient). Pre-fills placeholder with the current random name. "Let's go" requires non-empty input and calls `updateLocalUsername`. "Skip" calls `confirmUsername` — keeps random name, clears flag. Both callbacks receive the updated user.

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useState } from 'react';
import { updateLocalUsername, confirmUsername } from '@/lib/names';
import type { UserIdentity } from '@/lib/names';

interface UsernameModalProps {
  currentName: string;
  onConfirm: (user: UserIdentity & { isNew: boolean }) => void;
  onSkip: (user: UserIdentity & { isNew: boolean }) => void;
}

export default function UsernameModal({ currentName, onConfirm, onSkip }: UsernameModalProps) {
  const [name, setName] = useState('');

  function handleConfirm() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = updateLocalUsername(trimmed);
    if (updated) onConfirm(updated);
  }

  function handleSkip() {
    const updated = confirmUsername();
    if (updated) onSkip(updated);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(10,8,20,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="pop"
        style={{
          padding: 28,
          maxWidth: 420,
          width: '90%',
          boxShadow: '8px 8px 0 var(--accent)',
        }}
      >
        <div className="display" style={{ fontSize: 22, marginBottom: 6 }}>
          What&apos;s your name?
        </div>
        <div
          className="mono"
          style={{
            fontSize: 11, color: 'var(--ink-dim)',
            textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 18,
          }}
        >
          shown to others in the room
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
          placeholder={currentName}
          className="field"
          style={{ width: '100%', marginBottom: 14 }}
          maxLength={32}
          autoFocus
        />

        <div className="flex gap-3">
          <button
            className="btn btn-accent"
            onClick={handleConfirm}
            disabled={!name.trim()}
            style={{ flex: 1 }}
          >
            Let&apos;s go
          </button>
          <button
            className="btn"
            onClick={handleSkip}
            style={{ color: 'var(--ink-dim)' }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/UsernameModal.tsx
git commit -m "feat: add UsernameModal component"
```

---

## Task 3: Gate `CreateRoom` submit behind username check

**Files:**
- Modify: `components/CreateRoom.tsx`

### Background

Current `handleCreate` calls `getOrCreateUser()` and proceeds immediately. We intercept: if `is_default_username` is true, show `UsernameModal` and abort the submit. After modal resolves (confirm or skip), resubmit programmatically. Extract the DB insert logic into `proceedWithCreate` so both paths share it.

Current file structure:
- `handleCreate` — form submit handler
- Inside: calls `getOrCreateUser`, slugifies, checks existing room, inserts new room, routes

- [ ] **Step 1: Add imports and modal state**

At the top of `CreateRoom.tsx`, add to the existing imports:

```tsx
import UsernameModal from '@/components/UsernameModal';
import { getOrCreateUser, UserIdentity } from '@/lib/names';
```

Remove the existing `import { getOrCreateUser } from '@/lib/names'` line (it's already there — add `UserIdentity` to it).

Inside the component, add state after existing state declarations:

```tsx
const [showUsernameModal, setShowUsernameModal] = useState(false);
const [pendingUser, setPendingUser] = useState<(UserIdentity & { isNew: boolean }) | null>(null);
```

- [ ] **Step 2: Extract DB insert logic into `proceedWithCreate`**

Extract the slug+insert logic out of `handleCreate` into a separate async function inside the component:

```tsx
const proceedWithCreate = async () => {
  const trimmed = roomName.trim();
  if (!trimmed) return;
  setLoading(true);
  setError('');

  const slug = slugify(trimmed);
  if (!slug) {
    setError('Please enter a valid room name');
    setLoading(false);
    return;
  }

  const user = getOrCreateUser();
  if (!user) {
    setError('Unable to create user identity');
    setLoading(false);
    return;
  }

  try {
    const { data: existing } = await supabase
      .from('rooms').select('slug').eq('slug', slug).single();
    if (existing) { router.push(`/${slug}`); return; }

    const { error: insertError } = await supabase.from('rooms').insert({
      slug,
      name: trimmed,
      created_by: user.username,
      is_playing: false,
      current_song_index: 0,
      is_public: true,
      default_role: 'dj',
      user_roles: { [user.user_id]: 'admin' },
    });

    if (insertError) {
      if (insertError.code === '23505') { router.push(`/${slug}`); return; }
      throw insertError;
    }
    router.push(`/${slug}`);
  } catch (err) {
    console.error('Error creating room:', err);
    setError('Failed to create room. Please try again.');
    setLoading(false);
  }
};
```

- [ ] **Step 3: Replace `handleCreate` body with username check**

```tsx
const handleCreate = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!roomName.trim()) return;

  const user = getOrCreateUser();
  if (!user) { setError('Unable to create user identity'); return; }

  if (user.is_default_username) {
    setPendingUser(user);
    setShowUsernameModal(true);
    return;
  }

  await proceedWithCreate();
};
```

- [ ] **Step 4: Render `UsernameModal` in JSX**

In the component return, wrap the existing `<form>` with a fragment and add the modal above it:

```tsx
return (
  <>
    {showUsernameModal && pendingUser && (
      <UsernameModal
        currentName={pendingUser.username}
        onConfirm={() => {
          setShowUsernameModal(false);
          proceedWithCreate();
        }}
        onSkip={() => {
          setShowUsernameModal(false);
          proceedWithCreate();
        }}
      />
    )}
    <form onSubmit={handleCreate} className="pop wobble-2 relative overflow-hidden" ...>
      {/* existing form content unchanged */}
    </form>
  </>
);
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Manual verify — dev server**

```bash
npm run dev
```

Open `http://localhost:3000`. Clear localStorage (`localStorage.clear()` in DevTools console). Click "BLAST OFF" — modal should appear. Type a name, press "Let's go" — room created. Repeat with "Skip" — same result with random name kept.

- [ ] **Step 7: Commit**

```bash
git add components/CreateRoom.tsx
git commit -m "feat: show username modal before room creation"
```

---

## Task 4: Gate `PublicRooms` room card navigation behind username check

**Files:**
- Modify: `components/PublicRooms.tsx`

### Background

Room cards currently use `<Link href={...}>` in `RoomCard` subcomponent. We need to intercept clicks in the parent `PublicRooms` component (which has state), show modal if needed, then navigate. Convert `RoomCard` to accept an `onClick` prop and remove the `Link` wrapper.

- [ ] **Step 1: Add imports and modal state to `PublicRooms`**

Add to existing imports at the top:

```tsx
import { useRouter } from 'next/navigation';
import UsernameModal from '@/components/UsernameModal';
import { getOrCreateUser } from '@/lib/names';
import type { UserIdentity } from '@/lib/names';
```

Remove `import Link from 'next/link'` — no longer needed in parent (will be removed from `RoomCard` too).

Inside `PublicRooms` component, add after existing state:

```tsx
const router = useRouter();
const [showUsernameModal, setShowUsernameModal] = useState(false);
const [pendingSlug, setPendingSlug] = useState<string | null>(null);
const [pendingUser, setPendingUser] = useState<(UserIdentity & { isNew: boolean }) | null>(null);
```

- [ ] **Step 2: Add `handleRoomClick` function**

Inside `PublicRooms` component:

```tsx
function handleRoomClick(slug: string) {
  const user = getOrCreateUser();
  if (!user) { router.push(`/${slug}`); return; }

  if (user.is_default_username) {
    setPendingUser(user);
    setPendingSlug(slug);
    setShowUsernameModal(true);
    return;
  }
  router.push(`/${slug}`);
}
```

- [ ] **Step 3: Update `RoomCard` to accept `onClick` prop**

Replace the `RoomCard` function signature and remove `Link`:

```tsx
function RoomCard({ room, shadow, onClick }: { room: Room; shadow: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="pop wobble"
      style={{
        overflow: 'hidden', cursor: 'pointer',
        boxShadow: `7px 7px 0 ${shadow}`,
        transition: 'transform .1s ease, box-shadow .1s ease',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translate(-2px,-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = `10px 10px 0 ${shadow}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'none';
        (e.currentTarget as HTMLElement).style.boxShadow = `7px 7px 0 ${shadow}`;
      }}
    >
      {/* keep all inner content unchanged */}
      <div style={{ position: 'relative', height: 118 }}>
        <div className="ph" style={{ position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          <span className="chip" style={{ background: 'var(--panel)' }}>
            <span className="live-dot" />LIVE
          </span>
        </div>
      </div>
      <div style={{ padding: '14px 16px 16px' }}>
        <div className="display" style={{ fontSize: 19, marginBottom: 6 }}>
          {room.name}
        </div>
        <div className="mono" style={{
          fontSize: 11, color: 'var(--ink-dim)',
          textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10,
        }}>
          /{room.slug}
        </div>
        <div className="flex items-center gap-2" style={{
          padding: '8px 10px',
          background: 'var(--panel-2)',
          border: '2px solid var(--line)',
          borderRadius: 11,
        }}>
          <div className="flex gap-0.5 items-end" style={{ flexShrink: 0 }}>
            {[6, 11, 8].map((h, j) => (
              <div key={j} style={{ width: 3, height: h, background: shadow, borderRadius: 2 }} />
            ))}
          </div>
          <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '.1em' }}>
            NOW PLAYING
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update card render call to pass `onClick`**

In the grid map:

```tsx
{sorted.map((room, i) => (
  <RoomCard
    key={room.id}
    room={room}
    shadow={CARD_SHADOWS[i % CARD_SHADOWS.length]}
    onClick={() => handleRoomClick(room.slug)}
  />
))}
```

- [ ] **Step 5: Render `UsernameModal` in `PublicRooms` return**

Add above the outer `<div>`:

```tsx
return (
  <>
    {showUsernameModal && pendingUser && (
      <UsernameModal
        currentName={pendingUser.username}
        onConfirm={() => {
          setShowUsernameModal(false);
          if (pendingSlug) router.push(`/${pendingSlug}`);
        }}
        onSkip={() => {
          setShowUsernameModal(false);
          if (pendingSlug) router.push(`/${pendingSlug}`);
        }}
      />
    )}
    <div>
      {/* existing content unchanged */}
    </div>
  </>
);
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Manual verify**

Clear localStorage. Click any public room card — modal appears. Confirm or skip — navigates to room.

- [ ] **Step 8: Commit**

```bash
git add components/PublicRooms.tsx
git commit -m "feat: show username modal before joining public room"
```

---

## Task 5: Gate `RoomClient` init behind username check on direct URL entry

**Files:**
- Modify: `components/RoomClient.tsx`

### Background

When a user opens `/slug` directly, `RoomClient` mounts and immediately initializes hooks (Supabase channel, presence, playback sync). We gate all of this behind a `usernameReady` flag. On mount, check `getOrCreateUser().is_default_username` — if true, render only `UsernameModal` (full-screen overlay). After confirm/skip, set `usernameReady: true` and the normal render proceeds, triggering all hooks.

Since `RoomClient` is a large component, only the top of the function body and the return statement need changes.

- [ ] **Step 1: Add import at top of `RoomClient.tsx`**

Add to existing imports:

```tsx
import UsernameModal from '@/components/UsernameModal';
import { getOrCreateUser } from '@/lib/names';
```

- [ ] **Step 2: Add `usernameReady` state inside `RoomClient`**

Add after the existing state declarations (after `const [previewImage, setPreviewImage] = useState<string | null>(null)`):

```tsx
const [usernameReady, setUsernameReady] = useState(false);
const [defaultUsername, setDefaultUsername] = useState('');

useEffect(() => {
  const user = getOrCreateUser();
  if (user?.is_default_username) {
    setDefaultUsername(user.username);
    // usernameReady stays false — modal renders
  } else {
    setUsernameReady(true);
  }
}, []);
```

- [ ] **Step 3: Return modal overlay when not ready**

At the very top of the return statement in `RoomClient`, before all existing JSX, add an early return:

```tsx
if (!usernameReady) {
  return (
    <UsernameModal
      currentName={defaultUsername}
      onConfirm={() => setUsernameReady(true)}
      onSkip={() => setUsernameReady(true)}
    />
  );
}
```

This blocks channel subscription, presence setup, and all hook initialization until the user confirms or skips.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual verify — direct URL entry**

Clear localStorage. Navigate directly to `http://localhost:3000/test` (or any room slug). Username modal should appear full-screen before the room loads. After confirm/skip, room initializes normally.

Then verify home-page flow still works: refresh home, modal appears on create/join click, not on page load.

- [ ] **Step 6: Run full test suite**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add components/RoomClient.tsx
git commit -m "feat: gate room init behind username modal on direct URL entry"
```

---

## Behavior Summary

| Entry point | Trigger | Modal? | After modal |
|-------------|---------|--------|-------------|
| Home → "BLAST OFF" | Click submit | Yes, if `is_default_username` | Room created + navigate |
| Home → public room card | Click card | Yes, if `is_default_username` | Navigate to room |
| Direct URL `/slug` | Page mount | Yes, if `is_default_username` | Room initializes |
| Any repeat visit (same 12h session) | Any | No (`is_default_username: false`) | Proceeds immediately |
| New session (12h expiry) | Any | Yes (resets to `true`) | Same as first visit |
