/**
 * PDF Editor - Overlay Editor Module
 * Handles text overlay, annotations, shapes using Fabric.js
 */

const PDFEditor = {
    // Fabric.js canvas
    fabricCanvas: null,

    // Current tool
    currentTool: 'select', // select, text, highlight, rectangle, circle, line, freehand

    // Tool settings
    settings: {
        textColor: '#000000',
        textSize: 16,
        fontFamily: 'Helvetica',
        highlightColor: 'rgba(255, 255, 0, 0.3)',
        strokeColor: '#ff0000',
        strokeWidth: 2,
        fillColor: 'transparent',
        opacity: 1
    },

    // Page annotations storage (per page)
    pageAnnotations: {},

    // Current page
    currentPage: 1,

    // History for undo/redo
    history: [],
    historyIndex: -1,
    maxHistory: 50,

    // Callbacks
    onObjectAdded: null,
    onObjectModified: null,
    onHistoryChange: null,

    /**
     * Initialize the editor with a canvas element
     * @param {string|HTMLCanvasElement} canvasElement - Canvas element or ID
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    init(canvasElement, width, height) {
        // Dispose existing canvas if any
        if (this.fabricCanvas) {
            this.fabricCanvas.dispose();
        }

        // Create Fabric canvas
        this.fabricCanvas = new fabric.Canvas(canvasElement, {
            width: width,
            height: height,
            selection: true,
            preserveObjectStacking: true,
            renderOnAddRemove: true
        });

        // Get the wrapper that Fabric.js creates and ensure proper positioning
        const wrapper = this.fabricCanvas.wrapperEl;
        if (wrapper) {
            wrapper.style.position = 'absolute';
            wrapper.style.top = '0';
            wrapper.style.left = '0';
            wrapper.style.pointerEvents = 'auto';
        }

        // Setup event listeners
        this._setupEventListeners();

        // Initialize history
        this.history = [];
        this.historyIndex = -1;
        this.pageAnnotations = {};

        console.log('PDF Editor initialized with dimensions:', width, 'x', height);
    },

    /**
     * Setup Fabric.js event listeners
     */
    _setupEventListeners() {
        // Object added
        this.fabricCanvas.on('object:added', (e) => {
            if (!e.target._isHistoryAction) {
                this._saveToHistory();
            }
            if (this.onObjectAdded) {
                this.onObjectAdded(e.target);
            }
        });

        // Object modified
        this.fabricCanvas.on('object:modified', (e) => {
            this._saveToHistory();
            if (this.onObjectModified) {
                this.onObjectModified(e.target);
            }
        });

        // Mouse events for drawing tools
        this.fabricCanvas.on('mouse:down', (e) => this._handleMouseDown(e));
        this.fabricCanvas.on('mouse:move', (e) => this._handleMouseMove(e));
        this.fabricCanvas.on('mouse:up', (e) => this._handleMouseUp(e));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this._handleKeyDown(e));
    },

    /**
     * Set canvas dimensions
     * @param {number} width - Width
     * @param {number} height - Height
     */
    setDimensions(width, height) {
        if (this.fabricCanvas) {
            this.fabricCanvas.setWidth(width);
            this.fabricCanvas.setHeight(height);

            // Update wrapper dimensions as well
            const wrapper = this.fabricCanvas.wrapperEl;
            if (wrapper) {
                wrapper.style.width = width + 'px';
                wrapper.style.height = height + 'px';
                wrapper.style.position = 'absolute';
                wrapper.style.top = '0';
                wrapper.style.left = '0';
            }

            this.fabricCanvas.renderAll();
        }
    },

    /**
     * Set current tool
     * @param {string} tool - Tool name
     */
    setTool(tool) {
        this.currentTool = tool;

        // Reset drawing mode
        this.fabricCanvas.isDrawingMode = false;

        switch (tool) {
            case 'select':
                this.fabricCanvas.selection = true;
                this.fabricCanvas.forEachObject(obj => {
                    obj.selectable = true;
                    obj.evented = true;
                });
                break;

            case 'freehand':
                this.fabricCanvas.isDrawingMode = true;
                this.fabricCanvas.freeDrawingBrush.color = this.settings.strokeColor;
                this.fabricCanvas.freeDrawingBrush.width = this.settings.strokeWidth;
                break;

            case 'text':
            case 'highlight':
            case 'rectangle':
            case 'circle':
            case 'line':
                this.fabricCanvas.selection = false;
                this.fabricCanvas.forEachObject(obj => {
                    obj.selectable = false;
                    obj.evented = false;
                });
                break;
        }

        this.fabricCanvas.renderAll();
    },

    /**
     * Update tool settings
     * @param {Object} newSettings - Settings to update
     */
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);

        // Update freehand brush if active
        if (this.fabricCanvas.isDrawingMode) {
            this.fabricCanvas.freeDrawingBrush.color = this.settings.strokeColor;
            this.fabricCanvas.freeDrawingBrush.width = this.settings.strokeWidth;
        }
    },

    // Drawing state
    _isDrawing: false,
    _startPoint: null,
    _currentShape: null,

    /**
     * Handle mouse down
     */
    _handleMouseDown(e) {
        if (this.currentTool === 'select' || this.currentTool === 'freehand') return;

        const pointer = this.fabricCanvas.getPointer(e.e);
        this._isDrawing = true;
        this._startPoint = pointer;

        switch (this.currentTool) {
            case 'text':
                this._addText(pointer.x, pointer.y);
                this._isDrawing = false;
                break;

            case 'highlight':
                this._currentShape = new fabric.Rect({
                    left: pointer.x,
                    top: pointer.y,
                    width: 0,
                    height: 20,
                    fill: this.settings.highlightColor,
                    selectable: false,
                    evented: false
                });
                this.fabricCanvas.add(this._currentShape);
                break;

            case 'rectangle':
                this._currentShape = new fabric.Rect({
                    left: pointer.x,
                    top: pointer.y,
                    width: 0,
                    height: 0,
                    fill: this.settings.fillColor,
                    stroke: this.settings.strokeColor,
                    strokeWidth: this.settings.strokeWidth,
                    selectable: false,
                    evented: false
                });
                this.fabricCanvas.add(this._currentShape);
                break;

            case 'circle':
                this._currentShape = new fabric.Circle({
                    left: pointer.x,
                    top: pointer.y,
                    radius: 0,
                    fill: this.settings.fillColor,
                    stroke: this.settings.strokeColor,
                    strokeWidth: this.settings.strokeWidth,
                    selectable: false,
                    evented: false
                });
                this.fabricCanvas.add(this._currentShape);
                break;

            case 'line':
                this._currentShape = new fabric.Line(
                    [pointer.x, pointer.y, pointer.x, pointer.y],
                    {
                        stroke: this.settings.strokeColor,
                        strokeWidth: this.settings.strokeWidth,
                        selectable: false,
                        evented: false
                    }
                );
                this.fabricCanvas.add(this._currentShape);
                break;
        }
    },

    /**
     * Handle mouse move
     */
    _handleMouseMove(e) {
        if (!this._isDrawing || !this._currentShape) return;

        const pointer = this.fabricCanvas.getPointer(e.e);

        switch (this.currentTool) {
            case 'highlight':
                const highlightWidth = pointer.x - this._startPoint.x;
                this._currentShape.set({
                    width: Math.abs(highlightWidth),
                    left: highlightWidth < 0 ? pointer.x : this._startPoint.x
                });
                break;

            case 'rectangle':
                const rectWidth = pointer.x - this._startPoint.x;
                const rectHeight = pointer.y - this._startPoint.y;
                this._currentShape.set({
                    width: Math.abs(rectWidth),
                    height: Math.abs(rectHeight),
                    left: rectWidth < 0 ? pointer.x : this._startPoint.x,
                    top: rectHeight < 0 ? pointer.y : this._startPoint.y
                });
                break;

            case 'circle':
                const radius = Math.sqrt(
                    Math.pow(pointer.x - this._startPoint.x, 2) +
                    Math.pow(pointer.y - this._startPoint.y, 2)
                ) / 2;
                this._currentShape.set({
                    radius: radius,
                    left: (this._startPoint.x + pointer.x) / 2 - radius,
                    top: (this._startPoint.y + pointer.y) / 2 - radius
                });
                break;

            case 'line':
                this._currentShape.set({
                    x2: pointer.x,
                    y2: pointer.y
                });
                break;
        }

        this.fabricCanvas.renderAll();
    },

    /**
     * Handle mouse up
     */
    _handleMouseUp(e) {
        if (!this._isDrawing) return;

        this._isDrawing = false;

        if (this._currentShape) {
            // Make shape selectable
            this._currentShape.set({
                selectable: true,
                evented: true
            });

            // Save to history
            this._saveToHistory();

            this._currentShape = null;
        }

        // Switch back to select tool after adding shape
        if (this.currentTool !== 'freehand') {
            this.setTool('select');
        }
    },

    /**
     * Handle keyboard shortcuts
     */
    _handleKeyDown(e) {
        // Check if input is focused
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // Delete selected objects
        if (e.key === 'Delete' || e.key === 'Backspace') {
            this.deleteSelected();
            e.preventDefault();
        }

        // Undo: Ctrl+Z
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            this.undo();
            e.preventDefault();
        }

        // Redo: Ctrl+Y or Ctrl+Shift+Z
        if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
            this.redo();
            e.preventDefault();
        }

        // Copy: Ctrl+C
        if (e.ctrlKey && e.key === 'c') {
            this._copyObject();
            e.preventDefault();
        }

        // Paste: Ctrl+V
        if (e.ctrlKey && e.key === 'v') {
            this._pasteObject();
            e.preventDefault();
        }

        // Select all: Ctrl+A
        if (e.ctrlKey && e.key === 'a') {
            this.selectAll();
            e.preventDefault();
        }
    },

    // Clipboard for copy/paste
    _clipboard: null,

    /**
     * Copy selected object
     */
    _copyObject() {
        const activeObject = this.fabricCanvas.getActiveObject();
        if (activeObject) {
            activeObject.clone((cloned) => {
                this._clipboard = cloned;
            });
        }
    },

    /**
     * Paste copied object
     */
    _pasteObject() {
        if (!this._clipboard) return;

        this._clipboard.clone((cloned) => {
            this.fabricCanvas.discardActiveObject();

            cloned.set({
                left: cloned.left + 20,
                top: cloned.top + 20,
                evented: true
            });

            if (cloned.type === 'activeSelection') {
                cloned.canvas = this.fabricCanvas;
                cloned.forEachObject((obj) => {
                    this.fabricCanvas.add(obj);
                });
                cloned.setCoords();
            } else {
                this.fabricCanvas.add(cloned);
            }

            this._clipboard.top += 20;
            this._clipboard.left += 20;

            this.fabricCanvas.setActiveObject(cloned);
            this.fabricCanvas.renderAll();
        });
    },

    /**
     * Add text at position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} initialText - Initial text content
     */
    _addText(x, y, initialText = '') {
        const text = new fabric.IText(initialText || 'Text', {
            left: x,
            top: y,
            fontFamily: this.settings.fontFamily,
            fontSize: this.settings.textSize,
            fill: this.settings.textColor,
            editable: true
        });

        this.fabricCanvas.add(text);
        this.fabricCanvas.setActiveObject(text);

        // Enter editing mode
        text.enterEditing();
        text.selectAll();

        this.fabricCanvas.renderAll();
    },

    /**
     * Add text box
     * @param {string} text - Text content
     * @param {Object} options - Options (x, y, width, fontSize, color, fontFamily)
     */
    addTextBox(text, options = {}) {
        const textBox = new fabric.Textbox(text, {
            left: options.x || 50,
            top: options.y || 50,
            width: options.width || 200,
            fontFamily: options.fontFamily || this.settings.fontFamily,
            fontSize: options.fontSize || this.settings.textSize,
            fill: options.color || this.settings.textColor,
            editable: true
        });

        this.fabricCanvas.add(textBox);
        this.fabricCanvas.setActiveObject(textBox);
        this.fabricCanvas.renderAll();

        return textBox;
    },

    /**
     * Add image
     * @param {string} imageUrl - Image URL or data URL
     * @param {Object} options - Options (x, y, scale)
     * @returns {Promise<fabric.Image>}
     */
    async addImage(imageUrl, options = {}) {
        return new Promise((resolve) => {
            fabric.Image.fromURL(imageUrl, (img) => {
                img.set({
                    left: options.x || 50,
                    top: options.y || 50,
                    scaleX: options.scale || 1,
                    scaleY: options.scale || 1
                });

                this.fabricCanvas.add(img);
                this.fabricCanvas.setActiveObject(img);
                this.fabricCanvas.renderAll();

                resolve(img);
            }, { crossOrigin: 'anonymous' });
        });
    },

    /**
     * Add white rectangle (for covering text)
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     */
    addWhiteout(x, y, width, height) {
        const rect = new fabric.Rect({
            left: x,
            top: y,
            width: width,
            height: height,
            fill: '#ffffff',
            stroke: null,
            strokeWidth: 0
        });

        this.fabricCanvas.add(rect);
        this.fabricCanvas.renderAll();

        return rect;
    },

    /**
     * Select all objects
     */
    selectAll() {
        const objects = this.fabricCanvas.getObjects();
        if (objects.length === 0) return;

        this.fabricCanvas.discardActiveObject();

        const selection = new fabric.ActiveSelection(objects, {
            canvas: this.fabricCanvas
        });

        this.fabricCanvas.setActiveObject(selection);
        this.fabricCanvas.renderAll();
    },

    /**
     * Delete selected objects
     */
    deleteSelected() {
        const activeObjects = this.fabricCanvas.getActiveObjects();
        if (activeObjects.length === 0) return;

        this.fabricCanvas.discardActiveObject();
        activeObjects.forEach(obj => {
            this.fabricCanvas.remove(obj);
        });

        this._saveToHistory();
        this.fabricCanvas.renderAll();
    },

    /**
     * Clear all objects
     */
    clearAll() {
        this.fabricCanvas.clear();
        this._saveToHistory();
    },

    /**
     * Save current state to history
     */
    _saveToHistory() {
        // Remove any future states
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Add current state
        const state = JSON.stringify(this.fabricCanvas.toJSON());
        this.history.push(state);

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        this.historyIndex = this.history.length - 1;

        if (this.onHistoryChange) {
            this.onHistoryChange({
                canUndo: this.historyIndex > 0,
                canRedo: this.historyIndex < this.history.length - 1
            });
        }
    },

    /**
     * Undo last action
     */
    undo() {
        if (this.historyIndex <= 0) return;

        this.historyIndex--;
        this._loadState(this.history[this.historyIndex]);
    },

    /**
     * Redo last undone action
     */
    redo() {
        if (this.historyIndex >= this.history.length - 1) return;

        this.historyIndex++;
        this._loadState(this.history[this.historyIndex]);
    },

    /**
     * Load state from history
     */
    _loadState(state) {
        this.fabricCanvas.loadFromJSON(state, () => {
            this.fabricCanvas.renderAll();

            if (this.onHistoryChange) {
                this.onHistoryChange({
                    canUndo: this.historyIndex > 0,
                    canRedo: this.historyIndex < this.history.length - 1
                });
            }
        });
    },

    /**
     * Save annotations for current page
     * @param {number} pageNum - Page number
     */
    savePageAnnotations(pageNum) {
        const state = this.fabricCanvas.toJSON();
        this.pageAnnotations[pageNum] = state;
    },

    /**
     * Load annotations for a page
     * @param {number} pageNum - Page number
     */
    loadPageAnnotations(pageNum) {
        this.currentPage = pageNum;

        if (this.pageAnnotations[pageNum]) {
            this.fabricCanvas.loadFromJSON(this.pageAnnotations[pageNum], () => {
                this.fabricCanvas.renderAll();
            });
        } else {
            this.fabricCanvas.clear();
            this.fabricCanvas.renderAll();
        }

        // Reset history for new page
        this.history = [];
        this.historyIndex = -1;
        this._saveToHistory();
    },

    /**
     * Get all annotations for export
     * @returns {Object}
     */
    getAllAnnotations() {
        // Save current page first
        this.savePageAnnotations(this.currentPage);
        return this.pageAnnotations;
    },

    /**
     * Export canvas as image
     * @param {string} format - Format ('png', 'jpeg')
     * @returns {string} - Data URL
     */
    exportAsImage(format = 'png') {
        return this.fabricCanvas.toDataURL({
            format: format,
            quality: 1
        });
    },

    /**
     * Get objects on canvas
     * @returns {Array}
     */
    getObjects() {
        return this.fabricCanvas.getObjects();
    },

    /**
     * Convert fabric object to pdf-lib coordinates
     * Note: Canvas origin is top-left, PDF origin is bottom-left
     * @param {fabric.Object} obj - Fabric object
     * @param {number} pdfHeight - PDF page height
     * @param {number} scale - Current view scale
     * @returns {Object}
     */
    toPDFCoordinates(obj, pdfHeight, scale = 1) {
        return {
            x: obj.left / scale,
            y: pdfHeight - (obj.top + obj.height * obj.scaleY) / scale,
            width: (obj.width * obj.scaleX) / scale,
            height: (obj.height * obj.scaleY) / scale,
            rotation: -obj.angle // PDF rotation is counter-clockwise
        };
    },

    /**
     * Dispose of the editor
     */
    dispose() {
        if (this.fabricCanvas) {
            this.fabricCanvas.dispose();
            this.fabricCanvas = null;
        }

        this.pageAnnotations = {};
        this.history = [];
        this.historyIndex = -1;
    }
};

// Export for use in other modules
window.PDFEditor = PDFEditor;
