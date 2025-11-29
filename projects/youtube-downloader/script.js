/**
 * AdHub Youtube Downloader - Client Script
 * Verze: 2.0.0
 *
 * Tento skript obsluhuje webovou stranku pro stahovani YouTube videi.
 * Obsahuje logiku pro:
 * - Detekci pluginu
 * - Nacteni informaci o commitu z GitHub
 * - Generovani ZIP souboru s pluginem
 * - Komunikaci s pluginem
 *
 * DULEZITE: Zadne cykly, zadne memory leaky!
 */

console.log('[AdHub] Script loaded');

// ============================================================================
// KONSTANTY
// ============================================================================

const GITHUB_REPO = 'Deerpfy/adhub';
const GITHUB_BRANCH = 'main';
const PLUGIN_PATH = 'projects/youtube-downloader/plugin';
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

// ============================================================================
// STAV APLIKACE
// ============================================================================

const state = {
    pluginConnected: false,
    pluginId: null,
    pluginVersion: null,
    latestCommit: null,
    currentVideoInfo: null,
    currentFormats: null
};

// ============================================================================
// DOM ELEMENTY
// ============================================================================

let elements = {};

// ============================================================================
// INICIALIZACE
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[AdHub] DOMContentLoaded');

    initializeDOMElements();
    setupEventListeners();
    loadDownloadsHistory();

    // Poslouchej na plugin ready event
    window.addEventListener('adhub-extension-ready', handlePluginReady);

    // Kontrola pluginu
    checkPlugin();

    // Nacteni informaci o commitu
    loadLatestCommitInfo();

    console.log('[AdHub] Inicializace dokoncena');
});

function initializeDOMElements() {
    elements = {
        // Status
        extensionStatus: document.getElementById('extensionStatus'),
        extensionStatusText: document.getElementById('extensionStatusText'),
        pluginInfoBar: document.getElementById('pluginInfoBar'),
        pluginVersion: document.getElementById('pluginVersion'),
        pluginCommit: document.getElementById('pluginCommit'),

        // Sekce
        installSection: document.getElementById('installSection'),
        downloadSection: document.getElementById('downloadSection'),

        // Commit info
        commitLoading: document.getElementById('commitLoading'),
        commitDetails: document.getElementById('commitDetails'),
        latestCommitId: document.getElementById('latestCommitId'),
        latestCommitDate: document.getElementById('latestCommitDate'),
        latestCommitMessage: document.getElementById('latestCommitMessage'),

        // Download
        downloadPluginBtn: document.getElementById('downloadPluginBtn'),
        downloadProgress: document.getElementById('downloadProgress'),
        downloadProgressFill: document.getElementById('downloadProgressFill'),
        downloadProgressText: document.getElementById('downloadProgressText'),

        // Video form
        videoForm: document.getElementById('videoForm'),
        videoUrl: document.getElementById('videoUrl'),
        fetchInfoBtn: document.getElementById('fetchInfoBtn'),
        videoInfoCard: document.getElementById('videoInfoCard'),
        videoThumbnail: document.getElementById('videoThumbnail'),
        videoTitle: document.getElementById('videoTitle'),
        videoUploader: document.getElementById('videoUploader'),
        videoDuration: document.getElementById('videoDuration'),

        // Formaty
        formatsCard: document.getElementById('formatsCard'),
        combinedFormatsSection: document.getElementById('combinedFormatsSection'),
        videoFormatsSection: document.getElementById('videoFormatsSection'),
        audioFormatsSection: document.getElementById('audioFormatsSection'),
        combinedFormatsList: document.getElementById('combinedFormatsList'),
        videoFormatsList: document.getElementById('videoFormatsList'),
        audioFormatsList: document.getElementById('audioFormatsList'),

        // Historie
        downloadsList: document.getElementById('downloadsList'),

        // Toast
        toastContainer: document.getElementById('toastContainer')
    };
}

