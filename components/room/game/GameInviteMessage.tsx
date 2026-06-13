'use client';

import type { GameSession } from '@/lib/types';
import { LEVEL_CONFIG } from '@/lib/types';

interface GameInviteMessageProps {
  session: GameSession;
  onJoin: (sessionId: string) => void;
  currentUserId: string;
}

export default function GameInviteMessage({ session, onJoin, currentUserId }: GameInviteMessageProps) {
  const config = LEVEL_CONFIG[session.level];
  const isHost = session.host_id === currentUserId;
  const isJoined = session.players.includes(currentUserId);
  const isFinished = session.status === 'finished';
  const isPlaying = session.status === 'playing' || session.status === 'active';

  return (
    <div 
      className="flex items-center gap-3 pop-sm" 
      style={{ 
        marginTop: 7, 
        borderRadius: 13, 
        padding: '12px 14px', 
        background: 'var(--panel)',
        border: '2.5px solid var(--outline)',
        boxShadow: '4px 4px 0 var(--shadow)',
        width: '100%',
        maxWidth: 320
      }}
    >
      {/* Icon */}
      <div 
        style={{ 
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: 'var(--panel-2)', border: '2px solid var(--outline)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
        }}
      >
        💣
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
          {isHost ? 'You' : session.host_username} started Minesweeper
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          {config.label} · {config.cols}×{config.rows} · Match #{session.match_number ?? 1}
        </div>
      </div>

      {/* Action */}
      <div style={{ flexShrink: 0 }}>
        {isFinished ? (
          <span className="mono" style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, background: 'var(--panel-3)', color: 'var(--ink-soft)', fontWeight: 700 }}>
            FINISHED
          </span>
        ) : isJoined ? (
          <span className="mono" style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, background: 'var(--pop-lime)', color: '#140f1f', fontWeight: 700 }}>
            {isPlaying ? 'PLAYING' : 'JOINED'}
          </span>
        ) : isPlaying ? (
          <button 
            className="btn btn-accent btn-sm pop-sm" 
            onClick={() => onJoin(session.id)}
            style={{ padding: '6px 10px', fontSize: 11 }}
          >
            JOIN
          </button>
        ) : (
          <button 
            className="btn btn-accent btn-sm pop-sm" 
            onClick={() => onJoin(session.id)}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            JOIN
          </button>
        )}
      </div>
    </div>
  );
}
