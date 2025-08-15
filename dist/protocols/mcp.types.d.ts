/**
 * Model Context Protocol (MCP) Type Definitions
 *
 * MCP is Anthropic's tool-centric protocol for AI model integration.
 * It uses JSON-RPC 2.0 over WebSocket/stdio for communication.
 *
 * Key characteristics:
 * - Stateless tool invocation model
 * - Structured tool definition schemas
 * - URI-based resource access
 * - Ephemeral execution model
 */
import { z } from 'zod';
/**
 * MCP Tool Definition
 *
 * Defines a discrete function that can be invoked by the AI model.
 * Tools are the primary interaction method in MCP.
 */
export declare const MCPToolSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    inputSchema: z.ZodObject<{
        type: z.ZodLiteral<"object">;
        properties: z.ZodRecord<z.ZodString, z.ZodAny>;
        required: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type MCPTool = z.infer<typeof MCPToolSchema>;
/**
 * MCP Resource
 *
 * Represents external data that can be accessed via URI
 */
export declare const MCPResourceSchema: z.ZodObject<{
    uri: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type MCPResource = z.infer<typeof MCPResourceSchema>;
/**
 * MCP Prompt
 *
 * Pre-defined prompts that can be used by the model
 */
export declare const MCPPromptSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    arguments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type MCPPrompt = z.infer<typeof MCPPromptSchema>;
/**
 * MCP Tool Call Request
 *
 * Represents a request to invoke a tool
 */
export declare const MCPToolCallRequestSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    method: z.ZodLiteral<"tools/call">;
    params: z.ZodObject<{
        name: z.ZodString;
        arguments: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type MCPToolCallRequest = z.infer<typeof MCPToolCallRequestSchema>;
/**
 * MCP Tool Call Response
 *
 * Response from a tool invocation
 */
export declare const MCPToolCallResponseSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    result: z.ZodOptional<z.ZodObject<{
        content: z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<{
                text: "text";
                image: "image";
                resource: "resource";
            }>;
            text: z.ZodOptional<z.ZodString>;
            data: z.ZodOptional<z.ZodString>;
            uri: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        isError: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodNumber;
        message: z.ZodString;
        data: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type MCPToolCallResponse = z.infer<typeof MCPToolCallResponseSchema>;
/**
 * MCP List Tools Request
 *
 * Request to list available tools
 */
export declare const MCPListToolsRequestSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    method: z.ZodLiteral<"tools/list">;
    params: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
}, z.core.$strip>;
export type MCPListToolsRequest = z.infer<typeof MCPListToolsRequestSchema>;
/**
 * MCP List Tools Response
 */
export declare const MCPListToolsResponseSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    result: z.ZodObject<{
        tools: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodString;
            inputSchema: z.ZodObject<{
                type: z.ZodLiteral<"object">;
                properties: z.ZodRecord<z.ZodString, z.ZodAny>;
                required: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strip>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type MCPListToolsResponse = z.infer<typeof MCPListToolsResponseSchema>;
/**
 * MCP Message Type Union
 *
 * All possible MCP message types
 */
export type MCPMessage = MCPToolCallRequest | MCPToolCallResponse | MCPListToolsRequest | MCPListToolsResponse;
/**
 * MCP Connection State
 *
 * Tracks the state of an MCP connection
 */
export interface MCPConnectionState {
    /** Connection status */
    status: 'connected' | 'disconnected' | 'error';
    /** Available tools */
    tools: MCPTool[];
    /** Available resources */
    resources: MCPResource[];
    /** Available prompts */
    prompts: MCPPrompt[];
    /** Server capabilities */
    capabilities: {
        tools?: boolean;
        resources?: boolean;
        prompts?: boolean;
        sampling?: boolean;
    };
}
//# sourceMappingURL=mcp.types.d.ts.map