function setupEventListeners() {
    // Download plugin button
    if (elements.downloadPluginBtn) {
        elements.downloadPluginBtn.addEventListener('click', handleDownloadPlugin);
    }

    // Go to YouTube button
    const goToYoutubeBtn = document.getElementById('goToYoutubeBtn');
    if (goToYoutubeBtn) {
        goToYoutubeBtn.addEventListener('click', () => {
            window.open('https://www.youtube.com', '_blank');
        });
    }

    // Video form
    if (elements.videoForm) {
        elements.videoForm.addEventListener('submit', handleVideoSubmit);
    }
}

// ============================================================================
// DETEKCE PLUGINU
// ============================================================================

function handlePluginReady(event) {
    console.log('[AdHub] Plugin ready event received:', event.detail);
    if (event.detail && event.detail.id) {
        state.pluginConnected = true;
        state.pluginId = event.detail.id;
        state.pluginVersion = event.detail.version;
        updatePluginStatus(true);
    }
}

async function checkPlugin() {
    console.log('[AdHub] Kontroluji plugin...');

    try {
        // Metoda 1: localStorage (nastaveno page-bridge.js)
        const storedActive = localStorage.getItem('adhub_extension_active');
        const storedId = localStorage.getItem('adhub_extension_id');
        const storedVersion = localStorage.getItem('adhub_extension_version');

        if (storedActive === 'true' && storedId) {
            console.log('[AdHub] Plugin detekovan pres localStorage');
            state.pluginConnected = true;
            state.pluginId = storedId;
            state.pluginVersion = storedVersion;
            updatePluginStatus(true);
            return;
        }

        // Metoda 2: data atribut
        const dataAttr = document.documentElement.getAttribute('data-adhub-extension');
        const dataId = document.documentElement.getAttribute('data-adhub-extension-id');
        const dataVersion = document.documentElement.getAttribute('data-adhub-extension-version');

        if (dataAttr === 'true' && dataId) {
            console.log('[AdHub] Plugin detekovan pres data atribut');
            state.pluginConnected = true;
            state.pluginId = dataId;
            state.pluginVersion = dataVersion;
            updatePluginStatus(true);
            return;
        }

        // Metoda 3: Custom event
        const detected = await detectPluginViaEvent();
        if (detected) {
            console.log('[AdHub] Plugin detekovan pres event');
            state.pluginConnected = true;
            updatePluginStatus(true);
            return;
        }

        console.log('[AdHub] Plugin nedetekovan');
        state.pluginConnected = false;
        updatePluginStatus(false);

    } catch (error) {
        console.error('[AdHub] Chyba pri detekci pluginu:', error);
        state.pluginConnected = false;
        updatePluginStatus(false);
    }
}

function detectPluginViaEvent() {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve(false);
        }, 2000);

        const handler = (event) => {
            clearTimeout(timeout);
            window.removeEventListener('adhub-extension-response', handler);

            if (event.detail && event.detail.id) {
                state.pluginId = event.detail.id;
                state.pluginVersion = event.detail.version;
            }
            resolve(true);
        };

        window.addEventListener('adhub-extension-response', handler, { once: true });
        window.dispatchEvent(new CustomEvent('adhub-extension-check'));
    });
}

function updatePluginStatus(connected) {
    if (connected) {
        if (elements.extensionStatus) {
            elements.extensionStatus.className = 'extension-status extension-status-on';
        }
        if (elements.extensionStatusText) {
            elements.extensionStatusText.textContent = 'Plugin aktivni';
        }
        if (elements.installSection) {
            elements.installSection.style.display = 'none';
        }
        if (elements.downloadSection) {
            elements.downloadSection.style.display = 'block';
        }
        if (elements.pluginInfoBar) {
            elements.pluginInfoBar.style.display = 'block';
        }
        if (elements.pluginVersion && state.pluginVersion) {
            elements.pluginVersion.textContent = state.pluginVersion;
        }
        if (elements.pluginCommit && state.latestCommit) {
            elements.pluginCommit.textContent = state.latestCommit.sha.substring(0, 7);
        }
    } else {
        if (elements.extensionStatus) {
            elements.extensionStatus.className = 'extension-status extension-status-off';
        }
        if (elements.extensionStatusText) {
            elements.extensionStatusText.textContent = 'Plugin neni nainstalovany';
        }
        if (elements.installSection) {
            elements.installSection.style.display = 'block';
        }
        if (elements.downloadSection) {
            elements.downloadSection.style.display = 'none';
        }
        if (elements.pluginInfoBar) {
            elements.pluginInfoBar.style.display = 'none';
        }
    }
}

