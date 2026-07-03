import type { Board, Level, GameMove, GamePlayerScore } from '../types';
import { LEVEL_CONFIG } from '../types';

function cloneBoard(board: Board): Board {
  return board.map(row => row.map(cell => ({ ...cell })));
}

function floodReveal(board: Board, row: number, col: number) {
  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) return;
  const cell = board[row][col];
  if (cell.state === 'revealed' || cell.state === 'flagged' || cell.state === 'mine') return;
  cell.state = 'revealed';
  if (cell.adjacentMines > 0) return;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      floodReveal(board, row + dr, col + dc);
    }
  }
}

export function createBoard(level: Level, safeRow?: number, safeCol?: number): Board {
  const { rows, cols, mines: totalMines } = LEVEL_CONFIG[level];

  const board: Board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      state: 'unrevealed' as const,
      adjacentMines: 0,
      isMine: false,
    }))
  );

  let placed = 0;
  while (placed < totalMines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (board[r][c].isMine) continue;
    if (safeRow !== undefined && safeCol !== undefined && r === safeRow && c === safeCol) continue;
    board[r][c].isMine = true;
    placed++;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine) {
            count++;
          }
        }
      }
      board[r][c].adjacentMines = count;
    }
  }

  return board;
}

export function revealCell(
  board: Board,
  row: number,
  col: number
): { board: Board; hitMine: boolean; won: boolean } {
  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
    return { board, hitMine: false, won: false };
  }

  const newBoard = cloneBoard(board);
  const cell = newBoard[row][col];

  if (cell.state === 'flagged' || cell.state === 'revealed') {
    return { board: newBoard, hitMine: false, won: false };
  }

  if (cell.isMine) {
    newBoard[row][col].state = 'mine';
    return { board: newBoard, hitMine: true, won: false };
  }

  floodReveal(newBoard, row, col);

  const won = checkWin(newBoard);
  return { board: newBoard, hitMine: false, won };
}

export function toggleFlag(board: Board, row: number, col: number): Board {
  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) return board;

  const newBoard = cloneBoard(board);
  const cell = newBoard[row][col];
  if (cell.state === 'unrevealed') {
    cell.state = 'flagged';
  } else if (cell.state === 'flagged') {
    cell.state = 'unrevealed';
  }
  return newBoard;
}

export function randomizeTurnOrder(userIds: string[]): string[] {
  const shuffled = [...userIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function checkWin(board: Board): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (!cell.isMine && cell.state !== 'revealed') return false;
    }
  }
  return true;
}

export function applyMove(board: Board, move: GameMove): Board {
  const { row, col, action } = move;
  if (action === 'flag') return toggleFlag(board, row, col);
  if (action === 'reveal') return revealCell(board, row, col).board;

  // chord: reveal all unflagged neighbors when flagged count matches adjacent mine count
  const newBoard = cloneBoard(board);
  const cell = newBoard[row][col];
  if (cell.state !== 'revealed') return newBoard;

  let flagged = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < newBoard.length && nc >= 0 && nc < newBoard[0].length) {
        if (newBoard[nr][nc].state === 'flagged') flagged++;
      }
    }
  }
  if (flagged !== cell.adjacentMines) return newBoard;

  let result = newBoard;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < result.length && nc >= 0 && nc < result[0].length) {
        if (result[nr][nc].state === 'unrevealed') {
          result = revealCell(result, nr, nc).board;
        }
      }
    }
  }
  return result;
}

export function replayMoves(board: Board, moves: GameMove[]): Board {
  return moves.reduce((b, move) => applyMove(b, move), board);
}

export function scoreMineHitMatch<T extends GamePlayerScore>(players: T[], loserUserId: string): T[] {
  return players.map((player) => ({
    ...player,
    wins: player.user_id === loserUserId ? player.wins : player.wins + 1,
    losses: player.user_id === loserUserId ? player.losses + 1 : player.losses,
  }));
}

export function boardToCellRows(board: Board, matchId: string) {
  return board.flatMap((row, rowIndex) =>
    row.map((cell, colIndex) => ({
      match_id: matchId,
      x: colIndex,
      y: rowIndex,
      is_mine: cell.isMine,
      is_opened: cell.state === 'revealed' || cell.state === 'mine',
      is_flagged: cell.state === 'flagged',
      adjacent_count: cell.adjacentMines,
      opened_by: null as string | null,
      opened_at: null as string | null,
    }))
  );
}

export function cellRowsToBoard(
  cells: Array<{
    x: number;
    y: number;
    is_mine: boolean;
    is_opened: boolean;
    is_flagged?: boolean;
    adjacent_count: number;
  }>
): Board {
  const rows = Math.max(...cells.map((cell) => cell.y)) + 1;
  const cols = Math.max(...cells.map((cell) => cell.x)) + 1;
  const board: Board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      state: 'unrevealed' as const,
      adjacentMines: 0,
      isMine: false,
    }))
  );

  for (const cell of cells) {
    board[cell.y][cell.x] = {
      state: cell.is_opened ? (cell.is_mine ? 'mine' : 'revealed') : cell.is_flagged ? 'flagged' : 'unrevealed',
      adjacentMines: cell.adjacent_count,
      isMine: cell.is_mine,
    };
  }

  return board;
}
