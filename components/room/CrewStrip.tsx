'use client';

import { useState, useRef, useEffect } from 'react';
import Avatar from './ui/Avatar';
import Icon from './ui/Icon';
import { useRoom } from './RoomContext';
import type { UserRole } from '@/lib/types';

const ROLE_ORDER: Record<UserRole, number> = { admin: 0, moderator: 1, dj: 2 };
const ASSIGNABLE_ROLES: UserRole[] = ['moderator', 'dj'];

interface CrewStripProps {
  onUpdateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  onRenameMe: (newName: string) => void;
}

function RoleMenu({ anchorEl, role, userId, onSelect, onClose }: {
  anchorEl: HTMLElement;
  role: UserRole;
  userId: string;
  onSelect: (userId: string, r: UserRole) => Promise<void>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rect = anchorEl.getBoundingClientRect();

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && e.target !== anchorEl) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); anchorEl.focus(); }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    // Keyboard users land on the current role.
    ref.current?.querySelector<HTMLElement>('[aria-checked="true"], [role="menuitemradio"]')?.focus();
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchorEl, onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Set role"
      className="pop wobble popin col"
      style={{
        position: 'fixed', zIndex: 500,
        top: rect.bottom + 6,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
        padding: 6, gap: 3, width: 140,
      }}
    >
      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-soft)', padding: '4px 9px 2px' }}>Set role</div>
      {ASSIGNABLE_ROLES.map((r) => (
        <button
          key={r}
          type="button"
          role="menuitemradio"
          aria-checked={role === r}
          className="flex items-center"
          style={{
            gap: 8, padding: '0 9px', minHeight: 40, borderRadius: 8, border: 'none', color: 'var(--ink)',
            cursor: 'pointer', background: role === r ? 'var(--panel-3)' : 'transparent',
            textAlign: 'left', width: '100%',
          }}
          onClick={async () => { await onSelect(userId, r); onClose(); }}
        >
          <span className={`chip role-${r}`} style={{ padding: '2px 8px' }}>{r}</span>
          {role === r && <Icon name="check" size={14} style={{ marginLeft: 'auto' }} />}
        </button>
      ))}
    </div>
  );
}

// CW arc 195°→345° (150° sweep) through 270° (visual top), center (44,46) r=30
// smaller radius = more arch + text sits lower on card
const ARC_D = `M 15,38.2 A 30,30 0 0 1 73,38.2`;

function CrewChip({ userId, username, role, isMe, isAdmin, isSpeaker, onUpdateUserRole, onRenameMe, onOpenMenu }: {
  userId: string;
  username: string;
  role: UserRole;
  isMe: boolean;
  isAdmin: boolean;
  isSpeaker: boolean;
  onUpdateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  onRenameMe: (newName: string) => void;
  onOpenMenu: (el: HTMLElement) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(username);
  const arcId = `arc-${userId}`;

  const save = () => {
    const v = editVal.trim();
    if (v && v !== username) onRenameMe(v);
    setEditing(false);
  };

  return (
    <div
      className="col"
      style={{
        position: 'relative', flexShrink: 0, width: 104, alignItems: 'center', gap: 6,
        padding: '8px 8px 10px', borderRadius: 14,
        border: `2.5px solid ${isMe ? 'var(--outline)' : 'var(--line)'}`,
        background: isMe ? 'var(--panel-3)' : 'transparent',
      }}
    >
      {/* avatar + arc username (or edit input) */}
      {editing ? (
        <input
          autoFocus
          className="field"
          aria-label="Your name"
          maxLength={30}
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditVal(username); setEditing(false); } }}
          style={{ padding: '4px 6px', fontSize: 12, textAlign: 'center', width: '100%', marginTop: 8 }}
        />
      ) : (
        <div style={{ position: 'relative', width: 88, height: 74, flexShrink: 0 }} title={username}>
          {/* avatar circle — shifted down to make room for arc text above */}
          <div className="pop-sm" style={{
            position: 'absolute', left: 18, top: 20,
            width: 52, height: 52, borderRadius: '50%', overflow: 'hidden',
            border: '2.5px solid var(--outline)', background: 'var(--panel-2)',
          }}>
            <Avatar seed={userId} size={52} />
          </div>
          {/* rename — lower-left of the avatar, mirrors the online dot, never over the name */}
          {isMe && (
            <button
              type="button"
              onClick={() => { setEditVal(username); setEditing(true); }}
              aria-label="Rename yourself"
              title="Rename yourself"
              style={{
                position: 'absolute', left: 6, top: 48, zIndex: 2,
                width: 26, height: 26, borderRadius: '50%', border: '2.5px solid var(--outline)',
                background: 'var(--panel)', color: 'var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <Icon name="edit" size={12} />
            </button>
          )}
          {/* bottom-right of avatar: 🔊 when this device plays the music, else the online dot */}
          {isSpeaker ? (
            <span title={`${username} is the speaker`} aria-label="Speaker" style={{
              position: 'absolute', left: 54, top: 52, zIndex: 2,
              width: 22, height: 22, borderRadius: '50%', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--accent-2)', border: '2.5px solid var(--outline)',
            }}>🔊</span>
          ) : (
            <span style={{
              position: 'absolute', left: 57, top: 58,
              width: 13, height: 13, borderRadius: '50%',
              background: 'var(--pop-lime)', border: '2.5px solid var(--outline)',
            }} />
          )}
          {/* username arc — CSS style on text (not SVG attr) so var(--ink) resolves */}
          <svg width="88" height="74" style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 1 }}>
            <defs>
              <path id={arcId} d={ARC_D} />
            </defs>
            <text style={{ fontSize: '11px', fontWeight: 700, fill: 'var(--ink)' }} textAnchor="middle">
              <textPath href={`#${arcId}`} startOffset="50%">
                {/* the 88px arc fits ~11 characters; full name is in the title */}
                {username.length > 11 ? `${username.slice(0, 10).trimEnd()}…` : username}
              </textPath>
            </text>
          </svg>
        </div>
      )}

      {/* role badge — admin can tap to reassign */}
      {isAdmin && !isMe ? (
        <button
          type="button"
          className={`chip role-${role}`}
          onClick={(e) => onOpenMenu(e.currentTarget)}
          aria-haspopup="menu"
          aria-label={`${username} is ${role}. Change role`}
          style={{ cursor: 'pointer', padding: '4px 9px', minHeight: 28 }}
        >
          {role} ▾
        </button>
      ) : (
        <span className={`chip role-${role}`} style={{ padding: '3px 9px' }}>{role}</span>
      )}
    </div>
  );
}

