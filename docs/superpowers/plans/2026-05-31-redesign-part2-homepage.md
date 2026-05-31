# DropATrack v2 Redesign — Part 2: Homepage

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the homepage — CreateRoom form, PublicRooms grid, and page.tsx — using the cartoon-cosmic design system from Part 1. Room creation and navigation logic stays identical.

**Architecture:** `app/page.tsx` becomes a full-page layout with `cosmos-bg` + `StarField` behind content. `CreateRoom.tsx` keeps all Supabase/routing logic, new visual shell. `PublicRooms.tsx` keeps Supabase query, gets card grid with hard offset shadows and now-playing strip. `home.css` is deleted.

**Tech Stack:** Next.js 16 App Router, Supabase, Tailwind (layout only), custom design system classes

**Prerequisite:** Part 1 complete (globals.css, Logo, StarField primitives exist).

---

## File Map

| Action | Path |
|--------|------|
| Replace | `app/page.tsx` |
| Replace | `components/CreateRoom.tsx` |
| Replace | `components/PublicRooms.tsx` |
| Delete | `app/home.css` |

---

### Task 1: Delete home.css

**Files:**
- Delete: `app/home.css`

- [ ] **Step 1: Remove import from page.tsx first, then delete**

Check nothing else imports home.css:
```bash
grep -r "home.css" /home/ahmadyoga/Documents/project/dropatrack/app/
```

- [ ] **Step 2: Delete the file**

```bash
rm /home/ahmadyoga/Documents/project/dropatrack/app/home.css
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete home.css — styles absorbed into globals.css"
```

---

### Task 2: Rewrite CreateRoom.tsx

**Files:**
- Replace: `components/CreateRoom.tsx`

All Supabase/routing logic is preserved exactly. Only the JSX visual shell changes.

- [ ] **Step 1: Write the new component**

```tsx
// components/CreateRoom.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/names';

const ACCENT_COLORS = [
  'var(--pop-magenta)',
  'var(--pop-coral)',
  'var(--pop-cyan)',
  'var(--pop-violet)',
];

export default function CreateRoom() {
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const slugify = (text: string) =>
    text.toLowerCase().trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    setLoading(true);
    setError('');

    const slug = slugify(roomName);
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
        name: roomName.trim(),
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

  return (
    <form
      onSubmit={handleCreate}
      className="pop wobble-2 relative overflow-hidden"
      style={{ padding: 20, boxShadow: '8px 8px 0 var(--accent)' }}
    >
      {/* decorative circles */}
      <div style={{
        position: 'absolute', right: -30, top: -30,
        width: 120, height: 120, borderRadius: '50%',
        background: 'var(--accent-2)', border: '3px solid var(--outline)', opacity: .9,
      }} />
      <div style={{
        position: 'absolute', right: 34, top: 40,
        width: 30, height: 30, borderRadius: '50%',
        background: 'var(--accent-3)', border: '3px solid var(--outline)',
      }} />

      <div className="display" style={{ fontSize: 22, marginBottom: 4, position: 'relative' }}>
        Start a room
      </div>
      <div className="mono" style={{
        fontSize: 11, color: 'var(--ink-dim)',
        textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16,
      }}>
        name it. you&apos;re the admin.
      </div>

      <div className="flex flex-wrap gap-3" style={{ position: 'relative', maxWidth: 680 }}>
        <input
          type="text"
          value={roomName}
          onChange={(e) => { setRoomName(e.target.value); setError(''); }}
          placeholder="e.g. Midnight Meteor Shower"
          className="field"
          style={{ flex: '1 1 240px' }}
          maxLength={50}
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          className="btn btn-accent"
          disabled={loading || !roomName.trim()}
          style={{ fontSize: 16, padding: '13px 24px' }}
        >
          {loading ? '...' : '⚡ BLAST OFF'}
        </button>
      </div>

      {roomName && !error && (
        <p className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 8, position: 'relative' }}>
          dropatrack.app/<span style={{ color: 'var(--accent)', fontWeight: 700 }}>{slugify(roomName)}</span>
        </p>
      )}
      {error && (
        <p style={{ fontSize: 13, color: 'var(--pop-coral)', marginTop: 8, position: 'relative' }}>{error}</p>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep CreateRoom
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/CreateRoom.tsx
git commit -m "feat: rewrite CreateRoom — cartoon-cosmic shell, same Supabase logic"
```

