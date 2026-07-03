'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className="btn pop-sm" onClick={toggleTheme} style={{ gap: 8 }}>
      <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
      <span style={{ fontSize: 12 }}>{theme === 'dark' ? 'LIGHTS ON' : 'LIGHTS OFF'}</span>
    </button>
  );
}
