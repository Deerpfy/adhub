/**
 * LayerManager - Manages layers with blend modes
 */

export class LayerManager {
    constructor(app) {
        this.app = app;
        this.layers = [];
        this.activeLayerIndex = 0;
        this.maxLayers = 32; // Similar to Procreate's limit concept
    }

    /**
     * Initialize layer manager
     */
    init() {
        // Layers will be created when project is initialized
    }

    /**
     * Clear all layers
     */
    clear() {
        this.layers = [];
        this.activeLayerIndex = 0;
    }

    /**
     * Add a new layer
     */
    addLayer(name = 'Nová vrstva', index = null) {
        if (this.layers.length >= this.maxLayers) {
            console.warn('Maximum number of layers reached');
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = this.app.canvas.width;
        canvas.height = this.app.canvas.height;

        const layer = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name,
            canvas,
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over'
        };

        if (index !== null && index >= 0 && index <= this.layers.length) {
            this.layers.splice(index, 0, layer);
        } else {
            this.layers.push(layer);
        }

        this.app.ui?.updateLayersList();
        return layer;
    }

    /**
     * Remove a layer by index
     */
    removeLayer(index) {
        if (this.layers.length <= 1) {
            console.warn('Cannot remove the last layer');
            return false;
        }

        if (index < 0 || index >= this.layers.length) {
            return false;
        }

        // Check if layer is locked
        if (this.layers[index].locked) {
            console.warn('Cannot remove locked layer');
            return false;
        }

        this.layers.splice(index, 1);

        // Adjust active layer index
        if (this.activeLayerIndex >= this.layers.length) {
            this.activeLayerIndex = this.layers.length - 1;
        }

        this.app.canvas.render();
        this.app.ui?.updateLayersList();
        return true;
    }

    /**
     * Duplicate a layer
     */
    duplicateLayer(index) {
        if (index < 0 || index >= this.layers.length) return null;
        if (this.layers.length >= this.maxLayers) return null;

        const sourceLayer = this.layers[index];
        const newLayer = this.addLayer(`${sourceLayer.name} kopie`, index + 1);

        if (newLayer) {
            const ctx = newLayer.canvas.getContext('2d');
            ctx.drawImage(sourceLayer.canvas, 0, 0);
            newLayer.opacity = sourceLayer.opacity;
            newLayer.blendMode = sourceLayer.blendMode;
            this.app.canvas.render();
        }

        return newLayer;
    }

    /**
     * Merge layer with the one below
     */
    mergeDown(index) {
        if (index <= 0 || index >= this.layers.length) return false;

        const upperLayer = this.layers[index];
        const lowerLayer = this.layers[index - 1];

        if (lowerLayer.locked) return false;

        const ctx = lowerLayer.canvas.getContext('2d');
        ctx.save();
        ctx.globalAlpha = upperLayer.opacity;
        ctx.globalCompositeOperation = upperLayer.blendMode;
        ctx.drawImage(upperLayer.canvas, 0, 0);
        ctx.restore();

        this.removeLayer(index);
        return true;
    }

    /**
     * Flatten all layers to background
     */
    flattenAll() {
        if (this.layers.length <= 1) return;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.app.canvas.width;
        tempCanvas.height = this.app.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Composite all layers
        this.layers.forEach(layer => {
            if (!layer.visible) return;
            tempCtx.save();
            tempCtx.globalAlpha = layer.opacity;
            tempCtx.globalCompositeOperation = layer.blendMode;
            tempCtx.drawImage(layer.canvas, 0, 0);
            tempCtx.restore();
        });

        // Replace all layers with one
        this.clear();
        const flatLayer = this.addLayer('Pozadí');
        const ctx = flatLayer.canvas.getContext('2d');
        ctx.drawImage(tempCanvas, 0, 0);

        this.app.canvas.render();
        this.app.ui?.updateLayersList();
    }

    /**
     * Move layer up
     */
    moveLayerUp(index) {
        if (index <= 0 || index >= this.layers.length) return false;

        const temp = this.layers[index];
        this.layers[index] = this.layers[index - 1];
        this.layers[index - 1] = temp;

        if (this.activeLayerIndex === index) {
            this.activeLayerIndex = index - 1;
        } else if (this.activeLayerIndex === index - 1) {
            this.activeLayerIndex = index;
        }

        this.app.canvas.render();
        this.app.ui?.updateLayersList();
        return true;
    }

