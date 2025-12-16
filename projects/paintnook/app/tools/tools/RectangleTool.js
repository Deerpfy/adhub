/**
 * RectangleTool - Draw rectangles
 * Supports pixel-perfect rectangles in Pixel Art mode
 */

export class RectangleTool {
    constructor(app) {
        this.app = app;
        this.name = 'rectangle';
        this.displayName = 'Obdélník';
        this.startX = 0;
        this.startY = 0;
        this.filled = false; // Shift for filled
    }

    activate() {}
    deactivate() {}

    onStart(x, y) {
        this.startX = x;
        this.startY = y;
    }

    onMove(x, y, pressure) {
        const ctx = this.app.canvas.getPreviewContext();
        ctx.clearRect(0, 0, this.app.canvas.width, this.app.canvas.height);

        // Check if pixel art mode is enabled
        if (this.app.pixelArt?.enabled) {
            this.drawPixelArtRectPreview(ctx, this.startX, this.startY, x, y);
        } else {
            this.drawNormalRectPreview(ctx, this.startX, this.startY, x, y);
        }
    }

    onEnd(x, y) {
        // Clear preview
        this.app.canvas.clearPreview();

        // Draw on active layer
        const ctx = this.app.layers.getActiveContext();
        if (!ctx) return;

        // Check if pixel art mode is enabled
        if (this.app.pixelArt?.enabled) {
            this.drawPixelArtRect(ctx, this.startX, this.startY, x, y);
        } else {
            this.drawNormalRect(ctx, this.startX, this.startY, x, y);
        }

        this.app.canvas.render();
    }

    /**
     * Draw normal anti-aliased rectangle preview
     */
    drawNormalRectPreview(ctx, x1, y1, x2, y2) {
        const width = x2 - x1;
        const height = y2 - y1;

        ctx.strokeStyle = this.app.color.getPrimaryColor();
        ctx.fillStyle = this.app.color.getPrimaryColor();
        ctx.lineWidth = this.app.brush.size;
        ctx.globalAlpha = this.app.brush.opacity;

        if (this.filled) {
            ctx.fillRect(x1, y1, width, height);
        } else {
            ctx.strokeRect(x1, y1, width, height);
        }
    }

    /**
     * Draw normal anti-aliased rectangle on layer
     */
    drawNormalRect(ctx, x1, y1, x2, y2) {
        const width = x2 - x1;
        const height = y2 - y1;

        ctx.strokeStyle = this.app.color.getPrimaryColor();
        ctx.fillStyle = this.app.color.getPrimaryColor();
        ctx.lineWidth = this.app.brush.size;
        ctx.globalAlpha = this.app.brush.opacity;

        if (this.filled) {
            ctx.fillRect(x1, y1, width, height);
        } else {
            ctx.strokeRect(x1, y1, width, height);
        }

        ctx.globalAlpha = 1;
    }

    /**
     * Draw pixel-perfect rectangle preview
     */
    drawPixelArtRectPreview(ctx, x1, y1, x2, y2) {
        const color = this.app.color.getPrimaryColor();
        const gridSize = this.app.pixelArt.grid.size;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = this.app.brush.opacity;
        ctx.fillStyle = color;

        if (this.filled) {
            this.drawFilledPixelRect(ctx, x1, y1, x2, y2, gridSize);
        } else {
            this.drawStrokedPixelRect(ctx, x1, y1, x2, y2, gridSize);
        }

        ctx.restore();
    }

    /**
     * Draw pixel-perfect rectangle on layer
     */
    drawPixelArtRect(ctx, x1, y1, x2, y2) {
        const color = this.app.color.getPrimaryColor();
        const gridSize = this.app.pixelArt.grid.size;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = this.app.brush.opacity;
        ctx.fillStyle = color;

        if (this.filled) {
            this.drawFilledPixelRect(ctx, x1, y1, x2, y2, gridSize);
        } else {
            this.drawStrokedPixelRect(ctx, x1, y1, x2, y2, gridSize);
        }

        ctx.restore();
        ctx.globalAlpha = 1;
    }

    /**
     * Draw filled pixel-perfect rectangle
     */
    drawFilledPixelRect(ctx, x1, y1, x2, y2, gridSize) {
        // Snap to grid and normalize coordinates
        const gx1 = Math.floor(Math.min(x1, x2) / gridSize) * gridSize;
        const gy1 = Math.floor(Math.min(y1, y2) / gridSize) * gridSize;
        const gx2 = Math.floor(Math.max(x1, x2) / gridSize) * gridSize + gridSize;
        const gy2 = Math.floor(Math.max(y1, y2) / gridSize) * gridSize + gridSize;

        // Fill entire area
        ctx.fillRect(gx1, gy1, gx2 - gx1, gy2 - gy1);
    }

    /**
     * Draw stroked pixel-perfect rectangle (outline only)
     */
    drawStrokedPixelRect(ctx, x1, y1, x2, y2, gridSize) {
        // Snap to grid and normalize coordinates
        const gx1 = Math.floor(Math.min(x1, x2) / gridSize);
        const gy1 = Math.floor(Math.min(y1, y2) / gridSize);
        const gx2 = Math.floor(Math.max(x1, x2) / gridSize);
        const gy2 = Math.floor(Math.max(y1, y2) / gridSize);

        // Draw top edge
        for (let x = gx1; x <= gx2; x++) {
            ctx.fillRect(x * gridSize, gy1 * gridSize, gridSize, gridSize);
        }

        // Draw bottom edge
        for (let x = gx1; x <= gx2; x++) {
            ctx.fillRect(x * gridSize, gy2 * gridSize, gridSize, gridSize);
        }

        // Draw left edge (excluding corners already drawn)
        for (let y = gy1 + 1; y < gy2; y++) {
            ctx.fillRect(gx1 * gridSize, y * gridSize, gridSize, gridSize);
        }

        // Draw right edge (excluding corners already drawn)
        for (let y = gy1 + 1; y < gy2; y++) {
            ctx.fillRect(gx2 * gridSize, y * gridSize, gridSize, gridSize);
        }
    }
}
