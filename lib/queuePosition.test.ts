import { describe, expect, it } from 'vitest';
import { getNextRegularQueuePosition } from './queuePosition';

describe('getNextRegularQueuePosition', () => {
  it('ignores suggested/null-position rows when choosing the next external insert position', () => {
    expect(
      getNextRegularQueuePosition([
        { position: 0, is_suggested: false },
        { position: 1, is_suggested: false },
        { position: null, is_suggested: true },
        { position: null, is_suggested: true },
      ])
    ).toBe(2);
  });
});
