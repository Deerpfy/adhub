/**
 * TransformTool - Transform layers (move, rotate, scale, skew)
 */

export class TransformTool {
    constructor(app) {
        this.app = app;
        this.name = 'transform';
        this.displayName = 'Transformace';

        // Transform state
        this.isTransforming = false;
        this.originalImageData = null;
        this.transformedCanvas = null;

        // Transform values
        this.translateX = 0;
        this.translateY = 0;
        this.rotation = 0; // degrees
        this.scaleX = 1;
        this.scaleY = 1;
        this.skewX = 0;
        this.skewY = 0;

        // Bounds
        this.bounds = null;
        this.originalBounds = null;

        // Handle being dragged
        this.activeHandle = null;
        this.dragStartX = 0;
        this.dragStartY = 0;

        // Handle positions
        this.handles = {
            nw: null, n: null, ne: null,
            w: null, e: null,
            sw: null, s: null, se: null,
            rotate: null
        };
    }

    activate() {
        this.app.canvas.container.style.cursor = 'default';
        this.startTransform();
    }

    deactivate() {
        if (this.isTransforming) {
            this.applyTransform();
        }
        this.clearPreview();
    }

    /**
     * Start transform mode
     */
    startTransform() {
        const layer = this.app.layers.getActiveLayer();
        if (!layer) return;

        // Save original image data
        const ctx = layer.canvas.getContext('2d');
        this.originalImageData = ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);

        // Create working canvas
        this.transformedCanvas = document.createElement('canvas');
        this.transformedCanvas.width = layer.canvas.width;
        this.transformedCanvas.height = layer.canvas.height;
        const tCtx = this.transformedCanvas.getContext('2d');
        tCtx.putImageData(this.originalImageData, 0, 0);

        // Calculate bounds
        this.bounds = this.calculateContentBounds(this.originalImageData);
        this.originalBounds = { ...this.bounds };

        // Reset transform values
        this.translateX = 0;
        this.translateY = 0;
        this.rotation = 0;
        this.scaleX = 1;
        this.scaleY = 1;
        this.skewX = 0;
        this.skewY = 0;

