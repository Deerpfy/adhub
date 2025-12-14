/**
 * CardHarvest - Renderer Application
 * UI logic and CardHarvest API integration
 */

// DOM Elements
const loginSection = document.getElementById('loginSection');
const steamGuardSection = document.getElementById('steamGuardSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const steamGuardForm = document.getElementById('steamGuardForm');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = statusIndicator.querySelector('.status-text');

// State
let games = [];
let selectedGames = new Set();
let farmingGames = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkStatus();
    setupEventListeners();
    setupSteamFarmEvents();
});

// Check current status
async function checkStatus() {
    try {
        const status = await window.steamFarm.getStatus();
        document.getElementById('version').textContent = `v${status.version}`;

        if (status.isLoggedIn && status.user) {
            showDashboard(status.user);
            farmingGames = status.farmingGames || [];
            updateFarmingUI();
            loadGames();
        } else {
            // Try to restore session
            const restored = await window.steamFarm.loginWithToken();
            if (!restored) {
                showLogin();
            }
        }
    } catch (error) {
        console.error('Status check failed:', error);
        showLogin();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const sharedSecret = document.getElementById('sharedSecret').value;

        const btn = document.getElementById('loginBtn');
        btn.disabled = true;
        btn.innerHTML = '<span>Přihlašování...</span>';

        try {
            await window.steamFarm.login({ username, password, sharedSecret });
        } catch (error) {
            showToast('Chyba přihlášení: ' + error.message, 'error');
            btn.disabled = false;
            btn.innerHTML = '<span>Přihlásit se</span>';
        }
    });

    // Steam Guard form
    steamGuardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('steamGuardCode').value.toUpperCase();
        await window.steamFarm.submitSteamGuard(code);
        steamGuardSection.classList.add('hidden');
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await window.steamFarm.logout();
    });

    // Games search
    document.getElementById('gameSearch').addEventListener('input', (e) => {
        filterGames(e.target.value);
    });

    // Refresh games
    document.getElementById('refreshGamesBtn').addEventListener('click', loadGames);

    // Start farming
    document.getElementById('startFarmingBtn').addEventListener('click', async () => {
        if (selectedGames.size === 0) return;

        const appIds = Array.from(selectedGames);
        await window.steamFarm.startFarming(appIds);
        showToast(`Farming spuštěn pro ${appIds.length} her`, 'success');
    });

    // Stop farming
    document.getElementById('stopFarmingBtn').addEventListener('click', async () => {
        await window.steamFarm.stopFarming();
        showToast('Farming zastaven', 'info');
    });

    // Open data folder
    document.getElementById('openDataFolderBtn').addEventListener('click', () => {
        window.steamFarm.openDataFolder();
    });
}

// Setup CardHarvest IPC events
function setupSteamFarmEvents() {
    window.steamFarm.onLoggedIn((user) => {
        showToast(`Přihlášen jako ${user.personaName}`, 'success');
        showDashboard(user);
        loadGames();
    });

    window.steamFarm.onLoggedOut(() => {
        showToast('Odhlášen', 'info');
        showLogin();
        games = [];
        selectedGames.clear();
        farmingGames = [];
    });

    window.steamFarm.onSteamGuardRequired(({ domain, lastCodeWrong }) => {
        const message = domain
            ? `Zadejte kód z emailu (${domain})`
            : 'Zadejte kód ze Steam Guard Authenticatoru';

        document.getElementById('steamGuardMessage').textContent =
            lastCodeWrong ? 'Nesprávný kód. Zkuste to znovu.' : message;

        loginSection.classList.add('hidden');
        steamGuardSection.classList.remove('hidden');
        document.getElementById('steamGuardCode').value = '';
        document.getElementById('steamGuardCode').focus();
    });

    window.steamFarm.onError((message) => {
        showToast(`Chyba: ${message}`, 'error');

        // Reset login button if on login screen
        const btn = document.getElementById('loginBtn');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>Přihlásit se</span>';
        }
    });

    window.steamFarm.onDisconnected(({ message }) => {
        showToast(`Odpojeno: ${message || 'Neznámý důvod'}`, 'warning');
        updateStatus(false);
    });

    window.steamFarm.onUserUpdated((user) => {
        document.getElementById('userName').textContent = user.personaName;
    });

    window.steamFarm.onFarmingStatus(({ games: farmingAppIds }) => {
        farmingGames = farmingAppIds || [];
        updateFarmingUI();
    });
}

