'use client';

import { createContext, useContext } from 'react';
import type { Room, QueueItem, RoomUser, UserRole } from '@/lib/types';
import type { getOrCreateUser } from '@/lib/names';

type CurrentUser = ReturnType<typeof getOrCreateUser>;

export interface RoomContextValue {
  room: Room;
  queue: QueueItem[];
  users: RoomUser[];
  currentUser: CurrentUser | null;
  myRole: UserRole;
  currentSong: QueueItem | null;
  canPlayPause: boolean;
  canSeek: boolean;
  canVolume: boolean;
  canRearrange: boolean;
  canAutoSuggest: boolean;
  isSpeaker: boolean;
  duration: number;
  broadcast: (event: string, payload: Record<string, unknown>) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const RoomContext = createContext<RoomContextValue | undefined>(undefined);

export function RoomProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: RoomContextValue;
}) {
  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used within RoomProvider');
  return ctx;
}
