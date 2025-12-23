/**
 * RulerGuideManager - Manages rulers and guides for snapping
 * Works in all modes: Digital Painting, Pixel Art, Vector
 */

export class RulerGuideManager {
    constructor(app) {
        this.app = app;

        // Ruler settings
        this.rulers = {
            enabled: false,
            size: 20,                  // Ruler height/width in pixels
            backgroundColor: '#1e1e2e',
            textColor: '#a0a0b0',
            tickColor: '#505070',
            majorTickInterval: 100,    // Major tick every N pixels
            minorTickInterval: 10,     // Minor tick every N pixels
            font: '9px system-ui, sans-serif'
        };

        // Guide settings
        this.guides = {
            enabled: false,
            horizontal: [],            // Array of Y positions
            vertical: [],              // Array of X positions
            color: '#00bfff',
            opacity: 0.8,
            width: 1,
            snapDistance: 8            // Snap distance in screen pixels
        };

        // Snapping settings
        this.snapping = {
            enabled: false,
            toGuides: true,
            toEdges: true,             // Canvas edges (corners)
            toCenter: true,            // Canvas center lines
            toHalves: true,            // Canvas halves (1/4, 3/4)
            snapDistance: 8            // Snap distance in screen pixels
        };

        // DOM elements for rulers
        this.rulerTop = null;
        this.rulerLeft = null;
        this.rulerCorner = null;

        // Cursor position indicator on rulers
        this.cursorX = 0;
        this.cursorY = 0;

        // Dragging guide state
        this.draggingGuide = null;
    }

    /**
     * Initialize rulers and guides
     */
    init() {
        this.createRulerElements();
        this.setupEventListeners();
        this.updateRulers();
    }

    /**
     * Create ruler DOM elements
     */
    createRulerElements() {
        const canvasContainer = document.getElementById('canvasContainer');
        if (!canvasContainer) return;

        // Create ruler container wrapper
        const rulerWrapper = document.createElement('div');
        rulerWrapper.className = 'ruler-wrapper';
        rulerWrapper.id = 'rulerWrapper';

        // Corner piece (top-left)
        this.rulerCorner = document.createElement('div');
        this.rulerCorner.className = 'ruler-corner';
        this.rulerCorner.innerHTML = `
            <svg viewBox="0 0 20 20" width="20" height="20">
                <path d="M0 0h20v20H0z" fill="var(--ruler-bg, #1e1e2e)"/>
                <path d="M5 10h10M10 5v10" stroke="var(--ruler-tick, #505070)" stroke-width="1"/>
            </svg>
        `;
        rulerWrapper.appendChild(this.rulerCorner);

        // Top ruler (horizontal)
        this.rulerTop = document.createElement('canvas');
        this.rulerTop.className = 'ruler ruler-top';
        this.rulerTop.id = 'rulerTop';
        rulerWrapper.appendChild(this.rulerTop);

        // Left ruler (vertical)
        this.rulerLeft = document.createElement('canvas');
        this.rulerLeft.className = 'ruler ruler-left';
        this.rulerLeft.id = 'rulerLeft';
        rulerWrapper.appendChild(this.rulerLeft);

        // Insert as first child of canvas container
        canvasContainer.insertBefore(rulerWrapper, canvasContainer.firstChild);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for canvas pan/zoom changes
        window.addEventListener('resize', () => this.updateRulers());

        // Track cursor position for ruler indicators
        const canvasContainer = document.getElementById('canvasContainer');
        if (canvasContainer) {
            canvasContainer.addEventListener('pointermove', (e) => {
                if (this.app.canvas) {
                    const pos = this.app.canvas.screenToCanvas(e.clientX, e.clientY);
                    this.cursorX = pos.x;
                    this.cursorY = pos.y;
                    this.updateRulerCursor();
                }
            });
        }

        // Guide dragging from rulers
        if (this.rulerTop) {
            this.rulerTop.addEventListener('mousedown', (e) => this.startGuideFromRuler(e, 'horizontal'));
            this.rulerTop.addEventListener('dblclick', (e) => this.addGuideFromRuler(e, 'horizontal'));
        }
        if (this.rulerLeft) {
            this.rulerLeft.addEventListener('mousedown', (e) => this.startGuideFromRuler(e, 'vertical'));
            this.rulerLeft.addEventListener('dblclick', (e) => this.addGuideFromRuler(e, 'vertical'));
        }

        // Global mouse events for guide dragging
        document.addEventListener('mousemove', (e) => this.dragGuide(e));
        document.addEventListener('mouseup', () => this.endGuide());
    }

