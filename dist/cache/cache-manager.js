"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
const events_1 = require("events");
/**
 * LRU (Least Recently Used) Cache Implementation
 *
 * Level 1 in-memory cache with O(1) operations
 */
class LRUCache {
    cache;
    maxSize;
    constructor(maxSize = 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    /**
     * Get value from cache
     */
    get(key) {
        const entry = this.cache.get(key);
        if (entry) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, {
                ...entry,
                metadata: {
                    ...entry.metadata,
                    lastAccessedAt: Date.now(),
                    hitCount: entry.metadata.hitCount + 1
                }
            });
            return entry;
        }
        return undefined;
    }
    /**
     * Set value in cache
     */
    set(key, value, confidence) {
        // Delete if exists (to move to end)
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }
        // Add new entry
        const entry = {
            data: value,
            confidence,
            metadata: {
                createdAt: Date.now(),
                lastAccessedAt: Date.now(),
                hitCount: 0,
                direction: 'mcp-to-a2a', // Will be set properly by caller
                sizeBytes: this.estimateSize(value)
            }
        };
        this.cache.set(key, entry);
    }
    /**
     * Clear cache
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Get cache statistics
     */
    getStats() {
        let totalBytes = 0;
        for (const entry of this.cache.values()) {
            totalBytes += entry.metadata.sizeBytes;
        }
        return {
            size: this.cache.size,
            memoryMB: totalBytes / (1024 * 1024)
        };
    }
    /**
     * Estimate object size in bytes
     */
    estimateSize(obj) {
        const str = JSON.stringify(obj);
        return str.length * 2; // Rough estimate (2 bytes per char)
    }
}
/**
 * Cache Manager
 *
 * Orchestrates the multi-level caching system
 */
