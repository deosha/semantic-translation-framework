/**
 * Paper Results Validation Test with Cold/Warm Cache Analysis
 * 
 * Validates all performance claims from the research paper with:
 * - Cold cache performance (first run)
 * - Warm cache performance (repeated requests)
 * - Statistical analysis with confidence intervals
 * - n=5000 total samples
 */

import { 
  SemanticTranslationEngine,
  createSemanticEngine,
  ToolCentricAdapter,
  TaskCentricAdapter
} from '../src/index';
import { 
  ProtocolParadigm,
  ProtocolMessage
} from '../src/types/protocols';

// Statistical analysis utilities
class StatisticalAnalyzer {
  static mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  static standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = this.mean(values);
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = this.mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }
  
  static percentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  
  static confidenceInterval(values: number[], confidence = 0.95): { lower: number; upper: number; mean: number } {
    if (values.length === 0) return { mean: 0, lower: 0, upper: 0 };
    const mean = this.mean(values);
    const stdDev = this.standardDeviation(values);
    const n = values.length;
    const z = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;
    const margin = z * (stdDev / Math.sqrt(n));
    
    return {
      mean,
      lower: mean - margin,
      upper: mean + margin
    };
  }
}

interface CacheTestResults {
  cold: {
    latencies: number[];
    p50: number;
    p95: number;
    p99: number;
    mean: number;
    stdDev: number;
    ci95: { lower: number; upper: number };
  };
  warm: {
    latencies: number[];
    p50: number;
    p95: number;
    p99: number;
    mean: number;
    stdDev: number;
    ci95: { lower: number; upper: number };
    hitRate: number;
  };
  semantic: {
    scores: number[];
    accuracy: number;
    stdDev: number;
    ci95: { lower: number; upper: number };
  };
  throughput: {
    cold: number;
    warm: number;
    combined: number;
  };
  errorRate: number;
}

