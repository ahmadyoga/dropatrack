'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/names';
import type { UserIdentity } from '@/lib/names';
import UsernameModal from '@/components/room/modals/UsernameModal';

export default function CreateRoom() {
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<(UserIdentity & { isNew: boolean }) | null>(null);
  const router = useRouter();

  const slugify = (text: string) =>
    text.toLowerCase().trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);

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
        auto_suggest: true,
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

  return (
    <>
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
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: 34, top: 40,
        width: 30, height: 30, borderRadius: '50%',
        background: 'var(--accent-3)', border: '3px solid var(--outline)',
        pointerEvents: 'none',
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
      {showUsernameModal && pendingUser && (
        <UsernameModal
          currentName={pendingUser.username}
          onConfirm={() => { setShowUsernameModal(false); proceedWithCreate(); }}
          onSkip={() => { setShowUsernameModal(false); proceedWithCreate(); }}
        />
      )}
    </>
  );
}
