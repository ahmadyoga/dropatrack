import { useState, useEffect, useRef, useCallback } from 'react';

import { supabase } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/names';
import { spawnReactions } from '../ui/spawnReactions';
import type { Room, QueueItem, RoomUser, UserRole, PlaybackSyncEvent, ChatMessage } from '@/lib/types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { setTime as setStoreTime } from './playbackTimeStore';

type CurrentUser = ReturnType<typeof getOrCreateUser>;

interface UseRoomSyncProps {
  initialRoom: Room;
  currentUser: CurrentUser | null;
  myRoleRef: React.RefObject<UserRole>;
  isSpeakerRef: React.RefObject<boolean>;
  playerRef: React.RefObject<unknown>;
  playerReadyRef: React.RefObject<boolean>;
  handleNextRef: React.RefObject<() => void>;
  setRoom: React.Dispatch<React.SetStateAction<Room>>;
  setQueue: React.Dispatch<React.SetStateAction<QueueItem[]>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<CurrentUser | null>>;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  currentUserRef: React.RefObject<CurrentUser | null>;
  isChatVisibleRef: React.RefObject<boolean>;
  isSpeaker: boolean;
  myRole: UserRole;
  room: Room;
}

export function useRoomSync({
  initialRoom,
  currentUser,
  myRoleRef,
  isSpeakerRef,
  playerRef,
  playerReadyRef,
  handleNextRef,
  setRoom,
  setQueue,
  setCurrentUser,
  setChatMessages,
  currentUserRef,
  isChatVisibleRef,
  isSpeaker,
  myRole,
  room,
}: UseRoomSyncProps) {
  const [users, setUsers] = useState<RoomUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const broadcast = useCallback((event: string, payload: Record<string, unknown>) => {
    channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel(`room:${initialRoom.slug}`, {
      config: { presence: { key: currentUser.user_id } },
    });

    channel.on('broadcast', { event: 'playback_sync' }, ({ payload }) => {
      const event = payload as PlaybackSyncEvent;
      if (event.triggered_by === currentUser.user_id) return;
      setRoom((prev) => ({
        ...prev,
        current_song_index: event.song_index,
        is_playing:
          event.type === 'play' ||
          event.type === 'next' ||
          event.type === 'prev' ||
          event.type === 'jump',
      }));
      if (event.current_time !== undefined) setStoreTime(event.current_time);
    });

    channel.on('broadcast', { event: 'queue_update' }, ({ payload }) => {
      if (payload.type === 'added') {
        setQueue((prev) => [...prev, payload.item as QueueItem]);
      } else if (payload.type === 'removed') {
        setQueue((prev) => prev.filter((item) => item.id !== payload.item_id));
        if (typeof payload.removed_index === 'number') {
          setRoom((prev) => {
            if ((payload.removed_index as number) < prev.current_song_index) {
              return { ...prev, current_song_index: prev.current_song_index - 1 };
            }
            return prev;
          });
        }
      }
    });

    channel.on('broadcast', { event: 'seek_request' }, ({ payload }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const player = playerRef.current as any;
      if (!isSpeakerRef.current || !player || !playerReadyRef.current) return;
      const time = payload.time as number;
      player.seekTo(time, true);
      setStoreTime(time);
      channel.send({ type: 'broadcast', event: 'time_sync', payload: { time } });
    });

    channel.on('broadcast', { event: 'time_sync' }, ({ payload }) => {
      setStoreTime(payload.time as number);
    });

    channel.on('broadcast', { event: 'volume_change' }, ({ payload }) => {
      setRoom((prev) => ({ ...prev, volume: payload.volume as number }));
    });

    channel.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      if (payload && typeof payload.emoji === 'string') {
        const count = Math.floor(Math.random() * 51) + 50;
        spawnReactions(payload.emoji, count);
      }
    });

    channel.on('broadcast', { event: 'repeat_toggle' }, ({ payload }) => {
      setRoom((prev) => ({ ...prev, repeat: payload.repeat as boolean }));
    });

    channel.on('broadcast', { event: 'auto_suggest_toggle' }, ({ payload }) => {
      setRoom((prev) => ({ ...prev, auto_suggest: payload.auto_suggest as boolean }));
    });

    channel.on('broadcast', { event: 'role_update' }, ({ payload }) => {
      setRoom((prev) => ({
        ...prev,
        default_role: payload.default_role as UserRole,
        user_roles: payload.user_roles as Record<string, UserRole>,
      }));
    });

    channel.on('broadcast', { event: 'username_changed' }, ({ payload }) => {
      const { user_id, old_username, new_username } = payload as {
        user_id: string; old_username: string; new_username: string;
      };
      if (currentUserRef.current?.user_id === user_id) {
        const cur = currentUserRef.current;
        if (cur && cur.username !== new_username) {
          setCurrentUser((prev) => (prev ? { ...prev, username: new_username } : null));
        }
      }
      setChatMessages((prev) => {
        const sysMsgId = `sys_rename_${user_id}_${new_username}`;
        if (prev.some((m) => m.id === sysMsgId)) return prev;
        const systemMessage: ChatMessage = {
          id: sysMsgId,
          room_id: initialRoom.id,
          user_id: 'system',
          username: 'System',
          avatar_color: '#94a3b8',
          message: `${old_username} changed their name to ${new_username}`,
          image_url: null,
          song_ref: null,
          created_at: new Date().toISOString(),
        };
        const updated = prev.map((msg) =>
          msg.user_id === user_id ? { ...msg, username: new_username } : msg
        );
        return [...updated, systemMessage];
      });
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const roomUsers: RoomUser[] = [];
        for (const key in state) {
          const presences = state[key] as unknown as RoomUser[];
          if (presences.length > 0) roomUsers.push(presences[presences.length - 1]);
        }
        setUsers(roomUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.user_id,
            username: currentUser.username,
            avatar_color: currentUser.avatar_color,
            role: myRoleRef.current,
            is_speaker: isSpeakerRef.current,
            joined_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    const roomSub = supabase
      .channel(`room-db:${initialRoom.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${initialRoom.id}` },
        (payload) => { setRoom((prev) => ({ ...prev, ...payload.new })); }
      )
      .subscribe();

    const queueSub = supabase
      .channel(`queue-db:${initialRoom.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'queue_items', filter: `room_id=eq.${initialRoom.id}` },
        async () => {
          const { data } = await supabase
            .from('queue_items')
            .select('*')
            .eq('room_id', initialRoom.id)
            .order('is_suggested', { ascending: true })
            .order('position', { ascending: true, nullsFirst: false })
            .order('suggested_position', { ascending: true, nullsFirst: false });
          if (data) setQueue(data);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      roomSub.unsubscribe();
      queueSub.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.user_id, initialRoom.slug, initialRoom.id]);

  useEffect(() => {
    if (!channelRef.current || !currentUser) return;
    channelRef.current.track({
      user_id: currentUser.user_id,
      username: currentUser.username,
      avatar_color: currentUser.avatar_color,
      role: myRole,
      is_speaker: isSpeaker,
      joined_at: new Date().toISOString(),
    }).catch(console.error);
  }, [isSpeaker, myRole, currentUser?.username, currentUser?.avatar_color]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const ping = () => {
      supabase.from('rooms')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', initialRoom.id)
        .then();
    };
    ping();
    const worker = new Worker(
      URL.createObjectURL(new Blob([
        `setInterval(() => postMessage('ping'), 25000)`,
      ], { type: 'application/javascript' }))
    );
    worker.onmessage = ping;
    return () => worker.terminate();
  }, [initialRoom.id]);

  return { users, broadcast };
}