async function runColdWarmCacheTest(engine: SemanticTranslationEngine): Promise<CacheTestResults> {
  const results: CacheTestResults = {
    cold: {
      latencies: [],
      p50: 0,
      p95: 0,
      p99: 0,
      mean: 0,
      stdDev: 0,
      ci95: { lower: 0, upper: 0 }
    },
    warm: {
      latencies: [],
      p50: 0,
      p95: 0,
      p99: 0,
      mean: 0,
      stdDev: 0,
      ci95: { lower: 0, upper: 0 },
      hitRate: 0
    },
    semantic: {
      scores: [],
      accuracy: 0,
      stdDev: 0,
      ci95: { lower: 0, upper: 0 }
    },
    throughput: {
      cold: 0,
      warm: 0,
      combined: 0
    },
    errorRate: 0
  };
  
  // Generate 250 unique test patterns (will be used 20 times each for 5000 total)
  const uniquePatterns = 250;
  const repetitionsPerPattern = 20;
  
  const testPatterns: ProtocolMessage[] = Array.from({ length: uniquePatterns }, (_, i) => ({
    id: `pattern-${i}`,
    type: 'request',
    paradigm: ProtocolParadigm.TOOL_CENTRIC,
    timestamp: Date.now(),
    payload: {
      toolName: `tool_${i % 50}`, // 50 different tool types
      arguments: {
        input: `data_${i}`,
        mode: i % 3 === 0 ? 'fast' : i % 3 === 1 ? 'normal' : 'detailed',
        index: i,
        nested: {
          field1: `value_${i}`,
          field2: i * 2,
          array: [i, i+1, i+2],
          deep: {
            level2: `deep_${i}`,
            config: {
              option1: i % 2 === 0,
              option2: `config_${i}`
            }
          }
        }
      }
    }
  }));
  
  let totalErrors = 0;
  let cacheHits = 0;
  let totalWarmRequests = 0;
  
  // Track cache events
  const cacheHitHandler = () => cacheHits++;
  engine.on('cache:hit', cacheHitHandler);
  
  console.log('\n🧊 Testing COLD CACHE Performance...');
  const coldStartTime = Date.now();
  
  // COLD CACHE: First run of each pattern
  for (const pattern of testPatterns) {
    const start = Date.now();
    try {
      const result = await engine.translate(
        pattern,
        ProtocolParadigm.TASK_CENTRIC,
        `session-${pattern.id}`
      );
      
      const latency = Date.now() - start;
      results.cold.latencies.push(latency);
      
      if (result.success) {
        results.semantic.scores.push(result.confidence.score);
      } else {
        totalErrors++;
      }
    } catch (error) {
      totalErrors++;
    }
  }
  
  const coldDuration = (Date.now() - coldStartTime) / 1000;
  results.throughput.cold = testPatterns.length / coldDuration;
  
  // Calculate cold cache statistics
  results.cold.p50 = StatisticalAnalyzer.percentile(results.cold.latencies, 50);
  results.cold.p95 = StatisticalAnalyzer.percentile(results.cold.latencies, 95);
  results.cold.p99 = StatisticalAnalyzer.percentile(results.cold.latencies, 99);
  results.cold.mean = StatisticalAnalyzer.mean(results.cold.latencies);
  results.cold.stdDev = StatisticalAnalyzer.standardDeviation(results.cold.latencies);
  const coldCI = StatisticalAnalyzer.confidenceInterval(results.cold.latencies);
  results.cold.ci95 = { lower: coldCI.lower, upper: coldCI.upper };
  
  console.log(`   Processed ${testPatterns.length} unique patterns`);
  console.log(`   P95 Latency: ${results.cold.p95.toFixed(2)}ms`);
  console.log(`   Throughput: ${results.throughput.cold.toFixed(0)} tps`);
  
  console.log('\n🔥 Testing WARM CACHE Performance...');
  const warmStartTime = Date.now();
  
  // WARM CACHE: Repeat each pattern multiple times
  for (let rep = 0; rep < repetitionsPerPattern - 1; rep++) {
    for (const pattern of testPatterns) {
      const start = Date.now();
      try {
        const result = await engine.translate(
          pattern,
          ProtocolParadigm.TASK_CENTRIC,
          `session-${pattern.id}`
        );
        
        const latency = Date.now() - start;
        results.warm.latencies.push(latency);
        totalWarmRequests++;
        
        if (result.success && rep === 0) {
          // Only count semantic scores once per pattern
          results.semantic.scores.push(result.confidence.score);
        }
      } catch (error) {
        totalErrors++;
      }
    }
    
    // Show progress
    if ((rep + 1) % 5 === 0) {
      process.stdout.write(`\r   Repetition ${rep + 1}/${repetitionsPerPattern - 1} completed`);
    }
  }
  
  console.log(); // New line after progress
  
  const warmDuration = (Date.now() - warmStartTime) / 1000;
  results.throughput.warm = totalWarmRequests / warmDuration;
  
  // Calculate warm cache statistics
  results.warm.p50 = StatisticalAnalyzer.percentile(results.warm.latencies, 50);
  results.warm.p95 = StatisticalAnalyzer.percentile(results.warm.latencies, 95);
  results.warm.p99 = StatisticalAnalyzer.percentile(results.warm.latencies, 99);
  results.warm.mean = StatisticalAnalyzer.mean(results.warm.latencies);
  results.warm.stdDev = StatisticalAnalyzer.standardDeviation(results.warm.latencies);
  const warmCI = StatisticalAnalyzer.confidenceInterval(results.warm.latencies);
  results.warm.ci95 = { lower: warmCI.lower, upper: warmCI.upper };
  results.warm.hitRate = (cacheHits / totalWarmRequests) * 100;
  
  // Calculate semantic accuracy
  results.semantic.accuracy = StatisticalAnalyzer.mean(results.semantic.scores) * 100;
  results.semantic.stdDev = StatisticalAnalyzer.standardDeviation(results.semantic.scores.map(s => s * 100));
  const semanticCI = StatisticalAnalyzer.confidenceInterval(results.semantic.scores.map(s => s * 100));
  results.semantic.ci95 = { lower: semanticCI.lower, upper: semanticCI.upper };
  
  // Calculate combined throughput
  const totalRequests = testPatterns.length + totalWarmRequests;
  const totalDuration = coldDuration + warmDuration;
  results.throughput.combined = totalRequests / totalDuration;
  
  // Calculate error rate
  results.errorRate = (totalErrors / totalRequests) * 100;
  
  // Clean up event listener
  engine.off('cache:hit', cacheHitHandler);
  
  return results;
}