// ============================================================================
// GITHUB API - NACTENI COMMITU
// ============================================================================

async function loadLatestCommitInfo() {
    console.log('[AdHub] Nacitam informace o poslednim commitu...');

    try {
        const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/commits?path=${PLUGIN_PATH}&per_page=1`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const commits = await response.json();

        if (commits.length === 0) {
            throw new Error('Zadne commity nenalezeny');
        }

        const commit = commits[0];
        state.latestCommit = commit;

        console.log('[AdHub] Posledni commit:', commit.sha.substring(0, 7));

        // Aktualizace UI
        if (elements.commitLoading) {
            elements.commitLoading.style.display = 'none';
        }
        if (elements.commitDetails) {
            elements.commitDetails.style.display = 'block';
        }
        if (elements.latestCommitId) {
            elements.latestCommitId.textContent = commit.sha.substring(0, 7);
        }
        if (elements.latestCommitDate) {
            const date = new Date(commit.commit.author.date);
            elements.latestCommitDate.textContent = date.toLocaleDateString('cs-CZ') + ' ' +
                date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
        }
        if (elements.latestCommitMessage) {
            const message = commit.commit.message.split('\n')[0]; // Prvni radek
            elements.latestCommitMessage.textContent = message.substring(0, 60) +
                (message.length > 60 ? '...' : '');
        }

        // Aktualizace plugin info baru
        if (elements.pluginCommit) {
            elements.pluginCommit.textContent = commit.sha.substring(0, 7);
        }

    } catch (error) {
        console.error('[AdHub] Chyba pri nacitani commitu:', error);

        if (elements.commitLoading) {
            elements.commitLoading.innerHTML = `<span style="color: #ef4444;">Chyba: ${error.message}</span>`;
        }
    }
}

// ============================================================================
// STAHOVANI PLUGINU
// ============================================================================

async function handleDownloadPlugin() {
    console.log('[AdHub] Zacinam stahovani pluginu...');

    const btn = elements.downloadPluginBtn;
    const progress = elements.downloadProgress;
    const progressFill = elements.downloadProgressFill;
    const progressText = elements.downloadProgressText;

    btn.disabled = true;
    btn.innerHTML = 'Stahuji...';
    progress.style.display = 'block';
    progressText.textContent = 'Nacitam soubory z GitHubu...';
    progressFill.style.width = '10%';

    try {
        // Krok 1: Ziskani seznamu souboru
        console.log('[AdHub] Krok 1: Ziskavam seznam souboru');
        const filesUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${PLUGIN_PATH}?ref=${GITHUB_BRANCH}`;
        const filesResponse = await fetch(filesUrl);

        if (!filesResponse.ok) {
            throw new Error(`Nelze nacist seznam souboru: ${filesResponse.status}`);
        }

        const files = await filesResponse.json();
        progressFill.style.width = '20%';
        progressText.textContent = `Nalezeno ${files.length} souboru...`;

        // Krok 2: Stazeni vsech souboru
        console.log('[AdHub] Krok 2: Stahuji soubory');
        const zip = new JSZip();
        const pluginFolder = zip.folder('adhub-youtube-downloader');

        let downloadedCount = 0;
        for (const file of files) {
            if (file.type === 'file') {
                const content = await fetchFileContent(file.download_url);
                pluginFolder.file(file.name, content);
                downloadedCount++;
                progressFill.style.width = `${20 + (downloadedCount / files.length) * 50}%`;
                progressText.textContent = `Stahuji: ${file.name}`;
            } else if (file.type === 'dir' && file.name === 'icons') {
                // Zpracovani slozky icons
                const iconsFolder = pluginFolder.folder('icons');
                const iconsUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${PLUGIN_PATH}/icons?ref=${GITHUB_BRANCH}`;
                const iconsResponse = await fetch(iconsUrl);
                const icons = await iconsResponse.json();

                for (const icon of icons) {
                    if (icon.type === 'file') {
                        const iconContent = await fetchFileContent(icon.download_url, true);
                        iconsFolder.file(icon.name, iconContent);
                    }
                }
            }
        }

        progressFill.style.width = '80%';
        progressText.textContent = 'Generuji ZIP soubor...';

        // Krok 3: Generovani ZIP
        console.log('[AdHub] Krok 3: Generuji ZIP');
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        });

        progressFill.style.width = '90%';
        progressText.textContent = 'Pripravuji ke stazeni...';

        // Krok 4: Stahovani
        console.log('[AdHub] Krok 4: Spoustim stahovani');
        const downloadUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;

        // Pridani commit ID do nazvu souboru
        const commitId = state.latestCommit ? state.latestCommit.sha.substring(0, 7) : 'latest';
        a.download = `adhub-youtube-downloader-${commitId}.zip`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        progressFill.style.width = '100%';
        progressText.textContent = 'Stahovani dokonceno!';

        showToast('Plugin uspesne stazen! Rozbalte ZIP a nainstalujte podle navodu.', 'success');

        btn.innerHTML = 'Stazeno!';
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Stahnout plugin (.zip)
            `;
            progress.style.display = 'none';
            progressFill.style.width = '0%';
        }, 2000);

    } catch (error) {
        console.error('[AdHub] Chyba pri stahovani:', error);
        showToast('Chyba pri stahovani: ' + error.message, 'error');

        btn.disabled = false;
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Stahnout plugin (.zip)
        `;
        progress.style.display = 'none';
    }
}

async function fetchFileContent(url, isBinary = false) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Nelze stahnout soubor: ${url}`);
    }

    if (isBinary) {
        return await response.arrayBuffer();
    }
    return await response.text();
}

