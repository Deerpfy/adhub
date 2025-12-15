/**
 * PixelArtManager - Main controller for Pixel Art mode
 * Manages all pixel art specific features and UI state
 */

export class PixelArtManager {
    constructor(app) {
        this.app = app;

        // Pixel Art Mode state
        this.enabled = false;

        // Flag to prevent loadSettings from overwriting project config
        this.projectConfigApplied = false;

        // Grid settings
        this.grid = {
            enabled: true,
            size: 16,          // Grid cell size in pixels (power of 2: 1,2,4,8,16,32,64)
            color: '#ffffff',  // Default white for transparent backgrounds
            opacity: 0.3,
            subdivisions: 8,   // Major grid lines every N cells
            subdivisionColor: '#666666'
        };

        // Snap settings
        this.snap = {
            enabled: true,
            toGrid: true,
            toPixels: true
        };

        // Symmetry settings
        this.symmetry = {
            enabled: false,
            mode: 'horizontal', // horizontal, vertical, both, radial
            centerX: null,      // null = canvas center
            centerY: null,
            radialSegments: 8
        };

        // Tile mode settings
        this.tileMode = {
            enabled: false,
            repeatX: 3,
            repeatY: 3
        };

        // Onion skin settings
        this.onionSkin = {
            enabled: false,
            prevFrames: 2,
            nextFrames: 1,
            prevOpacity: 0.3,
            nextOpacity: 0.2,
            prevColor: '#ff0000',
            nextColor: '#00ff00',
            showColors: false
        };

        // Pixel perfect settings
        this.pixelPerfect = {
            enabled: true,
            antiAlias: false
        };

        // Color palette
        this.palette = {
            name: 'Default',
            colors: [],
            maxColors: 256,
            locked: false
        };

        // Animation state
        this.animation = {
            frames: [],
            currentFrame: 0,
            fps: 12,
            playing: false,
            loop: true
        };

        // Dithering settings
        this.dithering = {
            enabled: false,
            pattern: 'bayer4x4', // bayer2x2, bayer4x4, bayer8x8, ordered, floydSteinberg
            strength: 50
        };

        // Reference image
        this.reference = {
            enabled: false,
            image: null,
            opacity: 0.5,
            position: 'right', // left, right, top, bottom, overlay
            scale: 1
        };

        // Color history
        this.colorHistory = [];
        this.maxColorHistory = 32;

        // Rulers and guides
        this.rulers = {
            enabled: false,
            unit: 'px' // px, tile
        };

        this.guides = {
            enabled: false,
            horizontal: [],
            vertical: [],
            snapToGuides: true
        };
    }

    /**
     * Initialize pixel art manager
     */
    init() {
        // Check if project config is pending from welcome screen
        // If so, skip loading settings - they'll be set from config
        if (this.app.pixelArtConfigPending) {
            this.projectConfigApplied = true;
        }

        this.loadSettings();
        this.setupEventListeners();
        this.initDefaultPalettes();
        console.log('PixelArtManager initialized');
    }

    /**
     * Enable/disable pixel art mode
     */
    setEnabled(enabled) {
        this.enabled = enabled;

        if (enabled) {
            this.applyPixelArtSettings();
            document.body.classList.add('pixel-art-mode');
        } else {
            this.removePixelArtSettings();
            document.body.classList.remove('pixel-art-mode');
        }

        this.app.canvas.render();
        this.saveSettings();
    }

    /**
     * Toggle pixel art mode
     */
    toggle() {
        this.setEnabled(!this.enabled);
        return this.enabled;
    }

    /**
     * Apply pixel art specific settings
     */
    applyPixelArtSettings() {
        // Force pixelated rendering
        if (this.app.canvas.canvas) {
            this.app.canvas.canvas.style.imageRendering = 'pixelated';
        }

        // Disable anti-aliasing on brush
        if (this.app.brush) {
            this.app.brush.antiAlias = false;
        }

        // Set default pixel perfect tools
        if (this.pixelPerfect.enabled) {
            this.app.brush.hardness = 1;
        }
    }

    /**
     * Remove pixel art specific settings
     */
    removePixelArtSettings() {
        if (this.app.canvas.canvas) {
            this.app.canvas.canvas.style.imageRendering = 'auto';
        }
    }

