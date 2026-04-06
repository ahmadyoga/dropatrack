import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { extractYouTubeId } from '@/lib/youtube';
import { getOrCreateUser } from '@/lib/names';
import type { Room, QueueItem, PlaybackSyncEvent } from '@/lib/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type CurrentUser = ReturnType<typeof getOrCreateUser>;

interface UseQueueProps {
  room: Room;
  roomRef: React.RefObject<Room>;
  queue: QueueItem[];
  queueRef: React.RefObject<QueueItem[]>;
  setQueue: React.Dispatch<React.SetStateAction<QueueItem[]>>;
  setRoom: React.Dispatch<React.SetStateAction<Room>>;
  currentUser: CurrentUser | null;
  canAddSongs: boolean;
  canPlayPause: boolean;
  channelRef: React.RefObject<RealtimeChannel | null>;
  broadcastPlayback: (type: PlaybackSyncEvent['type'], songIndex: number) => void;
}

export function useQueue({
  room,
  roomRef,
  queue,
  queueRef,
  setQueue,
  setRoom,
  currentUser,
  canAddSongs,
  canPlayPause,
  channelRef,
  broadcastPlayback,
}: UseQueueProps) {
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: string; title: string; thumbnail: string; channelTitle: string;
    duration: string; durationSeconds: number;
  }>>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [addingUrl, setAddingUrl] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const [searchMatchIndices, setSearchMatchIndices] = useState<number[]>([]);
  const [searchMatchCurrentIdx, setSearchMatchCurrentIdx] = useState(0);
  const dragItemRef = useRef<number | null>(null);

  // Debounced queue search
  useEffect(() => {
    const delay = setTimeout(() => {
      if (queueSearchQuery.trim().length === 0) {
        setSearchMatchIndices([]);
        setSearchMatchCurrentIdx(0);
        return;
      }
      const q = queueSearchQuery.toLowerCase();
      const matches = queue
        .map((item, index) => ({ item, index }))
        .filter(({ item }) =>
          item.title.toLowerCase().includes(q) ||
          (item.added_by && item.added_by.toLowerCase().includes(q))
        )
        .map((m) => m.index);
      setSearchMatchIndices(matches);
      setSearchMatchCurrentIdx(0);
      if (matches.length > 0) {
        const el = document.getElementById(`q-item-${matches[0]}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [queueSearchQuery, queue]);

  const addSongToQueue = useCallback(async (
    youtubeId: string,
    title: string,
    thumbnail: string,
    durationSeconds: number
  ) => {
    if (!currentUser || !canAddSongs) return;
    const newPosition = queue.length > 0
      ? Math.max(...queue.map((q) => q.position)) + 1
      : 0;
    const newItem: Partial<QueueItem> = {
      room_id: room.id,
      youtube_id: youtubeId,
      title,
      thumbnail_url: thumbnail,
      duration_seconds: durationSeconds,
      added_by: currentUser.username,
      position: newPosition,
    };
    const { data, error } = await supabase
      .from('queue_items')
      .insert(newItem)
      .select()
      .single();
    if (!error && data) {
      setQueue((prev) => [...prev, data]);
      channelRef.current?.send({
        type: 'broadcast',
        event: 'queue_update',
        payload: { type: 'added', item: data },
      });
      if (queue.length === 0 && canPlayPause) {
        setRoom((prev) => ({ ...prev, is_playing: true, current_song_index: 0 }));
        broadcastPlayback('play', 0);
      }
    }
  }, [currentUser, canAddSongs, queue, room.id, channelRef, setQueue, setRoom, canPlayPause, broadcastPlayback]);

  const addSongByVideoId = useCallback(async (videoId: string) => {
    if (!currentUser) return;
    setAddingUrl(true);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(videoId)}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const video = data.results[0];
        await addSongToQueue(video.id, video.title, video.thumbnail, video.durationSeconds);
      }
    } catch (err) {
      console.error('Failed to add song by ID:', err);
    } finally {
      setAddingUrl(false);
    }
  }, [currentUser, addSongToQueue]);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const videoId = extractYouTubeId(searchQuery);
    if (videoId) { await addSongByVideoId(videoId); return; }
    setSearching(true);
    setNextPageToken(null);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.results) {
        setSearchResults(data.results);
        setNextPageToken(data.nextPageToken || null);
      }
    } catch (err) { console.error('Search failed:', err); }
    finally { setSearching(false); }
  }, [searchQuery, addSongByVideoId]);

  const handleLoadMore = useCallback(async () => {
    if (!nextPageToken || loadingMore || !searchQuery.trim()) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}&pageToken=${encodeURIComponent(nextPageToken)}`);
      const data = await res.json();
      if (data.results) {
        setSearchResults((prev) => [...prev, ...data.results]);
        setNextPageToken(data.nextPageToken || null);
      }
    } catch (err) { console.error('Load more failed:', err); }
    finally { setLoadingMore(false); }
  }, [nextPageToken, loadingMore, searchQuery]);

  const removeSong = useCallback(async (item: QueueItem) => {
    const removedIndex = queueRef.current.findIndex((q) => q.id === item.id);
    const currentIdx = roomRef.current.current_song_index;
    await supabase.from('queue_items').delete().eq('id', item.id);
    setQueue((prev) => prev.filter((q) => q.id !== item.id));
    if (removedIndex !== -1 && removedIndex < currentIdx) {
      const newIndex = currentIdx - 1;
      setRoom((prev) => ({ ...prev, current_song_index: newIndex }));
      supabase.from('rooms').update({ current_song_index: newIndex }).eq('id', roomRef.current.id).then();
    }
    channelRef.current?.send({
      type: 'broadcast',
      event: 'queue_update',
      payload: { type: 'removed', item_id: item.id, removed_index: removedIndex },
    });
  }, [queueRef, roomRef, setQueue, setRoom, channelRef]);

  const handleShuffle = useCallback(async () => {
    if (queue.length <= 2 || shuffling) return;
    setShuffling(true);
    try {
      await fetch('/api/queue/shuffle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: room.id, current_song_index: room.current_song_index }),
      });
    } catch (err) { console.error('Shuffle failed:', err); }
    finally { setShuffling(false); }
  }, [queue.length, room.id, room.current_song_index, shuffling]);

  const handleDragStart = useCallback((index: number) => {
    dragItemRef.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => { setDragOverIndex(null); }, []);

  const handleDrop = useCallback(async (dropIndex: number) => {
    const dragIndex = dragItemRef.current;
    setDragOverIndex(null);
    dragItemRef.current = null;
    if (dragIndex === null || dragIndex === dropIndex) return;

    const newQueue = [...queue];
    const [draggedItem] = newQueue.splice(dragIndex, 1);
    newQueue.splice(dropIndex, 0, draggedItem);

    let newSongIndex = room.current_song_index;
    if (dragIndex === room.current_song_index) newSongIndex = dropIndex;
    else if (dragIndex < room.current_song_index && dropIndex >= room.current_song_index) newSongIndex = room.current_song_index - 1;
    else if (dragIndex > room.current_song_index && dropIndex <= room.current_song_index) newSongIndex = room.current_song_index + 1;

    const reordered = newQueue.map((item, idx) => ({ ...item, position: idx }));
    setQueue(reordered);
    setRoom((prev) => ({ ...prev, current_song_index: newSongIndex }));

    const updates = reordered.map((item) => ({
      id: item.id, room_id: item.room_id, youtube_id: item.youtube_id,
      title: item.title, thumbnail_url: item.thumbnail_url,
      duration_seconds: item.duration_seconds, added_by: item.added_by,
      position: item.position, played: item.played,
    }));
    await supabase.from('queue_items').upsert(updates);
    if (newSongIndex !== room.current_song_index) {
      await supabase.from('rooms').update({ current_song_index: newSongIndex }).eq('id', room.id);
    }
    channelRef.current?.send({ type: 'broadcast', event: 'queue_update', payload: { type: 'reordered' } });
  }, [queue, room.current_song_index, room.id, setQueue, setRoom, channelRef]);

  const moveSongToNext = useCallback((e: React.MouseEvent, sourceIndex: number) => {
    e.stopPropagation();
    if (sourceIndex === room.current_song_index) return;
    if (sourceIndex === room.current_song_index + 1) return;
    dragItemRef.current = sourceIndex;
    const dropIndex = sourceIndex < room.current_song_index
      ? room.current_song_index
      : room.current_song_index + 1;
    handleDrop(dropIndex);
  }, [room.current_song_index, handleDrop]);

  return {
    searching, searchQuery, setSearchQuery,
    searchResults, setSearchResults,
    nextPageToken, loadingMore, addingUrl,
    shuffling, dragOverIndex,
    queueSearchQuery, setQueueSearchQuery,
    searchMatchIndices, searchMatchCurrentIdx, setSearchMatchCurrentIdx,
    handleSearch, handleLoadMore, addSongToQueue,
    removeSong, handleShuffle,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop, moveSongToNext,
  };
}
