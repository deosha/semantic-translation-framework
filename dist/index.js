"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskCentricAdapter = exports.ToolCentricAdapter = exports.CacheManager = exports.TranslationErrorType = exports.SemanticTranslationError = exports.ProtocolParadigm = exports.SemanticTranslationEngine = void 0;
exports.createSemanticEngine = createSemanticEngine;
// Core engine exports
var semantic_translation_engine_1 = require("./translation/semantic-translation-engine");
Object.defineProperty(exports, "SemanticTranslationEngine", { enumerable: true, get: function () { return semantic_translation_engine_1.SemanticTranslationEngine; } });
// Protocol types exports
var protocols_1 = require("./types/protocols");
Object.defineProperty(exports, "ProtocolParadigm", { enumerable: true, get: function () { return protocols_1.ProtocolParadigm; } });
// Semantic translation types exports
var semantic_translation_1 = require("./types/semantic-translation");
Object.defineProperty(exports, "SemanticTranslationError", { enumerable: true, get: function () { return semantic_translation_1.SemanticTranslationError; } });
Object.defineProperty(exports, "TranslationErrorType", { enumerable: true, get: function () { return semantic_translation_1.TranslationErrorType; } });
// Protocol-specific types exports
__exportStar(require("./protocols/tool-centric.types"), exports);
__exportStar(require("./protocols/task-centric.types"), exports);
// Cache manager export
var cache_manager_1 = require("./cache/cache-manager");
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return cache_manager_1.CacheManager; } });
// Utility functions
const semantic_translation_engine_2 = require("./translation/semantic-translation-engine");
const protocols_2 = require("./types/protocols");
/**
 * Create a pre-configured semantic translation engine
 */
function createSemanticEngine(config) {
    return new semantic_translation_engine_2.SemanticTranslationEngine({
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
class ToolCentricAdapter {
    manifest = {
        id: 'tool-centric-v1',
        name: 'Tool-Centric Protocol',
        version: '1.0.0',
        paradigm: protocols_2.ProtocolParadigm.TOOL_CENTRIC,
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
    parseMessage(raw) {
        // Parse tool-centric message format
        return {
            id: raw.id || generateId(),
            type: 'request',
            paradigm: protocols_2.ProtocolParadigm.TOOL_CENTRIC,
            timestamp: Date.now(),
            payload: raw
        };
    }
    serializeMessage(message) {
        return message.payload;
    }
    extractIntent(message) {
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
    reconstructMessage(intent) {
        return {
            id: generateId(),
            type: 'request',
            paradigm: protocols_2.ProtocolParadigm.TOOL_CENTRIC,
            timestamp: Date.now(),
            payload: {
                toolName: intent.target.identifier,
                arguments: intent.parameters
            }
        };
    }
    validateMessage(message) {
        return !!(message.payload && message.payload.toolName);
    }
    getMetadata() {
        return {
            transport: ['http', 'websocket', 'stdio'],
            encoding: 'json',
            authentication: 'optional'
        };
    }
}
exports.ToolCentricAdapter = ToolCentricAdapter;
/**
 * Example protocol adapter for task-centric paradigm
 */
class TaskCentricAdapter {
    manifest = {
        id: 'task-centric-v1',
        name: 'Task-Centric Protocol',
        version: '1.0.0',
        paradigm: protocols_2.ProtocolParadigm.TASK_CENTRIC,
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
    parseMessage(raw) {
        return {
            id: raw.messageId || generateId(),
            type: raw.type || 'request',
            paradigm: protocols_2.ProtocolParadigm.TASK_CENTRIC,
            timestamp: raw.metadata?.timestamp || Date.now(),
            payload: raw,
            sessionId: raw.context?.sessionId,
            correlationId: raw.correlationId
        };
    }
    serializeMessage(message) {
        return message.payload;
    }
    extractIntent(message) {
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
    reconstructMessage(intent) {
        return {
            id: generateId(),
            type: 'task_request',
            paradigm: protocols_2.ProtocolParadigm.TASK_CENTRIC,
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
    validateMessage(message) {
        return !!(message.payload && message.payload.task && message.payload.task.taskType);
    }
    getMetadata() {
        return {
            transport: ['websocket', 'grpc', 'http2'],
            encoding: 'json',
            authentication: 'required',
            features: ['streaming', 'state-management']
        };
    }
}
exports.TaskCentricAdapter = TaskCentricAdapter;
// Helper function
function generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
// Demonstration code
if (require.main === module) {
    async function demonstrateSemanticTranslation() {
        console.log('🚀 Semantic Protocol Translation Framework Demonstration\n');
        console.log('='.repeat(60));
        // Create engine
        const engine = createSemanticEngine();
        // Register protocol adapters
        const toolAdapter = new ToolCentricAdapter();
        const taskAdapter = new TaskCentricAdapter();
        engine.registerAdapter(protocols_2.ProtocolParadigm.TOOL_CENTRIC, toolAdapter);
        engine.registerAdapter(protocols_2.ProtocolParadigm.TASK_CENTRIC, taskAdapter);
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
            type: 'request',
            paradigm: protocols_2.ProtocolParadigm.TOOL_CENTRIC,
            timestamp: Date.now(),
            payload: {
                toolName: 'analyze_code',
                arguments: {
                    file_path: '/src/main.ts',
                    analysis_type: 'security'
                }
            }
        };
        const result1 = await engine.translate(toolMessage, protocols_2.ProtocolParadigm.TASK_CENTRIC, 'demo-session');
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
        const negotiation = await engine.negotiateCapabilities(protocols_2.ProtocolParadigm.TASK_CENTRIC, protocols_2.ProtocolParadigm.TOOL_CENTRIC);
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
            type: 'request',
            paradigm: protocols_2.ProtocolParadigm.TASK_CENTRIC,
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
                        priority: 'high'
                    }
                },
                context: {
                    sessionId: 'session-001',
                    conversationId: 'conv-001'
                }
            },
            sessionId: 'session-001'
        };
        const result2 = await engine.translate(taskMessage, protocols_2.ProtocolParadigm.TOOL_CENTRIC, 'demo-session');
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
//# sourceMappingURL=index.js.map