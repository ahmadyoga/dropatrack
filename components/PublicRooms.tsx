'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Room } from '@/lib/types';

export default function PublicRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRooms() {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setRooms(data);
      }
      setLoading(false);
    }

    fetchRooms();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex gap-1 items-end h-5">
          <div className="eq-bar" />
          <div className="eq-bar" />
          <div className="eq-bar" />
          <div className="eq-bar" />
        </div>
        <span className="ml-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading rooms...
        </span>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-8">
        <p style={{ color: 'var(--text-muted)' }} className="text-sm">
          No public rooms yet. Create the first one! 🎵
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 w-full">
      {rooms.map((room, i) => (
        <Link
          key={room.id}
          href={`/${room.slug}`}
          className="glass-subtle flex items-center gap-4 p-4 hover:scale-[1.02] transition-all duration-200 no-underline"
          style={{
            animationDelay: `${i * 0.05}s`,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--green-primary), var(--green-dark))',
            }}
          >
            <span className="text-white text-lg">🎵</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{room.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              /{room.slug}
              {room.created_by && ` · by ${room.created_by}`}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {room.is_playing && (
              <div className="flex gap-0.5 items-end h-3.5">
                <div className="eq-bar" style={{ width: 2, animationDuration: '0.6s' }} />
                <div className="eq-bar" style={{ width: 2, animationDuration: '0.8s' }} />
                <div className="eq-bar" style={{ width: 2, animationDuration: '0.5s' }} />
              </div>
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>
      ))}
    </div>
  );
}
