/**
 * FillTool - Flood fill (paint bucket) tool
 */

export class FillTool {
    constructor(app) {
        this.app = app;
        this.name = 'fill';
        this.displayName = 'Výplň';
        this.tolerance = 32; // Color tolerance
    }

    activate() {}
    deactivate() {}

    onStart(x, y) {
        const layer = this.app.layers.getActiveLayer();
        if (!layer) return;

        const ctx = layer.canvas.getContext('2d');
        const width = layer.canvas.width;
        const height = layer.canvas.height;

        // Round coordinates
        const startX = Math.floor(x);
        const startY = Math.floor(y);

        // Check bounds
        if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
            return;
        }

        // Get fill color
        const fillColor = this.hexToRgba(this.app.color.getPrimaryColor());

        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Get target color at click position
        const targetIndex = (startY * width + startX) * 4;
        const targetColor = {
            r: data[targetIndex],
            g: data[targetIndex + 1],
            b: data[targetIndex + 2],
            a: data[targetIndex + 3]
        };

        // Don't fill if clicking on same color
        if (this.colorsMatch(targetColor, fillColor, 1)) {
            return;
        }

        // Flood fill using queue-based algorithm
        this.floodFill(imageData, startX, startY, targetColor, fillColor, width, height);

        // Put modified image data back
        ctx.putImageData(imageData, 0, 0);
        this.app.canvas.render();
    }

    onMove() {}
    onEnd() {}

    /**
     * Flood fill algorithm
     */
    floodFill(imageData, startX, startY, targetColor, fillColor, width, height) {
        const data = imageData.data;
        const stack = [[startX, startY]];
        const visited = new Set();

        while (stack.length > 0) {
            const [x, y] = stack.pop();

            // Check bounds
            if (x < 0 || x >= width || y < 0 || y >= height) continue;

            // Check if already visited
            const key = `${x},${y}`;
            if (visited.has(key)) continue;
            visited.add(key);

            // Get pixel index
            const index = (y * width + x) * 4;
            const currentColor = {
                r: data[index],
                g: data[index + 1],
                b: data[index + 2],
                a: data[index + 3]
            };

            // Check if color matches target
            if (!this.colorsMatch(currentColor, targetColor, this.tolerance)) continue;

            // Fill pixel
            data[index] = fillColor.r;
            data[index + 1] = fillColor.g;
            data[index + 2] = fillColor.b;
            data[index + 3] = fillColor.a;

            // Add neighbors to stack
            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }
    }

    /**
     * Check if two colors match within tolerance
     */
    colorsMatch(c1, c2, tolerance) {
        return Math.abs(c1.r - c2.r) <= tolerance &&
               Math.abs(c1.g - c2.g) <= tolerance &&
               Math.abs(c1.b - c2.b) <= tolerance &&
               Math.abs(c1.a - c2.a) <= tolerance;
    }

    /**
     * Convert hex color to RGBA
     */
    hexToRgba(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            a: 255
        } : { r: 0, g: 0, b: 0, a: 255 };
    }
}
