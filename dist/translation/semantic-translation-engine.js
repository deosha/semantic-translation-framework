"use strict";
/**
 * Semantic Translation Engine
 *
 * Core engine that orchestrates semantic-aware protocol translation
 * between different AI agent paradigms. This implementation is protocol-agnostic
 * and focuses on preserving semantic intent across paradigm boundaries.
 *
 * Based on paper Section IV: Semantic Translation Framework
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticTranslationEngine = void 0;
const events_1 = require("events");
const semantic_translation_1 = require("../types/semantic-translation");
const cache_manager_1 = require("../cache/cache-manager");
/**
 * Semantic Translation Engine
 *
 * Provides semantic-aware translation between any protocol paradigms
 */
class SemanticTranslationEngine extends events_1.EventEmitter {
    cacheManager;
    config;
    metrics;
    contexts;
    adapters;
    fallbackStrategies;
    constructor(config) {
        super();
        // Initialize configuration
        this.config = {
            cacheEnabled: true,
            redisOptions: {},
            minConfidenceThreshold: 0.7,
            monitoringEnabled: true,
            maxRetries: 3,
            retryBackoffMs: 1000,
            fallbackEnabled: true,
            adapters: new Map(),
            ...config
        };
        // Initialize components
        this.cacheManager = this.config.cacheEnabled
            ? new cache_manager_1.CacheManager(this.config.redisOptions)
            : null;
        // Initialize metrics
        this.metrics = this.initializeMetrics();
        // Context storage
        this.contexts = new Map();
        // Protocol adapters
        this.adapters = this.config.adapters || new Map();
        // Fallback strategies
        this.fallbackStrategies = this.initializeFallbackStrategies();
        // Setup handlers
        this.setupEventHandlers();
        // Start monitoring
        if (this.config.monitoringEnabled) {
            this.startMetricsReporting();
        }
    }
    /**
     * Register a protocol adapter
     */
    registerAdapter(paradigm, adapter) {
        this.adapters.set(paradigm, adapter);
        this.emit('adapter:registered', { paradigm, capabilities: adapter.manifest.capabilities });
    }
    /**
     * Main translation method
     *
     * Translates a message from source paradigm to target paradigm
     */
    async translate(sourceMessage, targetParadigm, sessionId) {
        const startTime = Date.now();
        this.metrics.activeTranslations++;
        this.metrics.totalTranslations++;
        try {
            // Get or create context
            const context = this.getOrCreateContext(sessionId || 'default', sourceMessage.paradigm, targetParadigm);
            // Check cache
            const cacheResult = await this.checkCache(sourceMessage, targetParadigm, context);
            if (cacheResult) {
                return cacheResult;
            }
            // Perform semantic translation with retries
            const result = await this.performTranslationWithRetries(sourceMessage, targetParadigm, context);
            // Cache successful translation
            if (result.success && this.cacheManager) {
                await this.cacheTranslation(sourceMessage, targetParadigm, context, result);
            }
            // Update metrics
            this.updateMetrics(result.success, result.confidence.score, Date.now() - startTime, false);
            // Emit events
            this.emit(result.success ? 'translation:success' : 'translation:failed', {
                source: sourceMessage.paradigm,
                target: targetParadigm,
                confidence: result.confidence.score,
                latency: Date.now() - startTime
            });
            return result;
        }
        finally {
            this.metrics.activeTranslations--;
        }
    }
    /**
     * Negotiate capabilities between protocols
     */
    async negotiateCapabilities(sourceParadigm, targetParadigm) {
        const sourceAdapter = this.adapters.get(sourceParadigm);
        const targetAdapter = this.adapters.get(targetParadigm);
        if (!sourceAdapter || !targetAdapter) {
            throw new semantic_translation_1.SemanticTranslationError('Protocol adapters not found', semantic_translation_1.TranslationErrorType.PARADIGM_MISMATCH, { sourceParadigm, targetParadigm });
        }
        const sourceFeatures = sourceAdapter.manifest.features;
        const targetFeatures = targetAdapter.manifest.features;
        // Identify compatible capabilities
        const compatible = [];
        const fallbacks = [];
        // Check streaming support
        if (sourceFeatures.streaming && !targetFeatures.streaming) {
            fallbacks.push(this.fallbackStrategies.get('streaming-to-polling'));
        }
        // Check state management
        if (sourceFeatures.stateful && !targetFeatures.stateful) {
            fallbacks.push(this.fallbackStrategies.get('stateful-to-stateless'));
        }
        // Check multi-modal support
        if (sourceFeatures.multiModal && !targetFeatures.multiModal) {
            fallbacks.push(this.fallbackStrategies.get('multimodal-to-text'));
        }
        // Calculate compatibility score
        const totalFeatures = Object.keys(sourceFeatures).length;
        const compatibleCount = Object.keys(sourceFeatures).filter(feature => sourceFeatures[feature] ===
            targetFeatures[feature]).length;
        const compatibility = compatibleCount / totalFeatures;
        return {
            success: compatibility > 0.5,
            compatibility,
            capabilities: compatible,
            fallbacks,
            warnings: fallbacks.map(f => `Using fallback: ${f.name}`),
            recommendations: this.generateRecommendations(sourceFeatures, targetFeatures)
        };
    }
    /**
     * Get current metrics
     */
    getMetrics() {
        if (this.cacheManager) {
            const cacheStats = this.cacheManager.getStats();
            this.metrics.cacheHitRate = cacheStats.hitRate;
        }
        return { ...this.metrics };
    }
    /**
     * Clear all contexts and caches
     */
    async clear() {
        this.contexts.clear();
        if (this.cacheManager) {
            await this.cacheManager.clear();
        }
        this.metrics = this.initializeMetrics();
        this.emit('engine:cleared');
    }
    /**
     * Shutdown the engine
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
    async performTranslationWithRetries(sourceMessage, targetParadigm, context) {
        const operationStartTime = Date.now();
        let lastError;
        let retryCount = 0;
        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                // Get adapters
                const sourceAdapter = this.adapters.get(sourceMessage.paradigm);
                const targetAdapter = this.adapters.get(targetParadigm);
                if (!sourceAdapter || !targetAdapter) {
                    throw new semantic_translation_1.SemanticTranslationError('Protocol adapter not found', semantic_translation_1.TranslationErrorType.PARADIGM_MISMATCH, {
                        sourceParadigm: sourceMessage.paradigm,
                        targetParadigm,
                        recoverable: false
                    });
                }
                // Extract semantic intent
                const intent = sourceAdapter.extractIntent(sourceMessage);
                // Apply fallback strategies if needed
                const gaps = await this.identifyCapabilityGaps(sourceMessage.paradigm, targetParadigm);
                let modifiedIntent = intent;
                const fallbacksUsed = [];
                for (const gap of gaps) {
                    const fallback = this.fallbackStrategies.get(gap.feature);
                    if (fallback && this.config.fallbackEnabled) {
                        modifiedIntent = this.applyFallback(modifiedIntent, fallback);
                        fallbacksUsed.push(fallback.name);
                    }
                }
                // Reconstruct in target paradigm
                const targetMessage = targetAdapter.reconstructMessage(modifiedIntent);
                // Calculate confidence
                const confidence = this.calculateConfidence(sourceMessage, targetMessage, intent, modifiedIntent, gaps);
                // Check confidence threshold
                if (confidence.score < this.config.minConfidenceThreshold) {
                    throw new semantic_translation_1.SemanticTranslationError(`Confidence ${confidence.score.toFixed(2)} below threshold`, semantic_translation_1.TranslationErrorType.LOW_CONFIDENCE, {
                        confidence: confidence.score,
                        fallbackAvailable: true,
                        recoverable: true,
                        retryStrategy: {
                            maxRetries: 1,
                            backoffMs: this.config.retryBackoffMs,
                            fallbackAction: 'use-alternative-mapping'
                        }
                    });
                }
                // Update context
                context.conversationContext.history.push({
                    messageId: sourceMessage.id,
                    timestamp: Date.now(),
                    intent,
                    confidence: confidence.score
                });
                return {
                    success: true,
                    data: targetMessage,
                    confidence,
                    metrics: {
                        latencyMs: Date.now() - operationStartTime,
                        cacheHit: false,
                        retries: retryCount,
                        fallbacksUsed
                    }
                };
            }
            catch (error) {
                retryCount++;
                lastError = error instanceof semantic_translation_1.SemanticTranslationError
                    ? error
                    : new semantic_translation_1.SemanticTranslationError(String(error), semantic_translation_1.TranslationErrorType.UNKNOWN);
                if (attempt < this.config.maxRetries && lastError.details?.recoverable) {
                    const backoff = this.config.retryBackoffMs * Math.pow(2, attempt);
                    await this.sleep(backoff);
                    this.emit('translation:retry', {
                        attempt: attempt + 1,
                        error: lastError.message
                    });
                }
            }
        }
        // Translation failed
        return {
            success: false,
            error: lastError?.message,
            errorType: lastError?.type,
            confidence: {
                score: 0,
                factors: {
                    semanticMatch: 0,
                    structuralAlignment: 0,
                    dataPreservation: 0,
                    contextRetention: 0
                },
                warnings: ['Translation failed after retries'],
                lossyTranslation: true
            },
            metrics: {
                latencyMs: Date.now() - operationStartTime,
                cacheHit: false,
                retries: retryCount,
                fallbacksUsed: []
            }
        };
    }
    calculateConfidence(source, target, originalIntent, modifiedIntent, gaps) {
        // Semantic similarity (40% weight)
        const semanticMatch = this.calculateSemanticSimilarity(originalIntent, modifiedIntent);
        // Structural alignment (20% weight)
        const structuralAlignment = this.calculateStructuralAlignment(source, target);
        // Data preservation (30% weight)
        const dataPreservation = this.calculateDataPreservation(source, target);
        // Context retention (10% weight)
        const contextRetention = this.calculateContextRetention(source, target);
        // Weighted combination
        const score = (semanticMatch * 0.4 +
            structuralAlignment * 0.2 +
            dataPreservation * 0.3 +
            contextRetention * 0.1);
        // Apply penalty for gaps
        const gapPenalty = Math.min(gaps.length * 0.05, 0.3);
        const finalScore = Math.max(0, score - gapPenalty);
        return {
            score: finalScore,
            factors: {
                semanticMatch,
                structuralAlignment,
                dataPreservation,
                contextRetention
            },
            warnings: gaps.map(g => `Capability gap: ${g.feature}`),
            lossyTranslation: finalScore < 0.95 || gaps.length > 0
        };
    }
    calculateSemanticSimilarity(intent1, intent2) {
        // Compare actions
        const actionMatch = intent1.action === intent2.action ? 1.0 : 0.5;
        // Compare targets
        const targetMatch = intent1.target.type === intent2.target.type ? 1.0 : 0.5;
        // Compare parameters (simplified)
        const paramKeys1 = Object.keys(intent1.parameters);
        const paramKeys2 = Object.keys(intent2.parameters);
        const commonKeys = paramKeys1.filter(k => paramKeys2.includes(k));
        const paramMatch = commonKeys.length / Math.max(paramKeys1.length, paramKeys2.length, 1);
        return (actionMatch * 0.4 + targetMatch * 0.3 + paramMatch * 0.3);
    }
    calculateStructuralAlignment(_source, _target) {
        // Simplified structural comparison
        // In production, this would analyze message structure depth, field alignment, etc.
        return 0.9;
    }
    calculateDataPreservation(source, target) {
        // Check if all source data is preserved in target
        const sourceDataSize = JSON.stringify(source.payload).length;
        const targetDataSize = JSON.stringify(target.payload).length;
        if (targetDataSize >= sourceDataSize) {
            return 1.0;
        }
        return targetDataSize / sourceDataSize;
    }
    calculateContextRetention(source, target) {
        // Check session and correlation preservation
        const sessionPreserved = source.sessionId && target.sessionId ? 1.0 : 0.5;
        const correlationPreserved = source.correlationId === target.correlationId ? 1.0 : 0.8;
        return (sessionPreserved + correlationPreserved) / 2;
    }
    async identifyCapabilityGaps(sourceParadigm, targetParadigm) {
        const gaps = [];
        const sourceAdapter = this.adapters.get(sourceParadigm);
        const targetAdapter = this.adapters.get(targetParadigm);
        if (!sourceAdapter || !targetAdapter) {
            return gaps;
        }
        const sourceFeatures = sourceAdapter.manifest.features;
        const targetFeatures = targetAdapter.manifest.features;
        // Check each feature
        for (const [feature, sourceSupport] of Object.entries(sourceFeatures)) {
            const targetSupport = targetFeatures[feature];
            if (sourceSupport && !targetSupport) {
                gaps.push({
                    feature,
                    sourceSupport,
                    targetSupport,
                    severity: this.assessGapSeverity(feature)
                });
            }
        }
        return gaps;
    }
    assessGapSeverity(feature) {
        const severityMap = {
            'streaming': 'medium',
            'stateful': 'high',
            'multiModal': 'medium',
            'transactions': 'high',
            'async': 'medium',
            'partialResults': 'low',
            'discovery': 'low',
            'batching': 'low'
        };
        return severityMap[feature] || 'medium';
    }
    applyFallback(intent, fallback) {
        // Apply fallback strategy to modify intent
        // This is simplified - production would have sophisticated fallback logic
        const modifiedIntent = { ...intent };
        if (fallback.name === 'streaming-to-polling') {
            modifiedIntent.constraints = {
                ...modifiedIntent.constraints,
                format: 'polling'
            };
        }
        return modifiedIntent;
    }
    generateRecommendations(sourceFeatures, targetFeatures) {
        const recommendations = {};
        if (sourceFeatures.streaming && !targetFeatures.streaming) {
            recommendations.streaming = 'Use polling with partial results';
        }
        if (sourceFeatures.stateful && !targetFeatures.stateful) {
            recommendations.state = 'Implement shadow state management';
        }
        return recommendations;
    }
    async checkCache(sourceMessage, targetParadigm, context) {
        if (!this.cacheManager) {
            return null;
        }
        const cacheKey = this.generateCacheKey(sourceMessage, targetParadigm, context);
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            this.updateMetrics(true, cached.confidence.score, 0, true);
            return {
                success: true,
                data: cached.data,
                confidence: cached.confidence,
                metrics: {
                    latencyMs: 0,
                    cacheHit: true,
                    retries: 0,
                    fallbacksUsed: []
                }
            };
        }
        return null;
    }
    async cacheTranslation(sourceMessage, targetParadigm, context, result) {
        if (!this.cacheManager || !result.success) {
            return;
        }
        const cacheKey = this.generateCacheKey(sourceMessage, targetParadigm, context);
        await this.cacheManager.set(cacheKey, result.data, result.confidence);
    }
    generateCacheKey(source, targetParadigm, _context) {
        // Simplified cache key generation
        return `${source.paradigm}:${targetParadigm}:${source.type}:${JSON.stringify(source.payload)}`;
    }
    getOrCreateContext(sessionId, sourceParadigm, targetParadigm) {
        const key = `${sessionId}:${sourceParadigm}:${targetParadigm}`;
        if (!this.contexts.has(key)) {
            this.contexts.set(key, {
                sessionId,
                sourceParadigm,
                targetParadigm,
                timestamp: Date.now(),
                shadowState: new Map(),
                conversationContext: {
                    history: [],
                    variables: {}
                },
                protocolMetadata: {
                    source: {},
                    target: {}
                },
                fallbacks: []
            });
        }
        return this.contexts.get(key);
    }
    initializeMetrics() {
        return {
            totalTranslations: 0,
            successfulTranslations: 0,
            failedTranslations: 0,
            averageConfidence: 0,
            averageLatencyMs: 0,
            cacheHitRate: 0,
            byParadigm: {},
            fallbackUsage: {},
            errorDistribution: {},
            activeTranslations: 0
        };
    }
    initializeFallbackStrategies() {
        const strategies = new Map();
        strategies.set('streaming-to-polling', {
            name: 'streaming-to-polling',
            feature: 'streaming',
            type: 'emulation',
            confidenceImpact: 0.05,
            implementation: {
                params: {
                    pollingInterval: 100,
                    maxPolls: 100
                }
            }
        });
        strategies.set('stateful-to-stateless', {
            name: 'stateful-to-stateless',
            feature: 'stateful',
            type: 'synthesis',
            confidenceImpact: 0.1,
            implementation: {
                params: {
                    stateStore: 'shadow',
                    ttl: 3600
                }
            }
        });
        strategies.set('multimodal-to-text', {
            name: 'multimodal-to-text',
            feature: 'multiModal',
            type: 'degradation',
            confidenceImpact: 0.15,
            implementation: {
                params: {
                    encoding: 'base64',
                    description: 'text'
                }
            }
        });
        return strategies;
    }
    updateMetrics(success, confidence, latency, cacheHit) {
        if (success) {
            this.metrics.successfulTranslations++;
        }
        else {
            this.metrics.failedTranslations++;
        }
        // Update averages
        const total = this.metrics.totalTranslations;
        if (total > 0) {
            this.metrics.averageConfidence =
                ((this.metrics.averageConfidence * (total - 1)) + confidence) / total;
            if (!cacheHit) {
                this.metrics.averageLatencyMs =
                    ((this.metrics.averageLatencyMs * (total - 1)) + latency) / total;
            }
        }
    }
    setupEventHandlers() {
        if (this.cacheManager) {
            this.cacheManager.on('cache:hit', (data) => {
                this.emit('cache:hit', data);
            });
            this.cacheManager.on('cache:miss', (data) => {
                this.emit('cache:miss', data);
            });
        }
    }
    startMetricsReporting() {
        setInterval(() => {
            this.emit('metrics:report', this.getMetrics());
        }, 30000);
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.SemanticTranslationEngine = SemanticTranslationEngine;
//# sourceMappingURL=semantic-translation-engine.js.map