// External store for playback position. Lives outside React so the 500ms
// time-tick updates only re-render the leaf components that subscribe
// (TimeLabel, ProgressFill) instead of the whole RoomClient tree.
// setTime is the single sink — the time-sync spec will feed it the
// server-derived expected position without changing this module.

let currentTime = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getCurrentTime(): number {
  return currentTime;
}

// SSR snapshot — server always renders time 0, matching the initial client value.
export function getServerSnapshot(): number {
  return 0;
}

export function setTime(t: number): void {
  if (t === currentTime) return;
  currentTime = t;
  emit();
}

// Test-only reset.
export function _reset(): void {
  currentTime = 0;
  listeners.clear();
}
