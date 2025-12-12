/**
 * CanvasManager - Handles canvas rendering, zoom, pan, and input
 */

export class CanvasManager {
    constructor(app) {
        this.app = app;

        // DOM elements
        this.container = null;
        this.wrapper = null;
        this.mainCanvas = null;
        this.previewCanvas = null;
        this.mainCtx = null;
        this.previewCtx = null;

        // Canvas dimensions
        this.width = 1920;
        this.height = 1080;

        // View state
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.minZoom = 0.1;
        this.maxZoom = 10;

        // Input state
        this.isDrawing = false;
        this.isPanning = false;
        this.lastX = 0;
        this.lastY = 0;
        this.pressure = 0.5;

        // Touch state
        this.touches = new Map();
        this.initialPinchDistance = 0;
        this.initialZoom = 1;

        // Stroke data for current drawing operation
        this.currentStroke = [];

        // RAF for smooth rendering
        this.renderRequested = false;
    }

    /**
     * Initialize canvas manager
     */
    async init() {
        // Get DOM elements
        this.container = document.getElementById('canvasContainer');
        this.wrapper = document.getElementById('canvasWrapper');
        this.mainCanvas = document.getElementById('mainCanvas');
        this.previewCanvas = document.getElementById('previewCanvas');

        if (!this.container || !this.mainCanvas) {
            throw new Error('Canvas elements not found');
        }

        this.mainCtx = this.mainCanvas.getContext('2d', { willReadFrequently: true });
        this.previewCtx = this.previewCanvas.getContext('2d');

        // Setup event listeners
        this.setupEventListeners();

        // Initial resize
        this.resize(this.width, this.height);

        // Center canvas
        this.centerCanvas();
    }

    /**
     * Resize canvas to new dimensions
     */
    resize(width, height) {
        this.width = width;
        this.height = height;

        // Resize main canvas
        this.mainCanvas.width = width;
        this.mainCanvas.height = height;

        // Resize preview canvas
        this.previewCanvas.width = width;
        this.previewCanvas.height = height;

        // Update wrapper size
        this.wrapper.style.width = `${width}px`;
        this.wrapper.style.height = `${height}px`;

        // Recenter
        this.centerCanvas();
    }

    /**
     * Center canvas in container
     */
    centerCanvas() {
        const containerRect = this.container.getBoundingClientRect();

        // Calculate zoom to fit
        const fitZoomX = (containerRect.width - 40) / this.width;
        const fitZoomY = (containerRect.height - 40) / this.height;
        const fitZoom = Math.min(fitZoomX, fitZoomY, 1);

        // Set initial zoom
        this.zoom = fitZoom;

        // Center position
        this.panX = (containerRect.width - this.width * this.zoom) / 2;
        this.panY = (containerRect.height - this.height * this.zoom) / 2;

        this.updateTransform();
    }

    /**
     * Update canvas transform (zoom and pan)
     */
    updateTransform() {
        this.wrapper.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        this.app.ui?.updateZoomLevel(Math.round(this.zoom * 100));
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Pointer events for drawing (supports pressure)
        this.container.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        this.container.addEventListener('pointermove', this.handlePointerMove.bind(this));
        this.container.addEventListener('pointerup', this.handlePointerUp.bind(this));
        this.container.addEventListener('pointercancel', this.handlePointerUp.bind(this));
        this.container.addEventListener('pointerleave', this.handlePointerUp.bind(this));

        // Prevent context menu
        this.container.addEventListener('contextmenu', (e) => e.preventDefault());

        // Mouse wheel for zoom
        this.container.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

        // Touch events for multi-touch gestures
        this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.container.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        // Window resize
        window.addEventListener('resize', () => {
            requestAnimationFrame(() => this.centerCanvas());
        });
    }

    /**
     * Convert screen coordinates to canvas coordinates
     */
    screenToCanvas(screenX, screenY) {
        const containerRect = this.container.getBoundingClientRect();
        const x = (screenX - containerRect.left - this.panX) / this.zoom;
        const y = (screenY - containerRect.top - this.panY) / this.zoom;
        return { x, y };
    }

    /**
     * Handle pointer down event
     */
    handlePointerDown(e) {
        // Middle mouse button or space+click for panning
        if (e.button === 1 || (e.button === 0 && this.spacePressed)) {
            this.startPan(e);
            return;
        }

        // Left mouse button for drawing
        if (e.button === 0) {
            this.startDraw(e);
        }
    }

    /**
     * Handle pointer move event
     */
    handlePointerMove(e) {
        // Update cursor position display
        const pos = this.screenToCanvas(e.clientX, e.clientY);
        this.app.ui?.updateCursorPosition(Math.round(pos.x), Math.round(pos.y));

        if (this.isPanning) {
            this.pan(e);
            return;
        }

        if (this.isDrawing) {
            this.draw(e);
        }
    }

