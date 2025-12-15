/**
 * StreamLine - Stroke smoothing/stabilization
 * Inspired by Procreate's StreamLine feature
 */

export class StreamLine {
    constructor(app) {
        this.app = app;

        // Smoothing settings
        this.amount = 0; // 0-100, default to 0 (no smoothing)
        this.bufferSize = 8; // Number of points to average

        // Point buffer for smoothing
        this.buffer = [];

        // Previous smoothed position
        this.lastSmoothedX = 0;
        this.lastSmoothedY = 0;

        // Moving average weights
        this.weights = this.calculateWeights();
    }

    /**
     * Calculate weights for weighted moving average
     */
    calculateWeights() {
        const weights = [];
        let sum = 0;

        for (let i = 0; i < this.bufferSize; i++) {
            // Exponential weights - recent points have more influence
            const weight = Math.pow(2, i);
            weights.push(weight);
            sum += weight;
        }

        // Normalize
        return weights.map(w => w / sum);
    }

    /**
     * Reset smoothing state for new stroke
     */
    reset() {
        this.buffer = [];
        this.lastSmoothedX = 0;
        this.lastSmoothedY = 0;
    }

    /**
     * Smooth a point position
     */
    smooth(x, y) {
        // Calculate effective buffer size based on amount
        const effectiveBufferSize = Math.max(1, Math.floor(this.bufferSize * (this.amount / 100)));

        // Add point to buffer
        this.buffer.push({ x, y });

        // Keep buffer at effective size
        while (this.buffer.length > effectiveBufferSize) {
            this.buffer.shift();
        }

        // If amount is 0, no smoothing
        if (this.amount === 0) {
            return { x, y };
        }

        // Calculate weighted average
        let smoothedX = 0;
        let smoothedY = 0;
        let totalWeight = 0;

        for (let i = 0; i < this.buffer.length; i++) {
            const weightIndex = this.bufferSize - this.buffer.length + i;
            const weight = this.weights[weightIndex] || 1 / this.buffer.length;

            smoothedX += this.buffer[i].x * weight;
            smoothedY += this.buffer[i].y * weight;
            totalWeight += weight;
        }

        // Normalize if needed
        if (totalWeight > 0) {
            smoothedX /= totalWeight;
            smoothedY /= totalWeight;
        }

        // Interpolate between raw and smoothed based on amount
        const t = this.amount / 100;
        const finalX = x * (1 - t) + smoothedX * t;
        const finalY = y * (1 - t) + smoothedY * t;

        // Optional: Add pulling effect for extra smoothness
        if (this.lastSmoothedX !== 0 || this.lastSmoothedY !== 0) {
            const pullStrength = t * 0.3;
            const pulledX = finalX * (1 - pullStrength) + this.lastSmoothedX * pullStrength;
            const pulledY = finalY * (1 - pullStrength) + this.lastSmoothedY * pullStrength;

            this.lastSmoothedX = pulledX;
            this.lastSmoothedY = pulledY;

            return { x: pulledX, y: pulledY };
        }

        this.lastSmoothedX = finalX;
        this.lastSmoothedY = finalY;

        return { x: finalX, y: finalY };
    }

    /**
     * Set smoothing amount (0-100)
     */
    setAmount(amount) {
        this.amount = Math.max(0, Math.min(100, amount));
        this.weights = this.calculateWeights();
    }

    /**
     * Get current smoothing amount
     */
    getAmount() {
        return this.amount;
    }
}