    // ==========================================
    // GRID METHODS
    // ==========================================

    /**
     * Set grid enabled state
     */
    setGridEnabled(enabled) {
        this.grid.enabled = enabled;
        this.app.canvas.render();
        this.saveSettings();
    }

    /**
     * Set grid size (power of 2 values only: 1, 2, 4, 8, 16, 32, 64)
     */
    setGridSize(size) {
        // Valid power of 2 values
        const validSizes = [1, 2, 4, 8, 16, 32, 64];
        // Find nearest valid size
        const nearestSize = validSizes.reduce((prev, curr) =>
            Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev
        );
        this.grid.size = nearestSize;
        this.app.canvas.render();
        this.saveSettings();
    }

    /**
     * Set grid color
     */
    setGridColor(color) {
        this.grid.color = color;
        this.app.canvas.render();
        this.saveSettings();
    }

    /**
     * Set grid opacity
     */
    setGridOpacity(opacity) {
        this.grid.opacity = Math.max(0, Math.min(1, opacity));
        this.app.canvas.render();
        this.saveSettings();
    }

    /**
     * Render grid overlay
     */
    renderGrid(ctx, width, height, zoom, offsetX, offsetY) {
        if (!this.grid.enabled || !this.enabled) return;

        const gridSize = this.grid.size * zoom;

        // Don't render if grid is too small
        if (gridSize < 4) return;

        ctx.save();
        ctx.strokeStyle = this.grid.color;
        ctx.globalAlpha = this.grid.opacity;
        ctx.lineWidth = 1;

        // Calculate visible area
        const startX = Math.floor(-offsetX / gridSize) * gridSize + offsetX;
        const startY = Math.floor(-offsetY / gridSize) * gridSize + offsetY;
        const endX = width * zoom + offsetX;
        const endY = height * zoom + offsetY;

        ctx.beginPath();

        // Vertical lines - draw BETWEEN cells, not on edges
        // Start from first grid division (not 0), end before width
        for (let x = this.grid.size; x < width; x += this.grid.size) {
            const screenX = x * zoom + offsetX;
            if (screenX >= 0 && screenX <= ctx.canvas.width) {
                // Check if this is a subdivision line
                if (this.grid.subdivisions > 1 && x % (this.grid.size * this.grid.subdivisions) === 0) {
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.strokeStyle = this.grid.subdivisionColor;
                    ctx.lineWidth = 2;
                    ctx.moveTo(Math.floor(screenX) + 0.5, offsetY);
                    ctx.lineTo(Math.floor(screenX) + 0.5, height * zoom + offsetY);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.strokeStyle = this.grid.color;
                    ctx.lineWidth = 1;
                } else {
                    ctx.moveTo(Math.floor(screenX) + 0.5, offsetY);
                    ctx.lineTo(Math.floor(screenX) + 0.5, height * zoom + offsetY);
                }
            }
        }

        // Horizontal lines - draw BETWEEN cells, not on edges
        for (let y = this.grid.size; y < height; y += this.grid.size) {
            const screenY = y * zoom + offsetY;
            if (screenY >= 0 && screenY <= ctx.canvas.height) {
                if (this.grid.subdivisions > 1 && y % (this.grid.size * this.grid.subdivisions) === 0) {
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.strokeStyle = this.grid.subdivisionColor;
                    ctx.lineWidth = 2;
                    ctx.moveTo(offsetX, Math.floor(screenY) + 0.5);
                    ctx.lineTo(width * zoom + offsetX, Math.floor(screenY) + 0.5);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.strokeStyle = this.grid.color;
                    ctx.lineWidth = 1;
                } else {
                    ctx.moveTo(offsetX, Math.floor(screenY) + 0.5);
                    ctx.lineTo(width * zoom + offsetX, Math.floor(screenY) + 0.5);
                }
            }
        }

        ctx.stroke();
        ctx.restore();
    }

    // ==========================================
    // SNAP METHODS
    // ==========================================

    /**
     * Snap coordinate to grid
     */
    snapToGrid(x, y) {
        if (!this.snap.enabled || !this.snap.toGrid) {
            return { x, y };
        }

        const gridSize = this.grid.size;
        return {
            x: Math.round(x / gridSize) * gridSize,
            y: Math.round(y / gridSize) * gridSize
        };
    }

