// AdHUB YouTube Downloader - Client-Side Application
// Funguje bez serveru přes browser extension

// Stav aplikace
let extensionConnected = false;
let extensionId = null;
let currentVideoInfo = null;
let currentFormats = null;

// DOM Elements
const extensionStatus = document.getElementById('extensionStatus');
const extensionStatusText = document.getElementById('extensionStatusText');
const extensionInfoPanel = document.getElementById('extensionInfoPanel');
const installExtensionBtn = document.getElementById('installExtensionBtn');
const showInstallGuideBtn = document.getElementById('showInstallGuideBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsForm = document.getElementById('settingsForm');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const installModal = document.getElementById('installModal');
const closeInstallModal = document.getElementById('closeInstallModal');
const refreshPageBtn = document.getElementById('refreshPageBtn');
const videoForm = document.getElementById('videoForm');
const videoUrlInput = document.getElementById('videoUrl');
const fetchInfoBtn = document.getElementById('fetchInfoBtn');
const videoInfoCard = document.getElementById('videoInfoCard');
const videoTitle = document.getElementById('videoTitle');
const videoThumbnail = document.getElementById('videoThumbnail');
const videoUploader = document.getElementById('videoUploader');
const videoDuration = document.getElementById('videoDuration');
const videoViews = document.getElementById('videoViews');
const formatsCard = document.getElementById('formatsCard');
const combinedFormatsSection = document.getElementById('combinedFormatsSection');
const videoFormatsSection = document.getElementById('videoFormatsSection');
const audioFormatsSection = document.getElementById('audioFormatsSection');
const combinedFormatsList = document.getElementById('combinedFormatsList');
const videoFormatsList = document.getElementById('videoFormatsList');
const audioFormatsList = document.getElementById('audioFormatsList');
const downloadProgressCard = document.getElementById('downloadProgressCard');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const downloadStatus = document.getElementById('downloadStatus');
const downloadCompleteCard = document.getElementById('downloadCompleteCard');
const downloadFilename = document.getElementById('downloadFilename');
const downloadsList = document.getElementById('downloadsList');
const extensionIdInput = document.getElementById('extensionId');

// Settings
let settings = {
    extensionId: null
};

// Inicializace
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    checkExtension();
    loadDownloadsHistory();
    setupEventListeners();
    
    // Kontrola rozšíření každých 5 sekund
    setInterval(checkExtension, 5000);
});

// Kontrola připojení rozšíření
async function checkExtension() {
    try {
        // Zkusíme najít rozšíření pomocí chrome.runtime.sendMessage
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            // Zkusíme několik možných ID rozšíření
            const possibleIds = [
                settings.extensionId,
                localStorage.getItem('adhub_extension_id')
            ].filter(Boolean);
            
            // Zkusíme každé ID
            for (const id of possibleIds) {
                try {
                    const response = await sendMessageToExtension(id, { action: 'ping' });
                    if (response && response.success) {
                        extensionConnected = true;
                        extensionId = id;
                        updateExtensionStatus(true);
                        return;
                    }
                } catch (e) {
                    // Zkusíme další ID
                }
            }
        }
        
        // Pokud není Chrome API dostupné, zkusíme detekci přes custom event
        const detected = await detectExtensionViaEvent();
        if (detected) {
            extensionConnected = true;
            updateExtensionStatus(true);
            return;
        }
        
        extensionConnected = false;
        updateExtensionStatus(false);
        
    } catch (error) {
        console.log('[AdHUB] Extension check error:', error);
        extensionConnected = false;
        updateExtensionStatus(false);
    }
}

// Detekce rozšíření přes custom event
function detectExtensionViaEvent() {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve(false);
        }, 1000);
        
        window.addEventListener('adhub-extension-response', function handler(event) {
            clearTimeout(timeout);
            window.removeEventListener('adhub-extension-response', handler);
            if (event.detail && event.detail.extensionId) {
                extensionId = event.detail.extensionId;
                localStorage.setItem('adhub_extension_id', extensionId);
            }
            resolve(true);
        }, { once: true });
        
        window.dispatchEvent(new CustomEvent('adhub-extension-check'));
    });
}

