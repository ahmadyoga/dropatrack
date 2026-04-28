import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

interface ShortenBody {
  slug: string;
  track?: string;
  listeners?: string; // comma-separated initials, max 3
  extra?: string;     // "+N" overflow count as string
}

/**
 * POST /api/og/shorten
 * Upserts OG snapshot params keyed by room slug.
 * Returns { token, url } where url = `/api/og?t={slug}`
 */
export async function POST(req: NextRequest) {
  let body: ShortenBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { slug, track = '', listeners = '', extra = '' } = body;

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: '`slug` is required' }, { status: 400 });
  }

  const { error } = await supabase.from('og_tokens').upsert(
    { slug, track, listeners, extra, updated_at: new Date().toISOString() },
    { onConflict: 'slug' },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const token = encodeURIComponent(slug);
  return NextResponse.json({ token: slug, url: `/api/og?t=${token}` });
}
