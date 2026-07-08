import type { Level, SudokuCellRow, SudokuGrid } from '../types';
import { SUDOKU_LEVEL_CONFIG } from '../types';

function shuffledDigits(): number[] {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits;
}

function isSafe(grid: number[][], row: number, col: number, value: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === value || grid[i][col] === value) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] === value) return false;
    }
  }
  return true;
}

function fill(grid: number[][], index: number): boolean {
  if (index === 81) return true;
  const row = Math.floor(index / 9);
  const col = index % 9;

  for (const value of shuffledDigits()) {
    if (isSafe(grid, row, col, value)) {
      grid[row][col] = value;
      if (fill(grid, index + 1)) return true;
      grid[row][col] = 0;
    }
  }
  return false;
}

/** Generates a full, valid, randomized 9x9 sudoku solution via backtracking. */
export function generateSolvedGrid(): number[][] {
  const grid: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  fill(grid, 0);
  return grid;
}

/** Generates one puzzle (and its solution) for the given level. Same puzzle is shared by all players in a match. */
export function generatePuzzle(level: Level): { solution: number[][]; puzzle: number[][] } {
  const solution = generateSolvedGrid();
  const puzzle = solution.map((row) => [...row]);

  const positions: Array<[number, number]> = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) positions.push([r, c]);
  }
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  const toRemove = 81 - SUDOKU_LEVEL_CONFIG[level].givens;
  for (let i = 0; i < toRemove; i++) {
    const [r, c] = positions[i];
    puzzle[r][c] = 0;
  }

  return { solution, puzzle };
}

/** Flattens a puzzle+solution pair into 81 `sudoku_cells` insert rows for one match. */
export function puzzleToCellRows(puzzle: number[][], solution: number[][], matchId: string) {
  return puzzle.flatMap((row, y) =>
    row.map((puzzleValue, x) => ({
      match_id: matchId,
      x,
      y,
      given: puzzleValue !== 0,
      solution_value: solution[y][x],
      value: puzzleValue !== 0 ? puzzleValue : null,
      filled_by: null as string | null,
      filled_at: null as string | null,
    }))
  );
}

/** Hydrates `sudoku_cells` database rows into a renderable grid. Never exposes solution_value for unfilled cells. */
export function cellRowsToGrid(cells: SudokuCellRow[]): SudokuGrid {
  const grid: SudokuGrid = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => ({ value: null, given: false, filledBy: null }))
  );

  for (const cell of cells) {
    grid[cell.y][cell.x] = {
      value: cell.value,
      given: cell.given,
      filledBy: cell.filled_by,
    };
  }

  return grid;
}

export function isBoardComplete(grid: SudokuGrid): boolean {
  return grid.every((row) => row.every((cell) => cell.value !== null));
}

export function clearLineNotes(
  notes: Record<string, number[]>,
  grid: SudokuGrid
): Record<string, number[]> {
  let next: Record<string, number[]> | null = null;

  for (const [key, marks] of Object.entries(notes)) {
    const [row, col] = key.split(',').map(Number);
    const blocked = new Set<number>();

    for (let i = 0; i < 9; i++) {
      const rowValue = grid[row]?.[i]?.value;
      const colValue = grid[i]?.[col]?.value;
      if (rowValue !== null && rowValue !== undefined) blocked.add(rowValue);
      if (colValue !== null && colValue !== undefined) blocked.add(colValue);
    }

    const kept = marks.filter((mark) => !blocked.has(mark));
    if (kept.length !== marks.length) {
      next ??= { ...notes };
      if (kept.length) next[key] = kept;
      else delete next[key];
    }
  }

  return next ?? notes;
}

export function completedDigits(grid: SudokuGrid): Set<number> {
  const counts = Array(10).fill(0) as number[];
  for (const row of grid) {
    for (const cell of row) {
      if (cell.value !== null) counts[cell.value]++;
    }
  }
  return new Set(counts.flatMap((count, digit) => (digit > 0 && count >= 9 ? [digit] : [])));
}
