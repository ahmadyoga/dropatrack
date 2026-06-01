import { describe, it, expect } from 'vitest';
import { snapshotNames, ogImageVersion, ogImagePath } from './share';
import type { RoomUser } from './types';

function user(username: string): RoomUser {
  return {
    user_id: Math.random().toString(36).slice(2),
    username,
    avatar_color: '#fff',
    role: 'listener',
    is_speaker: false,
    joined_at: new Date().toISOString(),
  };
}

describe('snapshotNames', () => {
  it('returns trimmed usernames in order', () => {
    expect(snapshotNames([user('Alice'), user('Bob')])).toEqual(['Alice', 'Bob']);
  });

  it('dedupes repeated usernames', () => {
    expect(snapshotNames([user('Alice'), user('Alice'), user('Bob')])).toEqual(['Alice', 'Bob']);
  });

  it('skips empty/whitespace usernames', () => {
    expect(snapshotNames([user('  '), user('Bob')])).toEqual(['Bob']);
  });

  it('caps at 8 names', () => {
    const many = Array.from({ length: 12 }, (_, i) => user(`U${i}`));
    expect(snapshotNames(many)).toHaveLength(8);
  });
});

describe('ogImageVersion', () => {
  it('returns 0 for null/undefined', () => {
    expect(ogImageVersion(null)).toBe(0);
    expect(ogImageVersion(undefined)).toBe(0);
  });

  it('returns epoch seconds for a valid timestamp', () => {
    expect(ogImageVersion('2026-06-01T00:00:00.000Z')).toBe(1780272000);
  });

  it('returns 0 for an invalid timestamp', () => {
    expect(ogImageVersion('not-a-date')).toBe(0);
  });
});

describe('ogImagePath', () => {
  it('builds the versioned OG path with encoded slug', () => {
    expect(ogImagePath('my room', 123)).toBe('/api/og?t=my%20room&v=123');
  });
});
