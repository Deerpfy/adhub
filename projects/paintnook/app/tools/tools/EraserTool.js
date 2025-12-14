/**
 * EraserTool - Eraser tool
 */

export class EraserTool {
    constructor(app) {
        this.app = app;
        this.name = 'eraser';
        this.displayName = 'Guma';
    }

    activate() {
        this.app.brush.setBrushType('round');
    }

    deactivate() {}

    onStart(x, y, pressure) {
        const ctx = this.app.layers.getActiveContext();
        if (!ctx) return;

        this.app.brush.eraseStroke(ctx, x, y, x, y, pressure);
        this.app.canvas.render();
    }

    onMove(x, y, pressure, lastX, lastY) {
        const ctx = this.app.layers.getActiveContext();
        if (!ctx) return;

        this.app.brush.eraseStroke(ctx, lastX, lastY, x, y, pressure);
        this.app.canvas.render();
    }

    onEnd(x, y) {}
}