// ============================================================================
// VIDEO FORM
// ============================================================================

async function handleVideoSubmit(e) {
    e.preventDefault();

    const url = elements.videoUrl.value.trim();
    if (!url) {
        showToast('Zadej YouTube URL', 'error');
        return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
        showToast('Neplatna YouTube URL', 'error');
        return;
    }

    if (!state.pluginConnected) {
        showToast('Plugin neni nainstalovany', 'error');
        return;
    }

    elements.fetchInfoBtn.disabled = true;
    elements.fetchInfoBtn.textContent = 'Nacitam...';

    if (elements.videoInfoCard) elements.videoInfoCard.style.display = 'none';
    if (elements.formatsCard) elements.formatsCard.style.display = 'none';

    try {
        // Ziskani informaci pres bridge
        const videoInfo = await sendMessageViaBridge('getVideoInfo', { videoId });

        if (!videoInfo || !videoInfo.success) {
            throw new Error(videoInfo?.error || 'Nelze ziskat informace');
        }

        state.currentVideoInfo = videoInfo;
        displayVideoInfo(videoInfo);

        // Ziskani formatu
        const formatsResult = await sendMessageViaBridge('getDownloadLinks', { videoId });

        if (!formatsResult || !formatsResult.success) {
            throw new Error(formatsResult?.error || 'Nelze ziskat formaty');
        }

        state.currentFormats = formatsResult;
        displayFormats(formatsResult);

    } catch (error) {
        showToast(`Chyba: ${error.message}`, 'error');
    } finally {
        elements.fetchInfoBtn.disabled = false;
        elements.fetchInfoBtn.textContent = 'Ziskat informace';
    }
}

