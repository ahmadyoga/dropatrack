import Logo from '@/components/room/ui/Logo';
import StarField from '@/components/room/ui/StarField';
import CreateRoom from '@/components/home/CreateRoom';
import PublicRooms from '@/components/home/PublicRooms';
import ThemeToggleButton from '@/components/theme/ThemeToggleButton';

export default function HomePage() {
  return (
    <main style={{ position: 'relative', minHeight: '100vh', zIndex: 1 }}>
      <div className="cosmos-bg" />
      <StarField n={30} seed={7} />

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 26px 80px', position: 'relative' }}>

        {/* top bar */}
        <div className="flex justify-between items-center flex-wrap gap-3 mb-12">
          <Logo size={36} />
          <ThemeToggleButton />
        </div>

        {/* hero */}
        <div style={{ position: 'relative', marginBottom: 40 }}>
          <div
            className="chip"
            style={{
              background: 'var(--accent-3)',
              color: '#140f1f',
              marginBottom: 18,
              transform: 'rotate(-2deg)',
              display: 'inline-flex',
            }}
          >
            ⚡ tune in together · across the galaxy
          </div>
          <h1
            className="display"
            style={{
              fontSize: 'clamp(44px, 7.5vw, 96px)',
              margin: 0,
              maxWidth: 880,
            } as React.CSSProperties}
          >
            One queue.<br />
            Everybody{' '}
            <span style={{ color: 'var(--accent)', WebkitTextStroke: '2px var(--outline)' }}>
              floating
            </span>{' '}
            to the same beat.
          </h1>
          <p style={{
            fontSize: 18, color: 'var(--ink-soft)',
            maxWidth: 560, marginTop: 18, fontWeight: 600, lineHeight: 1.5,
          }}>
            Spin up a room, paste a YouTube link, and drift through space with your crew —
            synced playback, live reactions, and a chat that actually has taste.
          </p>
        </div>

        {/* create room */}
        <div style={{ marginBottom: 46 }}>
          <CreateRoom />
        </div>

        {/* public rooms */}
        <PublicRooms />

        {/* footer */}
        <div
          className="mono flex justify-center items-center gap-2"
          style={{ marginTop: 54, color: 'var(--ink-dim)', fontSize: 12, letterSpacing: '.06em' }}
        >
          📍 broadcasting from sector 7-G · DropATrack ©2026
        </div>
      </div>
    </main>
  );
}
