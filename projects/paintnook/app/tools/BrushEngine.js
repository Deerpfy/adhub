/**
 * BrushEngine - Core brush drawing functionality
 */

export class BrushEngine {
    constructor(app) {
        this.app = app;

        // Brush settings
        this.size = 10;
        this.opacity = 1;
        this.hardness = 1;
        this.spacing = 0.25; // Spacing as fraction of brush size
        this.flow = 1; // Flow rate (how much paint per stamp)
        this.scatter = 0; // Random scatter amount
        this.angle = 0; // Brush rotation angle (radians)
        this.roundness = 1; // Brush roundness (1 = circular, <1 = elliptical)
        this.textureStrength = 0; // Texture overlay strength

        // Brush types
        this.brushTypes = {
            round: this.createRoundBrush.bind(this),
            soft: this.createSoftBrush.bind(this),
            square: this.createSquareBrush.bind(this),
            pixel: this.createPixelBrush.bind(this),
            airbrush: this.createAirbrush.bind(this),
            marker: this.createMarkerBrush.bind(this),
            charcoal: this.createCharcoalBrush.bind(this),
            watercolor: this.createWatercolorBrush.bind(this),
            ink: this.createInkBrush.bind(this),
            calligraphy: this.createCalligraphyBrush.bind(this),
            splatter: this.createSplatterBrush.bind(this),
            chalk: this.createChalkBrush.bind(this)
        };

        this.currentBrushType = 'round';

        // Per-brush size and opacity memory
        this.brushSettings = {};
        this.initBrushSettings();

        // Cached brush stamp
        this.brushStamp = null;
        this.brushStampSize = 0;
        this.brushStampHardness = 0;
        this.brushStampType = '';

        // Colored brush cache for performance optimization
        // Key: `${size}-${hardness}-${color}` -> colored canvas
        this.coloredBrushCache = new Map();
        this.maxColoredCacheSize = 50;
        this.lastCacheCleanup = 0;
    }

    /**
     * Initialize default settings for each brush type
     */
    initBrushSettings() {
        const defaultSizes = {
            round: { size: 10, opacity: 1, hardness: 1 },
            soft: { size: 20, opacity: 0.8, hardness: 0.5 },
            square: { size: 10, opacity: 1, hardness: 1 },
            pixel: { size: 1, opacity: 1, hardness: 1 },
            airbrush: { size: 40, opacity: 0.3, hardness: 0.2 },
            marker: { size: 15, opacity: 0.7, hardness: 0.8 },
            charcoal: { size: 25, opacity: 0.9, hardness: 0.6 },
            watercolor: { size: 30, opacity: 0.5, hardness: 0.3 },
            ink: { size: 8, opacity: 1, hardness: 0.9 },
            calligraphy: { size: 12, opacity: 1, hardness: 1 },
            splatter: { size: 50, opacity: 0.6, hardness: 0.5 },
            chalk: { size: 20, opacity: 0.8, hardness: 0.4 }
        };

        // Load saved settings or use defaults
        const saved = localStorage.getItem('paintnook-brush-settings');
        if (saved) {
            try {
                this.brushSettings = JSON.parse(saved);
            } catch (e) {
                this.brushSettings = { ...defaultSizes };
            }
        } else {
            this.brushSettings = { ...defaultSizes };
        }

        // Ensure all brush types have settings
        for (const type of Object.keys(this.brushTypes)) {
            if (!this.brushSettings[type]) {
                this.brushSettings[type] = defaultSizes[type] || { size: 10, opacity: 1, hardness: 1 };
            }
        }
    }

    /**
     * Save brush settings to localStorage
     */
    saveBrushSettings() {
        // Update current brush settings before saving
        this.brushSettings[this.currentBrushType] = {
            size: this.size,
            opacity: this.opacity,
            hardness: this.hardness
        };

        localStorage.setItem('paintnook-brush-settings', JSON.stringify(this.brushSettings));
    }

    /**
     * Get brush stamp (cached)
     */
    getBrushStamp(size, hardness = this.hardness) {
        // Use cached stamp if settings match
        if (this.brushStamp &&
            this.brushStampSize === size &&
            this.brushStampHardness === hardness &&
            this.brushStampType === this.currentBrushType) {
            return this.brushStamp;
        }

        // Create new stamp
        const createFn = this.brushTypes[this.currentBrushType] || this.brushTypes.round;
        this.brushStamp = createFn(size, hardness);
        this.brushStampSize = size;
        this.brushStampHardness = hardness;
        this.brushStampType = this.currentBrushType;

        return this.brushStamp;
    }

