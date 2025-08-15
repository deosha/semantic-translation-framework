"use strict";
/**
 * Semantic Mapping Engine
 *
 * Implements the confidence-scored semantic mapping algorithm from the paper.
 * This is the core intelligence that bridges the paradigm gap between
 * MCP's tool-centric and A2A's task-centric architectures.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticMapper = void 0;
const translation_1 = require("../types/translation");
const a2a_types_1 = require("../protocols/a2a.types");
/**
 * Semantic Mapper Class
 *
 * Core translation logic with confidence scoring
 */
class SemanticMapper {
    /**
     * Confidence threshold below which translations are considered unreliable
     */
    CONFIDENCE_THRESHOLD = 0.7;
    /**
     * Weight factors for confidence calculation (must sum to 1.0)
     */
    CONFIDENCE_WEIGHTS = {
        semantic: 0.4, // Most important - preserving meaning
        structural: 0.25, // Message structure alignment
        data: 0.25, // Data completeness
        context: 0.1 // Context preservation
    };
    /**
     * Map MCP Tool to A2A Agent Capability
     *
     * Translates a tool-centric function definition to a task-centric capability
     */
    mapMCPToolToA2ACapability(tool, context) {
        const confidence = this.calculateToolMappingConfidence(tool, context);
        // Transform tool to capability
        const capability = {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            outputSchema: {
                type: 'object',
                properties: {
                    result: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                type: { type: 'string', enum: ['text', 'image', 'resource'] },
                                content: { type: 'string' }
                            }
                        }
                    }
                }
            },
            // MCP tools are generally synchronous, not streaming
            streaming: false
        };
        return { capability, confidence };
    }
    /**
     * Map MCP Tool Call Request to A2A Task Request
     *
     * Converts stateless tool invocation to stateful task execution
     */
    mapMCPToolCallToA2ATask(mcpRequest, context) {
        // Calculate confidence for this specific translation
        const confidence = this.calculateRequestMappingConfidence(mcpRequest, context);
        // Generate unique task ID from MCP request ID
        const taskId = `mcp-${mcpRequest.id}-${Date.now()}`;
        // Convert tool arguments to multi-modal message parts
        const inputParts = this.convertArgumentsToMessageParts(mcpRequest.params.arguments);
        // Build A2A task request
        const task = {
            taskId,
            agentId: this.inferAgentId(mcpRequest.params.name, context),
            capability: mcpRequest.params.name,
            input: inputParts,
            context: {
                conversationId: context.sessionId,
                sessionVars: mcpRequest.params.arguments,
                preferences: {}
            },
            config: {
                timeoutMs: 30000, // Default 30s timeout
                streaming: false, // MCP doesn't support streaming by default
                priority: 'normal'
            }
        };
        // Store mapping in context for reverse translation
        context.sessionState.set(`task-${taskId}`, {
            originalMCPRequest: mcpRequest,
            timestamp: Date.now()
        });
        return { task, confidence };
    }
    /**
     * Map A2A Task Response to MCP Tool Call Response
     *
     * Converts stateful task result back to stateless tool response
     */
    mapA2ATaskToMCPResponse(a2aResponse, context) {
        // Retrieve original MCP request from context
        const mapping = context.sessionState.get(`task-${a2aResponse.taskId}`);
        const originalRequest = mapping?.originalMCPRequest;
        if (!originalRequest) {
            throw new translation_1.TranslationError('Cannot map A2A response: original MCP request not found', translation_1.TranslationErrorType.SEMANTIC, false);
        }
        const confidence = this.calculateResponseMappingConfidence(a2aResponse, context);
        // Handle different task states
        let mcpResponse;
        if (a2aResponse.state === a2a_types_1.A2ATaskState.COMPLETED && a2aResponse.output) {
            // Success case - convert output to MCP format
            mcpResponse = {
                jsonrpc: '2.0',
                id: originalRequest.id,
                result: {
                    content: this.convertMessagePartsToMCPContent(a2aResponse.output),
                    isError: false
                }
            };
        }
        else if (a2aResponse.state === a2a_types_1.A2ATaskState.FAILED && a2aResponse.error) {
            // Error case
            mcpResponse = {
                jsonrpc: '2.0',
                id: originalRequest.id,
                error: {
                    code: -32603, // Internal error per JSON-RPC
                    message: a2aResponse.error.message,
                    data: a2aResponse.error.details
                }
            };
        }
        else if (a2aResponse.state === a2a_types_1.A2ATaskState.RUNNING) {
            // Still running - MCP doesn't support this, return progress message
            mcpResponse = {
                jsonrpc: '2.0',
                id: originalRequest.id,
                result: {
                    content: [{
                            type: 'text',
                            text: `Task in progress: ${a2aResponse.progress?.message || 'Processing...'}`
                        }],
                    isError: false
                }
            };
        }
        else {
            // Other states (PENDING, PAUSED, CANCELLED)
            throw new translation_1.TranslationError(`Cannot map A2A task state '${a2aResponse.state}' to MCP response`, translation_1.TranslationErrorType.PROTOCOL, false);
        }
        return { response: mcpResponse, confidence };
    }
    /**
     * Map A2A Agent Card to MCP Tools
     *
     * Converts agent capabilities to individual tools
     */
    mapA2AAgentToMCPTools(agentCard, _context) {
        const tools = [];
        const confidenceScores = [];
        for (const capability of agentCard.capabilities) {
            const tool = {
                name: `${agentCard.agentId}.${capability.name}`,
                description: `${capability.description} (Agent: ${agentCard.name})`,
                inputSchema: capability.inputSchema
            };
            tools.push(tool);
            // Calculate individual confidence
            const capabilityConfidence = this.calculateCapabilityMappingConfidence(capability);
            confidenceScores.push(capabilityConfidence);
        }
        // Average confidence across all capabilities
        const averageConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
        const confidence = {
            score: averageConfidence,
            factors: {
                semanticMatch: averageConfidence,
                structuralAlignment: 0.9, // Agent cards map well to tools
                dataPreservation: 0.95, // Minimal data loss
                contextRetention: 0.7 // Some context lost (rate limits, auth)
            },
            warnings: agentCard.metadata?.rateLimits
                ? ['Rate limiting information not preserved in MCP tools']
                : [],
            lossyTranslation: false
        };
        return { tools, confidence };
    }
    /**
     * Convert MCP arguments to A2A message parts
     */
    convertArgumentsToMessageParts(args) {
        if (!args || Object.keys(args).length === 0) {
            return [{ type: 'text', text: 'No input provided' }];
        }
        const parts = [];
        // Convert each argument to appropriate message part
        for (const [key, value] of Object.entries(args)) {
            if (typeof value === 'string') {
                // Check if it's base64 image data
                if (value.startsWith('data:image/')) {
                    const [mimeTypePart, base64] = value.split(',');
                    const mimeType = mimeTypePart?.replace('data:', '').replace(';base64', '') || 'image/png';
                    parts.push({
                        type: 'image',
                        mimeType,
                        data: base64 || ''
                    });
                }
                else {
                    parts.push({
                        type: 'text',
                        text: `${key}: ${value}`
                    });
                }
            }
            else if (typeof value === 'object') {
                parts.push({
                    type: 'data',
                    mimeType: 'application/json',
                    data: { [key]: value }
                });
            }
            else {
                parts.push({
                    type: 'text',
                    text: `${key}: ${String(value)}`
                });
            }
        }
        return parts;
    }
    /**
     * Convert A2A message parts to MCP content
     */
    convertMessagePartsToMCPContent(parts) {
        return parts.map(part => {
            switch (part.type) {
                case 'text':
                    return { type: 'text', text: part.text };
                case 'image':
                    return { type: 'image', data: part.data };
                case 'file':
                    return { type: 'resource', uri: part.uri };
                case 'code':
                    return {
                        type: 'text',
                        text: `\`\`\`${part.language}\n${part.code}\n\`\`\``
                    };
                case 'data':
                    return {
                        type: 'text',
                        text: JSON.stringify(part.data, null, 2)
                    };
                default:
                    return { type: 'text', text: 'Unknown content type' };
            }
        });
    }
    /**
     * Calculate confidence score for tool mapping
     */
    calculateToolMappingConfidence(tool, _context) {
        // Base confidence scores
        let semanticMatch = 0.9; // Tools map well to capabilities
        let structuralAlignment = 0.85;
        let dataPreservation = 0.95;
        let contextRetention = 0.8;
        const warnings = [];
        // Check for complex input schemas
        const schemaComplexity = this.calculateSchemaComplexity(tool.inputSchema);
        if (schemaComplexity > 5) {
            structuralAlignment *= 0.9;
            warnings.push('Complex input schema may not map perfectly');
        }
        // Check if tool name suggests streaming behavior
        if (tool.name.includes('stream') || tool.name.includes('watch')) {
            semanticMatch *= 0.8;
            warnings.push('Streaming behavior may not translate well to A2A');
        }
        // Calculate weighted score
        const score = (semanticMatch * this.CONFIDENCE_WEIGHTS.semantic) +
            (structuralAlignment * this.CONFIDENCE_WEIGHTS.structural) +
            (dataPreservation * this.CONFIDENCE_WEIGHTS.data) +
            (contextRetention * this.CONFIDENCE_WEIGHTS.context);
        return {
            score,
            factors: {
                semanticMatch,
                structuralAlignment,
                dataPreservation,
                contextRetention
            },
            warnings,
            lossyTranslation: score < this.CONFIDENCE_THRESHOLD
        };
    }
    /**
     * Calculate confidence for request mapping
     */
    calculateRequestMappingConfidence(request, context) {
        // Start with high confidence for simple requests
        let score = 0.95;
        const warnings = [];
        // Reduce confidence for complex arguments
        if (request.params.arguments) {
            const argCount = Object.keys(request.params.arguments).length;
            if (argCount > 10) {
                score *= 0.9;
                warnings.push('Large number of arguments may affect translation accuracy');
            }
        }
        // Check context freshness
        const lastTranslation = context.translationHistory[context.translationHistory.length - 1];
        if (lastTranslation) {
            const timeSinceLastMs = Date.now() - lastTranslation.timestamp;
            if (timeSinceLastMs > 60000) { // Over 1 minute
                score *= 0.95;
                warnings.push('Context may be stale');
            }
        }
        return {
            score,
            factors: {
                semanticMatch: score,
                structuralAlignment: 0.9,
                dataPreservation: 1.0,
                contextRetention: score * 0.9
            },
            warnings,
            lossyTranslation: false
        };
    }
    /**
     * Calculate confidence for response mapping
     */
    calculateResponseMappingConfidence(response, _context) {
        let score = 0.9;
        const warnings = [];
        // Check if we have complete output
        if (response.state === a2a_types_1.A2ATaskState.COMPLETED && !response.output) {
            score *= 0.7;
            warnings.push('Task completed but no output provided');
        }
        // Check if progress information will be lost
        if (response.progress) {
            warnings.push('Progress information cannot be fully represented in MCP');
        }
        // Check if metadata will be lost
        if (response.metadata?.resources) {
            warnings.push('Resource usage metadata will not be preserved');
        }
        return {
            score,
            factors: {
                semanticMatch: score,
                structuralAlignment: 0.85,
                dataPreservation: response.metadata ? 0.8 : 0.95,
                contextRetention: 0.9
            },
            warnings,
            lossyTranslation: warnings.length > 0
        };
    }
    /**
     * Calculate capability mapping confidence
     */
    calculateCapabilityMappingConfidence(capability) {
        let confidence = 0.9;
        // Reduce confidence for streaming capabilities
        if (capability.streaming) {
            confidence *= 0.85;
        }
        // Reduce confidence for complex output schemas
        if (capability.outputSchema) {
            const complexity = this.calculateSchemaComplexity(capability.outputSchema);
            if (complexity > 3) {
                confidence *= 0.9;
            }
        }
        return confidence;
    }
    /**
     * Calculate schema complexity (depth of nesting)
     */
    calculateSchemaComplexity(schema, depth = 0) {
        if (!schema || typeof schema !== 'object')
            return depth;
        let maxDepth = depth;
        if (schema.properties) {
            for (const prop of Object.values(schema.properties)) {
                const propDepth = this.calculateSchemaComplexity(prop, depth + 1);
                maxDepth = Math.max(maxDepth, propDepth);
            }
        }
        if (schema.items) {
            const itemDepth = this.calculateSchemaComplexity(schema.items, depth + 1);
            maxDepth = Math.max(maxDepth, itemDepth);
        }
        return maxDepth;
    }
    /**
     * Infer agent ID from tool name and context
     */
    inferAgentId(toolName, context) {
        // Check if tool name contains agent prefix
        if (toolName.includes('.')) {
            return toolName.split('.')[0] || 'default-agent';
        }
        // Check context for agent mapping
        const agentMapping = context.metadata.a2a?.agentCards?.find((card) => card.capabilities.some((cap) => cap.name === toolName));
        if (agentMapping) {
            return agentMapping.agentId;
        }
        // Default to generic agent
        return 'default-agent';
    }
}
exports.SemanticMapper = SemanticMapper;
//# sourceMappingURL=semantic-mapper.js.map