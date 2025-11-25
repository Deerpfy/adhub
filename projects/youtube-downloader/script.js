// AdHUB YouTube Downloader - Client-Side Application
// Funguje bez serveru přes browser extension

// Stav aplikace
let extensionConnected = false;
let extensionId = null;
let currentVideoInfo = null;
let currentFormats = null;

// DOM Elements - budou inicializovány po DOMContentLoaded
let extensionStatus;
let extensionStatusText;
let installSection;
let downloadSection;
let videoForm;
let videoUrlInput;
let fetchInfoBtn;
let videoInfoCard;
let videoTitle;
let videoThumbnail;
let videoUploader;
let videoDuration;
let videoViews;
let formatsCard;
let combinedFormatsSection;
let videoFormatsSection;
let audioFormatsSection;
let combinedFormatsList;
let videoFormatsList;
let audioFormatsList;
let downloadCompleteCard;
let downloadFilename;
let downloadsList;
let toastContainer;

// Settings
let settings = {
    extensionId: null
};

// Inicializace
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements();
    loadSettings();
    checkExtension();
    loadDownloadsHistory();
    setupEventListeners();
    
    // Kontrola rozšíření každých 3 sekundy
    setInterval(checkExtension, 3000);
});

// Okamžitá detekce rozšíření, pokud je již načteno
window.addEventListener('adhub-extension-ready', (event) => {
    console.log('[AdHUB] Extension ready event received:', event.detail);
    if (event.detail && event.detail.extensionId) {
        extensionId = event.detail.extensionId;
        extensionConnected = true;
        localStorage.setItem('adhub_extension_id', extensionId);
        updateExtensionStatus(true);
    }
});

// Inicializace DOM elementů
function initializeDOMElements() {
    extensionStatus = document.getElementById('extensionStatus');
    extensionStatusText = document.getElementById('extensionStatusText');
    installSection = document.getElementById('installSection');
    downloadSection = document.getElementById('downloadSection');
    videoForm = document.getElementById('videoForm');
    videoUrlInput = document.getElementById('videoUrl');
    fetchInfoBtn = document.getElementById('fetchInfoBtn');
    videoInfoCard = document.getElementById('videoInfoCard');
    videoTitle = document.getElementById('videoTitle');
    videoThumbnail = document.getElementById('videoThumbnail');
    videoUploader = document.getElementById('videoUploader');
    videoDuration = document.getElementById('videoDuration');
    videoViews = document.getElementById('videoViews');
    formatsCard = document.getElementById('formatsCard');
    combinedFormatsSection = document.getElementById('combinedFormatsSection');
    videoFormatsSection = document.getElementById('videoFormatsSection');
    audioFormatsSection = document.getElementById('audioFormatsSection');
    combinedFormatsList = document.getElementById('combinedFormatsList');
    videoFormatsList = document.getElementById('videoFormatsList');
    audioFormatsList = document.getElementById('audioFormatsList');
    downloadCompleteCard = document.getElementById('downloadCompleteCard');
    downloadFilename = document.getElementById('downloadFilename');
    downloadsList = document.getElementById('downloadsList');
    toastContainer = document.getElementById('toastContainer');
}

