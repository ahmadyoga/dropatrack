'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/names';

export default function CreateRoom() {
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
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
      // Check if room exists
      const { data: existing } = await supabase
        .from('rooms')
        .select('slug')
        .eq('slug', slug)
        .single();

      if (existing) {
        // Room exists, just navigate to it
        router.push(`/${slug}`);
        return;
      }

      // Create new room
      const { error: insertError } = await supabase.from('rooms').insert({
        slug,
        name: roomName.trim(),
        created_by: user.username,
        is_playing: false,
        current_song_index: 0,
        is_public: true,
      });

      if (insertError) {
        if (insertError.code === '23505') {
          // Unique constraint — room already exists, just go
          router.push(`/${slug}`);
          return;
        }
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
    <form onSubmit={handleCreate} className="w-full max-w-md">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <input
            id="room-name-input"
            type="text"
            value={roomName}
            onChange={(e) => {
              setRoomName(e.target.value);
              setError('');
            }}
            placeholder="Enter room name..."
            className="input-glass pr-4"
            maxLength={50}
            disabled={loading}
            autoFocus
          />
          {roomName && (
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              dropatrack.app/<span style={{ color: 'var(--green-primary)', fontWeight: 600 }}>{slugify(roomName)}</span>
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-500 animate-fade-in">{error}</p>
        )}

        <button
          id="create-room-btn"
          type="submit"
          className="btn-primary"
          disabled={loading || !roomName.trim()}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating...
            </span>
          ) : (
            'Create Room'
          )}
        </button>
      </div>
    </form>
  );
}
