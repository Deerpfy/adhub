/**
 * ClipForge - Preview Engine
 *
 * Handles:
 * - Video/Image preview rendering on canvas
 * - Real-time playback compositing
 * - Filter application
 * - Text overlay rendering
 *
 * Uses Canvas 2D API for offline-first approach
 */

const Preview = {
    // Canvas context
    canvas: null,
    ctx: null,

    // State
    width: 1920,
    height: 1080,
    aspectRatio: 16 / 9,
    currentTime: 0,
    isPlaying: false,

    // Media cache (Object URLs)
    mediaCache: new Map(),

    // Loaded media elements
    loadedMedia: new Map(),

    // Current clips
    tracks: [],

    // Filters CSS equivalents
    filters: {
        none: '',
        grayscale: 'grayscale(100%)',
        sepia: 'sepia(100%)',
        vintage: 'sepia(50%) contrast(90%) brightness(90%)',
        warm: 'sepia(30%) saturate(120%)',
        cool: 'hue-rotate(180deg) saturate(80%)',
        bright: 'brightness(130%)',
        contrast: 'contrast(150%)'
    },

    // Color adjustments
    adjustments: {
        brightness: 100,
        contrast: 100,
        saturation: 100
    },

    /**
     * Initialize preview
     */
    init() {
        this.canvas = document.getElementById('preview-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.resize();

        // Handle window resize
        window.addEventListener('resize', () => this.resize());

        // Bind adjustment controls
        this.bindAdjustmentControls();

        console.log('Preview initialized');
    },

    /**
     * Resize canvas to fit container
     */
    resize() {
        const container = document.getElementById('preview-container');
        if (!container) return;

        const containerWidth = container.clientWidth - 32;
        const containerHeight = container.clientHeight - 32;

        // Calculate size maintaining aspect ratio
        let canvasWidth, canvasHeight;

        if (containerWidth / containerHeight > this.aspectRatio) {
            canvasHeight = containerHeight;
            canvasWidth = canvasHeight * this.aspectRatio;
        } else {
            canvasWidth = containerWidth;
            canvasHeight = canvasWidth / this.aspectRatio;
        }

        this.canvas.style.width = `${canvasWidth}px`;
        this.canvas.style.height = `${canvasHeight}px`;

        // Set actual canvas resolution
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.render();
    },

    /**
     * Set project dimensions
     * @param {number} width
     * @param {number} height
     */
    setDimensions(width, height) {
        this.width = width;
        this.height = height;
        this.aspectRatio = width / height;
        this.resize();
    },

    /**
     * Update clips from timeline
     * @param {Array} tracks
     */
    updateClips(tracks) {
        this.tracks = tracks;
        this.loadMediaForTracks();
        this.render();
    },

    /**
     * Load media elements for all clips
     */
    async loadMediaForTracks() {
        for (const track of this.tracks) {
            for (const clip of track.clips) {
                if (!clip.mediaId) continue;
                if (this.loadedMedia.has(clip.mediaId)) continue;

                try {
                    await this.loadMedia(clip.mediaId);
                } catch (error) {
                    console.error('Failed to load media:', clip.mediaId, error);
                }
            }
        }
    },

    /**
     * Load a single media item
     * @param {string} mediaId
     */
    async loadMedia(mediaId) {
        if (this.loadedMedia.has(mediaId)) {
            return this.loadedMedia.get(mediaId);
        }

        const media = await ClipForgeDB.getMedia(mediaId);
        if (!media) return null;

        // Create object URL
        let url = this.mediaCache.get(mediaId);
        if (!url) {
            url = ClipForgeDB.createMediaURL(media);
            this.mediaCache.set(mediaId, url);
        }

        // Create appropriate element
        let element;

        if (media.type === 'video') {
            element = document.createElement('video');
            element.src = url;
            element.muted = true; // Mute by default, audio handled separately
            element.preload = 'auto';

            await new Promise((resolve, reject) => {
                element.onloadeddata = resolve;
                element.onerror = reject;
            });

        } else if (media.type === 'image') {
            element = new Image();
            element.src = url;

            await new Promise((resolve, reject) => {
                element.onload = resolve;
                element.onerror = reject;
            });

        } else if (media.type === 'audio') {
            element = document.createElement('audio');
            element.src = url;
            element.preload = 'auto';

            await new Promise((resolve, reject) => {
                element.onloadeddata = resolve;
                element.onerror = reject;
            });
        }

        this.loadedMedia.set(mediaId, { element, media });
        return { element, media };
    },

    /**
     * Seek to specific time
     * @param {number} time
     */
    seek(time) {
        this.currentTime = time;
        this.render();

        // Seek video elements
        this.loadedMedia.forEach(({ element, media }) => {
            if (media.type === 'video' && element) {
                // Find corresponding clip
                for (const track of this.tracks) {
                    for (const clip of track.clips) {
                        if (clip.mediaId === media.id) {
                            if (time >= clip.startTime && time < clip.startTime + clip.duration) {
                                const clipTime = time - clip.startTime + (clip.trimStart || 0);
                                if (Math.abs(element.currentTime - clipTime) > 0.1) {
                                    element.currentTime = clipTime;
                                }
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Play preview
     */
    play() {
        this.isPlaying = true;

        // Start video elements
        this.loadedMedia.forEach(({ element, media }) => {
            if (media.type === 'video' && element) {
                element.play().catch(() => {}); // Ignore autoplay errors
            }
        });
    },

    /**
     * Pause preview
     */
    pause() {
        this.isPlaying = false;

        // Pause video elements
        this.loadedMedia.forEach(({ element, media }) => {
            if (media.type === 'video' && element) {
                element.pause();
            }
        });
    },

    /**
     * Render current frame
     */
    render() {
        if (!this.ctx) return;

        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Get clips at current time (sorted by track order for proper layering)
        const activeClips = [];

        for (const track of this.tracks) {
            if (track.muted) continue;

            for (const clip of track.clips) {
                if (this.currentTime >= clip.startTime &&
                    this.currentTime < clip.startTime + clip.duration) {
                    activeClips.push({ clip, track });
                }
            }
        }

        // Render clips in order
        for (const { clip, track } of activeClips) {
            this.renderClip(clip, track);
        }
    },

    /**
     * Render a single clip
     * @param {Object} clip
     * @param {Object} track
     */
    renderClip(clip, track) {
        const loaded = this.loadedMedia.get(clip.mediaId);
        if (!loaded) return;

        const { element, media } = loaded;

        this.ctx.save();

        // Apply opacity
        this.ctx.globalAlpha = clip.opacity ?? 1;

        // Apply filter
        const filterValue = this.getFilterString(clip.filter);
        if (filterValue) {
            this.ctx.filter = filterValue;
        }

        // Apply color adjustments
        const adjustmentFilter = this.getAdjustmentFilter();
        if (adjustmentFilter) {
            this.ctx.filter = (this.ctx.filter || '') + ' ' + adjustmentFilter;
        }

        if (media.type === 'video' || media.type === 'image') {
            // Draw media
            this.ctx.drawImage(element, 0, 0, this.width, this.height);
        }

        // Render text overlay if it's a text clip
        if (clip.type === 'text' || track.type === 'text') {
            this.renderText(clip);
        }

        this.ctx.restore();
    },

    /**
     * Render text overlay
     * @param {Object} clip
     */
    renderText(clip) {
        if (!clip.text) return;

        const style = clip.textStyle || {};
        const fontSize = style.size || 48;
        const fontFamily = style.font || 'Inter, sans-serif';
        const color = style.color || '#ffffff';
        const position = style.position || 'center';

        this.ctx.font = `${style.weight || 600} ${fontSize}px ${fontFamily}`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Add text shadow for readability
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;

        // Calculate position
        let x = this.width / 2;
        let y = this.height / 2;

        switch (position) {
            case 'top':
                y = this.height * 0.15;
                break;
            case 'bottom':
                y = this.height * 0.85;
                break;
            case 'lower-third':
                y = this.height * 0.8;
                break;
        }

        // Handle multiline text
        const lines = clip.text.split('\n');
        const lineHeight = fontSize * 1.2;
        const startY = y - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, index) => {
            this.ctx.fillText(line, x, startY + index * lineHeight);
        });
    },

    /**
     * Get CSS filter string for clip filter
     * @param {string} filterName
     * @returns {string}
     */
    getFilterString(filterName) {
        return this.filters[filterName] || '';
    },

    /**
     * Get adjustment filter string
     * @returns {string}
     */
    getAdjustmentFilter() {
        const parts = [];

        if (this.adjustments.brightness !== 100) {
            parts.push(`brightness(${this.adjustments.brightness}%)`);
        }
        if (this.adjustments.contrast !== 100) {
            parts.push(`contrast(${this.adjustments.contrast}%)`);
        }
        if (this.adjustments.saturation !== 100) {
            parts.push(`saturate(${this.adjustments.saturation}%)`);
        }

        return parts.join(' ');
    },

    /**
     * Set color adjustment
     * @param {string} type - 'brightness', 'contrast', 'saturation'
     * @param {number} value - 0-200
     */
    setAdjustment(type, value) {
        this.adjustments[type] = value;
        this.render();
    },

    /**
     * Bind adjustment control events
     */
    bindAdjustmentControls() {
        const brightnessInput = document.getElementById('brightness');
        const contrastInput = document.getElementById('contrast');
        const saturationInput = document.getElementById('saturation');

        brightnessInput?.addEventListener('input', (e) => {
            this.setAdjustment('brightness', parseInt(e.target.value));
        });

        contrastInput?.addEventListener('input', (e) => {
            this.setAdjustment('contrast', parseInt(e.target.value));
        });

        saturationInput?.addEventListener('input', (e) => {
            this.setAdjustment('saturation', parseInt(e.target.value));
        });
    },

    /**
     * Apply filter to selected clip
     * @param {string} filterName
     */
    applyFilter(filterName) {
        if (!Timeline.selectedClip) return;

        Timeline.selectedClip.filter = filterName;
        Timeline.saveHistory('Aplikace filtru');
        this.render();
    },

    /**
     * Cleanup resources
     */
    cleanup() {
        // Revoke object URLs
        this.mediaCache.forEach(url => {
            URL.revokeObjectURL(url);
        });
        this.mediaCache.clear();
        this.loadedMedia.clear();
    },

    /**
     * Generate thumbnail from current frame
     * @param {number} width
     * @param {number} height
     * @returns {string} Data URL
     */
    generateThumbnail(width = 160, height = 90) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.drawImage(this.canvas, 0, 0, width, height);

        return tempCanvas.toDataURL('image/jpeg', 0.7);
    },

    /**
     * Get current frame as blob
     * @returns {Promise<Blob>}
     */
    async getFrameBlob() {
        return new Promise(resolve => {
            this.canvas.toBlob(blob => resolve(blob), 'image/png');
        });
    }
};

// Export for use in other modules
window.Preview = Preview;
