# Username Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a username prompt modal on first interaction (create/join room on home page, or room page mount via direct URL) so users pick a recognizable name before entering any room.

**Architecture:** Add `is_default_username: boolean` to the stored user identity in localStorage. On the home page, check this flag when the user clicks create or join — show `UsernameModal` if true, then proceed. On the room page, check on mount — gate channel subscription until confirmed/skipped. Skipping sets `is_default_username: false` so modal never re-appears in the same session; the flag resets to `true` on session expiry (12h).

**Tech Stack:** React state, localStorage (`lib/names.ts`), shared `UsernameModal` component, Next.js App Router client components.

---

## Files

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `lib/names.ts` | Add `is_default_username` to `UserIdentity`, `StoredUser`; update `getOrCreateUser`, `updateLocalUsername`; add `confirmUsername` |
| Create | `components/UsernameModal.tsx` | Shared modal UI — input, confirm, skip |
| Modify | `components/CreateRoom.tsx` | Check `is_default_username` on submit click, show modal before proceeding |
| Modify | `components/PublicRooms.tsx` | Check `is_default_username` on room card click, show modal before navigating |
| Modify | `components/RoomClient.tsx` | On mount check `is_default_username`, gate room init behind modal |

---

## Task 1: Extend `UserIdentity` with `is_default_username`

**Files:**
- Modify: `lib/names.ts`

- [ ] **Step 1: Update `UserIdentity` and `StoredUser` types**

```ts
// lib/names.ts
export interface UserIdentity {
  user_id: string;
  username: string;
  avatar_color: string;
  is_default_username: boolean;
}

// StoredUser (internal, not exported)
type StoredUser = UserIdentity & {
  expiresAt: number;
};
```

- [ ] **Step 2: Set `is_default_username: true` in `getOrCreateUser` for new users**

```ts
// inside getOrCreateUser(), replace the "generate user baru" block:
const user: StoredUser = {
  user_id: generateUserId(),
  username: generateRandomName(),
  avatar_color: generateAvatarColor(),
  is_default_username: true,
  expiresAt: Date.now() + EXPIRY_MS,
};
```

- [ ] **Step 3: Preserve `is_default_username: false` for existing valid sessions**

In the existing-user branch of `getOrCreateUser()`, the stored value is spread as-is. Since old stored objects won't have this field, default it:

```ts
// replace the existing valid-session return:
if (Date.now() < parsed.expiresAt) {
  const { expiresAt, ...user } = parsed;
  return {
    ...user,
    is_default_username: user.is_default_username ?? false,
    isNew: false,
  };
}
```

- [ ] **Step 4: `updateLocalUsername` sets `is_default_username: false`**

```ts
// inside updateLocalUsername(), in the updatedUser object:
const updatedUser: StoredUser = {
  ...parsed,
  username: newUsername,
  is_default_username: false,
  expiresAt: Date.now() + EXPIRY_MS,
};
```

- [ ] **Step 5: Add `confirmUsername` export (skip path)**

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

- [ ] **Step 6: Commit**

```bash
git add lib/names.ts
git commit -m "feat: add is_default_username flag to user identity"
```

---

## Task 2: Create `UsernameModal` component

**Files:**
- Create: `components/UsernameModal.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useState } from 'react';
import { updateLocalUsername, confirmUsername, UserIdentity } from '@/lib/names';

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
          padding: 28, maxWidth: 420, width: '90%',
          boxShadow: '8px 8px 0 var(--accent)',
        }}
      >
        <div className="display" style={{ fontSize: 22, marginBottom: 6 }}>
          What&apos;s your name?
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 18 }}>
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

- [ ] **Step 2: Commit**

```bash
git add components/UsernameModal.tsx
git commit -m "feat: add UsernameModal component for username onboarding"
```

---

## Task 3: Gate `CreateRoom` submit behind username check

**Files:**
- Modify: `components/CreateRoom.tsx`

- [ ] **Step 1: Add `showUsernameModal` state and import `UsernameModal`**

```tsx
import UsernameModal from '@/components/UsernameModal';
import { getOrCreateUser, UserIdentity } from '@/lib/names';

// inside component:
const [showUsernameModal, setShowUsernameModal] = useState(false);
const [pendingUser, setPendingUser] = useState<(UserIdentity & { isNew: boolean }) | null>(null);
```

- [ ] **Step 2: Replace `handleCreate` submit check**

At the top of `handleCreate`, before the existing logic:

```ts
const handleCreate = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!roomName.trim()) return;

  // Check username before proceeding
  const user = getOrCreateUser();
  if (!user) { setError('Unable to create user identity'); return; }

  if (user.is_default_username) {
    setPendingUser(user);
    setShowUsernameModal(true);
    return; // defer — modal callbacks will re-trigger
  }

  // existing create logic continues...
  setLoading(true);
  // ...
};
```

- [ ] **Step 3: Add modal callbacks that resume after username is set**

```tsx
function handleUsernameResolved() {
  setShowUsernameModal(false);
  // Re-submit: user now has is_default_username: false
  // Trigger create directly (user identity updated in localStorage)
  proceedWithCreate();
}

