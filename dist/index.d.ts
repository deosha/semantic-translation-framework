/**
 * Protocol Translation Layer
 *
 * High-performance bidirectional translation between MCP and Google A2A protocols
 * Based on the research paper by Deo Shankar
 *
 * Main entry point and API
 */
export { TranslationEngine, TranslationEngineConfig, TranslationMetrics } from './translation/translation-engine';
export { SemanticMapper } from './translation/semantic-mapper';
export { CacheManager } from './cache/cache-manager';
export * from './types/translation';
export * from './protocols/mcp.types';
export * from './protocols/a2a.types';
import { TranslationEngine } from './translation/translation-engine';
/**
 * Create a pre-configured translation engine instance
 */
export declare function createTranslationEngine(config?: any): TranslationEngine;
//# sourceMappingURL=index.d.ts.map