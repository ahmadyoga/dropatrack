'use client';

import { useEffect, useState } from 'react';
import { getTurnSecondsRemaining } from '@/lib/minesweeperTurnTimeout';
import type { Board, Cell, GamePlayerScore } from '@/lib/types';

interface MinesweeperBoardProps {
  board: Board;
  myTurn: boolean;
  currentTurnUser: string;  // username of the current turn player
  currentTurnStartedAt?: string | null;
  players: string[];         // usernames in turn order
  matchNumber: number;
  scores: GamePlayerScore[];
  loserUserId?: string | null;
  onReveal: (row: number, col: number) => void;
  onFlag: (row: number, col: number) => void;
  /** optional: show win/loss overlay */
  gameOver?: { won: boolean; message?: string } | null;
  onPlayAgain?: () => void;
  onFinish?: () => void;
  onClose?: () => void;
}

/* ── colour helpers ─────────────────────────────────────────────────────── */

const ADJ_COLORS: string[] = [
  'transparent',    // 0 — no label
  '#22c55e',        // 1 — green
  '#46e0d4',        // 2 — cyan
  '#9d7bff',        // 3 — violet
  '#ffd23f',        // 4 — yellow
  '#ff7a4d',        // 5 — coral
  '#ff5da2',        // 6 — magenta
  '#f7eeda',        // 7 — cream
  '#8a7db0',        // 8 — dim
];

const GAME_OVER_LAYER_DELAY_MS = 2500;

function cellBackground(cell: Cell, revealAllMines = false): string {
  if (revealAllMines && cell.isMine) return 'var(--pop-coral)';

  switch (cell.state) {
    case 'revealed': return 'var(--panel-2)';
    case 'flagged':  return 'var(--pop-yellow)';
    case 'mine':     return 'var(--pop-coral)';
    default:         return 'var(--panel-3)';          // unrevealed
  }
}

function cellBorder(cell: Cell, revealAllMines = false): string {
  if (revealAllMines && cell.isMine) return '2px solid #140f1f';
  if (cell.state === 'flagged') return '2px solid #140f1f';
  if (cell.state === 'mine')    return '2px solid #140f1f';
  if (cell.state === 'revealed') return '1.5px solid var(--line)';
  return '2px solid var(--outline)';
}

function cellContent(cell: Cell, revealAllMines = false): React.ReactNode {
  if (revealAllMines && cell.isMine) return '💥';
  if (cell.state === 'mine')    return '💥';
  if (cell.state === 'flagged') return '🚩';
  if (cell.state === 'revealed' && cell.adjacentMines > 0) {
    return (
      <span
        style={{
          color: ADJ_COLORS[cell.adjacentMines] ?? '#f7eeda',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8em',
          userSelect: 'none',
        }}
      >
        {cell.adjacentMines}
      </span>
    );
  }
  return null;
}

/* ── turn indicator bar ─────────────────────────────────────────────────── */

function TurnBar({
  myTurn,
  currentTurnUser,
  secondsRemaining,
  players,
}: {
  myTurn: boolean;
  currentTurnUser: string;
  secondsRemaining: number | null;
  players: string[];
}) {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: '10px 14px',
        borderBottom: '3px solid var(--outline)',
        background: myTurn ? 'var(--accent)' : 'var(--panel-2)',
        color: myTurn ? '#140f1f' : 'var(--ink)',
        minHeight: 48,
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 16 }}>{myTurn ? '⚡' : '⏳'}</span>
      <div style={{ flex: 1, minWidth: 120 }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>
          {myTurn ? 'Your turn!' : `${currentTurnUser}'s turn`}
        </span>
        {secondsRemaining !== null && (
          <span className="mono" style={{ fontSize: 10, marginLeft: 8, opacity: 0.75 }}>
            {secondsRemaining}s left
          </span>
        )}
        {myTurn && (
          <span className="mono" style={{ fontSize: 10, marginLeft: 8, opacity: 0.75 }}>
            click a covered cell to reveal it
          </span>
        )}
      </div>

      {/* player turn queue */}
      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
        {players.map((username, idx) => {
          const isActive = username === currentTurnUser;
          return (
            <span
              key={idx}
              className="mono"
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 20,
                border: '2px solid var(--outline)',
                background: isActive ? '#140f1f' : 'var(--panel)',
                color: isActive ? 'var(--accent)' : 'var(--ink-dim)',
                fontWeight: isActive ? 700 : 400,
                whiteSpace: 'nowrap',
                transition: 'background .2s',
              }}
            >
              {username}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ── win/lose overlay ───────────────────────────────────────────────────── */

function GameOverOverlay({
  message,
  scores,
  loserUserId,
  onPlayAgain,
  onFinish,
}: {
  won: boolean;
  message?: string;
  scores: GamePlayerScore[];
  loserUserId?: string | null;
  onPlayAgain?: () => void;
  onFinish?: () => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,122,77,.88)',
        backdropFilter: 'blur(4px)',
        gap: 12,
        padding: 24,
      }}
    >
      <div style={{ fontSize: 56 }}>💥</div>
      <div
        className="display"
        style={{ fontSize: 28, color: '#140f1f', textAlign: 'center', lineHeight: 1.2 }}
      >
        BOOM!
      </div>
      {message && (
        <div
          className="mono"
          style={{ fontSize: 13, color: '#140f1f', opacity: 0.85, textAlign: 'center', maxWidth: 260 }}
        >
          {message}
        </div>
      )}

      <div
        className="pop-sm col"
        style={{
          width: 'min(320px, 90vw)',
          padding: 12,
          gap: 8,
          background: 'var(--panel)',
          color: 'var(--ink)',
          borderRadius: 12,
        }}
      >
        <div className="display" style={{ fontSize: 14 }}>Scoreboard</div>
        {scores.map((score) => (
          <div key={score.user_id} className="flex items-center gap-2 mono" style={{ fontSize: 12 }}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {score.username ?? score.user_id}
            </span>
            <span>{score.wins} wins</span>
            {score.user_id === loserUserId && <span style={{ color: 'var(--pop-coral)', fontWeight: 700 }}>{score.losses} loss</span>}
          </div>
        ))}
      </div>

      <div className="flex gap-2" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        {onPlayAgain && (
          <button
            className="btn"
            onClick={onPlayAgain}
            style={{ marginTop: 8, background: '#140f1f', color: '#f7eeda', fontSize: 13, padding: '10px 18px' }}
          >
            Play Again
          </button>
        )}
        {onFinish && (
          <button
            className="btn"
            onClick={onFinish}
            style={{ marginTop: 8, background: 'var(--panel)', color: 'var(--ink)', fontSize: 13, padding: '10px 18px' }}
          >
            Finish Game
          </button>
        )}
      </div>
    </div>
  );
}

