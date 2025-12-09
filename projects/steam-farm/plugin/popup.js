/**
 * Steam Farm - Popup Script
 * v1.2.0 - Auto-install support
 */

const VERSION = '1.2.0';
const NATIVE_HOST_NAME = 'com.adhub.steamfarm';
const REPO = 'Deerpfy/adhub';
const HOST_VERSION = '1.2.0';

// Elements
const nativeHostDot = document.getElementById('nativeHostDot');
const nativeHostStatus = document.getElementById('nativeHostStatus');
const steamDot = document.getElementById('steamDot');
const steamStatus = document.getElementById('steamStatus');
const farmingInfo = document.getElementById('farmingInfo');
const farmingCount = document.getElementById('farmingCount');
const openBtn = document.getElementById('openBtn');
const installSection = document.getElementById('installSection');
const installBtn = document.getElementById('installBtn');
const installSteps = document.getElementById('installSteps');
const extensionIdEl = document.getElementById('extensionId');

// Detect OS
function getOS() {
    const platform = navigator.platform.toLowerCase();
    const userAgent = navigator.userAgent.toLowerCase();

    if (platform.includes('win')) return 'windows';
    if (platform.includes('mac') || platform.includes('darwin')) return 'macos';
    if (platform.includes('linux')) return 'linux';

    // Fallback to userAgent
    if (userAgent.includes('win')) return 'windows';
    if (userAgent.includes('mac')) return 'macos';
    if (userAgent.includes('linux')) return 'linux';

    return 'unknown';
}

// Get installer URL based on OS
function getInstallerUrl() {
    const os = getOS();
    const baseUrl = `https://github.com/${REPO}/releases/download/steam-farm-v${HOST_VERSION}`;

    switch (os) {
        case 'windows':
            return {
                url: `${baseUrl}/installer-windows.ps1`,
                filename: 'installer-windows.ps1',
                instructions: 'Klikněte pravým tlačítkem na soubor a zvolte "Spustit pomocí PowerShell"'
            };
        case 'macos':
        case 'linux':
            return {
                url: `${baseUrl}/installer-unix.sh`,
                filename: 'installer-unix.sh',
                instructions: 'Otevřete terminál a spusťte: chmod +x installer-unix.sh && ./installer-unix.sh'
            };
        default:
            return null;
    }
}

// Check native host connection
async function checkNativeHost() {
    try {
        const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);

        return new Promise((resolve) => {
            port.onMessage.addListener((msg) => {
                if (msg.type === 'PONG') {
                    // Hide install section
                    installSection.classList.remove('show');

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
                // Show install section
                showInstallSection();

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
        showInstallSection();
        nativeHostDot.classList.add('disconnected');
        nativeHostDot.classList.remove('connected');
        nativeHostStatus.textContent = 'Chyba';
        return false;
    }
}

// Show install section
function showInstallSection() {
    installSection.classList.add('show');
    extensionIdEl.textContent = chrome.runtime.id;
}

// Download installer
async function downloadInstaller() {
    const installer = getInstallerUrl();

    if (!installer) {
        alert('Nepodporovaný operační systém. Prosím nainstalujte Native Host manuálně.');
        return;
    }

    // Update button to show loading
    installBtn.innerHTML = '<span class="spinner"></span><span>Stahuji...</span>';
    installBtn.disabled = true;

    try {
        // Fetch the installer script
        const response = await fetch(installer.url);

        if (!response.ok) {
            throw new Error('Instalátor není k dispozici na GitHub. Zkuste to později.');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = installer.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show instructions
        installSteps.classList.add('show');
        installBtn.innerHTML = '<span>✓</span><span>Staženo!</span>';

        // Copy extension ID to clipboard
        try {
            await navigator.clipboard.writeText(chrome.runtime.id);
        } catch (e) {
            // Clipboard not available, user can copy manually
        }

    } catch (error) {
        console.error('Download error:', error);
        installBtn.innerHTML = '<span>⚠️</span><span>Chyba - zkusit znovu</span>';
        installBtn.disabled = false;

        // Try alternative: open GitHub releases page
        setTimeout(() => {
            if (confirm(`Nelze stáhnout instalátor automaticky.\n\nChcete otevřít stránku GitHub Releases pro manuální stažení?`)) {
                chrome.tabs.create({
                    url: `https://github.com/${REPO}/releases/tag/steam-farm-v${HOST_VERSION}`
                });
            }
            installBtn.innerHTML = '<span>📥</span><span>Stáhnout instalátor</span>';
        }, 1000);
    }
}

// Open Steam Farm page
openBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    // Open GitHub Pages URL
    chrome.tabs.create({
        url: 'https://deerpfy.github.io/adhub/projects/steam-farm/index.html'
    });

    window.close();
});

// Install button click
installBtn.addEventListener('click', downloadInstaller);

// Initialize
checkNativeHost();
