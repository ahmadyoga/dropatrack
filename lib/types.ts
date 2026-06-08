// Shared TypeScript types for DropATrack

export interface Room {
  id: string;
  slug: string;
  name: string;
  created_by: string | null;
  current_song_index: number;
  current_playback_time: number;
  playback_updated_at: string | null;
  volume: number;
  is_playing: boolean;
  is_public: boolean;
  repeat: boolean;
  auto_suggest: boolean;
  default_role: UserRole;
  user_roles: Record<string, UserRole>;
  created_at: string;
  updated_at: string;
}

export interface QueueItem {
  id: string;
  room_id: string;
  youtube_id: string;
  title: string;
  thumbnail_url: string | null;
  duration_seconds: number;
  added_by: string;
  position: number;
  played: boolean;
  is_suggested: boolean;
  suggested_position: number | null;
  created_at: string;
}

export interface YouTubeSearchResult {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  duration: string;
  durationSeconds: number;
}

export type UserRole = 'admin' | 'moderator' | 'dj';

export interface RoomUser {
  user_id: string;
  username: string;
  avatar_color: string;
  role: UserRole;
  is_speaker: boolean;
  joined_at: string;
}

export interface PlaybackSyncEvent {
  type: 'play' | 'pause' | 'next' | 'prev' | 'jump';
  song_index: number;
  triggered_by: string;
  current_time?: number;
}

export interface SongAddedEvent {
  type: 'song_added';
  item: QueueItem;
  triggered_by: string;
}

export interface TrendingVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  duration: string;
  durationSeconds: number;
  viewCount: number;
  publishedAt: string;
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  itemCount: number;
  publishedAt: string;
}

export interface ChatSongRef {
  youtube_id: string;
  title: string;
  artist: string;
  duration: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  avatar_color: string;
  message: string;
  image_url: string | null;
  song_ref: ChatSongRef | null;
  type?: string;
  payload?: any;
  created_at: string;
}

// ─── Minesweeper game types ───────────────────────────────────────────────────

export type Level = 'easy' | 'medium' | 'hard';

export const LEVEL_CONFIG: Record<Level, { rows: number; cols: number; mines: number; label: string }> = {
  easy:   { rows: 9,  cols: 9,  mines: 10, label: 'Easy'   },
  medium: { rows: 16, cols: 16, mines: 40, label: 'Medium'  },
  hard:   { rows: 16, cols: 30, mines: 99, label: 'Hard'    },
};

export type CellState = 'unrevealed' | 'revealed' | 'flagged' | 'mine';

export interface Cell {
  state: CellState;
  adjacentMines: number;
  isMine: boolean;
}

export type Board = Cell[][];

export interface UserPresence {
  user_id: string;
  username: string;
}

export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface GameSession {
  id: string;
  room_id: string;
  chat_message_id?: string;
  level: Level;
  status: GameStatus;
  host_id: string;
  host_username: string;
  players: string[];           // ordered turn list (user_ids)
  current_turn_index: number;
  board?: Board;               // sent when game starts
  winner_id?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface GameMove {
  id: string;
  game_session_id: string;
  user_id: string;
  row: number;
  col: number;
  action: 'reveal' | 'flag' | 'chord';
  created_at: string;
}
