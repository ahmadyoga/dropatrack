'use client';

import Scrubber from './ui/Scrubber';
import Icon from './ui/Icon';
import VinylRecord from './ui/VinylRecord';
import { useRoom } from './RoomContext';
import { usePlaybackTime } from './hooks/playbackTimeStore';
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
  volume: number;
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
  volume,
  onVolumeChange,
}: PlayerProps) {
  const { room, currentSong, canPlayPause, canSeek, canVolume, duration } = useRoom();
  const currentTime = usePlaybackTime();
  const effectiveDuration = duration > 0 ? duration : (currentSong?.duration_seconds ?? 0);

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
    if (!canSeek) return;
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
      <div style={{ position: 'relative', height: 'clamp(180px, 28vw, 260px)', minHeight: 0 }}>
        <div ref={playerContainerRef} style={{ position: 'absolute', inset: 0 }}>
          {/* iframe always mounted for sync — hidden in remote mode */}
          <div id="yt-player" style={{ width: '100%', height: '100%', visibility: isSpeaker ? 'visible' : 'hidden' }} />

          {/* remote mode: half-visible vinyl — center sits at bottom edge */}
          {!isSpeaker && (
            <div style={{
              position: 'absolute', inset: 0, overflow: 'hidden',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              background: 'var(--bg-2)',
            }}>
              <div style={{ width: '80%', aspectRatio: '1 / 1', flexShrink: 0, transform: 'translateY(50%)' }}>
                <VinylRecord
                  thumbnail={currentSong?.thumbnail_url}
                  isPlaying={room.is_playing}
                  size="100%"
                />
              </div>
            </div>
          )}

          {!currentSong && (
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
            <Icon name="play" size={32} style={{ marginLeft: 4 }} />
          </div>
        </button>
      </div>

      {/* now-playing strip */}
      <div style={{ padding: '9px 12px 11px', borderTop: '3px solid var(--outline)', background: 'var(--panel)' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="pop-sm" style={{ width: 38, height: 38, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}>
            {currentSong?.thumbnail_url
              ? <img src={currentSong.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div className="ph" style={{ width: '100%', height: '100%' }} />
            }
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div className="mono" style={{ fontSize: 8, color: 'var(--ink-dim)', letterSpacing: '.12em' }}>NOW PLAYING</div>
            <div className="display" style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentSong?.title ?? '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentSong?.added_by ? `added by ${currentSong.added_by}` : 'queue is empty'}
            </div>
          </div>
        </div>

        {/* progress */}
        <div className="flex items-center gap-2 mb-2">
          <span className="mono" style={{ fontSize: 10, fontWeight: 700, width: 32, textAlign: 'right' }}>{fmt(currentTime)}</span>
          <div style={{ flex: 1, pointerEvents: canSeek ? 'auto' : 'none', opacity: canSeek ? 1 : 0.4 }}>
            <Scrubber value={currentTime} max={effectiveDuration || 1} onChange={handleProgressSeek} height={10} />
          </div>
          <span className="mono" style={{ fontSize: 10, fontWeight: 700, width: 32, color: 'var(--ink-dim)' }}>{fmt(effectiveDuration)}</span>
        </div>

        {/* transport */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <button className="btn pop-sm btn-icon" onClick={onShuffle} disabled={!canPlayPause} title="Shuffle" style={{ padding: 8, opacity: canPlayPause ? 1 : 0.4 }}><Icon name="shuffle" size={16} /></button>
            <button className="btn pop-sm btn-icon" onClick={onPrev} disabled={!canPlayPause} title="Previous" style={{ padding: 8, opacity: canPlayPause ? 1 : 0.4 }}><Icon name="prev" size={17} /></button>
            <button className="btn btn-accent" onClick={onPlayPause} disabled={!canPlayPause} style={{ width: 46, height: 42, padding: 0, opacity: canPlayPause ? 1 : 0.4 }}>
              <Icon name={room.is_playing ? 'pause' : 'play'} size={19} />
            </button>
            <button className="btn pop-sm btn-icon" onClick={onNext} disabled={!canPlayPause} title="Next" style={{ padding: 8, opacity: canPlayPause ? 1 : 0.4 }}><Icon name="next" size={17} /></button>
          </div>

          {/* volume — hidden for dj role */}
          {canVolume && (
          <div
            className="flex items-center gap-2"
            style={{
              flex: '1 1 120px', minWidth: 120,
              padding: '0 10px 0 8px', borderRadius: 10,
              border: '2.5px solid var(--outline)',
              background: 'var(--panel)',
              boxShadow: '3px 3px 0 var(--shadow)',
              height: 40,
            }}
          >
            <button
              onClick={() => handleVolumeSeek(volume > 0 ? 0 : 0.8)}
              style={{ background: 'none', border: 'none', color: 'var(--ink)', cursor: 'pointer', flexShrink: 0 }}
            >
              <Icon name={volume === 0 ? 'mute' : 'volume'} size={16} />
            </button>
            <Scrubber value={volume} max={1} onChange={handleVolumeSeek} color="var(--accent-2)" height={10} />
            <span className="mono" style={{ fontSize: 10, fontWeight: 700, width: 22, textAlign: 'right', color: 'var(--ink-dim)', flexShrink: 0 }}>
              {Math.round(volume * 100)}
            </span>
          </div>
          )}

          {/* speaker toggle */}
          <button
            className="btn pop-sm"
            onClick={onToggleSpeaker}
            style={{
              gap: 6, padding: '8px 12px',
              background: isSpeaker ? 'var(--accent-2)' : 'var(--panel)',
              color: isSpeaker ? '#140f1f' : 'var(--ink)',
            }}
          >
            <Icon name={isSpeaker ? 'speaker' : 'remote'} size={15} />
            <span style={{ fontSize: 11 }}>{isSpeaker ? 'SPEAKER' : 'REMOTE'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
