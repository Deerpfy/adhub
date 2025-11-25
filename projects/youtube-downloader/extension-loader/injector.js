// AdHUB - Content Script Injector for YouTube
// Načte aktuální content.js ze storage a spustí ho

(async function() {
    console.log('[AdHUB Injector] Loading content script from storage...');

    try {
        // Načti content.js ze storage
        const result = await chrome.storage.local.get(['content.js']);

        if (!result['content.js']) {
            console.error('[AdHUB Injector] ❌ content.js not found in storage');
            return;
        }

        const scriptData = result['content.js'];
        console.log('[AdHUB Injector] ✅ Loaded content.js from storage:', scriptData.size, 'bytes');
        console.log('[AdHUB Injector] Last update:', new Date(scriptData.timestamp).toLocaleString());

        // Vytvoř a spusť inline script (obchází CSP omezení pro blob: URL)
        const scriptElement = document.createElement('script');
        scriptElement.textContent = scriptData.content;

        (document.head || document.documentElement).appendChild(scriptElement);
        console.log('[AdHUB Injector] ✅ Content script injected successfully');

    } catch (error) {
        console.error('[AdHUB Injector] ❌ Error injecting content script:', error);
    }
})();
