/**
 * LineTool - Draw straight lines
 * Supports pixel-perfect lines in Pixel Art mode using Bresenham's algorithm
 */

export class LineTool {
    constructor(app) {
        this.app = app;
        this.name = 'line';
        this.displayName = 'Čára';
        this.startX = 0;
        this.startY = 0;
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
            this.drawPixelArtLinePreview(ctx, this.startX, this.startY, x, y);
        } else {
            this.drawNormalLinePreview(ctx, this.startX, this.startY, x, y);
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
            this.drawPixelArtLine(ctx, this.startX, this.startY, x, y);
        } else {
            this.drawNormalLine(ctx, this.startX, this.startY, x, y);
        }

        this.app.canvas.render();
    }

    /**
     * Draw normal anti-aliased line preview
     */
    drawNormalLinePreview(ctx, x1, y1, x2, y2) {
        ctx.strokeStyle = this.app.color.getPrimaryColor();
        ctx.lineWidth = this.app.brush.size;
        ctx.lineCap = 'round';
        ctx.globalAlpha = this.app.brush.opacity;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    /**
     * Draw normal anti-aliased line on layer
     */
    drawNormalLine(ctx, x1, y1, x2, y2) {
        ctx.strokeStyle = this.app.color.getPrimaryColor();
        ctx.lineWidth = this.app.brush.size;
        ctx.lineCap = 'round';
        ctx.globalAlpha = this.app.brush.opacity;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.globalAlpha = 1;
    }

    /**
     * Draw pixel-perfect line preview using Bresenham's algorithm
     */
    drawPixelArtLinePreview(ctx, x1, y1, x2, y2) {
        const color = this.app.color.getPrimaryColor();
        const gridSize = this.app.pixelArt.grid.size;
        const points = this.bresenhamLine(x1, y1, x2, y2, gridSize);

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = this.app.brush.opacity;
        ctx.fillStyle = color;

        for (const point of points) {
            ctx.fillRect(point.x, point.y, gridSize, gridSize);
        }

        ctx.restore();
    }

    /**
     * Draw pixel-perfect line on layer using Bresenham's algorithm
     */
    drawPixelArtLine(ctx, x1, y1, x2, y2) {
        const color = this.app.color.getPrimaryColor();
        const gridSize = this.app.pixelArt.grid.size;
        const points = this.bresenhamLine(x1, y1, x2, y2, gridSize);

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = this.app.brush.opacity;
        ctx.fillStyle = color;

        for (const point of points) {
            ctx.fillRect(point.x, point.y, gridSize, gridSize);
        }

        ctx.restore();
        ctx.globalAlpha = 1;
    }

    /**
     * Bresenham's line algorithm for pixel-perfect lines
     * Works with grid cells instead of individual pixels
     */
    bresenhamLine(x1, y1, x2, y2, gridSize) {
        const points = [];

        // Convert to grid coordinates
        let gx1 = Math.floor(x1 / gridSize);
        let gy1 = Math.floor(y1 / gridSize);
        const gx2 = Math.floor(x2 / gridSize);
        const gy2 = Math.floor(y2 / gridSize);

        const dx = Math.abs(gx2 - gx1);
        const dy = Math.abs(gy2 - gy1);
        const sx = gx1 < gx2 ? 1 : -1;
        const sy = gy1 < gy2 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            // Add point in canvas coordinates
            points.push({
                x: gx1 * gridSize,
                y: gy1 * gridSize
            });

            if (gx1 === gx2 && gy1 === gy2) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                gx1 += sx;
            }
            if (e2 < dx) {
                err += dx;
                gy1 += sy;
            }
        }

        return points;
    }
}
