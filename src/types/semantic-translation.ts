/**
 * Semantic Translation Framework Types
 * 
 * Core types for semantic-aware protocol translation between
 * different AI agent protocol paradigms
 * 
 * This framework enables translation between:
 * - Tool-centric protocols (stateless, like MCP)
 * - Task-centric protocols (stateful, like A2A)
 * - Function-calling protocols (like OpenAI)
 * - Framework-specific protocols (LangChain, AutoGen, etc.)
 */

import { SemanticIntent, ProtocolParadigm } from './protocols';

/**
 * Translation Confidence Score
 * 
 * Multi-factor confidence scoring system that quantifies
 * the semantic preservation quality of a translation.
 * This is a key innovation of our framework.
 */
export interface TranslationConfidence {
  /** Overall confidence score from 0.0 to 1.0 */
  score: number;
  
  /** Individual scoring factors (weights shown in parentheses) */
  factors: {
    /** Semantic intent preservation (40% weight) */
    semanticMatch: number;
    
    /** Structural compatibility (20% weight) */
    structuralAlignment: number;
    
    /** Data completeness (30% weight) */
    dataPreservation: number;
    
    /** Context preservation (10% weight) */
    contextRetention: number;
  };
  
  /** Identified translation issues */
  warnings: string[];
  
  /** Whether information loss occurred */
  lossyTranslation: boolean;
  
  /** Recommendations for improving translation */
  recommendations?: string[];
}

/**
 * Semantic Translation Context
 * 
 * Maintains semantic context and state across protocol translations.
 * Enables stateful behavior even when translating to stateless protocols
 * through shadow state management.
 */
export interface SemanticTranslationContext {
  /** Unique session identifier */
  sessionId: string;
  
  /** Source protocol paradigm */
  sourceParadigm: ProtocolParadigm;
  
  /** Target protocol paradigm */
  targetParadigm: ProtocolParadigm;
  
  /** Translation timestamp */
  timestamp: number;
  
  /** Shadow state for stateless protocols */
  shadowState: Map<string, any>;
  
  /** Conversation context */
  conversationContext: {
    history: Array<{
      messageId: string;
      timestamp: number;
      intent: SemanticIntent;
      confidence: number;
    }>;
    variables: Record<string, any>;
    user?: string;
    environment?: string;
  };
  
  /** Protocol-specific metadata */
  protocolMetadata: {
    source: Record<string, any>;
    target: Record<string, any>;
  };
  
  /** Active fallback strategies */
  fallbacks: Array<{
    feature: string;
    strategy: string;
    confidence: number;
  }>;
}

/**
 * Translation Error Types
 * 
 * Categorizes errors for appropriate handling strategies
 */
export enum TranslationErrorType {
  /** Semantic mapping failure */
  SEMANTIC_MAPPING = 'SEMANTIC_MAPPING',
  
  /** Paradigm incompatibility */
  PARADIGM_MISMATCH = 'PARADIGM_MISMATCH',
  
  /** Feature not supported */
  FEATURE_GAP = 'FEATURE_GAP',
  
  /** Context loss */
  CONTEXT_LOSS = 'CONTEXT_LOSS',
  
  /** Performance timeout */
  TIMEOUT = 'TIMEOUT',
  
  /** Cache corruption */
  CACHE_ERROR = 'CACHE_ERROR',
  
  /** Confidence below threshold */
  LOW_CONFIDENCE = 'LOW_CONFIDENCE',
  
  /** Unknown error */
  UNKNOWN = 'UNKNOWN'
}

/**
 * Semantic Translation Error
 */
export class SemanticTranslationError extends Error {
  constructor(
    message: string,
    public type: TranslationErrorType,
    public details?: {
      sourceParadigm?: ProtocolParadigm;
      targetParadigm?: ProtocolParadigm;
      confidence?: number;
      fallbackAvailable?: boolean;
      recoverable?: boolean;
      retryStrategy?: {
        maxRetries: number;
        backoffMs: number;
        fallbackAction?: string;
      };
    }
  ) {
    super(message);
    this.name = 'SemanticTranslationError';
  }
}

