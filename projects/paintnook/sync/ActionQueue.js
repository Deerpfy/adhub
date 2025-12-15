/**
 * ActionQueue - Batches actions for efficient network transmission
 *
 * Features:
 * - Automatic batching based on size and time
 * - Configurable flush intervals
 * - Manual flush capability
 */

export class ActionQueue {
    constructor(config = {}) {
        this.config = {
            maxSize: config.maxSize || 50,
            flushInterval: config.flushInterval || 16, // ~60fps
            maxLatency: config.maxLatency || 100
        };

        this.queue = [];
        this.flushTimer = null;
        this.firstEnqueueTime = null;
        this.onFlush = null;
        this.isPaused = false;
    }

    /**
     * Set the flush callback
     * @param {Function} callback - Called with array of actions when flushing
     */
    setFlushCallback(callback) {
        this.onFlush = callback;
    }

    /**
     * Enqueue an action for transmission
     * @param {Object} action - UAF action to enqueue
     */
    enqueue(action) {
        if (this.isPaused) {
            return;
        }

        this.queue.push(action);

        // Track first enqueue time for max latency
        if (this.firstEnqueueTime === null) {
            this.firstEnqueueTime = Date.now();
        }

        // Flush immediately if queue is full
        if (this.queue.length >= this.config.maxSize) {
            this.flush();
        } else if (!this.flushTimer) {
            // Set timer for periodic flush
            this.flushTimer = setTimeout(() => this.flush(), this.config.flushInterval);
        }

        // Force flush if max latency exceeded
        const latency = Date.now() - this.firstEnqueueTime;
        if (latency >= this.config.maxLatency) {
            this.flush();
        }
    }

    /**
     * Immediately flush all queued actions
     */
    flush() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }

        this.firstEnqueueTime = null;

        if (this.queue.length > 0 && this.onFlush) {
            const actions = [...this.queue];
            this.queue = [];

            try {
                this.onFlush(actions);
            } catch (error) {
                console.error('[ActionQueue] Flush callback error:', error);
                // Re-enqueue failed actions
                this.queue = actions.concat(this.queue);
            }
        }
    }

    /**
     * Clear all queued actions without flushing
     */
    clear() {
        this.queue = [];
        this.firstEnqueueTime = null;

        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
    }

    /**
     * Pause the queue (stops automatic flushing)
     */
    pause() {
        this.isPaused = true;
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
    }

    /**
     * Resume the queue
     */
    resume() {
        this.isPaused = false;
    }

    /**
     * Get the current queue size
     * @returns {number}
     */
    size() {
        return this.queue.length;
    }

    /**
     * Check if queue is empty
     * @returns {boolean}
     */
    isEmpty() {
        return this.queue.length === 0;
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Destroy the queue
     */
    destroy() {
        this.clear();
        this.onFlush = null;
    }
}
