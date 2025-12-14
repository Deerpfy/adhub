/**
 * SelectRectangleTool - Rectangle selection tool
 */

export class SelectRectangleTool {
    constructor(app) {
        this.app = app;
        this.name = 'select-rectangle';
        this.displayName = 'Obdélníkový výběr';

        // Drawing state
        this.startPoint = null;
        this.endPoint = null;
        this.isDrawing = false;

        // Selection mode: replace, add, subtract, intersect
        this.mode = 'replace';
    }

    activate() {
        this.app.canvas.container.style.cursor = 'crosshair';
    }

    deactivate() {
        this.clearPreview();
    }

    onStart(x, y, pressure) {
        // Check modifier keys for mode
        this.updateMode();

        this.startPoint = { x, y };
        this.endPoint = { x, y };
        this.isDrawing = true;
    }

    onMove(x, y, pressure, lastX, lastY) {
        if (!this.isDrawing) return;
        this.endPoint = { x, y };
        this.drawPreview();
    }

    onEnd(x, y) {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        this.endPoint = { x, y };

        // Apply selection
        this.app.selection.selectRectangle(
            this.startPoint.x,
            this.startPoint.y,
            this.endPoint.x,
            this.endPoint.y,
            this.mode
        );

        this.clearPreview();
    }

    /**
     * Update selection mode based on modifier keys
     */
    updateMode() {
        // Shift = add, Alt = subtract, Shift+Alt = intersect
        const shift = this.app.canvas.shiftPressed;
        const alt = this.app.canvas.altPressed;

        if (shift && alt) {
            this.mode = 'intersect';
        } else if (shift) {
            this.mode = 'add';
        } else if (alt) {
            this.mode = 'subtract';
        } else {
            this.mode = 'replace';
        }
    }

    /**
     * Draw selection preview
     */
    drawPreview() {
        const ctx = this.app.canvas.getPreviewContext();
        if (!ctx) return;

        ctx.clearRect(0, 0, this.app.canvas.width, this.app.canvas.height);

        const x = Math.min(this.startPoint.x, this.endPoint.x);
        const y = Math.min(this.startPoint.y, this.endPoint.y);
        const w = Math.abs(this.endPoint.x - this.startPoint.x);
        const h = Math.abs(this.endPoint.y - this.startPoint.y);

        // Draw selection rectangle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x, y, w, h);

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineDashOffset = 5;
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        // Draw dimensions
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y - 20, 80, 18);
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.fillText(`${Math.round(w)} × ${Math.round(h)}`, x + 5, y - 6);
    }

    /**
     * Clear preview
     */
    clearPreview() {
        const ctx = this.app.canvas.getPreviewContext();
        if (ctx) {
            ctx.clearRect(0, 0, this.app.canvas.width, this.app.canvas.height);
        }
        // Re-draw marching ants if there's a selection
        if (this.app.selection?.hasSelection) {
            this.app.selection.drawMarchingAnts();
        }
    }
}
