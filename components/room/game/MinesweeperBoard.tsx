'use client';

import type { Board, Cell } from '@/lib/types';

interface MinesweeperBoardProps {
  board: Board;
  myTurn: boolean;
  currentTurnUser: string;  // username of the current turn player
  players: string[];         // usernames in turn order
  onReveal: (row: number, col: number) => void;
  onFlag: (row: number, col: number) => void;
  /** optional: show win/loss overlay */
  gameOver?: { won: boolean; message?: string } | null;
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

function cellBackground(cell: Cell): string {
  switch (cell.state) {
    case 'revealed': return 'var(--panel-2)';
    case 'flagged':  return 'var(--pop-yellow)';
    case 'mine':     return 'var(--pop-coral)';
    default:         return 'var(--panel-3)';          // unrevealed
  }
}

function cellBorder(cell: Cell): string {
  if (cell.state === 'flagged') return '2px solid #140f1f';
  if (cell.state === 'mine')    return '2px solid #140f1f';
  if (cell.state === 'revealed') return '1.5px solid var(--line)';
  return '2px solid var(--outline)';
}

function cellContent(cell: Cell): React.ReactNode {
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
  players,
}: {
  myTurn: boolean;
  currentTurnUser: string;
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
        {myTurn && (
          <span className="mono" style={{ fontSize: 10, marginLeft: 8, opacity: 0.75 }}>
            left-click reveal · right-click flag
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

function GameOverOverlay({ won, message }: { won: boolean; message?: string }) {
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
        background: won
          ? 'rgba(34,197,94,.82)'
          : 'rgba(255,122,77,.82)',
        backdropFilter: 'blur(4px)',
        gap: 12,
        padding: 24,
      }}
    >
      <div style={{ fontSize: 56 }}>{won ? '🏆' : '💥'}</div>
      <div
        className="display"
        style={{ fontSize: 28, color: '#140f1f', textAlign: 'center', lineHeight: 1.2 }}
      >
        {won ? 'You Win!' : 'Game Over'}
      </div>
      {message && (
        <div
          className="mono"
          style={{ fontSize: 13, color: '#140f1f', opacity: 0.85, textAlign: 'center', maxWidth: 260 }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

/* ── main board ─────────────────────────────────────────────────────────── */

export default function MinesweeperBoard({
  board,
  myTurn,
  currentTurnUser,
  players,
  onReveal,
  onFlag,
  gameOver,
}: MinesweeperBoardProps) {
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
        {/* turn bar */}
        <TurnBar myTurn={myTurn} currentTurnUser={currentTurnUser} players={players} />

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
        </div>

        {/* grid */}
        <div
          className="scroll"
          style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '60vh', position: 'relative' }}
        >
          {gameOver && <GameOverOverlay won={gameOver.won} message={gameOver.message} />}

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
                      border: cellBorder(cell),
                      borderRadius: cellPx < 20 ? 2 : 4,
                      background: cellBackground(cell),
                      cursor: isUnrevealed && myTurn ? 'pointer' : 'default',
                      boxShadow: isUnrevealed
                        ? '2px 2px 0 var(--shadow)'
                        : undefined,
                      transition: 'background .1s, transform .08s',
                      userSelect: 'none',
                      flexShrink: 0,
                    }}
                  >
                    {cellContent(cell)}
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
            Waiting for {currentTurnUser} to move…
          </div>
        )}
      </div>
    </>
  );
}
