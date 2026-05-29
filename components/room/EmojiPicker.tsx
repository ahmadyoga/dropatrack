'use client';

// Curated emoji set for the "+" picker. Client-only — no backend.
export const EMOJI_CHOICES = [
  '😀', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊',
  '😇', '🥰', '😍', '🤩', '😘', '😋', '😜', '🤪', '🤗', '🤔',
  '🤭', '🥳', '😎', '🤓', '😏', '😴', '🤤', '😵‍💫', '🥶', '🥵',
  '🤯', '😳', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '😈',
  '👍', '👎', '👏', '🙌', '👋', '🤝', '🙏', '💪', '🤟', '🤘',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '💯',
  '🔥', '✨', '⭐', '🌟', '💫', '⚡', '🎉', '🎊', '🥂', '🍻',
  '🎵', '🎶', '🎸', '🥁', '🎤', '🎧', '🚀', '🌈', '🦄', '👑',
  '🐶', '🐱', '🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🍕', '☕',
];

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
}

export default function EmojiPicker({ onPick }: EmojiPickerProps) {
  return (
    <div className="reaction-picker" role="menu" aria-label="More emoji">
      {EMOJI_CHOICES.map((emoji) => (
        <button
          key={emoji}
          className="reaction-emoji-btn"
          onClick={() => onPick(emoji)}
          aria-label={`React ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
