'use client';

interface MobileNavProps {
  mobileTab: 'main' | 'queue' | 'chat';
  setMobileTab: (tab: 'main' | 'queue' | 'chat') => void;
  unreadChatCount: number;
  setUnreadChatCount: (n: number) => void;
}

export default function MobileNav({
  mobileTab,
  setMobileTab,
  unreadChatCount,
  setUnreadChatCount,
}: MobileNavProps) {
  return (
    <div className="mobile-nav">
      <button className={`mn-btn ${mobileTab === 'main' ? 'active' : ''}`} onClick={() => setMobileTab('main')}>
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
        <span>Home</span>
      </button>
      <button
        className={`mn-btn ${mobileTab === 'chat' ? 'active' : ''}`}
        onClick={() => {
          setMobileTab('chat');
          setUnreadChatCount(0);
          if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => { });
          }
        }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
        <span>Room</span>
        {unreadChatCount > 0 && (
          <span className="chat-badge">{unreadChatCount > 99 ? '99+' : unreadChatCount}</span>
        )}
      </button>
      <button className={`mn-btn ${mobileTab === 'queue' ? 'active' : ''}`} onClick={() => setMobileTab('queue')}>
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" /></svg>
        <span>Playlist</span>
      </button>
    </div>
  );
}
