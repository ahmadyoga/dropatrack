'use client';

import type { Level } from '@/lib/types';
import { LEVEL_CONFIG } from '@/lib/types';

interface GameCreateModalProps {
  onClose: () => void;
  onCreateGame: (level: Level) => void;
}

const LEVEL_ICONS: Record<Level, string> = {
  easy:   '🌿',
  medium: '💥',
  hard:   '☢️',
};

const LEVEL_ACCENT: Record<Level, string> = {
  easy:   'var(--pop-lime)',
  medium: 'var(--pop-yellow)',
  hard:   'var(--pop-coral)',
};

export default function GameCreateModal({ onClose, onCreateGame }: GameCreateModalProps) {
  const levels: Level[] = ['easy', 'medium', 'hard'];

  return (
    <div className="scrim" onClick={onClose}>
      <div
        className="pop wobble-2 col popin"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(500px, 94vw)', overflow: 'hidden', boxShadow: '9px 9px 0 var(--shadow)' }}
      >
        {/* header */}
        <div
          className="flex justify-between items-center"
          style={{
            padding: '16px 20px',
            borderBottom: '3px solid var(--outline)',
            background: 'var(--accent)',
            color: '#140f1f',
          }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 22 }}>💣</span>
            <div className="display" style={{ fontSize: 20 }}>New Minesweeper Game</div>
          </div>
          <button
            className="btn pop-sm btn-icon"
            onClick={onClose}
            style={{ color: '#140f1f', background: 'transparent', border: '2.5px solid #140f1f', boxShadow: 'none' }}
          >
            ✕
          </button>
        </div>

        {/* level cards */}
        <div className="col" style={{ padding: '20px', gap: 12 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', letterSpacing: '.05em', marginBottom: 4 }}>
            CHOOSE DIFFICULTY
          </div>

          {levels.map((level) => {
            const cfg = LEVEL_CONFIG[level];
            const accent = LEVEL_ACCENT[level];
            const icon = LEVEL_ICONS[level];

            return (
              <button
                key={level}
                onClick={() => { onCreateGame(level); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 20px',
                  border: '3px solid var(--outline)',
                  borderRadius: 16,
                  background: 'var(--panel)',
                  boxShadow: '5px 5px 0 var(--shadow)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'transform .08s ease, box-shadow .08s ease, background .15s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = accent;
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translate(-2px, -2px)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '7px 7px 0 var(--shadow)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--panel)';
                  (e.currentTarget as HTMLButtonElement).style.transform = '';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '5px 5px 0 var(--shadow)';
                }}
              >
                {/* icon */}
                <span
                  style={{
                    fontSize: 32,
                    width: 56,
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--panel-2)',
                    border: '2.5px solid var(--outline)',
                    borderRadius: 14,
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </span>

                {/* text */}
                <div className="col" style={{ gap: 4, flex: 1 }}>
                  <div className="display" style={{ fontSize: 18, color: 'var(--ink)' }}>
                    {cfg.label}
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', lineHeight: 1.4 }}>
                    {cfg.cols}×{cfg.rows} grid · {cfg.mines} mines
                  </div>
                </div>

                {/* grid preview */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(cfg.cols, 6)}, 8px)`,
                    gridTemplateRows: `repeat(${Math.min(cfg.rows, 6)}, 8px)`,
                    gap: 2,
                    opacity: 0.55,
                    flexShrink: 0,
                  }}
                >
                  {Array.from({ length: Math.min(cfg.rows, 6) * Math.min(cfg.cols, 6) }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: 8,
                        height: 8,
                        background: Math.random() > 0.85 ? accent : 'var(--panel-3)',
                        border: '1px solid var(--outline)',
                        borderRadius: 2,
                      }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
