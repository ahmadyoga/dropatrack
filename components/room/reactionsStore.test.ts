import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  subscribe, getSnapshot, getServerSnapshot,
  addReaction, removeReaction, _reset, MAX_REACTIONS,
} from './reactionsStore';

describe('reactionsStore', () => {
  beforeEach(() => _reset());

  it('starts empty', () => {
    expect(getSnapshot()).toEqual([]);
    expect(getServerSnapshot()).toEqual([]);
  });

  it('addReaction appends an emoji scattered across the screen', () => {
    addReaction('🔥');
    const list = getSnapshot();
    expect(list).toHaveLength(1);
    expect(list[0].emoji).toBe('🔥');
    expect(list[0].x).toBeGreaterThanOrEqual(5);
    expect(list[0].x).toBeLessThanOrEqual(95);
    expect(list[0].y).toBeGreaterThanOrEqual(10);
    expect(list[0].y).toBeLessThanOrEqual(85);
    expect(typeof list[0].id).toBe('string');
  });

  it('getSnapshot returns a new reference after a change', () => {
    const before = getSnapshot();
    addReaction('❤️');
    expect(getSnapshot()).not.toBe(before);
  });

  it('removeReaction removes by id', () => {
    addReaction('👍');
    const id = getSnapshot()[0].id;
    removeReaction(id);
    expect(getSnapshot()).toHaveLength(0);
  });

  it('caps the list at MAX_REACTIONS', () => {
    for (let i = 0; i < MAX_REACTIONS + 5; i++) addReaction('🎉');
    expect(getSnapshot()).toHaveLength(MAX_REACTIONS);
  });

  it('notifies subscribers on add', () => {
    const cb = vi.fn();
    subscribe(cb);
    addReaction('🙌');
    expect(cb).toHaveBeenCalled();
  });
});
