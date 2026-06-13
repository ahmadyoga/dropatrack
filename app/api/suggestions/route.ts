import { NextRequest } from 'next/server';
import { getGeminiApiKey, recordGeminiSuccess, recordGeminiError, geminiConfiguredKeyCount } from '@/lib/geminiKeyRotation';

// Server-side only — GEMINI keys are never exposed to the browser.
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

  const prompt =
    `You are a music recommendation engine. The list below is every song already ` +
    `played or queued in this room — treat it as the room's taste profile. ` +
    `Suggest ${count} more songs with a similar vibe, genre, era, and language/region. ` +
    `Favor songs by different but related artists over more songs by the same artist. ` +
    `Only suggest real, findable songs by real artists. ` +
    `Do NOT suggest any song in the list, nor obvious duplicates/alternate versions of them. ` +
    `Do not suggest DJ remixes, mixes, or compilations.\n\nAlready in the room:\n` +
    titles.map((t) => `- ${t}`).join('\n');

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.9,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: { artist: { type: 'STRING' }, title: { type: 'STRING' } },
          required: ['artist', 'title'],
        },
      },
    },
  });

  // Try every configured Gemini key before returning an empty recommendation set.
  const maxAttempts = Math.max(geminiConfiguredKeyCount(), 1);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) break;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.error('Gemini error:', res.status, errText.slice(0, 200));
        recordGeminiError(apiKey, res.status);
        continue;
      }

      recordGeminiSuccess(apiKey);
      const data = await res.json();
      const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;

      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { continue; }

      const songs = Array.isArray(parsed)
        ? parsed
            .filter((s): s is { artist: string; title: string } =>
              !!s && typeof s.artist === 'string' && typeof s.title === 'string')
            .map((s) => ({ artist: s.artist.trim(), title: s.title.trim() }))
            .filter((s) => s.artist && s.title)
            .slice(0, count)
        : [];

      if (songs.length === 0) continue;
      return Response.json({ songs });
    } catch (err) {
      console.error('Suggestions route error:', err);
      continue;
    }
  }

  return Response.json({ songs: [] });
}
