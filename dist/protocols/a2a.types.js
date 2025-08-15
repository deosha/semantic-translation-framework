"use strict";
/**
 * Google Agent-to-Agent (A2A) Protocol Type Definitions
 *
 * A2A is Google's task-centric protocol for agent communication.
 * It uses JSON-RPC over HTTP with Server-Sent Events for streaming.
 *
 * Key characteristics:
 * - Stateful task lifecycle management
 * - Agent cards for capability declaration
 * - Multi-modal message parts
 * - Persistent conversation contexts
 * - Streaming updates for long-running tasks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.A2AStreamingUpdateSchema = exports.A2ATaskResponseSchema = exports.A2ATaskRequestSchema = exports.A2AMessagePartSchema = exports.A2ATaskState = exports.A2AAgentCardSchema = void 0;
const zod_1 = require("zod");
/**
 * A2A Agent Card
 *
 * Declares an agent's capabilities and interaction patterns.
 * Similar to MCP tools but with richer metadata and state management.
 */
exports.A2AAgentCardSchema = zod_1.z.object({
    /** Unique agent identifier */
    agentId: zod_1.z.string(),
    /** Agent display name */
    name: zod_1.z.string(),
    /** Agent description */
    description: zod_1.z.string(),
    /** Agent version */
    version: zod_1.z.string(),
    /** Supported capabilities */
    capabilities: zod_1.z.array(zod_1.z.object({
        /** Capability name */
        name: zod_1.z.string(),
        /** Capability description */
        description: zod_1.z.string(),
        /** Input schema for this capability */
        inputSchema: zod_1.z.object({
            type: zod_1.z.literal('object'),
            properties: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
            required: zod_1.z.array(zod_1.z.string()).optional(),
        }),
        /** Output schema for this capability */
        outputSchema: zod_1.z.object({
            type: zod_1.z.literal('object'),
            properties: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
        }).optional(),
        /** Whether this capability supports streaming */
        streaming: zod_1.z.boolean().optional(),
    })),
    /** Agent metadata */
    metadata: zod_1.z.object({
        /** Supported languages */
        languages: zod_1.z.array(zod_1.z.string()).optional(),
        /** Rate limits */
        rateLimits: zod_1.z.object({
            requestsPerMinute: zod_1.z.number(),
            tokensPerMinute: zod_1.z.number().optional(),
        }).optional(),
        /** Authentication requirements */
        authentication: zod_1.z.enum(['none', 'api-key', 'oauth2']).optional(),
    }).optional(),
});
/**
 * A2A Task State
 *
 * Represents the lifecycle state of a task in A2A
 */
var A2ATaskState;
(function (A2ATaskState) {
    /** Task has been created but not started */
    A2ATaskState["PENDING"] = "pending";
    /** Task is currently being executed */
    A2ATaskState["RUNNING"] = "running";
    /** Task is paused and can be resumed */
    A2ATaskState["PAUSED"] = "paused";
    /** Task completed successfully */
    A2ATaskState["COMPLETED"] = "completed";
    /** Task failed with an error */
    A2ATaskState["FAILED"] = "failed";
    /** Task was cancelled */
    A2ATaskState["CANCELLED"] = "cancelled";
})(A2ATaskState || (exports.A2ATaskState = A2ATaskState = {}));
/**
 * A2A Message Part
 *
 * A2A supports multi-modal messages with different content types
 */
exports.A2AMessagePartSchema = zod_1.z.union([
    /** Text content */
    zod_1.z.object({
        type: zod_1.z.literal('text'),
        text: zod_1.z.string(),
    }),
    /** Image content */
    zod_1.z.object({
        type: zod_1.z.literal('image'),
        mimeType: zod_1.z.string(),
        data: zod_1.z.string(), // base64 encoded
        alt: zod_1.z.string().optional(),
    }),
    /** File reference */
    zod_1.z.object({
        type: zod_1.z.literal('file'),
        mimeType: zod_1.z.string(),
        uri: zod_1.z.string(),
        name: zod_1.z.string(),
        size: zod_1.z.number().optional(),
    }),
    /** Code block */
    zod_1.z.object({
        type: zod_1.z.literal('code'),
        language: zod_1.z.string(),
        code: zod_1.z.string(),
    }),
    /** Structured data */
    zod_1.z.object({
        type: zod_1.z.literal('data'),
        mimeType: zod_1.z.literal('application/json'),
        data: zod_1.z.any(),
    }),
]);
/**
 * A2A Task Request
 *
 * Request to execute a task
 */
