/**
 * YouTube API Key Rotation System
 *
 * Manages multiple YouTube API keys and rotates between them to:
 * - Distribute quota usage across keys
 * - Gracefully handle quota exhaustion
 * - Track key usage and performance
 *
 * Extends the shared KeyRotation base (lib/keyRotation.ts).
 * Differences from Gemini rotation:
 *   - 24-hour quota reset interval (hard daily cap per GCP project)
 *   - Throws on missing/empty config (YouTube key is required)
 *   - recordError() treats both 403 and 429 as quota errors
 */

import { KeyRotation } from './keyRotation';

class YouTubeKeyRotation extends KeyRotation {
    constructor(keysEnv?: string) {
        // Parse keys from env variable (comma-separated)
        const envKeys = keysEnv || process.env.YOUTUBE_API_KEYS || process.env.YOUTUBE_API_KEY;

        if (!envKeys) {
            throw new Error('No YouTube API keys configured. Set YOUTUBE_API_KEYS or YOUTUBE_API_KEY');
        }

        const keys = envKeys
            .split(',')
            .map(key => key.trim())
            .filter(key => key.length > 0);

        if (keys.length === 0) {
            throw new Error('No valid YouTube API keys found');
        }

        super(keys, 24 * 60 * 60 * 1000); // 24-hour reset — hard daily quota cap
    }

    /**
     * Get the next available API key, rotating through available keys.
     * Falls back to least-used key if all are exhausted (never returns null).
     */
    getKey(): string {
        const key = this.findAvailableKey();
        if (key !== null) return key;

        // All keys exhausted; return the least-used one so callers still work
        console.warn('All YouTube API keys have exhausted quota. Returning least-used key.');
        return this.getLeastUsedKey();
    }

    /**
     * Record an API error.
     * Returns true if this was a quota exhaustion error (429 or 403 with quota message).
     *
     * Any 403 or 429 from YouTube means "stop using this key for now":
     * the search_list quota is a hard 100/day-per-project cap that returns
     * 429 rateLimitExceeded, and 403 covers quotaExceeded. Sideline the key
     * so rotation moves to the next one (only helps across separate GCP
     * projects, since the cap is per project, not per key).
     */
    recordError(key: string, statusCode: number, errorMessage?: string): boolean {
        const stats = this.stats.get(key);
        if (!stats) return false;

        stats.errorCount++;

        const isQuotaError = statusCode === 403 || statusCode === 429;

        if (isQuotaError) {
            stats.quotaExhausted = true;
            stats.quotaResetAt = Date.now() + this.quotaResetInterval;
            console.warn(`YouTube API key quota exhausted: ${key.slice(0, 8)}... Will retry after ${new Date(stats.quotaResetAt).toISOString()}`);
            return true;
        }

        return false;
    }

    /**
     * Get statistics for all keys (keys are truncated for safe logging).
     */
    getStats() {
        return Array.from(this.stats.values()).map(stat => ({
            ...stat,
            key: stat.key.slice(0, 8) + '...',
            quotaResetAtReadable: stat.quotaResetAt ? new Date(stat.quotaResetAt).toISOString() : undefined,
        }));
    }

    /**
     * Get the number of available (non-exhausted) keys.
     */
    getAvailableKeyCount(): number {
        return Array.from(this.stats.values()).filter(s => !s.quotaExhausted).length;
    }

    /**
     * Reset all stats (useful for testing or manual reset).
     */
    resetStats(): void {
        this.keys.forEach(key => {
            const stats = this.stats.get(key)!;
            stats.usageCount = 0;
            stats.errorCount = 0;
            stats.quotaExhausted = false;
            stats.quotaResetAt = undefined;
        });
        this.currentIndex = 0;
    }
}

// Singleton instance
let instance: YouTubeKeyRotation | null = null;

export function getKeyRotation(): YouTubeKeyRotation {
    if (!instance) {
        instance = new YouTubeKeyRotation();
    }
    return instance;
}

export function getYouTubeApiKey(): string {
    return getKeyRotation().getKey();
}

export function recordApiSuccess(key: string): void {
    getKeyRotation().recordSuccess(key);
}

export function recordApiError(key: string, statusCode: number, errorMessage?: string): boolean {
    return getKeyRotation().recordError(key, statusCode, errorMessage);
}

export function getKeyRotationStats() {
    return getKeyRotation().getStats();
}
