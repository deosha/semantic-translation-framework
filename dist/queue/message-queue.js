"use strict";
/**
 * Message Queue System
 *
 * Handles asynchronous message processing, batching, and request ordering
 * for the semantic translation framework. Ensures reliable message delivery
 * and optimal throughput.
 *
 * Based on paper Section V.C: Performance Optimizations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageQueue = void 0;
const events_1 = require("events");
const p_queue_1 = __importDefault(require("p-queue"));
/**
 * Message Queue
 *
 * Manages asynchronous translation requests with batching and prioritization
 */
class MessageQueue extends events_1.EventEmitter {
    translateFn;
    queue;
    config;
    pendingBatch = [];
    batchTimer = null;
    messageStore = new Map();
    metrics = {
        totalEnqueued: 0,
        totalProcessed: 0,
        totalFailed: 0,
        averageLatency: 0,
        queueDepth: 0
    };
    constructor(translateFn, config) {
        super();
        this.translateFn = translateFn;
        this.config = {
            concurrency: 10,
            batchSize: 50,
            batchTimeout: 100,
            maxRetries: 3,
            retryBackoff: 1000,
            priorityEnabled: true,
            maxQueueSize: 10000,
            ...config
        };
        this.queue = new p_queue_1.default({
            concurrency: this.config.concurrency,
            interval: 1000,
            intervalCap: 100 // Max 100 operations per second per worker
        });
        this.setupQueueHandlers();
    }
    /**
     * Enqueue a message for translation
     */
    async enqueue(message, targetParadigm, priority = 'normal') {
        // Check queue size limit
        if (this.messageStore.size >= this.config.maxQueueSize) {
            throw new Error(`Queue size limit exceeded: ${this.config.maxQueueSize}`);
        }
        const entry = {
            id: this.generateId(),
            message,
            targetParadigm,
            priority,
            timestamp: Date.now(),
            retries: 0
        };
        this.messageStore.set(entry.id, entry);
        this.metrics.totalEnqueued++;
        this.metrics.queueDepth = this.queue.size;
        // Return promise that resolves when translation completes
        return new Promise((resolve, reject) => {
            entry.callback = (result) => {
                this.messageStore.delete(entry.id);
                if (result.success) {
                    resolve(result);
                }
                else {
                    reject(new Error(result.error || 'Translation failed'));
                }
            };
            // Add to batch or priority queue
            if (this.config.priorityEnabled && priority === 'critical') {
                this.processImmediate(entry);
            }
            else {
                this.addToBatch(entry);
            }
        });
    }
    /**
     * Enqueue multiple messages for batch processing
     */
    async enqueueBatch(messages) {
        const startTime = Date.now();
        const results = new Map();
        let successful = 0;
        let failed = 0;
        const promises = messages.map(async ({ message, targetParadigm, priority }) => {
            try {
                const result = await this.enqueue(message, targetParadigm, priority);
                results.set(message.id, result);
                successful++;
            }
            catch (error) {
                results.set(message.id, {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                    confidence: {
                        score: 0,
                        factors: {
                            semanticMatch: 0,
                            structuralAlignment: 0,
                            dataPreservation: 0,
                            contextRetention: 0
                        },
                        warnings: [],
                        lossyTranslation: true
                    },
                    metrics: {
                        latencyMs: 0,
                        cacheHit: false,
                        retries: 0,
                        fallbacksUsed: []
                    }
                });
                failed++;
            }
        });
        await Promise.allSettled(promises);
        return {
            successful,
            failed,
            results,
            duration: Date.now() - startTime
        };
    }
    /**
     * Process message immediately (for critical priority)
     */
    async processImmediate(entry) {
        this.queue.add(async () => {
            await this.processEntry(entry);
        }, { priority: this.getPriorityValue(entry.priority) });
    }
    /**
     * Add message to batch
     */
    addToBatch(entry) {
        this.pendingBatch.push(entry);
        // Process batch if size reached
        if (this.pendingBatch.length >= this.config.batchSize) {
            this.processBatch();
        }
        else {
            // Set timer for batch timeout
            if (!this.batchTimer) {
                this.batchTimer = setTimeout(() => {
                    this.processBatch();
                }, this.config.batchTimeout);
            }
        }
    }
    /**
     * Process pending batch
     */
    processBatch() {
        if (this.pendingBatch.length === 0) {
            return;
        }
        // Clear timer
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
        // Move batch to processing
        const batch = [...this.pendingBatch];
        this.pendingBatch = [];
        // Sort by priority if enabled
        if (this.config.priorityEnabled) {
            batch.sort((a, b) => {
                const priorityDiff = this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority);
                if (priorityDiff !== 0)
                    return priorityDiff;
                return a.timestamp - b.timestamp; // FIFO for same priority
            });
        }
        // Process batch entries
        for (const entry of batch) {
            this.queue.add(async () => {
                await this.processEntry(entry);
            }, { priority: this.getPriorityValue(entry.priority) });
        }
        this.emit('batch:processed', {
            size: batch.length,
            queueDepth: this.queue.size
        });
    }
    /**
     * Process a single queue entry
     */
    async processEntry(entry) {
        const startTime = Date.now();
        try {
            // Perform translation
            const result = await this.translateFn(entry.message, entry.targetParadigm);
            // Update metrics
            this.metrics.totalProcessed++;
            this.updateAverageLatency(Date.now() - startTime);
            // Invoke callback
            if (entry.callback) {
                entry.callback(result);
            }
            this.emit('message:processed', {
                id: entry.id,
                latency: Date.now() - startTime,
                success: result.success
            });
        }
        catch (error) {
            // Handle retry logic
            if (entry.retries < this.config.maxRetries) {
                entry.retries++;
                // Exponential backoff
                const delay = this.config.retryBackoff * Math.pow(2, entry.retries - 1);
                setTimeout(() => {
                    this.queue.add(async () => {
                        await this.processEntry(entry);
                    }, { priority: this.getPriorityValue(entry.priority) });
                }, delay);
                this.emit('message:retry', {
                    id: entry.id,
                    attempt: entry.retries,
                    delay
                });
            }
            else {
                // Max retries exceeded
                this.metrics.totalFailed++;
                if (entry.callback) {
                    entry.callback({
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                        confidence: {
                            score: 0,
                            factors: {
                                semanticMatch: 0,
                                structuralAlignment: 0,
                                dataPreservation: 0,
                                contextRetention: 0
                            },
                            warnings: ['Translation failed after retries'],
                            lossyTranslation: true
                        },
                        metrics: {
                            latencyMs: Date.now() - startTime,
                            cacheHit: false,
                            retries: entry.retries,
                            fallbacksUsed: []
                        }
                    });
                }
                this.emit('message:failed', {
                    id: entry.id,
                    error: error instanceof Error ? error.message : String(error),
                    retries: entry.retries
                });
            }
        }
    }
    /**
     * Get numeric priority value
     */
    getPriorityValue(priority) {
        const priorityMap = {
            'critical': 4,
            'high': 3,
            'normal': 2,
            'low': 1
        };
        return priorityMap[priority];
    }
    /**
     * Update average latency metric
     */
    updateAverageLatency(latency) {
        const total = this.metrics.totalProcessed;
        if (total === 1) {
            this.metrics.averageLatency = latency;
        }
        else {
            this.metrics.averageLatency =
                ((this.metrics.averageLatency * (total - 1)) + latency) / total;
        }
    }
    /**
     * Setup queue event handlers
     */
    setupQueueHandlers() {
        this.queue.on('active', () => {
            this.metrics.queueDepth = this.queue.size;
            this.emit('queue:active', { depth: this.queue.size });
        });
        this.queue.on('idle', () => {
            this.metrics.queueDepth = 0;
            this.emit('queue:idle');
            // Process any remaining batch
            if (this.pendingBatch.length > 0) {
                this.processBatch();
            }
        });
        // Periodic metrics reporting
        setInterval(() => {
            this.emit('metrics:update', this.getMetrics());
        }, 30000);
    }
    /**
     * Get queue metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            queueDepth: this.queue.size,
            pendingBatch: this.pendingBatch.length,
            activeWorkers: this.queue.pending
        };
    }
    /**
     * Clear the queue
     */
    async clear() {
        await this.queue.clear();
        this.pendingBatch = [];
        this.messageStore.clear();
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
        this.emit('queue:cleared');
    }
    /**
     * Pause processing
     */
    pause() {
        this.queue.pause();
        this.emit('queue:paused');
    }
    /**
     * Resume processing
     */
    resume() {
        this.queue.start();
        this.emit('queue:resumed');
    }
    /**
     * Wait for queue to be empty
     */
    async onIdle() {
        await this.queue.onIdle();
    }
    /**
     * Get queue size
     */
    get size() {
        return this.queue.size + this.pendingBatch.length;
    }
    /**
     * Get pending count
     */
    get pending() {
        return this.queue.pending;
    }
    /**
     * Generate unique ID
     */
    generateId() {
        return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.MessageQueue = MessageQueue;
//# sourceMappingURL=message-queue.js.map