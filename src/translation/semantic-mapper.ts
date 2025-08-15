/**
 * Semantic Mapper
 * 
 * Core component responsible for extracting semantic intent from protocol
 * messages and reconstructing equivalent representations in target protocols.
 * This is the heart of the semantic translation framework.
 * 
 * Based on paper Section IV.B: Semantic Mapping Algorithm
 */

import {
  SemanticIntent,
  ProtocolMessage,
  ProtocolParadigm,
  ToolDefinition,
  TaskDefinition,
  ToolInvocationRequest,
  TaskRequest
} from '../types/protocols';
import {
  TranslationConfidence,
  SemanticTranslationContext
} from '../types/semantic-translation';

/**
 * Semantic Mapper
 * 
 * Handles the core semantic translation logic
 */
export class SemanticMapper {
  /**
   * Extract semantic intent from any protocol message
   * 
   * This is the key innovation - we extract the "what" not the "how"
   */
  extractSemanticIntent(
    message: ProtocolMessage,
    context?: SemanticTranslationContext
  ): SemanticIntent {
    switch (message.paradigm) {
      case ProtocolParadigm.TOOL_CENTRIC:
        return this.extractToolCentricIntent(message);
      
      case ProtocolParadigm.TASK_CENTRIC:
        return this.extractTaskCentricIntent(message);
      
      case ProtocolParadigm.FUNCTION_CALLING:
        return this.extractFunctionCallingIntent(message);
      
      default:
        return this.extractGenericIntent(message);
    }
  }

  /**
   * Map tool-centric to task-centric paradigm
   */
  mapToolToTask(
    toolRequest: ToolInvocationRequest,
    context: SemanticTranslationContext
  ): { task: TaskRequest; confidence: TranslationConfidence } {
    // Extract semantic intent
    const intent = this.extractToolCentricIntent(toolRequest);
    
    // Build task request
    const task: TaskRequest = {
      version: '1.0',
      messageId: this.generateMessageId(),
      type: 'task_request',
      task: {
        taskType: intent.target.identifier || toolRequest.payload.toolName,
        description: intent.target.description,
        input: intent.parameters,
        config: {
          priority: 'normal',
          timeout: toolRequest.payload.options?.timeout,
          streaming: false // Tools typically don't stream
        }
      },
      context: {
        sessionId: context.sessionId,
        variables: context.conversationContext.variables
      },
      metadata: {
        timestamp: Date.now(),
        source: 'tool-centric-translation',
        traceId: context.sessionId
      }
    };

    // Calculate confidence
    const confidence = this.calculateMappingConfidence(
      toolRequest,
      task,
      intent,
      'tool-to-task'
    );

    // Store in shadow state for stateless protocol
    this.updateShadowState(context, toolRequest.id, task);

    return { task, confidence };
  }

  /**
   * Map task-centric to tool-centric paradigm
   */
  mapTaskToTool(
    taskRequest: TaskRequest,
    context: SemanticTranslationContext
  ): { tool: ToolInvocationRequest; confidence: TranslationConfidence } {
    // Extract semantic intent
    const intent = this.extractTaskCentricIntent(taskRequest);
    
    // Build tool request
    const tool: ToolInvocationRequest = {
      id: taskRequest.messageId || this.generateId(),
      type: 'request',
      paradigm: ProtocolParadigm.TOOL_CENTRIC,
      timestamp: Date.now(),
      payload: {
        toolId: intent.target.identifier || taskRequest.task.taskType,
        toolName: taskRequest.task.taskType,
        arguments: taskRequest.task.input,
        options: {
          timeout: taskRequest.task.config?.timeout,
          retries: 3
        }
      }
    };

    // Calculate confidence
    const confidence = this.calculateMappingConfidence(
      taskRequest,
      tool,
      intent,
      'task-to-tool'
    );

    // Note: Some task features will be lost (streaming, state)
    if (taskRequest.task.config?.streaming) {
      confidence.warnings.push('Streaming not supported in tool-centric paradigm');
      confidence.lossyTranslation = true;
    }

    return { tool, confidence };
  }

