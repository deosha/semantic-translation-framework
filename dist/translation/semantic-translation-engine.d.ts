/**
 * Semantic Translation Engine
 *
 * Core engine that orchestrates semantic-aware protocol translation
 * between different AI agent paradigms. This implementation is protocol-agnostic
 * and focuses on preserving semantic intent across paradigm boundaries.
 *
 * Based on paper Section IV: Semantic Translation Framework
 */
import { EventEmitter } from 'events';
import { TranslationResult, TranslationMetrics, NegotiationResult } from '../types/semantic-translation';
import { ProtocolParadigm, ProtocolMessage, ProtocolAdapter } from '../types/protocols';
/**
 * Semantic Translation Engine Configuration
 */
export interface SemanticEngineConfig {
    /** Enable multi-level caching */
    cacheEnabled?: boolean;
    /** Redis connection options */
    redisOptions?: any;
    /** Minimum confidence threshold */
    minConfidenceThreshold?: number;
    /** Enable performance monitoring */
    monitoringEnabled?: boolean;
    /** Maximum retry attempts */
    maxRetries?: number;
    /** Retry backoff milliseconds */
    retryBackoffMs?: number;
    /** Enable fallback strategies */
    fallbackEnabled?: boolean;
    /** Protocol adapters */
    adapters?: Map<ProtocolParadigm, ProtocolAdapter>;
}
/**
 * Semantic Translation Engine
 *
 * Provides semantic-aware translation between any protocol paradigms
 */
export declare class SemanticTranslationEngine extends EventEmitter {
    private cacheManager;
    private config;
    private metrics;
    private contexts;
    private adapters;
    private fallbackStrategies;
    constructor(config?: SemanticEngineConfig);
    /**
     * Register a protocol adapter
     */
    registerAdapter(paradigm: ProtocolParadigm, adapter: ProtocolAdapter): void;
    /**
     * Main translation method
     *
     * Translates a message from source paradigm to target paradigm
     */
    translate(sourceMessage: ProtocolMessage, targetParadigm: ProtocolParadigm, sessionId?: string): Promise<TranslationResult>;
    /**
     * Negotiate capabilities between protocols
     */
    negotiateCapabilities(sourceParadigm: ProtocolParadigm, targetParadigm: ProtocolParadigm): Promise<NegotiationResult>;
    /**
     * Get current metrics
     */
    getMetrics(): TranslationMetrics;
    /**
     * Clear all contexts and caches
     */
    clear(): Promise<void>;
    /**
     * Shutdown the engine
     */
    shutdown(): Promise<void>;
    private performTranslationWithRetries;
    private calculateConfidence;
    private calculateSemanticSimilarity;
    private calculateStructuralAlignment;
    private calculateDataPreservation;
    private calculateContextRetention;
    private identifyCapabilityGaps;
    private assessGapSeverity;
    private applyFallback;
    private generateRecommendations;
    private checkCache;
    private cacheTranslation;
    private generateCacheKey;
    private getOrCreateContext;
    private initializeMetrics;
    private initializeFallbackStrategies;
    private updateMetrics;
    private setupEventHandlers;
    private startMetricsReporting;
    private sleep;
}
//# sourceMappingURL=semantic-translation-engine.d.ts.map