    /**
     * Handle pointer up event
     */
    handlePointerUp(e) {
        if (this.isPanning) {
            this.endPan();
            return;
        }

        if (this.isDrawing) {
            this.endDraw(e);
        }
    }

    /**
     * Start drawing
     */
    startDraw(e) {
        this.isDrawing = true;
        this.container.setPointerCapture(e.pointerId);

        const pos = this.screenToCanvas(e.clientX, e.clientY);
        this.pressure = e.pressure || 0.5;

        // Initialize stroke
        this.currentStroke = [{
            x: pos.x,
            y: pos.y,
            pressure: this.pressure
        }];

        this.lastX = pos.x;
        this.lastY = pos.y;

        // Start history record
        this.app.history.startAction();

        // Notify tool
        const tool = this.app.tools.currentToolInstance;
        if (tool && tool.onStart) {
            tool.onStart(pos.x, pos.y, this.pressure);
        }
    }

    /**
     * Continue drawing
     */
    draw(e) {
        const pos = this.screenToCanvas(e.clientX, e.clientY);
        this.pressure = e.pressure || 0.5;

        // Update pressure display
        if (this.app.settings.pressureSensitivity && e.pressure !== undefined) {
            this.app.ui?.updatePressure(Math.round(this.pressure * 100));
        }

        // Add to stroke
        this.currentStroke.push({
            x: pos.x,
            y: pos.y,
            pressure: this.pressure
        });

        // Get tool
        const tool = this.app.tools.currentToolInstance;
        if (tool && tool.onMove) {
            // Apply StreamLine smoothing if enabled
            let drawPos = pos;
            if (this.app.settings.streamlineEnabled && this.app.streamLine) {
                drawPos = this.app.streamLine.smooth(pos.x, pos.y);
            }

            tool.onMove(drawPos.x, drawPos.y, this.pressure, this.lastX, this.lastY);
        }

        this.lastX = pos.x;
        this.lastY = pos.y;
    }

    /**
     * End drawing
     */
    endDraw(e) {
        if (!this.isDrawing) return;

        this.isDrawing = false;
        this.container.releasePointerCapture(e.pointerId);

        // Get final position
        const pos = this.screenToCanvas(e.clientX, e.clientY);

        // Check for QuickShape
        if (this.app.settings.quickshapeEnabled && this.app.quickShape) {
            const shape = this.app.quickShape.detect(this.currentStroke);
            if (shape) {
                // Replace freehand with shape (pass original points for clearing)
                this.app.quickShape.drawShape(shape, this.currentStroke);
                this.app.ui?.showQuickShapeIndicator(shape.type);
            }
        }

        // Notify tool
        const tool = this.app.tools.currentToolInstance;
        if (tool && tool.onEnd) {
            tool.onEnd(pos.x, pos.y);
        }

        // Reset StreamLine
        if (this.app.streamLine) {
            this.app.streamLine.reset();
        }

        // Clear preview
        this.clearPreview();

        // End history record
        this.app.history.endAction();

        // Mark as unsaved
        this.app.markUnsaved();

        // Re-render
        this.render();
    }

    /**
     * Start panning
     */
    startPan(e) {
        this.isPanning = true;
        this.container.style.cursor = 'grabbing';
        this.lastX = e.clientX;
        this.lastY = e.clientY;
    }

    /**
     * Pan the canvas
     */
    pan(e) {
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;

        this.panX += dx;
        this.panY += dy;

        this.lastX = e.clientX;
        this.lastY = e.clientY;

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
     * Handle mouse wheel for zoom
     */
    handleWheel(e) {
        e.preventDefault();

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * delta));

        // Zoom towards cursor position
        const containerRect = this.container.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;

        const zoomRatio = newZoom / this.zoom;

        this.panX = mouseX - (mouseX - this.panX) * zoomRatio;
        this.panY = mouseY - (mouseY - this.panY) * zoomRatio;
        this.zoom = newZoom;

