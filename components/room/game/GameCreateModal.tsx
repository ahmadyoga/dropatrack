'use client';

import type { Level } from '@/lib/types';
import { LEVEL_CONFIG, SUDOKU_LEVEL_CONFIG } from '@/lib/types';
import Modal from '../ui/Modal';

interface GameCreateModalProps {
  gameType: 'minesweeper' | 'sudoku';
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

const GAME_META = {
  minesweeper: { icon: '💣', title: 'New Minesweeper Game' },
  sudoku:      { icon: '🔢', title: 'New Sudoku Race' },
};

function levelSummary(gameType: 'minesweeper' | 'sudoku', level: Level): string {
  if (gameType === 'sudoku') {
    return `9×9 grid · ${SUDOKU_LEVEL_CONFIG[level].givens} givens`;
  }
  const cfg = LEVEL_CONFIG[level];
  return `${cfg.cols}×${cfg.rows} grid · ${cfg.mines} mines`;
}

export default function GameCreateModal({ gameType, onClose, onCreateGame }: GameCreateModalProps) {
  const levels: Level[] = ['easy', 'medium', 'hard'];
  const meta = GAME_META[gameType];

  return (
    <Modal
      onClose={onClose}
      width="min(500px, 94vw)"
      title={<span className="flex items-center gap-3"><span aria-hidden="true" style={{ fontSize: 22 }}>{meta.icon}</span>{meta.title}</span>}
    >
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
                type="button"
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
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--panel-2)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translate(-2px, -2px)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '7px 7px 0 var(--shadow)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--panel)';
                  (e.currentTarget as HTMLButtonElement).style.transform = '';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '5px 5px 0 var(--shadow)';
                }}
              >
                <span
                  style={{
                    fontSize: 32,
                    width: 56,
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: accent,
                    border: '2.5px solid var(--outline)',
                    borderRadius: 14,
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </span>

                <div className="col" style={{ gap: 4, flex: 1 }}>
                  <div className="display" style={{ fontSize: 18, color: 'var(--ink)' }}>
                    {cfg.label}
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', lineHeight: 1.4 }}>
                    {levelSummary(gameType, level)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
    </Modal>
  );
}
