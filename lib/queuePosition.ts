export interface QueuePositionRow {
  position: number | null;
  is_suggested?: boolean | null;
}

export function getNextRegularQueuePosition(rows: QueuePositionRow[]): number {
  const regularPositions = rows
    .filter((row) => row.is_suggested !== true && typeof row.position === 'number')
    .map((row) => row.position as number);

  if (regularPositions.length === 0) return 0;
  return Math.max(...regularPositions) + 1;
}