function ScoreStrip({ scores }: { scores: GamePlayerScore[] }) {
  if (!scores.length) return null;
  return (
    <div className="flex items-center gap-2 mono" style={{ padding: '8px 14px', borderBottom: '2px solid var(--line)', fontSize: 11, overflowX: 'auto' }}>
      {scores.map((score) => (
        <span key={score.user_id} className="chip" style={{ whiteSpace: 'nowrap', background: 'var(--panel-2)' }}>
          {score.username ?? score.user_id}: {score.wins}W/{score.losses}L
        </span>
      ))}
    </div>
  );
}

function CloseButton({ onClose }: { onClose?: () => void }) {
  if (!onClose) return null;
  return (
    <button
      className="btn btn-icon pop-sm"
      onClick={onClose}
      title="Close"
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 12,
        width: 34,
        height: 34,
        background: 'var(--panel)',
        color: 'var(--ink)',
      }}
    >
      ✕
    </button>
  );
}

function FinishedSession({ scores, onClose }: { scores: GamePlayerScore[]; onClose?: () => void }) {
  return (
    <div className="pop wobble-2 col" style={{ width: 'min(420px, 94vw)', overflow: 'hidden', boxShadow: '9px 9px 0 var(--shadow)', position: 'relative' }}>
      <CloseButton onClose={onClose} />
      <div style={{ padding: '18px 20px', borderBottom: '3px solid var(--outline)', background: 'var(--accent)', color: '#140f1f' }}>
        <div className="display" style={{ fontSize: 20 }}>Minesweeper Finished</div>
      </div>
      <div className="col" style={{ padding: 18, gap: 10 }}>
        {scores.map((score) => (
          <div key={score.user_id} className="flex items-center gap-2 pop-sm" style={{ padding: 10 }}>
            <span style={{ flex: 1, fontWeight: 700 }}>{score.username ?? score.user_id}</span>
            <span className="mono">{score.wins} wins</span>
            <span className="mono">{score.losses} losses</span>
          </div>
        ))}
      </div>
      {onClose && (
        <button
          className="btn"
          onClick={onClose}
          style={{ margin: 18, marginTop: 0, justifyContent: 'center' }}
        >
          Close
        </button>
      )}
    </div>
  );
}

/* ── main board ─────────────────────────────────────────────────────────── */

