/**
 * Gemini API Key Rotation
 *
 * Rotates across multiple comma-separated Gemini keys to spread free-tier
 * rate/quota limits. Unlike the YouTube rotation it is graceful: when no key
 * is configured, getKey() returns null and callers fall back to the heuristic.
 *
 * Set GEMINI_API_KEYS (comma-separated) or a single GEMINI_API_KEY.
 *
 * Extends the shared KeyRotation base (lib/keyRotation.ts).
 * Differences from YouTube rotation:
 *   - 1-minute quota reset interval (free-tier per-minute rate limits)
 *   - Silent on missing/empty config (Gemini key is optional)
 *   - getKey() returns null when no keys are configured
 *   - recordError() only treats 429 as a quota error (not 403)
 */

import { KeyRotation } from './keyRotation';

class GeminiKeyRotation extends KeyRotation {
    constructor(keysEnv?: string) {
        const envKeys = keysEnv || process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
        const keys = envKeys
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k.length > 0);

        // Free-tier limits are mostly per-minute; a short cooldown lets keys recover.
        super(keys, 60 * 1000);
    }

    /** Next available key, rotating; null when none configured. */
    getKey(): string | null {
        if (this.keys.length === 0) return null;

        const key = this.findAvailableKey();
        if (key !== null) return key;

        // All cooling down — return the least-used so a retry is at least possible.
        return this.getLeastUsedKey();
    }

    /** Records an error; returns true if it was a rate/quota error (429). */
    recordError(key: string, statusCode: number): boolean {
        const stats = this.stats.get(key);
        if (!stats) return false;
        stats.errorCount++;
        if (statusCode === 429) {
            stats.quotaExhausted = true;
            stats.quotaResetAt = Date.now() + this.quotaResetInterval;
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

    configuredKeyCount(): number {
        return this.keys.length;
    }
}

export const GeminiKeyRotationForTest = GeminiKeyRotation;

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

export function geminiConfiguredKeyCount(): number {
    return getRotation().configuredKeyCount();
}
