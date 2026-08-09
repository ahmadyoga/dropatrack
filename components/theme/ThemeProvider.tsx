'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STATUS_BAR_COLOR: Record<Theme, string> = { dark: '#14101f', light: '#f7ead0' };

function setStatusBarColor(t: Theme) {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', STATUS_BAR_COLOR[t]);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    let cancelled = false;
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const resolved = (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
    document.documentElement.setAttribute('data-theme', resolved);
    setStatusBarColor(resolved);
    void Promise.resolve().then(() => {
      if (!cancelled) setTheme(resolved);
    });
    return () => { cancelled = true; };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    setStatusBarColor(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
