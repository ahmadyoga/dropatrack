'use client';

import { useRef, useState, useCallback } from 'react';
import Avatar from './ui/Avatar';
import Icon from './ui/Icon';
import { useRoom } from './RoomContext';
import type { ChatMessage } from '@/lib/types';

function relTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

interface ChatProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (s: string) => void;
  sendingChat: boolean;
  uploadingImage: boolean;
  unreadChatCount: number;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  onSendChat: (imageUrl?: string) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
  onAddSongFromChat: (youtubeId: string, title: string, artist: string, duration: string) => void;
  onPreviewImage: (url: string) => void;
  onSeen: () => void;
}

export default function Chat({
  chatMessages,
  chatInput,
  setChatInput,
  sendingChat,
  uploadingImage,
  unreadChatCount,
  chatEndRef,
  onSendChat,
  onUploadImage,
  onAddSongFromChat,
  onPreviewImage,
  onSeen,
}: ChatProps) {
  const { currentUser } = useRoom();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);

  const stageFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPendingFile(file);
      setPendingPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const clearPending = () => { setPendingFile(null); setPendingPreviewUrl(null); };

  const handleSend = async () => {
    if (!chatInput.trim() && !pendingFile) return;
    if (pendingFile) {
      const url = await onUploadImage(pendingFile);
      clearPending();
      if (url) await onSendChat(url);
      else if (chatInput.trim()) await onSendChat();
    } else {
      await onSendChat();
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) stageFile(file);
        return;
      }
    }
  };

  const busy = sendingChat || uploadingImage;

  return (
    <div
      className="pop wobble col overflow-hidden"
      style={{ flex: 1, minHeight: 0, boxShadow: '7px 7px 0 var(--shadow)' }}
      onClick={onSeen}
    >
      {/* header */}
      <div className="flex items-center justify-between" style={{ padding: '13px 15px', borderBottom: '3px solid var(--outline)', background: 'var(--panel)', flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <Icon name="chat" size={20} />
          <div className="display" style={{ fontSize: 18 }}>Chat</div>
        </div>
        {unreadChatCount > 0 && (
          <span className="chip" style={{ background: 'var(--accent)', color: '#140f1f' }}>{unreadChatCount} new</span>
        )}
      </div>

      {/* messages */}
      <div className="scroll col" style={{ flex: 1, overflowY: 'auto', padding: 14, gap: 13 }}>
        {chatMessages.length === 0 && (
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', textAlign: 'center', margin: 'auto', lineHeight: 1.7 }}>
            no messages yet —<br />say something stellar ✨
          </div>
        )}
        {chatMessages.map((msg) => (
          <Bubble
            key={msg.id}
            msg={msg}
            isMe={msg.user_id === currentUser?.user_id}
            onAddSongFromChat={onAddSongFromChat}
            onPreviewImage={onPreviewImage}
          />
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* pending image preview bar */}
      {pendingPreviewUrl && (
        <div className="flex items-center gap-2" style={{ padding: '10px 13px', borderTop: '3px solid var(--outline)', background: 'var(--panel-2)', flexShrink: 0 }}>
          <img
            src={pendingPreviewUrl}
            alt="pending"
            style={{ width: 48, height: 48, borderRadius: 9, border: '2.5px solid var(--outline)', objectFit: 'cover', flexShrink: 0 }}
          />
          <div className="mono" style={{ fontSize: 11, flex: 1, color: 'var(--ink-soft)' }}>image ready to send</div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={clearPending}
            style={{ boxShadow: 'none', border: 'none', flexShrink: 0, padding: 6 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* input row */}
      <div className="flex items-center gap-2" style={{ padding: '11px 13px', borderTop: '3px solid var(--outline)', background: 'var(--panel)', flexShrink: 0 }}>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) stageFile(e.target.files[0]); }} />
        <button
          className="btn pop-sm btn-icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          title="Attach image"
          style={{ flexShrink: 0 }}
        >
          <Icon name="image" size={19} />
        </button>
        <input
          className="field"
          style={{ flex: 1, padding: '11px 14px' }}
          placeholder="say something stellar…"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={handleKey}
          onPaste={handlePaste}
          disabled={busy}
        />
        <button
          className="btn btn-accent pop-sm btn-icon"
          onClick={handleSend}
          disabled={busy || (!chatInput.trim() && !pendingFile)}
          title="Send"
          style={{ flexShrink: 0 }}
        >
          {busy ? '…' : <Icon name="send" size={19} />}
        </button>
      </div>
    </div>
  );
}

function Bubble({ msg, isMe, onAddSongFromChat, onPreviewImage }: {
  msg: ChatMessage; isMe: boolean;
  onAddSongFromChat: (youtubeId: string, title: string, artist: string, duration: string) => void;
  onPreviewImage: (url: string) => void;
}) {
  return (
    <div className="flex items-start gap-2" style={{ flexDirection: isMe ? 'row-reverse' : 'row' }}>
      <div className="pop-sm" style={{ borderRadius: '50%', overflow: 'hidden', border: '2.5px solid var(--outline)', width: 34, height: 34, flexShrink: 0, background: 'var(--panel-2)' }}>
        <Avatar seed={msg.user_id} size={34} />
      </div>
      <div style={{ maxWidth: '76%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        <div className="flex items-center gap-1" style={{ marginBottom: 3, flexDirection: isMe ? 'row-reverse' : 'row' }}>
          <span style={{ fontWeight: 700, fontSize: 12, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isMe ? 'You' : msg.username}
          </span>
          <span className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', flexShrink: 0 }}>
            {relTime(msg.created_at)}
          </span>
        </div>

        {(msg.message || msg.image_url) && (
          <div
            className="pop-sm"
            style={{
              padding: msg.image_url && !msg.message ? 5 : '9px 12px',
              borderRadius: 13, fontSize: 14, fontWeight: 500, lineHeight: 1.4,
              background: isMe ? 'var(--accent)' : 'var(--panel-2)',
              color: isMe ? '#140f1f' : 'var(--ink)',
              wordBreak: 'break-word',
            }}
          >
            {msg.image_url && (
              <img
                src={msg.image_url}
                onClick={() => onPreviewImage(msg.image_url!)}
                style={{ display: 'block', maxWidth: 220, maxHeight: 200, borderRadius: 9, border: '2px solid var(--outline)', cursor: 'zoom-in', objectFit: 'cover' }}
                alt=""
              />
            )}
            {msg.message && <div style={{ padding: msg.image_url ? '6px 4px 2px' : 0 }}>{msg.message}</div>}
          </div>
        )}

        {msg.song_ref && (
          <div className="flex items-center gap-2 pop-sm" style={{ marginTop: 7, borderRadius: 11, padding: 8, maxWidth: 300, boxShadow: '3px 3px 0 var(--accent-2)' }}>
            <div style={{ width: 46, height: 46, borderRadius: 9, overflow: 'hidden', border: '2.5px solid var(--outline)', flexShrink: 0 }}>
              <div className="ph" style={{ width: '100%', height: '100%' }} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div className="mono" style={{ fontSize: 8, color: 'var(--ink-dim)', letterSpacing: '.1em' }}>YOUTUBE</div>
              <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.song_ref.title}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{msg.song_ref.artist} · {msg.song_ref.duration}</div>
            </div>
            <button
              className="btn btn-accent btn-icon pop-sm"
              onClick={() => onAddSongFromChat(msg.song_ref!.youtube_id, msg.song_ref!.title, msg.song_ref!.artist, msg.song_ref!.duration)}
              style={{ flexShrink: 0, padding: 8 }}
            >+</button>
          </div>
        )}
      </div>
    </div>
  );
}
