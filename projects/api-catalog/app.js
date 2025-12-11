/**
 * API Katalog - Main Application
 *
 * Offline-first PWA pro prochazeni a spravu katalogu API.
 * Vsechna data jsou ulozena lokalne v IndexedDB.
 *
 * @version 1.0.0
 * @license MIT
 */

// ============================================
// Constants & Configuration
// ============================================

const APP_VERSION = '1.1.0';
const PAGE_SIZE_DEFAULT = 50;

// Category definitions based on API-mega-list analysis
const CATEGORIES = [
    { id: 'automation', name: 'Automation', icon: '&#9881;', color: '#8b5cf6' },
    { id: 'lead-generation', name: 'Lead Generation', icon: '&#128200;', color: '#ec4899' },
    { id: 'social-media', name: 'Social Media', icon: '&#128242;', color: '#06b6d4' },
    { id: 'developer-tools', name: 'Developer Tools', icon: '&#128187;', color: '#10b981' },
    { id: 'ecommerce', name: 'E-commerce', icon: '&#128722;', color: '#f59e0b' },
    { id: 'ai', name: 'AI', icon: '&#129302;', color: '#8b5cf6' },
    { id: 'videos', name: 'Videos', icon: '&#127909;', color: '#ef4444' },
    { id: 'integrations', name: 'Integrations', icon: '&#128279;', color: '#6366f1' },
    { id: 'real-estate', name: 'Real Estate', icon: '&#127968;', color: '#14b8a6' },
    { id: 'jobs', name: 'Jobs', icon: '&#128188;', color: '#f97316' },
    { id: 'open-source', name: 'Open Source', icon: '&#128736;', color: '#22c55e' },
    { id: 'seo-tools', name: 'SEO Tools', icon: '&#128270;', color: '#a855f7' },
    { id: 'agents', name: 'Agents', icon: '&#129302;', color: '#ec4899' },
    { id: 'news', name: 'News', icon: '&#128240;', color: '#3b82f6' },
    { id: 'travel', name: 'Travel', icon: '&#9992;', color: '#06b6d4' },
    { id: 'mcp-servers', name: 'MCP Servers', icon: '&#9889;', color: '#8b5cf6' },
    { id: 'business', name: 'Business', icon: '&#128188;', color: '#64748b' },
    { id: 'other', name: 'Other', icon: '&#128206;', color: '#6b7280' }
];

// ============================================
// Application State
// ============================================

const state = {
    apis: [],
    filteredApis: [],
    favorites: new Set(),
    categories: [],
    currentFilter: 'all',
    currentCategory: null,
    currentSort: 'name-asc',
    searchQuery: '',
    currentPage: 1,
    pageSize: PAGE_SIZE_DEFAULT,
    isLoading: true,
    isOnline: navigator.onLine,
    deferredInstallPrompt: null
};

// ============================================
// DOM Elements
// ============================================

const elements = {};

function initElements() {
    elements.searchInput = document.getElementById('searchInput');
    elements.searchClear = document.getElementById('searchClear');
    elements.apiGrid = document.getElementById('apiGrid');
    elements.categoryFilters = document.getElementById('categoryFilters');
    elements.loadingState = document.getElementById('loadingState');
    elements.emptyState = document.getElementById('emptyState');
    elements.noResults = document.getElementById('noResults');
    elements.loadMore = document.getElementById('loadMore');
    elements.loadMoreInfo = document.getElementById('loadMoreInfo');
    elements.offlineBadge = document.getElementById('offlineBadge');
    elements.toastContainer = document.getElementById('toastContainer');
    elements.installBanner = document.getElementById('installBanner');

    // Stats
    elements.statTotal = document.getElementById('statTotal');
    elements.statCategories = document.getElementById('statCategories');
    elements.statFavorites = document.getElementById('statFavorites');
    elements.statFiltered = document.getElementById('statFiltered');
    elements.footerSync = document.getElementById('footerSync');

    // Modals
    elements.apiDetailModal = document.getElementById('apiDetailModal');
    elements.statsModal = document.getElementById('statsModal');
    elements.settingsModal = document.getElementById('settingsModal');
    elements.importModal = document.getElementById('importModal');
    elements.addApiModal = document.getElementById('addApiModal');
}

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initElements();
    initEventListeners();
    await initApp();
});

async function initApp() {
    try {
        showLoading(true);

        // Load settings
        state.pageSize = await APICatalogDB.SettingsStore.get('pageSize', PAGE_SIZE_DEFAULT);

        // Initialize categories
        await initCategories();

        // Load data
        await loadData();

        // Load favorites
        const favs = await APICatalogDB.FavoritesStore.getAll();
        state.favorites = new Set(favs.map(f => f.apiId));

        // Update UI
        await updateStats();
        renderCategoryFilters();
        applyFilters();

        // Check URL params
        handleUrlParams();

        showLoading(false);

        // Show install banner if applicable
        checkInstallBanner();

    } catch (error) {
        console.error('App initialization failed:', error);
        showLoading(false);
        showToast('Chyba pri inicializaci aplikace', 'error');
    }
}

async function initCategories() {
    const existingCategories = await APICatalogDB.CategoryStore.getAll();

    if (existingCategories.length === 0) {
        // Initialize with default categories
        await APICatalogDB.CategoryStore.bulkPut(CATEGORIES.map(cat => ({
            ...cat,
            count: 0
        })));
    }

    state.categories = await APICatalogDB.CategoryStore.getAll();
}

async function loadData() {
    state.apis = await APICatalogDB.APIStore.getAll();

    if (state.apis.length === 0) {
        elements.emptyState.style.display = 'block';
        elements.apiGrid.style.display = 'none';
    } else {
        elements.emptyState.style.display = 'none';
        elements.apiGrid.style.display = 'grid';
    }
}

