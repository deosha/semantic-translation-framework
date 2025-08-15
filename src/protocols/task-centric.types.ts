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
export const AgentCapabilityCardSchema = z.object({
  /** Agent identifier */
  agentId: z.string(),
  
  /** Agent name */
  name: z.string(),
  
  /** Description */
  description: z.string(),
  
  /** Version */
  version: z.string().optional(),
  
  /** Supported task types */
  supportedTasks: z.array(z.object({
    taskType: z.string(),
    description: z.string(),
    inputSchema: z.any().optional(),
    outputSchema: z.any().optional(),
    constraints: z.object({
      maxExecutionTime: z.number().optional(),
      maxRetries: z.number().optional(),
    }).optional(),
  })),
  
  /** Agent features */
  features: z.object({
    streaming: z.boolean().default(true),
    async: z.boolean().default(true),
    stateful: z.boolean().default(true),
    multiModal: z.boolean().default(false),
    collaborative: z.boolean().default(false),
  }).optional(),
  
  /** Metadata */
  metadata: z.record(z.string(), z.any()).optional(),
});

export type AgentCapabilityCard = z.infer<typeof AgentCapabilityCardSchema>;

/**
 * Task Request
 * 
 * Request to initiate a task
 */
export const TaskRequestSchema = z.object({
  /** Protocol version */
  version: z.string().default('1.0'),
  
  /** Message ID */
  messageId: z.string(),
  
  /** Message type */
  type: z.literal('task_request'),
  
  /** Task details */
  task: z.object({
    /** Task type */
    taskType: z.string(),
    
    /** Task description */
    description: z.string().optional(),
    
    /** Input data */
    input: z.any(),
    
    /** Task configuration */
    config: z.object({
      streaming: z.boolean().optional(),
      priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
      timeout: z.number().optional(),
      callbacks: z.object({
        onProgress: z.string().optional(),
        onPartialResult: z.string().optional(),
        onError: z.string().optional(),
      }).optional(),
    }).optional(),
  }),
  
  /** Conversation context */
  context: z.object({
    conversationId: z.string().optional(),
    sessionId: z.string().optional(),
    parentTaskId: z.string().optional(),
    variables: z.record(z.string(), z.any()).optional(),
    history: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
      timestamp: z.number(),
    })).optional(),
  }).optional(),
  
  /** Request metadata */
  metadata: z.object({
    timestamp: z.number(),
    source: z.string().optional(),
    traceId: z.string().optional(),
  }).optional(),
});

export type TaskRequest = z.infer<typeof TaskRequestSchema>;

/**
 * Task Response
 * 
 * Response with task status and results
 */
export const TaskResponseSchema = z.object({
  /** Protocol version */
  version: z.string().default('1.0'),
  
  /** Message ID */
  messageId: z.string(),
  
  /** Correlation ID (matches request) */
  correlationId: z.string(),
  
  /** Message type */
  type: z.literal('task_response'),
  
  /** Task status */
  task: z.object({
    /** Unique task ID */
    taskId: z.string(),
    
    /** Current state */
    state: z.enum(['pending', 'queued', 'running', 'paused', 'completed', 'failed', 'cancelled']),
    
    /** Progress information */
    progress: z.object({
      percentage: z.number().min(0).max(100).optional(),
      message: z.string().optional(),
      currentStep: z.string().optional(),
      totalSteps: z.number().optional(),
      estimatedTimeRemaining: z.number().optional(),
    }).optional(),
    
    /** Partial results (for streaming) */
    partialResult: z.any().optional(),
    
    /** Final result (when completed) */
    result: z.any().optional(),
    
    /** Error information */
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional(),
      recoverable: z.boolean().optional(),
      retryAfter: z.number().optional(),
    }).optional(),
    
    /** Task metadata */
    metadata: z.object({
      startedAt: z.number().optional(),
      completedAt: z.number().optional(),
      executionTime: z.number().optional(),
      resourcesUsed: z.record(z.string(), z.any()).optional(),
    }).optional(),
  }),
  
  /** Response metadata */
  metadata: z.object({
    timestamp: z.number(),
    processingTime: z.number().optional(),
  }).optional(),
});

export type TaskResponse = z.infer<typeof TaskResponseSchema>;

/**
 * Task Status Update
 * 
 * Streaming status update for long-running tasks
 */
export const TaskStatusUpdateSchema = z.object({
  version: z.string().default('1.0'),
  messageId: z.string(),
  type: z.literal('task_status_update'),
  taskId: z.string(),
  update: z.object({
    state: z.enum(['pending', 'queued', 'running', 'paused', 'completed', 'failed', 'cancelled']).optional(),
    progress: z.object({
      percentage: z.number().optional(),
      message: z.string().optional(),
    }).optional(),
    partialResult: z.any().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
  timestamp: z.number(),
});

export type TaskStatusUpdate = z.infer<typeof TaskStatusUpdateSchema>;

/**
 * Agent Discovery Request
 */
export const AgentDiscoveryRequestSchema = z.object({
  version: z.string().default('1.0'),
  messageId: z.string(),
  type: z.literal('discover_agents'),
  params: z.object({
    filter: z.object({
      taskTypes: z.array(z.string()).optional(),
      features: z.array(z.string()).optional(),
    }).optional(),
  }).optional(),
});

export type AgentDiscoveryRequest = z.infer<typeof AgentDiscoveryRequestSchema>;

/**
 * Agent Discovery Response
 */
export const AgentDiscoveryResponseSchema = z.object({
  version: z.string().default('1.0'),
  messageId: z.string(),
  correlationId: z.string(),
  type: z.literal('agents_list'),
  result: z.object({
    agents: z.array(AgentCapabilityCardSchema),
  }),
});

export type AgentDiscoveryResponse = z.infer<typeof AgentDiscoveryResponseSchema>;

/**
 * Task-Centric Message Union
 */
export type TaskCentricMessage = 
  | TaskRequest
  | TaskResponse
  | TaskStatusUpdate
  | AgentDiscoveryRequest
  | AgentDiscoveryResponse;

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
export function toGenericTask(
  request: TaskRequest, 
  response?: TaskResponse
): TaskDefinition {
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
      paradigm: ProtocolParadigm.TASK_CENTRIC,
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
export function fromGenericTask(task: TaskDefinition): TaskRequest {
  return {
    version: '1.0',
    messageId: generateMessageId(),
    type: 'task_request',
    task: {
      taskType: task.taskType,
      description: task.description,
      input: task.input,
      config: {
        priority: task.metadata?.priority as any,
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
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}