type ChatPageRow = { id: string; created_at: string };

export function newestPageForDisplay<T extends ChatPageRow>(messages: T[]): T[] {
  return [...messages].reverse();
}

export function mergeOlderChatMessages<T extends ChatPageRow>(older: T[], current: T[]): T[] {
  const seen = new Set(older.map((msg) => msg.id));
  return [...older, ...current.filter((msg) => !seen.has(msg.id))];
}
