export interface MinesweeperTurnState {
  user_id: string;
  turn_order: number;
  is_current: boolean;
}

export function getNextTurnUserId(turns: MinesweeperTurnState[], actorUserId: string): string | null {
  const ordered = [...turns].sort((a, b) => a.turn_order - b.turn_order);
  const currentIndex = ordered.findIndex((turn) => turn.is_current);
  if (currentIndex < 0) return null;
  if (ordered[currentIndex].user_id !== actorUserId) return null;
  if (ordered.length < 2) return actorUserId;

  return ordered[(currentIndex + 1) % ordered.length].user_id;
}
