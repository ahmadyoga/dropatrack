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

/** Candidate digits for an empty cell (not present in its row, col, or box). */
function candidatesFor(grid: number[][], row: number, col: number): number[] {
  const out: number[] = [];
  for (let v = 1; v <= 9; v++) {
    if (isSafe(grid, row, col, v)) out.push(v);
  }
  return out;
}

/**
 * Solves a puzzle using only human "singles" logic — naked singles always,
 * hidden singles when `allowHidden`. Returns true if fully solved, without
 * ever guessing. This is what grades real difficulty: a puzzle that finishes
 * with naked singles alone is easy regardless of how few clues it has.
 */
function solvableWithSingles(puzzle: number[][], allowHidden: boolean): boolean {
  const grid = puzzle.map((row) => [...row]);
  let filled = grid.flat().filter((v) => v !== 0).length;

  let progress = true;
  while (progress && filled < 81) {
    progress = false;

    // Naked singles: a cell with exactly one candidate.
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) continue;
        const cands = candidatesFor(grid, r, c);
        if (cands.length === 1) {
          grid[r][c] = cands[0];
          filled++;
          progress = true;
        }
      }
    }
    if (progress || !allowHidden) continue;

    // Hidden singles: a digit that fits exactly one cell within a unit.
    for (let unit = 0; unit < 9 && !progress; unit++) {
      const cellsOf: Array<Array<[number, number]>> = [[], [], []];
      for (let i = 0; i < 9; i++) {
        cellsOf[0].push([unit, i]); // row
        cellsOf[1].push([i, unit]); // col
        const boxR = Math.floor(unit / 3) * 3 + Math.floor(i / 3);
        const boxC = (unit % 3) * 3 + (i % 3);
        cellsOf[2].push([boxR, boxC]); // box
      }
      for (const cells of cellsOf) {
        for (let v = 1; v <= 9 && !progress; v++) {
          const spots = cells.filter(
            ([r, c]) => grid[r][c] === 0 && isSafe(grid, r, c, v)
          );
          if (spots.length === 1) {
            const [r, c] = spots[0];
            grid[r][c] = v;
            filled++;
            progress = true;
          }
        }
      }
    }
  }

  return filled === 81;
}

/**
 * Grades a puzzle by the weakest technique set that solves it:
 * naked singles only → easy, + hidden singles → medium, needs more → hard.
 */
export function gradeDifficulty(puzzle: number[][]): Level {
  if (solvableWithSingles(puzzle, false)) return 'easy';
  if (solvableWithSingles(puzzle, true)) return 'medium';
  return 'hard';
}

/** Counts solutions via MRV backtracking, stopping early at `limit`. */
function countSolutions(puzzle: number[][], limit: number): number {
  const grid = puzzle.map((row) => [...row]);
  let count = 0;

  const solve = (): void => {
    if (count >= limit) return;

    // Pick the empty cell with the fewest candidates (MRV) to prune fast.
    let bestR = -1;
    let bestC = -1;
    let bestCands: number[] | null = null;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) continue;
        const cands = candidatesFor(grid, r, c);
        if (cands.length === 0) return; // dead end
        if (!bestCands || cands.length < bestCands.length) {
          bestR = r;
          bestC = c;
          bestCands = cands;
        }
      }
    }

    if (!bestCands) {
      count++; // no empty cells → a complete solution
      return;
    }

    for (const v of bestCands) {
      grid[bestR][bestC] = v;
      solve();
      grid[bestR][bestC] = 0;
      if (count >= limit) return;
    }
  };

  solve();
  return count;
}

/** True if the puzzle has exactly one solution. */
export function hasUniqueSolution(puzzle: number[][]): boolean {
  return countSolutions(puzzle, 2) === 1;
}

// ponytail: random-retry until tier matches, capped; dig-holes already biases
// toward the tier via clue count, so hits fast. Raise cap if grades fall short.
const MAX_PUZZLE_ATTEMPTS = 80;

/**
 * Builds one candidate by "digging holes": removes cells in random order,
 * keeping a removal only if the puzzle still has a unique solution. Guarantees
 * uniqueness; the given count is a floor (may exceed the target when further
 * removal would make the puzzle ambiguous).
 */
function carvePuzzle(level: Level): { solution: number[][]; puzzle: number[][] } {
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

  const targetRemovals = 81 - SUDOKU_LEVEL_CONFIG[level].givens;
  let removed = 0;
  for (const [r, c] of positions) {
    if (removed >= targetRemovals) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    if (hasUniqueSolution(puzzle)) removed++;
    else puzzle[r][c] = backup;
  }

  return { solution, puzzle };
}

/**
 * Generates one puzzle (and its solution) for the given level. Same puzzle is
 * shared by all players in a match. Difficulty is graded by required solving
 * technique — not just clue count — and every returned puzzle has a unique
 * solution. Retries until the grade matches; falls back to the first unique
 * candidate if the cap is hit.
 */
export function generatePuzzle(level: Level): { solution: number[][]; puzzle: number[][] } {
  let fallback: { solution: number[][]; puzzle: number[][] } | null = null;

  for (let attempt = 0; attempt < MAX_PUZZLE_ATTEMPTS; attempt++) {
    const candidate = carvePuzzle(level); // already unique
    fallback ??= candidate;
    if (gradeDifficulty(candidate.puzzle) === level) return candidate;
  }

  return fallback ?? carvePuzzle(level);
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
