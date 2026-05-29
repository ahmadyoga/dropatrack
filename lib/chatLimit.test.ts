import { describe, it, expect } from 'vitest';
import { capMessages, MAX_CHAT_MESSAGES } from './chatLimit';

describe('capMessages', () => {
  it('returns the array unchanged when under the limit', () => {
    const arr = [1, 2, 3];
    expect(capMessages(arr, 5)).toEqual([1, 2, 3]);
  });

  it('returns the array unchanged when exactly at the limit', () => {
    const arr = [1, 2, 3];
    expect(capMessages(arr, 3)).toEqual([1, 2, 3]);
  });

  it('keeps only the last N when over the limit', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(capMessages(arr, 3)).toEqual([3, 4, 5]);
  });

  it('defaults to MAX_CHAT_MESSAGES', () => {
    const arr = Array.from({ length: MAX_CHAT_MESSAGES + 10 }, (_, i) => i);
    expect(capMessages(arr)).toHaveLength(MAX_CHAT_MESSAGES);
    expect(capMessages(arr)[0]).toBe(10);
  });
});
