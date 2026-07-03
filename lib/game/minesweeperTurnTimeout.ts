export const MINESWEEPER_TURN_TIMEOUT_SECONDS = 30;

export function getTurnSecondsRemaining(
  turnStartedAt: string,
  now: Date = new Date(),
  timeoutSeconds = MINESWEEPER_TURN_TIMEOUT_SECONDS
): number {
  const elapsedMs = now.getTime() - new Date(turnStartedAt).getTime();
  const remainingMs = timeoutSeconds * 1000 - elapsedMs;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function isTurnTimedOut(
  turnStartedAt: string,
  now: Date = new Date(),
  timeoutSeconds = MINESWEEPER_TURN_TIMEOUT_SECONDS
): boolean {
  return getTurnSecondsRemaining(turnStartedAt, now, timeoutSeconds) === 0;
}
