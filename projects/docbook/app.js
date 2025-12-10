/**
 * DocBook - Main Application
 * Offline Documentation Platform
 */

class DocBookApp {
    constructor() {
        // Current state
        this.currentSpace = null;
        this.currentPage = null;

        // DOM elements
        this.elements = {};

        // Initialization
        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        console.log('[DocBook] Initializing...');

        // Cache DOM elements
        this.cacheElements();

        // Setup event listeners
        this.setupEventListeners();

        // Initialize search
        await window.DocBookSearch.init();

        // Initialize editor
        window.DocBookEditor.init();

        // Load navigation
        await this.loadNavigation();

        // Check for URL parameters
        this.handleURLParams();

        // Setup offline detection
        this.setupOfflineDetection();

        // Show welcome or load last page
        await this.restoreLastSession();

        console.log('[DocBook] Initialized');
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            sidebar: document.getElementById('sidebar'),
            sidebarNav: document.getElementById('sidebarNav'),
            navTree: document.getElementById('navTree'),
            navLoading: document.getElementById('navLoading'),
            navEmpty: document.getElementById('navEmpty'),
            welcomeScreen: document.getElementById('welcomeScreen'),
            editorScreen: document.getElementById('editorScreen'),
            breadcrumb: document.getElementById('breadcrumb'),
            searchInput: document.getElementById('searchInput'),
            toastContainer: document.getElementById('toastContainer'),
            offlineBanner: document.getElementById('offlineBanner')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Sidebar toggle
        document.getElementById('sidebarToggle')?.addEventListener('click', () => {
            this.toggleSidebar();
        });

        // New space buttons
        document.getElementById('newSpaceBtn')?.addEventListener('click', () => {
            this.openModal('newSpaceModal');
        });
        document.getElementById('welcomeNewSpace')?.addEventListener('click', () => {
            this.openModal('newSpaceModal');
        });

        // Create space
        document.getElementById('createSpaceBtn')?.addEventListener('click', () => {
            this.createSpace();
        });

        // Create page
        document.getElementById('createPageBtn')?.addEventListener('click', () => {
            this.createPage();
        });

        // Page settings
        document.getElementById('pageSettingsBtn')?.addEventListener('click', () => {
            this.openPageSettings();
        });
        document.getElementById('savePageSettingsBtn')?.addEventListener('click', () => {
            this.savePageSettings();
        });

        // Delete page
        document.getElementById('deletePageBtn')?.addEventListener('click', () => {
            this.confirmDeletePage();
        });
        document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
            this.executeDelete();
        });

        // Settings
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.openSettings();
        });

        // Export/Import
        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.openModal('exportModal');
        });
        document.getElementById('importBtn')?.addEventListener('click', () => {
            this.openModal('importModal');
        });
        document.getElementById('welcomeImport')?.addEventListener('click', () => {
            this.openModal('importModal');
        });
        document.getElementById('doExportBtn')?.addEventListener('click', () => {
            this.doExport();
        });

        // Import drop zone
        this.setupImportDropZone();

        // Search
        this.setupSearch();

        // Modal close buttons
        document.querySelectorAll('.modal-close, [data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.close || btn.closest('.modal-overlay')?.id;
                if (modalId) this.closeModal(modalId);
            });
        });

        // Close modal on overlay click
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Icon picker
        document.querySelectorAll('.icon-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
            });
        });

        // Settings form
        document.getElementById('settingAutoSave')?.addEventListener('change', (e) => {
            window.DocBookDB.SettingsDB.set('autoSave', e.target.checked);
            if (e.target.checked) {
                window.DocBookEditor.startAutoSave();
            } else {
                window.DocBookEditor.stopAutoSave();
            }
        });

        document.getElementById('settingSpellcheck')?.addEventListener('change', (e) => {
            window.DocBookDB.SettingsDB.set('spellcheck', e.target.checked);
            const textarea = document.getElementById('editorTextarea');
            if (textarea) textarea.spellcheck = e.target.checked;
        });

        document.getElementById('settingFontSize')?.addEventListener('change', (e) => {
            const size = parseInt(e.target.value);
            window.DocBookDB.SettingsDB.set('fontSize', size);
            const textarea = document.getElementById('editorTextarea');
            if (textarea) textarea.style.fontSize = `${size}px`;
        });

        document.getElementById('clearAllDataBtn')?.addEventListener('click', () => {
            this.confirmClearAllData();
        });

        // TOC toggle
        document.getElementById('tocToggle')?.addEventListener('click', () => {
            document.getElementById('editorToc')?.classList.toggle('collapsed');
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeydown(e);
        });

        // Before unload
        window.addEventListener('beforeunload', (e) => {
            if (window.DocBookEditor.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes.';
                return e.returnValue;
            }
        });
    }

    /**
     * Setup offline detection
     */
    setupOfflineDetection() {
        const updateOnlineStatus = () => {
            if (navigator.onLine) {
                this.elements.offlineBanner?.classList.remove('visible');
            } else {
                this.elements.offlineBanner?.classList.add('visible');
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        // Initial check
        updateOnlineStatus();
    }

    /**
     * Handle global keyboard shortcuts
     */
    handleGlobalKeydown(e) {
        const isMac = navigator.platform.includes('Mac');
        const modKey = isMac ? e.metaKey : e.ctrlKey;

        // Ctrl/Cmd + K - Open search
        if (modKey && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            this.openSearch();
        }

        // Escape - Close modals
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal-overlay.active');
            if (activeModal) {
                this.closeModal(activeModal.id);
            }
        }
    }

    /**
     * Load navigation tree
     */
    async loadNavigation() {
        this.elements.navLoading.style.display = 'flex';
        this.elements.navTree.innerHTML = '';
        this.elements.navEmpty.style.display = 'none';

        try {
            const spaces = await window.DocBookDB.SpaceDB.getAll();

            if (spaces.length === 0) {
                this.elements.navEmpty.style.display = 'block';
                this.elements.navLoading.style.display = 'none';
                return;
            }

            for (const space of spaces) {
                const pages = await window.DocBookDB.PageDB.getTree(space.id);
                this.renderSpaceNav(space, pages);
            }

            this.elements.navLoading.style.display = 'none';
        } catch (error) {
            console.error('[DocBook] Load navigation error:', error);
            this.elements.navLoading.innerHTML = '<span style="color: var(--danger-color);">Error loading</span>';
        }
    }

    /**
     * Render space navigation item
     */
    renderSpaceNav(space, pages) {
        const spaceEl = document.createElement('div');
        spaceEl.className = 'nav-space';
        spaceEl.dataset.spaceId = space.id;

        spaceEl.innerHTML = `
            <div class="nav-space-header" data-space-id="${space.id}">
                <span class="nav-space-toggle">▼</span>
                <span class="nav-space-icon">${space.icon || '📁'}</span>
                <span class="nav-space-name">${this.escapeHtml(space.name)}</span>
                <div class="nav-space-actions">
                    <button class="nav-action-btn" data-action="add-page" title="Pridat stranku">➕</button>
                    <button class="nav-action-btn" data-action="edit-space" title="Upravit">✏️</button>
                    <button class="nav-action-btn danger" data-action="delete-space" title="Smazat">🗑️</button>
                </div>
            </div>
            <div class="nav-pages">
                ${this.renderPagesNav(pages, space.id)}
            </div>
        `;

        // Space header click - toggle collapse
        const header = spaceEl.querySelector('.nav-space-header');
        header.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-action-btn')) {
                spaceEl.classList.toggle('collapsed');
            }
        });

        // Action buttons
        spaceEl.querySelectorAll('.nav-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                this.handleSpaceAction(action, space);
            });
        });

        // Page clicks
        spaceEl.querySelectorAll('.nav-page').forEach(pageEl => {
            pageEl.addEventListener('click', (e) => {
                if (!e.target.closest('.nav-action-btn')) {
                    const pageId = parseInt(pageEl.dataset.pageId);
                    this.openPage(pageId);
                }
            });

            // Page action buttons
            pageEl.querySelectorAll('.nav-action-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    const pageId = parseInt(pageEl.dataset.pageId);
                    this.handlePageAction(action, pageId);
                });
            });
        });

        this.elements.navTree.appendChild(spaceEl);
    }

    /**
     * Render pages navigation
     */
    renderPagesNav(pages, spaceId, level = 0) {
        if (!pages || pages.length === 0) {
            return '<div class="nav-page-empty" style="padding: 8px 12px; color: var(--text-muted); font-size: 0.85rem;">Žádné stránky</div>';
        }

        return pages.map(page => `
            <div class="nav-page" data-page-id="${page.id}" data-space-id="${spaceId}" style="padding-left: ${12 + level * 16}px;">
                <span class="nav-page-icon">📄</span>
                <span class="nav-page-text">${this.escapeHtml(page.title)}</span>
                <div class="nav-page-actions">
                    <button class="nav-action-btn danger" data-action="delete-page" title="Smazat">🗑️</button>
                </div>
            </div>
            ${page.children && page.children.length > 0 ?
                `<div class="nav-page-children">${this.renderPagesNav(page.children, spaceId, level + 1)}</div>` : ''}
        `).join('');
    }

    /**
     * Handle space actions
     */
    async handleSpaceAction(action, space) {
        switch (action) {
            case 'add-page':
                this.currentSpace = space;
                this.openModal('newPageModal');
                await this.populateParentPageSelect(space.id);
                break;

            case 'edit-space':
                // TODO: Implement space editing
                this.showToast('Editace prostoru - připravujeme', 'info');
                break;

            case 'delete-space':
                this.deleteTarget = { type: 'space', id: space.id, name: space.name };
                document.getElementById('deleteWarning').textContent =
                    `Opravdu chcete smazat prostor "${space.name}" a všechny jeho stránky?`;
                this.openModal('deleteModal');
                break;
        }
    }

    /**
     * Handle page actions
     */
    async handlePageAction(action, pageId) {
        const page = await window.DocBookDB.PageDB.getById(pageId);
        if (!page) return;

        switch (action) {
            case 'delete-page':
                this.deleteTarget = { type: 'page', id: pageId, name: page.title };
                document.getElementById('deleteWarning').textContent =
                    `Opravdu chcete smazat stranku "${page.title}"?`;
                this.openModal('deleteModal');
                break;
        }
    }

    /**
     * Open page in editor
     */
    async openPage(pageId) {
        try {
            const page = await window.DocBookDB.PageDB.getWithSpace(pageId);
            if (!page) {
                this.showToast('Stránka nenalezena', 'error');
                return;
            }

            this.currentPage = page;
            this.currentSpace = page.space;

            // Save last opened
            await window.DocBookDB.SettingsDB.set('lastOpenedPage', pageId);
            await window.DocBookDB.SettingsDB.set('lastOpenedSpace', page.spaceId);

            // Update UI
            this.elements.welcomeScreen.style.display = 'none';
            this.elements.editorScreen.style.display = 'flex';

            // Update breadcrumb
            this.updateBreadcrumb(page);

            // Update active states in nav
            document.querySelectorAll('.nav-page').forEach(el => {
                el.classList.toggle('active', parseInt(el.dataset.pageId) === pageId);
            });
            document.querySelectorAll('.nav-space-header').forEach(el => {
                el.classList.toggle('active', parseInt(el.dataset.spaceId) === page.spaceId);
            });

            // Load into editor
            await window.DocBookEditor.loadPage(page);

        } catch (error) {
            console.error('[DocBook] Open page error:', error);
            this.showToast('Chyba při otevírání stránky', 'error');
        }
    }

    /**
     * Update breadcrumb
     */
    updateBreadcrumb(page) {
        let html = '';

        if (page.space) {
            html += `<span class="breadcrumb-item">${page.space.icon || '📁'} ${this.escapeHtml(page.space.name)}</span>`;
            html += '<span class="breadcrumb-separator">/</span>';
        }

        html += `<span class="breadcrumb-current">📄 ${this.escapeHtml(page.title)}</span>`;

        this.elements.breadcrumb.innerHTML = html;
    }

    /**
     * Create new space
     */
    async createSpace() {
        const nameInput = document.getElementById('spaceNameInput');
        const descInput = document.getElementById('spaceDescInput');
        const selectedIcon = document.querySelector('.icon-option.selected');

        const name = nameInput.value.trim();
        if (!name) {
            this.showToast('Zadejte název prostoru', 'warning');
            nameInput.focus();
            return;
        }

        try {
            const space = await window.DocBookDB.SpaceDB.create({
                name,
                description: descInput.value.trim(),
                icon: selectedIcon?.dataset.icon || '📁'
            });

            // Create first page
            const page = await window.DocBookDB.PageDB.create({
                spaceId: space.id,
                title: 'Úvod',
                content: `# ${name}\n\nVítejte v novém prostoru dokumentace.`
            });

            // Update search index
            if (window.DocBookSearch) {
                window.DocBookSearch.addPage(page);
            }

            // Reload navigation
            await this.loadNavigation();

            // Open the new page
            await this.openPage(page.id);

            // Close modal and reset form
            this.closeModal('newSpaceModal');
            nameInput.value = '';
            descInput.value = '';

            this.showToast('Prostor vytvořen', 'success');
        } catch (error) {
            console.error('[DocBook] Create space error:', error);
            this.showToast('Chyba při vytváření prostoru', 'error');
        }
    }

    /**
     * Create new page
     */
    async createPage() {
        const nameInput = document.getElementById('pageNameInput');
        const parentSelect = document.getElementById('pageParentSelect');

        const title = nameInput.value.trim();
        if (!title) {
            this.showToast('Zadejte název stránky', 'warning');
            nameInput.focus();
            return;
        }

        if (!this.currentSpace) {
            this.showToast('Není vybrán prostor', 'error');
            return;
        }

        try {
            const page = await window.DocBookDB.PageDB.create({
                spaceId: this.currentSpace.id,
                parentId: parentSelect.value ? parseInt(parentSelect.value) : null,
                title,
                content: `# ${title}\n\n`
            });

            // Update search index
            if (window.DocBookSearch) {
                window.DocBookSearch.addPage(page);
            }

            // Reload navigation
            await this.loadNavigation();

            // Open the new page
            await this.openPage(page.id);

            // Close modal and reset form
            this.closeModal('newPageModal');
            nameInput.value = '';
            parentSelect.value = '';

            this.showToast('Stránka vytvořena', 'success');
        } catch (error) {
            console.error('[DocBook] Create page error:', error);
            this.showToast('Chyba při vytváření stránky', 'error');
        }
    }

    /**
     * Populate parent page select
     */
    async populateParentPageSelect(spaceId) {
        const select = document.getElementById('pageParentSelect');
        select.innerHTML = '<option value="">-- Žádná (root stránka) --</option>';

        const pages = await window.DocBookDB.PageDB.getBySpace(spaceId);

        for (const page of pages) {
            select.innerHTML += `<option value="${page.id}">${this.escapeHtml(page.title)}</option>`;
        }
    }

    /**
     * Open page settings
     */
    async openPageSettings() {
        if (!this.currentPage) return;

        const page = this.currentPage;

        document.getElementById('pageSettingsName').value = page.title;
        document.getElementById('pageSettingsSlug').value = page.slug;

        // Populate parent select
        const select = document.getElementById('pageSettingsParent');
        select.innerHTML = '<option value="">-- Žádná (root stránka) --</option>';

        const pages = await window.DocBookDB.PageDB.getBySpace(page.spaceId);
        for (const p of pages) {
            if (p.id !== page.id) { // Exclude current page
                select.innerHTML += `<option value="${p.id}" ${p.id === page.parentId ? 'selected' : ''}>${this.escapeHtml(p.title)}</option>`;
            }
        }

        // Metadata
        document.getElementById('pageCreatedAt').textContent =
            new Date(page.createdAt).toLocaleString();
        document.getElementById('pageUpdatedAt').textContent =
            new Date(page.updatedAt).toLocaleString();
        document.getElementById('pageWordCount').textContent =
            window.DocBookEditor.getWordCount();

        this.openModal('pageSettingsModal');
    }

    /**
     * Save page settings
     */
    async savePageSettings() {
        if (!this.currentPage) return;

        const title = document.getElementById('pageSettingsName').value.trim();
        const slug = document.getElementById('pageSettingsSlug').value.trim();
        const parentId = document.getElementById('pageSettingsParent').value;

        if (!title) {
            this.showToast('Název stránky je povinný', 'warning');
            return;
        }

        try {
            await window.DocBookDB.PageDB.update(this.currentPage.id, {
                title,
                slug: slug || undefined,
                parentId: parentId ? parseInt(parentId) : null
            });

            // Update current page
            this.currentPage.title = title;
            this.currentPage.slug = slug;

            // Update UI
            this.updateBreadcrumb(this.currentPage);
            await this.loadNavigation();

            // Update search index
            window.DocBookSearch.updatePage(this.currentPage);

            this.closeModal('pageSettingsModal');
            this.showToast('Nastavení uloženo', 'success');
        } catch (error) {
            console.error('[DocBook] Save page settings error:', error);
            this.showToast('Chyba při ukládání', 'error');
        }
    }

    /**
     * Confirm delete page
     */
    confirmDeletePage() {
        if (!this.currentPage) return;

        this.deleteTarget = { type: 'page', id: this.currentPage.id, name: this.currentPage.title };
        document.getElementById('deleteWarning').textContent =
            `Opravdu chcete smazat stranku "${this.currentPage.title}"?`;
        this.openModal('deleteModal');
    }

    /**
     * Execute delete
     */
    async executeDelete() {
        if (!this.deleteTarget) return;

        try {
            if (this.deleteTarget.type === 'space') {
                await window.DocBookDB.SpaceDB.delete(this.deleteTarget.id);
            } else if (this.deleteTarget.type === 'page') {
                await window.DocBookDB.PageDB.delete(this.deleteTarget.id);
                window.DocBookSearch.removePage(this.deleteTarget.id);
            }

            // Reload navigation
            await this.loadNavigation();

            // Show welcome if current page was deleted
            if (this.deleteTarget.type === 'page' && this.currentPage?.id === this.deleteTarget.id) {
                this.currentPage = null;
                this.elements.welcomeScreen.style.display = 'flex';
                this.elements.editorScreen.style.display = 'none';
            }

            // Show welcome if current space was deleted
            if (this.deleteTarget.type === 'space' && this.currentSpace?.id === this.deleteTarget.id) {
                this.currentSpace = null;
                this.currentPage = null;
                this.elements.welcomeScreen.style.display = 'flex';
                this.elements.editorScreen.style.display = 'none';
            }

            this.closeModal('deleteModal');
            this.showToast('Smazáno', 'success');
            this.deleteTarget = null;
        } catch (error) {
            console.error('[DocBook] Delete error:', error);
            this.showToast('Chyba při mazání', 'error');
        }
    }

    /**
     * Open settings
     */
    async openSettings() {
        const settings = await window.DocBookDB.SettingsDB.getAll();
        const stats = await window.DocBookDB.DBUtils.getStats();

        // Populate form
        document.getElementById('settingAutoSave').checked = settings.autoSave;
        document.getElementById('settingSpellcheck').checked = settings.spellcheck;
        document.getElementById('settingFontSize').value = settings.fontSize;

        // Populate stats
        document.getElementById('storageSpaces').textContent = stats.spaces;
        document.getElementById('storagePages').textContent = stats.pages;
        document.getElementById('storageSize').textContent = this.formatBytes(stats.storageUsed);

        this.openModal('settingsModal');
    }

    /**
     * Confirm clear all data
     */
    confirmClearAllData() {
        const confirmed = confirm(
            'Opravdu chcete smazat VSECHNA data?\n\n' +
            'Tato akce je nevratna!'
        );

        if (confirmed) {
            this.clearAllData();
        }
    }

    /**
     * Clear all data
     */
    async clearAllData() {
        try {
            await window.DocBookDB.DBUtils.clearAll();
            await window.DocBookSearch.init();

            this.currentSpace = null;
            this.currentPage = null;

            await this.loadNavigation();

            this.elements.welcomeScreen.style.display = 'flex';
            this.elements.editorScreen.style.display = 'none';

            this.closeModal('settingsModal');
            this.showToast('Všechna data smazána', 'success');
        } catch (error) {
            console.error('[DocBook] Clear all data error:', error);
            this.showToast('Chyba při mazání dat', 'error');
        }
    }

    /**
     * Setup search
     */
    setupSearch() {
        // Quick search in sidebar
        this.elements.searchInput?.addEventListener('focus', () => {
            this.openSearch();
        });

        // Search modal
        const modalInput = document.getElementById('modalSearchInput');
        const searchResults = document.getElementById('searchResults');

        modalInput?.addEventListener('input', async () => {
            const query = modalInput.value.trim();

            if (query.length < 2) {
                searchResults.innerHTML = '<div class="search-empty">Zacnete psat pro vyhledavani...</div>';
                return;
            }

            const results = await window.DocBookSearch.search(query);

            if (results.length === 0) {
                searchResults.innerHTML = '<div class="search-empty">Žádné výsledky</div>';
                return;
            }

            searchResults.innerHTML = results.map(r => `
                <a class="search-result-item" data-page-id="${r.id}">
                    <div class="search-result-title">${this.escapeHtml(r.title)}</div>
                    <div class="search-result-path">${r.space?.icon || '📁'} ${this.escapeHtml(r.space?.name || 'Unknown')}</div>
                    <div class="search-result-excerpt">${r.excerpt || ''}</div>
                </a>
            `).join('');

            // Add click handlers
            searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const pageId = parseInt(item.dataset.pageId);
                    await this.openPage(pageId);
                    this.closeModal('searchModal');
                });
            });
        });

        // Close search modal
        document.getElementById('closeSearchModal')?.addEventListener('click', () => {
            this.closeModal('searchModal');
        });
    }

    /**
     * Open search modal
     */
    openSearch() {
        this.openModal('searchModal');
        setTimeout(() => {
            document.getElementById('modalSearchInput')?.focus();
        }, 100);
    }

    /**
     * Setup import drop zone
     */
    setupImportDropZone() {
        const dropZone = document.getElementById('importDropZone');
        const fileInput = document.getElementById('importFileInput');

        if (!dropZone || !fileInput) return;

        dropZone.addEventListener('click', () => fileInput.click());

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

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                await this.importFile(files[0]);
            }
        });

        fileInput.addEventListener('change', async () => {
            if (fileInput.files.length > 0) {
                await this.importFile(fileInput.files[0]);
            }
        });
    }

    /**
     * Import file
     */
    async importFile(file) {
        try {
            const result = await window.DocBookExport.import(file);

            if (result.cancelled) {
                return;
            }

            if (result.success) {
                await this.loadNavigation();

                if (result.pageId) {
                    await this.openPage(result.pageId);
                }

                this.closeModal('importModal');
                this.showToast(`Importováno ${result.spaces} prostorů, ${result.pages} stránek`, 'success');
            }
        } catch (error) {
            console.error('[DocBook] Import error:', error);
            this.showToast(`Chyba importu: ${error.message}`, 'error');
        }
    }

    /**
     * Do export
     */
    async doExport() {
        const scope = document.querySelector('input[name="exportScope"]:checked')?.value || 'all';
        const format = document.querySelector('input[name="exportFormat"]:checked')?.value || 'json';

        const context = {
            spaceId: this.currentSpace?.id,
            pageId: this.currentPage?.id
        };

        try {
            const result = await window.DocBookExport.export(scope, format, context);

            this.closeModal('exportModal');
            this.showToast(`Exportovano: ${result.filename}`, 'success');
        } catch (error) {
            console.error('[DocBook] Export error:', error);
            this.showToast(`Chyba exportu: ${error.message}`, 'error');
        }
    }

    /**
     * Restore last session
     */
    async restoreLastSession() {
        const lastPageId = await window.DocBookDB.SettingsDB.get('lastOpenedPage');

        if (lastPageId) {
            const page = await window.DocBookDB.PageDB.getById(lastPageId);
            if (page) {
                await this.openPage(lastPageId);
                return;
            }
        }

        // Show welcome screen
        this.elements.welcomeScreen.style.display = 'flex';
        this.elements.editorScreen.style.display = 'none';

        // Show stats if data exists
        const stats = await window.DocBookDB.DBUtils.getStats();
        if (stats.spaces > 0 || stats.pages > 0) {
            document.getElementById('welcomeStats').innerHTML = `
                <p>Máte uloženo: ${stats.spaces} prostorů, ${stats.pages} stránek</p>
            `;
        }
    }

    /**
     * Handle URL parameters
     */
    handleURLParams() {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');

        switch (action) {
            case 'new-page':
                if (this.currentSpace) {
                    this.openModal('newPageModal');
                }
                break;
            case 'search':
                this.openSearch();
                break;
        }
    }

    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        this.elements.sidebar.classList.toggle('collapsed');
        window.DocBookDB.SettingsDB.set('sidebarCollapsed',
            this.elements.sidebar.classList.contains('collapsed'));
    }

    /**
     * Open modal
     */
    openModal(modalId) {
        document.getElementById(modalId)?.classList.add('active');
    }

    /**
     * Close modal
     */
    closeModal(modalId) {
        document.getElementById(modalId)?.classList.remove('active');
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${this.escapeHtml(message)}</span>
        `;

        this.elements.toastContainer.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Format bytes
     */
    formatBytes(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.DocBookApp = new DocBookApp();
});

console.log('[DocBook] App module loaded');
