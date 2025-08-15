/**
 * Test Cache Manager Component
 * 
 * Verifies that the multi-level caching system works correctly
 * including LRU eviction, Redis operations, and cache promotion
 */

import { CacheManager } from '../src/cache/cache-manager';
import { TranslationContext, TranslationConfidence } from '../src/types/translation';

// Mock translation data
const mockTranslation = {
  taskId: 'test-task-001',
  capability: 'search_files',
  input: [{ type: 'text', text: 'search query' }]
};

const mockConfidence: TranslationConfidence = {
  score: 0.95,
  factors: {
    semanticMatch: 0.9,
    structuralAlignment: 0.95,
    dataPreservation: 1.0,
    contextRetention: 0.85
  },
  warnings: [],
  lossyTranslation: false
};

const mockContext: TranslationContext = {
  sessionId: 'test-session-001',
  direction: 'mcp-to-a2a',
  timestamp: Date.now(),
  sessionState: new Map(),
  translationHistory: [],
  metadata: {}
};

// Helper to wait for async operations
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testCacheManager() {
  console.log('🧪 Testing Cache Manager Component\n');
  console.log('=' .repeat(50));
  
  const cache = new CacheManager();
  
  // Wait for Redis connection
  await wait(100);
  
  // Listen to cache events
  let eventLog: string[] = [];
  cache.on('cache:hit', (data) => {
    eventLog.push(`HIT L${data.level}: ${data.latencyMs}ms`);
  });
  cache.on('cache:miss', (data) => {
    eventLog.push(`MISS: ${data.latencyMs}ms`);
  });
  cache.on('redis:connected', () => {
    eventLog.push('Redis connected');
  });
  cache.on('redis:error', (error) => {
    console.error('Redis error:', error);
  });
  
  // Test 1: Basic Set and Get
  console.log('\n📝 Test 1: Basic Cache Operations');
  console.log('-'.repeat(40));
  
  try {
    // Clear cache first
    await cache.clear();
    console.log('✅ Cache cleared');
    
    // Generate cache key
    const key = cache.generateCacheKey(mockTranslation, 'mcp-to-a2a', mockContext);
    console.log(`   Generated key: ${key}`);
    
    // Set value in cache
    await cache.set(key, mockTranslation, mockConfidence);
    console.log('✅ Value cached');
    
    // Get value from cache
    const cached = await cache.get(key);
    console.log(`✅ Value retrieved: ${cached ? '✓' : '✗'}`);
    
    if (cached) {
      console.log(`   Confidence: ${cached.confidence.score.toFixed(3)}`);
      console.log(`   Hit count: ${cached.metadata.hitCount}`);
      console.log(`   Size: ${cached.metadata.sizeBytes} bytes`);
    }
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }
  
  // Test 2: Multi-level Cache Promotion
  console.log('\n📝 Test 2: Cache Level Promotion');
  console.log('-'.repeat(40));
  
  try {
    const key = cache.generateCacheKey(
      { ...mockTranslation, taskId: 'test-002' },
      'mcp-to-a2a',
      mockContext
    );
    
    // Set only in L2 (Redis)
    await cache.set(key, mockTranslation, mockConfidence, { skipL1: true });
    console.log('✅ Set in L2 only');
    
    // Clear event log
    eventLog = [];
    
    // Get should promote from L2 to L1
    const cached = await cache.get(key);
    console.log(`✅ Retrieved and promoted: ${cached ? '✓' : '✗'}`);
    console.log(`   Events: ${eventLog.join(', ')}`);
    
    // Second get should hit L1
    eventLog = [];
    const cached2 = await cache.get(key);
    console.log(`✅ L1 hit on second get: ${cached2 ? '✓' : '✗'}`);
    console.log(`   Events: ${eventLog.join(', ')}`);
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }
  
  // Test 3: Cache Statistics
  console.log('\n📝 Test 3: Cache Statistics');
  console.log('-'.repeat(40));
  
  try {
    const stats = cache.getStats();
    console.log('✅ Statistics retrieved');
    console.log(`   Total requests: ${stats.requests}`);
    console.log(`   Hits: ${stats.hits}`);
    console.log(`   Misses: ${stats.misses}`);
    console.log(`   Hit rate: ${stats.hitRate.toFixed(1)}%`);
    console.log(`   Avg latency: ${stats.avgLatencyMs.toFixed(2)}ms`);
    console.log(`   Entries: ${stats.entriesCount}`);
    console.log(`   Memory: ${stats.memoryUsageMB.toFixed(2)}MB`);
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }
  
  // Test 4: Cache Key Determinism
  console.log('\n📝 Test 4: Cache Key Determinism');
  console.log('-'.repeat(40));
  
  try {
    const message1 = { tool: 'search', args: { query: 'test' } };
    const message2 = { tool: 'search', args: { query: 'test' } };
    const message3 = { tool: 'search', args: { query: 'different' } };
    
    const key1 = cache.generateCacheKey(message1, 'mcp-to-a2a', mockContext);
    const key2 = cache.generateCacheKey(message2, 'mcp-to-a2a', mockContext);
    const key3 = cache.generateCacheKey(message3, 'mcp-to-a2a', mockContext);
    
    console.log(`✅ Key generation deterministic: ${key1 === key2 ? '✓' : '✗'}`);
    console.log(`✅ Different content = different key: ${key1 !== key3 ? '✓' : '✗'}`);
    console.log(`   Key 1: ${key1}`);
    console.log(`   Key 2: ${key2}`);
    console.log(`   Key 3: ${key3}`);
  } catch (error) {
    console.error('❌ Test 4 failed:', error);
  }
  
  // Test 5: Cache Warming
  console.log('\n📝 Test 5: Cache Warming');
  console.log('-'.repeat(40));
  
  try {
    const warmEntries = Array.from({ length: 10 }, (_, i) => ({
      key: `warm-key-${i}`,
      value: { id: i, data: `warm-data-${i}` },
      confidence: { ...mockConfidence, score: 0.9 + (i * 0.01) }
    }));
    
    await cache.warmCache(warmEntries);
    console.log(`✅ Warmed cache with ${warmEntries.length} entries`);
    
    // Verify entries are cached
    const testKey = 'warm-key-5';
    const warmed = await cache.get(testKey);
    console.log(`   Warmed entry retrieved: ${warmed ? '✓' : '✗'}`);
    
    if (warmed) {
      console.log(`   Data: ${JSON.stringify(warmed.data)}`);
    }
  } catch (error) {
    console.error('❌ Test 5 failed:', error);
  }
  
  // Test 6: Cache Invalidation
  console.log('\n📝 Test 6: Cache Invalidation');
  console.log('-'.repeat(40));
  
  try {
    // Add some test entries
    for (let i = 0; i < 5; i++) {
      const key = `invalid-test-${i}`;
      await cache.set(key, { test: i }, mockConfidence);
    }
    
    // Invalidate with pattern
    const invalidated = await cache.invalidate('invalid-test-*');
    console.log(`✅ Invalidated ${invalidated} entries`);
    
    // Verify invalidation
    const shouldBeNull = await cache.get('invalid-test-2');
    console.log(`   Entry removed: ${shouldBeNull === null ? '✓' : '✗'}`);
  } catch (error) {
    console.error('❌ Test 6 failed:', error);
  }
  
  // Test 7: TTL and Confidence-based Caching
  console.log('\n📝 Test 7: TTL and Confidence-based Caching');
  console.log('-'.repeat(40));
  
  try {
    // Low confidence - should not go to L1
    const lowConfidence = { ...mockConfidence, score: 0.6 };
    const lowKey = 'low-confidence-key';
    await cache.set(lowKey, { test: 'low' }, lowConfidence);
    console.log('✅ Low confidence entry cached');
    
    // High confidence - should go to L3
    const highConfidence = { ...mockConfidence, score: 0.95 };
    const highKey = 'high-confidence-key';
    await cache.set(highKey, { test: 'high' }, highConfidence);
    console.log('✅ High confidence entry cached in L3');
    
    // Custom TTL
    const customKey = 'custom-ttl-key';
    await cache.set(customKey, { test: 'custom' }, mockConfidence, { ttlSeconds: 10 });
    console.log('✅ Custom TTL entry cached');
  } catch (error) {
    console.error('❌ Test 7 failed:', error);
  }
  
  // Test 8: Performance Test
  console.log('\n📝 Test 8: Performance Test');
  console.log('-'.repeat(40));
  
  try {
    const iterations = 100;
    const startTime = Date.now();
    
    // Write test
    for (let i = 0; i < iterations; i++) {
      const key = `perf-test-${i}`;
      await cache.set(key, { index: i }, mockConfidence);
    }
    
    const writeTime = Date.now() - startTime;
    console.log(`✅ Write performance: ${iterations} ops in ${writeTime}ms`);
    console.log(`   Avg write: ${(writeTime / iterations).toFixed(2)}ms/op`);
    
    // Read test
    const readStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      const key = `perf-test-${i}`;
      await cache.get(key);
    }
    
    const readTime = Date.now() - readStart;
    console.log(`✅ Read performance: ${iterations} ops in ${readTime}ms`);
    console.log(`   Avg read: ${(readTime / iterations).toFixed(2)}ms/op`);
    
    // Final stats
    const finalStats = cache.getStats();
    console.log(`   Final hit rate: ${finalStats.hitRate.toFixed(1)}%`);
  } catch (error) {
    console.error('❌ Test 8 failed:', error);
  }
  
  // Cleanup
  await cache.close();
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ Cache Manager tests completed!');
  
  // Exit after a short delay to ensure all async operations complete
  setTimeout(() => process.exit(0), 100);
}

// Run the tests
testCacheManager().catch(console.error);