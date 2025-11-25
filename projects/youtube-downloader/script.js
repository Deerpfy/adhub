// AdHUB YouTube Downloader - Client-Side Application
// Funguje na GitHub Pages bez serveru, stahování přes browser extension

console.log('[AdHUB] 📜 Script loaded!');
console.log('[AdHUB] Location:', window.location.href);
console.log('[AdHUB] User Agent:', navigator.userAgent);

// =========================================
// EXTENSION FILES - zakódované soubory rozšíření
// =========================================

const EXTENSION_FILES = {
    'manifest.json': `{
  "manifest_version": 3,
  "name": "AdHUB YouTube Downloader",
  "version": "1.1.0",
  "description": "Stahujte YouTube videa přímo z prohlížeče - MP4, WebM, M4A",
  "permissions": [
    "activeTab",
    "storage",
    "downloads",
    "scripting"
  ],
  "host_permissions": [
    "https://www.youtube.com/*",
    "https://youtube.com/*",
    "https://youtu.be/*",
    "https://*.googlevideo.com/*",
    "https://*.ytimg.com/*",
    "http://localhost:*/*",
    "http://127.0.0.1:*/*",
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://www.youtube.com/*", "https://youtube.com/*"],
      "js": ["content.js"],
      "run_at": "document_end"
    },
    {
      "matches": ["http://localhost:*/*", "http://127.0.0.1:*/*", "https://*.github.io/*", "file:///*"],
      "js": ["page-bridge.js"],
      "run_at": "document_start",
      "all_frames": true
    }
  ],
  "externally_connectable": {
    "matches": [
      "https://*.github.io/*",
      "http://localhost:*/*",
      "http://127.0.0.1:*/*"
    ]
  },
  "web_accessible_resources": [
    {
      "resources": ["icons/*", "page-bridge.js"],
      "matches": ["<all_urls>"]
    }
  ]
}`,

    'background.js': `// AdHUB YouTube Downloader - Background Service Worker

let extensionState = {
    isActive: true,
    lastVideoInfo: null,
    downloadQueue: []
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[AdHUB] Received message:', request.action);
    
    switch (request.action) {
        case 'ping':
            sendResponse({ success: true, message: 'AdHUB Extension is active', version: '1.0.0' });
            break;
            
        case 'getVideoInfo':
            handleGetVideoInfo(request.videoId, request.url).then(sendResponse);
            return true;
            
        case 'downloadVideo':
            handleDownload(request.url, request.format, request.quality, request.filename).then(sendResponse);
            return true;
            
        case 'getDownloadLinks':
            handleGetDownloadLinks(request.videoId, request.url).then(sendResponse);
            return true;
            
        case 'checkStatus':
            sendResponse({ success: true, isActive: extensionState.isActive, version: '1.0.0' });
            break;
            
        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }
    
    return false;
});

async function handleGetVideoInfo(videoId, url) {
    try {
        const oembedUrl = \`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=\${videoId}&format=json\`;
        const oembedResponse = await fetch(oembedUrl);
        
        if (!oembedResponse.ok) throw new Error('Nepodařilo se získat info');
        
        const oembedData = await oembedResponse.json();
        
        let additionalInfo = {};
        try {
            const pageResponse = await fetch(\`https://www.youtube.com/watch?v=\${videoId}\`);
            const pageText = await pageResponse.text();
            
            const playerResponseMatch = pageText.match(/ytInitialPlayerResponse\\s*=\\s*({.+?});/);
            if (playerResponseMatch) {
                const playerResponse = JSON.parse(playerResponseMatch[1]);
                const videoDetails = playerResponse.videoDetails || {};
                
                additionalInfo = {
                    duration: parseInt(videoDetails.lengthSeconds) || 0,
                    viewCount: parseInt(videoDetails.viewCount) || 0,
                    description: videoDetails.shortDescription || '',
                    isLive: videoDetails.isLiveContent || false
                };
            }
        } catch (e) {
            console.log('[AdHUB] Could not get additional info:', e.message);
        }
        
        return {
            success: true,
            videoId: videoId,
            title: oembedData.title,
            author: oembedData.author_name,
            thumbnail: \`https://i.ytimg.com/vi/\${videoId}/maxresdefault.jpg\`,
            thumbnailMq: \`https://i.ytimg.com/vi/\${videoId}/mqdefault.jpg\`,
            duration: additionalInfo.duration || 0,
            viewCount: additionalInfo.viewCount || 0,
            isLive: additionalInfo.isLive || false
        };
        
    } catch (error) {
        console.error('[AdHUB] Error getting video info:', error);
        return { success: false, error: error.message };
    }
}

async function handleGetDownloadLinks(videoId, url) {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[AdHUB Formats] 🔍 FETCHING DOWNLOAD LINKS');
        console.log('[AdHUB Formats] Video ID:', videoId);

        const pageResponse = await fetch(\`https://www.youtube.com/watch?v=\${videoId}\`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const pageText = await pageResponse.text();
        console.log('[AdHUB Formats] Page fetched, size:', pageText.length, 'chars');

        const playerResponseMatch = pageText.match(/ytInitialPlayerResponse\\s*=\\s*({.+?});/);
        if (!playerResponseMatch) throw new Error('Nepodařilo se najít video data');

        const playerResponse = JSON.parse(playerResponseMatch[1]);
        console.log('[AdHUB Formats] Player response parsed successfully');

        const playabilityStatus = playerResponse.playabilityStatus;
        console.log('[AdHUB Formats] Playability status:', playabilityStatus?.status);
        if (playabilityStatus?.status !== 'OK') {
            throw new Error(playabilityStatus?.reason || 'Video není dostupné');
        }

        const streamingData = playerResponse.streamingData;
        if (!streamingData) throw new Error('Nejsou dostupné žádné streamy');

        console.log('[AdHUB Formats] Streaming data found:', {
            hasAdaptiveFormats: !!streamingData.adaptiveFormats,
            adaptiveFormatsCount: streamingData.adaptiveFormats?.length || 0,
            hasFormats: !!streamingData.formats,
            formatsCount: streamingData.formats?.length || 0
        });

        const formats = [];

        if (streamingData.adaptiveFormats) {
            console.log('[AdHUB Formats] Processing adaptive formats...');
            for (const format of streamingData.adaptiveFormats) {
                if (format.url) {
                    const formatInfo = {
                        itag: format.itag,
                        url: format.url,
                        mimeType: format.mimeType,
                        quality: format.qualityLabel || format.audioQuality || 'unknown',
                        contentLength: format.contentLength,
                        bitrate: format.bitrate,
                        width: format.width,
                        height: format.height,
                        type: format.mimeType?.includes('audio') ? 'audio' : 'video',
                        codec: extractCodec(format.mimeType)
                    };
                    formats.push(formatInfo);
                    console.log(\`[AdHUB Formats]   ✓ \${formatInfo.type} - \${formatInfo.quality} (\${formatInfo.codec}) - \${Math.round(formatInfo.contentLength / 1024 / 1024)} MB\`);
                }
            }
        }

        if (streamingData.formats) {
            console.log('[AdHUB Formats] Processing combined formats...');
            for (const format of streamingData.formats) {
                if (format.url) {
                    const formatInfo = {
                        itag: format.itag,
                        url: format.url,
                        mimeType: format.mimeType,
                        quality: format.qualityLabel || 'unknown',
                        contentLength: format.contentLength,
                        bitrate: format.bitrate,
                        width: format.width,
                        height: format.height,
                        type: 'combined',
                        hasAudio: true,
                        hasVideo: true,
                        codec: extractCodec(format.mimeType)
                    };
                    formats.push(formatInfo);
                    console.log(\`[AdHUB Formats]   ✓ combined - \${formatInfo.quality} (\${formatInfo.codec}) - \${Math.round(formatInfo.contentLength / 1024 / 1024)} MB\`);
                }
            }
        }

        formats.sort((a, b) => {
            if (a.type === 'combined' && b.type !== 'combined') return -1;
            if (a.type !== 'combined' && b.type === 'combined') return 1;
            return (b.height || 0) - (a.height || 0);
        });

        console.log('[AdHUB Formats] 📊 Total formats found:', formats.length);
        console.log('[AdHUB Formats] Breakdown:', {
            combined: formats.filter(f => f.type === 'combined').length,
            video: formats.filter(f => f.type === 'video').length,
            audio: formats.filter(f => f.type === 'audio').length
        });

        const title = playerResponse.videoDetails?.title || 'video';
        const safeTitle = title.replace(/[<>:"/\\\\|?*]/g, '_').substring(0, 100);

        console.log('[AdHUB Formats] Video title:', title);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return {
            success: true,
            videoId: videoId,
            title: title,
            safeTitle: safeTitle,
            formats: formats,
            thumbnail: \`https://i.ytimg.com/vi/\${videoId}/maxresdefault.jpg\`
        };

    } catch (error) {
        console.error('[AdHUB] Error getting download links:', error);
        return { success: false, error: error.message };
    }
}

function extractCodec(mimeType) {
    if (!mimeType) return 'unknown';
    const codecMatch = mimeType.match(/codecs="([^"]+)"/);
    return codecMatch ? codecMatch[1] : mimeType.split('/')[1]?.split(';')[0] || 'unknown';
}

async function handleDownload(url, format, quality, filename) {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[AdHUB Download] 🎬 STARTING DOWNLOAD');
        console.log('[AdHUB Download] Parameters:', {
            format,
            quality,
            filename,
            urlLength: url?.length,
            urlStart: url?.substring(0, 150)
        });

        let finalFilename = filename;
        if (!finalFilename) {
            let ext = format || 'mp4';
            if (url) {
                if (url.includes('mime=audio') || url.includes('audio/')) {
                    ext = url.includes('webm') ? 'webm' : 'm4a';
                } else if (url.includes('mime=video') || url.includes('video/')) {
                    ext = url.includes('webm') ? 'webm' : 'mp4';
                }
            }
            finalFilename = 'video_' + Date.now() + '.' + ext;
        }
        if (finalFilename && !finalFilename.match(/\\.(mp4|webm|m4a|mp3|mkv|avi|mov)$/i)) {
            console.log('[AdHUB Download] ⚠️ Filename missing extension, adding one');
            if (url && (url.includes('mime=audio') || url.includes('audio/'))) {
                finalFilename += url.includes('webm') ? '.webm' : '.m4a';
            } else {
                finalFilename += url && url.includes('webm') ? '.webm' : '.mp4';
            }
        }

        console.log('[AdHUB Download] 📝 Final filename:', finalFilename);

        // Analyze URL
        const urlObj = new URL(url);
        const mimeType = urlObj.searchParams.get('mime');
        console.log('[AdHUB Download] 📊 URL Analysis:', {
            host: urlObj.host,
            mimeType: mimeType,
            hasRatebypass: urlObj.searchParams.has('ratebypass'),
            hasExpire: urlObj.searchParams.has('expire')
        });

        // Fetch video as blob first (YouTube URLs require proper headers and session)
        console.log('[AdHUB Download] 🌐 Fetching video as blob...');
        const fetchStartTime = Date.now();

        // Extract video ID from URL to create proper referer
        const videoIdMatch = url.match(/[?&]id=([^&]+)/);
        const refererUrl = videoIdMatch
            ? \`https://www.youtube.com/watch?v=\${videoIdMatch[1]}\`
            : 'https://www.youtube.com/';

        console.log('[AdHUB Download] Using Referer:', refererUrl);

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',  // Include cookies from YouTube session
            headers: {
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Origin': 'https://www.youtube.com',
                'Referer': refererUrl,
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'cross-site',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
        });

        const fetchTime = Date.now() - fetchStartTime;
        console.log('[AdHUB Download] 📡 Fetch response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length'),
            fetchTimeMs: fetchTime
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[AdHUB Download] ❌ Fetch failed, response text:', errorText.substring(0, 500));
            throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        }

        const blobStartTime = Date.now();
        const blob = await response.blob();
        const blobTime = Date.now() - blobStartTime;

        const blobSizeMB = Math.round(blob.size / 1024 / 1024 * 100) / 100;
        console.log('[AdHUB Download] ✅ Blob created:', {
            size: \`\${blobSizeMB} MB\`,
            type: blob.type,
            blobTimeMs: blobTime
        });

        // Verify blob
        if (blob.size === 0) {
            console.error('[AdHUB Download] ❌ Blob is empty!');
            throw new Error('Downloaded blob is empty');
        }

        if (blob.type.includes('text') || blob.type.includes('html')) {
            console.error('[AdHUB Download] ⚠️ WARNING: Blob type suggests error page:', blob.type);
        }

        // Create object URL from blob
        const blobUrl = URL.createObjectURL(blob);
        console.log('[AdHUB Download] 🔗 Object URL created:', blobUrl);

        // Download the blob URL
        console.log('[AdHUB Download] 💾 Calling chrome.downloads.download...');
        const downloadId = await chrome.downloads.download({
            url: blobUrl,
            filename: finalFilename,
            saveAs: false,
            conflictAction: 'uniquify'
        });

        console.log('[AdHUB Download] ✅ Download started with ID:', downloadId);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Clean up blob URL after download completes
        chrome.downloads.onChanged.addListener(function cleanup(delta) {
            if (delta.id === downloadId && delta.state?.current === 'complete') {
                console.log('[AdHUB Download] ✅ Download complete, cleaning up blob URL');
                URL.revokeObjectURL(blobUrl);
                chrome.downloads.onChanged.removeListener(cleanup);
            } else if (delta.id === downloadId && delta.state?.current === 'interrupted') {
                console.error('[AdHUB Download] ❌ Download interrupted:', delta.error?.current);
                URL.revokeObjectURL(blobUrl);
                chrome.downloads.onChanged.removeListener(cleanup);
            }
        });

        return { success: true, downloadId: downloadId };

    } catch (error) {
        console.error('[AdHUB] Download error:', error);
        return { success: false, error: error.message };
    }
}

chrome.downloads.onChanged.addListener((delta) => {
    if (delta.state) {
        console.log('[AdHUB] Download state changed:', delta.id, delta.state.current);
    }
});

console.log('[AdHUB] YouTube Downloader Extension loaded');`,

    'content.js': `// AdHUB YouTube Downloader - Content Script
// Běží na YouTube stránkách

(function() {
    'use strict';
    
    console.log('[AdHUB] Content script loaded on YouTube');
    
    let currentVideoId = null;
    let downloadButton = null;
    
    function getVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v');
    }
    
    function createDownloadButton() {
        const existingBtn = document.getElementById('adhub-download-btn');
        if (existingBtn) existingBtn.remove();
        
        const btn = document.createElement('button');
        btn.id = 'adhub-download-btn';
        btn.innerHTML = \`
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            <span>Stáhnout</span>
        \`;
        btn.style.cssText = \`
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
        \`;
        
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
    
    function insertDownloadButton() {
        const videoId = getVideoId();
        if (!videoId) return;
        
        const actionsContainer = document.querySelector('#top-level-buttons-computed') ||
                                  document.querySelector('#menu-container') ||
                                  document.querySelector('ytd-menu-renderer');
        
        if (actionsContainer && !document.getElementById('adhub-download-btn')) {
            downloadButton = createDownloadButton();
            actionsContainer.appendChild(downloadButton);
            console.log('[AdHUB] Download button inserted');
        }
    }
    
    async function showDownloadModal() {
        const videoId = getVideoId();
        if (!videoId) {
            alert('Nepodařilo se najít ID videa');
            return;
        }
        
        let modal = document.getElementById('adhub-modal');
        if (modal) modal.remove();
        
        modal = document.createElement('div');
        modal.id = 'adhub-modal';
        modal.innerHTML = \`
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
        \`;
        
        const style = document.createElement('style');
        style.textContent = \`
            .adhub-modal-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
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
            }
            .adhub-close-btn:hover { color: white; }
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
            @keyframes adhub-spin { to { transform: rotate(360deg); } }
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
            }
            .adhub-section-title:first-child { margin-top: 0; }
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
            }
        \`;
        
        modal.appendChild(style);
        document.body.appendChild(modal);
        
        modal.querySelector('.adhub-close-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('.adhub-modal-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('adhub-modal-overlay')) modal.remove();
        });
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'getDownloadLinks',
                videoId: videoId,
                url: window.location.href
            });
            
            if (!response.success) throw new Error(response.error || 'Nepodařilo se získat formáty');
            
            displayFormats(modal, response);
            
        } catch (error) {
            console.error('[AdHUB] Error:', error);
            modal.querySelector('.adhub-modal-body').innerHTML = \`
                <div class="adhub-error">
                    <p>❌ \${error.message}</p>
                    <p style="font-size: 12px; color: #888; margin-top: 10px;">
                        Některá videa mohou být chráněná proti stahování.
                    </p>
                </div>
            \`;
        }
    }
    
    function displayFormats(modal, data) {
        const body = modal.querySelector('.adhub-modal-body');
        
        let html = \`
            <div class="adhub-video-info">
                <img src="\${data.thumbnail}" alt="" class="adhub-video-thumb">
                <div>
                    <h3 class="adhub-video-title">\${data.title}</h3>
                </div>
            </div>
        \`;
        
        const combinedFormats = data.formats.filter(f => f.type === 'combined');
        if (combinedFormats.length > 0) {
            html += \`<h4 class="adhub-section-title">📹 Video (s audiem)</h4>\`;
            html += \`<div class="adhub-format-list">\`;
            
            for (const format of combinedFormats) {
                const size = format.contentLength ? formatFileSize(parseInt(format.contentLength)) : 'N/A';
                html += \`
                    <div class="adhub-format-item">
                        <div class="adhub-format-info">
                            <span class="adhub-format-quality">\${format.quality}</span>
                            <span class="adhub-format-details">\${format.codec} • \${size}</span>
                        </div>
                        <button class="adhub-download-btn" data-url="\${encodeURIComponent(format.url)}" data-filename="\${data.safeTitle}_\${format.quality}.mp4">
                            Stáhnout
                        </button>
                    </div>
                \`;
            }
            html += \`</div>\`;
        }
        
        const audioFormats = data.formats.filter(f => f.type === 'audio').slice(0, 4);
        if (audioFormats.length > 0) {
            html += \`<h4 class="adhub-section-title">🎵 Audio</h4>\`;
            html += \`<div class="adhub-format-list">\`;
            
            for (const format of audioFormats) {
                const size = format.contentLength ? formatFileSize(parseInt(format.contentLength)) : 'N/A';
                const bitrate = format.bitrate ? Math.round(format.bitrate / 1000) + ' kbps' : '';
                const ext = format.mimeType?.includes('webm') ? 'webm' : 'm4a';
                html += \`
                    <div class="adhub-format-item">
                        <div class="adhub-format-info">
                            <span class="adhub-format-quality">\${bitrate || format.quality}</span>
                            <span class="adhub-format-details">\${format.codec} • \${size}</span>
                        </div>
                        <button class="adhub-download-btn" data-url="\${encodeURIComponent(format.url)}" data-filename="\${data.safeTitle}.\${ext}">
                            Stáhnout
                        </button>
                    </div>
                \`;
            }
            html += \`</div>\`;
        }
        
        if (combinedFormats.length === 0 && audioFormats.length === 0) {
            html = \`<div class="adhub-error"><p>❌ Nebyly nalezeny žádné dostupné formáty</p></div>\`;
        }
        
        body.innerHTML = html;
        
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
                }
            });
        });
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
    }
    
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            currentVideoId = getVideoId();
            if (currentVideoId) setTimeout(insertDownloadButton, 1500);
        }
    }).observe(document, { subtree: true, childList: true });
    
    if (getVideoId()) setTimeout(insertDownloadButton, 2000);
    
})();`,

    'popup.html': `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AdHUB YouTube Downloader</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            width: 360px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
            color: #e0e0e0;
        }
        .container { padding: 20px; }
        header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        h1 {
            font-size: 18px;
            font-weight: 700;
            background: linear-gradient(125deg, #8b5cf6, #ec4899);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }
        .status {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 12px;
            color: #888;
        }
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #22c55e;
            box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
        }
        .input-section { margin-bottom: 20px; }
        .input-section label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #aaa;
        }
        .input-group { display: flex; gap: 8px; }
        input[type="text"] {
            flex: 1;
            padding: 10px 14px;
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.3);
            color: white;
            font-size: 13px;
        }
        input[type="text"]:focus {
            outline: none;
            border-color: #8b5cf6;
        }
        .btn {
            padding: 10px 16px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            font-size: 13px;
        }
        .btn-primary {
            background: linear-gradient(135deg, #8b5cf6, #ec4899);
            color: white;
        }
        .video-info {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 15px;
            display: none;
        }
        .video-info.visible { display: block; }
        .video-info img {
            width: 100%;
            border-radius: 6px;
            margin-bottom: 10px;
        }
        .video-info h3 {
            font-size: 14px;
            color: white;
            margin-bottom: 5px;
        }
        .formats-section { display: none; }
        .formats-section.visible { display: block; }
        .format-btn {
            width: 100%;
            padding: 12px;
            margin-bottom: 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: white;
            font-size: 13px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
        }
        .format-btn:hover {
            background: rgba(139, 92, 246, 0.2);
        }
        .loading { text-align: center; padding: 20px; display: none; }
        .loading.visible { display: block; }
        .spinner {
            width: 24px;
            height: 24px;
            border: 2px solid rgba(139, 92, 246, 0.3);
            border-top-color: #8b5cf6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            padding: 10px;
            color: #ef4444;
            font-size: 12px;
            display: none;
        }
        .error.visible { display: block; }
        .help-text {
            font-size: 11px;
            color: #666;
            margin-top: 15px;
            text-align: center;
        }
        footer {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            text-align: center;
        }
        footer p { font-size: 11px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🎥 AdHUB YouTube Downloader</h1>
            <div class="status">
                <span class="status-dot"></span>
                <span>Rozšíření aktivní</span>
            </div>
        </header>
        <div class="input-section">
            <label>YouTube URL nebo Video ID:</label>
            <div class="input-group">
                <input type="text" id="videoUrl" placeholder="https://youtube.com/watch?v=...">
                <button class="btn btn-primary" id="fetchBtn">Načíst</button>
            </div>
        </div>
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Načítání...</p>
        </div>
        <div class="error" id="error"></div>
        <div class="video-info" id="videoInfo">
            <img id="thumbnail" src="" alt="Thumbnail">
            <h3 id="videoTitle"></h3>
        </div>
        <div class="formats-section" id="formatsSection">
            <div id="formatsList"></div>
        </div>
        <p class="help-text">Tip: Jděte na YouTube a klikněte na tlačítko "Stáhnout" pod videem.</p>
        <footer>
            <p>AdHUB © 2024</p>
        </footer>
    </div>
    <script src="popup.js"></script>
</body>
</html>`,

    'popup.js': `document.addEventListener('DOMContentLoaded', () => {
    const videoUrlInput = document.getElementById('videoUrl');
    const fetchBtn = document.getElementById('fetchBtn');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const videoInfo = document.getElementById('videoInfo');
    const thumbnail = document.getElementById('thumbnail');
    const videoTitle = document.getElementById('videoTitle');
    const formatsSection = document.getElementById('formatsSection');
    const formatsList = document.getElementById('formatsList');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
            const url = tabs[0].url;
            if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
                videoUrlInput.value = url;
            }
        }
    });
    
    function extractVideoId(url) {
        const patterns = [
            /(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/|youtube\\.com\\/embed\\/)([^&\\n?#]+)/,
            /youtube\\.com\\/v\\/([^&\\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }
    
    function formatFileSize(bytes) {
        if (!bytes) return 'N/A';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
    }
    
    fetchBtn.addEventListener('click', async () => {
        const url = videoUrlInput.value.trim();
        if (!url) {
            error.textContent = 'Zadejte YouTube URL';
            error.classList.add('visible');
            return;
        }
        
        const videoId = extractVideoId(url);
        if (!videoId) {
            error.textContent = 'Neplatná YouTube URL';
            error.classList.add('visible');
            return;
        }
        
        error.classList.remove('visible');
        loading.classList.add('visible');
        videoInfo.classList.remove('visible');
        formatsSection.classList.remove('visible');
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'getDownloadLinks',
                videoId: videoId
            });
            
            loading.classList.remove('visible');
            
            if (!response.success) {
                error.textContent = response.error || 'Chyba';
                error.classList.add('visible');
                return;
            }
            
            thumbnail.src = response.thumbnail;
            videoTitle.textContent = response.title;
            videoInfo.classList.add('visible');
            
            formatsList.innerHTML = '';
            
            const combined = response.formats.filter(f => f.type === 'combined');
            combined.forEach(format => {
                const btn = document.createElement('button');
                btn.className = 'format-btn';
                btn.innerHTML = \`<span>\${format.quality}</span><span>\${formatFileSize(parseInt(format.contentLength))}</span>\`;
                btn.onclick = async () => {
                    btn.textContent = 'Stahuji...';
                    const res = await chrome.runtime.sendMessage({
                        action: 'downloadVideo',
                        url: format.url,
                        filename: response.safeTitle + '_' + format.quality + '.mp4'
                    });
                    btn.textContent = res.success ? '✓ Staženo' : 'Chyba';
                };
                formatsList.appendChild(btn);
            });
            
            formatsSection.classList.add('visible');
            
        } catch (err) {
            loading.classList.remove('visible');
            error.textContent = err.message;
            error.classList.add('visible');
        }
    });
    
    videoUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fetchBtn.click();
    });
})`,

    'page-bridge.js': `(function(){'use strict';const EXTENSION_VERSION='1.1.0';const EXTENSION_ID=chrome.runtime.id;console.log('[AdHUB] Page bridge loaded, Extension ID:',EXTENSION_ID);function signalExtensionActive(){try{localStorage.setItem('adhub_extension_active','true');localStorage.setItem('adhub_extension_timestamp',Date.now().toString());localStorage.setItem('adhub_extension_id',EXTENSION_ID);localStorage.setItem('adhub_extension_version',EXTENSION_VERSION)}catch(e){console.log('[AdHUB] localStorage not available')}try{document.documentElement.setAttribute('data-adhub-extension','true');document.documentElement.setAttribute('data-adhub-extension-id',EXTENSION_ID);document.documentElement.setAttribute('data-adhub-extension-version',EXTENSION_VERSION)}catch(e){console.log('[AdHUB] Could not set data attributes')}}signalExtensionActive();window.addEventListener('adhub-extension-check',()=>{console.log('[AdHUB] Extension check received, responding...');signalExtensionActive();window.dispatchEvent(new CustomEvent('adhub-extension-response',{detail:{extensionId:EXTENSION_ID,version:EXTENSION_VERSION,active:true}}))});function dispatchExtensionReady(){console.log('[AdHUB] Dispatching extension-ready event');window.dispatchEvent(new CustomEvent('adhub-extension-ready',{detail:{extensionId:EXTENSION_ID,version:EXTENSION_VERSION,active:true}}))}dispatchExtensionReady();if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',()=>{signalExtensionActive();dispatchExtensionReady()})}else{dispatchExtensionReady()}setTimeout(()=>{signalExtensionActive();dispatchExtensionReady()},500);setTimeout(()=>{signalExtensionActive();dispatchExtensionReady()},1500);window.addEventListener('message',async(event)=>{if(event.source!==window)return;if(!event.data||event.data.type!=='ADHUB_REQUEST')return;const{id,action,payload}=event.data;console.log('[AdHUB] Bridge received request:',action);try{const response=await chrome.runtime.sendMessage({action:action,...payload});window.postMessage({type:'ADHUB_RESPONSE',id:id,success:true,data:response},'*')}catch(error){console.error('[AdHUB] Bridge error:',error);window.postMessage({type:'ADHUB_RESPONSE',id:id,success:false,error:error.message},'*')}})})();`
};

