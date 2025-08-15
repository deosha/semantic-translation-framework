/**
 * High-Performance Caching Architecture
 *
 * Implements the paper's three-level caching strategy:
 * - Level 1: In-memory LRU cache (1000 entries, <0.1ms access)
 * - Level 2: Redis distributed cache (configurable TTL, 0.1-0.5ms access)
 * - Level 3: Persistent state storage (30-day retention, 1-5ms access)
 *
 * Achieves 85%+ hit rates through intelligent key generation and cache warming
 */
import { EventEmitter } from 'events';
import { TranslationContext, TranslationConfidence } from '../types/translation';
/**
 * Cache Entry Structure
 */
interface CacheEntry<T = any> {
    /** Cached data */
    data: T;
    /** Translation confidence score */
    confidence: TranslationConfidence;
    /** Cache metadata */
    metadata: {
        /** When this entry was created */
        createdAt: number;
        /** Last access time */
        lastAccessedAt: number;
        /** Number of times accessed */
        hitCount: number;
        /** Translation direction */
        direction: 'mcp-to-a2a' | 'a2a-to-mcp';
        /** Size in bytes (estimated) */
        sizeBytes: number;
    };
}
/**
 * Cache Statistics
 */
interface CacheStats {
    /** Total requests */
    requests: number;
    /** Cache hits */
    hits: number;
    /** Cache misses */
    misses: number;
    /** Hit rate percentage */
    hitRate: number;
    /** Average latency in ms */
    avgLatencyMs: number;
    /** Cache size */
    entriesCount: number;
    /** Memory usage in MB */
    memoryUsageMB: number;
}
/**
 * Cache Manager
 *
 * Orchestrates the multi-level caching system
 */
export declare class CacheManager extends EventEmitter {
    private l1Cache;
    private redis;
    private readonly config;
    private stats;
    private latencies;
    constructor(redisOptions?: any);
    /**
     * Get translation from cache
     *
     * Checks all cache levels in order
     */
    get<T>(key: string, options?: {
        skipL1?: boolean;
        skipL2?: boolean;
    }): Promise<CacheEntry<T> | null>;
    /**
     * Set translation in cache
     *
     * Writes to multiple cache levels based on confidence
     */
    set<T>(key: string, value: T, confidence: TranslationConfidence, options?: {
        ttlSeconds?: number;
        skipL1?: boolean;
        skipL2?: boolean;
        skipL3?: boolean;
    }): Promise<void>;
    /**
     * Generate cache key using deterministic hashing
     *
     * Based on paper's key generation strategy
     */
    generateCacheKey(message: any, direction: 'mcp-to-a2a' | 'a2a-to-mcp', context?: TranslationContext): string;
    /**
     * Warm cache with frequently used translations
     */
    warmCache(entries: Array<{
        key: string;
        value: any;
        confidence: TranslationConfidence;
    }>): Promise<void>;
    /**
     * Clear cache levels
     */
    clear(levels?: {
        l1?: boolean;
        l2?: boolean;
        l3?: boolean;
    }): Promise<void>;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Invalidate cache entries matching pattern
     */
    invalidate(pattern: string): Promise<number>;
    /**
     * Close connections
     */
    close(): Promise<void>;
    private getRedisKey;
    private getPersistentKey;
    private normalizeMessage;
    private inferDirection;
    private recordLatency;
    private calculateStats;
    private setupRedisHandlers;
}
export {};
//# sourceMappingURL=cache-manager.d.ts.map