        this.isTransforming = true;
        this.updateHandles();
        this.drawTransformPreview();
    }

    /**
     * Calculate bounding box of non-transparent content
     */
    calculateContentBounds(imageData) {
        const data = imageData.data;
        const w = imageData.width;
        const h = imageData.height;

        let minX = w, minY = h, maxX = 0, maxY = 0;
        let hasContent = false;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const alpha = data[(y * w + x) * 4 + 3];
                if (alpha > 0) {
                    hasContent = true;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        if (!hasContent) {
            // Use full canvas if no content
            return { x: 0, y: 0, width: w, height: h };
        }

        return {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
        };
    }

    /**
     * Update handle positions
     */
    updateHandles() {
        if (!this.bounds) return;

        const b = this.getTransformedBounds();
        const hw = 8; // Handle width

        this.handles = {
            nw: { x: b.x, y: b.y },
            n: { x: b.x + b.width / 2, y: b.y },
            ne: { x: b.x + b.width, y: b.y },
            w: { x: b.x, y: b.y + b.height / 2 },
            e: { x: b.x + b.width, y: b.y + b.height / 2 },
            sw: { x: b.x, y: b.y + b.height },
            s: { x: b.x + b.width / 2, y: b.y + b.height },
            se: { x: b.x + b.width, y: b.y + b.height },
            rotate: { x: b.x + b.width / 2, y: b.y - 30 }
        };
    }

    /**
     * Get transformed bounds
     */
    getTransformedBounds() {
        return {
            x: this.originalBounds.x + this.translateX,
            y: this.originalBounds.y + this.translateY,
            width: this.originalBounds.width * this.scaleX,
            height: this.originalBounds.height * this.scaleY
        };
    }

    onStart(x, y, pressure) {
        if (!this.isTransforming) {
            this.startTransform();
            return;
        }

        // Check if clicking on a handle
        this.activeHandle = this.getHandleAt(x, y);

        if (!this.activeHandle) {
            // Check if inside bounds - move
            const b = this.getTransformedBounds();
            if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
                this.activeHandle = 'move';
            }
        }

        this.dragStartX = x;
        this.dragStartY = y;
    }

    onMove(x, y, pressure, lastX, lastY) {
        if (!this.isTransforming || !this.activeHandle) return;

        const dx = x - this.dragStartX;
        const dy = y - this.dragStartY;

        switch (this.activeHandle) {
            case 'move':
                this.translateX += dx;
                this.translateY += dy;
                break;

            case 'rotate':
                this.handleRotate(x, y);
                break;

            case 'nw':
                this.handleScale(dx, dy, 'nw');
                break;
            case 'ne':
                this.handleScale(dx, dy, 'ne');
                break;
            case 'sw':
                this.handleScale(dx, dy, 'sw');
                break;
            case 'se':
                this.handleScale(dx, dy, 'se');
                break;
            case 'n':
                this.handleScale(0, dy, 'n');
                break;
            case 's':
                this.handleScale(0, dy, 's');
                break;
            case 'w':
                this.handleScale(dx, 0, 'w');
                break;
            case 'e':
                this.handleScale(dx, 0, 'e');
                break;
        }

        this.dragStartX = x;
        this.dragStartY = y;

        this.updateHandles();
        this.drawTransformPreview();
    }

    onEnd(x, y) {
        this.activeHandle = null;
    }

    /**
     * Handle rotation
     */
    handleRotate(x, y) {
        const b = this.getTransformedBounds();
        const centerX = b.x + b.width / 2;
        const centerY = b.y + b.height / 2;

        const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI) + 90;
        this.rotation = angle;
    }

    /**
     * Handle scaling
     */
    handleScale(dx, dy, handle) {
        const scaleFactorX = dx / this.originalBounds.width;
        const scaleFactorY = dy / this.originalBounds.height;

        switch (handle) {
            case 'se':
                this.scaleX += scaleFactorX;
                this.scaleY += scaleFactorY;
                break;
            case 'sw':
                this.scaleX -= scaleFactorX;
                this.scaleY += scaleFactorY;
                this.translateX += dx;
                break;
            case 'ne':
                this.scaleX += scaleFactorX;
                this.scaleY -= scaleFactorY;
                this.translateY += dy;
                break;
            case 'nw':
                this.scaleX -= scaleFactorX;
                this.scaleY -= scaleFactorY;
                this.translateX += dx;
                this.translateY += dy;
                break;
            case 'e':
                this.scaleX += scaleFactorX;
                break;
            case 'w':
                this.scaleX -= scaleFactorX;
                this.translateX += dx;
                break;
            case 's':
                this.scaleY += scaleFactorY;
                break;
            case 'n':
                this.scaleY -= scaleFactorY;
                this.translateY += dy;
                break;
        }

        // Prevent zero or negative scale
        this.scaleX = Math.max(0.01, this.scaleX);
        this.scaleY = Math.max(0.01, this.scaleY);
    }

    /**
     * Get handle at position
     */
    getHandleAt(x, y) {
        const hitRadius = 10;

        for (const [name, pos] of Object.entries(this.handles)) {
            if (pos && Math.abs(x - pos.x) < hitRadius && Math.abs(y - pos.y) < hitRadius) {
                return name;
            }
        }
        return null;
    }

    /**
     * Draw transform preview
     */
    drawTransformPreview() {
        const previewCtx = this.app.canvas.getPreviewContext();
        if (!previewCtx || !this.isTransforming) return;

        previewCtx.clearRect(0, 0, this.app.canvas.width, this.app.canvas.height);

        // Draw transformed content
        const b = this.getTransformedBounds();
        const centerX = b.x + b.width / 2;
        const centerY = b.y + b.height / 2;

        previewCtx.save();
        previewCtx.translate(centerX, centerY);
        previewCtx.rotate(this.rotation * Math.PI / 180);
        previewCtx.scale(this.scaleX, this.scaleY);
        previewCtx.translate(-this.originalBounds.width / 2 - this.originalBounds.x, -this.originalBounds.height / 2 - this.originalBounds.y);
        previewCtx.drawImage(this.transformedCanvas, 0, 0);
        previewCtx.restore();

        // Draw bounding box
        this.drawBoundingBox(previewCtx, b);

        // Draw handles
        this.drawHandles(previewCtx);
    }

    /**
     * Draw bounding box
     */
    drawBoundingBox(ctx, bounds) {
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    /**
     * Draw transform handles
     */
    drawHandles(ctx) {
        const size = 8;

        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;

        for (const [name, pos] of Object.entries(this.handles)) {
            if (!pos) continue;

            if (name === 'rotate') {
                // Rotation handle
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Line to top center
                const b = this.getTransformedBounds();
                ctx.beginPath();
                ctx.moveTo(b.x + b.width / 2, b.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.strokeStyle = '#8b5cf6';
                ctx.stroke();
            } else {
                // Scale handles
                ctx.fillRect(pos.x - size / 2, pos.y - size / 2, size, size);
                ctx.strokeRect(pos.x - size / 2, pos.y - size / 2, size, size);
            }
        }
    }

    /**
     * Apply transform to layer
     */
    applyTransform() {
        if (!this.isTransforming) return;

        const layer = this.app.layers.getActiveLayer();
        if (!layer) return;

        const ctx = layer.canvas.getContext('2d');
        ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);

        const b = this.getTransformedBounds();
        const centerX = b.x + b.width / 2;
        const centerY = b.y + b.height / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.scale(this.scaleX, this.scaleY);
        ctx.translate(-this.originalBounds.width / 2 - this.originalBounds.x, -this.originalBounds.height / 2 - this.originalBounds.y);
        ctx.drawImage(this.transformedCanvas, 0, 0);
        ctx.restore();

        this.isTransforming = false;
        this.originalImageData = null;
        this.transformedCanvas = null;
        this.clearPreview();

        this.app.canvas.render();
    }

    /**
     * Cancel transform
     */
    cancelTransform() {
        if (!this.isTransforming) return;

        // Restore original
        const layer = this.app.layers.getActiveLayer();
        if (layer && this.originalImageData) {
            const ctx = layer.canvas.getContext('2d');
            ctx.putImageData(this.originalImageData, 0, 0);
        }

        this.isTransforming = false;
        this.originalImageData = null;
        this.transformedCanvas = null;
        this.clearPreview();

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
     * Rotate by specific angle
     */
    rotate(degrees) {
        this.rotation += degrees;
        this.updateHandles();
        this.drawTransformPreview();
    }

    /**
     * Flip horizontally
     */
    flipHorizontal() {
        this.scaleX *= -1;
        this.updateHandles();
        this.drawTransformPreview();
    }

    /**
     * Flip vertically
     */
    flipVertical() {
        this.scaleY *= -1;
        this.updateHandles();
        this.drawTransformPreview();
    }
}