// ============================================
// Event Listeners
// ============================================

function initEventListeners() {
    // Search
    elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
    elements.searchClear.addEventListener('click', clearSearch);

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => handleFilterTab(tab.dataset.filter));
    });

    // Sort
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        state.currentSort = e.target.value;
        applyFilters();
    });

    // Header buttons
    document.getElementById('btnImport').addEventListener('click', () => openModal('importModal'));
    document.getElementById('btnExport').addEventListener('click', handleExport);
    document.getElementById('btnStats').addEventListener('click', () => {
        renderStatsModal();
        openModal('statsModal');
    });
    document.getElementById('btnSettings').addEventListener('click', () => openModal('settingsModal'));

    // Empty state buttons
    document.getElementById('btnLoadSample')?.addEventListener('click', loadSampleData);
    document.getElementById('btnImportEmpty')?.addEventListener('click', () => openModal('importModal'));
    document.getElementById('btnClearFilters')?.addEventListener('click', clearFilters);

    // Load more
    document.getElementById('btnLoadMore')?.addEventListener('click', loadMoreApis);

    // FAB
    document.getElementById('fabAdd')?.addEventListener('click', () => {
        renderAddApiModal();
        openModal('addApiModal');
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            if (modal) closeModal(modal.id);
        });
    });

    // Modal overlay clicks
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });

    // API Detail Modal buttons
    document.getElementById('modalBtnClose')?.addEventListener('click', () => closeModal('apiDetailModal'));

    // Settings
    document.getElementById('settingPageSize')?.addEventListener('change', async (e) => {
        state.pageSize = parseInt(e.target.value);
        await APICatalogDB.SettingsStore.set('pageSize', state.pageSize);
        applyFilters();
    });

    document.getElementById('btnClearData')?.addEventListener('click', handleClearData);
    document.getElementById('btnClearCache')?.addEventListener('click', handleClearCache);

    // Import
    initImportHandlers();

    // Add API form
    document.getElementById('addApiForm')?.addEventListener('submit', handleAddApi);
    document.getElementById('btnCancelAdd')?.addEventListener('click', () => closeModal('addApiModal'));

    // Install banner
    document.getElementById('btnInstall')?.addEventListener('click', handleInstall);
    document.getElementById('btnDismissInstall')?.addEventListener('click', dismissInstallBanner);

    // Online/offline status
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        state.deferredInstallPrompt = e;
        checkInstallBanner();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function initImportHandlers() {
    const dropzone = document.getElementById('importDropzone');
    const fileInput = document.getElementById('importFile');

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleFileImport(file);
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileImport(file);
    });
}

// ============================================
// Search & Filter
// ============================================

function handleSearch(e) {
    state.searchQuery = e?.target?.value || elements.searchInput.value;
    elements.searchClear.style.display = state.searchQuery ? 'flex' : 'none';
    state.currentPage = 1;
    applyFilters();
}

function clearSearch() {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.searchClear.style.display = 'none';
    state.currentPage = 1;
    applyFilters();
}

function handleFilterTab(filter) {
    state.currentFilter = filter;
    state.currentPage = 1;

    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === filter);
    });

    applyFilters();
}

function handleCategoryFilter(categoryId) {
    state.currentCategory = state.currentCategory === categoryId ? null : categoryId;
    state.currentPage = 1;

    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.category === state.currentCategory);
    });

    applyFilters();
}

function clearFilters() {
    state.currentFilter = 'all';
    state.currentCategory = null;
    state.searchQuery = '';
    state.currentPage = 1;
    elements.searchInput.value = '';
    elements.searchClear.style.display = 'none';

    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === 'all');
    });

    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.remove('active');
    });

    applyFilters();
}

function applyFilters() {
    let filtered = [...state.apis];

    // Filter by favorites
    if (state.currentFilter === 'favorites') {
        filtered = filtered.filter(api => state.favorites.has(api.id));
    }

    // Filter by category
    if (state.currentCategory) {
        filtered = filtered.filter(api => api.category === state.currentCategory);
    }

    // Filter by search
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(api => {
            const searchText = [
                api.name,
                api.description,
                api.category,
                ...(api.tags || [])
            ].join(' ').toLowerCase();
            return searchText.includes(query);
        });
    }

    // Sort
    filtered = sortApis(filtered, state.currentSort);

    state.filteredApis = filtered;

    // Update stats
    elements.statFiltered.textContent = filtered.length;

    // Render
    renderApiGrid();
}

function sortApis(apis, sortKey) {
    const sorted = [...apis];

    switch (sortKey) {
        case 'name-asc':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            sorted.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'category':
            sorted.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
            break;
        case 'date-desc':
            sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            break;
        case 'date-asc':
            sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
            break;
    }

    return sorted;
}

// ============================================
// Rendering
// ============================================

function renderApiGrid() {
    const startIndex = 0;
    const endIndex = state.currentPage * state.pageSize;
    const apisToShow = state.filteredApis.slice(startIndex, endIndex);

    if (state.filteredApis.length === 0 && state.apis.length > 0) {
        elements.apiGrid.style.display = 'none';
        elements.noResults.style.display = 'block';
        elements.loadMore.style.display = 'none';
        return;
    }

    elements.noResults.style.display = 'none';
    elements.apiGrid.style.display = 'grid';

    elements.apiGrid.innerHTML = apisToShow.map(api => renderApiCard(api)).join('');

    // Add event listeners to cards
    elements.apiGrid.querySelectorAll('.api-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.api-favorite-btn')) {
                openApiDetail(card.dataset.id);
            }
        });
    });

    // Add event listeners to favorite buttons
    elements.apiGrid.querySelectorAll('.api-favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(btn.dataset.id);
        });
    });

    // Show/hide load more
    if (state.filteredApis.length > endIndex) {
        elements.loadMore.style.display = 'flex';
        elements.loadMoreInfo.textContent =
            `Zobrazeno ${endIndex} z ${state.filteredApis.length}`;
    } else {
        elements.loadMore.style.display = 'none';
    }
}