function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// ============================================================================
// KOMUNIKACE S PLUGINEM
// ============================================================================

function sendMessageViaBridge(action, payload) {
    return new Promise((resolve, reject) => {
        const id = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        const timeout = setTimeout(() => {
            window.removeEventListener('message', handler);
            reject(new Error('Casovy limit vyprseny'));
        }, 30000);

        const handler = (event) => {
            if (event.source !== window) return;
            if (!event.data || event.data.type !== 'ADHUB_RESPONSE') return;
            if (event.data.requestId !== id) return;

            clearTimeout(timeout);
            window.removeEventListener('message', handler);

            if (event.data.success) {
                resolve(event.data.data);
            } else {
                reject(new Error(event.data.error || 'Pozadavek selhal'));
            }
        };

        window.addEventListener('message', handler);

        window.postMessage({
            type: 'ADHUB_REQUEST',
            requestId: id,
            action: action,
            payload: payload
        }, '*');
    });
}

// ============================================================================
// ZOBRAZENI DAT
// ============================================================================

function displayVideoInfo(info) {
    if (elements.videoThumbnail) {
        elements.videoThumbnail.src = info.thumbnail || info.thumbnailMedium;
    }
    if (elements.videoTitle) {
        elements.videoTitle.textContent = info.title || 'Neznamy nazev';
    }
    if (elements.videoUploader) {
        elements.videoUploader.textContent = info.author || 'Neznamy';
    }
    if (elements.videoInfoCard) {
        elements.videoInfoCard.style.display = 'block';
    }
}

function displayFormats(data) {
    // Reset
    if (elements.combinedFormatsList) elements.combinedFormatsList.innerHTML = '';
    if (elements.videoFormatsList) elements.videoFormatsList.innerHTML = '';
    if (elements.audioFormatsList) elements.audioFormatsList.innerHTML = '';

    if (elements.combinedFormatsSection) elements.combinedFormatsSection.style.display = 'none';
    if (elements.videoFormatsSection) elements.videoFormatsSection.style.display = 'none';
    if (elements.audioFormatsSection) elements.audioFormatsSection.style.display = 'none';

    if (!data.formats) {
        showToast('Zadne formaty nejsou dostupne', 'error');
        return;
    }

    const formats = data.formats;

    // Combined formaty
    const combined = [...(formats.combined?.mp4 || []), ...(formats.combined?.webm || [])];
    if (combined.length > 0 && elements.combinedFormatsSection) {
        elements.combinedFormatsSection.style.display = 'block';
        combined.forEach(format => {
            elements.combinedFormatsList.appendChild(createFormatItem(format, data.videoId));
        });
    }

    // Video formaty
    const video = [...(formats.video?.mp4 || []), ...(formats.video?.webm || [])].slice(0, 5);
    if (video.length > 0 && elements.videoFormatsSection) {
        elements.videoFormatsSection.style.display = 'block';
        video.forEach(format => {
            elements.videoFormatsList.appendChild(createFormatItem(format, data.videoId));
        });
    }

    // Audio formaty
    const audio = [...(formats.audio?.m4a || []), ...(formats.audio?.webm || [])].slice(0, 4);
    if (audio.length > 0 && elements.audioFormatsSection) {
        elements.audioFormatsSection.style.display = 'block';
        audio.forEach(format => {
            elements.audioFormatsList.appendChild(createFormatItem(format, data.videoId));
        });
    }

    if (elements.formatsCard) {
        elements.formatsCard.style.display = 'block';
    }
}

