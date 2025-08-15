/**
 * Paper Results Validation Test
 * 
 * Validates all performance claims from the research paper:
 * - 0.20ms P95 latency with warm cache
 * - 78.3% cache hit rate in production
 * - 93.8% semantic preservation accuracy
 * - 27,848 translations per second throughput
 * - 0.003% error rate in production
 * 
 * Performs comprehensive statistical analysis with:
 * - Mean, standard deviation, confidence intervals
 * - Percentile calculations (P50, P95, P99)
 * - Multiple test runs for statistical significance
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
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  static standardDeviation(values: number[]): number {
    const avg = this.mean(values);
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = this.mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }
  
  static percentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  
  static confidenceInterval(values: number[], confidence = 0.95): { lower: number; upper: number; mean: number } {
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

// Performance tracking
interface TestRun {
  latencies: number[];
  cacheHits: number;
  totalRequests: number;
  semanticScores: number[];
  errors: number;
  throughput: number;
}

interface AggregatedResults {
  latency: {
    mean: number;
    stdDev: number;
    p50: number;
    p95: number;
    p99: number;
    ci95: { lower: number; upper: number };
  };
  cache: {
    hitRate: number;
    stdDev: number;
    ci95: { lower: number; upper: number };
  };
  semantic: {
    accuracy: number;
    stdDev: number;
    ci95: { lower: number; upper: number };
  };
  throughput: {
    mean: number;
    stdDev: number;
    max: number;
    ci95: { lower: number; upper: number };
  };
  errorRate: {
    rate: number;
    stdDev: number;
  };
}

async function runSingleTest(
  engine: SemanticTranslationEngine,
  testSize: number = 500
): Promise<TestRun> {
  const results: TestRun = {
    latencies: [],
    cacheHits: 0,
    totalRequests: 0,
    semanticScores: [],
    errors: 0,
    throughput: 0
  };
  
  // Track cache events
  let cacheHitCount = 0;
  let cacheMissCount = 0;
  
  const cacheHitHandler = () => cacheHitCount++;
  const cacheMissHandler = () => cacheMissCount++;
  
  engine.on('cache:hit', cacheHitHandler);
  engine.on('cache:miss', cacheMissHandler);
  
  // Generate test messages
  const testMessages: ProtocolMessage[] = Array.from({ length: testSize }, (_, i) => ({
    id: `test-${i}`,
    type: 'request',
    paradigm: ProtocolParadigm.TOOL_CENTRIC,
    timestamp: Date.now(),
    payload: {
      toolName: `tool_${i % 20}`, // 20 different tools for realistic cache patterns
      arguments: {
        input: `data_${i}`,
        mode: i % 3 === 0 ? 'fast' : i % 3 === 1 ? 'normal' : 'detailed',
        index: i,
        nested: {
          field1: `value_${i}`,
          field2: i * 2,
          array: [i, i+1, i+2]
        }
      }
    }
  }));
  
  // Run translations
  const startTime = Date.now();
  
  for (const message of testMessages) {
    const translationStart = Date.now();
    
    try {
      const result = await engine.translate(
        message,
        ProtocolParadigm.TASK_CENTRIC,
        `session-${message.id}`
      );
      
      const latency = Date.now() - translationStart;
      results.latencies.push(latency);
      
      if (result.success) {
        results.semanticScores.push(result.confidence.score);
      } else {
        results.errors++;
      }
    } catch (error) {
      results.errors++;
    }
    
    results.totalRequests++;
  }
  
  const duration = (Date.now() - startTime) / 1000; // seconds
  results.throughput = results.totalRequests / duration;
  results.cacheHits = cacheHitCount;
  
  // Clean up event listeners
  engine.off('cache:hit', cacheHitHandler);
  engine.off('cache:miss', cacheMissHandler);
  
  return results;
}

async function validatePaperResults() {
  console.log('📊 SEMANTIC PROTOCOL TRANSLATION - PAPER VALIDATION\n');
  console.log('=' .repeat(70));
  console.log('Validating: "Semantic Protocol Translation for AI Agent Interoperability"');
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
  
  console.log('📈 Running Statistical Analysis (5000 total samples)\n');
  console.log('This will take approximately 30-60 seconds...\n');
  
  // Run multiple test iterations for statistical significance
  const NUM_RUNS = 10;
  const SAMPLES_PER_RUN = 500;  // 10 runs × 500 = 5000 total samples
  const allRuns: TestRun[] = [];
  
  // Progress bar
  const updateProgress = (current: number, total: number) => {
    const percentage = Math.floor((current / total) * 100);
    const filled = Math.floor(percentage / 2);
    const empty = 50 - filled;
    process.stdout.write(`\rProgress: [${'█'.repeat(filled)}${' '.repeat(empty)}] ${percentage}%`);
  };
  
  for (let run = 0; run < NUM_RUNS; run++) {
    updateProgress(run, NUM_RUNS);
    const testRun = await runSingleTest(engine, SAMPLES_PER_RUN);
    allRuns.push(testRun);
    
    // Clear cache between runs for consistent results
    if (run < NUM_RUNS - 1) {
      await engine.clear();
    }
  }
  
  updateProgress(NUM_RUNS, NUM_RUNS);
  console.log('\n');
  
  // Aggregate results
  const aggregated: AggregatedResults = {
    latency: {
      mean: 0,
      stdDev: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      ci95: { lower: 0, upper: 0 }
    },
    cache: {
      hitRate: 0,
      stdDev: 0,
      ci95: { lower: 0, upper: 0 }
    },
    semantic: {
      accuracy: 0,
      stdDev: 0,
      ci95: { lower: 0, upper: 0 }
    },
    throughput: {
      mean: 0,
      stdDev: 0,
      max: 0,
      ci95: { lower: 0, upper: 0 }
    },
    errorRate: {
      rate: 0,
      stdDev: 0
    }
  };
  
  // Combine all latencies
  const allLatencies = allRuns.flatMap(run => run.latencies);
  aggregated.latency.mean = StatisticalAnalyzer.mean(allLatencies);
  aggregated.latency.stdDev = StatisticalAnalyzer.standardDeviation(allLatencies);
  aggregated.latency.p50 = StatisticalAnalyzer.percentile(allLatencies, 50);
  aggregated.latency.p95 = StatisticalAnalyzer.percentile(allLatencies, 95);
  aggregated.latency.p99 = StatisticalAnalyzer.percentile(allLatencies, 99);
  const latencyCI = StatisticalAnalyzer.confidenceInterval(allLatencies);
  aggregated.latency.ci95 = { lower: latencyCI.lower, upper: latencyCI.upper };
  
  // Cache hit rates
  const cacheHitRates = allRuns.map(run => 
    (run.cacheHits / run.totalRequests) * 100
  );
  aggregated.cache.hitRate = StatisticalAnalyzer.mean(cacheHitRates);
  aggregated.cache.stdDev = StatisticalAnalyzer.standardDeviation(cacheHitRates);
  const cacheCI = StatisticalAnalyzer.confidenceInterval(cacheHitRates);
  aggregated.cache.ci95 = { lower: cacheCI.lower, upper: cacheCI.upper };
  
  // Semantic accuracy
  const allSemanticScores = allRuns.flatMap(run => run.semanticScores);
  const semanticAccuracy = StatisticalAnalyzer.mean(allSemanticScores) * 100;
  aggregated.semantic.accuracy = semanticAccuracy;
  aggregated.semantic.stdDev = StatisticalAnalyzer.standardDeviation(allSemanticScores.map(s => s * 100));
  const semanticCI = StatisticalAnalyzer.confidenceInterval(allSemanticScores.map(s => s * 100));
  aggregated.semantic.ci95 = { lower: semanticCI.lower, upper: semanticCI.upper };
  
  // Throughput
  const throughputs = allRuns.map(run => run.throughput);
  aggregated.throughput.mean = StatisticalAnalyzer.mean(throughputs);
  aggregated.throughput.stdDev = StatisticalAnalyzer.standardDeviation(throughputs);
  aggregated.throughput.max = Math.max(...throughputs);
  const throughputCI = StatisticalAnalyzer.confidenceInterval(throughputs);
  aggregated.throughput.ci95 = { lower: throughputCI.lower, upper: throughputCI.upper };
  
  // Error rate
  const errorRates = allRuns.map(run => (run.errors / run.totalRequests) * 100);
  aggregated.errorRate.rate = StatisticalAnalyzer.mean(errorRates);
  aggregated.errorRate.stdDev = StatisticalAnalyzer.standardDeviation(errorRates);
  
  // ========================================
  // RESULTS PRESENTATION
  // ========================================
  
  console.log('📊 STATISTICAL ANALYSIS RESULTS\n');
  console.log('=' .repeat(70));
  
  // Latency Results
  console.log('\n1️⃣  LATENCY PERFORMANCE');
  console.log('─'.repeat(40));
  console.log('┌────────────────┬─────────────┬─────────────┬──────────────┐');
  console.log('│ Metric         │ Paper Target│ Our Result  │ Status       │');
  console.log('├────────────────┼─────────────┼─────────────┼──────────────┤');
  console.log(`│ P50 Latency    │ -           │ ${aggregated.latency.p50.toFixed(2).padEnd(11)}ms│ -            │`);
  console.log(`│ P95 Latency    │ 0.20ms      │ ${aggregated.latency.p95.toFixed(2).padEnd(11)}ms│ ${aggregated.latency.p95 <= 0.20 ? '✅ PASS' : aggregated.latency.p95 <= 0.5 ? '⚠️  CLOSE' : '❌ FAIL'}      │`);
  console.log(`│ P99 Latency    │ -           │ ${aggregated.latency.p99.toFixed(2).padEnd(11)}ms│ -            │`);
  console.log(`│ Mean ± SD      │ -           │ ${aggregated.latency.mean.toFixed(2)} ± ${aggregated.latency.stdDev.toFixed(2).padEnd(5)}│ -            │`);
  console.log(`│ 95% CI         │ -           │ [${aggregated.latency.ci95.lower.toFixed(2)}, ${aggregated.latency.ci95.upper.toFixed(2)}] │ -            │`);
  console.log('└────────────────┴─────────────┴─────────────┴──────────────┘');
  
  // Cache Performance
  console.log('\n2️⃣  CACHE PERFORMANCE');
  console.log('─'.repeat(40));
  console.log('┌────────────────┬─────────────┬─────────────┬──────────────┐');
  console.log('│ Metric         │ Paper Target│ Our Result  │ Status       │');
  console.log('├────────────────┼─────────────┼─────────────┼──────────────┤');
  console.log(`│ Hit Rate       │ 78.3%       │ ${aggregated.cache.hitRate.toFixed(1).padEnd(11)}%│ ${aggregated.cache.hitRate >= 78.3 ? '✅ PASS' : aggregated.cache.hitRate >= 70 ? '⚠️  CLOSE' : '❌ FAIL'}      │`);
  console.log(`│ Std Deviation  │ -           │ ± ${aggregated.cache.stdDev.toFixed(1).padEnd(9)}%│ -            │`);
  console.log(`│ 95% CI         │ -           │ [${aggregated.cache.ci95.lower.toFixed(1)}%, ${aggregated.cache.ci95.upper.toFixed(1)}%]│ -            │`);
  console.log('└────────────────┴─────────────┴─────────────┴──────────────┘');
  
  // Semantic Accuracy
  console.log('\n3️⃣  SEMANTIC PRESERVATION');
  console.log('─'.repeat(40));
  console.log('┌────────────────┬─────────────┬─────────────┬──────────────┐');
  console.log('│ Metric         │ Paper Target│ Our Result  │ Status       │');
  console.log('├────────────────┼─────────────┼─────────────┼──────────────┤');
  console.log(`│ Accuracy       │ 93.8%       │ ${aggregated.semantic.accuracy.toFixed(1).padEnd(11)}%│ ${aggregated.semantic.accuracy >= 93.8 ? '✅ PASS' : aggregated.semantic.accuracy >= 90 ? '⚠️  CLOSE' : '❌ FAIL'}      │`);
  console.log(`│ Std Deviation  │ -           │ ± ${aggregated.semantic.stdDev.toFixed(1).padEnd(9)}%│ -            │`);
  console.log(`│ 95% CI         │ -           │ [${aggregated.semantic.ci95.lower.toFixed(1)}%, ${aggregated.semantic.ci95.upper.toFixed(1)}%]│ -            │`);
  console.log('└────────────────┴─────────────┴─────────────┴──────────────┘');
  
  // Throughput
  console.log('\n4️⃣  THROUGHPUT PERFORMANCE');
  console.log('─'.repeat(40));
  console.log('┌────────────────┬─────────────┬─────────────┬──────────────┐');
  console.log('│ Metric         │ Paper Target│ Our Result  │ Status       │');
  console.log('├────────────────┼─────────────┼─────────────┼──────────────┤');
  console.log(`│ Mean TPS       │ 27,848      │ ${Math.floor(aggregated.throughput.mean).toString().padEnd(11)} │ ${aggregated.throughput.mean >= 27848 ? '✅ PASS' : aggregated.throughput.mean >= 20000 ? '⚠️  CLOSE' : '❌ FAIL'}      │`);
  console.log(`│ Max TPS        │ -           │ ${Math.floor(aggregated.throughput.max).toString().padEnd(11)} │ -            │`);
  console.log(`│ Std Deviation  │ -           │ ± ${Math.floor(aggregated.throughput.stdDev).toString().padEnd(9)} │ -            │`);
  console.log(`│ 95% CI         │ -           │ [${Math.floor(aggregated.throughput.ci95.lower)}, ${Math.floor(aggregated.throughput.ci95.upper)}]│ -            │`);
  console.log('└────────────────┴─────────────┴─────────────┴──────────────┘');
  
  // Error Rate
  console.log('\n5️⃣  ERROR RATE');
  console.log('─'.repeat(40));
  console.log('┌────────────────┬─────────────┬─────────────┬──────────────┐');
  console.log('│ Metric         │ Paper Target│ Our Result  │ Status       │');
  console.log('├────────────────┼─────────────┼─────────────┼──────────────┤');
  console.log(`│ Error Rate     │ 0.003%      │ ${aggregated.errorRate.rate.toFixed(3).padEnd(11)}%│ ${aggregated.errorRate.rate <= 0.003 ? '✅ PASS' : aggregated.errorRate.rate <= 0.01 ? '⚠️  CLOSE' : '❌ FAIL'}      │`);
  console.log(`│ Std Deviation  │ -           │ ± ${aggregated.errorRate.stdDev.toFixed(3).padEnd(9)}%│ -            │`);
  console.log('└────────────────┴─────────────┴─────────────┴──────────────┘');
  
  // ========================================
  // FINAL SUMMARY
  // ========================================
  console.log('\n' + '=' .repeat(70));
  console.log('📊 VALIDATION SUMMARY');
  console.log('=' .repeat(70));
  
  const validationResults = {
    latency: aggregated.latency.p95 <= 0.20,
    cache: aggregated.cache.hitRate >= 78.3,
    semantic: aggregated.semantic.accuracy >= 93.8,
    throughput: aggregated.throughput.mean >= 27848,
    errorRate: aggregated.errorRate.rate <= 0.003
  };
  
  const passedTests = Object.values(validationResults).filter(v => v).length;
  const totalTests = Object.keys(validationResults).length;
  
  console.log(`\n✅ Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL PAPER CLAIMS VALIDATED SUCCESSFULLY!');
    console.log('The implementation meets or exceeds all performance targets.');
  } else if (passedTests >= 3) {
    console.log('\n✅ MAJORITY OF CLAIMS VALIDATED');
    console.log('Most performance targets achieved. Some optimization may be needed.');
  } else {
    console.log('\n⚠️  PARTIAL VALIDATION');
    console.log('Further optimization required to meet paper targets.');
  }
  
  console.log('\n📝 Statistical Notes:');
  console.log('• Results based on 10 independent runs with 500 samples each');
  console.log('• 95% confidence intervals provided for all metrics');
  console.log('• Standard deviations indicate measurement consistency');
  console.log('• Hardware/network conditions may affect absolute values');
  
  console.log('\n🔬 Test Configuration:');
  console.log(`• Total samples: ${NUM_RUNS * SAMPLES_PER_RUN}`);
  console.log(`• Test duration: ~${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log(`• Protocol paradigms: Tool-Centric ↔ Task-Centric`);
  console.log(`• Cache levels: L1 (Memory), L2 (Redis), L3 (SQLite)`);
  
  // Cleanup
  await engine.shutdown();
  
  console.log('\n✨ Validation complete!');
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Store start time for duration calculation
const startTime = Date.now();

// Run validation
validatePaperResults().catch(error => {
  console.error('❌ Validation failed with error:', error);
  process.exit(1);
});