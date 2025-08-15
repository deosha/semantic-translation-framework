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

import Redis from 'ioredis';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { 
  SemanticTranslationContext as TranslationContext,
  TranslationConfidence 
} from '../types/semantic-translation';

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
 * LRU (Least Recently Used) Cache Implementation
 * 
 * Level 1 in-memory cache with O(1) operations
 */
class LRUCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  
  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  /**
   * Get value from cache
   */
  get(key: string): CacheEntry<T> | undefined {
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
  set(key: string, value: T, confidence: TranslationConfidence): void {
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
    const entry: CacheEntry<T> = {
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
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getStats(): { size: number; memoryMB: number } {
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
  private estimateSize(obj: any): number {
    const str = JSON.stringify(obj);
    return str.length * 2; // Rough estimate (2 bytes per char)
  }
}

/**
 * Cache Manager
 * 
 * Orchestrates the multi-level caching system
 */
export class CacheManager extends EventEmitter {
  // Level 1: In-memory LRU cache
  private l1Cache: LRUCache;
  
  // Level 2: Redis distributed cache
  private redis: Redis;
  
  // Cache configuration
  private readonly config = {
    l1MaxSize: 1000,
    l2TTLSeconds: 3600,        // 1 hour default TTL
    l3RetentionDays: 30,       // 30 days for persistent storage
    warmupBatchSize: 100,      // Cache warming batch size
    compressionThreshold: 1024  // Compress if > 1KB
  };
  
  // Statistics tracking
  private stats: CacheStats = {
    requests: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
    avgLatencyMs: 0,
    entriesCount: 0,
    memoryUsageMB: 0
  };
  
  private latencies: number[] = [];
  
  constructor(redisOptions?: any) {
    super();
    
    // Initialize L1 cache
    this.l1Cache = new LRUCache(this.config.l1MaxSize);
    
    // Initialize Redis connection with optimizations
    this.redis = new Redis({
      port: 6379,
      host: 'localhost',
      ...redisOptions,
      // Performance optimizations from the paper
      enableOfflineQueue: true,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
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
  async get<T>(
    key: string,
    options?: { skipL1?: boolean; skipL2?: boolean }
  ): Promise<CacheEntry<T> | null> {
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
          return l1Entry as CacheEntry<T>;
        }
      }
      
      // Level 2: Redis cache
      if (!options?.skipL2) {
        const l2Data = await this.redis.get(this.getRedisKey(key));
        if (l2Data) {
          const entry = JSON.parse(l2Data) as CacheEntry<T>;
          
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
        const entry = JSON.parse(l3Data) as CacheEntry<T>;
        
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
      
    } catch (error) {
      this.emit('cache:error', { key, error });
      return null;
    }
  }
  
  /**
   * Set translation in cache
   * 
   * Writes to multiple cache levels based on confidence
   */
  async set<T>(
    key: string,
    value: T,
    confidence: TranslationConfidence,
    options?: { 
      ttlSeconds?: number; 
      skipL1?: boolean; 
      skipL2?: boolean;
      skipL3?: boolean;
    }
  ): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
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
        await this.redis.set(
          this.getPersistentKey(key),
          JSON.stringify(entry),
          'EX',
          persistentTTL
        );
      }
      
      this.emit('cache:set', { key, confidence: confidence.score });
      
    } catch (error) {
      this.emit('cache:error', { key, error, operation: 'set' });
    }
  }
  
  /**
   * Generate cache key using deterministic hashing
   * 
   * Based on paper's key generation strategy
   */
  generateCacheKey(
    message: any,
    direction: 'mcp-to-a2a' | 'a2a-to-mcp',
    context?: TranslationContext
  ): string {
    const keyData = {
      message: this.normalizeMessage(message),
      direction,
      // Include relevant context that affects translation
      contextId: context?.sessionId,
      contextState: context?.shadowState?.size || 0
    };
    
    const hash = createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
    
    return `${direction}:${hash.substring(0, 16)}`;
  }
  
  /**
   * Warm cache with frequently used translations
   */
  async warmCache(
    entries: Array<{
      key: string;
      value: any;
      confidence: TranslationConfidence;
    }>
  ): Promise<void> {
    const startTime = Date.now();
    let warmed = 0;
    
    // Process in batches for efficiency
    for (let i = 0; i < entries.length; i += this.config.warmupBatchSize) {
      const batch = entries.slice(i, i + this.config.warmupBatchSize);
      
      await Promise.all(
        batch.map(entry => 
          this.set(entry.key, entry.value, entry.confidence, { skipL3: true })
        )
      );
      
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
  async clear(levels?: { l1?: boolean; l2?: boolean; l3?: boolean }): Promise<void> {
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
  getStats(): CacheStats {
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
  async invalidate(pattern: string): Promise<number> {
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
  async close(): Promise<void> {
    await this.redis.quit();
    this.l1Cache.clear();
    this.removeAllListeners();
  }
  
  // Private helper methods
  
  private getRedisKey(key: string): string {
    return `ptl:cache:${key}`;
  }
  
  private getPersistentKey(key: string): string {
    return `ptl:persistent:${key}`;
  }
  
  private normalizeMessage(message: any): any {
    // Remove non-deterministic fields
    const normalized = { ...message };
    delete normalized.timestamp;
    delete normalized.id;
    return normalized;
  }
  
  private inferDirection(value: any): 'mcp-to-a2a' | 'a2a-to-mcp' {
    // Simple heuristic based on data structure
    if (value.taskId || value.agentId) {
      return 'mcp-to-a2a';
    }
    if (value.jsonrpc || value.method) {
      return 'a2a-to-mcp';
    }
    return 'mcp-to-a2a';
  }
  
  private recordLatency(latencyMs: number): void {
    this.latencies.push(latencyMs);
    // Keep only last 1000 latencies
    if (this.latencies.length > 1000) {
      this.latencies.shift();
    }
  }
  
  private calculateStats(): void {
    if (this.stats.requests > 0) {
      this.stats.hitRate = (this.stats.hits / this.stats.requests) * 100;
    }
    
    if (this.latencies.length > 0) {
      const sum = this.latencies.reduce((a, b) => a + b, 0);
      this.stats.avgLatencyMs = sum / this.latencies.length;
    }
  }
  
  private setupRedisHandlers(): void {
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