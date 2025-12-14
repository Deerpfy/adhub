/**
 * CardHarvest - Content Script
 * Bridge mezi webovou stránkou a Background Service Worker
 */

console.log('[SteamFarm Content] Script loaded on:', window.location.href);

// Forward messages from web page to background
window.addEventListener('message', async (event) => {
    // Only accept messages from our page
    if (event.source !== window) return;
    if (event.data?.source !== 'cardharvest-web') return;

    console.log('[SteamFarm Content] Web -> Extension:', event.data.type);

    try {
        // Send to background and get response
        const response = await chrome.runtime.sendMessage(event.data);
        console.log('[SteamFarm Content] Background response:', response);

        // Forward response back to web (even if null, send acknowledgement)
        if (response) {
            window.postMessage(response, '*');
        }
    } catch (error) {
        console.error('[SteamFarm Content] Error:', error);
        window.postMessage({
            type: 'STEAM_FARM_ERROR',
            source: 'cardharvest-extension',
            error: error.message
        }, '*');
    }
});

// Forward messages from background to web page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.source !== 'cardharvest-extension') return;

    console.log('[SteamFarm Content] Extension -> Web:', message.type);
    window.postMessage(message, '*');
});

// Notify web that content script is ready (with small delay to ensure page is ready to receive)
setTimeout(() => {
    console.log('[SteamFarm Content] Sending CONTENT_READY');
    window.postMessage({
        type: 'STEAM_FARM_CONTENT_READY',
        source: 'cardharvest-extension'
    }, '*');
}, 100);
