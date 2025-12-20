/**
 * SampleHub - Discover Module (Browser-Only)
 * Handles torrent search functionality purely in the browser
 * Uses CORS proxies to fetch content from torrent indexers
 * Version: 3.0
 */

const DiscoverModule = (function() {
    'use strict';

    // CORS Proxies (fallback chain) - tested and working
    const CORS_PROXIES = [
        (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    // Torrent sources configuration
    const SOURCES = {
        '1337x': {
            name: '1337x',
            baseUrl: 'https://1337x.to',
            // Simple search URL without category filter
            searchUrl: (q, page) => `https://1337x.to/search/${encodeURIComponent(q)}/${page}/`,
            parseResults: parse1337xResults,
            enabled: true
        },
        'piratebay': {
            name: 'PirateBay',
            baseUrl: 'https://apibay.org',
            // API endpoint without category filter for more results
            searchUrl: (q) => `https://apibay.org/q.php?q=${encodeURIComponent(q)}`,
            parseResults: parsePirateBayResults,
            isApi: true,
            enabled: true
        },
        'yts': {
            name: 'YTS API',
            baseUrl: 'https://yts.mx',
            searchUrl: (q) => `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(q)}&limit=50`,
            parseResults: parseYTSResults,
            isApi: true,
            enabled: false // Movies, not samples
        }
    };

    // State
    let state = {
        isSearching: false,
        currentQuery: '',
        currentPage: 1,
        results: [],
        sources: ['1337x', 'piratebay'],
        currentProxyIndex: 0,
        searchHistory: [],
        wishlist: []
    };

    // DOM Elements
    let elements = {};

    // IndexedDB
    const DB_NAME = 'samplehub-discover';
    const DB_VERSION = 1;
    let db = null;

    /**
     * Initialize
     */
    function init() {
        console.log('[Discover] Initializing...');
        cacheElements();
        bindEvents();
        initDB().then(() => {
            loadWishlist();
            loadSearchHistory();
        }).catch(console.error);
        updateStatusIndicator(true);
    }

    /**
     * Initialize IndexedDB
     */
    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };
            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                if (!database.objectStoreNames.contains('wishlist')) {
                    database.createObjectStore('wishlist', { keyPath: 'id' });
                }
                if (!database.objectStoreNames.contains('history')) {
                    database.createObjectStore('history', { keyPath: 'query' });
                }
            };
        });
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
            banner: document.getElementById('discoverBanner'),
            closeBanner: document.getElementById('closeBanner'),
            loading: document.getElementById('discoverLoading'),
            results: document.getElementById('discoverResults')
        };
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
            elements.sourceToggles.addEventListener('change', updateSources);
        }

        if (elements.closeBanner) {
            elements.closeBanner.addEventListener('click', () => {
                elements.banner.style.display = 'none';
                localStorage.setItem('discoverBannerDismissed', 'true');
            });
        }

        if (localStorage.getItem('discoverBannerDismissed') === 'true' && elements.banner) {
            elements.banner.style.display = 'none';
        }
    }

    /**
     * Update sources
     */
    function updateSources() {
        const checkboxes = elements.sourceToggles.querySelectorAll('input[type="checkbox"]');
        state.sources = [];
        checkboxes.forEach(cb => {
            if (cb.checked && SOURCES[cb.value]) {
                state.sources.push(cb.value);
            }
        });
        console.log('[Discover] Sources:', state.sources);
    }

    /**
     * Update status
     */
    function updateStatusIndicator(ready) {
        if (!elements.status) return;
        const dot = elements.status.querySelector('.status-dot');
        const text = elements.status.querySelector('.status-text');
        dot.classList.toggle('online', ready);
        dot.classList.toggle('offline', !ready);
        text.textContent = ready ? 'Připraveno' : 'Chyba';
    }

    /**
     * Fetch with CORS proxy
     */
    async function fetchWithProxy(url, isApi = false) {
        console.log('[Discover] Fetching:', url);

        // If it's an API with CORS headers, try direct first
        if (isApi) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const text = await response.text();
                    console.log('[Discover] Direct fetch success');
                    return text;
                }
            } catch (e) {
                console.log('[Discover] Direct fetch failed, trying proxies');
            }
        }

        // Try each proxy
        for (let i = 0; i < CORS_PROXIES.length; i++) {
            const proxyIndex = (state.currentProxyIndex + i) % CORS_PROXIES.length;
            const proxyUrl = CORS_PROXIES[proxyIndex](url);

            try {
                console.log('[Discover] Trying proxy', proxyIndex);
                const response = await fetch(proxyUrl);

                if (response.ok) {
                    state.currentProxyIndex = proxyIndex;
                    const text = await response.text();
                    console.log('[Discover] Proxy', proxyIndex, 'success, got', text.length, 'chars');
                    return text;
                }
            } catch (error) {
                console.warn(`[Discover] Proxy ${proxyIndex} failed:`, error.message);
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

        if (state.sources.length === 0) {
            showToast('Vyberte alespoň jeden zdroj', 'warning');
            return;
        }

        console.log('[Discover] Searching:', query, 'page:', page, 'sources:', state.sources);

        state.isSearching = true;
        state.currentQuery = query;
        state.currentPage = page;
        showLoading(true);
        addToHistory(query);

        try {
            const allResults = [];

            // Search each source
            for (const sourceId of state.sources) {
                const source = SOURCES[sourceId];
                if (!source || !source.enabled) continue;

                try {
                    console.log('[Discover] Searching', sourceId);
                    const url = source.searchUrl(query, page);
                    const data = await fetchWithProxy(url, source.isApi);

                    let results;
                    if (source.isApi) {
                        results = source.parseResults(data, sourceId);
                    } else {
                        results = source.parseResults(data, source.baseUrl, sourceId);
                    }

                    console.log('[Discover]', sourceId, 'found', results.length, 'results');
                    allResults.push(...results);
                } catch (error) {
                    console.error(`[Discover] ${sourceId} failed:`, error);
                }
            }

            state.results = allResults;
            state.results.sort((a, b) => (b.seeders || 0) - (a.seeders || 0));

            console.log('[Discover] Total results:', state.results.length);
            renderResults(state.results);

            if (state.results.length === 0) {
                showEmptyResults('Žádné výsledky. Zkuste jiný dotaz.');
            } else {
                showToast(`Nalezeno ${state.results.length} výsledků`, 'success');
            }

        } catch (error) {
            console.error('[Discover] Search failed:', error);
            showToast('Chyba při vyhledávání', 'error');
            showEmptyResults('Chyba při vyhledávání. Zkuste to znovu.');
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
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<span>⏳</span><span>Načítám...</span>';
            btn.disabled = true;

            try {
                const html = await fetchWithProxy(url);
                const match = html.match(/magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^"'\s<]*/);

                if (match) {
                    magnetUri = match[0];
                    btn.dataset.magnet = magnetUri;

                    // Add download button
                    const card = btn.closest('.torrent-card');
                    const actions = card.querySelector('.torrent-actions');
                    const openBtn = document.createElement('button');
                    openBtn.className = 'btn-open-magnet';
                    openBtn.dataset.magnet = magnetUri;
                    openBtn.innerHTML = '<span>⬇️</span><span>Stáhnout</span>';
                    openBtn.onclick = () => {
                        window.location.href = magnetUri;
                        showToast('Otevírám torrent klient...', 'info');
                    };
                    actions.insertBefore(openBtn, actions.firstChild);

                    copyToClipboard(magnetUri);
                    showToast('Magnet link zkopírován', 'success');
                    btn.innerHTML = '<span>🧲</span><span>Kopírovat</span>';
                } else {
                    throw new Error('Magnet nenalezen');
                }
            } catch (error) {
                console.error('[Discover] Magnet fetch failed:', error);
                showToast('Nepodařilo se získat magnet', 'error');
                btn.innerHTML = originalHtml;
            }
            btn.disabled = false;
        }
    }

    /**
     * Handle wishlist click
     */
    async function handleWishlistClick(e) {
        const btn = e.currentTarget;
        const card = btn.closest('.torrent-card');
        const id = card.dataset.id;

        const isInWishlist = state.wishlist.some(item => item.id === id);

        if (isInWishlist) {
            await removeFromWishlist(id);
            btn.innerHTML = '<span>💾</span>';
            showToast('Odebráno z wishlistu', 'info');
        } else {
            const result = state.results.find(r => r.id === id);
            if (result) {
                await addToWishlist(result);
                btn.innerHTML = '<span>✅</span>';
                showToast('Přidáno do wishlistu', 'success');
            }
        }
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
                            <span>▲</span> ${result.seeders || 0}
                        </span>
                        <span class="torrent-meta-item leechers">
                            <span>▼</span> ${result.leechers || 0}
                        </span>
                        <span class="torrent-meta-item">
                            <span>📦</span> ${result.size || 'N/A'}
                        </span>
                        <span class="torrent-source">${result.source}</span>
                    </div>
                </div>
                <div class="torrent-actions">
                    ${hasMagnet ? `
                        <button class="btn-open-magnet" data-magnet="${escapeHtml(result.magnetUri)}" title="Stáhnout">
                            <span>⬇️</span><span>Stáhnout</span>
                        </button>
                    ` : ''}
                    <button class="btn-magnet"
                            data-magnet="${hasMagnet ? escapeHtml(result.magnetUri) : ''}"
                            data-url="${escapeHtml(result.url)}"
                            title="Kopírovat magnet">
                        <span>🧲</span><span>${hasMagnet ? 'Kopírovat' : 'Získat magnet'}</span>
                    </button>
                    <button class="btn-wishlist" title="Wishlist">
                        <span>${isInWishlist ? '✅' : '💾'}</span>
                    </button>
                    <button class="btn-details" data-url="${escapeHtml(result.url)}" title="Otevřít stránku">
                        <span>🔗</span>
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
                <div class="empty-icon">🔎</div>
                <h3>${message || 'Žádné výsledky'}</h3>
                <p>Zkuste upravit hledaný výraz</p>
            </div>
        `;
    }

    // ===========================================
    // PARSERS
    // ===========================================

    /**
     * Parse 1337x results
     */
    function parse1337xResults(html, baseUrl, sourceId) {
        const results = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        console.log('[1337x] Parsing HTML, length:', html.length);

        // Try multiple selectors
        const rows = doc.querySelectorAll('table.table-list tbody tr, .table-list-wrap table tbody tr, table tbody tr');
        console.log('[1337x] Found rows:', rows.length);

        rows.forEach((row, idx) => {
            try {
                // Skip if no cells
                const cells = row.querySelectorAll('td');
                if (cells.length < 2) return;

                // Find the name link - try multiple selectors
                let link = row.querySelector('td.coll-1 a.name, td.coll-1 a:nth-child(2), td:first-child a:nth-child(2), td a[href*="/torrent/"]');
                if (!link) {
                    // Try any link that looks like a torrent link
                    const links = row.querySelectorAll('a');
                    for (const l of links) {
                        const href = l.getAttribute('href') || '';
                        if (href.includes('/torrent/') && l.textContent.trim().length > 5) {
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

                // Find seeders/leechers - try text content that looks like numbers
                let seeders = 0, leechers = 0, size = 'N/A';

                cells.forEach((cell, cellIdx) => {
                    const text = cell.textContent.trim();
                    const className = cell.className || '';

                    if (className.includes('coll-2') || className.includes('seeds')) {
                        seeders = parseInt(text) || 0;
                    } else if (className.includes('coll-3') || className.includes('leeches')) {
                        leechers = parseInt(text) || 0;
                    } else if (className.includes('coll-4') || className.includes('size')) {
                        size = text.split(/\s+/).slice(0, 2).join(' ') || 'N/A';
                    }
                });

                // If we didn't find by class, try by position
                if (seeders === 0 && cells.length >= 3) {
                    seeders = parseInt(cells[cells.length - 3]?.textContent) || 0;
                    leechers = parseInt(cells[cells.length - 2]?.textContent) || 0;
                }

                console.log('[1337x] Parsed:', title.substring(0, 50), 'S:', seeders, 'L:', leechers);

                results.push({
                    id: `1337x-${id}`,
                    title,
                    url: baseUrl + href,
                    magnetUri: null,
                    seeders,
                    leechers,
                    size,
                    source: '1337x'
                });
            } catch (e) {
                console.warn('[1337x] Parse row error:', e);
            }
        });

        console.log('[1337x] Total parsed:', results.length);
        return results;
    }

    /**
     * Parse PirateBay API results
     */
    function parsePirateBayResults(data, sourceId) {
        const results = [];

        try {
            const items = JSON.parse(data);

            if (!Array.isArray(items) || items.length === 0 || items[0].id === '0') {
                return results;
            }

            items.forEach(item => {
                const infoHash = item.info_hash;
                // Add popular trackers for better connectivity
                const trackers = [
                    'udp://tracker.opentrackr.org:1337/announce',
                    'udp://open.stealth.si:80/announce',
                    'udp://tracker.torrent.eu.org:451/announce',
                    'udp://tracker.bittor.pw:1337/announce',
                    'udp://tracker.openbittorrent.com:6969/announce'
                ];
                const trackersStr = trackers.map(t => `&tr=${encodeURIComponent(t)}`).join('');
                const magnetUri = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(item.name)}${trackersStr}`;

                // Format size
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
                    source: 'piratebay'
                });
            });
        } catch (e) {
            console.error('[PirateBay] Parse error:', e);
        }

        return results;
    }

    /**
     * Parse YTS API results
     */
    function parseYTSResults(data, sourceId) {
        const results = [];

        try {
            const json = JSON.parse(data);
            const movies = json.data?.movies || [];

            movies.forEach(movie => {
                const torrent = movie.torrents?.[0];
                if (!torrent) return;

                results.push({
                    id: `yts-${movie.id}`,
                    title: movie.title_long,
                    url: torrent.url,
                    magnetUri: null,
                    seeders: torrent.seeds || 0,
                    leechers: torrent.peers || 0,
                    size: torrent.size || 'N/A',
                    source: 'yts'
                });
            });
        } catch (e) {
            console.error('[YTS] Parse error:', e);
        }

        return results;
    }

    // ===========================================
    // HELPERS
    // ===========================================

    async function addToHistory(query) {
        const idx = state.searchHistory.findIndex(h => h.query.toLowerCase() === query.toLowerCase());
        if (idx > -1) state.searchHistory.splice(idx, 1);
        state.searchHistory.unshift({ query, timestamp: Date.now() });
        state.searchHistory = state.searchHistory.slice(0, 20);
        if (db) {
            const tx = db.transaction('history', 'readwrite');
            tx.objectStore('history').put({ query, timestamp: Date.now() });
        }
    }

    async function loadSearchHistory() {
        if (!db) return;
        const tx = db.transaction('history', 'readonly');
        const request = tx.objectStore('history').getAll();
        request.onsuccess = () => {
            state.searchHistory = (request.result || []).sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
        };
    }

    async function addToWishlist(item) {
        const wishlistItem = { ...item, addedAt: Date.now() };
        state.wishlist.push(wishlistItem);
        if (db) {
            const tx = db.transaction('wishlist', 'readwrite');
            tx.objectStore('wishlist').put(wishlistItem);
        }
    }

    async function removeFromWishlist(id) {
        state.wishlist = state.wishlist.filter(item => item.id !== id);
        if (db) {
            const tx = db.transaction('wishlist', 'readwrite');
            tx.objectStore('wishlist').delete(id);
        }
    }

    async function loadWishlist() {
        if (!db) return;
        const tx = db.transaction('wishlist', 'readonly');
        const request = tx.objectStore('wishlist').getAll();
        request.onsuccess = () => {
            state.wishlist = request.result || [];
        };
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
        checkServerStatus: () => updateStatusIndicator(true),
        getState: () => ({ ...state }),
        getWishlist: () => [...state.wishlist]
    };

})();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('discoverView')) {
        DiscoverModule.init();
    }
});
