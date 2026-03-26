import CreateRoom from '@/components/CreateRoom';
import PublicRooms from '@/components/PublicRooms';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Hero Section */}
      <div className="text-center mb-12 animate-slide-up">
        <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full glass-subtle">
          <div className="flex gap-0.5 items-end h-4">
            <div className="eq-bar" />
            <div className="eq-bar" />
            <div className="eq-bar" />
            <div className="eq-bar" />
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Collaborative Music Player
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Drop<span style={{ color: 'var(--green-primary)' }}>A</span>Track
        </h1>

        <p className="text-lg md:text-xl max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Create a room, share the link, and listen to music together in real-time.
        </p>
      </div>

      {/* Create Room Card */}
      <div
        className="glass p-8 w-full max-w-lg mb-12 animate-slide-up"
        style={{ animationDelay: '0.1s' }}
      >
        <h2 className="text-lg font-bold mb-1">Create a Room</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Pick a name and start sharing music instantly
        </p>
        <CreateRoom />
      </div>

      {/* Public Rooms */}
      <div
        className="w-full max-w-lg animate-slide-up"
        style={{ animationDelay: '0.2s' }}
      >
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span>🌎</span> Public Rooms
        </h2>
        <PublicRooms />
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Built with Next.js, Supabase & YouTube · Inspired by{' '}
          <a
            href="https://jukebox.today"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
            style={{ color: 'var(--green-primary)' }}
          >
            jukebox.today
          </a>
        </p>
      </footer>
    </main>
  );
}
