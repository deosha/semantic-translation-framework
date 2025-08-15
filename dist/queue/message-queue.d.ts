/**
 * Bidirectional Message Queue System
 *
 * Implements high-performance message queuing for async protocol translation
 * Based on paper Section III.A: Overall Architecture
 *
 * Features:
 * - Priority-based message processing
 * - Backpressure handling
 * - Dead letter queue for failed messages
 * - Batch processing for efficiency
 */
import { EventEmitter } from 'events';
import { TranslationConfidence } from '../types/translation';
/**
 * Message Priority Levels
 */
export declare enum MessagePriority {
    /** Critical messages that must be processed immediately */
    CRITICAL = 0,
    /** High priority messages */
    HIGH = 1,
    /** Normal priority (default) */
    NORMAL = 2,
    /** Low priority background tasks */
    LOW = 3
}
/**
 * Queue Message Structure
 */
export interface QueueMessage<T = any> {
    /** Unique message ID */
    id: string;
    /** Message payload */
    payload: T;
    /** Translation direction */
    direction: 'mcp-to-a2a' | 'a2a-to-mcp';
    /** Message priority */
    priority: MessagePriority;
    /** Session ID for context */
    sessionId: string;
    /** Timestamp when message was enqueued */
    enqueuedAt: number;
    /** Number of processing attempts */
    attempts: number;
    /** Maximum retry attempts */
    maxRetries: number;
    /** Optional metadata */
    metadata?: Record<string, any>;
}
/**
 * Processing Result
 */
export interface ProcessingResult<T = any> {
    /** Whether processing was successful */
    success: boolean;
    /** Processed data */
    data?: T;
    /** Error if failed */
    error?: Error;
    /** Processing duration in ms */
    processingTime: number;
    /** Translation confidence if applicable */
    confidence?: TranslationConfidence;
}
/**
 * Queue Statistics
 */
export interface QueueStats {
    /** Messages currently in queue */
    pending: number;
    /** Messages being processed */
    active: number;
    /** Successfully processed messages */
    processed: number;
    /** Failed messages */
    failed: number;
    /** Messages in dead letter queue */
    deadLetter: number;
    /** Average processing time in ms */
    avgProcessingTime: number;
    /** Queue throughput (messages/second) */
    throughput: number;
}
/**
 * Message Queue Configuration
 */
export interface MessageQueueConfig {
    /** Maximum concurrent processing */
    concurrency?: number;
    /** Queue size limit */
    maxQueueSize?: number;
    /** Processing timeout in ms */
    processingTimeout?: number;
    /** Batch size for bulk processing */
    batchSize?: number;
    /** Enable dead letter queue */
    enableDeadLetter?: boolean;
    /** Max retries before dead letter */
    maxRetries?: number;
    /** Backpressure threshold (0-1) */
    backpressureThreshold?: number;
}
/**
 * Bidirectional Message Queue
 *
 * Manages async message processing with priorities and batching
 */
export declare class MessageQueue extends EventEmitter {
    private mcpToA2aQueue;
    private a2aToMcpQueue;
    private deadLetterMcp;
    private deadLetterA2a;
    private processors;
    private config;
    private stats;
    private processingTimes;
    constructor(config?: MessageQueueConfig);
    /**
     * Register a message processor
     */
    registerProcessor(direction: 'mcp-to-a2a' | 'a2a-to-mcp', processor: (msg: QueueMessage) => Promise<ProcessingResult>): void;
    /**
     * Enqueue a message for processing
     */
    enqueue<T>(payload: T, direction: 'mcp-to-a2a' | 'a2a-to-mcp', options?: {
        priority?: MessagePriority;
        sessionId?: string;
        metadata?: Record<string, any>;
        maxRetries?: number;
    }): Promise<string>;
    /**
     * Enqueue multiple messages for batch processing
     */
    enqueueBatch<T>(messages: Array<{
        payload: T;
        direction: 'mcp-to-a2a' | 'a2a-to-mcp';
        priority?: MessagePriority;
    }>): Promise<string[]>;
    /**
     * Process a message
     */
    private processMessage;
    /**
     * Move message to dead letter queue
     */
    private moveToDeadLetter;
    /**
     * Reprocess dead letter messages
     */
    reprocessDeadLetter(direction: 'mcp-to-a2a' | 'a2a-to-mcp', messageIds?: string[]): Promise<number>;
    /**
     * Get queue statistics
     */
    getStats(): QueueStats;
    /**
     * Check if queue is experiencing backpressure
     */
    private isBackpressured;
    /**
     * Clear all queues
     */
    clear(): Promise<void>;
    /**
     * Pause processing
     */
    pause(): void;
    /**
     * Resume processing
     */
    resume(): void;
    /**
     * Shutdown queue
     */
    shutdown(): Promise<void>;
    private generateMessageId;
    private recordProcessingTime;
    private setupQueueHandlers;
    private startStatsReporting;
    private sleep;
}
//# sourceMappingURL=message-queue.d.ts.map