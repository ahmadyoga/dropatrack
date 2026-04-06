import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser, updateLocalUsername } from '@/lib/names';
import type { Room, UserRole } from '@/lib/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type CurrentUser = ReturnType<typeof getOrCreateUser>;

interface UseIdentityProps {
  initialRoom: Room;
  room: Room;
  channelRef: React.RefObject<RealtimeChannel | null>;
  onShowExtensionPopup: () => void;
  onUpdateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
}

export function useIdentity({
  initialRoom,
  room,
  channelRef,
  onShowExtensionPopup,
  onUpdateUserRole,
}: UseIdentityProps) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [myRole, setMyRole] = useState<UserRole>('dj');
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  const currentUserRef = useRef<CurrentUser | null>(null);
  const myRoleRef = useRef<UserRole>('dj');

  // Keep refs in sync
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { myRoleRef.current = myRole; }, [myRole]);

  // Initialize user identity from localStorage
  useEffect(() => {
    const user = getOrCreateUser();
    setCurrentUser(user);

    if (user?.isNew) {
      onShowExtensionPopup();
    }

    // Resolve role
    const userRoles = initialRoom.user_roles || {};
    const defaultRole = initialRoom.default_role || 'dj';

    if (user && userRoles[user.user_id]) {
      setMyRole(userRoles[user.user_id]);
    } else if (user && initialRoom.created_by === user.username) {
      setMyRole('admin');
    } else if (user && Object.keys(userRoles).length === 0 && initialRoom.created_by === 'system') {
      // First joiner auto-becomes admin
      setMyRole('admin');
      const claimedRoles = { [user.user_id]: 'admin' as UserRole };
      supabase
        .from('rooms')
        .update({ user_roles: claimedRoles, created_by: user.username })
        .eq('id', initialRoom.id)
        .then();
    } else {
      setMyRole(defaultRole as UserRole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRoom.slug]);

  // Re-resolve role when room settings change (admin updated roles)
  useEffect(() => {
    if (!currentUser) return;
    const userRoles = room.user_roles || {};
    const defaultRole = room.default_role || 'dj';
    if (userRoles[currentUser.user_id]) {
      setMyRole(userRoles[currentUser.user_id]);
    } else if (room.created_by === currentUser.username) {
      setMyRole('admin');
    } else {
      setMyRole(defaultRole as UserRole);
    }
  }, [room.user_roles, room.default_role, room.created_by, currentUser]);

  // ?r=admin backdoor
  useEffect(() => {
    if (!currentUser) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('r') === 'admin') {
      const currentRole = room.user_roles?.[currentUser.user_id];
      if (currentRole !== 'admin') {
        onUpdateUserRole(currentUser.user_id, 'admin');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [currentUser, room.user_roles, onUpdateUserRole]);

  const handleUsernameChange = useCallback(async () => {
    if (!currentUser) return;
    const trimmed = newUsername.trim();
    if (!trimmed || trimmed === currentUser.username) {
      setEditingUsername(false);
      return;
    }

    const oldUsername = currentUser.username;
    const updated = updateLocalUsername(trimmed);
    if (updated) {
      setCurrentUser(updated);
      channelRef.current?.send({
        type: 'broadcast',
        event: 'username_changed',
        payload: {
          user_id: currentUser.user_id,
          old_username: oldUsername,
          new_username: trimmed,
        },
      });
    }
    setEditingUsername(false);
  }, [currentUser, newUsername, channelRef]);

  return {
    currentUser,
    setCurrentUser,
    currentUserRef,
    myRole,
    myRoleRef,
    editingUsername,
    setEditingUsername,
    newUsername,
    setNewUsername,
    handleUsernameChange,
  };
}
