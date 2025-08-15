"use strict";
/**
 * Bidirectional Translation Engine
 *
 * This is the core engine that orchestrates the translation between
 * MCP and Google A2A protocols. It integrates:
 * - Semantic mapping for protocol translation
 * - Multi-level caching for performance
 * - Error handling and recovery
 * - Performance monitoring
 *
 * Based on paper Section IV: Implementation and Optimization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationEngine = void 0;
const events_1 = require("events");
const translation_1 = require("../types/translation");
const semantic_mapper_1 = require("./semantic-mapper");
const cache_manager_1 = require("../cache/cache-manager");
/**
 * Main Translation Engine
 *
 * Provides bidirectional translation between MCP and A2A protocols
 */
class TranslationEngine extends events_1.EventEmitter {
    semanticMapper;
    cacheManager;
    config;
    metrics;
    contexts;
    constructor(config) {
        super();
        // Initialize configuration with defaults
        this.config = {
            cacheEnabled: true,
            redisOptions: {},
            minConfidenceThreshold: 0.7,
            monitoringEnabled: true,
            maxRetries: 3,
            retryBackoffMs: 1000,
            ...config
        };
        // Initialize components
        this.semanticMapper = new semantic_mapper_1.SemanticMapper();
        this.cacheManager = this.config.cacheEnabled
            ? new cache_manager_1.CacheManager(this.config.redisOptions)
            : null;
        // Initialize metrics
        this.metrics = {
            totalTranslations: 0,
            successfulTranslations: 0,
            failedTranslations: 0,
            averageConfidence: 0,
            averageLatencyMs: 0,
            cacheHitRate: 0,
            activeTranslations: 0
        };
        // Context storage for maintaining state
        this.contexts = new Map();
        // Setup cache event handlers
        if (this.cacheManager) {
            this.setupCacheHandlers();
        }
        // Start metrics reporting if monitoring enabled
        if (this.config.monitoringEnabled) {
            this.startMetricsReporting();
        }
    }
    /**
     * Translate MCP Tool Call to A2A Task Request
     *
     * Handles the stateless to stateful conversion with caching
     */
    async translateMCPToA2A(request, sessionId) {
        const startTime = Date.now();
        this.metrics.activeTranslations++;
        this.metrics.totalTranslations++;
        try {
            // Get or create context
            const context = this.getOrCreateContext(sessionId || 'default', 'mcp-to-a2a');
            // Check cache first
            if (this.cacheManager) {
                const cacheKey = this.cacheManager.generateCacheKey(request, 'mcp-to-a2a', context);
                const cached = await this.cacheManager.get(cacheKey);
                if (cached) {
                    const latency = Date.now() - startTime;
                    this.updateMetrics(true, cached.confidence.score, latency, true);
                    this.emit('translation:cache-hit', {
                        direction: 'mcp-to-a2a',
                        latency,
                        confidence: cached.confidence.score
                    });
                    return {
                        success: true,
                        data: cached.data,
                        confidence: cached.confidence,
                        metrics: {
                            latencyMs: latency,
                            cacheHit: true,
                            retryCount: 0
                        }
                    };
                }
            }
            // Perform translation with retry logic
            let lastError;
            let retryCount = 0;
            for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
                try {
                    // Translate using semantic mapper
                    const { task, confidence } = this.semanticMapper.mapMCPToolCallToA2ATask(request, context);
                    // Check confidence threshold
                    if (confidence.score < this.config.minConfidenceThreshold) {
                        throw new translation_1.TranslationError(`Translation confidence ${confidence.score.toFixed(2)} below threshold ${this.config.minConfidenceThreshold}`, translation_1.TranslationErrorType.SEMANTIC, true, {
                            maxRetries: 1,
                            backoffMs: this.config.retryBackoffMs,
                            fallbackAction: 'use-default-mapping'
                        });
                    }
                    // Cache successful translation
                    if (this.cacheManager) {
                        const cacheKey = this.cacheManager.generateCacheKey(request, 'mcp-to-a2a', context);
                        await this.cacheManager.set(cacheKey, task, confidence);
                    }
                    // Update context history
                    context.translationHistory.push({
                        messageId: request.id.toString(),
                        timestamp: Date.now(),
                        confidence: confidence.score
                    });
                    const latency = Date.now() - startTime;
                    this.updateMetrics(true, confidence.score, latency, false);
                    this.emit('translation:success', {
                        direction: 'mcp-to-a2a',
                        latency,
                        confidence: confidence.score,
                        warnings: confidence.warnings
                    });
                    return {
                        success: true,
                        data: task,
                        confidence,
                        metrics: {
                            latencyMs: latency,
                            cacheHit: false,
                            retryCount
                        }
                    };
                }
                catch (error) {
                    retryCount++;
                    lastError = error instanceof translation_1.TranslationError
                        ? error
                        : new translation_1.TranslationError(String(error), translation_1.TranslationErrorType.UNKNOWN, false);
                    if (attempt < this.config.maxRetries) {
                        // Wait before retry with exponential backoff
                        const backoff = this.config.retryBackoffMs * Math.pow(2, attempt);
                        await this.sleep(backoff);
                        this.emit('translation:retry', {
                            direction: 'mcp-to-a2a',
                            attempt: attempt + 1,
                            error: lastError.message
                        });
                    }
                }
            }
            // Translation failed after all retries
            const latency = Date.now() - startTime;
            this.updateMetrics(false, 0, latency, false);
            this.emit('translation:error', {
                direction: 'mcp-to-a2a',
                error: lastError?.message,
                latency
            });
            return {
                success: false,
                error: lastError,
                confidence: {
                    score: 0,
                    factors: {
                        semanticMatch: 0,
                        structuralAlignment: 0,
                        dataPreservation: 0,
                        contextRetention: 0
                    },
                    warnings: ['Translation failed'],
                    lossyTranslation: true
                },
                metrics: {
                    latencyMs: latency,
                    cacheHit: false,
                    retryCount
                }
            };
        }
        finally {
            this.metrics.activeTranslations--;
        }
    }
    /**
     * Translate A2A Task Response to MCP Tool Call Response
     *
     * Handles the stateful to stateless conversion
     */
    async translateA2AToMCP(response, sessionId) {
        const startTime = Date.now();
        this.metrics.activeTranslations++;
        this.metrics.totalTranslations++;
        try {
            // Get or create context
            const context = this.getOrCreateContext(sessionId || 'default', 'a2a-to-mcp');
            // Check cache first
            if (this.cacheManager) {
                const cacheKey = this.cacheManager.generateCacheKey(response, 'a2a-to-mcp', context);
                const cached = await this.cacheManager.get(cacheKey);
                if (cached) {
                    const latency = Date.now() - startTime;
                    this.updateMetrics(true, cached.confidence.score, latency, true);
                    return {
                        success: true,
                        data: cached.data,
                        confidence: cached.confidence,
                        metrics: {
                            latencyMs: latency,
                            cacheHit: true,
                            retryCount: 0
                        }
                    };
                }
            }
            // Translate using semantic mapper
            const { response: mcpResponse, confidence } = this.semanticMapper.mapA2ATaskToMCPResponse(response, context);
            // Cache successful translation
            if (this.cacheManager) {
                const cacheKey = this.cacheManager.generateCacheKey(response, 'a2a-to-mcp', context);
                await this.cacheManager.set(cacheKey, mcpResponse, confidence);
            }
            const latency = Date.now() - startTime;
            this.updateMetrics(true, confidence.score, latency, false);
            this.emit('translation:success', {
                direction: 'a2a-to-mcp',
                latency,
                confidence: confidence.score
            });
            return {
                success: true,
                data: mcpResponse,
                confidence,
                metrics: {
                    latencyMs: latency,
                    cacheHit: false,
                    retryCount: 0
                }
            };
        }
        catch (error) {
            const latency = Date.now() - startTime;
            this.updateMetrics(false, 0, latency, false);
            const translationError = error instanceof translation_1.TranslationError
                ? error
                : new translation_1.TranslationError(String(error), translation_1.TranslationErrorType.UNKNOWN, false);
            return {
                success: false,
                error: translationError,
                confidence: {
                    score: 0,
                    factors: {
                        semanticMatch: 0,
                        structuralAlignment: 0,
                        dataPreservation: 0,
                        contextRetention: 0
                    },
                    warnings: ['Translation failed'],
                    lossyTranslation: true
                },
                metrics: {
                    latencyMs: latency,
                    cacheHit: false,
                    retryCount: 0
                }
            };
        }
        finally {
            this.metrics.activeTranslations--;
        }
    }
    /**
     * Translate A2A Agent Card to MCP Tools
     */
    async translateAgentCardToTools(agentCard, sessionId) {
        const startTime = Date.now();
        try {
            const context = this.getOrCreateContext(sessionId || 'default', 'a2a-to-mcp');
            // Store agent card in context for future reference
            if (!context.metadata.a2a) {
                context.metadata.a2a = { agentCards: [] };
            }
            context.metadata.a2a.agentCards = [
                ...(context.metadata.a2a.agentCards || []),
                agentCard
            ];
            const { tools, confidence } = this.semanticMapper.mapA2AAgentToMCPTools(agentCard, context);
            const latency = Date.now() - startTime;
            return {
                success: true,
                data: tools,
                confidence,
                metrics: {
                    latencyMs: latency,
                    cacheHit: false,
                    retryCount: 0
                }
            };
        }
        catch (error) {
            const latency = Date.now() - startTime;
            return {
                success: false,
                error: new translation_1.TranslationError(String(error), translation_1.TranslationErrorType.PROTOCOL, false),
                confidence: {
                    score: 0,
                    factors: {
                        semanticMatch: 0,
                        structuralAlignment: 0,
                        dataPreservation: 0,
                        contextRetention: 0
                    },
                    warnings: ['Agent card translation failed'],
                    lossyTranslation: true
                },
                metrics: {
                    latencyMs: latency,
                    cacheHit: false,
                    retryCount: 0
                }
            };
        }
    }
    /**
     * Get current translation metrics
     */
    getMetrics() {
        // Update cache hit rate
        if (this.cacheManager) {
            const cacheStats = this.cacheManager.getStats();
            this.metrics.cacheHitRate = cacheStats.hitRate;
        }
        return { ...this.metrics };
    }
    /**
     * Warm cache with common translations
     */
    async warmCache(entries) {
        if (!this.cacheManager) {
            return;
        }
        const cacheEntries = entries.map(entry => {
            const context = this.getOrCreateContext('warm-cache', entry.direction);
            const key = this.cacheManager.generateCacheKey(entry.request, entry.direction, context);
            return {
                key,
                value: entry.response,
                confidence: entry.confidence
            };
        });
        await this.cacheManager.warmCache(cacheEntries);
        this.emit('cache:warmed', { count: entries.length });
    }
    /**
     * Clear all contexts and caches
     */
    async clear() {
        this.contexts.clear();
        if (this.cacheManager) {
            await this.cacheManager.clear();
        }
        // Reset metrics
        this.metrics = {
            totalTranslations: 0,
            successfulTranslations: 0,
            failedTranslations: 0,
            averageConfidence: 0,
            averageLatencyMs: 0,
            cacheHitRate: 0,
            activeTranslations: 0
        };
        this.emit('engine:cleared');
    }
    /**
     * Shutdown the translation engine
     */
    async shutdown() {
        if (this.cacheManager) {
            await this.cacheManager.close();
        }
        this.contexts.clear();
        this.removeAllListeners();
        this.emit('engine:shutdown');
    }
    // Private helper methods
    getOrCreateContext(sessionId, direction) {
        const key = `${sessionId}:${direction}`;
        if (!this.contexts.has(key)) {
            this.contexts.set(key, {
                sessionId,
                direction,
                timestamp: Date.now(),
                sessionState: new Map(),
                translationHistory: [],
                metadata: {}
            });
        }
        return this.contexts.get(key);
    }
    updateMetrics(success, confidence, latency, _cacheHit) {
        if (success) {
            this.metrics.successfulTranslations++;
        }
        else {
            this.metrics.failedTranslations++;
        }
        // Update average confidence (running average)
        const totalSuccessful = this.metrics.successfulTranslations;
        if (totalSuccessful > 0) {
            this.metrics.averageConfidence =
                ((this.metrics.averageConfidence * (totalSuccessful - 1)) + confidence) / totalSuccessful;
        }
        // Update average latency (running average)
        const total = this.metrics.totalTranslations;
        this.metrics.averageLatencyMs =
            ((this.metrics.averageLatencyMs * (total - 1)) + latency) / total;
    }
    setupCacheHandlers() {
        if (!this.cacheManager)
            return;
        this.cacheManager.on('cache:hit', (data) => {
            this.emit('cache:hit', data);
        });
        this.cacheManager.on('cache:miss', (data) => {
            this.emit('cache:miss', data);
        });
        this.cacheManager.on('cache:error', (data) => {
            this.emit('cache:error', data);
        });
        this.cacheManager.on('redis:error', (error) => {
            this.emit('redis:error', error);
        });
    }
    startMetricsReporting() {
        // Report metrics every 30 seconds
        setInterval(() => {
            this.emit('metrics:report', this.getMetrics());
        }, 30000);
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.TranslationEngine = TranslationEngine;
//# sourceMappingURL=translation-engine.js.map