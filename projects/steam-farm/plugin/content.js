/**
 * Steam Farm - Content Script
 * Bridge mezi webovou stránkou a Background Service Worker
 */

console.log('[SteamFarm Content] Loaded');

// Forward messages from web page to background
window.addEventListener('message', async (event) => {
    // Only accept messages from our page
    if (event.source !== window) return;
    if (event.data?.source !== 'steam-farm-web') return;

    console.log('[SteamFarm Content] Web -> Extension:', event.data.type);

    try {
        // Send to background and get response
        const response = await chrome.runtime.sendMessage(event.data);

        // If response contains data, forward back to web
        if (response) {
            window.postMessage(response, '*');
        }
    } catch (error) {
        console.error('[SteamFarm Content] Error:', error);
        window.postMessage({
            type: 'STEAM_FARM_ERROR',
            source: 'steam-farm-extension',
            error: error.message
        }, '*');
    }
});

// Forward messages from background to web page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.source !== 'steam-farm-extension') return;

    console.log('[SteamFarm Content] Extension -> Web:', message.type);
    window.postMessage(message, '*');
});

// Notify web that content script is ready
window.postMessage({
    type: 'STEAM_FARM_CONTENT_READY',
    source: 'steam-farm-extension'
}, '*');
