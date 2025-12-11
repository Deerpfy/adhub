/**
 * Steam Farm - Popup Script
 * v2.0.0 - WebSocket verze (bez nutnosti Extension ID)
 */

const VERSION = '2.0.0';
const STATUS_URL = 'http://127.0.0.1:17532/status';
const REPO = 'Deerpfy/adhub';
const SERVICE_VERSION = '2.0.0';

// Elements
const serviceDot = document.getElementById('serviceDot');
const serviceStatus = document.getElementById('serviceStatus');
const steamDot = document.getElementById('steamDot');
const steamStatus = document.getElementById('steamStatus');
const farmingInfo = document.getElementById('farmingInfo');
const farmingCount = document.getElementById('farmingCount');
const openBtn = document.getElementById('openBtn');
const installSection = document.getElementById('installSection');
const installBtn = document.getElementById('installBtn');
const installSteps = document.getElementById('installSteps');

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

// Get installer info based on OS
function getInstallerInfo() {
    const os = getOS();
    const baseUrl = `https://github.com/${REPO}/releases/download/steam-farm-v${SERVICE_VERSION}`;

    switch (os) {
        case 'windows':
            return {
                url: `${baseUrl}/steam-farm-installer.exe`,
                filename: 'steam-farm-installer.exe',
                fallbackScript: `${baseUrl}/install-service.ps1`,
                fallbackFilename: 'install-service.ps1'
            };
        case 'macos':
        case 'linux':
            return {
                url: `${baseUrl}/steam-farm-installer-${os}`,
                filename: `steam-farm-installer-${os}`,
                fallbackScript: `${baseUrl}/install-service.sh`,
                fallbackFilename: 'install-service.sh'
            };
        default:
            return null;
    }
}

// Check if service is running
async function checkService() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(STATUS_URL, {
            signal: controller.signal,
            cache: 'no-store'
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();

            // Service is running
            installSection.classList.remove('show');

            serviceDot.classList.add('connected');
            serviceDot.classList.remove('disconnected', 'loading');
            serviceStatus.textContent = `v${data.version}`;

            if (data.isLoggedIn) {
                steamDot.classList.add('connected');
                steamDot.classList.remove('disconnected');
                steamStatus.textContent = data.username || 'Přihlášeno';

                if (data.farmingCount > 0) {
                    farmingInfo.style.display = 'block';
                    farmingCount.textContent = data.farmingCount;
                }
            } else {
                steamDot.classList.add('disconnected');
                steamDot.classList.remove('connected');
                steamStatus.textContent = 'Nepřihlášeno';
            }

            return true;
        }
    } catch (error) {
        // Service not running
    }

    // Show install section
    showInstallSection();

    serviceDot.classList.add('disconnected');
    serviceDot.classList.remove('connected', 'loading');
    serviceStatus.textContent = 'Neběží';
    steamDot.classList.add('disconnected');
    steamDot.classList.remove('connected');
    steamStatus.textContent = '-';

    return false;
}

// Show install section
function showInstallSection() {
    installSection.classList.add('show');
}

// Download installer
async function downloadInstaller() {
    const installer = getInstallerInfo();

    if (!installer) {
        alert('Nepodporovaný operační systém. Prosím nainstalujte service manuálně.');
        return;
    }

    // Update button to show loading
    installBtn.innerHTML = '<span class="spinner"></span><span>Stahuji...</span>';
    installBtn.disabled = true;

    try {
        // Try to download the installer
        const response = await fetch(installer.url);

        if (!response.ok) {
            // Try fallback script
            const fallbackResponse = await fetch(installer.fallbackScript);
            if (fallbackResponse.ok) {
                const blob = await fallbackResponse.blob();
                downloadBlob(blob, installer.fallbackFilename);
                showSuccessState();
                return;
            }
            throw new Error('Instalátor není k dispozici');
        }

        const blob = await response.blob();
        downloadBlob(blob, installer.filename);
        showSuccessState();

    } catch (error) {
        console.error('Download error:', error);
        installBtn.innerHTML = '<span>⚠️</span><span>Chyba - zkusit znovu</span>';
        installBtn.disabled = false;

        // Try alternative: open GitHub releases page
        setTimeout(() => {
            if (confirm(`Nelze stáhnout instalátor automaticky.\n\nChcete otevřít stránku GitHub Releases pro manuální stažení?`)) {
                chrome.tabs.create({
                    url: `https://github.com/${REPO}/releases/tag/steam-farm-v${SERVICE_VERSION}`
                });
            }
            installBtn.innerHTML = '<span>📥</span><span>Stáhnout instalátor</span>';
        }, 1000);
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showSuccessState() {
    installSteps.classList.add('show');
    installBtn.innerHTML = '<span>✓</span><span>Staženo!</span>';

    // Re-enable button after delay for retry
    setTimeout(() => {
        installBtn.innerHTML = '<span>📥</span><span>Stáhnout znovu</span>';
        installBtn.disabled = false;
    }, 5000);
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
checkService();

// Periodically check service status
setInterval(checkService, 5000);
