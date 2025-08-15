"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationError = exports.TranslationErrorType = void 0;
/**
 * Translation Error Types
 *
 * Categorizes errors based on the paper's error handling strategy
 */
var TranslationErrorType;
(function (TranslationErrorType) {
    /** Semantic translation failure */
    TranslationErrorType["SEMANTIC"] = "SEMANTIC";
    /** Protocol-level incompatibility */
    TranslationErrorType["PROTOCOL"] = "PROTOCOL";
    /** Performance-related timeout or overload */
    TranslationErrorType["PERFORMANCE"] = "PERFORMANCE";
    /** Cache-related errors */
    TranslationErrorType["CACHE"] = "CACHE";
    /** Unknown or unexpected errors */
    TranslationErrorType["UNKNOWN"] = "UNKNOWN";
})(TranslationErrorType || (exports.TranslationErrorType = TranslationErrorType = {}));
/**
 * Translation Error
 *
 * Comprehensive error structure with recovery strategies
 */
class TranslationError extends Error {
    type;
    recoverable;
    retryStrategy;
    constructor(message, type, recoverable, retryStrategy) {
        super(message);
        this.type = type;
        this.recoverable = recoverable;
        this.retryStrategy = retryStrategy;
        this.name = 'TranslationError';
    }
}
exports.TranslationError = TranslationError;
//# sourceMappingURL=translation.js.map