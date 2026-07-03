import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  subscribe,
  getCurrentTime,
  setTime,
  getServerSnapshot,
  _reset,
} from './playbackTimeStore';

describe('playbackTimeStore', () => {
  beforeEach(() => _reset());

  it('starts at 0', () => {
    expect(getCurrentTime()).toBe(0);
    expect(getServerSnapshot()).toBe(0);
  });

  it('setTime updates the current time', () => {
    setTime(12.5);
    expect(getCurrentTime()).toBe(12.5);
  });

  it('notifies subscribers when the value changes', () => {
    const cb = vi.fn();
    subscribe(cb);
    setTime(3);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('does NOT notify when the value is unchanged', () => {
    setTime(5);
    const cb = vi.fn();
    subscribe(cb);
    setTime(5);
    expect(cb).not.toHaveBeenCalled();
  });

  it('unsubscribe stops notifications', () => {
    const cb = vi.fn();
    const unsub = subscribe(cb);
    unsub();
    setTime(9);
    expect(cb).not.toHaveBeenCalled();
  });
});
