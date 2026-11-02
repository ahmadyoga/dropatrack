'use client';

import { useRoom } from '../RoomContext';
import { usePwaInstall } from '../hooks/usePwaInstall';
import type { UserRole } from '@/lib/types';
import Modal from '../ui/Modal';

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
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onToggle}
        style={{
          width: 54, height: 30, borderRadius: 20,
          border: '3px solid var(--outline)',
          background: on ? 'var(--accent-2)' : 'var(--panel-3)',
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
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <Modal title="Room settings" onClose={onClose}>
        <div className="scroll" style={{ padding: '8px 20px 20px', overflowY: 'auto' }}>

          {/* Private room */}
          <Toggle
            on={isPrivate}
            onToggle={() => onUpdatePrivacy(!isPrivate)}
            label="Private room"
            sub="hide from public rooms listing"
          />

          {/* Default role */}
          <div style={{ padding: '14px 0', borderBottom: '2px solid var(--line)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Default role for new users</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', marginBottom: 12 }}>assigned when users join</div>
            <div className="flex gap-2">
              {(['moderator', 'dj'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  aria-pressed={currentRole === role}
                  style={{
                    flex: 1, padding: '8px 14px', fontSize: 13,
                    cursor: 'pointer', border: '2.5px solid var(--outline)',
                    borderRadius: 12, fontWeight: 700,
                    background: currentRole === role ? 'var(--accent-2)' : 'var(--panel)',
                    color: currentRole === role ? 'var(--on-pop)' : 'var(--ink)',
                    boxShadow: currentRole === role ? '3px 3px 0 var(--shadow)' : '2px 2px 0 var(--shadow)',
                  }}
                  onClick={() => onUpdateDefaultRole(role)}
                >
                  {role === 'moderator' ? '🛡️ Moderator' : '🎧 DJ'}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions matrix */}
          <div style={{ padding: '12px 0', borderBottom: '2px solid var(--line)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Permissions</div>
            <div className="mono" style={{ fontSize: 11 }}>
              {/* Mirrors the real checks: canPlayPause/canRearrange (RoomClient) and canRemove (Queue). */}
              <div className="flex" style={{ gap: 6, marginBottom: 4, color: 'var(--ink-soft)' }}>
                <span style={{ flex: 1 }} />
                <span style={{ width: 44, textAlign: 'center' }}>Add</span>
                <span style={{ width: 52, textAlign: 'center' }}>Play/skip</span>
                <span style={{ width: 52, textAlign: 'center' }}>Reorder</span>
                <span style={{ width: 52, textAlign: 'center' }}>Remove</span>
              </div>
              {(['admin', 'moderator', 'dj'] as UserRole[]).map((r) => (
                <div key={r} className="flex items-center" style={{ gap: 6, padding: '3px 0' }}>
                  <span style={{ flex: 1 }}><span className={`chip role-${r}`} style={{ padding: '2px 8px' }}>{r}</span></span>
                  <span style={{ width: 44, textAlign: 'center' }}>✅</span>
                  <span style={{ width: 52, textAlign: 'center' }}>{r !== 'dj' ? '✅' : '❌'}</span>
                  <span style={{ width: 52, textAlign: 'center' }}>{r !== 'dj' ? '✅' : '❌'}</span>
                  <span style={{ width: 52, textAlign: 'center' }}>{r !== 'dj' ? '✅' : 'own'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lights */}
          <Toggle
            on={theme === 'dark'}
            onToggle={toggleTheme}
            label="Dark mode"
            sub={theme === 'dark' ? 'deep space' : 'off: daylight paper'}
          />

          {/* PWA install */}
          <div style={{ padding: '14px 0', borderBottom: '2px solid var(--line)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Install app</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', marginBottom: 12 }}>
              add DropATrack to your home screen
            </div>
            {installed ? (
              <div className="mono" style={{ fontSize: 12 }}>✅ Installed</div>
            ) : canInstall ? (
              <button
                className="btn pop-sm"
                onClick={promptInstall}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                📲 INSTALL APP
              </button>
            ) : (
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                {isIos ? 'tap Share ⬆️ then "Add to Home Screen"' : 'use your browser menu → "Install app" / "Add to Home Screen"'}
              </div>
            )}
          </div>

          {/* Extension download */}
          <div style={{ padding: '14px 0', borderBottom: '2px solid var(--line)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Browser extension</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', marginBottom: 12 }}>
              add tracks from YouTube, YouTube Music, and Spotify
            </div>
            <a
              className="btn pop-sm"
              href="/extension.zip"
              download
              style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
            >
              📦 DOWNLOAD EXTENSION ZIP
            </a>
          </div>

        </div>
    </Modal>
  );
}