// Base64 encoded icons (simple colored squares as placeholders)
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6"/>
      <stop offset="100%" style="stop-color:#ec4899"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="20" fill="url(#grad)"/>
  <path d="M64 30 L64 75 M44 55 L64 75 L84 55" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <rect x="35" y="85" width="58" height="8" rx="4" fill="white"/>
</svg>`;

// =========================================
// Stav aplikace
// =========================================

let extensionConnected = false;
let extensionId = null;
let currentVideoInfo = null;
let currentFormats = null;

// DOM Elements
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

// =========================================
// Inicializace
// =========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[AdHUB] 🌟 Page loaded - DOMContentLoaded fired');
    console.log('[AdHUB] 🔍 Checking JSZip at page load...');
    console.log('[AdHUB] JSZip available:', typeof JSZip !== 'undefined');
    console.log('[AdHUB] JSZip version:', typeof JSZip !== 'undefined' && JSZip.version);

    initializeDOMElements();
    loadDownloadsHistory();
    setupEventListeners();

    // Poslouchejme na adhub-extension-ready event (vyslán page-bridge.js)
    window.addEventListener('adhub-extension-ready', (event) => {
        console.log('[AdHUB Page] Received adhub-extension-ready event:', event.detail);
        if (event.detail && event.detail.extensionId) {
            extensionConnected = true;
            extensionId = event.detail.extensionId;
            localStorage.setItem('adhub_extension_id', extensionId);
            updateExtensionStatus(true);
        }
    });

    // Počkáme chvilku na načtení rozšíření a pak zkontrolujeme
    setTimeout(checkExtension, 100);
    setTimeout(checkExtension, 500);
    setTimeout(checkExtension, 1500);

    // Kontrola rozšíření každých 5 sekund
    setInterval(checkExtension, 5000);

    console.log('[AdHUB] 🎉 Initialization complete!');
});

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

// =========================================
// Kontrola rozšíření - vylepšená detekce
// =========================================

async function checkExtension() {
    console.log('[AdHUB Page] Checking extension...');
    
    try {
        // Metoda 1: Kontrola window objektu (nastaven page-bridge.js)
        if (window.adhubExtensionAvailable && window.adhubExtensionId) {
            console.log('[AdHUB Page] Detected via window object');
            extensionConnected = true;
            extensionId = window.adhubExtensionId;
            localStorage.setItem('adhub_extension_id', extensionId);
            updateExtensionStatus(true);
            return;
        }
        
        // Metoda 2: Kontrola data atributu na document (nastaven page-bridge.js)
        const dataAttr = document.documentElement.getAttribute('data-adhub-extension');
        const dataId = document.documentElement.getAttribute('data-adhub-extension-id');
        if (dataAttr === 'true' && dataId) {
            console.log('[AdHUB Page] Detected via data attribute');
            extensionConnected = true;
            extensionId = dataId;
            localStorage.setItem('adhub_extension_id', extensionId);
            updateExtensionStatus(true);
            return;
        }
        
        // Metoda 3: Kontrola localStorage (nastaven page-bridge.js)
        const storedActive = localStorage.getItem('adhub_extension_active');
        const storedId = localStorage.getItem('adhub_extension_id');
        const storedTimestamp = localStorage.getItem('adhub_extension_timestamp');
        
        if (storedActive === 'true' && storedId && storedTimestamp) {
            // Kontrola, zda timestamp není starší než 10 sekund
            const age = Date.now() - parseInt(storedTimestamp);
            if (age < 10000) {
                console.log('[AdHUB Page] Detected via localStorage (fresh)');
                extensionConnected = true;
                extensionId = storedId;
                updateExtensionStatus(true);
                return;
            }
        }
        
        // Metoda 4: Chrome runtime messaging (pokud známe ID)
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage && storedId) {
            try {
                const response = await sendMessageToExtension(storedId, { action: 'ping' });
                if (response && response.success) {
                    console.log('[AdHUB Page] Detected via chrome.runtime.sendMessage');
                    extensionConnected = true;
                    extensionId = storedId;
                    updateExtensionStatus(true);
                    return;
                }
            } catch (e) {
                console.log('[AdHUB Page] chrome.runtime.sendMessage failed:', e.message);
            }
        }
        
        // Metoda 5: Check via custom event
        const detected = await detectExtensionViaEvent();
        if (detected) {
            console.log('[AdHUB Page] Detected via custom event');
            extensionConnected = true;
            updateExtensionStatus(true);
            return;
        }
        
        console.log('[AdHUB Page] Extension not detected');
        extensionConnected = false;
        updateExtensionStatus(false);
        
    } catch (error) {
        console.error('[AdHUB Page] Error checking extension:', error);
        extensionConnected = false;
        updateExtensionStatus(false);
    }
}

function detectExtensionViaEvent() {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.log('[AdHUB Page] Event detection timed out');
            resolve(false);
        }, 1000);
        
        const handler = function(event) {
            clearTimeout(timeout);
            window.removeEventListener('adhub-extension-response', handler);
            window.removeEventListener('adhub-extension-ready', handler);
            if (event.detail && event.detail.extensionId) {
                extensionId = event.detail.extensionId;
                localStorage.setItem('adhub_extension_id', extensionId);
                console.log('[AdHUB Page] Got extension ID from event:', extensionId);
            }
            resolve(true);
        };
        
        window.addEventListener('adhub-extension-response', handler, { once: true });
        window.addEventListener('adhub-extension-ready', handler, { once: true });
        
        window.dispatchEvent(new CustomEvent('adhub-extension-check'));
    });
}

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

// Alternativní způsob komunikace přes window.postMessage
function sendMessageViaBridge(action, payload) {
    return new Promise((resolve, reject) => {
        const id = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const timeout = setTimeout(() => {
            window.removeEventListener('message', handler);
            reject(new Error('Request timed out'));
        }, 30000);
        
        const handler = function(event) {
            if (event.source !== window) return;
            if (!event.data || event.data.type !== 'ADHUB_RESPONSE') return;
            if (event.data.id !== id) return;
            
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            
            if (event.data.success) {
                resolve(event.data.data);
            } else {
                reject(new Error(event.data.error || 'Request failed'));
            }
        };
        
        window.addEventListener('message', handler);
        
        window.postMessage({
            type: 'ADHUB_REQUEST',
            id: id,
            action: action,
            payload: payload
        }, '*');
    });
}

function updateExtensionStatus(connected) {
    if (connected) {
        extensionStatus.className = 'extension-status extension-status-on';
        extensionStatusText.textContent = 'Rozšíření aktivní ✓';
        if (installSection) installSection.style.display = 'none';
        if (downloadSection) downloadSection.style.display = 'block';
    } else {
        extensionStatus.className = 'extension-status extension-status-off';
        extensionStatusText.textContent = 'Rozšíření není nainstalováno';
        if (installSection) installSection.style.display = 'block';
        if (downloadSection) downloadSection.style.display = 'none';
    }
}

// =========================================
// Event listeners
// =========================================

function setupEventListeners() {
    console.log('[AdHUB] 🎧 Setting up event listeners...');

    // Download extension button
    const downloadExtensionBtn = document.getElementById('downloadExtensionBtn');
    console.log('[AdHUB] Download button found:', !!downloadExtensionBtn);
    if (downloadExtensionBtn) {
        downloadExtensionBtn.addEventListener('click', generateAndDownloadExtension);
        console.log('[AdHUB] ✓ Download button listener attached');
    } else {
        console.warn('[AdHUB] ⚠️ Download button NOT found in DOM!');
    }

    // Go to YouTube button
    const goToYoutubeBtn = document.getElementById('goToYoutubeBtn');
    if (goToYoutubeBtn) {
        goToYoutubeBtn.addEventListener('click', () => {
            window.open('https://www.youtube.com', '_blank');
        });
    }

    // Video form
    if (videoForm) {
        videoForm.addEventListener('submit', handleVideoSubmit);
    }

    console.log('[AdHUB] ✓ Event listeners setup complete');
}

// =========================================
// Generate and download extension ZIP
// =========================================

async function generateAndDownloadExtension() {
    console.log('[AdHUB] 🚀 Starting extension download...');

    const btn = document.getElementById('downloadExtensionBtn');
    const progress = document.getElementById('downloadProgress');
    const progressFill = document.getElementById('downloadProgressFill');
    const progressText = document.getElementById('downloadProgressText');

    btn.disabled = true;
    btn.textContent = '⏳ Stahuji...';
    progress.style.display = 'block';
    progressText.textContent = 'Stahuji rozšíření...';
    progressFill.style.width = '50%';

    try {
        // Download pre-built extension from GitHub Pages
        const zipUrl = '/adhub/downloads/youtube-downloader-extension.zip';
        console.log('[AdHUB] 📥 Downloading from:', zipUrl);

        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = 'adhub-youtube-extension.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        console.log('[AdHUB] ✅ Download initiated successfully!');
        progressFill.style.width = '100%';

        showToast('Rozšíření staženo! Rozbalte ZIP a nainstalujte podle návodu.', 'success');

        btn.textContent = '✅ Staženo!';
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = '⬇️ Stáhnout rozšíření (.zip)';
            progress.style.display = 'none';
            progressFill.style.width = '0%';
        }, 2000);

    } catch (error) {
        console.error('[AdHUB] ❌ ERROR downloading extension:', error);
        showToast('Chyba při stahování: ' + error.message, 'error');
        btn.disabled = false;
        btn.textContent = '⬇️ Stáhnout rozšíření (.zip)';
        progress.style.display = 'none';
    }
}

// Generate PNG icons from SVG
async function generateIcons() {
    const sizes = [16, 32, 48, 128];
    const icons = {};
    
    for (const size of sizes) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Draw gradient background
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(1, '#ec4899');
        
        // Rounded rectangle
        const radius = size * 0.15;
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(size - radius, 0);
        ctx.quadraticCurveTo(size, 0, size, radius);
        ctx.lineTo(size, size - radius);
        ctx.quadraticCurveTo(size, size, size - radius, size);
        ctx.lineTo(radius, size);
        ctx.quadraticCurveTo(0, size, 0, size - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw download arrow
        ctx.strokeStyle = 'white';
        ctx.lineWidth = size * 0.08;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const centerX = size / 2;
        const arrowTop = size * 0.25;
        const arrowBottom = size * 0.6;
        const arrowWidth = size * 0.15;
        
        ctx.beginPath();
        ctx.moveTo(centerX, arrowTop);
        ctx.lineTo(centerX, arrowBottom);
        ctx.moveTo(centerX - arrowWidth, arrowBottom - arrowWidth);
        ctx.lineTo(centerX, arrowBottom);
        ctx.lineTo(centerX + arrowWidth, arrowBottom - arrowWidth);
        ctx.stroke();
        
        // Draw bottom line
        ctx.beginPath();
        ctx.moveTo(size * 0.3, size * 0.72);
        ctx.lineTo(size * 0.7, size * 0.72);
        ctx.stroke();
        
        // Get base64
        const dataUrl = canvas.toDataURL('image/png');
        icons[`icon${size}`] = dataUrl.split(',')[1];
    }
    
    return icons;
}

// =========================================
// Video form handling
// =========================================

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
        showToast('Rozšíření není nainstalováno', 'error');
        return;
    }
    
    fetchInfoBtn.disabled = true;
    fetchInfoBtn.textContent = '⏳ Načítání...';
    
    if (videoInfoCard) videoInfoCard.style.display = 'none';
    if (formatsCard) formatsCard.style.display = 'none';
    if (downloadCompleteCard) downloadCompleteCard.style.display = 'none';
    
    try {
        // Zkusíme nejprve přes chrome.runtime, pak přes bridge
        let infoResponse;
        try {
            infoResponse = await sendMessageToExtension(extensionId, {
                action: 'getVideoInfo',
                videoId: videoId,
                url: `https://www.youtube.com/watch?v=${videoId}`
            });
        } catch (e) {
            console.log('[AdHUB Page] chrome.runtime failed, trying bridge:', e.message);
            infoResponse = await sendMessageViaBridge('getVideoInfo', {
                videoId: videoId,
                url: `https://www.youtube.com/watch?v=${videoId}`
            });
        }
        
        if (!infoResponse || !infoResponse.success) {
            throw new Error(infoResponse?.error || 'Nepodařilo se získat informace');
        }
        
        currentVideoInfo = infoResponse;
        displayVideoInfo(infoResponse);
        
        // Získání download linků
        let linksResponse;
        try {
            linksResponse = await sendMessageToExtension(extensionId, {
                action: 'getDownloadLinks',
                videoId: videoId,
                url: `https://www.youtube.com/watch?v=${videoId}`
            });
        } catch (e) {
            console.log('[AdHUB Page] chrome.runtime failed for links, trying bridge:', e.message);
            linksResponse = await sendMessageViaBridge('getDownloadLinks', {
                videoId: videoId,
                url: `https://www.youtube.com/watch?v=${videoId}`
            });
        }
        
        if (!linksResponse || !linksResponse.success) {
            throw new Error(linksResponse?.error || 'Nepodařilo se získat download linky');
        }
        
        currentFormats = linksResponse;
        displayFormats(linksResponse);
        
    } catch (error) {
        showToast(`Chyba: ${error.message}`, 'error');
    } finally {
        fetchInfoBtn.disabled = false;
        fetchInfoBtn.textContent = '📋 Získat informace';
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

function displayVideoInfo(info) {
    if (!videoTitle || !videoThumbnail) return;
    
    videoTitle.textContent = info.title || 'Neznámý název';
    videoThumbnail.src = info.thumbnail || info.thumbnailMq || '';
    
    if (videoUploader) videoUploader.textContent = `📺 ${info.author || 'Neznámý'}`;
    
    if (videoDuration && info.duration) {
        const minutes = Math.floor(info.duration / 60);
        const seconds = Math.floor(info.duration % 60);
        videoDuration.textContent = `⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    if (videoViews && info.viewCount) {
        videoViews.textContent = `👁️ ${info.viewCount.toLocaleString('cs-CZ')} zhlédnutí`;
    }
    
    if (videoInfoCard) videoInfoCard.style.display = 'block';
}

function displayFormats(data) {
    if (!combinedFormatsList || !videoFormatsList || !audioFormatsList) return;
    
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
    
    const combined = data.formats.filter(f => f.type === 'combined');
    if (combined.length > 0 && combinedFormatsSection) {
        combinedFormatsSection.style.display = 'block';
        combined.forEach(format => {
            combinedFormatsList.appendChild(createFormatItem(format, data.safeTitle));
        });
    }
    
    const videoOnly = data.formats.filter(f => f.type === 'video').slice(0, 5);
    if (videoOnly.length > 0 && videoFormatsSection) {
        videoFormatsSection.style.display = 'block';
        videoOnly.forEach(format => {
            videoFormatsList.appendChild(createFormatItem(format, data.safeTitle));
        });
    }
    
    const audioOnly = data.formats.filter(f => f.type === 'audio').slice(0, 4);
    if (audioOnly.length > 0 && audioFormatsSection) {
        audioFormatsSection.style.display = 'block';
        audioOnly.forEach(format => {
            audioFormatsList.appendChild(createFormatItem(format, data.safeTitle));
        });
    }
    
    if (formatsCard) formatsCard.style.display = 'block';
}

function createFormatItem(format, title) {
    const div = document.createElement('div');
    div.className = 'format-item';
    
    let quality = format.quality || 'Unknown';
    if (format.type === 'audio' && format.bitrate) {
        quality = Math.round(format.bitrate / 1000) + ' kbps';
    }
    
    const size = format.contentLength ? formatFileSize(parseInt(format.contentLength)) : 'N/A';
    const ext = format.mimeType?.includes('webm') ? 'webm' : (format.type === 'audio' ? 'm4a' : 'mp4');
    const codec = format.codec || 'unknown';
    
    div.innerHTML = `
        <div class="format-info">
            <span class="format-quality">${quality}</span>
            <span class="format-details">${codec} • ${size}</span>
        </div>
        <button class="btn btn-download-format">📥 Stáhnout</button>
    `;
    
    const downloadBtn = div.querySelector('.btn-download-format');
    downloadBtn.addEventListener('click', () => handleFormatDownload(downloadBtn, format.url, `${title}_${quality}.${ext}`));
    
    return div;
}

async function handleFormatDownload(button, url, filename) {
    button.disabled = true;
    button.textContent = '⏳ Stahuji...';
    
    try {
        let response;
        try {
            response = await sendMessageToExtension(extensionId, {
                action: 'downloadVideo',
                url: url,
                filename: filename
            });
        } catch (e) {
            console.log('[AdHUB Page] chrome.runtime failed for download, trying bridge:', e.message);
            response = await sendMessageViaBridge('downloadVideo', {
                url: url,
                filename: filename
            });
        }
        
        if (response && response.success) {
            button.textContent = '✅ Staženo';
            button.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';

            // Store videoId in history for click-to-reload functionality
            addToDownloadsHistory({
                filename: filename,
                date: new Date().toISOString(),
                videoId: currentVideoInfo?.videoId || currentFormats?.videoId || null
            });

            if (downloadFilename) downloadFilename.textContent = filename;
            if (downloadCompleteCard) downloadCompleteCard.style.display = 'block';

            showToast(`Stahování zahájeno: ${filename}`, 'success');
        } else {
            throw new Error(response?.error || 'Stahování selhalo');
        }
    } catch (error) {
        button.textContent = '❌ Chyba';
        button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        showToast(`Chyba: ${error.message}`, 'error');
    }
    
    setTimeout(() => {
        button.disabled = false;
        button.textContent = '📥 Stáhnout';
        button.style.background = '';
    }, 3000);
}

// =========================================
// Utility functions
// =========================================

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return 'N/A';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
}

function loadDownloadsHistory() {
    if (!downloadsList) return;

    let history = JSON.parse(localStorage.getItem('adhub_downloads_history') || '[]');

    // Auto-delete items older than 48 hours
    const now = Date.now();
    const maxAge = 48 * 60 * 60 * 1000; // 48 hours in milliseconds
    const originalLength = history.length;

    history = history.filter(item => {
        const itemAge = now - new Date(item.date).getTime();
        return itemAge < maxAge;
    });

    // Update localStorage if items were deleted
    if (history.length !== originalLength) {
        localStorage.setItem('adhub_downloads_history', JSON.stringify(history));
        console.log('[AdHUB] Cleaned up', originalLength - history.length, 'old history items (>48h)');
    }

    if (history.length === 0) {
        downloadsList.innerHTML = '<p class="empty-state-text">Zatím žádné stažené soubory</p>';
        return;
    }

    downloadsList.innerHTML = '';
    history.slice(0, 10).forEach(item => {
        const div = document.createElement('div');
        div.className = 'download-item';
        div.style.cursor = 'pointer';
        div.title = 'Klikněte pro opětovné načtení videa';

        const date = new Date(item.date);
        const dateStr = date.toLocaleDateString('cs-CZ') + ' ' + date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

        // Calculate time remaining until auto-delete
        const itemAge = now - date.getTime();
        const timeRemaining = maxAge - itemAge;
        const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));

        let icon = '📄';
        const ext = item.filename.toLowerCase().split('.').pop();
        if (ext === 'mp4' || ext === 'webm') icon = '📹';
        else if (ext === 'mp3' || ext === 'm4a') icon = '🎵';

        div.innerHTML = `
            <div class="download-item-info">
                <div class="filename">${icon} ${item.filename}</div>
                <div class="file-date">${dateStr} <span class="time-remaining">(${hoursRemaining}h zbývá)</span></div>
            </div>
        `;

        // Add click handler to reload the video
        if (item.videoId) {
            div.addEventListener('click', () => {
                console.log('[AdHUB] Reloading video from history:', item.videoId);
                if (videoUrlInput) {
                    videoUrlInput.value = item.videoId;
                    // Scroll to top
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    // Trigger form submission
                    if (videoForm) {
                        videoForm.dispatchEvent(new Event('submit'));
                    }
                    showToast(`Načítám video: ${item.filename}`, 'info');
                }
            });

            // Add hover effect
            div.addEventListener('mouseenter', () => {
                div.style.background = 'rgba(139, 92, 246, 0.15)';
            });
            div.addEventListener('mouseleave', () => {
                div.style.background = '';
            });
        }

        downloadsList.appendChild(div);
    });
}

function addToDownloadsHistory(item) {
    const history = JSON.parse(localStorage.getItem('adhub_downloads_history') || '[]');
    history.unshift(item);
    if (history.length > 20) history.pop();
    localStorage.setItem('adhub_downloads_history', JSON.stringify(history));
    loadDownloadsHistory();
}

function showToast(message, type = 'info') {
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Global function for copying to clipboard
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Zkopírováno do schránky!', 'success');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Zkopírováno do schránky!', 'success');
    });
};
