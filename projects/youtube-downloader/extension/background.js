// AdHUB YouTube Downloader - Background Service Worker

// Stav rozšíření
let extensionState = {
    isActive: true,
    lastVideoInfo: null,
    downloadQueue: []
};

// Zprávy z content scriptu nebo webové stránky
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[AdHUB] Received message:', request.action);
    
    switch (request.action) {
        case 'ping':
            sendResponse({ success: true, message: 'AdHUB Extension is active', version: '1.1.0' });
            break;
            
        case 'getVideoInfo':
            handleGetVideoInfo(request.videoId, request.url).then(sendResponse);
            return true; // Async response
            
        case 'downloadVideo':
            handleDownload(request.url, request.format, request.quality, request.filename).then(sendResponse);
            return true; // Async response
            
        case 'getDownloadLinks':
            handleGetDownloadLinks(request.videoId, request.url).then(sendResponse);
            return true; // Async response
            
        case 'checkStatus':
            sendResponse({ 
                success: true, 
                isActive: extensionState.isActive,
                version: '1.1.0'
            });
            break;
            
        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }
    
    return false;
});

// Zprávy z externích webových stránek (GitHub Pages)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    console.log('[AdHUB] External message from:', sender.origin, 'Action:', request.action);
    
    // Ověření originu
    const allowedOrigins = [
        'https://github.io',
        'http://localhost',
        'http://127.0.0.1',
        'file://'
    ];
    
    const isAllowed = allowedOrigins.some(origin => 
        sender.origin?.startsWith(origin) || sender.url?.startsWith(origin)
    );
    
    if (!isAllowed && sender.origin) {
        console.log('[AdHUB] Origin not allowed:', sender.origin);
        // Povolit všechny originy pro snadnější použití
    }
    
    switch (request.action) {
        case 'ping':
            sendResponse({ success: true, message: 'AdHUB Extension is active', version: '1.1.0' });
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
            
        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }
    
    return false;
});

// Získání informací o videu
async function handleGetVideoInfo(videoId, url) {
    try {
        // Metoda 1: Použijeme oEmbed API (základní info)
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const oembedResponse = await fetch(oembedUrl);
        
        if (!oembedResponse.ok) {
            throw new Error('Nepodařilo se získat info z oEmbed');
        }
        
        const oembedData = await oembedResponse.json();
        
        // Metoda 2: Pokusíme se získat více dat z YouTube stránky
        let additionalInfo = {};
        try {
            const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
            const pageText = await pageResponse.text();
            
            // Parsování ytInitialPlayerResponse
            const playerResponseMatch = pageText.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
            if (playerResponseMatch) {
                const playerResponse = JSON.parse(playerResponseMatch[1]);
                
                const videoDetails = playerResponse.videoDetails || {};
                const microformat = playerResponse.microformat?.playerMicroformatRenderer || {};
                
                additionalInfo = {
                    duration: parseInt(videoDetails.lengthSeconds) || 0,
                    viewCount: parseInt(videoDetails.viewCount) || 0,
                    description: videoDetails.shortDescription || '',
                    channelId: videoDetails.channelId || '',
                    isLive: videoDetails.isLiveContent || false,
                    publishDate: microformat.publishDate || ''
                };
            }
        } catch (e) {
            console.log('[AdHUB] Could not get additional info:', e.message);
        }
        
        const result = {
            success: true,
            videoId: videoId,
            title: oembedData.title,
            author: oembedData.author_name,
            authorUrl: oembedData.author_url,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
            thumbnailMq: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
            duration: additionalInfo.duration || 0,
            viewCount: additionalInfo.viewCount || 0,
            description: additionalInfo.description || '',
            isLive: additionalInfo.isLive || false
        };
        
        extensionState.lastVideoInfo = result;
        return result;
        
    } catch (error) {
        console.error('[AdHUB] Error getting video info:', error);
        return { success: false, error: error.message };
    }
}

