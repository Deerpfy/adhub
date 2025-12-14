/**
 * AnimationManager - Handles frame-by-frame animation
 * Supports timeline, onion skin, playback, and export
 */

export class AnimationManager {
    constructor(app) {
        this.app = app;

        // Animation state
        this.frames = [];
        this.currentFrameIndex = 0;
        this.fps = 12;
        this.playing = false;
        this.loop = true;
        this.playbackTimer = null;

        // Onion skin settings
        this.onionSkin = {
            enabled: false,
            prevFrames: 2,
            nextFrames: 1,
            prevOpacity: 0.3,
            nextOpacity: 0.2,
            prevColor: null,  // null = original colors
            nextColor: null,
            loop: false
        };

        // Export settings
        this.exportSettings = {
            format: 'gif',
            quality: 0.92,
            scale: 1,
            includeBackground: true
        };

        // Selection for multi-frame operations
        this.selectedFrames = new Set();
    }

    /**
     * Initialize animation manager
     */
    init() {
        // Create initial frame from current canvas state
        if (this.frames.length === 0) {
            this.createFrameFromCurrentState();
        }
        console.log('AnimationManager initialized');
    }

    /**
     * Create a frame from current canvas/layer state
     */
    createFrameFromCurrentState() {
        const frame = {
            id: this.generateFrameId(),
            name: `Frame ${this.frames.length + 1}`,
            duration: 1000 / this.fps, // Duration in ms
            layers: this.serializeLayers(),
            thumbnail: null
        };

        // Generate thumbnail
        frame.thumbnail = this.generateThumbnail();

        this.frames.push(frame);
        return frame;
    }