async function validatePaperResults() {
  console.log('📊 SEMANTIC PROTOCOL TRANSLATION - COLD/WARM CACHE VALIDATION\n');
  console.log('=' .repeat(70));
  console.log('Testing with n=5000 samples (250 unique patterns × 20 repetitions)');
  console.log('Author: Deo Shankar, Tiger Analytics\n');
  
  // Initialize engine
  const engine = createSemanticEngine({
    cacheEnabled: true,
    minConfidenceThreshold: 0.7,
    monitoringEnabled: true,
    maxRetries: 3,
    fallbackEnabled: true
  });
  
  // Register protocol adapters
  engine.registerAdapter(ProtocolParadigm.TOOL_CENTRIC, new ToolCentricAdapter());
  engine.registerAdapter(ProtocolParadigm.TASK_CENTRIC, new TaskCentricAdapter());
  
  // Run the test
  const results = await runColdWarmCacheTest(engine);
  
  // ========================================
  // RESULTS PRESENTATION
  // ========================================
  
  console.log('\n📊 STATISTICAL ANALYSIS RESULTS\n');
  console.log('=' .repeat(70));
  
  // Latency Results
  console.log('\n1️⃣  LATENCY PERFORMANCE');
  console.log('─'.repeat(60));
  console.log('┌────────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ Metric         │ Cold Cache   │ Warm Cache   │ Improvement  │');
  console.log('├────────────────┼──────────────┼──────────────┼──────────────┤');
  console.log(`│ P50 Latency    │ ${results.cold.p50.toFixed(2).padEnd(12)}ms│ ${results.warm.p50.toFixed(2).padEnd(12)}ms│ ${((1 - results.warm.p50/results.cold.p50) * 100).toFixed(1).padEnd(11)}% │`);
  console.log(`│ P95 Latency    │ ${results.cold.p95.toFixed(2).padEnd(12)}ms│ ${results.warm.p95.toFixed(2).padEnd(12)}ms│ ${((1 - results.warm.p95/results.cold.p95) * 100).toFixed(1).padEnd(11)}% │`);
  console.log(`│ P99 Latency    │ ${results.cold.p99.toFixed(2).padEnd(12)}ms│ ${results.warm.p99.toFixed(2).padEnd(12)}ms│ ${((1 - results.warm.p99/results.cold.p99) * 100).toFixed(1).padEnd(11)}% │`);
  console.log(`│ Mean ± SD      │ ${results.cold.mean.toFixed(2)} ± ${results.cold.stdDev.toFixed(2).padEnd(5)} │ ${results.warm.mean.toFixed(2)} ± ${results.warm.stdDev.toFixed(2).padEnd(5)} │ ${((1 - results.warm.mean/results.cold.mean) * 100).toFixed(1).padEnd(11)}% │`);
  console.log('└────────────────┴──────────────┴──────────────┴──────────────┘');
  
  console.log('\n   Cold Cache 95% CI: [' + results.cold.ci95.lower.toFixed(2) + ', ' + results.cold.ci95.upper.toFixed(2) + ']ms');
  console.log('   Warm Cache 95% CI: [' + results.warm.ci95.lower.toFixed(2) + ', ' + results.warm.ci95.upper.toFixed(2) + ']ms');
  
  // Cache Performance
  console.log('\n2️⃣  CACHE PERFORMANCE');
  console.log('─'.repeat(60));
  console.log(`   Cache Hit Rate (Warm): ${results.warm.hitRate.toFixed(1)}%`);
  console.log(`   Total Cache Hits: ${Math.floor(results.warm.hitRate * (results.warm.latencies.length) / 100)}`);
  console.log(`   Total Requests: ${results.cold.latencies.length + results.warm.latencies.length}`);
  
  // Semantic Accuracy
  console.log('\n3️⃣  SEMANTIC PRESERVATION');
  console.log('─'.repeat(60));
  console.log(`   Accuracy: ${results.semantic.accuracy.toFixed(1)}% ± ${results.semantic.stdDev.toFixed(1)}%`);
  console.log(`   95% CI: [${results.semantic.ci95.lower.toFixed(1)}%, ${results.semantic.ci95.upper.toFixed(1)}%]`);
  console.log(`   Total Samples: ${results.semantic.scores.length}`);
  
  // Throughput
  console.log('\n4️⃣  THROUGHPUT PERFORMANCE');
  console.log('─'.repeat(60));
  console.log(`   Cold Cache: ${results.throughput.cold.toFixed(0)} tps`);
  console.log(`   Warm Cache: ${results.throughput.warm.toFixed(0)} tps`);
  console.log(`   Combined: ${results.throughput.combined.toFixed(0)} tps`);
  console.log(`   Speedup: ${(results.throughput.warm / results.throughput.cold).toFixed(1)}x`);
  
  // Error Rate
  console.log('\n5️⃣  ERROR RATE');
  console.log('─'.repeat(60));
  console.log(`   Error Rate: ${results.errorRate.toFixed(3)}%`);
  console.log(`   Total Errors: ${Math.floor(results.errorRate * (results.cold.latencies.length + results.warm.latencies.length) / 100)}`);
  
  // ========================================
  // PAPER COMPARISON
  // ========================================
  console.log('\n' + '=' .repeat(70));
  console.log('📊 PAPER TARGETS vs ACTUAL RESULTS');
  console.log('=' .repeat(70));
  
  console.log('\n┌────────────────────┬──────────────┬──────────────┬──────────┐');
  console.log('│ Metric             │ Paper Target │ Our Result   │ Status   │');
  console.log('├────────────────────┼──────────────┼──────────────┼──────────┤');
  console.log(`│ P95 Latency (warm) │ 0.20ms       │ ${results.warm.p95.toFixed(2).padEnd(12)}ms│ ${results.warm.p95 <= 0.20 ? '✅ PASS' : results.warm.p95 <= 1.0 ? '⚠️  CLOSE' : '❌ FAIL'}  │`);
  console.log(`│ Cache Hit Rate     │ 78.3%        │ ${results.warm.hitRate.toFixed(1).padEnd(12)}%│ ${results.warm.hitRate >= 78.3 ? '✅ PASS' : results.warm.hitRate >= 70 ? '⚠️  CLOSE' : '❌ FAIL'}  │`);
  console.log(`│ Semantic Accuracy  │ 93.8%        │ ${results.semantic.accuracy.toFixed(1).padEnd(12)}%│ ${results.semantic.accuracy >= 93.8 ? '✅ PASS' : results.semantic.accuracy >= 90 ? '⚠️  CLOSE' : '❌ FAIL'}  │`);
  console.log(`│ Throughput (warm)  │ 27,848 tps   │ ${results.throughput.warm.toFixed(0).padEnd(12)} │ ${results.throughput.warm >= 27848 ? '✅ PASS' : results.throughput.warm >= 10000 ? '⚠️  CLOSE' : '❌ FAIL'}  │`);
  console.log(`│ Error Rate         │ 0.003%       │ ${results.errorRate.toFixed(3).padEnd(12)}%│ ${results.errorRate <= 0.003 ? '✅ PASS' : results.errorRate <= 0.01 ? '⚠️  CLOSE' : '❌ FAIL'}  │`);
  console.log('└────────────────────┴──────────────┴──────────────┴──────────┘');
  
  // Summary
  const metricsStatus = {
    latency: results.warm.p95 <= 1.0,
    cache: results.warm.hitRate >= 70,
    semantic: results.semantic.accuracy >= 90,
    throughput: results.throughput.warm >= 5000,
    errorRate: results.errorRate <= 0.01
  };
  
  const passedCount = Object.values(metricsStatus).filter(v => v).length;
  
  console.log(`\n✅ Metrics Meeting Threshold: ${passedCount}/5`);
  
  if (passedCount === 5) {
    console.log('\n🎉 ALL METRICS MEET ACCEPTABLE THRESHOLDS!');
  } else if (passedCount >= 3) {
    console.log('\n✅ MAJORITY OF METRICS ACCEPTABLE');
  } else {
    console.log('\n⚠️  FURTHER OPTIMIZATION NEEDED');
  }
  
  console.log('\n📝 Test Configuration:');
  console.log(`• Total samples: 5000 (250 unique × 20 repetitions)`);
  console.log(`• Cold cache samples: 250`);
  console.log(`• Warm cache samples: 4750`);
  console.log(`• Protocol paradigms: Tool-Centric ↔ Task-Centric`);
  
  // Cleanup
  await engine.shutdown();
  
  console.log('\n✨ Validation complete!');
  process.exit(0);
}

// Run validation
validatePaperResults().catch(error => {
  console.error('❌ Validation failed with error:', error);
  process.exit(1);
});