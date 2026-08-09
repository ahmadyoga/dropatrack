'use client';

import { usePwaInstall } from '@/components/room/hooks/usePwaInstall';

export default function InstallButton() {
  const { canInstall, installed, promptInstall } = usePwaInstall();
  if (installed || !canInstall) return null;

  return (
    <button
      className="btn pop-sm"
      onClick={promptInstall}
      style={{ background: 'var(--accent)', color: '#140f1f' }}
    >
      📲 INSTALL APP
    </button>
  );
}
