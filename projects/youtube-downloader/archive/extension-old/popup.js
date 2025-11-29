// AdHUB YouTube Downloader - Popup Script

document.addEventListener('DOMContentLoaded', () => {
    const videoUrlInput = document.getElementById('videoUrl');
    const fetchBtn = document.getElementById('fetchBtn');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const videoInfo = document.getElementById('videoInfo');
    const thumbnail = document.getElementById('thumbnail');
    const videoTitle = document.getElementById('videoTitle');
    const videoAuthor = document.getElementById('videoAuthor');
    const formatsSection = document.getElementById('formatsSection');
    const formatsList = document.getElementById('formatsList');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    // Zkontrolovat aktuální tab - pokud je YouTube, použít URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
            const url = tabs[0].url;
            if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
                videoUrlInput.value = url;
            }
        }
    });
    
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
    
    // Formátování velikosti
    function formatFileSize(bytes) {
        if (!bytes || bytes === 0) return 'N/A';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
    }
    
    // Zobrazení chyby
    function showError(message) {
        error.textContent = message;
        error.classList.add('visible');
        loading.classList.remove('visible');
    }
    
    // Skrytí chyby
    function hideError() {
        error.classList.remove('visible');
    }
    
    // Načtení informací o videu
    fetchBtn.addEventListener('click', async () => {
        const url = videoUrlInput.value.trim();
        if (!url) {
            showError('Zadejte YouTube URL nebo video ID');
            return;
        }
        
        const videoId = extractVideoId(url);
        if (!videoId) {
            showError('Neplatná YouTube URL');
            return;
        }
        
        hideError();
        loading.classList.add('visible');
        videoInfo.classList.remove('visible');
        formatsSection.classList.remove('visible');
        fetchBtn.disabled = true;
        
        try {
            // Získání download linků
            const response = await chrome.runtime.sendMessage({
                action: 'getDownloadLinks',
                videoId: videoId,
                url: `https://www.youtube.com/watch?v=${videoId}`
            });
            
            loading.classList.remove('visible');
            fetchBtn.disabled = false;
            
            if (!response.success) {
                showError(response.error || 'Nepodařilo se načíst video');
                return;
            }
            
            // Zobrazení informací o videu
            thumbnail.src = response.thumbnail;
            videoTitle.textContent = response.title;
            videoInfo.classList.add('visible');
            
            // Zobrazení formátů
            displayFormats(response);
            
        } catch (err) {
            loading.classList.remove('visible');
            fetchBtn.disabled = false;
            showError('Chyba: ' + err.message);
        }
    });
    
    // Zobrazení formátů
    function displayFormats(data) {
        formatsList.innerHTML = '';
        
        // Kombinované formáty
        const combined = data.formats.filter(f => f.type === 'combined');
        if (combined.length > 0) {
            const header = document.createElement('p');
            header.style.cssText = 'color: #8b5cf6; font-size: 11px; font-weight: 600; margin: 10px 0 5px; text-transform: uppercase;';
            header.textContent = '📹 Video + Audio';
            formatsList.appendChild(header);
            
            combined.forEach(format => {
                const btn = createFormatButton(format, data.safeTitle);
                formatsList.appendChild(btn);
            });
        }
        
        // Audio formáty
        const audio = data.formats.filter(f => f.type === 'audio').slice(0, 3);
        if (audio.length > 0) {
            const header = document.createElement('p');
            header.style.cssText = 'color: #8b5cf6; font-size: 11px; font-weight: 600; margin: 15px 0 5px; text-transform: uppercase;';
            header.textContent = '🎵 Pouze Audio';
            formatsList.appendChild(header);
            
            audio.forEach(format => {
                const btn = createFormatButton(format, data.safeTitle);
                formatsList.appendChild(btn);
            });
        }
        
        formatsSection.classList.add('visible');
    }
    
    // Vytvoření tlačítka formátu
    function createFormatButton(format, title) {
        const btn = document.createElement('button');
        btn.className = 'format-btn';
        
        let quality = format.quality || 'Unknown';
        if (format.type === 'audio' && format.bitrate) {
            quality = Math.round(format.bitrate / 1000) + ' kbps';
        }
        
        const size = formatFileSize(parseInt(format.contentLength));
        const ext = format.mimeType?.includes('webm') ? 'webm' : (format.type === 'audio' ? 'm4a' : 'mp4');
        
        btn.innerHTML = `
            <span class="quality">${quality}</span>
            <span class="size">${size}</span>
        `;
        
        btn.addEventListener('click', async () => {
            btn.textContent = 'Stahuji...';
            btn.disabled = true;
            
            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'downloadVideo',
                    url: format.url,
                    filename: `${title}_${quality}.${ext}`
                });
                
                if (response.success) {
                    btn.textContent = '✓ Staženo';
                    btn.style.background = 'rgba(34, 197, 94, 0.3)';
                    btn.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                } else {
                    throw new Error(response.error);
                }
            } catch (err) {
                btn.textContent = 'Chyba';
                btn.style.background = 'rgba(239, 68, 68, 0.3)';
                btn.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            }
        });
        
        return btn;
    }
    
    // Enter pro odeslání
    videoUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            fetchBtn.click();
        }
    });
});
