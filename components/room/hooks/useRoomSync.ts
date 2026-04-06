import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/names';
import type { Room, QueueItem, RoomUser, UserRole, PlaybackSyncEvent, ChatMessage } from '@/lib/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type CurrentUser = ReturnType<typeof getOrCreateUser>;

interface UseRoomSyncProps {
  initialRoom: Room;
  currentUser: CurrentUser | null;
  myRoleRef: React.RefObject<UserRole>;
  isSpeakerRef: React.RefObject<boolean>;
  playerRef: React.RefObject<unknown>;
  playerReadyRef: React.RefObject<boolean>;
  handleNextRef: React.RefObject<() => void>;
  // State setters passed down
  setRoom: React.Dispatch<React.SetStateAction<Room>>;
  setQueue: React.Dispatch<React.SetStateAction<QueueItem[]>>;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<CurrentUser | null>>;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  currentUserRef: React.RefObject<CurrentUser | null>;
  isChatVisibleRef: React.RefObject<boolean>;
  channelRef: React.RefObject<RealtimeChannel | null>;
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
  setCurrentTime,
  setCurrentUser,
  setChatMessages,
  currentUserRef,
  isChatVisibleRef,
  channelRef,
  isSpeaker,
  myRole,
  room,
}: UseRoomSyncProps) {
  const [users, setUsers] = useState<RoomUser[]>([]);

  // Main realtime channel setup
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel(`room:${initialRoom.slug}`, {
      config: { presence: { key: currentUser.user_id } },
    });

    // Broadcast: playback sync
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
      if (event.current_time !== undefined) {
        setCurrentTime(event.current_time);
      }
    });

    // Broadcast: queue update
    channel.on('broadcast', { event: 'queue_update' }, ({ payload }) => {
      if (payload.type === 'added') {
        setQueue((prev) => [...prev, payload.item as QueueItem]);
      } else if (payload.type === 'removed') {
        setQueue((prev) => prev.filter((item) => item.id !== payload.item_id));
        if (typeof payload.removed_index === 'number') {
          setRoom((prev) => {
            if (payload.removed_index < prev.current_song_index) {
              return { ...prev, current_song_index: prev.current_song_index - 1 };
            }
            return prev;
          });
        }
      }
    });

    // Broadcast: seek request (speaker only)
    channel.on('broadcast', { event: 'seek_request' }, ({ payload }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const player = playerRef.current as any;
      if (!isSpeakerRef.current || !player || !playerReadyRef.current) return;
      const time = payload.time as number;
      player.seekTo(time, true);
      setCurrentTime(time);
      channel.send({ type: 'broadcast', event: 'time_sync', payload: { time } });
    });

    // Broadcast: time sync
    channel.on('broadcast', { event: 'time_sync' }, ({ payload }) => {
      setCurrentTime(payload.time as number);
    });

    // Broadcast: volume change
    channel.on('broadcast', { event: 'volume_change' }, ({ payload }) => {
      setRoom((prev) => ({ ...prev, volume: payload.volume }));
    });

    // Broadcast: repeat toggle
    channel.on('broadcast', { event: 'repeat_toggle' }, ({ payload }) => {
      setRoom((prev) => ({ ...prev, repeat: payload.repeat as boolean }));
    });

    // Broadcast: role update
    channel.on('broadcast', { event: 'role_update' }, ({ payload }) => {
      setRoom((prev) => ({
        ...prev,
        default_role: payload.default_role,
        user_roles: payload.user_roles,
      }));
    });

    // Broadcast: username changed
    channel.on('broadcast', { event: 'username_changed' }, ({ payload }) => {
      const { user_id, old_username, new_username } = payload;

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

    // Presence: track users
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const roomUsers: RoomUser[] = [];
        for (const key in state) {
          const presences = state[key] as unknown as RoomUser[];
          if (presences.length > 0) {
            roomUsers.push(presences[presences.length - 1]);
          }
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

    // DB: room changes
    const roomSub = supabase
      .channel(`room-db:${initialRoom.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${initialRoom.id}` },
        (payload) => { setRoom((prev) => ({ ...prev, ...payload.new })); }
      )
      .subscribe();

    // DB: queue changes
    const queueSub = supabase
      .channel(`queue-db:${initialRoom.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_items', filter: `room_id=eq.${initialRoom.id}` },
        async () => {
          const { data } = await supabase
            .from('queue_items')
            .select('*')
            .eq('room_id', initialRoom.id)
            .order('position', { ascending: true });
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

  // Update presence when role/speaker/username changes
  useEffect(() => {
    if (!channelRef.current || !currentUser) return;
    const updatePresence = async () => {
      try {
        await channelRef.current?.track({
          user_id: currentUser.user_id,
          username: currentUser.username,
          avatar_color: currentUser.avatar_color,
          role: myRole,
          is_speaker: isSpeaker,
          joined_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to update presence:', err);
      }
    };
    updatePresence();
  }, [isSpeaker, myRole, currentUser?.username, currentUser?.avatar_color]); // eslint-disable-line react-hooks/exhaustive-deps

  // Room heartbeat
  useEffect(() => {
    const ping = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const player = playerRef.current as any;
      let playbackTime = 0;
      if (player && playerReadyRef.current && isSpeaker) {
        try { playbackTime = player.getCurrentTime(); } catch { /* */ }
      }
      const update: Record<string, unknown> = { last_active_at: new Date().toISOString() };
      if (isSpeaker && playbackTime > 0) update.current_playback_time = playbackTime;
      supabase.from('rooms').update(update).eq('id', initialRoom.id).then();
    };
    ping();
    const interval = setInterval(ping, 60_000);
    return () => clearInterval(interval);
  }, [isSpeaker, initialRoom.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { users };
}
