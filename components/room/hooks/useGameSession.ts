import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  boardToCellRows,
  cellRowsToBoard,
  createBoard,
  randomizeTurnOrder,
  revealCell,
  scoreMineHitMatch,
} from '@/lib/game/minesweeper';
import { getNextTurnUserId } from '@/lib/game/minesweeperTurn';
import type { Board, CellRow, GameMove, GamePlayerScore, GameSession, Level, MatchRow, PlayerRow, SessionRow, TurnRow, UserPresence } from '@/lib/types';

type MoveAction = 'reveal' | 'flag' | 'chord';

interface UseGameSessionReturn {
  session: GameSession | null;
  board: Board | null;
  moves: GameMove[];
  myTurn: boolean;
  loading: boolean;
  startSession: (level: Level) => Promise<string | null>;
  joinSession: (sessionId: string) => Promise<void>;
  leaveSession: (sessionId: string) => Promise<void>;
  cancelSession: (sessionId: string) => Promise<void>;
  makeMove: (row: number, col: number, action: MoveAction) => Promise<void>;
  playAgain: (sessionId: string) => Promise<void>;
  finishSession: (sessionId: string) => Promise<void>;
}

function getCurrentTurnIndex(turns: TurnRow[]): number {
  const index = turns.findIndex((turn) => turn.is_current);
  return index >= 0 ? index : 0;
}

function mapSession(
  session: SessionRow,
  players: PlayerRow[],
  match: MatchRow | null,
  turns: TurnRow[],
  board: Board | null
): GameSession {
  const orderedTurns = [...turns].sort((a, b) => a.turn_order - b.turn_order);
  const host = players.find((player) => player.user_id === session.created_by) ?? players[0];

  return {
    id: session.id,
    room_id: session.music_room_id,
    level: session.difficulty,
    status: session.status,
    host_id: session.created_by,
    host_username: host?.username ?? 'Unknown',
    players: orderedTurns.length > 0 ? orderedTurns.map((turn) => turn.user_id) : players.map((player) => player.user_id),
    player_usernames: Object.fromEntries(players.map((player) => [player.user_id, player.username])),
    current_turn_index: getCurrentTurnIndex(orderedTurns),
    board,
    winner_id: null,
    loser_id: match?.loser_user_id ?? null,
    match_id: match?.id ?? null,
    match_number: match?.match_number ?? 1,
    current_turn_started_at: match?.current_turn_started_at ?? null,
    scores: players.map(({ user_id, username, wins, losses }) => ({ user_id, username, wins, losses })),
    chat_message_id: null,
    created_at: session.created_at,
    updated_at: match?.started_at ?? session.created_at,
    started_at: match?.started_at ?? session.created_at,
  finished_at: session.finished_at,
  };
}

async function touchMinesweeperSession(sessionId: string) {
  await supabase
    .from('minesweeper_sessions')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('status', 'active');
}

