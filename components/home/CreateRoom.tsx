'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/names';

const slugify = (text: string) =>
  text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);

export default function CreateRoom() {
  const [roomName, setRoomName] = useState('');
  const [listPublicly, setListPublicly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // null = not checked yet, true = a room with this link already exists
  const [taken, setTaken] = useState<boolean | null>(null);
  const [host, setHost] = useState('dropatrack.vercel.app');
  const router = useRouter();

  const slug = slugify(roomName);

  useEffect(() => { setHost(window.location.host); }, []);

  // Tell people before they submit that the link is someone else's room.
  useEffect(() => {
    if (!slug) { setTaken(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data } = await supabase.from('rooms').select('slug').eq('slug', slug).maybeSingle();
      if (!cancelled) setTaken(!!data);
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [slug]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roomName.trim();
    if (!trimmed) return;
    if (!slug) { setError('Use at least one letter or number in the room name.'); return; }

    setLoading(true);
    setError('');

    const user = getOrCreateUser();
    if (!user) {
      setError('Couldn’t set up your guest identity. Check that cookies and storage are allowed, then try again.');
      setLoading(false);
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('rooms').select('slug').eq('slug', slug).maybeSingle();
      if (existing) { router.push(`/${slug}`); return; }

      const { error: insertError } = await supabase.from('rooms').insert({
        slug,
        name: trimmed,
        created_by: user.username,
        is_playing: false,
        current_song_index: 0,
        is_public: listPublicly,
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
      setError('Couldn’t create the room. Check your connection and try again.');
      setLoading(false);
    }
  };

  const joining = taken === true;

  return (
    <form onSubmit={handleCreate} className="pop pop-lg" style={{ padding: 22, borderRadius: 18 }} aria-labelledby="create-room-title">
      <h2 id="create-room-title" className="display" style={{ fontSize: 22, margin: '0 0 4px' }}>
        Start a room
      </h2>
      <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: '0 0 16px' }}>
        Name it, share the link, and you&apos;re the admin.
      </p>

      <div className="flex flex-wrap gap-3" style={{ maxWidth: 680 }}>
        <label htmlFor="room-name" className="sr-only">Room name</label>
        <input
          id="room-name"
          type="text"
          value={roomName}
          onChange={(e) => { setRoomName(e.target.value); setError(''); }}
          placeholder="e.g. Friday Office Bangers"
          className="field"
          style={{ flex: '1 1 240px' }}
          maxLength={50}
          disabled={loading}
          autoFocus
          aria-describedby="room-link-preview"
          autoComplete="off"
        />
        <button
          type="submit"
          className="btn btn-accent"
          disabled={loading || !roomName.trim()}
          style={{ fontSize: 16, padding: '13px 24px' }}
        >
          {loading ? 'Opening…' : joining ? 'Join this room' : 'Create room'}
        </button>
      </div>

      <div id="room-link-preview" aria-live="polite" style={{ minHeight: 20, marginTop: 10 }}>
        {roomName && !error && slug && (
          <p className="mono" style={{ fontSize: 12, color: 'var(--ink-dim)', margin: 0 }}>
            {host}/<span style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>{slug}</span>
            {joining && <span style={{ color: 'var(--ink-soft)' }}> · already live. You&apos;ll join it, not own it. Pick another name to start your own.</span>}
          </p>
        )}
        {error && (
          <p role="alert" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>⚠️ {error}</p>
        )}
      </div>

      {!joining && (
        <div className="flex items-center gap-3" style={{ marginTop: 12 }}>
          {/* Same switch as "Private room" in Room settings */}
          <button
            type="button"
            role="switch"
            aria-checked={listPublicly}
            aria-labelledby="list-publicly-label"
            aria-describedby="list-publicly-sub"
            onClick={() => setListPublicly((v) => !v)}
            style={{
              width: 54, height: 30, borderRadius: 20,
              border: '3px solid var(--outline)',
              background: listPublicly ? 'var(--accent-2)' : 'var(--panel-3)',
              position: 'relative', cursor: 'pointer', flexShrink: 0,
              transition: 'background .15s',
            }}
          >
            <span style={{
              position: 'absolute', top: 1, left: listPublicly ? 25 : 1,
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--panel)', border: '2.5px solid var(--outline)',
              transition: 'left .15s', display: 'block',
            }} />
          </button>
          <div onClick={() => setListPublicly((v) => !v)} style={{ cursor: 'pointer' }}>
            <div id="list-publicly-label" style={{ fontWeight: 700, fontSize: 14 }}>List in public rooms</div>
            <div id="list-publicly-sub" className="mono" style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
              {listPublicly ? 'anyone can find it on the home page' : 'only people with the link can join'}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
