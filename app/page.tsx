import CreateRoom from '@/components/CreateRoom';
import ThemeToggle from '@/components/ThemeToggle';
import './home.css';

export default function HomePage() {
  return (
    <main className="home-page">
      {/* Background */}
      <div className="home-bg" />
      <div className="home-bg-orb orb-1" />
      <div className="home-bg-orb orb-2" />
      <div className="home-bg-orb orb-3" />

      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="home-content">
        {/* Hero */}
        <div className="home-hero">
          <div className="home-badge">
            <div className="eq-bars">
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
            </div>
            <span>Collaborative Music Player</span>
          </div>

          <h1 className="home-title">
            Drop<span>A</span>Track
          </h1>

          <p className="home-subtitle">
            Create a room, share the link, and listen to music together in real-time.
          </p>
        </div>

        {/* Create Room Card */}
        <div className="home-card">
          <div className="home-card-header">
            <h2 className="home-card-title">Create a Room</h2>
            <p className="home-card-desc">Pick a name and start sharing music instantly</p>
          </div>
          <CreateRoom />
        </div>

        {/* Footer */}
        <footer className="home-footer">
          <p>
            Built with Next.js, Supabase &amp; YouTube · Inspired by{' '}
            <a href="https://jukebox.today" target="_blank" rel="noopener noreferrer">
              jukebox.today
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
