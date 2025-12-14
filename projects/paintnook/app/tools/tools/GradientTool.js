/**
 * GradientTool - Creates linear and radial gradients
 */

export class GradientTool {
    constructor(app) {
        this.app = app;
        this.name = 'gradient';
        this.displayName = 'Přechod';

        // Gradient settings
        this.gradientType = 'linear'; // linear, radial, angle, diamond
        this.colorStops = [
            { position: 0, color: null }, // Will use primary color
            { position: 1, color: null }  // Will use secondary color
        ];
        this.dithering = true;
        this.reverse = false;

        // Drawing state
        this.startPoint = null;
        this.endPoint = null;
        this.isDrawing = false;
    }

    activate() {
        // Update color stops with current colors
        this.updateColorStops();
    }

    deactivate() {
        this.clearPreview();
    }

    /**
     * Update color stops from color picker
     */
    updateColorStops() {
        this.colorStops[0].color = this.app.color.getPrimaryColor();
        this.colorStops[this.colorStops.length - 1].color = this.app.color.getSecondaryColor();
    }

    onStart(x, y, pressure) {
        this.updateColorStops();
        this.startPoint = { x, y };
        this.endPoint = { x, y };
        this.isDrawing = true;
        this.drawPreview();
    }

    onMove(x, y, pressure, lastX, lastY) {
        if (!this.isDrawing) return;
        this.endPoint = { x, y };
        this.drawPreview();
    }

    onEnd(x, y) {
        if (!this.isDrawing) return;
        this.endPoint = { x, y };
        this.isDrawing = false;

        // Apply gradient to active layer
        this.applyGradient();
        this.clearPreview();
    }

    /**
     * Draw gradient preview
     */
    drawPreview() {
        const previewCtx = this.app.canvas.getPreviewContext();
        if (!previewCtx) return;

        previewCtx.clearRect(0, 0, this.app.canvas.width, this.app.canvas.height);

        // Draw gradient preview
        const gradient = this.createGradient(previewCtx, this.startPoint, this.endPoint);
        if (gradient) {
            previewCtx.fillStyle = gradient;
            previewCtx.fillRect(0, 0, this.app.canvas.width, this.app.canvas.height);
        }

        // Draw control line
        previewCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        previewCtx.lineWidth = 2;
        previewCtx.setLineDash([5, 5]);
        previewCtx.beginPath();
        previewCtx.moveTo(this.startPoint.x, this.startPoint.y);
        previewCtx.lineTo(this.endPoint.x, this.endPoint.y);
        previewCtx.stroke();
        previewCtx.setLineDash([]);

        // Draw start and end markers
        this.drawMarker(previewCtx, this.startPoint.x, this.startPoint.y, this.getStartColor());
        this.drawMarker(previewCtx, this.endPoint.x, this.endPoint.y, this.getEndColor());
    }

    /**
     * Draw a marker point
     */
    drawMarker(ctx, x, y, color) {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    /**
     * Get start color (considering reverse)
     */
    getStartColor() {
        return this.reverse
            ? this.colorStops[this.colorStops.length - 1].color
            : this.colorStops[0].color;
    }

    /**
     * Get end color (considering reverse)
     */
    getEndColor() {
        return this.reverse
            ? this.colorStops[0].color
            : this.colorStops[this.colorStops.length - 1].color;
    }

    /**
     * Create a gradient based on type
     */
    createGradient(ctx, start, end) {
        if (!start || !end) return null;

        let gradient;

        switch (this.gradientType) {
            case 'linear':
                gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
                break;

            case 'radial':
                const radius = Math.sqrt(
                    Math.pow(end.x - start.x, 2) +
                    Math.pow(end.y - start.y, 2)
                );
                gradient = ctx.createRadialGradient(
                    start.x, start.y, 0,
                    start.x, start.y, radius
                );
                break;

            case 'angle':
                // Angle gradient - simulated with conic gradient if supported
                if (typeof ctx.createConicGradient === 'function') {
                    const angle = Math.atan2(end.y - start.y, end.x - start.x);
                    gradient = ctx.createConicGradient(angle, start.x, start.y);
                } else {
                    // Fallback to linear
                    gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
                }
                break;

            case 'diamond':
                // Diamond gradient - simulated using multiple linear gradients
                // For simplicity, use radial as fallback
                const diamondRadius = Math.sqrt(
                    Math.pow(end.x - start.x, 2) +
                    Math.pow(end.y - start.y, 2)
                );
                gradient = ctx.createRadialGradient(
                    start.x, start.y, 0,
                    start.x, start.y, diamondRadius
                );
                break;

            default:
                gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
        }

        // Add color stops
        const stops = this.reverse ? [...this.colorStops].reverse() : this.colorStops;
        stops.forEach(stop => {
            gradient.addColorStop(stop.position, stop.color);
        });

        return gradient;
    }

    /**
     * Apply gradient to active layer
     */
    applyGradient() {
        const ctx = this.app.layers.getActiveContext();
        if (!ctx) return;

        const gradient = this.createGradient(ctx, this.startPoint, this.endPoint);
        if (!gradient) return;

        // Apply with current opacity
        ctx.save();
        ctx.globalAlpha = this.app.brush.opacity;
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.app.canvas.width, this.app.canvas.height);
        ctx.restore();

        this.app.canvas.render();
    }

    /**
     * Clear preview
     */
    clearPreview() {
        const previewCtx = this.app.canvas.getPreviewContext();
        if (previewCtx) {
            previewCtx.clearRect(0, 0, this.app.canvas.width, this.app.canvas.height);
        }
    }

    /**
     * Set gradient type
     */
    setGradientType(type) {
        this.gradientType = type;
    }

    /**
     * Add color stop
     */
    addColorStop(position, color) {
        this.colorStops.push({ position, color });
        this.colorStops.sort((a, b) => a.position - b.position);
    }

    /**
     * Remove color stop by index
     */
    removeColorStop(index) {
        if (this.colorStops.length > 2 && index > 0 && index < this.colorStops.length - 1) {
            this.colorStops.splice(index, 1);
        }
    }

    /**
     * Update color stop
     */
    updateColorStop(index, position, color) {
        if (this.colorStops[index]) {
            if (position !== undefined) this.colorStops[index].position = position;
            if (color !== undefined) this.colorStops[index].color = color;
            this.colorStops.sort((a, b) => a.position - b.position);
        }
    }

    /**
     * Toggle reverse
     */
    toggleReverse() {
        this.reverse = !this.reverse;
    }

    /**
     * Reset to default gradient
     */
    reset() {
        this.colorStops = [
            { position: 0, color: this.app.color.getPrimaryColor() },
            { position: 1, color: this.app.color.getSecondaryColor() }
        ];
        this.reverse = false;
    }
}
