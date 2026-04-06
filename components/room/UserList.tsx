'use client';

import type { Room, RoomUser, UserRole } from '@/lib/types';
import { getOrCreateUser } from '@/lib/names';

type CurrentUser = ReturnType<typeof getOrCreateUser>;

interface UserListProps {
  users: RoomUser[];
  currentUser: CurrentUser | null;
  room: Room;
  myRole: UserRole;
  editingUsername: boolean;
  newUsername: string;
  setNewUsername: (v: string) => void;
  setEditingUsername: (v: boolean) => void;
  roleMenuUserId: string | null;
  setRoleMenuUserId: (id: string | null) => void;
  onUsernameChange: () => void;
  onUpdateUserRole: (userId: string, role: UserRole) => void;
}

export default function UserList({
  users, currentUser, room, myRole,
  editingUsername, newUsername, setNewUsername, setEditingUsername,
  roleMenuUserId, setRoleMenuUserId,
  onUsernameChange, onUpdateUserRole,
}: UserListProps) {
  return (
    <div className="users-list">
      <div className="online-header">
        Online
        <span className="online-count">{users.length} {users.length === 1 ? 'listener' : 'listeners'}</span>
      </div>

      {users.map((user) => {
        const isMe = user.user_id === currentUser?.user_id;
        const isCreator = room.created_by === user.username;
        const displayRole = (room.user_roles && room.user_roles[user.user_id])
          ? room.user_roles[user.user_id]
          : (isCreator ? 'admin' : (room.default_role || user.role || 'dj'));
        const badgeClass = isMe ? 'badge-you'
          : displayRole === 'admin' ? 'badge-admin'
          : displayRole === 'moderator' ? 'badge-mod'
          : 'badge-dj';
        const canChangeRole = myRole === 'admin' && !isMe && !isCreator;

        return (
          <div key={user.user_id} className="user-item" style={{ position: 'relative' }}>
            <div className="user-av" style={{ background: user.avatar_color }}>
              <span>{user.username.charAt(0).toUpperCase()}</span>
              <div className="av-dot" />
            </div>
            <div className="ui-info">
              {isMe && editingUsername ? (
                <div className="ui-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.stopPropagation(); onUsernameChange(); }
                      if (e.key === 'Escape') { e.stopPropagation(); setEditingUsername(false); setNewUsername(currentUser?.username || ''); }
                    }}
                    autoFocus
                    style={{ width: '140px', padding: '4px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'inherit', fontSize: '13px', outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = '#1db954'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                  />
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onUsernameChange(); }}
                      style={{ background: 'rgba(29,185,84,0.15)', border: '1px solid rgba(29,185,84,0.3)', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', color: '#1db954', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '24px' }}
                      title="Save"
                    >✔</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingUsername(false); setNewUsername(currentUser?.username || ''); }}
                      style={{ background: 'rgba(255,85,85,0.15)', border: '1px solid rgba(255,85,85,0.3)', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', color: '#ff5555', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '24px' }}
                      title="Cancel"
                    >✖</button>
                  </div>
                </div>
              ) : (
                <div className="ui-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {user.username}
                  {isMe && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingUsername(true); setNewUsername(currentUser?.username || ''); }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--theme-text-muted)', display: 'inline-flex', opacity: 0.5, transition: 'opacity 0.2s, color 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#1db954'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--theme-text-muted)'; }}
                      title="Edit Username"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                    </button>
                  )}
                </div>
              )}
              <div className="ui-status">{user.is_speaker ? '🔊 Speaker' : '🎧 Listening'}</div>
            </div>
            <div
              className={`ui-badge ${badgeClass} ${canChangeRole ? 'clickable' : ''}`}
              onClick={canChangeRole ? (e) => { e.stopPropagation(); setRoleMenuUserId(roleMenuUserId === user.user_id ? null : user.user_id); } : undefined}
              title={canChangeRole ? 'Click to change role' : undefined}
            >
              {isMe ? 'YOU' : (displayRole as string).toUpperCase()}
            </div>
            {roleMenuUserId === user.user_id && (
              <div className="role-dropdown">
                {(['admin', 'moderator', 'dj'] as UserRole[]).map(r => (
                  <div
                    key={r}
                    className={`role-dropdown-item ${displayRole === r ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onUpdateUserRole(user.user_id, r); }}
                  >
                    <span>{r === 'admin' ? '👑' : r === 'moderator' ? '🛡️' : '🎧'}</span>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="listening-now">
        <div className="eq-bars" style={{ height: 12 }}>
          <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
        </div>
        All listeners synced in real-time
      </div>
    </div>
  );
}
