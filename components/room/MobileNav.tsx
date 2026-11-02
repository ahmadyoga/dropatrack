'use client';

import Icon from './ui/Icon';

type MobileTab = 'player' | 'queue' | 'chat';

interface MobileNavProps {
  activeTab: MobileTab;
  setActiveTab: (t: MobileTab) => void;
  unreadChatCount: number;
}

const TABS: { id: MobileTab; icon: string; label: string }[] = [
  { id: 'player', icon: 'play', label: 'Now playing' },
  { id: 'queue',  icon: 'list', label: 'Queue'       },
  { id: 'chat',   icon: 'chat', label: 'Chat'        },
];

export default function MobileNav({ activeTab, setActiveTab, unreadChatCount }: MobileNavProps) {
  return (
    <nav
      aria-label="Room sections"
      className="pop flex"
      style={{
        position: 'fixed', left: 10, right: 10, bottom: 10,
        zIndex: 120, padding: 6, gap: 5,
        borderRadius: 18, justifyContent: 'space-around',
        boxShadow: '5px 5px 0 var(--shadow)',
      }}
    >
      {TABS.map(({ id, icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setActiveTab(id)}
          aria-current={activeTab === id ? 'page' : undefined}
          aria-label={id === 'chat' && unreadChatCount > 0 ? `${label}, ${unreadChatCount} unread` : undefined}
          className="col items-center"
          style={{
            flex: 1, gap: 3, minHeight: 52, justifyContent: 'center', borderRadius: 12,
            border: activeTab === id ? '2.5px solid var(--outline)' : '2.5px solid transparent',
            cursor: 'pointer', position: 'relative',
            background: activeTab === id ? 'var(--accent-2)' : 'transparent',
            color: activeTab === id ? 'var(--on-pop)' : 'var(--ink-soft)',
          }}
        >
          <Icon name={icon} size={20} />
          <span className="mono" style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
          {id === 'chat' && unreadChatCount > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: '24%',
              minWidth: 16, height: 16, padding: '0 4px',
              borderRadius: 10, background: 'var(--pop-magenta)', color: 'var(--on-pop)',
              fontSize: 11, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--outline)',
            }}>
              {unreadChatCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
