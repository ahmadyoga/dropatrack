// Builds a YouTube search query from the room's recent queue titles.
// Strategy: clean noise, detect a dominant artist via " - " separator,
// otherwise join the cleaned titles. Pure + deterministic for testing.

const NOISE_BRACKETS = /\[[^\]]*\]/g;   // [Official Video], [HD], ...
const NOISE_PARENS = /\([^)]*\)/g;      // (Official), (feat. ...), ...
const PIPE_SEG = /\|.*/;                // drop everything from the first pipe on
// Keep letters, numbers, whitespace, apostrophe, ampersand, hyphen. Drop emojis/symbols.
const SYMBOLS = /[^\p{L}\p{N}\s'&-]/gu;

function cleanTitle(t: string): string {
  return t
    .replace(NOISE_BRACKETS, ' ')
    .replace(NOISE_PARENS, ' ')
    .replace(PIPE_SEG, ' ')
    .replace(SYMBOLS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Canonical key for dedup/exclusion: noise-stripped, lowercased.
// Also strips trailing date-like pure-numeric segments that survive slash removal
// e.g. "Song - 6/19/2019" → cleanTitle → "Song - 6192019" → strip → "Song"
export function normalizeTitle(t: string): string {
  let s = cleanTitle(t).toLowerCase();
  s = s.replace(/(\s*-\s*\d{4,})+\s*$/, '').trim();
  return s;
}

export function buildSuggestionQuery(titles: string[]): string {
  const cleaned = titles.map(cleanTitle).filter(Boolean);
  if (cleaned.length === 0) return '';

  // Count artists (text before the first " - ").
  const counts = new Map<string, number>();
  for (const t of cleaned) {
    const idx = t.indexOf(' - ');
    if (idx > 0) {
      const artist = t.slice(0, idx).trim().toLowerCase();
      counts.set(artist, (counts.get(artist) ?? 0) + 1);
    }
  }

  let dominant: string | null = null;
  for (const [artist, c] of counts) {
    if (c >= 2 && (dominant === null || c > (counts.get(dominant) ?? 0))) {
      dominant = artist;
    }
  }

  if (dominant) {
    // Bare artist name (category=music biases to their tracks). Avoid words
    // like "mix"/"similar" that pull DJ mixes and compilations.
    const orig = cleaned.find((t) => t.toLowerCase().startsWith(dominant + ' - '));
    return orig ? orig.slice(0, orig.indexOf(' - ')).trim() : dominant;
  }

  // No dominant artist: use the single most-recent title (dashes flattened).
  // Joining several titles into a word-soup matched compilations/DJ remixes.
  return cleaned[cleaned.length - 1]
    .replace(/ - /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
