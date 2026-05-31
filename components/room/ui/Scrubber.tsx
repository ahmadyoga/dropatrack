'use client';

import { useRef, useState, useEffect } from 'react';

interface ScrubberProps {
  value: number;
  max: number;
  onChange: (v: number) => void;
  color?: string;
  height?: number;
  knob?: boolean;
}

export default function Scrubber({
  value,
  max,
  onChange,
  color = 'var(--accent)',
  height = 14,
  knob = true,
}: ScrubberProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(false);

  const pct = max ? Math.max(0, Math.min(1, value / max)) : 0;

  const setFromX = (clientX: number) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    onChange(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * max);
  };

  useEffect(() => {
    if (!drag) return;
    const mv = (e: PointerEvent) => setFromX(e.clientX);
    const up = () => setDrag(false);
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
    };
  });

  return (
    <div
      ref={ref}
      onPointerDown={(e) => { setDrag(true); setFromX(e.clientX); }}
      style={{
        position: 'relative',
        height,
        flex: 1,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <div style={{
        position: 'absolute', left: 0, right: 0,
        height: height * 0.6, top: '50%', transform: 'translateY(-50%)',
        background: 'var(--panel-3)',
        border: '2.5px solid var(--outline)',
        borderRadius: 20,
      }} />
      <div style={{
        position: 'absolute', left: 0,
        width: `${pct * 100}%`,
        height: height * 0.6, top: '50%', transform: 'translateY(-50%)',
        background: color,
        border: '2.5px solid var(--outline)',
        borderRadius: 20,
        transition: drag ? 'none' : 'width .15s linear',
      }} />
      {knob && (
        <div style={{
          position: 'absolute',
          left: `${pct * 100}%`,
          top: '50%',
          transform: 'translate(-50%,-50%)',
          width: height + 8,
          height: height + 8,
          background: 'var(--panel)',
          border: '3px solid var(--outline)',
          borderRadius: '50%',
          boxShadow: '2px 2px 0 var(--shadow)',
          transition: drag ? 'none' : 'left .15s linear',
        }} />
      )}
    </div>
  );
}
