/**
 * Semantic Protocol Translation Framework
 * 
 * A high-performance, semantic-aware protocol translation system for
 * AI agent interoperability across different paradigms.
 * 
 * Based on the research paper: "Semantic Protocol Translation for AI Agent Interoperability"
 * by Deo Shankar, Tiger Analytics
 * 
 * Main entry point for the semantic translation framework
 */

// Core engine exports
export { 
  SemanticTranslationEngine, 
  SemanticEngineConfig 
} from './translation/semantic-translation-engine';

// Protocol types exports
export {
  ProtocolParadigm,
  ProtocolMessage,
  ProtocolAdapter,
  ProtocolManifest,
  ProtocolFeatures,
  SemanticIntent,
  ToolDefinition,
  TaskDefinition,
  AgentCapability,
  ToolInvocationRequest,
  ToolInvocationResponse,
  TaskRequest,
  TaskResponse
} from './types/protocols';

// Semantic translation types exports
export {
  TranslationConfidence,
  SemanticTranslationContext,
  TranslationResult,
  TranslationMetrics,
  SemanticTranslationError,
  TranslationErrorType,
  CapabilityGap,
  FallbackStrategy,
  NegotiationResult,
  CachedTranslation
} from './types/semantic-translation';

// Protocol-specific types exports
export * from './protocols/tool-centric.types';
export * from './protocols/task-centric.types';

// Cache manager export
export { CacheManager } from './cache/cache-manager';

// Utility functions
import { SemanticTranslationEngine } from './translation/semantic-translation-engine';
import { ProtocolParadigm, ProtocolAdapter, ProtocolManifest } from './types/protocols';

/**
 * Create a pre-configured semantic translation engine
 */
export function createSemanticEngine(config?: any): SemanticTranslationEngine {
  return new SemanticTranslationEngine({
    cacheEnabled: true,
    minConfidenceThreshold: 0.7,
    monitoringEnabled: true,
    maxRetries: 3,
    retryBackoffMs: 1000,
    fallbackEnabled: true,
    ...config
  });
}

/**
 * Example protocol adapter for tool-centric paradigm
 */
export class ToolCentricAdapter implements ProtocolAdapter {
  manifest: ProtocolManifest = {
    id: 'tool-centric-v1',
    name: 'Tool-Centric Protocol',
    version: '1.0.0',
    paradigm: ProtocolParadigm.TOOL_CENTRIC,
    features: {
      streaming: false,
      stateful: false,
      multiModal: false,
      batching: true,
      transactions: false,
      async: true,
      partialResults: false,
      discovery: true
    },
    capabilities: [],
    constraints: {
      maxMessageSize: 1048576, // 1MB
      maxConcurrentRequests: 100,
      requestTimeout: 30000 // 30s
    }
  };

  parseMessage(raw: any): any {
    // Parse tool-centric message format
    return {
      id: raw.id || generateId(),
      type: 'request',
      paradigm: ProtocolParadigm.TOOL_CENTRIC,
      timestamp: Date.now(),
      payload: raw
    };
  }

  serializeMessage(message: any): any {
    return message.payload;
  }

  extractIntent(message: any): any {
    const payload = message.payload;
    return {
      action: 'execute',
      target: {
        type: 'tool',
        identifier: payload.toolName || payload.name,
        description: payload.description
      },
      parameters: payload.arguments || {},
      context: {
        session: message.sessionId
      }
    };
  }

  reconstructMessage(intent: any): any {
    return {
      id: generateId(),
      type: 'request',
      paradigm: ProtocolParadigm.TOOL_CENTRIC,
      timestamp: Date.now(),
      payload: {
        toolName: intent.target.identifier,
        arguments: intent.parameters
      }
    };
  }

  validateMessage(message: any): boolean {
    return !!(message.payload && message.payload.toolName);
  }

  getMetadata(): Record<string, any> {
    return {
      transport: ['http', 'websocket', 'stdio'],
      encoding: 'json',
      authentication: 'optional'
    };
  }
}

/**
 * Example protocol adapter for task-centric paradigm
 */
export class TaskCentricAdapter implements ProtocolAdapter {
  manifest: ProtocolManifest = {
    id: 'task-centric-v1',
    name: 'Task-Centric Protocol',
    version: '1.0.0',
    paradigm: ProtocolParadigm.TASK_CENTRIC,
    features: {
      streaming: true,
      stateful: true,
      multiModal: true,
      batching: false,
      transactions: true,
      async: true,
      partialResults: true,
      discovery: true
    },
    capabilities: [],
    constraints: {
      maxMessageSize: 10485760, // 10MB
      maxConcurrentRequests: 50,
      requestTimeout: 300000 // 5min
    }
  };

  parseMessage(raw: any): any {
    return {
      id: raw.messageId || generateId(),
      type: raw.type || 'request',
      paradigm: ProtocolParadigm.TASK_CENTRIC,
      timestamp: raw.metadata?.timestamp || Date.now(),
      payload: raw,
      sessionId: raw.context?.sessionId,
      correlationId: raw.correlationId
    };
  }

  serializeMessage(message: any): any {
    return message.payload;
  }

  extractIntent(message: any): any {
    const payload = message.payload;
    return {
      action: 'process',
      target: {
        type: 'task',
        identifier: payload.task?.taskType,
        description: payload.task?.description
      },
      parameters: payload.task?.input || {},
      constraints: {
        timeout: payload.task?.config?.timeout,
        priority: payload.task?.config?.priority
      },
      context: {
        session: payload.context?.sessionId,
        conversation: payload.context?.conversationId
      }
    };
  }

