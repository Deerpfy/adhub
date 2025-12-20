/**
 * ClipForge - Main Application
 *
 * Offline-first video editor PWA
 * Handles application initialization, state management, and UI coordination
 */

const ClipForge = {
    // Application version
    version: '1.0.0',

    // Current project
    currentProject: null,

    // UI state
    ui: {
        sidebarTab: 'media',
        isDragging: false,
        isFullscreen: false
    },

    // Translations
    translations: {
        cs: {
            appName: 'ClipForge',
            newProject: 'Nový projekt',
            openProject: 'Otevřít projekt',
            saveProject: 'Uložit projekt',
            export: 'Export',
            undo: 'Zpět',
            redo: 'Vpřed',
            media: 'Média',
            text: 'Text',
            audio: 'Audio',
            filters: 'Filtry',
            templates: 'Šablony',
            properties: 'Vlastnosti',
            noClipSelected: 'Žádný klip nevybrán',
            selectClipToEdit: 'Vyberte klip na časové ose pro úpravu jeho vlastností',
            opacity: 'Průhlednost',
            speed: 'Rychlost',
            volume: 'Hlasitost',
            trimStart: 'Začátek',
            trimEnd: 'Konec',
            brightness: 'Jas',
            contrast: 'Kontrast',
            saturation: 'Sytost',
            addMedia: 'Přidat média',
            dropFiles: 'Přetáhněte soubory sem',
            orClick: 'nebo klikněte pro výběr',
            supportedFormats: 'MP4, WebM, MOV, JPG, PNG, GIF, MP3, WAV',
            addText: 'Přidat text',
            title: 'Nadpis',
            subtitle: 'Podtitul',
            lowerThird: 'Lower Third',
            caption: 'Titulek',
            addToTimeline: 'Přidat na časovou osu',
            videoTrack: 'Video stopa',
            audioTrack: 'Audio stopa',
            textTrack: 'Textová stopa',
            mute: 'Ztlumit',
            lock: 'Zamknout',
            delete: 'Smazat',
            split: 'Rozdělit',
            duplicate: 'Duplikovat',
            projectName: 'Název projektu',
            resolution: 'Rozlišení',
            fps: 'FPS',
            create: 'Vytvořit',
            cancel: 'Zrušit',
            exportVideo: 'Export videa',
            format: 'Formát',
            quality: 'Kvalita',
            low: 'Nízká',
            medium: 'Střední',
            high: 'Vysoká',
            ultra: 'Ultra',
            estimatedSize: 'Odhadovaná velikost',
            duration: 'Délka',
            startExport: 'Spustit export',
            exporting: 'Exportuji...',
            exportComplete: 'Export dokončen!',
            offline: 'Offline',
            online: 'Online',
            projectSaved: 'Projekt uložen',
            projectLoaded: 'Projekt načten',
            mediaAdded: 'Médium přidáno',
            errorLoadingMedia: 'Chyba při načítání média',
            confirmDelete: 'Opravdu chcete smazat tento klip?',
            unsavedChanges: 'Máte neuložené změny. Opravdu chcete odejít?'
        },
        en: {
            appName: 'ClipForge',
            newProject: 'New Project',
            openProject: 'Open Project',
            saveProject: 'Save Project',
            export: 'Export',
            undo: 'Undo',
            redo: 'Redo',
            media: 'Media',
            text: 'Text',
            audio: 'Audio',
            filters: 'Filters',
            templates: 'Templates',
            properties: 'Properties',
            noClipSelected: 'No clip selected',
            selectClipToEdit: 'Select a clip on the timeline to edit its properties',
            opacity: 'Opacity',
            speed: 'Speed',
            volume: 'Volume',
            trimStart: 'Start',
            trimEnd: 'End',
            brightness: 'Brightness',
            contrast: 'Contrast',
            saturation: 'Saturation',
            addMedia: 'Add Media',
            dropFiles: 'Drop files here',
            orClick: 'or click to select',
            supportedFormats: 'MP4, WebM, MOV, JPG, PNG, GIF, MP3, WAV',
            addText: 'Add Text',
            title: 'Title',
            subtitle: 'Subtitle',
            lowerThird: 'Lower Third',
            caption: 'Caption',
            addToTimeline: 'Add to Timeline',
            videoTrack: 'Video Track',
            audioTrack: 'Audio Track',
            textTrack: 'Text Track',
            mute: 'Mute',
            lock: 'Lock',
            delete: 'Delete',
            split: 'Split',
            duplicate: 'Duplicate',
            projectName: 'Project Name',
            resolution: 'Resolution',
            fps: 'FPS',
            create: 'Create',
            cancel: 'Cancel',
            exportVideo: 'Export Video',
            format: 'Format',
            quality: 'Quality',
            low: 'Low',
            medium: 'Medium',
            high: 'High',
            ultra: 'Ultra',
            estimatedSize: 'Estimated Size',
            duration: 'Duration',
            startExport: 'Start Export',
            exporting: 'Exporting...',
            exportComplete: 'Export complete!',
            offline: 'Offline',
            online: 'Online',
            projectSaved: 'Project saved',
            projectLoaded: 'Project loaded',
            mediaAdded: 'Media added',
            errorLoadingMedia: 'Error loading media',
            confirmDelete: 'Are you sure you want to delete this clip?',
            unsavedChanges: 'You have unsaved changes. Are you sure you want to leave?'
        }
    },

    // Current language
    language: 'cs',

    /**
     * Initialize application
     */
    async init() {
        console.log(`ClipForge v${this.version} initializing...`);

        // Detect language
        this.detectLanguage();

        // Initialize database
        await ClipForgeDB.init();

        // Initialize modules
        Preview.init();
        Export.init();

        // Setup UI
        this.setupUI();
        this.bindEvents();
        this.bindKeyboardShortcuts();

        // Register service worker
        this.registerServiceWorker();

        // Check for last project
        await this.loadLastProject();

        // Setup online/offline detection
        this.setupNetworkStatus();

        console.log('ClipForge initialized');
    },

    /**
     * Detect user language
     */
    detectLanguage() {
        const browserLang = navigator.language.split('-')[0];
        this.language = this.translations[browserLang] ? browserLang : 'en';
    },

    /**
     * Get translation
     * @param {string} key
     * @returns {string}
     */
    t(key) {
        return this.translations[this.language]?.[key] ||
               this.translations.en[key] ||
               key;
    },

    /**
     * Setup UI elements
     */
    setupUI() {
        // Initialize sidebar tabs
        this.switchSidebarTab('media');

        // Setup tooltips
        this.setupTooltips();

        // Setup modals
        this.setupModals();

        // Update UI text
        this.updateUIText();
    },

    /**
     * Update UI text based on current language
     */
    updateUIText() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            el.textContent = this.t(key);
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            el.placeholder = this.t(key);
        });

        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.dataset.i18nTitle;
            el.title = this.t(key);
        });
    },

    /**
     * Bind UI events
     */
    bindEvents() {
        // Header buttons
        document.getElementById('new-project-btn')?.addEventListener('click', () => this.showNewProjectModal());
        document.getElementById('open-project-btn')?.addEventListener('click', () => this.showProjectsModal());
        document.getElementById('save-project-btn')?.addEventListener('click', () => this.saveProject());
        document.getElementById('undo-btn')?.addEventListener('click', () => Timeline.undo());
        document.getElementById('redo-btn')?.addEventListener('click', () => Timeline.redo());

        // Sidebar tabs
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchSidebarTab(e.currentTarget.dataset.tab);
            });
        });

        // Media drop zone
        this.setupMediaDropZone();

        // Text templates
        this.setupTextTemplates();

        // Filter buttons
        this.setupFilters();

        // Timeline controls
        document.getElementById('play-btn')?.addEventListener('click', () => this.togglePlayback());
        document.getElementById('stop-btn')?.addEventListener('click', () => this.stop());
        document.getElementById('zoom-slider')?.addEventListener('input', (e) => {
            Timeline.setZoom(parseInt(e.target.value));
        });

        // Track buttons
        document.getElementById('add-video-track')?.addEventListener('click', () => Timeline.addTrack('video'));
        document.getElementById('add-audio-track')?.addEventListener('click', () => Timeline.addTrack('audio'));
        document.getElementById('add-text-track')?.addEventListener('click', () => Timeline.addTrack('text'));

        // Playback controls
        this.setupPlaybackControls();

        // Window events
        window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));
    },

    /**
     * Bind keyboard shortcuts
     */
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input
            if (e.target.matches('input, textarea')) return;

            const key = e.key.toLowerCase();
            const ctrl = e.ctrlKey || e.metaKey;

            // Playback
            if (key === ' ') {
                e.preventDefault();
                this.togglePlayback();
            }

            // Undo/Redo
            if (ctrl && key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    Timeline.redo();
                } else {
                    Timeline.undo();
                }
            }

            if (ctrl && key === 'y') {
                e.preventDefault();
                Timeline.redo();
            }

            // Save
            if (ctrl && key === 's') {
                e.preventDefault();
                this.saveProject();
            }

            // Delete
            if (key === 'delete' || key === 'backspace') {
                if (Timeline.selectedClip) {
                    e.preventDefault();
                    Timeline.deleteSelectedClip();
                }
            }

            // Split
            if (key === 's' && !ctrl) {
                if (Timeline.selectedClip) {
                    Timeline.splitClip();
                }
            }

            // Duplicate
            if (ctrl && key === 'd') {
                e.preventDefault();
                if (Timeline.selectedClip) {
                    Timeline.duplicateClip();
                }
            }

            // Fullscreen preview
            if (key === 'f') {
                this.toggleFullscreen();
            }

            // Navigation
            if (key === 'arrowleft') {
                Timeline.seek(Timeline.playhead - 0.1);
            }
            if (key === 'arrowright') {
                Timeline.seek(Timeline.playhead + 0.1);
            }
            if (key === 'home') {
                Timeline.seek(0);
            }
            if (key === 'end' && this.currentProject) {
                Timeline.seek(this.currentProject.duration || 0);
            }
        });
    },

    /**
     * Setup media drop zone
     */
    setupMediaDropZone() {
        const dropZone = document.getElementById('media-drop-zone');
        const fileInput = document.getElementById('media-file-input');

        if (!dropZone) return;

        // Click to select
        dropZone.addEventListener('click', () => fileInput?.click());

        // Drag events
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');

            const files = Array.from(e.dataTransfer.files);
            await this.handleMediaFiles(files);
        });

        // File input change
        fileInput?.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            await this.handleMediaFiles(files);
            e.target.value = ''; // Reset for same file selection
        });
    },

    /**
     * Handle media file uploads
     * @param {File[]} files
     */
    async handleMediaFiles(files) {
        if (!this.currentProject) {
            this.showToast('Nejprve vytvořte projekt', 'warning');
            return;
        }

        for (const file of files) {
            try {
                const media = await ClipForgeDB.storeMedia(file, this.currentProject.id);
                this.addMediaToLibrary(media);
                this.showToast(this.t('mediaAdded'), 'success');
            } catch (error) {
                console.error('Failed to add media:', error);
                this.showToast(this.t('errorLoadingMedia'), 'error');
            }
        }
    },

    /**
     * Add media item to library UI
     * @param {Object} media
     */
    addMediaToLibrary(media) {
        const library = document.getElementById('media-library');
        if (!library) return;

        const item = document.createElement('div');
        item.className = 'media-item';
        item.dataset.mediaId = media.id;
        item.draggable = true;

        // Create thumbnail
        const thumb = document.createElement('div');
        thumb.className = 'media-thumb';

        if (media.type === 'video' || media.type === 'image') {
            if (media.thumbnail) {
                thumb.style.backgroundImage = `url(${media.thumbnail})`;
            } else {
                thumb.innerHTML = media.type === 'video' ? '🎬' : '🖼️';
            }
        } else if (media.type === 'audio') {
            thumb.innerHTML = '🎵';
        }

        // Duration badge
        if (media.duration) {
            const badge = document.createElement('span');
            badge.className = 'media-duration';
            badge.textContent = this.formatTime(media.duration);
            thumb.appendChild(badge);
        }

        // Name
        const name = document.createElement('div');
        name.className = 'media-name';
        name.textContent = media.name;
        name.title = media.name;

        item.appendChild(thumb);
        item.appendChild(name);

        // Drag to timeline
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'media',
                mediaId: media.id
            }));
        });

        // Double-click to add to timeline
        item.addEventListener('dblclick', () => {
            Timeline.addClipFromMedia(media);
        });

        library.appendChild(item);
    },

    /**
     * Setup text templates
     */
    setupTextTemplates() {
        const container = document.getElementById('text-templates');
        if (!container) return;

        const templates = [
            { name: 'Nadpis', style: { size: 72, weight: 700, position: 'center' } },
            { name: 'Podtitul', style: { size: 48, weight: 400, position: 'center' } },
            { name: 'Lower Third', style: { size: 36, weight: 600, position: 'lower-third' } },
            { name: 'Titulek', style: { size: 28, weight: 400, position: 'bottom' } }
        ];

        templates.forEach(template => {
            const btn = document.createElement('button');
            btn.className = 'text-template-btn';
            btn.textContent = template.name;
            btn.addEventListener('click', () => {
                Timeline.addTextClip(template.name, template.style);
            });
            container.appendChild(btn);
        });
    },

    /**
     * Setup filter buttons
     */
    setupFilters() {
        const container = document.getElementById('filter-presets');
        if (!container) return;

        Object.keys(Preview.filters).forEach(filterName => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.filter = filterName;
            btn.textContent = filterName.charAt(0).toUpperCase() + filterName.slice(1);

            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                Preview.applyFilter(filterName);
            });

            container.appendChild(btn);
        });
    },

    /**
     * Setup playback controls
     */
    setupPlaybackControls() {
        // Time display click to edit
        const timeDisplay = document.getElementById('time-display');
        timeDisplay?.addEventListener('click', () => {
            // Could implement time input
        });
    },

    /**
     * Switch sidebar tab
     * @param {string} tabName
     */
    switchSidebarTab(tabName) {
        this.ui.sidebarTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update content panels
        document.querySelectorAll('.sidebar-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-panel`);
        });
    },

    /**
     * Toggle playback
     */
    togglePlayback() {
        if (Preview.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    },

    /**
     * Start playback
     */
    play() {
        Preview.play();
        Timeline.startPlayback();

        const playBtn = document.getElementById('play-btn');
        if (playBtn) {
            playBtn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        }
    },

    /**
     * Pause playback
     */
    pause() {
        Preview.pause();
        Timeline.stopPlayback();

        const playBtn = document.getElementById('play-btn');
        if (playBtn) {
            playBtn.innerHTML = '<svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>';
        }
    },

    /**
     * Stop playback and reset
     */
    stop() {
        this.pause();
        Timeline.seek(0);
    },

    /**
     * Toggle fullscreen preview
     */
    toggleFullscreen() {
        const preview = document.getElementById('preview-container');
        if (!preview) return;

        if (document.fullscreenElement) {
            document.exitFullscreen();
            this.ui.isFullscreen = false;
        } else {
            preview.requestFullscreen();
            this.ui.isFullscreen = true;
        }
    },

    /**
     * Setup tooltips
     */
    setupTooltips() {
        document.querySelectorAll('[data-tooltip]').forEach(el => {
            el.addEventListener('mouseenter', (e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = e.target.dataset.tooltip;
                document.body.appendChild(tooltip);

                const rect = e.target.getBoundingClientRect();
                tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
                tooltip.style.top = `${rect.bottom + 8}px`;

                e.target._tooltip = tooltip;
            });

            el.addEventListener('mouseleave', (e) => {
                if (e.target._tooltip) {
                    e.target._tooltip.remove();
                    delete e.target._tooltip;
                }
            });
        });
    },

    /**
     * Setup modals
     */
    setupModals() {
        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal')?.classList.remove('active');
            });
        });

        // New project form
        document.getElementById('new-project-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createNewProject();
        });
    },

    /**
     * Show new project modal
     */
    showNewProjectModal() {
        const modal = document.getElementById('new-project-modal');
        modal?.classList.add('active');

        // Focus name input
        document.getElementById('project-name')?.focus();
    },

    /**
     * Show projects modal
     */
    async showProjectsModal() {
        const modal = document.getElementById('projects-modal');
        const list = document.getElementById('projects-list');

        if (!modal || !list) return;

        // Load projects
        const projects = await ClipForgeDB.getAllProjects();

        list.innerHTML = '';

        if (projects.length === 0) {
            list.innerHTML = '<p class="no-projects">Žádné projekty</p>';
        } else {
            projects.forEach(project => {
                const item = document.createElement('div');
                item.className = 'project-item';
                item.innerHTML = `
                    <div class="project-info">
                        <h4>${project.name}</h4>
                        <span>${new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div class="project-actions">
                        <button class="btn-open" data-id="${project.id}">Otevřít</button>
                        <button class="btn-delete" data-id="${project.id}">Smazat</button>
                    </div>
                `;

                item.querySelector('.btn-open').addEventListener('click', () => {
                    this.loadProject(project.id);
                    modal.classList.remove('active');
                });

                item.querySelector('.btn-delete').addEventListener('click', async () => {
                    if (confirm('Opravdu chcete smazat tento projekt?')) {
                        await ClipForgeDB.deleteProject(project.id);
                        item.remove();
                    }
                });

                list.appendChild(item);
            });
        }

        modal.classList.add('active');
    },

    /**
     * Create new project
     */
    async createNewProject() {
        const nameInput = document.getElementById('project-name');
        const resolutionSelect = document.getElementById('project-resolution');
        const fpsSelect = document.getElementById('project-fps');

        const name = nameInput?.value || 'Nový projekt';
        const resolution = resolutionSelect?.value || '1080p';
        const fps = parseInt(fpsSelect?.value) || 30;

        const resolutions = {
            '480p': { width: 854, height: 480 },
            '720p': { width: 1280, height: 720 },
            '1080p': { width: 1920, height: 1080 },
            '1440p': { width: 2560, height: 1440 },
            '4k': { width: 3840, height: 2160 }
        };

        const res = resolutions[resolution];

        const projectData = {
            name,
            width: res.width,
            height: res.height,
            fps,
            tracks: [
                { id: 'video-1', name: 'Video 1', type: 'video', clips: [], muted: false, locked: false },
                { id: 'audio-1', name: 'Audio 1', type: 'audio', clips: [], muted: false, locked: false }
            ],
            duration: 0
        };

        try {
            const project = await ClipForgeDB.createProject(projectData);
            this.currentProject = project;

            Timeline.init(project);
            Preview.setDimensions(project.width, project.height);

            // Hide modal
            document.getElementById('new-project-modal')?.classList.remove('active');

            this.showToast('Projekt vytvořen', 'success');
        } catch (error) {
            console.error('Failed to create project:', error);
            this.showToast('Chyba při vytváření projektu', 'error');
        }
    },

    /**
     * Save current project
     */
    async saveProject() {
        if (!this.currentProject) return;

        try {
            // Get current state from timeline
            this.currentProject.tracks = Timeline.project.tracks;
            this.currentProject.duration = Timeline.calculateDuration();

            await ClipForgeDB.updateProject(this.currentProject);
            await ClipForgeDB.saveSetting('lastProjectId', this.currentProject.id);

            this.showToast(this.t('projectSaved'), 'success');
        } catch (error) {
            console.error('Failed to save project:', error);
            this.showToast('Chyba při ukládání', 'error');
        }
    },

    /**
     * Load project by ID
     * @param {string} projectId
     */
    async loadProject(projectId) {
        try {
            const project = await ClipForgeDB.getProject(projectId);
            if (!project) {
                throw new Error('Project not found');
            }

            this.currentProject = project;

            Timeline.init(project);
            Preview.setDimensions(project.width, project.height);

            // Load media library
            await this.loadMediaLibrary(projectId);

            await ClipForgeDB.saveSetting('lastProjectId', projectId);

            this.showToast(this.t('projectLoaded'), 'success');
        } catch (error) {
            console.error('Failed to load project:', error);
            this.showToast('Chyba při načítání projektu', 'error');
        }
    },

    /**
     * Load last opened project
     */
    async loadLastProject() {
        try {
            const lastProjectId = await ClipForgeDB.getSetting('lastProjectId');
            if (lastProjectId) {
                await this.loadProject(lastProjectId);
            }
        } catch (error) {
            console.log('No last project to load');
        }
    },

    /**
     * Load media library for project
     * @param {string} projectId
     */
    async loadMediaLibrary(projectId) {
        const library = document.getElementById('media-library');
        if (!library) return;

        library.innerHTML = '';

        const mediaItems = await ClipForgeDB.getMediaByProject(projectId);
        mediaItems.forEach(media => this.addMediaToLibrary(media));
    },

    /**
     * Register service worker
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registered:', registration.scope);
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }
    },

    /**
     * Setup network status detection
     */
    setupNetworkStatus() {
        const updateStatus = () => {
            const indicator = document.getElementById('network-status');
            if (indicator) {
                indicator.textContent = navigator.onLine ? this.t('online') : this.t('offline');
                indicator.className = navigator.onLine ? 'online' : 'offline';
            }
        };

        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        updateStatus();
    },

    /**
     * Handle before unload
     * @param {BeforeUnloadEvent} e
     */
    handleBeforeUnload(e) {
        if (Timeline.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = this.t('unsavedChanges');
            return e.returnValue;
        }
    },

    /**
     * Show toast notification
     * @param {string} message
     * @param {string} type - 'success', 'error', 'warning', 'info'
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container') || this.createToastContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => toast.classList.add('show'));

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * Create toast container
     * @returns {HTMLElement}
     */
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
        return container;
    },

    /**
     * Format time as MM:SS
     * @param {number} seconds
     * @returns {string}
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => ClipForge.init());

// Export for use in other modules
window.ClipForge = ClipForge;