export default function MinesweeperBoard({
  board,
  myTurn,
  currentTurnUser,
  currentTurnStartedAt,
  players,
  matchNumber,
  scores,
  loserUserId,
  onReveal,
  onFlag,
  gameOver,
  onPlayAgain,
  onFinish,
  onClose,
}: MinesweeperBoardProps) {
  const [visibleGameOverMatch, setVisibleGameOverMatch] = useState<number | null>(null);
  const [turnCountdown, setTurnCountdown] = useState<{ startedAt: string | null; seconds: number | null }>(() => ({
    startedAt: currentTurnStartedAt ?? null,
    seconds: currentTurnStartedAt ? getTurnSecondsRemaining(currentTurnStartedAt) : null,
  }));

  useEffect(() => {
    if (!gameOver) return;

    const timer = window.setTimeout(() => {
      setVisibleGameOverMatch(matchNumber);
    }, GAME_OVER_LAYER_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [gameOver, matchNumber]);

  useEffect(() => {
    if (!currentTurnStartedAt || gameOver) return;

    const update = () => setTurnCountdown({
      startedAt: currentTurnStartedAt,
      seconds: getTurnSecondsRemaining(currentTurnStartedAt),
    });
    void Promise.resolve().then(update);
    const interval = window.setInterval(update, 1000);

    return () => window.clearInterval(interval);
  }, [currentTurnStartedAt, gameOver]);

  if (!board && scores.length) {
    return <FinishedSession scores={scores} onClose={onClose} />;
  }

  if (!board || board.length === 0) {
    return (
      <div
        className="pop wobble flex items-center justify-center"
        style={{ width: 340, height: 200 }}
      >
        <div className="mono" style={{ color: 'var(--ink-dim)', fontSize: 13 }}>
          Loading board…
        </div>
      </div>
    );
  }

  const rows = board.length;
  const cols = board[0].length;

  /* dynamic cell size — shrink for large boards, cap at 32 */
  const cellPx = Math.max(14, Math.min(32, Math.floor(480 / cols)));

  /* flag count */
  const flagCount = board.flat().filter((c) => c.state === 'flagged').length;
  const mineCount = board.flat().filter((c) => c.isMine).length;
  const secondsRemaining =
    !gameOver && turnCountdown.startedAt === currentTurnStartedAt ? turnCountdown.seconds : null;

  return (
    <>
      <style>{`
        @keyframes mine-flash {
          0%, 100% { background: var(--pop-coral); }
          50%       { background: #ffd23f; }
        }
        .cell-mine { animation: mine-flash .5s infinite; }
        .cell-unrevealed:hover { background: var(--accent) !important; cursor: pointer; transform: scale(1.05); }
      `}</style>

      <div
        className="pop wobble-2 col"
        style={{
          overflow: 'hidden',
          boxShadow: '9px 9px 0 var(--shadow)',
          maxWidth: '100%',
          position: 'relative',
        }}
      >
        <CloseButton onClose={onClose} />
        {/* turn bar */}
        <TurnBar
          myTurn={myTurn}
          currentTurnUser={currentTurnUser}
          secondsRemaining={secondsRemaining}
          players={players}
        />

        {/* stats row */}
        <div
          className="flex items-center gap-4 mono"
          style={{ padding: '8px 14px', borderBottom: '2px solid var(--line)', fontSize: 12 }}
        >
          <span>💣 {mineCount - flagCount} left</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>🚩 {flagCount} flagged</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>📐 {cols}×{rows}</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>Match #{matchNumber}</span>
        </div>

        <ScoreStrip scores={scores} />

        {/* grid */}
        <div
          className="scroll"
          style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '60vh', position: 'relative' }}
        >
          {gameOver && visibleGameOverMatch === matchNumber && (
            <GameOverOverlay
              won={gameOver.won}
              message={gameOver.message}
              scores={scores}
              loserUserId={loserUserId}
              onPlayAgain={onPlayAgain}
              onFinish={onFinish}
            />
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
              gridTemplateRows: `repeat(${rows}, ${cellPx}px)`,
              gap: 2,
              padding: 10,
              width: 'fit-content',
              pointerEvents: gameOver ? 'none' : undefined,
            }}
          >
            {board.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const isUnrevealed = cell.state === 'unrevealed';
                const isMineCell   = cell.state === 'mine';
                const showMineLocation = Boolean(gameOver && cell.isMine);

                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    className={
                      isMineCell
                        ? 'cell-mine'
                        : isUnrevealed && myTurn
                        ? 'cell-unrevealed'
                        : ''
                    }
                    onClick={() => {
                      if (!myTurn || !isUnrevealed) return;
                      onReveal(rIdx, cIdx);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (!myTurn || cell.state === 'revealed' || cell.state === 'mine') return;
                      onFlag(rIdx, cIdx);
                    }}
                    style={{
                      width: cellPx,
                      height: cellPx,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: cellPx < 22 ? 9 : cellPx < 28 ? 11 : 13,
                      border: cellBorder(cell, showMineLocation),
                      borderRadius: cellPx < 20 ? 2 : 4,
                      background: cellBackground(cell, showMineLocation),
                      cursor: isUnrevealed && myTurn ? 'pointer' : 'default',
                      boxShadow: isUnrevealed && !showMineLocation
                        ? '2px 2px 0 var(--shadow)'
                        : undefined,
                      transition: 'background .1s, transform .08s',
                      userSelect: 'none',
                      flexShrink: 0,
                    }}
                  >
                    {cellContent(cell, showMineLocation)}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* disabled overlay when not my turn */}
        {!myTurn && !gameOver && (
          <div
            className="mono"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '6px 14px',
              background: 'rgba(8,5,16,.65)',
              backdropFilter: 'blur(2px)',
              fontSize: 11,
              color: 'var(--ink-soft)',
              textAlign: 'center',
            }}
          >
            Waiting for {currentTurnUser} to move{secondsRemaining !== null ? ` (${secondsRemaining}s)` : ''}…
          </div>
        )}
      </div>
    </>
  );
}
