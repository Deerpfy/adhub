/**
 * LineTool - Draw straight lines
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
        this.startX = x;
        this.startY = y;
    }

    onMove(x, y, pressure) {
        // Draw preview on preview canvas
        const ctx = this.app.canvas.getPreviewContext();
        ctx.clearRect(0, 0, this.app.canvas.width, this.app.canvas.height);

        ctx.strokeStyle = this.app.color.getPrimaryColor();
        ctx.lineWidth = this.app.brush.size;
        ctx.lineCap = 'round';
        ctx.globalAlpha = this.app.brush.opacity;

        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    onEnd(x, y) {
        // Clear preview
        this.app.canvas.clearPreview();

        // Draw on active layer
        const ctx = this.app.layers.getActiveContext();
        if (!ctx) return;

        ctx.strokeStyle = this.app.color.getPrimaryColor();
        ctx.lineWidth = this.app.brush.size;
        ctx.lineCap = 'round';
        ctx.globalAlpha = this.app.brush.opacity;

        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.globalAlpha = 1;
        this.app.canvas.render();
    }
}