  reconstructMessage(intent: any): any {
    return {
      id: generateId(),
      type: 'task_request',
      paradigm: ProtocolParadigm.TASK_CENTRIC,
      timestamp: Date.now(),
      payload: {
        messageId: generateId(),
        type: 'task_request',
        task: {
          taskType: intent.target.identifier,
          description: intent.target.description,
          input: intent.parameters,
          config: {
            priority: intent.constraints?.priority,
            timeout: intent.constraints?.timeout
          }
        },
        context: {
          sessionId: intent.context?.session,
          conversationId: intent.context?.conversation
        }
      },
      sessionId: intent.context?.session
    };
  }

  validateMessage(message: any): boolean {
    return !!(message.payload && message.payload.task && message.payload.task.taskType);
  }

  getMetadata(): Record<string, any> {
    return {
      transport: ['websocket', 'grpc', 'http2'],
      encoding: 'json',
      authentication: 'required',
      features: ['streaming', 'state-management']
    };
  }
}

// Helper function
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Demonstration code
if (require.main === module) {
  async function demonstrateSemanticTranslation() {
    console.log('🚀 Semantic Protocol Translation Framework Demonstration\n');
    console.log('=' .repeat(60));
    
    // Create engine
    const engine = createSemanticEngine();
    
    // Register protocol adapters
    const toolAdapter = new ToolCentricAdapter();
    const taskAdapter = new TaskCentricAdapter();
    
    engine.registerAdapter(ProtocolParadigm.TOOL_CENTRIC, toolAdapter);
    engine.registerAdapter(ProtocolParadigm.TASK_CENTRIC, taskAdapter);
    
    // Listen to events
    engine.on('translation:success', (data) => {
      console.log(`✅ Translation: ${data.source} → ${data.target}, confidence: ${data.confidence.toFixed(3)}`);
    });
    
    engine.on('adapter:registered', (data) => {
      console.log(`📦 Adapter registered: ${data.paradigm}`);
    });
    
    // Example 1: Tool-Centric to Task-Centric
    console.log('\n📝 Example 1: Tool-Centric → Task-Centric');
    console.log('-'.repeat(50));
    
    const toolMessage = {
      id: 'tool-001',
      type: 'request' as const,
      paradigm: ProtocolParadigm.TOOL_CENTRIC,
      timestamp: Date.now(),
      payload: {
        toolName: 'analyze_code',
        arguments: {
          file_path: '/src/main.ts',
          analysis_type: 'security'
        }
      }
    };
    
    const result1 = await engine.translate(
      toolMessage,
      ProtocolParadigm.TASK_CENTRIC,
      'demo-session'
    );
    
    if (result1.success) {
      console.log('✅ Translation successful!');
      console.log(`   Confidence: ${result1.confidence.score.toFixed(3)}`);
      console.log(`   Semantic preservation: ${(result1.confidence.factors.semanticMatch * 100).toFixed(1)}%`);
      console.log(`   Data preservation: ${(result1.confidence.factors.dataPreservation * 100).toFixed(1)}%`);
      console.log(`   Latency: ${result1.metrics.latencyMs}ms`);
    }
    
    // Example 2: Capability Negotiation
    console.log('\n📝 Example 2: Capability Negotiation');
    console.log('-'.repeat(50));
    
    const negotiation = await engine.negotiateCapabilities(
      ProtocolParadigm.TASK_CENTRIC,
      ProtocolParadigm.TOOL_CENTRIC
    );
    
    console.log(`Compatibility: ${(negotiation.compatibility * 100).toFixed(1)}%`);
    console.log(`Fallback strategies needed: ${negotiation.fallbacks.length}`);
    negotiation.fallbacks.forEach(fb => {
      console.log(`  - ${fb.name}: ${fb.feature} (${fb.type})`);
    });
    
    // Example 3: Task-Centric to Tool-Centric (reverse)
    console.log('\n📝 Example 3: Task-Centric → Tool-Centric');
    console.log('-'.repeat(50));
    
    const taskMessage = {
      id: 'task-001',
      type: 'request' as const,
      paradigm: ProtocolParadigm.TASK_CENTRIC,
      timestamp: Date.now(),
      payload: {
        messageId: 'msg-001',
        type: 'task_request',
        task: {
          taskType: 'code_review',
          description: 'Review code for best practices',
          input: {
            repository: 'protocol-translation-layer',
            branch: 'main'
          },
          config: {
            streaming: true,
            priority: 'high' as const
          }
        },
        context: {
          sessionId: 'session-001',
          conversationId: 'conv-001'
        }
      },
      sessionId: 'session-001'
    };
    
    const result2 = await engine.translate(
      taskMessage,
      ProtocolParadigm.TOOL_CENTRIC,
      'demo-session'
    );
    
    if (result2.success) {
      console.log('✅ Translation successful!');
      console.log(`   Confidence: ${result2.confidence.score.toFixed(3)}`);
      if (result2.confidence.lossyTranslation) {
        console.log('   ⚠️  Lossy translation (some features degraded)');
      }
      console.log(`   Fallbacks used: ${result2.metrics.fallbacksUsed.join(', ') || 'none'}`);
    }
    
    // Get metrics
    console.log('\n📊 Final Metrics');
    console.log('-'.repeat(50));
    
    const metrics = engine.getMetrics();
    console.log(`Total translations: ${metrics.totalTranslations}`);
    console.log(`Success rate: ${((metrics.successfulTranslations / metrics.totalTranslations) * 100).toFixed(1)}%`);
    console.log(`Average confidence: ${metrics.averageConfidence.toFixed(3)}`);
    console.log(`Average latency: ${metrics.averageLatencyMs.toFixed(2)}ms`);
    
    // Cleanup
    await engine.shutdown();
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Semantic Translation Framework demonstration complete!');
    
    process.exit(0);
  }
  
  // Run demonstration
  demonstrateSemanticTranslation().catch(console.error);
}