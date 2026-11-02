'use client';

import Icon from './ui/Icon';
import type { TrendingVideo } from '@/lib/types';

function fmt(s: number): string {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** YouTube returns ISO-8601 ("PT6M50S"); never show that raw. */
function videoDuration(v: TrendingVideo): string {
  if (v.durationSeconds > 0) return fmt(v.durationSeconds);
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(v.duration || '');
  if (!m) return '';
  return fmt((Number(m[1] ?? 0) * 3600) + (Number(m[2] ?? 0) * 60) + Number(m[3] ?? 0));
}

interface DiscoverProps {
  trendingVideos: TrendingVideo[];
  latestVideos: TrendingVideo[];
  freshVideos: TrendingVideo[];
  trendingLoading: boolean;
  latestLoading: boolean;
  freshLoading: boolean;
  onAddSong: (youtubeId: string, title: string, thumbnail: string, durationSeconds: number) => Promise<void>;
  queuedVideoIds: Set<string>;
  /** Rendered inside the Add a song dialog: no card chrome of its own. */
  embedded?: boolean;
}

const SECTIONS = [
  { key: 'trending', label: 'Trending music near you' },
  { key: 'latest', label: 'New releases' },
  { key: 'fresh', label: 'Fresh picks' },
] as const;

export default function Discover({
  trendingVideos,
  latestVideos,
  freshVideos,
  trendingLoading,
  latestLoading,
  freshLoading,
  onAddSong,
  queuedVideoIds,
  embedded = false,
}: DiscoverProps) {
  const lists = { trending: trendingVideos, latest: latestVideos, fresh: freshVideos };
  const loading = { trending: trendingLoading, latest: latestLoading, fresh: freshLoading };
  const anyLoading = trendingLoading || latestLoading || freshLoading;
  const empty = !anyLoading && trendingVideos.length === 0 && latestVideos.length === 0 && freshVideos.length === 0;

  const body = (
    <div className="col" style={{ gap: 2 }}>
      {SECTIONS.map(({ key, label }) => lists[key].length > 0 && (
        <section key={key} className="col" style={{ gap: 2 }}>
          <h3 className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '.08em', textTransform: 'uppercase', margin: 0, padding: '12px 4px 6px' }}>
            {label}{loading[key] && <span style={{ opacity: .6 }}> …</span>}
          </h3>
          {lists[key].map((v) => (
            <TrackRow
              key={v.id}
              title={v.title}
              sub={v.channelTitle}
              duration={videoDuration(v)}
              thumbnail={v.thumbnail}
              queued={queuedVideoIds.has(v.id)}
              onAdd={() => onAddSong(v.id, v.title, v.thumbnail, v.durationSeconds)}
            />
          ))}
        </section>
      ))}

      {anyLoading && trendingVideos.length === 0 && (
        <div className="mono" style={{ fontSize: 12, color: 'var(--ink-dim)', textAlign: 'center', padding: '24px 12px' }}>
          Loading suggestions…
        </div>
      )}
      {empty && (
        <div className="mono" style={{ fontSize: 12, color: 'var(--ink-dim)', textAlign: 'center', padding: '24px 12px', lineHeight: 1.7 }}>
          No suggestions right now. Search above instead.
        </div>
      )}
    </div>
  );

  if (embedded) return body;

  return (
    <div className="pop col overflow-hidden" style={{ flex: 1, minHeight: 0, borderRadius: 14 }}>
      <div className="flex items-center gap-2" style={{ padding: '13px 15px', borderBottom: '3px solid var(--outline)' }}>
        <Icon name="compass" size={19} />
        <h2 className="display" style={{ fontSize: 18, margin: 0 }}>Discover</h2>
      </div>
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 8 }}>{body}</div>
    </div>
  );
}

function TrackRow({ title, sub, duration, thumbnail, queued, onAdd }: {
  title: string; sub: string; duration: string;
  thumbnail: string; queued: boolean; onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-3" style={{ padding: '8px 6px', borderBottom: '2px solid var(--line)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 9, overflow: 'hidden', border: '2.5px solid var(--outline)', flexShrink: 0 }}>
        {thumbnail
          ? <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div className="ph" style={{ width: '100%', height: '100%' }} />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {sub}{duration && ` · ${duration}`}
        </div>
      </div>
      <AddButton queued={queued} onAdd={onAdd} title={title} />
    </div>
  );
}

/** Shared "add to queue" control: quiet until hovered, clearly confirmed once added. */
export function AddButton({ queued, adding = false, onAdd, title }: {
  queued: boolean; adding?: boolean; onAdd: () => void; title: string;
}) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon add-btn"
      data-queued={queued || undefined}
      onClick={onAdd}
      disabled={queued || adding}
      aria-label={queued ? `${title}: already in queue` : `Add ${title} to queue`}
      style={{ flexShrink: 0, width: 44, height: 44, padding: 0 }}
    >
      {adding ? <span aria-hidden="true">…</span> : queued ? <Icon name="check" size={18} sw={3} /> : <Icon name="plus" size={18} />}
    </button>
  );
}
