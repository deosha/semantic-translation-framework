/**
 * Tool-Centric Protocol Type Definitions
 * 
 * Represents stateless, tool-centric protocols where AI agents interact
 * through discrete tool invocations. Based on paradigms like MCP.
 * 
 * Key characteristics:
 * - Stateless execution model
 * - Structured tool schemas
 * - Request-response pattern
 * - No inherent conversation state
 */

import { z } from 'zod';
import { ProtocolParadigm, ToolDefinition } from '../types/protocols';

/**
 * Tool-Centric Tool Schema
 * 
 * Defines a discrete function that can be invoked
 */
export const ToolCentricToolSchema = z.object({
  /** Unique identifier for the tool */
  name: z.string(),
  
  /** Human-readable description */
  description: z.string(),
  
  /** JSON Schema defining input parameters */
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.string(), z.any()),
    required: z.array(z.string()).optional(),
  }),
  
  /** Optional output schema */
  outputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.string(), z.any()),
  }).optional(),
});

export type ToolCentricTool = z.infer<typeof ToolCentricToolSchema>;

/**
 * Tool-Centric Resource
 * 
 * External data accessible via URI
 */
export const ToolCentricResourceSchema = z.object({
  /** URI identifying the resource */
  uri: z.string(),
  
  /** Resource name */
  name: z.string(),
  
  /** Resource description */
  description: z.string().optional(),
  
  /** MIME type */
  mimeType: z.string().optional(),
  
  /** Metadata */
  metadata: z.record(z.string(), z.any()).optional(),
});

export type ToolCentricResource = z.infer<typeof ToolCentricResourceSchema>;

/**
 * Tool Invocation Request
 * 
 * Request to execute a tool
 */
export const ToolInvocationRequestSchema = z.object({
  /** Protocol version */
  version: z.string().default('1.0'),
  
  /** Request ID */
  id: z.union([z.string(), z.number()]),
  
  /** Request type */
  type: z.literal('tool_invocation'),
  
  /** Tool invocation details */
  payload: z.object({
    /** Tool identifier */
    toolName: z.string(),
    
    /** Tool arguments */
    arguments: z.record(z.string(), z.any()).optional(),
    
    /** Execution options */
    options: z.object({
      timeout: z.number().optional(),
      retries: z.number().optional(),
      async: z.boolean().optional(),
    }).optional(),
  }),
  
  /** Request metadata */
  metadata: z.object({
    timestamp: z.number(),
    source: z.string().optional(),
    traceId: z.string().optional(),
  }).optional(),
});

export type ToolInvocationRequest = z.infer<typeof ToolInvocationRequestSchema>;

/**
 * Tool Invocation Response
 * 
 * Response from tool execution
 */
export const ToolInvocationResponseSchema = z.object({
  /** Protocol version */
  version: z.string().default('1.0'),
  
  /** Request ID (matches request) */
  id: z.union([z.string(), z.number()]),
  
  /** Response type */
  type: z.literal('tool_response'),
  
  /** Execution result */
  result: z.object({
    /** Output content */
    content: z.array(z.object({
      type: z.enum(['text', 'image', 'data', 'resource']),
      text: z.string().optional(),
      data: z.any().optional(),
      uri: z.string().optional(),
      mimeType: z.string().optional(),
    })),
    
    /** Success status */
    success: z.boolean(),
    
    /** Execution metadata */
    executionTime: z.number().optional(),
  }).optional(),
  
  /** Error information */
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
    recoverable: z.boolean().optional(),
  }).optional(),
  
  /** Response metadata */
  metadata: z.object({
    timestamp: z.number(),
    processingTime: z.number().optional(),
  }).optional(),
});

export type ToolInvocationResponse = z.infer<typeof ToolInvocationResponseSchema>;

/**
 * Tool Discovery Request
 * 
 * Request to discover available tools
 */
export const ToolDiscoveryRequestSchema = z.object({
  version: z.string().default('1.0'),
  id: z.union([z.string(), z.number()]),
  type: z.literal('discover_tools'),
  params: z.object({
    filter: z.object({
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }).optional(),
  }).optional(),
});

export type ToolDiscoveryRequest = z.infer<typeof ToolDiscoveryRequestSchema>;

/**
 * Tool Discovery Response
 */
export const ToolDiscoveryResponseSchema = z.object({
  version: z.string().default('1.0'),
  id: z.union([z.string(), z.number()]),
  type: z.literal('tools_list'),
  result: z.object({
    tools: z.array(ToolCentricToolSchema),
    resources: z.array(ToolCentricResourceSchema).optional(),
  }),
});

export type ToolDiscoveryResponse = z.infer<typeof ToolDiscoveryResponseSchema>;

/**
 * Tool-Centric Message Union
 */
export type ToolCentricMessage = 
  | ToolInvocationRequest
  | ToolInvocationResponse
  | ToolDiscoveryRequest
  | ToolDiscoveryResponse;

/**
 * Tool-Centric Protocol State
 */
export interface ToolCentricProtocolState {
  /** Connection status */
  status: 'connected' | 'disconnected' | 'error';
  
  /** Protocol paradigm */
  paradigm: ProtocolParadigm.TOOL_CENTRIC;
  
  /** Available tools */
  tools: ToolCentricTool[];
  
  /** Available resources */
  resources: ToolCentricResource[];
  
  /** Protocol capabilities */
  capabilities: {
    tools: boolean;
    resources: boolean;
    async: boolean;
    batching: boolean;
    streaming: false; // Tool-centric typically doesn't support streaming
  };
  
  /** Active requests */
  pendingRequests: Map<string | number, {
    request: ToolInvocationRequest;
    timestamp: number;
    timeout?: NodeJS.Timeout;
  }>;
}

/**
 * Tool-Centric Protocol Adapter Configuration
 */
export interface ToolCentricConfig {
  /** Protocol endpoint */
  endpoint?: string;
  
  /** Connection type */
  transport?: 'http' | 'websocket' | 'stdio';
  
  /** Default timeout */
  defaultTimeout?: number;
  
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    backoffMs: number;
  };
  
  /** Protocol extensions */
  extensions?: Record<string, any>;
}

/**
 * Convert to generic ToolDefinition
 */
export function toGenericTool(tool: ToolCentricTool): ToolDefinition {
  return {
    id: tool.name,
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
    metadata: {
      paradigm: ProtocolParadigm.TOOL_CENTRIC,
    }
  };
}

/**
 * Convert from generic ToolDefinition
 */
export function fromGenericTool(tool: ToolDefinition): ToolCentricTool {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
  };
}