    /**
     * Snap coordinate to pixel
     */
    snapToPixel(x, y) {
        if (!this.snap.enabled || !this.snap.toPixels) {
            return { x, y };
        }

        return {
            x: Math.floor(x),
            y: Math.floor(y)
        };
    }

    // ==========================================
    // SYMMETRY METHODS
    // ==========================================

    /**
     * Set symmetry enabled
     */
    setSymmetryEnabled(enabled) {
        this.symmetry.enabled = enabled;
        this.app.canvas.render();
        this.saveSettings();
    }

    /**
     * Set symmetry mode
     */
    setSymmetryMode(mode) {
        this.symmetry.mode = mode;
        this.app.canvas.render();
        this.saveSettings();
    }

    /**
     * Get symmetry center
     */
    getSymmetryCenter() {
        return {
            x: this.symmetry.centerX ?? this.app.canvas.width / 2,
            y: this.symmetry.centerY ?? this.app.canvas.height / 2
        };
    }

    /**
     * Set symmetry center
     */
    setSymmetryCenter(x, y) {
        this.symmetry.centerX = x;
        this.symmetry.centerY = y;
        this.app.canvas.render();
        this.saveSettings();
    }

    /**
     * Calculate symmetry points for a given point
     */
    getSymmetryPoints(x, y) {
        if (!this.symmetry.enabled) {
            return [{ x, y }];
        }

        const center = this.getSymmetryCenter();
        const points = [{ x, y }];

        switch (this.symmetry.mode) {
            case 'horizontal':
                points.push({
                    x: 2 * center.x - x,
                    y: y
                });
                break;

            case 'vertical':
                points.push({
                    x: x,
                    y: 2 * center.y - y
                });
                break;

            case 'both':
                points.push(
                    { x: 2 * center.x - x, y: y },
                    { x: x, y: 2 * center.y - y },
                    { x: 2 * center.x - x, y: 2 * center.y - y }
                );
                break;

            case 'radial':
                const segments = this.symmetry.radialSegments;
                const angleStep = (2 * Math.PI) / segments;
                const dx = x - center.x;
                const dy = y - center.y;
                const radius = Math.sqrt(dx * dx + dy * dy);
                const baseAngle = Math.atan2(dy, dx);

                for (let i = 1; i < segments; i++) {
                    const angle = baseAngle + i * angleStep;
                    points.push({
                        x: center.x + radius * Math.cos(angle),
                        y: center.y + radius * Math.sin(angle)
                    });
                }
                break;
        }

        return points;
    }

    /**
     * Render symmetry guide lines
     */
    renderSymmetryGuides(ctx, width, height, zoom, offsetX, offsetY) {
        if (!this.symmetry.enabled || !this.enabled) return;

        const center = this.getSymmetryCenter();
        const centerX = center.x * zoom + offsetX;
        const centerY = center.y * zoom + offsetY;

        ctx.save();
        ctx.strokeStyle = '#ff00ff';
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();

        switch (this.symmetry.mode) {
            case 'horizontal':
            case 'both':
                ctx.moveTo(centerX, offsetY);
                ctx.lineTo(centerX, height * zoom + offsetY);
                if (this.symmetry.mode === 'horizontal') break;
                // Fall through for 'both'
            case 'vertical':
                ctx.moveTo(offsetX, centerY);
                ctx.lineTo(width * zoom + offsetX, centerY);
                break;

            case 'radial':
                const segments = this.symmetry.radialSegments;
                const angleStep = (2 * Math.PI) / segments;
                const radius = Math.max(width, height) * zoom;

                for (let i = 0; i < segments; i++) {
                    const angle = i * angleStep;
                    ctx.moveTo(centerX, centerY);
                    ctx.lineTo(
                        centerX + radius * Math.cos(angle),
                        centerY + radius * Math.sin(angle)
                    );
                }
                break;
        }

        ctx.stroke();
        ctx.restore();
    }

    // ==========================================
    // TILE MODE METHODS
    // ==========================================

