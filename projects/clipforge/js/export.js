/**
 * ClipForge - Export Engine
 *
 * Handles:
 * - Video rendering and export
 * - Multiple format support (WebM, MP4, GIF)
 * - Progress tracking
 * - Quality settings
 *
 * Uses Canvas MediaRecorder API for offline-first export
 */

const Export = {
    // Export state
    isExporting: false,
    progress: 0,
    aborted: false,

    // MediaRecorder instance
    recorder: null,
    chunks: [],

    // Export settings
    settings: {
        format: 'webm',
        quality: 'high',
        resolution: '1080p',
        fps: 30
    },

    // Resolution presets
    resolutions: {
        '480p': { width: 854, height: 480 },
        '720p': { width: 1280, height: 720 },
        '1080p': { width: 1920, height: 1080 },
        '1440p': { width: 2560, height: 1440 },
        '4k': { width: 3840, height: 2160 }
    },

    // Quality presets (bitrate in Mbps)
    qualities: {
        low: 2,
        medium: 5,
        high: 10,
        ultra: 20
    },

    // MIME types
    mimeTypes: {
        webm: 'video/webm;codecs=vp9',
        mp4: 'video/mp4',
        gif: 'image/gif'
    },

    /**
     * Initialize export module
     */
    init() {
        this.bindControls();
        this.loadSettings();
        console.log('Export initialized');
    },

    /**
     * Bind export control events
     */
    bindControls() {
        const exportBtn = document.getElementById('export-btn');
        const startExportBtn = document.getElementById('start-export');
        const cancelExportBtn = document.getElementById('cancel-export');

        exportBtn?.addEventListener('click', () => this.showExportModal());
        startExportBtn?.addEventListener('click', () => this.startExport());
        cancelExportBtn?.addEventListener('click', () => this.cancelExport());

        // Format selection
        document.querySelectorAll('#export-format .format-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('#export-format .format-option').forEach(o => o.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.settings.format = e.currentTarget.dataset.format;
                this.updateExportUI();
            });
        });

        // Quality selection
        const qualitySelect = document.getElementById('export-quality');
        qualitySelect?.addEventListener('change', (e) => {
            this.settings.quality = e.target.value;
        });

        // Resolution selection
        const resolutionSelect = document.getElementById('export-resolution');
        resolutionSelect?.addEventListener('change', (e) => {
            this.settings.resolution = e.target.value;
        });

        // FPS selection
        const fpsSelect = document.getElementById('export-fps');
        fpsSelect?.addEventListener('change', (e) => {
            this.settings.fps = parseInt(e.target.value);
        });
    },

    /**
     * Load saved export settings
     */
    async loadSettings() {
        try {
            const saved = await ClipForgeDB.getSetting('exportSettings');
            if (saved) {
                this.settings = { ...this.settings, ...saved };
            }
        } catch (error) {
            console.warn('Could not load export settings:', error);
        }
    },

    /**
     * Save export settings
     */
    async saveSettings() {
        try {
            await ClipForgeDB.saveSetting('exportSettings', this.settings);
        } catch (error) {
            console.warn('Could not save export settings:', error);
        }
    },

    /**
     * Show export modal
     */
    showExportModal() {
        const modal = document.getElementById('export-modal');
        if (!modal) return;

        // Update UI with current settings
        this.updateExportUI();

        // Calculate estimated file size
        this.updateEstimates();

        modal.classList.add('active');
    },

    /**
     * Hide export modal
     */
    hideExportModal() {
        const modal = document.getElementById('export-modal');
        modal?.classList.remove('active');
    },

    /**
     * Update export UI based on settings
     */
    updateExportUI() {
        // Update format buttons
        document.querySelectorAll('#export-format .format-option').forEach(option => {
            option.classList.toggle('active', option.dataset.format === this.settings.format);
        });

        // Update selects
        const qualitySelect = document.getElementById('export-quality');
        const resolutionSelect = document.getElementById('export-resolution');
        const fpsSelect = document.getElementById('export-fps');

        if (qualitySelect) qualitySelect.value = this.settings.quality;
        if (resolutionSelect) resolutionSelect.value = this.settings.resolution;
        if (fpsSelect) fpsSelect.value = this.settings.fps;

        // Show/hide options based on format
        const fpsRow = document.getElementById('fps-row');
        if (fpsRow) {
            fpsRow.style.display = this.settings.format === 'gif' ? 'none' : '';
        }
    },

    /**
     * Update size and duration estimates
     */
    updateEstimates() {
        if (!Timeline.project) return;

        const duration = Timeline.project.duration || 0;
        const resolution = this.resolutions[this.settings.resolution];
        const bitrate = this.qualities[this.settings.quality];

        // Estimate file size (bitrate * duration in seconds / 8 for bytes)
        let estimatedSize = (bitrate * duration) / 8;

        // GIF is larger
        if (this.settings.format === 'gif') {
            estimatedSize *= 3;
        }

        const sizeEl = document.getElementById('estimated-size');
        const durationEl = document.getElementById('export-duration');

        if (sizeEl) {
            sizeEl.textContent = this.formatFileSize(estimatedSize * 1024 * 1024);
        }

        if (durationEl) {
            durationEl.textContent = this.formatDuration(duration);
        }
    },

    /**
     * Start export process
     */
    async startExport() {
        if (this.isExporting || !Timeline.project) return;

        this.isExporting = true;
        this.aborted = false;
        this.progress = 0;
        this.chunks = [];

        await this.saveSettings();

        // Show progress UI
        this.showProgressUI();

        try {
            const blob = await this.renderVideo();

            if (this.aborted) {
                this.updateProgress(0, 'Export zrušen');
                return;
            }

            // Download the file
            this.downloadBlob(blob);

            this.updateProgress(100, 'Export dokončen!');

            // Hide modal after short delay
            setTimeout(() => {
                this.hideExportModal();
                this.hideProgressUI();
            }, 2000);

        } catch (error) {
            console.error('Export failed:', error);
            this.updateProgress(0, `Chyba: ${error.message}`);
        } finally {
            this.isExporting = false;
        }
    },

    /**
     * Cancel export
     */
    cancelExport() {
        if (!this.isExporting) {
            this.hideExportModal();
            return;
        }

        this.aborted = true;

        if (this.recorder && this.recorder.state === 'recording') {
            this.recorder.stop();
        }
    },

    /**
     * Render video using Canvas and MediaRecorder
     * @returns {Promise<Blob>}
     */
    async renderVideo() {
        const resolution = this.resolutions[this.settings.resolution];
        const fps = this.settings.fps;
        const duration = Timeline.project.duration || 10;
        const totalFrames = Math.ceil(duration * fps);

        // Create offscreen canvas
        const canvas = document.createElement('canvas');
        canvas.width = resolution.width;
        canvas.height = resolution.height;
        const ctx = canvas.getContext('2d');

        // Get MIME type
        let mimeType = this.mimeTypes[this.settings.format];

        // Check browser support
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            // Fallback to webm
            mimeType = 'video/webm';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                throw new Error('Prohlížeč nepodporuje export videa');
            }
        }

        // Create MediaRecorder
        const stream = canvas.captureStream(fps);
        const bitrate = this.qualities[this.settings.quality] * 1000000;

        this.recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: bitrate
        });

        this.chunks = [];

        this.recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                this.chunks.push(e.data);
            }
        };

        // Start recording
        this.recorder.start(100); // Collect data every 100ms

        // Render each frame
        const frameInterval = 1000 / fps;
        let currentFrame = 0;

        const renderFrame = async () => {
            if (this.aborted || currentFrame >= totalFrames) {
                return;
            }

            const time = currentFrame / fps;

            // Set preview time and render
            Preview.currentTime = time;

            // Clear and draw
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, resolution.width, resolution.height);

            // Get active clips and render them
            for (const track of Timeline.project.tracks || []) {
                if (track.muted) continue;

                for (const clip of track.clips || []) {
                    if (time >= clip.startTime && time < clip.startTime + clip.duration) {
                        await this.renderClipToContext(ctx, clip, time, resolution);
                    }
                }
            }

            // Update progress
            const progress = Math.round((currentFrame / totalFrames) * 100);
            this.updateProgress(progress, `Renderuji: ${progress}%`);

            currentFrame++;

            // Schedule next frame
            if (currentFrame < totalFrames && !this.aborted) {
                await new Promise(resolve => setTimeout(resolve, frameInterval / 10));
                await renderFrame();
            }
        };

        await renderFrame();

        // Stop recording
        return new Promise((resolve, reject) => {
            this.recorder.onstop = () => {
                const blob = new Blob(this.chunks, { type: mimeType });
                resolve(blob);
            };

            this.recorder.onerror = (e) => {
                reject(e.error || new Error('Recording failed'));
            };

            this.recorder.stop();
        });
    },

    /**
     * Render a clip to canvas context
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} clip
     * @param {number} time
     * @param {Object} resolution
     */
    async renderClipToContext(ctx, clip, time, resolution) {
        const loaded = Preview.loadedMedia.get(clip.mediaId);
        if (!loaded) return;

        const { element, media } = loaded;

        ctx.save();

        // Apply opacity
        ctx.globalAlpha = clip.opacity ?? 1;

        // Apply filter
        const filterValue = Preview.getFilterString(clip.filter);
        if (filterValue) {
            ctx.filter = filterValue;
        }

        if (media.type === 'video') {
            // Seek video to correct time
            const clipTime = time - clip.startTime + (clip.trimStart || 0);
            element.currentTime = clipTime;

            // Wait for seek
            await new Promise(resolve => {
                if (element.readyState >= 2) {
                    resolve();
                } else {
                    element.onseeked = resolve;
                    setTimeout(resolve, 50); // Timeout fallback
                }
            });

            ctx.drawImage(element, 0, 0, resolution.width, resolution.height);

        } else if (media.type === 'image') {
            ctx.drawImage(element, 0, 0, resolution.width, resolution.height);
        }

        // Render text overlay
        if (clip.type === 'text' && clip.text) {
            this.renderTextToContext(ctx, clip, resolution);
        }

        ctx.restore();
    },

    /**
     * Render text to canvas context
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} clip
     * @param {Object} resolution
     */
    renderTextToContext(ctx, clip, resolution) {
        const style = clip.textStyle || {};
        const fontSize = (style.size || 48) * (resolution.height / 1080);
        const fontFamily = style.font || 'Inter, sans-serif';
        const color = style.color || '#ffffff';
        const position = style.position || 'center';

        ctx.font = `${style.weight || 600} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Text shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        let x = resolution.width / 2;
        let y = resolution.height / 2;

        switch (position) {
            case 'top':
                y = resolution.height * 0.15;
                break;
            case 'bottom':
                y = resolution.height * 0.85;
                break;
            case 'lower-third':
                y = resolution.height * 0.8;
                break;
        }

        const lines = clip.text.split('\n');
        const lineHeight = fontSize * 1.2;
        const startY = y - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, index) => {
            ctx.fillText(line, x, startY + index * lineHeight);
        });
    },

    /**
     * Show progress UI
     */
    showProgressUI() {
        const progressContainer = document.getElementById('export-progress');
        const settingsContainer = document.getElementById('export-settings');
        const startBtn = document.getElementById('start-export');

        if (progressContainer) progressContainer.style.display = 'block';
        if (settingsContainer) settingsContainer.style.display = 'none';
        if (startBtn) startBtn.disabled = true;
    },

    /**
     * Hide progress UI
     */
    hideProgressUI() {
        const progressContainer = document.getElementById('export-progress');
        const settingsContainer = document.getElementById('export-settings');
        const startBtn = document.getElementById('start-export');

        if (progressContainer) progressContainer.style.display = 'none';
        if (settingsContainer) settingsContainer.style.display = '';
        if (startBtn) startBtn.disabled = false;
    },

    /**
     * Update progress
     * @param {number} percent
     * @param {string} message
     */
    updateProgress(percent, message) {
        this.progress = percent;

        const progressBar = document.getElementById('export-progress-bar');
        const progressText = document.getElementById('export-progress-text');

        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }

        if (progressText) {
            progressText.textContent = message;
        }
    },

    /**
     * Download blob as file
     * @param {Blob} blob
     */
    downloadBlob(blob) {
        const projectName = Timeline.project?.name || 'video';
        const extension = this.settings.format;
        const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Revoke after download starts
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    /**
     * Format file size
     * @param {number} bytes
     * @returns {string}
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    },

    /**
     * Format duration
     * @param {number} seconds
     * @returns {string}
     */
    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * Export single frame as image
     * @returns {Promise<Blob>}
     */
    async exportFrame() {
        return Preview.getFrameBlob();
    },

    /**
     * Check browser export capabilities
     * @returns {Object}
     */
    checkCapabilities() {
        return {
            webm: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ||
                  MediaRecorder.isTypeSupported('video/webm'),
            mp4: MediaRecorder.isTypeSupported('video/mp4'),
            gif: true // Always available via canvas
        };
    }
};

// Export for use in other modules
window.Export = Export;
