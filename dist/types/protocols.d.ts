/**
 * Generic Protocol Type Definitions for Semantic Translation Framework
 *
 * These types represent abstract protocol paradigms that can be mapped
 * to various real-world AI agent protocols (MCP, A2A, OpenAI, etc.)
 */
import { z } from 'zod';
/**
 * Protocol Paradigm Types
 */
export declare enum ProtocolParadigm {
    /** Stateless, tool-centric protocols (e.g., MCP-like) */
    TOOL_CENTRIC = "tool-centric",
    /** Stateful, task-centric protocols (e.g., A2A-like) */
    TASK_CENTRIC = "task-centric",
    /** Function-calling protocols (e.g., OpenAI-like) */
    FUNCTION_CALLING = "function-calling",
    /** Framework-specific protocols (e.g., LangChain, AutoGen) */
    FRAMEWORK_SPECIFIC = "framework-specific"
}
/**
 * Generic Tool Definition (Tool-Centric Paradigm)
 *
 * Represents a discrete, stateless function that can be invoked
 */
export declare const ToolDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
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
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>;
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;
/**
 * Generic Task Definition (Task-Centric Paradigm)
 *
 * Represents a stateful, long-running operation with lifecycle
 */
export declare const TaskDefinitionSchema: z.ZodObject<{
    taskId: z.ZodString;
    taskType: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    state: z.ZodEnum<{
        pending: "pending";
        queued: "queued";
        running: "running";
        paused: "paused";
        completed: "completed";
        failed: "failed";
        cancelled: "cancelled";
    }>;
    input: z.ZodAny;
    output: z.ZodOptional<z.ZodAny>;
    progress: z.ZodOptional<z.ZodObject<{
        percentage: z.ZodOptional<z.ZodNumber>;
        message: z.ZodOptional<z.ZodString>;
        estimatedTimeRemaining: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodAny>;
        recoverable: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    metadata: z.ZodOptional<z.ZodObject<{
        createdAt: z.ZodNumber;
        updatedAt: z.ZodNumber;
        completedAt: z.ZodOptional<z.ZodNumber>;
        parentTaskId: z.ZodOptional<z.ZodString>;
        sessionId: z.ZodOptional<z.ZodString>;
        priority: z.ZodOptional<z.ZodEnum<{
            low: "low";
            normal: "normal";
            high: "high";
            critical: "critical";
        }>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type TaskDefinition = z.infer<typeof TaskDefinitionSchema>;
/**
 * Generic Agent Capability Declaration
 *
 * Describes what an agent can do, regardless of protocol
 */
export interface AgentCapability {
    /** Capability identifier */
    id: string;
    /** Capability name */
    name: string;
    /** Description */
    description: string;
    /** Version */
    version?: string;
    /** Input specification */
    inputSpec?: any;
    /** Output specification */
    outputSpec?: any;
    /** Supported features */
    features?: {
        streaming?: boolean;
        async?: boolean;
        stateful?: boolean;
        multiModal?: boolean;
        transactional?: boolean;
    };
    /** Constraints and limits */
    constraints?: {
        maxExecutionTime?: number;
        maxInputSize?: number;
        maxOutputSize?: number;
        rateLimit?: number;
    };
    /** Additional metadata */
    metadata?: Record<string, any>;
}
/**
 * Protocol Message (Abstract)
 *
 * Base structure for any protocol message
 */
export interface ProtocolMessage {
    /** Message ID */
    id: string;
    /** Message type */
    type: 'request' | 'response' | 'event' | 'error';
    /** Protocol paradigm */
    paradigm: ProtocolParadigm;
    /** Timestamp */
    timestamp: number;
    /** Payload */
    payload: any;
    /** Optional correlation ID for request-response matching */
    correlationId?: string;
    /** Session or conversation ID */
    sessionId?: string;
    /** Protocol-specific headers */
    headers?: Record<string, any>;
    /** Message metadata */
    metadata?: Record<string, any>;
}
/**
 * Tool Invocation Request (Tool-Centric)
 */
export interface ToolInvocationRequest extends ProtocolMessage {
    type: 'request';
    paradigm: ProtocolParadigm.TOOL_CENTRIC;
    payload: {
        toolId: string;
        toolName: string;
        arguments: Record<string, any>;
        options?: {
            timeout?: number;
            retries?: number;
        };
    };
}
/**
 * Tool Invocation Response (Tool-Centric)
 */
export interface ToolInvocationResponse extends ProtocolMessage {
    type: 'response';
    paradigm: ProtocolParadigm.TOOL_CENTRIC;
    payload: {
        result?: any;
        error?: {
            code: string;
            message: string;
            details?: any;
        };
        metadata?: {
            executionTime?: number;
            retryCount?: number;
        };
    };
}
/**
 * Task Request (Task-Centric)
 */
export interface TaskRequest extends ProtocolMessage {
    type: 'request';
    paradigm: ProtocolParadigm.TASK_CENTRIC;
    payload: {
        taskType: string;
        input: any;
        context?: {
            conversationId?: string;
            parentTaskId?: string;
            sessionVariables?: Record<string, any>;
        };
        config?: {
            streaming?: boolean;
            timeout?: number;
            priority?: 'low' | 'normal' | 'high' | 'critical';
            callbacks?: {
                onProgress?: string;
                onPartialResult?: string;
            };
        };
    };
}
/**
 * Task Response (Task-Centric)
 */
export interface TaskResponse extends ProtocolMessage {
    type: 'response';
    paradigm: ProtocolParadigm.TASK_CENTRIC;
    payload: {
        taskId: string;
        state: string;
        output?: any;
        progress?: {
            percentage?: number;
            message?: string;
        };
        error?: {
            code: string;
            message: string;
        };
    };
}
/**
 * Protocol Features
 *
 * Describes what a protocol supports
 */
export interface ProtocolFeatures {
    /** Does the protocol support streaming? */
    streaming: boolean;
    /** Does the protocol maintain state? */
    stateful: boolean;
    /** Does the protocol support multi-modal data? */
    multiModal: boolean;
    /** Does the protocol support batching? */
    batching: boolean;
    /** Does the protocol support transactions? */
    transactions: boolean;
    /** Does the protocol support async operations? */
    async: boolean;
    /** Does the protocol support partial results? */
    partialResults: boolean;
    /** Does the protocol support capability discovery? */
    discovery: boolean;
}
/**
 * Protocol Manifest
 *
 * Complete description of a protocol's capabilities
 */
export interface ProtocolManifest {
    /** Protocol identifier */
    id: string;
    /** Protocol name */
    name: string;
    /** Protocol version */
    version: string;
    /** Protocol paradigm */
    paradigm: ProtocolParadigm;
    /** Supported features */
    features: ProtocolFeatures;
    /** Available capabilities */
    capabilities: AgentCapability[];
    /** Protocol constraints */
    constraints?: {
        maxMessageSize?: number;
        maxConcurrentRequests?: number;
        requestTimeout?: number;
        rateLimits?: {
            requestsPerSecond?: number;
            requestsPerMinute?: number;
        };
    };
    /** Protocol metadata */
    metadata?: {
        vendor?: string;
        documentation?: string;
        authentication?: string;
        transport?: string[];
    };
}
/**
 * Semantic Intent
 *
 * The extracted semantic meaning of a protocol message
 */
export interface SemanticIntent {
    /** What action is being requested */
    action: 'create' | 'read' | 'update' | 'delete' | 'analyze' | 'transform' | 'search' | 'execute' | 'monitor' | 'other';
    /** What is being acted upon */
    target: {
        type: string;
        identifier?: string;
        description?: string;
    };
    /** Parameters for the action */
    parameters: Record<string, any>;
    /** Constraints on the action */
    constraints?: {
        timeout?: number;
        priority?: string;
        quality?: string;
        format?: string;
    };
    /** Expected outcome */
    expectedOutcome?: {
        type: string;
        format?: string;
        schema?: any;
    };
    /** Context for the action */
    context?: {
        session?: string;
        conversation?: string;
        user?: string;
        environment?: string;
    };
}
/**
 * Protocol Adapter Interface
 *
 * All protocol adapters must implement this interface
 */
export interface ProtocolAdapter {
    /** Protocol manifest */
    manifest: ProtocolManifest;
    /** Parse incoming message */
    parseMessage(raw: any): ProtocolMessage;
    /** Serialize outgoing message */
    serializeMessage(message: ProtocolMessage): any;
    /** Extract semantic intent */
    extractIntent(message: ProtocolMessage): SemanticIntent;
    /** Reconstruct message from intent */
    reconstructMessage(intent: SemanticIntent): ProtocolMessage;
    /** Validate message against protocol rules */
    validateMessage(message: ProtocolMessage): boolean;
    /** Get protocol-specific metadata */
    getMetadata(): Record<string, any>;
}
//# sourceMappingURL=protocols.d.ts.map