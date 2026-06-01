'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/names';
import type { UserIdentity } from '@/lib/names';
import UsernameModal from '@/components/UsernameModal';
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
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<(UserIdentity & { isNew: boolean }) | null>(null);
  const router = useRouter();

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
    <>
      {showUsernameModal && pendingUser && (
        <UsernameModal
          currentName={pendingUser.username}
          onConfirm={() => { setShowUsernameModal(false); if (pendingSlug) router.push(`/${pendingSlug}`); }}
          onSkip={() => { setShowUsernameModal(false); if (pendingSlug) router.push(`/${pendingSlug}`); }}
        />
      )}
    <div>
      <div className="flex justify-between items-end flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <h2 className="display" style={{ fontSize: 30, margin: 0 }}>Live rooms</h2>
          <span className="chip" style={{ background: 'var(--panel-2)' }}>
            <span className="live-dot" />
            {rooms.length} adrift
          </span>
        </div>
        <div
          className="flex overflow-hidden"
          style={{ borderRadius: 12, border: '2.5px solid var(--outline)', background: 'var(--panel)' }}
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

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 20,
      }}>
        {sorted.map((room, i) => (
          <RoomCard key={room.id} room={room} shadow={CARD_SHADOWS[i % CARD_SHADOWS.length]} onClick={() => handleRoomClick(room.slug)} />
        ))}
      </div>
    </div>
    </>
  );
}

function RoomCard({ room, shadow, onClick }: { room: Room; shadow: string; onClick: () => void }) {
  return (
      <div
        onClick={onClick}
        className="pop wobble"
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
