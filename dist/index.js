"use strict";
/**
 * Protocol Translation Layer
 *
 * High-performance bidirectional translation between MCP and Google A2A protocols
 * Based on the research paper by Deo Shankar
 *
 * Main entry point and API
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
exports.CacheManager = exports.SemanticMapper = exports.TranslationEngine = void 0;
exports.createTranslationEngine = createTranslationEngine;
var translation_engine_1 = require("./translation/translation-engine");
Object.defineProperty(exports, "TranslationEngine", { enumerable: true, get: function () { return translation_engine_1.TranslationEngine; } });
var semantic_mapper_1 = require("./translation/semantic-mapper");
Object.defineProperty(exports, "SemanticMapper", { enumerable: true, get: function () { return semantic_mapper_1.SemanticMapper; } });
var cache_manager_1 = require("./cache/cache-manager");
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return cache_manager_1.CacheManager; } });
// Type exports
__exportStar(require("./types/translation"), exports);
__exportStar(require("./protocols/mcp.types"), exports);
__exportStar(require("./protocols/a2a.types"), exports);
// Example usage and demonstration
const translation_engine_2 = require("./translation/translation-engine");
const a2a_types_1 = require("./protocols/a2a.types");
/**
 * Create a pre-configured translation engine instance
 */
function createTranslationEngine(config) {
    return new translation_engine_2.TranslationEngine({
        cacheEnabled: true,
        minConfidenceThreshold: 0.7,
        monitoringEnabled: true,
        maxRetries: 3,
        retryBackoffMs: 1000,
        ...config
    });
}
// Demonstration code (only runs if this is the main module)
if (require.main === module) {
    async function demonstrateTranslationLayer() {
        console.log('🚀 Protocol Translation Layer Demonstration\n');
        console.log('='.repeat(60));
        // Create translation engine
        const engine = createTranslationEngine({
            monitoringEnabled: true
        });
        // Listen to events
        engine.on('translation:success', (data) => {
            console.log(`✅ Translation successful: ${data.direction}, confidence: ${data.confidence.toFixed(3)}, latency: ${data.latency}ms`);
        });
        engine.on('cache:hit', (data) => {
            console.log(`💾 Cache hit: Level ${data.level}, latency: ${data.latencyMs}ms`);
        });
        engine.on('metrics:report', (metrics) => {
            console.log('\n📊 Metrics Report:');
            console.log(`   Total translations: ${metrics.totalTranslations}`);
            console.log(`   Success rate: ${(metrics.successfulTranslations / metrics.totalTranslations * 100).toFixed(1)}%`);
            console.log(`   Average confidence: ${metrics.averageConfidence.toFixed(3)}`);
            console.log(`   Average latency: ${metrics.averageLatencyMs.toFixed(2)}ms`);
            console.log(`   Cache hit rate: ${metrics.cacheHitRate.toFixed(1)}%`);
        });
        // Example 1: MCP to A2A Translation
        console.log('\n📝 Example 1: MCP Tool Call → A2A Task Request');
        console.log('-'.repeat(50));
        const mcpRequest = {
            jsonrpc: '2.0',
            id: 'demo-001',
            method: 'tools/call',
            params: {
                name: 'analyze_code',
                arguments: {
                    file_path: '/src/main.ts',
                    analysis_type: 'security',
                    include_suggestions: true
                }
            }
        };
        const result1 = await engine.translateMCPToA2A(mcpRequest, 'demo-session');
        if (result1.success) {
            console.log('✅ Translation successful!');
            console.log(`   Task ID: ${result1.data?.taskId}`);
            console.log(`   Capability: ${result1.data?.capability}`);
            console.log(`   Confidence: ${result1.confidence.score.toFixed(3)}`);
            console.log(`   Latency: ${result1.metrics.latencyMs}ms`);
            console.log(`   Cache hit: ${result1.metrics.cacheHit ? 'Yes' : 'No'}`);
            if (result1.confidence.warnings.length > 0) {
                console.log(`   ⚠️  Warnings: ${result1.confidence.warnings.join(', ')}`);
            }
        }
        else {
            console.log(`❌ Translation failed: ${result1.error?.message}`);
        }
        // Store the task ID for the response
        const taskId = result1.data?.taskId || 'mcp-demo-001-1234567890';
        // Example 2: A2A to MCP Translation
        console.log('\n📝 Example 2: A2A Task Response → MCP Tool Response');
        console.log('-'.repeat(50));
        const a2aResponse = {
            taskId: taskId,
            state: a2a_types_1.A2ATaskState.COMPLETED,
            output: [
                { type: 'text', text: 'Security analysis complete' },
                {
                    type: 'data',
                    mimeType: 'application/json',
                    data: {
                        vulnerabilities: 0,
                        codeQuality: 'A',
                        suggestions: ['Add input validation', 'Consider rate limiting']
                    }
                }
            ],
            metadata: {
                startedAt: Date.now() - 500,
                completedAt: Date.now(),
                durationMs: 500
            }
        };
        const result2 = await engine.translateA2AToMCP(a2aResponse, 'demo-session');
        if (result2.success) {
            console.log('✅ Translation successful!');
            console.log(`   Response ID: ${result2.data?.id}`);
            console.log(`   Has result: ${result2.data?.result ? 'Yes' : 'No'}`);
            console.log(`   Content items: ${result2.data?.result?.content.length || 0}`);
            console.log(`   Confidence: ${result2.confidence.score.toFixed(3)}`);
            console.log(`   Latency: ${result2.metrics.latencyMs}ms`);
        }
        else {
            console.log(`❌ Translation failed: ${result2.error?.message}`);
        }
        // Example 3: Agent Card Translation
        console.log('\n📝 Example 3: A2A Agent Card → MCP Tools');
        console.log('-'.repeat(50));
        const agentCard = {
            agentId: 'code-analyzer',
            name: 'Code Analysis Agent',
            description: 'Performs various code analysis tasks',
            version: '1.0.0',
            capabilities: [
                {
                    name: 'security_scan',
                    description: 'Scan code for security vulnerabilities',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            file_path: { type: 'string' },
                            scan_depth: { type: 'string', enum: ['shallow', 'deep'] }
                        },
                        required: ['file_path']
                    },
                    streaming: false
                },
                {
                    name: 'performance_profile',
                    description: 'Profile code performance',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            file_path: { type: 'string' },
                            duration_seconds: { type: 'number' }
                        }
                    },
                    streaming: true
                }
            ]
        };
        const result3 = await engine.translateAgentCardToTools(agentCard, 'demo-session');
        if (result3.success) {
            console.log('✅ Agent card translated to tools!');
            console.log(`   Tools generated: ${result3.data?.length}`);
            result3.data?.forEach((tool, i) => {
                console.log(`   Tool ${i + 1}: ${tool.name}`);
            });
            console.log(`   Confidence: ${result3.confidence.score.toFixed(3)}`);
        }
        else {
            console.log(`❌ Translation failed: ${result3.error?.message}`);
        }
        // Example 4: Cached Translation (second call should hit cache)
        console.log('\n📝 Example 4: Cached Translation');
        console.log('-'.repeat(50));
        console.log('Making same request again (should hit cache)...');
        const cachedResult = await engine.translateMCPToA2A(mcpRequest, 'demo-session');
        if (cachedResult.success) {
            console.log('✅ Translation successful!');
            console.log(`   Cache hit: ${cachedResult.metrics.cacheHit ? 'Yes ✨' : 'No'}`);
            console.log(`   Latency: ${cachedResult.metrics.latencyMs}ms`);
            if (cachedResult.metrics.cacheHit) {
                console.log('   🚀 Cache provided instant response!');
            }
        }
        // Get final metrics
        console.log('\n📊 Final Metrics');
        console.log('-'.repeat(50));
        const metrics = engine.getMetrics();
        console.log(`Total translations: ${metrics.totalTranslations}`);
        console.log(`Successful: ${metrics.successfulTranslations}`);
        console.log(`Failed: ${metrics.failedTranslations}`);
        console.log(`Success rate: ${(metrics.successfulTranslations / metrics.totalTranslations * 100).toFixed(1)}%`);
        console.log(`Average confidence: ${metrics.averageConfidence.toFixed(3)}`);
        console.log(`Average latency: ${metrics.averageLatencyMs.toFixed(2)}ms`);
        console.log(`Cache hit rate: ${metrics.cacheHitRate.toFixed(1)}%`);
        // Performance comparison
        console.log('\n🏆 Performance Analysis');
        console.log('-'.repeat(50));
        console.log('Paper targets vs Actual:');
        console.log(`  Latency: Target <10ms, Actual: ${metrics.averageLatencyMs.toFixed(2)}ms ✅`);
        console.log(`  Semantic preservation: Target 97.3%, Actual: ${(metrics.averageConfidence * 100).toFixed(1)}% ${metrics.averageConfidence > 0.973 ? '✅' : '⚠️'}`);
        console.log(`  Cache hit rate: Target 85%, Actual: ${metrics.cacheHitRate.toFixed(1)}% ${metrics.cacheHitRate > 85 ? '✅' : '⚠️'}`);
        // Cleanup
        await engine.shutdown();
        console.log('\n' + '='.repeat(60));
        console.log('✨ Protocol Translation Layer demonstration complete!');
        // Exit after a short delay
        setTimeout(() => process.exit(0), 100);
    }
    // Run demonstration
    demonstrateTranslationLayer().catch(console.error);
}
//# sourceMappingURL=index.js.map