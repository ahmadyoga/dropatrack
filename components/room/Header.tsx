'use client';

import LiveDot from './ui/LiveDot';
import Icon from './ui/Icon';
import { useRoom } from './RoomContext';
import ShareButton from './ShareButton';

interface HeaderProps {
  onLeave: () => void;
  onOpenSettings: () => void;
  canOpenSettings: boolean;
}

const slugOf = (s: string) => s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-');

export default function Header({ onLeave, onOpenSettings, canOpenSettings }: HeaderProps) {
  const { room, users, theme, toggleTheme } = useRoom();
  const showSlug = slugOf(room.name) !== room.slug;

  return (
    <header className="flex justify-between items-center gap-3 room-header">
      <div className="flex items-center gap-3 min-w-0">
        <button className="btn pop-sm btn-icon" onClick={onLeave} aria-label="Leave room, back to home" title="Back to home" style={{ flexShrink: 0, width: 44, height: 44, padding: 0 }}>
          <Icon name="back" size={20} />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1
              className="display"
              style={{ fontSize: 'clamp(20px, 2.4vw, 28px)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}
              title={room.name}
            >
              {room.name}
            </h1>
            <span className="chip hide-mobile" style={{ flexShrink: 0 }} title={`${users.length} in the room`}>
              {room.is_playing && <LiveDot />}
              <Icon name="users" size={13} />
              <span>{users.length}<span className="hide-mobile"> here</span></span>
            </span>
          </div>
          {showSlug && (
            <div className="mono hide-mobile" style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 2 }}>
              /{room.slug}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
        <ShareButton />
        <button className="btn pop-sm btn-icon" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'} style={{ width: 44, height: 44, padding: 0 }}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
        </button>
        {canOpenSettings && (
          <button className="btn pop-sm btn-icon" onClick={onOpenSettings} aria-label="Room settings" title="Room settings" style={{ width: 44, height: 44, padding: 0 }}>
            <Icon name="gear" size={20} />
          </button>
        )}
      </div>
    </header>
  );
}
