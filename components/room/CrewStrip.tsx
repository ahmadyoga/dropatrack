'use client';

import { useState } from 'react';
import Avatar from './ui/Avatar';
import { useRoom } from './RoomContext';
import type { UserRole } from '@/lib/types';

const ASSIGNABLE_ROLES: UserRole[] = ['moderator', 'dj'];

interface CrewStripProps {
  onUpdateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
}

export default function CrewStrip({ onUpdateUserRole }: CrewStripProps) {
  const { users, currentUser, myRole } = useRoom();
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const isAdmin = myRole === 'admin';

  return (
    <div
      className="pop wobble flex items-center gap-3 noscb"
      style={{ padding: '10px 14px', overflowX: 'auto', overflowY: 'visible' }}
    >
      <span className="chip" style={{ background: 'var(--panel-2)', flexShrink: 0 }}>
        👥 {users.length}
      </span>

      {users.map((u) => {
        const isMe = u.user_id === currentUser?.user_id;
        return (
          <div key={u.user_id} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              className="col items-center gap-1"
              onClick={() => isAdmin && !isMe && setMenuUserId(menuUserId === u.user_id ? null : u.user_id)}
              style={{
                background: 'none', border: 'none',
                cursor: isAdmin && !isMe ? 'pointer' : 'default', padding: 0,
              }}
            >
              <div style={{
                borderRadius: '50%',
                border: isMe ? '2.5px solid var(--accent)' : '2.5px solid var(--outline)',
                padding: 2,
              }}>
                <Avatar seed={u.user_id} size={34} />
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700,
                maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: 'var(--ink)',
              }}>
                {isMe ? 'You' : u.username}
              </span>
              <span className={`chip role-${u.role}`} style={{ fontSize: 9, padding: '2px 7px' }}>
                {u.role}
              </span>
            </button>

            {isAdmin && menuUserId === u.user_id && (
              <div
                className="pop wobble popin col"
                style={{
                  position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
                  transform: 'translateX(-50%)', zIndex: 50,
                  padding: 8, gap: 4, minWidth: 120,
                  boxShadow: '6px 6px 0 var(--accent)',
                }}
              >
                <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '.1em', marginBottom: 4 }}>
                  SET ROLE
                </div>
                {ASSIGNABLE_ROLES.map((role) => (
                  <button
                    key={role}
                    className={`chip role-${role}`}
                    style={{ fontSize: 11, padding: '4px 10px', width: '100%', justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--outline)' }}
                    onClick={async () => { await onUpdateUserRole(u.user_id, role); setMenuUserId(null); }}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
