/**
 * SampleHub - Discover Module (Browser-Only)
 * Simplified source management with presets + custom sources
 * Version: 4.0
 */

const DiscoverModule = (function() {
    'use strict';

    // CORS Proxies
    const CORS_PROXIES = [
        (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    // Preset sources (built-in)
    const PRESET_SOURCES = {
        '1337x': {
            id: '1337x',
            name: '1337x',
            icon: 'icon-discover',
            type: 'html',
            searchUrl: 'https://1337x.to/search/{query}/{page}/',
            baseUrl: 'https://1337x.to',
            parser: 'parse1337x',
            preset: true,
            enabled: true
        },
        'piratebay': {
            id: 'piratebay',
            name: 'PirateBay',
            icon: 'icon-magnet',
            type: 'api',
            searchUrl: 'https://apibay.org/q.php?q={query}',
            baseUrl: 'https://apibay.org',
            parser: 'parsePirateBay',
            preset: true,
            enabled: true
        },
        'nyaa': {
            id: 'nyaa',
            name: 'Nyaa',
            icon: 'icon-packs',
            type: 'html',
            searchUrl: 'https://nyaa.si/?f=0&c=0_0&q={query}&p={page}',
            baseUrl: 'https://nyaa.si',
            parser: 'parseNyaa',
            preset: true,
            enabled: false
        },
        'rarbg-api': {
            id: 'rarbg-api',
            name: 'RARBG (API)',
            icon: 'icon-download',
            type: 'api',
            searchUrl: 'https://torrentapi.org/pubapi_v2.php?mode=search&search_string={query}&format=json_extended&app_id=samplehub',
            baseUrl: 'https://torrentapi.org',
            parser: 'parseRarbg',
            preset: true,
            enabled: false
        }
    };

    // State
    let state = {
        isSearching: false,
        currentQuery: '',
        currentPage: 1,
        results: [],
        sources: {},         // id -> source config
        enabledSources: [],  // array of enabled source IDs
        currentProxyIndex: 0,
        searchHistory: [],
        wishlist: []
    };

    // DOM Elements
    let elements = {};

    // Storage keys
    const STORAGE_KEYS = {
        sources: 'samplehub-discover-sources',
        enabled: 'samplehub-discover-enabled',
        history: 'samplehub-discover-history',
        wishlist: 'samplehub-discover-wishlist',
        bannerDismissed: 'discoverBannerDismissed'
    };

    /**
     * Initialize
     */
    function init() {
        console.log('[Discover] Initializing v4.0...');
        cacheElements();
        loadSources();
        loadState();
        renderSourceToggles();
        bindEvents();
        updateStatusIndicator(true);
    }

    /**
     * Load sources from storage or use presets
     */
    function loadSources() {
        // Start with presets
        state.sources = { ...PRESET_SOURCES };

        // Load custom sources from localStorage
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.sources);
            if (saved) {
                const customSources = JSON.parse(saved);
                Object.assign(state.sources, customSources);
            }
        } catch (e) {
            console.warn('[Discover] Failed to load custom sources:', e);
        }

        // Load enabled state
        try {
            const savedEnabled = localStorage.getItem(STORAGE_KEYS.enabled);
            if (savedEnabled) {
                state.enabledSources = JSON.parse(savedEnabled);
            } else {
                // Default: enable preset sources that are marked enabled
                state.enabledSources = Object.values(state.sources)
                    .filter(s => s.enabled)
                    .map(s => s.id);
            }
        } catch (e) {
            state.enabledSources = ['1337x', 'piratebay'];
        }

        console.log('[Discover] Loaded sources:', Object.keys(state.sources));
        console.log('[Discover] Enabled:', state.enabledSources);
    }

    /**
     * Save sources to localStorage
     */
    function saveSources() {
        // Save only custom (non-preset) sources
        const customSources = {};
        Object.entries(state.sources).forEach(([id, source]) => {
            if (!source.preset) {
                customSources[id] = source;
            }
        });
        localStorage.setItem(STORAGE_KEYS.sources, JSON.stringify(customSources));
        localStorage.setItem(STORAGE_KEYS.enabled, JSON.stringify(state.enabledSources));
    }

    /**
     * Load state (history, wishlist)
     */
    function loadState() {
        try {
            const history = localStorage.getItem(STORAGE_KEYS.history);
            if (history) state.searchHistory = JSON.parse(history);
        } catch (e) {}

        try {
            const wishlist = localStorage.getItem(STORAGE_KEYS.wishlist);
            if (wishlist) state.wishlist = JSON.parse(wishlist);
        } catch (e) {}
    }

    /**
     * Save state
     */
    function saveState() {
        localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.searchHistory.slice(0, 50)));
        localStorage.setItem(STORAGE_KEYS.wishlist, JSON.stringify(state.wishlist));
    }

    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements = {
            status: document.getElementById('discoverStatus'),
            searchInput: document.getElementById('discoverSearchInput'),
            searchBtn: document.getElementById('discoverSearchBtn'),
            sourceToggles: document.getElementById('sourceToggles'),
            addSourceBtn: document.getElementById('addSourceBtn'),
            banner: document.getElementById('discoverBanner'),
            closeBanner: document.getElementById('closeBanner'),
            loading: document.getElementById('discoverLoading'),
            results: document.getElementById('discoverResults')
        };
    }

    /**
     * Render source toggles
     */
    function renderSourceToggles() {
        if (!elements.sourceToggles) return;

        let html = '';

        // Group sources: presets first, then custom
        const presets = Object.values(state.sources).filter(s => s.preset);
        const custom = Object.values(state.sources).filter(s => !s.preset);

        [...presets, ...custom].forEach(source => {
            const isEnabled = state.enabledSources.includes(source.id);
            const isCustom = !source.preset;

            html += `
                <label class="toggle-label ${isCustom ? 'custom-source' : ''}" data-source-id="${source.id}">
                    <input type="checkbox" value="${source.id}" ${isEnabled ? 'checked' : ''}>
                    <svg class="icon icon-sm"><use href="icons.svg#${source.icon || 'icon-discover'}"></use></svg>
                    <span>${source.name}</span>
                    ${isCustom ? `<button class="remove-source-btn" data-id="${source.id}" title="Odebrat">&times;</button>` : ''}
                </label>
            `;
        });

        // Add "+" button for custom source
        html += `
            <button class="toggle-label add-source-btn" id="addSourceBtn" title="Přidat vlastní zdroj">
                <svg class="icon icon-sm"><use href="icons.svg#icon-plus"></use></svg>
                <span>Přidat</span>
            </button>
        `;

        elements.sourceToggles.innerHTML = html;

        // Rebind add source button
        elements.addSourceBtn = document.getElementById('addSourceBtn');
    }

    /**
     * Bind events
     */
    function bindEvents() {
        if (elements.searchBtn) {
            elements.searchBtn.addEventListener('click', () => performSearch(1));
        }

        if (elements.searchInput) {
            elements.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') performSearch(1);
            });
        }

        if (elements.sourceToggles) {
            elements.sourceToggles.addEventListener('change', handleSourceToggle);
            elements.sourceToggles.addEventListener('click', handleSourceClick);
        }

        if (elements.closeBanner) {
            elements.closeBanner.addEventListener('click', () => {
                elements.banner.style.display = 'none';
                localStorage.setItem(STORAGE_KEYS.bannerDismissed, 'true');
            });
        }

        if (localStorage.getItem(STORAGE_KEYS.bannerDismissed) === 'true' && elements.banner) {
            elements.banner.style.display = 'none';
        }
    }

    /**
     * Handle source toggle
     */
    function handleSourceToggle(e) {
        if (e.target.type !== 'checkbox') return;

        const sourceId = e.target.value;
        if (e.target.checked) {
            if (!state.enabledSources.includes(sourceId)) {
                state.enabledSources.push(sourceId);
            }
        } else {
            state.enabledSources = state.enabledSources.filter(id => id !== sourceId);
        }
        saveSources();
        console.log('[Discover] Enabled sources:', state.enabledSources);
    }

    /**
     * Handle source click (add/remove)
     */
    function handleSourceClick(e) {
        // Add source button
        if (e.target.closest('#addSourceBtn')) {
            showAddSourceDialog();
            return;
        }

        // Remove source button
        const removeBtn = e.target.closest('.remove-source-btn');
        if (removeBtn) {
            e.preventDefault();
            e.stopPropagation();
            const sourceId = removeBtn.dataset.id;
            removeCustomSource(sourceId);
        }
    }

    /**
     * Show add source dialog
     */
    function showAddSourceDialog() {
        const html = `
            <div class="modal-overlay active" id="addSourceModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title"><svg class="icon"><use href="icons.svg#icon-plus"></use></svg> Přidat zdroj</h3>
                        <button class="modal-close" id="closeAddSourceModal"><svg class="icon"><use href="icons.svg#icon-close"></use></svg></button>
                    </div>
                    <div class="modal-body">
                        <div class="filter-group">
                            <label class="filter-label">Název zdroje</label>
                            <input type="text" id="newSourceName" class="filter-select" placeholder="Např. MySite">
                        </div>
                        <div class="filter-group">
                            <label class="filter-label">URL pro vyhledávání</label>
                            <input type="text" id="newSourceUrl" class="filter-select" placeholder="https://example.com/search?q={query}&page={page}">
                            <small class="text-muted">Použijte {query} a {page} jako placeholders</small>
                        </div>
                        <div class="filter-group">
                            <label class="filter-label">Typ</label>
                            <select id="newSourceType" class="filter-select">
                                <option value="html">HTML (scrapuje stránku)</option>
                                <option value="api">API (JSON odpověď)</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label class="filter-label">Parser</label>
                            <select id="newSourceParser" class="filter-select">
                                <option value="parseGeneric">Generický (automatická detekce)</option>
                                <option value="parse1337x">1337x styl</option>
                                <option value="parsePirateBay">PirateBay API styl</option>
                                <option value="parseNyaa">Nyaa styl</option>
                            </select>
                        </div>
                        <button class="btn-primary" id="saveNewSource" style="width:100%;margin-top:16px">
                            <svg class="icon"><use href="icons.svg#icon-check"></use></svg>
                            <span>Přidat zdroj</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('closeAddSourceModal').onclick = () => {
            document.getElementById('addSourceModal').remove();
        };

        document.getElementById('addSourceModal').onclick = (e) => {
            if (e.target.id === 'addSourceModal') {
                document.getElementById('addSourceModal').remove();
            }
        };

        document.getElementById('saveNewSource').onclick = () => {
            addCustomSource();
        };
    }

    /**
     * Add custom source
     */
    function addCustomSource() {
        const name = document.getElementById('newSourceName').value.trim();
        const url = document.getElementById('newSourceUrl').value.trim();
        const type = document.getElementById('newSourceType').value;
        const parser = document.getElementById('newSourceParser').value;

        if (!name || !url) {
            showToast('Vyplňte název a URL', 'warning');
            return;
        }

        if (!url.includes('{query}')) {
            showToast('URL musí obsahovat {query}', 'warning');
            return;
        }

        const id = 'custom-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');

        if (state.sources[id]) {
            showToast('Zdroj s tímto názvem již existuje', 'warning');
            return;
        }

        const newSource = {
            id,
            name,
            icon: 'icon-link',
            type,
            searchUrl: url,
            baseUrl: new URL(url).origin,
            parser,
            preset: false,
            enabled: true
        };

        state.sources[id] = newSource;
        state.enabledSources.push(id);
        saveSources();
        renderSourceToggles();
        bindEvents();

        document.getElementById('addSourceModal').remove();
        showToast(`Zdroj "${name}" přidán`, 'success');
    }

    /**
     * Remove custom source
     */
    function removeCustomSource(sourceId) {
        const source = state.sources[sourceId];
        if (!source || source.preset) {
            showToast('Tento zdroj nelze odebrat', 'warning');
            return;
        }

        if (confirm(`Odebrat zdroj "${source.name}"?`)) {
            delete state.sources[sourceId];
            state.enabledSources = state.enabledSources.filter(id => id !== sourceId);
            saveSources();
            renderSourceToggles();
            bindEvents();
            showToast(`Zdroj "${source.name}" odebrán`, 'info');
        }
    }

    /**
     * Update status
     */
    function updateStatusIndicator(ready) {
        if (!elements.status) return;
        const dot = elements.status.querySelector('.status-dot');
        const text = elements.status.querySelector('.status-text');
        if (dot) {
            dot.classList.toggle('online', ready);
            dot.classList.toggle('offline', !ready);
        }
        if (text) {
            text.textContent = ready ? 'Připraveno' : 'Chyba';
        }
    }

    /**
     * Fetch with CORS proxy
     */
    async function fetchWithProxy(url, isApi = false) {
        console.log('[Discover] Fetching:', url);

        // Try direct first for APIs
        if (isApi) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    return await response.text();
                }
            } catch (e) {
                console.log('[Discover] Direct failed, trying proxies');
            }
        }

        // Try proxies
        for (let i = 0; i < CORS_PROXIES.length; i++) {
            const proxyIndex = (state.currentProxyIndex + i) % CORS_PROXIES.length;
            try {
                const response = await fetch(CORS_PROXIES[proxyIndex](url));
                if (response.ok) {
                    state.currentProxyIndex = proxyIndex;
                    return await response.text();
                }
            } catch (e) {
                console.warn(`[Discover] Proxy ${proxyIndex} failed`);
            }
        }

        throw new Error('All fetch methods failed');
    }

    /**
     * Perform search
     */
    async function performSearch(page = 1) {
        const query = elements.searchInput.value.trim();

        if (!query) {
            showToast('Zadejte hledaný výraz', 'warning');
            return;
        }

        if (state.enabledSources.length === 0) {
            showToast('Vyberte alespoň jeden zdroj', 'warning');
            return;
        }

        console.log('[Discover] Searching:', query, 'sources:', state.enabledSources);

        state.isSearching = true;
        state.currentQuery = query;
        state.currentPage = page;
        showLoading(true);
        addToHistory(query);

        try {
            const allResults = [];

            for (const sourceId of state.enabledSources) {
                const source = state.sources[sourceId];
                if (!source) continue;

                try {
                    const url = source.searchUrl
                        .replace('{query}', encodeURIComponent(query))
                        .replace('{page}', page.toString());

                    const data = await fetchWithProxy(url, source.type === 'api');
                    const parser = PARSERS[source.parser] || PARSERS.parseGeneric;
                    const results = parser(data, source);

                    console.log('[Discover]', source.name, 'found', results.length, 'results');
                    allResults.push(...results);
                } catch (error) {
                    console.error(`[Discover] ${source.name} failed:`, error);
                }
            }

            state.results = allResults.sort((a, b) => (b.seeders || 0) - (a.seeders || 0));
            renderResults(state.results);

            if (state.results.length === 0) {
                showEmptyResults('Žádné výsledky. Zkuste jiný dotaz.');
            } else {
                showToast(`Nalezeno ${state.results.length} výsledků`, 'success');
            }

        } catch (error) {
            console.error('[Discover] Search failed:', error);
            showToast('Chyba při vyhledávání', 'error');
            showEmptyResults('Chyba při vyhledávání.');
        } finally {
            state.isSearching = false;
            showLoading(false);
        }
    }

    /**
     * Show/hide loading
     */
    function showLoading(show) {
        if (elements.loading) elements.loading.style.display = show ? 'flex' : 'none';
        if (elements.results) elements.results.style.display = show ? 'none' : 'flex';
    }

    /**
     * Render results
     */
    function renderResults(results) {
        if (!elements.results) return;

        let html = results.map(createResultCard).join('');

        if (results.length >= 20) {
            html += `
                <div class="discover-pagination">
                    ${state.currentPage > 1 ? `<button class="btn-page" data-page="${state.currentPage - 1}">← Předchozí</button>` : ''}
                    <span class="page-info">Stránka ${state.currentPage}</span>
                    <button class="btn-page" data-page="${state.currentPage + 1}">Další →</button>
                </div>
            `;
        }

        elements.results.innerHTML = html;
        bindResultEvents();
    }

    /**
     * Bind result events
     */
    function bindResultEvents() {
        elements.results.querySelectorAll('.btn-magnet').forEach(btn => {
            btn.addEventListener('click', handleMagnetClick);
        });

        elements.results.querySelectorAll('.btn-open-magnet').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const magnetUri = e.currentTarget.dataset.magnet;
                if (magnetUri) {
                    window.location.href = magnetUri;
                    showToast('Otevírám torrent klient...', 'info');
                }
            });
        });

        elements.results.querySelectorAll('.btn-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.open(e.currentTarget.dataset.url, '_blank');
            });
        });

        elements.results.querySelectorAll('.btn-wishlist').forEach(btn => {
            btn.addEventListener('click', handleWishlistClick);
        });

        elements.results.querySelectorAll('.btn-page').forEach(btn => {
            btn.addEventListener('click', (e) => {
                performSearch(parseInt(e.currentTarget.dataset.page));
            });
        });
    }

    /**
     * Handle magnet click
     */
    async function handleMagnetClick(e) {
        const btn = e.currentTarget;
        let magnetUri = btn.dataset.magnet;

        if (magnetUri) {
            copyToClipboard(magnetUri);
            showToast('Magnet link zkopírován', 'success');
        } else {
            const url = btn.dataset.url;
            btn.innerHTML = '<svg class="icon icon-spin"><use href="icons.svg#icon-loading"></use></svg><span>Načítám...</span>';
            btn.disabled = true;

            try {
                const html = await fetchWithProxy(url);
                const match = html.match(/magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^"'\s<]*/);

                if (match) {
                    magnetUri = match[0];
                    btn.dataset.magnet = magnetUri;

                    const card = btn.closest('.torrent-card');
                    const actions = card.querySelector('.torrent-actions');
                    const openBtn = document.createElement('button');
                    openBtn.className = 'btn-open-magnet';
                    openBtn.dataset.magnet = magnetUri;
                    openBtn.innerHTML = '<svg class="icon"><use href="icons.svg#icon-download"></use></svg><span>Stáhnout</span>';
                    openBtn.onclick = () => {
                        window.location.href = magnetUri;
                        showToast('Otevírám torrent klient...', 'info');
                    };
                    actions.insertBefore(openBtn, actions.firstChild);

                    copyToClipboard(magnetUri);
                    showToast('Magnet link zkopírován', 'success');
                    btn.innerHTML = '<svg class="icon"><use href="icons.svg#icon-magnet"></use></svg><span>Kopírovat</span>';
                } else {
                    throw new Error('Magnet nenalezen');
                }
            } catch (error) {
                showToast('Nepodařilo se získat magnet', 'error');
                btn.innerHTML = '<svg class="icon"><use href="icons.svg#icon-magnet"></use></svg><span>Získat</span>';
            }
            btn.disabled = false;
        }
    }

    /**
     * Handle wishlist click
     */
    function handleWishlistClick(e) {
        const btn = e.currentTarget;
        const card = btn.closest('.torrent-card');
        const id = card.dataset.id;

        const idx = state.wishlist.findIndex(item => item.id === id);

        if (idx > -1) {
            state.wishlist.splice(idx, 1);
            btn.innerHTML = '<svg class="icon"><use href="icons.svg#icon-bookmark"></use></svg>';
            showToast('Odebráno z wishlistu', 'info');
        } else {
            const result = state.results.find(r => r.id === id);
            if (result) {
                state.wishlist.push({ ...result, addedAt: Date.now() });
                btn.innerHTML = '<svg class="icon"><use href="icons.svg#icon-bookmark-filled"></use></svg>';
                showToast('Přidáno do wishlistu', 'success');
            }
        }
        saveState();
    }

    /**
     * Create result card
     */
    function createResultCard(result) {
        const seedersClass = result.seeders > 10 ? 'seeders' : (result.seeders > 0 ? '' : 'leechers');
        const isInWishlist = state.wishlist.some(item => item.id === result.id);
        const hasMagnet = !!result.magnetUri;

        return `
            <div class="torrent-card" data-id="${result.id}" data-source="${result.source}">
                <div class="torrent-info">
                    <div class="torrent-title">${escapeHtml(result.title)}</div>
                    <div class="torrent-meta">
                        <span class="torrent-meta-item ${seedersClass}">
                            <svg class="icon icon-sm"><use href="icons.svg#icon-seeders"></use></svg> ${result.seeders || 0}
                        </span>
                        <span class="torrent-meta-item leechers">
                            <svg class="icon icon-sm"><use href="icons.svg#icon-leechers"></use></svg> ${result.leechers || 0}
                        </span>
                        <span class="torrent-meta-item">
                            <svg class="icon icon-sm"><use href="icons.svg#icon-packs"></use></svg> ${result.size || 'N/A'}
                        </span>
                        <span class="torrent-source">${result.source}</span>
                    </div>
                </div>
                <div class="torrent-actions">
                    ${hasMagnet ? `
                        <button class="btn-open-magnet" data-magnet="${escapeHtml(result.magnetUri)}" title="Stáhnout">
                            <svg class="icon"><use href="icons.svg#icon-download"></use></svg><span>Stáhnout</span>
                        </button>
                    ` : ''}
                    <button class="btn-magnet"
                            data-magnet="${hasMagnet ? escapeHtml(result.magnetUri) : ''}"
                            data-url="${escapeHtml(result.url)}"
                            title="Kopírovat magnet">
                        <svg class="icon"><use href="icons.svg#icon-magnet"></use></svg><span>${hasMagnet ? 'Kopírovat' : 'Získat'}</span>
                    </button>
                    <button class="btn-wishlist" title="Wishlist">
                        <svg class="icon"><use href="icons.svg#${isInWishlist ? 'icon-bookmark-filled' : 'icon-bookmark'}"></use></svg>
                    </button>
                    <button class="btn-details" data-url="${escapeHtml(result.url)}" title="Otevřít stránku">
                        <svg class="icon"><use href="icons.svg#icon-link"></use></svg>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Show empty results
     */
    function showEmptyResults(message) {
        if (!elements.results) return;
        elements.results.innerHTML = `
            <div class="discover-empty">
                <div class="empty-icon"><svg class="icon icon-4x"><use href="icons.svg#icon-search"></use></svg></div>
                <h3>${message || 'Žádné výsledky'}</h3>
                <p>Zkuste upravit hledaný výraz</p>
            </div>
        `;
    }

    // ===========================================
    // PARSERS
    // ===========================================

    const PARSERS = {
        parse1337x(html, source) {
            const results = [];
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const rows = doc.querySelectorAll('table.table-list tbody tr, .table-list-wrap table tbody tr, table tbody tr');

            rows.forEach(row => {
                try {
                    const cells = row.querySelectorAll('td');
                    if (cells.length < 2) return;

                    let link = row.querySelector('td.coll-1 a.name, td.coll-1 a:nth-child(2), td a[href*="/torrent/"]');
                    if (!link) {
                        const links = row.querySelectorAll('a');
                        for (const l of links) {
                            if ((l.getAttribute('href') || '').includes('/torrent/')) {
                                link = l;
                                break;
                            }
                        }
                    }
                    if (!link) return;

                    const title = link.textContent.trim();
                    if (!title || title.length < 3) return;

                    const href = link.getAttribute('href');
                    const id = href?.split('/').filter(Boolean).pop() || Math.random().toString(36);

                    let seeders = 0, leechers = 0, size = 'N/A';
                    cells.forEach(cell => {
                        const text = cell.textContent.trim();
                        const cls = cell.className || '';
                        if (cls.includes('coll-2') || cls.includes('seeds')) seeders = parseInt(text) || 0;
                        else if (cls.includes('coll-3') || cls.includes('leeches')) leechers = parseInt(text) || 0;
                        else if (cls.includes('coll-4') || cls.includes('size')) size = text.split(/\s+/).slice(0, 2).join(' ') || 'N/A';
                    });

                    results.push({
                        id: `1337x-${id}`,
                        title,
                        url: source.baseUrl + href,
                        magnetUri: null,
                        seeders,
                        leechers,
                        size,
                        source: source.name
                    });
                } catch (e) {}
            });

            return results;
        },

        parsePirateBay(data, source) {
            const results = [];
            try {
                const items = JSON.parse(data);
                if (!Array.isArray(items) || items.length === 0 || items[0].id === '0') return results;

                const trackers = [
                    'udp://tracker.opentrackr.org:1337/announce',
                    'udp://open.stealth.si:80/announce',
                    'udp://tracker.torrent.eu.org:451/announce'
                ];

                items.forEach(item => {
                    const trackersStr = trackers.map(t => `&tr=${encodeURIComponent(t)}`).join('');
                    const magnetUri = `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.name)}${trackersStr}`;

                    let size = 'N/A';
                    const bytes = parseInt(item.size);
                    if (bytes > 0) {
                        if (bytes > 1073741824) size = (bytes / 1073741824).toFixed(2) + ' GB';
                        else if (bytes > 1048576) size = (bytes / 1048576).toFixed(2) + ' MB';
                        else size = (bytes / 1024).toFixed(2) + ' KB';
                    }

                    results.push({
                        id: `tpb-${item.id}`,
                        title: item.name,
                        url: `https://thepiratebay.org/description.php?id=${item.id}`,
                        magnetUri,
                        seeders: parseInt(item.seeders) || 0,
                        leechers: parseInt(item.leechers) || 0,
                        size,
                        source: source.name
                    });
                });
            } catch (e) {}
            return results;
        },

        parseNyaa(html, source) {
            const results = [];
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const rows = doc.querySelectorAll('table tbody tr');

            rows.forEach(row => {
                try {
                    const cols = row.querySelectorAll('td');
                    if (cols.length < 5) return;

                    const titleLink = row.querySelector('td:nth-child(2) a:last-child');
                    if (!titleLink) return;

                    const magnetLink = row.querySelector('a[href^="magnet:"]');
                    const title = titleLink.textContent.trim();
                    const href = titleLink.getAttribute('href');

                    results.push({
                        id: `nyaa-${href?.split('/').pop() || Math.random().toString(36)}`,
                        title,
                        url: source.baseUrl + href,
                        magnetUri: magnetLink?.getAttribute('href') || null,
                        seeders: parseInt(cols[cols.length - 3]?.textContent) || 0,
                        leechers: parseInt(cols[cols.length - 2]?.textContent) || 0,
                        size: cols[3]?.textContent?.trim() || 'N/A',
                        source: source.name
                    });
                } catch (e) {}
            });

            return results;
        },

        parseRarbg(data, source) {
            const results = [];
            try {
                const json = JSON.parse(data);
                (json.torrent_results || []).forEach(item => {
                    results.push({
                        id: `rarbg-${item.info_hash || Math.random().toString(36)}`,
                        title: item.title,
                        url: item.info_page || item.download,
                        magnetUri: item.download,
                        seeders: item.seeders || 0,
                        leechers: item.leechers || 0,
                        size: item.size ? (item.size / 1048576).toFixed(2) + ' MB' : 'N/A',
                        source: source.name
                    });
                });
            } catch (e) {}
            return results;
        },

        parseGeneric(html, source) {
            // Try to detect magnet links and titles
            const results = [];
            const magnetRegex = /magnet:\?xt=urn:btih:([a-zA-Z0-9]+)[^"'\s<]*/g;
            let match;

            while ((match = magnetRegex.exec(html)) !== null) {
                const magnetUri = match[0];
                const dnMatch = magnetUri.match(/dn=([^&]+)/);
                const title = dnMatch ? decodeURIComponent(dnMatch[1].replace(/\+/g, ' ')) : 'Unknown';

                results.push({
                    id: `gen-${match[1].substring(0, 12)}`,
                    title,
                    url: source.baseUrl,
                    magnetUri,
                    seeders: 0,
                    leechers: 0,
                    size: 'N/A',
                    source: source.name
                });
            }

            return results;
        }
    };

    // ===========================================
    // HELPERS
    // ===========================================

    function addToHistory(query) {
        const idx = state.searchHistory.findIndex(h => h.query.toLowerCase() === query.toLowerCase());
        if (idx > -1) state.searchHistory.splice(idx, 1);
        state.searchHistory.unshift({ query, timestamp: Date.now() });
        state.searchHistory = state.searchHistory.slice(0, 50);
        saveState();
    }

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    }

    function showToast(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            console.log('[Toast]', type, message);
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===========================================
    // PUBLIC API
    // ===========================================

    return {
        init,
        performSearch,
        getSources: () => ({ ...state.sources }),
        getEnabledSources: () => [...state.enabledSources],
        getWishlist: () => [...state.wishlist],
        getHistory: () => [...state.searchHistory]
    };

})();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('discoverView')) {
        DiscoverModule.init();
    }
});
