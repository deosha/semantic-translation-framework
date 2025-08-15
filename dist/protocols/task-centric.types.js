"use strict";
/**
 * Task-Centric Protocol Type Definitions
 *
 * Represents stateful, task-centric protocols where AI agents manage
 * long-running tasks with lifecycle management. Based on paradigms like A2A.
 *
 * Key characteristics:
 * - Stateful task lifecycle
 * - Streaming support
 * - Progress tracking
 * - Conversation context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentDiscoveryResponseSchema = exports.AgentDiscoveryRequestSchema = exports.TaskStatusUpdateSchema = exports.TaskResponseSchema = exports.TaskRequestSchema = exports.AgentCapabilityCardSchema = void 0;
exports.toGenericTask = toGenericTask;
exports.fromGenericTask = fromGenericTask;
const zod_1 = require("zod");
/**
 * Agent Capability Card
 *
 * Describes what an agent can do in task-centric paradigm
 */
exports.AgentCapabilityCardSchema = zod_1.z.object({
    /** Agent identifier */
    agentId: zod_1.z.string(),
    /** Agent name */
    name: zod_1.z.string(),
    /** Description */
    description: zod_1.z.string(),
    /** Version */
    version: zod_1.z.string().optional(),
    /** Supported task types */
    supportedTasks: zod_1.z.array(zod_1.z.object({
        taskType: zod_1.z.string(),
        description: zod_1.z.string(),
        inputSchema: zod_1.z.any().optional(),
        outputSchema: zod_1.z.any().optional(),
        constraints: zod_1.z.object({
            maxExecutionTime: zod_1.z.number().optional(),
            maxRetries: zod_1.z.number().optional(),
        }).optional(),
    })),
    /** Agent features */
    features: zod_1.z.object({
        streaming: zod_1.z.boolean().default(true),
        async: zod_1.z.boolean().default(true),
        stateful: zod_1.z.boolean().default(true),
        multiModal: zod_1.z.boolean().default(false),
        collaborative: zod_1.z.boolean().default(false),
    }).optional(),
    /** Metadata */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
/**
 * Task Request
 *
 * Request to initiate a task
 */
exports.TaskRequestSchema = zod_1.z.object({
    /** Protocol version */
    version: zod_1.z.string().default('1.0'),
    /** Message ID */
    messageId: zod_1.z.string(),
    /** Message type */
    type: zod_1.z.literal('task_request'),
    /** Task details */
    task: zod_1.z.object({
        /** Task type */
        taskType: zod_1.z.string(),
        /** Task description */
        description: zod_1.z.string().optional(),
        /** Input data */
        input: zod_1.z.any(),
        /** Task configuration */
        config: zod_1.z.object({
            streaming: zod_1.z.boolean().optional(),
            priority: zod_1.z.enum(['low', 'normal', 'high', 'critical']).optional(),
            timeout: zod_1.z.number().optional(),
            callbacks: zod_1.z.object({
                onProgress: zod_1.z.string().optional(),
                onPartialResult: zod_1.z.string().optional(),
                onError: zod_1.z.string().optional(),
            }).optional(),
        }).optional(),
    }),
    /** Conversation context */
    context: zod_1.z.object({
        conversationId: zod_1.z.string().optional(),
        sessionId: zod_1.z.string().optional(),
        parentTaskId: zod_1.z.string().optional(),
        variables: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
        history: zod_1.z.array(zod_1.z.object({
            role: zod_1.z.enum(['user', 'assistant', 'system']),
            content: zod_1.z.string(),
            timestamp: zod_1.z.number(),
        })).optional(),
    }).optional(),
    /** Request metadata */
    metadata: zod_1.z.object({
        timestamp: zod_1.z.number(),
        source: zod_1.z.string().optional(),
        traceId: zod_1.z.string().optional(),
    }).optional(),
});
/**
 * Task Response
 *
 * Response with task status and results
 */
exports.TaskResponseSchema = zod_1.z.object({
    /** Protocol version */
    version: zod_1.z.string().default('1.0'),
    /** Message ID */
    messageId: zod_1.z.string(),
    /** Correlation ID (matches request) */
    correlationId: zod_1.z.string(),
    /** Message type */
    type: zod_1.z.literal('task_response'),
    /** Task status */
    task: zod_1.z.object({
        /** Unique task ID */
        taskId: zod_1.z.string(),
        /** Current state */
        state: zod_1.z.enum(['pending', 'queued', 'running', 'paused', 'completed', 'failed', 'cancelled']),
        /** Progress information */
        progress: zod_1.z.object({
            percentage: zod_1.z.number().min(0).max(100).optional(),
            message: zod_1.z.string().optional(),
            currentStep: zod_1.z.string().optional(),
            totalSteps: zod_1.z.number().optional(),
            estimatedTimeRemaining: zod_1.z.number().optional(),
        }).optional(),
        /** Partial results (for streaming) */
        partialResult: zod_1.z.any().optional(),
        /** Final result (when completed) */
        result: zod_1.z.any().optional(),
        /** Error information */
        error: zod_1.z.object({
            code: zod_1.z.string(),
            message: zod_1.z.string(),
            details: zod_1.z.any().optional(),
            recoverable: zod_1.z.boolean().optional(),
            retryAfter: zod_1.z.number().optional(),
        }).optional(),
        /** Task metadata */
        metadata: zod_1.z.object({
            startedAt: zod_1.z.number().optional(),
            completedAt: zod_1.z.number().optional(),
            executionTime: zod_1.z.number().optional(),
            resourcesUsed: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
        }).optional(),
    }),
    /** Response metadata */
    metadata: zod_1.z.object({
        timestamp: zod_1.z.number(),
        processingTime: zod_1.z.number().optional(),
    }).optional(),
});
/**
 * Task Status Update
 *
 * Streaming status update for long-running tasks
 */
exports.TaskStatusUpdateSchema = zod_1.z.object({
    version: zod_1.z.string().default('1.0'),
    messageId: zod_1.z.string(),
    type: zod_1.z.literal('task_status_update'),
    taskId: zod_1.z.string(),
    update: zod_1.z.object({
        state: zod_1.z.enum(['pending', 'queued', 'running', 'paused', 'completed', 'failed', 'cancelled']).optional(),
        progress: zod_1.z.object({
            percentage: zod_1.z.number().optional(),
            message: zod_1.z.string().optional(),
        }).optional(),
        partialResult: zod_1.z.any().optional(),
        metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    }),
    timestamp: zod_1.z.number(),
});
/**
 * Agent Discovery Request
 */
exports.AgentDiscoveryRequestSchema = zod_1.z.object({
    version: zod_1.z.string().default('1.0'),
    messageId: zod_1.z.string(),
    type: zod_1.z.literal('discover_agents'),
    params: zod_1.z.object({
        filter: zod_1.z.object({
            taskTypes: zod_1.z.array(zod_1.z.string()).optional(),
            features: zod_1.z.array(zod_1.z.string()).optional(),
        }).optional(),
    }).optional(),
});
/**
 * Agent Discovery Response
 */
exports.AgentDiscoveryResponseSchema = zod_1.z.object({
    version: zod_1.z.string().default('1.0'),
    messageId: zod_1.z.string(),
    correlationId: zod_1.z.string(),
    type: zod_1.z.literal('agents_list'),
    result: zod_1.z.object({
        agents: zod_1.z.array(exports.AgentCapabilityCardSchema),
    }),
});
/**
 * Convert to generic TaskDefinition
 */
function toGenericTask(request, response) {
    const taskId = response?.task.taskId || generateTaskId();
    const state = response?.task.state || 'pending';
    return {
        taskId,
        taskType: request.task.taskType,
        description: request.task.description,
        state,
        input: request.task.input,
        output: response?.task.result,
        progress: response?.task.progress,
        error: response?.task.error,
        metadata: {
            createdAt: request.metadata?.timestamp || Date.now(),
            updatedAt: response?.metadata?.timestamp || Date.now(),
            sessionId: request.context?.sessionId,
            parentTaskId: request.context?.parentTaskId,
            priority: request.task.config?.priority,
            ...response?.task.metadata,
        }
    };
}
/**
 * Convert from generic TaskDefinition
 */
function fromGenericTask(task) {
    return {
        version: '1.0',
        messageId: generateMessageId(),
        type: 'task_request',
        task: {
            taskType: task.taskType,
            description: task.description,
            input: task.input,
            config: {
                priority: task.metadata?.priority,
                timeout: task.metadata?.timeout,
            }
        },
        context: {
            sessionId: task.metadata?.sessionId,
            parentTaskId: task.metadata?.parentTaskId,
        },
        metadata: {
            timestamp: Date.now(),
        }
    };
}
// Helper functions
function generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
//# sourceMappingURL=task-centric.types.js.map