class CacheManager extends events_1.EventEmitter {
    // Level 1: In-memory LRU cache
    l1Cache;
    // Level 2: Redis distributed cache
    redis;
    // Cache configuration
    config = {
        l1MaxSize: 1000,
        l2TTLSeconds: 3600, // 1 hour default TTL
        l3RetentionDays: 30, // 30 days for persistent storage
        warmupBatchSize: 100, // Cache warming batch size
        compressionThreshold: 1024 // Compress if > 1KB
    };
    // Statistics tracking
    stats = {
        requests: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        avgLatencyMs: 0,
        entriesCount: 0,
        memoryUsageMB: 0
    };
    latencies = [];
    constructor(redisOptions) {
        super();
        // Initialize L1 cache
        this.l1Cache = new LRUCache(this.config.l1MaxSize);
        // Initialize Redis connection with optimizations
        this.redis = new ioredis_1.default({
            port: 6379,
            host: 'localhost',
            ...redisOptions,
            // Performance optimizations from the paper
            enableOfflineQueue: true,
            lazyConnect: true,
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });
        // Setup Redis event handlers
        this.setupRedisHandlers();
        // Start periodic stats calculation
        setInterval(() => this.calculateStats(), 10000); // Every 10 seconds
    }
    /**
     * Get translation from cache
     *
     * Checks all cache levels in order
     */
    async get(key, options) {
        const startTime = Date.now();
        this.stats.requests++;
        try {
            // Level 1: In-memory cache
            if (!options?.skipL1) {
                const l1Entry = this.l1Cache.get(key);
                if (l1Entry) {
                    this.stats.hits++;
                    this.recordLatency(Date.now() - startTime);
                    this.emit('cache:hit', { level: 1, key, latencyMs: Date.now() - startTime });
                    return l1Entry;
                }
            }
            // Level 2: Redis cache
            if (!options?.skipL2) {
                const l2Data = await this.redis.get(this.getRedisKey(key));
                if (l2Data) {
                    const entry = JSON.parse(l2Data);
                    // Promote to L1
                    this.l1Cache.set(key, entry.data, entry.confidence);
                    this.stats.hits++;
                    this.recordLatency(Date.now() - startTime);
                    this.emit('cache:hit', { level: 2, key, latencyMs: Date.now() - startTime });
                    return entry;
                }
            }
            // Level 3: Check persistent storage (Redis with different key prefix)
            const l3Data = await this.redis.get(this.getPersistentKey(key));
            if (l3Data) {
                const entry = JSON.parse(l3Data);
                // Promote to L1 and L2
                this.l1Cache.set(key, entry.data, entry.confidence);
                await this.set(key, entry.data, entry.confidence, { skipL3: true });
                this.stats.hits++;
                this.recordLatency(Date.now() - startTime);
                this.emit('cache:hit', { level: 3, key, latencyMs: Date.now() - startTime });
                return entry;
            }
            // Cache miss
            this.stats.misses++;
            this.recordLatency(Date.now() - startTime);
            this.emit('cache:miss', { key, latencyMs: Date.now() - startTime });
            return null;
        }
        catch (error) {
            this.emit('cache:error', { key, error });
            return null;
        }
    }
    /**
     * Set translation in cache
     *
     * Writes to multiple cache levels based on confidence
     */
    async set(key, value, confidence, options) {
        try {
            const entry = {
                data: value,
                confidence,
                metadata: {
                    createdAt: Date.now(),
                    lastAccessedAt: Date.now(),
                    hitCount: 0,
                    direction: this.inferDirection(value),
                    sizeBytes: JSON.stringify(value).length * 2
                }
            };
            // Level 1: Always cache if confidence is high
            if (!options?.skipL1 && confidence.score >= 0.7) {
                this.l1Cache.set(key, value, confidence);
            }
            // Level 2: Redis with TTL
            if (!options?.skipL2) {
                const ttl = options?.ttlSeconds || this.config.l2TTLSeconds;
                const serialized = JSON.stringify(entry);
                // Use pipeline for better performance
                const pipeline = this.redis.pipeline();
                pipeline.set(this.getRedisKey(key), serialized);
                pipeline.expire(this.getRedisKey(key), ttl);
                await pipeline.exec();
            }
            // Level 3: Persistent storage for high-confidence translations
            if (!options?.skipL3 && confidence.score >= 0.9) {
                const persistentTTL = this.config.l3RetentionDays * 24 * 3600;
                await this.redis.set(this.getPersistentKey(key), JSON.stringify(entry), 'EX', persistentTTL);
            }
            this.emit('cache:set', { key, confidence: confidence.score });
        }
        catch (error) {
            this.emit('cache:error', { key, error, operation: 'set' });
        }
    }
    /**
     * Generate cache key using deterministic hashing
     *
     * Based on paper's key generation strategy
     */
    generateCacheKey(message, direction, context) {
        const keyData = {
            message: this.normalizeMessage(message),
            direction,
            // Include relevant context that affects translation
            contextId: context?.sessionId,
            contextState: context?.shadowState?.size || 0
        };
        const hash = (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(keyData))
            .digest('hex');
        return `${direction}:${hash.substring(0, 16)}`;
    }
    /**
     * Warm cache with frequently used translations
     */
    async warmCache(entries) {
        const startTime = Date.now();
        let warmed = 0;
        // Process in batches for efficiency
        for (let i = 0; i < entries.length; i += this.config.warmupBatchSize) {
            const batch = entries.slice(i, i + this.config.warmupBatchSize);
            await Promise.all(batch.map(entry => this.set(entry.key, entry.value, entry.confidence, { skipL3: true })));
            warmed += batch.length;
        }
        this.emit('cache:warmed', {
            count: warmed,
            durationMs: Date.now() - startTime
        });
    }
    /**
     * Clear cache levels
     */
    async clear(levels) {
        const clearAll = !levels;
        if (clearAll || levels?.l1) {
            this.l1Cache.clear();
        }
        if (clearAll || levels?.l2) {
            const keys = await this.redis.keys('ptl:cache:*');
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
        if (clearAll || levels?.l3) {
            const keys = await this.redis.keys('ptl:persistent:*');
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
        this.emit('cache:cleared', { levels: levels || 'all' });
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const l1Stats = this.l1Cache.getStats();
        return {
            ...this.stats,
            entriesCount: l1Stats.size,
            memoryUsageMB: l1Stats.memoryMB
        };
    }
    /**
     * Invalidate cache entries matching pattern
     */
    async invalidate(pattern) {
        const keys = await this.redis.keys(`ptl:cache:${pattern}`);
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
        this.emit('cache:invalidated', { pattern, count: keys.length });
        return keys.length;
    }
    /**
     * Close connections
     */
    async close() {
        await this.redis.quit();
        this.l1Cache.clear();
        this.removeAllListeners();
    }
    // Private helper methods
    getRedisKey(key) {
        return `ptl:cache:${key}`;
    }
    getPersistentKey(key) {
        return `ptl:persistent:${key}`;
    }
    normalizeMessage(message) {
        // Remove non-deterministic fields
        const normalized = { ...message };
        delete normalized.timestamp;
        delete normalized.id;
        return normalized;
    }
    inferDirection(value) {
        // Simple heuristic based on data structure
        if (value.taskId || value.agentId) {
            return 'mcp-to-a2a';
        }
        if (value.jsonrpc || value.method) {
            return 'a2a-to-mcp';
        }
        return 'mcp-to-a2a';
    }
    recordLatency(latencyMs) {
        this.latencies.push(latencyMs);
        // Keep only last 1000 latencies
        if (this.latencies.length > 1000) {
            this.latencies.shift();
        }
    }
    calculateStats() {
        if (this.stats.requests > 0) {
            this.stats.hitRate = (this.stats.hits / this.stats.requests) * 100;
        }
        if (this.latencies.length > 0) {
            const sum = this.latencies.reduce((a, b) => a + b, 0);
            this.stats.avgLatencyMs = sum / this.latencies.length;
        }
    }
    setupRedisHandlers() {
        this.redis.on('connect', () => {
            this.emit('redis:connected');
        });
        this.redis.on('error', (error) => {
            this.emit('redis:error', error);
        });
        this.redis.on('close', () => {
            this.emit('redis:disconnected');
        });
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=cache-manager.js.map