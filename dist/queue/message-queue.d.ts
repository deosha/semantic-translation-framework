/**
 * Message Queue System
 *
 * Handles asynchronous message processing, batching, and request ordering
 * for the semantic translation framework. Ensures reliable message delivery
 * and optimal throughput.
 *
 * Based on paper Section V.C: Performance Optimizations
 */
import { EventEmitter } from 'events';
import { ProtocolMessage, ProtocolParadigm } from '../types/protocols';
import { TranslationResult } from '../types/semantic-translation';
/**
 * Message Queue Entry
 */
interface QueueEntry {
    id: string;
    message: ProtocolMessage;
    targetParadigm: ProtocolParadigm;
    priority: 'low' | 'normal' | 'high' | 'critical';
    timestamp: number;
    retries: number;
    callback?: (result: TranslationResult) => void;
}
/**
 * Batch Processing Result
 */
interface BatchResult {
    successful: number;
    failed: number;
    results: Map<string, TranslationResult>;
    duration: number;
}
/**
 * Message Queue Configuration
 */
export interface MessageQueueConfig {
    /** Maximum concurrent translations */
    concurrency?: number;
    /** Batch size for processing */
    batchSize?: number;
    /** Batch timeout in milliseconds */
    batchTimeout?: number;
    /** Maximum retries per message */
    maxRetries?: number;
    /** Retry backoff in milliseconds */
    retryBackoff?: number;
    /** Enable priority queue */
    priorityEnabled?: boolean;
    /** Maximum queue size */
    maxQueueSize?: number;
}
/**
 * Message Queue
 *
 * Manages asynchronous translation requests with batching and prioritization
 */
export declare class MessageQueue extends EventEmitter {
    private translateFn;
    private queue;
    private config;
    private pendingBatch;
    private batchTimer;
    private messageStore;
    private metrics;
    constructor(translateFn: (message: ProtocolMessage, target: ProtocolParadigm) => Promise<TranslationResult>, config?: MessageQueueConfig);
    /**
     * Enqueue a message for translation
     */
    enqueue(message: ProtocolMessage, targetParadigm: ProtocolParadigm, priority?: QueueEntry['priority']): Promise<TranslationResult>;
    /**
     * Enqueue multiple messages for batch processing
     */
    enqueueBatch(messages: Array<{
        message: ProtocolMessage;
        targetParadigm: ProtocolParadigm;
        priority?: QueueEntry['priority'];
    }>): Promise<BatchResult>;
    /**
     * Process message immediately (for critical priority)
     */
    private processImmediate;
    /**
     * Add message to batch
     */
    private addToBatch;
    /**
     * Process pending batch
     */
    private processBatch;
    /**
     * Process a single queue entry
     */
    private processEntry;
    /**
     * Get numeric priority value
     */
    private getPriorityValue;
    /**
     * Update average latency metric
     */
    private updateAverageLatency;
    /**
     * Setup queue event handlers
     */
    private setupQueueHandlers;
    /**
     * Get queue metrics
     */
    getMetrics(): {
        queueDepth: number;
        pendingBatch: number;
        activeWorkers: number;
        totalEnqueued: number;
        totalProcessed: number;
        totalFailed: number;
        averageLatency: number;
    };
    /**
     * Clear the queue
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
     * Wait for queue to be empty
     */
    onIdle(): Promise<void>;
    /**
     * Get queue size
     */
    get size(): number;
    /**
     * Get pending count
     */
    get pending(): number;
    /**
     * Generate unique ID
     */
    private generateId;
}
export {};
//# sourceMappingURL=message-queue.d.ts.map