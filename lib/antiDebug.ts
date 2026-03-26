'use client';

import { useEffect } from 'react';

/**
 * Anti-debugging measures to discourage casual inspection of
 * client-side Supabase calls. Not foolproof, but raises the bar.
 */
export function useAntiDebug() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return; // Skip in dev

    let devToolsOpen = false;

    const showBlockingScreen = () => {
      if (document.getElementById('anti-debug-overlay')) return;
      const overlay = document.createElement('div');
      overlay.id = 'anti-debug-overlay';
      overlay.style.cssText = `
        position:fixed;inset:0;z-index:999999;
        display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;
        background:#000;color:#22c55e;font-family:'Space Grotesk',sans-serif;
      `;
      overlay.innerHTML = `
        <div style="font-size:48px">🎵</div>
        <div style="font-size:24px;font-weight:bold">Nice try!</div>
        <div style="font-size:14px;color:#888">Close Developer Tools to continue using DropATrack</div>
      `;
      document.body.appendChild(overlay);
    };

    const removeBlockingScreen = () => {
      document.getElementById('anti-debug-overlay')?.remove();
    };

    // 1. Block common DevTools keyboard shortcuts
    const blockKeys = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
        ((e.ctrlKey || e.metaKey) && e.key === 'u')
      ) {
        e.preventDefault();
        return false;
      }
    };

    // 2. Block right-click context menu
    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 3. Console traps — overwrite with no-ops
    const noop = () => {};
    try {
      const originalError = console.error;
      Object.defineProperty(window, 'console', {
        get() {
          return {
            log: noop, debug: noop, info: noop, warn: noop,
            table: noop, dir: noop, trace: noop, group: noop,
            groupEnd: noop, groupCollapsed: noop, clear: noop,
            error: originalError, // Keep errors for real debugging
          };
        },
        configurable: false,
      });
    } catch {
      // Console already locked
    }

    // 4. Debugger timing trap — detects if DevTools paused execution
    const debuggerTrap = setInterval(() => {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const delta = performance.now() - start;
      if (delta > 100) {
        devToolsOpen = true;
        showBlockingScreen();
      }
    }, 2000);

    // 5. Window size detection (catches docked DevTools)
    const sizeCheck = setInterval(() => {
      const widthGap = window.outerWidth - window.innerWidth > 160;
      const heightGap = window.outerHeight - window.innerHeight > 200;
      if (widthGap || heightGap) {
        devToolsOpen = true;
        showBlockingScreen();
      } else if (devToolsOpen) {
        // DevTools closed
        devToolsOpen = false;
        removeBlockingScreen();
      }
    }, 1000);

    // 6. toString detection — DevTools calls toString() on logged objects
    const devToolsElement = new Image();
    Object.defineProperty(devToolsElement, 'id', {
      get: function () {
        devToolsOpen = true;
        showBlockingScreen();
        return '';
      },
    });
    const toStringCheck = setInterval(() => {
      devToolsOpen = false;
      console.debug?.(devToolsElement);
    }, 2000);

    // 7. Detect undocked/separate window DevTools via console.profile
    const profileCheck = setInterval(() => {
      const start = performance.now();
      console.profile?.('devtools-check');
      console.profileEnd?.('devtools-check');
      if (performance.now() - start > 10) {
        devToolsOpen = true;
        showBlockingScreen();
      }
    }, 3000);

    document.addEventListener('keydown', blockKeys);
    document.addEventListener('contextmenu', blockContextMenu);

    return () => {
      document.removeEventListener('keydown', blockKeys);
      document.removeEventListener('contextmenu', blockContextMenu);
      clearInterval(debuggerTrap);
      clearInterval(sizeCheck);
      clearInterval(toStringCheck);
      clearInterval(profileCheck);
    };
  }, []);
}
