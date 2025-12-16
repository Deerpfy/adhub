/**
 * VectorManager - Main controller for vector/SVG editing mode
 * Provides true vector graphics editing with SVG output
 */

export class VectorManager {
    constructor(app) {
        this.app = app;
        this.enabled = false;

        // SVG namespace
        this.svgNS = 'http://www.w3.org/2000/svg';

        // DOM elements
        this.container = null;
        this.svgElement = null;
        this.defsElement = null;

        // Canvas dimensions
        this.width = 1920;
        this.height = 1080;

        // Vector elements
        this.elements = [];
        this.selectedElements = [];
        this.activeElement = null;

        // Layer system for vectors
        this.layers = [];
        this.activeLayerId = null;

        // Drawing state
        this.isDrawing = false;
        this.currentPath = null;
        this.pathData = [];
        this.rawPoints = []; // For QuickShape detection

        // Tool state
        this.currentTool = 'pen';
        this.toolSettings = {
            stroke: '#000000',
            strokeWidth: 2,
            fill: 'none',
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round'
        };

        // View state
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;

        // Pan state
        this.isPanning = false;
        this.spacePressed = false;
        this.lastPanX = 0;
        this.lastPanY = 0;

        // Selection handles
        this.selectionBox = null;
        this.handles = [];

        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;

        // ID counter for elements
        this.idCounter = 0;
    }

    /**
     * Initialize vector manager
     */
    init() {
        this.container = document.getElementById('canvasContainer');
        if (!this.container) {
            console.warn('VectorManager: Canvas container not found');
            return;
        }
    }

    /**
     * Enable vector mode - replace canvas with SVG
     */
    enable(width = 1920, height = 1080) {
        if (this.enabled) return;

        this.width = width;
        this.height = height;

        // Hide raster canvases
        const mainCanvas = document.getElementById('mainCanvas');
        const previewCanvas = document.getElementById('previewCanvas');
        const overlayCanvas = document.getElementById('overlayCanvas');

        if (mainCanvas) mainCanvas.style.display = 'none';
        if (previewCanvas) previewCanvas.style.display = 'none';
        if (overlayCanvas) overlayCanvas.style.display = 'none';

        // Create SVG element
        this.createSVG();

        // Create default layer
        this.addLayer('Vrstva 1');

        // Setup event listeners
        this.setupEventListeners();

        this.enabled = true;

        // Save initial state
        this.saveState();

        console.log('VectorManager: Vector mode enabled');
    }

    /**
     * Disable vector mode - restore canvas
     */
    disable() {
        if (!this.enabled) return;

        // Remove SVG
        if (this.svgElement && this.svgElement.parentNode) {
            this.svgElement.parentNode.removeChild(this.svgElement);
        }

        // Show raster canvases
        const mainCanvas = document.getElementById('mainCanvas');
        const previewCanvas = document.getElementById('previewCanvas');
        const overlayCanvas = document.getElementById('overlayCanvas');

        if (mainCanvas) mainCanvas.style.display = '';
        if (previewCanvas) previewCanvas.style.display = '';
        if (overlayCanvas) overlayCanvas.style.display = '';

        // Show raster mode UI panels
        const toolbarLeft = document.getElementById('toolbarLeft');
        const panelRight = document.getElementById('panelRight');
        if (toolbarLeft) toolbarLeft.style.display = '';
        if (panelRight) panelRight.style.display = '';

        this.enabled = false;
        this.elements = [];
        this.layers = [];
        this.selectedElements = [];

        console.log('VectorManager: Vector mode disabled');
    }

    /**
     * Create the main SVG element
     */
    createSVG() {
        const wrapper = document.getElementById('canvasWrapper');
        if (!wrapper) return;

        // Create SVG element
        this.svgElement = document.createElementNS(this.svgNS, 'svg');
        this.svgElement.setAttribute('id', 'vectorCanvas');
        this.svgElement.setAttribute('class', 'vector-canvas');
        this.svgElement.setAttribute('width', this.width);
        this.svgElement.setAttribute('height', this.height);
        this.svgElement.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        this.svgElement.style.position = 'absolute';
        this.svgElement.style.top = '0';
        this.svgElement.style.left = '0';
        this.svgElement.style.backgroundColor = '#ffffff';

        // Create defs for gradients, patterns, etc.
        this.defsElement = document.createElementNS(this.svgNS, 'defs');
        this.svgElement.appendChild(this.defsElement);

        // Create selection overlay group (always on top)
        this.selectionGroup = document.createElementNS(this.svgNS, 'g');
        this.selectionGroup.setAttribute('id', 'selection-overlay');
        this.selectionGroup.setAttribute('pointer-events', 'none');
        this.svgElement.appendChild(this.selectionGroup);

        wrapper.appendChild(this.svgElement);
    }

