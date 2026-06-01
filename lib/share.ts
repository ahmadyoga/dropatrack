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

/** Cache-bust version derived from snapshot_at. 0 when never snapshotted. */
export function ogImageVersion(snapshotAt: string | null | undefined): number {
  if (!snapshotAt) return 0;
  const ms = new Date(snapshotAt).getTime();
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
}

/** Relative path to the room OG image for a given cache version. */
export function ogImagePath(slug: string, version: number): string {
  return `/api/og?t=${encodeURIComponent(slug)}&v=${version}`;
}
