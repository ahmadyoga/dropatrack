'use client';

import { useState } from 'react';
import { spawnReactions } from './ui/spawnReactions';
import { useRoom } from './RoomContext';
import Icon from './ui/Icon';

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
    spawnReactions(emoji, 8);
    broadcast('reaction', { emoji });
  };

  return (
    <div
      role="group"
      aria-label="Send a reaction to the room"
      style={{ padding: '4px 2px', position: 'relative' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1" style={{ flex: 1 }}>
          {QUICK_EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => fire(e)}
              aria-label={`React ${e}`}
              className="reaction-btn"
              style={{
                fontSize: 22, width: 44, height: 44, borderRadius: 12,
                cursor: 'pointer',
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
          aria-label="More reactions"
          aria-expanded={pickerOpen}
          title="More reactions"
          style={{ flexShrink: 0, width: 44, height: 44, padding: 0 }}
        >
          <Icon name="plus" size={18} />
        </button>
      </div>

      {pickerOpen && (
        <div
          className="pop wobble popin"
          style={{
            position: 'absolute', bottom: 'calc(100% + 10px)', right: 0,
            padding: 11, width: 300, maxWidth: 'calc(100vw - 32px)', zIndex: 40,
          }}
          role="dialog"
          aria-label="All reactions"
          onKeyDown={(ev) => { if (ev.key === 'Escape') setPickerOpen(false); }}
        >
          <div className="flex justify-between items-center mb-2">
            <div className="mono" style={{ fontSize: 11, letterSpacing: '.08em', color: 'var(--ink-soft)', fontWeight: 700 }}>
              ALL REACTIONS
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              aria-label="Close reactions"
              className="btn btn-ghost btn-icon"
              style={{ width: 36, height: 36, padding: 0 }}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 5 }}>
            {FULL_EMOJI.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => { fire(e); setPickerOpen(false); }}
                aria-label={`React ${e}`}
                style={{
                  fontSize: 20, height: 36, borderRadius: 8,
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