    /**
     * Enable/disable rulers
     */
    setRulersEnabled(enabled) {
        this.rulers.enabled = enabled;
        const wrapper = document.getElementById('rulerWrapper');
        if (wrapper) {
            wrapper.classList.toggle('visible', enabled);
        }
        if (enabled) {
            this.updateRulers();
        }
        this.app.canvas?.render();
    }

    /**
     * Enable/disable snapping
     */
    setSnappingEnabled(enabled) {
        this.snapping.enabled = enabled;
    }

    /**
     * Enable/disable guides
     */
    setGuidesEnabled(enabled) {
        this.guides.enabled = enabled;
        // Trigger overlay update
        if (this.app.ui?.pixelArtUI) {
            this.app.ui.pixelArtUI.updateGridOverlay();
        }
        this.app.canvas?.render();
    }

    /**
     * Add a horizontal guide at position Y
     */
    addHorizontalGuide(y) {
        if (!this.guides.horizontal.includes(y)) {
            this.guides.horizontal.push(y);
            this.triggerOverlayUpdate();
        }
    }

    /**
     * Add a vertical guide at position X
     */
    addVerticalGuide(x) {
        if (!this.guides.vertical.includes(x)) {
            this.guides.vertical.push(x);
            this.triggerOverlayUpdate();
        }
    }

    /**
     * Remove a horizontal guide
     */
    removeHorizontalGuide(index) {
        this.guides.horizontal.splice(index, 1);
        this.triggerOverlayUpdate();
    }

    /**
     * Remove a vertical guide
     */
    removeVerticalGuide(index) {
        this.guides.vertical.splice(index, 1);
        this.triggerOverlayUpdate();
    }

    /**
     * Clear all guides
     */
    clearGuides() {
        this.guides.horizontal = [];
        this.guides.vertical = [];
        this.triggerOverlayUpdate();
    }

    /**
     * Trigger overlay canvas update
     */
    triggerOverlayUpdate() {
        if (this.app.ui?.pixelArtUI) {
            this.app.ui.pixelArtUI.updateGridOverlay();
        }
        this.app.canvas?.render();
    }

    /**
     * Start dragging a new guide from ruler
     */
    startGuideFromRuler(e, orientation) {
        if (!this.guides.enabled) return;

        this.draggingGuide = {
            orientation,
            isNew: true
        };

        document.body.style.cursor = orientation === 'horizontal' ? 'row-resize' : 'col-resize';
    }

    /**
     * Add guide from ruler double-click
     */
    addGuideFromRuler(e, orientation) {
        if (!this.guides.enabled) return;

        const pos = this.app.canvas.screenToCanvas(e.clientX, e.clientY);
        if (orientation === 'horizontal') {
            this.addHorizontalGuide(Math.round(pos.y));
        } else {
            this.addVerticalGuide(Math.round(pos.x));
        }
    }

    /**
     * Handle guide dragging
     */
    dragGuide(e) {
        if (!this.draggingGuide) return;

        // Show preview cursor
        document.body.style.cursor = this.draggingGuide.orientation === 'horizontal' ? 'row-resize' : 'col-resize';
    }

    /**
     * End guide dragging
     */
    endGuide() {
        if (!this.draggingGuide) return;

        // Add the guide at cursor position
        if (this.draggingGuide.isNew) {
            if (this.draggingGuide.orientation === 'horizontal') {
                this.addHorizontalGuide(Math.round(this.cursorY));
            } else {
                this.addVerticalGuide(Math.round(this.cursorX));
            }
        }

        this.draggingGuide = null;
        document.body.style.cursor = '';
    }

    /**
     * Update rulers display
     */
    updateRulers() {
        if (!this.rulers.enabled || !this.rulerTop || !this.rulerLeft) return;

        const canvas = this.app.canvas;
        if (!canvas) return;

        const container = canvas.container;
        const zoom = canvas.zoom;
        const panX = canvas.panX;
        const panY = canvas.panY;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // Update ruler sizes
        const containerRect = container.getBoundingClientRect();
        this.rulerTop.width = containerRect.width;
        this.rulerTop.height = this.rulers.size;
        this.rulerLeft.width = this.rulers.size;
        this.rulerLeft.height = containerRect.height;

        // Render horizontal ruler
        this.renderHorizontalRuler(zoom, panX, canvasWidth);

        // Render vertical ruler
        this.renderVerticalRuler(zoom, panY, canvasHeight);
    }

