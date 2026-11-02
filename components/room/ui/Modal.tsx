'use client';

import { useEffect, useId, useRef } from 'react';
import Icon from './Icon';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  /** Header title. Omit for a bare dialog (image preview, game boards). */
  title?: React.ReactNode;
  /** Accessible name when there is no visible title. */
  label?: string;
  /** Extra header content shown before the close button. */
  headerExtra?: React.ReactNode;
  width?: string;
  zIndex?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * One dialog for the whole room: scrim, Esc / backdrop to close, focus moved in,
 * Tab kept inside, focus restored on close, one header style.
 */
export default function Modal({
  onClose, children, title, label, headerExtra,
  width = 'min(480px, 94vw)', zIndex, className = '', style,
}: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    // Respect a child's autoFocus; otherwise focus the first control.
    if (node && !node.contains(document.activeElement)) {
      (node.querySelector<HTMLElement>('[autofocus]') ?? node.querySelector<HTMLElement>(FOCUSABLE) ?? node).focus();
    }

    const onKey = (e: KeyboardEvent) => {
      // A child that already used Esc (e.g. Sudoku clearing a cell) wins.
      if (e.key === 'Escape') { if (!e.defaultPrevented) onCloseRef.current(); return; }
      if (e.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, []);

  const bare = title === undefined;

  return (
    <div className="scrim" onClick={onClose} style={zIndex ? { zIndex } : undefined}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={bare ? undefined : titleId}
        aria-label={bare ? label : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={bare ? `popin ${className}` : `pop pop-lg popin col ${className}`}
        style={bare ? style : { width, maxHeight: '88vh', overflow: 'hidden', borderRadius: 18, outline: 'none', ...style }}
      >
        {!bare && (
          <div
            className="flex items-center justify-between"
            style={{ padding: '14px 16px 14px 20px', borderBottom: '3px solid var(--outline)', background: 'var(--panel-2)', flexShrink: 0, gap: 12 }}
          >
            <h2 id={titleId} className="display" style={{ fontSize: 20, margin: 0, minWidth: 0 }}>{title}</h2>
            <div className="flex items-center" style={{ gap: 8, flexShrink: 0 }}>
              {headerExtra}
              <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close" style={{ width: 44, height: 44, padding: 0 }}>
                <Icon name="close" size={18} />
              </button>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
