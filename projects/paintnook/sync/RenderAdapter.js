/**
 * RenderAdapter - View-mode aware rendering of UAF actions
 *
 * This is the KEY component for solving the cross-mode rendering problem.
 * It renders the same UAF action differently based on the local view mode,
 * ensuring that both digital and pixel art modes produce semantically
 * equivalent visual output.
 *
 * View modes:
 * - 'digital': Smooth strokes with pressure sensitivity and brush stamps
 * - 'pixel_art': Grid-snapped discrete pixels using Bresenham algorithms
 * - 'vector': Bezier curves for smooth scalable output
 */

import { ActionTypes, colorToString, colorToHex } from './types.js';

export class RenderAdapter {
    /**
     * Create a new RenderAdapter
     * @param {string} viewMode - View mode ('digital', 'pixel_art', 'vector')
     * @param {number} canvasWidth - Canvas width in pixels
     * @param {number} canvasHeight - Canvas height in pixels
     * @param {Object} options - Additional options
     */
    constructor(viewMode, canvasWidth, canvasHeight, options = {}) {
        this.viewMode = viewMode;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        // Pixel art options
        this.pixelSize = options.pixelSize || 1;
        this.gridSize = options.gridSize || 1;
        this.snapToGrid = options.snapToGrid ?? true;
        this.palette = options.palette || null;

        // Digital mode options
        this.pressureSensitivity = options.pressureSensitivity ?? true;

        // Brush stamp cache for digital mode
        this.brushStampCache = new Map();
    }

