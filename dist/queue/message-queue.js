"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageQueue = exports.MessagePriority = void 0;
const events_1 = require("events");
const p_queue_1 = __importDefault(require("p-queue"));
/**
 * Message Priority Levels
 */
var MessagePriority;
(function (MessagePriority) {
    /** Critical messages that must be processed immediately */
    MessagePriority[MessagePriority["CRITICAL"] = 0] = "CRITICAL";
    /** High priority messages */
    MessagePriority[MessagePriority["HIGH"] = 1] = "HIGH";
    /** Normal priority (default) */
    MessagePriority[MessagePriority["NORMAL"] = 2] = "NORMAL";
    /** Low priority background tasks */
    MessagePriority[MessagePriority["LOW"] = 3] = "LOW";
})(MessagePriority || (exports.MessagePriority = MessagePriority = {}));
/**
 * Bidirectional Message Queue
 *
 * Manages async message processing with priorities and batching
 */
class MessageQueue extends events_1.EventEmitter {
    // Separate queues for each direction
    mcpToA2aQueue;
    a2aToMcpQueue;
    // Dead letter queues
    deadLetterMcp;
    deadLetterA2a;
    // Message processors
    processors;
    // Configuration
    config;
    // Statistics
    stats;
    processingTimes;
    constructor(config) {
        super();
        // Initialize configuration
        this.config = {
            concurrency: 10,
            maxQueueSize: 1000,
            processingTimeout: 30000,
            batchSize: 10,
            enableDeadLetter: true,
            maxRetries: 3,
            backpressureThreshold: 0.8,
            ...config
        };
        // Initialize queues with priority support
        this.mcpToA2aQueue = new p_queue_1.default({
            concurrency: Math.floor(this.config.concurrency / 2),
            timeout: this.config.processingTimeout,
            throwOnTimeout: true
        });
        this.a2aToMcpQueue = new p_queue_1.default({
            concurrency: Math.floor(this.config.concurrency / 2),
            timeout: this.config.processingTimeout,
            throwOnTimeout: true
        });
        // Initialize dead letter queues
        this.deadLetterMcp = new Map();
        this.deadLetterA2a = new Map();
        // Initialize processors map
        this.processors = new Map();
        // Initialize statistics
        this.stats = {
            pending: 0,
            active: 0,
            processed: 0,
            failed: 0,
            deadLetter: 0,
            avgProcessingTime: 0,
            throughput: 0
        };
        this.processingTimes = [];
        // Setup queue event handlers
        this.setupQueueHandlers();
        // Start statistics reporting
        this.startStatsReporting();
    }
    /**
     * Register a message processor
     */
    registerProcessor(direction, processor) {
        this.processors.set(direction, processor);
        this.emit('processor:registered', { direction });
    }
    /**
     * Enqueue a message for processing
     */
    async enqueue(payload, direction, options) {
        // Check for backpressure
        if (this.isBackpressured()) {
            this.emit('queue:backpressure', { direction });
            throw new Error('Queue is experiencing backpressure');
        }
        // Create message
        const message = {
            id: this.generateMessageId(),
            payload,
            direction,
            priority: options?.priority || MessagePriority.NORMAL,
            sessionId: options?.sessionId || 'default',
            enqueuedAt: Date.now(),
            attempts: 0,
            maxRetries: options?.maxRetries || this.config.maxRetries,
            metadata: options?.metadata
        };
        // Select appropriate queue
        const queue = direction === 'mcp-to-a2a' ? this.mcpToA2aQueue : this.a2aToMcpQueue;
        // Add to queue with priority
        queue.add(() => this.processMessage(message), { priority: message.priority });
        this.emit('message:enqueued', {
            id: message.id,
            direction,
            priority: message.priority
        });
        return message.id;
    }
    /**
     * Enqueue multiple messages for batch processing
     */
    async enqueueBatch(messages) {
        const messageIds = [];
        // Process in batches to avoid overwhelming the queue
        for (let i = 0; i < messages.length; i += this.config.batchSize) {
            const batch = messages.slice(i, i + this.config.batchSize);
            const batchIds = await Promise.all(batch.map(msg => this.enqueue(msg.payload, msg.direction, { priority: msg.priority })));
            messageIds.push(...batchIds);
            // Small delay between batches to prevent overload
            if (i + this.config.batchSize < messages.length) {
                await this.sleep(10);
            }
        }
        this.emit('batch:enqueued', { count: messageIds.length });
        return messageIds;
    }
    /**
     * Process a message
     */
    async processMessage(message) {
        const startTime = Date.now();
        message.attempts++;
        try {
            // Get processor for this direction
            const processor = this.processors.get(message.direction);
            if (!processor) {
                throw new Error(`No processor registered for direction: ${message.direction}`);
            }
            // Process the message
            this.emit('message:processing', {
                id: message.id,
                direction: message.direction,
                attempt: message.attempts
            });
            const result = await processor(message);
            if (result.success) {
                // Success
                const processingTime = Date.now() - startTime;
                this.recordProcessingTime(processingTime);
                this.stats.processed++;
                this.emit('message:processed', {
                    id: message.id,
                    direction: message.direction,
                    processingTime,
                    confidence: result.confidence?.score
                });
            }
            else {
                // Processing failed
                throw result.error || new Error('Processing failed');
            }
        }
        catch (error) {
            // Handle failure
            this.stats.failed++;
            this.emit('message:failed', {
                id: message.id,
                direction: message.direction,
                attempt: message.attempts,
                error: String(error)
            });
            // Retry or send to dead letter queue
            if (message.attempts < message.maxRetries) {
                // Retry with exponential backoff
                const delay = Math.pow(2, message.attempts) * 1000;
                this.emit('message:retry', {
                    id: message.id,
                    attempt: message.attempts,
                    delay
                });
                setTimeout(() => {
                    const queue = message.direction === 'mcp-to-a2a'
                        ? this.mcpToA2aQueue
                        : this.a2aToMcpQueue;
                    queue.add(() => this.processMessage(message), { priority: message.priority });
                }, delay);
            }
            else if (this.config.enableDeadLetter) {
                // Move to dead letter queue
                this.moveToDeadLetter(message);
            }
        }
    }
    /**
     * Move message to dead letter queue
     */
    moveToDeadLetter(message) {
        const dlq = message.direction === 'mcp-to-a2a'
            ? this.deadLetterMcp
            : this.deadLetterA2a;
        dlq.set(message.id, message);
        this.stats.deadLetter++;
        this.emit('message:deadletter', {
            id: message.id,
            direction: message.direction,
            attempts: message.attempts
        });
    }
    /**
     * Reprocess dead letter messages
     */
    async reprocessDeadLetter(direction, messageIds) {
        const dlq = direction === 'mcp-to-a2a'
            ? this.deadLetterMcp
            : this.deadLetterA2a;
        const messages = messageIds
            ? messageIds.map(id => dlq.get(id)).filter(Boolean)
            : Array.from(dlq.values());
        let reprocessed = 0;
        for (const message of messages) {
            if (message) {
                // Reset attempts and re-enqueue
                message.attempts = 0;
                const queue = direction === 'mcp-to-a2a'
                    ? this.mcpToA2aQueue
                    : this.a2aToMcpQueue;
                queue.add(() => this.processMessage(message), { priority: message.priority });
                dlq.delete(message.id);
                this.stats.deadLetter--;
                reprocessed++;
            }
        }
        this.emit('deadletter:reprocessed', {
            direction,
            count: reprocessed
        });
        return reprocessed;
    }
    /**
     * Get queue statistics
     */
    getStats() {
        this.stats.pending = this.mcpToA2aQueue.pending + this.a2aToMcpQueue.pending;
        this.stats.active = this.mcpToA2aQueue.size - this.mcpToA2aQueue.pending +
            this.a2aToMcpQueue.size - this.a2aToMcpQueue.pending;
        return { ...this.stats };
    }
    /**
     * Check if queue is experiencing backpressure
     */
    isBackpressured() {
        const totalSize = this.mcpToA2aQueue.size + this.a2aToMcpQueue.size;
        const threshold = this.config.maxQueueSize * this.config.backpressureThreshold;
        return totalSize >= threshold;
    }
    /**
     * Clear all queues
     */
    async clear() {
        this.mcpToA2aQueue.clear();
        this.a2aToMcpQueue.clear();
        this.deadLetterMcp.clear();
        this.deadLetterA2a.clear();
        this.stats = {
            pending: 0,
            active: 0,
            processed: 0,
            failed: 0,
            deadLetter: 0,
            avgProcessingTime: 0,
            throughput: 0
        };
        this.emit('queue:cleared');
    }
    /**
     * Pause processing
     */
    pause() {
        this.mcpToA2aQueue.pause();
        this.a2aToMcpQueue.pause();
        this.emit('queue:paused');
    }
    /**
     * Resume processing
     */
    resume() {
        this.mcpToA2aQueue.start();
        this.a2aToMcpQueue.start();
        this.emit('queue:resumed');
    }
    /**
     * Shutdown queue
     */
    async shutdown() {
        // Wait for all pending messages to complete
        await Promise.all([
            this.mcpToA2aQueue.onIdle(),
            this.a2aToMcpQueue.onIdle()
        ]);
        this.clear();
        this.removeAllListeners();
        this.emit('queue:shutdown');
    }
    // Private helper methods
    generateMessageId() {
        return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    recordProcessingTime(time) {
        this.processingTimes.push(time);
        // Keep only last 1000 times
        if (this.processingTimes.length > 1000) {
            this.processingTimes.shift();
        }
        // Update average
        const sum = this.processingTimes.reduce((a, b) => a + b, 0);
        this.stats.avgProcessingTime = sum / this.processingTimes.length;
    }
    setupQueueHandlers() {
        // Monitor queue events
        this.mcpToA2aQueue.on('active', () => {
            this.emit('queue:active', { direction: 'mcp-to-a2a' });
        });
        this.a2aToMcpQueue.on('active', () => {
            this.emit('queue:active', { direction: 'a2a-to-mcp' });
        });
    }
    startStatsReporting() {
        // Calculate throughput every second
        let lastProcessed = 0;
        setInterval(() => {
            const currentProcessed = this.stats.processed;
            this.stats.throughput = currentProcessed - lastProcessed;
            lastProcessed = currentProcessed;
            this.emit('stats:update', this.getStats());
        }, 1000);
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.MessageQueue = MessageQueue;
//# sourceMappingURL=message-queue.js.map