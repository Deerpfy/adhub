/**
 * Steam Farm - AdHUB
 * Webové rozhraní pro farming Steam hodin a kartiček
 *
 * Komunikace: Web <-> Chrome Extension <-> Native Host (Node.js) <-> Steam
 */

// Version
const VERSION = '1.0.0';

// Extension ID - will be set after extension is loaded
let EXTENSION_ID = null;

// State
const state = {
    connected: false,
    loggedIn: false,
    steamGuardPending: false,
    user: null,
    games: [],
    selectedGames: new Set(),
    farmingGames: [],
    cardsData: {},
    filter: 'all',
    searchQuery: ''
};

// DOM Elements
const elements = {
    connectionStatus: null,
    extensionCheck: null,
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
});

// Initialize DOM elements
function initElements() {
    elements.connectionStatus = document.getElementById('connectionStatus');
    elements.extensionCheck = document.getElementById('extensionCheck');
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
    EXTENSION_ID = data.extensionId;

    const stepExtension = document.getElementById('stepExtension');
    const stepNativeHost = document.getElementById('stepNativeHost');
    const stepNodeModules = document.getElementById('stepNodeModules');

    if (stepExtension) {
        stepExtension.classList.add('complete');
    }

    if (data.nativeHostConnected) {
        if (stepNativeHost) stepNativeHost.classList.add('complete');
        if (stepNodeModules) stepNodeModules.classList.add('complete');

        updateConnectionStatus('connected', 'Připojeno');
        hideExtensionRequired();
        showLoginSection();

        // Check if we have saved session
        if (data.hasSession) {
            sendToExtension('RESTORE_SESSION');
        }
    } else {
        updateConnectionStatus('disconnected', 'Native Host není připojen');
        showExtensionRequired();
    }
}

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
        showToast('Přihlášení úspěšné!', 'success');
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
    renderGames(); // Update game cards to show farming status
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
    showLoginSection();
    showToast('Odpojeno od Steam', 'warning');

    localStorage.removeItem('steam_farm_has_session');
}

// Handle logout
function handleLogout() {
    sendToExtension('LOGOUT');
    handleDisconnected();
}

// Start farming selected games
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

// Stop farming
function stopFarming() {
    sendToExtension('STOP_FARMING');
    showToast('Zastavuji farmení...', 'success');
}

// Render games grid
function renderGames() {
    const grid = elements.gamesGrid;
    if (!grid) return;

    let filteredGames = [...state.games];

    // Apply filter
    switch (state.filter) {
        case 'cards':
            filteredGames = filteredGames.filter(g => state.cardsData[g.appId] > 0);
            break;
        case 'hours':
            filteredGames = filteredGames.filter(g => g.playtimeForever < 120); // Less than 2 hours
            break;
        case 'selected':
            filteredGames = filteredGames.filter(g => state.selectedGames.has(g.appId));
            break;
    }

    // Apply search
    if (state.searchQuery) {
        filteredGames = filteredGames.filter(g =>
            g.name.toLowerCase().includes(state.searchQuery)
        );
    }

    // Sort by name
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

// Toggle game selection
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

// Render farming list
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

// Remove game from farming
window.removeFarmingGame = function(appId) {
    const newList = state.farmingGames.filter(id => id !== appId);
    sendToExtension('UPDATE_FARMING', { appIds: newList });
};

// Render cards
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

// Fetch cards data
function fetchCardsData() {
    sendToExtension('GET_CARDS');
    showToast('Načítám data o kartičkách...', 'success');
}

// Update connection status
function updateConnectionStatus(status, text) {
    const statusEl = elements.connectionStatus;
    if (!statusEl) return;

    const dot = statusEl.querySelector('.status-dot');
    const textEl = statusEl.querySelector('.status-text');

    dot.className = `status-dot ${status}`;
    textEl.textContent = text;
}

// Show extension required
function showExtensionRequired() {
    elements.extensionCheck.style.display = 'block';
    elements.loginSection.style.display = 'none';
}

// Hide extension required
function hideExtensionRequired() {
    elements.extensionCheck.style.display = 'none';
}

// Show login section
function showLoginSection() {
    elements.loginSection.style.display = 'block';
    elements.accountSection.style.display = 'none';
    elements.farmingSection.style.display = 'none';
    elements.currentFarmingSection.style.display = 'none';
    elements.cardsSection.style.display = 'none';
}

// Format total hours
function formatTotalHours(games) {
    const totalMinutes = games.reduce((sum, g) => sum + (g.playtimeForever || 0), 0);
    return Math.floor(totalMinutes / 60);
}

// Load saved state
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

// Save state
function saveState() {
    try {
        localStorage.setItem('steam_farm_selected_games', JSON.stringify([...state.selectedGames]));
    } catch (e) {
        console.error('Failed to save state:', e);
    }
}

// Show toast notification
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

    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Save state when games are selected
window.addEventListener('beforeunload', saveState);

// Expose for debugging
window.steamFarmState = state;