    /**
     * Render horizontal (top) ruler
     */
    renderHorizontalRuler(zoom, panX, canvasWidth) {
        const ctx = this.rulerTop.getContext('2d');
        const width = this.rulerTop.width;
        const height = this.rulerTop.height;

        // Clear
        ctx.fillStyle = this.rulers.backgroundColor;
        ctx.fillRect(0, 0, width, height);

        // Calculate tick interval based on zoom
        let majorInterval = this.rulers.majorTickInterval;
        let minorInterval = this.rulers.minorTickInterval;

        // Adaptive intervals based on zoom
        if (zoom < 0.25) {
            majorInterval = 500;
            minorInterval = 100;
        } else if (zoom < 0.5) {
            majorInterval = 200;
            minorInterval = 50;
        } else if (zoom > 2) {
            majorInterval = 50;
            minorInterval = 10;
        } else if (zoom > 4) {
            majorInterval = 20;
            minorInterval = 5;
        }

        ctx.strokeStyle = this.rulers.tickColor;
        ctx.fillStyle = this.rulers.textColor;
        ctx.font = this.rulers.font;
        ctx.textAlign = 'center';

        // Calculate visible range
        const startX = Math.floor(-panX / zoom / minorInterval) * minorInterval;
        const endX = Math.ceil((width - panX) / zoom / minorInterval) * minorInterval;

        // Clamp to canvas bounds
        const clampedStart = Math.max(0, startX);
        const clampedEnd = Math.min(canvasWidth, endX);

        // Draw ticks
        for (let x = clampedStart; x <= clampedEnd; x += minorInterval) {
            const screenX = x * zoom + panX;
            if (screenX < 0 || screenX > width) continue;

            const isMajor = x % majorInterval === 0;
            const tickHeight = isMajor ? 12 : 6;

            ctx.beginPath();
            ctx.moveTo(screenX, height);
            ctx.lineTo(screenX, height - tickHeight);
            ctx.stroke();

            // Draw number for major ticks
            if (isMajor) {
                ctx.fillText(x.toString(), screenX, 10);
            }
        }

        // Draw canvas edge markers
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;

        // Left edge
        let edgeX = panX;
        if (edgeX >= 0 && edgeX <= width) {
            ctx.beginPath();
            ctx.moveTo(edgeX, 0);
            ctx.lineTo(edgeX, height);
            ctx.stroke();
        }

        // Right edge
        edgeX = canvasWidth * zoom + panX;
        if (edgeX >= 0 && edgeX <= width) {
            ctx.beginPath();
            ctx.moveTo(edgeX, 0);
            ctx.lineTo(edgeX, height);
            ctx.stroke();
        }

        ctx.lineWidth = 1;
    }

    /**
     * Render vertical (left) ruler
     */
    renderVerticalRuler(zoom, panY, canvasHeight) {
        const ctx = this.rulerLeft.getContext('2d');
        const width = this.rulerLeft.width;
        const height = this.rulerLeft.height;

        // Clear
        ctx.fillStyle = this.rulers.backgroundColor;
        ctx.fillRect(0, 0, width, height);

        // Calculate tick interval based on zoom
        let majorInterval = this.rulers.majorTickInterval;
        let minorInterval = this.rulers.minorTickInterval;

        if (zoom < 0.25) {
            majorInterval = 500;
            minorInterval = 100;
        } else if (zoom < 0.5) {
            majorInterval = 200;
            minorInterval = 50;
        } else if (zoom > 2) {
            majorInterval = 50;
            minorInterval = 10;
        } else if (zoom > 4) {
            majorInterval = 20;
            minorInterval = 5;
        }

        ctx.strokeStyle = this.rulers.tickColor;
        ctx.fillStyle = this.rulers.textColor;
        ctx.font = this.rulers.font;
        ctx.textAlign = 'left';

        // Calculate visible range
        const startY = Math.floor(-panY / zoom / minorInterval) * minorInterval;
        const endY = Math.ceil((height - panY) / zoom / minorInterval) * minorInterval;

        // Clamp to canvas bounds
        const clampedStart = Math.max(0, startY);
        const clampedEnd = Math.min(canvasHeight, endY);

        // Draw ticks
        for (let y = clampedStart; y <= clampedEnd; y += minorInterval) {
            const screenY = y * zoom + panY;
            if (screenY < 0 || screenY > height) continue;

            const isMajor = y % majorInterval === 0;
            const tickWidth = isMajor ? 12 : 6;

            ctx.beginPath();
            ctx.moveTo(width, screenY);
            ctx.lineTo(width - tickWidth, screenY);
            ctx.stroke();

            // Draw number for major ticks (rotated)
            if (isMajor) {
                ctx.save();
                ctx.translate(10, screenY);
                ctx.rotate(-Math.PI / 2);
                ctx.textAlign = 'center';
                ctx.fillText(y.toString(), 0, 0);
                ctx.restore();
            }
        }

        // Draw canvas edge markers
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;

        // Top edge
        let edgeY = panY;
        if (edgeY >= 0 && edgeY <= height) {
            ctx.beginPath();
            ctx.moveTo(0, edgeY);
            ctx.lineTo(width, edgeY);
            ctx.stroke();
        }

        // Bottom edge
        edgeY = canvasHeight * zoom + panY;
        if (edgeY >= 0 && edgeY <= height) {
            ctx.beginPath();
            ctx.moveTo(0, edgeY);
            ctx.lineTo(width, edgeY);
            ctx.stroke();
        }

        ctx.lineWidth = 1;
    }