function createFormatItem(format, videoId) {
    const div = document.createElement('div');
    div.className = 'format-item';

    let quality = format.quality || format.audioQuality || 'Neznama';
    if (format.type === 'audio' && format.bitrate) {
        quality = Math.round(format.bitrate / 1000) + ' kbps';
    }

    const size = format.fileSize ? formatFileSize(format.fileSize) : '-';
    const container = format.container?.toUpperCase() || 'MP4';

    const title = state.currentVideoInfo?.title || 'video';
    const safeTitle = title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 80);
    const filename = `${safeTitle}_${quality}.${format.container || 'mp4'}`;

    div.innerHTML = `
        <div class="format-info">
            <span class="format-quality">${quality}</span>
            <span class="format-details">${container} | ${size}</span>
        </div>
        <button class="btn btn-download-format">Stahnout</button>
    `;

    const btn = div.querySelector('.btn-download-format');
    btn.addEventListener('click', () => handleFormatDownload(btn, format.url, filename, videoId));

    return div;
}

async function handleFormatDownload(button, url, filename, videoId) {
    button.disabled = true;
    button.textContent = 'Stahuji...';

    try {
        const response = await sendMessageViaBridge('downloadVideo', {
            url: url,
            filename: filename,
            videoId: videoId
        });

        if (response && response.success) {
            button.textContent = 'Stazeno!';
            button.style.background = '#22c55e';

            addToDownloadsHistory({
                filename: filename,
                date: new Date().toISOString(),
                videoId: videoId
            });

            showToast(`Stahovani zahajeno: ${filename}`, 'success');
        } else {
            throw new Error(response?.error || 'Stahovani selhalo');
        }

    } catch (error) {
        button.textContent = 'Chyba!';
        button.style.background = '#ef4444';
        showToast(`Chyba: ${error.message}`, 'error');
    }

    setTimeout(() => {
        button.disabled = false;
        button.textContent = 'Stahnout';
        button.style.background = '';
    }, 3000);
}

// ============================================================================
// HISTORIE
// ============================================================================

function loadDownloadsHistory() {
    if (!elements.downloadsList) return;

    let history = JSON.parse(localStorage.getItem('adhub_downloads_history') || '[]');

    // Smazat stare polozky (>48h)
    const now = Date.now();
    const maxAge = 48 * 60 * 60 * 1000;

    history = history.filter(item => {
        const itemAge = now - new Date(item.date).getTime();
        return itemAge < maxAge;
    });

    localStorage.setItem('adhub_downloads_history', JSON.stringify(history));

    if (history.length === 0) {
        elements.downloadsList.innerHTML = '<p class="empty-state-text">Zatim zadne stazene soubory</p>';
        return;
    }

    elements.downloadsList.innerHTML = '';
    history.slice(0, 10).forEach(item => {
        const div = document.createElement('div');
        div.className = 'download-item';
        div.style.cursor = 'pointer';

        const date = new Date(item.date);
        const dateStr = date.toLocaleDateString('cs-CZ') + ' ' +
            date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

        const itemAge = now - date.getTime();
        const hoursRemaining = Math.floor((maxAge - itemAge) / (60 * 60 * 1000));

        div.innerHTML = `
            <div class="download-item-info">
                <div class="filename">${item.filename}</div>
                <div class="file-date">${dateStr} (${hoursRemaining}h zbyva)</div>
            </div>
        `;

        if (item.videoId) {
            div.addEventListener('click', () => {
                elements.videoUrl.value = item.videoId;
                elements.videoForm.dispatchEvent(new Event('submit'));
            });
        }

        elements.downloadsList.appendChild(div);
    });
}

function addToDownloadsHistory(item) {
    const history = JSON.parse(localStorage.getItem('adhub_downloads_history') || '[]');
    history.unshift(item);
    if (history.length > 20) history.pop();
    localStorage.setItem('adhub_downloads_history', JSON.stringify(history));
    loadDownloadsHistory();
}

// ============================================================================
// UTILITY
// ============================================================================

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
}

function showToast(message, type = 'info') {
    if (!elements.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Globalni funkce pro kopirovani
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Zkopirovano!', 'success');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Zkopirovano!', 'success');
    });
};
