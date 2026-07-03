/**
 * Base API Key Rotation
 *
 * Shared logic for rotating across multiple API keys, tracking per-key quota
 * exhaustion, and falling back to the least-used key when all are cooling down.
 *
 * Subclasses supply:
 *   - key list + quota reset interval (via constructor)
 *   - getKey()       — return type and empty-list behaviour differ per provider
 *   - recordError()  — which status codes count as quota errors differs per provider
 */

export interface KeyStats {
    key: string;
    usageCount: number;
    errorCount: number;
    lastUsed: number;
    quotaExhausted: boolean;
    quotaResetAt?: number;
}

export abstract class KeyRotation {
    protected keys: string[];
    protected stats: Map<string, KeyStats> = new Map();
    protected currentIndex: number = 0;
    protected readonly quotaResetInterval: number;

    constructor(keys: string[], quotaResetInterval: number) {
        this.keys = keys;
        this.quotaResetInterval = quotaResetInterval;

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
     * Walk the key list from currentIndex, returning the first non-exhausted key
     * (and advancing the index). Returns null when every key is exhausted.
     */
    protected findAvailableKey(): string | null {
        const now = Date.now();
        let attempts = 0;

        while (attempts < this.keys.length) {
            const key = this.keys[this.currentIndex];
            const stats = this.stats.get(key)!;

            // Auto-clear exhaustion once the cooldown has elapsed
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

        return null; // all exhausted / cooling down
    }

    /**
     * Return the key with the lowest total usage count (fallback of last resort).
     * Caller is responsible for ensuring keys is non-empty.
     */
    protected getLeastUsedKey(): string {
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

    /** Decrement error count on a successful call (floor 0). */
    recordSuccess(key: string): void {
        const stats = this.stats.get(key);
        if (stats) {
            stats.errorCount = Math.max(0, stats.errorCount - 1);
        }
    }
}