    /**
     * Update cursor indicator on rulers
     */
    updateRulerCursor() {
        if (!this.rulers.enabled) return;
        // Could add cursor line indicators here
        // For now, rulers update on zoom/pan change
    }

    /**
     * Render guides on overlay canvas
     * Guides are drawn in canvas space (not screen space)
     */
    renderGuides(ctx, width, height, zoom, panX, panY) {
        if (!this.guides.enabled) return;
        if (this.guides.horizontal.length === 0 && this.guides.vertical.length === 0) return;

        ctx.save();
        ctx.strokeStyle = this.guides.color;
        ctx.globalAlpha = this.guides.opacity;
        ctx.lineWidth = this.guides.width;
        ctx.setLineDash([5, 5]);

        // Horizontal guides (in canvas space, so just use Y directly)
        for (const y of this.guides.horizontal) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Vertical guides (in canvas space, so just use X directly)
        for (const x of this.guides.vertical) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Main snapping method - snaps coordinates to nearest snap point
     * @param {number} x - X coordinate in canvas space
     * @param {number} y - Y coordinate in canvas space
     * @param {Object} options - Snapping options
     * @returns {Object} - Snapped coordinates {x, y, snappedX: boolean, snappedY: boolean}
     */
    snap(x, y, options = {}) {
        if (!this.snapping.enabled) {
            return { x, y, snappedX: false, snappedY: false };
        }

        const canvas = this.app.canvas;
        const zoom = canvas?.zoom || 1;
        const snapDist = this.snapping.snapDistance / zoom;

        let snappedX = x;
        let snappedY = y;
        let didSnapX = false;
        let didSnapY = false;

        const canvasWidth = canvas?.width || 1920;
        const canvasHeight = canvas?.height || 1080;

        // Collect all snap points
        const snapPointsX = [];
        const snapPointsY = [];

        // Canvas edges
        if (this.snapping.toEdges) {
            snapPointsX.push(0, canvasWidth);
            snapPointsY.push(0, canvasHeight);
        }

        // Canvas center
        if (this.snapping.toCenter) {
            snapPointsX.push(canvasWidth / 2);
            snapPointsY.push(canvasHeight / 2);
        }

        // Canvas halves (quarters)
        if (this.snapping.toHalves) {
            snapPointsX.push(canvasWidth / 4, canvasWidth * 3 / 4);
            snapPointsY.push(canvasHeight / 4, canvasHeight * 3 / 4);
        }

        // Guides
        if (this.snapping.toGuides) {
            snapPointsX.push(...this.guides.vertical);
            snapPointsY.push(...this.guides.horizontal);
        }

        // Additional snap points from options (e.g., shape start point)
        if (options.snapPoints) {
            if (options.snapPoints.x) snapPointsX.push(...options.snapPoints.x);
            if (options.snapPoints.y) snapPointsY.push(...options.snapPoints.y);
        }

        // Find nearest X snap point
        for (const sx of snapPointsX) {
            if (Math.abs(x - sx) < snapDist) {
                snappedX = sx;
                didSnapX = true;
                break;
            }
        }

        // Find nearest Y snap point
        for (const sy of snapPointsY) {
            if (Math.abs(y - sy) < snapDist) {
                snappedY = sy;
                didSnapY = true;
                break;
            }
        }

        return {
            x: snappedX,
            y: snappedY,
            snappedX: didSnapX,
            snappedY: didSnapY
        };
    }

    /**
     * Constrain a line to specific angles (0°, 45°, 90°, etc.)
     * Used when Shift is held during line drawing
     * @param {number} startX - Start X coordinate
     * @param {number} startY - Start Y coordinate
     * @param {number} endX - End X coordinate
     * @param {number} endY - End Y coordinate
     * @returns {Object} - Constrained end coordinates {x, y}
     */
    constrainAngle(startX, startY, endX, endY) {
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
            return { x: endX, y: endY };
        }

        // Calculate angle in degrees
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;

        // Snap to nearest 45 degree increment
        const snapAngle = Math.round(angle / 45) * 45;
        const snapRad = snapAngle * Math.PI / 180;

        return {
            x: startX + distance * Math.cos(snapRad),
            y: startY + distance * Math.sin(snapRad)
        };
    }

