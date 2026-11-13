import Logo from '@/components/room/ui/Logo';
import StarField from '@/components/room/ui/StarField';
import CreateRoom from '@/components/home/CreateRoom';
import PublicRooms from '@/components/home/PublicRooms';
import ThemeToggleButton from '@/components/theme/ThemeToggleButton';
import InstallButton from '@/components/home/InstallButton';
import VinylRecord from '@/components/room/ui/VinylRecord';

export default function HomePage() {
  return (
    <main style={{ position: 'relative', minHeight: '100vh', zIndex: 1 }}>
      <div className="cosmos-bg" />
      <StarField n={30} seed={7} />

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 26px 80px', position: 'relative' }}>

        {/* top bar */}
        <header className="flex justify-between items-center flex-wrap gap-3 mb-8">
          <Logo size={36} />
          <div className="flex items-center gap-2">
            <InstallButton />
            <ThemeToggleButton />
          </div>
        </header>

        {/* hero: the pitch and the form on the left, the record that is the product on the right */}
        <section className="home-hero" style={{ marginBottom: 56 }}>
          <div className="col" style={{ minWidth: 0 }}>
            <h1
              className="display"
              style={{
                fontSize: 'clamp(38px, 5.2vw, 68px)',
                margin: 0,
                textWrap: 'balance',
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
              maxWidth: 560, margin: '16px 0 28px', fontWeight: 500, lineHeight: 1.5,
            }}>
              Spin up a room, paste a YouTube link, and drift through space with your crew —
              synced playback, live reactions, and a chat that actually has taste.
            </p>
            <CreateRoom />
          </div>

          <div className="home-hero-art" aria-hidden="true">
            <div className="home-hero-disc">
              <VinylRecord
                isPlaying
                size="100%"
                label={
                  <span className="display" style={{ fontSize: 'clamp(14px, 1.8vw, 24px)', lineHeight: 1.05 }}>
                    Drop<br />a track<br /><span style={{ fontSize: '.5em', letterSpacing: '.2em' }}>· side A ·</span>
                  </span>
                }
              />
            </div>
            <span className="chip home-hero-sticker" style={{ top: '8%', left: '-2%', transform: 'rotate(-4deg)' }}>
              <span className="live-dot" /> Everyone hears the same moment
            </span>
            <span className="chip home-hero-sticker" style={{ bottom: '10%', right: '0%', transform: 'rotate(3deg)', background: 'var(--accent-2)', color: 'var(--on-pop)' }}>
              No account. Just a link.
            </span>
          </div>
        </section>

        {/* public rooms */}
        <PublicRooms />

        {/* footer */}
        <footer
          className="mono flex justify-center items-center gap-2"
          style={{ marginTop: 54, color: 'var(--ink-dim)', fontSize: 12, letterSpacing: '.06em' }}
        >
          📍 broadcasting from sector 7-G · DropATrack ©2026
        </footer>
      </div>
    </main>
  );
}
