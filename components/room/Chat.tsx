'use client';

import { useRef, useState, useCallback } from 'react';
import Avatar from './ui/Avatar';
import Icon from './ui/Icon';
import GameInviteMessage from './game/GameInviteMessage';
import { useRoom } from './RoomContext';
import type { ChatMessage, GameSession } from '@/lib/types';

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
  loadingOlderChat: boolean;
  hasOlderChat: boolean;
  onLoadOlderChat: () => Promise<void>;
  onSendChat: (imageUrl?: string, type?: string, payload?: unknown) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
  onAddSongFromChat: (youtubeId: string, title: string, artist: string, duration: string) => void;
  onPreviewImage: (url: string) => void;
  onSeen: () => void;
  onCreateGame: (gameType: 'minesweeper' | 'sudoku') => void;
  onJoinGame: (sessionId: string) => void;
  activeSession?: GameSession | null;
  replyTo: ChatMessage | null;
  setReplyTo: (msg: ChatMessage | null) => void;
}

function isGameSummaryPayload(payload: unknown): payload is {
  game_type?: 'minesweeper' | 'sudoku';
  scores: Array<{ user_id: string; username?: string; wins: number; losses: number }>;
} {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    'scores' in payload &&
    Array.isArray((payload as { scores?: unknown }).scores)
  );
}

function isGameInvitePayload(payload: unknown): payload is GameSession {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    'id' in payload &&
    'level' in payload &&
    'players' in payload
  );
}

