/**
 * PencilTool - Hard edge pencil tool
 */

export class PencilTool {
    constructor(app) {
        this.app = app;
        this.name = 'pencil';
        this.displayName = 'Tužka';
    }

    activate() {
        this.app.brush.setBrushType('pixel');
        this.app.brush.hardness = 1;
    }

    deactivate() {}

    onStart(x, y, pressure) {
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

    onEnd(x, y) {}
}
