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
import { EventEmitter } from 'events';
import { TranslationResult, TranslationConfidence } from '../types/translation';
import { MCPTool, MCPToolCallRequest, MCPToolCallResponse } from '../protocols/mcp.types';
import { A2AAgentCard, A2ATaskRequest, A2ATaskResponse } from '../protocols/a2a.types';
/**
 * Translation Engine Configuration
 */
export interface TranslationEngineConfig {
    /** Enable caching */
    cacheEnabled?: boolean;
    /** Redis connection options */
    redisOptions?: any;
    /** Minimum confidence threshold for translations */
    minConfidenceThreshold?: number;
    /** Enable performance monitoring */
    monitoringEnabled?: boolean;
    /** Maximum retry attempts for failed translations */
    maxRetries?: number;
    /** Retry backoff in milliseconds */
    retryBackoffMs?: number;
}
/**
 * Translation Metrics
 */
export interface TranslationMetrics {
    /** Total translations performed */
    totalTranslations: number;
    /** Successful translations */
    successfulTranslations: number;
    /** Failed translations */
    failedTranslations: number;
    /** Average confidence score */
    averageConfidence: number;
    /** Average latency in milliseconds */
    averageLatencyMs: number;
    /** Cache hit rate percentage */
    cacheHitRate: number;
    /** Current active translations */
    activeTranslations: number;
}
/**
 * Main Translation Engine
 *
 * Provides bidirectional translation between MCP and A2A protocols
 */
export declare class TranslationEngine extends EventEmitter {
    private semanticMapper;
    private cacheManager;
    private config;
    private metrics;
    private contexts;
    constructor(config?: TranslationEngineConfig);
    /**
     * Translate MCP Tool Call to A2A Task Request
     *
     * Handles the stateless to stateful conversion with caching
     */
    translateMCPToA2A(request: MCPToolCallRequest, sessionId?: string): Promise<TranslationResult<A2ATaskRequest>>;
    /**
     * Translate A2A Task Response to MCP Tool Call Response
     *
     * Handles the stateful to stateless conversion
     */
    translateA2AToMCP(response: A2ATaskResponse, sessionId?: string): Promise<TranslationResult<MCPToolCallResponse>>;
    /**
     * Translate A2A Agent Card to MCP Tools
     */
    translateAgentCardToTools(agentCard: A2AAgentCard, sessionId?: string): Promise<TranslationResult<MCPTool[]>>;
    /**
     * Get current translation metrics
     */
    getMetrics(): TranslationMetrics;
    /**
     * Warm cache with common translations
     */
    warmCache(entries: Array<{
        request: any;
        response: any;
        direction: 'mcp-to-a2a' | 'a2a-to-mcp';
        confidence: TranslationConfidence;
    }>): Promise<void>;
    /**
     * Clear all contexts and caches
     */
    clear(): Promise<void>;
    /**
     * Shutdown the translation engine
     */
    shutdown(): Promise<void>;
    private getOrCreateContext;
    private updateMetrics;
    private setupCacheHandlers;
    private startMetricsReporting;
    private sleep;
}
//# sourceMappingURL=translation-engine.d.ts.map