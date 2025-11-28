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

    // Text editing cache per page (for persisting changes during Edit PDF mode)
    textEditingCache: {},

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

        // Reset dimensions tracking for new PDF
        this.lastWidth = width;
        this.lastHeight = height;

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

        // OPRAVA: Přidat listener na scroll parent kontejneru pro přepočítání offsetu
        const scrollContainer = document.querySelector('.pdf-canvas-container');
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', () => {
                if (this.fabricCanvas) {
                    this.fabricCanvas.calcOffset();
                }
            });
        }

        // Setup event listeners
        this._setupEventListeners();

        // Initialize history
        this.history = [];
        this.historyIndex = -1;
        this.pageAnnotations = {};

        // Přepočítat offset při inicializaci
        setTimeout(() => {
            if (this.fabricCanvas) {
                this.fabricCanvas.calcOffset();
            }
        }, 100);

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

    // Store last dimensions for scaling calculations
    lastWidth: 0,
    lastHeight: 0,

    /**
     * Set canvas dimensions and scale objects proportionally
     * @param {number} width - Width
     * @param {number} height - Height
     */
    setDimensions(width, height) {
        if (!this.fabricCanvas) return;

        // Calculate scale factor based on previous dimensions
        const previousWidth = this.lastWidth || width;
        const previousHeight = this.lastHeight || height;
        const scaleFactor = width / previousWidth;

        // Only scale if there's an actual change in size
        const needsScaling = this.lastWidth > 0 && Math.abs(scaleFactor - 1) > 0.001;

        // Update canvas size
        this.fabricCanvas.setWidth(width);
        this.fabricCanvas.setHeight(height);

        // Update wrapper dimensions
        const wrapper = this.fabricCanvas.wrapperEl;
        if (wrapper) {
            wrapper.style.width = width + 'px';
            wrapper.style.height = height + 'px';
            wrapper.style.position = 'absolute';
            wrapper.style.top = '0';
            wrapper.style.left = '0';
        }

        // Scale all objects proportionally
        if (needsScaling) {
            const objects = this.fabricCanvas.getObjects();
            objects.forEach(obj => {
                // Scale position
                obj.set({
                    left: obj.left * scaleFactor,
                    top: obj.top * scaleFactor,
                    scaleX: obj.scaleX * scaleFactor,
                    scaleY: obj.scaleY * scaleFactor
                });
                obj.setCoords();
            });
        }

        // Store current dimensions for next scaling calculation
        this.lastWidth = width;
        this.lastHeight = height;

        // OPRAVA: Přepočítat offset canvasu pro správné pozicování myši
        this.fabricCanvas.calcOffset();

        this.fabricCanvas.renderAll();
    },

    /**
     * Reset dimensions tracking (call when loading new PDF)
     */
    resetDimensions() {
        this.lastWidth = 0;
        this.lastHeight = 0;
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

        // Add current state - včetně vlastních vlastností (text i obrázky)
        const state = JSON.stringify(this.fabricCanvas.toJSON([
            '_isTextBackground',
            '_isExtractedText',
            '_textIndex',
            '_originalText',
            '_originalFont',
            '_savedTextEdit',
            '_isExtractedImage',
            '_imageIndex',
            '_originalX',
            '_originalY',
            '_originalWidth',
            '_originalHeight',
            '_imageName',
            '_savedImageEdit'
        ]));
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
     * OPRAVENO: Zachovat pozice wrapper elementu a vlastní vlastnosti
     */
    _loadState(state) {
        // Uložit aktuální rozměry před načtením
        const currentWidth = this.fabricCanvas.getWidth();
        const currentHeight = this.fabricCanvas.getHeight();

        // Parse state pro získání vlastních vlastností
        const parsedState = typeof state === 'string' ? JSON.parse(state) : state;

        this.fabricCanvas.loadFromJSON(parsedState, () => {
            // OPRAVENO: Obnovit rozměry a pozici wrapper elementu
            this.fabricCanvas.setWidth(currentWidth);
            this.fabricCanvas.setHeight(currentHeight);

            // Zajistit správnou pozici wrapperu
            const wrapper = this.fabricCanvas.wrapperEl;
            if (wrapper) {
                wrapper.style.position = 'absolute';
                wrapper.style.top = '0';
                wrapper.style.left = '0';
                wrapper.style.width = currentWidth + 'px';
                wrapper.style.height = currentHeight + 'px';
            }

            // OPRAVENO: Aplikovat vlastní vlastnosti z parsedState na živé objekty
            const objects = this.fabricCanvas.getObjects();
            if (parsedState.objects && objects.length === parsedState.objects.length) {
                objects.forEach((obj, index) => {
                    const savedObj = parsedState.objects[index];
                    // Aplikovat vlastní vlastnosti pro text
                    if (savedObj._isTextBackground !== undefined) obj._isTextBackground = savedObj._isTextBackground;
                    if (savedObj._isExtractedText !== undefined) obj._isExtractedText = savedObj._isExtractedText;
                    if (savedObj._textIndex !== undefined) obj._textIndex = savedObj._textIndex;
                    if (savedObj._originalText !== undefined) obj._originalText = savedObj._originalText;
                    if (savedObj._originalFont !== undefined) obj._originalFont = savedObj._originalFont;
                    if (savedObj._savedTextEdit !== undefined) obj._savedTextEdit = savedObj._savedTextEdit;
                    // Aplikovat vlastní vlastnosti pro obrázky
                    if (savedObj._isExtractedImage !== undefined) obj._isExtractedImage = savedObj._isExtractedImage;
                    if (savedObj._imageIndex !== undefined) obj._imageIndex = savedObj._imageIndex;
                    if (savedObj._originalX !== undefined) obj._originalX = savedObj._originalX;
                    if (savedObj._originalY !== undefined) obj._originalY = savedObj._originalY;
                    if (savedObj._originalWidth !== undefined) obj._originalWidth = savedObj._originalWidth;
                    if (savedObj._originalHeight !== undefined) obj._originalHeight = savedObj._originalHeight;
                    if (savedObj._imageName !== undefined) obj._imageName = savedObj._imageName;
                    if (savedObj._savedImageEdit !== undefined) obj._savedImageEdit = savedObj._savedImageEdit;
                });
            }

            // Aktualizovat souřadnice všech objektů
            this.fabricCanvas.getObjects().forEach(obj => {
                obj.setCoords();
            });

            this.fabricCanvas.calcOffset();
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
        // Důležité: Přidat vlastní vlastnosti do serializace (text i obrázky)
        const state = this.fabricCanvas.toJSON([
            '_isTextBackground',
            '_isExtractedText',
            '_textIndex',
            '_originalText',
            '_originalFont',
            '_savedTextEdit',
            '_isExtractedImage',
            '_imageIndex',
            '_originalX',
            '_originalY',
            '_originalWidth',
            '_originalHeight',
            '_imageName',
            '_savedImageEdit'
        ]);
        this.pageAnnotations[pageNum] = state;
    },

    /**
     * Load annotations for a page
     * @param {number} pageNum - Page number
     */
    loadPageAnnotations(pageNum) {
        this.currentPage = pageNum;

        if (this.pageAnnotations[pageNum]) {
            // Sanitizovat data před načtením - opravit neplatné hodnoty
            const annotations = this.pageAnnotations[pageNum];
            if (annotations.objects) {
                annotations.objects = annotations.objects.map(obj => {
                    // Opravit neplatnou hodnotu textBaseline ('alphabetical' -> 'alphabetic')
                    if (obj.textBaseline === 'alphabetical') {
                        obj.textBaseline = 'alphabetic';
                    }
                    return obj;
                });
            }

            this.fabricCanvas.loadFromJSON(annotations, () => {
                // OPRAVENO: Aplikovat vlastní vlastnosti z annotations na živé objekty
                const objects = this.fabricCanvas.getObjects();
                if (annotations.objects && objects.length === annotations.objects.length) {
                    objects.forEach((obj, index) => {
                        const savedObj = annotations.objects[index];
                        // Aplikovat vlastní vlastnosti pro text
                        if (savedObj._isTextBackground !== undefined) obj._isTextBackground = savedObj._isTextBackground;
                        if (savedObj._isExtractedText !== undefined) obj._isExtractedText = savedObj._isExtractedText;
                        if (savedObj._textIndex !== undefined) obj._textIndex = savedObj._textIndex;
                        if (savedObj._originalText !== undefined) obj._originalText = savedObj._originalText;
                        if (savedObj._originalFont !== undefined) obj._originalFont = savedObj._originalFont;
                        if (savedObj._savedTextEdit !== undefined) obj._savedTextEdit = savedObj._savedTextEdit;
                        // Aplikovat vlastní vlastnosti pro obrázky
                        if (savedObj._isExtractedImage !== undefined) obj._isExtractedImage = savedObj._isExtractedImage;
                        if (savedObj._imageIndex !== undefined) obj._imageIndex = savedObj._imageIndex;
                        if (savedObj._originalX !== undefined) obj._originalX = savedObj._originalX;
                        if (savedObj._originalY !== undefined) obj._originalY = savedObj._originalY;
                        if (savedObj._originalWidth !== undefined) obj._originalWidth = savedObj._originalWidth;
                        if (savedObj._originalHeight !== undefined) obj._originalHeight = savedObj._originalHeight;
                        if (savedObj._imageName !== undefined) obj._imageName = savedObj._imageName;
                        if (savedObj._savedImageEdit !== undefined) obj._savedImageEdit = savedObj._savedImageEdit;
                    });
                }

                this.fabricCanvas.calcOffset();
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
     * OPRAVENO: Správná konverze pro různé typy objektů
     * Note: Canvas origin is top-left, PDF origin is bottom-left
     * @param {fabric.Object} obj - Fabric object
     * @param {number} pdfHeight - PDF page height
     * @param {number} scale - Current view scale
     * @returns {Object}
     */
    toPDFCoordinates(obj, pdfHeight, scale = 1) {
        // Pro text - pozice je baseline, ne top
        const isText = obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text';

        // Výška objektu
        const objHeight = (obj.height * obj.scaleY) / scale;
        const objWidth = (obj.width * obj.scaleX) / scale;

        // X pozice je jednoduchá
        const x = obj.left / scale;

        // Y pozice - PDF má origin vlevo dole
        // Fabric má origin vlevo nahoře
        let y;
        if (isText) {
            // Pro text: y je pozice baseline, ne top
            // V Fabric.js je obj.top pozice horní hrany textu
            // V PDF je y pozice baseline (spodní hrana textu)
            y = pdfHeight - (obj.top / scale) - objHeight;
        } else {
            // Pro ostatní objekty
            y = pdfHeight - (obj.top / scale) - objHeight;
        }

        return {
            x: x,
            y: y,
            width: objWidth,
            height: objHeight,
            rotation: -obj.angle, // PDF rotation is counter-clockwise
            isText: isText
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
        this.lastWidth = 0;
        this.lastHeight = 0;
    },

    /**
     * Map PDF font name to web-safe font
     * @param {string} pdfFontName - Original PDF font name
     * @returns {Object} - { family, weight, style }
     */
    _mapPDFFont(pdfFontName) {
        if (!pdfFontName) {
            return { family: 'Helvetica', weight: 'normal', style: 'normal' };
        }

        const fontLower = pdfFontName.toLowerCase();

        // Detekce bold/italic z názvu fontu
        let weight = 'normal';
        let style = 'normal';

        if (fontLower.includes('bold') || fontLower.includes('black') || fontLower.includes('heavy')) {
            weight = 'bold';
        }
        if (fontLower.includes('italic') || fontLower.includes('oblique')) {
            style = 'italic';
        }

        // Mapování fontů
        let family = 'Helvetica';

        if (fontLower.includes('times') || fontLower.includes('serif')) {
            family = 'Times New Roman';
        } else if (fontLower.includes('courier') || fontLower.includes('mono')) {
            family = 'Courier New';
        } else if (fontLower.includes('arial')) {
            family = 'Arial';
        } else if (fontLower.includes('helvetica')) {
            family = 'Helvetica';
        } else if (fontLower.includes('georgia')) {
            family = 'Georgia';
        } else if (fontLower.includes('verdana')) {
            family = 'Verdana';
        } else if (fontLower.includes('trebuchet')) {
            family = 'Trebuchet MS';
        } else if (fontLower.includes('impact')) {
            family = 'Impact';
        } else if (fontLower.includes('comic')) {
            family = 'Comic Sans MS';
        }

        return { family, weight, style };
    },

    /**
     * Extract text content from page with positions (for text editing)
     * OPRAVENO: Správná transformace PDF souřadnic na canvas souřadnice
     * @param {Object} pdfPage - PDF.js page object
     * @param {number} scale - Current view scale
     * @returns {Promise<Array>} - Array of text items with positions
     */
    async extractTextWithPositions(pdfPage, scale = 1) {
        const textContent = await pdfPage.getTextContent();
        const viewport = pdfPage.getViewport({ scale: scale });

        const textItems = [];

        for (const item of textContent.items) {
            if (!item.str || item.str.trim() === '') continue;

            // item.transform je matice [scaleX, skewX, skewY, scaleY, translateX, translateY]
            const transform = item.transform;

            // Vypočítat velikost fontu z transformační matice
            const fontSize = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]) * scale;

            // OPRAVENO: Použít viewport.transform pro správnou konverzi PDF -> Canvas
            // PDF koordináty: origin je vlevo dole
            // Canvas koordináty: origin je vlevo nahoře

            // Použít PDF.js Util pro transformaci pokud je dostupné
            let x, y;

            if (window.pdfjsLib && pdfjsLib.Util && pdfjsLib.Util.transform) {
                // Kombinovat transformace: viewport transform + text transform
                const combined = pdfjsLib.Util.transform(viewport.transform, transform);
                x = combined[4];
                y = combined[5];
            } else {
                // Fallback: manuální transformace
                // Aplikovat viewport transformaci na pozici textu
                const pdfX = transform[4];
                const pdfY = transform[5];

                // viewport.transform = [scaleX, 0, 0, -scaleY, offsetX, offsetY]
                // Pro konverzi PDF (vlevo dole) -> Canvas (vlevo nahoře)
                x = pdfX * viewport.transform[0] + viewport.transform[4];
                y = pdfY * viewport.transform[3] + viewport.transform[5];
            }

            // Šířka textu (aproximace pokud není dostupná)
            const width = (item.width || item.str.length * fontSize * 0.6) * scale;
            const height = fontSize * 1.2;

            // Mapovat PDF font na dostupný webový font
            const mappedFont = this._mapPDFFont(item.fontName);

            textItems.push({
                text: item.str,
                x: x,
                y: y - fontSize, // Posunout nahoru o výšku fontu (baseline adjustment)
                width: Math.max(width, 20), // Minimální šířka
                height: height,
                fontSize: Math.max(fontSize, 8), // Minimální velikost fontu
                fontFamily: mappedFont.family,
                fontWeight: mappedFont.weight,
                fontStyle: mappedFont.style,
                originalFont: item.fontName,
                transform: transform
            });
        }

        console.log(`Extracted ${textItems.length} text items from PDF`);
        return textItems;
    },

    /**
     * Create editable text overlays for extracted text
     * OPRAVENO: Lepší vizualizace a interakce
     * @param {Array} textItems - Array of text items from extractTextWithPositions
     */
    createTextOverlays(textItems) {
        if (!this.fabricCanvas || !textItems || textItems.length === 0) {
            console.warn('No text items to create overlays for');
            return;
        }

        console.log(`Creating ${textItems.length} text overlays`);

        textItems.forEach((item, index) => {
            // Create background with dashed border to show editable area
            // Ohraničení je viditelné POUZE během editace, ne v exportovaném PDF
            const bg = new fabric.Rect({
                left: item.x - 2,
                top: item.y - 2,
                width: item.width + 4,
                height: item.height + 4,
                fill: 'rgba(255, 255, 255, 1)', // Neprůhledné bílé pozadí pro zakrytí originálu
                stroke: 'rgba(139, 92, 246, 0.7)', // Fialové ohraničení pro editaci
                strokeWidth: 1,
                strokeDashArray: [4, 2], // Čárkované - signalizuje že je to editovatelná oblast
                selectable: false,
                evented: false,
                _isTextBackground: true, // Tento flag zajistí, že se NEEXPORTUJE do PDF
                _textIndex: index
            });

            // Create editable text with matched font properties
            const text = new fabric.IText(item.text, {
                left: item.x,
                top: item.y,
                fontSize: item.fontSize,
                fontFamily: item.fontFamily,
                fontWeight: item.fontWeight || 'normal',
                fontStyle: item.fontStyle || 'normal',
                fill: '#000000',
                textBaseline: 'alphabetic', // Oprava: použít platnou hodnotu (ne 'alphabetical')
                editable: true,
                selectable: true,
                hasControls: true,
                hasBorders: true,
                lockScalingX: false,
                lockScalingY: false,
                _isExtractedText: true,
                _textIndex: index,
                _originalText: item.text,
                _originalFont: item.originalFont,
                _background: bg
            });

            // Update background when text is modified or moved
            const updateBackground = () => {
                if (text._background) {
                    text._background.set({
                        left: text.left - 2,
                        top: text.top - 2,
                        width: (text.width * text.scaleX) + 4,
                        height: (text.height * text.scaleY) + 4
                    });
                    text._background.setCoords();
                }
            };

            text.on('changed', () => {
                updateBackground();
                this.fabricCanvas.renderAll();
            });

            text.on('moving', updateBackground);
            text.on('scaling', updateBackground);
            text.on('modified', () => {
                updateBackground();
                this.fabricCanvas.renderAll();
            });

            // Přidat na canvas (pozadí pod text)
            this.fabricCanvas.add(bg);
            this.fabricCanvas.add(text);
        });

        // Přepnout do režimu výběru
        this.setTool('select');
        this.fabricCanvas.renderAll();

        console.log('Text overlays created successfully');
    },

    /**
     * Enable text editing mode - extracts and overlays existing text AND images
     * @param {Object} pdfPage - PDF.js page object
     * @param {number} scale - Current view scale
     * @param {HTMLCanvasElement} renderedCanvas - Already rendered PDF canvas (for image extraction)
     */
    async enableTextEditing(pdfPage, scale = 1, renderedCanvas = null) {
        // Extrahovat text
        const textItems = await this.extractTextWithPositions(pdfPage, scale);
        this.createTextOverlays(textItems);

        // Extrahovat obrázky (potřebujeme renderovaný canvas)
        try {
            const imageItems = await this.extractImagesWithPositions(pdfPage, scale, renderedCanvas);
            if (imageItems.length > 0) {
                await this.createImageOverlays(imageItems);
                console.log(`Created ${imageItems.length} image overlays`);
            }
        } catch (error) {
            console.warn('Could not extract images:', error);
        }

        this._saveToHistory();
    },

    /**
     * Extract images from PDF page using operatorList and rendered canvas
     * @param {Object} pdfPage - PDF.js page object
     * @param {number} scale - Current view scale
     * @param {HTMLCanvasElement} renderedCanvas - Already rendered PDF canvas
     * @returns {Promise<Array>} - Array of image items with positions
     */
    async extractImagesWithPositions(pdfPage, scale = 1, renderedCanvas = null) {
        const operatorList = await pdfPage.getOperatorList();
        const viewport = pdfPage.getViewport({ scale: scale });
        const imageItems = [];

        // OPS konstanty pro obrázky
        const OPS = pdfjsLib.OPS;
        const imageOps = [
            OPS.paintImageXObject,
            OPS.paintJpegXObject,
            OPS.paintImageMaskXObject,
            OPS.paintInlineImageXObject,
            OPS.paintInlineImageXObjectGroup
        ].filter(op => op !== undefined);

        console.log('PDF.js OPS for images:', imageOps);

        // Debug: zobrazit všechny operátory v PDF (pouze unikátní)
        const uniqueOps = [...new Set(operatorList.fnArray)];
        console.log('Unique operators in PDF:', uniqueOps.length, 'Total ops:', operatorList.fnArray.length);

        // Sledovat transformační matici
        let currentTransform = [1, 0, 0, 1, 0, 0];
        const transformStack = [];

        // Sbírat image regiony pro extrakci z renderovaného canvasu
        const imageRegions = [];

        for (let i = 0; i < operatorList.fnArray.length; i++) {
            const fn = operatorList.fnArray[i];
            const args = operatorList.argsArray[i];

            // Sledovat transformace
            if (fn === OPS.save) {
                transformStack.push([...currentTransform]);
            } else if (fn === OPS.restore) {
                if (transformStack.length > 0) {
                    currentTransform = transformStack.pop();
                }
            } else if (fn === OPS.transform) {
                // Kombinovat transformace
                const [a, b, c, d, e, f] = args;
                const [ca, cb, cc, cd, ce, cf] = currentTransform;
                currentTransform = [
                    ca * a + cc * b,
                    cb * a + cd * b,
                    ca * c + cc * d,
                    cb * c + cd * d,
                    ca * e + cc * f + ce,
                    cb * e + cd * f + cf
                ];
            }

            // Detekovat obrázky
            if (imageOps.includes(fn)) {
                const imageName = args[0] || `inline_${i}`;
                const transform = [...currentTransform];

                // Vypočítat pozici a velikost v canvas koordinátech
                const width = Math.abs(transform[0]) * scale;
                const height = Math.abs(transform[3]) * scale;

                // Přeskočit příliš malé obrázky (ikony, čáry, atd.)
                if (width < 20 || height < 20) {
                    continue;
                }

                // Transformovat pozici
                let x, y;
                if (pdfjsLib.Util && pdfjsLib.Util.transform) {
                    const combined = pdfjsLib.Util.transform(viewport.transform, transform);
                    x = combined[4];
                    y = combined[5] - height;
                } else {
                    x = transform[4] * scale;
                    y = viewport.height - (transform[5] * scale) - height;
                }

                imageRegions.push({
                    imageName,
                    x: Math.round(x),
                    y: Math.round(y),
                    width: Math.round(width),
                    height: Math.round(height)
                });
            }
        }

        console.log(`Found ${imageRegions.length} image regions in PDF`, imageRegions);

        // Extrahovat obrázky z renderovaného canvasu
        if (!renderedCanvas) {
            console.warn('No rendered canvas provided for image extraction');
            return imageItems;
        }

        if (imageRegions.length > 0) {
            const sourceCtx = renderedCanvas.getContext('2d');

            for (let index = 0; index < imageRegions.length; index++) {
                const region = imageRegions[index];

                try {
                    // Vytvořit canvas pro extrakci regionu
                    const imgCanvas = document.createElement('canvas');
                    imgCanvas.width = region.width;
                    imgCanvas.height = region.height;
                    const ctx = imgCanvas.getContext('2d');

                    // Extrahovat region z renderovaného PDF
                    ctx.drawImage(
                        renderedCanvas,
                        region.x, region.y, region.width, region.height,
                        0, 0, region.width, region.height
                    );

                    // Převést na data URL
                    const dataUrl = imgCanvas.toDataURL('image/png');

                    imageItems.push({
                        dataUrl: dataUrl,
                        x: region.x,
                        y: region.y,
                        width: region.width,
                        height: region.height,
                        originalWidth: region.width,
                        originalHeight: region.height,
                        imageName: region.imageName
                    });
                } catch (error) {
                    console.warn(`Could not extract image region ${index}:`, error);
                }
            }
        }

        console.log(`Extracted ${imageItems.length} images from PDF`);
        return imageItems;
    },

    /**
     * Create editable image overlays on canvas
     * @param {Array} imageItems - Array of image items from extractImagesWithPositions
     */
    async createImageOverlays(imageItems) {
        if (!this.fabricCanvas || !imageItems.length) return;

        console.log(`Creating ${imageItems.length} image overlays`);

        for (let index = 0; index < imageItems.length; index++) {
            const item = imageItems[index];

            try {
                // Načíst obrázek do Fabric.js
                const img = await new Promise((resolve, reject) => {
                    fabric.Image.fromURL(item.dataUrl, (fabricImg) => {
                        if (fabricImg) {
                            resolve(fabricImg);
                        } else {
                            reject(new Error('Failed to load image'));
                        }
                    });
                });

                // Nastavit pozici a velikost
                img.set({
                    left: item.x,
                    top: item.y,
                    scaleX: item.width / item.originalWidth,
                    scaleY: item.height / item.originalHeight,
                    selectable: true,
                    hasControls: true,
                    hasBorders: true,
                    // Vlastní vlastnosti pro identifikaci
                    _isExtractedImage: true,
                    _imageIndex: index,
                    _originalX: item.x,
                    _originalY: item.y,
                    _originalWidth: item.width,
                    _originalHeight: item.height,
                    _imageName: item.imageName
                });

                // Přidat na canvas
                this.fabricCanvas.add(img);
            } catch (error) {
                console.warn(`Could not create overlay for image ${index}:`, error);
            }
        }

        this.fabricCanvas.renderAll();
    },

    /**
     * Remove text and image editing overlays
     */
    disableTextEditing() {
        if (!this.fabricCanvas) return;

        const toRemove = this.fabricCanvas.getObjects().filter(
            obj => obj._isExtractedText || obj._isTextBackground || obj._isExtractedImage
        );

        toRemove.forEach(obj => this.fabricCanvas.remove(obj));
        this.fabricCanvas.renderAll();
    },

    /**
     * Save text editing changes - converts extracted text to saved edits
     * Removes backgrounds and keeps only modified text
     */
    saveTextEditing() {
        if (!this.fabricCanvas) return;

        const objects = this.fabricCanvas.getObjects();
        const textObjects = objects.filter(obj => obj._isExtractedText);
        const bgObjects = objects.filter(obj => obj._isTextBackground);

        // Odstranit všechny background objekty
        bgObjects.forEach(obj => this.fabricCanvas.remove(obj));

        // Převést extracted text na saved text (bez background)
        textObjects.forEach(textObj => {
            // Označit jako uložený edit (ne extracted)
            textObj._isExtractedText = false;
            textObj._savedTextEdit = true;
            textObj._background = null;

            // Zrušit event listenery pro update background
            textObj.off('changed');
            textObj.off('moving');
            textObj.off('scaling');
            textObj.off('modified');
        });

        this.fabricCanvas.renderAll();
        this._saveToHistory();

        console.log(`Saved ${textObjects.length} text edits`);
        return textObjects.length;
    },

    /**
     * Save current text/image editing state to cache for page persistence
     * @param {number} pageNum - Page number
     */
    saveTextEditingToCache(pageNum) {
        if (!this.fabricCanvas) return;

        // Najít všechny editovatelné objekty (text, background, obrázky)
        const editObjects = this.fabricCanvas.getObjects().filter(
            obj => obj._isExtractedText || obj._isTextBackground || obj._isExtractedImage
        );

        if (editObjects.length === 0) {
            // Žádné edity - vymazat cache pro tuto stránku
            delete this.textEditingCache[pageNum];
            return;
        }

        // Serializovat editovatelné objekty (text i obrázky)
        const cacheData = editObjects.map(obj => {
            return obj.toJSON([
                '_isTextBackground',
                '_isExtractedText',
                '_textIndex',
                '_originalText',
                '_originalFont',
                '_savedTextEdit',
                '_isExtractedImage',
                '_imageIndex',
                '_originalX',
                '_originalY',
                '_originalWidth',
                '_originalHeight',
                '_imageName',
                '_savedImageEdit'
            ]);
        });

        this.textEditingCache[pageNum] = cacheData;
        console.log(`Cached ${cacheData.length} editing objects for page ${pageNum}`);
    },

    /**
     * Load text editing state from cache
     * @param {number} pageNum - Page number
     * @returns {boolean} - True if cache was loaded, false if no cache exists
     */
    loadTextEditingFromCache(pageNum) {
        const cacheData = this.textEditingCache[pageNum];

        if (!cacheData || cacheData.length === 0) {
            return false;
        }

        console.log(`Loading ${cacheData.length} cached text editing objects for page ${pageNum}`);

        // Sanitizovat cache data - opravit neplatné hodnoty
        const sanitizedData = cacheData.map(obj => {
            // Opravit neplatnou hodnotu textBaseline ('alphabetical' -> 'alphabetic')
            if (obj.textBaseline === 'alphabetical') {
                obj.textBaseline = 'alphabetic';
            }
            return obj;
        });

        // Načíst objekty z cache
        return new Promise((resolve) => {
            fabric.util.enlivenObjects(sanitizedData, (objects) => {
                // Přidat objekty na canvas
                objects.forEach((obj, index) => {
                    // Obnovit vztah background-text
                    if (obj._isExtractedText) {
                        const bgObj = objects.find(o => o._isTextBackground && o._textIndex === obj._textIndex);
                        if (bgObj) {
                            obj._background = bgObj;
                            // Přidat event listenery pro update background
                            this._setupTextBackgroundListeners(obj, bgObj);
                        }
                    }
                    this.fabricCanvas.add(obj);
                });

                this.fabricCanvas.renderAll();
                resolve(true);
            });
        });
    },

    /**
     * Setup event listeners for text-background relationship
     * @param {fabric.IText} textObj - Text object
     * @param {fabric.Rect} bgObj - Background rectangle
     */
    _setupTextBackgroundListeners(textObj, bgObj) {
        const updateBackground = () => {
            if (textObj._background) {
                textObj._background.set({
                    left: textObj.left - 2,
                    top: textObj.top - 2,
                    width: (textObj.width * textObj.scaleX) + 4,
                    height: (textObj.height * textObj.scaleY) + 4
                });
                textObj._background.setCoords();
            }
        };

        textObj.on('changed', () => {
            updateBackground();
            this.fabricCanvas.renderAll();
        });
        textObj.on('moving', updateBackground);
        textObj.on('scaling', updateBackground);
        textObj.on('modified', () => {
            updateBackground();
            this.fabricCanvas.renderAll();
        });
    },

    /**
     * Check if cache exists for page
     * @param {number} pageNum - Page number
     * @returns {boolean}
     */
    hasTextEditingCache(pageNum) {
        return this.textEditingCache[pageNum] && this.textEditingCache[pageNum].length > 0;
    },

    /**
     * Clear text editing cache
     * @param {number} pageNum - Optional page number, clears all if not specified
     */
    clearTextEditingCache(pageNum = null) {
        if (pageNum !== null) {
            delete this.textEditingCache[pageNum];
        } else {
            this.textEditingCache = {};
        }
    }
};

// Export for use in other modules
window.PDFEditor = PDFEditor;
