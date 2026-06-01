'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRoom } from './RoomContext';
import { snapshotNames, ogImagePath } from '@/lib/share';
import Icon from './ui/Icon';

export default function ShareButton() {
  const { room, users } = useRoom();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (busy) return;
    setBusy(true);
    try {
      const names = snapshotNames(users);
      const snapshotAt = new Date().toISOString();

      await supabase
        .from('rooms')
        .update({ listener_snapshot: names, snapshot_at: snapshotAt })
        .eq('id', room.id);

      fetch(ogImagePath(room.slug)).catch(() => { });

      const url = `${window.location.origin}/${room.slug}`;
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: room.name, url }).catch(() => { });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className="btn pop-sm flex items-center gap-1.5"
      onClick={handleShare}
      disabled={busy}
      title={copied ? 'Link copied!' : 'Share room'}
    >
      <Icon name={copied ? 'check' : 'link'} size={19} />
      <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
    </button>
  );
}
