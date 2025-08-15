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
export declare const ToolCentricToolSchema: z.ZodObject<{
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
}, z.core.$strip>;
export type ToolCentricTool = z.infer<typeof ToolCentricToolSchema>;
/**
 * Tool-Centric Resource
 *
 * External data accessible via URI
 */
export declare const ToolCentricResourceSchema: z.ZodObject<{
    uri: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>;
export type ToolCentricResource = z.infer<typeof ToolCentricResourceSchema>;
/**
 * Tool Invocation Request
 *
 * Request to execute a tool
 */
export declare const ToolInvocationRequestSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodString>;
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    type: z.ZodLiteral<"tool_invocation">;
    payload: z.ZodObject<{
        toolName: z.ZodString;
        arguments: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        options: z.ZodOptional<z.ZodObject<{
            timeout: z.ZodOptional<z.ZodNumber>;
            retries: z.ZodOptional<z.ZodNumber>;
            async: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    metadata: z.ZodOptional<z.ZodObject<{
        timestamp: z.ZodNumber;
        source: z.ZodOptional<z.ZodString>;
        traceId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ToolInvocationRequest = z.infer<typeof ToolInvocationRequestSchema>;
/**
 * Tool Invocation Response
 *
 * Response from tool execution
 */
export declare const ToolInvocationResponseSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodString>;
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    type: z.ZodLiteral<"tool_response">;
    result: z.ZodOptional<z.ZodObject<{
        content: z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<{
                data: "data";
                text: "text";
                image: "image";
                resource: "resource";
            }>;
            text: z.ZodOptional<z.ZodString>;
            data: z.ZodOptional<z.ZodAny>;
            uri: z.ZodOptional<z.ZodString>;
            mimeType: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        success: z.ZodBoolean;
        executionTime: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodAny>;
        recoverable: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    metadata: z.ZodOptional<z.ZodObject<{
        timestamp: z.ZodNumber;
        processingTime: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ToolInvocationResponse = z.infer<typeof ToolInvocationResponseSchema>;
/**
 * Tool Discovery Request
 *
 * Request to discover available tools
 */
export declare const ToolDiscoveryRequestSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodString>;
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    type: z.ZodLiteral<"discover_tools">;
    params: z.ZodOptional<z.ZodObject<{
        filter: z.ZodOptional<z.ZodObject<{
            category: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ToolDiscoveryRequest = z.infer<typeof ToolDiscoveryRequestSchema>;
/**
 * Tool Discovery Response
 */
export declare const ToolDiscoveryResponseSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodString>;
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    type: z.ZodLiteral<"tools_list">;
    result: z.ZodObject<{
        tools: z.ZodArray<z.ZodObject<{
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
        }, z.core.$strip>>;
        resources: z.ZodOptional<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            mimeType: z.ZodOptional<z.ZodString>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type ToolDiscoveryResponse = z.infer<typeof ToolDiscoveryResponseSchema>;
/**
 * Tool-Centric Message Union
 */
export type ToolCentricMessage = ToolInvocationRequest | ToolInvocationResponse | ToolDiscoveryRequest | ToolDiscoveryResponse;
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
        streaming: false;
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
export declare function toGenericTool(tool: ToolCentricTool): ToolDefinition;
/**
 * Convert from generic ToolDefinition
 */
export declare function fromGenericTool(tool: ToolDefinition): ToolCentricTool;
//# sourceMappingURL=tool-centric.types.d.ts.map