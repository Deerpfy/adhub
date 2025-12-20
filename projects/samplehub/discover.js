/**
 * SampleHub - Discover Module (Browser-Only)
 * Handles torrent search functionality purely in the browser
 * Uses CORS proxies to fetch content from torrent indexers
 * Version: 2.0
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
        results: [],
        sources: ['1337x', 'nyaa', 'limetorrents'],
        currentProxyIndex: 0
    };

    // DOM Elements
    let elements = {};

    /**
     * Initialize the module
     */
    function init() {
        cacheElements();
        bindEvents();
        updateStatusIndicator(true); // Browser-only is always "ready"
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
            elements.searchBtn.addEventListener('click', performSearch);
        }

        if (elements.searchInput) {
            elements.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
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
    async function performSearch() {
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
        showLoading(true);

        try {
            // Search all sources in parallel
            const searchPromises = state.sources.map(async (sourceId) => {
                const source = SOURCES[sourceId];
                if (!source) return [];

                try {
                    const url = source.searchUrl(query, 1);
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

        elements.results.innerHTML = results.map(result => createResultCard(result)).join('');

        // Bind events
        elements.results.querySelectorAll('.btn-magnet').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const magnetUri = e.currentTarget.dataset.magnet;
                if (magnetUri) {
                    copyToClipboard(magnetUri);
                    showToast('Magnet link zkopírován', 'success');
                } else {
                    // Need to fetch details first
                    const source = e.currentTarget.dataset.source;
                    const id = e.currentTarget.dataset.id;
                    const url = e.currentTarget.dataset.url;
                    fetchMagnetLink(source, id, url, e.currentTarget);
                }
            });
        });

        elements.results.querySelectorAll('.btn-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.currentTarget.dataset.url;
                window.open(url, '_blank');
            });
        });
    }

    /**
     * Fetch magnet link from details page
     */
    async function fetchMagnetLink(source, id, url, button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<span>⏳</span><span>Načítám...</span>';
        button.disabled = true;

        try {
            const html = await fetchWithProxy(url);
            const sourceConfig = SOURCES[source];

            let magnetUri = null;

            // Try to extract magnet from HTML
            const magnetMatch = html.match(/magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^"'\s]*/);
            if (magnetMatch) {
                magnetUri = magnetMatch[0];
            }

            if (magnetUri) {
                button.dataset.magnet = magnetUri;
                copyToClipboard(magnetUri);
                showToast('Magnet link zkopírován', 'success');
                button.innerHTML = '<span>🧲</span><span>Zkopírováno!</span>';
                setTimeout(() => {
                    button.innerHTML = '<span>🧲</span><span>Kopírovat magnet</span>';
                    button.disabled = false;
                }, 2000);
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
     * Create result card
     */
    function createResultCard(result) {
        const seedersClass = result.seeders > 10 ? 'seeders' : (result.seeders > 0 ? '' : 'leechers');

        return `
            <div class="torrent-card" data-id="${result.id}" data-source="${result.source}">
                <div class="torrent-info">
                    <div class="torrent-title">${escapeHtml(result.title)}</div>
                    <div class="torrent-meta">
                        <span class="torrent-meta-item ${seedersClass}">
                            <span>▲</span>
                            <span>${result.seeders || 0} seeders</span>
                        </span>
                        <span class="torrent-meta-item leechers">
                            <span>▼</span>
                            <span>${result.leechers || 0} leechers</span>
                        </span>
                        <span class="torrent-meta-item">
                            <span>📦</span>
                            <span>${result.size || 'N/A'}</span>
                        </span>
                        <span class="torrent-source">${result.source}</span>
                    </div>
                </div>
                <div class="torrent-actions">
                    <button class="btn-magnet"
                            data-magnet="${result.magnetUri ? escapeHtml(result.magnetUri) : ''}"
                            data-source="${result.source}"
                            data-id="${result.id}"
                            data-url="${escapeHtml(result.url)}">
                        <span>🧲</span>
                        <span>${result.magnetUri ? 'Kopírovat magnet' : 'Získat magnet'}</span>
                    </button>
                    <button class="btn-details" data-url="${escapeHtml(result.url)}">
                        <span>🔗</span>
                        <span>Otevřít</span>
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
     * Copy to clipboard
     */
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = text;
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
                    magnetUri: null, // Need to fetch from detail page
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

                const link = nameCell?.querySelector('a.csprite_dl14');
                const titleLink = nameCell?.querySelector('div.tt-name a:nth-child(2)');

                if (!titleLink) return;

                const title = titleLink.textContent.trim();
                const href = titleLink.getAttribute('href');
                const id = href ? href.split('/').filter(Boolean).pop() : null;

                // LimeTorrents has magnet in the row
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
        getState: () => ({ ...state })
    };

})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('discoverView')) {
        DiscoverModule.init();
    }
});
