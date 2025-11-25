// AdHUB YouTube Downloader - Content Script
// Běží na YouTube stránkách

(function() {
    'use strict';
    
    console.log('[AdHUB] Content script loaded on YouTube');
    
    // Stav
    let currentVideoId = null;
    let downloadButton = null;
    
    // Extrakce video ID z URL
    function getVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v');
    }
    
    // Vytvoření tlačítka pro stahování
    function createDownloadButton() {
        const existingBtn = document.getElementById('adhub-download-btn');
        if (existingBtn) {
            existingBtn.remove();
        }
        
        const btn = document.createElement('button');
        btn.id = 'adhub-download-btn';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            <span>Stáhnout</span>
        `;
        btn.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: linear-gradient(135deg, #8b5cf6, #ec4899);
            color: white;
            border: none;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
            margin-left: 8px;
        `;
        
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.05)';
            btn.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.6)';
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.4)';
        });
        
        btn.addEventListener('click', showDownloadModal);
        
        return btn;
    }
    
    // Vložení tlačítka do stránky
    function insertDownloadButton() {
        const videoId = getVideoId();
        if (!videoId) return;
        
        // Najít místo pro tlačítko (pod videem)
        const actionsContainer = document.querySelector('#top-level-buttons-computed') ||
                                  document.querySelector('#menu-container') ||
                                  document.querySelector('ytd-menu-renderer');
        
        if (actionsContainer && !document.getElementById('adhub-download-btn')) {
            downloadButton = createDownloadButton();
            actionsContainer.appendChild(downloadButton);
            console.log('[AdHUB] Download button inserted');
        }
    }
    
    // Zobrazení modálního okna pro stahování
    async function showDownloadModal() {
        const videoId = getVideoId();
        if (!videoId) {
            alert('Nepodařilo se najít ID videa');
            return;
        }
        
        // Vytvoření modálního okna
        let modal = document.getElementById('adhub-modal');
        if (modal) {
            modal.remove();
        }
        
        modal = document.createElement('div');
        modal.id = 'adhub-modal';
        modal.innerHTML = `
            <div class="adhub-modal-overlay">
                <div class="adhub-modal-content">
                    <div class="adhub-modal-header">
                        <h2>📥 AdHUB YouTube Downloader</h2>
                        <button class="adhub-close-btn">&times;</button>
                    </div>
                    <div class="adhub-modal-body">
                        <div class="adhub-loading">
                            <div class="adhub-spinner"></div>
                            <p>Načítání dostupných formátů...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Styly
        const style = document.createElement('style');
        style.textContent = `
            .adhub-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999999;
                backdrop-filter: blur(10px);
            }
            
            .adhub-modal-content {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 16px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow: hidden;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(139, 92, 246, 0.3);
            }
            
            .adhub-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .adhub-modal-header h2 {
                margin: 0;
                color: white;
                font-size: 20px;
                background: linear-gradient(125deg, #8b5cf6, #ec4899);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            
            .adhub-close-btn {
                background: none;
                border: none;
                color: #888;
                font-size: 28px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            
            .adhub-close-btn:hover {
                color: white;
            }
            
            .adhub-modal-body {
                padding: 24px;
                overflow-y: auto;
                max-height: 60vh;
            }
            
            .adhub-loading {
                text-align: center;
                padding: 40px;
                color: #aaa;
            }
            
            .adhub-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(139, 92, 246, 0.3);
                border-top-color: #8b5cf6;
                border-radius: 50%;
                animation: adhub-spin 1s linear infinite;
                margin: 0 auto 16px;
            }
            
            @keyframes adhub-spin {
                to { transform: rotate(360deg); }
            }
            
            .adhub-format-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .adhub-format-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 14px 18px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.3s ease;
            }
            
            .adhub-format-item:hover {
                background: rgba(139, 92, 246, 0.15);
                border-color: rgba(139, 92, 246, 0.4);
            }
            
            .adhub-format-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .adhub-format-quality {
                color: white;
                font-weight: 600;
                font-size: 15px;
            }
            
            .adhub-format-details {
                color: #888;
                font-size: 12px;
            }
            
            .adhub-download-btn {
                padding: 10px 20px;
                background: linear-gradient(135deg, #8b5cf6, #ec4899);
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .adhub-download-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 15px rgba(139, 92, 246, 0.5);
            }
            
            .adhub-section-title {
                color: #8b5cf6;
                font-size: 14px;
                font-weight: 600;
                margin: 20px 0 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .adhub-section-title:first-child {
                margin-top: 0;
            }
            
            .adhub-error {
                text-align: center;
                color: #ef4444;
                padding: 20px;
            }
            
            .adhub-video-info {
                display: flex;
                gap: 16px;
                margin-bottom: 20px;
                padding-bottom: 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .adhub-video-thumb {
                width: 160px;
                border-radius: 8px;
            }
            
            .adhub-video-title {
                color: white;
                font-size: 16px;
                font-weight: 600;
                margin: 0 0 8px;
                line-height: 1.4;
            }
            
            .adhub-video-author {
                color: #888;
                font-size: 13px;
            }
        `;
        
        modal.appendChild(style);
        document.body.appendChild(modal);
        
        // Event listenery
        modal.querySelector('.adhub-close-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('.adhub-modal-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('adhub-modal-overlay')) {
                modal.remove();
            }
        });
        
        // Načtení formátů
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'getDownloadLinks',
                videoId: videoId,
                url: window.location.href
            });
            
            if (!response.success) {
                throw new Error(response.error || 'Nepodařilo se získat formáty');
            }
            
            displayFormats(modal, response);
            
        } catch (error) {
            console.error('[AdHUB] Error:', error);
            modal.querySelector('.adhub-modal-body').innerHTML = `
                <div class="adhub-error">
                    <p>❌ ${error.message}</p>
                    <p style="font-size: 12px; color: #888; margin-top: 10px;">
                        Některá videa mohou být chráněná proti stahování.
                    </p>
                </div>
            `;
        }
    }
    
    // Zobrazení dostupných formátů
    function displayFormats(modal, data) {
        const body = modal.querySelector('.adhub-modal-body');
        
        // Video info
        let html = `
            <div class="adhub-video-info">
                <img src="${data.thumbnail}" alt="" class="adhub-video-thumb">
                <div>
                    <h3 class="adhub-video-title">${data.title}</h3>
                </div>
            </div>
        `;
        
        // Kombinované formáty (video + audio)
        const combinedFormats = data.formats.filter(f => f.type === 'combined');
        if (combinedFormats.length > 0) {
            html += `<h4 class="adhub-section-title">📹 Video (s audiem)</h4>`;
            html += `<div class="adhub-format-list">`;
            
            for (const format of combinedFormats) {
                const size = format.contentLength ? formatFileSize(parseInt(format.contentLength)) : 'N/A';
                html += `
                    <div class="adhub-format-item">
                        <div class="adhub-format-info">
                            <span class="adhub-format-quality">${format.quality}</span>
                            <span class="adhub-format-details">${format.codec} • ${size}</span>
                        </div>
                        <button class="adhub-download-btn" data-url="${encodeURIComponent(format.url)}" data-filename="${data.safeTitle}_${format.quality}.mp4">
                            Stáhnout
                        </button>
                    </div>
                `;
            }
            html += `</div>`;
        }
        
        // Video only formáty
        const videoFormats = data.formats.filter(f => f.type === 'video').slice(0, 5);
        if (videoFormats.length > 0) {
            html += `<h4 class="adhub-section-title">🎬 Video (bez audia)</h4>`;
            html += `<div class="adhub-format-list">`;
            
            for (const format of videoFormats) {
                const size = format.contentLength ? formatFileSize(parseInt(format.contentLength)) : 'N/A';
                const ext = format.mimeType?.includes('webm') ? 'webm' : 'mp4';
                html += `
                    <div class="adhub-format-item">
                        <div class="adhub-format-info">
                            <span class="adhub-format-quality">${format.quality || format.height + 'p'}</span>
                            <span class="adhub-format-details">${format.codec} • ${size}</span>
                        </div>
                        <button class="adhub-download-btn" data-url="${encodeURIComponent(format.url)}" data-filename="${data.safeTitle}_${format.quality || format.height + 'p'}.${ext}">
                            Stáhnout
                        </button>
                    </div>
                `;
            }
            html += `</div>`;
        }
        
        // Audio formáty
        const audioFormats = data.formats.filter(f => f.type === 'audio').slice(0, 4);
        if (audioFormats.length > 0) {
            html += `<h4 class="adhub-section-title">🎵 Audio</h4>`;
            html += `<div class="adhub-format-list">`;
            
            for (const format of audioFormats) {
                const size = format.contentLength ? formatFileSize(parseInt(format.contentLength)) : 'N/A';
                const bitrate = format.bitrate ? Math.round(format.bitrate / 1000) + ' kbps' : '';
                const ext = format.mimeType?.includes('webm') ? 'webm' : 'm4a';
                html += `
                    <div class="adhub-format-item">
                        <div class="adhub-format-info">
                            <span class="adhub-format-quality">${bitrate || format.quality}</span>
                            <span class="adhub-format-details">${format.codec} • ${size}</span>
                        </div>
                        <button class="adhub-download-btn" data-url="${encodeURIComponent(format.url)}" data-filename="${data.safeTitle}.${ext}">
                            Stáhnout
                        </button>
                    </div>
                `;
            }
            html += `</div>`;
        }
        
        if (combinedFormats.length === 0 && videoFormats.length === 0 && audioFormats.length === 0) {
            html = `
                <div class="adhub-error">
                    <p>❌ Nebyly nalezeny žádné dostupné formáty</p>
                </div>
            `;
        }
        
        body.innerHTML = html;
        
        // Event listenery pro tlačítka stahování
        body.querySelectorAll('.adhub-download-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const url = decodeURIComponent(e.target.dataset.url);
                const filename = e.target.dataset.filename;
                
                btn.textContent = 'Stahuji...';
                btn.disabled = true;
                
                try {
                    const response = await chrome.runtime.sendMessage({
                        action: 'downloadVideo',
                        url: url,
                        filename: filename
                    });
                    
                    if (response.success) {
                        btn.textContent = '✓ Staženo';
                        btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
                    } else {
                        throw new Error(response.error);
                    }
                } catch (error) {
                    btn.textContent = 'Chyba';
                    btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                    console.error('[AdHUB] Download error:', error);
                }
            });
        });
    }
    
    // Formátování velikosti souboru
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
    }
    
    // Sledování změn URL (SPA navigace)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            currentVideoId = getVideoId();
            
            if (currentVideoId) {
                // Počkáme na načtení stránky
                setTimeout(insertDownloadButton, 1500);
            }
        }
    }).observe(document, { subtree: true, childList: true });
    
    // Inicializace při prvním načtení
    if (getVideoId()) {
        setTimeout(insertDownloadButton, 2000);
    }
    
})();
