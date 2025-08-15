"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolDiscoveryResponseSchema = exports.ToolDiscoveryRequestSchema = exports.ToolInvocationResponseSchema = exports.ToolInvocationRequestSchema = exports.ToolCentricResourceSchema = exports.ToolCentricToolSchema = void 0;
exports.toGenericTool = toGenericTool;
exports.fromGenericTool = fromGenericTool;
const zod_1 = require("zod");
const protocols_1 = require("../types/protocols");
/**
 * Tool-Centric Tool Schema
 *
 * Defines a discrete function that can be invoked
 */
exports.ToolCentricToolSchema = zod_1.z.object({
    /** Unique identifier for the tool */
    name: zod_1.z.string(),
    /** Human-readable description */
    description: zod_1.z.string(),
    /** JSON Schema defining input parameters */
    inputSchema: zod_1.z.object({
        type: zod_1.z.literal('object'),
        properties: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
        required: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    /** Optional output schema */
    outputSchema: zod_1.z.object({
        type: zod_1.z.literal('object'),
        properties: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    }).optional(),
});
/**
 * Tool-Centric Resource
 *
 * External data accessible via URI
 */
exports.ToolCentricResourceSchema = zod_1.z.object({
    /** URI identifying the resource */
    uri: zod_1.z.string(),
    /** Resource name */
    name: zod_1.z.string(),
    /** Resource description */
    description: zod_1.z.string().optional(),
    /** MIME type */
    mimeType: zod_1.z.string().optional(),
    /** Metadata */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
/**
 * Tool Invocation Request
 *
 * Request to execute a tool
 */
exports.ToolInvocationRequestSchema = zod_1.z.object({
    /** Protocol version */
    version: zod_1.z.string().default('1.0'),
    /** Request ID */
    id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    /** Request type */
    type: zod_1.z.literal('tool_invocation'),
    /** Tool invocation details */
    payload: zod_1.z.object({
        /** Tool identifier */
        toolName: zod_1.z.string(),
        /** Tool arguments */
        arguments: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
        /** Execution options */
        options: zod_1.z.object({
            timeout: zod_1.z.number().optional(),
            retries: zod_1.z.number().optional(),
            async: zod_1.z.boolean().optional(),
        }).optional(),
    }),
    /** Request metadata */
    metadata: zod_1.z.object({
        timestamp: zod_1.z.number(),
        source: zod_1.z.string().optional(),
        traceId: zod_1.z.string().optional(),
    }).optional(),
});
/**
 * Tool Invocation Response
 *
 * Response from tool execution
 */
exports.ToolInvocationResponseSchema = zod_1.z.object({
    /** Protocol version */
    version: zod_1.z.string().default('1.0'),
    /** Request ID (matches request) */
    id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    /** Response type */
    type: zod_1.z.literal('tool_response'),
    /** Execution result */
    result: zod_1.z.object({
        /** Output content */
        content: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.enum(['text', 'image', 'data', 'resource']),
            text: zod_1.z.string().optional(),
            data: zod_1.z.any().optional(),
            uri: zod_1.z.string().optional(),
            mimeType: zod_1.z.string().optional(),
        })),
        /** Success status */
        success: zod_1.z.boolean(),
        /** Execution metadata */
        executionTime: zod_1.z.number().optional(),
    }).optional(),
    /** Error information */
    error: zod_1.z.object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        details: zod_1.z.any().optional(),
        recoverable: zod_1.z.boolean().optional(),
    }).optional(),
    /** Response metadata */
    metadata: zod_1.z.object({
        timestamp: zod_1.z.number(),
        processingTime: zod_1.z.number().optional(),
    }).optional(),
});
/**
 * Tool Discovery Request
 *
 * Request to discover available tools
 */
exports.ToolDiscoveryRequestSchema = zod_1.z.object({
    version: zod_1.z.string().default('1.0'),
    id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    type: zod_1.z.literal('discover_tools'),
    params: zod_1.z.object({
        filter: zod_1.z.object({
            category: zod_1.z.string().optional(),
            tags: zod_1.z.array(zod_1.z.string()).optional(),
        }).optional(),
    }).optional(),
});
/**
 * Tool Discovery Response
 */
exports.ToolDiscoveryResponseSchema = zod_1.z.object({
    version: zod_1.z.string().default('1.0'),
    id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    type: zod_1.z.literal('tools_list'),
    result: zod_1.z.object({
        tools: zod_1.z.array(exports.ToolCentricToolSchema),
        resources: zod_1.z.array(exports.ToolCentricResourceSchema).optional(),
    }),
});
/**
 * Convert to generic ToolDefinition
 */
function toGenericTool(tool) {
    return {
        id: tool.name,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        metadata: {
            paradigm: protocols_1.ProtocolParadigm.TOOL_CENTRIC,
        }
    };
}
/**
 * Convert from generic ToolDefinition
 */
function fromGenericTool(tool) {
    return {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
    };
}
//# sourceMappingURL=tool-centric.types.js.map