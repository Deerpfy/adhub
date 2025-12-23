/**
 * EllipseTool - Draw ellipses/circles
 * Supports pixel-perfect ellipses in Pixel Art mode using Midpoint algorithm
 * Supports Shift constraint for perfect circles
 * Supports snapping to guides, corners, halves
 */

export class EllipseTool {
    constructor(app) {
        this.app = app;
        this.name = 'ellipse';
        this.displayName = 'Elipsa';
        this.startX = 0;
        this.startY = 0;
        this.filled = false;
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

        // Apply Shift constraint for perfect circle
        if (this.app.canvas.modifiers?.shift) {
            const constrained = this.constrainCircle(this.startX, this.startY, x, y);
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
            this.drawPixelArtEllipsePreview(ctx, this.startX, this.startY, endX, endY);
        } else {
            this.drawNormalEllipsePreview(ctx, this.startX, this.startY, endX, endY);
        }
    }

    onEnd(x, y) {
        // Clear preview
        this.app.canvas.clearPreview();

        // Apply snapping and constraints
        let endX = x;
        let endY = y;

        // Apply Shift constraint for perfect circle
        if (this.app.canvas.modifiers?.shift) {
            const constrained = this.constrainCircle(this.startX, this.startY, x, y);
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
            this.drawPixelArtEllipse(ctx, this.startX, this.startY, endX, endY);
        } else {
            this.drawNormalEllipse(ctx, this.startX, this.startY, endX, endY);
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
     * Constrain ellipse to perfect circle
     * Used when Shift is held during drawing
     */
    constrainCircle(startX, startY, endX, endY) {
        const dx = endX - startX;
        const dy = endY - startY;
        const size = Math.max(Math.abs(dx), Math.abs(dy));

        return {
            x: startX + Math.sign(dx) * size,
            y: startY + Math.sign(dy) * size
        };
    }

    /**
     * Draw normal anti-aliased ellipse preview
     */
    drawNormalEllipsePreview(ctx, x1, y1, x2, y2) {
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const radiusX = Math.abs(x2 - x1) / 2;
        const radiusY = Math.abs(y2 - y1) / 2;

        ctx.strokeStyle = this.app.color.getPrimaryColor();
        ctx.fillStyle = this.app.color.getPrimaryColor();
        ctx.lineWidth = this.app.brush.size;
        ctx.globalAlpha = this.app.brush.opacity;

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);

        if (this.filled) {
            ctx.fill();
        } else {
            ctx.stroke();
        }
    }

    /**
     * Draw normal anti-aliased ellipse on layer
     */
    drawNormalEllipse(ctx, x1, y1, x2, y2) {
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const radiusX = Math.abs(x2 - x1) / 2;
        const radiusY = Math.abs(y2 - y1) / 2;

        ctx.strokeStyle = this.app.color.getPrimaryColor();
        ctx.fillStyle = this.app.color.getPrimaryColor();
        ctx.lineWidth = this.app.brush.size;
        ctx.globalAlpha = this.app.brush.opacity;

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);

        if (this.filled) {
            ctx.fill();
        } else {
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    /**
     * Draw pixel-perfect ellipse preview
     */
    drawPixelArtEllipsePreview(ctx, x1, y1, x2, y2) {
        const color = this.app.color.getPrimaryColor();
        const gridSize = this.app.pixelArt.grid.size;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = this.app.brush.opacity;
        ctx.fillStyle = color;

        const points = this.midpointEllipse(x1, y1, x2, y2, gridSize);

        if (this.filled) {
            this.fillEllipsePoints(ctx, points, gridSize);
        } else {
            for (const point of points) {
                ctx.fillRect(point.x, point.y, gridSize, gridSize);
            }
        }

        ctx.restore();
    }

    /**
     * Draw pixel-perfect ellipse on layer
     */
    drawPixelArtEllipse(ctx, x1, y1, x2, y2) {
        const color = this.app.color.getPrimaryColor();
        const gridSize = this.app.pixelArt.grid.size;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = this.app.brush.opacity;
        ctx.fillStyle = color;

        const points = this.midpointEllipse(x1, y1, x2, y2, gridSize);

        if (this.filled) {
            this.fillEllipsePoints(ctx, points, gridSize);
        } else {
            for (const point of points) {
                ctx.fillRect(point.x, point.y, gridSize, gridSize);
            }
        }

        ctx.restore();
        ctx.globalAlpha = 1;
    }

    /**
     * Midpoint ellipse algorithm for pixel-perfect ellipses
     */
    midpointEllipse(x1, y1, x2, y2, gridSize) {
        const points = [];

        // Calculate center and radii in grid coordinates
        const gx1 = Math.floor(Math.min(x1, x2) / gridSize);
        const gy1 = Math.floor(Math.min(y1, y2) / gridSize);
        const gx2 = Math.floor(Math.max(x1, x2) / gridSize);
        const gy2 = Math.floor(Math.max(y1, y2) / gridSize);

        const cx = Math.floor((gx1 + gx2) / 2);
        const cy = Math.floor((gy1 + gy2) / 2);
        const rx = Math.floor((gx2 - gx1) / 2);
        const ry = Math.floor((gy2 - gy1) / 2);

        if (rx <= 0 || ry <= 0) {
            // Too small, just draw a single cell
            points.push({ x: cx * gridSize, y: cy * gridSize });
            return points;
        }

        // Midpoint ellipse algorithm
        const rxSq = rx * rx;
        const rySq = ry * ry;
        const twoRxSq = 2 * rxSq;
        const twoRySq = 2 * rySq;

        let x = 0;
        let y = ry;
        let px = 0;
        let py = twoRxSq * y;

        // Plot initial points
        this.plotEllipsePoints(points, cx, cy, x, y, gridSize);

        // Region 1
        let p = Math.round(rySq - (rxSq * ry) + (0.25 * rxSq));
        while (px < py) {
            x++;
            px += twoRySq;
            if (p < 0) {
                p += rySq + px;
            } else {
                y--;
                py -= twoRxSq;
                p += rySq + px - py;
            }
            this.plotEllipsePoints(points, cx, cy, x, y, gridSize);
        }

        // Region 2
        p = Math.round(rySq * (x + 0.5) * (x + 0.5) + rxSq * (y - 1) * (y - 1) - rxSq * rySq);
        while (y > 0) {
            y--;
            py -= twoRxSq;
            if (p > 0) {
                p += rxSq - py;
            } else {
                x++;
                px += twoRySq;
                p += rxSq - py + px;
            }
            this.plotEllipsePoints(points, cx, cy, x, y, gridSize);
        }

        return points;
    }

    /**
     * Plot symmetric ellipse points in all four quadrants
     */
    plotEllipsePoints(points, cx, cy, x, y, gridSize) {
        points.push({ x: (cx + x) * gridSize, y: (cy + y) * gridSize });
        points.push({ x: (cx - x) * gridSize, y: (cy + y) * gridSize });
        points.push({ x: (cx + x) * gridSize, y: (cy - y) * gridSize });
        points.push({ x: (cx - x) * gridSize, y: (cy - y) * gridSize });
    }

    /**
     * Fill ellipse by drawing horizontal lines between outline points
     */
    fillEllipsePoints(ctx, points, gridSize) {
        // Group points by Y coordinate
        const rowMap = new Map();

        for (const point of points) {
            const y = point.y;
            if (!rowMap.has(y)) {
                rowMap.set(y, { minX: point.x, maxX: point.x });
            } else {
                const row = rowMap.get(y);
                row.minX = Math.min(row.minX, point.x);
                row.maxX = Math.max(row.maxX, point.x);
            }
        }

        // Fill each row
        for (const [y, row] of rowMap) {
            const width = row.maxX - row.minX + gridSize;
            ctx.fillRect(row.minX, y, width, gridSize);
        }
    }
}
