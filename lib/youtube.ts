// YouTube helpers — parsing video IDs from URLs

/**
 * Extract YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://music.youtube.com/watch?v=VIDEO_ID
 * - Just the video ID itself
 */
export function extractYouTubeId(input: string): string | null {
  input = input.trim();

  // Already a plain video ID (11 characters, alphanumeric + - _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);
    
    // youtu.be/VIDEO_ID
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1) || null;
    }

    // youtube.com/watch?v=VIDEO_ID
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v) return v;

      // youtube.com/embed/VIDEO_ID
      const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];

      // youtube.com/v/VIDEO_ID
      const vMatch = url.pathname.match(/\/v\/([a-zA-Z0-9_-]{11})/);
      if (vMatch) return vMatch[1];
    }
  } catch {
    // Not a valid URL
  }

  return null;
}

/**
 * Format duration in seconds to mm:ss or h:mm:ss
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Parse ISO 8601 duration (PT1H2M3S) to seconds
 */
export function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}
