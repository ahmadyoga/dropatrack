import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { supabase } from '@/lib/supabase';

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let room = searchParams.get('room') || 'room';
  let track = searchParams.get('track') || '';
  let listenersRaw = searchParams.get('listeners') || '';
  let extraCount = searchParams.get('extra') || '';

  const t = searchParams.get('t');
  if (t) {
    // 1. Fetch room
    const { data: roomRow } = await supabase
      .from('rooms')
      .select('id, name, current_song_index')
      .eq('slug', t)
      .single();

    if (roomRow) {
      room = roomRow.name || t;

      // 2. Current track from queue
      const { data: queueItems } = await supabase
        .from('queue_items')
        .select('title')
        .eq('room_id', roomRow.id)
        .order('position', { ascending: true });

      track = queueItems?.[roomRow.current_song_index ?? 0]?.title ?? '';

      // 3. Recent listeners — distinct usernames from chat (presence is ephemeral)
      const { data: chatRows } = await supabase
        .from('chat_messages')
        .select('username')
        .eq('room_id', roomRow.id)
        .order('created_at', { ascending: false })
        .limit(30);

      const uniqueNames = [...new Set((chatRows ?? []).map(c => c.username))];
      listenersRaw = uniqueNames.slice(0, 3).map(n => n.charAt(0).toUpperCase()).join(',');
      extraCount = uniqueNames.length > 3 ? String(uniqueNames.length - 3) : '';
    } else {
      room = t; // fallback to slug as display name
    }
  }

  const roomName = room.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const nowPlaying = track;
  const listeners = listenersRaw ? listenersRaw.split(',').slice(0, 3) : [];

  // Build avatar initials — up to 3 shown, rest as +N
  const avatarColors = ["#7c3aed", "#059669", "#d97706", "#2563eb", "#db2777"];
  const maxShown = 3;
  const overflowCount = Math.max(0, listeners.length - maxShown);
  const shownCount = Math.min(listeners.length, maxShown);
  const avatarLetters = ["A", "K", "M", "J", "R"];

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "1200px",
          height: "630px",
          display: "flex",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background:
            "radial-gradient(ellipse at 15% 15%, rgba(124,58,237,0.45) 0%, transparent 40%), radial-gradient(ellipse at 85% 85%, rgba(34,197,94,0.28) 0%, transparent 35%), radial-gradient(ellipse at 70% 25%, rgba(124,58,237,0.2) 0%, transparent 30%), linear-gradient(135deg, #0d0a1e 0%, #0a0d1a 55%, #0a1a0d 100%)",
          overflow: "hidden",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "3px",
            background: "linear-gradient(90deg, #7c3aed, #22c55e)",
            opacity: 0.7,
          }}
        />

        {/* Subtle grid overlay via repeating stripes */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        {/* Waveform decoration — right side */}
        <div
          style={{
            position: "absolute",
            right: "70px",
            top: "160px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            opacity: 0.18,
          }}
        >
          {[90, 140, 180, 120, 70, 110, 160, 200, 130, 80, 115].map(
            (h, i) => (
              <div
                key={i}
                style={{
                  width: "10px",
                  height: `${h}px`,
                  borderRadius: "5px",
                  background: `linear-gradient(180deg, #7c3aed, #22c55e)`,
                }}
              />
            )
          )}
        </div>

        {/* Main content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            padding: "0 72px",
            height: "100%",
            zIndex: 3,
          }}
        >
          {/* LIVE badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "80px",
              padding: "8px 22px 8px 16px",
              borderRadius: "20px",
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.45)",
              width: "100px",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#22c55e",
              }}
            />
            <span
              style={{
                fontSize: "16px",
                fontWeight: 700,
                letterSpacing: "3px",
                color: "#22c55e",
                width: "40px",
              }}
            >
              LIVE
            </span>
          </div>

          {/* Room name */}
          <div
            style={{
              marginTop: "8px",
              fontSize: "120px",
              fontWeight: 900,
              letterSpacing: "-2px",
              lineHeight: 1.05,
              background: "linear-gradient(90deg, #ffffff 0%, #e2d9ff 60%)",
              backgroundClip: "text",
              color: "transparent",
              // Satori needs -webkit- prefix
              WebkitBackgroundClip: "text",
            }}
          >
            {room}
          </div>

          {/* Now playing */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "10px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(124,58,237,0.2)",
                border: "1px solid rgba(124,58,237,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                color: "#a78bfa",
              }}
            >
              ♪
            </div>
            <span
              style={{
                fontSize: "28px",
                color: "rgba(255,255,255,0.5)",
                fontWeight: 400,
                maxWidth: "800px",
              }}
            >
              {nowPlaying}
            </span>
          </div>

          {/* Divider */}
          <div
            style={{
              width: "480px",
              height: "1px",
              background: "rgba(255,255,255,0.08)",
              marginTop: "18px",
            }}
          />

          {/* Listener avatars */}
          {listeners.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "16px",
              }}
            >
              {Array.from({ length: shownCount }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: avatarColors[i % avatarColors.length],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  {avatarLetters[i]}
                </div>
              ))}
              {overflowCount > 0 && (
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "15px",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  +{overflowCount}
                </div>
              )}
              <span
                style={{
                  marginLeft: "10px",
                  fontSize: "22px",
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                listening now
              </span>
            </div>
          )}

          {/* Tagline */}
          <div
            style={{
              marginTop: "auto",
              marginBottom: "40px",
              fontSize: "22px",
              color: "rgba(255,255,255,0.28)",
              fontWeight: 400,
            }}
          >
            Listen together in real-time · dropatrack.vercel.app
          </div>
        </div>

        {/* Brand name — bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: "36px",
            right: "72px",
            fontSize: "36px",
            fontWeight: 900,
            letterSpacing: "-0.5px",
            background: "linear-gradient(90deg, #7c3aed, #22c55e)",
            backgroundClip: "text",
            color: "transparent",
            WebkitBackgroundClip: "text",
            zIndex: 4,
          }}
        >
          DropATrack
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
