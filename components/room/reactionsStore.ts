// Ephemeral store for floating emoji reactions. Lives outside React (same
// pattern as playbackTimeStore) so a burst of reactions only re-renders the
// FloatingReactions overlay, never the RoomClient tree.

export interface FloatingReaction {
  id: string;
  emoji: string;
  x: number; // horizontal position 5..95 (%)
  y: number; // vertical position 10..85 (%)
}

export const REACTION_TTL_MS = 3500;
export const MAX_REACTIONS = 60;

let reactions: FloatingReaction[] = [];
const listeners = new Set<() => void>();
let counter = 0;

const EMPTY: FloatingReaction[] = [];

function emit() {
  listeners.forEach((l) => l());
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `r${Date.now()}_${counter++}`;
  }
}

export function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getSnapshot(): FloatingReaction[] {
  return reactions;
}

// Stable empty array for SSR (no reactions on the server).
export function getServerSnapshot(): FloatingReaction[] {
  return EMPTY;
}

export function addReaction(emoji: string): void {
  const id = newId();
  const x = Math.round(Math.random() * 90) + 5; // 5..95
  const y = Math.round(Math.random() * 75) + 10; // 10..85
  reactions = [...reactions, { id, emoji, x, y }];
  if (reactions.length > MAX_REACTIONS) {
    reactions = reactions.slice(reactions.length - MAX_REACTIONS);
  }
  emit();
  if (typeof window !== 'undefined') {
    window.setTimeout(() => removeReaction(id), REACTION_TTL_MS);
  }
}

export function removeReaction(id: string): void {
  const next = reactions.filter((r) => r.id !== id);
  if (next.length === reactions.length) return;
  reactions = next;
  emit();
}

// Test-only reset.
export function _reset(): void {
  reactions = [];
  listeners.clear();
  counter = 0;
}