---

### Task 3: Rewrite PublicRooms.tsx

**Files:**
- Replace: `components/PublicRooms.tsx`

Supabase query logic unchanged. New card grid with hard offset shadow, now-playing strip.

- [ ] **Step 1: Write the new component**

```tsx
// components/PublicRooms.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Room } from '@/lib/types';

const CARD_SHADOWS = [
  'var(--pop-magenta)',
  'var(--pop-coral)',
  'var(--pop-cyan)',
  'var(--pop-violet)',
];

export default function PublicRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'popular' | 'az'>('popular');

  useEffect(() => {
    async function fetchRooms() {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (!error && data) setRooms(data);
      setLoading(false);
    }
    fetchRooms();
  }, []);

  const sorted = [...rooms].sort((a, b) =>
    sort === 'az' ? a.name.localeCompare(b.name) : 0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-3">
        <div className="live-dot" />
        <span className="mono" style={{ fontSize: 12, color: 'var(--ink-dim)', letterSpacing: '.08em' }}>
          SCANNING THE GALAXY...
        </span>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="mono" style={{ color: 'var(--ink-dim)', fontSize: 12, letterSpacing: '.06em' }}>
          NO LIVE ROOMS — FIRE THE FIRST ONE UP ✨
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* header row */}
      <div className="flex justify-between items-end flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <h2 className="display" style={{ fontSize: 30, margin: 0 }}>Live rooms</h2>
          <span className="chip" style={{ background: 'var(--panel-2)' }}>
            <span className="live-dot" />
            {rooms.length} adrift
          </span>
        </div>
        {/* sort toggle */}
        <div
          className="pop-sm flex overflow-hidden"
          style={{ borderRadius: 12, border: '2.5px solid var(--outline)' }}
        >
          {(['popular', 'az'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className="mono"
              style={{
                fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.06em', padding: '8px 14px',
                border: 'none', cursor: 'pointer',
                background: sort === s ? 'var(--accent)' : 'var(--panel)',
                color: sort === s ? '#140f1f' : 'var(--ink)',
              }}
            >
              {s === 'popular' ? 'Popular' : 'A–Z'}
            </button>
          ))}
        </div>
      </div>

      {/* grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 20,
      }}>
        {sorted.map((room, i) => (
          <RoomCard key={room.id} room={room} shadow={CARD_SHADOWS[i % CARD_SHADOWS.length]} />
        ))}
      </div>
    </div>
  );
}

function RoomCard({ room, shadow }: { room: Room; shadow: string }) {
  return (
    <Link href={`/${room.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        className="pop wobble popin"
        style={{
          overflow: 'hidden', cursor: 'pointer',
          boxShadow: `7px 7px 0 ${shadow}`,
          transition: 'transform .1s ease, box-shadow .1s ease',
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
        {/* thumbnail */}
        <div style={{ position: 'relative', height: 118 }}>
          <div className="ph" style={{ position: 'absolute', inset: 0 }} />
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <span className="chip" style={{ background: 'var(--panel)' }}>
              <span className="live-dot" />LIVE
            </span>
          </div>
        </div>

        {/* body */}
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
          {/* now-playing mini strip */}
          <div className="flex items-center gap-2" style={{
            padding: '8px 10px',
            background: 'var(--panel-2)',
            border: '2px solid var(--line)',
            borderRadius: 11,
          }}>
            <div className="flex gap-0.5 items-end flex-shrink-0">
              {[6, 11, 8].map((h, j) => (
                <div key={j} style={{
                  width: 3, height: h,
                  background: shadow, borderRadius: 2,
                }} />
              ))}
            </div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '.1em' }}>
              NOW PLAYING
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep PublicRooms
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/PublicRooms.tsx
git commit -m "feat: rewrite PublicRooms — pop card grid, accent shadows, now-playing strip"
```

---

### Task 4: Rewrite app/page.tsx

**Files:**
- Replace: `app/page.tsx`

- [ ] **Step 1: Write the new homepage**

```tsx
// app/page.tsx
import Logo from '@/components/room/ui/Logo';
import StarField from '@/components/room/ui/StarField';
import CreateRoom from '@/components/CreateRoom';
import PublicRooms from '@/components/PublicRooms';
import ThemeToggleButton from '@/components/ThemeToggleButton';

export default function HomePage() {
  return (
    <main style={{ position: 'relative', minHeight: '100vh', zIndex: 1 }}>
      <div className="cosmos-bg" />
      <StarField n={30} seed={7} />

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 26px 80px', position: 'relative' }}>

        {/* top bar */}
        <div className="flex justify-between items-center flex-wrap gap-3 mb-12">
          <Logo size={36} />
          <ThemeToggleButton />
        </div>

        {/* hero */}
        <div style={{ position: 'relative', marginBottom: 40 }}>
          <div
            className="chip"
            style={{
              background: 'var(--accent-3)',
              color: '#140f1f',
              marginBottom: 18,
              transform: 'rotate(-2deg)',
              display: 'inline-flex',
            }}
          >
            ⚡ tune in together · across the galaxy
          </div>
          <h1
            className="display"
            style={{
              fontSize: 'clamp(44px, 7.5vw, 96px)',
              margin: 0,
              maxWidth: 880,
              textWrap: 'balance',
            } as React.CSSProperties}
          >
            One queue.<br />
            Everybody{' '}
            <span style={{ color: 'var(--accent)', WebkitTextStroke: '2px var(--outline)' }}>
              floating
            </span>{' '}
            to the same beat.
          </h1>
          <p style={{
            fontSize: 18, color: 'var(--ink-soft)',
            maxWidth: 560, marginTop: 18, fontWeight: 600, lineHeight: 1.5,
          }}>
            Spin up a room, paste a YouTube link, and drift through space with your crew —
            synced playback, live reactions, and a chat that actually has taste.
          </p>
        </div>

        {/* create room */}
        <div style={{ marginBottom: 46 }}>
          <CreateRoom />
        </div>

        {/* public rooms */}
        <PublicRooms />

        {/* footer */}
        <div
          className="mono flex justify-center items-center gap-2"
          style={{ marginTop: 54, color: 'var(--ink-dim)', fontSize: 12, letterSpacing: '.06em' }}
        >
          📍 broadcasting from sector 7-G · DropATrack ©2026
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create ThemeToggleButton (client component)**

`ThemeToggleButton` is needed because `page.tsx` is a Server Component and can't call `useTheme` directly.

```tsx
// components/ThemeToggleButton.tsx
'use client';

import { useTheme } from '@/components/ThemeProvider';

export default function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className="btn pop-sm" onClick={toggleTheme} style={{ gap: 8 }}>
      <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
      <span style={{ fontSize: 12 }}>{theme === 'dark' ? 'LIGHTS ON' : 'LIGHTS OFF'}</span>
    </button>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "page.tsx|CreateRoom|PublicRooms|ThemeToggle"
```

Expected: no errors.

- [ ] **Step 4: Dev server visual check**

```bash
npm run dev
```

Open `http://localhost:3000`:
- Bungee headline "One queue. Everybody floating to the same beat."
- Cyan "floating" with outline stroke
- Violet rotated chip above hero
- Create room form with wobble borders + decorative circles + accent shadow
- Public rooms grid (if any exist in DB) or "no live rooms" mono text
- LIGHTS ON/OFF toggle in top bar

- [ ] **Step 5: Test room creation**

Enter room name → click "BLAST OFF" → should navigate to `/{slug}`.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx components/ThemeToggleButton.tsx
git commit -m "feat: rewrite homepage — hero, create form, public rooms grid, cosmic layout"
```
