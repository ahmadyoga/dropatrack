import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { generatePuzzle, puzzleToCellRows, cellRowsToGrid } from '@/lib/game/sudoku';
import type {
  GameSession,
  Level,
  SudokuCellRow,
  SudokuGrid,
  SudokuMatchRow,
  SudokuPlayerRow,
  SudokuPlayerScore,
  SudokuSessionRow,
  UserPresence,
} from '@/lib/types';

interface UseSudokuSessionReturn {
  session: GameSession | null;
  grid: SudokuGrid | null;
  scores: SudokuPlayerScore[];
  loading: boolean;
  startSession: (level: Level) => Promise<string | null>;
  joinSession: (sessionId: string) => Promise<void>;
  leaveSession: (sessionId: string) => Promise<void>;
  cancelSession: (sessionId: string) => Promise<void>;
  submitCell: (row: number, col: number, value: number) => Promise<'correct' | 'wrong' | 'taken'>;
  playAgain: (sessionId: string) => Promise<void>;
  finishSession: (sessionId: string) => Promise<void>;
}

function mapSession(
  session: SudokuSessionRow,
  players: SudokuPlayerRow[],
  match: SudokuMatchRow | null
): GameSession {
  const host = players.find((player) => player.user_id === session.created_by) ?? players[0];

  return {
    id: session.id,
    room_id: session.music_room_id,
    game_type: 'sudoku',
    level: session.difficulty,
    status: session.status,
    host_id: session.created_by,
    host_username: host?.username ?? 'Unknown',
    players: players.map((player) => player.user_id),
    player_usernames: Object.fromEntries(players.map((player) => [player.user_id, player.username])),
    current_turn_index: 0,
    board: null,
    winner_id: match?.winner_user_id ?? null,
    match_id: match?.id ?? null,
    match_number: match?.match_number ?? 1,
    scores: players.map(({ user_id, username, wins, losses }) => ({ user_id, username, wins, losses })),
    chat_message_id: null,
    created_at: session.created_at,
    updated_at: match?.started_at ?? session.created_at,
    started_at: match?.started_at ?? session.created_at,
    finished_at: session.finished_at,
  };
}

function mapScores(players: SudokuPlayerRow[], cells: SudokuCellRow[]): SudokuPlayerScore[] {
  return players
    .map((player) => ({
      user_id: player.user_id,
      username: player.username,
      wins: player.wins,
      losses: player.losses,
      wrong: player.wrong_count,
      correct: cells.filter((cell) => cell.filled_by === player.user_id).length,
    }))
    .sort((a, b) => (b.correct - b.wrong) - (a.correct - a.wrong));
}

async function touchSudokuSession(sessionId: string) {
  await supabase
    .from('sudoku_sessions')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('status', 'active');
}