  /**
   * Calculate confidence score for a translation
   */
  private calculateMappingConfidence(
    source: any,
    target: any,
    intent: SemanticIntent,
    direction: string
  ): TranslationConfidence {
    // Semantic similarity (40% weight)
    const semanticMatch = this.calculateSemanticMatch(source, target, intent);
    
    // Structural alignment (20% weight)
    const structuralAlignment = this.calculateStructuralAlignment(source, target);
    
    // Data preservation (30% weight)
    const dataPreservation = this.calculateDataPreservation(source, target);
    
    // Context retention (10% weight)
    const contextRetention = this.calculateContextRetention(source, target);
    
    // Weighted score
    const score = (
      semanticMatch * 0.4 +
      structuralAlignment * 0.2 +
      dataPreservation * 0.3 +
      contextRetention * 0.1
    );

    const warnings: string[] = [];
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
  private extractToolCentricIntent(message: any): SemanticIntent {
    const payload = message.payload || message;
    
    return {
      action: 'execute',
      target: {
        type: 'tool',
        identifier: payload.toolName || payload.name,
        description: payload.description
      },
      parameters: payload.arguments || {},
      constraints: {
        timeout: payload.options?.timeout,
        priority: 'normal'
      },
      context: {
        session: message.sessionId
      }
    };
  }

  /**
   * Extract intent from task-centric message
   */
  private extractTaskCentricIntent(message: any): SemanticIntent {
    const task = message.task || message.payload?.task || message;
    
    return {
      action: this.inferAction(task.taskType),
      target: {
        type: 'task',
        identifier: task.taskType,
        description: task.description
      },
      parameters: task.input || {},
      constraints: {
        timeout: task.config?.timeout,
        priority: task.config?.priority || 'normal',
        quality: task.config?.quality
      },
      expectedOutcome: {
        type: task.outputType || 'any',
        format: task.outputFormat
      },
      context: {
        session: message.context?.sessionId,
        conversation: message.context?.conversationId,
        user: message.context?.user
      }
    };
  }

  /**
   * Extract intent from function-calling message
   */
  private extractFunctionCallingIntent(message: any): SemanticIntent {
    const func = message.function || message.payload;
    
    return {
      action: 'execute',
      target: {
        type: 'function',
        identifier: func.name,
        description: func.description
      },
      parameters: func.parameters || {},
      constraints: {},
      expectedOutcome: {
        type: func.returnType || 'any'
      },
      context: {
        session: message.sessionId
      }
    };
  }

  /**
   * Extract generic intent as fallback
   */
  private extractGenericIntent(message: any): SemanticIntent {
    return {
      action: 'other',
      target: {
        type: 'unknown',
        identifier: message.id || 'unknown',
        description: 'Generic message'
      },
      parameters: message.payload || {},
      context: {
        session: message.sessionId
      }
    };
  }

  /**
   * Infer action from task type
   */
  private inferAction(taskType: string): SemanticIntent['action'] {
    const actionMap: Record<string, SemanticIntent['action']> = {
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
  private calculateSemanticMatch(source: any, target: any, intent: SemanticIntent): number {
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
  private calculateStructuralAlignment(source: any, target: any): number {
    // Simple heuristic: check field mapping completeness
    const sourceFields = this.countFields(source);
    const targetFields = this.countFields(target);
    
    if (sourceFields === 0) return 1.0;
    
    const ratio = Math.min(targetFields / sourceFields, 1.0);
    return ratio;
  }

  /**
   * Calculate data preservation
   */
  private calculateDataPreservation(source: any, target: any): number {
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
  private calculateContextRetention(source: any, target: any): number {
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
  private updateShadowState(
    context: SemanticTranslationContext,
    messageId: string | number,
    data: any
  ): void {
    context.shadowState.set(messageId.toString(), {
      timestamp: Date.now(),
      data,
      paradigm: context.targetParadigm
    });
    
    // Clean old entries (keep last 100)
    if (context.shadowState.size > 100) {
      const entries = Array.from(context.shadowState.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (let i = 0; i < entries.length - 100; i++) {
        context.shadowState.delete(entries[i][0]);
      }
    }
  }

  /**
   * Count fields in an object (recursive)
   */
  private countFields(obj: any, depth = 0, maxDepth = 3): number {
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
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string | number {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}