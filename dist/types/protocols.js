"use strict";
/**
 * Generic Protocol Type Definitions for Semantic Translation Framework
 *
 * These types represent abstract protocol paradigms that can be mapped
 * to various real-world AI agent protocols (MCP, A2A, OpenAI, etc.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskDefinitionSchema = exports.ToolDefinitionSchema = exports.ProtocolParadigm = void 0;
const zod_1 = require("zod");
/**
 * Protocol Paradigm Types
 */
var ProtocolParadigm;
(function (ProtocolParadigm) {
    /** Stateless, tool-centric protocols (e.g., MCP-like) */
    ProtocolParadigm["TOOL_CENTRIC"] = "tool-centric";
    /** Stateful, task-centric protocols (e.g., A2A-like) */
    ProtocolParadigm["TASK_CENTRIC"] = "task-centric";
    /** Function-calling protocols (e.g., OpenAI-like) */
    ProtocolParadigm["FUNCTION_CALLING"] = "function-calling";
    /** Framework-specific protocols (e.g., LangChain, AutoGen) */
    ProtocolParadigm["FRAMEWORK_SPECIFIC"] = "framework-specific";
})(ProtocolParadigm || (exports.ProtocolParadigm = ProtocolParadigm = {}));
/**
 * Generic Tool Definition (Tool-Centric Paradigm)
 *
 * Represents a discrete, stateless function that can be invoked
 */
exports.ToolDefinitionSchema = zod_1.z.object({
    /** Unique identifier */
    id: zod_1.z.string(),
    /** Human-readable name */
    name: zod_1.z.string(),
    /** Description of functionality */
    description: zod_1.z.string(),
    /** Input parameter schema */
    inputSchema: zod_1.z.object({
        type: zod_1.z.literal('object'),
        properties: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
        required: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    /** Output schema (optional) */
    outputSchema: zod_1.z.object({
        type: zod_1.z.literal('object'),
        properties: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    }).optional(),
    /** Protocol-specific metadata */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional()
});
/**
 * Generic Task Definition (Task-Centric Paradigm)
 *
 * Represents a stateful, long-running operation with lifecycle
 */
exports.TaskDefinitionSchema = zod_1.z.object({
    /** Unique task identifier */
    taskId: zod_1.z.string(),
    /** Task type or capability */
    taskType: zod_1.z.string(),
    /** Task description */
    description: zod_1.z.string().optional(),
    /** Current task state */
    state: zod_1.z.enum(['pending', 'queued', 'running', 'paused', 'completed', 'failed', 'cancelled']),
    /** Task input data */
    input: zod_1.z.any(),
    /** Task output (when completed) */
    output: zod_1.z.any().optional(),
    /** Progress information */
    progress: zod_1.z.object({
        percentage: zod_1.z.number().optional(),
        message: zod_1.z.string().optional(),
        estimatedTimeRemaining: zod_1.z.number().optional()
    }).optional(),
    /** Error information (if failed) */
    error: zod_1.z.object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        details: zod_1.z.any().optional(),
        recoverable: zod_1.z.boolean().optional()
    }).optional(),
    /** Task metadata */
    metadata: zod_1.z.object({
        createdAt: zod_1.z.number(),
        updatedAt: zod_1.z.number(),
        completedAt: zod_1.z.number().optional(),
        parentTaskId: zod_1.z.string().optional(),
        sessionId: zod_1.z.string().optional(),
        priority: zod_1.z.enum(['low', 'normal', 'high', 'critical']).optional()
    }).optional()
});
//# sourceMappingURL=protocols.js.map