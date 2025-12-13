/**
 * PixelArtUI - Controller for Pixel Art Mode UI
 * Connects UI elements to PixelArtManager, AnimationManager, and ColorAdjustments
 */

export class PixelArtUI {
    constructor(app) {
        this.app = app;
        this.isEnabled = false;

        // Cache DOM elements
        this.elements = {};
    }

    /**
     * Initialize UI bindings
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadDefaultPalette();
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        // Main toggle
        this.elements.pixelArtModeToggle = document.getElementById('pixelArtModeToggle');
        this.elements.pixelArtSection = document.getElementById('pixelArtSection');
        this.elements.pixelArtContent = document.getElementById('pixelArtContent');
        this.elements.pixelArtIndicator = document.getElementById('pixelArtIndicator');
        this.elements.paletteSection = document.getElementById('paletteSection');
        this.elements.animationTimeline = document.getElementById('animationTimeline');

        // Grid settings
        this.elements.gridEnabled = document.getElementById('gridEnabled');
        this.elements.gridSize = document.getElementById('gridSize');
        this.elements.gridSizeInput = document.getElementById('gridSizeInput');
        this.elements.gridColor = document.getElementById('gridColor');
        this.elements.gridOpacity = document.getElementById('gridOpacity');
        this.elements.gridOpacityValue = document.getElementById('gridOpacityValue');
        this.elements.snapToGrid = document.getElementById('snapToGrid');

        // Symmetry
        this.elements.symmetryButtons = document.querySelectorAll('.symmetry-btn');
        this.elements.radialSegmentsRow = document.getElementById('radialSegmentsRow');
        this.elements.radialSegments = document.getElementById('radialSegments');
        this.elements.radialSegmentsInput = document.getElementById('radialSegmentsInput');

        // Tile mode
        this.elements.tileModeEnabled = document.getElementById('tileModeEnabled');

        // Dithering
        this.elements.ditherButtons = document.querySelectorAll('.dither-btn');

        // Onion skin
        this.elements.onionSkinEnabled = document.getElementById('onionSkinEnabled');
        this.elements.onionSkinPrev = document.getElementById('onionSkinPrev');
        this.elements.onionSkinNext = document.getElementById('onionSkinNext');
        this.elements.onionSkinOpacity = document.getElementById('onionSkinOpacity');
        this.elements.onionSkinOpacityValue = document.getElementById('onionSkinOpacityValue');

        // Quick actions
        this.elements.adjustHSBBtn = document.getElementById('adjustHSBBtn');
        this.elements.posterizeBtn = document.getElementById('posterizeBtn');
        this.elements.invertBtn = document.getElementById('invertBtn');
        this.elements.desaturateBtn = document.getElementById('desaturateBtn');
        this.elements.outlineBtn = document.getElementById('outlineBtn');
        this.elements.flipHBtn = document.getElementById('flipHBtn');
        this.elements.flipVBtn = document.getElementById('flipVBtn');
        this.elements.rotate90Btn = document.getElementById('rotate90Btn');

        // Palette
        this.elements.paletteSelect = document.getElementById('paletteSelect');
        this.elements.paletteGrid = document.getElementById('paletteGrid');
        this.elements.importPaletteBtn = document.getElementById('importPaletteBtn');
        this.elements.exportPaletteBtn = document.getElementById('exportPaletteBtn');
        this.elements.addToPaletteBtn = document.getElementById('addToPaletteBtn');
        this.elements.extractColorsBtn = document.getElementById('extractColorsBtn');

        // Timeline
        this.elements.timelineFrames = document.getElementById('timelineFrames');
        this.elements.frameCounter = document.getElementById('frameCounter');
        this.elements.timelineFPS = document.getElementById('timelineFPS');
        this.elements.timelinePlayBtn = document.getElementById('timelinePlayBtn');
        this.elements.timelinePrevBtn = document.getElementById('timelinePrevBtn');
        this.elements.timelineNextBtn = document.getElementById('timelineNextBtn');
        this.elements.timelineFirstBtn = document.getElementById('timelineFirstBtn');
        this.elements.timelineLastBtn = document.getElementById('timelineLastBtn');
        this.elements.addFrameBtn = document.getElementById('addFrameBtn');
        this.elements.duplicateFrameBtn = document.getElementById('duplicateFrameBtn');
        this.elements.deleteFrameBtn = document.getElementById('deleteFrameBtn');
        this.elements.exportGifBtn = document.getElementById('exportGifBtn');
        this.elements.exportSpriteBtn = document.getElementById('exportSpriteBtn');

        // Modals
        this.elements.hsbModal = document.getElementById('hsbModal');
        this.elements.posterizeModal = document.getElementById('posterizeModal');
        this.elements.outlineModal = document.getElementById('outlineModal');
        this.elements.resizeModal = document.getElementById('resizeModal');
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Pixel Art Mode Toggle
        this.elements.pixelArtModeToggle?.addEventListener('change', (e) => {
            this.togglePixelArtMode(e.target.checked);
        });

        // Grid settings
        this.elements.gridEnabled?.addEventListener('change', (e) => {
            this.app.pixelArt.grid.enabled = e.target.checked;
            this.updateGridOverlay();
        });

        const syncGridSize = (value) => {
            this.app.pixelArt.grid.size = parseInt(value);
            this.elements.gridSize.value = value;
            this.elements.gridSizeInput.value = value;
            this.updateGridOverlay();
        };

        this.elements.gridSize?.addEventListener('input', (e) => syncGridSize(e.target.value));
        this.elements.gridSizeInput?.addEventListener('change', (e) => syncGridSize(e.target.value));

        this.elements.gridColor?.addEventListener('input', (e) => {
            this.app.pixelArt.grid.color = e.target.value;
            this.updateGridOverlay();
        });

        this.elements.gridOpacity?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.app.pixelArt.grid.opacity = value / 100;
            this.elements.gridOpacityValue.textContent = value + '%';
            this.updateGridOverlay();
        });

        this.elements.snapToGrid?.addEventListener('change', (e) => {
            this.app.pixelArt.snap.toGrid = e.target.checked;
        });

        // Symmetry buttons
        this.elements.symmetryButtons?.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.symmetry;
                this.setSymmetryMode(mode);
            });
        });

        // Radial segments
        const syncRadialSegments = (value) => {
            this.app.pixelArt.symmetry.radialSegments = parseInt(value);
            this.elements.radialSegments.value = value;
            this.elements.radialSegmentsInput.value = value;
        };

        this.elements.radialSegments?.addEventListener('input', (e) => syncRadialSegments(e.target.value));
        this.elements.radialSegmentsInput?.addEventListener('change', (e) => syncRadialSegments(e.target.value));

        // Tile mode
        this.elements.tileModeEnabled?.addEventListener('change', (e) => {
            this.app.pixelArt.tileMode.enabled = e.target.checked;
            this.updateGridOverlay();
        });

        // Dithering buttons
        this.elements.ditherButtons?.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setDitherMode(btn.dataset.dither);
            });
        });

        // Onion skin
        this.elements.onionSkinEnabled?.addEventListener('change', (e) => {
            this.app.pixelArt.onionSkin.enabled = e.target.checked;
            this.updateGridOverlay();
        });

        this.elements.onionSkinPrev?.addEventListener('change', (e) => {
            this.app.pixelArt.onionSkin.prevFrames = parseInt(e.target.value);
            this.updateGridOverlay();
        });

        this.elements.onionSkinNext?.addEventListener('change', (e) => {
            this.app.pixelArt.onionSkin.nextFrames = parseInt(e.target.value);
            this.updateGridOverlay();
        });

        this.elements.onionSkinOpacity?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.app.pixelArt.onionSkin.prevOpacity = value / 100;
            this.elements.onionSkinOpacityValue.textContent = value + '%';
            this.updateGridOverlay();
        });

        // Quick action buttons
        this.elements.adjustHSBBtn?.addEventListener('click', () => this.showHSBModal());
        this.elements.posterizeBtn?.addEventListener('click', () => this.showPosterizeModal());
        this.elements.invertBtn?.addEventListener('click', () => this.applyInvert());
        this.elements.desaturateBtn?.addEventListener('click', () => this.applyDesaturate());
        this.elements.outlineBtn?.addEventListener('click', () => this.showOutlineModal());
        this.elements.flipHBtn?.addEventListener('click', () => this.applyFlipH());
        this.elements.flipVBtn?.addEventListener('click', () => this.applyFlipV());
        this.elements.rotate90Btn?.addEventListener('click', () => this.applyRotate90());

        // Palette
        this.elements.paletteSelect?.addEventListener('change', (e) => {
            this.loadPalette(e.target.value);
        });

        this.elements.addToPaletteBtn?.addEventListener('click', () => {
            const color = this.app.color.getPrimaryColor();
            this.app.pixelArt.addColorToPalette(color);
            this.renderPalette();
        });

        this.elements.extractColorsBtn?.addEventListener('click', () => {
            this.extractColorsFromLayer();
        });

        this.elements.importPaletteBtn?.addEventListener('click', () => this.importPalette());
        this.elements.exportPaletteBtn?.addEventListener('click', () => this.exportPalette());

        // Timeline controls
        this.elements.timelinePlayBtn?.addEventListener('click', () => this.togglePlayback());
        this.elements.timelinePrevBtn?.addEventListener('click', () => this.goToPrevFrame());
        this.elements.timelineNextBtn?.addEventListener('click', () => this.goToNextFrame());
        this.elements.timelineFirstBtn?.addEventListener('click', () => this.goToFirstFrame());
        this.elements.timelineLastBtn?.addEventListener('click', () => this.goToLastFrame());
        this.elements.addFrameBtn?.addEventListener('click', () => this.addFrame());
        this.elements.duplicateFrameBtn?.addEventListener('click', () => this.duplicateFrame());
        this.elements.deleteFrameBtn?.addEventListener('click', () => this.deleteFrame());
        this.elements.exportGifBtn?.addEventListener('click', () => this.exportGIF());
        this.elements.exportSpriteBtn?.addEventListener('click', () => this.exportSpriteSheet());

        this.elements.timelineFPS?.addEventListener('change', (e) => {
            this.app.animation.fps = parseInt(e.target.value);
        });

        // HSB Modal
        this.bindHSBModal();
        this.bindPosterizeModal();
        this.bindOutlineModal();
    }

    /**
     * Toggle Pixel Art Mode
     */
    togglePixelArtMode(enabled) {
        this.isEnabled = enabled;
        this.app.pixelArt.enabled = enabled;

        // Toggle body class
        document.body.classList.toggle('pixel-art-mode', enabled);

        // Show/hide pixel art settings section
        if (this.elements.pixelArtSection) {
            this.elements.pixelArtSection.style.display = enabled ? 'block' : 'none';
        }

        // Show/hide indicator
        if (this.elements.pixelArtIndicator) {
            this.elements.pixelArtIndicator.style.display = enabled ? 'flex' : 'none';
        }

        // Show/hide palette section
        if (this.elements.paletteSection) {
            this.elements.paletteSection.style.display = enabled ? 'block' : 'none';
        }

        // Show/hide animation timeline
        if (this.elements.animationTimeline) {
            this.elements.animationTimeline.style.display = enabled ? 'flex' : 'none';
        }

        // Initialize or clear grid
        if (enabled) {
            this.renderPalette();
            this.updateTimeline();
            this.updateGridOverlay();
        } else {
            // Clear overlay canvas
            const canvas = this.app.canvas;
            if (canvas && canvas.overlayCtx) {
                canvas.overlayCtx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        this.app.ui.showNotification(
            enabled ? 'Pixel Art Mode aktivován' : 'Pixel Art Mode deaktivován',
            'success'
        );
    }

    /**
     * Set symmetry mode
     */
    setSymmetryMode(mode) {
        this.app.pixelArt.symmetry.mode = mode;
        this.app.pixelArt.symmetry.enabled = mode !== 'none';

        // Update button states
        this.elements.symmetryButtons?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.symmetry === mode);
        });