    /**
     * Set tile mode enabled
     */
    setTileModeEnabled(enabled) {
        this.tileMode.enabled = enabled;
        this.app.canvas.render();
        this.saveSettings();
    }

    /**
     * Render tile preview
     */
    renderTilePreview(ctx, width, height, zoom, offsetX, offsetY) {
        if (!this.tileMode.enabled || !this.enabled) return;

        const repeatX = this.tileMode.repeatX;
        const repeatY = this.tileMode.repeatY;
        const tileWidth = width * zoom;
        const tileHeight = height * zoom;

        ctx.save();
        ctx.globalAlpha = 0.3;

        // Get the main canvas content
        const mainContent = this.app.canvas.getCompositeCanvas();

        for (let x = -Math.floor(repeatX / 2); x <= Math.floor(repeatX / 2); x++) {
            for (let y = -Math.floor(repeatY / 2); y <= Math.floor(repeatY / 2); y++) {
                if (x === 0 && y === 0) continue; // Skip center (main canvas)

                const tileX = offsetX + x * tileWidth;
                const tileY = offsetY + y * tileHeight;

                ctx.drawImage(
                    mainContent,
                    tileX,
                    tileY,
                    tileWidth,
                    tileHeight
                );
            }
        }

        // Draw tile boundary
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(offsetX, offsetY, tileWidth, tileHeight);

        ctx.restore();
    }

    // ==========================================
    // PALETTE METHODS
    // ==========================================

    /**
     * Initialize default palettes
     */
    initDefaultPalettes() {
        this.defaultPalettes = {
            'DB32': [
                '#000000', '#222034', '#45283c', '#663931',
                '#8f563b', '#df7126', '#d9a066', '#eec39a',
                '#fbf236', '#99e550', '#6abe30', '#37946e',
                '#4b692f', '#524b24', '#323c39', '#3f3f74',
                '#306082', '#5b6ee1', '#639bff', '#5fcde4',
                '#cbdbfc', '#ffffff', '#9badb7', '#847e87',
                '#696a6a', '#595652', '#76428a', '#ac3232',
                '#d95763', '#d77bba', '#8f974a', '#8a6f30'
            ],
            'PICO-8': [
                '#000000', '#1D2B53', '#7E2553', '#008751',
                '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
                '#FF004D', '#FFA300', '#FFEC27', '#00E436',
                '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
            ],
            'GameBoy': [
                '#0f380f', '#306230', '#8bac0f', '#9bbc0f'
            ],
            'CGA': [
                '#000000', '#555555', '#AAAAAA', '#FFFFFF',
                '#0000AA', '#5555FF', '#00AA00', '#55FF55',
                '#00AAAA', '#55FFFF', '#AA0000', '#FF5555',
                '#AA00AA', '#FF55FF', '#AA5500', '#FFFF55'
            ],
            'NES': [
                '#7C7C7C', '#0000FC', '#0000BC', '#4428BC',
                '#940084', '#A80020', '#A81000', '#881400',
                '#503000', '#007800', '#006800', '#005800',
                '#004058', '#000000', '#000000', '#000000',
                '#BCBCBC', '#0078F8', '#0058F8', '#6844FC',
                '#D800CC', '#E40058', '#F83800', '#E45C10',
                '#AC7C00', '#00B800', '#00A800', '#00A844',
                '#008888', '#000000', '#000000', '#000000',
                '#F8F8F8', '#3CBCFC', '#6888FC', '#9878F8',
                '#F878F8', '#F85898', '#F87858', '#FCA044',
                '#F8B800', '#B8F818', '#58D854', '#58F898',
                '#00E8D8', '#787878', '#000000', '#000000',
                '#FCFCFC', '#A4E4FC', '#B8B8F8', '#D8B8F8',
                '#F8B8F8', '#F8A4C0', '#F0D0B0', '#FCE0A8',
                '#F8D878', '#D8F878', '#B8F8B8', '#B8F8D8',
                '#00FCFC', '#F8D8F8', '#000000', '#000000'
            ]
        };

        // Set default palette
        this.palette.colors = [...this.defaultPalettes['DB32']];
        this.palette.name = 'DB32';
    }