    /**
     * Constrain rectangle to square (equal width/height)
     * Used when Shift is held during rectangle drawing
     * @param {number} startX - Start X coordinate
     * @param {number} startY - Start Y coordinate
     * @param {number} endX - End X coordinate
     * @param {number} endY - End Y coordinate
     * @returns {Object} - Constrained end coordinates {x, y}
     */
    constrainSquare(startX, startY, endX, endY) {
        const dx = endX - startX;
        const dy = endY - startY;
        const size = Math.max(Math.abs(dx), Math.abs(dy));

        return {
            x: startX + Math.sign(dx) * size,
            y: startY + Math.sign(dy) * size
        };
    }

    /**
     * Constrain ellipse to circle (equal radii)
     * Used when Shift is held during ellipse drawing
     */
    constrainCircle(startX, startY, endX, endY) {
        // Same as square constraint for ellipse
        return this.constrainSquare(startX, startY, endX, endY);
    }

    /**
     * Get snap points for current canvas
     * Returns array of important points for visualization
     */
    getSnapPoints() {
        const canvas = this.app.canvas;
        const canvasWidth = canvas?.width || 1920;
        const canvasHeight = canvas?.height || 1080;

        const points = [];

        // Corners
        if (this.snapping.toEdges) {
            points.push(
                { x: 0, y: 0, type: 'corner' },
                { x: canvasWidth, y: 0, type: 'corner' },
                { x: 0, y: canvasHeight, type: 'corner' },
                { x: canvasWidth, y: canvasHeight, type: 'corner' }
            );
        }

        // Center
        if (this.snapping.toCenter) {
            points.push({
                x: canvasWidth / 2,
                y: canvasHeight / 2,
                type: 'center'
            });
        }

        // Edges midpoints
        if (this.snapping.toHalves) {
            points.push(
                { x: canvasWidth / 2, y: 0, type: 'midpoint' },
                { x: canvasWidth / 2, y: canvasHeight, type: 'midpoint' },
                { x: 0, y: canvasHeight / 2, type: 'midpoint' },
                { x: canvasWidth, y: canvasHeight / 2, type: 'midpoint' }
            );
        }

        return points;
    }

    /**
     * Render snap indicators on overlay
     */
    renderSnapIndicators(ctx, width, height, zoom, panX, panY) {
        if (!this.snapping.enabled) return;

        const points = this.getSnapPoints();

        ctx.save();
        ctx.strokeStyle = '#ff6b6b';
        ctx.fillStyle = '#ff6b6b';
        ctx.globalAlpha = 0.5;

        for (const point of points) {
            const screenX = point.x * zoom + panX;
            const screenY = point.y * zoom + panY;

            // Draw small cross at snap point
            const size = 4;
            ctx.beginPath();
            ctx.moveTo(screenX - size, screenY);
            ctx.lineTo(screenX + size, screenY);
            ctx.moveTo(screenX, screenY - size);
            ctx.lineTo(screenX, screenY + size);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Save settings to storage
     */
    saveSettings() {
        // Could be saved with project or globally
    }

    /**
     * Load settings from storage
     */
    loadSettings() {
        // Could be loaded with project or globally
    }
}
