/**
 * SampleHub - Discover Module (Browser-Only)
 * Handles torrent search functionality purely in the browser
 * Uses CORS proxies to fetch content from torrent indexers
 * Version: 2.1
 */

const DiscoverModule = (function() {
    'use strict';

    // CORS Proxies (fallback chain)
    const CORS_PROXIES = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest='
    ];

    // Torrent sources configuration
    const SOURCES = {
        '1337x': {
            name: '1337x',
            baseUrl: 'https://1337x.to',
            searchUrl: (q, page) => `https://1337x.to/sort-category-search/${encodeURIComponent(q)}/Music/seeders/desc/${page}/`,
            parseResults: parse1337xResults,
            parseDetails: parse1337xDetails
        },
        'nyaa': {
            name: 'Nyaa',
            baseUrl: 'https://nyaa.si',
            searchUrl: (q, page) => `https://nyaa.si/?f=0&c=2_0&q=${encodeURIComponent(q)}&p=${page}`,
            parseResults: parseNyaaResults,
            parseDetails: parseNyaaDetails
        },
        'limetorrents': {
            name: 'LimeTorrents',
            baseUrl: 'https://www.limetorrents.lol',
            searchUrl: (q, page) => `https://www.limetorrents.lol/search/music/${encodeURIComponent(q)}/seeds/${page}/`,
            parseResults: parseLimeResults,
            parseDetails: null
        }
    };

    // State
    let state = {
        isSearching: false,
        currentQuery: '',
        currentPage: 1,
        results: [],
        sources: ['1337x', 'nyaa', 'limetorrents'],
        currentProxyIndex: 0,
        searchHistory: [],
        wishlist: []
    };

    // DOM Elements
    let elements = {};

    // IndexedDB for wishlist persistence
    const DB_NAME = 'samplehub-discover';
    const DB_VERSION = 1;
    let db = null;

    /**
     * Initialize the module
     */
    function init() {
        cacheElements();
        bindEvents();
        initDB().then(() => {
            loadWishlist();
            loadSearchHistory();
        });
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

                // Wishlist store
                if (!database.objectStoreNames.contains('wishlist')) {
                    database.createObjectStore('wishlist', { keyPath: 'id' });
                }

                // Search history store
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
     * Bind event listeners
     */
    function bindEvents() {
        if (elements.searchBtn) {
            elements.searchBtn.addEventListener('click', () => performSearch(1));
        }

        if (elements.searchInput) {
            elements.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch(1);
                }
            });

            // Search suggestions
            elements.searchInput.addEventListener('input', debounce(showSearchSuggestions, 300));
            elements.searchInput.addEventListener('focus', showSearchSuggestions);
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

        // Close suggestions on click outside
        document.addEventListener('click', (e) => {
            const suggestions = document.getElementById('searchSuggestions');
            if (suggestions && !suggestions.contains(e.target) && e.target !== elements.searchInput) {
                suggestions.remove();
            }
        });
    }

    /**
     * Debounce helper
     */
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Update sources from toggles
     */
    function updateSources() {
        const checkboxes = elements.sourceToggles.querySelectorAll('input[type="checkbox"]');
        state.sources = [];
        checkboxes.forEach(cb => {
            if (cb.checked && SOURCES[cb.value]) {
                state.sources.push(cb.value);
            }
        });
    }

    /**
     * Update status indicator
     */
    function updateStatusIndicator(ready) {
        if (!elements.status) return;

        const dot = elements.status.querySelector('.status-dot');
        const text = elements.status.querySelector('.status-text');

        if (ready) {
            dot.classList.remove('offline');
            dot.classList.add('online');
            text.textContent = 'Připraveno';
        } else {
            dot.classList.remove('online');
            dot.classList.add('offline');
            text.textContent = 'Chyba';
        }
    }

    /**
     * Fetch with CORS proxy fallback
     */
    async function fetchWithProxy(url) {
        let lastError;

        for (let i = 0; i < CORS_PROXIES.length; i++) {
            const proxyIndex = (state.currentProxyIndex + i) % CORS_PROXIES.length;
            const proxyUrl = CORS_PROXIES[proxyIndex] + encodeURIComponent(url);

            try {
                const response = await fetch(proxyUrl, {
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml'
                    }
                });

                if (response.ok) {
                    state.currentProxyIndex = proxyIndex;
                    return await response.text();
                }
            } catch (error) {
                lastError = error;
                console.warn(`[Discover] Proxy ${proxyIndex} failed:`, error.message);
            }
        }

        throw new Error(`All proxies failed: ${lastError?.message || 'Unknown error'}`);
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

        state.isSearching = true;
        state.currentQuery = query;
        state.currentPage = page;
        showLoading(true);

        // Add to history
        addToHistory(query);

        try {
            // Search all sources in parallel
            const searchPromises = state.sources.map(async (sourceId) => {
                const source = SOURCES[sourceId];
                if (!source) return [];

                try {
                    const url = source.searchUrl(query, page);
                    const html = await fetchWithProxy(url);
                    return source.parseResults(html, source.baseUrl);
                } catch (error) {
                    console.error(`[Discover] ${sourceId} search failed:`, error);
                    return [];
                }
            });

            const allResults = await Promise.all(searchPromises);
            state.results = allResults.flat();

            // Sort by seeders
            state.results.sort((a, b) => (b.seeders || 0) - (a.seeders || 0));

            renderResults(state.results);

            if (state.results.length === 0) {
                showEmptyResults();
            } else {
                showToast(`Nalezeno ${state.results.length} výsledků`, 'success');
            }

        } catch (error) {
            console.error('[Discover] Search failed:', error);
            showToast('Chyba při vyhledávání', 'error');
            showEmptyResults('Nepodařilo se načíst výsledky. Zkuste to znovu.');
        } finally {
            state.isSearching = false;
            showLoading(false);
        }
    }

    /**
     * Show/hide loading
     */
    function showLoading(show) {
        if (elements.loading) {
            elements.loading.style.display = show ? 'flex' : 'none';
        }
        if (elements.results) {
            elements.results.style.display = show ? 'none' : 'flex';
        }
    }

    /**
     * Render results
     */
    function renderResults(results) {
        if (!elements.results) return;

        let html = results.map(result => createResultCard(result)).join('');

        // Add pagination
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

        // Bind events
        bindResultEvents();
    }

    /**
     * Bind result card events
     */
    function bindResultEvents() {
        // Magnet buttons
        elements.results.querySelectorAll('.btn-magnet').forEach(btn => {
            btn.addEventListener('click', handleMagnetClick);
        });

        // Open magnet buttons
        elements.results.querySelectorAll('.btn-open-magnet').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const magnetUri = e.currentTarget.dataset.magnet;
                if (magnetUri) {
                    window.location.href = magnetUri;
                    showToast('Otevírám v torrent klientu...', 'info');
                }
            });
        });

        // Details buttons
        elements.results.querySelectorAll('.btn-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.currentTarget.dataset.url;
                window.open(url, '_blank');
            });
        });

        // Wishlist buttons
        elements.results.querySelectorAll('.btn-wishlist').forEach(btn => {
            btn.addEventListener('click', handleWishlistClick);
        });

        // Pagination buttons
        elements.results.querySelectorAll('.btn-page').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.currentTarget.dataset.page);
                performSearch(page);
            });
        });
    }

    /**
     * Handle magnet button click
     */
    async function handleMagnetClick(e) {
        const btn = e.currentTarget;
        const magnetUri = btn.dataset.magnet;

        if (magnetUri) {
            copyToClipboard(magnetUri);
            showToast('Magnet link zkopírován', 'success');
        } else {
            // Need to fetch from detail page
            const url = btn.dataset.url;
            await fetchMagnetLink(url, btn);
        }
    }

    /**
     * Fetch magnet link from details page
     */
    async function fetchMagnetLink(url, button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<span>⏳</span><span>Načítám...</span>';
        button.disabled = true;

        try {
            const html = await fetchWithProxy(url);

            // Try to extract magnet from HTML
            const magnetMatch = html.match(/magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^"'\s<]*/);

            if (magnetMatch) {
                const magnetUri = magnetMatch[0];
                button.dataset.magnet = magnetUri;

                // Update card with open magnet button
                const card = button.closest('.torrent-card');
                if (card) {
                    const actionsDiv = card.querySelector('.torrent-actions');
                    const openBtn = document.createElement('button');
                    openBtn.className = 'btn-open-magnet';
                    openBtn.dataset.magnet = magnetUri;
                    openBtn.innerHTML = '<span>⬇️</span><span>Stáhnout</span>';
                    openBtn.addEventListener('click', () => {
                        window.location.href = magnetUri;
                        showToast('Otevírám v torrent klientu...', 'info');
                    });
                    actionsDiv.insertBefore(openBtn, actionsDiv.firstChild);
                }

                copyToClipboard(magnetUri);
                showToast('Magnet link zkopírován', 'success');
                button.innerHTML = '<span>🧲</span><span>Zkopírovat znovu</span>';
                button.disabled = false;
            } else {
                throw new Error('Magnet not found');
            }
        } catch (error) {
            console.error('[Discover] Failed to fetch magnet:', error);
            showToast('Nepodařilo se získat magnet link', 'error');
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    /**
     * Handle wishlist button click
     */
    async function handleWishlistClick(e) {
        const btn = e.currentTarget;
        const card = btn.closest('.torrent-card');
        const id = card.dataset.id;
        const source = card.dataset.source;

        const isInWishlist = state.wishlist.some(item => item.id === id);

        if (isInWishlist) {
            await removeFromWishlist(id);
            btn.innerHTML = '<span>💾</span>';
            btn.title = 'Přidat do wishlistu';
            showToast('Odebráno z wishlistu', 'info');
        } else {
            const result = state.results.find(r => r.id === id && r.source === source);
            if (result) {
                await addToWishlist(result);
                btn.innerHTML = '<span>✅</span>';
                btn.title = 'V wishlistu';
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

        return `
            <div class="torrent-card" data-id="${result.id}" data-source="${result.source}">
                <div class="torrent-info">
                    <div class="torrent-title">${escapeHtml(result.title)}</div>
                    <div class="torrent-meta">
                        <span class="torrent-meta-item ${seedersClass}">
                            <span>▲</span>
                            <span>${result.seeders || 0}</span>
                        </span>
                        <span class="torrent-meta-item leechers">
                            <span>▼</span>
                            <span>${result.leechers || 0}</span>
                        </span>
                        <span class="torrent-meta-item">
                            <span>📦</span>
                            <span>${result.size || 'N/A'}</span>
                        </span>
                        <span class="torrent-source">${result.source}</span>
                    </div>
                </div>
                <div class="torrent-actions">
                    ${result.magnetUri ? `
                        <button class="btn-open-magnet" data-magnet="${escapeHtml(result.magnetUri)}" title="Otevřít v torrent klientu">
                            <span>⬇️</span>
                            <span>Stáhnout</span>
                        </button>
                    ` : ''}
                    <button class="btn-magnet"
                            data-magnet="${result.magnetUri ? escapeHtml(result.magnetUri) : ''}"
                            data-source="${result.source}"
                            data-id="${result.id}"
                            data-url="${escapeHtml(result.url)}"
                            title="Kopírovat magnet link">
                        <span>🧲</span>
                        <span>${result.magnetUri ? 'Kopírovat' : 'Získat magnet'}</span>
                    </button>
                    <button class="btn-wishlist" title="${isInWishlist ? 'V wishlistu' : 'Přidat do wishlistu'}">
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
    function showEmptyResults(message = null) {
        if (!elements.results) return;

        elements.results.innerHTML = `
            <div class="discover-empty">
                <div class="empty-icon">🔎</div>
                <h3>${message || 'Žádné výsledky'}</h3>
                <p>Zkuste upravit hledaný výraz nebo zvolit jiné zdroje</p>
            </div>
        `;
    }

    /**
     * Show search suggestions
     */
    function showSearchSuggestions() {
        const query = elements.searchInput.value.trim().toLowerCase();
        let existing = document.getElementById('searchSuggestions');

        if (!query && state.searchHistory.length === 0) {
            if (existing) existing.remove();
            return;
        }

        const suggestions = state.searchHistory
            .filter(item => !query || item.query.toLowerCase().includes(query))
            .slice(0, 5);

        if (suggestions.length === 0) {
            if (existing) existing.remove();
            return;
        }

        if (!existing) {
            existing = document.createElement('div');
            existing.id = 'searchSuggestions';
            existing.className = 'search-suggestions';
            elements.searchInput.parentNode.appendChild(existing);
        }

        existing.innerHTML = suggestions.map(item => `
            <div class="suggestion-item" data-query="${escapeHtml(item.query)}">
                <span>🕐</span>
                <span>${escapeHtml(item.query)}</span>
            </div>
        `).join('');

        existing.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                elements.searchInput.value = item.dataset.query;
                existing.remove();
                performSearch(1);
            });
        });
    }

    /**
     * Add to search history
     */
    async function addToHistory(query) {
        const existing = state.searchHistory.findIndex(h => h.query.toLowerCase() === query.toLowerCase());
        if (existing > -1) {
            state.searchHistory.splice(existing, 1);
        }

        state.searchHistory.unshift({ query, timestamp: Date.now() });
        state.searchHistory = state.searchHistory.slice(0, 20);

        if (db) {
            const tx = db.transaction('history', 'readwrite');
            const store = tx.objectStore('history');
            store.put({ query, timestamp: Date.now() });
        }
    }

    /**
     * Load search history
     */
    async function loadSearchHistory() {
        if (!db) return;

        const tx = db.transaction('history', 'readonly');
        const store = tx.objectStore('history');
        const request = store.getAll();

        request.onsuccess = () => {
            state.searchHistory = request.result
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 20);
        };
    }

    /**
     * Add to wishlist
     */
    async function addToWishlist(item) {
        const wishlistItem = {
            id: item.id,
            title: item.title,
            source: item.source,
            magnetUri: item.magnetUri,
            url: item.url,
            size: item.size,
            seeders: item.seeders,
            addedAt: Date.now()
        };

        state.wishlist.push(wishlistItem);

        if (db) {
            const tx = db.transaction('wishlist', 'readwrite');
            const store = tx.objectStore('wishlist');
            store.put(wishlistItem);
        }
    }

    /**
     * Remove from wishlist
     */
    async function removeFromWishlist(id) {
        state.wishlist = state.wishlist.filter(item => item.id !== id);

        if (db) {
            const tx = db.transaction('wishlist', 'readwrite');
            const store = tx.objectStore('wishlist');
            store.delete(id);
        }
    }

    /**
     * Load wishlist
     */
    async function loadWishlist() {
        if (!db) return;

        const tx = db.transaction('wishlist', 'readonly');
        const store = tx.objectStore('wishlist');
        const request = store.getAll();

        request.onsuccess = () => {
            state.wishlist = request.result || [];
        };
    }

    /**
     * Copy to clipboard
     */
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    }

    /**
     * Show toast
     */
    function showToast(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        }
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===========================================
    // PARSERS
    // ===========================================

    /**
     * Parse 1337x search results
     */
    function parse1337xResults(html, baseUrl) {
        const results = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        doc.querySelectorAll('table.table-list tbody tr').forEach(row => {
            try {
                const nameCell = row.querySelector('td.coll-1');
                const seedersCell = row.querySelector('td.coll-2');
                const leechersCell = row.querySelector('td.coll-3');
                const sizeCell = row.querySelector('td.coll-4');

                if (!nameCell) return;

                const link = nameCell.querySelector('a:nth-child(2)');
                if (!link) return;

                const title = link.textContent.trim();
                const href = link.getAttribute('href');
                const id = href ? href.split('/').filter(Boolean).pop() : null;

                results.push({
                    id,
                    title,
                    url: baseUrl + href,
                    magnetUri: null,
                    seeders: parseInt(seedersCell?.textContent) || 0,
                    leechers: parseInt(leechersCell?.textContent) || 0,
                    size: sizeCell?.textContent.trim().split(/\s+/).slice(0, 2).join(' ') || 'N/A',
                    source: '1337x'
                });
            } catch (e) {
                console.warn('[1337x] Parse error:', e);
            }
        });

        return results;
    }

    /**
     * Parse 1337x details
     */
    function parse1337xDetails(html) {
        const magnetMatch = html.match(/magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^"'\s]*/);
        return magnetMatch ? magnetMatch[0] : null;
    }

    /**
     * Parse Nyaa search results
     */
    function parseNyaaResults(html, baseUrl) {
        const results = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        doc.querySelectorAll('table.torrent-list tbody tr').forEach(row => {
            try {
                const titleCell = row.querySelector('td:nth-child(2)');
                const linksCell = row.querySelector('td:nth-child(3)');
                const sizeCell = row.querySelector('td:nth-child(4)');
                const seedersCell = row.querySelector('td:nth-child(6)');
                const leechersCell = row.querySelector('td:nth-child(7)');

                const titleLink = titleCell?.querySelector('a:not(.comments)');
                if (!titleLink) return;

                const title = titleLink.textContent.trim();
                const href = titleLink.getAttribute('href');
                const id = href ? href.replace('/view/', '') : null;

                const magnetLink = linksCell?.querySelector('a[href^="magnet:"]');
                const magnetUri = magnetLink?.getAttribute('href');

                results.push({
                    id,
                    title,
                    url: baseUrl + href,
                    magnetUri,
                    seeders: parseInt(seedersCell?.textContent) || 0,
                    leechers: parseInt(leechersCell?.textContent) || 0,
                    size: sizeCell?.textContent.trim() || 'N/A',
                    source: 'nyaa'
                });
            } catch (e) {
                console.warn('[Nyaa] Parse error:', e);
            }
        });

        return results;
    }

    /**
     * Parse Nyaa details
     */
    function parseNyaaDetails(html) {
        const magnetMatch = html.match(/magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^"'\s]*/);
        return magnetMatch ? magnetMatch[0] : null;
    }

    /**
     * Parse LimeTorrents results
     */
    function parseLimeResults(html, baseUrl) {
        const results = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        doc.querySelectorAll('table.table2 tr.table2').forEach(row => {
            try {
                const nameCell = row.querySelector('td.tdleft');
                const sizeCell = row.querySelector('td.tdnormal:nth-child(3)');
                const seedersCell = row.querySelector('td.tdseed');
                const leechersCell = row.querySelector('td.tdleech');

                const titleLink = nameCell?.querySelector('div.tt-name a:nth-child(2)');
                if (!titleLink) return;

                const title = titleLink.textContent.trim();
                const href = titleLink.getAttribute('href');
                const id = href ? href.split('/').filter(Boolean).pop() : null;

                const magnetLink = row.querySelector('a[href^="magnet:"]');
                const magnetUri = magnetLink?.getAttribute('href');

                results.push({
                    id,
                    title,
                    url: baseUrl + href,
                    magnetUri,
                    seeders: parseInt(seedersCell?.textContent) || 0,
                    leechers: parseInt(leechersCell?.textContent) || 0,
                    size: sizeCell?.textContent.trim() || 'N/A',
                    source: 'limetorrents'
                });
            } catch (e) {
                console.warn('[LimeTorrents] Parse error:', e);
            }
        });

        return results;
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('discoverView')) {
        DiscoverModule.init();
    }
});