/**
 * Translation Result
 * 
 * Complete result of a semantic translation operation
 */
export interface TranslationResult<T = any> {
  /** Translation success status */
  success: boolean;
  
  /** Translated message/data */
  data?: T;
  
  /** Error details if failed */
  error?: string;
  
  /** Error type for handling */
  errorType?: TranslationErrorType;
  
  /** Translation confidence */
  confidence: TranslationConfidence;
  
  /** Performance metrics */
  metrics: {
    /** Total translation time */
    latencyMs: number;
    
    /** Cache hit/miss */
    cacheHit: boolean;
    
    /** Number of retries */
    retries: number;
    
    /** Fallback strategies used */
    fallbacksUsed: string[];
  };
  
  /** Trace ID for debugging */
  traceId?: string;
}

/**
 * Capability Gap
 * 
 * Represents a feature mismatch between protocols
 */
export interface CapabilityGap {
  /** Feature name */
  feature: string;
  
  /** Source protocol support */
  sourceSupport: boolean;
  
  /** Target protocol support */
  targetSupport: boolean;
  
  /** Gap severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Available fallback strategies */
  fallbackStrategies: Array<{
    name: string;
    description: string;
    confidence: number;
    implementation: string;
  }>;
}

/**
 * Fallback Strategy
 * 
 * Defines how to handle capability gaps
 */
export interface FallbackStrategy {
  /** Strategy name */
  name: string;
  
  /** Feature being emulated */
  feature: string;
  
  /** Strategy type */
  type: 'emulation' | 'synthesis' | 'degradation' | 'rejection';
  
  /** Expected confidence impact */
  confidenceImpact: number;
  
  /** Implementation details */
  implementation: {
    /** Strategy-specific parameters */
    params: Record<string, any>;
    
    /** Required resources */
    resources?: string[];
    
    /** Performance impact */
    performanceImpact?: {
      latencyMs: number;
      memoryMb: number;
      cpuPercent: number;
    };
  };
}

/**
 * Translation Metrics
 * 
 * Aggregated metrics for monitoring
 */
export interface TranslationMetrics {
  /** Total translations */
  totalTranslations: number;
  
  /** Successful translations */
  successfulTranslations: number;
  
  /** Failed translations */
  failedTranslations: number;
  
  /** Average confidence score */
  averageConfidence: number;
  
  /** Average latency in ms */
  averageLatencyMs: number;
  
  /** Cache hit rate percentage */
  cacheHitRate: number;
  
  /** Translations by paradigm */
  byParadigm: Record<string, {
    count: number;
    avgConfidence: number;
    avgLatency: number;
  }>;
  
  /** Fallback usage statistics */
  fallbackUsage: Record<string, number>;
  
  /** Error distribution */
  errorDistribution: Record<TranslationErrorType, number>;
  
  /** Active translations */
  activeTranslations: number;
}

/**
 * Cache Entry
 * 
 * Structure for cached translations
 */
export interface CachedTranslation {
  /** Cache key */
  key: string;
  
  /** Cached result */
  result: TranslationResult;
  
  /** Cache timestamp */
  timestamp: number;
  
  /** TTL in seconds */
  ttl: number;
  
  /** Cache level (L1/L2/L3) */
  level: 'L1' | 'L2' | 'L3';
  
  /** Hit count */
  hits: number;
  
  /** Source and target paradigms */
  paradigms: {
    source: ProtocolParadigm;
    target: ProtocolParadigm;
  };
}

/**
 * Negotiation Result
 * 
 * Result of capability negotiation between protocols
 */
export interface NegotiationResult {
  /** Negotiation success */
  success: boolean;
  
  /** Overall compatibility score (0-1) */
  compatibility: number;
  
  /** Compatible capabilities */
  capabilities: Array<{
    name: string;
    confidence: number;
  }>;
  
  /** Required fallbacks */
  fallbacks: FallbackStrategy[];
  
  /** Warnings about potential issues */
  warnings: string[];
  
  /** Recommendations for optimal translation */
  recommendations: Record<string, any>;
}