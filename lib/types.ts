// Shared TypeScript types for DropATrack

export interface Room {
  id: string;
  slug: string;
  name: string;
  created_by: string | null;
  current_song_index: number;
  current_playback_time: number;
  volume: number;
  is_playing: boolean;
  is_public: boolean;
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

export type UserRole = 'admin' | 'moderator' | 'dj' | 'listener';

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
  song_ref: ChatSongRef | null;
  created_at: string;
}
