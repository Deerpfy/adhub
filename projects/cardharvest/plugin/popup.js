/**
 * CardHarvest - Popup Script
 * v2.0.0 - WebSocket verze (bez nutnosti Extension ID)
 */

const VERSION = '2.0.0';
const STATUS_URL = 'http://127.0.0.1:17532/status';
const STEAM_FARM_URL = 'https://deerpfy.github.io/adhub/projects/cardharvest/index.html';

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

// Open CardHarvest page (for download and instructions)
function openSteamFarmPage() {
    chrome.tabs.create({
        url: STEAM_FARM_URL + '#installation'
    });
    window.close();
}

// Open CardHarvest page
openBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: STEAM_FARM_URL });
    window.close();
});

// Install button - opens CardHarvest page with installation section
installBtn.addEventListener('click', openSteamFarmPage);

// Initialize
checkService();

// Periodically check service status
setInterval(checkService, 5000);
