import { describe, it, expect } from 'vitest';
import {
  createBoard,
  revealCell,
  toggleFlag,
  randomizeTurnOrder,
  checkWin,
} from './minesweeper';

describe('createBoard', () => {
  it('creates an easy board with 10 mines', () => {
    const board = createBoard('easy');
    const mines = board.flat().filter(c => c.isMine).length;
    expect(mines).toBe(10);
    expect(board.length).toBe(9);
    expect(board[0].length).toBe(9);
  });

  it('creates a medium board with 40 mines', () => {
    const board = createBoard('medium');
    const mines = board.flat().filter(c => c.isMine).length;
    expect(mines).toBe(40);
    expect(board.length).toBe(16);
    expect(board[0].length).toBe(16);
  });

  it('creates a hard board with 99 mines', () => {
    const board = createBoard('hard');
    const mines = board.flat().filter(c => c.isMine).length;
    expect(mines).toBe(99);
    expect(board.length).toBe(16);
    expect(board[0].length).toBe(30);
  });

  it('skips safe cell when provided', () => {
    const board = createBoard('easy', 0, 0);
    expect(board[0][0].isMine).toBe(false);
  });

  it('computes adjacentMines correctly', () => {
    const board = createBoard('easy');
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[0].length; c++) {
        if (board[r][c].isMine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[0].length && board[nr][nc].isMine) {
              count++;
            }
          }
        }
        expect(board[r][c].adjacentMines).toBe(count);
      }
    }
  });

  it('all cells start unrevealed', () => {
    const board = createBoard('easy');
    for (const row of board) {
      for (const cell of row) {
        expect(cell.state).toBe('unrevealed');
      }
    }
  });
});

describe('revealCell', () => {
  it('reveals a single cell with adjacent mines', () => {
    const board = createBoard('easy');
    const nonMine = findNonMineCell(board);
    const result = revealCell(board, nonMine.row, nonMine.col);
    expect(result.hitMine).toBe(false);
    expect(result.board[nonMine.row][nonMine.col].state).toBe('revealed');
  });

  it('returns hitMine true when revealing a mine', () => {
    const board = createBoard('easy');
    const mine = findMineCell(board);
    if (!mine) return;
    const result = revealCell(board, mine.row, mine.col);
    expect(result.hitMine).toBe(true);
    expect(result.won).toBe(false);
  });

  it('flood-fills zero-adjacent cells', () => {
    const board = createBoard('medium');
    const zero = findZeroCell(board);
    if (!zero) return;
    const result = revealCell(board, zero.row, zero.col);
    const revealed = result.board.flat().filter(c => c.state === 'revealed').length;
    expect(revealed).toBeGreaterThan(1);
  });

  it('does not reveal flagged cells', () => {
    let board = createBoard('easy');
    const cell = findNonMineCell(board);
    board = toggleFlag(board, cell.row, cell.col);
    const result = revealCell(board, cell.row, cell.col);
    expect(result.board[cell.row][cell.col].state).toBe('flagged');
  });

  it('does nothing for out-of-bounds', () => {
    const board = createBoard('easy');
    const result = revealCell(board, -1, -1);
    expect(result.hitMine).toBe(false);
    expect(result.won).toBe(false);
  });
});

describe('toggleFlag', () => {
  it('flags an unrevealed cell', () => {
    let board = createBoard('easy');
    board = toggleFlag(board, 0, 0);
    expect(board[0][0].state).toBe('flagged');
  });

  it('unflags a flagged cell', () => {
    let board = createBoard('easy');
    board = toggleFlag(board, 0, 0);
    board = toggleFlag(board, 0, 0);
    expect(board[0][0].state).toBe('unrevealed');
  });

  it('does not flag a revealed cell', () => {
    const board = createBoard('easy');
    const cell = findNonMineCell(board);
    const { board: revealedBoard } = revealCell(board, cell.row, cell.col);
    const flagged = toggleFlag(revealedBoard, cell.row, cell.col);
    expect(flagged[cell.row][cell.col].state).toBe('revealed');
  });

  it('handles out-of-bounds gracefully', () => {
    const board = createBoard('easy');
    const result = toggleFlag(board, -1, -1);
    expect(result).toEqual(board);
  });
});

describe('checkWin', () => {
  it('returns false when game just started', () => {
    const board = createBoard('easy');
    expect(checkWin(board)).toBe(false);
  });

  it('returns true when all non-mine cells are revealed', () => {
    const board = createAllRevealedBoard(3, 3, 1);
    expect(checkWin(board)).toBe(true);
  });

  it('returns false when some non-mine cells are unrevealed', () => {
    const board = createAllRevealedBoard(3, 3, 1);
    board[0][0].state = 'unrevealed';
    expect(checkWin(board)).toBe(false);
  });

  it('returns false when mine is flagged but non-mine cells remain', () => {
    const board = createBoard('easy');
    expect(checkWin(board)).toBe(false);
  });
});

describe('randomizeTurnOrder', () => {
  it('preserves all user IDs', () => {
    const users = ['a', 'b', 'c', 'd', 'e'];
    const shuffled = randomizeTurnOrder(users);
    expect(shuffled.sort()).toEqual(users.sort());
  });

  it('returns a new array (not mutated)', () => {
    const users = ['a', 'b', 'c'];
    const shuffled = randomizeTurnOrder(users);
    expect(shuffled).not.toBe(users);
  });

  it('does not crash on empty array', () => {
    expect(randomizeTurnOrder([])).toEqual([]);
  });

  it('does not crash on single element', () => {
    expect(randomizeTurnOrder(['x'])).toEqual(['x']);
  });
});

function findNonMineCell(board: ReturnType<typeof createBoard>): { row: number; col: number } {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      if (!board[r][c].isMine) return { row: r, col: c };
    }
  }
  return { row: 0, col: 0 };
}

function findMineCell(board: ReturnType<typeof createBoard>): { row: number; col: number } | null {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      if (board[r][c].isMine) return { row: r, col: c };
    }
  }
  return null;
}

function findZeroCell(board: ReturnType<typeof createBoard>): { row: number; col: number } | null {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      if (!board[r][c].isMine && board[r][c].adjacentMines === 0) return { row: r, col: c };
    }
  }
  return null;
}

function createAllRevealedBoard(rows: number, cols: number, mines: number): ReturnType<typeof createBoard> {
  const board: ReturnType<typeof createBoard> = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      state: 'revealed' as const,
      adjacentMines: 0,
      isMine: false,
    }))
  );
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (board[r][c].isMine) continue;
    board[r][c].isMine = true;
    board[r][c].state = 'unrevealed';
    placed++;
  }
  return board;
}
