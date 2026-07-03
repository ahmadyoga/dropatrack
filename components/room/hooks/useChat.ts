import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

import { getOrCreateUser } from '@/lib/names';
import { mergeOlderChatMessages } from '@/lib/chatPaging';
import type { ChatMessage } from '@/lib/types';

type CurrentUser = ReturnType<typeof getOrCreateUser>;

interface UseChatProps {
  roomId: string;
  currentUser: CurrentUser | null;
  currentUserRef: React.RefObject<CurrentUser | null>;
  addSongToQueue: (youtubeId: string, title: string, thumbnail: string, durationSeconds: number) => Promise<void>;
  isChatVisibleRef: React.RefObject<boolean>;
}

export function useChat({
  roomId,
  currentUser,
  currentUserRef,
  addSongToQueue,
  isChatVisibleRef,
}: UseChatProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatToast, setChatToast] = useState<{ username: string; message: string; color: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [loadingOlderChat, setLoadingOlderChat] = useState(false);
  const [hasOlderChat, setHasOlderChat] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialChatLoadedRef = useRef(false);

  // Load initial messages + subscribe
  useEffect(() => {
    if (!roomId) return;

    const loadMessages = async () => {
      try {
        initialChatLoadedRef.current = false;
        const res = await fetch(`/api/chat?${new URLSearchParams({ room_id: roomId, limit: '50' })}`);
        const data = await res.json();
        if (data.messages) {
          setChatMessages(data.messages);
          setHasOlderChat(Boolean(data.has_more));
        }
      } catch (err) { console.error('Chat load failed:', err); }
    };
    loadMessages();

    const chatChannel = supabase
      .channel(`chat-db:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setChatMessages((prev) => prev.some((old) => old.id === msg.id) ? prev : [...prev, msg]);

          if (msg.user_id === currentUserRef.current?.user_id) return;

          if (!isChatVisibleRef.current) {
            setUnreadChatCount((prev) => prev + 1);

            if (chatToastTimerRef.current) clearTimeout(chatToastTimerRef.current);
            setChatToast({
              username: msg.username,
              message: msg.image_url
                ? '📷 Sent an image'
                : (msg.message.length > 60 ? msg.message.slice(0, 60) + '…' : msg.message),
              color: msg.avatar_color || '#6366f1',
            });
            chatToastTimerRef.current = setTimeout(() => setChatToast(null), 4000);

            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              try {
                new Notification(msg.username, {
                  body: msg.message.length > 80 ? msg.message.slice(0, 80) + '…' : msg.message,
                  icon: '/favicon.ico',
                  tag: 'dropatrack-chat',
                  silent: false,
                });
              } catch { /* not supported */ }
            }
          }
        }
      )
      .subscribe();

    return () => { chatChannel.unsubscribe(); };
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOlderChat = useCallback(async () => {
    const before = chatMessages[0]?.created_at;
    if (!before || loadingOlderChat || !hasOlderChat) return;
    setLoadingOlderChat(true);
    try {
      const res = await fetch(`/api/chat?${new URLSearchParams({ room_id: roomId, limit: '50', before })}`);
      const data = await res.json();
      if (data.messages) {
        setChatMessages((prev) => mergeOlderChatMessages(data.messages, prev));
        setHasOlderChat(Boolean(data.has_more));
      }
    } catch (err) { console.error('Older chat load failed:', err); }
    finally { setLoadingOlderChat(false); }
  }, [chatMessages, hasOlderChat, loadingOlderChat, roomId]);

  // Auto-scroll to bottom on initial load and new messages, not older-page prepends.
  useEffect(() => {
    if (chatEndRef.current) {
      const parent = chatEndRef.current.parentElement;
      if (parent) {
        const isInitialLoad = !initialChatLoadedRef.current;
        const nearBottom = parent.scrollHeight - parent.scrollTop - parent.clientHeight < 80;
        if (isInitialLoad || nearBottom) {
          parent.scrollTo({ top: parent.scrollHeight, behavior: isInitialLoad ? 'auto' : 'smooth' });
          initialChatLoadedRef.current = true;
        }
      }
    }
  }, [chatMessages]);

  const handleSendChat = useCallback(async (imageUrl?: string, type?: string, payload?: unknown) => {
    const messageText = chatInput.trim();
    if (!messageText && !imageUrl && !type) return;
    if (sendingChat || !currentUser) return;
    if (!type) setChatInput('');
    setSendingChat(true);
    const activeReply = type ? null : replyTo;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          user_id: currentUser.user_id,
          username: currentUser.username,
          avatar_color: currentUser.avatar_color,
          message: messageText,
          ...(imageUrl ? { image_url: imageUrl } : {}),
          ...(type ? { type } : {}),
          ...(payload ? { payload } : {}),
          ...(activeReply ? {
            reply_to_id: activeReply.id,
            reply_snippet: {
              username: activeReply.username,
              message: activeReply.message,
              image_url: activeReply.image_url,
            },
          } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Chat send error:', res.status, err);
        // Room was deleted (stale page) — hard reload to re-create it
        if (res.status === 500 && err?.detail?.includes('foreign key')) {
          window.location.reload();
        }
      }
      if (activeReply) setReplyTo(null);
    } catch (err) { console.error('Chat send failed:', err); }
    finally { setSendingChat(false); }
  }, [chatInput, sendingChat, currentUser, roomId, replyTo]);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!currentUser || uploadingImage) return null;
    if (file.size > 2 * 1024 * 1024) { alert('Image too large (max 2MB)'); return null; }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('room_id', roomId);
      const res = await fetch('/api/chat/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.url) throw new Error(data.error || 'Upload failed');
      return data.url as string;
    } catch (err) { console.error('Image upload failed:', err); return null; }
    finally { setUploadingImage(false); }
  }, [currentUser, uploadingImage, roomId]);

  return {
    chatMessages, setChatMessages,
    chatInput, setChatInput,
    sendingChat, uploadingImage,
    unreadChatCount, setUnreadChatCount,
    chatToast, setChatToast,
    previewImage, setPreviewImage,
    replyTo, setReplyTo,
    chatEndRef,
    loadingOlderChat, hasOlderChat, loadOlderChat,
    handleSendChat, uploadImage,
    addSongToQueue,
  };
}
