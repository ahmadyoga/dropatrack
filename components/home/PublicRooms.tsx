'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Room } from '@/lib/types';

export default function PublicRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'recent' | 'az'>('recent');

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
    sort === 'az' ? a.name.localeCompare(b.name) : 0 // 'recent' keeps the updated_at order from the query
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-3">
        <div className="live-dot" />
        <span className="mono" style={{ fontSize: 12, color: 'var(--ink-dim)', letterSpacing: '.08em' }}>
          Loading live rooms…
        </span>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="mono" style={{ color: 'var(--ink-dim)', fontSize: 12, letterSpacing: '.06em' }}>
          No public rooms right now. Start one above ✨
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="live-rooms-title">
      <div className="flex justify-between items-end flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <h2 id="live-rooms-title" className="display" style={{ fontSize: 30, margin: 0 }}>Public rooms</h2>
          <span className="chip">{rooms.length} open</span>
        </div>
        {rooms.length >= 6 && <div
          role="group"
          aria-label="Sort rooms"
          className="flex overflow-hidden"
          style={{ borderRadius: 12, border: '2.5px solid var(--outline)', background: 'var(--panel)' }}
        >
          {(['recent', 'az'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sort === s}
              onClick={() => setSort(s)}
              className="mono"
              style={{
                fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.06em', padding: '0 14px', minHeight: 40,
                border: 'none', cursor: 'pointer',
                background: sort === s ? 'var(--panel-3)' : 'var(--panel)',
                color: 'var(--ink)',
              }}
            >
              {s === 'recent' ? 'Recent' : 'A–Z'}
            </button>
          ))}
        </div>}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 20,
      }}>
        {sorted.map((room) => <RoomCard key={room.id} room={room} />)}
      </div>
    </section>
  );
}

function RoomCard({ room }: { room: Room }) {
  return (
    <Link href={`/${room.slug}`} className="pop room-card" style={{ display: 'block', borderRadius: 16, padding: '16px 18px', color: 'var(--ink)', textDecoration: 'none' }}>
      <div className="display" style={{ fontSize: 19, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {room.name}
      </div>
      <div className="mono" style={{ fontSize: 12, color: 'var(--ink-dim)', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        /{room.slug}
      </div>
      <span className="chip">
        {room.is_playing ? <><span className="live-dot" aria-hidden="true" />Playing now</> : 'Paused'}
      </span>
    </Link>
  );
}
