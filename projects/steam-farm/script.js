/**
 * Steam Farm - AdHUB
 * Webové rozhraní pro farming Steam hodin a kartiček
 *
 * v2.0.0 - WebSocket architektura (bez nutnosti Extension ID)
 * Komunikace: Web <-> Chrome Extension <-> WebSocket Service (Node.js) <-> Steam
 *
 * Bezpečnost: Refresh token je šifrován pomocí AES-256-GCM s klíčem
 * odvozeným z uživatelského hesla přes Argon2id
 */

// Version
const VERSION = '2.0.0';

// GitHub repo for downloads
const REPO = 'Deerpfy/adhub';
const SERVICE_VERSION = '2.0.0';

// GitHub API
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_REPO = 'Deerpfy/adhub';
const GITHUB_BRANCH = 'main';
const PLUGIN_PATH = 'projects/steam-farm/plugin';

// State
const state = {
    connected: false,
    loggedIn: false,
    steamGuardPending: false,
    vaultExists: false,
    vaultUnlocked: false,
    user: null,
    games: [],
    selectedGames: new Set(),
    farmingGames: [],
    cardsData: {},
    filter: 'all',
    searchQuery: '',
    latestCommit: null
};

// DOM Elements
const elements = {
    connectionStatus: null,
    extensionCheck: null,
    vaultSection: null,
    vaultCreate: null,
    vaultUnlock: null,
    loginSection: null,
    accountSection: null,
    farmingSection: null,
    currentFarmingSection: null,
    cardsSection: null,
    loginForm: null,
    steamGuardDialog: null,
    gamesGrid: null,
    farmingList: null,
    toastContainer: null
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    initEventListeners();
    checkExtension();
    loadSavedState();
    fetchLatestCommitInfo();
});

// Initialize DOM elements
function initElements() {
    elements.connectionStatus = document.getElementById('connectionStatus');
    elements.extensionCheck = document.getElementById('extensionCheck');
    elements.vaultSection = document.getElementById('vaultSection');
    elements.vaultCreate = document.getElementById('vaultCreate');
    elements.vaultUnlock = document.getElementById('vaultUnlock');
    elements.loginSection = document.getElementById('loginSection');
    elements.accountSection = document.getElementById('accountSection');
    elements.farmingSection = document.getElementById('farmingSection');
    elements.currentFarmingSection = document.getElementById('currentFarmingSection');
    elements.cardsSection = document.getElementById('cardsSection');
    elements.loginForm = document.getElementById('loginForm');
    elements.steamGuardDialog = document.getElementById('steamGuardDialog');
    elements.gamesGrid = document.getElementById('gamesGrid');
    elements.farmingList = document.getElementById('farmingList');
    elements.toastContainer = document.getElementById('toastContainer');
}

// Initialize event listeners
function initEventListeners() {
    // Vault forms
    document.getElementById('createVaultForm')?.addEventListener('submit', handleCreateVault);
    document.getElementById('unlockVaultForm')?.addEventListener('submit', handleUnlockVault);
    document.getElementById('deleteVaultBtn')?.addEventListener('click', handleDeleteVault);

    // Login form
    elements.loginForm?.addEventListener('submit', handleLogin);

    // Steam Guard code
    document.getElementById('submitGuardCode')?.addEventListener('click', handleSteamGuardSubmit);
    document.getElementById('steamGuardCode')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSteamGuardSubmit();
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    // Farming controls
    document.getElementById('startAllBtn')?.addEventListener('click', startFarming);
    document.getElementById('stopAllBtn')?.addEventListener('click', stopFarming);

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filter = btn.dataset.filter;
            renderGames();
        });
    });

    // Search input
    document.getElementById('gameSearch')?.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase();
        renderGames();
    });

    // OS tabs
    document.querySelectorAll('.os-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.os-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.os-content').forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            document.getElementById(`os-${tab.dataset.os}`).style.display = 'block';
        });
    });

    // Cards refresh
    document.getElementById('refreshCardsBtn')?.addEventListener('click', fetchCardsData);

    // Auto-install buttons
    document.getElementById('installWindowsBtn')?.addEventListener('click', () => downloadInstaller('windows'));
    document.getElementById('installUnixBtn')?.addEventListener('click', () => downloadInstaller('unix'));

    // Download plugin button
    document.getElementById('downloadPluginBtn')?.addEventListener('click', handleDownloadPlugin);

    // Listen for messages from extension
    window.addEventListener('message', handleExtensionMessage);
}

