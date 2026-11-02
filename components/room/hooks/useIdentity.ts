import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateUser, updateLocalUsername } from '@/lib/names';
import type { Room, UserRole } from '@/lib/types';

type CurrentUser = ReturnType<typeof getOrCreateUser>;

interface UseIdentityProps {
  initialRoom: Room;
  room: Room;
  broadcast: (event: string, payload: Record<string, unknown>) => void;
  onShowExtensionPopup: () => void;
}

/**
 * Legacy fallback: rooms created before creators were stored in user_roles only
 * know the creator by username. Honour that ONLY while the room has no admin at
 * all, otherwise renaming yourself to the creator's name would grant admin.
 */
function isLegacyCreator(room: Room, username: string | undefined): boolean {
  const roles = room.user_roles || {};
  const hasAdmin = Object.values(roles).includes('admin');
  return !hasAdmin && !!username && room.created_by === username;
}

export function useIdentity({
  initialRoom,
  room,
  broadcast,
  onShowExtensionPopup,
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
    } else if (user && isLegacyCreator(initialRoom, user.username)) {
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
    } else if (isLegacyCreator(room, currentUser.username)) {
      setMyRole('admin');
    } else {
      setMyRole(defaultRole as UserRole);
    }
  }, [room, currentUser]); // setMyRole bails out when the role is unchanged


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
      broadcast('username_changed', {
        user_id: currentUser.user_id,
        old_username: oldUsername,
        new_username: trimmed,
      });
    }
    setEditingUsername(false);
  }, [currentUser, newUsername, broadcast]);

  const renameSelf = useCallback((name: string) => {
    if (!currentUser) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentUser.username) return;
    const oldUsername = currentUser.username;
    const updated = updateLocalUsername(trimmed);
    if (updated) {
      setCurrentUser(updated);
      broadcast('username_changed', {
        user_id: currentUser.user_id,
        old_username: oldUsername,
        new_username: trimmed,
      });
    }
  }, [currentUser, broadcast]);

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
    renameSelf,
  };
}
