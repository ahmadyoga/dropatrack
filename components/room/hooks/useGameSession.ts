import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRoom } from '../RoomContext';
import { createBoard, randomizeTurnOrder, replayMoves, applyMove } from '@/lib/minesweeper';
import type { GameSession, GameMove, Board, Level } from '@/lib/types';
import { LEVEL_CONFIG } from '@/lib/types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseGameSessionReturn {
  session: GameSession | null;
  board: Board | null;
  moves: GameMove[];
  myTurn: boolean;
  loading: boolean;
  startSession: (level: Level) => Promise<void>;
  joinSession: (sessionId: string) => Promise<void>;
  makeMove: (row: number, col: number, action: 'reveal' | 'flag' | 'chord') => Promise<void>;
}

export function useGameSession(): UseGameSessionReturn {
  const { room, currentUser, users } = useRoom();
  const roomId = room.id;

  const [session, setSession] = useState<GameSession | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [moves, setMoves] = useState<GameMove[]>([]);
  const [loading, setLoading] = useState(true);

  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const myTurn = session
    ? session.players[session.current_turn_index] === currentUser?.user_id
    : false;

  useEffect(() => {
    if (!roomId) return;

    const loadActiveSession = async () => {
      const { data: sessions } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('room_id', roomId)
        .in('status', ['waiting', 'playing'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (sessions && sessions.length > 0) {
        const activeSession = sessions[0] as GameSession;
        setSession(activeSession);

        if (activeSession.board) {
          const { data: gameMoves } = await supabase
            .from('game_moves')
            .select('*')
            .eq('game_session_id', activeSession.id)
            .order('created_at', { ascending: true });

          if (gameMoves) {
            setMoves(gameMoves as GameMove[]);
            setBoard(replayMoves(activeSession.board, gameMoves as GameMove[]));
          } else {
            setBoard(activeSession.board);
          }
        } else {
          setBoard(null);
          setMoves([]);
        }
      } else {
        setSession(null);
        setBoard(null);
        setMoves([]);
      }

      setLoading(false);
    };

    loadActiveSession();

    const sessionChannel = supabase
      .channel(`game-sessions-db:${roomId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_sessions', filter: `room_id=eq.${roomId}` },
        async (payload: RealtimePostgresChangesPayload<GameSession>) => {
          const newSession = payload.new as GameSession;
          if (!newSession?.id) return;

          setSession(newSession);

          if (newSession.board) {
            const { data: gameMoves } = await supabase
              .from('game_moves')
              .select('*')
              .eq('game_session_id', newSession.id)
              .order('created_at', { ascending: true });

            if (gameMoves) {
              setMoves(gameMoves as GameMove[]);
              setBoard(replayMoves(newSession.board, gameMoves as GameMove[]));
            } else {
              setBoard(newSession.board);
            }
          } else {
            setBoard(null);
            setMoves([]);
          }
        }
      )
      .subscribe();

    return () => {
      sessionChannel.unsubscribe();
      setSession(null);
      setBoard(null);
      setMoves([]);
      setLoading(true);
    };
  }, [roomId]);

  useEffect(() => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;

    const movesChannel = supabase
      .channel(`game-moves-db:${currentSession.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_moves', filter: `game_session_id=eq.${currentSession.id}` },
        (payload: RealtimePostgresChangesPayload<GameMove>) => {
          const move = payload.new as GameMove;
          if (!move?.id) return;

          setMoves((prev) => [...prev, move]);
          setBoard((prev) => {
            if (!prev) return prev;
            return applyMove(prev, move);
          });
        }
      )
      .subscribe();

    return () => {
      movesChannel.unsubscribe();
    };
  }, [session?.id]);

  const startSession = useCallback(async (level: Level) => {
    if (!roomId || !currentUser) return;
    setLoading(true);

    const board = createBoard(level);
    const players = [currentUser.user_id];

    await supabase.from('game_sessions').insert({
      room_id: roomId,
      level,
      status: 'waiting',
      host_id: currentUser.user_id,
      host_username: currentUser.username,
      players,
      current_turn_index: 0,
      board,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setLoading(false);
  }, [roomId, currentUser]);

  const joinSession = useCallback(async (sessionId: string) => {
    if (!currentUser) return;
    const { data: session } = await supabase
      .from('game_sessions')
      .select('players, status')
      .eq('id', sessionId)
      .single();

    if (session && session.status === 'waiting' && !session.players.includes(currentUser.user_id)) {
      const newPlayers = [...session.players, currentUser.user_id];
      await supabase
        .from('game_sessions')
        .update({ players: newPlayers })
        .eq('id', sessionId);
    }
  }, [currentUser]);

  const makeMove = useCallback(async (row: number, col: number, action: 'reveal' | 'flag' | 'chord') => {
    const currentSession = sessionRef.current;
    if (!currentSession || !currentUser) return;

    await supabase.from('game_moves').insert({
      game_session_id: currentSession.id,
      user_id: currentUser.user_id,
      row,
      col,
      action,
      created_at: new Date().toISOString(),
    });
  }, [currentUser]);

  return {
    session,
    board,
    moves,
    myTurn,
    loading,
    startSession,
    joinSession,
    makeMove,
  };
}
