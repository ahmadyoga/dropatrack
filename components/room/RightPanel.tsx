'use client';

import type { RoomUser, UserRole, ChatMessage } from '@/lib/types';
import type { Room } from '@/lib/types';
import { getOrCreateUser } from '@/lib/names';
import UserList from './UserList';
import ChatBox from './ChatBox';

type CurrentUser = ReturnType<typeof getOrCreateUser>;

interface RightPanelProps {
  activeTab: 'users' | 'chat';
  setActiveTab: (tab: 'users' | 'chat') => void;
  unreadChatCount: number;
  setUnreadChatCount: (n: number) => void;
  // Users panel props
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
  // Chat panel props
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  sendingChat: boolean;
  uploadingImage: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  onSendChat: (e?: React.FormEvent) => void;
  onChatPaste: (e: React.ClipboardEvent) => void;
  onAddSongFromChat: (youtubeId: string, title: string, artist: string, duration: string) => void;
  onPreviewImage: (url: string) => void;
}

export default function RightPanel({
  activeTab, setActiveTab, unreadChatCount, setUnreadChatCount,
  users, currentUser, room, myRole,
  editingUsername, newUsername, setNewUsername, setEditingUsername,
  roleMenuUserId, setRoleMenuUserId, onUsernameChange, onUpdateUserRole,
  chatMessages, chatInput, setChatInput, sendingChat, uploadingImage,
  chatEndRef, onSendChat, onChatPaste, onAddSongFromChat, onPreviewImage,
}: RightPanelProps) {
  return (
    <aside className="right-panel">
      <div className="rp-tabs">
        <div
          className={`rp-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </div>
        <div
          className={`rp-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('chat');
            setUnreadChatCount(0);
            if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
              Notification.requestPermission().catch(() => { });
            }
          }}
        >
          Chat
          {unreadChatCount > 0 && (
            <span className="chat-badge">{unreadChatCount > 99 ? '99+' : unreadChatCount}</span>
          )}
        </div>
      </div>

      <div className={`users-panel ${activeTab !== 'users' ? 'hidden' : ''}`}>
        <UserList
          users={users}
          currentUser={currentUser}
          room={room}
          myRole={myRole}
          editingUsername={editingUsername}
          newUsername={newUsername}
          setNewUsername={setNewUsername}
          setEditingUsername={setEditingUsername}
          roleMenuUserId={roleMenuUserId}
          setRoleMenuUserId={setRoleMenuUserId}
          onUsernameChange={onUsernameChange}
          onUpdateUserRole={onUpdateUserRole}
        />
      </div>

      <div className={`chat-panel ${activeTab !== 'chat' ? 'hidden' : ''}`}>
        <ChatBox
          chatMessages={chatMessages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          sendingChat={sendingChat}
          uploadingImage={uploadingImage}
          currentUser={currentUser}
          chatEndRef={chatEndRef}
          onSendChat={onSendChat}
          onChatPaste={onChatPaste}
          onAddSongFromChat={onAddSongFromChat}
          onPreviewImage={onPreviewImage}
        />
      </div>
    </aside>
  );
}
