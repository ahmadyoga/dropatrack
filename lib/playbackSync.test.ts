import { describe, it, expect } from 'vitest';
import { activeSpeakerNames, computeExpected, electTimeSource, type PlaybackAnchor } from './playbackSync';

describe('computeExpected', () => {
  it('returns the base when paused', () => {
    const anchor: PlaybackAnchor = { base: 42, receivedAt: 1000, isPlaying: false };
    expect(computeExpected(anchor, 9999)).toBe(42);
  });

  it('adds elapsed seconds since the anchor when playing', () => {
    const anchor: PlaybackAnchor = { base: 10, receivedAt: 1000, isPlaying: true };
    expect(computeExpected(anchor, 4500)).toBeCloseTo(13.5, 5);
  });

  it('does not go backwards when now equals receivedAt', () => {
    const anchor: PlaybackAnchor = { base: 5, receivedAt: 2000, isPlaying: true };
    expect(computeExpected(anchor, 2000)).toBe(5);
  });
});

describe('electTimeSource', () => {
  it('returns null when there are no speakers', () => {
    expect(electTimeSource([{ user_id: 'a', is_speaker: false }])).toBeNull();
    expect(electTimeSource([])).toBeNull();
  });

  it('returns the only speaker', () => {
    expect(electTimeSource([
      { user_id: 'zeta', is_speaker: true },
      { user_id: 'beta', is_speaker: false },
    ])).toBe('zeta');
  });

  it('returns the lexicographically smallest speaker user_id', () => {
    expect(electTimeSource([
      { user_id: 'zeta', is_speaker: true },
      { user_id: 'alpha', is_speaker: true },
      { user_id: 'mike', is_speaker: false },
    ])).toBe('alpha');
  });
});


describe('activeSpeakerNames', () => {
  const users = [
    { user_id: 'me', username: 'Me', is_speaker: false }, // stale presence for me
    { user_id: 'dewi', username: 'Dewi', is_speaker: true },
    { user_id: 'raka', username: 'Raka', is_speaker: false },
  ];
  it('uses local state for this device, presence for others', () => {
    expect(activeSpeakerNames(users, 'me', true)).toEqual(['this device', 'Dewi']);
  });
  it('is empty when nobody plays', () => {
    expect(activeSpeakerNames(users.map((u) => ({ ...u, is_speaker: false })), 'me', false)).toEqual([]);
  });
});
