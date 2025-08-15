/**
 * Translation Confidence Score System
 *
 * This interface represents the confidence scoring system used to evaluate
 * the quality of protocol translations between MCP and Google A2A.
 *
 * Based on the paper's semantic mapping algorithm, we calculate a composite
 * score from multiple factors to ensure high-quality translations.
 */
export interface TranslationConfidence {
    /** Overall confidence score from 0.0 to 1.0 */
    score: number;
    /** Individual scoring factors that contribute to the overall score */
    factors: {
        /** How well the semantic meaning is preserved (0-1) */
        semanticMatch: number;
        /** How well the message structure aligns between protocols (0-1) */
        structuralAlignment: number;
        /** How completely the data is preserved without loss (0-1) */
        dataPreservation: number;
        /** How well the conversation context is maintained (0-1) */
        contextRetention: number;
    };
    /** Warning messages for potential translation issues */
    warnings: string[];
    /** Whether this is a lossy translation (some information may be lost) */
    lossyTranslation: boolean;
}
/**
 * Translation Context
 *
 * Maintains state and context across protocol boundaries.
 * This is crucial for handling the paradigm mismatch between:
 * - MCP's stateless tool invocation model
 * - A2A's stateful task lifecycle management
 */
export interface TranslationContext {
    /** Unique session identifier */
    sessionId: string;
    /** Direction of translation */
    direction: 'mcp-to-a2a' | 'a2a-to-mcp';
    /** Timestamp of translation */
    timestamp: number;
    /** Accumulated state from previous translations in this session */
    sessionState: Map<string, any>;
    /** History of translations for context preservation */
    translationHistory: Array<{
        messageId: string;
        timestamp: number;
        confidence: number;
    }>;
    /** Protocol-specific metadata */
    metadata: {
        mcp?: {
            toolDefinitions?: any[];
            resourceUrls?: string[];
        };
        a2a?: {
            agentCards?: any[];
            taskLifecycle?: string;
        };
    };
}
/**
 * Translation Error Types
 *
 * Categorizes errors based on the paper's error handling strategy
 */
export declare enum TranslationErrorType {
    /** Semantic translation failure */
    SEMANTIC = "SEMANTIC",
    /** Protocol-level incompatibility */
    PROTOCOL = "PROTOCOL",
    /** Performance-related timeout or overload */
    PERFORMANCE = "PERFORMANCE",
    /** Cache-related errors */
    CACHE = "CACHE",
    /** Unknown or unexpected errors */
    UNKNOWN = "UNKNOWN"
}
/**
 * Translation Error
 *
 * Comprehensive error structure with recovery strategies
 */
export declare class TranslationError extends Error {
    type: TranslationErrorType;
    recoverable: boolean;
    retryStrategy?: {
        maxRetries: number;
        backoffMs: number;
        fallbackAction?: string;
    } | undefined;
    constructor(message: string, type: TranslationErrorType, recoverable: boolean, retryStrategy?: {
        maxRetries: number;
        backoffMs: number;
        fallbackAction?: string;
    } | undefined);
}
/**
 * Translation Result
 *
 * Encapsulates the result of a translation operation
 */
export interface TranslationResult<T = any> {
    /** Whether the translation was successful */
    success: boolean;
    /** The translated data (if successful) */
    data?: T;
    /** Error information (if failed) */
    error?: TranslationError;
    /** Confidence score for this translation */
    confidence: TranslationConfidence;
    /** Performance metrics */
    metrics: {
        latencyMs: number;
        cacheHit: boolean;
        retryCount: number;
    };
}
//# sourceMappingURL=translation.d.ts.map