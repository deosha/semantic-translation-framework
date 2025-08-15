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
export { SemanticTranslationEngine, SemanticEngineConfig } from './translation/semantic-translation-engine';
export { ProtocolParadigm, ProtocolMessage, ProtocolAdapter, ProtocolManifest, ProtocolFeatures, SemanticIntent, ToolDefinition, TaskDefinition, AgentCapability, ToolInvocationRequest, ToolInvocationResponse, TaskRequest, TaskResponse } from './types/protocols';
export { TranslationConfidence, SemanticTranslationContext, TranslationResult, TranslationMetrics, SemanticTranslationError, TranslationErrorType, CapabilityGap, FallbackStrategy, NegotiationResult, CachedTranslation } from './types/semantic-translation';
export * from './protocols/tool-centric.types';
export * from './protocols/task-centric.types';
export { CacheManager } from './cache/cache-manager';
import { SemanticTranslationEngine } from './translation/semantic-translation-engine';
import { ProtocolAdapter, ProtocolManifest } from './types/protocols';
/**
 * Create a pre-configured semantic translation engine
 */
export declare function createSemanticEngine(config?: any): SemanticTranslationEngine;
/**
 * Example protocol adapter for tool-centric paradigm
 */
export declare class ToolCentricAdapter implements ProtocolAdapter {
    manifest: ProtocolManifest;
    parseMessage(raw: any): any;
    serializeMessage(message: any): any;
    extractIntent(message: any): any;
    reconstructMessage(intent: any): any;
    validateMessage(message: any): boolean;
    getMetadata(): Record<string, any>;
}
/**
 * Example protocol adapter for task-centric paradigm
 */
export declare class TaskCentricAdapter implements ProtocolAdapter {
    manifest: ProtocolManifest;
    parseMessage(raw: any): any;
    serializeMessage(message: any): any;
    extractIntent(message: any): any;
    reconstructMessage(intent: any): any;
    validateMessage(message: any): boolean;
    getMetadata(): Record<string, any>;
}
//# sourceMappingURL=index.d.ts.map