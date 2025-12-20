/**
 * SampleHub - Torrent Downloader Module
 * In-browser torrent downloading with WebTorrent
 * Version: 1.0
 */

const TorrentDownloader = (function() {
    'use strict';

    // WebTorrent client
    let client = null;

    // Active downloads
    const downloads = new Map();

    // Audio file extensions
    const AUDIO_EXTENSIONS = ['.wav', '.mp3', '.flac', '.aiff', '.aif', '.ogg', '.m4a', '.wma'];

    // Dangerous file extensions to warn about
    const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.msi', '.scr', '.pif', '.com', '.js', '.vbs', '.ps1', '.dll'];

    // State
    let state = {
        isInitialized: false,
        totalDownloads: 0,
        activeDownloads: 0
    };

    // Storage key
    const STORAGE_KEY = 'samplehub-downloads';

    /**
     * Initialize WebTorrent client
     */
    function init() {
        if (state.isInitialized) return;

        if (typeof WebTorrent === 'undefined') {
            console.error('[TorrentDownloader] WebTorrent not loaded');
            return;
        }

        try {
            client = new WebTorrent();
            state.isInitialized = true;
            console.log('[TorrentDownloader] Initialized');

            client.on('error', (err) => {
                console.error('[TorrentDownloader] Client error:', err);
                showToast('Chyba torrent klienta', 'error');
            });

            // Load saved downloads
            loadDownloadHistory();
            renderDownloadsPanel();
        } catch (e) {
            console.error('[TorrentDownloader] Init failed:', e);
        }
    }

    /**
     * Show virus/safety warning before download
     */
    function showSafetyWarning(torrentInfo, onConfirm) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'safetyWarningModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header warning-header">
                    <h3 class="modal-title">
                        <svg class="icon icon-xl icon-warning"><use href="icons.svg#icon-warning"></use></svg>
                        Bezpečnostní varování
                    </h3>
                    <button class="modal-close" id="closeSafetyModal">
                        <svg class="icon"><use href="icons.svg#icon-close"></use></svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="warning-content">
                        <div class="warning-icon-large">
                            <svg class="icon icon-4x icon-danger"><use href="icons.svg#icon-warning"></use></svg>
                        </div>

                        <h4>⚠️ Pozor na viry a malware!</h4>

                        <div class="warning-text">
                            <p><strong>Torrenty mohou obsahovat škodlivý software:</strong></p>
                            <ul>
                                <li>🦠 <strong>Viry a trojské koně</strong> - maskované jako audio soubory</li>
                                <li>💀 <strong>Ransomware</strong> - může zašifrovat vaše soubory</li>
                                <li>🔓 <strong>Spyware</strong> - krade osobní údaje</li>
                                <li>⚡ <strong>Crypto miners</strong> - zneužívají výkon počítače</li>
                            </ul>

                            <p class="warning-recommendation"><strong>Doporučení:</strong></p>
                            <ul>
                                <li>✅ Stahujte pouze z důvěryhodných zdrojů</li>
                                <li>✅ Zkontrolujte komentáře a hodnocení</li>
                                <li>✅ Používejte antivirus</li>
                                <li>✅ Nespouštějte .exe, .bat nebo jiné spustitelné soubory</li>
                                <li>✅ Preferujte torrenty s vysokým seeders/leechers poměrem</li>
                            </ul>
                        </div>

                        <div class="torrent-preview">
                            <h5>📦 Torrent k stažení:</h5>
                            <p class="torrent-name">${escapeHtml(torrentInfo.title)}</p>
                            <p class="torrent-size">${torrentInfo.size || 'Neznámá velikost'}</p>
                            <p class="torrent-seeders">
                                <span class="seeders">▲ ${torrentInfo.seeders || 0}</span>
                                <span class="leechers">▼ ${torrentInfo.leechers || 0}</span>
                            </p>
                        </div>

                        <label class="checkbox-label warning-checkbox">
                            <input type="checkbox" id="acceptRiskCheckbox">
                            <span>Rozumím rizikům a chci pokračovat ve stahování</span>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancelDownloadBtn">
                        <svg class="icon"><use href="icons.svg#icon-close"></use></svg>
                        <span>Zrušit</span>
                    </button>
                    <button class="btn-danger" id="confirmDownloadBtn" disabled>
                        <svg class="icon"><use href="icons.svg#icon-download"></use></svg>
                        <span>Stáhnout na vlastní riziko</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Bind events
        const closeBtn = document.getElementById('closeSafetyModal');
        const cancelBtn = document.getElementById('cancelDownloadBtn');
        const confirmBtn = document.getElementById('confirmDownloadBtn');
        const checkbox = document.getElementById('acceptRiskCheckbox');

        const closeModal = () => modal.remove();

        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };

        checkbox.onchange = () => {
            confirmBtn.disabled = !checkbox.checked;
        };

        confirmBtn.onclick = () => {
            closeModal();
            if (onConfirm) onConfirm();
        };
    }

    /**
     * Start downloading a torrent
     */
    function downloadTorrent(magnetUri, torrentInfo = {}) {
        if (!state.isInitialized) {
            init();
            if (!state.isInitialized) {
                showToast('WebTorrent není dostupný', 'error');
                return;
            }
        }

        // Show safety warning first
        showSafetyWarning(torrentInfo, () => {
            startDownload(magnetUri, torrentInfo);
        });
    }

    /**
     * Actually start the download after confirmation
     */
    function startDownload(magnetUri, torrentInfo) {
        const downloadId = 'dl-' + Date.now();

        console.log('[TorrentDownloader] Starting download:', magnetUri);
        showToast('Připojuji se k torrentu...', 'info');

        try {
            client.add(magnetUri, {
                announce: [
                    'wss://tracker.openwebtorrent.com',
                    'wss://tracker.btorrent.xyz',
                    'wss://tracker.fastcast.nz'
                ]
            }, (torrent) => {
                console.log('[TorrentDownloader] Torrent added:', torrent.name);

                const download = {
                    id: downloadId,
                    infoHash: torrent.infoHash,
                    name: torrent.name || torrentInfo.title || 'Unknown',
                    size: torrent.length,
                    progress: 0,
                    speed: 0,
                    status: 'downloading',
                    files: [],
                    audioFiles: [],
                    startedAt: Date.now(),
                    torrentInfo
                };

                downloads.set(downloadId, download);
                state.activeDownloads++;
                renderDownloadsPanel();
                showDownloadsPanel();

                // Progress updates
                torrent.on('download', (bytes) => {
                    download.progress = torrent.progress;
                    download.speed = torrent.downloadSpeed;
                    download.downloaded = torrent.downloaded;
                    updateDownloadUI(downloadId);
                });

                // Check for dangerous files
                const dangerousFiles = [];
                torrent.files.forEach(file => {
                    const ext = '.' + file.name.split('.').pop().toLowerCase();
                    if (DANGEROUS_EXTENSIONS.includes(ext)) {
                        dangerousFiles.push(file.name);
                    }
                });

                if (dangerousFiles.length > 0) {
                    showToast(`⚠️ Varování: Torrent obsahuje potenciálně nebezpečné soubory!`, 'warning');
                }

                // Done
                torrent.on('done', () => {
                    console.log('[TorrentDownloader] Download complete:', torrent.name);
                    download.status = 'completed';
                    download.progress = 1;
                    download.completedAt = Date.now();
                    state.activeDownloads--;

                    // Process files
                    processDownloadedFiles(downloadId, torrent);
                    saveDownloadHistory();
                    updateDownloadUI(downloadId);
                    showToast(`✅ Staženo: ${torrent.name}`, 'success');
                });

                torrent.on('error', (err) => {
                    console.error('[TorrentDownloader] Torrent error:', err);
                    download.status = 'error';
                    download.error = err.message;
                    state.activeDownloads--;
                    updateDownloadUI(downloadId);
                    showToast(`Chyba: ${err.message}`, 'error');
                });
            });
        } catch (e) {
            console.error('[TorrentDownloader] Add torrent failed:', e);
            showToast('Nepodařilo se přidat torrent', 'error');
        }
    }

    /**
     * Process downloaded files - extract audio
     */
    function processDownloadedFiles(downloadId, torrent) {
        const download = downloads.get(downloadId);
        if (!download) return;

        download.files = [];
        download.audioFiles = [];

        torrent.files.forEach(file => {
            const ext = '.' + file.name.split('.').pop().toLowerCase();
            const fileInfo = {
                name: file.name,
                path: file.path,
                size: file.length,
                extension: ext
            };

            download.files.push(fileInfo);

            if (AUDIO_EXTENSIONS.includes(ext)) {
                download.audioFiles.push({
                    ...fileInfo,
                    file: file,
                    blob: null
                });
            }
        });

        console.log('[TorrentDownloader] Found', download.audioFiles.length, 'audio files');

        // Create blob URLs for audio files
        download.audioFiles.forEach((audioFile, idx) => {
            audioFile.file.getBlob((err, blob) => {
                if (err) {
                    console.error('[TorrentDownloader] Blob error:', err);
                    return;
                }
                audioFile.blob = blob;
                audioFile.blobUrl = URL.createObjectURL(blob);

                // Update UI
                if (idx === download.audioFiles.length - 1) {
                    updateDownloadUI(downloadId);

                    // Auto-import to library if audio files found
                    if (download.audioFiles.length > 0) {
                        importToLibrary(downloadId);
                    }
                }
            });
        });
    }

    /**
     * Import downloaded audio files to library
     */
    async function importToLibrary(downloadId) {
        const download = downloads.get(downloadId);
        if (!download || download.audioFiles.length === 0) return;

        console.log('[TorrentDownloader] Importing', download.audioFiles.length, 'files to library');

        // Create a pack for this torrent
        const packId = 'pack-' + downloadId;
        const pack = {
            id: packId,
            name: download.name,
            source: 'torrent',
            downloadId: downloadId,
            createdAt: Date.now(),
            sampleCount: download.audioFiles.length
        };

        // Import each audio file as a sample
        const samples = [];
        for (const audioFile of download.audioFiles) {
            if (!audioFile.blob) continue;

            try {
                const sample = {
                    id: 'sample-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    name: audioFile.name.replace(/\.[^/.]+$/, ''),
                    filename: audioFile.name,
                    extension: audioFile.extension,
                    size: audioFile.size,
                    packId: packId,
                    packName: download.name,
                    source: 'torrent',
                    blobUrl: audioFile.blobUrl,
                    blob: audioFile.blob,
                    addedAt: Date.now(),
                    isFavorite: false
                };

                samples.push(sample);
            } catch (e) {
                console.error('[TorrentDownloader] Import file error:', e);
            }
        }

        // Send to main app
        if (samples.length > 0) {
            window.dispatchEvent(new CustomEvent('torrent-import', {
                detail: { pack, samples }
            }));

            showToast(`📚 Importováno ${samples.length} samplů do knihovny`, 'success');

            // Switch to library view
            const libraryBtn = document.querySelector('[data-view="library"]');
            if (libraryBtn) libraryBtn.click();
        }
    }

    /**
     * Render downloads panel
     */
    function renderDownloadsPanel() {
        let panel = document.getElementById('downloadsPanel');

        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'downloadsPanel';
            panel.className = 'downloads-panel';
            panel.innerHTML = `
                <div class="downloads-header">
                    <h4>
                        <svg class="icon"><use href="icons.svg#icon-download"></use></svg>
                        Stahování
                        <span class="downloads-count" id="downloadsCount">0</span>
                    </h4>
                    <button class="downloads-toggle" id="toggleDownloads">
                        <svg class="icon"><use href="icons.svg#icon-chevron-down"></use></svg>
                    </button>
                </div>
                <div class="downloads-list" id="downloadsList"></div>
            `;
            document.body.appendChild(panel);

            document.getElementById('toggleDownloads').onclick = () => {
                panel.classList.toggle('collapsed');
            };
        }

        updateDownloadsList();
    }

    /**
     * Show downloads panel
     */
    function showDownloadsPanel() {
        const panel = document.getElementById('downloadsPanel');
        if (panel) {
            panel.classList.add('visible');
            panel.classList.remove('collapsed');
        }
    }

    /**
     * Update downloads list
     */
    function updateDownloadsList() {
        const list = document.getElementById('downloadsList');
        const count = document.getElementById('downloadsCount');
        if (!list) return;

        if (count) count.textContent = downloads.size;

        if (downloads.size === 0) {
            list.innerHTML = '<p class="downloads-empty">Žádná stahování</p>';
            return;
        }

        let html = '';
        downloads.forEach((download, id) => {
            const progress = Math.round(download.progress * 100);
            const speed = formatSpeed(download.speed);
            const statusClass = download.status;
            const statusIcon = getStatusIcon(download.status);

            html += `
                <div class="download-item ${statusClass}" data-id="${id}">
                    <div class="download-info">
                        <span class="download-name" title="${escapeHtml(download.name)}">${escapeHtml(download.name)}</span>
                        <span class="download-meta">
                            ${download.status === 'downloading' ? `${progress}% • ${speed}` : ''}
                            ${download.status === 'completed' ? `✅ ${download.audioFiles?.length || 0} audio souborů` : ''}
                            ${download.status === 'error' ? `❌ ${download.error || 'Chyba'}` : ''}
                        </span>
                    </div>
                    <div class="download-progress">
                        <div class="download-progress-bar" style="width: ${progress}%"></div>
                    </div>
                    <div class="download-actions">
                        ${download.status === 'completed' && download.audioFiles?.length > 0 ? `
                            <button class="btn-play-download" data-id="${id}" title="Přehrát">
                                <svg class="icon"><use href="icons.svg#icon-play"></use></svg>
                            </button>
                            <button class="btn-import-download" data-id="${id}" title="Importovat do knihovny">
                                <svg class="icon"><use href="icons.svg#icon-import"></use></svg>
                            </button>
                        ` : ''}
                        <button class="btn-remove-download" data-id="${id}" title="Odebrat">
                            <svg class="icon"><use href="icons.svg#icon-close"></use></svg>
                        </button>
                    </div>
                </div>
            `;
        });

        list.innerHTML = html;
        bindDownloadActions();
    }

    /**
     * Bind download action buttons
     */
    function bindDownloadActions() {
        document.querySelectorAll('.btn-play-download').forEach(btn => {
            btn.onclick = () => playDownload(btn.dataset.id);
        });

        document.querySelectorAll('.btn-import-download').forEach(btn => {
            btn.onclick = () => importToLibrary(btn.dataset.id);
        });

        document.querySelectorAll('.btn-remove-download').forEach(btn => {
            btn.onclick = () => removeDownload(btn.dataset.id);
        });
    }

    /**
     * Update single download UI
     */
    function updateDownloadUI(downloadId) {
        updateDownloadsList();
    }

    /**
     * Play first audio file from download
     */
    function playDownload(downloadId) {
        const download = downloads.get(downloadId);
        if (!download || !download.audioFiles?.length) return;

        const audioFile = download.audioFiles.find(f => f.blobUrl);
        if (audioFile) {
            window.dispatchEvent(new CustomEvent('play-audio', {
                detail: {
                    name: audioFile.name,
                    url: audioFile.blobUrl,
                    source: 'torrent'
                }
            }));
        }
    }

    /**
     * Remove download
     */
    function removeDownload(downloadId) {
        const download = downloads.get(downloadId);
        if (!download) return;

        // Revoke blob URLs
        download.audioFiles?.forEach(f => {
            if (f.blobUrl) URL.revokeObjectURL(f.blobUrl);
        });

        // Remove from client
        if (client && download.infoHash) {
            const torrent = client.get(download.infoHash);
            if (torrent) {
                torrent.destroy();
            }
        }

        downloads.delete(downloadId);
        updateDownloadsList();
        saveDownloadHistory();
    }

    /**
     * Save download history to localStorage
     */
    function saveDownloadHistory() {
        const history = [];
        downloads.forEach((download, id) => {
            if (download.status === 'completed') {
                history.push({
                    id,
                    name: download.name,
                    size: download.size,
                    audioFilesCount: download.audioFiles?.length || 0,
                    completedAt: download.completedAt,
                    torrentInfo: download.torrentInfo
                });
            }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
    }

    /**
     * Load download history from localStorage
     */
    function loadDownloadHistory() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const history = JSON.parse(saved);
                // Just for display, not actual torrents
            }
        } catch (e) {}
    }

    // Helpers
    function formatSpeed(bytesPerSec) {
        if (!bytesPerSec) return '0 B/s';
        if (bytesPerSec > 1048576) return (bytesPerSec / 1048576).toFixed(1) + ' MB/s';
        if (bytesPerSec > 1024) return (bytesPerSec / 1024).toFixed(1) + ' KB/s';
        return bytesPerSec + ' B/s';
    }

    function getStatusIcon(status) {
        switch (status) {
            case 'downloading': return 'icon-loading';
            case 'completed': return 'icon-check';
            case 'error': return 'icon-error';
            default: return 'icon-download';
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showToast(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            console.log('[Toast]', type, message);
        }
    }

    // Public API
    return {
        init,
        downloadTorrent,
        getDownloads: () => new Map(downloads),
        getActiveCount: () => state.activeDownloads,
        isInitialized: () => state.isInitialized
    };

})();

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for WebTorrent to load
    if (typeof WebTorrent !== 'undefined') {
        TorrentDownloader.init();
    } else {
        // Try again after a delay
        setTimeout(() => {
            if (typeof WebTorrent !== 'undefined') {
                TorrentDownloader.init();
            }
        }, 1000);
    }
});