// UI Functions
function showLogin() {
    loginSection.classList.remove('hidden');
    steamGuardSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');
    updateStatus(false);

    // Reset form
    document.getElementById('loginBtn').disabled = false;
    document.getElementById('loginBtn').innerHTML = '<span>Přihlásit se</span>';
}

function showDashboard(user) {
    loginSection.classList.add('hidden');
    steamGuardSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');

    document.getElementById('userName').textContent = user.personaName || 'Uživatel';
    document.getElementById('userSteamId').textContent = `Steam ID: ${user.steamID || '---'}`;

    updateStatus(true);
}

function updateStatus(isOnline, isFarming = false) {
    statusIndicator.classList.remove('online', 'farming');

    if (isOnline) {
        statusIndicator.classList.add(isFarming ? 'farming' : 'online');
        statusText.textContent = isFarming ? 'Farmí' : 'Online';
    } else {
        statusText.textContent = 'Nepřihlášen';
    }
}

function updateFarmingUI() {
    const count = farmingGames.length;
    document.getElementById('farmingCount').textContent = count;
    document.getElementById('stopFarmingBtn').disabled = count === 0;

    updateStatus(true, count > 0);

    // Update farming games display
    const container = document.getElementById('farmingGames');
    container.innerHTML = '';

    farmingGames.forEach(appId => {
        const game = games.find(g => g.appId === appId);
        const tag = document.createElement('div');
        tag.className = 'farming-game-tag';

        if (game) {
            const iconUrl = game.iconUrl
                ? `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${appId}/${game.iconUrl}.jpg`
                : '';

            tag.innerHTML = `
                ${iconUrl ? `<img src="${iconUrl}" alt="">` : ''}
                <span>${game.name}</span>
            `;
        } else {
            tag.innerHTML = `<span>App ${appId}</span>`;
        }

        container.appendChild(tag);
    });
}

async function loadGames() {
    const listContainer = document.getElementById('gamesList');
    listContainer.innerHTML = '<div class="loading">Načítání her...</div>';

    try {
        games = await window.steamFarm.getGames();
        renderGames(games);
    } catch (error) {
        listContainer.innerHTML = '<div class="no-games">Nepodařilo se načíst hry</div>';
        showToast('Chyba při načítání her', 'error');
    }
}

function renderGames(gamesToRender) {
    const listContainer = document.getElementById('gamesList');

    if (!gamesToRender || gamesToRender.length === 0) {
        listContainer.innerHTML = '<div class="no-games">Žádné hry nenalezeny</div>';
        return;
    }

    listContainer.innerHTML = gamesToRender.map(game => {
        const iconUrl = game.iconUrl
            ? `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${game.appId}/${game.iconUrl}.jpg`
            : '';

        const playtime = formatPlaytime(game.playtimeForever);
        const isSelected = selectedGames.has(game.appId);

        return `
            <div class="game-item ${isSelected ? 'selected' : ''}" data-appid="${game.appId}">
                ${iconUrl
                    ? `<img class="game-icon" src="${iconUrl}" alt="" onerror="this.style.display='none'">`
                    : '<div class="game-icon"></div>'
                }
                <div class="game-info">
                    <div class="game-name">${escapeHtml(game.name)}</div>
                    <div class="game-playtime">${playtime}</div>
                </div>
                <div class="game-checkbox"></div>
            </div>
        `;
    }).join('');

    // Add click handlers
    listContainer.querySelectorAll('.game-item').forEach(item => {
        item.addEventListener('click', () => {
            const appId = parseInt(item.dataset.appid);
            toggleGameSelection(appId, item);
        });
    });
}

function toggleGameSelection(appId, element) {
    if (selectedGames.has(appId)) {
        selectedGames.delete(appId);
        element.classList.remove('selected');
    } else {
        if (selectedGames.size >= 32) {
            showToast('Maximum 32 her pro farming', 'warning');
            return;
        }
        selectedGames.add(appId);
        element.classList.add('selected');
    }

    updateSelectionUI();
}

function updateSelectionUI() {
    document.getElementById('selectedCount').textContent = selectedGames.size;
    document.getElementById('startFarmingBtn').disabled = selectedGames.size === 0;
}

function filterGames(query) {
    const filtered = query
        ? games.filter(g => g.name.toLowerCase().includes(query.toLowerCase()))
        : games;
    renderGames(filtered);
}

// Utility functions
function formatPlaytime(minutes) {
    if (!minutes || minutes === 0) return 'Nehráno';

    const hours = Math.floor(minutes / 60);
    if (hours < 1) return `${minutes} min`;
    return `${hours.toFixed(1)} hod`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