// Poslání zprávy rozšíření
function sendMessageToExtension(extId, message) {
    return new Promise((resolve, reject) => {
        if (!extId) {
            reject(new Error('Extension ID not set'));
            return;
        }
        
        try {
            chrome.runtime.sendMessage(extId, message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
}

// Aktualizace statusu rozšíření
function updateExtensionStatus(connected) {
    if (connected) {
        extensionStatus.className = 'extension-status extension-status-on';
        extensionStatusText.textContent = 'Rozšíření aktivní';
        extensionInfoPanel.style.display = 'none';
        installExtensionBtn.style.display = 'none';
    } else {
        extensionStatus.className = 'extension-status extension-status-off';
        extensionStatusText.textContent = 'Rozšíření není detekováno';
        extensionInfoPanel.style.display = 'block';
        installExtensionBtn.style.display = 'block';
    }
}

// Event listenery
function setupEventListeners() {
    // Video form
    videoForm.addEventListener('submit', handleVideoSubmit);
    
    // Settings modal
    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'block';
        if (extensionId) {
            extensionIdInput.value = extensionId;
        }
    });
    
    cancelSettingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });
    
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        settings.extensionId = extensionIdInput.value.trim() || null;
        saveSettings();
        settingsModal.style.display = 'none';
        checkExtension();
    });
    
    // Install modal
    installExtensionBtn.addEventListener('click', () => {
        installModal.style.display = 'block';
    });
    
    showInstallGuideBtn.addEventListener('click', () => {
        installModal.style.display = 'block';
    });
    
    closeInstallModal.addEventListener('click', () => {
        installModal.style.display = 'none';
    });
    
    refreshPageBtn.addEventListener('click', () => {
        window.location.reload();
    });
    
    // Close modals on outside click
    [settingsModal, installModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Zpracování formuláře videa
async function handleVideoSubmit(e) {
    e.preventDefault();
    
    const url = videoUrlInput.value.trim();
    if (!url) {
        showNotification('Prosím zadejte YouTube URL', 'error');
        return;
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
        showNotification('Neplatná YouTube URL', 'error');
        return;
    }
    
    if (!extensionConnected) {
        installModal.style.display = 'block';
        return;
    }
    
    fetchInfoBtn.disabled = true;
    fetchInfoBtn.textContent = '⏳ Načítání...';
    
    // Skryjeme předchozí výsledky
    videoInfoCard.style.display = 'none';
    formatsCard.style.display = 'none';
    downloadCompleteCard.style.display = 'none';
    
    try {
        // Získáme info o videu
        const infoResponse = await sendMessageToExtension(extensionId, {
            action: 'getVideoInfo',
            videoId: videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`
        });
        
        if (!infoResponse || !infoResponse.success) {
            throw new Error(infoResponse?.error || 'Nepodařilo se získat informace o videu');
        }
        
        currentVideoInfo = infoResponse;
        displayVideoInfo(infoResponse);
        
        // Získáme download linky
        const linksResponse = await sendMessageToExtension(extensionId, {
            action: 'getDownloadLinks',
            videoId: videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`
        });
        
        if (!linksResponse || !linksResponse.success) {
            throw new Error(linksResponse?.error || 'Nepodařilo se získat download linky');
        }
        
        currentFormats = linksResponse;
        displayFormats(linksResponse);
        
    } catch (error) {
        console.error('[AdHUB] Error:', error);
        showNotification(`Chyba: ${error.message}`, 'error');
    } finally {
        fetchInfoBtn.disabled = false;
        fetchInfoBtn.textContent = '📋 Získat informace';
    }
}

// Extrakce video ID z URL
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/  // Přímé video ID
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

// Zobrazení informací o videu
function displayVideoInfo(info) {
    videoTitle.textContent = info.title || 'Neznámý název';
    videoThumbnail.src = info.thumbnail || info.thumbnailMq || '';
    videoThumbnail.alt = info.title || 'Video thumbnail';
    
    videoUploader.textContent = `📺 ${info.author || 'Neznámý'}`;
    
    if (info.duration) {
        const minutes = Math.floor(info.duration / 60);
        const seconds = Math.floor(info.duration % 60);
        videoDuration.textContent = `⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        videoDuration.textContent = '';
    }
    
    if (info.viewCount) {
        const views = info.viewCount.toLocaleString('cs-CZ');
        videoViews.textContent = `👁️ ${views} zhlédnutí`;
    } else {
        videoViews.textContent = '';
    }
    
    videoInfoCard.style.display = 'block';
}

// Zobrazení dostupných formátů
function displayFormats(data) {
    // Reset
    combinedFormatsList.innerHTML = '';
    videoFormatsList.innerHTML = '';
    audioFormatsList.innerHTML = '';
    combinedFormatsSection.style.display = 'none';
    videoFormatsSection.style.display = 'none';
    audioFormatsSection.style.display = 'none';
    
    if (!data.formats || data.formats.length === 0) {
        showNotification('Žádné formáty nejsou dostupné', 'error');
        return;
    }
    
    // Kombinované formáty (video + audio)
    const combined = data.formats.filter(f => f.type === 'combined');
    if (combined.length > 0) {
        combinedFormatsSection.style.display = 'block';
        combined.forEach(format => {
            combinedFormatsList.appendChild(createFormatItem(format, data.safeTitle));
        });
    }
    
    // Video only
    const videoOnly = data.formats.filter(f => f.type === 'video').slice(0, 5);
    if (videoOnly.length > 0) {
        videoFormatsSection.style.display = 'block';
        videoOnly.forEach(format => {
            videoFormatsList.appendChild(createFormatItem(format, data.safeTitle));
        });
    }
    
    // Audio only
    const audioOnly = data.formats.filter(f => f.type === 'audio').slice(0, 4);
    if (audioOnly.length > 0) {
        audioFormatsSection.style.display = 'block';
        audioOnly.forEach(format => {
            audioFormatsList.appendChild(createFormatItem(format, data.safeTitle));
        });
    }
    
    formatsCard.style.display = 'block';
}

// Vytvoření položky formátu
function createFormatItem(format, title) {
    const div = document.createElement('div');
    div.className = 'format-item';
    
    let quality = format.quality || 'Unknown';
    if (format.type === 'audio' && format.bitrate) {
        quality = Math.round(format.bitrate / 1000) + ' kbps';
    }
    
    const size = format.contentLength ? formatFileSize(parseInt(format.contentLength)) : 'N/A';
    const ext = format.mimeType?.includes('webm') ? 'webm' : (format.type === 'audio' ? 'm4a' : 'mp4');
    const codec = format.codec || extractCodec(format.mimeType);
    
    div.innerHTML = `
        <div class="format-info">
            <span class="format-quality">${quality}</span>
            <span class="format-details">${codec} • ${size}</span>
        </div>
        <button class="btn btn-download-format" data-url="${encodeURIComponent(format.url)}" data-filename="${title}_${quality}.${ext}">
            📥 Stáhnout
        </button>
    `;
    
    const downloadBtn = div.querySelector('.btn-download-format');
    downloadBtn.addEventListener('click', () => handleFormatDownload(downloadBtn, format.url, `${title}_${quality}.${ext}`));
    
    return div;
}

// Extrakce kodeku z MIME typu
function extractCodec(mimeType) {
    if (!mimeType) return 'unknown';
    const codecMatch = mimeType.match(/codecs="([^"]+)"/);
    return codecMatch ? codecMatch[1].split('.')[0] : mimeType.split('/')[1]?.split(';')[0] || 'unknown';
}

// Stahování formátu
async function handleFormatDownload(button, url, filename) {
    button.disabled = true;
    button.textContent = '⏳ Stahuji...';
    
    try {
        const response = await sendMessageToExtension(extensionId, {
            action: 'downloadVideo',
            url: url,
            filename: filename
        });
        
        if (response && response.success) {
            button.textContent = '✅ Staženo';
            button.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
            
            // Přidáme do historie
            addToDownloadsHistory({
                filename: filename,
                date: new Date().toISOString()
            });
            
            // Zobrazíme dokončení
            downloadFilename.textContent = filename;
            downloadCompleteCard.style.display = 'block';
            
        } else {
            throw new Error(response?.error || 'Stahování selhalo');
        }
        
    } catch (error) {
        console.error('[AdHUB] Download error:', error);
        button.textContent = '❌ Chyba';
        button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        showNotification(`Chyba při stahování: ${error.message}`, 'error');
    }
    
    // Reset tlačítka po 3 sekundách
    setTimeout(() => {
        button.disabled = false;
        button.textContent = '📥 Stáhnout';
        button.style.background = '';
    }, 3000);
}

// Formátování velikosti souboru
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return 'N/A';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
}

// Historie stahování
function loadDownloadsHistory() {
    const history = JSON.parse(localStorage.getItem('adhub_downloads_history') || '[]');
    
    if (history.length === 0) {
        downloadsList.innerHTML = '<p class="empty-state-text">Zatím žádné stažené soubory</p>';
        return;
    }
    
    downloadsList.innerHTML = '';
    history.slice(0, 10).forEach(item => {
        const div = document.createElement('div');
        div.className = 'download-item';
        
        const date = new Date(item.date);
        const dateStr = date.toLocaleDateString('cs-CZ') + ' ' + date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
        
        let icon = '📄';
        const ext = item.filename.toLowerCase().split('.').pop();
        if (ext === 'mp4' || ext === 'webm') icon = '📹';
        else if (ext === 'mp3' || ext === 'm4a') icon = '🎵';
        
        div.innerHTML = `
            <div class="download-item-info">
                <div class="filename">${icon} ${item.filename}</div>
                <div class="file-date">${dateStr}</div>
            </div>
        `;
        
        downloadsList.appendChild(div);
    });
}

function addToDownloadsHistory(item) {
    const history = JSON.parse(localStorage.getItem('adhub_downloads_history') || '[]');
    history.unshift(item);
    if (history.length > 20) {
        history.pop();
    }
    localStorage.setItem('adhub_downloads_history', JSON.stringify(history));
    loadDownloadsHistory();
}

// Settings
function loadSettings() {
    const saved = localStorage.getItem('adhub_settings');
    if (saved) {
        settings = JSON.parse(saved);
    }
}

function saveSettings() {
    localStorage.setItem('adhub_settings', JSON.stringify(settings));
}

// Notifikace
function showNotification(message, type = 'info') {
    // Jednoduchá notifikace pomocí alert (můžete nahradit vlastním UI)
    if (type === 'error') {
        alert('❌ ' + message);
    } else {
        alert('ℹ️ ' + message);
    }
}
