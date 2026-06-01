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
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [anchorEl, onClose]);

  return (
    <div
      ref={ref}
      className="pop wobble popin col"
      style={{
        position: 'fixed', zIndex: 500,
        top: rect.bottom + 6,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
        padding: 6, gap: 3, width: 140,
      }}
    >
      {ASSIGNABLE_ROLES.map((r) => (
        <button
          key={r}
          className="flex items-center"
          style={{
            gap: 8, padding: '7px 9px', borderRadius: 8, border: 'none',
            cursor: 'pointer', background: role === r ? 'var(--panel-3)' : 'transparent',
            textAlign: 'left', width: '100%',
          }}
          onClick={async () => { await onSelect(userId, r); onClose(); }}
        >
          <span className={`chip role-${r}`} style={{ fontSize: 9, padding: '2px 8px' }}>{r}</span>
          {role === r && <Icon name="check" size={14} style={{ marginLeft: 'auto' }} />}
        </button>
      ))}
    </div>
  );
}

// CW arc 195°→345° (150° sweep) through 270° (visual top), center (44,46) r=30
// smaller radius = more arch + text sits lower on card
const ARC_D = `M 15,38.2 A 30,30 0 0 1 73,38.2`;

function CrewChip({ userId, username, role, isMe, isAdmin, onUpdateUserRole, onRenameMe, onOpenMenu }: {
  userId: string;
  username: string;
  role: UserRole;
  isMe: boolean;
  isAdmin: boolean;
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
        border: `2.5px solid ${isMe ? 'var(--accent)' : 'var(--line)'}`,
        background: isMe ? 'var(--panel-3)' : 'transparent',
      }}
    >
      {/* pencil edit button — absolute to card, top-right, only for me */}
      {isMe && !editing && (
        <button
          onClick={() => { setEditVal(username); setEditing(true); }}
          title="Click to edit your name"
          style={{
            position: 'absolute', top: 6, right: 6,
            width: 20, height: 20, borderRadius: 6, border: '2px solid var(--outline)',
            background: 'var(--accent)', color: '#140f1f',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '2px 2px 0 var(--shadow)',
            zIndex: 2,
          }}
        >
          <Icon name="edit" size={11} />
        </button>
      )}

      {/* avatar + arc username (or edit input) */}
      {editing ? (
        <input
          autoFocus
          className="field"
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditVal(username); setEditing(false); } }}
          style={{ padding: '4px 6px', fontSize: 12, textAlign: 'center', width: '100%', marginTop: 8 }}
        />
      ) : (
        <div style={{ position: 'relative', width: 88, height: 74, flexShrink: 0 }}>
          {/* avatar circle — shifted down to make room for arc text above */}
          <div className="pop-sm" style={{
            position: 'absolute', left: 18, top: 20,
            width: 52, height: 52, borderRadius: '50%', overflow: 'hidden',
            border: '2.5px solid var(--outline)', background: 'var(--panel-2)',
          }}>
            <Avatar seed={userId} size={52} />
          </div>
          {/* online dot — bottom-right of avatar */}
          <span style={{
            position: 'absolute', left: 57, top: 58,
            width: 13, height: 13, borderRadius: '50%',
            background: 'var(--pop-lime)', border: '2.5px solid var(--outline)',
          }} />
          {/* username arc — CSS style on text (not SVG attr) so var(--ink) resolves */}
          <svg width="88" height="74" style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 1 }}>
            <defs>
              <path id={arcId} d={ARC_D} />
            </defs>
            <text style={{ fontSize: '10.5px', fontWeight: 700, fill: 'var(--ink)' }} textAnchor="middle">
              <textPath href={`#${arcId}`} startOffset="50%">
                {username}
              </textPath>
            </text>
          </svg>
        </div>
      )}

      {/* role badge — admin can tap to reassign */}
      <button
        className={`chip role-${role}`}
        onClick={(e) => isAdmin && !isMe && onOpenMenu(e.currentTarget)}
        style={{ cursor: isAdmin && !isMe ? 'pointer' : 'default', fontSize: 9, padding: '3px 8px' }}
      >
        {role}{isAdmin && !isMe && ' ▾'}
      </button>
    </div>
  );
}

export default function CrewStrip({ onUpdateUserRole, onRenameMe }: CrewStripProps) {
  const { users, currentUser, myRole, room } = useRoom();
  const isAdmin = myRole === 'admin';
  const [menuTarget, setMenuTarget] = useState<{ el: HTMLElement; userId: string; role: UserRole } | null>(null);

  const sorted = [...users].sort((a, b) =>
    (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99) ||
    a.username.localeCompare(b.username)
  );

  return (
    <div className="pop wobble col" style={{ flexShrink: 0, boxShadow: '7px 7px 0 var(--shadow)' }}>
      {/* header */}
      <div className="flex items-center justify-between" style={{ padding: '11px 15px', borderBottom: '3px solid var(--outline)' }}>
        <div className="flex items-center gap-2">
          <Icon name="users" size={19} />
          <div className="display" style={{ fontSize: 17 }}>In the room</div>
          <span className="chip" style={{ background: 'var(--accent-2)', color: '#140f1f' }}>{users.length}</span>
        </div>
        {isAdmin && (
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '.05em' }}>
            <Icon name="bolt" size={12} style={{ verticalAlign: -2 } as React.CSSProperties} /> tap a badge to reassign
          </div>
        )}
      </div>

      {/* crew chips horizontal scroll */}
      <div className="scroll noscb flex" style={{ overflowX: 'auto', overflowY: 'hidden', padding: 11, gap: 9 }}>
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
    </div>
  );
}
