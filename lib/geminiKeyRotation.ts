/**
 * Gemini API Key Rotation
 *
 * Rotates across multiple comma-separated Gemini keys to spread free-tier
 * rate/quota limits. Unlike the YouTube rotation it is graceful: when no key
 * is configured, getKey() returns null and callers fall back to the heuristic.
 *
 * Set GEMINI_API_KEYS (comma-separated) or a single GEMINI_API_KEY.
 */

interface KeyStats {
  key: string;
  usageCount: number;
  errorCount: number;
  lastUsed: number;
  quotaExhausted: boolean;
  quotaResetAt?: number;
}

class GeminiKeyRotation {
  private keys: string[];
  private stats: Map<string, KeyStats> = new Map();
  private currentIndex = 0;
  // Free-tier limits are mostly per-minute; a short cooldown lets keys recover.
  private readonly QUOTA_RESET_INTERVAL = 60 * 1000;

  constructor(keysEnv?: string) {
    const envKeys = keysEnv || process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
    this.keys = envKeys
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    this.keys.forEach((key) => {
      this.stats.set(key, { key, usageCount: 0, errorCount: 0, lastUsed: 0, quotaExhausted: false });
    });
  }

  /** Next available key, rotating; null when none configured. */
  getKey(): string | null {
    if (this.keys.length === 0) return null;
    const now = Date.now();
    let attempts = 0;

    while (attempts < this.keys.length) {
      const key = this.keys[this.currentIndex];
      const stats = this.stats.get(key)!;

      if (stats.quotaExhausted && stats.quotaResetAt && now > stats.quotaResetAt) {
        stats.quotaExhausted = false;
        stats.errorCount = 0;
      }

      if (!stats.quotaExhausted) {
        stats.usageCount++;
        stats.lastUsed = now;
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        return key;
      }

      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      attempts++;
    }

    // All cooling down — return the least-used so a retry is at least possible.
    return this.getLeastUsedKey();
  }

  recordSuccess(key: string): void {
    const stats = this.stats.get(key);
    if (stats) stats.errorCount = Math.max(0, stats.errorCount - 1);
  }

  /** Records an error; returns true if it was a rate/quota error (429). */
  recordError(key: string, statusCode: number): boolean {
    const stats = this.stats.get(key);
    if (!stats) return false;
    stats.errorCount++;
    if (statusCode === 429) {
      stats.quotaExhausted = true;
      stats.quotaResetAt = Date.now() + this.QUOTA_RESET_INTERVAL;
      return true;
    }
    return false;
  }

  /** Number of keys not currently cooling down. */
  availableKeyCount(): number {
    if (this.keys.length === 0) return 0;
    const now = Date.now();
    return this.keys.filter((k) => {
      const s = this.stats.get(k)!;
      return !(s.quotaExhausted && (!s.quotaResetAt || now <= s.quotaResetAt));
    }).length;
  }

  private getLeastUsedKey(): string {
    let leastUsed = this.keys[0];
    let minUsage = this.stats.get(leastUsed)!.usageCount;
    for (const key of this.keys) {
      const usage = this.stats.get(key)!.usageCount;
      if (usage < minUsage) { minUsage = usage; leastUsed = key; }
    }
    return leastUsed;
  }
}

let instance: GeminiKeyRotation | null = null;

function getRotation(): GeminiKeyRotation {
  if (!instance) instance = new GeminiKeyRotation();
  return instance;
}

export function getGeminiApiKey(): string | null {
  return getRotation().getKey();
}

export function recordGeminiSuccess(key: string): void {
  getRotation().recordSuccess(key);
}

export function recordGeminiError(key: string, statusCode: number): boolean {
  return getRotation().recordError(key, statusCode);
}

export function geminiAvailableKeyCount(): number {
  return getRotation().availableKeyCount();
}
