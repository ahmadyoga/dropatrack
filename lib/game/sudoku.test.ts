import { describe, it, expect } from 'vitest';
import {
  generateSolvedGrid,
  generatePuzzle,
  gradeDifficulty,
  hasUniqueSolution,
  puzzleToCellRows,
  cellRowsToGrid,
  isBoardComplete,
  clearLineNotes,
  completedDigits,
} from './sudoku';

function isValidSudoku(grid: number[][]): boolean {
  const unitOk = (values: number[]) =>
    [...values].sort().join(',') === '1,2,3,4,5,6,7,8,9';

  for (let r = 0; r < 9; r++) {
    if (!unitOk(grid[r])) return false;
  }
  for (let c = 0; c < 9; c++) {
    if (!unitOk(grid.map((row) => row[c]))) return false;
  }
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const box: number[] = [];
      for (let r = br; r < br + 3; r++) {
        for (let c = bc; c < bc + 3; c++) {
          box.push(grid[r][c]);
        }
      }
      if (!unitOk(box)) return false;
    }
  }
  return true;
}

describe('generateSolvedGrid', () => {
  it('produces a fully valid 9x9 sudoku solution', () => {
    const grid = generateSolvedGrid();
    expect(grid.length).toBe(9);
    expect(grid.every((row) => row.length === 9)).toBe(true);
    expect(isValidSudoku(grid)).toBe(true);
  });

  it('produces a different grid on repeated calls (randomized)', () => {
    const a = generateSolvedGrid();
    const b = generateSolvedGrid();
    expect(a).not.toEqual(b);
  });
});

describe('generatePuzzle', () => {
  // Dig-holes makes the configured given count a floor: uniqueness may block
  // further removal, so a level can end up with a few extra givens.
  it('easy level keeps at least 40 given cells', () => {
    const { puzzle } = generatePuzzle('easy');
    const given = puzzle.flat().filter((v) => v !== 0).length;
    expect(given).toBeGreaterThanOrEqual(40);
    expect(given).toBeLessThan(81);
  });

  it('medium level keeps at least 32 given cells', () => {
    const { puzzle } = generatePuzzle('medium');
    const given = puzzle.flat().filter((v) => v !== 0).length;
    expect(given).toBeGreaterThanOrEqual(32);
  });

  it('hard level keeps at least 24 given cells', () => {
    const { puzzle } = generatePuzzle('hard');
    const given = puzzle.flat().filter((v) => v !== 0).length;
    expect(given).toBeGreaterThanOrEqual(24);
  });

  it('grades each level to its target difficulty', () => {
    // Retry cap means a rare fallback can miss the exact tier; check the bulk.
    for (const level of ['easy', 'medium', 'hard'] as const) {
      const grades = Array.from({ length: 5 }, () =>
        gradeDifficulty(generatePuzzle(level).puzzle)
      );
      expect(grades.filter((g) => g === level).length).toBeGreaterThanOrEqual(4);
    }
  });

  it('always produces a puzzle with a unique solution', () => {
    for (const level of ['easy', 'medium', 'hard'] as const) {
      expect(hasUniqueSolution(generatePuzzle(level).puzzle)).toBe(true);
    }
  });

  it('every non-zero puzzle cell matches the solution', () => {
    const { puzzle, solution } = generatePuzzle('medium');
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] !== 0) {
          expect(puzzle[r][c]).toBe(solution[r][c]);
        }
      }
    }
  });
});

describe('puzzleToCellRows / cellRowsToGrid round-trip', () => {
  it('hydrates given cells as locked with their value', () => {
    const { puzzle, solution } = generatePuzzle('easy');
    const rows = puzzleToCellRows(puzzle, solution, 'match-1');
    expect(rows.length).toBe(81);

    const cellRows = rows.map((row) => ({
      id: 'x',
      match_id: 'match-1',
      x: row.x,
      y: row.y,
      given: row.given,
      solution_value: row.solution_value,
      value: row.value,
      filled_by: row.filled_by,
      filled_at: row.filled_at,
    }));

    const grid = cellRowsToGrid(cellRows);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] !== 0) {
          expect(grid[r][c].given).toBe(true);
          expect(grid[r][c].value).toBe(puzzle[r][c]);
        } else {
          expect(grid[r][c].given).toBe(false);
          expect(grid[r][c].value).toBeNull();
        }
      }
    }
  });
});

describe('isBoardComplete', () => {
  it('returns false when any cell is unfilled', () => {
    const { puzzle, solution } = generatePuzzle('easy');
    const rows = puzzleToCellRows(puzzle, solution, 'match-1').map((row) => ({
      id: 'x',
      match_id: 'match-1',
      ...row,
    }));
    const grid = cellRowsToGrid(rows);
    expect(isBoardComplete(grid)).toBe(false);
  });

  it('returns true when every cell has a value', () => {
    const grid = cellRowsToGrid(
      Array.from({ length: 9 }, (_, y) =>
        Array.from({ length: 9 }, (_, x) => ({
          id: 'x',
          match_id: 'match-1',
          x,
          y,
          given: true,
          solution_value: 5,
          value: 5,
          filled_by: null,
          filled_at: null,
        }))
      ).flat()
    );
    expect(isBoardComplete(grid)).toBe(true);
  });
});

describe('clearLineNotes', () => {
  it('removes notes that match a filled value in the same row or column', () => {
    const grid = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => ({ value: null, given: false, filledBy: null }))
    );
    grid[1][4] = { value: 8, given: false, filledBy: 'user-a' };

    expect(clearLineNotes({
      '1,0': [2, 8],
      '1,8': [8],
      '0,4': [1, 8],
      '8,4': [8],
      '0,0': [8],
    }, grid)).toEqual({
      '1,0': [2],
      '0,4': [1],
      '0,0': [8],
    });
  });
});

describe('completedDigits', () => {
  it('returns digits that already appear 9 times on the board', () => {
    const grid = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => ({ value: null, given: false, filledBy: null }))
    );
    for (let row = 0; row < 9; row++) grid[row][0] = { value: 7, given: false, filledBy: 'user-a' };
    for (let row = 0; row < 8; row++) grid[row][1] = { value: 3, given: false, filledBy: 'user-a' };

    expect(completedDigits(grid)).toEqual(new Set([7]));
  });
});
