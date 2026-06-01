import type { RoomUser } from './types';

/** Usernames captured at share time: trimmed, deduped, non-empty, first 8. */
export function snapshotNames(users: RoomUser[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of users) {
    const name = u.username?.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
    if (out.length >= 8) break;
  }
  return out;
}

/** Relative path to the room OG image for a given cache version. */
export function ogImagePath(slug: string): string {
  return `/api/og?t=${encodeURIComponent(slug)}`;
}
