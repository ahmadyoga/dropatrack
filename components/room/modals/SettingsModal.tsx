'use client';

import { useRoom } from '../RoomContext';
import type { UserRole } from '@/lib/types';

interface SettingsModalProps {
  onClose: () => void;
  onUpdateDefaultRole: (role: UserRole) => Promise<void>;
  onUpdatePrivacy: (isPrivate: boolean) => Promise<void>;
}

function Toggle({ on, onToggle, label, sub }: { on: boolean; onToggle: () => void; label: string; sub: string }) {
  return (
    <div className="flex justify-between items-center gap-3" style={{ padding: '12px 0', borderBottom: '2px solid var(--line)' }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>{sub}</div>
      </div>
      <button
        onClick={onToggle}
        style={{
          width: 54, height: 30, borderRadius: 20,
          border: '3px solid var(--outline)',
          background: on ? 'var(--accent)' : 'var(--panel-3)',
          position: 'relative', cursor: 'pointer', flexShrink: 0,
          transition: 'background .15s',
        }}
      >
        <span style={{
          position: 'absolute', top: 1, left: on ? 25 : 1,
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--panel)', border: '2.5px solid var(--outline)',
          transition: 'left .15s', display: 'block',
        }} />
      </button>
    </div>
  );
}

export default function SettingsModal({ onClose, onUpdateDefaultRole, onUpdatePrivacy }: SettingsModalProps) {
  const { room, theme, toggleTheme } = useRoom();
  const currentRole = room.default_role || 'dj';
  const isPrivate = !room.is_public;

  return (
    <div className="scrim" onClick={onClose}>
      <div
        className="pop wobble-2 popin"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(480px, 94vw)', overflow: 'hidden', boxShadow: '9px 9px 0 var(--accent)' }}
      >
        {/* header */}
        <div className="flex justify-between items-center" style={{ padding: '16px 18px', borderBottom: '3px solid var(--outline)', background: 'var(--accent-2)', color: '#140f1f' }}>
          <div className="display" style={{ fontSize: 21 }}>Room settings</div>
          <button className="btn pop-sm btn-icon" onClick={onClose} style={{ color: '#140f1f', background: 'transparent' }}>✕</button>
        </div>

        <div style={{ padding: '8px 18px 18px' }}>
          {/* Default role */}
          <div style={{ padding: '14px 0', borderBottom: '2px solid var(--line)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Default role for new users</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', marginBottom: 12 }}>assigned when users join</div>
            <div className="flex gap-2">
              {(['moderator', 'dj'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  style={{
                    flex: 1, padding: '8px 14px', fontSize: 13,
                    cursor: 'pointer', border: '2.5px solid var(--outline)',
                    borderRadius: 12, fontWeight: 700,
                    background: currentRole === role ? 'var(--accent)' : 'var(--panel)',
                    color: currentRole === role ? '#140f1f' : 'var(--ink)',
                    boxShadow: currentRole === role ? '3px 3px 0 var(--shadow)' : '2px 2px 0 var(--shadow)',
                  }}
                  onClick={() => onUpdateDefaultRole(role)}
                >
                  {role === 'moderator' ? '🛡️ Moderator' : '🎧 DJ'}
                </button>
              ))}
            </div>
          </div>

          {/* Private room */}
          <Toggle
            on={isPrivate}
            onToggle={() => onUpdatePrivacy(!isPrivate)}
            label="Private room"
            sub="hide from public rooms listing"
          />

          {/* Permissions matrix */}
          <div style={{ padding: '12px 0', borderBottom: '2px solid var(--line)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Permissions</div>
            <div className="mono" style={{ fontSize: 11 }}>
              <div className="flex" style={{ gap: 8, marginBottom: 4, color: 'var(--ink-dim)' }}>
                <span style={{ flex: 1 }} />
                <span style={{ width: 40, textAlign: 'center' }}>Add</span>
                <span style={{ width: 40, textAlign: 'center' }}>Play</span>
                <span style={{ width: 48, textAlign: 'center' }}>Reorder</span>
              </div>
              {(['admin', 'moderator', 'dj'] as UserRole[]).map((r) => (
                <div key={r} className="flex items-center" style={{ gap: 8, padding: '3px 0' }}>
                  <span className={`chip role-${r}`} style={{ flex: 1, fontSize: 10, padding: '2px 8px' }}>{r}</span>
                  <span style={{ width: 40, textAlign: 'center' }}>✅</span>
                  <span style={{ width: 40, textAlign: 'center' }}>{r !== 'dj' ? '✅' : '❌'}</span>
                  <span style={{ width: 48, textAlign: 'center' }}>{r !== 'dj' ? '✅' : '❌'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lights */}
          <Toggle
            on={theme === 'dark'}
            onToggle={toggleTheme}
            label="Lights"
            sub={theme === 'dark' ? 'deep space' : 'daylight cosmos'}
          />

          {/* Leave */}
          <button
            className="btn pop-sm"
            onClick={() => window.history.back()}
            style={{ width: '100%', marginTop: 18, background: 'var(--pop-coral)', color: '#140f1f', justifyContent: 'center' }}
          >
            ← LEAVE ROOM
          </button>
        </div>
      </div>
    </div>
  );
}
