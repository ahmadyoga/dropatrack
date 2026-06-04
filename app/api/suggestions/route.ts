import { NextRequest } from 'next/server';

// Server-side only — GEMINI_API_KEY is never exposed to the browser.
// Given recent queue titles, ask Gemini for similar songs as {artist, title}.

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function POST(request: NextRequest) {
  let titles: string[] = [];
  let count = 5;
  try {
    const body = await request.json();
    titles = Array.isArray(body.titles) ? body.titles.filter((t: unknown) => typeof t === 'string') : [];
    if (typeof body.count === 'number') count = Math.min(Math.max(body.count, 1), 10);
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (titles.length === 0) {
    return Response.json({ error: 'No titles provided' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Signal to the client to use its heuristic fallback.
    return Response.json({ songs: [], fallback: true });
  }

  const prompt =
    `You are a music recommendation engine. Based on these recently played songs, ` +
    `suggest ${count} more songs with a similar vibe, genre, era, and language/region. ` +
    `Only suggest real, findable songs by real artists. Do not repeat any of the input songs, ` +
    `and do not suggest DJ remixes, mixes, or compilations.\n\nRecently played:\n` +
    titles.map((t) => `- ${t}`).join('\n');

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  artist: { type: 'STRING' },
                  title: { type: 'STRING' },
                },
                required: ['artist', 'title'],
              },
            },
          },
        }),
      }
    );

    if (!res.ok) {
      console.error('Gemini error:', res.status, await res.text());
      return Response.json({ songs: [], fallback: true });
    }

    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return Response.json({ songs: [], fallback: true });

    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { return Response.json({ songs: [], fallback: true }); }

    const songs = Array.isArray(parsed)
      ? parsed
          .filter((s): s is { artist: string; title: string } =>
            !!s && typeof s.artist === 'string' && typeof s.title === 'string')
          .map((s) => ({ artist: s.artist.trim(), title: s.title.trim() }))
          .filter((s) => s.artist && s.title)
          .slice(0, count)
      : [];

    return Response.json({ songs });
  } catch (err) {
    console.error('Suggestions route error:', err);
    return Response.json({ songs: [], fallback: true });
  }
}