export function useGameSession(roomId: string, currentUser: UserPresence | null): UseGameSessionReturn {
  const [session, setSession] = useState<GameSession | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [moves] = useState<GameMove[]>([]);
  const [loading, setLoading] = useState(true);

  const sessionRef = useRef<GameSession | null>(null);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const currentUserId = currentUser?.user_id;
  const myTurn = session
    ? session.players[session.current_turn_index] === currentUserId && session.status === 'active'
    : false;

  const loadSession = useCallback(async (sessionId?: string) => {
    if (!roomId) return;
    setLoading(true);

    const sessionQuery = supabase
      .from('minesweeper_sessions')
      .select('*')
      .eq(sessionId ? 'id' : 'music_room_id', sessionId ?? roomId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!sessionId) sessionQuery.eq('status', 'active');

    const { data: sessionRows } = await sessionQuery;
    const sessionRow = sessionRows?.[0] as SessionRow | undefined;

    if (!sessionRow) {
      setSession(null);
      setBoard(null);
      setLoading(false);
      return;
    }

    const [{ data: playerRows }, { data: matchRows }] = await Promise.all([
      supabase
        .from('minesweeper_players')
        .select('*')
        .eq('session_id', sessionRow.id)
        .order('joined_at', { ascending: true }),
      supabase
        .from('minesweeper_matches')
        .select('*')
        .eq('session_id', sessionRow.id)
        .order('match_number', { ascending: false })
        .limit(1),
    ]);

    const players = (playerRows ?? []) as PlayerRow[];
    const match = (matchRows?.[0] ?? null) as MatchRow | null;

    if (!match) {
      const mapped = mapSession(sessionRow, players, null, [], null);
      setSession(mapped);
      setBoard(null);
      setLoading(false);
      return;
    }

    const [{ data: turnRows }, { data: cellRows }] = await Promise.all([
      supabase
        .from('minesweeper_turns')
        .select('*')
        .eq('match_id', match.id)
        .order('turn_order', { ascending: true }),
      supabase
        .from('minesweeper_cells')
        .select('*')
        .eq('match_id', match.id)
        .order('y', { ascending: true })
        .order('x', { ascending: true }),
    ]);

    const hydratedBoard = cellRows?.length ? cellRowsToBoard(cellRows as CellRow[]) : null;
    const mapped = mapSession(sessionRow, players, match, (turnRows ?? []) as TurnRow[], hydratedBoard);
    setSession(mapped);
    setBoard(hydratedBoard);
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    void Promise.resolve().then(() => loadSession());

    const reload = () => { loadSession(); };
    const channels = [
      supabase.channel(`minesweeper-sessions:${roomId}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'minesweeper_sessions', filter: `music_room_id=eq.${roomId}` },
        reload
      ).subscribe(),
      supabase.channel(`minesweeper-players:${roomId}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'minesweeper_players' },
        reload
      ).subscribe(),
      supabase.channel(`minesweeper-matches:${roomId}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'minesweeper_matches' },
        reload
      ).subscribe(),
      supabase.channel(`minesweeper-turns:${roomId}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'minesweeper_turns' },
        reload
      ).subscribe(),
      supabase.channel(`minesweeper-cells:${roomId}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'minesweeper_cells' },
        reload
      ).subscribe(),
    ];

    return () => {
      channels.forEach((channel) => { channel.unsubscribe(); });
      setSession(null);
      setBoard(null);
      setLoading(true);
    };
  }, [loadSession, roomId]);

  useEffect(() => {
    if (!session?.id || session.status !== 'active' || !currentUserId) return;

    void touchMinesweeperSession(session.id);
    const interval = window.setInterval(() => {
      void touchMinesweeperSession(session.id);
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [session?.id, session?.status, currentUserId]);

  const insertTurnOrder = useCallback(async (matchId: string, userIds: string[]) => {
    const ordered = randomizeTurnOrder(userIds);
    await supabase.from('minesweeper_turns').insert(ordered.map((userId, index) => ({
      match_id: matchId,
      user_id: userId,
      turn_order: index,
      is_current: index === 0,
    })));
  }, []);

  const loadTurnRows = useCallback(async (matchId: string): Promise<TurnRow[]> => {
    const { data: turns } = await supabase
      .from('minesweeper_turns')
      .select('*')
      .eq('match_id', matchId)
      .order('turn_order', { ascending: true });

    return (turns ?? []) as TurnRow[];
  }, []);

  const advanceTurn = useCallback(async (matchId: string, currentUserId: string) => {
    const { data, error } = await supabase.rpc('advance_minesweeper_turn', {
      p_match_id: matchId,
      p_current_user_id: currentUserId,
    });

    if (error) {
      console.error('Failed to advance Minesweeper turn:', error);
      return false;
    }
    return data === true;
  }, []);

  const startSession = useCallback(async (level: Level): Promise<string | null> => {
    if (!roomId || !currentUser) return null;
    setLoading(true);

    const { data: existing } = await supabase
      .from('minesweeper_sessions')
      .select('id')
      .eq('music_room_id', roomId)
      .eq('status', 'active')
      .limit(1);

    if (existing?.[0]?.id) {
      await supabase
        .from('minesweeper_players')
        .upsert({
          session_id: existing[0].id,
          user_id: currentUser.user_id,
          username: currentUser.username,
        }, { onConflict: 'session_id,user_id' });
      await loadSession(existing[0].id);
      return existing[0].id;
    }

    const { data: createdSession } = await supabase
      .from('minesweeper_sessions')
      .insert({
        music_room_id: roomId,
        difficulty: level,
        status: 'active',
        created_by: currentUser.user_id,
      })
      .select('*')
      .single();

    const created = createdSession as SessionRow | null;
    if (!created) {
      setLoading(false);
      return null;
    }

    await supabase.from('minesweeper_players').insert({
      session_id: created.id,
      user_id: currentUser.user_id,
      username: currentUser.username,
    });

    const { data: createdMatch } = await supabase
      .from('minesweeper_matches')
      .insert({
        session_id: created.id,
        match_number: 1,
        status: 'playing',
        current_turn_started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    const matchId = createdMatch?.id as string | undefined;
    if (matchId) {
      const board = createBoard(level);
      await supabase.from('minesweeper_cells').insert(boardToCellRows(board, matchId));
      await insertTurnOrder(matchId, [currentUser.user_id]);
    }

    await loadSession(created.id);
    return created.id;
  }, [currentUser, insertTurnOrder, loadSession, roomId]);

  const joinSession = useCallback(async (sessionId: string) => {
    if (!currentUser) return;

    await supabase
      .from('minesweeper_players')
      .upsert({
        session_id: sessionId,
        user_id: currentUser.user_id,
        username: currentUser.username,
      }, { onConflict: 'session_id,user_id' });

    await touchMinesweeperSession(sessionId);

    const { data: matches } = await supabase
      .from('minesweeper_matches')
      .select('id,status')
      .eq('session_id', sessionId)
      .eq('status', 'playing')
      .order('match_number', { ascending: false })
      .limit(1);

    const matchId = matches?.[0]?.id as string | undefined;
    if (matchId) {
      const { data: existingTurn } = await supabase
        .from('minesweeper_turns')
        .select('id')
        .eq('match_id', matchId)
        .eq('user_id', currentUser.user_id)
        .limit(1);

      if (!existingTurn?.length) {
        const { data: turns } = await supabase
          .from('minesweeper_turns')
          .select('turn_order,is_current')
          .eq('match_id', matchId);

        const nextOrder = Math.max(-1, ...((turns ?? []) as Pick<TurnRow, 'turn_order'>[]).map((turn) => turn.turn_order)) + 1;
        await supabase.from('minesweeper_turns').insert({
          match_id: matchId,
          user_id: currentUser.user_id,
          turn_order: nextOrder,
          is_current: !turns?.length,
        });
      }
    }

    await loadSession(sessionId);
  }, [currentUser, loadSession]);

  const makeMove = useCallback(async (row: number, col: number, action: MoveAction) => {
    const currentSession = sessionRef.current;
    if (!currentSession?.match_id || !currentUser || (action !== 'reveal' && action !== 'flag')) return;
    if (currentSession.players[currentSession.current_turn_index] !== currentUser.user_id) return;

    const turnRows = await loadTurnRows(currentSession.match_id);
    if (getNextTurnUserId(turnRows, currentUser.user_id) === null) {
      await loadSession(currentSession.id);
      return;
    }

    await touchMinesweeperSession(currentSession.id);

    const { data: cells } = await supabase
      .from('minesweeper_cells')
      .select('*')
      .eq('match_id', currentSession.match_id)
      .order('y', { ascending: true })
      .order('x', { ascending: true });

    if (!cells?.length) return;
    const currentBoard = cellRowsToBoard(cells as CellRow[]);
    const cell = currentBoard[row]?.[col];
    if (!cell) return;

    if (action === 'flag') {
      if (cell.state !== 'unrevealed' && cell.state !== 'flagged') return;
      await supabase
        .from('minesweeper_cells')
        .update({ is_flagged: cell.state !== 'flagged' })
        .eq('match_id', currentSession.match_id)
        .eq('x', col)
        .eq('y', row)
        .eq('is_opened', false);
      await loadSession(currentSession.id);
      return;
    }

    if (cell.state !== 'unrevealed') return;

    const result = revealCell(currentBoard, row, col);
    const changedCells = result.board.flatMap((boardRow, y) =>
      boardRow.flatMap((boardCell, x) => {
        const previous = currentBoard[y][x];
        if (previous.state === boardCell.state) return [];
        return {
          x,
          y,
          is_opened: boardCell.state === 'revealed' || boardCell.state === 'mine',
          opened_by: currentUser.user_id,
          opened_at: new Date().toISOString(),
        };
      })
    );

    await Promise.all(changedCells.map((changed) =>
      supabase
        .from('minesweeper_cells')
        .update({
          is_opened: changed.is_opened,
          is_flagged: false,
          opened_by: changed.opened_by,
          opened_at: changed.opened_at,
        })
        .eq('match_id', currentSession.match_id)
        .eq('x', changed.x)
        .eq('y', changed.y)
    ));

    if (result.hitMine) {
      const now = new Date().toISOString();
      await supabase
        .from('minesweeper_matches')
        .update({ status: 'finished', loser_user_id: currentUser.user_id, finished_at: now })
        .eq('id', currentSession.match_id);

      const { data: playerRows } = await supabase
        .from('minesweeper_players')
        .select('*')
        .eq('session_id', currentSession.id);

      const scored = scoreMineHitMatch((playerRows ?? []) as PlayerRow[], currentUser.user_id);
      await Promise.all(scored.map((player) =>
        supabase
          .from('minesweeper_players')
          .update({ wins: player.wins, losses: player.losses })
          .eq('id', player.id)
      ));
      await loadSession(currentSession.id);
      return;
    }

    await advanceTurn(currentSession.match_id, currentUser.user_id);
    await loadSession(currentSession.id);
  }, [advanceTurn, currentUser, loadSession, loadTurnRows]);

  const playAgain = useCallback(async (sessionId: string) => {
    const { data: sessionRows } = await supabase
      .from('minesweeper_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    const activeSession = sessionRows as SessionRow | null;
    if (!activeSession || activeSession.status !== 'active') return;

    await touchMinesweeperSession(sessionId);

    const [{ data: players }, { data: matches }] = await Promise.all([
      supabase.from('minesweeper_players').select('user_id').eq('session_id', sessionId),
      supabase.from('minesweeper_matches').select('match_number').eq('session_id', sessionId),
    ]);

    const nextMatchNumber = Math.max(0, ...((matches ?? []) as Pick<MatchRow, 'match_number'>[]).map((match) => match.match_number)) + 1;
    const { data: createdMatch } = await supabase
      .from('minesweeper_matches')
      .insert({
        session_id: sessionId,
        match_number: nextMatchNumber,
        status: 'playing',
        current_turn_started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    const matchId = createdMatch?.id as string | undefined;
    if (!matchId) return;

    const board = createBoard(activeSession.difficulty);
    await supabase.from('minesweeper_cells').insert(boardToCellRows(board, matchId));
    await insertTurnOrder(matchId, ((players ?? []) as Pick<PlayerRow, 'user_id'>[]).map((player) => player.user_id));
    await loadSession(sessionId);
  }, [insertTurnOrder, loadSession]);

  const finishSession = useCallback(async (sessionId: string) => {
    await supabase
      .from('minesweeper_sessions')
      .update({ status: 'finished', finished_at: new Date().toISOString() })
      .eq('id', sessionId);
    await loadSession();
  }, [loadSession]);

  const leaveSession = useCallback(async (_sessionId: string) => {
    await loadSession(_sessionId);
  }, [loadSession]);

  const cancelSession = useCallback(async (sessionId: string) => {
    await finishSession(sessionId);
  }, [finishSession]);

  return {
    session,
    board,
    moves,
    myTurn,
    loading,
    startSession,
    joinSession,
    leaveSession,
    cancelSession,
    makeMove,
    playAgain,
    finishSession,
  };
}
