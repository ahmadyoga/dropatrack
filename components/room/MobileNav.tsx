'use client';

type MobileTab = 'player' | 'queue' | 'discover' | 'chat';

interface MobileNavProps {
  activeTab: MobileTab;
  setActiveTab: (t: MobileTab) => void;
  unreadChatCount: number;
}

const TABS: { id: MobileTab; icon: string; label: string }[] = [
  { id: 'player',   icon: '▶',  label: 'Player'   },
  { id: 'queue',    icon: '≡',  label: 'Queue'    },
  { id: 'discover', icon: '⚡', label: 'Discover' },
  { id: 'chat',     icon: '💬', label: 'Chat'     },
];

export default function MobileNav({ activeTab, setActiveTab, unreadChatCount }: MobileNavProps) {
  return (
    <div
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
          onClick={() => setActiveTab(id)}
          className="col items-center"
          style={{
            flex: 1, gap: 2, padding: '8px 0', borderRadius: 12,
            border: 'none', cursor: 'pointer', position: 'relative',
            background: activeTab === id ? 'var(--accent)' : 'transparent',
            color: activeTab === id ? '#140f1f' : 'var(--ink)',
          }}
        >
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span className="mono" style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
          {id === 'chat' && unreadChatCount > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: '24%',
              minWidth: 16, height: 16, padding: '0 4px',
              borderRadius: 10, background: 'var(--pop-magenta)', color: '#fff',
              fontSize: 9, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--outline)',
            }}>
              {unreadChatCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
