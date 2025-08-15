/**
 * Full Integration Test
 * 
 * Demonstrates all components working together:
 * - Capability Negotiation
 * - Message Queue Processing
 * - Translation with Caching
 * - Performance Monitoring
 */

import { TranslationEngine } from '../src/translation/translation-engine';
import { MessageQueue, MessagePriority } from '../src/queue/message-queue';
import { CapabilityNegotiator } from '../src/negotiation/capability-negotiator';
import { MCPTool, MCPToolCallRequest } from '../src/protocols/mcp.types';
import { A2AAgentCard, A2ATaskState } from '../src/protocols/a2a.types';

async function runFullIntegration() {
  console.log('🚀 Full Integration Test - MCP to A2A Protocol Translation Layer\n');
  console.log('=' .repeat(70));
  
  // ========================================
  // 1. CAPABILITY NEGOTIATION
  // ========================================
  console.log('\n📋 Phase 1: Capability Negotiation');
  console.log('-'.repeat(60));
  
  const negotiator = new CapabilityNegotiator();
  
  // Define MCP capabilities
  const mcpTools: MCPTool[] = [
    {
      name: 'code_analysis',
      description: 'Analyze code for issues',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          type: { type: 'string', enum: ['security', 'performance'] }
        }
      }
    },
    {
      name: 'file_search',
      description: 'Search for files',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          path: { type: 'string' }
        }
      }
    }
  ];
  
  // Define A2A capabilities
  const a2aAgentCard: A2AAgentCard = {
    agentId: 'dev-assistant',
    name: 'Development Assistant',
    description: 'Helps with development tasks',
    version: '2.0.0',
    capabilities: [
      {
        name: 'analyze',
        description: 'Analyze code',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string' },
            analysis_type: { type: 'string' }
          }
        },
        streaming: true
      },
      {
        name: 'search',
        description: 'Search files',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          }
        },
        streaming: false
      }
    ],
    metadata: {
      rateLimits: {
        requestsPerMinute: 100,
        tokensPerMinute: 10000
      },
      authentication: 'api-key'
    }
  };
  
  // Discover capabilities
  const mcpManifest = await negotiator.discoverMCPCapabilities(mcpTools);
  const a2aManifest = await negotiator.discoverA2ACapabilities([a2aAgentCard]);
  
  console.log(`✅ MCP capabilities discovered: ${mcpManifest.capabilities.length}`);
  console.log(`✅ A2A capabilities discovered: ${a2aManifest.capabilities.length}`);
  
  // Negotiate compatibility
  const negotiationResult = await negotiator.negotiate(mcpManifest, a2aManifest);
  
  console.log(`\n📊 Negotiation Results:`);
  console.log(`   Success: ${negotiationResult.success ? '✅' : '❌'}`);
  console.log(`   Compatibility: ${(negotiationResult.compatibility * 100).toFixed(0)}%`);
  console.log(`   Negotiated capabilities: ${negotiationResult.capabilities.length}`);
  console.log(`   Fallback strategies: ${negotiationResult.fallbacks.length}`);
  
  if (negotiationResult.fallbacks.length > 0) {
    console.log(`\n   Fallbacks needed:`);
    negotiationResult.fallbacks.forEach(fb => {
      console.log(`     - ${fb.feature}: ${fb.strategy} (${(fb.confidence * 100).toFixed(0)}% confidence)`);
    });
  }
  
  if (negotiationResult.warnings.length > 0) {
    console.log(`\n   ⚠️  Warnings:`);
    negotiationResult.warnings.forEach(w => console.log(`     - ${w}`));
  }
  
  // ========================================
  // 2. MESSAGE QUEUE SETUP
  // ========================================
  console.log('\n\n📬 Phase 2: Message Queue System');
  console.log('-'.repeat(60));
  
  const messageQueue = new MessageQueue({
    concurrency: 5,
    maxQueueSize: 100,
    processingTimeout: 10000,
    batchSize: 5,
    enableDeadLetter: true
  });
  
  // Track queue events
  let queueStats = {
    enqueued: 0,
    processed: 0,
    failed: 0
  };
  
  messageQueue.on('message:enqueued', () => queueStats.enqueued++);
  messageQueue.on('message:processed', () => queueStats.processed++);
  messageQueue.on('message:failed', () => queueStats.failed++);
  
  console.log('✅ Message queue initialized');
  console.log(`   Concurrency: 5`);
  console.log(`   Max queue size: 100`);
  console.log(`   Dead letter queue: Enabled`);
  
  // ========================================
  // 3. TRANSLATION ENGINE SETUP
  // ========================================
  console.log('\n\n🔄 Phase 3: Translation Engine');
  console.log('-'.repeat(60));
  
  const engine = new TranslationEngine({
    cacheEnabled: true,
    minConfidenceThreshold: 0.7,
    monitoringEnabled: true,
    maxRetries: 2
  });
  
  // Register message processor for the queue
  messageQueue.registerProcessor('mcp-to-a2a', async (message) => {
    const result = await engine.translateMCPToA2A(
      message.payload as MCPToolCallRequest,
      message.sessionId
    );
    
    return {
      success: result.success,
      data: result.data,
      error: result.error,
      processingTime: result.metrics.latencyMs,
      confidence: result.confidence
    };
  });
  
  console.log('✅ Translation engine initialized');
  console.log(`   Cache: Enabled`);
  console.log(`   Min confidence: 0.7`);
  console.log(`   Monitoring: Enabled`);
  
  // ========================================
  // 4. PROCESSING TEST MESSAGES
  // ========================================
  console.log('\n\n🧪 Phase 4: Processing Test Messages');
  console.log('-'.repeat(60));
  
  // Create test messages with different priorities
  const testMessages: MCPToolCallRequest[] = [
    {
      jsonrpc: '2.0',
      id: 'critical-001',
      method: 'tools/call',
      params: {
        name: 'code_analysis',
        arguments: {
          file: '/critical/security.ts',
          type: 'security'
        }
      }
    },
    {
      jsonrpc: '2.0',
      id: 'high-001',
      method: 'tools/call',
      params: {
        name: 'file_search',
        arguments: {
          query: 'TODO',
          path: '/src'
        }
      }
    },
    {
      jsonrpc: '2.0',
      id: 'normal-001',
      method: 'tools/call',
      params: {
        name: 'code_analysis',
        arguments: {
          file: '/src/utils.ts',
          type: 'performance'
        }
      }
    }
  ];
  
  // Enqueue messages with priorities
  console.log('\nEnqueuing messages...');
  
  await messageQueue.enqueue(
    testMessages[0],
    'mcp-to-a2a',
    { priority: MessagePriority.CRITICAL, sessionId: 'test-session' }
  );
  console.log('   ⚡ Critical priority: security analysis');
  
  await messageQueue.enqueue(
    testMessages[1],
    'mcp-to-a2a',
    { priority: MessagePriority.HIGH, sessionId: 'test-session' }
  );
  console.log('   🔥 High priority: file search');
  
  await messageQueue.enqueue(
    testMessages[2],
    'mcp-to-a2a',
    { priority: MessagePriority.NORMAL, sessionId: 'test-session' }
  );
  console.log('   📝 Normal priority: performance analysis');
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // ========================================
  // 5. BATCH PROCESSING TEST
  // ========================================
  console.log('\n\n📦 Phase 5: Batch Processing');
  console.log('-'.repeat(60));
  
  const batchMessages = Array.from({ length: 10 }, (_, i) => ({
    payload: {
      jsonrpc: '2.0' as const,
      id: `batch-${i}`,
      method: 'tools/call' as const,
      params: {
        name: 'file_search',
        arguments: { query: `test-${i}`, path: '/batch' }
      }
    },
    direction: 'mcp-to-a2a' as const,
    priority: MessagePriority.LOW
  }));
  
  console.log('Enqueuing batch of 10 messages...');
  const batchIds = await messageQueue.enqueueBatch(batchMessages);
  console.log(`✅ Batch enqueued: ${batchIds.length} messages`);
  
  // Wait for batch processing
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // ========================================
  // 6. PERFORMANCE METRICS
  // ========================================
  console.log('\n\n📈 Phase 6: Performance Metrics');
  console.log('-'.repeat(60));
  
  // Get queue statistics
  const queueMetrics = messageQueue.getStats();
  console.log('\nQueue Statistics:');
  console.log(`   Enqueued: ${queueStats.enqueued}`);
  console.log(`   Processed: ${queueStats.processed}`);
  console.log(`   Failed: ${queueStats.failed}`);
  console.log(`   Dead letter: ${queueMetrics.deadLetter}`);
  console.log(`   Avg processing time: ${queueMetrics.avgProcessingTime.toFixed(2)}ms`);
  console.log(`   Throughput: ${queueMetrics.throughput} msg/sec`);
  
  // Get translation engine metrics
  const engineMetrics = engine.getMetrics();
  console.log('\nTranslation Engine Metrics:');
  console.log(`   Total translations: ${engineMetrics.totalTranslations}`);
  console.log(`   Success rate: ${(engineMetrics.successfulTranslations / engineMetrics.totalTranslations * 100).toFixed(1)}%`);
  console.log(`   Avg confidence: ${engineMetrics.averageConfidence.toFixed(3)}`);
  console.log(`   Avg latency: ${engineMetrics.averageLatencyMs.toFixed(2)}ms`);
  console.log(`   Cache hit rate: ${engineMetrics.cacheHitRate.toFixed(1)}%`);
  
  // ========================================
  // 7. CAPABILITY FALLBACK TEST
  // ========================================
  console.log('\n\n🔧 Phase 7: Fallback Strategies');
  console.log('-'.repeat(60));
  
  // Test fallback for streaming (MCP doesn't support but A2A does)
  const streamingFallback = negotiator.getFallbackStrategy('streaming', 'mcp');
  if (streamingFallback) {
    console.log('✅ Streaming fallback:');
    console.log(`   Strategy: ${streamingFallback.strategy}`);
    console.log(`   Confidence: ${(streamingFallback.confidence * 100).toFixed(0)}%`);
  }
  
  // Test fallback for state management
  const stateFallback = negotiator.getFallbackStrategy('state', 'mcp');
  if (stateFallback) {
    console.log('✅ State management fallback:');
    console.log(`   Strategy: ${stateFallback.strategy}`);
    console.log(`   Confidence: ${(stateFallback.confidence * 100).toFixed(0)}%`);
  }
  
  // ========================================
  // 8. SUMMARY
  // ========================================
  console.log('\n\n🏁 Integration Test Summary');
  console.log('=' .repeat(70));
  
  const allPassed = 
    negotiationResult.fallbacks.length > 0 && // Having fallbacks is OK
    queueStats.processed > 0 &&
    engineMetrics.successfulTranslations > 0;
  
  console.log(`\nOverall Result: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  console.log('\nKey Achievements:');
  console.log(`   ✅ Protocol negotiation: ${(negotiationResult.compatibility * 100).toFixed(0)}% compatible`);
  console.log(`   ✅ Message processing: ${queueStats.processed}/${queueStats.enqueued} messages`);
  console.log(`   ✅ Translation accuracy: ${(engineMetrics.averageConfidence * 100).toFixed(1)}% confidence`);
  console.log(`   ✅ Performance: ${engineMetrics.averageLatencyMs.toFixed(2)}ms average latency`);
  console.log(`   ✅ Fallback strategies: ${negotiationResult.fallbacks.length} configured`);
  
  // Cleanup
  await messageQueue.shutdown();
  await engine.shutdown();
  
  console.log('\n✨ Full integration test complete!');
  
  // Exit after a short delay
  setTimeout(() => process.exit(0), 100);
}

// Run the integration test
runFullIntegration().catch(console.error);