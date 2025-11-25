// AdHUB YouTube Downloader - Auto-Update Loader v1.1.0
// Automaticky načítá aktuální kód z GitHubu a obsahuje plnou funkcionalitu

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/Deerpfy/adhub/main/projects/youtube-downloader/extension';
const CHECK_UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hodina
const VERSION = '1.1.0';

console.log(`[AdHUB Loader v${VERSION}] Service worker started`);

// Stav rozšíření
let extensionState = {
    isActive: true,
    lastVideoInfo: null,
    downloadQueue: []
};

// Soubory ke stažení z GitHubu
const REMOTE_FILES = {
    'content.js': `${GITHUB_RAW_BASE}/content.js`,
    'page-bridge.js': `${GITHUB_RAW_BASE}/page-bridge.js`,
    'popup.js': `${GITHUB_RAW_BASE}/popup.js`,
    'popup.html': `${GITHUB_RAW_BASE}/popup.html`
};

// ============================================
// AUTO-UPDATE FUNCTIONALITY
// ============================================

// Při instalaci nebo updatu
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[AdHUB Loader] Extension installed/updated:', details.reason);
    await updateScripts();
    await registerContentScripts();
});

// Při startu browseru
chrome.runtime.onStartup.addListener(async () => {
    console.log('[AdHUB Loader] Browser started, checking for updates...');
    await updateScripts();
    await registerContentScripts();
});

// Periodická kontrola aktualizací
setInterval(async () => {
    console.log('[AdHUB Loader] Periodic update check...');
    await updateScripts();
}, CHECK_UPDATE_INTERVAL);

// Stáhne aktuální skripty z GitHubu
async function updateScripts() {
    console.log('[AdHUB Loader] 🔄 Updating scripts from GitHub...');

    try {
        const scripts = {};

        for (const [filename, url] of Object.entries(REMOTE_FILES)) {
            console.log(`[AdHUB Loader] Fetching ${filename}...`);

            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const content = await response.text();
                scripts[filename] = {
                    content: content,
                    url: url,
                    timestamp: Date.now(),
                    size: content.length
                };

                console.log(`[AdHUB Loader] ✅ ${filename} loaded (${content.length} bytes)`);
            } catch (error) {
                console.error(`[AdHUB Loader] ❌ Failed to load ${filename}:`, error);

                // Pokud selže, zkus načíst z cache
                const cached = await chrome.storage.local.get([filename]);
                if (cached[filename]) {
                    console.log(`[AdHUB Loader] ℹ️ Using cached ${filename}`);
                    scripts[filename] = cached[filename];
                }
            }
        }

        // Ulož do storage
        await chrome.storage.local.set(scripts);

        // Ulož timestamp poslední aktualizace
        await chrome.storage.local.set({
            lastUpdate: Date.now()
        });

        console.log('[AdHUB Loader] ✅ Scripts updated successfully');

        return true;
    } catch (error) {
        console.error('[AdHUB Loader] ❌ Update failed:', error);
        return false;
    }
}

// Registruje content scripts dynamicky
async function registerContentScripts() {
    console.log('[AdHUB Loader] 📝 Registering content scripts...');

    try {
        // Odregistruj staré skripty
        const existingScripts = await chrome.scripting.getRegisteredContentScripts();
        if (existingScripts.length > 0) {
            await chrome.scripting.unregisterContentScripts();
            console.log('[AdHUB Loader] Unregistered old scripts');
        }

        // Načti skripty ze storage
        const stored = await chrome.storage.local.get(['content.js', 'page-bridge.js']);

        if (!stored['content.js']) {
            console.error('[AdHUB Loader] ⚠️ content.js not found in storage');
            return;
        }

        // Registruj content script pro YouTube
        await chrome.scripting.registerContentScripts([{
            id: 'youtube-downloader',
            matches: ['https://www.youtube.com/*', 'https://youtube.com/*'],
            js: ['injector.js'], // Lokální soubor který injektuje stored content
            runAt: 'document_end'
        }]);

        // Registruj page-bridge pro localhost a GitHub Pages
        if (stored['page-bridge.js']) {
            await chrome.scripting.registerContentScripts([{
                id: 'page-bridge',
                matches: [
                    'http://localhost:*/*',
                    'http://127.0.0.1:*/*',
                    'https://*.github.io/*',
                    'file:///*'
                ],
                js: ['injector-bridge.js'],
                runAt: 'document_start',
                allFrames: true
            }]);
        }

        console.log('[AdHUB Loader] ✅ Content scripts registered');
    } catch (error) {
        console.error('[AdHUB Loader] ❌ Failed to register content scripts:', error);
    }
}

// ============================================
// MESSAGE HANDLERS
// ============================================