// Kontrola připojení rozšíření
async function checkExtension() {
    try {
        // Metoda 1: Zkontrolujeme globální proměnnou (injektovaná rozšířením)
        if (window.adhubExtensionAvailable && window.adhubExtensionId) {
            extensionId = window.adhubExtensionId;
            extensionConnected = true;
            updateExtensionStatus(true);
            console.log('[AdHUB] Extension detected via global variable:', extensionId);
            return;
        }
        
        // Metoda 2: Zkusíme Chrome extension messaging
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
                        console.log('[AdHUB] Extension detected via messaging:', extensionId);
                        return;
                    }
                } catch (e) {
                    // Zkusíme další ID
                }
            }
        }
        
        // Metoda 3: Detekce přes custom event (pokud content script běží)
        const detected = await detectExtensionViaEvent();
        if (detected) {
            extensionConnected = true;
            updateExtensionStatus(true);
            console.log('[AdHUB] Extension detected via event:', extensionId);
            return;
        }
        
        // Metoda 4: Zkontrolujeme localStorage flag (nastavuje ho content script)
        const extensionActive = localStorage.getItem('adhub_extension_active');
        const storedId = localStorage.getItem('adhub_extension_id');
        const timestamp = parseInt(localStorage.getItem('adhub_extension_timestamp') || '0');
        
        // Kontrola, že timestamp není starší než 10 sekund (rozšíření musí být aktivní)
        if (extensionActive === 'true' && storedId && (Date.now() - timestamp < 10000)) {
            extensionId = storedId;
            extensionConnected = true;
            updateExtensionStatus(true);
            console.log('[AdHUB] Extension detected via localStorage:', extensionId);
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

// Aktualizace statusu rozšíření a přepnutí sekcí
function updateExtensionStatus(connected) {
    if (connected) {
        extensionStatus.className = 'extension-status extension-status-on';
        extensionStatusText.textContent = 'Rozšíření aktivní';
        
        // Zobrazíme download sekci, skryjeme instalační
        if (installSection) installSection.style.display = 'none';
        if (downloadSection) downloadSection.style.display = 'block';
        
    } else {
        extensionStatus.className = 'extension-status extension-status-off';
        extensionStatusText.textContent = 'Rozšíření není nainstalováno';
        
        // Zobrazíme instalační sekci, skryjeme download
        if (installSection) installSection.style.display = 'block';
        if (downloadSection) downloadSection.style.display = 'none';
    }
}

// Event listenery
function setupEventListeners() {
    // Video form
    if (videoForm) {
        videoForm.addEventListener('submit', handleVideoSubmit);
    }
    
    // Refresh button po instalaci
    const refreshAfterInstallBtn = document.getElementById('refreshAfterInstallBtn');
    if (refreshAfterInstallBtn) {
        refreshAfterInstallBtn.addEventListener('click', () => {
            checkExtension();
            showToast('Kontroluji instalaci rozšíření...', 'info');
        });
    }
    
    // Show manual install button
    const showManualInstallBtn = document.getElementById('showManualInstallBtn');
    if (showManualInstallBtn) {
        showManualInstallBtn.addEventListener('click', () => {
            // Scroll ke krokům instalace
            document.querySelector('.install-steps-section')?.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        });
    }
    
    // Download extension button - sledování kliknutí
    const downloadExtensionBtn = document.getElementById('downloadExtensionBtn');
    if (downloadExtensionBtn) {
        downloadExtensionBtn.addEventListener('click', () => {
            showToast('Stahování rozšíření...', 'info');
        });
    }
}

// Zpracování formuláře videa
async function handleVideoSubmit(e) {
    e.preventDefault();
    
    const url = videoUrlInput.value.trim();
    if (!url) {
        showToast('Prosím zadejte YouTube URL', 'error');
        return;
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
        showToast('Neplatná YouTube URL', 'error');
        return;
    }
    
    if (!extensionConnected) {
        showToast('Rozšíření není nainstalováno. Nainstalujte ho podle návodu výše.', 'error');
        return;
    }
    
    fetchInfoBtn.disabled = true;
    fetchInfoBtn.textContent = '⏳ Načítání...';
    
    // Skryjeme předchozí výsledky
    if (videoInfoCard) videoInfoCard.style.display = 'none';
    if (formatsCard) formatsCard.style.display = 'none';
    if (downloadCompleteCard) downloadCompleteCard.style.display = 'none';
    
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
        showToast(`Chyba: ${error.message}`, 'error');
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
    if (!videoTitle || !videoThumbnail) return;
    
    videoTitle.textContent = info.title || 'Neznámý název';
    videoThumbnail.src = info.thumbnail || info.thumbnailMq || '';
    videoThumbnail.alt = info.title || 'Video thumbnail';
    
    if (videoUploader) {
        videoUploader.textContent = `📺 ${info.author || 'Neznámý'}`;
    }
    
    if (videoDuration && info.duration) {
        const minutes = Math.floor(info.duration / 60);
        const seconds = Math.floor(info.duration % 60);
        videoDuration.textContent = `⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else if (videoDuration) {
        videoDuration.textContent = '';
    }
    
    if (videoViews && info.viewCount) {
        const views = info.viewCount.toLocaleString('cs-CZ');
        videoViews.textContent = `👁️ ${views} zhlédnutí`;
    } else if (videoViews) {
        videoViews.textContent = '';
    }
    
    if (videoInfoCard) videoInfoCard.style.display = 'block';
}

// Zobrazení dostupných formátů
function displayFormats(data) {
    if (!combinedFormatsList || !videoFormatsList || !audioFormatsList) return;
    
    // Reset
    combinedFormatsList.innerHTML = '';
    videoFormatsList.innerHTML = '';
    audioFormatsList.innerHTML = '';
    if (combinedFormatsSection) combinedFormatsSection.style.display = 'none';
    if (videoFormatsSection) videoFormatsSection.style.display = 'none';
    if (audioFormatsSection) audioFormatsSection.style.display = 'none';
    
    if (!data.formats || data.formats.length === 0) {
        showToast('Žádné formáty nejsou dostupné', 'error');
        return;
    }
    
    // Kombinované formáty (video + audio)
    const combined = data.formats.filter(f => f.type === 'combined');
    if (combined.length > 0 && combinedFormatsSection) {
        combinedFormatsSection.style.display = 'block';
        combined.forEach(format => {
            combinedFormatsList.appendChild(createFormatItem(format, data.safeTitle));
        });
    }
    
    // Video only
    const videoOnly = data.formats.filter(f => f.type === 'video').slice(0, 5);
    if (videoOnly.length > 0 && videoFormatsSection) {
        videoFormatsSection.style.display = 'block';
        videoOnly.forEach(format => {
            videoFormatsList.appendChild(createFormatItem(format, data.safeTitle));
        });
    }
    
    // Audio only
    const audioOnly = data.formats.filter(f => f.type === 'audio').slice(0, 4);
    if (audioOnly.length > 0 && audioFormatsSection) {
        audioFormatsSection.style.display = 'block';
        audioOnly.forEach(format => {
            audioFormatsList.appendChild(createFormatItem(format, data.safeTitle));
        });
    }
    
    if (formatsCard) formatsCard.style.display = 'block';
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
            if (downloadFilename) downloadFilename.textContent = filename;
            if (downloadCompleteCard) downloadCompleteCard.style.display = 'block';
            
            showToast(`Stahování zahájeno: ${filename}`, 'success');
            
        } else {
            throw new Error(response?.error || 'Stahování selhalo');
        }
        
    } catch (error) {
        console.error('[AdHUB] Download error:', error);
        button.textContent = '❌ Chyba';
        button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        showToast(`Chyba při stahování: ${error.message}`, 'error');
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
    if (!downloadsList) return;
    
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

// Toast notifikace
function showToast(message, type = 'info') {
    if (!toastContainer) {
        // Fallback na alert
        if (type === 'error') {
            alert('❌ ' + message);
        }
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    
    toast.innerHTML = `
        <span>${icon}</span>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Automatické odstranění po 4 sekundách
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// Globální funkce pro kopírování do schránky
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Zkopírováno do schránky!', 'success');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Zkopírováno do schránky!', 'success');
    });
};
