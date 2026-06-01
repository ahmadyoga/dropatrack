import { supabase } from '@/lib/supabase';
import RoomClient from '@/components/RoomClient';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ogImageVersion, ogImagePath } from '@/lib/share';

// ── Dynamic OG metadata per room ──────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const { data: room } = await supabase
    .from('rooms')
    .select('name, slug, snapshot_at')
    .eq('slug', slug)
    .single();

  const roomName = room?.name ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  // template in layout.tsx appends " · DropATrack" — so just use the room name here
  const title = roomName;
  const ogTitle = `${roomName} — listening now on DropATrack`;
  const description = `Drop tracks and listen together in real-time inside "${roomName}".`;

  // Versioned so each share-time snapshot is a fresh CDN cache key
  const ogImageUrl = ogImagePath(slug, ogImageVersion(room?.snapshot_at));

  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description,
      type: 'website',
      url: `/${slug}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${roomName} — DropATrack Room`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Prevent asset/metadata paths (e.g. /favicon.ico) from being treated as room slugs.
  const isValidRoomSlug = /^[a-z0-9-]+$/i.test(slug);
  if (!isValidRoomSlug) {
    notFound();
  }

  // Fetch room data server-side
  let { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('slug', slug)
    .single();

  // If room doesn't exist (e.g. deleted by inactivity cron), auto-create it
  // so bookmarked/shared URLs never 404.
  if (!room) {
    // Derive a display name from the slug: "my-cool-room" → "My Cool Room"
    const name = slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    // Note: user identity (localStorage) is not available on the server.
    // Admin role assignment happens client-side via the ?r=admin URL param
    // or when the first user joins.
    const { data: created } = await supabase
      .from('rooms')
      .insert({
        slug,
        name,
        created_by: 'system',
        is_playing: false,
        current_song_index: 0,
        is_public: true,
        default_role: 'dj',
        user_roles: {},
      })
      .select()
      .single();

    // Handle race condition: another request may have created it between
    // our SELECT and INSERT. If INSERT fails due to unique constraint, re-fetch.
    if (!created) {
      const { data: reFetched } = await supabase
        .from('rooms')
        .select('*')
        .eq('slug', slug)
        .single();
      room = reFetched;
    } else {
      room = created;
    }
  }

  // Final safety net — should never happen but prevents runtime crash
  if (!room) {
    notFound();
  }

  // Fetch queue
  const { data: queue } = await supabase
    .from('queue_items')
    .select('*')
    .eq('room_id', room.id)
    .order('position', { ascending: true });

  return <RoomClient initialRoom={room} initialQueue={queue || []} />;
}
