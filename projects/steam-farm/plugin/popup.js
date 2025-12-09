/**
 * Steam Farm - Popup Script
 */

const NATIVE_HOST_NAME = 'com.adhub.steamfarm';

// Elements
const nativeHostDot = document.getElementById('nativeHostDot');
const nativeHostStatus = document.getElementById('nativeHostStatus');
const steamDot = document.getElementById('steamDot');
const steamStatus = document.getElementById('steamStatus');
const farmingInfo = document.getElementById('farmingInfo');
const farmingCount = document.getElementById('farmingCount');
const openBtn = document.getElementById('openBtn');

// Check native host connection
async function checkNativeHost() {
    try {
        const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);

        return new Promise((resolve) => {
            port.onMessage.addListener((msg) => {
                if (msg.type === 'PONG') {
                    nativeHostDot.classList.add('connected');
                    nativeHostDot.classList.remove('disconnected');
                    nativeHostStatus.textContent = 'Připojeno';

                    if (msg.isLoggedIn) {
                        steamDot.classList.add('connected');
                        steamDot.classList.remove('disconnected');
                        steamStatus.textContent = msg.username || 'Přihlášeno';

                        if (msg.farmingGames?.length > 0) {
                            farmingInfo.style.display = 'block';
                            farmingCount.textContent = msg.farmingGames.length;
                        }
                    } else {
                        steamDot.classList.add('disconnected');
                        steamDot.classList.remove('connected');
                        steamStatus.textContent = 'Nepřihlášeno';
                    }
                    resolve(true);
                }
            });

            port.onDisconnect.addListener(() => {
                nativeHostDot.classList.add('disconnected');
                nativeHostDot.classList.remove('connected');
                nativeHostStatus.textContent = 'Nepřipojeno';
                steamDot.classList.add('disconnected');
                steamDot.classList.remove('connected');
                steamStatus.textContent = '-';
                resolve(false);
            });

            // Send ping
            port.postMessage({ type: 'PING' });

            // Timeout
            setTimeout(() => {
                resolve(false);
            }, 2000);
        });
    } catch (error) {
        nativeHostDot.classList.add('disconnected');
        nativeHostDot.classList.remove('connected');
        nativeHostStatus.textContent = 'Chyba';
        return false;
    }
}

// Open Steam Farm page
openBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    // Try to open local file first, then fall back to GitHub Pages
    const urls = [
        chrome.runtime.getURL('../index.html'),
        'https://deerpfy.github.io/adhub/projects/steam-farm/index.html'
    ];

    // Check if we're running locally
    const manifest = chrome.runtime.getManifest();

    // Open in new tab
    chrome.tabs.create({
        url: urls[1] // Use GitHub Pages URL
    });

    window.close();
});

// Initialize
checkNativeHost();