    /**
     * Move layer down
     */
    moveLayerDown(index) {
        if (index < 0 || index >= this.layers.length - 1) return false;

        const temp = this.layers[index];
        this.layers[index] = this.layers[index + 1];
        this.layers[index + 1] = temp;

        if (this.activeLayerIndex === index) {
            this.activeLayerIndex = index + 1;
        } else if (this.activeLayerIndex === index + 1) {
            this.activeLayerIndex = index;
        }

        this.app.canvas.render();
        this.app.ui?.updateLayersList();
        return true;
    }

    /**
     * Set active layer
     */
    setActiveLayer(index) {
        if (index < 0 || index >= this.layers.length) return;
        this.activeLayerIndex = index;
        this.app.ui?.updateLayersList();
    }

    /**
     * Get active layer
     */
    getActiveLayer() {
        return this.layers[this.activeLayerIndex] || null;
    }

    /**
     * Get active layer context
     */
    getActiveContext() {
        const layer = this.getActiveLayer();
        return layer ? layer.canvas.getContext('2d') : null;
    }

    /**
     * Get all layers
     */
    getLayers() {
        return this.layers;
    }

    /**
     * Get layer by index
     */
    getLayer(index) {
        return this.layers[index] || null;
    }

    /**
     * Get layer index by ID
     */
    getLayerIndexById(id) {
        return this.layers.findIndex(l => l.id === id);
    }

    /**
     * Toggle layer visibility
     */
    toggleVisibility(index) {
        if (index < 0 || index >= this.layers.length) return;
        this.layers[index].visible = !this.layers[index].visible;
        this.app.canvas.render();
        this.app.ui?.updateLayersList();
    }

    /**
     * Toggle layer lock
     */
    toggleLock(index) {
        if (index < 0 || index >= this.layers.length) return;
        this.layers[index].locked = !this.layers[index].locked;
        this.app.ui?.updateLayersList();
    }

    /**
     * Set layer opacity
     */
    setLayerOpacity(index, opacity) {
        if (index < 0 || index >= this.layers.length) return;
        this.layers[index].opacity = Math.max(0, Math.min(1, opacity));
        this.app.canvas.render();
        this.app.ui?.updateLayersList();
    }

    /**
     * Set layer blend mode
     */
    setLayerBlendMode(index, blendMode) {
        if (index < 0 || index >= this.layers.length) return;
        this.layers[index].blendMode = blendMode;
        this.app.canvas.render();
    }

    /**
     * Rename layer
     */
    renameLayer(index, name) {
        if (index < 0 || index >= this.layers.length) return;
        this.layers[index].name = name;
        this.app.ui?.updateLayersList();
    }

    /**
     * Clear active layer
     */
    clearActiveLayer() {
        const layer = this.getActiveLayer();
        if (!layer || layer.locked) return;

        const ctx = layer.canvas.getContext('2d');
        ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        this.app.canvas.render();
    }

    /**
     * Serialize layers for saving
     */
    async serialize() {
        return this.layers.map(layer => ({
            id: layer.id,
            name: layer.name,
            visible: layer.visible,
            locked: layer.locked,
            opacity: layer.opacity,
            blendMode: layer.blendMode,
            data: layer.canvas.toDataURL('image/png')
        }));
    }

    /**
     * Deserialize layers from saved data
     */
    async deserialize(layersData) {
        this.clear();

        for (const data of layersData) {
            const layer = this.addLayer(data.name);
            if (layer) {
                layer.id = data.id;
                layer.visible = data.visible;
                layer.locked = data.locked;
                layer.opacity = data.opacity;
                layer.blendMode = data.blendMode;

                // Load image data
                await this.loadLayerImage(layer, data.data);
            }
        }

        this.setActiveLayer(Math.min(1, this.layers.length - 1));
    }

    /**
     * Load image data into layer
     */
    loadLayerImage(layer, dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const ctx = layer.canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve();
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
    }

