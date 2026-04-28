import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room') || 'room';
  const track = searchParams.get('track') || '';

  // Derive a display name from the slug: "my-cool-room" → "My Cool Room"
  const roomName = room
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          background: 'linear-gradient(135deg, #0d0a1e 0%, #0a0d1a 60%, #0a1a0d 100%)',
          padding: '60px 72px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow blobs */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            left: '-120px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            right: '-80px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,197,94,0.2) 0%, transparent 70%)',
          }}
        />

        {/* Grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Live badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            background: 'rgba(34,197,94,0.15)',
            border: '1px solid rgba(34,197,94,0.4)',
            borderRadius: '20px',
            padding: '6px 16px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#22c55e',
            }}
          />
          <span
            style={{
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: '#22c55e',
            }}
          >
            LIVE
          </span>
        </div>

        {/* Room name */}
        <div
          style={{
            fontSize: roomName.length > 20 ? '56px' : '72px',
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.1,
            marginBottom: track ? '16px' : '32px',
            letterSpacing: '-1px',
            maxWidth: '900px',
            textShadow: '0 4px 40px rgba(124,58,237,0.5)',
          }}
        >
          {roomName}
        </div>

        {/* Current track (if provided) */}
        {track && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '32px',
              maxWidth: '850px',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="2"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span
              style={{
                fontSize: '22px',
                color: 'rgba(255,255,255,0.55)',
                fontWeight: 500,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
            >
              {track}
            </span>
          </div>
        )}

        {/* Description */}
        <div
          style={{
            fontSize: '20px',
            color: 'rgba(255,255,255,0.45)',
            marginBottom: '48px',
            fontWeight: 400,
          }}
        >
          Listen together in real-time · dropatrack.vercel.app
        </div>

        {/* Bottom bar: branding */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '72px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span
            style={{
              fontSize: '28px',
              fontWeight: 900,
              letterSpacing: '-0.5px',
              background: 'linear-gradient(135deg, #7c3aed, #22c55e)',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            DropATrack
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
