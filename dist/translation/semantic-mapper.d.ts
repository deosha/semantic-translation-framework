/**
 * Semantic Mapper
 *
 * Core component responsible for extracting semantic intent from protocol
 * messages and reconstructing equivalent representations in target protocols.
 * This is the heart of the semantic translation framework.
 *
 * Based on paper Section IV.B: Semantic Mapping Algorithm
 */
import { SemanticIntent, ProtocolMessage, ToolInvocationRequest, TaskRequest } from '../types/protocols';
import { TranslationConfidence, SemanticTranslationContext } from '../types/semantic-translation';
/**
 * Semantic Mapper
 *
 * Handles the core semantic translation logic
 */
export declare class SemanticMapper {
    /**
     * Extract semantic intent from any protocol message
     *
     * This is the key innovation - we extract the "what" not the "how"
     */
    extractSemanticIntent(message: ProtocolMessage, context?: SemanticTranslationContext): SemanticIntent;
    /**
     * Infer paradigm from message structure
     */
    private inferParadigm;
    /**
     * Map tool-centric to task-centric paradigm
     */
    mapToolToTask(toolRequest: ToolInvocationRequest, context: SemanticTranslationContext): {
        task: TaskRequest;
        confidence: TranslationConfidence;
    };
    /**
     * Map task-centric to tool-centric paradigm
     */
    mapTaskToTool(taskRequest: TaskRequest, _context: SemanticTranslationContext): {
        tool: ToolInvocationRequest;
        confidence: TranslationConfidence;
    };
    /**
     * Calculate confidence score for a translation
     */
    private calculateMappingConfidence;
    /**
     * Extract intent from tool-centric message
     */
    private extractToolCentricIntent;
    /**
     * Extract intent from task-centric message
     */
    private extractTaskCentricIntent;
    /**
     * Extract intent from function-calling message
     */
    private extractFunctionCallingIntent;
    /**
     * Extract generic intent as fallback
     */
    private extractGenericIntent;
    /**
     * Infer action from task type
     */
    private inferAction;
    /**
     * Calculate semantic match score
     */
    private calculateSemanticMatch;
    /**
     * Calculate structural alignment
     */
    private calculateStructuralAlignment;
    /**
     * Calculate data preservation
     */
    private calculateDataPreservation;
    /**
     * Calculate context retention
     */
    private calculateContextRetention;
    /**
     * Update shadow state for stateless protocols
     */
    private updateShadowState;
    /**
     * Count fields in an object (recursive)
     */
    private countFields;
    /**
     * Generate unique message ID
     */
    private generateMessageId;
    /**
     * Generate unique ID
     */
    private generateId;
}
//# sourceMappingURL=semantic-mapper.d.ts.map