        // Show/hide radial segments
        if (this.elements.radialSegmentsRow) {
            this.elements.radialSegmentsRow.classList.toggle('visible', mode === 'radial');
        }

        this.updateGridOverlay();
    }

    /**
     * Set dither mode
     */
    setDitherMode(mode) {
        this.app.pixelArt.dithering.enabled = mode !== 'none';
        if (mode === 'bayer2') mode = 'bayer2x2';
        else if (mode === 'bayer4') mode = 'bayer4x4';
        else if (mode === 'bayer8') mode = 'bayer8x8';
        this.app.pixelArt.dithering.pattern = mode;

        // Update button states
        this.elements.ditherButtons?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.dither === mode ||
                (btn.dataset.dither === 'bayer2' && mode === 'bayer2x2') ||
                (btn.dataset.dither === 'bayer4' && mode === 'bayer4x4') ||
                (btn.dataset.dither === 'bayer8' && mode === 'bayer8x8'));
        });
    }

    /**
     * Update grid overlay rendering
     */
    updateGridOverlay() {
        const canvas = this.app.canvas;
        if (!canvas || !canvas.overlayCanvas || !canvas.overlayCtx) return;

        const ctx = canvas.overlayCtx;
        const width = canvas.width;
        const height = canvas.height;
        const zoom = canvas.zoom;

        // Clear overlay
        ctx.clearRect(0, 0, width, height);

        if (!this.isEnabled) return;

        // Render grid
        if (this.app.pixelArt.grid.enabled) {
            this.renderGrid(ctx, width, height, zoom);
        }

        // Render symmetry guides
        if (this.app.pixelArt.symmetry.enabled) {
            this.renderSymmetryGuides(ctx, width, height);
        }
    }

    /**
     * Render grid on overlay canvas
     */
    renderGrid(ctx, width, height, zoom) {
        const gridSize = this.app.pixelArt.grid.size;
        const effectiveGridSize = gridSize * zoom;

        // Don't render if grid is too small to see
        if (effectiveGridSize < 4) return;

        ctx.save();
        ctx.strokeStyle = this.app.pixelArt.grid.color;
        ctx.globalAlpha = this.app.pixelArt.grid.opacity;
        ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(width, y + 0.5);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Render symmetry guide lines
     */
    renderSymmetryGuides(ctx, width, height) {
        const mode = this.app.pixelArt.symmetry.mode;
        const centerX = width / 2;
        const centerY = height / 2;

        ctx.save();
        ctx.strokeStyle = '#8b5cf6';
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        if (mode === 'horizontal' || mode === 'both') {
            ctx.beginPath();
            ctx.moveTo(centerX + 0.5, 0);
            ctx.lineTo(centerX + 0.5, height);
            ctx.stroke();
        }

        if (mode === 'vertical' || mode === 'both') {
            ctx.beginPath();
            ctx.moveTo(0, centerY + 0.5);
            ctx.lineTo(width, centerY + 0.5);
            ctx.stroke();
        }

        if (mode === 'radial') {
            const segments = this.app.pixelArt.symmetry.radialSegments;
            for (let i = 0; i < segments; i++) {
                const angle = (i * 2 * Math.PI) / segments;
                const endX = centerX + Math.cos(angle) * Math.max(width, height);
                const endY = centerY + Math.sin(angle) * Math.max(width, height);

                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    /**
     * Load a color palette
     */
    loadPalette(paletteName) {
        // Map select values to palette names
        const paletteMap = {
            'db32': 'DB32',
            'pico8': 'PICO-8',
            'gameboy': 'GameBoy',
            'nes': 'NES',
            'cga': 'CGA'
        };

        const mappedName = paletteMap[paletteName] || paletteName;
        const palettes = this.app.pixelArt.defaultPalettes;

        if (palettes && palettes[mappedName]) {
            this.app.pixelArt.palette.colors = [...palettes[mappedName]];
            this.app.pixelArt.palette.name = mappedName;
            this.renderPalette();
        }
    }

    /**
     * Load default palette
     */
    loadDefaultPalette() {
        if (this.app.pixelArt.defaultPalettes) {
            this.app.pixelArt.palette.colors = [...this.app.pixelArt.defaultPalettes['DB32']];
            this.app.pixelArt.palette.name = 'DB32';
        }
    }

    /**
     * Render color palette grid
     */
    renderPalette() {
        if (!this.elements.paletteGrid) return;

        this.elements.paletteGrid.innerHTML = '';
        const palette = this.app.pixelArt.palette?.colors || [];

        palette.forEach((color, index) => {
            const swatch = document.createElement('div');
            swatch.className = 'palette-color';
            swatch.style.backgroundColor = color;
            swatch.title = color;
            swatch.dataset.color = color;
            swatch.dataset.index = index;

            swatch.addEventListener('click', () => {
                this.app.color.setPrimaryColor(color);
                this.updatePaletteSelection(index);
            });

            swatch.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.app.color.setSecondaryColor(color);
            });

            this.elements.paletteGrid.appendChild(swatch);
        });
    }

    /**
     * Update palette selection highlight
     */
    updatePaletteSelection(index) {
        const colors = this.elements.paletteGrid?.querySelectorAll('.palette-color');
        colors?.forEach((color, i) => {
            color.classList.toggle('active', i === index);
        });
    }

    /**
     * Extract colors from active layer
     */
    extractColorsFromLayer() {
        const layer = this.app.layers.getActiveLayer();
        if (!layer) return;

        // Simple color extraction
        const canvas = layer.canvas;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const colorSet = new Set();

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) { // Only non-transparent pixels
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
                colorSet.add(hex);
            }
            if (colorSet.size >= 32) break; // Limit to 32 colors
        }

        const colors = Array.from(colorSet);
        this.app.pixelArt.palette.colors = colors;
        this.app.pixelArt.palette.name = 'Extracted';
        this.renderPalette();
        this.app.ui.showNotification(`Extrahováno ${colors.length} barev`, 'success');
    }

    /**
     * Import palette from file
     */
    importPalette() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.gpl,.pal,.hex,.txt';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const text = await file.text();
            const extension = file.name.split('.').pop().toLowerCase();

            let colors = [];
            if (extension === 'gpl') {
                colors = this.parseGPL(text);
            } else if (extension === 'hex' || extension === 'txt') {
                colors = this.parseHEX(text);
            }

            if (colors.length > 0) {
                this.app.pixelArt.palette.colors = colors;
                this.app.pixelArt.palette.name = 'Imported';
                this.elements.paletteSelect.value = 'custom';
                this.renderPalette();
                this.app.ui.showNotification(`Importováno ${colors.length} barev`, 'success');
            }
        };

        input.click();
    }

    /**
     * Parse GPL (GIMP Palette) format
     */
    parseGPL(text) {
        const colors = [];
        const lines = text.split('\n');

        for (const line of lines) {
            // Skip comments and headers
            if (line.startsWith('#') || line.startsWith('GIMP') || line.startsWith('Name:') || line.trim() === '') {
                continue;
            }

            // Parse RGB values
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
                const r = parseInt(parts[0]);
                const g = parseInt(parts[1]);
                const b = parseInt(parts[2]);

                if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                    const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
                    colors.push(hex);
                }
            }
        }

        return colors;
    }

    /**
     * Parse HEX format (one hex color per line)
     */
    parseHEX(text) {
        const colors = [];
        const lines = text.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.match(/^#?[0-9a-fA-F]{6}$/)) {
                colors.push(trimmed.startsWith('#') ? trimmed : '#' + trimmed);
            }
        }

        return colors;
    }

    /**
     * Export current palette
     */
    exportPalette() {
        const colors = this.app.pixelArt.palette?.colors || [];
        const name = this.app.pixelArt.palette?.name || 'Custom Palette';

        let gpl = `GIMP Palette\nName: ${name}\nColumns: 8\n#\n`;

        colors.forEach(color => {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            gpl += `${r.toString().padStart(3)} ${g.toString().padStart(3)} ${b.toString().padStart(3)}\tColor\n`;
        });

        const blob = new Blob([gpl], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'palette.gpl';
        a.click();

        URL.revokeObjectURL(url);
        this.app.ui.showNotification('Paleta exportována', 'success');
    }

    // Timeline methods
    updateTimeline() {
        if (!this.elements.timelineFrames) return;

        const frames = this.app.animation.frames;
        const currentFrame = this.app.animation.currentFrameIndex;

        this.elements.timelineFrames.innerHTML = '';

        frames.forEach((frame, index) => {
            const item = document.createElement('div');
            item.className = 'frame-item' + (index === currentFrame ? ' active' : '');
            item.dataset.frame = index;

            const preview = document.createElement('div');
            preview.className = 'frame-preview';

            const canvas = document.createElement('canvas');
            canvas.width = 48;
            canvas.height = 48;

            // Draw frame preview
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            if (frame.canvas) {
                ctx.drawImage(frame.canvas, 0, 0, 48, 48);
            }

            preview.appendChild(canvas);

            const number = document.createElement('span');
            number.className = 'frame-number';
            number.textContent = (index + 1).toString();

            item.appendChild(preview);
            item.appendChild(number);

            item.addEventListener('click', () => {
                this.app.animation.goToFrame(index);
                this.updateTimeline();
            });

            this.elements.timelineFrames.appendChild(item);
        });

        // Update frame counter
        if (this.elements.frameCounter) {
            this.elements.frameCounter.textContent = `${currentFrame + 1} / ${frames.length}`;
        }
    }

    togglePlayback() {
        console.log('togglePlayback called, current state:', this.app.animation.playing);

        // Use AnimationManager's togglePlay method
        this.app.animation.togglePlay();

        // Update button visual state
        const isPlaying = this.app.animation.playing;
        console.log('After toggle, playing:', isPlaying);

        if (isPlaying) {
            this.elements.timelinePlayBtn?.classList.add('playing');
        } else {
            this.elements.timelinePlayBtn?.classList.remove('playing');
        }

        // Toggle play/pause icons
        const playIcon = this.elements.timelinePlayBtn?.querySelector('.play-icon');
        const pauseIcon = this.elements.timelinePlayBtn?.querySelector('.pause-icon');
        if (playIcon) playIcon.style.display = isPlaying ? 'none' : 'block';
        if (pauseIcon) pauseIcon.style.display = isPlaying ? 'block' : 'none';
    }

    goToPrevFrame() {
        const current = this.app.animation.currentFrameIndex;
        if (current > 0) {
            this.app.animation.goToFrame(current - 1);
            this.updateTimeline();
        }
    }

    goToNextFrame() {
        const current = this.app.animation.currentFrameIndex;
        if (current < this.app.animation.frames.length - 1) {
            this.app.animation.goToFrame(current + 1);
            this.updateTimeline();
        }
    }

    goToFirstFrame() {
        this.app.animation.goToFrame(0);
        this.updateTimeline();
    }

    goToLastFrame() {
        this.app.animation.goToFrame(this.app.animation.frames.length - 1);
        this.updateTimeline();
    }

    addFrame() {
        this.app.animation.addFrame();
        this.updateTimeline();
    }

    duplicateFrame() {
        this.app.animation.duplicateFrame(this.app.animation.currentFrameIndex);
        this.updateTimeline();
    }

    deleteFrame() {
        if (this.app.animation.frames.length > 1) {
            this.app.animation.deleteFrame(this.app.animation.currentFrameIndex);
            this.updateTimeline();
        }
    }

    async exportGIF() {
        try {
            this.app.ui.showNotification('Exportuji GIF...', 'info');
            const blob = await this.app.animation.exportGIF();

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'animation.gif';
            a.click();
            URL.revokeObjectURL(url);

            this.app.ui.showNotification('GIF exportován', 'success');
        } catch (error) {
            console.error('GIF export error:', error);
            this.app.ui.showNotification('Chyba při exportu GIF', 'error');
        }
    }

    async exportSpriteSheet() {
        try {
            const canvas = this.app.animation.exportSpriteSheet();

            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'spritesheet.png';
                a.click();
                URL.revokeObjectURL(url);
            });

            this.app.ui.showNotification('Sprite sheet exportován', 'success');
        } catch (error) {
            console.error('Sprite export error:', error);
            this.app.ui.showNotification('Chyba při exportu', 'error');
        }
    }

    // Color adjustments
    applyInvert() {
        const layer = this.app.layers.getActiveLayer();
        if (!layer || layer.locked) return;

        this.app.history.startAction('invert');
        this.app.colorAdjust.invert(layer.canvas);
        this.app.canvas.render();
        this.app.history.endAction();
    }

    applyDesaturate() {
        const layer = this.app.layers.getActiveLayer();
        if (!layer || layer.locked) return;

        this.app.history.startAction('desaturate');
        this.app.colorAdjust.desaturate(layer.canvas);
        this.app.canvas.render();
        this.app.history.endAction();
    }

    applyFlipH() {
        const layer = this.app.layers.getActiveLayer();
        if (!layer || layer.locked) return;

        this.app.history.startAction('flipH');
        this.app.colorAdjust.flipHorizontal(layer.canvas);
        this.app.canvas.render();
        this.app.history.endAction();
    }

    applyFlipV() {
        const layer = this.app.layers.getActiveLayer();
        if (!layer || layer.locked) return;

        this.app.history.startAction('flipV');
        this.app.colorAdjust.flipVertical(layer.canvas);
        this.app.canvas.render();
        this.app.history.endAction();
    }

    applyRotate90() {
        const layer = this.app.layers.getActiveLayer();
        if (!layer || layer.locked) return;

        this.app.history.startAction('rotate90');
        this.app.colorAdjust.rotate90(layer.canvas);
        this.app.canvas.render();
        this.app.history.endAction();
    }

    // Modal handlers
    showHSBModal() {
        if (!this.elements.hsbModal) return;
        this.elements.hsbModal.style.display = 'flex';
        this.updateHSBPreview();
    }

    bindHSBModal() {
        const hue = document.getElementById('hsbHue');
        const hueInput = document.getElementById('hsbHueInput');
        const sat = document.getElementById('hsbSaturation');
        const satInput = document.getElementById('hsbSaturationInput');
        const bright = document.getElementById('hsbBrightness');
        const brightInput = document.getElementById('hsbBrightnessInput');
        const resetBtn = document.getElementById('hsbResetBtn');
        const applyBtn = document.getElementById('hsbApplyBtn');

        const syncSlider = (slider, input) => {
            if (slider && input) {
                slider.addEventListener('input', () => {
                    input.value = slider.value;
                    this.updateHSBPreview();
                });
                input.addEventListener('change', () => {
                    slider.value = input.value;
                    this.updateHSBPreview();
                });
            }
        };

        syncSlider(hue, hueInput);
        syncSlider(sat, satInput);
        syncSlider(bright, brightInput);

        resetBtn?.addEventListener('click', () => {
            if (hue) hue.value = 0;
            if (hueInput) hueInput.value = 0;
            if (sat) sat.value = 0;
            if (satInput) satInput.value = 0;
            if (bright) bright.value = 0;
            if (brightInput) brightInput.value = 0;
            this.updateHSBPreview();
        });

        applyBtn?.addEventListener('click', () => {
            this.applyHSB();
            this.elements.hsbModal.style.display = 'none';
        });
    }

    updateHSBPreview() {
        // Preview would be implemented here
    }

    applyHSB() {
        const layer = this.app.layers.getActiveLayer();
        if (!layer || layer.locked) return;

        const h = parseInt(document.getElementById('hsbHue')?.value || 0);
        const s = parseInt(document.getElementById('hsbSaturation')?.value || 0);
        const b = parseInt(document.getElementById('hsbBrightness')?.value || 0);

        this.app.history.startAction('hsb');
        this.app.colorAdjust.adjustHSB(layer.canvas, h, s / 100, b / 100);
        this.app.canvas.render();
        this.app.history.endAction();
    }

    showPosterizeModal() {
        if (!this.elements.posterizeModal) return;
        this.elements.posterizeModal.style.display = 'flex';
    }

    bindPosterizeModal() {
        const levels = document.getElementById('posterizeLevels');
        const levelsInput = document.getElementById('posterizeLevelsInput');
        const applyBtn = document.getElementById('posterizeApplyBtn');

        if (levels && levelsInput) {
            levels.addEventListener('input', () => {
                levelsInput.value = levels.value;
            });
            levelsInput.addEventListener('change', () => {
                levels.value = levelsInput.value;
            });
        }

        applyBtn?.addEventListener('click', () => {
            this.applyPosterize();
            this.elements.posterizeModal.style.display = 'none';
        });
    }

    applyPosterize() {
        const layer = this.app.layers.getActiveLayer();
        if (!layer || layer.locked) return;

        const levels = parseInt(document.getElementById('posterizeLevels')?.value || 8);

        this.app.history.startAction('posterize');
        this.app.colorAdjust.posterize(layer.canvas, levels);
        this.app.canvas.render();
        this.app.history.endAction();
    }

    showOutlineModal() {
        if (!this.elements.outlineModal) return;
        this.elements.outlineModal.style.display = 'flex';
    }

    bindOutlineModal() {
        const width = document.getElementById('outlineWidth');
        const widthInput = document.getElementById('outlineWidthInput');
        const applyBtn = document.getElementById('outlineApplyBtn');

        if (width && widthInput) {
            width.addEventListener('input', () => {
                widthInput.value = width.value;
            });
            widthInput.addEventListener('change', () => {
                width.value = widthInput.value;
            });
        }

        applyBtn?.addEventListener('click', () => {
            this.applyOutline();
            this.elements.outlineModal.style.display = 'none';
        });
    }

    applyOutline() {
        const layer = this.app.layers.getActiveLayer();
        if (!layer || layer.locked) return;

        const color = document.getElementById('outlineColor')?.value || '#000000';
        const width = parseInt(document.getElementById('outlineWidth')?.value || 1);

        this.app.history.startAction('outline');
        this.app.colorAdjust.generateOutline(layer.canvas, color, width);
        this.app.canvas.render();
        this.app.history.endAction();
    }
}
