/**
 * MoveTool - Move layer contents
 */

export class MoveTool {
    constructor(app) {
        this.app = app;
        this.name = 'move';
        this.displayName = 'Přesun';
        this.startX = 0;
        this.startY = 0;
        this.originalImageData = null;
    }

    activate() {}
    deactivate() {}

    onStart(x, y) {
        this.startX = x;
        this.startY = y;

        // Save original layer content
        const layer = this.app.layers.getActiveLayer();
        if (layer) {
            const ctx = layer.canvas.getContext('2d');
            this.originalImageData = ctx.getImageData(
                0, 0, layer.canvas.width, layer.canvas.height
            );
        }
    }

    onMove(x, y) {
        const layer = this.app.layers.getActiveLayer();
        if (!layer || !this.originalImageData) return;

        const dx = x - this.startX;
        const dy = y - this.startY;

        const ctx = layer.canvas.getContext('2d');

        // Clear and redraw offset
        ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);

        // Create temporary canvas with original data
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = layer.canvas.width;
        tempCanvas.height = layer.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(this.originalImageData, 0, 0);

        // Draw offset
        ctx.drawImage(tempCanvas, dx, dy);
        this.app.canvas.render();
    }

    onEnd(x, y) {
        this.originalImageData = null;
    }
}
