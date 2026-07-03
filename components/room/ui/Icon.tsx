import type { CSSProperties } from 'react';

const PATHS: Record<string, React.ReactNode> = {
  play:    <polygon points="7,5 19,12 7,19" />,
  pause:   <g><rect x="6" y="5" width="4.2" height="14" rx="1.2"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2"/></g>,
  prev:    <g><rect x="5" y="5" width="3" height="14" rx="1"/><polygon points="20,5 9.5,12 20,19"/></g>,
  next:    <g><rect x="16" y="5" width="3" height="14" rx="1"/><polygon points="4,5 14.5,12 4,19"/></g>,
  shuffle: <g fill="none"><path d="M4 7h4l9 10h3"/><path d="M4 17h4l3-3.4"/><path d="M14.5 8.4 17 7h3"/><path d="M18 4l3 3-3 3"/><path d="M18 14l3 3-3 3"/></g>,
  volume:  <g><polygon points="4,9 8,9 12,5 12,19 8,15 4,15"/><path fill="none" d="M15.5 9c1.4 1.6 1.4 4.4 0 6"/><path fill="none" d="M18 6.5c2.8 2.8 2.8 8.2 0 11"/></g>,
  mute:    <g><polygon points="4,9 8,9 12,5 12,19 8,15 4,15"/><path fill="none" d="M16 9.5l5 5M21 9.5l-5 5"/></g>,
  search:  <g fill="none"><circle cx="11" cy="11" r="6"/><path d="M16 16l4.5 4.5"/></g>,
  plus:    <g fill="none"><path d="M12 5v14M5 12h14"/></g>,
  send:    <polygon points="4,4 21,12 4,20 7,12" />,
  image:   <g fill="none"><rect x="4" y="5" width="16" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M5 17l4.5-4 3.5 3 3-3 4 3.5"/></g>,
  gear:    <g fill="none"><circle cx="12" cy="12" r="3.4"/><path d="M12 3.5v3M12 17.5v3M20.5 12h-3M6.5 12h-3M18 6l-2.1 2.1M8.1 15.9 6 18M18 18l-2.1-2.1M8.1 8.1 6 6"/></g>,
  close:   <g fill="none"><path d="M6 6l12 12M18 6 6 18"/></g>,
  sun:     <g fill="none"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.2 5.2 7 7M17 17l1.8 1.8M18.8 5.2 17 7M7 17l-1.8 1.8"/></g>,
  moon:    <path d="M20 14.5A8 8 0 1 1 9.5 4 6.4 6.4 0 0 0 20 14.5z" fill="currentColor" />,
  chevD:   <g fill="none"><path d="M6 9l6 6 6-6"/></g>,
  chevR:   <g fill="none"><path d="M9 6l6 6-6 6"/></g>,
  drag:    <g><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></g>,
  trash:   <g fill="none"><path d="M5 7h14M10 7V5h4v2M6.5 7l1 12h9l1-12"/></g>,
  tonext:  <g fill="none"><path d="M5 12h11"/><path d="M12 7l5 5-5 5"/><path d="M21 6v12"/></g>,
  replay:  <g fill="none"><path d="M19 9a8 8 0 1 0 1.4 5"/><path d="M20 3v6h-6"/></g>,
  edit:    <g fill="none"><path d="M5 19h3l9-9-3-3-9 9z"/><path d="M14 7l3 3"/></g>,
  link:    <g fill="none"><path d="M9 15l6-6"/><path d="M11 7l1.5-1.5a3.5 3.5 0 0 1 5 5L16 12"/><path d="M13 17l-1.5 1.5a3.5 3.5 0 0 1-5-5L8 12"/></g>,
  check:   <g fill="none"><path d="M5 12l4 4 10-10"/></g>,
  list:    <g fill="none"><path d="M8 7h12M8 12h12M8 17h12"/><circle cx="4" cy="7" r="1.3" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="4" cy="17" r="1.3" fill="currentColor" stroke="none"/></g>,
  chat:    <g fill="none"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z"/></g>,
  users:   <g fill="none"><circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6a3 3 0 0 1 0 5.7M16.5 19a5.5 5.5 0 0 0-2-4.3"/></g>,
  speaker: <g fill="none"><polygon points="4,9 8,9 12,5 12,19 8,15 4,15"/><path d="M15.5 9c1.4 1.6 1.4 4.4 0 6M18 6.5c2.8 2.8 2.8 8.2 0 11"/></g>,
  remote:  <g fill="none"><rect x="7" y="3" width="10" height="18" rx="3"/><circle cx="12" cy="8" r="1.6" fill="currentColor" stroke="none"/><path d="M9.5 13h5M9.5 16h5"/></g>,
  back:    <g fill="none"><path d="M19 12H5M11 6l-6 6 6 6"/></g>,
  bolt:    <polygon points="13,2 4,14 11,14 10,22 19,9 12,9" />,
  gamepad: <g fill="none"><rect x="2" y="7" width="20" height="12" rx="4"/><path d="M8 13h4M10 11v4"/><circle cx="16" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="18" cy="14" r="1" fill="currentColor" stroke="none"/></g>,
  reply:   <g fill="none"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></g>,
};

interface IconProps {
  name: string;
  size?: number;
  sw?: number;
  style?: CSSProperties;
  className?: string;
}

export default function Icon({ name, size = 22, sw = 2.4, style, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name] ?? null}
    </svg>
  );
}
