import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/names';
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

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load initial messages + subscribe
  useEffect(() => {
    if (!roomId) return;

    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/chat?room_id=${roomId}&limit=50`);
        const data = await res.json();
        if (data.messages) setChatMessages(data.messages);
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
          setChatMessages((prev) => [...prev, msg]);

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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || sendingChat || !currentUser) return;
    const messageText = chatInput.trim();
    setChatInput('');
    setSendingChat(true);
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          user_id: currentUser.user_id,
          username: currentUser.username,
          avatar_color: currentUser.avatar_color,
          message: messageText,
        }),
      });
    } catch (err) { console.error('Chat send failed:', err); }
    finally { setSendingChat(false); }
  }, [chatInput, sendingChat, currentUser, roomId]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!currentUser || uploadingImage) return;
    if (file.size > 2 * 1024 * 1024) { alert('Image too large (max 2MB)'); return; }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('room_id', roomId);
      const uploadRes = await fetch('/api/chat/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadData.url) throw new Error(uploadData.error || 'Upload failed');
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          user_id: currentUser.user_id,
          username: currentUser.username,
          avatar_color: currentUser.avatar_color,
          message: '',
          image_url: uploadData.url,
        }),
      });
    } catch (err) { console.error('Image upload failed:', err); }
    finally { setUploadingImage(false); }
  }, [currentUser, uploadingImage, roomId]);

  const handleChatPaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) handleImageUpload(file);
        return;
      }
    }
  }, [handleImageUpload]);

  return {
    chatMessages, setChatMessages,
    chatInput, setChatInput,
    sendingChat, uploadingImage,
    unreadChatCount, setUnreadChatCount,
    chatToast, setChatToast,
    previewImage, setPreviewImage,
    chatEndRef,
    handleSendChat, handleImageUpload, handleChatPaste,
    addSongToQueue,
  };
}
