/**
 * SelectionManager - Manages selections across layers
 */

export class SelectionManager {
    constructor(app) {
        this.app = app;

        // Selection mask (Uint8Array where 255 = selected, 0 = not selected)
        this.selectionMask = null;
        this.width = 0;
        this.height = 0;

        // Selection state
        this.hasSelection = false;
        this.selectionBounds = null;

        // Marching ants animation
        this.marchingAntsOffset = 0;
        this.marchingAntsInterval = null;
    }

    /**
     * Initialize or resize selection mask
     */
    initMask(width, height) {
        this.width = width;
        this.height = height;
        this.selectionMask = new Uint8Array(width * height);
        this.hasSelection = false;
        this.selectionBounds = null;
    }

    /**
     * Clear selection
     */
    clearSelection() {
        if (this.selectionMask) {
            this.selectionMask.fill(0);
        }
        this.hasSelection = false;
        this.selectionBounds = null;
        this.stopMarchingAnts();
        this.app.canvas.clearPreview();
    }

    /**
     * Select all
     */
    selectAll() {
        if (!this.selectionMask) {
            this.initMask(this.app.canvas.width, this.app.canvas.height);
        }
        this.selectionMask.fill(255);
        this.hasSelection = true;
        this.selectionBounds = {
            x: 0,
            y: 0,
            width: this.width,
            height: this.height
        };
        this.startMarchingAnts();
    }

    /**
     * Invert selection
     */
    invertSelection() {
        if (!this.selectionMask) return;

        for (let i = 0; i < this.selectionMask.length; i++) {
            this.selectionMask[i] = 255 - this.selectionMask[i];
        }

        this.hasSelection = this.selectionMask.some(v => v > 0);
        this.updateBounds();
        this.drawMarchingAnts();
    }

    /**
     * Rectangle selection
     */
    selectRectangle(x1, y1, x2, y2, mode = 'replace') {
        if (!this.selectionMask) {
            this.initMask(this.app.canvas.width, this.app.canvas.height);
        }

        const minX = Math.max(0, Math.min(x1, x2));
        const minY = Math.max(0, Math.min(y1, y2));
        const maxX = Math.min(this.width, Math.max(x1, x2));
        const maxY = Math.min(this.height, Math.max(y1, y2));

        if (mode === 'replace') {
            this.selectionMask.fill(0);
        }

        for (let y = Math.floor(minY); y < maxY; y++) {
            for (let x = Math.floor(minX); x < maxX; x++) {
                const idx = y * this.width + x;
                if (mode === 'add' || mode === 'replace') {
                    this.selectionMask[idx] = 255;
                } else if (mode === 'subtract') {
                    this.selectionMask[idx] = 0;
                } else if (mode === 'intersect') {
                    // Keep only if already selected
                }
            }
        }

        this.hasSelection = true;
        this.updateBounds();
        this.startMarchingAnts();
    }

    /**
     * Ellipse selection
     */
    selectEllipse(centerX, centerY, radiusX, radiusY, mode = 'replace') {
        if (!this.selectionMask) {
            this.initMask(this.app.canvas.width, this.app.canvas.height);
        }

        if (mode === 'replace') {
            this.selectionMask.fill(0);
        }

        const minX = Math.max(0, Math.floor(centerX - radiusX));
        const maxX = Math.min(this.width, Math.ceil(centerX + radiusX));
        const minY = Math.max(0, Math.floor(centerY - radiusY));
        const maxY = Math.min(this.height, Math.ceil(centerY + radiusY));

        for (let y = minY; y < maxY; y++) {
            for (let x = minX; x < maxX; x++) {
                const dx = (x - centerX) / radiusX;
                const dy = (y - centerY) / radiusY;
                if (dx * dx + dy * dy <= 1) {
                    const idx = y * this.width + x;
                    if (mode === 'add' || mode === 'replace') {
                        this.selectionMask[idx] = 255;
                    } else if (mode === 'subtract') {
                        this.selectionMask[idx] = 0;
                    }
                }
            }
        }

        this.hasSelection = true;
        this.updateBounds();
        this.startMarchingAnts();
    }

    /**
     * Lasso (polygon) selection
     */
    selectLasso(points, mode = 'replace') {
        if (!this.selectionMask || points.length < 3) return;

        if (mode === 'replace') {
            this.selectionMask.fill(0);
        }

        // Get bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });

        minX = Math.max(0, Math.floor(minX));
        minY = Math.max(0, Math.floor(minY));
        maxX = Math.min(this.width, Math.ceil(maxX));
        maxY = Math.min(this.height, Math.ceil(maxY));

        // Point-in-polygon test for each pixel
        for (let y = minY; y < maxY; y++) {
            for (let x = minX; x < maxX; x++) {
                if (this.pointInPolygon(x, y, points)) {
                    const idx = y * this.width + x;
                    if (mode === 'add' || mode === 'replace') {
                        this.selectionMask[idx] = 255;
                    } else if (mode === 'subtract') {
                        this.selectionMask[idx] = 0;
                    }
                }
            }
        }

        this.hasSelection = true;
        this.updateBounds();
        this.startMarchingAnts();
    }

