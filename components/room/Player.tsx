'use client';

import Scrubber from './ui/Scrubber';
import Icon from './ui/Icon';
import VinylRecord from './ui/VinylRecord';
import { useState } from 'react';
import { useRoom } from './RoomContext';
import { usePlaybackTime } from './hooks/playbackTimeStore';
import type { YTPlayer } from './hooks/useYouTubePlayer';
import type { UnplayableNotice } from './hooks/useUnplayableSkip';

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
  onToggleSpeaker: () => void;
  onAddSong: () => void;
  unplayableNotice: UnplayableNotice | null;
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
  onToggleSpeaker,
  onAddSong,
  unplayableNotice,
  onSeek,
  volume,
  onVolumeChange,
}: PlayerProps) {
  const { room, currentSong, canPlayPause, canSeek, canVolume, duration, users, currentUser } = useRoom();
  const [confirmSecondSpeaker, setConfirmSecondSpeaker] = useState(false);

  // Who is actually making sound. Our own device uses local state (presence lags a beat).
  const myId = currentUser?.user_id;
  const otherSpeakers = users.filter((u) => u.is_speaker && u.user_id !== myId);
  const speakerNames = [...(isSpeaker ? ['this device'] : []), ...otherSpeakers.map((u) => u.username)];
  const noSpeaker = speakerNames.length === 0;

  const choosePlayHere = () => {
    if (otherSpeakers.length > 0 && !confirmSecondSpeaker) { setConfirmSecondSpeaker(true); return; }
    setConfirmSecondSpeaker(false);
    onToggleSpeaker();
  };
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
    <section aria-label="Now playing" className="pop col overflow-hidden" style={{ borderRadius: 16, flex: '1 0 auto' }}>

      {/* video stage */}
      {/* stage grows into spare column height: a bigger video/record is what the speaker screen is for */}
      <div style={{ position: 'relative', flex: 1, minHeight: 'clamp(180px, 28vw, 260px)' }}>
        <div ref={playerContainerRef} style={{ position: 'absolute', inset: 0 }}>
          {/* iframe always mounted for sync — hidden in remote mode */}
          <div id="yt-player" style={{ width: '100%', height: '100%', visibility: isSpeaker ? 'visible' : 'hidden' }} />

          {/* remote mode: half-visible vinyl — center sits at bottom edge */}
          {!isSpeaker && (
            <div style={{
              position: 'absolute', inset: 0, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-2)',
              containerType: 'size', // definite box (inset 0), so cqw/cqh always resolve
            }}>
              <div style={{ width: 'min(80cqw, 80cqh)', aspectRatio: '1 / 1', flexShrink: 0 }}>
                <VinylRecord
                  thumbnail={currentSong?.thumbnail_url}
                  isPlaying={room.is_playing}
                  size="100%"
                />
              </div>
            </div>
          )}

          {!currentSong && (
            <div className="ph col" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 11, padding: 16, textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Nothing playing yet</div>
              <button className="btn btn-accent" onClick={onAddSong} style={{ gap: 6 }}>
                <Icon name="plus" size={18} /> Add a song
              </button>
            </div>
          )}
        </div>

        {/* speaker status: the one thing an office room needs to know */}
        {currentSong && (
          <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 12, display: 'flex' }} role="status">
            {unplayableNotice ? (
              // Speaker Truth: never say "playing" while the current track can't play.
              <span className="chip" style={{ background: 'var(--pop-coral)', color: 'var(--on-pop)', maxWidth: '100%', whiteSpace: 'normal' }}>
                {unplayableNotice.kind === 'skipping' ? '⏭ Skipping unplayable track' : '🔇 Nothing playable'}
              </span>
            ) : noSpeaker ? (
              <span className="chip" style={{ background: 'var(--pop-coral)', color: 'var(--on-pop)', maxWidth: '100%', whiteSpace: 'normal' }}
                title="No device in the room has Play here turned on, so nobody hears anything. Tap Play here on the speaker device.">
                🔇 No speaker on · tap Play here
              </span>
            ) : (
              <span className="chip" style={{ maxWidth: '100%', overflow: 'hidden' }} title="Everyone in the room hears the same moment">
                {room.is_playing && <span className="live-dot" aria-hidden="true" />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  🔊 {room.is_playing ? 'Playing' : 'Paused'} on {speakerNames.length > 2 ? `${speakerNames.length} devices` : speakerNames.join(' + ')}
                </span>
              </span>
            )}
          </div>
        )}

        {/* unplayable track: everyone sees why, and the countdown, before the skip */}
        {unplayableNotice && (
          <div
            role="status"
            aria-live="polite"
            className="pop-sm"
            style={{
              position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 13,
              borderRadius: 12, padding: '10px 12px', background: 'var(--panel)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            {unplayableNotice.kind === 'skipping' ? (
              <>
                <span aria-hidden="true" className="display" style={{
                  flexShrink: 0, width: 36, height: 36, borderRadius: '50%', fontSize: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--pop-coral)', color: 'var(--on-pop)', border: '2.5px solid var(--outline)',
                }}>{unplayableNotice.secondsLeft}</span>
                <span style={{ fontSize: 13, lineHeight: 1.35, minWidth: 0 }}>
                  <b>Can’t play “{unplayableNotice.title}”</b>: {unplayableNotice.reason}.{' '}
                  {unplayableNotice.secondsLeft > 0 ? `Skipping in ${unplayableNotice.secondsLeft}…` : 'Skipping…'}
                </span>
              </>
            ) : (
              <span style={{ fontSize: 13, lineHeight: 1.35 }}>
                <b>No playable songs left.</b> “{unplayableNotice.title}” can’t play on YouTube. Add another song and the room carries on.
              </span>
            )}
          </div>
        )}

        {/* big play overlay — also catches clicks so the YouTube frame can't pause just one device */}
        <button
          onClick={handleOverlayClick}
          disabled={!canPlayPause || !currentSong}
          aria-label={room.is_playing ? 'Pause for everyone' : 'Play for everyone'}
          tabIndex={-1}
          style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none',
            cursor: canPlayPause && currentSong ? 'pointer' : 'default',
            visibility: currentSong ? 'visible' : 'hidden',
          }}
        >
          <div
            className="pop"
            style={{
              width: 84, height: 84, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--accent)', color: 'var(--on-pop)',
              boxShadow: '5px 5px 0 var(--shadow)',
              // DJs can't play, so they don't get a big button that does nothing
              transform: room.is_playing || !canPlayPause ? 'scale(0)' : 'scale(1)',
              opacity: room.is_playing || !canPlayPause ? 0 : 1,
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
          <div className="pop-sm" style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
            {currentSong?.thumbnail_url
              ? <img src={currentSong.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div className="ph" style={{ width: '100%', height: '100%' }} />
            }
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={currentSong?.title}>
              {currentSong?.title ?? 'Nothing playing'}
            </div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentSong?.added_by ? `added by ${currentSong.added_by}` : 'add a song to get started'}
            </div>
          </div>
        </div>

        {/* progress */}
        {currentSong && (
        <div className="flex items-center gap-2 mb-2">
          <span className="mono" style={{ fontSize: 12, fontWeight: 700, width: 38, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(currentTime)}</span>
          <div style={{ flex: 1, display: 'flex', pointerEvents: canSeek ? 'auto' : 'none', opacity: canSeek ? 1 : 0.5 }}>
            <Scrubber value={currentTime} max={effectiveDuration || 1} onChange={handleProgressSeek} height={10}
              label="Seek" valueText={`${fmt(currentTime)} of ${fmt(effectiveDuration)}`} disabled={!canSeek} step={5} />
          </div>
          <span className="mono" style={{ fontSize: 12, fontWeight: 700, width: 38, color: 'var(--ink-soft)', fontVariantNumeric: 'tabular-nums' }}>{fmt(effectiveDuration)}</span>
        </div>
        )}

        {/* transport */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2" role="group" aria-label="Playback for everyone">
            <button className="btn pop-sm btn-icon" onClick={onPrev} disabled={!canPlayPause} aria-label="Previous track" aria-keyshortcuts="Shift+P" title="Previous (Shift+P)" style={{ width: 44, height: 44, padding: 0 }}><Icon name="prev" size={17} /></button>
            <button className="btn btn-accent" onClick={onPlayPause} disabled={!canPlayPause || !currentSong} aria-label={room.is_playing ? 'Pause' : 'Play'} aria-keyshortcuts="Space K" title="Play / pause (Space)" style={{ width: 56, height: 48, padding: 0 }}>
              <Icon name={room.is_playing ? 'pause' : 'play'} size={20} />
            </button>
            <button className="btn pop-sm btn-icon" onClick={onNext} disabled={!canPlayPause} aria-label="Next track" aria-keyshortcuts="Shift+N" title="Next (Shift+N)" style={{ width: 44, height: 44, padding: 0 }}><Icon name="next" size={17} /></button>
          </div>

          {/* volume — hidden for dj role */}
          {canVolume && (
          <div
            className="flex items-center gap-2"
            title="Speaker volume for the whole room"
            style={{
              flex: '1 1 140px', minWidth: 140,
              padding: '0 10px 0 4px', borderRadius: 12,
              border: '2.5px solid var(--outline)',
              background: 'var(--panel)',
              height: 44,
            }}
          >
            <button
              type="button"
              onClick={() => handleVolumeSeek(volume > 0 ? 0 : 0.8)}
              aria-label={volume === 0 ? 'Unmute speaker' : 'Mute speaker'}
              style={{ background: 'none', border: 'none', color: 'var(--ink)', cursor: 'pointer', flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
            >
              <Icon name={volume === 0 ? 'mute' : 'volume'} size={16} />
            </button>
            <Scrubber value={volume} max={1} onChange={handleVolumeSeek} color="var(--accent-2)" height={10} label="Speaker volume" valueText={`${Math.round(volume * 100)}%`} step={0.05} />
            <span className="mono" aria-hidden="true" style={{ fontSize: 12, fontWeight: 700, width: 26, textAlign: 'right', color: 'var(--ink-soft)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(volume * 100)}
            </span>
          </div>
          )}

        </div>

        {!canPlayPause && (
          <p className="mono" style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--ink-soft)' }}>
            🎧 As a DJ you add songs. Moderators and the admin control playback.
          </p>
        )}

        {/* This device: the core speaker / remote choice, said in plain words */}
        <div className="flex items-center gap-3" style={{ marginTop: 10, paddingTop: 10, borderTop: '2px solid var(--line)' }}>
          <span className="mono" id="device-mode-label" style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.08em', flexShrink: 0 }}>
            This device
          </span>
          <div role="group" aria-labelledby="device-mode-label" className="flex" style={{ flex: 1, border: '2.5px solid var(--outline)', borderRadius: 12, overflow: 'hidden', background: 'var(--panel-2)' }}>
            {([['speaker', true, 'Play here'], ['remote', false, 'Remote only']] as const).map(([icon, value, label]) => {
              const active = isSpeaker === value;
              return (
                <button
                  key={icon}
                  type="button"
                  aria-pressed={active}
                  onClick={() => { if (active) return; if (value) choosePlayHere(); else { setConfirmSecondSpeaker(false); onToggleSpeaker(); } }}
                  className="flex items-center justify-center"
                  style={{
                    flex: 1, gap: 6, minHeight: 44, padding: '0 10px', border: 'none', cursor: active ? 'default' : 'pointer',
                    background: active ? 'var(--accent-2)' : 'transparent',
                    color: active ? 'var(--on-pop)' : 'var(--ink-soft)',
                    fontWeight: 700, fontSize: 13,
                  }}
                >
                  <Icon name={icon} size={15} /> {label}
                </button>
              );
            })}
          </div>
        </div>

        {confirmSecondSpeaker && (
          <div role="alert" className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 10, padding: '10px 12px', borderRadius: 12, border: '2.5px solid var(--outline)', background: 'var(--panel-2)' }}>
            <span style={{ flex: '1 1 200px', fontSize: 13 }}>
              <b>{otherSpeakers.map((u) => u.username).join(', ')}</b> {otherSpeakers.length > 1 ? 'are' : 'is'} already playing the music. Two speakers in one room will echo.
            </span>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmSecondSpeaker(false)} style={{ height: 40, padding: '0 12px', fontSize: 12 }}>Keep remote</button>
            <button type="button" className="btn pop-sm" onClick={choosePlayHere} style={{ height: 40, padding: '0 12px', fontSize: 12 }}>Play here too</button>
          </div>
        )}
      </div>
    </section>
  );
}
