/**
 * EllipseTool - Draw ellipses/circles
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
        this.startX = x;
        this.startY = y;
    }

    onMove(x, y, pressure) {
        // Draw preview
        const ctx = this.app.canvas.getPreviewContext();
        ctx.clearRect(0, 0, this.app.canvas.width, this.app.canvas.height);

        const centerX = (this.startX + x) / 2;
        const centerY = (this.startY + y) / 2;
        const radiusX = Math.abs(x - this.startX) / 2;
        const radiusY = Math.abs(y - this.startY) / 2;

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

    onEnd(x, y) {
        // Clear preview
        this.app.canvas.clearPreview();

        // Draw on active layer
        const ctx = this.app.layers.getActiveContext();
        if (!ctx) return;

        const centerX = (this.startX + x) / 2;
        const centerY = (this.startY + y) / 2;
        const radiusX = Math.abs(x - this.startX) / 2;
        const radiusY = Math.abs(y - this.startY) / 2;

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
        this.app.canvas.render();
    }
}
