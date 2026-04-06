'use client';

import type { Room, UserRole } from '@/lib/types';

interface SettingsModalProps {
  room: Room;
  onClose: () => void;
  onUpdateDefaultRole: (role: UserRole) => void;
}

export default function SettingsModal({ room, onClose, onUpdateDefaultRole }: SettingsModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>⚙️ Room Settings</h3>
          <button onClick={onClose} className="ext-close-btn">✕</button>
        </div>
        <div className="settings-body">
          <div className="settings-group">
            <label className="settings-label">Default Role for New Users</label>
            <p className="settings-desc">Users joining the room will be assigned this role unless you set a specific role for them.</p>
            <div className="role-options">
              {(['moderator', 'dj'] as UserRole[]).map(r => (
                <button
                  key={r}
                  className={`role-option ${(room.default_role || 'dj') === r ? 'active' : ''}`}
                  onClick={() => onUpdateDefaultRole(r)}
                >
                  <span className="role-icon">{r === 'moderator' ? '🛡️' : '🎧'}</span>
                  <div className="role-option-text">
                    <span className="role-name">{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                    <span className="role-desc">
                      {r === 'moderator' ? 'Play/pause, rearrange & add songs' : 'Add songs to queue only'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-group">
            <label className="settings-label">Permissions Matrix</label>
            <div className="perm-table">
              <div className="perm-row perm-header">
                <span></span><span>Add</span><span>Play</span><span>Reorder</span>
              </div>
              {(['admin', 'moderator', 'dj'] as UserRole[]).map(r => (
                <div key={r} className="perm-row">
                  <span className="perm-role">{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                  <span>✅</span>
                  <span>{r === 'admin' || r === 'moderator' ? '✅' : '❌'}</span>
                  <span>{r === 'admin' || r === 'moderator' ? '✅' : '❌'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
