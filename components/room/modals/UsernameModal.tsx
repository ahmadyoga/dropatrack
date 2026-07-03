'use client';

import { useState } from 'react';
import { updateLocalUsername, confirmUsername } from '@/lib/names';
import type { UserIdentity } from '@/lib/names';

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
          padding: 28,
          maxWidth: 420,
          width: '90%',
          boxShadow: '8px 8px 0 var(--accent)',
        }}
      >
        <div className="display" style={{ fontSize: 22, marginBottom: 6 }}>
          What&apos;s your name?
        </div>
        <div
          className="mono"
          style={{
            fontSize: 11, color: 'var(--ink-dim)',
            textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 18,
          }}
        >
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
