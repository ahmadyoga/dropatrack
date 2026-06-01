'use client';

import LiveDot from './ui/LiveDot';
import Icon from './ui/Icon';
import { useRoom } from './RoomContext';

interface HeaderProps {
  onLeave: () => void;
  onOpenSettings: () => void;
  canOpenSettings: boolean;
}

export default function Header({ onLeave, onOpenSettings, canOpenSettings }: HeaderProps) {
  const { room, users, theme, toggleTheme } = useRoom();

  return (
    <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <button className="btn pop-sm btn-icon" onClick={onLeave} title="Back to rooms" style={{ flexShrink: 0 }}>
          <Icon name="back" size={20} />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1
              className="display"
              style={{ fontSize: 'clamp(22px,3vw,32px)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '46vw' }}
            >
              {room.name}
            </h1>
            <span className="chip" style={{ background: 'var(--panel)', flexShrink: 0 }}>
              <LiveDot />LIVE
            </span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', letterSpacing: '.06em', marginTop: 2 }}>
            /{room.slug}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
        <span className="chip" style={{ background: 'var(--accent-2)', color: '#140f1f' }}>
          <Icon name="users" size={13} /> {users.length} aboard
        </span>
        <button className="btn pop-sm btn-icon" onClick={toggleTheme} title="Toggle lights">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
        </button>
        {canOpenSettings && (
          <button className="btn pop-sm btn-icon" onClick={onOpenSettings} title="Settings">
            <Icon name="gear" size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