    /**
     * Create round brush stamp
     */
    createRoundBrush(size, hardness) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const center = size / 2;
        const radius = size / 2;

        if (hardness >= 0.99) {
            // Hard brush - solid circle
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Soft brush - radial gradient
            const gradient = ctx.createRadialGradient(
                center, center, 0,
                center, center, radius
            );

            const hardRadius = hardness;
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(hardRadius, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
        }

        return canvas;
    }

    /**
     * Create soft brush stamp
     */
    createSoftBrush(size, hardness) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const center = size / 2;
        const radius = size / 2;

        const gradient = ctx.createRadialGradient(
            center, center, 0,
            center, center, radius
        );

        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        return canvas;
    }

    /**
     * Create square brush stamp
     */
    createSquareBrush(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);

        return canvas;
    }

    /**
     * Create pixel brush stamp (1x1)
     */
    createPixelBrush(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);
        ctx.imageSmoothingEnabled = false;

        return canvas;
    }

    /**
     * Create airbrush stamp (very soft, wide gradient)
     */
    createAirbrush(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const center = size / 2;
        const radius = size / 2;

        const gradient = ctx.createRadialGradient(
            center, center, 0,
            center, center, radius
        );

        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.25)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
        gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.05)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        return canvas;
    }

    /**
     * Create marker brush (flat edge, consistent opacity)
     */
    createMarkerBrush(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const center = size / 2;
        const radius = size / 2;

        // Elliptical shape for marker
        ctx.save();
        ctx.scale(1, 0.6);
        ctx.beginPath();
        ctx.arc(center, center / 0.6, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
        ctx.restore();

        return canvas;
    }

    /**
     * Create charcoal brush (textured, rough edges)
     */
    createCharcoalBrush(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const center = size / 2;
        const radius = size / 2;

        // Create base gradient
        const gradient = ctx.createRadialGradient(
            center, center, 0,
            center, center, radius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Add noise texture
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * 0.5 + 0.5;
            data[i + 3] = Math.floor(data[i + 3] * noise);
        }

        ctx.putImageData(imageData, 0, 0);

        return canvas;
    }

    /**
     * Create watercolor brush (soft, wet edges)
     */
    createWatercolorBrush(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const center = size / 2;
        const radius = size / 2;

        // Create irregular shape using multiple overlapping circles
        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 8; i++) {
            const offsetX = (Math.random() - 0.5) * radius * 0.3;
            const offsetY = (Math.random() - 0.5) * radius * 0.3;
            const r = radius * (0.7 + Math.random() * 0.3);

            const gradient = ctx.createRadialGradient(
                center + offsetX, center + offsetY, 0,
                center + offsetX, center + offsetY, r
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
        }

        return canvas;
    }

    /**
     * Create ink brush (pressure-sensitive, calligraphic)
     */
    createInkBrush(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const center = size / 2;

        // Create elongated shape
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(Math.PI / 4); // 45 degree angle
        ctx.scale(1, 0.3);

        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return canvas;
    }

    /**
     * Create calligraphy brush (flat, angled)
     */
    createCalligraphyBrush(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const center = size / 2;

        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(-Math.PI / 6); // -30 degrees

        // Flat rectangular shape
        ctx.fillStyle = 'white';
        ctx.fillRect(-size / 2, -size / 8, size, size / 4);

        ctx.restore();

        return canvas;
    }

    /**
     * Create splatter brush (spray effect)
     */
    createSplatterBrush(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const center = size / 2;
        const numDots = Math.floor(size * 2);

        ctx.fillStyle = 'white';

        for (let i = 0; i < numDots; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * size / 2;
            const x = center + Math.cos(angle) * distance;
            const y = center + Math.sin(angle) * distance;
            const dotSize = Math.random() * 2 + 0.5;

            // Density falls off from center
            const alpha = 1 - (distance / (size / 2));
            ctx.globalAlpha = alpha * Math.random();

            ctx.beginPath();
            ctx.arc(x, y, dotSize, 0, Math.PI * 2);
            ctx.fill();
        }

        return canvas;
    }

    /**
     * Create chalk brush (textured, grainy)
     */
    createChalkBrush(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const center = size / 2;
        const radius = size / 2;

        // Create dots pattern for chalk effect
        ctx.fillStyle = 'white';

        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                const dist = Math.sqrt(Math.pow(x - center, 2) + Math.pow(y - center, 2));
                if (dist < radius) {
                    const falloff = 1 - (dist / radius);
                    if (Math.random() < falloff * 0.6) {
                        ctx.globalAlpha = falloff * (0.5 + Math.random() * 0.5);
                        ctx.fillRect(x, y, 1, 1);
                    }
                }
            }
        }

        return canvas;
    }

    /**
     * Draw a stroke point
     */
    drawPoint(ctx, x, y, pressure = 1, color = '#ffffff') {
        // Check if pixel art mode is enabled
        if (this.app.pixelArt && this.app.pixelArt.enabled) {
            this.drawPixelArtPoint(ctx, x, y, color);
            return;
        }

        // Calculate actual size based on pressure
        const actualSize = this.app.settings.pressureSensitivity
            ? Math.max(1, this.size * pressure)
            : this.size;

        // Get brush stamp
        const stamp = this.getBrushStamp(Math.ceil(actualSize), this.hardness);

        // Save context
        ctx.save();

        // Set composite for color
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = this.opacity * (this.app.settings.pressureSensitivity ? pressure : 1);

        // Create colored brush
        const coloredStamp = this.colorBrush(stamp, color);

        // Draw
        const drawX = x - actualSize / 2;
        const drawY = y - actualSize / 2;
        ctx.drawImage(coloredStamp, drawX, drawY, actualSize, actualSize);

        ctx.restore();
    }

    /**
     * Draw a pixel art point - fills entire grid cell
     */
    drawPixelArtPoint(ctx, x, y, color = '#ffffff') {
        const pixelArt = this.app.pixelArt;
        const gridSize = pixelArt.grid.size || 1;

        // Snap to grid - calculate the top-left corner of the grid cell
        const gridX = Math.floor(x / gridSize) * gridSize;
        const gridY = Math.floor(y / gridSize) * gridSize;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = color;

        // Fill the entire grid cell
        ctx.fillRect(gridX, gridY, gridSize, gridSize);

        ctx.restore();

        // Track this cell to avoid redrawing (for continuous strokes)
        if (!this._pixelArtCells) {
            this._pixelArtCells = new Set();
        }
        this._pixelArtCells.add(`${gridX},${gridY}`);
    }

    /**
     * Draw a line stroke between two points (optimized batch rendering)
     */
    drawStroke(ctx, x1, y1, x2, y2, pressure = 1, color = '#ffffff') {
        // Check if pixel art mode is enabled
        if (this.app.pixelArt && this.app.pixelArt.enabled) {
            this.drawPixelArtStroke(ctx, x1, y1, x2, y2, color);
            return;
        }

        const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const actualSize = this.app.settings.pressureSensitivity
            ? Math.max(1, this.size * pressure)
            : this.size;

        const step = Math.max(1, actualSize * this.spacing);
        const steps = Math.ceil(distance / step);

        if (steps === 0) {
            this.drawPoint(ctx, x2, y2, pressure, color);
            return;
        }

        // Get brush stamp and colored version once for all points
        const stamp = this.getBrushStamp(Math.ceil(actualSize), this.hardness);
        const coloredStamp = this.colorBrush(stamp, color);
        const alpha = this.opacity * (this.app.settings.pressureSensitivity ? pressure : 1);

        // Batch render all points in single save/restore block
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            const drawX = x - actualSize / 2;
            const drawY = y - actualSize / 2;
            ctx.drawImage(coloredStamp, drawX, drawY, actualSize, actualSize);
        }

        ctx.restore();
    }

    /**
     * Draw a pixel art stroke using Bresenham's line algorithm
     */
    drawPixelArtStroke(ctx, x1, y1, x2, y2, color = '#ffffff') {
        const pixelArt = this.app.pixelArt;
        const gridSize = pixelArt.grid.size || 1;

        // Convert to grid coordinates
        let gx1 = Math.floor(x1 / gridSize);
        let gy1 = Math.floor(y1 / gridSize);
        let gx2 = Math.floor(x2 / gridSize);
        let gy2 = Math.floor(y2 / gridSize);

        // Bresenham's line algorithm
        const dx = Math.abs(gx2 - gx1);
        const dy = Math.abs(gy2 - gy1);
        const sx = gx1 < gx2 ? 1 : -1;
        const sy = gy1 < gy2 ? 1 : -1;
        let err = dx - dy;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = color;

        // Initialize cell tracking if needed
        if (!this._pixelArtCells) {
            this._pixelArtCells = new Set();
        }

        while (true) {
            const cellKey = `${gx1 * gridSize},${gy1 * gridSize}`;

            // Only draw if we haven't drawn this cell yet in this stroke
            if (!this._pixelArtCells.has(cellKey)) {
                ctx.fillRect(gx1 * gridSize, gy1 * gridSize, gridSize, gridSize);
                this._pixelArtCells.add(cellKey);
            }

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

        ctx.restore();
    }

    /**
     * Clear pixel art cell tracking (call at stroke end)
     */
    clearPixelArtCells() {
        this._pixelArtCells = null;
    }

    /**
     * Color a brush stamp (with caching for performance)
     */
    colorBrush(stamp, color) {
        // Generate cache key based on stamp properties and color
        const cacheKey = `${this.currentBrushType}-${stamp.width}-${this.hardness.toFixed(2)}-${color}`;

        // Check cache first
        const cached = this.coloredBrushCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Create new colored brush
        const canvas = document.createElement('canvas');
        canvas.width = stamp.width;
        canvas.height = stamp.height;
        const ctx = canvas.getContext('2d');

        // Fill with color
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Apply brush alpha
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(stamp, 0, 0);

        // Cache the result
        this.coloredBrushCache.set(cacheKey, canvas);

        // Cleanup cache if too large (every 100ms at most)
        const now = performance.now();
        if (this.coloredBrushCache.size > this.maxColoredCacheSize && now - this.lastCacheCleanup > 100) {
            this.cleanupColoredCache();
            this.lastCacheCleanup = now;
        }

        return canvas;
    }

    /**
     * Cleanup colored brush cache (remove oldest entries)
     */
    cleanupColoredCache() {
        const entries = Array.from(this.coloredBrushCache.keys());
        const toRemove = entries.slice(0, Math.floor(entries.length / 2));
        toRemove.forEach(key => this.coloredBrushCache.delete(key));
    }

    /**
     * Erase stroke (optimized batch rendering)
     */
    eraseStroke(ctx, x1, y1, x2, y2, pressure = 1) {
        const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const actualSize = this.app.settings.pressureSensitivity
            ? Math.max(1, this.size * pressure)
            : this.size;

        const step = Math.max(1, actualSize * this.spacing);
        const steps = Math.ceil(distance / step);

        // Get stamp once for all points
        const stamp = this.getBrushStamp(Math.ceil(actualSize), this.hardness);
        const alpha = this.opacity * (this.app.settings.pressureSensitivity ? pressure : 1);

        // Batch render all erase points
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = alpha;

        for (let i = 0; i <= steps; i++) {
            const t = steps > 0 ? i / steps : 0;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            const drawX = x - actualSize / 2;
            const drawY = y - actualSize / 2;
            ctx.drawImage(stamp, drawX, drawY, actualSize, actualSize);
        }

        ctx.restore();
    }

    /**
     * Set brush type
     */
    setBrushType(type) {
        if (this.brushTypes[type]) {
            // Save current brush settings before switching
            this.saveBrushSettings();

            // Switch to new brush type
            this.currentBrushType = type;
            this.brushStamp = null; // Invalidate cache

            // Load settings for this brush type
            const settings = this.brushSettings[type];
            if (settings) {
                this.size = settings.size;
                this.opacity = settings.opacity;
                this.hardness = settings.hardness;

                // Update UI
                this.app.ui?.updateBrushSize(this.size);
                this.app.ui?.updateBrushOpacity(Math.round(this.opacity * 100));
            }
        }
    }

    /**
     * Invalidate brush cache
     */
    invalidateCache() {
        this.brushStamp = null;
        // Clear colored cache when brush type changes
        this.coloredBrushCache.clear();
    }
}
