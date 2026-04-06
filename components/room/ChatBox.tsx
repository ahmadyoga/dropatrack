'use client';

import type { ChatMessage, QueueItem } from '@/lib/types';
import { getOrCreateUser } from '@/lib/names';

type CurrentUser = ReturnType<typeof getOrCreateUser>;

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface ChatBoxProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  sendingChat: boolean;
  uploadingImage: boolean;
  currentUser: CurrentUser | null;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  onSendChat: (e?: React.FormEvent) => void;
  onChatPaste: (e: React.ClipboardEvent) => void;
  onAddSongFromChat: (youtubeId: string, title: string, artist: string, duration: string) => void;
  onPreviewImage: (url: string) => void;
}

export default function ChatBox({
  chatMessages, chatInput, setChatInput, sendingChat, uploadingImage,
  currentUser, chatEndRef,
  onSendChat, onChatPaste, onAddSongFromChat, onPreviewImage,
}: ChatBoxProps) {
  return (
    <>
      <div className="chat-messages">
        {chatMessages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 11, color: 'var(--theme-text-muted)' }}>
            No messages yet. Say hi! 👋
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isOwn = msg.user_id === currentUser?.user_id;
            return (
              <div key={msg.id} className={`chat-msg ${isOwn ? 'own' : ''}`}>
                <div className="cm-av" style={{ background: msg.avatar_color }}>
                  {msg.username.charAt(0).toUpperCase()}
                </div>
                <div className="cm-body">
                  <div className="cm-name">
                    {isOwn ? 'You' : msg.username}
                    <span className="cm-time">{timeAgo(msg.created_at)}</span>
                  </div>
                  {msg.image_url && (
                    <div className="cm-image-wrap">
                      <img
                        src={msg.image_url}
                        alt="chat image"
                        className="cm-image"
                        loading="lazy"
                        onClick={() => onPreviewImage(msg.image_url!)}
                      />
                    </div>
                  )}
                  {msg.message && <div className={`cm-bubble ${isOwn ? 'own' : ''}`}>{msg.message}</div>}
                  {msg.song_ref && (
                    <div
                      className="cm-song"
                      onClick={() => onAddSongFromChat(
                        msg.song_ref!.youtube_id,
                        msg.song_ref!.title,
                        msg.song_ref!.artist,
                        msg.song_ref!.duration
                      )}
                    >
                      <div className="cm-song-thumb">🎵</div>
                      <div className="cm-song-info">
                        <div className="cm-song-title">{msg.song_ref.title}</div>
                        <div className="cm-song-meta">{msg.song_ref.artist} · {msg.song_ref.duration}</div>
                      </div>
                      <span className="cm-song-add">+</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>
      {uploadingImage && (
        <div className="cm-uploading">
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Uploading image…
        </div>
      )}
      <form className="chat-input-wrap" onSubmit={onSendChat}>
        <input
          className="chat-input"
          type="text"
          placeholder={uploadingImage ? 'Uploading...' : 'Say something... (paste image)'}
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onPaste={onChatPaste}
          disabled={sendingChat || uploadingImage}
          maxLength={500}
        />
        <button className="send-btn" type="submit" disabled={sendingChat || uploadingImage || !chatInput.trim()}>
          <svg viewBox="0 0 24 24" fill="white"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" /></svg>
        </button>
      </form>
    </>
  );
}