        this.updateTransform();
    }

    /**
     * Handle touch start for pinch zoom
     */
    handleTouchStart(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            this.initialPinchDistance = this.getTouchDistance(e.touches);
            this.initialZoom = this.zoom;
        }
    }

    /**
     * Handle touch move for pinch zoom
     */
    handleTouchMove(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const currentDistance = this.getTouchDistance(e.touches);
            const scale = currentDistance / this.initialPinchDistance;
            this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.initialZoom * scale));
            this.updateTransform();
        }
    }

    /**
     * Handle touch end
     */
    handleTouchEnd(e) {
        this.initialPinchDistance = 0;
    }

    /**
     * Get distance between two touches
     */
    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyDown(e) {
        // Space for pan mode
        if (e.code === 'Space' && !this.spacePressed) {
            this.spacePressed = true;
            this.container.style.cursor = 'grab';
        }

        // Get current shortcuts from UI controller
        const shortcuts = this.app.ui?.currentShortcuts || {
            brush: 'B', pencil: 'P', eraser: 'E', line: 'L',
            rectangle: 'U', ellipse: 'O', fill: 'G', eyedropper: 'I',
            move: 'V', swapColors: 'X'
        };

        // Tool shortcuts (single keys without Ctrl/Meta)
        if (!e.ctrlKey && !e.metaKey) {
            const key = e.key.toUpperCase();

            // Check each tool shortcut
            if (key === shortcuts.brush?.toUpperCase()) { this.app.setTool('brush'); }
            else if (key === shortcuts.pencil?.toUpperCase()) { this.app.setTool('pencil'); }
            else if (key === shortcuts.eraser?.toUpperCase()) { this.app.setTool('eraser'); }
            else if (key === shortcuts.fill?.toUpperCase()) { this.app.setTool('fill'); }
            else if (key === shortcuts.eyedropper?.toUpperCase()) { this.app.setTool('eyedropper'); }
            else if (key === shortcuts.move?.toUpperCase()) { this.app.setTool('move'); }
            else if (key === shortcuts.line?.toUpperCase()) { this.app.setTool('line'); }
            else if (key === shortcuts.rectangle?.toUpperCase()) { this.app.setTool('rectangle'); }
            else if (key === shortcuts.ellipse?.toUpperCase()) { this.app.setTool('ellipse'); }
            else if (key === shortcuts.swapColors?.toUpperCase()) { this.app.color?.swapColors(); }

            // Brush size shortcuts (always [ and ])
            if (e.key === '[') { this.decreaseBrushSize(); }
            if (e.key === ']') { this.increaseBrushSize(); }
        }

        // Ctrl shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.app.history.redo();
                    } else {
                        this.app.history.undo();
                    }
                    break;
                case 'y':
                    e.preventDefault();
                    this.app.history.redo();
                    break;
                case 's':
                    e.preventDefault();
                    this.app.saveProject();
                    break;
                case '0':
                    e.preventDefault();
                    this.resetZoom();
                    break;
                case '=':
                case '+':
                    e.preventDefault();
                    this.zoomIn();
                    break;
                case '-':
                    e.preventDefault();
                    this.zoomOut();
                    break;
            }
        }
    }

    /**
     * Handle key up
     */
    handleKeyUp(e) {
        if (e.code === 'Space') {
            this.spacePressed = false;
            if (!this.isPanning) {
                this.container.style.cursor = '';
            }
        }
    }

    /**
     * Zoom in
     */
    zoomIn() {
        this.zoom = Math.min(this.maxZoom, this.zoom * 1.2);
        this.updateTransform();
    }

    /**
     * Zoom out
     */
    zoomOut() {
        this.zoom = Math.max(this.minZoom, this.zoom / 1.2);
        this.updateTransform();
    }

    /**
     * Reset zoom to 100%
     */
    resetZoom() {
        this.zoom = 1;
        this.centerCanvas();
    }

    /**
     * Fit canvas in view
     */
    fitToView() {
        this.centerCanvas();
    }

    /**
     * Increase brush size
     */
    increaseBrushSize() {
        const newSize = Math.min(200, this.app.brush.size + 5);
        this.app.brush.size = newSize;
        this.app.ui?.updateBrushSize(newSize);
    }

    /**
     * Decrease brush size
     */
    decreaseBrushSize() {
        const newSize = Math.max(1, this.app.brush.size - 5);
        this.app.brush.size = newSize;
        this.app.ui?.updateBrushSize(newSize);
    }

    /**
     * Render all layers to main canvas
     */
    render() {
        if (this.renderRequested) return;

        this.renderRequested = true;
        requestAnimationFrame(() => {
            this.renderRequested = false;
            this.doRender();
        });
    }

    /**
     * Perform actual render
     */
    doRender() {
        // Clear main canvas
        this.mainCtx.clearRect(0, 0, this.width, this.height);

        // Composite all visible layers
        this.app.layers.getLayers().forEach(layer => {
            if (!layer.visible) return;

            this.mainCtx.save();
            this.mainCtx.globalAlpha = layer.opacity;
            this.mainCtx.globalCompositeOperation = layer.blendMode;
            this.mainCtx.drawImage(layer.canvas, 0, 0);
            this.mainCtx.restore();
        });
    }

    /**
     * Clear preview canvas
     */
    clearPreview() {
        this.previewCtx.clearRect(0, 0, this.width, this.height);
    }

    /**
     * Get preview context for tool preview
     */
    getPreviewContext() {
        return this.previewCtx;
    }

    /**
     * Export canvas as data URL
     */
    export(format = 'png', quality = 0.92) {
        const mimeType = format === 'png' ? 'image/png' :
                        format === 'jpeg' ? 'image/jpeg' :
                        format === 'webp' ? 'image/webp' : 'image/png';

        return this.mainCanvas.toDataURL(mimeType, quality);
    }

    /**
     * Get canvas image data
     */
    getImageData() {
        return this.mainCtx.getImageData(0, 0, this.width, this.height);
    }
}