// Check if extension is installed
function checkExtension() {
    updateConnectionStatus('connecting', 'Kontroluji rozšíření...');

    // Send ping to extension
    window.postMessage({
        type: 'STEAM_FARM_PING',
        source: 'steam-farm-web'
    }, '*');

    // Timeout for extension check
    setTimeout(() => {
        if (!state.connected) {
            updateConnectionStatus('disconnected', 'Rozšíření nenalezeno');
            showExtensionRequired();
        }
    }, 2000);
}

// Handle messages from extension
function handleExtensionMessage(event) {
    // Only accept messages from our extension
    if (event.data?.source !== 'steam-farm-extension') return;

    const { type, data, error } = event.data;

    switch (type) {
        case 'STEAM_FARM_PONG':
            handleExtensionConnected(data);
            break;

        case 'STEAM_FARM_VAULT_STATUS':
            handleVaultStatus(data);
            break;

        case 'STEAM_FARM_VAULT_CREATED':
            handleVaultCreated(data);
            break;

        case 'STEAM_FARM_VAULT_UNLOCKED':
            handleVaultUnlocked(data);
            break;

        case 'STEAM_FARM_VAULT_DELETED':
            handleVaultDeleted(data);
            break;

        case 'STEAM_FARM_VAULT_ERROR':
            handleVaultError(error);
            break;

        case 'STEAM_FARM_LOGIN_RESULT':
            handleLoginResult(data, error);
            break;

        case 'STEAM_FARM_STEAM_GUARD':
            handleSteamGuardRequest(data);
            break;

        case 'STEAM_FARM_LOGGED_ON':
            handleLoggedOn(data);
            break;

        case 'STEAM_FARM_GAMES_LIST':
            handleGamesList(data);
            break;

        case 'STEAM_FARM_CARDS_DATA':
            handleCardsData(data);
            break;

        case 'STEAM_FARM_FARMING_STATUS':
            handleFarmingStatus(data);
            break;

        case 'STEAM_FARM_ERROR':
            handleError(error);
            break;

        case 'STEAM_FARM_DISCONNECTED':
            handleDisconnected();
            break;
    }
}

// Extension connected
function handleExtensionConnected(data) {
    state.connected = true;

    const stepExtension = document.getElementById('stepExtension');
    const stepService = document.getElementById('stepService');

    if (stepExtension) {
        stepExtension.classList.add('complete');
    }

    if (data.serviceRunning) {
        if (stepService) stepService.classList.add('complete');

        updateConnectionStatus('connected', `Připojeno (Service v${data.serviceVersion || '2.0'})`);
        hideExtensionRequired();

        // Check vault status
        sendToExtension('CHECK_VAULT_STATUS');
    } else {
        updateConnectionStatus('disconnected', 'Steam Farm Service neběží');
        showExtensionRequired();
    }
}

// ===========================================
// VAULT HANDLERS
// ===========================================

function handleVaultStatus(data) {
    state.vaultExists = data.exists;
    state.vaultUnlocked = data.unlocked;

    if (data.unlocked) {
        // Vault is unlocked, show login or restore session
        hideVaultSection();
        showLoginSection();

        if (data.hasSession) {
            sendToExtension('RESTORE_SESSION');
        }
    } else if (data.exists) {
        // Vault exists but locked - show unlock form
        showVaultUnlock();
    } else {
        // No vault - show create form
        showVaultCreate();
    }
}

