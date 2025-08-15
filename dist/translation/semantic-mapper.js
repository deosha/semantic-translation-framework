"use strict";
/**
 * Semantic Mapper
 *
 * Core component responsible for extracting semantic intent from protocol
 * messages and reconstructing equivalent representations in target protocols.
 * This is the heart of the semantic translation framework.
 *
 * Based on paper Section IV.B: Semantic Mapping Algorithm
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticMapper = void 0;
const protocols_1 = require("../types/protocols");
/**
 * Semantic Mapper
 *
 * Handles the core semantic translation logic
 */
class SemanticMapper {
    /**
     * Extract semantic intent from any protocol message
     *
     * This is the key innovation - we extract the "what" not the "how"
     */
    extractSemanticIntent(message, context) {
        try {
            // Validate input message
            if (!message || !message.payload) {
                throw new Error('Invalid message: missing payload');
            }
            // Validate paradigm
            if (!message.paradigm) {
                console.warn('Message missing paradigm, inferring from structure');
                message.paradigm = this.inferParadigm(message);
            }
            // Extract based on paradigm
            switch (message.paradigm) {
                case protocols_1.ProtocolParadigm.TOOL_CENTRIC:
                    return this.extractToolCentricIntent(message);
                case protocols_1.ProtocolParadigm.TASK_CENTRIC:
                    return this.extractTaskCentricIntent(message);
                case protocols_1.ProtocolParadigm.FUNCTION_CALLING:
                    return this.extractFunctionCallingIntent(message);
                default:
                    console.warn(`Unknown paradigm: ${message.paradigm}, using generic extraction`);
                    return this.extractGenericIntent(message);
            }
        }
        catch (error) {
            // Log error and return minimal valid intent
            console.warn('Failed to extract semantic intent:', error);
            return {
                action: 'other',
                target: {
                    type: 'error',
                    identifier: message?.id || 'unknown',
                    description: `Failed to extract intent: ${error instanceof Error ? error.message : 'Unknown error'}`
                },
                parameters: message?.payload || {},
                constraints: {},
                context: {
                    session: context?.sessionId || message?.sessionId
                }
            };
        }
    }
    /**
     * Infer paradigm from message structure
     */
    inferParadigm(message) {
        // Check for tool-centric structure
        if (message.payload?.toolName || message.payload?.toolId) {
            return protocols_1.ProtocolParadigm.TOOL_CENTRIC;
        }
        // Check for task-centric structure
        if (message.task || message.payload?.task) {
            return protocols_1.ProtocolParadigm.TASK_CENTRIC;
        }
        // Check for function-calling structure
        if (message.function || message.payload?.function) {
            return protocols_1.ProtocolParadigm.FUNCTION_CALLING;
        }
        // Default to framework-specific
        return protocols_1.ProtocolParadigm.FRAMEWORK_SPECIFIC;
    }
    /**
     * Map tool-centric to task-centric paradigm
     */
    mapToolToTask(toolRequest, context) {
        // Extract semantic intent
        const intent = this.extractToolCentricIntent(toolRequest);
        // Build task request
        const task = {
            id: this.generateMessageId(),
            type: 'request',
            paradigm: protocols_1.ProtocolParadigm.TASK_CENTRIC,
            timestamp: Date.now(),
            payload: {
                taskType: intent.target.identifier || toolRequest.payload.toolName,
                input: intent.parameters,
                context: {
                    conversationId: context.sessionId,
                    sessionVariables: context.conversationContext?.variables
                }
            }
        };
        // Calculate confidence
        const confidence = this.calculateMappingConfidence(toolRequest, task, intent, 'tool-to-task');
        // Store in shadow state for stateless protocol
        this.updateShadowState(context, toolRequest.id, task);
        return { task, confidence };
    }
    /**
     * Map task-centric to tool-centric paradigm
     */
    mapTaskToTool(taskRequest, _context) {
        // Extract semantic intent
        const intent = this.extractTaskCentricIntent(taskRequest);
        // Build tool request
        const tool = {
            id: taskRequest.messageId || this.generateId(),
            type: 'request',
            paradigm: protocols_1.ProtocolParadigm.TOOL_CENTRIC,
            timestamp: Date.now(),
            payload: {
                toolId: intent.target.identifier || taskRequest.task?.taskType,
                toolName: taskRequest.task?.taskType || intent.target.identifier || 'unknown',
                arguments: taskRequest.task?.input || {},
                options: {
                    timeout: taskRequest.task?.config?.timeout,
                    retries: 3
                }
            }
        };
        // Calculate confidence
        const confidence = this.calculateMappingConfidence(taskRequest, tool, intent, 'task-to-tool');
        // Note: Some task features will be lost (streaming, state)
        if (taskRequest.task?.config?.streaming) {
            confidence.warnings.push('Streaming not supported in tool-centric paradigm');
            confidence.lossyTranslation = true;
        }
        return { tool, confidence };
    }
    /**
     * Calculate confidence score for a translation
     */
    calculateMappingConfidence(source, target, _intent, direction) {
        // Semantic similarity (40% weight)
        const semanticMatch = this.calculateSemanticMatch(source, target, _intent);
        // Structural alignment (20% weight)
        const structuralAlignment = this.calculateStructuralAlignment(source, target);
        // Data preservation (30% weight)
        const dataPreservation = this.calculateDataPreservation(source, target);
        // Context retention (10% weight)
        const contextRetention = this.calculateContextRetention(source, target);
        // Weighted score
        const score = (semanticMatch * 0.4 +
            structuralAlignment * 0.2 +
            dataPreservation * 0.3 +
            contextRetention * 0.1);
        const warnings = [];
        let lossyTranslation = false;
        // Check for lossy translation
        if (direction === 'task-to-tool') {
            if (source.task?.config?.streaming) {
                warnings.push('Streaming capability lost in translation');
                lossyTranslation = true;
            }
            if (source.context?.conversationId) {
                warnings.push('Conversation context partially preserved');
            }
        }
        if (direction === 'tool-to-task') {
            warnings.push('Synthesized state management for stateless protocol');
        }
        return {
            score: Math.min(1.0, score),
            factors: {
                semanticMatch,
                structuralAlignment,
                dataPreservation,
                contextRetention
            },
            warnings,
            lossyTranslation
        };
    }
    /**
     * Extract intent from tool-centric message
     */
    extractToolCentricIntent(message) {
        try {
            const payload = message.payload || message;
            // Validate tool information
            if (!payload.toolName && !payload.name && !payload.toolId) {
                throw new Error('Tool-centric message missing tool identifier');
            }
            return {
                action: 'execute',
                target: {
                    type: 'tool',
                    identifier: payload.toolName || payload.name || payload.toolId,
                    description: payload.description || `Execute ${payload.toolName || payload.name || payload.toolId}`
                },
                parameters: payload.arguments || {},
                constraints: {
                    timeout: payload.options?.timeout,
                    priority: payload.options?.priority || 'normal'
                },
                context: {
                    session: message.sessionId || payload.sessionId
                }
            };
        }
        catch (error) {
            console.warn('Error extracting tool-centric intent:', error);
            throw error; // Re-throw to be caught by main extractSemanticIntent
        }
    }
    /**
     * Extract intent from task-centric message
     */
    extractTaskCentricIntent(message) {
        try {
            const task = message.task || message.payload?.task || message;
            // Validate task information
            if (!task.taskType && !task.type) {
                throw new Error('Task-centric message missing task type');
            }
            const taskType = task.taskType || task.type;
            return {
                action: this.inferAction(taskType),
                target: {
                    type: 'task',
                    identifier: taskType,
                    description: task.description || `Execute task: ${taskType}`
                },
                parameters: task.input || task.parameters || {},
                constraints: {
                    timeout: task.config?.timeout,
                    priority: task.config?.priority || 'normal',
                    quality: task.config?.quality
                },
                expectedOutcome: {
                    type: task.outputType || task.config?.outputType || 'any',
                    format: task.outputFormat || task.config?.outputFormat
                },
                context: {
                    session: message.context?.sessionId || message.sessionId,
                    conversation: message.context?.conversationId,
                    user: message.context?.user
                }
            };
        }
        catch (error) {
            console.warn('Error extracting task-centric intent:', error);
            throw error; // Re-throw to be caught by main extractSemanticIntent
        }
    }
    /**
     * Extract intent from function-calling message
     */
    extractFunctionCallingIntent(message) {
        try {
            const func = message.function || message.payload?.function || message.payload || message;
            // Validate function information
            if (!func.name && !func.functionName) {
                throw new Error('Function-calling message missing function name');
            }
            return {
                action: 'execute',
                target: {
                    type: 'function',
                    identifier: func.name || func.functionName,
                    description: func.description || `Call function: ${func.name || func.functionName}`
                },
                parameters: func.parameters || func.arguments || {},
                constraints: {
                    timeout: func.timeout
                },
                expectedOutcome: {
                    type: func.returnType || func.returns || 'any'
                },
                context: {
                    session: message.sessionId || func.sessionId
                }
            };
        }
        catch (error) {
            console.warn('Error extracting function-calling intent:', error);
            throw error; // Re-throw to be caught by main extractSemanticIntent
        }
    }
    /**
     * Extract generic intent as fallback
     */
    extractGenericIntent(message) {
        try {
            // Best effort extraction from unknown format
            const payload = message.payload || message.data || message.body || message;
            const identifier = message.id || message.messageId || message.requestId || 'unknown';
            return {
                action: 'other',
                target: {
                    type: 'unknown',
                    identifier: identifier,
                    description: message.description || message.type || 'Generic message'
                },
                parameters: typeof payload === 'object' ? payload : { data: payload },
                constraints: {
                    timeout: message.timeout || payload.timeout
                },
                context: {
                    session: message.sessionId || message.session || payload.sessionId
                }
            };
        }
        catch (error) {
            console.warn('Error extracting generic intent:', error);
            // Return minimal valid intent
            return {
                action: 'other',
                target: {
                    type: 'error',
                    identifier: 'extraction-failed',
                    description: 'Failed to extract intent from message'
                },
                parameters: {},
                context: {}
            };
        }
    }
    /**
     * Infer action from task type
     */
    inferAction(taskType) {
        const actionMap = {
            'analyze': 'analyze',
            'create': 'create',
            'update': 'update',
            'delete': 'delete',
            'search': 'search',
            'transform': 'transform',
            'execute': 'execute',
            'monitor': 'monitor'
        };
        for (const [key, action] of Object.entries(actionMap)) {
            if (taskType.toLowerCase().includes(key)) {
                return action;
            }
        }
        return 'other';
    }
    /**
     * Calculate semantic match score
     */
    calculateSemanticMatch(source, target, _intent) {
        // Check if core intent is preserved
        let score = 0.8; // Base score if intent extracted
        // Check parameter preservation
        const sourceParams = Object.keys(source.payload?.arguments || source.input || {});
        const targetParams = Object.keys(target.payload?.arguments || target.input || {});
        const paramOverlap = sourceParams.filter(p => targetParams.includes(p)).length;
        const paramScore = sourceParams.length > 0
            ? paramOverlap / sourceParams.length
            : 1.0;
        score += paramScore * 0.2;
        return Math.min(1.0, score);
    }
    /**
     * Calculate structural alignment
     */
    calculateStructuralAlignment(source, target) {
        // Simple heuristic: check field mapping completeness
        const sourceFields = this.countFields(source);
        const targetFields = this.countFields(target);
        if (sourceFields === 0)
            return 1.0;
        const ratio = Math.min(targetFields / sourceFields, 1.0);
        return ratio;
    }
    /**
     * Calculate data preservation
     */
    calculateDataPreservation(source, target) {
        // Check if all critical data is preserved
        const sourceData = JSON.stringify(source.payload || source.task?.input || {});
        const targetData = JSON.stringify(target.payload || target.task?.input || {});
        // Simple size comparison (more sophisticated in production)
        const preservation = Math.min(targetData.length / Math.max(sourceData.length, 1), 1.0);
        return preservation;
    }
    /**
     * Calculate context retention
     */
    calculateContextRetention(source, target) {
        let score = 1.0;
        // Check session preservation
        if (source.sessionId || source.context?.sessionId) {
            if (!target.sessionId && !target.context?.sessionId) {
                score -= 0.3;
            }
        }
        // Check correlation preservation
        if (source.correlationId && !target.correlationId) {
            score -= 0.2;
        }
        return Math.max(0, score);
    }
    /**
     * Update shadow state for stateless protocols
     */
    updateShadowState(context, messageId, data) {
        context.shadowState.set(messageId.toString(), {
            timestamp: Date.now(),
            data,
            paradigm: context.targetParadigm
        });
        // Clean old entries (keep last 100)
        if (context.shadowState && context.shadowState.size > 100) {
            const entries = Array.from(context.shadowState.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            for (let i = 0; i < entries.length - 100; i++) {
                const entry = entries[i];
                if (entry) {
                    context.shadowState.delete(entry[0]);
                }
            }
        }
    }
    /**
     * Count fields in an object (recursive)
     */
    countFields(obj, depth = 0, maxDepth = 3) {
        if (depth > maxDepth || !obj || typeof obj !== 'object') {
            return 0;
        }
        let count = Object.keys(obj).length;
        for (const value of Object.values(obj)) {
            if (typeof value === 'object' && value !== null) {
                count += this.countFields(value, depth + 1, maxDepth);
            }
        }
        return count;
    }
    /**
     * Generate unique message ID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
    /**
     * Generate unique ID
     */
    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
}
exports.SemanticMapper = SemanticMapper;
//# sourceMappingURL=semantic-mapper.js.map