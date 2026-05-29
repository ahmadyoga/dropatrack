'use client';

import { useSyncExternalStore } from 'react';
import { subscribe, getCurrentTime, getServerSnapshot } from './playbackTimeStore';
import { formatDuration } from '@/lib/youtube';

interface TimeLabelProps {
  className?: string;
  alignRight?: boolean;
}

export default function TimeLabel({ className, alignRight }: TimeLabelProps) {
  const t = useSyncExternalStore(subscribe, getCurrentTime, getServerSnapshot);
  return (
    <span className={className} style={alignRight ? { textAlign: 'right' } : undefined}>
      {formatDuration(Math.floor(t))}
    </span>
  );
}
