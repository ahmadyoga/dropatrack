'use client';

import { useEffect, useRef } from 'react';
import Avatar from '../ui/Avatar';
import type { GameSession, UserPresence, Level } from '@/lib/types';
import { LEVEL_CONFIG } from '@/lib/types';

interface WaitingRoomProps {
  session: GameSession;
  players: UserPresence[];
  isHost: boolean;
  onStart: () => void;
  onLeave: () => void;
}

function PulsingDot() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: 'var(--pop-lime)',
        border: '2.5px solid var(--outline)',
        animation: 'waitpulse 1.4s ease-in-out infinite',
      }}
    />
  );
}

export default function WaitingRoom({ session, players, isHost, onStart, onLeave }: WaitingRoomProps) {
  const cfg = LEVEL_CONFIG[session.level as Level];
  const canStart = isHost && players.length >= 1;

  return (
    <>
      {/* inject pulse keyframes inline (safe because globals.css may not have it) */}
      <style>{`
        @keyframes waitpulse {
          0%, 100% { transform: scale(.8); opacity: .55; box-shadow: 0 0 0 0 var(--pop-lime); }
          50%       { transform: scale(1.2); opacity: 1;   box-shadow: 0 0 0 6px transparent; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      <div
        className="pop wobble col popin"
        style={{ width: 'min(440px, 94vw)', overflow: 'hidden', boxShadow: '9px 9px 0 var(--shadow)' }}
      >
        {/* header */}
        <div
          className="flex justify-between items-center"
          style={{
            padding: '14px 18px',
            borderBottom: '3px solid var(--outline)',
            background: 'var(--panel-2)',
          }}
        >
          <div className="col" style={{ gap: 3 }}>
            <div className="display" style={{ fontSize: 18 }}>💣 Minesweeper</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
              {cfg.cols}×{cfg.rows} · {cfg.mines} mines · {cfg.label}
            </div>
          </div>
          <span
            className="chip"
            style={{ background: 'var(--panel-3)', fontSize: 10 }}
          >
            {session.level.toUpperCase()}
          </span>
        </div>

        {/* waiting indicator */}
        <div
          className="flex items-center gap-3"
          style={{ padding: '14px 18px 10px', borderBottom: '2px solid var(--line)' }}
        >
          <PulsingDot />
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>
            Waiting for players…
          </div>
          <span
            className="chip"
            style={{
              background: 'var(--accent)',
              color: '#140f1f',
              marginLeft: 'auto',
              fontSize: 11,
            }}
          >
            {players.length} joined
          </span>
        </div>

        {/* player list */}
        <div className="col scroll" style={{ padding: '10px 14px', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
          {players.length === 0 ? (
            <div
              className="mono"
              style={{
                textAlign: 'center',
                color: 'var(--ink-dim)',
                fontSize: 12,
                padding: '24px 0',
              }}
            >
              No players yet — share the room link!
            </div>
          ) : (
            players.map((player, idx) => (
              <div
                key={player.user_id}
                className="flex items-center gap-3 pop-sm"
                style={{
                  padding: '9px 12px',
                  borderRadius: 12,
                  background: player.user_id === session.host_id ? 'var(--panel-2)' : 'var(--panel)',
                }}
              >
                {/* turn order number */}
                <span
                  className="mono"
                  style={{
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--panel-3)',
                    border: '2px solid var(--outline)',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>

                {/* avatar */}
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '2px solid var(--outline)',
                    flexShrink: 0,
                    background: 'var(--panel-2)',
                  }}
                >
                  <Avatar seed={player.user_id} size={34} />
                </div>

                {/* name */}
                <div style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{player.username}</div>

                {/* host badge */}
                {player.user_id === session.host_id && (
                  <span
                    className="chip"
                    style={{ background: 'var(--pop-yellow)', color: '#140f1f', fontSize: 9 }}
                  >
                    HOST
                  </span>
                )}

                {/* online dot */}
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: 'var(--pop-lime)',
                    border: '2px solid var(--outline)',
                    flexShrink: 0,
                  }}
                />
              </div>
            ))
          )}
        </div>

        {/* actions */}
        <div className="flex gap-3" style={{ padding: '14px 18px', borderTop: '3px solid var(--outline)' }}>
          {isHost ? (
            <>
              <button
                className="btn"
                onClick={onLeave}
                style={{
                  flex: '0 0 auto',
                  background: 'var(--pop-coral)',
                  color: '#140f1f',
                  fontSize: 13,
                  padding: '10px 16px',
                }}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={onStart}
                disabled={!canStart}
                style={{
                  flex: 1,
                  background: canStart ? 'var(--accent)' : 'var(--panel-3)',
                  color: '#140f1f',
                  fontSize: 14,
                  justifyContent: 'center',
                  opacity: canStart ? 1 : 0.55,
                  cursor: canStart ? 'pointer' : 'not-allowed',
                }}
              >
                {canStart ? '▶ Start Game' : `Need ≥1 player`}
              </button>
            </>
          ) : (
            <button
              className="btn"
              onClick={onLeave}
              style={{
                flex: 1,
                background: 'var(--pop-coral)',
                color: '#140f1f',
                fontSize: 14,
                justifyContent: 'center',
              }}
            >
              ← Leave Game
            </button>
          )}
        </div>
      </div>
    </>
  );
}
