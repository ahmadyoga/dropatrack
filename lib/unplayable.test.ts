import { describe, expect, it } from 'vitest';
import {
  classifyYouTubeError, nextPlayableIndex, shouldRequestSkip,
  SKIP_COUNTDOWN_MS, SKIP_BACKSTOP_MS,
} from './unplayable';

describe('classifyYouTubeError', () => {
  it('treats removed, private and embed-blocked videos as unplayable', () => {
    for (const code of [2, 100, 101, 150]) expect(classifyYouTubeError(code)).toBe('unplayable');
  });
  it('never skips on HTML5/player errors or unknown codes', () => {
    expect(classifyYouTubeError(5)).toBe('transient');
    expect(classifyYouTubeError(999)).toBe('transient');
  });
  it('never skips while offline, even for a "removed" code', () => {
    expect(classifyYouTubeError(150, false)).toBe('transient');
  });
});

describe('shouldRequestSkip (two participants see the same event)', () => {
  const users = [
    { user_id: 'alice', is_speaker: true },
    { user_id: 'bob', is_speaker: true },
    { user_id: 'carol', is_speaker: false },
  ];
  const at = (ms: number) => ms;

  it('nobody acts before the countdown ends', () => {
    for (const myId of ['alice', 'bob', 'carol']) {
      expect(shouldRequestSkip({ myId, users, isSpeaker: myId !== 'carol', elapsedMs: at(SKIP_COUNTDOWN_MS - 1) })).toBe(false);
    }
  });

  it('only the elected speaker acts when the countdown ends', () => {
    const acting = ['alice', 'bob', 'carol'].filter((myId) =>
      shouldRequestSkip({ myId, users, isSpeaker: myId !== 'carol', elapsedMs: at(SKIP_COUNTDOWN_MS) }));
    expect(acting).toEqual(['alice']);
  });

  it('another speaker steps in after the backstop if the elected one is gone', () => {
    const withoutAlice = users.filter((u) => u.user_id !== 'alice');
    // bob is now elected, so he acts at the countdown already
    expect(shouldRequestSkip({ myId: 'bob', users: withoutAlice, isSpeaker: true, elapsedMs: SKIP_COUNTDOWN_MS })).toBe(true);
    // a non-elected speaker acts only after the backstop
    expect(shouldRequestSkip({ myId: 'bob', users, isSpeaker: true, elapsedMs: SKIP_COUNTDOWN_MS + SKIP_BACKSTOP_MS - 1 })).toBe(false);
    expect(shouldRequestSkip({ myId: 'bob', users, isSpeaker: true, elapsedMs: SKIP_COUNTDOWN_MS + SKIP_BACKSTOP_MS })).toBe(true);
  });

  it('remote-only devices never request a skip', () => {
    expect(shouldRequestSkip({ myId: 'carol', users, isSpeaker: false, elapsedMs: 60_000 })).toBe(false);
  });
});

describe('nextPlayableIndex', () => {
  const ids = ['a', 'b', 'c', 'd'];
  it('moves to the next song', () => {
    expect(nextPlayableIndex(ids, 0, new Set(['a']), false)).toBe(1);
  });
  it('skips over songs already known to be unplayable', () => {
    expect(nextPlayableIndex(ids, 0, new Set(['a', 'b', 'c']), false)).toBe(3);
  });
  it('returns null at the end without repeat', () => {
    expect(nextPlayableIndex(ids, 3, new Set(['d']), false)).toBeNull();
  });
  it('wraps with repeat', () => {
    expect(nextPlayableIndex(ids, 3, new Set(['d']), true)).toBe(0);
  });
  it('returns null when every other song is unplayable, even with repeat', () => {
    expect(nextPlayableIndex(ids, 1, new Set(['a', 'b', 'c', 'd']), true)).toBeNull();
  });
  it('handles a single-song queue', () => {
    expect(nextPlayableIndex(['a'], 0, new Set(['a']), true)).toBeNull();
  });
});