    /**
     * Setup event listeners for vector editing
     */
    setupEventListeners() {
        if (!this.svgElement) return;

        // Store bound handlers for potential removal
        this._boundHandlers = {
            pointerDown: this.handlePointerDown.bind(this),
            pointerMove: this.handlePointerMove.bind(this),
            pointerUp: this.handlePointerUp.bind(this),
            wheel: this.handleWheel.bind(this),
            keyDown: this.handleKeyDown.bind(this),
            keyUp: this.handleKeyUp.bind(this)
        };

        this.svgElement.addEventListener('pointerdown', this._boundHandlers.pointerDown);
        this.svgElement.addEventListener('pointermove', this._boundHandlers.pointerMove);
        this.svgElement.addEventListener('pointerup', this._boundHandlers.pointerUp);
        this.svgElement.addEventListener('pointerleave', this._boundHandlers.pointerUp);

        // Mouse wheel for zoom
        this.container.addEventListener('wheel', this._boundHandlers.wheel, { passive: false });

        // Keyboard events
        document.addEventListener('keydown', this._boundHandlers.keyDown);
        document.addEventListener('keyup', this._boundHandlers.keyUp);

        // Prevent context menu on SVG
        this.svgElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Get SVG coordinates from pointer event
     */
    getSVGCoordinates(e) {
        const rect = this.svgElement.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.width / rect.width);
        const y = (e.clientY - rect.top) * (this.height / rect.height);
        return { x, y };
    }

    /**
     * Handle pointer down
     */
    handlePointerDown(e) {
        if (!this.enabled) return;

        // Middle mouse button or space+click for panning
        if (e.button === 1 || (e.button === 0 && this.spacePressed)) {
            this.startPan(e);
            return;
        }

        const pos = this.getSVGCoordinates(e);

        // Check if clicking on existing element for selection
        if (this.currentTool === 'select') {
            this.handleSelect(e, pos);
            return;
        }

        // Start drawing based on tool
        this.isDrawing = true;
        this.startDraw(pos);
    }

    /**
     * Handle pointer move
     */
    handlePointerMove(e) {
        if (!this.enabled) return;

        // Handle panning
        if (this.isPanning) {
            this.pan(e);
            return;
        }

        const pos = this.getSVGCoordinates(e);

        // Update cursor position
        this.app.ui?.updateCursorPosition(Math.round(pos.x), Math.round(pos.y));

        if (this.isDrawing) {
            this.continueDraw(pos);
        }

        // Handle element dragging
        if (this.isDragging && this.selectedElements.length > 0) {
            this.dragElements(pos);
        }
    }

    /**
     * Handle pointer up
     */
    handlePointerUp(e) {
        if (!this.enabled) return;

        // End panning
        if (this.isPanning) {
            this.endPan();
            return;
        }

        if (this.isDrawing) {
            const pos = this.getSVGCoordinates(e);
            this.endDraw(pos);
            this.isDrawing = false;
        }

        this.isDragging = false;
    }

    /**
     * Handle mouse wheel for zoom
     */
    handleWheel(e) {
        if (!this.enabled) return;

        e.preventDefault();

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(10, this.zoom * delta));

