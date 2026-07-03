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

export interface ChatReplySnippet {
  username: string;
  message: string;
  image_url: string | null;
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
  type?: string | null;
  payload?: unknown;
  reply_to_id?: string | null;
  reply_snippet?: ChatReplySnippet | null;
  created_at: string;
}

export type Level = 'easy' | 'medium' | 'hard';

export const LEVEL_CONFIG: Record<Level, { rows: number; cols: number; mines: number; label: string }> = {
  easy:   { rows: 8,  cols: 8,  mines: 10, label: 'Easy' },
  medium: { rows: 12, cols: 12, mines: 20, label: 'Medium' },
  hard:   { rows: 16, cols: 16, mines: 40, label: 'Hard' },
};

export interface GameSession {
  id: string;
  room_id: string;
  level: Level;
  status: 'active' | 'finished' | 'waiting' | 'playing';
  host_id: string;
  host_username: string;
  players: string[];
  player_usernames: Record<string, string>; // user_id -> username
  current_turn_index: number;
  board: Board | null;
  winner_id: string | null;
  loser_id?: string | null;
  match_id?: string | null;
  match_number?: number;
  current_turn_started_at?: string | null;
  scores?: GamePlayerScore[];
  chat_message_id: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface GamePlayerScore {
  user_id: string;
  username?: string;
  wins: number;
  losses: number;
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
  avatar_color?: string;
  role?: string;
  is_speaker?: boolean;
}

export interface SessionRow {
  id: string;
  music_room_id: string;
  difficulty: Level;
  status: 'active' | 'finished';
  created_by: string;
  created_at: string;
  last_active_at: string;
  finished_at: string | null;
}

export interface PlayerRow extends GamePlayerScore {
  id: string;
  session_id: string;
  username: string;
  joined_at: string;
}

export interface MatchRow {
  id: string;
  session_id: string;
  match_number: number;
  status: 'playing' | 'finished';
  loser_user_id: string | null;
  started_at: string;
  current_turn_started_at: string;
  finished_at: string | null;
}

export interface TurnRow {
  id: string;
  match_id: string;
  user_id: string;
  turn_order: number;
  is_current: boolean;
}

export interface CellRow {
  id: string;
  match_id: string;
  x: number;
  y: number;
  is_mine: boolean;
  is_opened: boolean;
  is_flagged?: boolean;
  adjacent_count: number;
  opened_by: string | null;
  opened_at: string | null;
}
