"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticTranslationError = exports.TranslationErrorType = void 0;
/**
 * Translation Error Types
 *
 * Categorizes errors for appropriate handling strategies
 */
var TranslationErrorType;
(function (TranslationErrorType) {
    /** Semantic mapping failure */
    TranslationErrorType["SEMANTIC_MAPPING"] = "SEMANTIC_MAPPING";
    /** Paradigm incompatibility */
    TranslationErrorType["PARADIGM_MISMATCH"] = "PARADIGM_MISMATCH";
    /** Feature not supported */
    TranslationErrorType["FEATURE_GAP"] = "FEATURE_GAP";
    /** Context loss */
    TranslationErrorType["CONTEXT_LOSS"] = "CONTEXT_LOSS";
    /** Performance timeout */
    TranslationErrorType["TIMEOUT"] = "TIMEOUT";
    /** Cache corruption */
    TranslationErrorType["CACHE_ERROR"] = "CACHE_ERROR";
    /** Confidence below threshold */
    TranslationErrorType["LOW_CONFIDENCE"] = "LOW_CONFIDENCE";
    /** Unknown error */
    TranslationErrorType["UNKNOWN"] = "UNKNOWN";
})(TranslationErrorType || (exports.TranslationErrorType = TranslationErrorType = {}));
/**
 * Semantic Translation Error
 */
class SemanticTranslationError extends Error {
    type;
    details;
    constructor(message, type, details) {
        super(message);
        this.type = type;
        this.details = details;
        this.name = 'SemanticTranslationError';
    }
}
exports.SemanticTranslationError = SemanticTranslationError;
//# sourceMappingURL=semantic-translation.js.map