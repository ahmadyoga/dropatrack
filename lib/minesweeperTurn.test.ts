import { describe, expect, it } from 'vitest';
import { getNextTurnUserId } from './minesweeperTurn';

describe('getNextTurnUserId', () => {
  it('returns the next player when the actor owns the current turn', () => {
    expect(
      getNextTurnUserId([
        { user_id: 'a', turn_order: 0, is_current: false },
        { user_id: 'b', turn_order: 1, is_current: true },
        { user_id: 'c', turn_order: 2, is_current: false },
      ], 'b')
    ).toBe('c');
  });

  it('wraps to the first player after the last turn holder moves', () => {
    expect(
      getNextTurnUserId([
        { user_id: 'a', turn_order: 0, is_current: false },
        { user_id: 'b', turn_order: 1, is_current: false },
        { user_id: 'c', turn_order: 2, is_current: true },
      ], 'c')
    ).toBe('a');
  });

  it('rejects a stale actor when another player is current in the database', () => {
    expect(
      getNextTurnUserId([
        { user_id: 'a', turn_order: 0, is_current: true },
        { user_id: 'b', turn_order: 1, is_current: false },
      ], 'b')
    ).toBeNull();
  });

  it('rejects advancement when no row is marked current', () => {
    expect(
      getNextTurnUserId([
        { user_id: 'a', turn_order: 0, is_current: false },
        { user_id: 'b', turn_order: 1, is_current: false },
      ], 'a')
    ).toBeNull();
  });
});