export default function Chat({
  chatMessages,
  chatInput,
  setChatInput,
  sendingChat,
  uploadingImage,
  unreadChatCount,
  chatEndRef,
  loadingOlderChat,
  hasOlderChat,
  onLoadOlderChat,
  onSendChat,
  onUploadImage,
  onAddSongFromChat,
  onPreviewImage,
  onSeen,
  onCreateGame,
  onJoinGame,
  activeSession,
  replyTo,
  setReplyTo,
}: ChatProps) {
  const { currentUser } = useRoom();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightedElRef = useRef<HTMLElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [showGameMenu, setShowGameMenu] = useState(false);

  const stageFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPendingFile(file);
      setPendingPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const clearPending = () => { setPendingFile(null); setPendingPreviewUrl(null); };

  const jumpToMessage = useCallback((id: string) => {
    const el = document.getElementById(`chat-msg-${id}`);
    if (!el) return; // not loaded — silent no-op per design
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightedElRef.current?.classList.remove('chat-msg-highlight');
    el.classList.add('chat-msg-highlight');
    highlightedElRef.current = el;
    highlightTimerRef.current = setTimeout(() => el.classList.remove('chat-msg-highlight'), 1200);
  }, []);

  const handleSend = async () => {
    if (!chatInput.trim() && !pendingFile) return;
    if (chatInput.trim().toLowerCase() === '/game') {
      setChatInput('');
      setShowGameMenu(true);
      return;
    }
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
  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop > 0 || loadingOlderChat || !hasOlderChat) return;
    const oldHeight = el.scrollHeight;
    await onLoadOlderChat();
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - oldHeight; });
  };

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
      <div className="scroll col" onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: 14, gap: 13 }}>
        {loadingOlderChat && (
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)', textAlign: 'center' }}>loading…</div>
        )}
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
            onJoinGame={onJoinGame}
            activeSession={activeSession}
            onReply={setReplyTo}
            onJumpToMessage={jumpToMessage}
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

      {replyTo && (
        <div className="flex items-center gap-2" style={{ padding: '10px 13px', borderTop: '3px solid var(--outline)', background: 'var(--panel-2)', flexShrink: 0 }}>
          <div style={{ width: 3, alignSelf: 'stretch', background: 'var(--accent)', borderRadius: 2, flexShrink: 0 }} />
          <div className="col" style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 11 }}>{replyTo.username}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {replyTo.image_url && !replyTo.message ? '📷 Photo' : replyTo.message}
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setReplyTo(null)}
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
        <button
          className="btn pop-sm btn-icon"
          onClick={() => setShowGameMenu((open) => !open)}
          disabled={busy}
          title="Games"
          style={{ flexShrink: 0 }}
        >
          <Icon name="gamepad" size={19} />
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

      {showGameMenu && (
        <div
          className="scrim"
          style={{ zIndex: 900 }}
          onClick={() => setShowGameMenu(false)}
        >
          <div
            className="pop wobble-2 col popin"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(340px, 92vw)', overflow: 'hidden', boxShadow: '9px 9px 0 var(--shadow)' }}
          >
            <div className="flex items-center justify-between" style={{ padding: '14px 16px', borderBottom: '3px solid var(--outline)', background: 'var(--panel-2)' }}>
              <div className="display" style={{ fontSize: 18 }}>Games</div>
              <button className="btn btn-icon pop-sm" onClick={() => setShowGameMenu(false)} style={{ boxShadow: 'none' }}>✕</button>
            </div>
            <button
              className="flex items-center gap-3"
              onClick={() => {
                setShowGameMenu(false);
                onCreateGame('minesweeper');
              }}
              style={{
                padding: '16px',
                background: 'var(--panel)',
                border: 0,
                borderBottom: '3px solid var(--outline)',
                cursor: 'pointer',
                color: 'var(--ink)',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 24 }}>💣</span>
              <span className="col" style={{ gap: 2 }}>
                <span style={{ fontWeight: 800 }}>Minesweeper</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>Multiplayer mine hunt</span>
              </span>
            </button>
            <button
              className="flex items-center gap-3"
              onClick={() => {
                setShowGameMenu(false);
                onCreateGame('sudoku');
              }}
              style={{
                padding: '16px',
                background: 'var(--panel)',
                border: 0,
                cursor: 'pointer',
                color: 'var(--ink)',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 24 }}>🔢</span>
              <span className="col" style={{ gap: 2 }}>
                <span style={{ fontWeight: 800 }}>Sudoku Race</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>First correct fill wins the cell</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({ msg, isMe, onAddSongFromChat, onPreviewImage, onJoinGame, activeSession, onReply, onJumpToMessage }: {
  msg: ChatMessage; isMe: boolean;
  onAddSongFromChat: (youtubeId: string, title: string, artist: string, duration: string) => void;
  onPreviewImage: (url: string) => void;
  onJoinGame: (sessionId: string) => void;
  activeSession?: GameSession | null;
  onReply: (msg: ChatMessage) => void;
  onJumpToMessage: (id: string) => void;
}) {
  const { currentUser } = useRoom();
  const canReply = msg.type !== 'game_invite' && msg.type !== 'game_summary';
  return (
    <div id={`chat-msg-${msg.id}`} className="flex items-start gap-2 chat-bubble-row" style={{ flexDirection: isMe ? 'row-reverse' : 'row' }}>
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
          {canReply && (
            <button
              className="btn btn-ghost btn-icon chat-reply-trigger"
              onClick={() => onReply(msg)}
              title="Reply"
              style={{ boxShadow: 'none', border: 'none', padding: 3, flexShrink: 0 }}
            >
              <Icon name="reply" size={13} />
            </button>
          )}
        </div>

        {msg.reply_snippet && msg.reply_to_id && (
          <div
            onClick={() => onJumpToMessage(msg.reply_to_id!)}
            className="mono"
            style={{
              cursor: 'pointer',
              fontSize: 10,
              color: 'var(--ink-dim)',
              borderLeft: '3px solid var(--accent)',
              padding: '3px 8px',
              marginBottom: 3,
              maxWidth: 220,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <strong>{msg.reply_snippet.username}</strong>{' '}
            {msg.reply_snippet.image_url && !msg.reply_snippet.message ? '📷 Photo' : msg.reply_snippet.message}
          </div>
        )}

        {msg.type === 'game_invite' && isGameInvitePayload(msg.payload) && (
          <GameInviteMessage
            session={activeSession?.id === msg.payload.id ? activeSession : msg.payload}
            onJoin={onJoinGame} 
            currentUserId={currentUser?.user_id || ''} 
          />
        )}

        {msg.type === 'game_summary' && (
          <div
            className="pop-sm col"
            style={{
              marginTop: 7,
              borderRadius: 13,
              padding: '12px 14px',
              background: 'var(--panel)',
              border: '2.5px solid var(--outline)',
              boxShadow: '4px 4px 0 var(--shadow)',
              width: '100%',
              maxWidth: 320,
              gap: 8,
            }}
          >
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 22 }}>
                {isGameSummaryPayload(msg.payload) && msg.payload.game_type === 'sudoku' ? '🔢' : '💣'}
              </span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>
                  {isGameSummaryPayload(msg.payload) && msg.payload.game_type === 'sudoku' ? 'Sudoku Race Finished' : 'Minesweeper Finished'}
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>Final Score</div>
              </div>
            </div>
            {(isGameSummaryPayload(msg.payload) ? msg.payload.scores : []).map((score) => (
              <div key={score.user_id} className="flex items-center gap-2 mono" style={{ fontSize: 11 }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{score.username ?? score.user_id}</span>
                <span>{score.wins} wins</span>
                <span>{score.losses} losses</span>
              </div>
            ))}
          </div>
        )}

        {(msg.message || msg.image_url) && msg.type !== 'game_invite' && msg.type !== 'game_summary' && (
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