    /**
     * Magic wand selection (flood fill based)
     */
    selectMagicWand(x, y, tolerance = 32, contiguous = true, sampleMerged = false) {
        if (!this.selectionMask) {
            this.initMask(this.app.canvas.width, this.app.canvas.height);
        }

        // Get image data
        let imageData;
        if (sampleMerged) {
            imageData = this.app.canvas.getImageData();
        } else {
            const layer = this.app.layers.getActiveLayer();
            if (!layer) return;
            const ctx = layer.canvas.getContext('2d');
            imageData = ctx.getImageData(0, 0, this.width, this.height);
        }

        const data = imageData.data;
        const targetColor = this.getPixelColor(data, x, y);

        // Clear previous selection
        this.selectionMask.fill(0);

        if (contiguous) {
            // Flood fill selection
            this.floodFillSelect(data, x, y, targetColor, tolerance);
        } else {
            // Global color selection
            this.globalColorSelect(data, targetColor, tolerance);
        }

        this.hasSelection = this.selectionMask.some(v => v > 0);
        this.updateBounds();
        if (this.hasSelection) {
            this.startMarchingAnts();
        }
    }

    /**
     * Get pixel color from image data
     */
    getPixelColor(data, x, y) {
        x = Math.floor(x);
        y = Math.floor(y);
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return { r: 0, g: 0, b: 0, a: 0 };
        }
        const idx = (y * this.width + x) * 4;
        return {
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2],
            a: data[idx + 3]
        };
    }

    /**
     * Check if color is within tolerance
     */
    colorWithinTolerance(c1, c2, tolerance) {
        return Math.abs(c1.r - c2.r) <= tolerance &&
               Math.abs(c1.g - c2.g) <= tolerance &&
               Math.abs(c1.b - c2.b) <= tolerance &&
               Math.abs(c1.a - c2.a) <= tolerance;
    }

    /**
     * Flood fill selection
     */
    floodFillSelect(data, startX, startY, targetColor, tolerance) {
        startX = Math.floor(startX);
        startY = Math.floor(startY);

        const visited = new Uint8Array(this.width * this.height);
        const stack = [[startX, startY]];

        while (stack.length > 0) {
            const [x, y] = stack.pop();

            if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;

            const idx = y * this.width + x;
            if (visited[idx]) continue;
            visited[idx] = 1;

            const color = this.getPixelColor(data, x, y);
            if (!this.colorWithinTolerance(color, targetColor, tolerance)) continue;

            this.selectionMask[idx] = 255;

            // Add neighbors
            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }
    }

    /**
     * Global color selection (non-contiguous)
     */
    globalColorSelect(data, targetColor, tolerance) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const color = this.getPixelColor(data, x, y);
                if (this.colorWithinTolerance(color, targetColor, tolerance)) {
                    this.selectionMask[y * this.width + x] = 255;
                }
            }
        }
    }

    /**
     * Point in polygon test (ray casting)
     */
    pointInPolygon(x, y, points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;

            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    /**
     * Update selection bounds
     */
    updateBounds() {
        if (!this.hasSelection) {
            this.selectionBounds = null;
            return;
        }

        let minX = this.width, minY = this.height, maxX = 0, maxY = 0;
        let hasPixels = false;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.selectionMask[y * this.width + x] > 0) {
                    hasPixels = true;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        if (hasPixels) {
            this.selectionBounds = {
                x: minX,
                y: minY,
                width: maxX - minX + 1,
                height: maxY - minY + 1
            };
        } else {
            this.selectionBounds = null;
            this.hasSelection = false;
        }
    }

    /**
     * Start marching ants animation
     */
    startMarchingAnts() {
        this.stopMarchingAnts();
        this.marchingAntsInterval = setInterval(() => {
            this.marchingAntsOffset = (this.marchingAntsOffset + 1) % 16;
            this.drawMarchingAnts();
        }, 100);
        this.drawMarchingAnts();
    }

    /**
     * Stop marching ants animation
     */
    stopMarchingAnts() {
        if (this.marchingAntsInterval) {
            clearInterval(this.marchingAntsInterval);
            this.marchingAntsInterval = null;
        }
    }

    /**
     * Draw marching ants on preview canvas
     */
    drawMarchingAnts() {
        const ctx = this.app.canvas.getPreviewContext();
        if (!ctx || !this.hasSelection) return;

        ctx.clearRect(0, 0, this.app.canvas.width, this.app.canvas.height);

        // Find edge pixels and draw marching ants
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -this.marchingAntsOffset;

        // Draw selection outline
        ctx.beginPath();
        this.traceSelectionOutline(ctx);
        ctx.stroke();

        // Draw white dashed line on top
        ctx.strokeStyle = 'white';
        ctx.lineDashOffset = -this.marchingAntsOffset + 4;
        ctx.beginPath();
        this.traceSelectionOutline(ctx);
        ctx.stroke();

        ctx.setLineDash([]);
    }

    /**
     * Trace selection outline for marching ants
     */
    traceSelectionOutline(ctx) {
        if (!this.selectionBounds) return;

        // Simple approach: draw rectangle around bounds
        // For complex selections, we'd need to trace the actual edge
        const { x, y, width, height } = this.selectionBounds;

        // For simple shapes, use the bounds
        // For complex selections, trace edge pixels
        if (this.isSimpleRectangle()) {
            ctx.rect(x, y, width, height);
        } else {
            // Trace actual edge pixels for complex selections
            this.traceEdgePixels(ctx);
        }
    }

    /**
     * Check if selection is a simple rectangle
     */
    isSimpleRectangle() {
        if (!this.selectionBounds) return false;
        const { x, y, width, height } = this.selectionBounds;

        // Check if all pixels in bounds are selected
        for (let py = y; py < y + height; py++) {
            for (let px = x; px < x + width; px++) {
                if (this.selectionMask[py * this.width + px] === 0) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Trace edge pixels for complex selections
     */
    traceEdgePixels(ctx) {
        if (!this.selectionBounds) return;

        const { x, y, width, height } = this.selectionBounds;

        // Simple edge detection - draw line segments for edge pixels
        for (let py = y; py < y + height; py++) {
            for (let px = x; px < x + width; px++) {
                const idx = py * this.width + px;
                if (this.selectionMask[idx] > 0) {
                    // Check if this is an edge pixel
                    const hasUnselectedNeighbor =
                        (px > 0 && this.selectionMask[idx - 1] === 0) ||
                        (px < this.width - 1 && this.selectionMask[idx + 1] === 0) ||
                        (py > 0 && this.selectionMask[idx - this.width] === 0) ||
                        (py < this.height - 1 && this.selectionMask[idx + this.width] === 0);

                    if (hasUnselectedNeighbor) {
                        ctx.rect(px, py, 1, 1);
                    }
                }
            }
        }
    }

    /**
     * Apply operation only to selected pixels
     */
    applyToSelection(ctx, operation) {
        if (!this.hasSelection) {
            operation(ctx);
            return;
        }

        // Save current state
        const imageData = ctx.getImageData(0, 0, this.width, this.height);

        // Apply operation
        operation(ctx);

        // Get result
        const resultData = ctx.getImageData(0, 0, this.width, this.height);

        // Blend based on selection
        for (let i = 0; i < this.selectionMask.length; i++) {
            const alpha = this.selectionMask[i] / 255;
            const idx = i * 4;

            resultData.data[idx] = Math.round(
                imageData.data[idx] * (1 - alpha) + resultData.data[idx] * alpha
            );
            resultData.data[idx + 1] = Math.round(
                imageData.data[idx + 1] * (1 - alpha) + resultData.data[idx + 1] * alpha
            );
            resultData.data[idx + 2] = Math.round(
                imageData.data[idx + 2] * (1 - alpha) + resultData.data[idx + 2] * alpha
            );
            resultData.data[idx + 3] = Math.round(
                imageData.data[idx + 3] * (1 - alpha) + resultData.data[idx + 3] * alpha
            );
        }

        ctx.putImageData(resultData, 0, 0);
    }

    /**
     * Check if point is in selection
     */
    isPointSelected(x, y) {
        if (!this.hasSelection) return true;
        x = Math.floor(x);
        y = Math.floor(y);
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        return this.selectionMask[y * this.width + x] > 0;
    }

    /**
     * Feather selection edges
     */
    feather(radius) {
        if (!this.hasSelection || radius <= 0) return;

        const newMask = new Uint8Array(this.selectionMask.length);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let sum = 0;
                let count = 0;

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist <= radius) {
                                sum += this.selectionMask[ny * this.width + nx];
                                count++;
                            }
                        }
                    }
                }

                newMask[y * this.width + x] = Math.round(sum / count);
            }
        }

        this.selectionMask = newMask;
        this.drawMarchingAnts();
    }

    /**
     * Expand selection
     */
    expand(pixels) {
        if (!this.hasSelection || pixels <= 0) return;
        this.morphSelection(pixels, 'expand');
    }

    /**
     * Contract selection
     */
    contract(pixels) {
        if (!this.hasSelection || pixels <= 0) return;
        this.morphSelection(pixels, 'contract');
    }

    /**
     * Morphological operation on selection
     */
    morphSelection(radius, operation) {
        const newMask = new Uint8Array(this.selectionMask.length);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = y * this.width + x;
                let shouldSelect = operation === 'contract' ? true : false;

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist <= radius) {
                                const nidx = ny * this.width + nx;
                                if (operation === 'expand' && this.selectionMask[nidx] > 0) {
                                    shouldSelect = true;
                                } else if (operation === 'contract' && this.selectionMask[nidx] === 0) {
                                    shouldSelect = false;
                                }
                            }
                        }
                    }
                }

                newMask[idx] = shouldSelect ? 255 : 0;
            }
        }

        this.selectionMask = newMask;
        this.updateBounds();
        this.drawMarchingAnts();
    }
}