    /**
     * Set active palette
     */
    setPalette(name, colors) {
        this.palette.name = name;
        this.palette.colors = colors ? [...colors] : [];
        this.saveSettings();

        // Update UI
        if (this.app.ui && this.app.ui.updatePalettePanel) {
            this.app.ui.updatePalettePanel();
        }
    }

    /**
     * Load palette from file
     */
    async loadPaletteFromFile(file) {
        const text = await file.text();
        const ext = file.name.split('.').pop().toLowerCase();

        let colors = [];

        switch (ext) {
            case 'gpl': // GIMP Palette
                colors = this.parseGPL(text);
                break;
            case 'pal': // Various palette formats
                colors = this.parsePAL(text);
                break;
            case 'hex': // Simple hex list
                colors = this.parseHEX(text);
                break;
            case 'ase': // Adobe Swatch Exchange
                // Would need binary parsing
                break;
            default:
                // Try to parse as hex list
                colors = this.parseHEX(text);
        }

        if (colors.length > 0) {
            this.setPalette(file.name.replace(/\.[^/.]+$/, ''), colors);
        }

        return colors;
    }

    /**
     * Parse GIMP Palette format
     */
    parseGPL(text) {
        const colors = [];
        const lines = text.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('GIMP') || trimmed.startsWith('Name:') || trimmed.startsWith('Columns:')) {
                continue;
            }

