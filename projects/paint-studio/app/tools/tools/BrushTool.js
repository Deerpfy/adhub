/**
 * BrushTool - Main brush drawing tool
 */

export class BrushTool {
    constructor(app) {
        this.app = app;
        this.name = 'brush';
        this.displayName = 'Štětec';
        this.lastX = 0;
        this.lastY = 0;
    }

    activate() {
        this.app.brush.setBrushType('round');
    }

    deactivate() {}

    onStart(x, y, pressure) {
        this.lastX = x;
        this.lastY = y;

        const ctx = this.app.layers.getActiveContext();
        if (!ctx) return;

        const color = this.app.color.getPrimaryColor();
        this.app.brush.drawPoint(ctx, x, y, pressure, color);
        this.app.canvas.render();
    }

    onMove(x, y, pressure, lastX, lastY) {
        const ctx = this.app.layers.getActiveContext();
        if (!ctx) return;

        const color = this.app.color.getPrimaryColor();
        this.app.brush.drawStroke(ctx, lastX, lastY, x, y, pressure, color);
        this.app.canvas.render();
    }

    onEnd(x, y) {
        // Stroke finished
    }
}
