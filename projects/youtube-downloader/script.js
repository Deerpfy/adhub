// YouTube Downloader Application
const API_SERVER_URL = 'http://localhost:3003';
const HELPER_SERVER_URL = 'http://localhost:3004'; // Helper server pro YouTube downloader

// Server control
let serverStatusCheckInterval = null;
let isServerRunning = false;
let currentVideoInfo = null;
let currentDownload = null;

// DOM Elements
const serverToggleBtn = document.getElementById('serverToggleBtn');
const serverRestartBtn = document.getElementById('serverRestartBtn');
const serverStatus = document.getElementById('serverStatus');
const serverStatusText = document.getElementById('serverStatusText');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsForm = document.getElementById('settingsForm');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const autoSaveEnabled = document.getElementById('autoSaveEnabled');
const downloadFolder = document.getElementById('downloadFolder');
const downloadFolderLabel = document.getElementById('downloadFolderLabel');
const folderSelectorContainer = document.getElementById('folderSelectorContainer');
const selectFolderBtn = document.getElementById('selectFolderBtn');
const videoForm = document.getElementById('videoForm');
const videoUrlInput = document.getElementById('videoUrl');
const fetchInfoBtn = document.getElementById('fetchInfoBtn');
const videoInfoCard = document.getElementById('videoInfoCard');
const videoTitle = document.getElementById('videoTitle');
const videoThumbnail = document.getElementById('videoThumbnail');
const videoUploader = document.getElementById('videoUploader');
const videoDuration = document.getElementById('videoDuration');
const videoViews = document.getElementById('videoViews');
const downloadProgressCard = document.getElementById('downloadProgressCard');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const downloadStatus = document.getElementById('downloadStatus');
const downloadCompleteCard = document.getElementById('downloadCompleteCard');
const downloadFileBtn = document.getElementById('downloadFileBtn');
const downloadFilename = document.getElementById('downloadFilename');
const downloadsList = document.getElementById('downloadsList');
const downloadButtons = document.querySelectorAll('.btn-download');

// Settings state
let settings = {
    autoSave: false,
    downloadFolder: null,
    folderHandle: null // File System Access API handle
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkServerStatus();
    serverStatusCheckInterval = setInterval(checkServerStatus, 5000);
    loadDownloadsHistory();
    loadSettings();
    setupSettingsModal();
});

// Server status check
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_SERVER_URL}/health`);
        if (response.ok) {
            isServerRunning = true;
            updateServerStatus(true);
        } else {
            throw new Error('Server not responding');
        }
    } catch (error) {
        isServerRunning = false;
        updateServerStatus(false);
    }
}

function updateServerStatus(running) {
    if (running) {
        serverStatus.className = 'server-status server-status-on';
        serverStatusText.textContent = 'Server běží';
        serverToggleBtn.textContent = 'Vypnout Server';
        serverToggleBtn.className = 'btn btn-server-toggle btn-server-stop';
    } else {
        serverStatus.className = 'server-status server-status-off';
        serverStatusText.textContent = 'Server neběží';
        serverToggleBtn.textContent = 'Zapnout Server';
        serverToggleBtn.className = 'btn btn-server-toggle btn-server-start';
    }
}

// Server controls
serverToggleBtn.addEventListener('click', async () => {
    serverToggleBtn.disabled = true;
    try {
        if (isServerRunning) {
            // Stop server via helper
            const response = await fetch(`${HELPER_SERVER_URL}/stop`, {
                method: 'POST'
            });
            if (response.ok) {
                isServerRunning = false;
                updateServerStatus(false);
            }
        } else {
            // Start server via helper
            const response = await fetch(`${HELPER_SERVER_URL}/start`, {
                method: 'POST'
            });
            if (response.ok) {
                // Wait a bit for server to start
                setTimeout(async () => {
                    await checkServerStatus();
                    serverToggleBtn.disabled = false;
                }, 2000);
                return;
            }
        }
    } catch (error) {
        console.error('Server control error:', error);
        // Fallback: try direct server restart
        if (!isServerRunning) {
            alert('Helper server není dostupný. Spusťte server ručně pomocí: npm start v složce server');
        }
    }
    serverToggleBtn.disabled = false;
});

serverRestartBtn.addEventListener('click', async () => {
    serverRestartBtn.disabled = true;
    try {
        const response = await fetch(`${API_SERVER_URL}/api/restart`, {
            method: 'POST'
        });
        if (response.ok) {
            setTimeout(async () => {
                await checkServerStatus();
                serverRestartBtn.disabled = false;
            }, 2000);
        }
    } catch (error) {
        console.error('Restart error:', error);
        serverRestartBtn.disabled = false;
    }
});

// Video form submission
videoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const url = videoUrlInput.value.trim();
    if (!url) {
        alert('Prosím zadejte YouTube URL');
        return;
    }

    if (!isServerRunning) {
        alert('Server neběží! Zapněte server pomocí tlačítka v hlavičce.');
        return;
    }

    fetchInfoBtn.disabled = true;
    fetchInfoBtn.textContent = 'Načítání...';

    try {
        const response = await fetch(`${API_SERVER_URL}/api/video/info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Nepodařilo se získat informace o videu');
        }

        currentVideoInfo = await response.json();
        displayVideoInfo(currentVideoInfo);
        
        // Hide other cards
        downloadProgressCard.style.display = 'none';
        downloadCompleteCard.style.display = 'none';
        videoInfoCard.style.display = 'block';

    } catch (error) {
        console.error('Error fetching video info:', error);
        alert(`Chyba: ${error.message}`);
    } finally {
        fetchInfoBtn.disabled = false;
        fetchInfoBtn.textContent = '📋 Získat informace';
    }
});