export default function CrewStrip({ onUpdateUserRole, onRenameMe }: CrewStripProps) {
  const { users, currentUser, myRole, room, isSpeaker } = useRoom();
  const isAdmin = myRole === 'admin';
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const showNudge = !!currentUser?.is_default_username && !nudgeDismissed;
  const [menuTarget, setMenuTarget] = useState<{ el: HTMLElement; userId: string; role: UserRole } | null>(null);

  const sorted = [...users].sort((a, b) =>
    (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99) ||
    a.username.localeCompare(b.username)
  );

  return (
    <section aria-label="People in the room" className="pop col" style={{ flexShrink: 0, borderRadius: 16 }}>
      {/* header */}
      <div className="flex items-center justify-between" style={{ padding: '11px 15px', borderBottom: '3px solid var(--outline)', gap: 8 }}>
        <div className="flex items-center gap-2">
          <h2 className="display" style={{ fontSize: 16, margin: 0 }}>In the room</h2>
          <span className="chip">{users.length}</span>
        </div>
        {isAdmin && users.length > 1 && (
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
            tap a role to change it
          </div>
        )}
      </div>

      {showNudge && (
        <div className="flex items-center justify-between" role="status" style={{ gap: 8, padding: '8px 15px', borderBottom: '2px solid var(--line)', fontSize: 13 }}>
          <span>You joined as <b>{currentUser?.username}</b>. Tap ✎ on your avatar to rename.</span>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => setNudgeDismissed(true)} aria-label="Dismiss" style={{ width: 36, height: 36, padding: 0, flexShrink: 0 }}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* crew chips horizontal scroll */}
      <div className="scroll flex" style={{ flexWrap: 'wrap', alignContent: 'flex-start', overflowY: 'auto', maxHeight: 260, padding: 11, gap: 9 }}>
        {sorted.map((u) => {
          const effectiveRole = ((room.user_roles?.[u.user_id]) as UserRole | undefined) || room.default_role || 'dj';
          return (
            <CrewChip
              key={u.user_id}
              userId={u.user_id}
              username={u.username}
              role={effectiveRole}
              isMe={u.user_id === currentUser?.user_id}
              isAdmin={isAdmin}
              isSpeaker={u.user_id === currentUser?.user_id ? isSpeaker : !!u.is_speaker}
              onUpdateUserRole={onUpdateUserRole}
              onRenameMe={onRenameMe}
              onOpenMenu={(el) => setMenuTarget({ el, userId: u.user_id, role: effectiveRole })}
            />
          );
        })}
      </div>

      {/* role menu rendered outside scroll container to avoid overflow-clip */}
      {menuTarget && (
        <RoleMenu
          anchorEl={menuTarget.el}
          role={menuTarget.role}
          userId={menuTarget.userId}
          onSelect={onUpdateUserRole}
          onClose={() => setMenuTarget(null)}
        />
      )}
    </section>
  );
}
