import { describe, expect, it } from 'vitest';
import {
  MINESWEEPER_TURN_TIMEOUT_SECONDS,
  getTurnSecondsRemaining,
  isTurnTimedOut,
} from './minesweeperTurnTimeout';

describe('minesweeper turn timeout', () => {
  it('uses a 30 second per-turn timeout', () => {
    expect(MINESWEEPER_TURN_TIMEOUT_SECONDS).toBe(30);
  });

  it('reports remaining seconds rounded up', () => {
    const now = new Date('2026-06-12T10:00:10.100Z');

    expect(getTurnSecondsRemaining('2026-06-12T10:00:00.000Z', now)).toBe(20);
  });

  it('marks a turn timed out after 30 seconds', () => {
    const now = new Date('2026-06-12T10:00:30.001Z');

    expect(isTurnTimedOut('2026-06-12T10:00:00.000Z', now)).toBe(true);
    expect(isTurnTimedOut('2026-06-12T10:00:00.100Z', now)).toBe(false);
  });
});
