/**
 * YouTube API Key Rotation System
 * 
 * Manages multiple YouTube API keys and rotates between them to:
 * - Distribute quota usage across keys
 * - Gracefully handle quota exhaustion
 * - Track key usage and performance
 */

interface KeyStats {
    key: string;
    usageCount: number;
    errorCount: number;
    lastUsed: number;
    quotaExhausted: boolean;
    quotaResetAt?: number;
}

class YouTubeKeyRotation {
    private keys: string[];
    private stats: Map<string, KeyStats> = new Map();
    private currentIndex: number = 0;
    private readonly QUOTA_RESET_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

    constructor(keysEnv?: string) {
        // Parse keys from env variable (comma-separated)
        const envKeys = keysEnv || process.env.YOUTUBE_API_KEYS || process.env.YOUTUBE_API_KEY;

        if (!envKeys) {
            throw new Error('No YouTube API keys configured. Set YOUTUBE_API_KEYS or YOUTUBE_API_KEY');
        }

        this.keys = envKeys
            .split(',')
            .map(key => key.trim())
            .filter(key => key.length > 0);

        if (this.keys.length === 0) {
            throw new Error('No valid YouTube API keys found');
        }

        // Initialize stats for each key
        this.keys.forEach(key => {
            this.stats.set(key, {
                key,
                usageCount: 0,
                errorCount: 0,
                lastUsed: 0,
                quotaExhausted: false,
            });
        });
    }

    /**
     * Get the next available API key, rotating through available keys
     */
    getKey(): string {
        const now = Date.now();
        let attempts = 0;

        while (attempts < this.keys.length) {
            const key = this.keys[this.currentIndex];
            const stats = this.stats.get(key)!;

            // Check if quota has reset
            if (stats.quotaExhausted && stats.quotaResetAt && now > stats.quotaResetAt) {
                stats.quotaExhausted = false;
                stats.errorCount = 0;
            }

            // Skip keys with exhausted quota
            if (!stats.quotaExhausted) {
                stats.usageCount++;
                stats.lastUsed = now;
                this.currentIndex = (this.currentIndex + 1) % this.keys.length;
                return key;
            }

            this.currentIndex = (this.currentIndex + 1) % this.keys.length;
            attempts++;
        }

        // All keys exhausted, return the least-used one
        console.warn('All YouTube API keys have exhausted quota. Returning least-used key.');
        return this.getLeastUsedKey();
    }

    /**
     * Record a successful API call
     */
    recordSuccess(key: string): void {
        const stats = this.stats.get(key);
        if (stats) {
            // Success resets error count
            stats.errorCount = Math.max(0, stats.errorCount - 1);
        }
    }

    /**
     * Record an API error
     * Returns true if this was a quota exhaustion error (429 or 403 with quota message)
     */
    recordError(key: string, statusCode: number, errorMessage?: string): boolean {
        const stats = this.stats.get(key);
        if (!stats) return false;

        stats.errorCount++;

        // Detect quota exhaustion
        const isQuotaError =
            statusCode === 403 ||
            (statusCode === 429 && errorMessage?.includes('quota'));

        if (isQuotaError) {
            stats.quotaExhausted = true;
            stats.quotaResetAt = Date.now() + this.QUOTA_RESET_INTERVAL;
            console.warn(`YouTube API key quota exhausted: ${key.slice(0, 8)}... Will retry after ${new Date(stats.quotaResetAt).toISOString()}`);
            return true;
        }

        return false;
    }

    /**
     * Get statistics for all keys
     */
    getStats() {
        return Array.from(this.stats.values()).map(stat => ({
            ...stat,
            key: stat.key.slice(0, 8) + '...',
            quotaResetAtReadable: stat.quotaResetAt ? new Date(stat.quotaResetAt).toISOString() : undefined,
        }));
    }

    /**
     * Get the least-used available key
     */
    private getLeastUsedKey(): string {
        let leastUsed = this.keys[0];
        let minUsage = this.stats.get(leastUsed)!.usageCount;

        for (const key of this.keys) {
            const usage = this.stats.get(key)!.usageCount;
            if (usage < minUsage) {
                minUsage = usage;
                leastUsed = key;
            }
        }

        return leastUsed;
    }

    /**
     * Get the number of available (non-exhausted) keys
     */
    getAvailableKeyCount(): number {
        return Array.from(this.stats.values()).filter(s => !s.quotaExhausted).length;
    }

    /**
     * Reset all stats (useful for testing or manual reset)
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
