// Pure rules for skipping tracks YouTube refuses to play. Kept free of React and
// Supabase so the decisions can be unit-tested; the hook wires them up.
import { electTimeSource } from './playbackSync';

/** Seconds shown to everyone before the skip happens. */
export const SKIP_COUNTDOWN_MS = 3000;
/** If the elected device vanished mid-countdown, any other speaker steps in after this. */
export const SKIP_BACKSTOP_MS = 4000;

// YouTube IFrame onError codes. Only these mean "this video will never play here":
//   2   invalid video id
//   100 removed or private
//   101 / 150 the uploader disabled embedding
// Anything else (notably 5, an HTML5 player failure) can be transient, so we never skip on it.
const UNPLAYABLE_CODES = new Set([2, 100, 101, 150]);

export type YouTubeErrorKind = 'unplayable' | 'transient';

export function classifyYouTubeError(code: number, online = true): YouTubeErrorKind {
  // While offline every error is suspect: a dropped connection is not the video's fault.
  if (!online) return 'transient';
  return UNPLAYABLE_CODES.has(code) ? 'unplayable' : 'transient';
}

// Wording stays honest about what YouTube actually tells us: it reports 101/150
// both for embedding blocked by the uploader and for some unavailable videos.
export function unplayableReason(code: number): string {
  if (code === 101 || code === 150) return 'YouTube won’t let it play outside youtube.com';
  if (code === 100) return 'it was removed or made private';
  return 'the link isn’t a valid YouTube video';
}

/**
 * Should *this* device ask the server to skip now?
 * The elected time source acts when the countdown ends; any other speaker acts
 * only after the backstop delay, covering an elected device that left mid-countdown.
 * The server call is compare-and-set, so a late duplicate is harmless.
 */
export function shouldRequestSkip(args: {
  myId: string | null | undefined;
  users: { user_id: string; is_speaker: boolean }[];
  isSpeaker: boolean;
  elapsedMs: number;
}): boolean {
  const { myId, users, isSpeaker, elapsedMs } = args;
  if (!myId || elapsedMs < SKIP_COUNTDOWN_MS) return false;
  const authority = electTimeSource(users);
  if (authority === myId) return true;
  return isSpeaker && elapsedMs >= SKIP_COUNTDOWN_MS + SKIP_BACKSTOP_MS;
}

/**
 * Next index to play after `current`, skipping known-unplayable ids.
 * Mirrors skip_unplayable_song() in SQL (used as the client fallback).
 * Returns null when nothing playable remains (end of queue without repeat, or all bad).
 */
export function nextPlayableIndex(
  ids: string[],
  current: number,
  skipIds: ReadonlySet<string>,
  repeat: boolean,
): number | null {
  const n = ids.length;
  for (let step = 1; step < n; step++) {
    let i = current + step;
    if (i >= n) {
      if (!repeat) return null;
      i -= n;
    }
    if (i !== current && !skipIds.has(ids[i])) return i;
  }
  return null;
}
