/**
 * SelectLassoTool - Freehand lasso selection tool
 */

export class SelectLassoTool {
    constructor(app) {
        this.app = app;
        this.name = 'select-lasso';
        this.displayName = 'Lasso výběr';

        // Drawing state
        this.points = [];
        this.isDrawing = false;

        // Selection mode: replace, add, subtract, intersect
        this.mode = 'replace';
    }

    activate() {
        this.app.canvas.container.style.cursor = 'crosshair';
    }

    deactivate() {
        this.clearPreview();
        this.points = [];
    }

    onStart(x, y, pressure) {
        this.updateMode();
        this.points = [{ x, y }];
        this.isDrawing = true;
    }

    onMove(x, y, pressure, lastX, lastY) {
        if (!this.isDrawing) return;

        // Add point if moved enough
        const lastPoint = this.points[this.points.length - 1];
        const dist = Math.sqrt(Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2));

        if (dist > 3) {
            this.points.push({ x, y });
            this.drawPreview();
        }
    }

    onEnd(x, y) {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        // Close the path
        this.points.push({ x, y });

        // Need at least 3 points for a polygon
        if (this.points.length >= 3) {
            this.app.selection.selectLasso(this.points, this.mode);
        }

        this.points = [];
        this.clearPreview();
    }

    /**
     * Update selection mode based on modifier keys
     */
    updateMode() {
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
     * Draw lasso preview
     */
    drawPreview() {
        const ctx = this.app.canvas.getPreviewContext();
        if (!ctx || this.points.length < 2) return;

        ctx.clearRect(0, 0, this.app.canvas.width, this.app.canvas.height);

        // Draw lasso path
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);

        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }

        // Draw closing line to start point
        ctx.lineTo(this.points[0].x, this.points[0].y);

        // Fill with semi-transparent color
        ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
        ctx.fill();

        // Stroke outline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineDashOffset = 5;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        // Draw start point marker
        ctx.beginPath();
        ctx.arc(this.points[0].x, this.points[0].y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(139, 92, 246, 0.8)';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    /**
     * Clear preview
     */
    clearPreview() {
        const ctx = this.app.canvas.getPreviewContext();
        if (ctx) {
            ctx.clearRect(0, 0, this.app.canvas.width, this.app.canvas.height);
        }
        if (this.app.selection?.hasSelection) {
            this.app.selection.drawMarchingAnts();
        }
    }
}
