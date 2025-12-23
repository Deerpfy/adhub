/**
 * LineTool - Draw straight lines
 * Supports pixel-perfect lines in Pixel Art mode using Bresenham's algorithm
 * Supports Shift constraint for 0°, 45°, 90° angles
 * Supports snapping to guides, corners, halves
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
        // Apply snapping to start point
        const snapped = this.applySnapping(x, y);
        this.startX = snapped.x;
        this.startY = snapped.y;
    }

    onMove(x, y, pressure) {
        const ctx = this.app.canvas.getPreviewContext();
        ctx.clearRect(0, 0, this.app.canvas.width, this.app.canvas.height);

        // Apply snapping and constraints
        let endX = x;
        let endY = y;

        // Apply Shift constraint for angle locking
        if (this.app.canvas.modifiers?.shift) {
            const constrained = this.constrainAngle(this.startX, this.startY, x, y);
            endX = constrained.x;
            endY = constrained.y;
        } else {
            // Apply snapping to end point
            const snapped = this.applySnapping(x, y);
            endX = snapped.x;
            endY = snapped.y;
        }

        // Check if pixel art mode is enabled
        if (this.app.pixelArt?.enabled) {
            this.drawPixelArtLinePreview(ctx, this.startX, this.startY, endX, endY);
        } else {
            this.drawNormalLinePreview(ctx, this.startX, this.startY, endX, endY);
        }
    }

    onEnd(x, y) {
        // Clear preview
        this.app.canvas.clearPreview();

        // Apply snapping and constraints
        let endX = x;
        let endY = y;

        // Apply Shift constraint for angle locking
        if (this.app.canvas.modifiers?.shift) {
            const constrained = this.constrainAngle(this.startX, this.startY, x, y);
            endX = constrained.x;
            endY = constrained.y;
        } else {
            // Apply snapping to end point
            const snapped = this.applySnapping(x, y);
            endX = snapped.x;
            endY = snapped.y;
        }

        // Draw on active layer
        const ctx = this.app.layers.getActiveContext();
        if (!ctx) return;

        // Check if pixel art mode is enabled
        if (this.app.pixelArt?.enabled) {
            this.drawPixelArtLine(ctx, this.startX, this.startY, endX, endY);
        } else {
            this.drawNormalLine(ctx, this.startX, this.startY, endX, endY);
        }

        this.app.canvas.render();
    }

    /**
     * Apply snapping to coordinates
     */
    applySnapping(x, y) {
        if (this.app.rulerGuide?.snapping?.enabled) {
            return this.app.rulerGuide.snap(x, y);
        }
        return { x, y };
    }

    /**
     * Constrain line to specific angles (0°, 45°, 90°, 135°, 180°, etc.)
     * Used when Shift is held during drawing
     */
    constrainAngle(startX, startY, endX, endY) {
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
            return { x: endX, y: endY };
        }

        // Calculate angle in degrees
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;

        // Snap to nearest 45 degree increment
        const snapAngle = Math.round(angle / 45) * 45;
        const snapRad = snapAngle * Math.PI / 180;

        return {
            x: startX + distance * Math.cos(snapRad),
            y: startY + distance * Math.sin(snapRad)
        };
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
