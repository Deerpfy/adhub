// AdHUB - Page Bridge Injector
// Načte aktuální page-bridge.js ze storage a spustí ho

(async function() {
    console.log('[AdHUB Bridge Injector] Loading page-bridge script from storage...');

    try {
        // Načti page-bridge.js ze storage
        const result = await chrome.storage.local.get(['page-bridge.js']);

        if (!result['page-bridge.js']) {
            console.error('[AdHUB Bridge Injector] ❌ page-bridge.js not found in storage');
            return;
        }

        const scriptData = result['page-bridge.js'];
        console.log('[AdHUB Bridge Injector] ✅ Loaded page-bridge.js from storage:', scriptData.size, 'bytes');

        // Vytvoř a spusť script pomocí Blob URL (aby se vyhnuli CSP omezením)
        const blob = new Blob([scriptData.content], { type: 'text/javascript' });
        const blobUrl = URL.createObjectURL(blob);

        const scriptElement = document.createElement('script');
        scriptElement.src = blobUrl;
        scriptElement.onload = () => {
            console.log('[AdHUB Bridge Injector] ✅ Page bridge injected successfully');
            URL.revokeObjectURL(blobUrl); // Uvolni blob URL po načtení
        };
        scriptElement.onerror = (error) => {
            console.error('[AdHUB Bridge Injector] ❌ Error loading script:', error);
            URL.revokeObjectURL(blobUrl);
        };

        (document.head || document.documentElement).appendChild(scriptElement);

    } catch (error) {
        console.error('[AdHUB Bridge Injector] ❌ Error injecting page bridge:', error);
    }
})();
