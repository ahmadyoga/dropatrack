'use client';

import Icon from './ui/Icon';
import type { TrendingVideo } from '@/lib/types';

function fmt(s: number): string {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
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
}

export default function Discover({
  trendingVideos,
  latestVideos,
  freshVideos,
  trendingLoading,
  latestLoading,
  freshLoading,
  onAddSong,
  queuedVideoIds,
}: DiscoverProps) {
  const empty = !trendingLoading && !latestLoading && !freshLoading &&
    trendingVideos.length === 0 && latestVideos.length === 0 && freshVideos.length === 0;

  return (
    <div className="pop wobble col overflow-hidden" style={{ flex: 1, minHeight: 0, boxShadow: '7px 7px 0 var(--shadow)' }}>
      {/* header */}
      <div className="flex items-center justify-between" style={{ padding: '13px 15px', borderBottom: '3px solid var(--outline)' }}>
        <div className="flex items-center gap-2">
          <Icon name="bolt" size={19} />
          <div className="display" style={{ fontSize: 18 }}>Discover</div>
        </div>
        <span className="chip" style={{ background: 'var(--accent-2)', color: '#140f1f' }}>fresh drops</span>
      </div>

      {/* sections */}
      <div className="scroll col" style={{ flex: 1, overflowY: 'auto', padding: 8, gap: 4 }}>

        {trendingVideos.length > 0 && (
          <>
            <SectionLabel label="🔥 Trending" loading={trendingLoading} />
            {trendingVideos.map((v) => (
              <TrackRow
                key={v.id}
                id={v.id}
                title={v.title}
                sub={v.channelTitle}
                duration={v.duration || fmt(v.durationSeconds)}
                thumbnail={v.thumbnail}
                queued={queuedVideoIds.has(v.id)}
                onAdd={() => onAddSong(v.id, v.title, v.thumbnail, v.durationSeconds)}
              />
            ))}
          </>
        )}

        {latestVideos.length > 0 && (
          <>
            <SectionLabel label="🆕 Latest" loading={latestLoading} />
            {latestVideos.map((v) => (
              <TrackRow
                key={v.id}
                id={v.id}
                title={v.title}
                sub={v.channelTitle}
                duration={v.duration || fmt(v.durationSeconds)}
                thumbnail={v.thumbnail}
                queued={queuedVideoIds.has(v.id)}
                onAdd={() => onAddSong(v.id, v.title, v.thumbnail, v.durationSeconds)}
              />
            ))}
          </>
        )}

        {freshVideos.length > 0 && (
          <>
            <SectionLabel label="✨ Fresh" loading={freshLoading} />
            {freshVideos.map((v) => (
              <TrackRow
                key={v.id}
                id={v.id}
                title={v.title}
                sub={v.channelTitle}
                duration={v.duration || fmt(v.durationSeconds)}
                thumbnail={v.thumbnail}
                queued={queuedVideoIds.has(v.id)}
                onAdd={() => onAddSong(v.id, v.title, v.thumbnail, v.durationSeconds)}
              />
            ))}
          </>
        )}

        {(trendingLoading || latestLoading || freshLoading) && trendingVideos.length === 0 && (
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', textAlign: 'center', margin: 'auto', padding: '20px 12px' }}>
            loading fresh drops…
          </div>
        )}

        {empty && (
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', textAlign: 'center', margin: 'auto', padding: '20px 12px', lineHeight: 1.7 }}>
            nothing to discover right now —<br />check back soon ✨
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ label, loading }: { label: string; loading: boolean }) {
  return (
    <div className="mono flex items-center gap-2" style={{ fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '.1em', padding: '8px 4px 4px' }}>
      {label}
      {loading && <span style={{ opacity: .6 }}>…</span>}
    </div>
  );
}

function TrackRow({ id, title, sub, duration, thumbnail, queued, onAdd }: {
  id: string; title: string; sub: string; duration: string;
  thumbnail: string; queued: boolean; onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-2" style={{ padding: '7px 8px', borderRadius: 12, border: '2.5px solid var(--line)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 9, overflow: 'hidden', border: '2.5px solid var(--outline)', flexShrink: 0 }}>
        {thumbnail
          ? <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div className="ph" style={{ width: '100%', height: '100%' }} />
        }
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {sub} · {duration}
        </div>
      </div>
      <button
        className={`btn pop-sm btn-icon ${queued ? '' : 'btn-accent'}`}
        onClick={onAdd}
        disabled={queued}
        style={{ flexShrink: 0, padding: 8, opacity: queued ? .6 : 1 }}
        title={queued ? 'Already in queue' : 'Add to queue'}
      >
        {queued ? <Icon name="check" size={16} /> : <Icon name="plus" size={16} />}
      </button>
    </div>
  );
}
