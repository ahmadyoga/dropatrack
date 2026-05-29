'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Room, QueueItem } from '@/lib/types';
import { formatDuration } from '@/lib/youtube';
import type { YTPlayer } from './hooks/useYouTubePlayer';
import type { RealtimeChannel } from '@supabase/supabase-js';
import TimeLabel from './TimeLabel';
import ProgressFill from './ProgressFill';
import { setTime as setStoreTime } from './playbackTimeStore';
import { addReaction } from './reactionsStore';
import EmojiPicker from './EmojiPicker';

const REACTION_EMOJIS = ['❤️', '🔥', '😂', '👍', '🎉', '🙌'];

interface PlayerBarProps {
  room: Room;
  queue: QueueItem[];
  currentSong: QueueItem | null;
  isSpeaker: boolean;
  canPlayPause: boolean;
  duration: number;
  isRightPanelOpen: boolean;
  setIsRightPanelOpen: (v: boolean) => void;
  playerRef: React.RefObject<YTPlayer | null>;
  playerReady: boolean;
  channelRef: React.RefObject<RealtimeChannel | null>;
  setRoom: React.Dispatch<React.SetStateAction<Room>>;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleSpeaker: () => void;
}

export default function PlayerBar({
  room, queue, currentSong, isSpeaker, canPlayPause,
  duration,
  isRightPanelOpen, setIsRightPanelOpen,
  playerRef, playerReady, channelRef, setRoom,
  onPlayPause, onNext, onPrev, onToggleSpeaker,
}: PlayerBarProps) {
  const effectiveDuration = duration > 0 ? duration : (currentSong?.duration_seconds ?? 0);
  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false);
  const volumeModalRef = useRef<HTMLDivElement | null>(null);
  const [isReactionOpen, setIsReactionOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const reactionWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isVolumeModalOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!volumeModalRef.current) return;
      if (!volumeModalRef.current.contains(event.target as Node)) {
        setIsVolumeModalOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [isVolumeModalOpen]);

  useEffect(() => {
    if (!isReactionOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (reactionWrapRef.current && !reactionWrapRef.current.contains(event.target as Node)) {
        setIsReactionOpen(false);
        setIsPickerOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [isReactionOpen]);

  const sendReaction = (emoji: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'reaction', payload: { emoji } });
    addReaction(emoji); // sender sees it immediately (channel does not echo to self)
  };

  const pickFromPicker = (emoji: string) => {
    sendReaction(emoji);
    setIsPickerOpen(false);
  };

  const getClientX = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if ('touches' in e) {
      const touch = e.touches[0] ?? e.changedTouches[0];
      return touch?.clientX ?? 0;
    }
    return e.clientX;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const videoDuration = effectiveDuration;
    if (videoDuration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = getClientX(e) - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = percent * videoDuration;
    if (isSpeaker) {
      if (!playerRef.current || !playerReady) return;
      playerRef.current.seekTo(seekTime, true);
      setStoreTime(seekTime);
      channelRef.current?.send({ type: 'broadcast', event: 'time_sync', payload: { time: seekTime } });
    } else {
      setStoreTime(seekTime);
      channelRef.current?.send({ type: 'broadcast', event: 'seek_request', payload: { time: seekTime } });
    }
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const v = Math.max(0, Math.min(1, (getClientX(e) - rect.left) / rect.width));
    const newVol = Math.round(v * 100);
    setRoom((prev) => ({ ...prev, volume: newVol }));
    supabase.from('rooms').update({ volume: newVol }).eq('id', room.id).then();
    channelRef.current?.send({ type: 'broadcast', event: 'volume_change', payload: { volume: newVol } });
    if (playerRef.current && isSpeaker) {
      playerRef.current.setVolume(newVol);
      if (newVol === 0) playerRef.current.mute();
      else playerRef.current.unMute();
    }
  };

  const handleVolumeMute = () => {
    const newVol = room.volume > 0 ? 0 : 100;
    setRoom((prev) => ({ ...prev, volume: newVol }));
    supabase.from('rooms').update({ volume: newVol }).eq('id', room.id).then();
    channelRef.current?.send({ type: 'broadcast', event: 'volume_change', payload: { volume: newVol } });
    if (playerRef.current && isSpeaker) {
      playerRef.current.setVolume(newVol);
      if (newVol === 0) playerRef.current.mute();
      else playerRef.current.unMute();
    }
  };

  const handleRepeatToggle = () => {
    const next = !room.repeat;
    setRoom((prev) => ({ ...prev, repeat: next }));
    supabase.from('rooms').update({ repeat: next }).eq('id', room.id).then();
    channelRef.current?.send({ type: 'broadcast', event: 'repeat_toggle', payload: { repeat: next } });
  };

  return (
    <div className="player-bar">
      {/* Track info */}
      <div className="pb-track">
        <div className="pb-thumb qt0">
          {currentSong?.thumbnail_url
            ? <img src={currentSong.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="thumb" />
            : '🎸'
          }
        </div>
        <div className="pb-info">
          <div className="pb-title">{currentSong ? (currentSong.title || 'Unknown Track') : 'No track'}</div>
          <div className="pb-artist">{currentSong ? currentSong.added_by : ''}</div>
        </div>
        {currentSong && <span className="pb-heart"></span>}
      </div>

      {/* Controls */}
      <div className="pb-controls">
        <div className="pb-btns">
          <button
            className="ctrl"
            onClick={canPlayPause ? onPrev : undefined}
            disabled={!canPlayPause || room.current_song_index <= 0}
            title="Previous"
            style={!canPlayPause ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
          >
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
          </button>
          <button
            className="play-btn"
            onClick={canPlayPause ? onPlayPause : undefined}
            style={!canPlayPause ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            {room.is_playing
              ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            }
          </button>
          <button
            className="ctrl"
            onClick={canPlayPause ? onNext : undefined}
            disabled={!canPlayPause || (!room.repeat && room.current_song_index >= queue.length - 1)}
            title="Next"
            style={!canPlayPause ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
          >
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="m6 18 8.5-6L6 6v12zm2-8.14 4.96 3.14L8 16.14V9.86zM16 6h2v12h-2z" /></svg>
          </button>
          <button
            className={`ctrl ${room.repeat ? 'ctrl-active' : ''}`}
            title="Repeat"
            style={!canPlayPause ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
            onClick={canPlayPause ? handleRepeatToggle : undefined}
          >
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" /></svg>
          </button>
          <button
            className={`ctrl mobile-speaker-btn ${isSpeaker ? 'ctrl-active' : ''}`}
            title="Toggle Speaker Mode"
            onClick={onToggleSpeaker}
          >
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
            <span className="mobile-speaker-label">{isSpeaker ? 'SPK' : 'REM'}</span>
          </button>
        </div>
        {/* Progress bar */}
        <div className="pb-progress">
          <TimeLabel className="pb-time" />
          <div className="pb-bar" style={{ cursor: 'pointer' }} onMouseDown={handleSeek} onTouchStart={handleSeek}>
            <ProgressFill duration={effectiveDuration} className="pb-fill" />
          </div>
          <span className="pb-time" style={{ textAlign: 'right' }}>
            {formatDuration(Math.floor(effectiveDuration))}
          </span>
        </div>
      </div>

      {/* Right: volume + speaker + panel toggle */}
      <div className="pb-right">
        <div className="vol-wrap">
          <span className="vol-icon" onClick={handleVolumeMute}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            </svg>
          </span>
          <div className="vol-bar" onMouseDown={handleVolumeClick} onTouchStart={handleVolumeClick}>
            <div className="vol-fill" style={{ width: `${room.volume}%` }} />
          </div>
        </div>
        <div className="mobile-volume-wrap" ref={volumeModalRef}>
          <button
            className="icon-btn mobile-volume-btn"
            title="Volume"
            onClick={() => setIsVolumeModalOpen((prev) => !prev)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" /></svg>
            <span className="mobile-volume-label">VOL</span>
          </button>
          {isVolumeModalOpen && (
            <div className="volume-popover" role="dialog" aria-label="Volume control">
              <button className="volume-popover-mute" onClick={handleVolumeMute}>
                {room.volume === 0 ? 'Unmute' : 'Mute'}
              </button>
              <div className="volume-popover-bar" onMouseDown={handleVolumeClick} onTouchStart={handleVolumeClick}>
                <div className="volume-popover-fill" style={{ width: `${room.volume}%` }} />
              </div>
              <span className="volume-popover-value">{room.volume}%</span>
            </div>
          )}
        </div>
        <div className="pb-extra">
          <div className="reaction-wrap" ref={reactionWrapRef} style={{ position: 'relative' }}>
            <button
              className={`icon-btn ${isReactionOpen ? 'active' : ''}`}
              title="Send a reaction"
              aria-label="Send a reaction"
              onClick={() => setIsReactionOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-3.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM12 17.5c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z" /></svg>
            </button>
            {isReactionOpen && (
              <div className="reaction-popover" role="menu" aria-label="Reactions">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    className="reaction-emoji-btn"
                    onClick={() => sendReaction(emoji)}
                    aria-label={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  className={`reaction-emoji-btn reaction-more-btn ${isPickerOpen ? 'active' : ''}`}
                  onClick={() => setIsPickerOpen((v) => !v)}
                  aria-label="More emoji"
                  title="More emoji"
                >
                  +
                </button>
              </div>
            )}
            {isReactionOpen && isPickerOpen && <EmojiPicker onPick={pickFromPicker} />}
          </div>
          <button
            className={`icon-btn ${isRightPanelOpen ? 'active' : ''}`}
            title="Toggle Users/Chat"
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            style={{ background: isRightPanelOpen ? 'rgba(29,185,84,0.15)' : '', color: isRightPanelOpen ? '#1db954' : '' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
          </button>
          <div
            className={`speaker-pill ${isSpeaker ? 'active' : ''}`}
            onClick={onToggleSpeaker}
            title="Toggle Speaker Mode"
          >
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
            {isSpeaker ? 'Speaker' : 'Remote'}
          </div>
        </div>
      </div>
    </div>
  );
}
