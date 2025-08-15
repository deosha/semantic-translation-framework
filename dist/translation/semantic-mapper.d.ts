/**
 * Semantic Mapping Engine
 *
 * Implements the confidence-scored semantic mapping algorithm from the paper.
 * This is the core intelligence that bridges the paradigm gap between
 * MCP's tool-centric and A2A's task-centric architectures.
 */
import { TranslationConfidence, TranslationContext } from '../types/translation';
import { MCPTool, MCPToolCallRequest, MCPToolCallResponse } from '../protocols/mcp.types';
import { A2AAgentCard, A2ATaskRequest, A2ATaskResponse } from '../protocols/a2a.types';
/**
 * Semantic Mapper Class
 *
 * Core translation logic with confidence scoring
 */
export declare class SemanticMapper {
    /**
     * Confidence threshold below which translations are considered unreliable
     */
    private readonly CONFIDENCE_THRESHOLD;
    /**
     * Weight factors for confidence calculation (must sum to 1.0)
     */
    private readonly CONFIDENCE_WEIGHTS;
    /**
     * Map MCP Tool to A2A Agent Capability
     *
     * Translates a tool-centric function definition to a task-centric capability
     */
    mapMCPToolToA2ACapability(tool: MCPTool, context: TranslationContext): {
        capability: any;
        confidence: TranslationConfidence;
    };
    /**
     * Map MCP Tool Call Request to A2A Task Request
     *
     * Converts stateless tool invocation to stateful task execution
     */
    mapMCPToolCallToA2ATask(mcpRequest: MCPToolCallRequest, context: TranslationContext): {
        task: A2ATaskRequest;
        confidence: TranslationConfidence;
    };
    /**
     * Map A2A Task Response to MCP Tool Call Response
     *
     * Converts stateful task result back to stateless tool response
     */
    mapA2ATaskToMCPResponse(a2aResponse: A2ATaskResponse, context: TranslationContext): {
        response: MCPToolCallResponse;
        confidence: TranslationConfidence;
    };
    /**
     * Map A2A Agent Card to MCP Tools
     *
     * Converts agent capabilities to individual tools
     */
    mapA2AAgentToMCPTools(agentCard: A2AAgentCard, _context: TranslationContext): {
        tools: MCPTool[];
        confidence: TranslationConfidence;
    };
    /**
     * Convert MCP arguments to A2A message parts
     */
    private convertArgumentsToMessageParts;
    /**
     * Convert A2A message parts to MCP content
     */
    private convertMessagePartsToMCPContent;
    /**
     * Calculate confidence score for tool mapping
     */
    private calculateToolMappingConfidence;
    /**
     * Calculate confidence for request mapping
     */
    private calculateRequestMappingConfidence;
    /**
     * Calculate confidence for response mapping
     */
    private calculateResponseMappingConfidence;
    /**
     * Calculate capability mapping confidence
     */
    private calculateCapabilityMappingConfidence;
    /**
     * Calculate schema complexity (depth of nesting)
     */
    private calculateSchemaComplexity;
    /**
     * Infer agent ID from tool name and context
     */
    private inferAgentId;
}
//# sourceMappingURL=semantic-mapper.d.ts.map