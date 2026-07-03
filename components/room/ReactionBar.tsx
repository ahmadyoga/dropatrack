'use client';

import { useState } from 'react';
import { spawnReactions } from './ui/spawnReactions';
import { useRoom } from './RoomContext';

const QUICK_EMOJI = ['❤️', '🔥', '😂', '👍', '🎉', '🙌', '🫶', '💀'];
const FULL_EMOJI = [
  '❤️','🔥','😂','👍','🎉','🙌','🫶','💀',
  '😍','🤩','😭','😤','🤯','🥹','😎','🫡',
  '💯','✨','⚡','🌊','🎵','🎶','🪩','🚀',
  '👀','💅','🫠','😴','🤌','👻','🫀','🎸',
];

export default function ReactionBar() {
  const { broadcast } = useRoom();
  const [pickerOpen, setPickerOpen] = useState(false);

  const fire = (emoji: string) => {
    spawnReactions(emoji, 72);
    broadcast('reaction', { emoji });
  };

  return (
    <div
      className="pop wobble-2"
      style={{ padding: '11px 13px', boxShadow: '6px 6px 0 var(--shadow)', position: 'relative' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '.1em', flexShrink: 0 }}>
          REACT →
        </div>
        <div className="flex flex-wrap justify-center gap-1" style={{ flex: 1 }}>
          {QUICK_EMOJI.map((e) => (
            <button
              key={e}
              onClick={() => fire(e)}
              className="pop-sm"
              style={{
                fontSize: 22, width: 40, height: 40, borderRadius: 11,
                background: 'var(--panel-2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform .08s',
              }}
              onMouseDown={(ev) => { (ev.currentTarget as HTMLElement).style.transform = 'scale(.85)'; }}
              onMouseUp={(ev) => { (ev.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              {e}
            </button>
          ))}
        </div>
        <button
          className="btn pop-sm btn-icon"
          onClick={() => setPickerOpen((p) => !p)}
          title="More emoji"
          style={{ flexShrink: 0 }}
        >
          +
        </button>
      </div>

      {pickerOpen && (
        <div
          className="pop wobble popin"
          style={{
            position: 'absolute', bottom: 'calc(100% + 10px)', right: 0,
            padding: 11, width: 286, zIndex: 40,
            boxShadow: '6px 6px 0 var(--accent)',
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <div className="mono" style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-dim)' }}>
              FULL PICKER
            </div>
            <button
              onClick={() => setPickerOpen(false)}
              style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', fontSize: 14 }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 5 }}>
            {FULL_EMOJI.map((e) => (
              <button
                key={e}
                onClick={() => { fire(e); setPickerOpen(false); }}
                style={{
                  fontSize: 20, height: 32, borderRadius: 8,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                }}
                onMouseEnter={(ev) => { (ev.currentTarget as HTMLElement).style.background = 'var(--panel-3)'; }}
                onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
