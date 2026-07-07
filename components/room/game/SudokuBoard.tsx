'use client';

import { useState } from 'react';
import type { SudokuGrid, SudokuPlayerScore } from '@/lib/types';

interface SudokuBoardProps {
  grid: SudokuGrid;
  scores: SudokuPlayerScore[];
  matchNumber: number;
  currentUserId: string;
  playerColors: Record<string, string>;
  onSubmitCell: (row: number, col: number, value: number) => Promise<'correct' | 'wrong' | 'taken'>;
  gameOver?: { won: boolean; winnerUsername?: string } | null;
  onPlayAgain?: () => void;
  onFinish?: () => void;
  onClose?: () => void;
}

function CloseButton({ onClose }: { onClose?: () => void }) {
  if (!onClose) return null;
  return (
    <button
      className="btn btn-icon pop-sm"
      onClick={onClose}
      title="Close"
      style={{ position: 'absolute', top: 8, right: 8, zIndex: 12, width: 34, height: 34, background: 'var(--panel)', color: 'var(--ink)' }}
    >
      ✕
    </button>
  );
}

function ScoreStrip({ scores }: { scores: SudokuPlayerScore[] }) {
  if (!scores.length) return null;
  return (
    <div className="flex items-center gap-2 mono" style={{ padding: '8px 14px', borderBottom: '2px solid var(--line)', fontSize: 11, overflowX: 'auto' }}>
      {scores.map((score) => (
        <span key={score.user_id} className="chip" style={{ whiteSpace: 'nowrap', background: 'var(--panel-2)' }}>
          {score.username ?? score.user_id}: {score.correct}✓ / {score.wrong}✗
        </span>
      ))}
    </div>
  );
}

function GameOverOverlay({ winnerUsername, scores, onPlayAgain, onFinish }: {
  winnerUsername?: string;
  scores: SudokuPlayerScore[];
  onPlayAgain?: () => void;
  onFinish?: () => void;
}) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'rgba(34,197,94,.88)',
        backdropFilter: 'blur(4px)', gap: 12, padding: 24,
      }}
    >
      <div style={{ fontSize: 56 }}>🏆</div>
      <div className="display" style={{ fontSize: 24, color: '#140f1f', textAlign: 'center' }}>
        {winnerUsername ? `${winnerUsername} wins!` : 'Board complete!'}
      </div>

      <div className="pop-sm col" style={{ width: 'min(320px, 90vw)', padding: 12, gap: 8, background: 'var(--panel)', color: 'var(--ink)', borderRadius: 12 }}>
        <div className="display" style={{ fontSize: 14 }}>Scoreboard</div>
        {scores.map((score) => (
          <div key={score.user_id} className="flex items-center gap-2 mono" style={{ fontSize: 12 }}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {score.username ?? score.user_id}
            </span>
            <span>{score.correct}✓ {score.wrong}✗</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        {onPlayAgain && (
          <button className="btn" onClick={onPlayAgain} style={{ marginTop: 8, background: '#140f1f', color: '#f7eeda', fontSize: 13, padding: '10px 18px' }}>
            Play Again
          </button>
        )}
        {onFinish && (
          <button className="btn" onClick={onFinish} style={{ marginTop: 8, background: 'var(--panel)', color: 'var(--ink)', fontSize: 13, padding: '10px 18px' }}>
            Finish Game
          </button>
        )}
      </div>
    </div>
  );
}

export default function SudokuBoard({
  grid, scores, matchNumber, currentUserId, playerColors, onSubmitCell, gameOver, onPlayAgain, onFinish, onClose,
}: SudokuBoardProps) {
  const [pickerCell, setPickerCell] = useState<{ row: number; col: number } | null>(null);
  const [wrongFlash, setWrongFlash] = useState<{ row: number; col: number } | null>(null);

  const handlePick = async (value: number) => {
    if (!pickerCell) return;
    const { row, col } = pickerCell;
    setPickerCell(null);
    const result = await onSubmitCell(row, col, value);
    if (result === 'wrong') {
      setWrongFlash({ row, col });
      window.setTimeout(() => setWrongFlash(null), 400);
    }
  };

  const cellPx = 38;

  return (
    <>
      <style>{`
        @keyframes sudoku-wrong-flash {
          0%, 100% { background: var(--panel-3); }
          50% { background: var(--pop-coral); }
        }
        .sudoku-cell-wrong { animation: sudoku-wrong-flash .4s ease; }
        .sudoku-cell-empty:hover { background: var(--accent) !important; cursor: pointer; }
      `}</style>

      <div className="pop wobble-2 col" style={{ overflow: 'hidden', boxShadow: '9px 9px 0 var(--shadow)', maxWidth: '100%', position: 'relative' }}>
        <CloseButton onClose={onClose} />

        <div className="flex items-center gap-4 mono" style={{ padding: '10px 14px', borderBottom: '2px solid var(--line)', fontSize: 12 }}>
          <span>🔢 Sudoku Race</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>Match #{matchNumber}</span>
        </div>

        <ScoreStrip scores={scores} />

        <div className="scroll" style={{ overflow: 'auto', maxHeight: '70vh', position: 'relative' }}>
          {gameOver && (
            <GameOverOverlay
              winnerUsername={gameOver.winnerUsername}
              scores={scores}
              onPlayAgain={onPlayAgain}
              onFinish={onFinish}
            />
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(9, ${cellPx}px)`,
              gridTemplateRows: `repeat(9, ${cellPx}px)`,
              gap: 0,
              padding: 10,
              width: 'fit-content',
              pointerEvents: gameOver ? 'none' : undefined,
            }}
          >
            {grid.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const isEmpty = cell.value === null;
                const fillColor = cell.filledBy ? playerColors[cell.filledBy] : undefined;
                const isWrongFlash = wrongFlash?.row === rIdx && wrongFlash?.col === cIdx;

                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    className={isWrongFlash ? 'sudoku-cell-wrong' : isEmpty ? 'sudoku-cell-empty' : ''}
                    onClick={() => { if (isEmpty) setPickerCell({ row: rIdx, col: cIdx }); }}
                    style={{
                      width: cellPx,
                      height: cellPx,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: cell.given ? 800 : 600,
                      borderTop: rIdx % 3 === 0 ? '2.5px solid var(--outline)' : '1px solid var(--line)',
                      borderLeft: cIdx % 3 === 0 ? '2.5px solid var(--outline)' : '1px solid var(--line)',
                      borderRight: cIdx === 8 ? '2.5px solid var(--outline)' : undefined,
                      borderBottom: rIdx === 8 ? '2.5px solid var(--outline)' : undefined,
                      background: cell.given ? 'var(--panel-2)' : fillColor ? `${fillColor}55` : 'var(--panel-3)',
                      color: cell.given ? 'var(--ink)' : cell.filledBy === currentUserId ? 'var(--ink)' : 'var(--ink)',
                      userSelect: 'none',
                    }}
                  >
                    {cell.value ?? ''}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {pickerCell && (
          <div className="scrim" style={{ zIndex: 20 }} onClick={() => setPickerCell(null)}>
            <div
              className="pop-sm"
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 44px)', gap: 6, padding: 12, background: 'var(--panel)', borderRadius: 12 }}
            >
              {Array.from({ length: 9 }, (_, i) => i + 1).map((value) => (
                <button
                  key={value}
                  className="btn"
                  onClick={() => { void handlePick(value); }}
                  style={{ width: 44, height: 44, fontSize: 18, justifyContent: 'center' }}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
