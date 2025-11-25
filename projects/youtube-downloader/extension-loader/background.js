// AdHUB YouTube Downloader - Auto-Update Loader
// Automaticky načítá aktuální kód z GitHubu

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/Deerpfy/adhub/main/projects/youtube-downloader/extension';
const CHECK_UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hodina

console.log('[AdHUB Loader] Service worker started');

// Soubory ke stažení z GitHubu
const REMOTE_FILES = {
    'content.js': `${GITHUB_RAW_BASE}/content.js`,
    'page-bridge.js': `${GITHUB_RAW_BASE}/page-bridge.js`,
    'popup.js': `${GITHUB_RAW_BASE}/popup.js`,
    'popup.html': `${GITHUB_RAW_BASE}/popup.html`
};

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

// Zpracování zpráv
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[AdHUB Loader] Message received:', message.action);

    if (message.action === 'getVideoInfo') {
        handleGetVideoInfo(message.videoId).then(sendResponse);
        return true; // Asynchronní odpověď
    }

    if (message.action === 'downloadVideo') {
        handleDownload(message.url, message.filename).then(sendResponse);
        return true;
    }

    if (message.action === 'checkUpdate') {
        updateScripts().then(result => {
            sendResponse({ success: result });
        });
        return true;
    }

    if (message.action === 'getUpdateInfo') {
        chrome.storage.local.get(['lastUpdate']).then(result => {
            sendResponse({
                lastUpdate: result.lastUpdate,
                nextCheck: result.lastUpdate + CHECK_UPDATE_INTERVAL
            });
        });
        return true;
    }
});

// Zpracování info o videu
async function handleGetVideoInfo(videoId) {
    try {
        // YouTube API endpoint (veřejný, bez klíče)
        const url = `https://www.youtube.com/watch?v=${videoId}`;

        return {
            success: true,
            videoId: videoId,
            url: url,
            message: 'Video info ready'
        };
    } catch (error) {
        console.error('[AdHUB Loader] Error getting video info:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Zpracování stahování
async function handleDownload(url, filename) {
    try {
        console.log('[AdHUB Loader] Starting download:', filename);

        const downloadId = await chrome.downloads.download({
            url: url,
            filename: filename,
            saveAs: false
        });

        return {
            success: true,
            downloadId: downloadId
        };
    } catch (error) {
        console.error('[AdHUB Loader] Download error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

console.log('[AdHUB Loader] ✅ Background script initialized');
