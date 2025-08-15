"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPListToolsResponseSchema = exports.MCPListToolsRequestSchema = exports.MCPToolCallResponseSchema = exports.MCPToolCallRequestSchema = exports.MCPPromptSchema = exports.MCPResourceSchema = exports.MCPToolSchema = void 0;
const zod_1 = require("zod");
/**
 * MCP Tool Definition
 *
 * Defines a discrete function that can be invoked by the AI model.
 * Tools are the primary interaction method in MCP.
 */
exports.MCPToolSchema = zod_1.z.object({
    /** Unique identifier for the tool */
    name: zod_1.z.string(),
    /** Human-readable description of what the tool does */
    description: zod_1.z.string(),
    /** JSON Schema defining the tool's input parameters */
    inputSchema: zod_1.z.object({
        type: zod_1.z.literal('object'),
        properties: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
        required: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
/**
 * MCP Resource
 *
 * Represents external data that can be accessed via URI
 */
exports.MCPResourceSchema = zod_1.z.object({
    /** URI identifying the resource */
    uri: zod_1.z.string(),
    /** Resource name */
    name: zod_1.z.string(),
    /** Description of the resource */
    description: zod_1.z.string().optional(),
    /** MIME type of the resource */
    mimeType: zod_1.z.string().optional(),
});
/**
 * MCP Prompt
 *
 * Pre-defined prompts that can be used by the model
 */
exports.MCPPromptSchema = zod_1.z.object({
    /** Prompt identifier */
    name: zod_1.z.string(),
    /** Prompt description */
    description: zod_1.z.string().optional(),
    /** Arguments the prompt accepts */
    arguments: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        description: zod_1.z.string().optional(),
        required: zod_1.z.boolean().optional(),
    })).optional(),
});
/**
 * MCP Tool Call Request
 *
 * Represents a request to invoke a tool
 */
exports.MCPToolCallRequestSchema = zod_1.z.object({
    /** JSON-RPC version */
    jsonrpc: zod_1.z.literal('2.0'),
    /** Request ID */
    id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    /** Method name (always 'tools/call' for tool invocation) */
    method: zod_1.z.literal('tools/call'),
    /** Method parameters */
    params: zod_1.z.object({
        /** Name of the tool to invoke */
        name: zod_1.z.string(),
        /** Arguments to pass to the tool */
        arguments: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    }),
});
/**
 * MCP Tool Call Response
 *
 * Response from a tool invocation
 */
exports.MCPToolCallResponseSchema = zod_1.z.object({
    /** JSON-RPC version */
    jsonrpc: zod_1.z.literal('2.0'),
    /** Request ID (matches the request) */
    id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    /** Result of the tool call */
    result: zod_1.z.object({
        /** Tool execution output */
        content: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.enum(['text', 'image', 'resource']),
            text: zod_1.z.string().optional(),
            data: zod_1.z.string().optional(), // base64 for images
            uri: zod_1.z.string().optional(), // for resources
        })),
        /** Whether the tool call was successful */
        isError: zod_1.z.boolean().optional(),
    }).optional(),
    /** Error information (if failed) */
    error: zod_1.z.object({
        code: zod_1.z.number(),
        message: zod_1.z.string(),
        data: zod_1.z.any().optional(),
    }).optional(),
});
/**
 * MCP List Tools Request
 *
 * Request to list available tools
 */
exports.MCPListToolsRequestSchema = zod_1.z.object({
    jsonrpc: zod_1.z.literal('2.0'),
    id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    method: zod_1.z.literal('tools/list'),
    params: zod_1.z.object({}).optional(),
});
/**
 * MCP List Tools Response
 */
exports.MCPListToolsResponseSchema = zod_1.z.object({
    jsonrpc: zod_1.z.literal('2.0'),
    id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    result: zod_1.z.object({
        tools: zod_1.z.array(exports.MCPToolSchema),
    }),
});
//# sourceMappingURL=mcp.types.js.map