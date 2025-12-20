/**
 * SampleHub - Main Application Script
 * Offline-first Sample Pack Manager
 * Version: 1.0
 *
 * Based on analysis: sample-pack-manager-analysis.md
 * Implements key features:
 * - Local library management
 * - Audio preview with waveform
 * - Sample organization by packs
 * - Favorites system
 * - Import/export functionality
 */

(function() {
    'use strict';

    // =============================================
    // APPLICATION STATE
    // =============================================

    const state = {
        currentView: 'library',
        samples: [],
        packs: [],
        currentSample: null,
        currentPlaylist: [],
        playlistIndex: 0,
        isGridView: true,
        filters: {
            genre: '',
            type: '',
            bpmMin: null,
            bpmMax: null,
            key: '',
            search: ''
        },
        sortBy: 'addedAt',
        sortOrder: 'desc',
        settings: {
            autoPlayNext: true,
            fadeOnStop: false,
            waveformColor: '#7C3AED',
            progressColor: '#A78BFA'
        }
    };

    // =============================================
    // DOM ELEMENTS
    // =============================================

    const elements = {
        // Navigation
        sidebar: document.getElementById('sidebar'),
        menuToggle: document.getElementById('menuToggle'),
        navItems: document.querySelectorAll('.nav-item'),
        libraryCount: document.getElementById('libraryCount'),
        packsCount: document.getElementById('packsCount'),
        favoritesCount: document.getElementById('favoritesCount'),

        // Views
        views: document.querySelectorAll('.view'),
        libraryView: document.getElementById('libraryView'),
        browseView: document.getElementById('browseView'),
        packsView: document.getElementById('packsView'),
        favoritesView: document.getElementById('favoritesView'),

        // Content
        samplesGrid: document.getElementById('samplesGrid'),
        emptyState: document.getElementById('emptyState'),
        sampleCountDisplay: document.getElementById('sampleCountDisplay'),
        packsGrid: document.getElementById('packsGrid'),
        favoritesGrid: document.getElementById('favoritesGrid'),
        browseResults: document.getElementById('browseResults'),

        // Search & Filters
        searchInput: document.getElementById('searchInput'),
        genreFilter: document.getElementById('genreFilter'),
        typeFilter: document.getElementById('typeFilter'),
        bpmMin: document.getElementById('bpmMin'),
        bpmMax: document.getElementById('bpmMax'),
        keyFilter: document.getElementById('keyFilter'),
        sortBtn: document.getElementById('sortBtn'),
        viewToggle: document.getElementById('viewToggle'),
        viewIcon: document.getElementById('viewIcon'),

        // Player
        playerBar: document.getElementById('playerBar'),
        playerTitle: document.getElementById('playerTitle'),
        playerMeta: document.getElementById('playerMeta'),
        playPauseBtn: document.getElementById('playPauseBtn'),
        playPauseIcon: document.getElementById('playPauseIcon'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        loopBtn: document.getElementById('loopBtn'),
        waveform: document.getElementById('waveform'),
        currentTime: document.getElementById('currentTime'),
        totalTime: document.getElementById('totalTime'),
        volumeBtn: document.getElementById('volumeBtn'),
        volumeIcon: document.getElementById('volumeIcon'),
        volumeSlider: document.getElementById('volumeSlider'),

        // Modals
        importModal: document.getElementById('importModal'),
        settingsModal: document.getElementById('settingsModal'),
        packDetailModal: document.getElementById('packDetailModal'),
        closeImportModal: document.getElementById('closeImportModal'),
        closeSettingsModal: document.getElementById('closeSettingsModal'),
        closePackDetailModal: document.getElementById('closePackDetailModal'),

        // Import
        importBtn: document.getElementById('importBtn'),
        emptyImportBtn: document.getElementById('emptyImportBtn'),
        importDropzone: document.getElementById('importDropzone'),
        fileInput: document.getElementById('fileInput'),
        selectFilesBtn: document.getElementById('selectFilesBtn'),
        autoDetectBpm: document.getElementById('autoDetectBpm'),
        autoDetectKey: document.getElementById('autoDetectKey'),
        createPack: document.getElementById('createPack'),
        packNameInput: document.getElementById('packNameInput'),
        newPackName: document.getElementById('newPackName'),
        importProgress: document.getElementById('importProgress'),
        progressFill: document.getElementById('progressFill'),
        progressText: document.getElementById('progressText'),

        // Settings
        settingsBtn: document.getElementById('settingsBtn'),
        autoPlayNextSetting: document.getElementById('autoPlayNext'),
        fadeOnStopSetting: document.getElementById('fadeOnStop'),
        waveformColorSetting: document.getElementById('waveformColor'),
        progressColorSetting: document.getElementById('progressColor'),
        exportDataBtn: document.getElementById('exportDataBtn'),
        clearDataBtn: document.getElementById('clearDataBtn'),

        // Packs
        addPackBtn: document.getElementById('addPackBtn'),
        packDetailTitle: document.getElementById('packDetailTitle'),
        packDetailInfo: document.getElementById('packDetailInfo'),
        packDetailSamples: document.getElementById('packDetailSamples'),

        // Context Menu
        contextMenu: document.getElementById('contextMenu'),

        // Toast Container
        toastContainer: document.getElementById('toastContainer'),

        // Offline Indicator
        offlineIndicator: document.getElementById('offlineIndicator'),

        // Categories
        categoryCards: document.querySelectorAll('.category-card')
    };

    // =============================================
    // INITIALIZATION
    // =============================================

    async function init() {
        console.log('Initializing SampleHub...');

        try {
            // Initialize database
            await SampleHubDB.init();

            // Load settings
            await loadSettings();

            // Initialize audio engine
            AudioEngine.init({
                waveformColor: state.settings.waveformColor,
                progressColor: state.settings.progressColor,
                volume: state.settings.volume || 0.8,
                fadeOnStop: state.settings.fadeOnStop
            });

            // Setup waveform
            AudioEngine.setupWaveform(elements.waveform);

            // Set audio callbacks
            AudioEngine.setCallbacks({
                onPlay: handleAudioPlay,
                onPause: handleAudioPause,
                onStop: handleAudioStop,
                onEnded: handleAudioEnded,
                onTimeUpdate: handleTimeUpdate,
                onError: handleAudioError
            });

            // Load data
            await loadData();

            // Setup event listeners
            setupEventListeners();

            // Check online status
            updateOnlineStatus();

            // Update UI
            updateCounts();
            renderCurrentView();

            console.log('SampleHub initialized successfully');
        } catch (error) {
            console.error('Failed to initialize SampleHub:', error);
            showToast('Chyba při inicializaci aplikace', 'error');
        }
    }

    // =============================================
    // DATA LOADING
    // =============================================

    async function loadData() {
        state.samples = await SampleHubDB.getAllSamples();
        state.packs = await SampleHubDB.getAllPacks();
    }

    async function loadSettings() {
        const settings = await SampleHubDB.getAllSettings();
        Object.assign(state.settings, settings);

        // Apply settings to UI
        if (elements.autoPlayNextSetting) {
            elements.autoPlayNextSetting.checked = state.settings.autoPlayNext !== false;
        }
        if (elements.fadeOnStopSetting) {
            elements.fadeOnStopSetting.checked = state.settings.fadeOnStop === true;
        }
        if (elements.waveformColorSetting) {
            elements.waveformColorSetting.value = state.settings.waveformColor || '#7C3AED';
        }
        if (elements.progressColorSetting) {
            elements.progressColorSetting.value = state.settings.progressColor || '#A78BFA';
        }
        if (elements.volumeSlider) {
            elements.volumeSlider.value = (state.settings.volume || 0.8) * 100;
        }
    }

    async function saveSettings() {
        for (const [key, value] of Object.entries(state.settings)) {
            await SampleHubDB.setSetting(key, value);
        }
    }

    // =============================================
    // EVENT LISTENERS
    // =============================================

    function setupEventListeners() {
        // Navigation
        elements.navItems.forEach(item => {
            item.addEventListener('click', () => switchView(item.dataset.view));
        });

        elements.menuToggle?.addEventListener('click', toggleSidebar);

        // Search & Filters
        elements.searchInput?.addEventListener('input', debounce(handleSearch, 300));
        elements.genreFilter?.addEventListener('change', handleFilterChange);
        elements.typeFilter?.addEventListener('change', handleFilterChange);
        elements.bpmMin?.addEventListener('input', debounce(handleFilterChange, 300));
        elements.bpmMax?.addEventListener('input', debounce(handleFilterChange, 300));
        elements.keyFilter?.addEventListener('change', handleFilterChange);
        elements.sortBtn?.addEventListener('click', handleSort);
        elements.viewToggle?.addEventListener('click', toggleViewMode);

        // Player controls
        elements.playPauseBtn?.addEventListener('click', () => AudioEngine.togglePlay());
        elements.prevBtn?.addEventListener('click', playPrevious);
        elements.nextBtn?.addEventListener('click', playNext);
        elements.loopBtn?.addEventListener('click', toggleLoop);
        elements.volumeBtn?.addEventListener('click', toggleMute);
        elements.volumeSlider?.addEventListener('input', handleVolumeChange);

        // Import
        elements.importBtn?.addEventListener('click', openImportModal);
        elements.emptyImportBtn?.addEventListener('click', openImportModal);
        elements.closeImportModal?.addEventListener('click', closeImportModal);
        elements.selectFilesBtn?.addEventListener('click', () => elements.fileInput?.click());
        elements.fileInput?.addEventListener('change', handleFileSelect);
        elements.createPack?.addEventListener('change', togglePackNameInput);

        // Dropzone
        setupDropzone();

        // Settings
        elements.settingsBtn?.addEventListener('click', openSettingsModal);
        elements.closeSettingsModal?.addEventListener('click', closeSettingsModal);
        elements.autoPlayNextSetting?.addEventListener('change', handleSettingChange);
        elements.fadeOnStopSetting?.addEventListener('change', handleSettingChange);
        elements.waveformColorSetting?.addEventListener('input', handleSettingChange);
        elements.progressColorSetting?.addEventListener('input', handleSettingChange);
        elements.exportDataBtn?.addEventListener('click', exportLibrary);
        elements.clearDataBtn?.addEventListener('click', confirmClearData);

        // Packs
        elements.addPackBtn?.addEventListener('click', () => openImportModal());
        elements.closePackDetailModal?.addEventListener('click', closePackDetailModal);

        // Categories
        elements.categoryCards.forEach(card => {
            card.addEventListener('click', () => handleCategoryClick(card.dataset.category));
        });

        // Context menu
        document.addEventListener('click', hideContextMenu);
        elements.contextMenu?.querySelectorAll('.context-item').forEach(item => {
            item.addEventListener('click', handleContextAction);
        });

        // Modal overlays
        elements.importModal?.addEventListener('click', (e) => {
            if (e.target === elements.importModal) closeImportModal();
        });
        elements.settingsModal?.addEventListener('click', (e) => {
            if (e.target === elements.settingsModal) closeSettingsModal();
        });
        elements.packDetailModal?.addEventListener('click', (e) => {
            if (e.target === elements.packDetailModal) closePackDetailModal();
        });

        // Online/Offline status
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboard);
    }

    function setupDropzone() {
        const dropzone = elements.importDropzone;
        if (!dropzone) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, preventDefaults);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'));
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'));
        });

        dropzone.addEventListener('drop', handleDrop);
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // =============================================
    // VIEW MANAGEMENT
    // =============================================

    function switchView(viewName) {
        state.currentView = viewName;

        // Update navigation
        elements.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });

        // Update views
        elements.views.forEach(view => {
            view.classList.toggle('active', view.id === viewName + 'View');
        });

        // Render content
        renderCurrentView();

        // Close sidebar on mobile
        if (window.innerWidth <= 1024) {
            closeSidebar();
        }
    }

    function renderCurrentView() {
        switch (state.currentView) {
            case 'library':
                renderLibrary();
                break;
            case 'browse':
                renderBrowse();
                break;
            case 'discover':
                // Discover view is handled by discover.js module
                if (typeof DiscoverModule !== 'undefined') {
                    DiscoverModule.checkServerStatus();
                }
                break;
            case 'packs':
                renderPacks();
                break;
            case 'favorites':
                renderFavorites();
                break;
        }
    }

    function toggleViewMode() {
        state.isGridView = !state.isGridView;
        elements.viewIcon.textContent = state.isGridView ? '▦' : '☰';
        elements.samplesGrid?.classList.toggle('list-view', !state.isGridView);
        elements.favoritesGrid?.classList.toggle('list-view', !state.isGridView);
    }

    function toggleSidebar() {
        elements.sidebar?.classList.toggle('open');
    }

    function closeSidebar() {
        elements.sidebar?.classList.remove('open');
    }

    // =============================================
    // RENDERING
    // =============================================

    function renderLibrary() {
        const filteredSamples = getFilteredSamples();
        state.currentPlaylist = filteredSamples;

        elements.sampleCountDisplay.textContent = `${filteredSamples.length} samplů`;

        if (filteredSamples.length === 0) {
            elements.emptyState.style.display = 'flex';
            elements.samplesGrid.innerHTML = '';
        } else {
            elements.emptyState.style.display = 'none';
            elements.samplesGrid.innerHTML = filteredSamples.map(sample =>
                createSampleCard(sample)
            ).join('');
        }

        // Add event listeners to cards
        attachSampleCardListeners(elements.samplesGrid);
    }

    function renderFavorites() {
        const favorites = state.samples.filter(s => s.favorite);

        if (favorites.length === 0) {
            elements.favoritesGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⭐</div>
                    <h3 class="empty-title">Žádné oblíbené</h3>
                    <p class="empty-text">Označte samply hvězdičkou pro přidání do oblíbených</p>
                </div>
            `;
        } else {
            elements.favoritesGrid.innerHTML = favorites.map(sample =>
                createSampleCard(sample)
            ).join('');
            attachSampleCardListeners(elements.favoritesGrid);
        }
    }

    function renderPacks() {
        if (state.packs.length === 0) {
            elements.packsGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <h3 class="empty-title">Žádné packy</h3>
                    <p class="empty-text">Importujte sample pack pro začátek</p>
                </div>
            `;
        } else {
            elements.packsGrid.innerHTML = state.packs.map(pack =>
                createPackCard(pack)
            ).join('');

            // Add click listeners
            elements.packsGrid.querySelectorAll('.pack-card').forEach(card => {
                card.addEventListener('click', () => openPackDetail(parseInt(card.dataset.packId)));
            });
        }
    }

    function renderBrowse() {
        // Browse view shows categories - already rendered in HTML
        // Results appear when a category is selected
    }

    function createSampleCard(sample) {
        const icon = getSampleIcon(sample.type || sample.format);
        const isPlaying = state.currentSample?.id === sample.id && AudioEngine.getState().isPlaying;

        return `
            <div class="sample-card ${isPlaying ? 'playing' : ''}"
                 data-sample-id="${sample.id}"
                 data-sample-data='${JSON.stringify(sample).replace(/'/g, "&#39;")}'>
                <div class="sample-header">
                    <span class="sample-icon">${icon}</span>
                    <div class="sample-info">
                        <div class="sample-name">${escapeHtml(sample.name)}</div>
                        <div class="sample-pack">${escapeHtml(sample.packName || 'Bez packu')}</div>
                    </div>
                    <button class="sample-favorite ${sample.favorite ? 'active' : ''}"
                            data-action="favorite">
                        ${sample.favorite ? '⭐' : '☆'}
                    </button>
                </div>
                <div class="sample-waveform" data-sample-id="${sample.id}"></div>
                <div class="sample-meta">
                    ${sample.bpm ? `<span class="meta-tag bpm">${sample.bpm} BPM</span>` : ''}
                    ${sample.key ? `<span class="meta-tag key">${sample.key}</span>` : ''}
                    ${sample.duration ? `<span class="meta-tag duration">${AudioEngine.formatTime(sample.duration)}</span>` : ''}
                    <span class="meta-tag">${sample.format?.toUpperCase() || 'AUDIO'}</span>
                </div>
                <div class="sample-actions">
                    <button class="sample-action-btn" data-action="play" title="Přehrát">▶️</button>
                    <button class="sample-action-btn" data-action="menu" title="Více">⋯</button>
                </div>
            </div>
        `;
    }

    function createPackCard(pack) {
        const sampleCount = state.samples.filter(s => s.packId === pack.id).length;

        return `
            <div class="pack-card" data-pack-id="${pack.id}">
                <div class="pack-cover">📦</div>
                <div class="pack-info">
                    <div class="pack-title">${escapeHtml(pack.name)}</div>
                    <div class="pack-meta">
                        <span class="pack-stat">
                            <span>🎵</span>
                            <span>${sampleCount} samplů</span>
                        </span>
                        <span class="pack-stat">
                            <span>📅</span>
                            <span>${formatDate(pack.createdAt)}</span>
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    function attachSampleCardListeners(container) {
        container.querySelectorAll('.sample-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const sampleId = parseInt(card.dataset.sampleId);

                // Check if clicking on action button
                if (e.target.closest('[data-action]')) {
                    const action = e.target.closest('[data-action]').dataset.action;
                    handleSampleAction(action, sampleId, e);
                } else {
                    // Play on card click
                    playSample(sampleId);
                }
            });

            // Context menu
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e, parseInt(card.dataset.sampleId));
            });
        });
    }

    // =============================================
    // SAMPLE PLAYBACK
    // =============================================

    async function playSample(sampleId) {
        const sample = state.samples.find(s => s.id === sampleId);
        if (!sample) return;

        try {
            state.currentSample = sample;

            // Update player info
            elements.playerTitle.textContent = sample.name;
            elements.playerMeta.textContent = sample.packName || 'Bez packu';

            // Load and play audio
            if (sample.audioBlob) {
                await AudioEngine.load(sample.audioBlob, sample.id);
            } else if (sample.audioData) {
                await AudioEngine.load(sample.audioData, sample.id);
            } else {
                throw new Error('No audio data available');
            }

            AudioEngine.play();

            // Update playlist index
            state.playlistIndex = state.currentPlaylist.findIndex(s => s.id === sampleId);

            // Update UI
            renderCurrentView();

        } catch (error) {
            console.error('Failed to play sample:', error);
            showToast('Chyba při přehrávání', 'error');
        }
    }

    function playNext() {
        if (state.currentPlaylist.length === 0) return;

        state.playlistIndex = (state.playlistIndex + 1) % state.currentPlaylist.length;
        const nextSample = state.currentPlaylist[state.playlistIndex];

        if (nextSample) {
            playSample(nextSample.id);
        }
    }

    function playPrevious() {
        if (state.currentPlaylist.length === 0) return;

        state.playlistIndex = (state.playlistIndex - 1 + state.currentPlaylist.length) % state.currentPlaylist.length;
        const prevSample = state.currentPlaylist[state.playlistIndex];

        if (prevSample) {
            playSample(prevSample.id);
        }
    }

    function toggleLoop() {
        const isLooping = AudioEngine.toggleLoop();
        elements.loopBtn?.classList.toggle('active', isLooping);
    }

    function toggleMute() {
        const currentVolume = AudioEngine.getVolume();
        if (currentVolume > 0) {
            state.settings.previousVolume = currentVolume;
            AudioEngine.setVolume(0);
            elements.volumeSlider.value = 0;
            elements.volumeIcon.textContent = '🔇';
        } else {
            const prevVolume = state.settings.previousVolume || 0.8;
            AudioEngine.setVolume(prevVolume);
            elements.volumeSlider.value = prevVolume * 100;
            elements.volumeIcon.textContent = '🔊';
        }
    }

    function handleVolumeChange(e) {
        const volume = parseInt(e.target.value) / 100;
        AudioEngine.setVolume(volume);
        state.settings.volume = volume;
        elements.volumeIcon.textContent = volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊';
        saveSettings();
    }

    // Audio callbacks
    function handleAudioPlay() {
        elements.playPauseIcon.textContent = '⏸️';
    }

    function handleAudioPause() {
        elements.playPauseIcon.textContent = '▶️';
    }

    function handleAudioStop() {
        elements.playPauseIcon.textContent = '▶️';
        elements.currentTime.textContent = '0:00';
    }

    function handleAudioEnded() {
        elements.playPauseIcon.textContent = '▶️';

        if (state.settings.autoPlayNext) {
            playNext();
        }
    }

    function handleTimeUpdate({ currentTime, duration }) {
        elements.currentTime.textContent = AudioEngine.formatTime(currentTime);
        elements.totalTime.textContent = AudioEngine.formatTime(duration);
    }

    function handleAudioError(error) {
        console.error('Audio error:', error);
        showToast('Chyba přehrávání audio', 'error');
    }

    // =============================================
    // SAMPLE ACTIONS
    // =============================================

    function handleSampleAction(action, sampleId, event) {
        event?.stopPropagation();

        switch (action) {
            case 'play':
                playSample(sampleId);
                break;
            case 'favorite':
                toggleSampleFavorite(sampleId);
                break;
            case 'menu':
                showContextMenu(event, sampleId);
                break;
        }
    }

    async function toggleSampleFavorite(sampleId) {
        try {
            const newFavorite = await SampleHubDB.toggleFavorite(sampleId);

            // Update state
            const sample = state.samples.find(s => s.id === sampleId);
            if (sample) {
                sample.favorite = newFavorite;
            }

            // Update UI
            updateCounts();
            renderCurrentView();

            showToast(newFavorite ? 'Přidáno do oblíbených' : 'Odebráno z oblíbených', 'success');
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            showToast('Chyba při ukládání', 'error');
        }
    }

    async function deleteSample(sampleId) {
        if (!confirm('Opravdu chcete smazat tento sample?')) return;

        try {
            await SampleHubDB.deleteSample(sampleId);

            // Remove from state
            state.samples = state.samples.filter(s => s.id !== sampleId);

            // Update UI
            updateCounts();
            renderCurrentView();

            showToast('Sample smazán', 'success');
        } catch (error) {
            console.error('Failed to delete sample:', error);
            showToast('Chyba při mazání', 'error');
        }
    }

    // =============================================
    // CONTEXT MENU
    // =============================================

    let contextMenuSampleId = null;

    function showContextMenu(event, sampleId) {
        event.preventDefault();
        contextMenuSampleId = sampleId;

        const menu = elements.contextMenu;
        if (!menu) return;

        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        menu.classList.add('active');

        // Update favorite button text
        const sample = state.samples.find(s => s.id === sampleId);
        const favBtn = menu.querySelector('[data-action="favorite"]');
        if (favBtn && sample) {
            favBtn.querySelector('span:last-child').textContent =
                sample.favorite ? 'Odebrat z oblíbených' : 'Oblíbené';
        }
    }

    function hideContextMenu() {
        elements.contextMenu?.classList.remove('active');
        contextMenuSampleId = null;
    }

    function handleContextAction(e) {
        const action = e.currentTarget.dataset.action;

        if (!contextMenuSampleId) return;

        switch (action) {
            case 'play':
                playSample(contextMenuSampleId);
                break;
            case 'favorite':
                toggleSampleFavorite(contextMenuSampleId);
                break;
            case 'edit':
                // TODO: Open edit modal
                showToast('Úprava zatím není k dispozici', 'info');
                break;
            case 'export':
                exportSample(contextMenuSampleId);
                break;
            case 'delete':
                deleteSample(contextMenuSampleId);
                break;
        }

        hideContextMenu();
    }

    // =============================================
    // IMPORT
    // =============================================

    function openImportModal() {
        elements.importModal?.classList.add('active');
        resetImportForm();
    }

    function closeImportModal() {
        elements.importModal?.classList.remove('active');
        resetImportForm();
    }

    function resetImportForm() {
        if (elements.fileInput) elements.fileInput.value = '';
        if (elements.importProgress) elements.importProgress.style.display = 'none';
        if (elements.progressFill) elements.progressFill.style.width = '0%';
    }

    function togglePackNameInput() {
        const show = elements.createPack?.checked;
        if (elements.packNameInput) {
            elements.packNameInput.style.display = show ? 'block' : 'none';
        }
    }

    function handleFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            importFiles(files);
        }
    }

    function handleDrop(e) {
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            importFiles(files);
        }
    }

    async function importFiles(files) {
        const audioFiles = files.filter(file =>
            /\.(wav|mp3|flac|aiff|aif|ogg)$/i.test(file.name)
        );

        if (audioFiles.length === 0) {
            showToast('Žádné podporované audio soubory', 'warning');
            return;
        }

        // Show progress
        elements.importProgress.style.display = 'block';
        elements.progressText.textContent = `Importuji 0/${audioFiles.length}...`;

        const autoDetectBpm = elements.autoDetectBpm?.checked ?? true;
        const autoDetectKey = elements.autoDetectKey?.checked ?? true;
        const createPack = elements.createPack?.checked ?? false;
        const packName = elements.newPackName?.value?.trim() || `Import ${new Date().toLocaleDateString()}`;

        let packId = null;

        try {
            // Create pack if requested
            if (createPack) {
                packId = await SampleHubDB.addPack({
                    name: packName,
                    genre: '',
                    description: `Importováno ${audioFiles.length} souborů`
                });
                state.packs.push({ id: packId, name: packName, createdAt: new Date().toISOString() });
            }

            // Import each file
            for (let i = 0; i < audioFiles.length; i++) {
                const file = audioFiles[i];

                try {
                    // Read file
                    const arrayBuffer = await file.arrayBuffer();
                    const audioBlob = new Blob([arrayBuffer], { type: file.type });

                    // Analyze if requested
                    let metadata = {
                        duration: 0,
                        bpm: null,
                        key: null
                    };

                    if (autoDetectBpm || autoDetectKey) {
                        try {
                            const analysis = await AudioEngine.analyzeAudio(arrayBuffer.slice(0));
                            metadata.duration = analysis.duration;
                            if (autoDetectBpm) metadata.bpm = analysis.bpm;
                            if (autoDetectKey) metadata.key = analysis.key;
                        } catch (error) {
                            console.warn('Failed to analyze audio:', error);
                        }
                    }

                    // Create sample record
                    const sample = {
                        name: file.name.replace(/\.[^.]+$/, ''),
                        filename: file.name,
                        format: file.name.split('.').pop().toLowerCase(),
                        size: file.size,
                        type: detectSampleType(file.name),
                        genre: '',
                        packId: packId,
                        packName: createPack ? packName : null,
                        duration: metadata.duration,
                        bpm: metadata.bpm,
                        key: metadata.key,
                        audioBlob: audioBlob
                    };

                    const sampleId = await SampleHubDB.addSample(sample);
                    sample.id = sampleId;
                    state.samples.push(sample);

                    // Update progress
                    const progress = ((i + 1) / audioFiles.length) * 100;
                    elements.progressFill.style.width = `${progress}%`;
                    elements.progressText.textContent = `Importuji ${i + 1}/${audioFiles.length}...`;

                } catch (error) {
                    console.error(`Failed to import ${file.name}:`, error);
                }
            }

            // Done
            showToast(`Importováno ${audioFiles.length} souborů`, 'success');
            closeImportModal();
            updateCounts();
            renderCurrentView();

        } catch (error) {
            console.error('Import failed:', error);
            showToast('Chyba při importu', 'error');
        }
    }

    function detectSampleType(filename) {
        const lower = filename.toLowerCase();

        if (/kick|snare|hat|hihat|clap|tom|perc|drum/i.test(lower)) return 'drum';
        if (/bass/i.test(lower)) return 'bass';
        if (/synth|lead|pad|arp/i.test(lower)) return 'synth';
        if (/vocal|vox|voice/i.test(lower)) return 'vocal';
        if (/fx|effect|riser|impact/i.test(lower)) return 'fx';
        if (/loop/i.test(lower)) return 'loop';

        return 'oneshot';
    }

    // =============================================
    // EXPORT
    // =============================================

    async function exportLibrary() {
        try {
            const data = await SampleHubDB.exportData();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `samplehub-export-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();

            URL.revokeObjectURL(url);
            showToast('Knihovna exportována', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            showToast('Chyba při exportu', 'error');
        }
    }

    async function exportSample(sampleId) {
        const sample = state.samples.find(s => s.id === sampleId);
        if (!sample || !sample.audioBlob) {
            showToast('Audio data nejsou k dispozici', 'error');
            return;
        }

        const url = URL.createObjectURL(sample.audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sample.filename || `${sample.name}.${sample.format}`;
        a.click();

        URL.revokeObjectURL(url);
        showToast('Sample exportován', 'success');
    }

    // =============================================
    // SETTINGS
    // =============================================

    function openSettingsModal() {
        elements.settingsModal?.classList.add('active');
    }

    function closeSettingsModal() {
        elements.settingsModal?.classList.remove('active');
    }

    function handleSettingChange(e) {
        const setting = e.target.id;
        let value;

        if (e.target.type === 'checkbox') {
            value = e.target.checked;
        } else {
            value = e.target.value;
        }

        // Map setting names
        const settingMap = {
            'autoPlayNext': 'autoPlayNext',
            'fadeOnStop': 'fadeOnStop',
            'waveformColor': 'waveformColor',
            'progressColor': 'progressColor'
        };

        const key = settingMap[setting];
        if (key) {
            state.settings[key] = value;
            saveSettings();

            // Apply immediately
            if (key === 'waveformColor' || key === 'progressColor') {
                AudioEngine.updateSettings({
                    waveformColor: state.settings.waveformColor,
                    progressColor: state.settings.progressColor
                });
            } else if (key === 'fadeOnStop') {
                AudioEngine.updateSettings({ fadeOnStop: value });
            }
        }
    }

    async function confirmClearData() {
        if (!confirm('Opravdu chcete smazat všechna data? Tato akce je nevratná!')) return;
        if (!confirm('Jste si opravdu jistí? Všechny samply budou ztraceny!')) return;

        try {
            await SampleHubDB.clearAllData();
            state.samples = [];
            state.packs = [];

            updateCounts();
            renderCurrentView();
            closeSettingsModal();

            showToast('Všechna data byla smazána', 'success');
        } catch (error) {
            console.error('Failed to clear data:', error);
            showToast('Chyba při mazání dat', 'error');
        }
    }

    // =============================================
    // PACKS
    // =============================================

    async function openPackDetail(packId) {
        const pack = state.packs.find(p => p.id === packId);
        if (!pack) return;

        const samples = state.samples.filter(s => s.packId === packId);

        elements.packDetailTitle.textContent = `📦 ${pack.name}`;
        elements.packDetailInfo.innerHTML = `
            <p><strong>Vytvořeno:</strong> ${formatDate(pack.createdAt)}</p>
            <p><strong>Samplů:</strong> ${samples.length}</p>
            ${pack.description ? `<p><strong>Popis:</strong> ${pack.description}</p>` : ''}
        `;

        elements.packDetailSamples.innerHTML = samples.map(sample =>
            createSampleCard(sample)
        ).join('');

        attachSampleCardListeners(elements.packDetailSamples);
        elements.packDetailModal?.classList.add('active');
    }

    function closePackDetailModal() {
        elements.packDetailModal?.classList.remove('active');
    }

    // =============================================
    // SEARCH & FILTERS
    // =============================================

    function handleSearch(e) {
        state.filters.search = e.target.value;
        renderCurrentView();
    }

    function handleFilterChange() {
        state.filters.genre = elements.genreFilter?.value || '';
        state.filters.type = elements.typeFilter?.value || '';
        state.filters.bpmMin = elements.bpmMin?.value ? parseInt(elements.bpmMin.value) : null;
        state.filters.bpmMax = elements.bpmMax?.value ? parseInt(elements.bpmMax.value) : null;
        state.filters.key = elements.keyFilter?.value || '';

        renderCurrentView();
    }

    function handleSort() {
        // Cycle through sort options
        const sortOptions = ['addedAt', 'name', 'bpm', 'duration'];
        const currentIndex = sortOptions.indexOf(state.sortBy);
        state.sortBy = sortOptions[(currentIndex + 1) % sortOptions.length];

        // Toggle order on same field
        if (currentIndex === sortOptions.indexOf(state.sortBy)) {
            state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
        }

        renderCurrentView();
        showToast(`Seřazeno podle: ${getSortLabel(state.sortBy)}`, 'info');
    }

    function getSortLabel(sortBy) {
        const labels = {
            'addedAt': 'Data přidání',
            'name': 'Názvu',
            'bpm': 'BPM',
            'duration': 'Délky'
        };
        return labels[sortBy] || sortBy;
    }

    function getFilteredSamples() {
        let samples = [...state.samples];

        // Apply filters
        if (state.filters.search) {
            const search = state.filters.search.toLowerCase();
            samples = samples.filter(s =>
                s.name.toLowerCase().includes(search) ||
                (s.packName && s.packName.toLowerCase().includes(search))
            );
        }

        if (state.filters.genre) {
            samples = samples.filter(s => s.genre === state.filters.genre);
        }

        if (state.filters.type) {
            samples = samples.filter(s => s.type === state.filters.type);
        }

        if (state.filters.bpmMin) {
            samples = samples.filter(s => s.bpm && s.bpm >= state.filters.bpmMin);
        }

        if (state.filters.bpmMax) {
            samples = samples.filter(s => s.bpm && s.bpm <= state.filters.bpmMax);
        }

        if (state.filters.key) {
            samples = samples.filter(s => s.key === state.filters.key);
        }

        // Sort
        samples.sort((a, b) => {
            let aVal = a[state.sortBy];
            let bVal = b[state.sortBy];

            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) return state.sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return state.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return samples;
    }

    function handleCategoryClick(category) {
        // Set type filter
        state.filters.type = category;
        elements.typeFilter.value = category;

        // Switch to library view with filter
        switchView('library');
    }

    // =============================================
    // KEYBOARD SHORTCUTS
    // =============================================

    function handleKeyboard(e) {
        // Skip if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case ' ':
                e.preventDefault();
                AudioEngine.togglePlay();
                break;
            case 'ArrowLeft':
                if (e.ctrlKey || e.metaKey) {
                    playPrevious();
                }
                break;
            case 'ArrowRight':
                if (e.ctrlKey || e.metaKey) {
                    playNext();
                }
                break;
            case 'Escape':
                hideContextMenu();
                closeImportModal();
                closeSettingsModal();
                closePackDetailModal();
                break;
        }
    }

    // =============================================
    // UTILITIES
    // =============================================

    function updateCounts() {
        const sampleCount = state.samples.length;
        const packCount = state.packs.length;
        const favoritesCount = state.samples.filter(s => s.favorite).length;

        elements.libraryCount.textContent = sampleCount;
        elements.packsCount.textContent = packCount;
        elements.favoritesCount.textContent = favoritesCount;
    }

    function updateOnlineStatus() {
        const isOnline = navigator.onLine;
        elements.offlineIndicator?.classList.toggle('offline', !isOnline);

        const text = elements.offlineIndicator?.querySelector('.offline-text');
        if (text) {
            text.textContent = isOnline ? 'Online' : 'Offline';
        }
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
            <span class="toast-message">${escapeHtml(message)}</span>
            <button class="toast-close">&times;</button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });

        elements.toastContainer?.appendChild(toast);

        // Auto remove after 4 seconds
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    function getSampleIcon(type) {
        const icons = {
            'drum': '🥁',
            'bass': '🎸',
            'synth': '🎹',
            'vocal': '🎤',
            'fx': '✨',
            'loop': '🔄',
            'oneshot': '🎵',
            'wav': '🎵',
            'mp3': '🎵',
            'flac': '🎵',
            'aiff': '🎵',
            'ogg': '🎵'
        };
        return icons[type] || '🎵';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('cs-CZ');
        } catch {
            return dateString;
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // =============================================
    // TORRENT IMPORT HANDLING
    // =============================================

    /**
     * Handle torrent import event from TorrentDownloader
     */
    async function handleTorrentImport(event) {
        const { pack, samples: torrentSamples } = event.detail;

        console.log('[TorrentImport] Importing pack:', pack.name, 'with', torrentSamples.length, 'samples');

        try {
            // Create pack
            if (pack) {
                const existingPack = state.packs.find(p => p.id === pack.id);
                if (!existingPack) {
                    const packRecord = {
                        id: pack.id,
                        name: pack.name,
                        source: 'torrent',
                        createdAt: pack.createdAt,
                        sampleCount: torrentSamples.length
                    };

                    try {
                        await SampleHubDB.addPack(packRecord);
                    } catch (e) {
                        console.warn('[TorrentImport] Pack save failed (continuing):', e);
                    }
                    state.packs.push(packRecord);
                }
            }

            // Import samples
            for (const sample of torrentSamples) {
                try {
                    // Sample already has blob and blobUrl from TorrentDownloader
                    const sampleRecord = {
                        id: sample.id,
                        name: sample.name,
                        filename: sample.filename,
                        format: sample.extension?.replace('.', '') || 'unknown',
                        size: sample.size,
                        type: detectSampleType(sample.filename),
                        genre: '',
                        packId: sample.packId,
                        packName: sample.packName,
                        duration: null,
                        bpm: null,
                        key: null,
                        audioBlob: sample.blob,
                        blobUrl: sample.blobUrl,
                        source: 'torrent',
                        addedAt: sample.addedAt,
                        isFavorite: false
                    };

                    try {
                        await SampleHubDB.addSample(sampleRecord);
                    } catch (e) {
                        console.warn('[TorrentImport] Sample save failed (continuing):', e);
                    }

                    state.samples.push(sampleRecord);
                } catch (e) {
                    console.error('[TorrentImport] Failed to import sample:', sample.name, e);
                }
            }

            // Update UI
            updateCounts();
            renderCurrentView();

        } catch (error) {
            console.error('[TorrentImport] Import failed:', error);
            showToast('Chyba při importu torrentu', 'error');
        }
    }

    /**
     * Handle play-audio event from TorrentDownloader
     */
    function handlePlayAudio(event) {
        const { name, url, source } = event.detail;

        if (!url) return;

        console.log('[PlayAudio] Playing:', name, 'from', source);

        // Create a temporary sample-like object for the player
        const tempSample = {
            id: 'temp-' + Date.now(),
            name: name,
            blobUrl: url,
            source: source
        };

        // Play the audio
        if (typeof AudioEngine !== 'undefined' && AudioEngine.play) {
            AudioEngine.play(tempSample);
            state.currentSample = tempSample;
            updatePlayerUI(tempSample);
        }
    }

    // Register torrent event handlers
    window.addEventListener('torrent-import', handleTorrentImport);
    window.addEventListener('play-audio', handlePlayAudio);

    // =============================================
    // GLOBAL EXPORTS
    // =============================================

    // Export showToast for use by other modules (e.g., discover.js)
    window.showToast = showToast;

    // =============================================
    // START APPLICATION
    // =============================================

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
