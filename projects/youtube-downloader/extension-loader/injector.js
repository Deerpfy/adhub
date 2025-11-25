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

        // Vytvoř a spusť script pomocí Blob URL (aby se vyhnuli CSP omezením)
        const blob = new Blob([scriptData.content], { type: 'text/javascript' });
        const blobUrl = URL.createObjectURL(blob);

        const scriptElement = document.createElement('script');
        scriptElement.src = blobUrl;
        scriptElement.onload = () => {
            console.log('[AdHUB Injector] ✅ Content script injected successfully');
            URL.revokeObjectURL(blobUrl); // Uvolni blob URL po načtení
        };
        scriptElement.onerror = (error) => {
            console.error('[AdHUB Injector] ❌ Error loading script:', error);
            URL.revokeObjectURL(blobUrl);
        };

        (document.head || document.documentElement).appendChild(scriptElement);

    } catch (error) {
        console.error('[AdHUB Injector] ❌ Error injecting content script:', error);
    }
})();
