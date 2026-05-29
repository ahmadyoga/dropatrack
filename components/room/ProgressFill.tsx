'use client';

import { useSyncExternalStore } from 'react';
import { subscribe, getCurrentTime, getServerSnapshot } from './playbackTimeStore';

interface ProgressFillProps {
  duration: number;
  className: string;
}

export default function ProgressFill({ duration, className }: ProgressFillProps) {
  const t = useSyncExternalStore(subscribe, getCurrentTime, getServerSnapshot);
  const percent = duration > 0 ? Math.min(100, (t / duration) * 100) : 0;
  return <div className={className} style={{ width: `${percent}%` }} />;
}