// Display video info
function displayVideoInfo(info) {
    videoTitle.textContent = info.title || 'Neznámý název';
    videoThumbnail.src = info.thumbnail || '';
    videoThumbnail.alt = info.title || 'Video thumbnail';
    
    videoUploader.textContent = `📺 ${info.uploader || 'Neznámý'}`;
    
    if (info.duration) {
        const minutes = Math.floor(info.duration / 60);
        const seconds = Math.floor(info.duration % 60);
        videoDuration.textContent = `⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        videoDuration.textContent = '⏱️ Neznámá';
    }
    
    if (info.view_count) {
        const views = info.view_count.toLocaleString('cs-CZ');
        videoViews.textContent = `👁️ ${views} zhlédnutí`;
    } else {
        videoViews.textContent = '👁️ Neznámé';
    }
}

// Download buttons
downloadButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        if (!currentVideoInfo) {
            alert('Nejprve zadejte a načtěte informace o videu');
            return;
        }

        const format = btn.dataset.format;
        const videoUrl = videoUrlInput.value.trim();

        // Hide video info and complete cards
        videoInfoCard.style.display = 'none';
        downloadCompleteCard.style.display = 'none';
        downloadProgressCard.style.display = 'block';

        // Reset progress
        progressFill.style.width = '0%';
        progressText.textContent = '0%';
        downloadStatus.textContent = 'Začíná stahování...';

        // Disable all download buttons
        downloadButtons.forEach(b => b.disabled = true);

        try {
            let endpoint;
            if (format === 'mp4') {
                endpoint = '/api/download/mp4';
            } else if (format === 'm4a') {
                endpoint = '/api/download/m4a';
            } else {
                endpoint = '/api/download/mp3';
            }
            const response = await fetch(`${API_SERVER_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: videoUrl })
            });

            if (!response.ok) {
                const error = await response.json();
                const errorObj = new Error(error.error || 'Chyba při stahování');
                errorObj.response = response;
                errorObj.details = error.details || '';
                throw errorObj;
            }

            const result = await response.json();
            
            // Simulate progress (since yt-dlp doesn't provide real-time progress via HTTP)
            let progress = 0;
            const progressInterval = setInterval(() => {
                if (progress < 90) {
                    progress += Math.random() * 10;
                    updateProgress(progress);
                }
            }, 500);

            // Wait for download to complete
            // In a real implementation, you'd poll or use WebSocket for real progress
            setTimeout(() => {
                clearInterval(progressInterval);
                updateProgress(100);
                downloadStatus.textContent = 'Stahování dokončeno!';
                
                setTimeout(() => {
                    displayDownloadComplete(result);
                    addToDownloadsHistory(result);
                }, 500);
            }, 3000);

        } catch (error) {
            console.error('Download error:', error);
            
            let errorMessage = error.message;
            let details = error.details || '';
            
            // Pokud máme detailnější chybovou zprávu
            if (details) {
                errorMessage += '\n\nDetaily: ' + details.substring(0, 300);
            }
            
            downloadStatus.textContent = `Chyba: ${error.message}`;
            
            // Zobrazíme detailnější chybovou zprávu
            let alertMessage = `Chyba při stahování: ${error.message}`;
            
            if (errorMessage.toLowerCase().includes('ffmpeg') || details.toLowerCase().includes('ffmpeg')) {
                alertMessage += '\n\n═══════════════════════════════════════\n' +
                    '⚠️ CHYBÍ FFMPEG\n' +
                    '═══════════════════════════════════════\n\n' +
                    'MP3 konverze vyžaduje ffmpeg.\n\n' +
                    'ŘEŠENÍ:\n' +
                    '1. Stáhněte ffmpeg z: https://www.gyan.dev/ffmpeg/builds/\n' +
                    '2. Rozbalte ZIP a zkopírujte ffmpeg.exe do C:\\Windows\\System32\n' +
                    '3. Nebo použijte: winget install ffmpeg\n' +
                    '4. Restartujte server\n\n' +
                    'Detailní návod: youtube-downloader/server/INSTALACE-FFMPEG.txt';
            } else if (details) {
                alertMessage += '\n\nDetaily: ' + details.substring(0, 500);
            }
            
            alert(alertMessage);
            downloadProgressCard.style.display = 'none';
            videoInfoCard.style.display = 'block';
        } finally {
            downloadButtons.forEach(b => b.disabled = false);
        }
    });
});

