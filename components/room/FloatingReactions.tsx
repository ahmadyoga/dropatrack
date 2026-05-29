'use client';

import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot, getServerSnapshot } from './reactionsStore';

export default function FloatingReactions() {
  const reactions = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <div className="floating-reactions-layer" aria-hidden="true">
      {reactions.map((r) => (
        <span key={r.id} className="floating-reaction" style={{ left: `${r.x}%`, top: `${r.y}%` }}>
          {r.emoji}
        </span>
      ))}
    </div>
  );
}
