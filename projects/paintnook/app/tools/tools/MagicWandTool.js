/**
 * MagicWandTool - Color-based selection tool
 */

export class MagicWandTool {
    constructor(app) {
        this.app = app;
        this.name = 'magic-wand';
        this.displayName = 'Kouzelná hůlka';

        // Settings
        this.tolerance = 32; // 0-255
        this.contiguous = true; // Select only connected pixels
        this.sampleMerged = false; // Sample all visible layers

        // Selection mode
        this.mode = 'replace';
    }

    activate() {
        this.app.canvas.container.style.cursor = 'crosshair';
    }

    deactivate() {
        // Nothing to clean up
    }

    onStart(x, y, pressure) {
        this.updateMode();

        // Perform magic wand selection at click point
        this.app.selection.selectMagicWand(
            Math.floor(x),
            Math.floor(y),
            this.tolerance,
            this.contiguous,
            this.sampleMerged
        );
    }

    onMove(x, y, pressure, lastX, lastY) {
        // Magic wand doesn't do anything on move
    }

    onEnd(x, y) {
        // Nothing on end
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
     * Set tolerance
     */
    setTolerance(value) {
        this.tolerance = Math.max(0, Math.min(255, value));
    }

    /**
     * Toggle contiguous mode
     */
    setContiguous(value) {
        this.contiguous = value;
    }

    /**
     * Toggle sample merged
     */
    setSampleMerged(value) {
        this.sampleMerged = value;
    }
}
