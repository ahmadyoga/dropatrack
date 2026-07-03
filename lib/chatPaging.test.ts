import { describe, expect, it } from 'vitest';
import { mergeOlderChatMessages, newestPageForDisplay } from './chatPaging';

const msg = (id: string, created_at: string) => ({ id, created_at });

describe('chat paging', () => {
  it('shows a newest-first query page from oldest to newest', () => {
    expect(newestPageForDisplay([
      msg('3', '2026-01-01T00:00:03.000Z'),
      msg('2', '2026-01-01T00:00:02.000Z'),
      msg('1', '2026-01-01T00:00:01.000Z'),
    ])).toEqual([
      msg('1', '2026-01-01T00:00:01.000Z'),
      msg('2', '2026-01-01T00:00:02.000Z'),
      msg('3', '2026-01-01T00:00:03.000Z'),
    ]);
  });

  it('prepends older messages without duplicating existing realtime rows', () => {
    expect(mergeOlderChatMessages([
      msg('1', '2026-01-01T00:00:01.000Z'),
      msg('2', '2026-01-01T00:00:02.000Z'),
    ], [
      msg('2', '2026-01-01T00:00:02.000Z'),
      msg('3', '2026-01-01T00:00:03.000Z'),
    ])).toEqual([
      msg('1', '2026-01-01T00:00:01.000Z'),
      msg('2', '2026-01-01T00:00:02.000Z'),
      msg('3', '2026-01-01T00:00:03.000Z'),
    ]);
  });
});
