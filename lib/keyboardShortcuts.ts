export type RoomShortcutAction = 'play-pause' | 'next' | 'previous' | 'open-add-song';

export interface KeyboardShortcutEvent {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

export function getRoomShortcutAction(
  event: KeyboardShortcutEvent,
  isTyping = false
): RoomShortcutAction | null {
  const key = event.key.toLowerCase();
  const ctrlOrMeta = event.ctrlKey === true || event.metaKey === true;

  if (ctrlOrMeta && key === 'k') return 'open-add-song';
  if (isTyping || event.ctrlKey || event.metaKey || event.altKey) return null;

  if (key === 'k' || event.key === ' ') return 'play-pause';
  if (event.shiftKey && key === 'n') return 'next';
  if (event.shiftKey && key === 'p') return 'previous';

  return null;
}