        // Zoom towards cursor position
        const wrapper = document.getElementById('canvasWrapper');
        if (wrapper) {
            const containerRect = this.container.getBoundingClientRect();
            const mouseX = e.clientX - containerRect.left;
            const mouseY = e.clientY - containerRect.top;

            const zoomRatio = newZoom / this.zoom;

            this.panX = mouseX - (mouseX - this.panX) * zoomRatio;
            this.panY = mouseY - (mouseY - this.panY) * zoomRatio;
            this.zoom = newZoom;

            this.updateTransform();
        }
    }

    /**
     * Handle key up (for space panning)
     */
    handleKeyUp(e) {
        if (!this.enabled) return;

        if (e.code === 'Space') {
            this.spacePressed = false;
            if (!this.isPanning) {
                this.container.style.cursor = '';
            }
        }
    }

    /**
     * Start panning
     */
    startPan(e) {
        this.isPanning = true;
        this.container.style.cursor = 'grabbing';
        this.lastPanX = e.clientX;
        this.lastPanY = e.clientY;
    }

    /**
     * Pan the canvas
     */
    pan(e) {
        const dx = e.clientX - this.lastPanX;
        const dy = e.clientY - this.lastPanY;

        this.panX += dx;
        this.panY += dy;

        this.lastPanX = e.clientX;
        this.lastPanY = e.clientY;

        this.updateTransform();
    }

    /**
     * End panning
     */
    endPan() {
        this.isPanning = false;
        this.container.style.cursor = '';
    }

    /**
     * Update canvas transform (zoom and pan)
     */
    updateTransform() {
        const wrapper = document.getElementById('canvasWrapper');
        if (wrapper) {
            wrapper.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
            this.app.ui?.updateZoomLevel(Math.round(this.zoom * 100));
        }
    }

    /**
     * Handle keyboard events
     */
    handleKeyDown(e) {
        if (!this.enabled) return;

        // Space for pan mode
        if (e.code === 'Space' && !this.spacePressed) {
            this.spacePressed = true;
            this.container.style.cursor = 'grab';
        }

        // Delete selected elements
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedElements.length > 0) {
            e.preventDefault();
            this.deleteSelected();
        }

        // Undo/Redo
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
                e.preventDefault();
                this.redo();
            } else if (e.key === 'a') {
                e.preventDefault();
                this.selectAll();
            }
        }

        // Escape to deselect
        if (e.key === 'Escape') {
            this.clearSelection();
        }
    }

    /**
     * Start drawing based on current tool
     */
    startDraw(pos) {
        const layer = this.getActiveLayer();
        if (!layer) return;

        switch (this.currentTool) {
            case 'pen':
            case 'brush':
                this.startPath(pos);
                break;
            case 'line':
                this.startLine(pos);
                break;
            case 'rectangle':
                this.startRectangle(pos);
                break;
            case 'ellipse':
                this.startEllipse(pos);
                break;
            case 'text':
                this.addText(pos);
                break;
        }
    }

    /**
     * Continue drawing
     */
    continueDraw(pos) {
        switch (this.currentTool) {
            case 'pen':
            case 'brush':
                this.continuePath(pos);
                break;
            case 'line':
                this.updateLine(pos);
                break;
            case 'rectangle':
                this.updateRectangle(pos);
                break;
            case 'ellipse':
                this.updateEllipse(pos);
                break;
        }
    }

    /**
     * End drawing
     */
    endDraw(pos) {
        switch (this.currentTool) {
            case 'pen':
            case 'brush':
                this.endPath(pos);
                break;
            case 'line':
                this.finishLine(pos);
                break;
            case 'rectangle':
                this.finishRectangle(pos);
                break;
            case 'ellipse':
                this.finishEllipse(pos);
                break;
        }

        this.saveState();
        this.app.markUnsaved?.();
    }

    // ==========================================
    // Path (Pen/Brush) Tool
    // ==========================================

    startPath(pos) {
        this.pathData = [`M ${pos.x} ${pos.y}`];
        this.rawPoints = [{ x: pos.x, y: pos.y }]; // Start collecting points for QuickShape
        this.lastPoint = pos;

        this.currentPath = this.createPathElement();
        this.currentPath.setAttribute('d', this.pathData.join(' '));

        this.getActiveLayerGroup()?.appendChild(this.currentPath);
    }

    continuePath(pos) {
        if (!this.currentPath) return;

        // Collect points for QuickShape detection
        this.rawPoints.push({ x: pos.x, y: pos.y });

        // Use quadratic bezier for smooth curves
        const midX = (this.lastPoint.x + pos.x) / 2;
        const midY = (this.lastPoint.y + pos.y) / 2;

        this.pathData.push(`Q ${this.lastPoint.x} ${this.lastPoint.y} ${midX} ${midY}`);
        this.currentPath.setAttribute('d', this.pathData.join(' '));

        this.lastPoint = pos;
    }

    endPath(pos) {
        if (!this.currentPath) return;

        // Add final point
        this.rawPoints.push({ x: pos.x, y: pos.y });
        this.pathData.push(`L ${pos.x} ${pos.y}`);
        this.currentPath.setAttribute('d', this.pathData.join(' '));

        // Check if QuickShape is enabled and try to detect shape
        if (this.app.settings?.quickshapeEnabled && this.app.quickShape) {
            const detectedShape = this.app.quickShape.detect(this.rawPoints);
            if (detectedShape) {
                // Replace freehand path with detected shape
                this.replacePathWithShape(detectedShape);
                this.rawPoints = [];
                this.pathData = [];
                return;
            }
        }

        // No shape detected, keep the freehand path
        this.elements.push({
            id: this.currentPath.getAttribute('id'),
            type: 'path',
            element: this.currentPath,
            layerId: this.activeLayerId
        });

        this.currentPath = null;
        this.pathData = [];
        this.rawPoints = [];
    }

    /**
     * Replace current path with detected QuickShape
     */
    replacePathWithShape(shape) {
        if (!this.currentPath) return;

        const layerGroup = this.getActiveLayerGroup();
        if (!layerGroup) return;

        // Remove the freehand path
        if (this.currentPath.parentNode) {
            this.currentPath.parentNode.removeChild(this.currentPath);
        }

        let newElement = null;

        switch (shape.type) {
            case 'line':
                newElement = document.createElementNS(this.svgNS, 'line');
                newElement.setAttribute('id', this.generateId('line'));
                newElement.setAttribute('x1', shape.startX);
                newElement.setAttribute('y1', shape.startY);
                newElement.setAttribute('x2', shape.endX);
                newElement.setAttribute('y2', shape.endY);
                newElement.setAttribute('stroke', this.toolSettings.stroke);
                newElement.setAttribute('stroke-width', this.toolSettings.strokeWidth);
                newElement.setAttribute('stroke-linecap', this.toolSettings.lineCap);
                newElement.setAttribute('opacity', this.toolSettings.opacity);
                newElement.setAttribute('vector-effect', 'non-scaling-stroke');
                break;

            case 'circle':
            case 'ellipse':
                newElement = document.createElementNS(this.svgNS, 'ellipse');
                newElement.setAttribute('id', this.generateId('ellipse'));
                newElement.setAttribute('cx', shape.centerX);
                newElement.setAttribute('cy', shape.centerY);
                newElement.setAttribute('rx', shape.radiusX);
                newElement.setAttribute('ry', shape.radiusY);
                newElement.setAttribute('stroke', this.toolSettings.stroke);
                newElement.setAttribute('stroke-width', this.toolSettings.strokeWidth);
                newElement.setAttribute('fill', this.toolSettings.fill);
                newElement.setAttribute('opacity', this.toolSettings.opacity);
                newElement.setAttribute('vector-effect', 'non-scaling-stroke');
                break;

            case 'rectangle':
                newElement = document.createElementNS(this.svgNS, 'rect');
                newElement.setAttribute('id', this.generateId('rect'));
                newElement.setAttribute('x', shape.x);
                newElement.setAttribute('y', shape.y);
                newElement.setAttribute('width', shape.width);
                newElement.setAttribute('height', shape.height);
                newElement.setAttribute('stroke', this.toolSettings.stroke);
                newElement.setAttribute('stroke-width', this.toolSettings.strokeWidth);
                newElement.setAttribute('stroke-linejoin', this.toolSettings.lineJoin);
                newElement.setAttribute('fill', this.toolSettings.fill);
                newElement.setAttribute('opacity', this.toolSettings.opacity);
                newElement.setAttribute('vector-effect', 'non-scaling-stroke');
                break;

            case 'triangle':
                const points = shape.points.map(p => `${p.x},${p.y}`).join(' ');
                newElement = document.createElementNS(this.svgNS, 'polygon');
                newElement.setAttribute('id', this.generateId('polygon'));
                newElement.setAttribute('points', points);
                newElement.setAttribute('stroke', this.toolSettings.stroke);
                newElement.setAttribute('stroke-width', this.toolSettings.strokeWidth);
                newElement.setAttribute('stroke-linejoin', this.toolSettings.lineJoin);
                newElement.setAttribute('fill', this.toolSettings.fill);
                newElement.setAttribute('opacity', this.toolSettings.opacity);
                newElement.setAttribute('vector-effect', 'non-scaling-stroke');
                break;
        }

        if (newElement) {
            layerGroup.appendChild(newElement);

            this.elements.push({
                id: newElement.getAttribute('id'),
                type: shape.type,
                element: newElement,
                layerId: this.activeLayerId
            });
        }

        this.currentPath = null;
    }

    createPathElement() {
        const path = document.createElementNS(this.svgNS, 'path');
        path.setAttribute('id', this.generateId('path'));
        path.setAttribute('stroke', this.toolSettings.stroke);
        path.setAttribute('stroke-width', this.toolSettings.strokeWidth);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', this.toolSettings.lineCap);
        path.setAttribute('stroke-linejoin', this.toolSettings.lineJoin);
        path.setAttribute('opacity', this.toolSettings.opacity);
        path.setAttribute('vector-effect', 'non-scaling-stroke');
        return path;
    }

    // ==========================================
    // Line Tool
    // ==========================================

    startLine(pos) {
        this.startPoint = pos;

        this.currentPath = document.createElementNS(this.svgNS, 'line');
        this.currentPath.setAttribute('id', this.generateId('line'));
        this.currentPath.setAttribute('x1', pos.x);
        this.currentPath.setAttribute('y1', pos.y);
        this.currentPath.setAttribute('x2', pos.x);
        this.currentPath.setAttribute('y2', pos.y);
        this.currentPath.setAttribute('stroke', this.toolSettings.stroke);
        this.currentPath.setAttribute('stroke-width', this.toolSettings.strokeWidth);
        this.currentPath.setAttribute('stroke-linecap', this.toolSettings.lineCap);
        this.currentPath.setAttribute('opacity', this.toolSettings.opacity);
        this.currentPath.setAttribute('vector-effect', 'non-scaling-stroke');

        this.getActiveLayerGroup()?.appendChild(this.currentPath);
    }

    updateLine(pos) {
        if (!this.currentPath) return;
        this.currentPath.setAttribute('x2', pos.x);
        this.currentPath.setAttribute('y2', pos.y);
    }

    finishLine(pos) {
        if (!this.currentPath) return;

        this.currentPath.setAttribute('x2', pos.x);
        this.currentPath.setAttribute('y2', pos.y);

        this.elements.push({
            id: this.currentPath.getAttribute('id'),
            type: 'line',
            element: this.currentPath,
            layerId: this.activeLayerId
        });

        this.currentPath = null;
    }

    // ==========================================
    // Rectangle Tool
    // ==========================================

    startRectangle(pos) {
        this.startPoint = pos;

        this.currentPath = document.createElementNS(this.svgNS, 'rect');
        this.currentPath.setAttribute('id', this.generateId('rect'));
        this.currentPath.setAttribute('x', pos.x);
        this.currentPath.setAttribute('y', pos.y);
        this.currentPath.setAttribute('width', 0);
        this.currentPath.setAttribute('height', 0);
        this.currentPath.setAttribute('stroke', this.toolSettings.stroke);
        this.currentPath.setAttribute('stroke-width', this.toolSettings.strokeWidth);
        this.currentPath.setAttribute('fill', this.toolSettings.fill);
        this.currentPath.setAttribute('opacity', this.toolSettings.opacity);
        this.currentPath.setAttribute('vector-effect', 'non-scaling-stroke');

        this.getActiveLayerGroup()?.appendChild(this.currentPath);
    }

    updateRectangle(pos) {
        if (!this.currentPath || !this.startPoint) return;

        const x = Math.min(this.startPoint.x, pos.x);
        const y = Math.min(this.startPoint.y, pos.y);
        const width = Math.abs(pos.x - this.startPoint.x);
        const height = Math.abs(pos.y - this.startPoint.y);

        this.currentPath.setAttribute('x', x);
        this.currentPath.setAttribute('y', y);
        this.currentPath.setAttribute('width', width);
        this.currentPath.setAttribute('height', height);
    }

    finishRectangle(pos) {
        this.updateRectangle(pos);

        if (this.currentPath) {
            this.elements.push({
                id: this.currentPath.getAttribute('id'),
                type: 'rectangle',
                element: this.currentPath,
                layerId: this.activeLayerId
            });
        }

        this.currentPath = null;
        this.startPoint = null;
    }

    // ==========================================
    // Ellipse Tool
    // ==========================================

    startEllipse(pos) {
        this.startPoint = pos;

        this.currentPath = document.createElementNS(this.svgNS, 'ellipse');
        this.currentPath.setAttribute('id', this.generateId('ellipse'));
        this.currentPath.setAttribute('cx', pos.x);
        this.currentPath.setAttribute('cy', pos.y);
        this.currentPath.setAttribute('rx', 0);
        this.currentPath.setAttribute('ry', 0);
        this.currentPath.setAttribute('stroke', this.toolSettings.stroke);
        this.currentPath.setAttribute('stroke-width', this.toolSettings.strokeWidth);
        this.currentPath.setAttribute('fill', this.toolSettings.fill);
        this.currentPath.setAttribute('opacity', this.toolSettings.opacity);
        this.currentPath.setAttribute('vector-effect', 'non-scaling-stroke');

        this.getActiveLayerGroup()?.appendChild(this.currentPath);
    }

    updateEllipse(pos) {
        if (!this.currentPath || !this.startPoint) return;

        const cx = (this.startPoint.x + pos.x) / 2;
        const cy = (this.startPoint.y + pos.y) / 2;
        const rx = Math.abs(pos.x - this.startPoint.x) / 2;
        const ry = Math.abs(pos.y - this.startPoint.y) / 2;

        this.currentPath.setAttribute('cx', cx);
        this.currentPath.setAttribute('cy', cy);
        this.currentPath.setAttribute('rx', rx);
        this.currentPath.setAttribute('ry', ry);
    }

    finishEllipse(pos) {
        this.updateEllipse(pos);

        if (this.currentPath) {
            this.elements.push({
                id: this.currentPath.getAttribute('id'),
                type: 'ellipse',
                element: this.currentPath,
                layerId: this.activeLayerId
            });
        }

        this.currentPath = null;
        this.startPoint = null;
    }

    // ==========================================
    // Text Tool
    // ==========================================

    addText(pos) {
        const text = prompt('Zadejte text:', 'Text');
        if (!text) return;

        const textElement = document.createElementNS(this.svgNS, 'text');
        textElement.setAttribute('id', this.generateId('text'));
        textElement.setAttribute('x', pos.x);
        textElement.setAttribute('y', pos.y);
        textElement.setAttribute('fill', this.toolSettings.stroke);
        textElement.setAttribute('font-size', '24');
        textElement.setAttribute('font-family', 'Arial, sans-serif');
        textElement.setAttribute('opacity', this.toolSettings.opacity);
        textElement.textContent = text;

        this.getActiveLayerGroup()?.appendChild(textElement);

        this.elements.push({
            id: textElement.getAttribute('id'),
            type: 'text',
            element: textElement,
            layerId: this.activeLayerId
        });

        this.saveState();
        this.app.markUnsaved?.();
    }

    // ==========================================
    // Selection & Manipulation
    // ==========================================

    handleSelect(e, pos) {
        const target = e.target;

        // Check if clicking on an element (not the SVG background)
        if (target !== this.svgElement && target.closest('#vectorCanvas')) {
            const elementData = this.elements.find(el => el.element === target);

            if (elementData) {
                if (e.shiftKey) {
                    // Add to selection
                    this.addToSelection(elementData);
                } else {
                    // Replace selection
                    this.clearSelection();
                    this.addToSelection(elementData);
                }

                // Start drag
                this.isDragging = true;
                this.dragStartPos = pos;
                this.elementStartPositions = this.getElementPositions();
                return;
            }
        }

        // Clicked on empty space - clear selection
        if (!e.shiftKey) {
            this.clearSelection();
        }
    }

    addToSelection(elementData) {
        if (!this.selectedElements.includes(elementData)) {
            this.selectedElements.push(elementData);
            this.highlightElement(elementData.element);
        }
    }

    clearSelection() {
        this.selectedElements.forEach(el => {
            this.unhighlightElement(el.element);
        });
        this.selectedElements = [];
        this.removeSelectionBox();
    }

    selectAll() {
        this.clearSelection();
        this.elements.forEach(el => {
            this.addToSelection(el);
        });
    }

    highlightElement(element) {
        element.classList.add('vector-selected');
        this.updateSelectionBox();
    }

    unhighlightElement(element) {
        element.classList.remove('vector-selected');
    }

    updateSelectionBox() {
        // Remove existing box
        this.removeSelectionBox();

        if (this.selectedElements.length === 0) return;

        // Calculate bounding box
        const bounds = this.getSelectionBounds();
        if (!bounds) return;

        // Create selection rectangle
        this.selectionBox = document.createElementNS(this.svgNS, 'rect');
        this.selectionBox.setAttribute('x', bounds.x - 2);
        this.selectionBox.setAttribute('y', bounds.y - 2);
        this.selectionBox.setAttribute('width', bounds.width + 4);
        this.selectionBox.setAttribute('height', bounds.height + 4);
        this.selectionBox.setAttribute('fill', 'none');
        this.selectionBox.setAttribute('stroke', '#8b5cf6');
        this.selectionBox.setAttribute('stroke-width', '1');
        this.selectionBox.setAttribute('stroke-dasharray', '4 2');
        this.selectionBox.setAttribute('pointer-events', 'none');
        this.selectionBox.setAttribute('class', 'selection-box');

        this.selectionGroup.appendChild(this.selectionBox);
        this.svgElement.appendChild(this.selectionGroup);
    }

    removeSelectionBox() {
        if (this.selectionBox) {
            this.selectionBox.remove();
            this.selectionBox = null;
        }
    }

    getSelectionBounds() {
        if (this.selectedElements.length === 0) return null;

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.selectedElements.forEach(el => {
            const bbox = el.element.getBBox();
            minX = Math.min(minX, bbox.x);
            minY = Math.min(minY, bbox.y);
            maxX = Math.max(maxX, bbox.x + bbox.width);
            maxY = Math.max(maxY, bbox.y + bbox.height);
        });

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    getElementPositions() {
        return this.selectedElements.map(el => {
            const element = el.element;
            if (element.tagName === 'path') {
                return { element, transform: element.getAttribute('transform') || '' };
            } else if (element.tagName === 'line') {
                return {
                    element,
                    x1: parseFloat(element.getAttribute('x1')),
                    y1: parseFloat(element.getAttribute('y1')),
                    x2: parseFloat(element.getAttribute('x2')),
                    y2: parseFloat(element.getAttribute('y2'))
                };
            } else if (element.tagName === 'rect') {
                return {
                    element,
                    x: parseFloat(element.getAttribute('x')),
                    y: parseFloat(element.getAttribute('y'))
                };
            } else if (element.tagName === 'ellipse') {
                return {
                    element,
                    cx: parseFloat(element.getAttribute('cx')),
                    cy: parseFloat(element.getAttribute('cy'))
                };
            } else if (element.tagName === 'text') {
                return {
                    element,
                    x: parseFloat(element.getAttribute('x')),
                    y: parseFloat(element.getAttribute('y'))
                };
            }
            return { element };
        });
    }

    dragElements(pos) {
        if (!this.dragStartPos || !this.elementStartPositions) return;

        const dx = pos.x - this.dragStartPos.x;
        const dy = pos.y - this.dragStartPos.y;

        this.elementStartPositions.forEach(startPos => {
            const element = startPos.element;

            if (element.tagName === 'path') {
                element.setAttribute('transform', `translate(${dx}, ${dy})`);
            } else if (element.tagName === 'line') {
                element.setAttribute('x1', startPos.x1 + dx);
                element.setAttribute('y1', startPos.y1 + dy);
                element.setAttribute('x2', startPos.x2 + dx);
                element.setAttribute('y2', startPos.y2 + dy);
            } else if (element.tagName === 'rect') {
                element.setAttribute('x', startPos.x + dx);
                element.setAttribute('y', startPos.y + dy);
            } else if (element.tagName === 'ellipse') {
                element.setAttribute('cx', startPos.cx + dx);
                element.setAttribute('cy', startPos.cy + dy);
            } else if (element.tagName === 'text') {
                element.setAttribute('x', startPos.x + dx);
                element.setAttribute('y', startPos.y + dy);
            }
        });

        this.updateSelectionBox();
    }

    deleteSelected() {
        this.selectedElements.forEach(el => {
            el.element.remove();
            const index = this.elements.indexOf(el);
            if (index > -1) {
                this.elements.splice(index, 1);
            }
        });

        this.selectedElements = [];
        this.removeSelectionBox();
        this.saveState();
        this.app.markUnsaved?.();
        this.app.ui?.showNotification('Prvky smazány', 'success');
    }

    // ==========================================
    // Layer Management
    // ==========================================

    addLayer(name = 'Nová vrstva') {
        const id = this.generateId('layer');

        const layerGroup = document.createElementNS(this.svgNS, 'g');
        layerGroup.setAttribute('id', id);
        layerGroup.setAttribute('data-name', name);

        // Insert before selection overlay
        this.svgElement.insertBefore(layerGroup, this.selectionGroup);

        const layer = {
            id,
            name,
            visible: true,
            locked: false,
            opacity: 1,
            group: layerGroup
        };

        this.layers.push(layer);
        this.activeLayerId = id;

        return layer;
    }

    getActiveLayer() {
        return this.layers.find(l => l.id === this.activeLayerId);
    }

    getActiveLayerGroup() {
        const layer = this.getActiveLayer();
        return layer ? layer.group : null;
    }

    setActiveLayer(layerId) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            this.activeLayerId = layerId;
        }
    }

    // ==========================================
    // History (Undo/Redo)
    // ==========================================

    saveState() {
        // Remove future states if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Save current SVG state
        const state = this.svgElement.innerHTML;
        this.history.push(state);

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        this.historyIndex = this.history.length - 1;
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
            this.app.ui?.showNotification('Zpět', 'info');
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
            this.app.ui?.showNotification('Vpřed', 'info');
        }
    }

    restoreState(state) {
        if (!this.svgElement) return;

        this.svgElement.innerHTML = state;

        // Rebuild elements array
        this.rebuildElementsArray();

        // Re-add selection group
        this.selectionGroup = document.createElementNS(this.svgNS, 'g');
        this.selectionGroup.setAttribute('id', 'selection-overlay');
        this.selectionGroup.setAttribute('pointer-events', 'none');
        this.svgElement.appendChild(this.selectionGroup);

        // Clear selection
        this.selectedElements = [];
    }

    rebuildElementsArray() {
        this.elements = [];
        this.layers = [];

        // Find all layer groups
        const groups = this.svgElement.querySelectorAll('g[id^="layer-"]');
        groups.forEach(group => {
            const layer = {
                id: group.getAttribute('id'),
                name: group.getAttribute('data-name') || 'Vrstva',
                visible: true,
                locked: false,
                opacity: 1,
                group: group
            };
            this.layers.push(layer);

            // Find all elements in this layer
            group.childNodes.forEach(child => {
                if (child.nodeType === 1 && child.id) {
                    this.elements.push({
                        id: child.id,
                        type: child.tagName,
                        element: child,
                        layerId: layer.id
                    });
                }
            });
        });

        if (this.layers.length > 0) {
            this.activeLayerId = this.layers[0].id;
        }
    }

    // ==========================================
    // Tool Settings
    // ==========================================

    setTool(toolName) {
        this.currentTool = toolName;
        this.clearSelection();
    }

    setStrokeColor(color) {
        this.toolSettings.stroke = color;
        this.applyToSelected('stroke', color);
    }

    setFillColor(color) {
        this.toolSettings.fill = color;
        this.applyToSelected('fill', color);
    }

    setStrokeWidth(width) {
        this.toolSettings.strokeWidth = width;
        this.applyToSelected('stroke-width', width);
    }

    setOpacity(opacity) {
        this.toolSettings.opacity = opacity;
        this.applyToSelected('opacity', opacity);
    }

    applyToSelected(attr, value) {
        this.selectedElements.forEach(el => {
            el.element.setAttribute(attr, value);
        });
        if (this.selectedElements.length > 0) {
            this.saveState();
        }
    }

    // ==========================================
    // Export
    // ==========================================

    /**
     * Export as SVG string
     */
    exportSVG() {
        if (!this.svgElement) return '';

        // Clone SVG for export
        const clone = this.svgElement.cloneNode(true);

        // Remove selection overlay
        const selectionOverlay = clone.querySelector('#selection-overlay');
        if (selectionOverlay) {
            selectionOverlay.remove();
        }

        // Remove selection classes
        clone.querySelectorAll('.vector-selected').forEach(el => {
            el.classList.remove('vector-selected');
        });

        // Add XML declaration and doctype
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(clone);

        return '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;
    }

    /**
     * Export as PNG data URL
     */
    async exportPNG(scale = 1) {
        return new Promise((resolve, reject) => {
            const svgString = this.exportSVG();
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = this.width * scale;
                canvas.height = this.height * scale;

                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to render SVG to PNG'));
            };
            img.src = url;
        });
    }

    /**
     * Download SVG file
     */
    downloadSVG(filename = 'vector-image') {
        const svgString = this.exportSVG();
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.svg`;
        link.click();

        URL.revokeObjectURL(url);
        this.app.ui?.showNotification('SVG exportováno', 'success');
    }

    /**
     * Download PNG file
     */
    async downloadPNG(filename = 'vector-image', scale = 1) {
        try {
            const dataUrl = await this.exportPNG(scale);

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${filename}.png`;
            link.click();

            this.app.ui?.showNotification('PNG exportováno', 'success');
        } catch (error) {
            console.error('PNG export error:', error);
            this.app.ui?.showNotification('Chyba při exportu PNG', 'error');
        }
    }

    // ==========================================
    // Serialization (Save/Load)
    // ==========================================

    serialize() {
        return {
            width: this.width,
            height: this.height,
            svgContent: this.exportSVG(),
            layers: this.layers.map(l => ({
                id: l.id,
                name: l.name,
                visible: l.visible,
                locked: l.locked,
                opacity: l.opacity
            }))
        };
    }

    deserialize(data) {
        if (!data) return;

        this.width = data.width || 1920;
        this.height = data.height || 1080;

        // Parse SVG content
        if (data.svgContent) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.svgContent, 'image/svg+xml');
            const importedSvg = doc.documentElement;

            // Clear current content
            while (this.svgElement.firstChild) {
                this.svgElement.removeChild(this.svgElement.firstChild);
            }

            // Import nodes
            Array.from(importedSvg.childNodes).forEach(node => {
                this.svgElement.appendChild(document.importNode(node, true));
            });

            // Rebuild arrays
            this.rebuildElementsArray();
        }
    }

    // ==========================================
    // Utilities
    // ==========================================

    generateId(prefix) {
        this.idCounter++;
        return `${prefix}-${Date.now()}-${this.idCounter}`;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;

        if (this.svgElement) {
            this.svgElement.setAttribute('width', width);
            this.svgElement.setAttribute('height', height);
            this.svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
    }

    clear() {
        this.elements = [];
        this.selectedElements = [];

        // Keep only defs and create fresh layer
        if (this.svgElement) {
            while (this.svgElement.childNodes.length > 0) {
                this.svgElement.removeChild(this.svgElement.firstChild);
            }

            // Re-add defs
            this.defsElement = document.createElementNS(this.svgNS, 'defs');
            this.svgElement.appendChild(this.defsElement);

            // Re-add selection group
            this.selectionGroup = document.createElementNS(this.svgNS, 'g');
            this.selectionGroup.setAttribute('id', 'selection-overlay');
            this.selectionGroup.setAttribute('pointer-events', 'none');

            // Create default layer
            this.layers = [];
            this.addLayer('Vrstva 1');

            this.svgElement.appendChild(this.selectionGroup);
        }

        this.history = [];
        this.historyIndex = -1;
        this.saveState();
    }

    /**
     * Set background color
     */
    setBackgroundColor(color) {
        if (this.svgElement) {
            if (color === 'transparent') {
                this.svgElement.style.backgroundColor = 'transparent';
                // Add checkerboard pattern for transparency
                this.svgElement.style.backgroundImage =
                    'linear-gradient(45deg, #e0e0e0 25%, transparent 25%), ' +
                    'linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), ' +
                    'linear-gradient(45deg, transparent 75%, #e0e0e0 75%), ' +
                    'linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)';
                this.svgElement.style.backgroundSize = '20px 20px';
                this.svgElement.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';
            } else {
                this.svgElement.style.backgroundColor = color;
                this.svgElement.style.backgroundImage = 'none';
            }
        }
    }
}
