// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getOrCreateUser,
  updateLocalUsername,
  confirmUsername,
} from './names';

const STORAGE_KEY = 'dropatrack_user';

beforeEach(() => {
  localStorage.clear();
});

describe('getOrCreateUser', () => {
  it('returns null on server (window undefined) — not testable here, skip', () => {
    // Covered by environment assumption
  });

  it('creates new user with is_default_username: true', () => {
    const user = getOrCreateUser();
    expect(user).not.toBeNull();
    expect(user!.is_default_username).toBe(true);
    expect(user!.isNew).toBe(true);
  });

  it('returns existing user with is_default_username preserved', () => {
    getOrCreateUser(); // create
    const user2 = getOrCreateUser(); // retrieve
    expect(user2!.isNew).toBe(false);
    expect(user2!.is_default_username).toBe(true);
  });

  it('defaults is_default_username to false for legacy stored objects (no field)', () => {
    const legacy = {
      user_id: 'user_legacy',
      username: 'OldName 42',
      avatar_color: '#fff',
      expiresAt: Date.now() + 99999999,
      // no is_default_username field
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    const user = getOrCreateUser();
    expect(user!.is_default_username).toBe(false);
  });

  it('regenerates user when session expired, sets is_default_username: true', () => {
    const expired = {
      user_id: 'user_old',
      username: 'OldName 1',
      avatar_color: '#aaa',
      is_default_username: false,
      expiresAt: Date.now() - 1, // already expired
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expired));
    const user = getOrCreateUser();
    expect(user!.isNew).toBe(true);
    expect(user!.is_default_username).toBe(true);
    expect(user!.user_id).not.toBe('user_old');
  });
});

describe('updateLocalUsername', () => {
  it('sets is_default_username to false', () => {
    getOrCreateUser();
    const updated = updateLocalUsername('MyCoolName');
    expect(updated!.is_default_username).toBe(false);
    expect(updated!.username).toBe('MyCoolName');
  });

  it('returns null when no stored user', () => {
    expect(updateLocalUsername('Name')).toBeNull();
  });
});

describe('confirmUsername', () => {
  it('sets is_default_username to false without changing username', () => {
    const created = getOrCreateUser();
    const originalName = created!.username;
    const confirmed = confirmUsername();
    expect(confirmed!.is_default_username).toBe(false);
    expect(confirmed!.username).toBe(originalName);
  });

  it('returns null when no stored user', () => {
    expect(confirmUsername()).toBeNull();
  });
});