            const parts = trimmed.split(/\s+/);
            if (parts.length >= 3) {
                const r = parseInt(parts[0]);
                const g = parseInt(parts[1]);
                const b = parseInt(parts[2]);
                if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                    colors.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
                }
            }
        }

        return colors;
    }

    /**
     * Parse simple PAL format
     */
    parsePAL(text) {
        const colors = [];
        const lines = text.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            const parts = trimmed.split(/\s+/);

            if (parts.length >= 3) {
                const r = parseInt(parts[0]);
                const g = parseInt(parts[1]);
                const b = parseInt(parts[2]);
                if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                    colors.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
                }
            }
        }

        return colors;
    }

    /**
     * Parse hex color list
     */
    parseHEX(text) {
        const colors = [];
        const hexRegex = /#?([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})/g;
        let match;

        while ((match = hexRegex.exec(text)) !== null) {
            let hex = match[1];
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            colors.push(`#${hex.toLowerCase()}`);
        }

        return colors;
    }

    /**
     * Export palette to GPL format
     */
    exportPaletteGPL() {
        let gpl = `GIMP Palette\nName: ${this.palette.name}\nColumns: 8\n#\n`;

        for (const color of this.palette.colors) {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            gpl += `${r.toString().padStart(3)} ${g.toString().padStart(3)} ${b.toString().padStart(3)}\t${color}\n`;
        }

        return gpl;
    }

    /**
     * Add color to palette
     */
    addColorToPalette(color) {
        if (this.palette.locked) return false;
        if (this.palette.colors.includes(color)) return false;
        if (this.palette.colors.length >= this.palette.maxColors) return false;

        this.palette.colors.push(color);
        this.saveSettings();
        return true;
    }

    /**
     * Remove color from palette
     */
    removeColorFromPalette(index) {
        if (this.palette.locked) return false;
        if (index < 0 || index >= this.palette.colors.length) return false;

        this.palette.colors.splice(index, 1);
        this.saveSettings();
        return true;
    }

    /**
     * Add color to history
     */
    addToColorHistory(color) {
        // Remove if already exists
        const index = this.colorHistory.indexOf(color);
        if (index !== -1) {
            this.colorHistory.splice(index, 1);
        }

        // Add to front
        this.colorHistory.unshift(color);

        // Trim to max length
        if (this.colorHistory.length > this.maxColorHistory) {
            this.colorHistory.pop();
        }

        this.saveSettings();
    }

    /**
     * Extract palette from current image
     */
    extractPaletteFromImage(maxColors = 32) {
        const colors = new Map();
        const layers = this.app.layers.layers;

        for (const layer of layers) {
            if (!layer.visible || layer.type === 'folder') continue;

            const ctx = layer.canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const a = data[i + 3];
                if (a < 128) continue; // Skip transparent pixels

                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

                colors.set(hex, (colors.get(hex) || 0) + 1);
            }
        }

        // Sort by frequency and take top N
        const sorted = [...colors.entries()].sort((a, b) => b[1] - a[1]);
        const palette = sorted.slice(0, maxColors).map(([color]) => color);

        return palette;
    }

    // ==========================================
    // DITHERING METHODS
    // ==========================================

    /**
     * Bayer dithering matrix
     */
    getBayerMatrix(size) {
        if (size === 2) {
            return [
                [0, 2],
                [3, 1]
            ];
        }
        if (size === 4) {
            return [
                [0,  8,  2,  10],
                [12, 4,  14, 6],
                [3,  11, 1,  9],
                [15, 7,  13, 5]
            ];
        }
        if (size === 8) {
            return [
                [0,  32, 8,  40, 2,  34, 10, 42],
                [48, 16, 56, 24, 50, 18, 58, 26],
                [12, 44, 4,  36, 14, 46, 6,  38],
                [60, 28, 52, 20, 62, 30, 54, 22],
                [3,  35, 11, 43, 1,  33, 9,  41],
                [51, 19, 59, 27, 49, 17, 57, 25],
                [15, 47, 7,  39, 13, 45, 5,  37],
                [63, 31, 55, 23, 61, 29, 53, 21]
            ];
        }
        return [[0]];
    }

    /**
     * Apply ordered dithering to a color
     */
    applyOrderedDither(r, g, b, x, y, strength = 50) {
        const matrixSize = this.dithering.pattern === 'bayer2x2' ? 2 :
                          this.dithering.pattern === 'bayer4x4' ? 4 : 8;
        const matrix = this.getBayerMatrix(matrixSize);
        const threshold = matrix[y % matrixSize][x % matrixSize];
        const normalizedThreshold = threshold / (matrixSize * matrixSize) - 0.5;
        const factor = (strength / 100) * 64;

        return {
            r: Math.max(0, Math.min(255, r + normalizedThreshold * factor)),
            g: Math.max(0, Math.min(255, g + normalizedThreshold * factor)),
            b: Math.max(0, Math.min(255, b + normalizedThreshold * factor))
        };
    }

    /**
     * Apply Floyd-Steinberg dithering to image data
     */
    applyFloydSteinbergDither(imageData, palette) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        // Create error buffer
        const errors = new Float32Array(width * height * 3);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const errIdx = (y * width + x) * 3;

                // Get current color + accumulated error
                let r = data[idx] + errors[errIdx];
                let g = data[idx + 1] + errors[errIdx + 1];
                let b = data[idx + 2] + errors[errIdx + 2];

                // Find closest palette color
                const closest = this.findClosestPaletteColor(r, g, b, palette);

                // Set pixel to closest color
                data[idx] = closest.r;
                data[idx + 1] = closest.g;
                data[idx + 2] = closest.b;

                // Calculate error
                const errR = r - closest.r;
                const errG = g - closest.g;
                const errB = b - closest.b;

                // Distribute error to neighbors (Floyd-Steinberg)
                if (x + 1 < width) {
                    const i = (y * width + x + 1) * 3;
                    errors[i] += errR * 7/16;
                    errors[i + 1] += errG * 7/16;
                    errors[i + 2] += errB * 7/16;
                }
                if (y + 1 < height) {
                    if (x > 0) {
                        const i = ((y + 1) * width + x - 1) * 3;
                        errors[i] += errR * 3/16;
                        errors[i + 1] += errG * 3/16;
                        errors[i + 2] += errB * 3/16;
                    }
                    const i = ((y + 1) * width + x) * 3;
                    errors[i] += errR * 5/16;
                    errors[i + 1] += errG * 5/16;
                    errors[i + 2] += errB * 5/16;
                    if (x + 1 < width) {
                        const i2 = ((y + 1) * width + x + 1) * 3;
                        errors[i2] += errR * 1/16;
                        errors[i2 + 1] += errG * 1/16;
                        errors[i2 + 2] += errB * 1/16;
                    }
                }
            }
        }

        return imageData;
    }

    /**
     * Find closest color in palette
     */
    findClosestPaletteColor(r, g, b, palette = this.palette.colors) {
        let minDist = Infinity;
        let closest = { r: 0, g: 0, b: 0 };

        for (const hex of palette) {
            const pr = parseInt(hex.substr(1, 2), 16);
            const pg = parseInt(hex.substr(3, 2), 16);
            const pb = parseInt(hex.substr(5, 2), 16);

            const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
            if (dist < minDist) {
                minDist = dist;
                closest = { r: pr, g: pg, b: pb };
            }
        }

        return closest;
    }

    // ==========================================
    // PIXEL PERFECT ALGORITHMS
    // ==========================================

    /**
     * Bresenham's line algorithm
     */
    bresenhamLine(x0, y0, x1, y1) {
        const points = [];

        x0 = Math.floor(x0);
        y0 = Math.floor(y0);
        x1 = Math.floor(x1);
        y1 = Math.floor(y1);

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            points.push({ x: x0, y: y0 });

            if (x0 === x1 && y0 === y1) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }

        return points;
    }

    /**
     * Midpoint circle algorithm
     */
    midpointCircle(cx, cy, radius, filled = false) {
        const points = [];
        cx = Math.floor(cx);
        cy = Math.floor(cy);
        radius = Math.floor(radius);

        let x = radius;
        let y = 0;
        let p = 1 - radius;

        const addPoints = (x, y) => {
            if (filled) {
                // Add horizontal lines for filled circle
                for (let i = cx - x; i <= cx + x; i++) {
                    points.push({ x: i, y: cy + y });
                    if (y !== 0) points.push({ x: i, y: cy - y });
                }
                for (let i = cx - y; i <= cx + y; i++) {
                    points.push({ x: i, y: cy + x });
                    if (x !== 0) points.push({ x: i, y: cy - x });
                }
            } else {
                // Add 8 symmetric points
                points.push(
                    { x: cx + x, y: cy + y },
                    { x: cx - x, y: cy + y },
                    { x: cx + x, y: cy - y },
                    { x: cx - x, y: cy - y },
                    { x: cx + y, y: cy + x },
                    { x: cx - y, y: cy + x },
                    { x: cx + y, y: cy - x },
                    { x: cx - y, y: cy - x }
                );
            }
        };

        addPoints(x, y);

        while (x > y) {
            y++;
            if (p <= 0) {
                p = p + 2 * y + 1;
            } else {
                x--;
                p = p + 2 * y - 2 * x + 1;
            }

            if (x < y) break;
            addPoints(x, y);
        }

        return points;
    }

    /**
     * Midpoint ellipse algorithm
     */
    midpointEllipse(cx, cy, rx, ry, filled = false) {
        const points = [];
        cx = Math.floor(cx);
        cy = Math.floor(cy);
        rx = Math.floor(rx);
        ry = Math.floor(ry);

        let x = 0;
        let y = ry;

        const rx2 = rx * rx;
        const ry2 = ry * ry;
        const twoRx2 = 2 * rx2;
        const twoRy2 = 2 * ry2;

        let px = 0;
        let py = twoRx2 * y;

        const addPoints = (x, y) => {
            if (filled) {
                for (let i = cx - x; i <= cx + x; i++) {
                    points.push({ x: i, y: cy + y });
                    if (y !== 0) points.push({ x: i, y: cy - y });
                }
            } else {
                points.push(
                    { x: cx + x, y: cy + y },
                    { x: cx - x, y: cy + y },
                    { x: cx + x, y: cy - y },
                    { x: cx - x, y: cy - y }
                );
            }
        };

        // Region 1
        let p = ry2 - rx2 * ry + 0.25 * rx2;
        while (px < py) {
            addPoints(x, y);
            x++;
            px += twoRy2;
            if (p < 0) {
                p += ry2 + px;
            } else {
                y--;
                py -= twoRx2;
                p += ry2 + px - py;
            }
        }

        // Region 2
        p = ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2;
        while (y >= 0) {
            addPoints(x, y);
            y--;
            py -= twoRx2;
            if (p > 0) {
                p += rx2 - py;
            } else {
                x++;
                px += twoRy2;
                p += rx2 - py + px;
            }
        }

        return points;
    }

    /**
     * Flood fill with tolerance
     */
    floodFill(imageData, startX, startY, fillColor, tolerance = 0) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        startX = Math.floor(startX);
        startY = Math.floor(startY);

        if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
            return imageData;
        }

        const startIdx = (startY * width + startX) * 4;
        const startR = data[startIdx];
        const startG = data[startIdx + 1];
        const startB = data[startIdx + 2];
        const startA = data[startIdx + 3];

        const fillR = parseInt(fillColor.substr(1, 2), 16);
        const fillG = parseInt(fillColor.substr(3, 2), 16);
        const fillB = parseInt(fillColor.substr(5, 2), 16);

        // Check if we're filling with the same color
        if (startR === fillR && startG === fillG && startB === fillB && startA === 255) {
            return imageData;
        }

        const visited = new Uint8Array(width * height);
        const stack = [[startX, startY]];

        const colorMatch = (idx) => {
            const dr = Math.abs(data[idx] - startR);
            const dg = Math.abs(data[idx + 1] - startG);
            const db = Math.abs(data[idx + 2] - startB);
            const da = Math.abs(data[idx + 3] - startA);
            return dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance;
        };

        while (stack.length > 0) {
            const [x, y] = stack.pop();

            if (x < 0 || x >= width || y < 0 || y >= height) continue;

            const pixelIdx = y * width + x;
            if (visited[pixelIdx]) continue;

            const idx = pixelIdx * 4;
            if (!colorMatch(idx)) continue;

            visited[pixelIdx] = 1;
            data[idx] = fillR;
            data[idx + 1] = fillG;
            data[idx + 2] = fillB;
            data[idx + 3] = 255;

            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        return imageData;
    }

    // ==========================================
    // SETTINGS PERSISTENCE
    // ==========================================

    /**
     * Load settings from storage
     */
    async loadSettings() {
        // Skip if project config was already applied (from welcome screen)
        // This prevents async loadSettings from overwriting config values
        if (this.projectConfigApplied) {
            window.dispatchEvent(new CustomEvent('pixelart-settings-loaded'));
            return;
        }

        try {
            const settings = await this.app.storage.get('pixelArtSettings');
            if (settings) {
                // Merge with defaults
                Object.assign(this.grid, settings.grid || {});
                Object.assign(this.snap, settings.snap || {});
                Object.assign(this.symmetry, settings.symmetry || {});
                Object.assign(this.tileMode, settings.tileMode || {});
                Object.assign(this.onionSkin, settings.onionSkin || {});
                Object.assign(this.pixelPerfect, settings.pixelPerfect || {});
                Object.assign(this.dithering, settings.dithering || {});

                // Validate grid size to power of 2
                const validSizes = [1, 2, 4, 8, 16, 32, 64];
                if (!validSizes.includes(this.grid.size)) {
                    this.grid.size = validSizes.reduce((prev, curr) =>
                        Math.abs(curr - this.grid.size) < Math.abs(prev - this.grid.size) ? curr : prev
                    );
                }

                if (settings.palette) {
                    this.palette = settings.palette;
                }
                if (settings.colorHistory) {
                    this.colorHistory = settings.colorHistory;
                }

                // Note: Don't restore 'enabled' state from storage
                // Always start with pixel art mode disabled to avoid UI desync
                // User can manually enable it if needed
            }
        } catch (e) {
            console.warn('Failed to load pixel art settings:', e);
        }

        // Dispatch event so UI can sync after settings are loaded
        window.dispatchEvent(new CustomEvent('pixelart-settings-loaded'));
    }

    /**
     * Save settings to storage
     */
    async saveSettings() {
        try {
            await this.app.storage.set('pixelArtSettings', {
                enabled: this.enabled,
                grid: this.grid,
                snap: this.snap,
                symmetry: this.symmetry,
                tileMode: this.tileMode,
                onionSkin: this.onionSkin,
                pixelPerfect: this.pixelPerfect,
                dithering: this.dithering,
                palette: this.palette,
                colorHistory: this.colorHistory
            });
        } catch (e) {
            console.warn('Failed to save pixel art settings:', e);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for color changes to add to history
        if (this.app.color) {
            const originalSetPrimaryColor = this.app.color.setPrimaryColor.bind(this.app.color);
            this.app.color.setPrimaryColor = (color) => {
                originalSetPrimaryColor(color);
                this.addToColorHistory(color);
            };
        }
    }
}