function updateProgress(percentage) {
    const clamped = Math.min(100, Math.max(0, percentage));
    progressFill.style.width = `${clamped}%`;
    progressText.textContent = `${Math.round(clamped)}%`;
    
    if (clamped < 100) {
        downloadStatus.textContent = `Stahování... ${Math.round(clamped)}%`;
    }
}

function displayDownloadComplete(result) {
    downloadFilename.textContent = result.filename;
    downloadFileBtn.onclick = () => downloadFile(result);
    
    downloadProgressCard.style.display = 'none';
    downloadCompleteCard.style.display = 'block';
    
    // Automaticky otevřít stahování/uložení
    // Pokud je zapnuté automatické ukládání a máme folder handle, uložíme přímo
    // Jinak otevřeme dialog pro výběr umístění
    setTimeout(() => {
        if (settings.autoSave && settings.folderHandle) {
            downloadFile(result, true);
        } else {
            downloadFile(result, false);
        }
    }, 500);
}

// Stahování souboru s podporou File System Access API
async function downloadFile(result, autoSave = false) {
    try {
        const filename = result.filename;
        const fileUrl = `${API_SERVER_URL}${result.path}`;
        
        // Pokud je zapnuté automatické ukládání a máme folder handle
        if (autoSave && settings.folderHandle) {
            try {
                // Stáhneme soubor jako blob
                const response = await fetch(fileUrl);
                const blob = await response.blob();
                
                // Vytvoříme soubor v zvolené složce
                const fileHandle = await settings.folderHandle.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                
                alert(`✅ Soubor ${filename} byl úspěšně uložen do zvolené složky!`);
                return;
            } catch (error) {
                console.error('Auto-save error:', error);
                // Fallback na normální stahování
            }
        }
        
        // Normální stahování nebo pokud File System Access API není dostupné
        // Zkusíme použít File System Access API pro výběr umístění
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'Soubor',
                        accept: {
                            'video/mp4': ['.mp4'],
                            'audio/mpeg': ['.mp3'],
                            'audio/mp4': ['.m4a'],
                            'application/octet-stream': ['*']
                        }
                    }]
                });
                
                // Stáhneme soubor jako blob
                const response = await fetch(fileUrl);
                const blob = await response.blob();
                
                // Uložíme do zvoleného umístění
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                
                alert(`✅ Soubor ${filename} byl úspěšně uložen!`);
            } catch (error) {
                if (error.name === 'AbortError') {
                    // Uživatel zrušil výběr
                    return;
                }
                console.error('Save file picker error:', error);
                // Fallback na tradiční stahování
                downloadFileTraditional(fileUrl, filename);
            }
        } else {
            // Fallback pro starší prohlížeče
            downloadFileTraditional(fileUrl, filename);
        }
    } catch (error) {
        console.error('Download error:', error);
        // Fallback na tradiční stahování
        const fileUrl = `${API_SERVER_URL}${result.path}`;
        downloadFileTraditional(fileUrl, result.filename);
    }
}

