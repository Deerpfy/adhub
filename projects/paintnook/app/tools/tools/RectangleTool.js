/**
 * RectangleTool - Draw rectangles
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
        // Draw preview
        const ctx = this.app.canvas.getPreviewContext();
        ctx.clearRect(0, 0, this.app.canvas.width, this.app.canvas.height);

        const width = x - this.startX;
        const height = y - this.startY;

        ctx.strokeStyle = this.app.color.getPrimaryColor();
        ctx.fillStyle = this.app.color.getPrimaryColor();
        ctx.lineWidth = this.app.brush.size;
        ctx.globalAlpha = this.app.brush.opacity;

        if (this.filled) {
            ctx.fillRect(this.startX, this.startY, width, height);
        } else {
            ctx.strokeRect(this.startX, this.startY, width, height);
        }
    }

    onEnd(x, y) {
        // Clear preview
        this.app.canvas.clearPreview();

        // Draw on active layer
        const ctx = this.app.layers.getActiveContext();
        if (!ctx) return;

        const width = x - this.startX;
        const height = y - this.startY;

        ctx.strokeStyle = this.app.color.getPrimaryColor();
        ctx.fillStyle = this.app.color.getPrimaryColor();
        ctx.lineWidth = this.app.brush.size;
        ctx.globalAlpha = this.app.brush.opacity;

        if (this.filled) {
            ctx.fillRect(this.startX, this.startY, width, height);
        } else {
            ctx.strokeRect(this.startX, this.startY, width, height);
        }

        ctx.globalAlpha = 1;
        this.app.canvas.render();
    }
}
