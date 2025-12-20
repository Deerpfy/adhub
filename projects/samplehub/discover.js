/**
 * SampleHub - Discover Module
 * Handles torrent search functionality in the frontend
 * Version: 1.0
 */

const DiscoverModule = (function() {
    'use strict';

    // Configuration
    const config = {
        serverUrl: 'http://localhost:3456',
        defaultSources: ['1337x', 'solidtorrents', 'nyaa'],
        resultsPerPage: 50
    };

    // State
    let state = {
        isServerOnline: false,
        isSearching: false,
        currentQuery: '',
        results: [],
        sources: [...config.defaultSources],
        useTor: false,
        useProxy: false
    };

    // DOM Elements
    let elements = {};

    /**
     * Initialize the module
     */
    function init() {
        cacheElements();
        bindEvents();
        checkServerStatus();

        // Check server status periodically
        setInterval(checkServerStatus, 30000);
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
            useTor: document.getElementById('useTor'),
            useProxy: document.getElementById('useProxy'),
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
        // Search
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

        // Source toggles
        if (elements.sourceToggles) {
            elements.sourceToggles.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    updateSources();
                }
            });
        }

        // Anonymity options
        if (elements.useTor) {
            elements.useTor.addEventListener('change', (e) => {
                state.useTor = e.target.checked;
                if (state.useTor) {
                    state.useProxy = false;
                    elements.useProxy.checked = false;
                }
            });
        }

        if (elements.useProxy) {
            elements.useProxy.addEventListener('change', (e) => {
                state.useProxy = e.target.checked;
                if (state.useProxy) {
                    state.useTor = false;
                    elements.useTor.checked = false;
                }
            });
        }

        // Banner close
        if (elements.closeBanner) {
            elements.closeBanner.addEventListener('click', () => {
                elements.banner.style.display = 'none';
                localStorage.setItem('discoverBannerDismissed', 'true');
            });
        }

        // Check if banner was dismissed
        if (localStorage.getItem('discoverBannerDismissed') === 'true') {
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
            if (cb.checked) {
                state.sources.push(cb.value);
            }
        });
    }

    /**
     * Check if server is online
     */
    async function checkServerStatus() {
        try {
            const response = await fetch(`${config.serverUrl}/api/health`, {
                method: 'GET',
                timeout: 5000
            });

            if (response.ok) {
                state.isServerOnline = true;
                updateStatusIndicator(true);
            } else {
                throw new Error('Server returned non-OK status');
            }
        } catch (error) {
            state.isServerOnline = false;
            updateStatusIndicator(false);
        }
    }

    /**
     * Update status indicator
     */
    function updateStatusIndicator(online) {
        if (!elements.status) return;

        const dot = elements.status.querySelector('.status-dot');
        const text = elements.status.querySelector('.status-text');

        if (online) {
            dot.classList.remove('offline');
            dot.classList.add('online');
            text.textContent = 'Server online';
        } else {
            dot.classList.remove('online');
            dot.classList.add('offline');
            text.textContent = 'Server offline';
        }
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

        if (!state.isServerOnline) {
            showToast('Server není dostupný. Spusťte: npm start v adresáři server/', 'error');
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
            // Build search URL
            const params = new URLSearchParams({
                q: query,
                sources: state.sources.join(','),
                limit: config.resultsPerPage
            });

            if (state.useTor) {
                params.append('tor', 'true');
            }

            const response = await fetch(`${config.serverUrl}/api/search?${params}`);

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();

            state.results = data.results || [];
            renderResults(state.results);

            if (state.results.length === 0) {
                showEmptyResults();
            }

        } catch (error) {
            console.error('[Discover] Search failed:', error);
            showToast(`Chyba při vyhledávání: ${error.message}`, 'error');
            showEmptyResults('Nepodařilo se načíst výsledky');
        } finally {
            state.isSearching = false;
            showLoading(false);
        }
    }

    /**
     * Show/hide loading state
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
     * Render search results
     */
    function renderResults(results) {
        if (!elements.results) return;

        elements.results.innerHTML = results.map(result => createResultCard(result)).join('');

        // Bind result card events
        elements.results.querySelectorAll('.btn-magnet').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const magnetUri = e.currentTarget.dataset.magnet;
                copyMagnetLink(magnetUri);
            });
        });

        elements.results.querySelectorAll('.btn-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const source = e.currentTarget.dataset.source;
                const id = e.currentTarget.dataset.id;
                showTorrentDetails(source, id);
            });
        });
    }

    /**
     * Create result card HTML
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
                            <span>${result.sizeHuman || 'N/A'}</span>
                        </span>
                        ${result.uploadDate ? `
                            <span class="torrent-meta-item">
                                <span>📅</span>
                                <span>${result.uploadDate}</span>
                            </span>
                        ` : ''}
                        <span class="torrent-source">${result.source}</span>
                    </div>
                </div>
                <div class="torrent-actions">
                    ${result.magnetUri ? `
                        <button class="btn-magnet" data-magnet="${escapeHtml(result.magnetUri)}">
                            <span>🧲</span>
                            <span>Kopírovat magnet</span>
                        </button>
                    ` : ''}
                    <button class="btn-details" data-source="${result.source}" data-id="${result.id}">
                        <span>📋</span>
                        <span>Detaily</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Show empty results state
     */
    function showEmptyResults(message = null) {
        if (!elements.results) return;

        elements.results.innerHTML = `
            <div class="discover-empty">
                <div class="empty-icon">🔎</div>
                <h3>${message || 'Žádné výsledky'}</h3>
                <p>Zkuste upravit vyhledávací dotaz nebo zvolit jiné zdroje</p>
            </div>
        `;
    }

    /**
     * Copy magnet link to clipboard
     */
    async function copyMagnetLink(magnetUri) {
        try {
            await navigator.clipboard.writeText(magnetUri);
            showToast('Magnet link zkopírován do schránky', 'success');
        } catch (error) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = magnetUri;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Magnet link zkopírován do schránky', 'success');
        }
    }

    /**
     * Show torrent details
     */
    async function showTorrentDetails(source, id) {
        try {
            const response = await fetch(`${config.serverUrl}/api/torrent/${source}/${id}`);

            if (!response.ok) {
                throw new Error('Failed to fetch details');
            }

            const details = await response.json();

            // Find the card and expand it with details
            const card = elements.results.querySelector(`[data-id="${id}"][data-source="${source}"]`);
            if (card) {
                // Check if details already shown
                const existingFiles = card.querySelector('.torrent-files');
                if (existingFiles) {
                    existingFiles.remove();
                    return;
                }

                // Add file list
                const filesHtml = createFileListHtml(details);
                card.insertAdjacentHTML('beforeend', filesHtml);
            }

        } catch (error) {
            console.error('[Discover] Failed to fetch details:', error);
            showToast('Nepodařilo se načíst detaily', 'error');
        }
    }

    /**
     * Create file list HTML
     */
    function createFileListHtml(details) {
        const files = details.files || [];
        const audioExtensions = ['.wav', '.mp3', '.flac', '.aiff', '.ogg', '.aif'];

        const isAudioFile = (name) => {
            const ext = name.toLowerCase().match(/\.[a-z0-9]+$/);
            return ext && audioExtensions.includes(ext[0]);
        };

        const formatSize = (bytes) => {
            if (!bytes) return 'N/A';
            const units = ['B', 'KB', 'MB', 'GB'];
            let i = 0;
            while (bytes >= 1024 && i < units.length - 1) {
                bytes /= 1024;
                i++;
            }
            return `${bytes.toFixed(1)} ${units[i]}`;
        };

        const audioFiles = files.filter(f => isAudioFile(f.name));

        return `
            <div class="torrent-files">
                <div class="torrent-files-header">
                    <h4>Soubory (${files.length} celkem, ${audioFiles.length} audio)</h4>
                </div>
                <div class="file-list">
                    ${files.slice(0, 50).map(file => `
                        <div class="file-item ${isAudioFile(file.name) ? 'file-audio' : ''}">
                            <span class="file-name">${escapeHtml(file.name)}</span>
                            <span class="file-size">${formatSize(file.size || file.length)}</span>
                        </div>
                    `).join('')}
                    ${files.length > 50 ? `
                        <div class="file-item">
                            <span class="file-name">... a ${files.length - 50} dalších souborů</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'info') {
        // Use global showToast if available
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }

        // Fallback toast implementation
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-hide');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Public API
     */
    return {
        init,
        performSearch,
        checkServerStatus,
        getState: () => ({ ...state }),
        setServerUrl: (url) => { config.serverUrl = url; }
    };

})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if discover view exists
    if (document.getElementById('discoverView')) {
        DiscoverModule.init();
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiscoverModule;
}