function renderApiCard(api) {
    const isFavorite = state.favorites.has(api.id);
    const category = state.categories.find(c => c.id === api.category);
    const categoryIcon = category?.icon || '&#128206;';

    const tags = (api.tags || []).slice(0, 3).map(tag =>
        `<span class="api-tag">${escapeHtml(tag)}</span>`
    ).join('');

    return `
        <article class="api-card ${isFavorite ? 'favorite' : ''}" data-id="${api.id}">
            <div class="api-card-header">
                <div class="api-card-title">
                    <div class="api-icon">${categoryIcon}</div>
                    <h3 class="api-name">${escapeHtml(api.name)}</h3>
                </div>
                <button class="api-favorite-btn ${isFavorite ? 'active' : ''}" data-id="${api.id}" title="${isFavorite ? 'Odebrat z oblibenych' : 'Pridat do oblibenych'}">
                    ${isFavorite ? '&#9733;' : '&#9734;'}
                </button>
            </div>
            ${api.author ? `<div class="api-author">&#128100; ${escapeHtml(api.author)}</div>` : ''}
            <p class="api-description">${escapeHtml(api.description || 'Bez popisu')}</p>
            ${tags ? `<div class="api-tags">${tags}</div>` : ''}
            <div class="api-card-footer">
                <span class="api-category">${escapeHtml(category?.name || api.category || 'other')}</span>
                ${api.platform ? `<span class="api-platform">&#9889; ${escapeHtml(api.platform)}</span>` : ''}
                ${api.pricing ? `<span class="api-pricing">&#128176; ${escapeHtml(api.pricing)}</span>` : ''}
            </div>
        </article>
    `;
}

function renderCategoryFilters() {
    // Calculate counts
    const counts = {};
    state.apis.forEach(api => {
        const cat = api.category || 'other';
        counts[cat] = (counts[cat] || 0) + 1;
    });

    const categoriesWithCount = state.categories
        .map(cat => ({ ...cat, count: counts[cat.id] || 0 }))
        .filter(cat => cat.count > 0)
        .sort((a, b) => b.count - a.count);

    elements.categoryFilters.innerHTML = categoriesWithCount.map(cat => `
        <button class="category-chip ${state.currentCategory === cat.id ? 'active' : ''}"
                data-category="${cat.id}">
            <span>${cat.icon}</span>
            <span>${escapeHtml(cat.name)}</span>
            <span class="category-count">${cat.count}</span>
        </button>
    `).join('');

    // Add event listeners
    elements.categoryFilters.querySelectorAll('.category-chip').forEach(chip => {
        chip.addEventListener('click', () => handleCategoryFilter(chip.dataset.category));
    });
}

function loadMoreApis() {
    state.currentPage++;
    renderApiGrid();
}

// ============================================
// API Detail Modal
// ============================================

async function openApiDetail(apiId) {
    const api = await APICatalogDB.APIStore.getById(apiId);
    if (!api) return;

    const isFavorite = state.favorites.has(api.id);
    const category = state.categories.find(c => c.id === api.category);

    document.getElementById('modalApiName').textContent = api.name;

    const tags = (api.tags || []).map(tag =>
        `<span class="api-tag">${escapeHtml(tag)}</span>`
    ).join('');

    document.getElementById('modalApiBody').innerHTML = `
        <div class="api-detail">
            <div class="api-detail-header">
                <div class="api-detail-icon">${category?.icon || '&#128206;'}</div>
                <div class="api-detail-info">
                    <h3>${escapeHtml(api.name)}</h3>
                    <p class="api-detail-category">${escapeHtml(category?.name || 'Ostatni')}</p>
                </div>
            </div>

            ${api.author ? `
                <div class="api-detail-section api-detail-author">
                    <span class="author-badge">&#128100; Autor: <strong>${escapeHtml(api.author)}</strong></span>
                </div>
            ` : ''}

            ${api.description ? `
                <div class="api-detail-section">
                    <h4>&#128221; Popis</h4>
                    <p>${escapeHtml(api.description)}</p>
                </div>
            ` : ''}

            <div class="api-detail-grid">
                ${api.platform ? `
                    <div class="api-detail-card">
                        <div class="detail-card-icon">&#9889;</div>
                        <div class="detail-card-label">Platforma</div>
                        <div class="detail-card-value">${escapeHtml(api.platform)}</div>
                    </div>
                ` : ''}

                ${api.pricing ? `
                    <div class="api-detail-card">
                        <div class="detail-card-icon">&#128176;</div>
                        <div class="detail-card-label">Cena</div>
                        <div class="detail-card-value">${escapeHtml(api.pricing)}</div>
                    </div>
                ` : ''}

                ${category ? `
                    <div class="api-detail-card">
                        <div class="detail-card-icon">${category.icon}</div>
                        <div class="detail-card-label">Kategorie</div>
                        <div class="detail-card-value">${escapeHtml(category.name)}</div>
                    </div>
                ` : ''}
            </div>

            ${api.tags?.length ? `
                <div class="api-detail-section">
                    <h4>&#127991; Tagy</h4>
                    <div class="api-detail-tags">${tags}</div>
                </div>
            ` : ''}

            <div class="api-detail-section api-detail-links">
                <h4>&#128279; Odkazy</h4>
                <div class="api-links-grid">
                    ${api.url ? `
                        <a href="${escapeHtml(api.url)}" target="_blank" rel="noopener" class="api-link-btn primary">
                            <span>&#128279;</span> Otevrit API
                        </a>
                    ` : ''}
                    ${api.documentation ? `
                        <a href="${escapeHtml(api.documentation)}" target="_blank" rel="noopener" class="api-link-btn secondary">
                            <span>&#128214;</span> Dokumentace
                        </a>
                    ` : ''}
                    ${api.docsUrl ? `
                        <a href="${escapeHtml(api.docsUrl)}" target="_blank" rel="noopener" class="api-link-btn secondary">
                            <span>&#128214;</span> Dokumentace
                        </a>
                    ` : ''}
                </div>
            </div>

            <div class="api-detail-section api-detail-meta">
                <h4>&#128736; Metadata</h4>
                <div class="meta-grid">
                    <div class="meta-item">
                        <span class="meta-label">ID</span>
                        <span class="meta-value">${escapeHtml(api.id)}</span>
                    </div>
                    ${api.sourceUrl ? `
                        <div class="meta-item">
                            <span class="meta-label">Zdrojova URL</span>
                            <a href="${escapeHtml(api.sourceUrl)}" target="_blank" rel="noopener" class="meta-value meta-link">${escapeHtml(api.sourceUrl)}</a>
                        </div>
                    ` : ''}
                    ${api.scrapedAt ? `
                        <div class="meta-item">
                            <span class="meta-label">Scrapovano</span>
                            <span class="meta-value">${formatDate(api.scrapedAt)}</span>
                        </div>
                    ` : ''}
                    ${api.createdAt ? `
                        <div class="meta-item">
                            <span class="meta-label">Vytvoreno</span>
                            <span class="meta-value">${formatDate(api.createdAt)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    // Update favorite button
    const favBtn = document.getElementById('modalBtnFavorite');
    favBtn.innerHTML = isFavorite
        ? '<span>&#9733;</span> Odebrat z oblibenych'
        : '<span>&#9734;</span> Pridat do oblibenych';
    favBtn.onclick = () => {
        toggleFavorite(apiId);
        openApiDetail(apiId); // Refresh modal
    };

    openModal('apiDetailModal');
}

// ============================================
// Stats Modal
// ============================================

async function renderStatsModal() {
    const stats = await APICatalogDB.DBStats.getStats();

    // Sort categories by count
    const sortedCategories = Object.entries(stats.byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const maxCount = sortedCategories[0]?.[1] || 1;

    const categoryBars = sortedCategories.map(([cat, count]) => {
        const category = state.categories.find(c => c.id === cat);
        const percentage = (count / maxCount) * 100;
        return `
            <div class="stats-bar-item">
                <span class="stats-bar-label" title="${category?.name || cat}">${category?.name || cat}</span>
                <div class="stats-bar-track">
                    <div class="stats-bar-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="stats-bar-value">${count}</span>
            </div>
        `;
    }).join('');

    document.getElementById('statsModalBody').innerHTML = `
        <div class="stats-grid">
            <div class="stats-card">
                <div class="stats-card-value">${stats.totalApis.toLocaleString()}</div>
                <div class="stats-card-label">Celkem API</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-value">${stats.totalCategories}</div>
                <div class="stats-card-label">Kategorii</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-value">${stats.totalFavorites}</div>
                <div class="stats-card-label">Oblibenych</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-value">${Object.keys(stats.byPlatform).length}</div>
                <div class="stats-card-label">Platforem</div>
            </div>
        </div>

        <div class="stats-chart">
            <h4>Top 10 kategorii</h4>
            <div class="stats-bar-chart">
                ${categoryBars}
            </div>
        </div>
    `;
}

// ============================================
// Add API Modal
// ============================================

function renderAddApiModal() {
    const categorySelect = document.getElementById('apiCategory');
    categorySelect.innerHTML = '<option value="">Vyberte kategorii</option>' +
        state.categories.map(cat =>
            `<option value="${cat.id}">${cat.name}</option>`
        ).join('');
}

async function handleAddApi(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    const api = {
        name: document.getElementById('apiName').value.trim(),
        description: document.getElementById('apiDescription').value.trim(),
        category: document.getElementById('apiCategory').value,
        platform: document.getElementById('apiPlatform').value.trim(),
        url: document.getElementById('apiUrl').value.trim(),
        docsUrl: document.getElementById('apiDocs').value.trim(),
        tags: document.getElementById('apiTags').value
            .split(',')
            .map(t => t.trim())
            .filter(t => t)
    };

    if (!api.name || !api.category) {
        showToast('Vyplnte povinne pole', 'error');
        return;
    }

    try {
        await APICatalogDB.APIStore.put(api);
        await loadData();
        await updateStats();
        renderCategoryFilters();
        applyFilters();

        closeModal('addApiModal');
        form.reset();
        showToast('API bylo pridano', 'success');
    } catch (error) {
        console.error('Error adding API:', error);
        showToast('Chyba pri pridavani API', 'error');
    }
}

// ============================================
// Favorites
// ============================================

async function toggleFavorite(apiId) {
    try {
        const isNowFavorite = await APICatalogDB.FavoritesStore.toggle(apiId);

        if (isNowFavorite) {
            state.favorites.add(apiId);
            showToast('Pridano do oblibenych', 'success');
        } else {
            state.favorites.delete(apiId);
            showToast('Odebrano z oblibenych', 'info');
        }

        await updateStats();

        // Re-render if showing favorites
        if (state.currentFilter === 'favorites') {
            applyFilters();
        } else {
            // Just update the card
            const card = elements.apiGrid.querySelector(`[data-id="${apiId}"]`);
            if (card) {
                card.classList.toggle('favorite', isNowFavorite);
                const btn = card.querySelector('.api-favorite-btn');
                if (btn) {
                    btn.classList.toggle('active', isNowFavorite);
                    btn.innerHTML = isNowFavorite ? '&#9733;' : '&#9734;';
                }
            }
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showToast('Chyba pri ukladani', 'error');
    }
}

// ============================================
// Import / Export
// ============================================

async function handleExport() {
    try {
        await APICatalogDB.DataExport.downloadExport();
        showToast('Export dokoncen', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Chyba pri exportu', 'error');
    }
}

async function handleFileImport(file) {
    if (!file.name.endsWith('.json')) {
        showToast('Podporovany je pouze JSON format', 'error');
        return;
    }

    const importStatus = document.getElementById('importStatus');
    const importMessage = document.getElementById('importMessage');

    importStatus.style.display = 'block';
    importMessage.textContent = 'Nacitam soubor...';

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        const clearExisting = document.getElementById('importClear').checked;

        importMessage.textContent = 'Importuji data...';

        const stats = await APICatalogDB.DataExport.importAll(data, clearExisting);

        await loadData();
        await updateStats();
        renderCategoryFilters();
        applyFilters();

        importMessage.textContent = `Import dokoncen: ${stats.apis} API, ${stats.categories} kategorii`;

        setTimeout(() => {
            closeModal('importModal');
            importStatus.style.display = 'none';
        }, 2000);

        showToast(`Importovano ${stats.apis} API`, 'success');
    } catch (error) {
        console.error('Import error:', error);
        importMessage.textContent = 'Chyba pri importu: ' + error.message;
        showToast('Chyba pri importu', 'error');
    }
}

// ============================================
// Sample Data
// ============================================

async function loadSampleData() {
    showLoading(true);

    try {
        // Try to load real data from JSON file first
        const response = await fetch('./data/api-catalog-data.json');

        if (response.ok) {
            const jsonData = await response.json();
            const apis = jsonData.data?.apis || [];

            if (apis.length > 0) {
                await APICatalogDB.APIStore.bulkPut(apis);
                await APICatalogDB.SyncStore.setLastSync();

                await loadData();
                await updateStats();
                renderCategoryFilters();
                applyFilters();

                showToast(`Nacteno ${apis.length} API z katalogu`, 'success');
                showLoading(false);
                return;
            }
        }

        // Fallback to sample data if JSON not available
        const sampleApis = generateSampleApis();

        await APICatalogDB.APIStore.bulkPut(sampleApis);
        await APICatalogDB.SyncStore.setLastSync();

        await loadData();
        await updateStats();
        renderCategoryFilters();
        applyFilters();

        showToast(`Nacteno ${sampleApis.length} ukazkovych API`, 'success');
    } catch (error) {
        console.error('Error loading sample data:', error);
        showToast('Chyba pri nacitani dat', 'error');
    }

    showLoading(false);
}

function generateSampleApis() {
    // Generate sample APIs based on analysis categories
    const sampleData = [];

    const templates = [
        // Automation
        { category: 'automation', name: 'Web Scraper Pro', description: 'Univerzalni scraper pro webove stranky s podporou JavaScript renderingu', platform: 'Apify', tags: ['scraper', 'web', 'automation'] },
        { category: 'automation', name: 'Form Filler Bot', description: 'Automaticke vyplnovani formularu na webech', platform: 'Apify', tags: ['automation', 'forms', 'bot'] },
        { category: 'automation', name: 'Screenshot Capture', description: 'Zachytavani screenshotu webovych stranek v ruznych rozlisenich', platform: 'Apify', tags: ['screenshot', 'capture', 'web'] },
        { category: 'automation', name: 'PDF Generator', description: 'Generovani PDF dokumentu z webovych stranek', platform: 'Apify', tags: ['pdf', 'generator', 'document'] },
        { category: 'automation', name: 'Email Extractor', description: 'Extrakce emailovych adres z webovych stranek', platform: 'Apify', tags: ['email', 'extractor', 'scraper'] },

        // Social Media
        { category: 'social-media', name: 'Instagram Profile Scraper', description: 'Scraper pro ziskani dat z Instagram profilu', platform: 'Apify', tags: ['instagram', 'social', 'scraper'] },
        { category: 'social-media', name: 'Twitter Data Extractor', description: 'Extrakce tweetu a informaci z Twitter', platform: 'Apify', tags: ['twitter', 'social', 'data'] },
        { category: 'social-media', name: 'LinkedIn Company Scraper', description: 'Scraper firemních profilu na LinkedIn', platform: 'Apify', tags: ['linkedin', 'company', 'scraper'] },
        { category: 'social-media', name: 'TikTok Video Downloader', description: 'Stahovani videi z TikTok bez vodoznaku', platform: 'Apify', tags: ['tiktok', 'video', 'downloader'] },
        { category: 'social-media', name: 'Facebook Page Analyzer', description: 'Analyza Facebook stranek a jejich metriky', platform: 'Apify', tags: ['facebook', 'analytics', 'social'] },

        // E-commerce
        { category: 'ecommerce', name: 'Amazon Product Scraper', description: 'Extrakce produktovych dat z Amazon', platform: 'Apify', tags: ['amazon', 'products', 'ecommerce'] },
        { category: 'ecommerce', name: 'eBay Listings Monitor', description: 'Sledovani nabidek na eBay v realnem case', platform: 'Apify', tags: ['ebay', 'monitor', 'listings'] },
        { category: 'ecommerce', name: 'Price Tracker Universal', description: 'Sledovani cen produktu na vice eshopech', platform: 'Apify', tags: ['price', 'tracker', 'compare'] },
        { category: 'ecommerce', name: 'Aliexpress Product Data', description: 'Scraper produktovych dat z Aliexpress', platform: 'Apify', tags: ['aliexpress', 'products', 'china'] },
        { category: 'ecommerce', name: 'Shopify Store Scraper', description: 'Extrakce dat z Shopify obchodu', platform: 'Apify', tags: ['shopify', 'store', 'scraper'] },

        // AI
        { category: 'ai', name: 'AI Web Scraper', description: 'Inteligentni scraper vyuzivajici AI pro extrakci dat', platform: 'Apify', tags: ['ai', 'scraper', 'intelligent'] },
        { category: 'ai', name: 'GPT Content Generator', description: 'Generovani obsahu pomoci GPT modelu', platform: 'Apify', tags: ['gpt', 'content', 'generator'] },
        { category: 'ai', name: 'Image Recognition API', description: 'Rozpoznavani obrazu a objektu pomoci AI', platform: 'Apify', tags: ['image', 'recognition', 'vision'] },
        { category: 'ai', name: 'Sentiment Analyzer', description: 'Analyza sentimentu textu pomoci NLP', platform: 'Apify', tags: ['sentiment', 'nlp', 'analysis'] },
        { category: 'ai', name: 'AI Text Summarizer', description: 'Automaticka sumarizace dlouhych textu', platform: 'Apify', tags: ['summary', 'text', 'ai'] },

        // Developer Tools
        { category: 'developer-tools', name: 'GitHub Repository Scraper', description: 'Extrakce dat z GitHub repozitaru', platform: 'Apify', tags: ['github', 'repository', 'code'] },
        { category: 'developer-tools', name: 'API Health Checker', description: 'Monitorovani dostupnosti API endpointu', platform: 'Apify', tags: ['api', 'health', 'monitor'] },
        { category: 'developer-tools', name: 'JSON Validator Pro', description: 'Validace a formatovani JSON dat', platform: 'REST', tags: ['json', 'validator', 'format'] },
        { category: 'developer-tools', name: 'Code Documentation Gen', description: 'Automaticke generovani dokumentace kodu', platform: 'Apify', tags: ['docs', 'code', 'generator'] },
        { category: 'developer-tools', name: 'Dependency Checker', description: 'Analyza zavislosti v projektech', platform: 'REST', tags: ['dependencies', 'analysis', 'security'] },

        // SEO Tools
        { category: 'seo-tools', name: 'SEO Audit Tool', description: 'Komplexni SEO audit webu', platform: 'Apify', tags: ['seo', 'audit', 'analysis'] },
        { category: 'seo-tools', name: 'Keyword Research API', description: 'Vyhledavani klicovych slov a jejich metrik', platform: 'Apify', tags: ['keywords', 'research', 'seo'] },
        { category: 'seo-tools', name: 'Backlink Analyzer', description: 'Analyza zpetnych odkazu webu', platform: 'Apify', tags: ['backlinks', 'analysis', 'seo'] },
        { category: 'seo-tools', name: 'SERP Position Tracker', description: 'Sledovani pozic ve vysledcich vyhledavani', platform: 'Apify', tags: ['serp', 'position', 'tracking'] },
        { category: 'seo-tools', name: 'Site Speed Analyzer', description: 'Mereni rychlosti nacitani webu', platform: 'REST', tags: ['speed', 'performance', 'web'] },

        // Lead Generation
        { category: 'lead-generation', name: 'Company Contact Finder', description: 'Hledani kontaktnich udaju firem', platform: 'Apify', tags: ['contacts', 'company', 'leads'] },
        { category: 'lead-generation', name: 'Email Verifier Pro', description: 'Overeni platnosti emailovych adres', platform: 'REST', tags: ['email', 'verify', 'validation'] },
        { category: 'lead-generation', name: 'LinkedIn Lead Generator', description: 'Generovani leadu z LinkedIn', platform: 'Apify', tags: ['linkedin', 'leads', 'b2b'] },
        { category: 'lead-generation', name: 'Business Directory Scraper', description: 'Scraper firemních katalogů', platform: 'Apify', tags: ['directory', 'business', 'scraper'] },
        { category: 'lead-generation', name: 'Contact Enrichment API', description: 'Obohaceni kontaktnich dat o dalsi informace', platform: 'REST', tags: ['enrichment', 'data', 'contacts'] },

        // Videos
        { category: 'videos', name: 'YouTube Video Scraper', description: 'Extrakce metadat z YouTube videi', platform: 'Apify', tags: ['youtube', 'video', 'metadata'] },
        { category: 'videos', name: 'Video Transcription API', description: 'Prevod videa na text s podporou vice jazyku', platform: 'REST', tags: ['transcription', 'video', 'text'] },
        { category: 'videos', name: 'Vimeo Data Extractor', description: 'Extrakce dat z Vimeo videi', platform: 'Apify', tags: ['vimeo', 'video', 'data'] },
        { category: 'videos', name: 'Video Thumbnail Generator', description: 'Generovani nahledu z videi', platform: 'REST', tags: ['thumbnail', 'video', 'image'] },
        { category: 'videos', name: 'Streaming Platform Monitor', description: 'Monitorovani obsahu na streamovacich platformach', platform: 'Apify', tags: ['streaming', 'monitor', 'video'] },

        // Jobs
        { category: 'jobs', name: 'Indeed Job Scraper', description: 'Scraper pracovnich nabidek z Indeed', platform: 'Apify', tags: ['indeed', 'jobs', 'scraper'] },
        { category: 'jobs', name: 'LinkedIn Jobs Extractor', description: 'Extrakce pracovnich nabidek z LinkedIn', platform: 'Apify', tags: ['linkedin', 'jobs', 'career'] },
        { category: 'jobs', name: 'Glassdoor Company Data', description: 'Data o firmach a recenze z Glassdoor', platform: 'Apify', tags: ['glassdoor', 'company', 'reviews'] },
        { category: 'jobs', name: 'Resume Parser API', description: 'Parsovani zivotopisu do strukturovanych dat', platform: 'REST', tags: ['resume', 'parser', 'hr'] },
        { category: 'jobs', name: 'Salary Data Aggregator', description: 'Agregace dat o platech v ruznych oborech', platform: 'Apify', tags: ['salary', 'data', 'jobs'] },

        // News
        { category: 'news', name: 'News Article Scraper', description: 'Scraper clanku z zpravodajskych webu', platform: 'Apify', tags: ['news', 'articles', 'scraper'] },
        { category: 'news', name: 'RSS Feed Aggregator', description: 'Agregace RSS feedu z vice zdroju', platform: 'REST', tags: ['rss', 'feed', 'aggregator'] },
        { category: 'news', name: 'Google News Extractor', description: 'Extrakce zprav z Google News', platform: 'Apify', tags: ['google', 'news', 'extractor'] },
        { category: 'news', name: 'Media Monitoring Tool', description: 'Monitorovani zminek v mediich', platform: 'Apify', tags: ['media', 'monitoring', 'mentions'] },
        { category: 'news', name: 'Trending Topics API', description: 'Sledovani trendujicich temat v realnem case', platform: 'REST', tags: ['trending', 'topics', 'realtime'] },

        // Real Estate
        { category: 'real-estate', name: 'Property Listing Scraper', description: 'Scraper nemovitostních nabídek', platform: 'Apify', tags: ['property', 'listing', 'scraper'] },
        { category: 'real-estate', name: 'Zillow Data Extractor', description: 'Extrakce dat z Zillow', platform: 'Apify', tags: ['zillow', 'real-estate', 'usa'] },
        { category: 'real-estate', name: 'Airbnb Listing Monitor', description: 'Monitorovani Airbnb nabidek', platform: 'Apify', tags: ['airbnb', 'monitor', 'rental'] },
        { category: 'real-estate', name: 'Property Value Estimator', description: 'Odhad hodnoty nemovitosti', platform: 'REST', tags: ['value', 'estimate', 'property'] },
        { category: 'real-estate', name: 'Neighborhood Data API', description: 'Data o lokalitach a okolí', platform: 'REST', tags: ['neighborhood', 'location', 'data'] },

        // Integrations
        { category: 'integrations', name: 'Zapier Webhook Handler', description: 'Zpracovani webhooku z Zapier', platform: 'REST', tags: ['zapier', 'webhook', 'integration'] },
        { category: 'integrations', name: 'Google Sheets Sync', description: 'Synchronizace dat s Google Sheets', platform: 'Apify', tags: ['google', 'sheets', 'sync'] },
        { category: 'integrations', name: 'Slack Notification Bot', description: 'Odesilani notifikaci do Slack', platform: 'REST', tags: ['slack', 'notification', 'bot'] },
        { category: 'integrations', name: 'Airtable Connector', description: 'Integrace s Airtable databazi', platform: 'REST', tags: ['airtable', 'database', 'connector'] },
        { category: 'integrations', name: 'Discord Webhook API', description: 'Integrace s Discord pres webhooky', platform: 'REST', tags: ['discord', 'webhook', 'messaging'] },

        // MCP Servers
        { category: 'mcp-servers', name: 'Context7 MCP Server', description: 'MCP server pro aktualni dokumentaci', platform: 'MCP', tags: ['mcp', 'context', 'docs'] },
        { category: 'mcp-servers', name: 'Calculator MCP Server', description: 'MCP server pro matematicke vypocty', platform: 'MCP', tags: ['mcp', 'calculator', 'math'] },
        { category: 'mcp-servers', name: 'GitHub MCP Server', description: 'MCP server pro praci s GitHub', platform: 'MCP', tags: ['mcp', 'github', 'code'] },
        { category: 'mcp-servers', name: 'Figma MCP Server', description: 'MCP server pro Figma integrace', platform: 'MCP', tags: ['mcp', 'figma', 'design'] },
        { category: 'mcp-servers', name: 'Database MCP Server', description: 'MCP server pro databazove operace', platform: 'MCP', tags: ['mcp', 'database', 'sql'] },

        // Agents
        { category: 'agents', name: 'Company Research Agent', description: 'AI agent pro vyzkum firem', platform: 'Apify', tags: ['agent', 'research', 'company'] },
        { category: 'agents', name: 'Job Search Agent', description: 'AI agent pro hledani prace', platform: 'Apify', tags: ['agent', 'jobs', 'search'] },
        { category: 'agents', name: 'Content Writer Agent', description: 'AI agent pro psani obsahu', platform: 'Apify', tags: ['agent', 'content', 'writer'] },
        { category: 'agents', name: 'Data Analysis Agent', description: 'AI agent pro analyzu dat', platform: 'Apify', tags: ['agent', 'analysis', 'data'] },
        { category: 'agents', name: 'Customer Support Agent', description: 'AI agent pro zakaznickou podporu', platform: 'Apify', tags: ['agent', 'support', 'customer'] },

        // Travel
        { category: 'travel', name: 'Flight Price Tracker', description: 'Sledovani cen letenek', platform: 'Apify', tags: ['flights', 'price', 'travel'] },
        { category: 'travel', name: 'Hotel Booking Scraper', description: 'Scraper hotelových rezervací', platform: 'Apify', tags: ['hotel', 'booking', 'scraper'] },
        { category: 'travel', name: 'TripAdvisor Reviews', description: 'Extrakce recenzi z TripAdvisor', platform: 'Apify', tags: ['tripadvisor', 'reviews', 'travel'] },
        { category: 'travel', name: 'Google Maps Places', description: 'Extrakce mist z Google Maps', platform: 'Apify', tags: ['google', 'maps', 'places'] },
        { category: 'travel', name: 'Event Finder API', description: 'Hledani udalosti a akci v lokaci', platform: 'REST', tags: ['events', 'finder', 'local'] },

        // Open Source
        { category: 'open-source', name: 'NPM Package Analyzer', description: 'Analyza NPM balicku a jejich metrik', platform: 'REST', tags: ['npm', 'package', 'analysis'] },
        { category: 'open-source', name: 'PyPI Package Data', description: 'Data o Python balicích z PyPI', platform: 'REST', tags: ['pypi', 'python', 'package'] },
        { category: 'open-source', name: 'Docker Hub Scraper', description: 'Scraper Docker obrazu z Docker Hub', platform: 'Apify', tags: ['docker', 'hub', 'images'] },
        { category: 'open-source', name: 'Stack Overflow Monitor', description: 'Monitorovani otazek na Stack Overflow', platform: 'Apify', tags: ['stackoverflow', 'questions', 'dev'] },
        { category: 'open-source', name: 'Open Source License Checker', description: 'Kontrola licenci open source projektu', platform: 'REST', tags: ['license', 'opensource', 'compliance'] },

        // Other
        { category: 'other', name: 'Weather Data API', description: 'Aktualni a historicka data o pocasi', platform: 'REST', tags: ['weather', 'data', 'forecast'] },
        { category: 'other', name: 'Currency Exchange Rates', description: 'Aktualni kurzy men', platform: 'REST', tags: ['currency', 'exchange', 'rates'] },
        { category: 'other', name: 'Crypto Price Tracker', description: 'Sledovani cen kryptomen', platform: 'REST', tags: ['crypto', 'price', 'bitcoin'] },
        { category: 'other', name: 'QR Code Generator', description: 'Generovani QR kodu', platform: 'REST', tags: ['qr', 'generator', 'code'] },
        { category: 'other', name: 'URL Shortener API', description: 'Zkracovani URL adres', platform: 'REST', tags: ['url', 'shortener', 'link'] }
    ];

    return templates;
}

// ============================================
// Settings Actions
// ============================================

async function handleClearData() {
    if (!confirm('Opravdu chcete smazat vsechna data? Tato akce je nevratna.')) {
        return;
    }

    try {
        await APICatalogDB.APIStore.clear();
        await APICatalogDB.CategoryStore.clear();

        state.apis = [];
        state.filteredApis = [];
        state.favorites.clear();

        await initCategories();
        await updateStats();
        renderCategoryFilters();
        renderApiGrid();

        elements.emptyState.style.display = 'block';
        elements.apiGrid.style.display = 'none';

        closeModal('settingsModal');
        showToast('Vsechna data byla smazana', 'success');
    } catch (error) {
        console.error('Error clearing data:', error);
        showToast('Chyba pri mazani dat', 'error');
    }
}

async function handleClearCache() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const channel = new MessageChannel();

        channel.port1.onmessage = (e) => {
            if (e.data.success) {
                showToast('Cache byla vycistena', 'success');
            }
        };

        navigator.serviceWorker.controller.postMessage(
            { action: 'clearCache' },
            [channel.port2]
        );
    } else {
        showToast('Service Worker neni aktivni', 'warning');
    }
}

// ============================================
// Online/Offline Status
// ============================================

function handleOnlineStatus() {
    state.isOnline = navigator.onLine;
    elements.offlineBadge.style.display = state.isOnline ? 'none' : 'flex';

    if (state.isOnline) {
        showToast('Pripojeni obnoveno', 'success');
    } else {
        showToast('Offline rezim', 'warning');
    }
}

// ============================================
// PWA Install
// ============================================

function checkInstallBanner() {
    if (state.deferredInstallPrompt) {
        const dismissed = localStorage.getItem('installBannerDismissed');
        if (!dismissed) {
            elements.installBanner.style.display = 'block';
        }
    }
}

async function handleInstall() {
    if (!state.deferredInstallPrompt) return;

    state.deferredInstallPrompt.prompt();
    const { outcome } = await state.deferredInstallPrompt.userChoice;

    if (outcome === 'accepted') {
        showToast('Aplikace byla nainstalovana', 'success');
    }

    state.deferredInstallPrompt = null;
    elements.installBanner.style.display = 'none';
}

function dismissInstallBanner() {
    elements.installBanner.style.display = 'none';
    localStorage.setItem('installBannerDismissed', 'true');
}

// ============================================
// URL Parameters
// ============================================

function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('filter')) {
        const filter = params.get('filter');
        if (filter === 'favorites') {
            handleFilterTab('favorites');
        }
    }

    if (params.has('action')) {
        const action = params.get('action');
        if (action === 'search') {
            elements.searchInput.focus();
        } else if (action === 'import') {
            openModal('importModal');
        }
    }

    if (params.has('category')) {
        handleCategoryFilter(params.get('category'));
    }
}

// ============================================
// Keyboard Shortcuts
// ============================================

function handleKeyboardShortcuts(e) {
    // Ignore if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    // Ctrl/Cmd + K - Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        elements.searchInput.focus();
    }

    // Escape - Close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            closeModal(modal.id);
        });
    }

    // N - New API
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        renderAddApiModal();
        openModal('addApiModal');
    }
}

// ============================================
// Utility Functions
// ============================================

function showLoading(show) {
    state.isLoading = show;
    elements.loadingState.style.display = show ? 'block' : 'none';
    if (show) {
        elements.apiGrid.style.display = 'none';
        elements.emptyState.style.display = 'none';
    }
}

async function updateStats() {
    const stats = await APICatalogDB.DBStats.getStats();
    const lastSync = await APICatalogDB.SyncStore.getLastSync();

    elements.statTotal.textContent = stats.totalApis.toLocaleString();
    elements.statCategories.textContent = stats.totalCategories;
    elements.statFavorites.textContent = stats.totalFavorites;

    if (lastSync) {
        elements.footerSync.textContent = `Posledni sync: ${formatDate(lastSync)}`;
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '&#10003;',
        error: '&#10007;',
        warning: '&#9888;',
        info: '&#8505;'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('cs-CZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'N/A';
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

// ============================================
// Export for debugging
// ============================================

window.APICatalogApp = {
    state,
    loadSampleData,
    clearFilters,
    updateStats
};