    /**
     * Generate unique frame ID
     */
    generateFrameId() {
        return `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Serialize current layers state
     */
    serializeLayers() {
        const layers = this.app.layers.layers;
        return layers.map(layer => {
            const canvas = document.createElement('canvas');
            canvas.width = layer.canvas.width;
            canvas.height = layer.canvas.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(layer.canvas, 0, 0);

            return {
                id: layer.id,
                name: layer.name,
                visible: layer.visible,
                locked: layer.locked,
                opacity: layer.opacity,
                blendMode: layer.blendMode,
                imageData: canvas.toDataURL('image/png')
            };
        });
    }

    /**
     * Deserialize layers to canvas
     */
    async deserializeLayers(layersData) {
        // Clear current layers
        this.app.layers.clear();

        for (const data of layersData) {
            const layer = this.app.layers.addLayer(data.name);
            layer.id = data.id;
            layer.visible = data.visible;
            layer.locked = data.locked;
            layer.opacity = data.opacity;
            layer.blendMode = data.blendMode;

            // Load image data
            await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const ctx = layer.canvas.getContext('2d');
                    ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
                    ctx.drawImage(img, 0, 0);
                    resolve();
                };
                img.src = data.imageData;
            });
        }

        this.app.canvas.render();
        this.app.ui.updateLayersList();
    }

    /**
     * Generate thumbnail for frame
     */
    generateThumbnail(maxSize = 64) {
        const composite = this.app.canvas.getCompositeCanvas();
        const canvas = document.createElement('canvas');

        // Calculate thumbnail size maintaining aspect ratio
        const ratio = composite.width / composite.height;
        if (ratio > 1) {
            canvas.width = maxSize;
            canvas.height = maxSize / ratio;
        } else {
            canvas.height = maxSize;
            canvas.width = maxSize * ratio;
        }

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(composite, 0, 0, canvas.width, canvas.height);

        return canvas.toDataURL('image/png');
    }

    // ==========================================
    // FRAME MANAGEMENT
    // ==========================================

    /**
     * Get current frame
     */
    getCurrentFrame() {
        return this.frames[this.currentFrameIndex] || null;
    }

    /**
     * Get frame by index
     */
    getFrame(index) {
        return this.frames[index] || null;
    }

    /**
     * Get frame count
     */
    getFrameCount() {
        return this.frames.length;
    }

    /**
     * Go to specific frame
     */
    async goToFrame(index) {
        if (index < 0 || index >= this.frames.length) return;

        // Save current frame state first
        this.saveCurrentFrameState();

        this.currentFrameIndex = index;

        // Load frame layers
        const frame = this.frames[index];
        if (frame) {
            await this.deserializeLayers(frame.layers);
        }

        this.app.canvas.render();

        // Update UI
        if (this.app.ui.updateTimelinePanel) {
            this.app.ui.updateTimelinePanel();
        }
    }

    /**
     * Save current frame state
     */
    saveCurrentFrameState() {
        const frame = this.frames[this.currentFrameIndex];
        if (frame) {
            frame.layers = this.serializeLayers();
            frame.thumbnail = this.generateThumbnail();
        }
    }

    /**
     * Add new frame
     */
    addFrame(atIndex = -1, copyFromCurrent = false) {
        // Save current state first
        this.saveCurrentFrameState();

        const newFrame = {
            id: this.generateFrameId(),
            name: `Frame ${this.frames.length + 1}`,
            duration: 1000 / this.fps,
            layers: copyFromCurrent ? this.serializeLayers() : this.createEmptyLayersData(),
            thumbnail: null
        };

        if (atIndex >= 0 && atIndex < this.frames.length) {
            this.frames.splice(atIndex + 1, 0, newFrame);
            this.currentFrameIndex = atIndex + 1;
        } else {
            this.frames.push(newFrame);
            this.currentFrameIndex = this.frames.length - 1;
        }

        // Load the new frame
        this.goToFrame(this.currentFrameIndex);

        return newFrame;
    }

    /**
     * Create empty layers data
     */
    createEmptyLayersData() {
        const width = this.app.canvas.width;
        const height = this.app.canvas.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        return [{
            id: `layer_${Date.now()}`,
            name: 'Layer 1',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
            imageData: canvas.toDataURL('image/png')
        }];
    }

    /**
     * Duplicate frame
     */
    duplicateFrame(index) {
        if (index < 0 || index >= this.frames.length) return null;

        this.saveCurrentFrameState();

        const source = this.frames[index];
        const newFrame = {
            id: this.generateFrameId(),
            name: `${source.name} Copy`,
            duration: source.duration,
            layers: JSON.parse(JSON.stringify(source.layers)),
            thumbnail: source.thumbnail
        };

        this.frames.splice(index + 1, 0, newFrame);

        return newFrame;
    }

    /**
     * Delete frame
     */
    deleteFrame(index) {
        if (this.frames.length <= 1) return false;
        if (index < 0 || index >= this.frames.length) return false;

        this.frames.splice(index, 1);

        // Adjust current frame index
        if (this.currentFrameIndex >= this.frames.length) {
            this.currentFrameIndex = this.frames.length - 1;
        }

        this.goToFrame(this.currentFrameIndex);
        return true;
    }

    /**
     * Move frame
     */
    moveFrame(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.frames.length) return false;
        if (toIndex < 0 || toIndex >= this.frames.length) return false;
        if (fromIndex === toIndex) return false;

        const frame = this.frames.splice(fromIndex, 1)[0];
        this.frames.splice(toIndex, 0, frame);

        // Adjust current frame index
        if (this.currentFrameIndex === fromIndex) {
            this.currentFrameIndex = toIndex;
        } else if (fromIndex < this.currentFrameIndex && toIndex >= this.currentFrameIndex) {
            this.currentFrameIndex--;
        } else if (fromIndex > this.currentFrameIndex && toIndex <= this.currentFrameIndex) {
            this.currentFrameIndex++;
        }

        return true;
    }

    /**
     * Set frame duration
     */
    setFrameDuration(index, duration) {
        if (index < 0 || index >= this.frames.length) return;
        this.frames[index].duration = duration;
    }

    /**
     * Set frame name
     */
    setFrameName(index, name) {
        if (index < 0 || index >= this.frames.length) return;
        this.frames[index].name = name;
    }

    // ==========================================
    // PLAYBACK
    // ==========================================

    /**
     * Start playback
     */
    play() {
        if (this.playing) return;
        if (this.frames.length < 2) return;

        this.playing = true;
        this.saveCurrentFrameState();
        this.playNextFrame();

        if (this.app.ui.updatePlaybackButtons) {
            this.app.ui.updatePlaybackButtons();
        }
    }

    /**
     * Stop playback
     */
    stop() {
        this.playing = false;
        if (this.playbackTimer) {
            clearTimeout(this.playbackTimer);
            this.playbackTimer = null;
        }

        if (this.app.ui.updatePlaybackButtons) {
            this.app.ui.updatePlaybackButtons();
        }
    }

    /**
     * Toggle playback
     */
    togglePlay() {
        if (this.playing) {
            this.stop();
        } else {
            this.play();
        }
    }

    /**
     * Play next frame in sequence
     */
    playNextFrame() {
        if (!this.playing) return;

        const frame = this.frames[this.currentFrameIndex];
        const duration = frame ? frame.duration : 1000 / this.fps;

        this.playbackTimer = setTimeout(async () => {
            let nextIndex = this.currentFrameIndex + 1;

            if (nextIndex >= this.frames.length) {
                if (this.loop) {
                    nextIndex = 0;
                } else {
                    this.stop();
                    return;
                }
            }

            await this.goToFrame(nextIndex);
            this.playNextFrame();
        }, duration);
    }

    /**
     * Go to first frame
     */
    goToFirst() {
        this.stop();
        this.goToFrame(0);
    }

    /**
     * Go to last frame
     */
    goToLast() {
        this.stop();
        this.goToFrame(this.frames.length - 1);
    }

    /**
     * Go to next frame
     */
    nextFrame() {
        this.stop();
        const next = (this.currentFrameIndex + 1) % this.frames.length;
        this.goToFrame(next);
    }

    /**
     * Go to previous frame
     */
    prevFrame() {
        this.stop();
        const prev = (this.currentFrameIndex - 1 + this.frames.length) % this.frames.length;
        this.goToFrame(prev);
    }

    /**
     * Set FPS
     */
    setFPS(fps) {
        this.fps = Math.max(1, Math.min(60, fps));

        // Update default duration for new frames
        // Don't change existing frame durations
    }

    /**
     * Set loop
     */
    setLoop(loop) {
        this.loop = loop;
    }

    // ==========================================
    // ONION SKIN
    // ==========================================

    /**
     * Set onion skin enabled
     */
    setOnionSkinEnabled(enabled) {
        this.onionSkin.enabled = enabled;
        this.app.canvas.render();
    }

    /**
     * Render onion skin
     */
    renderOnionSkin(ctx, width, height, zoom, offsetX, offsetY) {
        if (!this.onionSkin.enabled || this.frames.length < 2) return;

        // Render previous frames
        for (let i = 1; i <= this.onionSkin.prevFrames; i++) {
            let frameIndex = this.currentFrameIndex - i;
            if (frameIndex < 0) {
                if (this.onionSkin.loop) {
                    frameIndex = this.frames.length + frameIndex;
                } else {
                    continue;
                }
            }

            const opacity = this.onionSkin.prevOpacity / i;
            this.renderFrameOverlay(ctx, frameIndex, opacity, this.onionSkin.prevColor, zoom, offsetX, offsetY);
        }

        // Render next frames
        for (let i = 1; i <= this.onionSkin.nextFrames; i++) {
            let frameIndex = this.currentFrameIndex + i;
            if (frameIndex >= this.frames.length) {
                if (this.onionSkin.loop) {
                    frameIndex = frameIndex - this.frames.length;
                } else {
                    continue;
                }
            }

            const opacity = this.onionSkin.nextOpacity / i;
            this.renderFrameOverlay(ctx, frameIndex, opacity, this.onionSkin.nextColor, zoom, offsetX, offsetY);
        }
    }

    /**
     * Render a frame as overlay
     */
    renderFrameOverlay(ctx, frameIndex, opacity, tintColor, zoom, offsetX, offsetY) {
        const frame = this.frames[frameIndex];
        if (!frame) return;

        ctx.save();
        ctx.globalAlpha = opacity;

        // Create temporary canvas for frame
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.app.canvas.width;
        tempCanvas.height = this.app.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Render frame layers
        for (const layerData of frame.layers) {
            if (!layerData.visible) continue;

            const img = new Image();
            img.src = layerData.imageData;

            // Sync drawing (thumbnail should be preloaded)
            tempCtx.save();
            tempCtx.globalAlpha = layerData.opacity;
            tempCtx.globalCompositeOperation = layerData.blendMode;

            // If image is loaded from cache
            if (img.complete) {
                tempCtx.drawImage(img, 0, 0);
            }

            tempCtx.restore();
        }

        // Apply tint if specified
        if (tintColor) {
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = tintColor;
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }

        // Draw to main canvas
        ctx.drawImage(
            tempCanvas,
            offsetX,
            offsetY,
            tempCanvas.width * zoom,
            tempCanvas.height * zoom
        );

        ctx.restore();
    }

    // ==========================================
    // EXPORT
    // ==========================================

    /**
     * Export animation as GIF
     */
    async exportGIF(options = {}) {
        const {
            quality = 10,
            scale = 1,
            loop = true,
            transparent = false,
            background = '#ffffff'
        } = { ...this.exportSettings, ...options };

        // Save current state
        this.saveCurrentFrameState();

        // Dynamically import gif.js
        const GIF = await this.loadGifJs();

        const width = Math.floor(this.app.canvas.width * scale);
        const height = Math.floor(this.app.canvas.height * scale);

        const gif = new GIF({
            workers: 2,
            quality: quality,
            width: width,
            height: height,
            workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js',
            transparent: transparent ? 0x00FF00 : null,
            repeat: loop ? 0 : -1
        });

        // Add each frame
        for (let i = 0; i < this.frames.length; i++) {
            const frame = this.frames[i];
            const canvas = await this.renderFrameToCanvas(i, scale, !transparent, background);

            gif.addFrame(canvas, { delay: frame.duration });
        }

        // Render GIF
        return new Promise((resolve, reject) => {
            gif.on('finished', (blob) => {
                resolve(blob);
            });

            gif.on('error', (error) => {
                reject(error);
            });

            gif.render();
        });
    }

    /**
     * Export animation as APNG
     */
    async exportAPNG(options = {}) {
        const {
            scale = 1,
            loop = true,
            background = '#ffffff'
        } = { ...this.exportSettings, ...options };

        this.saveCurrentFrameState();

        // APNG encoding is complex, using canvas-based approach
        const frames = [];
        const delays = [];

        for (let i = 0; i < this.frames.length; i++) {
            const canvas = await this.renderFrameToCanvas(i, scale, true, background);
            frames.push(canvas);
            delays.push(this.frames[i].duration);
        }

        // Use UPNG.js or similar library for APNG encoding
        // For now, return frames data that can be processed
        return {
            frames,
            delays,
            loop,
            width: frames[0].width,
            height: frames[0].height
        };
    }

    /**
     * Export as sprite sheet
     */
    async exportSpriteSheet(options = {}) {
        const {
            columns = 0,
            padding = 0,
            scale = 1,
            background = 'transparent'
        } = options;

        this.saveCurrentFrameState();

        const frameCount = this.frames.length;
        const frameWidth = Math.floor(this.app.canvas.width * scale);
        const frameHeight = Math.floor(this.app.canvas.height * scale);

        // Calculate grid dimensions
        let cols, rows;
        if (columns > 0) {
            cols = columns;
            rows = Math.ceil(frameCount / cols);
        } else {
            // Auto-calculate square-ish grid
            cols = Math.ceil(Math.sqrt(frameCount));
            rows = Math.ceil(frameCount / cols);
        }

        // Create sprite sheet canvas
        const sheetWidth = cols * (frameWidth + padding) - padding;
        const sheetHeight = rows * (frameHeight + padding) - padding;

        const canvas = document.createElement('canvas');
        canvas.width = sheetWidth;
        canvas.height = sheetHeight;
        const ctx = canvas.getContext('2d');

        // Fill background
        if (background !== 'transparent') {
            ctx.fillStyle = background;
            ctx.fillRect(0, 0, sheetWidth, sheetHeight);
        }

        // Render each frame
        for (let i = 0; i < frameCount; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = col * (frameWidth + padding);
            const y = row * (frameHeight + padding);

            const frameCanvas = await this.renderFrameToCanvas(i, scale, false);
            ctx.drawImage(frameCanvas, x, y);
        }

        return {
            canvas,
            dataUrl: canvas.toDataURL('image/png'),
            columns: cols,
            rows,
            frameWidth,
            frameHeight,
            frameCount
        };
    }

    /**
     * Render a single frame to canvas
     */
    async renderFrameToCanvas(frameIndex, scale = 1, includeBackground = true, bgColor = '#ffffff') {
        const frame = this.frames[frameIndex];
        if (!frame) return null;

        const width = Math.floor(this.app.canvas.width * scale);
        const height = Math.floor(this.app.canvas.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Disable smoothing for pixel art
        ctx.imageSmoothingEnabled = false;

        // Fill background if needed
        if (includeBackground && bgColor) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, width, height);
        }

        // Render layers
        for (const layerData of frame.layers) {
            if (!layerData.visible) continue;

            await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    ctx.save();
                    ctx.globalAlpha = layerData.opacity;
                    ctx.globalCompositeOperation = layerData.blendMode;
                    ctx.drawImage(img, 0, 0, width, height);
                    ctx.restore();
                    resolve();
                };
                img.onerror = resolve;
                img.src = layerData.imageData;
            });
        }

        return canvas;
    }

    /**
     * Import sprite sheet as frames
     */
    async importSpriteSheet(image, options = {}) {
        const {
            frameWidth,
            frameHeight,
            columns,
            rows,
            startFrame = 0,
            frameCount = -1
        } = options;

        if (!frameWidth || !frameHeight) {
            throw new Error('Frame dimensions required');
        }

        const cols = columns || Math.floor(image.width / frameWidth);
        const rowCount = rows || Math.floor(image.height / frameHeight);
        const totalFrames = frameCount > 0 ? frameCount : cols * rowCount;

        // Clear existing frames
        this.frames = [];

        for (let i = startFrame; i < startFrame + totalFrames; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);

            if (row >= rowCount) break;

            const sx = col * frameWidth;
            const sy = row * frameHeight;

            // Create frame canvas
            const canvas = document.createElement('canvas');
            canvas.width = frameWidth;
            canvas.height = frameHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, sx, sy, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);

            const frame = {
                id: this.generateFrameId(),
                name: `Frame ${this.frames.length + 1}`,
                duration: 1000 / this.fps,
                layers: [{
                    id: `layer_${Date.now()}_${i}`,
                    name: 'Imported',
                    visible: true,
                    locked: false,
                    opacity: 1,
                    blendMode: 'source-over',
                    imageData: canvas.toDataURL('image/png')
                }],
                thumbnail: null
            };

            // Generate thumbnail
            const thumbCanvas = document.createElement('canvas');
            const thumbSize = 64;
            const ratio = frameWidth / frameHeight;
            thumbCanvas.width = ratio > 1 ? thumbSize : thumbSize * ratio;
            thumbCanvas.height = ratio > 1 ? thumbSize / ratio : thumbSize;
            const thumbCtx = thumbCanvas.getContext('2d');
            thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
            frame.thumbnail = thumbCanvas.toDataURL('image/png');

            this.frames.push(frame);
        }

        // Resize canvas to match frame size
        this.app.canvas.resize(frameWidth, frameHeight);

        // Load first frame
        await this.goToFrame(0);

        return this.frames.length;
    }

    /**
     * Load GIF.js library dynamically from CDN
     */
    async loadGifJs() {
        if (window.GIF) return window.GIF;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
            script.onload = () => {
                if (window.GIF) {
                    resolve(window.GIF);
                } else {
                    reject(new Error('GIF.js loaded but GIF constructor not found'));
                }
            };
            script.onerror = () => reject(new Error('Failed to load GIF.js from CDN'));
            document.head.appendChild(script);
        });
    }

    // ==========================================
    // SERIALIZATION
    // ==========================================

    /**
     * Serialize animation data for saving
     */
    serialize() {
        this.saveCurrentFrameState();

        return {
            frames: this.frames,
            currentFrameIndex: this.currentFrameIndex,
            fps: this.fps,
            loop: this.loop,
            onionSkin: this.onionSkin
        };
    }

    /**
     * Deserialize animation data
     */
    async deserialize(data) {
        if (!data || !data.frames) return;

        this.frames = data.frames;
        this.currentFrameIndex = data.currentFrameIndex || 0;
        this.fps = data.fps || 12;
        this.loop = data.loop !== undefined ? data.loop : true;

        if (data.onionSkin) {
            Object.assign(this.onionSkin, data.onionSkin);
        }

        // Load current frame
        await this.goToFrame(this.currentFrameIndex);
    }

    /**
     * Clear all animation data
     */
    clear() {
        this.stop();
        this.frames = [];
        this.currentFrameIndex = 0;
        this.selectedFrames.clear();
    }
}
