// Pure helpers for time-level playback sync.

export interface PlaybackAnchor {
  base: number;       // authoritative position in seconds
  receivedAt: number; // performance.now() when this anchor was received (local-monotonic)
  isPlaying: boolean;
}

// Expected position now. `now` is injectable for testing; defaults to a
// local-monotonic clock so absolute wall-clock skew between devices never matters.
export function computeExpected(
  anchor: PlaybackAnchor,
  now: number = typeof performance !== 'undefined' ? performance.now() : Date.now(),
): number {
  if (!anchor.isPlaying) return anchor.base;
  return anchor.base + (now - anchor.receivedAt) / 1000;
}

// The host-less time source: the lexicographically smallest user_id among
// speakers, or null if no one is a speaker. Derived from presence so it
// auto-re-elects when the current source leaves.
export function electTimeSource(
  users: { user_id: string; is_speaker: boolean }[],
): string | null {
  const speakers = users.filter((u) => u.is_speaker).map((u) => u.user_id);
  if (speakers.length === 0) return null;
  return speakers.reduce((min, id) => (id < min ? id : min));
}
