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
import { z } from 'zod';
import { ProtocolParadigm, TaskDefinition } from '../types/protocols';
/**
 * Agent Capability Card
 *
 * Describes what an agent can do in task-centric paradigm
 */
export declare const AgentCapabilityCardSchema: z.ZodObject<{
    agentId: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
    supportedTasks: z.ZodArray<z.ZodObject<{
        taskType: z.ZodString;
        description: z.ZodString;
        inputSchema: z.ZodOptional<z.ZodAny>;
        outputSchema: z.ZodOptional<z.ZodAny>;
        constraints: z.ZodOptional<z.ZodObject<{
            maxExecutionTime: z.ZodOptional<z.ZodNumber>;
            maxRetries: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    features: z.ZodOptional<z.ZodObject<{
        streaming: z.ZodDefault<z.ZodBoolean>;
        async: z.ZodDefault<z.ZodBoolean>;
        stateful: z.ZodDefault<z.ZodBoolean>;
        multiModal: z.ZodDefault<z.ZodBoolean>;
        collaborative: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>;
export type AgentCapabilityCard = z.infer<typeof AgentCapabilityCardSchema>;
/**
 * Task Request
 *
 * Request to initiate a task
 */
export declare const TaskRequestSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodString>;
    messageId: z.ZodString;
    type: z.ZodLiteral<"task_request">;
    task: z.ZodObject<{
        taskType: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        input: z.ZodAny;
        config: z.ZodOptional<z.ZodObject<{
            streaming: z.ZodOptional<z.ZodBoolean>;
            priority: z.ZodOptional<z.ZodEnum<{
                low: "low";
                normal: "normal";
                high: "high";
                critical: "critical";
            }>>;
            timeout: z.ZodOptional<z.ZodNumber>;
            callbacks: z.ZodOptional<z.ZodObject<{
                onProgress: z.ZodOptional<z.ZodString>;
                onPartialResult: z.ZodOptional<z.ZodString>;
                onError: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    context: z.ZodOptional<z.ZodObject<{
        conversationId: z.ZodOptional<z.ZodString>;
        sessionId: z.ZodOptional<z.ZodString>;
        parentTaskId: z.ZodOptional<z.ZodString>;
        variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        history: z.ZodOptional<z.ZodArray<z.ZodObject<{
            role: z.ZodEnum<{
                user: "user";
                assistant: "assistant";
                system: "system";
            }>;
            content: z.ZodString;
            timestamp: z.ZodNumber;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
    metadata: z.ZodOptional<z.ZodObject<{
        timestamp: z.ZodNumber;
        source: z.ZodOptional<z.ZodString>;
        traceId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type TaskRequest = z.infer<typeof TaskRequestSchema>;
/**
 * Task Response
 *
 * Response with task status and results
 */
export declare const TaskResponseSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodString>;
    messageId: z.ZodString;
    correlationId: z.ZodString;
    type: z.ZodLiteral<"task_response">;
    task: z.ZodObject<{
        taskId: z.ZodString;
        state: z.ZodEnum<{
            pending: "pending";
            queued: "queued";
            running: "running";
            paused: "paused";
            completed: "completed";
            failed: "failed";
            cancelled: "cancelled";
        }>;
        progress: z.ZodOptional<z.ZodObject<{
            percentage: z.ZodOptional<z.ZodNumber>;
            message: z.ZodOptional<z.ZodString>;
            currentStep: z.ZodOptional<z.ZodString>;
            totalSteps: z.ZodOptional<z.ZodNumber>;
            estimatedTimeRemaining: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        partialResult: z.ZodOptional<z.ZodAny>;
        result: z.ZodOptional<z.ZodAny>;
        error: z.ZodOptional<z.ZodObject<{
            code: z.ZodString;
            message: z.ZodString;
            details: z.ZodOptional<z.ZodAny>;
            recoverable: z.ZodOptional<z.ZodBoolean>;
            retryAfter: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        metadata: z.ZodOptional<z.ZodObject<{
            startedAt: z.ZodOptional<z.ZodNumber>;
            completedAt: z.ZodOptional<z.ZodNumber>;
            executionTime: z.ZodOptional<z.ZodNumber>;
            resourcesUsed: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    metadata: z.ZodOptional<z.ZodObject<{
        timestamp: z.ZodNumber;
        processingTime: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type TaskResponse = z.infer<typeof TaskResponseSchema>;
/**
 * Task Status Update
 *
 * Streaming status update for long-running tasks
 */
export declare const TaskStatusUpdateSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodString>;
    messageId: z.ZodString;
    type: z.ZodLiteral<"task_status_update">;
    taskId: z.ZodString;
    update: z.ZodObject<{
        state: z.ZodOptional<z.ZodEnum<{
            pending: "pending";
            queued: "queued";
            running: "running";
            paused: "paused";
            completed: "completed";
            failed: "failed";
            cancelled: "cancelled";
        }>>;
        progress: z.ZodOptional<z.ZodObject<{
            percentage: z.ZodOptional<z.ZodNumber>;
            message: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        partialResult: z.ZodOptional<z.ZodAny>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>;
    timestamp: z.ZodNumber;
}, z.core.$strip>;
export type TaskStatusUpdate = z.infer<typeof TaskStatusUpdateSchema>;
/**
 * Agent Discovery Request
 */
export declare const AgentDiscoveryRequestSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodString>;
    messageId: z.ZodString;
    type: z.ZodLiteral<"discover_agents">;
    params: z.ZodOptional<z.ZodObject<{
        filter: z.ZodOptional<z.ZodObject<{
            taskTypes: z.ZodOptional<z.ZodArray<z.ZodString>>;
            features: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type AgentDiscoveryRequest = z.infer<typeof AgentDiscoveryRequestSchema>;
/**
 * Agent Discovery Response
 */
export declare const AgentDiscoveryResponseSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodString>;
    messageId: z.ZodString;
    correlationId: z.ZodString;
    type: z.ZodLiteral<"agents_list">;
    result: z.ZodObject<{
        agents: z.ZodArray<z.ZodObject<{
            agentId: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
            version: z.ZodOptional<z.ZodString>;
            supportedTasks: z.ZodArray<z.ZodObject<{
                taskType: z.ZodString;
                description: z.ZodString;
                inputSchema: z.ZodOptional<z.ZodAny>;
                outputSchema: z.ZodOptional<z.ZodAny>;
                constraints: z.ZodOptional<z.ZodObject<{
                    maxExecutionTime: z.ZodOptional<z.ZodNumber>;
                    maxRetries: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strip>>;
            }, z.core.$strip>>;
            features: z.ZodOptional<z.ZodObject<{
                streaming: z.ZodDefault<z.ZodBoolean>;
                async: z.ZodDefault<z.ZodBoolean>;
                stateful: z.ZodDefault<z.ZodBoolean>;
                multiModal: z.ZodDefault<z.ZodBoolean>;
                collaborative: z.ZodDefault<z.ZodBoolean>;
            }, z.core.$strip>>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type AgentDiscoveryResponse = z.infer<typeof AgentDiscoveryResponseSchema>;
/**
 * Task-Centric Message Union
 */
export type TaskCentricMessage = TaskRequest | TaskResponse | TaskStatusUpdate | AgentDiscoveryRequest | AgentDiscoveryResponse;
/**
 * Task-Centric Protocol State
 */
export interface TaskCentricProtocolState {
    /** Connection status */
    status: 'connected' | 'disconnected' | 'error';
    /** Protocol paradigm */
    paradigm: ProtocolParadigm.TASK_CENTRIC;
    /** Available agents */
    agents: AgentCapabilityCard[];
    /** Active tasks */
    activeTasks: Map<string, {
        task: TaskDefinition;
        request: TaskRequest;
        startTime: number;
        lastUpdate: number;
        updates: TaskStatusUpdate[];
    }>;
    /** Conversation sessions */
    sessions: Map<string, {
        sessionId: string;
        conversationId?: string;
        variables: Record<string, any>;
        history: Array<{
            role: string;
            content: string;
            timestamp: number;
        }>;
    }>;
    /** Protocol capabilities */
    capabilities: {
        streaming: true;
        async: true;
        stateful: true;
        multiModal: boolean;
        collaborative: boolean;
    };
}
/**
 * Task-Centric Protocol Adapter Configuration
 */
export interface TaskCentricConfig {
    /** Protocol endpoint */
    endpoint?: string;
    /** Connection type */
    transport?: 'websocket' | 'grpc' | 'http2';
    /** Session management */
    session?: {
        persistState: boolean;
        stateStore?: 'memory' | 'redis' | 'database';
        ttl?: number;
    };
    /** Streaming configuration */
    streaming?: {
        bufferSize: number;
        flushInterval: number;
    };
    /** Task management */
    tasks?: {
        maxConcurrent: number;
        defaultTimeout: number;
        retryPolicy?: {
            maxAttempts: number;
            backoffMs: number;
            exponential: boolean;
        };
    };
}
/**
 * Convert to generic TaskDefinition
 */
export declare function toGenericTask(request: TaskRequest, response?: TaskResponse): TaskDefinition;
/**
 * Convert from generic TaskDefinition
 */
export declare function fromGenericTask(task: TaskDefinition): TaskRequest;
//# sourceMappingURL=task-centric.types.d.ts.map