async function proceedWithCreate() {
  if (!roomName.trim()) return;
  setLoading(true);
  setError('');
  // ... existing slug + supabase insert logic (extracted from handleCreate)
}
```

Refactor: extract the slug-and-insert logic into `proceedWithCreate()`, call it from both the non-modal path and modal callbacks.

- [ ] **Step 4: Render modal**

```tsx
return (
  <>
    {showUsernameModal && pendingUser && (
      <UsernameModal
        currentName={pendingUser.username}
        onConfirm={() => handleUsernameResolved()}
        onSkip={() => handleUsernameResolved()}
      />
    )}
    <form onSubmit={handleCreate} ...>
      {/* existing form */}
    </form>
  </>
);
```

- [ ] **Step 5: Commit**

```bash
git add components/CreateRoom.tsx
git commit -m "feat: show username modal before room creation"
```

---

## Task 4: Gate `PublicRooms` navigation behind username check

**Files:**
- Modify: `components/PublicRooms.tsx`

- [ ] **Step 1: Read current file to understand room card click handler**

Read `components/PublicRooms.tsx` and find where room card navigation happens (likely `router.push` or `<Link>`).

- [ ] **Step 2: Add `showUsernameModal` state and intercept navigation**

```tsx
import UsernameModal from '@/components/UsernameModal';
import { getOrCreateUser, UserIdentity } from '@/lib/names';

const [showUsernameModal, setShowUsernameModal] = useState(false);
const [pendingSlug, setPendingSlug] = useState<string | null>(null);
const [pendingUser, setPendingUser] = useState<(UserIdentity & { isNew: boolean }) | null>(null);

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

function handleUsernameResolved() {
  setShowUsernameModal(false);
  if (pendingSlug) router.push(`/${pendingSlug}`);
}
```

- [ ] **Step 3: Replace direct navigation with `handleRoomClick`**

Any `<Link href={...}>` → convert to `<button onClick={() => handleRoomClick(room.slug)}>` or intercept via `onClick` on the card wrapper.

- [ ] **Step 4: Render modal**

```tsx
{showUsernameModal && pendingUser && (
  <UsernameModal
    currentName={pendingUser.username}
    onConfirm={() => handleUsernameResolved()}
    onSkip={() => handleUsernameResolved()}
  />
)}
```

- [ ] **Step 5: Commit**

```bash
git add components/PublicRooms.tsx
git commit -m "feat: show username modal before joining public room"
```

---

## Task 5: Gate `RoomClient` init behind username check

**Files:**
- Modify: `components/RoomClient.tsx`

- [ ] **Step 1: Add `usernameReady` state**

Near the top of `RoomClient` (after imports, inside component):

```tsx
import UsernameModal from '@/components/UsernameModal';
import { getOrCreateUser, UserIdentity } from '@/lib/names';

// Check on mount (client-side only)
const [usernameReady, setUsernameReady] = useState(false);
const [defaultUser, setDefaultUser] = useState<(UserIdentity & { isNew: boolean }) | null>(null);

useEffect(() => {
  const user = getOrCreateUser();
  if (user?.is_default_username) {
    setDefaultUser(user);
    // usernameReady stays false — modal renders
  } else {
    setUsernameReady(true);
  }
}, []);
```

- [ ] **Step 2: Return modal overlay if not ready**

At the top of the return, before any room content:

```tsx
if (!usernameReady) {
  return (
    <UsernameModal
      currentName={defaultUser?.username ?? ''}
      onConfirm={() => setUsernameReady(true)}
      onSkip={() => setUsernameReady(true)}
    />
  );
}
```

This blocks channel subscription, presence setup, and all room initialization until username is confirmed.

- [ ] **Step 3: Verify hooks that depend on identity still work**

`useIdentity` calls `getOrCreateUser()` inside its own `useEffect`. Since `usernameReady` gates the entire room render, by the time `useIdentity` runs, `is_default_username` is already `false`. No changes needed in `useIdentity`.

- [ ] **Step 4: Commit**

```bash
git add components/RoomClient.tsx
git commit -m "feat: gate room init behind username modal on direct URL entry"
```

---

## Behavior Summary

| Entry point | Trigger | Modal? | After modal |
|-------------|---------|--------|-------------|
| Home → create room | Click "BLAST OFF" | Yes, if `is_default_username` | Room creation proceeds |
| Home → public room card | Click card | Yes, if `is_default_username` | Navigate to room |
| Direct URL `/slug` | Page mount | Yes, if `is_default_username` | Room initializes |
| Any subsequent visit (same session) | Any | No — `is_default_username: false` | Proceeds immediately |
| New session (12h expiry) | Any | Yes — resets to `true` | Same as first visit |
