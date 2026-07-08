'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SudokuGrid, SudokuPlayerScore } from '@/lib/types';
import { clearLineNotes, completedDigits } from '@/lib/game/sudoku';

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
    <div
      className="flex items-center gap-2 mono"
      style={{
        padding: '8px 14px',
        borderBottom: '2px solid var(--line)',
        fontSize: 11,
        overflowX: 'auto',
        maxWidth: '100%',
        minWidth: 0,
        scrollbarWidth: 'thin',
      }}
    >
      {scores.map((score) => (
        <span key={score.user_id} className="chip" style={{ whiteSpace: 'nowrap', background: 'var(--panel-2)' }}>
          {score.username ?? score.user_id}: {score.correct}✓ / {score.wrong}✗
        </span>
      ))}
    </div>
  );
}

function NoteGrid({ marks }: { marks: number[] }) {
  return (
    <div
      style={{
        position: 'absolute', inset: 2, display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)',
        fontSize: 9, fontWeight: 600, color: 'var(--ink-dim)', lineHeight: 1,
      }}
    >
      {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
        <div key={n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {marks.includes(n) ? n : ''}
        </div>
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
  const [focusedCellState, setFocusedCellState] = useState<{
    matchNumber: number;
    cell: { row: number; col: number } | null;
  }>({ matchNumber, cell: null });
  const [wrongFlash, setWrongFlash] = useState<{ row: number; col: number } | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [notesState, setNotesState] = useState<{
    matchNumber: number;
    notes: Record<string, number[]>;
  }>({ matchNumber, notes: {} });
  const [correctFlash, setCorrectFlash] = useState<{ row: number; col: number } | null>(null);

  const focusedCell = focusedCellState.matchNumber === matchNumber ? focusedCellState.cell : null;
  const notes = useMemo(
    () => clearLineNotes(notesState.matchNumber === matchNumber ? notesState.notes : {}, grid),
    [grid, matchNumber, notesState]
  );
  const doneDigits = useMemo(() => completedDigits(grid), [grid]);

  const canInput = focusedCell != null && grid[focusedCell.row][focusedCell.col].value === null;
  const focusedValue = focusedCell ? grid[focusedCell.row][focusedCell.col].value : null;

  const toggleNote = useCallback((row: number, col: number, value: number) => {
    const key = `${row},${col}`;
    setNotesState((prev) => {
      const base = prev.matchNumber === matchNumber ? clearLineNotes(prev.notes, grid) : {};
      const existing = base[key] ?? [];
      const marks = existing.includes(value)
        ? existing.filter((v) => v !== value)
        : [...existing, value].sort((a, b) => a - b);
      const next = { ...base };
      if (marks.length) next[key] = marks;
      else delete next[key];
      return { matchNumber, notes: next };
    });
  }, [grid, matchNumber]);

  const clearSubmittedNote = useCallback((key: string) => {
    setNotesState((prev) => {
      const base = prev.matchNumber === matchNumber ? clearLineNotes(prev.notes, grid) : {};
      if (!(key in base)) return { matchNumber, notes: base };
      const next = { ...base };
      delete next[key];
      return { matchNumber, notes: next };
    });
  }, [grid, matchNumber]);

  const handlePick = useCallback(async (value: number) => {
    if (!canInput || !focusedCell) return;
    if (doneDigits.has(value)) return;
    const { row, col } = focusedCell;
    if (notesMode) {
      toggleNote(row, col, value);
      return;
    }
    const result = await onSubmitCell(row, col, value);
    if (result === 'wrong') {
      setWrongFlash({ row, col });
      window.setTimeout(() => setWrongFlash(null), 400);
    } else if (result === 'correct') {
      clearSubmittedNote(`${row},${col}`);
      setCorrectFlash({ row, col });
      window.setTimeout(() => setCorrectFlash(null), 350);
    }
  }, [canInput, clearSubmittedNote, doneDigits, focusedCell, notesMode, onSubmitCell, toggleNote]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (event.key >= '1' && event.key <= '9') {
        event.preventDefault();
        void handlePick(Number(event.key));
      } else if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setNotesMode((mode) => !mode);
      } else if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault();
        setFocusedCellState({ matchNumber, cell: null });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePick, matchNumber]);

  const cellPx = 52;

  return (
    <>
      <style>{`
        @keyframes sudoku-wrong-flash {
          0%, 100% { background: var(--panel-3); }
          50% { background: var(--pop-coral); }
        }
        @keyframes sudoku-correct-flash {
          0%, 100% { filter: none; }
          45% { filter: brightness(1.35) saturate(1.2); }
        }
        .sudoku-cell-wrong { animation: sudoku-wrong-flash .4s ease; }
        .sudoku-cell-correct { animation: sudoku-correct-flash .35s ease; }
        .sudoku-cell-empty:hover { background: var(--accent) !important; cursor: pointer; }
      `}</style>

      <div className="pop wobble-2 col" style={{ overflow: 'hidden', boxShadow: '9px 9px 0 var(--shadow)', maxWidth: '96vw', width: 'min(692px, 96vw)', position: 'relative' }}>
        <CloseButton onClose={onClose} />

        <div className="flex items-center gap-4 mono" style={{ padding: '12px 16px', borderBottom: '2px solid var(--line)', fontSize: 14 }}>
          <span>🔢 Sudoku Race</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>Match #{matchNumber}</span>
        </div>

        <ScoreStrip scores={scores} />

        <div className="flex" style={{ position: 'relative', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          {gameOver && (
            <GameOverOverlay
              winnerUsername={gameOver.winnerUsername}
              scores={scores}
              onPlayAgain={onPlayAgain}
              onFinish={onFinish}
            />
          )}

          <div className="scroll" style={{ overflow: 'auto', maxHeight: '80vh' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(9, ${cellPx}px)`,
                gridTemplateRows: `repeat(9, ${cellPx}px)`,
                gap: 0,
                padding: 12,
                width: 'fit-content',
                pointerEvents: gameOver ? 'none' : undefined,
              }}
            >
              {grid.map((row, rIdx) =>
                row.map((cell, cIdx) => {
                  const isEmpty = cell.value === null;
                  const fillColor = cell.filledBy ? playerColors[cell.filledBy] : undefined;
                  const isWrongFlash = wrongFlash?.row === rIdx && wrongFlash?.col === cIdx;
                  const isCorrectFlash = correctFlash?.row === rIdx && correctFlash?.col === cIdx;
                  const isSelected = focusedCell?.row === rIdx && focusedCell?.col === cIdx;
                  const isAxisHighlight = !isSelected && focusedCell != null &&
                    (focusedCell.row === rIdx || focusedCell.col === cIdx);
                  const isBoxHighlight = !isSelected && focusedCell != null &&
                    Math.floor(focusedCell.row / 3) === Math.floor(rIdx / 3) &&
                    Math.floor(focusedCell.col / 3) === Math.floor(cIdx / 3);
                  const isSameNumber = !isSelected && focusedValue != null && cell.value === focusedValue;
                  const cellNotes = isEmpty ? notes[`${rIdx},${cIdx}`] : undefined;
                  const highlightFill = isSameNumber
                    ? 'rgba(250,204,21,0.18)'
                    : isAxisHighlight
                      ? 'rgba(0,229,255,0.16)'
                      : isBoxHighlight
                        ? 'rgba(0,229,255,0.08)'
                        : 'transparent';

                  return (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={[
                        isWrongFlash ? 'sudoku-cell-wrong' : '',
                        isCorrectFlash ? 'sudoku-cell-correct' : '',
                        isEmpty ? 'sudoku-cell-empty' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => setFocusedCellState({ matchNumber, cell: { row: rIdx, col: cIdx } })}
                      style={{
                        width: cellPx,
                        height: cellPx,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        fontSize: 22,
                        fontWeight: cell.given ? 800 : 600,
                        borderTop: rIdx % 3 === 0 ? '3px solid var(--outline)' : '1px solid var(--line)',
                        borderLeft: cIdx % 3 === 0 ? '3px solid var(--outline)' : '1px solid var(--line)',
                        borderRight: cIdx === 8 ? '3px solid var(--outline)' : undefined,
                        borderBottom: rIdx === 8 ? '3px solid var(--outline)' : undefined,
                        background: cell.given ? 'var(--panel-2)' : 'var(--panel-3)',
                        boxShadow: isSelected
                          ? 'inset 0 0 0 3px var(--accent), inset 0 0 0 100px rgba(0,229,255,0.12)'
                          : `inset 0 0 0 100px ${highlightFill}`,
                        color: cell.given ? 'var(--ink)' : cell.filledBy === currentUserId ? 'var(--ink)' : 'var(--ink)',
                        userSelect: 'none',
                      }}
                    >
                      {fillColor && !cell.given && (
                        <span
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            left: 5,
                            right: 5,
                            bottom: 4,
                            height: 3,
                            borderRadius: 999,
                            background: fillColor,
                            opacity: 0.9,
                          }}
                        />
                      )}
                      {cell.value ?? (cellNotes?.length ? <NoteGrid marks={cellNotes} /> : '')}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div
            className="col"
            style={{
              width: 168,
              padding: 14,
              gap: 10,
              borderLeft: '2px solid var(--line)',
              alignSelf: 'stretch',
              justifyContent: 'center',
              alignItems: 'stretch',
              flexShrink: 0,
            }}
          >
            <div className="mono" style={{ fontSize: 12, color: 'var(--ink-dim)', textAlign: 'center' }}>
              {canInput ? (notesMode ? 'MARK CANDIDATES' : 'PICK A NUMBER') : focusedCell ? 'CELL FILLED' : 'SELECT A CELL'}
            </div>
            <button
              className="btn pop-sm"
              onClick={() => setNotesMode((m) => !m)}
              style={{
                fontSize: 12,
                padding: '8px 10px',
                width: '100%',
                background: notesMode ? 'var(--accent)' : 'var(--panel)',
                color: notesMode ? '#140f1f' : 'var(--ink)',
              }}
            >
              ✏️ Notes {notesMode ? 'ON' : 'OFF'}
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 48px)', gap: 6, justifyContent: 'center' }}>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((value) => {
                const isDone = doneDigits.has(value);
                return (
                  <button
                    key={value}
                    className="btn"
                    disabled={!canInput || Boolean(gameOver) || isDone}
                    onClick={() => { void handlePick(value); }}
                    style={{
                      width: 48,
                      height: 48,
                      fontSize: 20,
                      justifyContent: 'center',
                      position: 'relative',
                      opacity: isDone ? 0.6 : undefined,
                    }}
                    title={isDone ? `${value} complete` : undefined}
                  >
                    {value}
                    {isDone && (
                      <span
                        aria-hidden="true"
                        style={{ position: 'absolute', top: 4, right: 6, fontSize: 12, color: 'var(--pop-lime)' }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