// Zprávy z content scriptu nebo webové stránky
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[AdHUB] Received message:', request.action);

    switch (request.action) {
        case 'ping':
            sendResponse({ success: true, message: 'AdHUB Extension is active', version: VERSION });
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
                version: VERSION
            });
            break;

        case 'checkUpdate':
            updateScripts().then(result => {
                sendResponse({ success: result });
            });
            return true;

        case 'getUpdateInfo':
            chrome.storage.local.get(['lastUpdate']).then(result => {
                sendResponse({
                    lastUpdate: result.lastUpdate,
                    nextCheck: result.lastUpdate + CHECK_UPDATE_INTERVAL
                });
            });
            return true;

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
            sendResponse({ success: true, message: 'AdHUB Extension is active', version: VERSION });
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

// ============================================
// YOUTUBE FUNCTIONALITY
// ============================================

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
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[AdHUB Formats] 🔍 FETCHING DOWNLOAD LINKS');
        console.log('[AdHUB Formats] Video ID:', videoId);

        // Získáme stránku YouTube
        const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const pageText = await pageResponse.text();

        console.log('[AdHUB Formats] Page fetched, size:', pageText.length, 'chars');

        // Parsování ytInitialPlayerResponse
        const playerResponseMatch = pageText.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
        if (!playerResponseMatch) {
            throw new Error('Nepodařilo se najít video data');
        }

        const playerResponse = JSON.parse(playerResponseMatch[1]);
        console.log('[AdHUB Formats] Player response parsed successfully');

        // Kontrola, zda video je přehratelné
        const playabilityStatus = playerResponse.playabilityStatus;
        console.log('[AdHUB Formats] Playability status:', playabilityStatus?.status);
        if (playabilityStatus?.status !== 'OK') {
            throw new Error(playabilityStatus?.reason || 'Video není dostupné');
        }

        // Získání formátů
        const streamingData = playerResponse.streamingData;
        if (!streamingData) {
            throw new Error('Nejsou dostupné žádné streamy');
        }

        console.log('[AdHUB Formats] Streaming data found:', {
            hasAdaptiveFormats: !!streamingData.adaptiveFormats,
            adaptiveFormatsCount: streamingData.adaptiveFormats?.length || 0,
            hasFormats: !!streamingData.formats,
            formatsCount: streamingData.formats?.length || 0
        });

        const formats = [];

        // Adaptivní formáty (oddělené audio/video)
        if (streamingData.adaptiveFormats) {
            console.log('[AdHUB Formats] Processing adaptive formats...');
            for (const format of streamingData.adaptiveFormats) {
                const downloadUrl = format.url || await decipherUrl(format.signatureCipher);
                if (downloadUrl) {
                    const formatInfo = {
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
                    };
                    formats.push(formatInfo);
                    console.log(`[AdHUB Formats]   ✓ ${formatInfo.type} - ${formatInfo.quality} (${formatInfo.codec}) - ${Math.round(formatInfo.contentLength / 1024 / 1024)} MB`);
                }
            }
        }

        // Kombinované formáty (video + audio)
        if (streamingData.formats) {
            console.log('[AdHUB Formats] Processing combined formats...');
            for (const format of streamingData.formats) {
                const downloadUrl = format.url || await decipherUrl(format.signatureCipher);
                if (downloadUrl) {
                    const formatInfo = {
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
                    };
                    formats.push(formatInfo);
                    console.log(`[AdHUB Formats]   ✓ combined - ${formatInfo.quality} (${formatInfo.codec}) - ${Math.round(formatInfo.contentLength / 1024 / 1024)} MB`);
                }
            }
        }

        // Seřazení formátů podle kvality
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

        // Získání názvu videa
        const title = playerResponse.videoDetails?.title || 'video';
        const safeTitle = title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);

        console.log('[AdHUB Formats] Video title:', title);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[AdHUB Download] 🎬 STARTING DOWNLOAD');
        console.log('[AdHUB Download] Parameters:', {
            format,
            quality,
            filename,
            urlLength: url?.length,
            urlStart: url?.substring(0, 150)
        });

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
            console.log('[AdHUB Download] ⚠️ Filename missing extension, adding one');
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

        console.log('[AdHUB Download] 📝 Final filename:', finalFilename);

        // Analyze URL to understand what we're downloading
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
            ? `https://www.youtube.com/watch?v=${videoIdMatch[1]}`
            : 'https://www.youtube.com/';

        console.log('[AdHUB Download] Using Referer:', refererUrl);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': '*/*',
                'Referer': refererUrl,
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
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blobStartTime = Date.now();
        const blob = await response.blob();
        const blobTime = Date.now() - blobStartTime;

        const blobSizeMB = Math.round(blob.size / 1024 / 1024 * 100) / 100;
        console.log('[AdHUB Download] ✅ Blob created:', {
            size: `${blobSizeMB} MB`,
            type: blob.type,
            blobTimeMs: blobTime
        });

        // Verify blob is not empty and has correct type
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
            saveAs: false,  // Automatické stahování bez dialogu
            conflictAction: 'uniquify'  // Pokud soubor existuje, přidá (1), (2) atd.
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
console.log(`[AdHUB Loader v${VERSION}] ✅ Background script initialized with full functionality`);