exports.A2ATaskRequestSchema = zod_1.z.object({
    /** Unique task ID */
    taskId: zod_1.z.string(),
    /** Target agent ID */
    agentId: zod_1.z.string(),
    /** Capability to invoke */
    capability: zod_1.z.string(),
    /** Task input as multi-modal message parts */
    input: zod_1.z.array(exports.A2AMessagePartSchema),
    /** Task context */
    context: zod_1.z.object({
        /** Conversation ID for maintaining context */
        conversationId: zod_1.z.string().optional(),
        /** Parent task ID for nested tasks */
        parentTaskId: zod_1.z.string().optional(),
        /** User preferences */
        preferences: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
        /** Session variables */
        sessionVars: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional()
    }).optional(),
    /** Task configuration */
    config: zod_1.z.object({
        /** Timeout in milliseconds */
        timeoutMs: zod_1.z.number().optional(),
        /** Whether to stream results */
        streaming: zod_1.z.boolean().optional(),
        /** Priority level */
        priority: zod_1.z.enum(['low', 'normal', 'high']).optional(),
        /** Retry policy */
        retryPolicy: zod_1.z.object({
            maxRetries: zod_1.z.number(),
            backoffMs: zod_1.z.number(),
        }).optional(),
    }).optional(),
});
/**
 * A2A Task Response
 *
 * Response from a task execution
 */
exports.A2ATaskResponseSchema = zod_1.z.object({
    /** Task ID (matches request) */
    taskId: zod_1.z.string(),
    /** Current task state */
    state: zod_1.z.nativeEnum(A2ATaskState),
    /** Task output (if completed) */
    output: zod_1.z.array(exports.A2AMessagePartSchema).optional(),
    /** Progress information (for running tasks) */
    progress: zod_1.z.object({
        /** Percentage complete (0-100) */
        percentage: zod_1.z.number().optional(),
        /** Current step description */
        message: zod_1.z.string().optional(),
        /** Estimated time remaining in ms */
        estimatedTimeRemainingMs: zod_1.z.number().optional(),
    }).optional(),
    /** Error information (if failed) */
    error: zod_1.z.object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        details: zod_1.z.any().optional(),
        recoverable: zod_1.z.boolean().optional(),
    }).optional(),
    /** Task metadata */
    metadata: zod_1.z.object({
        /** When the task started */
        startedAt: zod_1.z.number().optional(),
        /** When the task completed */
        completedAt: zod_1.z.number().optional(),
        /** Execution duration in ms */
        durationMs: zod_1.z.number().optional(),
        /** Resources consumed */
        resources: zod_1.z.object({
            cpuMs: zod_1.z.number().optional(),
            memoryMb: zod_1.z.number().optional(),
            tokens: zod_1.z.number().optional(),
        }).optional(),
    }).optional(),
});
/**
 * A2A Streaming Update
 *
 * Server-sent event for streaming task updates
 */
exports.A2AStreamingUpdateSchema = zod_1.z.object({
    /** Event type */
    event: zod_1.z.enum(['progress', 'partial', 'complete', 'error']),
    /** Task ID */
    taskId: zod_1.z.string(),
    /** Update data */
    data: zod_1.z.union([
        /** Progress update */
        zod_1.z.object({
            type: zod_1.z.literal('progress'),
            progress: zod_1.z.number(),
            message: zod_1.z.string().optional(),
        }),
        /** Partial result */
        zod_1.z.object({
            type: zod_1.z.literal('partial'),
            content: exports.A2AMessagePartSchema,
        }),
        /** Completion notification */
        zod_1.z.object({
            type: zod_1.z.literal('complete'),
            finalOutput: zod_1.z.array(exports.A2AMessagePartSchema),
        }),
        /** Error notification */
        zod_1.z.object({
            type: zod_1.z.literal('error'),
            error: zod_1.z.object({
                code: zod_1.z.string(),
                message: zod_1.z.string(),
            }),
        }),
    ]),
    /** Timestamp */
    timestamp: zod_1.z.number(),
});
//# sourceMappingURL=a2a.types.js.map