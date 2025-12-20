/**
 * ClipForge - Timeline Manager
 *
 * Handles:
 * - Timeline rendering and interaction
 * - Clip management (add, move, resize, delete)
 * - Track management
 * - Playhead control
 *
 * Design inspired by: CapCut's simplicity, DaVinci's multi-track, FCP's magnetic timeline concept
 */

const Timeline = {
    // State
    project: null,
    selectedClip: null,
    playhead: 0,
    zoom: 100,
    pixelsPerSecond: 100,
    isPlaying: false,
    isDragging: false,
    dragData: null,

    // DOM Elements
    elements: {
        container: null,
        tracks: null,
        ruler: null,
        playhead: null,
        scroll: null
    },

    // History for undo/redo
    history: [],
    historyIndex: -1,
    maxHistory: 50,

    /**
     * Initialize timeline
     * @param {Object} project
     */
    init(project) {
        this.project = project;
        this.cacheElements();
        this.bindEvents();
        this.render();
        this.updateRuler();

        console.log('Timeline initialized');
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            container: document.querySelector('.timeline-container'),
            tracks: document.getElementById('timeline-tracks'),
            ruler: document.getElementById('timeline-ruler'),
            playhead: document.getElementById('playhead'),
            scroll: document.getElementById('timeline-scroll'),
            zoomSlider: document.getElementById('timeline-zoom')
        };
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Zoom control
        this.elements.zoomSlider?.addEventListener('input', (e) => {
            this.setZoom(parseInt(e.target.value));
        });

        document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
            this.setZoom(Math.min(200, this.zoom + 20));
        });

        document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
            this.setZoom(Math.max(10, this.zoom - 20));
        });

        // Timeline click to move playhead
        this.elements.scroll?.addEventListener('click', (e) => {
            if (e.target.closest('.clip')) return;
            const rect = this.elements.scroll.getBoundingClientRect();
            const x = e.clientX - rect.left + this.elements.scroll.scrollLeft - 120;
            const time = x / this.pixelsPerSecond;
            this.setPlayhead(Math.max(0, time));
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Toolbar buttons
        document.getElementById('btn-split')?.addEventListener('click', () => this.splitClip());
        document.getElementById('btn-delete')?.addEventListener('click', () => this.deleteSelectedClip());
        document.getElementById('btn-undo')?.addEventListener('click', () => this.undo());
        document.getElementById('btn-redo')?.addEventListener('click', () => this.redo());
        document.getElementById('btn-add-track')?.addEventListener('click', () => this.addTrack());

        // Drag and drop from media library
        this.elements.tracks?.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        this.elements.tracks?.addEventListener('drop', (e) => this.handleDrop(e));
    },

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e
     */
    handleKeyboard(e) {
        // Don't trigger if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case ' ':
                e.preventDefault();
                this.togglePlayback();
                break;
            case 's':
            case 'S':
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    this.splitClip();
                }
                break;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                this.deleteSelectedClip();
                break;
            case 'z':
            case 'Z':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                }
                break;
            case 'y':
            case 'Y':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.redo();
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.setPlayhead(Math.max(0, this.playhead - (e.shiftKey ? 1 : 0.1)));
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.setPlayhead(this.playhead + (e.shiftKey ? 1 : 0.1));
                break;
            case 'Home':
                e.preventDefault();
                this.setPlayhead(0);
                break;
            case 'End':
                e.preventDefault();
                this.setPlayhead(this.project.duration);
                break;
        }
    },

    /**
     * Render timeline tracks and clips
     */
    render() {
        if (!this.project || !this.elements.tracks) return;

        // Clear existing clips (keep track structure from HTML)
        const trackClipContainers = this.elements.tracks.querySelectorAll('.track-clips');
        trackClipContainers.forEach(container => {
            container.innerHTML = '';
        });

        // Render clips for each track
        this.project.tracks.forEach(track => {
            const container = document.querySelector(`[data-track-id="${track.id}"]`);
            if (!container) return;

            track.clips.forEach(clip => {
                const clipEl = this.createClipElement(clip, track);
                container.appendChild(clipEl);
            });
        });

        this.updateDuration();
    },

    /**
     * Create a clip element
     * @param {Object} clip
     * @param {Object} track
     * @returns {HTMLElement}
     */
    createClipElement(clip, track) {
        const el = document.createElement('div');
        el.className = `clip ${clip.type}${clip.id === this.selectedClip?.id ? ' selected' : ''}`;
        el.dataset.clipId = clip.id;
        el.dataset.trackId = track.id;

        const left = clip.startTime * this.pixelsPerSecond;
        const width = clip.duration * this.pixelsPerSecond;

        el.style.left = `${left}px`;
        el.style.width = `${Math.max(20, width)}px`;

        // Clip content
        el.innerHTML = `
            ${clip.thumbnail ? `<div class="clip-thumbnail" style="background-image: url(${clip.thumbnail})"></div>` : ''}
            <span class="clip-name">${clip.name}</span>
            ${clip.type === 'audio' ? '<canvas class="clip-waveform"></canvas>' : ''}
            <div class="clip-handle left"></div>
            <div class="clip-handle right"></div>
        `;

        // Event listeners
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectClip(clip);
        });

        el.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.openClipProperties(clip);
        });

        // Drag to move
        el.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('clip-handle')) return;
            this.startDrag(e, clip, track, 'move');
        });

        // Resize handles
        el.querySelector('.clip-handle.left')?.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startDrag(e, clip, track, 'resize-left');
        });

        el.querySelector('.clip-handle.right')?.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startDrag(e, clip, track, 'resize-right');
        });

        return el;
    },

    /**
     * Start dragging a clip
     * @param {MouseEvent} e
     * @param {Object} clip
     * @param {Object} track
     * @param {string} mode - 'move', 'resize-left', 'resize-right'
     */
    startDrag(e, clip, track, mode) {
        e.preventDefault();
        this.isDragging = true;
        this.dragData = {
            clip,
            track,
            mode,
            startX: e.clientX,
            startTime: clip.startTime,
            startDuration: clip.duration,
            originalClip: { ...clip }
        };

        document.addEventListener('mousemove', this.handleDrag.bind(this));
        document.addEventListener('mouseup', this.endDrag.bind(this));
    },

    /**
     * Handle drag movement
     * @param {MouseEvent} e
     */
    handleDrag(e) {
        if (!this.isDragging || !this.dragData) return;

        const deltaX = e.clientX - this.dragData.startX;
        const deltaTime = deltaX / this.pixelsPerSecond;

        const { clip, mode, startTime, startDuration } = this.dragData;

        switch (mode) {
            case 'move':
                clip.startTime = Math.max(0, startTime + deltaTime);
                break;

            case 'resize-left':
                const newStart = Math.max(0, startTime + deltaTime);
                const timeDiff = newStart - startTime;
                if (startDuration - timeDiff >= 0.1) {
                    clip.startTime = newStart;
                    clip.duration = startDuration - timeDiff;
                    clip.trimStart = (clip.trimStart || 0) + timeDiff;
                }
                break;

            case 'resize-right':
                clip.duration = Math.max(0.1, startDuration + deltaTime);
                break;
        }

        this.render();
    },

    /**
     * End drag operation
     */
    endDrag() {
        if (this.isDragging && this.dragData) {
            // Save to history if clip changed
            const { clip, originalClip } = this.dragData;
            if (clip.startTime !== originalClip.startTime || clip.duration !== originalClip.duration) {
                this.saveHistory('Přesun klipu');
            }
        }

        this.isDragging = false;
        this.dragData = null;
        document.removeEventListener('mousemove', this.handleDrag.bind(this));
        document.removeEventListener('mouseup', this.endDrag.bind(this));
    },

    /**
     * Handle drop from media library
     * @param {DragEvent} e
     */
    async handleDrop(e) {
        e.preventDefault();

        const mediaId = e.dataTransfer.getData('application/clipforge-media');
        if (!mediaId) return;

        const media = await ClipForgeDB.getMedia(mediaId);
        if (!media) return;

        // Find target track
        const trackEl = e.target.closest('.timeline-track');
        const trackId = trackEl?.dataset.track || this.getDefaultTrack(media.type);
        const track = this.project.tracks.find(t => t.id === trackId);
        if (!track) return;

        // Calculate drop position
        const rect = this.elements.scroll.getBoundingClientRect();
        const x = e.clientX - rect.left + this.elements.scroll.scrollLeft - 120;
        const startTime = Math.max(0, x / this.pixelsPerSecond);

        // Create clip
        const clip = {
            id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            mediaId: media.id,
            name: media.name,
            type: media.type,
            startTime: startTime,
            duration: media.duration || 5,
            trimStart: 0,
            trimEnd: 0,
            volume: 1,
            opacity: 1,
            filter: 'none',
            thumbnail: media.thumbnail
        };

        track.clips.push(clip);
        this.saveHistory('Přidání klipu');
        this.render();
        this.selectClip(clip);

        // Notify preview
        if (window.Preview) {
            Preview.updateClips(this.project.tracks);
        }
    },

    /**
     * Get default track for media type
     * @param {string} type
     * @returns {string}
     */
    getDefaultTrack(type) {
        switch (type) {
            case 'video':
            case 'image':
                return 'video-1';
            case 'audio':
                return 'audio-1';
            default:
                return 'video-1';
        }
    },

    /**
     * Select a clip
     * @param {Object} clip
     */
    selectClip(clip) {
        this.selectedClip = clip;
        this.render();

        // Update properties panel
        if (window.ClipForgeApp) {
            ClipForgeApp.showClipProperties(clip);
        }
    },

    /**
     * Deselect current clip
     */
    deselectClip() {
        this.selectedClip = null;
        this.render();
    },

    /**
     * Split clip at playhead
     */
    splitClip() {
        if (!this.selectedClip) {
            ClipForgeApp?.showToast('Vyber klip k rozdělení', 'info');
            return;
        }

        const clip = this.selectedClip;
        const track = this.project.tracks.find(t => t.clips.includes(clip));
        if (!track) return;

        // Check if playhead is within clip
        const clipEnd = clip.startTime + clip.duration;
        if (this.playhead <= clip.startTime || this.playhead >= clipEnd) {
            ClipForgeApp?.showToast('Playhead musí být uvnitř klipu', 'info');
            return;
        }

        // Calculate split point
        const splitTime = this.playhead - clip.startTime;

        // Create new clip (right part)
        const newClip = {
            ...clip,
            id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            startTime: this.playhead,
            duration: clip.duration - splitTime,
            trimStart: (clip.trimStart || 0) + splitTime
        };

        // Modify original clip (left part)
        clip.duration = splitTime;

        // Add new clip to track
        track.clips.push(newClip);
        track.clips.sort((a, b) => a.startTime - b.startTime);

        this.saveHistory('Rozdělení klipu');
        this.render();

        ClipForgeApp?.showToast('Klip byl rozdělen', 'success');
    },

    /**
     * Delete selected clip
     */
    deleteSelectedClip() {
        if (!this.selectedClip) {
            ClipForgeApp?.showToast('Vyber klip ke smazání', 'info');
            return;
        }

        const clip = this.selectedClip;

        // Find and remove from track
        for (const track of this.project.tracks) {
            const index = track.clips.findIndex(c => c.id === clip.id);
            if (index !== -1) {
                track.clips.splice(index, 1);
                break;
            }
        }

        this.selectedClip = null;
        this.saveHistory('Smazání klipu');
        this.render();

        // Notify preview
        if (window.Preview) {
            Preview.updateClips(this.project.tracks);
        }

        ClipForgeApp?.showToast('Klip byl smazán', 'success');
    },

    /**
     * Add a new track
     */
    addTrack() {
        const trackTypes = ['video', 'audio', 'text'];
        const counts = {};

        // Count existing tracks
        this.project.tracks.forEach(t => {
            counts[t.type] = (counts[t.type] || 0) + 1;
        });

        // Create new video track by default
        const type = 'video';
        const num = (counts[type] || 0) + 1;

        const newTrack = {
            id: `${type}-${num}`,
            type: type,
            name: `${type === 'video' ? 'Video' : type === 'audio' ? 'Audio' : 'Text'} ${num}`,
            clips: [],
            muted: false,
            locked: false
        };

        this.project.tracks.push(newTrack);
        this.saveHistory('Přidání stopy');

        // Re-render tracks in DOM
        this.renderTrackHeaders();
        this.render();

        ClipForgeApp?.showToast('Stopa byla přidána', 'success');
    },

    /**
     * Render track headers (when adding new tracks)
     */
    renderTrackHeaders() {
        // This would dynamically create track elements
        // For now, we use static HTML tracks
    },

    /**
     * Set playhead position
     * @param {number} time - Time in seconds
     */
    setPlayhead(time) {
        this.playhead = Math.max(0, time);

        // Update playhead visual
        if (this.elements.playhead) {
            const left = this.playhead * this.pixelsPerSecond;
            this.elements.playhead.style.left = `${120 + left}px`;
        }

        // Update time display
        const currentTimeEl = document.getElementById('current-time');
        if (currentTimeEl) {
            currentTimeEl.textContent = this.formatTime(this.playhead);
        }

        // Notify preview
        if (window.Preview) {
            Preview.seek(this.playhead);
        }
    },

    /**
     * Toggle playback
     */
    togglePlayback() {
        this.isPlaying = !this.isPlaying;

        const playIcon = document.getElementById('play-icon');
        if (playIcon) {
            playIcon.textContent = this.isPlaying ? '⏸️' : '▶️';
        }

        if (this.isPlaying) {
            this.startPlayback();
        } else {
            this.stopPlayback();
        }
    },

    /**
     * Start playback
     */
    startPlayback() {
        if (window.Preview) {
            Preview.play();
        }

        const fps = 30;
        const frameTime = 1000 / fps;

        this.playbackInterval = setInterval(() => {
            if (this.playhead >= this.project.duration) {
                this.stopPlayback();
                this.setPlayhead(0);
                return;
            }

            this.setPlayhead(this.playhead + (1 / fps));
        }, frameTime);
    },

    /**
     * Stop playback
     */
    stopPlayback() {
        this.isPlaying = false;

        const playIcon = document.getElementById('play-icon');
        if (playIcon) {
            playIcon.textContent = '▶️';
        }

        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }

        if (window.Preview) {
            Preview.pause();
        }
    },

    /**
     * Set zoom level
     * @param {number} zoom - Zoom percentage (10-200)
     */
    setZoom(zoom) {
        this.zoom = zoom;
        this.pixelsPerSecond = zoom;

        if (this.elements.zoomSlider) {
            this.elements.zoomSlider.value = zoom;
        }

        this.updateRuler();
        this.render();

        // Update playhead position
        this.setPlayhead(this.playhead);
    },

    /**
     * Update timeline ruler
     */
    updateRuler() {
        if (!this.elements.ruler) return;

        const duration = Math.max(60, this.project?.duration || 60);
        const width = duration * this.pixelsPerSecond;

        this.elements.ruler.innerHTML = '';
        this.elements.ruler.style.width = `${120 + width}px`;

        // Calculate interval based on zoom
        let interval = 1;
        if (this.pixelsPerSecond < 30) interval = 10;
        else if (this.pixelsPerSecond < 60) interval = 5;
        else if (this.pixelsPerSecond < 100) interval = 2;

        for (let t = 0; t <= duration; t += interval) {
            const mark = document.createElement('div');
            mark.className = `ruler-mark${t % (interval * 5) === 0 ? ' major' : ''}`;
            mark.style.left = `${120 + t * this.pixelsPerSecond}px`;
            mark.textContent = this.formatTime(t, true);
            this.elements.ruler.appendChild(mark);
        }
    },

    /**
     * Update project duration based on clips
     */
    updateDuration() {
        let maxEnd = 0;

        this.project.tracks.forEach(track => {
            track.clips.forEach(clip => {
                const clipEnd = clip.startTime + clip.duration;
                if (clipEnd > maxEnd) {
                    maxEnd = clipEnd;
                }
            });
        });

        this.project.duration = maxEnd || 0;

        // Update total time display
        const totalTimeEl = document.getElementById('total-time');
        if (totalTimeEl) {
            totalTimeEl.textContent = this.formatTime(this.project.duration);
        }
    },

    /**
     * Format time as HH:MM:SS or MM:SS
     * @param {number} seconds
     * @param {boolean} short - Use short format (MM:SS only)
     * @returns {string}
     */
    formatTime(seconds, short = false) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (short && hrs === 0) {
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * Save current state to history
     * @param {string} action - Description of action
     */
    saveHistory(action) {
        // Remove any future states if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Deep clone project state
        const state = JSON.parse(JSON.stringify(this.project));

        this.history.push({
            state,
            action,
            timestamp: Date.now()
        });

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        this.historyIndex = this.history.length - 1;

        // Auto-save to database
        this.autoSave();
    },

    /**
     * Undo last action
     */
    undo() {
        if (this.historyIndex <= 0) {
            ClipForgeApp?.showToast('Nic k vrácení', 'info');
            return;
        }

        this.historyIndex--;
        const entry = this.history[this.historyIndex];

        this.project = JSON.parse(JSON.stringify(entry.state));
        this.render();

        ClipForgeApp?.showToast(`Vráceno: ${entry.action}`, 'info');
    },

    /**
     * Redo last undone action
     */
    redo() {
        if (this.historyIndex >= this.history.length - 1) {
            ClipForgeApp?.showToast('Nic k obnovení', 'info');
            return;
        }

        this.historyIndex++;
        const entry = this.history[this.historyIndex];

        this.project = JSON.parse(JSON.stringify(entry.state));
        this.render();

        ClipForgeApp?.showToast(`Obnoveno: ${entry.action}`, 'info');
    },

    /**
     * Auto-save project to database
     */
    async autoSave() {
        if (!this.project) return;

        try {
            await ClipForgeDB.updateProject(this.project);
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    },

    /**
     * Get clips at specific time
     * @param {number} time
     * @returns {Array}
     */
    getClipsAtTime(time) {
        const clips = [];

        this.project.tracks.forEach(track => {
            if (track.muted) return;

            track.clips.forEach(clip => {
                if (time >= clip.startTime && time < clip.startTime + clip.duration) {
                    clips.push({ clip, track });
                }
            });
        });

        return clips;
    },

    /**
     * Open clip properties panel
     * @param {Object} clip
     */
    openClipProperties(clip) {
        if (window.ClipForgeApp) {
            ClipForgeApp.showClipProperties(clip);
        }
    }
};

// Export for use in other modules
window.Timeline = Timeline;