    /**
     * Update canvas dimensions
     * @param {number} width - New width
     * @param {number} height - New height
     */
    setCanvasSize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }

    /**
     * Update view mode
     * @param {string} mode - New view mode
     * @param {Object} options - New options
     */
    setViewMode(mode, options = {}) {
        this.viewMode = mode;
        if (options.pixelSize !== undefined) this.pixelSize = options.pixelSize;
        if (options.gridSize !== undefined) this.gridSize = options.gridSize;
        if (options.snapToGrid !== undefined) this.snapToGrid = options.snapToGrid;
        if (options.palette !== undefined) this.palette = options.palette;
    }

    /**
     * Render a UAF action to the given context
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} action - UAF action to render
     */
    render(ctx, action) {
        switch (action.type) {
            case ActionTypes.STROKE:
                return this.renderStroke(ctx, action.data);
            case ActionTypes.SHAPE:
                return this.renderShape(ctx, action.data);
            case ActionTypes.FILL:
                return this.renderFill(ctx, action.data);
            case ActionTypes.ERASE:
                return this.renderErase(ctx, action.data);
            default:
                console.warn('[RenderAdapter] Unknown action type:', action.type);
        }
    }

    /**
     * Render a stroke action
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} data - Stroke data
     */
    renderStroke(ctx, data) {
        const points = this.denormalizePoints(data.points);

        switch (this.viewMode) {
            case 'digital':
                return this.renderDigitalStroke(ctx, points, data);
            case 'pixel_art':
                return this.renderPixelStroke(ctx, points, data);
            case 'vector':
                return this.renderVectorStroke(ctx, points, data);
            default:
                return this.renderDigitalStroke(ctx, points, data);
        }
    }

    /**
     * Render stroke in digital mode - smooth strokes with pressure
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array} points - Denormalized points
     * @param {Object} data - Stroke data
     */
    renderDigitalStroke(ctx, points, data) {
        if (points.length < 1) return;

        const brushSize = data.brushSize * this.canvasWidth;
        const color = colorToString(data.color);

        ctx.save();
        ctx.globalAlpha = data.opacity ?? 1;
        ctx.globalCompositeOperation = data.blendMode || 'source-over';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;
        ctx.fillStyle = color;

        if (points.length === 1) {
            // Single point - draw circle
            const p = points[0];
            const size = this.pressureSensitivity ? brushSize * p.pressure : brushSize;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Multiple points - draw stroke segments
            for (let i = 1; i < points.length; i++) {
                const prev = points[i - 1];
                const curr = points[i];
                const pressure = this.pressureSensitivity
                    ? (prev.pressure + curr.pressure) / 2
                    : 1;

                ctx.lineWidth = brushSize * pressure;
                ctx.beginPath();
                ctx.moveTo(prev.x, prev.y);
                ctx.lineTo(curr.x, curr.y);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    /**
     * Render stroke in pixel art mode - discrete pixels with Bresenham
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array} points - Denormalized points
     * @param {Object} data - Stroke data
     */
    renderPixelStroke(ctx, points, data) {
        if (points.length < 1) return;

        const brushSize = Math.max(1, Math.round(data.brushSize * this.canvasWidth / this.pixelSize));
        let color = data.color;

        // Snap color to palette if available
        if (this.palette && this.palette.length > 0) {
            color = this.findNearestPaletteColor(color);
        }

        ctx.save();
        ctx.globalAlpha = data.opacity ?? 1;
        ctx.globalCompositeOperation = data.blendMode || 'source-over';
        ctx.fillStyle = colorToString(color);
        ctx.imageSmoothingEnabled = false;

        const drawnPixels = new Set();

        // Draw first point
        if (points.length === 1) {
            const p = points[0];
            this.drawPixelPoint(ctx, p.x, p.y, brushSize, drawnPixels);
        } else {
            // Draw lines between consecutive points using Bresenham
            for (let i = 1; i < points.length; i++) {
                const x0 = this.snapToPixelGrid(points[i - 1].x);
                const y0 = this.snapToPixelGrid(points[i - 1].y);
                const x1 = this.snapToPixelGrid(points[i].x);
                const y1 = this.snapToPixelGrid(points[i].y);

                this.bresenhamLine(x0, y0, x1, y1, (px, py) => {
                    this.drawPixelBrush(ctx, px, py, brushSize, drawnPixels);
                });
            }
        }

        ctx.restore();
    }

    /**
     * Draw a pixel brush at the given grid position
     */
    drawPixelBrush(ctx, gridX, gridY, brushSize, drawnPixels) {
        const halfSize = Math.floor(brushSize / 2);

        for (let bx = 0; bx < brushSize; bx++) {
            for (let by = 0; by < brushSize; by++) {
                const pixelX = gridX - halfSize + bx;
                const pixelY = gridY - halfSize + by;
                const key = `${pixelX}:${pixelY}`;

                if (!drawnPixels.has(key)) {
                    drawnPixels.add(key);
                    ctx.fillRect(
                        pixelX * this.pixelSize,
                        pixelY * this.pixelSize,
                        this.pixelSize,
                        this.pixelSize
                    );
                }
            }
        }
    }

    /**
     * Draw a single pixel point
     */
    drawPixelPoint(ctx, x, y, brushSize, drawnPixels) {
        const gridX = this.snapToPixelGrid(x);
        const gridY = this.snapToPixelGrid(y);
        this.drawPixelBrush(ctx, gridX, gridY, brushSize, drawnPixels);
    }

    /**
     * Render stroke in vector mode - smooth bezier curves
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array} points - Denormalized points
     * @param {Object} data - Stroke data
     */
    renderVectorStroke(ctx, points, data) {
        if (points.length < 2) {
            // Fall back to digital for single points
            return this.renderDigitalStroke(ctx, points, data);
        }

        const brushSize = data.brushSize * this.canvasWidth;
        const color = colorToString(data.color);

        ctx.save();
        ctx.globalAlpha = data.opacity ?? 1;
        ctx.globalCompositeOperation = data.blendMode || 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        // Use quadratic curves for smoothing
        for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }

        // Connect to the last point
        if (points.length > 1) {
            const last = points[points.length - 1];
            ctx.lineTo(last.x, last.y);
        }

        ctx.stroke();
        ctx.restore();
    }

    /**
     * Render a shape action
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} data - Shape data
     */
    renderShape(ctx, data) {
        const bounds = {
            x: data.bounds.x * this.canvasWidth,
            y: data.bounds.y * this.canvasHeight,
            width: data.bounds.width * this.canvasWidth,
            height: data.bounds.height * this.canvasHeight
        };
        const strokeWidth = data.strokeWidth * this.canvasWidth;

        ctx.save();

        if (this.viewMode === 'pixel_art') {
            ctx.imageSmoothingEnabled = false;
            this.renderPixelShape(ctx, data.shapeType, bounds, data, strokeWidth);
        } else {
            this.renderDigitalShape(ctx, data.shapeType, bounds, data, strokeWidth);
        }

        ctx.restore();
    }

    /**
     * Render shape in digital mode
     */
    renderDigitalShape(ctx, shapeType, bounds, data, strokeWidth) {
        ctx.beginPath();

        switch (shapeType) {
            case 'line':
                ctx.moveTo(bounds.x, bounds.y);
                ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height);
                break;
            case 'rectangle':
                ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
                break;
            case 'ellipse':
                ctx.ellipse(
                    bounds.x + bounds.width / 2,
                    bounds.y + bounds.height / 2,
                    Math.abs(bounds.width) / 2,
                    Math.abs(bounds.height) / 2,
                    0, 0, Math.PI * 2
                );
                break;
        }

        if (data.fill) {
            ctx.fillStyle = colorToString(data.fill);
            ctx.fill();
        }
        if (data.stroke) {
            ctx.strokeStyle = colorToString(data.stroke);
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
        }
    }

    /**
     * Render shape in pixel art mode
     */
    renderPixelShape(ctx, shapeType, bounds, data, strokeWidth) {
        const x1 = Math.floor(bounds.x / this.pixelSize);
        const y1 = Math.floor(bounds.y / this.pixelSize);
        const x2 = Math.floor((bounds.x + bounds.width) / this.pixelSize);
        const y2 = Math.floor((bounds.y + bounds.height) / this.pixelSize);

        const drawnPixels = new Set();

        if (data.stroke) {
            ctx.fillStyle = colorToString(this.palette ? this.findNearestPaletteColor(data.stroke) : data.stroke);

            switch (shapeType) {
                case 'line':
                    this.bresenhamLine(x1, y1, x2, y2, (px, py) => {
                        this.drawPixelPoint(ctx, px * this.pixelSize, py * this.pixelSize, 1, drawnPixels);
                    });
                    break;
                case 'rectangle':
                    // Top and bottom edges
                    for (let x = x1; x <= x2; x++) {
                        ctx.fillRect(x * this.pixelSize, y1 * this.pixelSize, this.pixelSize, this.pixelSize);
                        ctx.fillRect(x * this.pixelSize, y2 * this.pixelSize, this.pixelSize, this.pixelSize);
                    }
                    // Left and right edges
                    for (let y = y1; y <= y2; y++) {
                        ctx.fillRect(x1 * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
                        ctx.fillRect(x2 * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
                    }
                    break;
                case 'ellipse':
                    const cx = (x1 + x2) / 2;
                    const cy = (y1 + y2) / 2;
                    const rx = Math.abs(x2 - x1) / 2;
                    const ry = Math.abs(y2 - y1) / 2;
                    this.midpointEllipse(Math.round(cx), Math.round(cy), Math.round(rx), Math.round(ry), false, (px, py) => {
                        ctx.fillRect(px * this.pixelSize, py * this.pixelSize, this.pixelSize, this.pixelSize);
                    });
                    break;
            }
        }

        if (data.fill && data.filled) {
            ctx.fillStyle = colorToString(this.palette ? this.findNearestPaletteColor(data.fill) : data.fill);

            switch (shapeType) {
                case 'rectangle':
                    for (let x = x1 + 1; x < x2; x++) {
                        for (let y = y1 + 1; y < y2; y++) {
                            ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
                        }
                    }
                    break;
                case 'ellipse':
                    const cx = (x1 + x2) / 2;
                    const cy = (y1 + y2) / 2;
                    const rx = Math.abs(x2 - x1) / 2;
                    const ry = Math.abs(y2 - y1) / 2;
                    this.midpointEllipse(Math.round(cx), Math.round(cy), Math.round(rx), Math.round(ry), true, (px, py) => {
                        ctx.fillRect(px * this.pixelSize, py * this.pixelSize, this.pixelSize, this.pixelSize);
                    });
                    break;
            }
        }
    }

    /**
     * Render a fill action
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} data - Fill data
     */
    renderFill(ctx, data) {
        const x = Math.floor(data.point.x * this.canvasWidth);
        const y = Math.floor(data.point.y * this.canvasHeight);
        let color = data.color;

        if (this.viewMode === 'pixel_art' && this.palette && this.palette.length > 0) {
            color = this.findNearestPaletteColor(color);
        }

        // Get current image data
        const imageData = ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);

        // Perform flood fill
        this.floodFill(imageData, x, y, color, data.tolerance || 0);

        // Put back
        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Render an erase action
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} data - Erase data
     */
    renderErase(ctx, data) {
        const points = this.denormalizePoints(data.points);
        const size = data.size * this.canvasWidth;

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';

        if (this.viewMode === 'pixel_art') {
            ctx.imageSmoothingEnabled = false;
            const pixelSize = Math.max(1, Math.round(size / this.pixelSize));
            const drawnPixels = new Set();

            for (let i = 1; i < points.length; i++) {
                const x0 = this.snapToPixelGrid(points[i - 1].x);
                const y0 = this.snapToPixelGrid(points[i - 1].y);
                const x1 = this.snapToPixelGrid(points[i].x);
                const y1 = this.snapToPixelGrid(points[i].y);

                this.bresenhamLine(x0, y0, x1, y1, (px, py) => {
                    const key = `${px}:${py}`;
                    if (!drawnPixels.has(key)) {
                        drawnPixels.add(key);
                        ctx.clearRect(
                            (px - Math.floor(pixelSize / 2)) * this.pixelSize,
                            (py - Math.floor(pixelSize / 2)) * this.pixelSize,
                            pixelSize * this.pixelSize,
                            pixelSize * this.pixelSize
                        );
                    }
                });
            }
        } else {
            ctx.lineCap = 'round';
            ctx.lineWidth = size;
            ctx.strokeStyle = 'rgba(0,0,0,1)';

            if (points.length > 1) {
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.stroke();
            } else if (points.length === 1) {
                ctx.beginPath();
                ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Convert normalized points to canvas coordinates
     * @param {Array} normalizedPoints - Points with x,y in 0-1 range
     * @returns {Array}
     */
    denormalizePoints(normalizedPoints) {
        return normalizedPoints.map(p => ({
            x: p.x * this.canvasWidth,
            y: p.y * this.canvasHeight,
            pressure: p.pressure,
            timestamp: p.timestamp
        }));
    }

    /**
     * Snap coordinate to pixel grid
     * @param {number} value - Canvas coordinate
     * @returns {number} - Grid coordinate
     */
    snapToPixelGrid(value) {
        if (!this.snapToGrid) {
            return Math.round(value / this.pixelSize);
        }
        return Math.round(value / this.pixelSize / this.gridSize) * this.gridSize;
    }

    /**
     * Bresenham's line algorithm
     * @param {number} x0 - Start X (grid coords)
     * @param {number} y0 - Start Y (grid coords)
     * @param {number} x1 - End X (grid coords)
     * @param {number} y1 - End Y (grid coords)
     * @param {Function} callback - Called for each point
     */
    bresenhamLine(x0, y0, x1, y1, callback) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        let x = x0, y = y0;

        while (true) {
            callback(x, y);
            if (x === x1 && y === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x += sx; }
            if (e2 < dx) { err += dx; y += sy; }
        }
    }

    /**
     * Midpoint ellipse algorithm
     * @param {number} cx - Center X
     * @param {number} cy - Center Y
     * @param {number} rx - Radius X
     * @param {number} ry - Radius Y
     * @param {boolean} filled - Whether to fill
     * @param {Function} callback - Called for each point
     */
    midpointEllipse(cx, cy, rx, ry, filled, callback) {
        if (rx <= 0 || ry <= 0) return;

        let x = 0;
        let y = ry;
        const rx2 = rx * rx;
        const ry2 = ry * ry;
        let px = 0;
        let py = 2 * rx2 * y;

        const plotEllipse = (x, y) => {
            if (filled) {
                for (let i = cx - x; i <= cx + x; i++) {
                    callback(i, cy + y);
                    if (y !== 0) callback(i, cy - y);
                }
            } else {
                callback(cx + x, cy + y);
                callback(cx - x, cy + y);
                callback(cx + x, cy - y);
                callback(cx - x, cy - y);
            }
        };

        // Region 1
        let p = ry2 - rx2 * ry + 0.25 * rx2;
        while (px < py) {
            plotEllipse(x, y);
            x++;
            px += 2 * ry2;
            if (p < 0) {
                p += ry2 + px;
            } else {
                y--;
                py -= 2 * rx2;
                p += ry2 + px - py;
            }
        }

        // Region 2
        p = ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2;
        while (y >= 0) {
            plotEllipse(x, y);
            y--;
            py -= 2 * rx2;
            if (p > 0) {
                p += rx2 - py;
            } else {
                x++;
                px += 2 * ry2;
                p += rx2 - py + px;
            }
        }
    }

    /**
     * Flood fill algorithm
     * @param {ImageData} imageData - Canvas image data
     * @param {number} startX - Start X coordinate
     * @param {number} startY - Start Y coordinate
     * @param {Object} fillColor - Fill color object
     * @param {number} tolerance - Color tolerance
     */
    floodFill(imageData, startX, startY, fillColor, tolerance = 0) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
            return;
        }

        const startIdx = (startY * width + startX) * 4;
        const startR = data[startIdx];
        const startG = data[startIdx + 1];
        const startB = data[startIdx + 2];
        const startA = data[startIdx + 3];

        const fillR = fillColor.r;
        const fillG = fillColor.g;
        const fillB = fillColor.b;
        const fillA = Math.round((fillColor.a ?? 1) * 255);

        // Check if filling with same color
        if (startR === fillR && startG === fillG && startB === fillB && startA === fillA) {
            return;
        }

        const visited = new Uint8Array(width * height);
        const stack = [[startX, startY]];

        const colorMatch = (idx) => {
            const dr = Math.abs(data[idx] - startR);
            const dg = Math.abs(data[idx + 1] - startG);
            const db = Math.abs(data[idx + 2] - startB);
            const da = Math.abs(data[idx + 3] - startA);
            return dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance;
        };

        while (stack.length > 0) {
            const [x, y] = stack.pop();

            if (x < 0 || x >= width || y < 0 || y >= height) continue;

            const pixelIdx = y * width + x;
            if (visited[pixelIdx]) continue;

            const idx = pixelIdx * 4;
            if (!colorMatch(idx)) continue;

            visited[pixelIdx] = 1;
            data[idx] = fillR;
            data[idx + 1] = fillG;
            data[idx + 2] = fillB;
            data[idx + 3] = fillA;

            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
    }

    /**
     * Find nearest color in palette
     * @param {Object} color - Color object {r, g, b, a}
     * @returns {Object} - Nearest palette color
     */
    findNearestPaletteColor(color) {
        if (!this.palette || this.palette.length === 0) {
            return color;
        }

        let minDist = Infinity;
        let nearest = this.palette[0];

        for (const pc of this.palette) {
            // Parse palette color if it's a string
            let pr, pg, pb;
            if (typeof pc === 'string') {
                const hex = pc.replace('#', '');
                pr = parseInt(hex.substr(0, 2), 16);
                pg = parseInt(hex.substr(2, 2), 16);
                pb = parseInt(hex.substr(4, 2), 16);
            } else {
                pr = pc.r;
                pg = pc.g;
                pb = pc.b;
            }

            const dist = Math.sqrt(
                Math.pow(color.r - pr, 2) +
                Math.pow(color.g - pg, 2) +
                Math.pow(color.b - pb, 2)
            );

            if (dist < minDist) {
                minDist = dist;
                nearest = typeof pc === 'string' ? { r: pr, g: pg, b: pb, a: 1 } : pc;
            }
        }

        return nearest;
    }
}
