import { describe, expect, it } from 'vitest';
import { getRoomShortcutAction } from './keyboardShortcuts';

describe('getRoomShortcutAction', () => {
  it('maps Ctrl+K and Meta+K to add song search', () => {
    expect(getRoomShortcutAction({ key: 'k', ctrlKey: true })).toBe('open-add-song');
    expect(getRoomShortcutAction({ key: 'K', metaKey: true })).toBe('open-add-song');
  });

  it('maps K and Space to play/pause when not typing', () => {
    expect(getRoomShortcutAction({ key: 'k' })).toBe('play-pause');
    expect(getRoomShortcutAction({ key: ' ' })).toBe('play-pause');
  });

  it('maps YouTube-style Shift+N and Shift+P to next and previous', () => {
    expect(getRoomShortcutAction({ key: 'N', shiftKey: true })).toBe('next');
    expect(getRoomShortcutAction({ key: 'p', shiftKey: true })).toBe('previous');
  });

  it('ignores normal playback shortcuts while typing', () => {
    expect(getRoomShortcutAction({ key: 'k' }, true)).toBeNull();
    expect(getRoomShortcutAction({ key: 'N', shiftKey: true }, true)).toBeNull();
  });

  it('keeps Ctrl+K active while typing', () => {
    expect(getRoomShortcutAction({ key: 'k', ctrlKey: true }, true)).toBe('open-add-song');
  });
});