function handleCreateVault(e) {
    e.preventDefault();

    const password = document.getElementById('vaultPassword').value;
    const confirm = document.getElementById('vaultPasswordConfirm').value;

    if (password.length < 4) {
        showToast('Heslo musí mít alespoň 4 znaky', 'error');
        return;
    }

    if (password !== confirm) {
        showToast('Hesla se neshodují', 'error');
        return;
    }

    const btn = document.getElementById('createVaultBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Vytvářím...';

    sendToExtension('CREATE_VAULT', { password });
}

function handleUnlockVault(e) {
    e.preventDefault();

    const password = document.getElementById('unlockPassword').value;

    if (!password) {
        showToast('Zadejte heslo', 'error');
        return;
    }

    const btn = document.getElementById('unlockVaultBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Odemykám...';

    sendToExtension('UNLOCK_VAULT', { password });
}

function handleDeleteVault() {
    if (!confirm('Opravdu chcete smazat trezor? Ztratíte uloženou session a budete se muset znovu přihlásit ke Steam.')) {
        return;
    }

    sendToExtension('DELETE_VAULT');
}

function handleVaultCreated(data) {
    const btn = document.getElementById('createVaultBtn');
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">🔒</span> Vytvořit trezor';

    if (data.success) {
        state.vaultExists = true;
        state.vaultUnlocked = true;
        showToast('Trezor vytvořen! Nyní se můžete přihlásit.', 'success');
        hideVaultSection();
        showLoginSection();
    }
}

function handleVaultUnlocked(data) {
    const btn = document.getElementById('unlockVaultBtn');
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">🔓</span> Odemknout';

    document.getElementById('unlockPassword').value = '';

    if (data.success) {
        state.vaultUnlocked = true;
        showToast('Trezor odemčen!', 'success');
        hideVaultSection();
        showLoginSection();

        if (data.hasSession) {
            sendToExtension('RESTORE_SESSION');
        }
    }
}

function handleVaultDeleted(data) {
    if (data.success) {
        state.vaultExists = false;
        state.vaultUnlocked = false;
        showToast('Trezor smazán', 'success');
        showVaultCreate();
    }
}

function handleVaultError(error) {
    showToast(error, 'error');

    // Reset buttons
    const createBtn = document.getElementById('createVaultBtn');
    const unlockBtn = document.getElementById('unlockVaultBtn');

    if (createBtn) {
        createBtn.disabled = false;
        createBtn.innerHTML = '<span class="btn-icon">🔒</span> Vytvořit trezor';
    }

    if (unlockBtn) {
        unlockBtn.disabled = false;
        unlockBtn.innerHTML = '<span class="btn-icon">🔓</span> Odemknout';
    }
}

function showVaultCreate() {
    elements.vaultSection.style.display = 'block';
    elements.vaultCreate.style.display = 'block';
    elements.vaultUnlock.style.display = 'none';
    elements.loginSection.style.display = 'none';
}

function showVaultUnlock() {
    elements.vaultSection.style.display = 'block';
    elements.vaultCreate.style.display = 'none';
    elements.vaultUnlock.style.display = 'block';
    elements.loginSection.style.display = 'none';
}

function hideVaultSection() {
    elements.vaultSection.style.display = 'none';
}

// ===========================================
// LOGIN HANDLERS
// ===========================================

// Send message to extension
function sendToExtension(type, data = {}) {
    window.postMessage({
        type: `STEAM_FARM_${type}`,
        source: 'steam-farm-web',
        data
    }, '*');
}

// Handle login form submit
async function handleLogin(e) {
    e.preventDefault();

    if (!state.vaultUnlocked) {
        showToast('Nejdříve odemkněte trezor', 'error');
        return;
    }

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const sharedSecret = document.getElementById('sharedSecret').value.trim();

    if (!username || !password) {
        showToast('Vyplňte uživatelské jméno a heslo', 'error');
        return;
    }

    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="btn-icon">⏳</span> Přihlašuji...';

    sendToExtension('LOGIN', {
        username,
        password,
        sharedSecret: sharedSecret || null
    });
}

// Handle login result
function handleLoginResult(data, error) {
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<span class="btn-icon">🚀</span> Přihlásit se';

    if (error) {
        showToast(`Přihlášení selhalo: ${error}`, 'error');
        return;
    }

    if (data.success) {
        showToast('Přihlašování...', 'success');
    }
}

// Handle Steam Guard request
function handleSteamGuardRequest(data) {
    state.steamGuardPending = true;

    const dialog = elements.steamGuardDialog;
    const text = document.getElementById('steamGuardText');

    if (data.domain) {
        text.textContent = `Zadejte kód ze Steam Guard emailu (${data.domain})`;
    } else {
        text.textContent = 'Zadejte kód z mobilního authenticatoru';
    }

    dialog.style.display = 'block';
    document.getElementById('steamGuardCode').focus();
}

// Handle Steam Guard code submit
function handleSteamGuardSubmit() {
    const code = document.getElementById('steamGuardCode').value.trim().toUpperCase();

    if (code.length !== 5) {
        showToast('Kód musí mít 5 znaků', 'warning');
        return;
    }

    sendToExtension('STEAM_GUARD_CODE', { code });
    elements.steamGuardDialog.style.display = 'none';
    document.getElementById('steamGuardCode').value = '';

    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="btn-icon">⏳</span> Ověřuji...';
}

// Handle logged on
function handleLoggedOn(data) {
    state.loggedIn = true;
    state.user = data;
    state.steamGuardPending = false;

    // Update UI
    elements.loginSection.style.display = 'none';
    elements.accountSection.style.display = 'block';
    elements.farmingSection.style.display = 'block';
    elements.currentFarmingSection.style.display = 'block';
    elements.cardsSection.style.display = 'block';

    document.getElementById('accountName').textContent = data.personaName || data.username;

    // Save session indicator
    localStorage.setItem('steam_farm_has_session', 'true');

    // Fetch games and cards
    sendToExtension('GET_GAMES');
    sendToExtension('GET_CARDS');

    showToast(`Vítejte, ${data.personaName || data.username}!`, 'success');
}

// Handle games list
function handleGamesList(data) {
    state.games = data.games || [];
    document.getElementById('totalGames').textContent = state.games.length;
    document.getElementById('totalHours').textContent = formatTotalHours(state.games);
    renderGames();
}

// Handle cards data
function handleCardsData(data) {
    state.cardsData = data.cards || {};
    const totalCards = Object.values(state.cardsData).reduce((sum, count) => sum + count, 0);
    document.getElementById('totalCards').textContent = totalCards;
    renderCards();
}

// Handle farming status
function handleFarmingStatus(data) {
    state.farmingGames = data.games || [];
    document.getElementById('farmingCount').textContent = state.farmingGames.length;
    document.getElementById('farmingInfo').textContent = `${state.farmingGames.length}/32 slotů`;
    renderFarmingList();
    renderGames();
}

// Handle error
function handleError(error) {
    showToast(`Chyba: ${error}`, 'error');

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span class="btn-icon">🚀</span> Přihlásit se';
    }
}

// Handle disconnected
function handleDisconnected() {
    state.loggedIn = false;
    state.user = null;
    state.games = [];
    state.farmingGames = [];

    updateConnectionStatus('disconnected', 'Odpojeno');

    // Show vault or login based on vault state
    if (state.vaultUnlocked) {
        showLoginSection();
    } else if (state.vaultExists) {
        showVaultUnlock();
    } else {
        showVaultCreate();
    }

    showToast('Odpojeno od Steam', 'warning');
    localStorage.removeItem('steam_farm_has_session');
}

// Handle logout
function handleLogout() {
    sendToExtension('LOGOUT');
    handleDisconnected();
}

// ===========================================
// FARMING
// ===========================================

function startFarming() {
    if (state.selectedGames.size === 0) {
        showToast('Vyberte hry pro farmení', 'warning');
        return;
    }

    if (state.selectedGames.size > 32) {
        showToast('Můžete farmit maximálně 32 her současně', 'warning');
        return;
    }

    const appIds = Array.from(state.selectedGames);
    sendToExtension('START_FARMING', { appIds });
    showToast(`Spouštím farmení ${appIds.length} her...`, 'success');
}

function stopFarming() {
    sendToExtension('STOP_FARMING');
    showToast('Zastavuji farmení...', 'success');
}

// ===========================================
// RENDERING
// ===========================================

function renderGames() {
    const grid = elements.gamesGrid;
    if (!grid) return;

    let filteredGames = [...state.games];

    switch (state.filter) {
        case 'cards':
            filteredGames = filteredGames.filter(g => state.cardsData[g.appId] > 0);
            break;
        case 'hours':
            filteredGames = filteredGames.filter(g => g.playtimeForever < 120);
            break;
        case 'selected':
            filteredGames = filteredGames.filter(g => state.selectedGames.has(g.appId));
            break;
    }

    if (state.searchQuery) {
        filteredGames = filteredGames.filter(g =>
            g.name.toLowerCase().includes(state.searchQuery)
        );
    }

    filteredGames.sort((a, b) => a.name.localeCompare(b.name));

    if (filteredGames.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🎮</span>
                <p>${state.games.length === 0 ? 'Načítání her...' : 'Žádné hry nenalezeny'}</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filteredGames.map(game => {
        const isSelected = state.selectedGames.has(game.appId);
        const isFarming = state.farmingGames.includes(game.appId);
        const cards = state.cardsData[game.appId] || 0;
        const hours = Math.floor((game.playtimeForever || 0) / 60);

        return `
            <div class="game-card ${isSelected ? 'selected' : ''} ${isFarming ? 'farming' : ''}"
                 data-appid="${game.appId}"
                 onclick="toggleGameSelection(${game.appId})">
                <div class="game-checkbox"></div>
                <div class="game-header">
                    <div class="game-icon">
                        <img src="https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg"
                             alt="${game.name}"
                             onerror="this.parentElement.innerHTML='🎮'">
                    </div>
                    <div class="game-info">
                        <div class="game-name" title="${game.name}">${game.name}</div>
                        <div class="game-appid">AppID: ${game.appId}</div>
                    </div>
                </div>
                <div class="game-stats">
                    <span class="game-stat">⏱️ ${hours}h</span>
                    ${cards > 0 ? `<span class="game-stat cards">🃏 ${cards} kartiček</span>` : ''}
                    ${isFarming ? '<span class="game-stat" style="color: var(--success-color)">▶️ Farmí</span>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

window.toggleGameSelection = function(appId) {
    if (state.selectedGames.has(appId)) {
        state.selectedGames.delete(appId);
    } else {
        if (state.selectedGames.size >= 32) {
            showToast('Můžete vybrat maximálně 32 her', 'warning');
            return;
        }
        state.selectedGames.add(appId);
    }
    renderGames();
};

function renderFarmingList() {
    const list = elements.farmingList;
    if (!list) return;

    if (state.farmingGames.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>Žádné hry aktuálně nefarmí</p></div>';
        return;
    }

    list.innerHTML = state.farmingGames.map(appId => {
        const game = state.games.find(g => g.appId === appId) || { name: `AppID: ${appId}`, appId };

        return `
            <div class="farming-item">
                <div class="farming-item-icon">
                    <img src="https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg"
                         alt="${game.name}"
                         onerror="this.parentElement.innerHTML='🎮'">
                </div>
                <div class="farming-item-info">
                    <div class="farming-item-name">${game.name}</div>
                    <div class="farming-item-time">Farmí...</div>
                </div>
                <button class="farming-item-remove" onclick="removeFarmingGame(${appId})" title="Odebrat">
                    ✕
                </button>
            </div>
        `;
    }).join('');
}

window.removeFarmingGame = function(appId) {
    const newList = state.farmingGames.filter(id => id !== appId);
    sendToExtension('UPDATE_FARMING', { appIds: newList });
};

function renderCards() {
    const grid = document.getElementById('cardsGrid');
    if (!grid) return;

    const gamesWithCards = Object.entries(state.cardsData)
        .filter(([_, count]) => count > 0)
        .map(([appId, count]) => {
            const game = state.games.find(g => g.appId === parseInt(appId)) || { name: `AppID: ${appId}` };
            return { appId, count, name: game.name };
        })
        .sort((a, b) => b.count - a.count);

    if (gamesWithCards.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>Žádné kartičky k získání</p></div>';
        return;
    }

    grid.innerHTML = gamesWithCards.map(({ appId, count, name }) => `
        <div class="card-item">
            <div class="card-item-game" title="${name}">${name}</div>
            <div class="card-item-count">${count}</div>
            <div class="card-item-label">zbývajících kartiček</div>
        </div>
    `).join('');
}

function fetchCardsData() {
    sendToExtension('GET_CARDS');
    showToast('Načítám data o kartičkách...', 'success');
}

// ===========================================
// UI HELPERS
// ===========================================

function updateConnectionStatus(status, text) {
    const statusEl = elements.connectionStatus;
    if (!statusEl) return;

    const dot = statusEl.querySelector('.status-dot');
    const textEl = statusEl.querySelector('.status-text');

    dot.className = `status-dot ${status}`;
    textEl.textContent = text;
}

function showExtensionRequired() {
    elements.extensionCheck.style.display = 'block';
    elements.vaultSection.style.display = 'none';
    elements.loginSection.style.display = 'none';
}

function hideExtensionRequired() {
    elements.extensionCheck.style.display = 'none';
}

function showLoginSection() {
    elements.vaultSection.style.display = 'none';
    elements.loginSection.style.display = 'block';
    elements.accountSection.style.display = 'none';
    elements.farmingSection.style.display = 'none';
    elements.currentFarmingSection.style.display = 'none';
    elements.cardsSection.style.display = 'none';
}

function formatTotalHours(games) {
    const totalMinutes = games.reduce((sum, g) => sum + (g.playtimeForever || 0), 0);
    return Math.floor(totalMinutes / 60);
}

function loadSavedState() {
    try {
        const selectedGames = localStorage.getItem('steam_farm_selected_games');
        if (selectedGames) {
            state.selectedGames = new Set(JSON.parse(selectedGames));
        }
    } catch (e) {
        console.error('Failed to load saved state:', e);
    }
}

function saveState() {
    try {
        localStorage.setItem('steam_farm_selected_games', JSON.stringify([...state.selectedGames]));
    } catch (e) {
        console.error('Failed to save state:', e);
    }
}

function showToast(message, type = 'info') {
    const container = elements.toastContainer;
    if (!container) return;

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

window.addEventListener('beforeunload', saveState);

// ===== Auto-Install Functions =====

// Download installer for specific OS
async function downloadInstaller(os) {
    const baseUrl = `https://github.com/${REPO}/releases/download/steam-farm-v${SERVICE_VERSION}`;

    let url, filename;
    if (os === 'windows') {
        url = `${baseUrl}/install-service.ps1`;
        filename = 'install-service.ps1';
    } else {
        url = `${baseUrl}/install-service.sh`;
        filename = 'install-service.sh';
    }

    const btn = document.getElementById(os === 'windows' ? 'installWindowsBtn' : 'installUnixBtn');
    const originalContent = btn.innerHTML;

    btn.innerHTML = '<span class="spinner"></span> Stahuji...';
    btn.disabled = true;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Instalátor není k dispozici');
        }

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        btn.innerHTML = '<span>✓</span> Staženo!';
        showToast(`Instalátor stažen: ${filename}. Stačí spustit - žádné další kroky!`, 'success');

    } catch (error) {
        console.error('Download error:', error);
        btn.innerHTML = '<span>⚠️</span> Chyba';
        showToast('Nelze stáhnout instalátor. Zkuste GitHub Releases.', 'error');

        // Open GitHub releases as fallback
        setTimeout(() => {
            if (confirm('Chcete otevřít GitHub Releases pro manuální stažení?')) {
                window.open(`https://github.com/${REPO}/releases/tag/steam-farm-v${SERVICE_VERSION}`, '_blank');
            }
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }, 1500);
        return;
    }

    setTimeout(() => {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }, 3000);
}

// ===========================================
// PLUGIN DOWNLOAD
// ===========================================

async function fetchLatestCommitInfo() {
    const commitLoading = document.getElementById('commitLoading');
    const commitDetails = document.getElementById('commitDetails');

    try {
        const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/commits?path=${PLUGIN_PATH}&per_page=1`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const commits = await response.json();

        if (commits.length > 0) {
            state.latestCommit = commits[0];

            // Update UI
            if (commitLoading) commitLoading.style.display = 'none';
            if (commitDetails) commitDetails.style.display = 'block';

            const latestCommitId = document.getElementById('latestCommitId');
            const latestCommitDate = document.getElementById('latestCommitDate');
            const latestCommitMessage = document.getElementById('latestCommitMessage');

            if (latestCommitId) {
                latestCommitId.textContent = state.latestCommit.sha.substring(0, 7);
            }

            if (latestCommitDate) {
                const date = new Date(state.latestCommit.commit.author.date);
                latestCommitDate.textContent = date.toLocaleDateString('cs-CZ') + ' ' + date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
            }

            if (latestCommitMessage) {
                latestCommitMessage.textContent = state.latestCommit.commit.message.split('\n')[0];
            }
        }
    } catch (error) {
        console.error('[SteamFarm] Error fetching commit info:', error);
        if (commitLoading) {
            commitLoading.innerHTML = '<span style="color: #ef4444;">Nepodařilo se načíst verzi</span>';
        }
    }
}

async function handleDownloadPlugin() {
    console.log('[SteamFarm] Starting plugin download...');

    const btn = document.getElementById('downloadPluginBtn');
    const progress = document.getElementById('downloadProgress');
    const progressFill = document.getElementById('downloadProgressFill');
    const progressText = document.getElementById('downloadProgressText');

    if (!btn) return;

    const originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Stahuji...';
    if (progress) progress.style.display = 'block';
    if (progressText) progressText.textContent = 'Načítám soubory z GitHubu...';
    if (progressFill) progressFill.style.width = '10%';

    try {
        // Step 1: Get file list
        console.log('[SteamFarm] Step 1: Fetching file list');
        const filesUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${PLUGIN_PATH}?ref=${GITHUB_BRANCH}`;
        const filesResponse = await fetch(filesUrl);

        if (!filesResponse.ok) {
            throw new Error(`Cannot load file list: ${filesResponse.status}`);
        }

        const files = await filesResponse.json();
        if (progressFill) progressFill.style.width = '20%';
        if (progressText) progressText.textContent = `Nalezeno ${files.length} souborů...`;

        // Step 2: Download all files
        console.log('[SteamFarm] Step 2: Downloading files');
        const zip = new JSZip();
        const pluginFolder = zip.folder('steam-farm-plugin');

        let downloadedCount = 0;
        for (const file of files) {
            if (file.type === 'file') {
                const content = await fetchFileContent(file.download_url);
                pluginFolder.file(file.name, content);
                downloadedCount++;
                if (progressFill) progressFill.style.width = `${20 + (downloadedCount / files.length) * 50}%`;
                if (progressText) progressText.textContent = `Stahuji: ${file.name}`;
            } else if (file.type === 'dir' && file.name === 'icons') {
                // Handle icons folder
                const iconsFolder = pluginFolder.folder('icons');
                const iconsUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${PLUGIN_PATH}/icons?ref=${GITHUB_BRANCH}`;
                const iconsResponse = await fetch(iconsUrl);
                const icons = await iconsResponse.json();

                for (const icon of icons) {
                    if (icon.type === 'file') {
                        const iconContent = await fetchFileContent(icon.download_url, true);
                        iconsFolder.file(icon.name, iconContent);
                    }
                }
            }
        }

        if (progressFill) progressFill.style.width = '80%';
        if (progressText) progressText.textContent = 'Generuji ZIP soubor...';

        // Step 3: Generate ZIP
        console.log('[SteamFarm] Step 3: Generating ZIP');
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        });

        if (progressFill) progressFill.style.width = '90%';
        if (progressText) progressText.textContent = 'Připravuji ke stažení...';

        // Step 4: Download
        console.log('[SteamFarm] Step 4: Triggering download');
        const downloadUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;

        const commitId = state.latestCommit ? state.latestCommit.sha.substring(0, 7) : 'latest';
        a.download = `steam-farm-plugin-${commitId}.zip`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        if (progressFill) progressFill.style.width = '100%';
        if (progressText) progressText.textContent = 'Stahování dokončeno!';

        showToast('Plugin úspěšně stažen! Rozbalte ZIP a nainstalujte podle návodu.', 'success');

        btn.innerHTML = '<span class="btn-icon">✓</span> Staženo!';
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalBtnHtml;
            if (progress) progress.style.display = 'none';
            if (progressFill) progressFill.style.width = '0%';
        }, 2000);

    } catch (error) {
        console.error('[SteamFarm] Download error:', error);
        showToast('Chyba při stahování: ' + error.message, 'error');

        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
        if (progress) progress.style.display = 'none';
    }
}

async function fetchFileContent(url, isBinary = false) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Cannot download file: ${url}`);
    }

    if (isBinary) {
        return await response.arrayBuffer();
    }
    return await response.text();
}

// Expose for debugging
window.steamFarmState = state;