export function useSudokuSession(roomId: string, currentUser: UserPresence | null): UseSudokuSessionReturn {
  const [session, setSession] = useState<GameSession | null>(null);
  const [grid, setGrid] = useState<SudokuGrid | null>(null);
  const [scores, setScores] = useState<SudokuPlayerScore[]>([]);
  const [loading, setLoading] = useState(true);

  const sessionRef = useRef<GameSession | null>(null);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const loadSession = useCallback(async (sessionId?: string) => {
    if (!roomId) return;
    setLoading(true);

    const sessionQuery = supabase
      .from('sudoku_sessions')
      .select('*')
      .eq(sessionId ? 'id' : 'music_room_id', sessionId ?? roomId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!sessionId) sessionQuery.eq('status', 'active');

    const { data: sessionRows } = await sessionQuery;
    const sessionRow = sessionRows?.[0] as SudokuSessionRow | undefined;

    if (!sessionRow) {
      setSession(null);
      setGrid(null);
      setScores([]);
      setLoading(false);
      return;
    }

    const [{ data: playerRows }, { data: matchRows }] = await Promise.all([
      supabase.from('sudoku_players').select('*').eq('session_id', sessionRow.id).order('joined_at', { ascending: true }),
      supabase.from('sudoku_matches').select('*').eq('session_id', sessionRow.id).order('match_number', { ascending: false }).limit(1),
    ]);

    const players = (playerRows ?? []) as SudokuPlayerRow[];
    const match = (matchRows?.[0] ?? null) as SudokuMatchRow | null;

    if (!match) {
      setSession(mapSession(sessionRow, players, null));
      setGrid(null);
      setScores(mapScores(players, []));
      setLoading(false);
      return;
    }

    const { data: cellRows } = await supabase
      .from('sudoku_cells')
      .select('*')
      .eq('match_id', match.id)
      .order('y', { ascending: true })
      .order('x', { ascending: true });

    const cells = (cellRows ?? []) as SudokuCellRow[];
    setSession(mapSession(sessionRow, players, match));
    setGrid(cells.length ? cellRowsToGrid(cells) : null);
    setScores(mapScores(players, cells));
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    void Promise.resolve().then(() => loadSession());

    const reload = () => { loadSession(); };
    const channels = [
      supabase.channel(`sudoku-sessions:${roomId}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sudoku_sessions', filter: `music_room_id=eq.${roomId}` },
        reload
      ).subscribe(),
      supabase.channel(`sudoku-players:${roomId}`).on(
        'postgres_changes', { event: '*', schema: 'public', table: 'sudoku_players' }, reload
      ).subscribe(),
      supabase.channel(`sudoku-matches:${roomId}`).on(
        'postgres_changes', { event: '*', schema: 'public', table: 'sudoku_matches' }, reload
      ).subscribe(),
      supabase.channel(`sudoku-cells:${roomId}`).on(
        'postgres_changes', { event: '*', schema: 'public', table: 'sudoku_cells' }, reload
      ).subscribe(),
    ];

    return () => {
      channels.forEach((channel) => { channel.unsubscribe(); });
      setSession(null);
      setGrid(null);
      setScores([]);
      setLoading(true);
    };
  }, [loadSession, roomId]);

  const startSession = useCallback(async (level: Level): Promise<string | null> => {
    if (!roomId || !currentUser) return null;
    setLoading(true);

    const { data: existing } = await supabase
      .from('sudoku_sessions')
      .select('id')
      .eq('music_room_id', roomId)
      .eq('status', 'active')
      .limit(1);

    if (existing?.[0]?.id) {
      await supabase.from('sudoku_players').upsert({
        session_id: existing[0].id,
        user_id: currentUser.user_id,
        username: currentUser.username,
      }, { onConflict: 'session_id,user_id' });
      await loadSession(existing[0].id);
      return existing[0].id;
    }

    const { data: createdSession } = await supabase
      .from('sudoku_sessions')
      .insert({ music_room_id: roomId, difficulty: level, status: 'active', created_by: currentUser.user_id })
      .select('*')
      .single();

    const created = createdSession as SudokuSessionRow | null;
    if (!created) {
      setLoading(false);
      return null;
    }

    await supabase.from('sudoku_players').insert({
      session_id: created.id,
      user_id: currentUser.user_id,
      username: currentUser.username,
    });

    const { data: createdMatch } = await supabase
      .from('sudoku_matches')
      .insert({ session_id: created.id, match_number: 1, status: 'playing' })
      .select('id')
      .single();

    const matchId = createdMatch?.id as string | undefined;
    if (matchId) {
      const { puzzle, solution } = generatePuzzle(level);
      await supabase.from('sudoku_cells').insert(puzzleToCellRows(puzzle, solution, matchId));
    }

    await loadSession(created.id);
    return created.id;
  }, [currentUser, loadSession, roomId]);

  const joinSession = useCallback(async (sessionId: string) => {
    if (!currentUser) return;

    await supabase.from('sudoku_players').upsert({
      session_id: sessionId,
      user_id: currentUser.user_id,
      username: currentUser.username,
    }, { onConflict: 'session_id,user_id' });

    await touchSudokuSession(sessionId);
    await loadSession(sessionId);
  }, [currentUser, loadSession]);

  const submitCell = useCallback(async (row: number, col: number, value: number) => {
    const currentSession = sessionRef.current;
    if (!currentSession?.match_id || !currentUser) return 'taken' as const;

    const { data, error } = await supabase.rpc('submit_sudoku_cell', {
      p_match_id: currentSession.match_id,
      p_x: col,
      p_y: row,
      p_user_id: currentUser.user_id,
      p_value: value,
    });

    if (error) {
      console.error('Failed to submit sudoku cell:', error);
      return 'taken' as const;
    }

    await loadSession(currentSession.id);
    return data as 'correct' | 'wrong' | 'taken';
  }, [currentUser, loadSession]);

  const playAgain = useCallback(async (sessionId: string) => {
    const { data: sessionRows } = await supabase.from('sudoku_sessions').select('*').eq('id', sessionId).single();
    const activeSession = sessionRows as SudokuSessionRow | null;
    if (!activeSession || activeSession.status !== 'active') return;

    await touchSudokuSession(sessionId);

    const { data: matches } = await supabase.from('sudoku_matches').select('match_number').eq('session_id', sessionId);
    const nextMatchNumber = Math.max(0, ...((matches ?? []) as Pick<SudokuMatchRow, 'match_number'>[]).map((match) => match.match_number)) + 1;

    const { data: createdMatch } = await supabase
      .from('sudoku_matches')
      .insert({ session_id: sessionId, match_number: nextMatchNumber, status: 'playing' })
      .select('id')
      .single();

    const matchId = createdMatch?.id as string | undefined;
    if (!matchId) return;

    await supabase.from('sudoku_players').update({ wrong_count: 0 }).eq('session_id', sessionId);

    const { puzzle, solution } = generatePuzzle(activeSession.difficulty);
    await supabase.from('sudoku_cells').insert(puzzleToCellRows(puzzle, solution, matchId));
    await loadSession(sessionId);
  }, [loadSession]);

  const finishSession = useCallback(async (sessionId: string) => {
    await supabase.from('sudoku_sessions').update({ status: 'finished', finished_at: new Date().toISOString() }).eq('id', sessionId);
    await loadSession();
  }, [loadSession]);

  const leaveSession = useCallback(async (sessionId: string) => {
    await loadSession(sessionId);
  }, [loadSession]);

  const cancelSession = useCallback(async (sessionId: string) => {
    await finishSession(sessionId);
  }, [finishSession]);

  return { session, grid, scores, loading, startSession, joinSession, leaveSession, cancelSession, submitCell, playAgain, finishSession };
}
