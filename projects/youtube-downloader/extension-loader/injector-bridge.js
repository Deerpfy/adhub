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

        // Vytvoř a spusť script
        const scriptElement = document.createElement('script');
        scriptElement.textContent = scriptData.content;
        (document.head || document.documentElement).appendChild(scriptElement);

        console.log('[AdHUB Bridge Injector] ✅ Page bridge injected successfully');

    } catch (error) {
        console.error('[AdHUB Bridge Injector] ❌ Error injecting page bridge:', error);
    }
})();
