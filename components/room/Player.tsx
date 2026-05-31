'use client';

import Scrubber from './ui/Scrubber';
import { useRoom } from './RoomContext';
import YouTubePlayer from '@/components/YouTubePlayer';
import { usePlaybackTime } from './playbackTimeStore';
import type { YTPlayer } from './hooks/useYouTubePlayer';

function fmt(s: number): string {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface PlayerProps {
  playerRef: React.RefObject<YTPlayer | null>;
  playerContainerRef: React.RefObject<HTMLDivElement>;
  playerReady: boolean;
  showPlayerOverlay: boolean;
  setShowPlayerOverlay: (v: boolean) => void;
  overlayTimerRef: React.RefObject<ReturnType<typeof setTimeout> | null>;
  isSpeaker: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onShuffle: () => void;
  onToggleSpeaker: () => void;
  onSeek: (t: number) => void;
  onVolumeChange: (v: number) => void;
}

export default function Player({
  playerRef,
  playerContainerRef,
  playerReady,
  showPlayerOverlay,
  setShowPlayerOverlay,
  overlayTimerRef,
  isSpeaker,
  onPlayPause,
  onNext,
  onPrev,
  onShuffle,
  onToggleSpeaker,
  onSeek,
  onVolumeChange,
}: PlayerProps) {
  const { room, currentSong, canPlayPause, duration } = useRoom();
  const currentTime = usePlaybackTime();
  const effectiveDuration = duration > 0 ? duration : (currentSong?.duration_seconds ?? 0);
  const volume = room.volume ?? 0.8;

  const handleOverlayClick = () => {
    if (!canPlayPause) return;
    onPlayPause();
    setShowPlayerOverlay(false);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
  };

  const handleVolumeSeek = (v: number) => {
    onVolumeChange(v);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const player = playerRef.current as any;
    if (player && playerReady) {
      try { player.setVolume(v * 100); } catch { /* */ }
    }
  };

  const handleProgressSeek = (t: number) => {
    onSeek(t);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const player = playerRef.current as any;
    if (player && playerReady) {
      try { player.seekTo(t, true); } catch { /* */ }
    }
  };

  return (
    <div className="pop wobble-2 col overflow-hidden" style={{ boxShadow: '7px 7px 0 var(--shadow)' }}>

      {/* video stage */}
      <div style={{ position: 'relative', aspectRatio: '16/9', minHeight: 0 }}>
        <div ref={playerContainerRef} style={{ position: 'absolute', inset: 0 }}>
          {currentSong ? (
            <YouTubePlayer
              videoId={currentSong.youtube_id}
              playerRef={playerRef}
              isPlaying={room.is_playing}
              isSpeaker={isSpeaker}
            />
          ) : (
            <div className="ph" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', letterSpacing: '.1em' }}>
                QUEUE IS EMPTY
              </span>
            </div>
          )}
        </div>

        {/* synced chip */}
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
          <span className="chip" style={{ background: 'rgba(20,15,31,.7)', color: '#fff', borderColor: 'rgba(255,255,255,.45)' }}>
            🔴 SYNCED · everyone at {fmt(currentTime)}
          </span>
        </div>

        {/* remote mode chip */}
        {!isSpeaker && (
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
            <span className="chip" style={{ background: 'var(--pop-yellow)', color: '#140f1f' }}>
              📡 REMOTE MODE
            </span>
          </div>
        )}

        {/* big play overlay */}
        <button
          onClick={handleOverlayClick}
          disabled={!canPlayPause}
          style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none',
            cursor: canPlayPause ? 'pointer' : 'default',
          }}
        >
          <div
            className="pop"
            style={{
              width: 84, height: 84, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--accent)', color: '#140f1f',
              boxShadow: '5px 5px 0 var(--shadow)',
              transform: room.is_playing ? 'scale(0)' : 'scale(1)',
              opacity: room.is_playing ? 0 : 1,
              transition: 'transform .2s, opacity .2s',
            }}
          >
            <span style={{ fontSize: 32, marginLeft: 4 }}>▶</span>
          </div>
        </button>
      </div>

      {/* now-playing strip */}
      <div style={{ padding: '14px 16px 16px', borderTop: '3px solid var(--outline)', background: 'var(--panel)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="pop-sm" style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
            {currentSong?.thumbnail_url
              ? <img src={currentSong.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div className="ph" style={{ width: '100%', height: '100%' }} />
            }
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '.12em' }}>NOW PLAYING</div>
            <div className="display" style={{ fontSize: 20, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentSong?.title ?? '—'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentSong?.added_by ? `added by ${currentSong.added_by}` : 'queue is empty'}
            </div>
          </div>
        </div>

        {/* progress */}
        <div className="flex items-center gap-2 mb-3">
          <span className="mono" style={{ fontSize: 11, fontWeight: 700, width: 38, textAlign: 'right' }}>{fmt(currentTime)}</span>
          <Scrubber value={currentTime} max={effectiveDuration || 1} onChange={handleProgressSeek} />
          <span className="mono" style={{ fontSize: 11, fontWeight: 700, width: 38, color: 'var(--ink-dim)' }}>{fmt(effectiveDuration)}</span>
        </div>

        {/* transport */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button className="btn pop-sm btn-icon" onClick={onShuffle} title="Shuffle">⇄</button>
            <button className="btn pop-sm btn-icon" onClick={onPrev} title="Previous">⏮</button>
            <button
              className="btn btn-accent"
              onClick={onPlayPause}
              disabled={!canPlayPause}
              style={{ width: 58, height: 52, padding: 0 }}
            >
              <span style={{ fontSize: 20 }}>{room.is_playing ? '⏸' : '▶'}</span>
            </button>
            <button className="btn pop-sm btn-icon" onClick={onNext} title="Next">⏭</button>
          </div>

          {/* volume */}
          <div
            className="flex items-center gap-2"
            style={{
              flex: '1 1 150px', minWidth: 140,
              padding: '0 13px 0 11px', borderRadius: 12,
              border: '2.5px solid var(--outline)',
              background: 'var(--panel)',
              boxShadow: '4px 4px 0 var(--shadow)',
              height: 48,
            }}
          >
            <button
              onClick={() => handleVolumeSeek(volume > 0 ? 0 : 0.8)}
              style={{ background: 'none', border: 'none', color: 'var(--ink)', cursor: 'pointer', flexShrink: 0, fontSize: 16 }}
            >
              {volume === 0 ? '🔇' : '🔊'}
            </button>
            <Scrubber value={volume} max={1} onChange={handleVolumeSeek} color="var(--accent-2)" height={12} />
            <span className="mono" style={{ fontSize: 11, fontWeight: 700, width: 26, textAlign: 'right', color: 'var(--ink-dim)', flexShrink: 0 }}>
              {Math.round(volume * 100)}
            </span>
          </div>

          {/* speaker toggle */}
          <button
            className="btn pop-sm"
            onClick={onToggleSpeaker}
            style={{
              gap: 8,
              background: isSpeaker ? 'var(--accent-2)' : 'var(--panel)',
              color: isSpeaker ? '#140f1f' : 'var(--ink)',
            }}
          >
            <span>{isSpeaker ? '🔊' : '📡'}</span>
            <span style={{ fontSize: 12 }}>{isSpeaker ? 'SPEAKER' : 'REMOTE'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
