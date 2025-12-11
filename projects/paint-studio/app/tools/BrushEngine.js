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

        // Brush types
        this.brushTypes = {
            round: this.createRoundBrush.bind(this),
            soft: this.createSoftBrush.bind(this),
            square: this.createSquareBrush.bind(this),
            pixel: this.createPixelBrush.bind(this)
        };

        this.currentBrushType = 'round';

        // Cached brush stamp
        this.brushStamp = null;
        this.brushStampSize = 0;
        this.brushStampHardness = 0;
    }

    /**
     * Get brush stamp (cached)
     */
    getBrushStamp(size, hardness = this.hardness) {
        // Use cached stamp if settings match
        if (this.brushStamp &&
            this.brushStampSize === size &&
            this.brushStampHardness === hardness) {
            return this.brushStamp;
        }

        // Create new stamp
        const createFn = this.brushTypes[this.currentBrushType] || this.brushTypes.round;
        this.brushStamp = createFn(size, hardness);
        this.brushStampSize = size;
        this.brushStampHardness = hardness;

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
     * Draw a stroke point
     */
    drawPoint(ctx, x, y, pressure = 1, color = '#ffffff') {
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
     * Draw a line stroke between two points
     */
    drawStroke(ctx, x1, y1, x2, y2, pressure = 1, color = '#ffffff') {
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

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            this.drawPoint(ctx, x, y, pressure, color);
        }
    }

    /**
     * Color a brush stamp
     */
    colorBrush(stamp, color) {
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

        return canvas;
    }

    /**
     * Erase stroke
     */
    eraseStroke(ctx, x1, y1, x2, y2, pressure = 1) {
        const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const actualSize = this.app.settings.pressureSensitivity
            ? Math.max(1, this.size * pressure)
            : this.size;

        const step = Math.max(1, actualSize * this.spacing);
        const steps = Math.ceil(distance / step);

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';

        const stamp = this.getBrushStamp(Math.ceil(actualSize), this.hardness);

        for (let i = 0; i <= steps; i++) {
            const t = steps > 0 ? i / steps : 0;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;

            const drawX = x - actualSize / 2;
            const drawY = y - actualSize / 2;
            ctx.globalAlpha = this.opacity * (this.app.settings.pressureSensitivity ? pressure : 1);
            ctx.drawImage(stamp, drawX, drawY, actualSize, actualSize);
        }

        ctx.restore();
    }

    /**
     * Set brush type
     */
    setBrushType(type) {
        if (this.brushTypes[type]) {
            this.currentBrushType = type;
            this.brushStamp = null; // Invalidate cache
        }
    }

    /**
     * Invalidate brush cache
     */
    invalidateCache() {
        this.brushStamp = null;
    }
}