// Tradiční stahování (fallback)
function downloadFileTraditional(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Downloads history
function loadDownloadsHistory() {
    const history = JSON.parse(localStorage.getItem('downloadsHistory') || '[]');
    
    if (history.length === 0) {
        downloadsList.innerHTML = '<p class="empty-state-text">Zatím nejsou žádné stažené soubory</p>';
        return;
    }

    downloadsList.innerHTML = '';
    history.forEach(item => {
        const downloadItem = createDownloadItem(item);
        downloadsList.appendChild(downloadItem);
    });
}

function addToDownloadsHistory(result) {
    const history = JSON.parse(localStorage.getItem('downloadsHistory') || '[]');
    
    const newItem = {
        filename: result.filename,
        path: result.path,
        size: result.size,
        date: new Date().toISOString()
    };
    
    history.unshift(newItem);
    // Keep only last 20 items
    if (history.length > 20) {
        history.pop();
    }
    
    localStorage.setItem('downloadsHistory', JSON.stringify(history));
    loadDownloadsHistory();
}

function createDownloadItem(item) {
    const div = document.createElement('div');
    div.className = 'download-item';
    
    const date = new Date(item.date);
    const dateStr = date.toLocaleDateString('cs-CZ') + ' ' + date.toLocaleTimeString('cs-CZ');
    const sizeStr = formatFileSize(item.size);
    
    // Ikona podle typu souboru
    let icon = '📄';
    const ext = item.filename.toLowerCase().split('.').pop();
    if (ext === 'mp4') icon = '📹';
    else if (ext === 'mp3' || ext === 'm4a') icon = '🎵';
    
    div.innerHTML = `
        <div class="download-item-info">
            <div class="filename">${icon} ${item.filename}</div>
            <div class="file-size">${sizeStr} • ${dateStr}</div>
        </div>
        <div class="download-item-actions">
            <button onclick='downloadFromHistory("${API_SERVER_URL}${item.path}", "${item.filename}")' class="btn btn-primary">
                💾 Stáhnout
            </button>
        </div>
    `;
    
    return div;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Funkce pro stahování z historie (globální, aby fungovala v onclick)
window.downloadFromHistory = async function(url, filename) {
    try {
        // Pokud je zapnuté automatické ukládání a máme folder handle
        if (settings.autoSave && settings.folderHandle) {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                const fileHandle = await settings.folderHandle.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                alert(`✅ Soubor ${filename} byl úspěšně uložen!`);
                return;
            } catch (error) {
                console.error('Auto-save error:', error);
            }
        }
        
        // Normální stahování s výběrem umístění
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'Soubor',
                        accept: {
                            'video/mp4': ['.mp4'],
                            'audio/mpeg': ['.mp3'],
                            'audio/mp4': ['.m4a'],
                            'application/octet-stream': ['*']
                        }
                    }]
                });
                
                const response = await fetch(url);
                const blob = await response.blob();
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                alert(`✅ Soubor ${filename} byl úspěšně uložen!`);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    downloadFileTraditional(url, filename);
                }
            }
        } else {
            downloadFileTraditional(url, filename);
        }
    } catch (error) {
        console.error('Download error:', error);
        downloadFileTraditional(url, filename);
    }
};

// Settings management
function loadSettings() {
    const saved = localStorage.getItem('downloadSettings');
    if (saved) {
        settings = JSON.parse(saved);
        // File System Access API handle nelze uložit, musí být získán znovu
        settings.folderHandle = null;
    }
    
    autoSaveEnabled.checked = settings.autoSave;
    if (settings.downloadFolder) {
        downloadFolder.value = settings.downloadFolder;
    }
    
    updateFolderSelectorVisibility();
}

function saveSettings() {
    settings.autoSave = autoSaveEnabled.checked;
    settings.downloadFolder = downloadFolder.value;
    
    // Uložíme vše kromě folderHandle (ten se musí získat znovu při načtení)
    const toSave = {
        autoSave: settings.autoSave,
        downloadFolder: settings.downloadFolder
    };
    
    localStorage.setItem('downloadSettings', JSON.stringify(toSave));
    updateFolderSelectorVisibility();
}

function updateFolderSelectorVisibility() {
    if (autoSaveEnabled.checked) {
        downloadFolderLabel.style.display = 'block';
        folderSelectorContainer.style.display = 'block';
    } else {
        downloadFolderLabel.style.display = 'none';
        folderSelectorContainer.style.display = 'none';
    }
}

async function selectFolder() {
    if (!('showDirectoryPicker' in window)) {
        alert('Váš prohlížeč nepodporuje výběr složky. Použijte Chrome nebo Edge 86+.');
        return;
    }
    
    try {
        const handle = await window.showDirectoryPicker({
            mode: 'readwrite' // Pro zápis souborů
        });
        settings.folderHandle = handle;
        settings.downloadFolder = handle.name;
        downloadFolder.value = handle.name;
        saveSettings();
        alert('✅ Složka úspěšně vybrána: ' + handle.name);
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Folder selection error:', error);
            alert('Chyba při výběru složky: ' + error.message);
        }
    }
}

// Zkusit znovu získat folder handle z localStorage permission tokenu
async function tryRestoreFolderHandle() {
    // File System Access API bohužel nelze uložit do localStorage
    // Uživatel musí znovu vybrat složku po refresh stránky
    // Ale můžeme zkusit získat permission pokud byl dříve udělen
    if (settings.downloadFolder && 'showDirectoryPicker' in window) {
        // Nelze automaticky obnovit - uživatel musí znovu vybrat
        console.log('[Settings] Folder handle nelze automaticky obnovit - uživatel musí znovu vybrat složku');
    }
}

function setupSettingsModal() {
    // Toggle modal
    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'block';
    });
    
    cancelSettingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });
    
    // Close on outside click
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });
    
    // Form submission
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings();
        settingsModal.style.display = 'none';
        alert('Nastavení uloženo!');
    });
    
    // Auto-save checkbox
    autoSaveEnabled.addEventListener('change', () => {
        updateFolderSelectorVisibility();
    });
    
    // Folder selector button
    selectFolderBtn.addEventListener('click', () => {
        selectFolder();
    });
}

