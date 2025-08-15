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
import { z } from 'zod';
/**
 * A2A Agent Card
 *
 * Declares an agent's capabilities and interaction patterns.
 * Similar to MCP tools but with richer metadata and state management.
 */
export declare const A2AAgentCardSchema: z.ZodObject<{
    agentId: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    version: z.ZodString;
    capabilities: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        inputSchema: z.ZodObject<{
            type: z.ZodLiteral<"object">;
            properties: z.ZodRecord<z.ZodString, z.ZodAny>;
            required: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>;
        outputSchema: z.ZodOptional<z.ZodObject<{
            type: z.ZodLiteral<"object">;
            properties: z.ZodRecord<z.ZodString, z.ZodAny>;
        }, z.core.$strip>>;
        streaming: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    metadata: z.ZodOptional<z.ZodObject<{
        languages: z.ZodOptional<z.ZodArray<z.ZodString>>;
        rateLimits: z.ZodOptional<z.ZodObject<{
            requestsPerMinute: z.ZodNumber;
            tokensPerMinute: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        authentication: z.ZodOptional<z.ZodEnum<{
            none: "none";
            "api-key": "api-key";
            oauth2: "oauth2";
        }>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type A2AAgentCard = z.infer<typeof A2AAgentCardSchema>;
/**
 * A2A Task State
 *
 * Represents the lifecycle state of a task in A2A
 */
export declare enum A2ATaskState {
    /** Task has been created but not started */
    PENDING = "pending",
    /** Task is currently being executed */
    RUNNING = "running",
    /** Task is paused and can be resumed */
    PAUSED = "paused",
    /** Task completed successfully */
    COMPLETED = "completed",
    /** Task failed with an error */
    FAILED = "failed",
    /** Task was cancelled */
    CANCELLED = "cancelled"
}
/**
 * A2A Message Part
 *
 * A2A supports multi-modal messages with different content types
 */
export declare const A2AMessagePartSchema: z.ZodUnion<readonly [z.ZodObject<{
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"image">;
    mimeType: z.ZodString;
    data: z.ZodString;
    alt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"file">;
    mimeType: z.ZodString;
    uri: z.ZodString;
    name: z.ZodString;
    size: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"code">;
    language: z.ZodString;
    code: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"data">;
    mimeType: z.ZodLiteral<"application/json">;
    data: z.ZodAny;
}, z.core.$strip>]>;
export type A2AMessagePart = z.infer<typeof A2AMessagePartSchema>;
/**
 * A2A Task Request
 *
 * Request to execute a task
 */
export declare const A2ATaskRequestSchema: z.ZodObject<{
    taskId: z.ZodString;
    agentId: z.ZodString;
    capability: z.ZodString;
    input: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"image">;
        mimeType: z.ZodString;
        data: z.ZodString;
        alt: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"file">;
        mimeType: z.ZodString;
        uri: z.ZodString;
        name: z.ZodString;
        size: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"code">;
        language: z.ZodString;
        code: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"data">;
        mimeType: z.ZodLiteral<"application/json">;
        data: z.ZodAny;
    }, z.core.$strip>]>>;
    context: z.ZodOptional<z.ZodObject<{
        conversationId: z.ZodOptional<z.ZodString>;
        parentTaskId: z.ZodOptional<z.ZodString>;
        preferences: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        sessionVars: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>>;
    config: z.ZodOptional<z.ZodObject<{
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        streaming: z.ZodOptional<z.ZodBoolean>;
        priority: z.ZodOptional<z.ZodEnum<{
            low: "low";
            normal: "normal";
            high: "high";
        }>>;
        retryPolicy: z.ZodOptional<z.ZodObject<{
            maxRetries: z.ZodNumber;
            backoffMs: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type A2ATaskRequest = z.infer<typeof A2ATaskRequestSchema>;
/**
 * A2A Task Response
 *
 * Response from a task execution
 */
export declare const A2ATaskResponseSchema: z.ZodObject<{
    taskId: z.ZodString;
    state: z.ZodEnum<typeof A2ATaskState>;
    output: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"image">;
        mimeType: z.ZodString;
        data: z.ZodString;
        alt: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"file">;
        mimeType: z.ZodString;
        uri: z.ZodString;
        name: z.ZodString;
        size: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"code">;
        language: z.ZodString;
        code: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"data">;
        mimeType: z.ZodLiteral<"application/json">;
        data: z.ZodAny;
    }, z.core.$strip>]>>>;
    progress: z.ZodOptional<z.ZodObject<{
        percentage: z.ZodOptional<z.ZodNumber>;
        message: z.ZodOptional<z.ZodString>;
        estimatedTimeRemainingMs: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodAny>;
        recoverable: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    metadata: z.ZodOptional<z.ZodObject<{
        startedAt: z.ZodOptional<z.ZodNumber>;
        completedAt: z.ZodOptional<z.ZodNumber>;
        durationMs: z.ZodOptional<z.ZodNumber>;
        resources: z.ZodOptional<z.ZodObject<{
            cpuMs: z.ZodOptional<z.ZodNumber>;
            memoryMb: z.ZodOptional<z.ZodNumber>;
            tokens: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type A2ATaskResponse = z.infer<typeof A2ATaskResponseSchema>;
/**
 * A2A Streaming Update
 *
 * Server-sent event for streaming task updates
 */
export declare const A2AStreamingUpdateSchema: z.ZodObject<{
    event: z.ZodEnum<{
        error: "error";
        progress: "progress";
        partial: "partial";
        complete: "complete";
    }>;
    taskId: z.ZodString;
    data: z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodLiteral<"progress">;
        progress: z.ZodNumber;
        message: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"partial">;
        content: z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
            mimeType: z.ZodString;
            data: z.ZodString;
            alt: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"file">;
            mimeType: z.ZodString;
            uri: z.ZodString;
            name: z.ZodString;
            size: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"code">;
            language: z.ZodString;
            code: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"data">;
            mimeType: z.ZodLiteral<"application/json">;
            data: z.ZodAny;
        }, z.core.$strip>]>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"complete">;
        finalOutput: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
            mimeType: z.ZodString;
            data: z.ZodString;
            alt: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"file">;
            mimeType: z.ZodString;
            uri: z.ZodString;
            name: z.ZodString;
            size: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"code">;
            language: z.ZodString;
            code: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"data">;
            mimeType: z.ZodLiteral<"application/json">;
            data: z.ZodAny;
        }, z.core.$strip>]>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"error">;
        error: z.ZodObject<{
            code: z.ZodString;
            message: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>]>;
    timestamp: z.ZodNumber;
}, z.core.$strip>;
export type A2AStreamingUpdate = z.infer<typeof A2AStreamingUpdateSchema>;
/**
 * A2A Conversation Context
 *
 * Maintains state across multiple task interactions
 */
export interface A2AConversationContext {
    /** Unique conversation ID */
    conversationId: string;
    /** Participating agents */
    agents: string[];
    /** Conversation history */
    history: Array<{
        taskId: string;
        agentId: string;
        capability: string;
        input: A2AMessagePart[];
        output?: A2AMessagePart[];
        timestamp: number;
    }>;
    /** Shared context variables */
    sharedContext: Map<string, any>;
    /** Active tasks in this conversation */
    activeTasks: Set<string>;
}
//# sourceMappingURL=a2a.types.d.ts.map