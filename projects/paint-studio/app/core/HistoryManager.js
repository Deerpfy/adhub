/**
 * HistoryManager - Undo/Redo system with layer snapshots
 */

export class HistoryManager {
    constructor(app) {
        this.app = app;
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 50; // Maximum history states
        this.isRecording = false;
        this.currentAction = null;
    }

    /**
     * Clear all history
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.updateButtons();
    }

    /**
     * Start recording an action
     */
    startAction() {
        if (this.isRecording) return;

        this.isRecording = true;

        // Save current state of active layer
        const layer = this.app.layers.getActiveLayer();
        if (layer) {
            this.currentAction = {
                layerIndex: this.app.layers.activeLayerIndex,
                layerId: layer.id,
                imageData: layer.canvas.getContext('2d').getImageData(
                    0, 0, layer.canvas.width, layer.canvas.height
                )
            };
        }
    }

    /**
     * End recording and push to history
     */
    endAction() {
        if (!this.isRecording || !this.currentAction) {
            this.isRecording = false;
            return;
        }

        this.isRecording = false;

        // Push current action to undo stack
        this.undoStack.push(this.currentAction);
        this.currentAction = null;

        // Clear redo stack (new action invalidates redo history)
        this.redoStack = [];

        // Limit history size
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }

        this.updateButtons();
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.undoStack.length === 0) return;

        const action = this.undoStack.pop();

        // Save current state for redo
        const layer = this.app.layers.getLayer(action.layerIndex);
        if (layer && layer.id === action.layerId) {
            const currentState = {
                layerIndex: action.layerIndex,
                layerId: action.layerId,
                imageData: layer.canvas.getContext('2d').getImageData(
                    0, 0, layer.canvas.width, layer.canvas.height
                )
            };
            this.redoStack.push(currentState);

            // Restore previous state
            const ctx = layer.canvas.getContext('2d');
            ctx.putImageData(action.imageData, 0, 0);

            this.app.canvas.render();
        }

        this.updateButtons();
    }

    /**
     * Redo last undone action
     */
    redo() {
        if (this.redoStack.length === 0) return;

        const action = this.redoStack.pop();

        // Save current state for undo
        const layer = this.app.layers.getLayer(action.layerIndex);
        if (layer && layer.id === action.layerId) {
            const currentState = {
                layerIndex: action.layerIndex,
                layerId: action.layerId,
                imageData: layer.canvas.getContext('2d').getImageData(
                    0, 0, layer.canvas.width, layer.canvas.height
                )
            };
            this.undoStack.push(currentState);

            // Restore redo state
            const ctx = layer.canvas.getContext('2d');
            ctx.putImageData(action.imageData, 0, 0);

            this.app.canvas.render();
        }

        this.updateButtons();
    }

    /**
     * Check if undo is available
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Update UI buttons
     */
    updateButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');

        if (undoBtn) {
            undoBtn.disabled = !this.canUndo();
        }
        if (redoBtn) {
            redoBtn.disabled = !this.canRedo();
        }
    }

    /**
     * Get history status
     */
    getStatus() {
        return {
            undoCount: this.undoStack.length,
            redoCount: this.redoStack.length,
            maxHistory: this.maxHistory
        };
    }
}