// Získání download linků
async function handleGetDownloadLinks(videoId, url) {
    try {
        // Získáme stránku YouTube
        const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const pageText = await pageResponse.text();
        
        // Parsování ytInitialPlayerResponse
        const playerResponseMatch = pageText.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
        if (!playerResponseMatch) {
            throw new Error('Nepodařilo se najít video data');
        }
        
        const playerResponse = JSON.parse(playerResponseMatch[1]);
        
        // Kontrola, zda video je přehratelné
        const playabilityStatus = playerResponse.playabilityStatus;
        if (playabilityStatus?.status !== 'OK') {
            throw new Error(playabilityStatus?.reason || 'Video není dostupné');
        }
        
        // Získání formátů
        const streamingData = playerResponse.streamingData;
        if (!streamingData) {
            throw new Error('Nejsou dostupné žádné streamy');
        }
        
        const formats = [];
        
        // Adaptivní formáty (oddělené audio/video)
        if (streamingData.adaptiveFormats) {
            for (const format of streamingData.adaptiveFormats) {
                const downloadUrl = format.url || await decipherUrl(format.signatureCipher);
                if (downloadUrl) {
                    formats.push({
                        itag: format.itag,
                        url: downloadUrl,
                        mimeType: format.mimeType,
                        quality: format.qualityLabel || format.audioQuality || 'unknown',
                        contentLength: format.contentLength,
                        bitrate: format.bitrate,
                        width: format.width,
                        height: format.height,
                        type: format.mimeType?.includes('audio') ? 'audio' : 'video',
                        codec: extractCodec(format.mimeType)
                    });
                }
            }
        }
        
        // Kombinované formáty (video + audio)
        if (streamingData.formats) {
            for (const format of streamingData.formats) {
                const downloadUrl = format.url || await decipherUrl(format.signatureCipher);
                if (downloadUrl) {
                    formats.push({
                        itag: format.itag,
                        url: downloadUrl,
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
                    });
                }
            }
        }
        
        // Seřazení formátů podle kvality
        formats.sort((a, b) => {
            if (a.type === 'combined' && b.type !== 'combined') return -1;
            if (a.type !== 'combined' && b.type === 'combined') return 1;
            return (b.height || 0) - (a.height || 0);
        });
        
        // Získání názvu videa
        const title = playerResponse.videoDetails?.title || 'video';
        const safeTitle = title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);
        
        return {
            success: true,
            videoId: videoId,
            title: title,
            safeTitle: safeTitle,
            formats: formats,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
        };
        
    } catch (error) {
        console.error('[AdHUB] Error getting download links:', error);
        return { success: false, error: error.message };
    }
}

// Extrakce kodeku z MIME typu
function extractCodec(mimeType) {
    if (!mimeType) return 'unknown';
    const codecMatch = mimeType.match(/codecs="([^"]+)"/);
    return codecMatch ? codecMatch[1] : mimeType.split('/')[1]?.split(';')[0] || 'unknown';
}

// Dešifrování URL (pro některá videa)
async function decipherUrl(signatureCipher) {
    if (!signatureCipher) return null;
    
    // Parse signature cipher
    const params = new URLSearchParams(signatureCipher);
    const url = params.get('url');
    const sig = params.get('s');
    const sp = params.get('sp') || 'signature';
    
    if (!url) return null;
    
    // Pro zašifrované URL bychom potřebovali JavaScript decipher funkci z YouTube
    // Toto je komplexní a vyžaduje dynamické stahování a parsování JS souboru
    // Pro jednoduchost vrátíme null pro šifrované URL
    console.log('[AdHUB] Encrypted URL detected, skipping...');
    return null;
}

// Stahování souboru
async function handleDownload(url, format, quality, filename) {
    try {
        console.log('[AdHUB] Starting download:', { format, quality, filename, url: url?.substring(0, 100) });
        
        // Určení správné přípony souboru
        let finalFilename = filename;
        if (!finalFilename) {
            // Pokud není filename, zkusíme ho odvodit z URL nebo formátu
            let ext = format || 'mp4';
            if (url) {
                if (url.includes('mime=audio') || url.includes('audio/')) {
                    ext = url.includes('webm') ? 'webm' : 'm4a';
                } else if (url.includes('mime=video') || url.includes('video/')) {
                    ext = url.includes('webm') ? 'webm' : 'mp4';
                }
            }
            finalFilename = `video_${Date.now()}.${ext}`;
        }
        
        // Zkontrolujeme, že filename má správnou příponu
        if (finalFilename && !finalFilename.match(/\.(mp4|webm|m4a|mp3|mkv|avi|mov)$/i)) {
            // Přidáme příponu podle URL
            if (url) {
                if (url.includes('mime=audio') || url.includes('audio/')) {
                    finalFilename += url.includes('webm') ? '.webm' : '.m4a';
                } else {
                    finalFilename += url.includes('webm') ? '.webm' : '.mp4';
                }
            } else {
                finalFilename += '.mp4';
            }
        }
        
        console.log('[AdHUB] Final filename:', finalFilename);
        
        // Použijeme Chrome Downloads API
        const downloadId = await chrome.downloads.download({
            url: url,
            filename: finalFilename,
            saveAs: true
        });
        
        return { success: true, downloadId: downloadId };
        
    } catch (error) {
        console.error('[AdHUB] Download error:', error);
        return { success: false, error: error.message };
    }
}

// Sledování stahování
chrome.downloads.onChanged.addListener((delta) => {
    if (delta.state) {
        console.log('[AdHUB] Download state changed:', delta.id, delta.state.current);
        
        if (delta.state.current === 'complete') {
            // Stahování dokončeno
            chrome.runtime.sendMessage({
                action: 'downloadComplete',
                downloadId: delta.id
            }).catch(() => {});
        } else if (delta.state.current === 'interrupted') {
            // Stahování přerušeno
            chrome.runtime.sendMessage({
                action: 'downloadError',
                downloadId: delta.id,
                error: delta.error?.current || 'Download interrupted'
            }).catch(() => {});
        }
    }
});

// Inicializace
console.log('[AdHUB] YouTube Downloader Extension loaded');