    /**
     * Get thumbnail for layer
     */
    getLayerThumbnail(index, size = 36) {
        const layer = this.layers[index];
        if (!layer) return null;

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        const scale = Math.min(size / layer.canvas.width, size / layer.canvas.height);
        const width = layer.canvas.width * scale;
        const height = layer.canvas.height * scale;
        const x = (size - width) / 2;
        const y = (size - height) / 2;

        // Draw checkerboard background for transparency
        ctx.fillStyle = '#444';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#666';
        for (let i = 0; i < size; i += 4) {
            for (let j = 0; j < size; j += 4) {
                if ((i + j) % 8 === 0) {
                    ctx.fillRect(i, j, 4, 4);
                }
            }
        }

        ctx.drawImage(layer.canvas, x, y, width, height);
        return canvas;
    }

    /**
     * Get content bounds for a layer
     */
    getContentBounds(layer) {
        const ctx = layer.canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
        const data = imageData.data;
        const w = imageData.width;
        const h = imageData.height;

        let minX = w, minY = h, maxX = 0, maxY = 0;
        let hasContent = false;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const alpha = data[(y * w + x) * 4 + 3];
                if (alpha > 0) {
                    hasContent = true;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        if (!hasContent) {
            return null;
        }

        return {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
        };
    }

    /**
     * Move layer content
     */
    moveLayerContent(layer, offsetX, offsetY) {
        if (!layer || layer.locked) return;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = layer.canvas.width;
        tempCanvas.height = layer.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(layer.canvas, 0, 0);

        const ctx = layer.canvas.getContext('2d');
        ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        ctx.drawImage(tempCanvas, offsetX, offsetY);

        this.app.canvas.render();
    }

    /**
     * Align active layer horizontally
     */
    alignLayerHorizontal(alignment) {
        const layer = this.getActiveLayer();
        if (!layer || layer.locked) return;

        const bounds = this.getContentBounds(layer);
        if (!bounds) return;

        let offsetX = 0;
        const canvasWidth = this.app.canvas.width;

        switch (alignment) {
            case 'left':
                offsetX = -bounds.x;
                break;
            case 'center':
                offsetX = (canvasWidth - bounds.width) / 2 - bounds.x;
                break;
            case 'right':
                offsetX = canvasWidth - bounds.width - bounds.x;
                break;
        }

        if (offsetX !== 0) {
            this.moveLayerContent(layer, Math.round(offsetX), 0);
        }
    }

    /**
     * Align active layer vertically
     */
    alignLayerVertical(alignment) {
        const layer = this.getActiveLayer();
        if (!layer || layer.locked) return;

        const bounds = this.getContentBounds(layer);
        if (!bounds) return;

        let offsetY = 0;
        const canvasHeight = this.app.canvas.height;

        switch (alignment) {
            case 'top':
                offsetY = -bounds.y;
                break;
            case 'middle':
                offsetY = (canvasHeight - bounds.height) / 2 - bounds.y;
                break;
            case 'bottom':
                offsetY = canvasHeight - bounds.height - bounds.y;
                break;
        }

        if (offsetY !== 0) {
            this.moveLayerContent(layer, 0, Math.round(offsetY));
        }
    }

    /**
     * Center layer content on canvas
     */
    centerLayer() {
        const layer = this.getActiveLayer();
        if (!layer || layer.locked) return;

        const bounds = this.getContentBounds(layer);
        if (!bounds) return;

        const canvasWidth = this.app.canvas.width;
        const canvasHeight = this.app.canvas.height;

        const offsetX = (canvasWidth - bounds.width) / 2 - bounds.x;
        const offsetY = (canvasHeight - bounds.height) / 2 - bounds.y;

        if (offsetX !== 0 || offsetY !== 0) {
            this.moveLayerContent(layer, Math.round(offsetX), Math.round(offsetY));
        }
    }

    /**
     * Select all layers
     */
    selectAllLayers() {
        this.selectedLayers = this.layers.map((_, index) => index);
        this.app.ui?.updateLayersList();
    }

    /**
     * Deselect all layers
     */
    deselectAllLayers() {
        this.selectedLayers = [];
        this.app.ui?.updateLayersList();
    }
}
