/**
 * CardHarvest - Background Service Worker
 * Komunikace se CardHarvest Service přes WebSocket
 *
 * v2.0.0 - WebSocket architektura (bez nutnosti Native Messaging registrace)
 */

const VERSION = '2.0.0';
const SERVICE_URL = 'ws://127.0.0.1:17532';
const STATUS_URL = 'http://127.0.0.1:17532/status';

// Reconnection settings
const INITIAL_RECONNECT_DELAY = 2000;  // 2 seconds
const MAX_RECONNECT_DELAY = 60000;     // 1 minute max
const MAX_RECONNECT_ATTEMPTS = 10;

// State
let ws = null;
let connectedTabs = new Set();
let isServiceRunning = false;
let isLoggedIn = false;
let currentUser = null;
let farmingGames = [];
let reconnectTimer = null;
let reconnectAttempts = 0;
let reconnectDelay = INITIAL_RECONNECT_DELAY;
let messageQueue = [];

// Check if service is running via HTTP
async function checkServiceStatus() {
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
            isServiceRunning = true;
            isLoggedIn = data.isLoggedIn;
            currentUser = data.username ? { personaName: data.username } : null;
            farmingGames = [];
            return data;
        }
    } catch (error) {
        // Service not running
    }
    isServiceRunning = false;
    isLoggedIn = false;
    currentUser = null;
    farmingGames = [];
    return null;
}

// Connect to WebSocket service
function connectWebSocket() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return Promise.resolve(true);
    }

    return new Promise((resolve) => {
        try {
            ws = new WebSocket(SERVICE_URL);

            ws.onopen = () => {
                console.log('[SteamFarm] WebSocket connected');
                isServiceRunning = true;

                // Reset reconnection state on successful connection
                reconnectAttempts = 0;
                reconnectDelay = INITIAL_RECONNECT_DELAY;

                // Process queued messages
                while (messageQueue.length > 0) {
                    const msg = messageQueue.shift();
                    ws.send(JSON.stringify(msg));
                }

                resolve(true);
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    handleServiceMessage(message);
                } catch (e) {
                    console.error('[SteamFarm] Failed to parse message:', e);
                }
            };

            ws.onclose = () => {
                console.log('[SteamFarm] WebSocket disconnected');
                ws = null;
                isServiceRunning = false;

                // Notify tabs about disconnection
                broadcastToTabs({
                    type: 'STEAM_FARM_SERVICE_DISCONNECTED'
                });

                // Try to reconnect with exponential backoff
                scheduleReconnect();
            };

            ws.onerror = (error) => {
                console.error('[SteamFarm] WebSocket error:', error);
                // Don't set ws to null here - let onclose handle it
                isServiceRunning = false;
                resolve(false);
            };

            // Timeout for connection
            setTimeout(() => {
                if (ws && ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                    resolve(false);
                }
            }, 3000);

        } catch (error) {
            console.error('[SteamFarm] Failed to create WebSocket:', error);
            isServiceRunning = false;
            resolve(false);
        }
    });
}

// Schedule reconnection with exponential backoff
function scheduleReconnect() {
    if (reconnectTimer) {
        return; // Already scheduled
    }

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('[SteamFarm] Max reconnect attempts reached, stopping');
        reconnectAttempts = 0;
        reconnectDelay = INITIAL_RECONNECT_DELAY;
        return;
    }

    reconnectAttempts++;
    console.log(`[SteamFarm] Scheduling reconnect attempt ${reconnectAttempts} in ${reconnectDelay}ms`);

    reconnectTimer = setTimeout(async () => {
        reconnectTimer = null;

        // First check if service is running
        const status = await checkServiceStatus();
        if (status) {
            connectWebSocket();
        } else {
            // Service not running, increase delay and try again
            reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
            scheduleReconnect();
        }
    }, reconnectDelay);
}

// Reset reconnection state (call when user manually triggers connection)
function resetReconnectState() {
    reconnectAttempts = 0;
    reconnectDelay = INITIAL_RECONNECT_DELAY;
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
}

// Handle messages from service
function handleServiceMessage(message) {
    console.log('[SteamFarm] Service message:', message);

    switch (message.type) {
        case 'CONNECTED':
            isServiceRunning = true;
            isLoggedIn = message.isLoggedIn;
            if (message.username) {
                currentUser = { personaName: message.username };
            }
            farmingGames = message.farmingGames || [];
            broadcastToTabs({
                type: 'STEAM_FARM_SERVICE_CONNECTED',
                data: message
            });
            break;

        case 'PONG':
            // Service is responsive
            isLoggedIn = message.isLoggedIn;
            if (message.username) {
                currentUser = { personaName: message.username };
            }
            farmingGames = message.farmingGames || [];
            break;

        case 'LOGIN_RESULT':
            broadcastToTabs({
                type: 'STEAM_FARM_LOGIN_RESULT',
                data: message.data,
                error: message.error
            });
            break;

        case 'STEAM_GUARD':
            broadcastToTabs({
                type: 'STEAM_FARM_STEAM_GUARD',
                data: message.data
            });
            break;

        case 'LOGGED_ON':
            isLoggedIn = true;
            currentUser = message.data;
            broadcastToTabs({
                type: 'STEAM_FARM_LOGGED_ON',
                data: message.data
            });
            break;

        case 'GAMES_LIST':
            broadcastToTabs({
                type: 'STEAM_FARM_GAMES_LIST',
                data: message.data
            });
            break;

        case 'CARDS_DATA':
            broadcastToTabs({
                type: 'STEAM_FARM_CARDS_DATA',
                data: message.data
            });
            break;

        case 'FARMING_STATUS':
            farmingGames = message.data.games || [];
            broadcastToTabs({
                type: 'STEAM_FARM_FARMING_STATUS',
                data: message.data
            });
            break;

        case 'ERROR':
            broadcastToTabs({
                type: 'STEAM_FARM_ERROR',
                error: message.error
            });
            break;

        case 'DISCONNECTED':
            isLoggedIn = false;
            currentUser = null;
            farmingGames = [];
            broadcastToTabs({
                type: 'STEAM_FARM_DISCONNECTED'
            });
            break;

        case 'VAULT_STATUS':
            broadcastToTabs({
                type: 'STEAM_FARM_VAULT_STATUS',
                data: message.data
            });
            break;

        case 'VAULT_CREATED':
            broadcastToTabs({
                type: 'STEAM_FARM_VAULT_CREATED',
                data: message.data
            });
            break;

        case 'VAULT_UNLOCKED':
            broadcastToTabs({
                type: 'STEAM_FARM_VAULT_UNLOCKED',
                data: message.data
            });
            break;

        case 'VAULT_DELETED':
            broadcastToTabs({
                type: 'STEAM_FARM_VAULT_DELETED',
                data: message.data
            });
            break;

        case 'VAULT_ERROR':
            broadcastToTabs({
                type: 'STEAM_FARM_VAULT_ERROR',
                error: message.error
            });
            break;
    }
}

// Send message to service
async function sendToService(message) {
    // First ensure we're connected
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        const connected = await connectWebSocket();
        if (!connected) {
            return false;
        }
    }

    try {
        ws.send(JSON.stringify(message));
        return true;
    } catch (error) {
        console.error('[SteamFarm] Failed to send to service:', error);
        return false;
    }
}

// Broadcast message to all connected tabs
function broadcastToTabs(message) {
    message.source = 'cardharvest-extension';
    connectedTabs.forEach(tabId => {
        chrome.tabs.sendMessage(tabId, message).catch(() => {
            connectedTabs.delete(tabId);
        });
    });
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.source !== 'cardharvest-web') return;

    const tabId = sender.tab?.id;
    if (tabId) {
        connectedTabs.add(tabId);
    }

    // Handle async operations
    (async () => {
        switch (message.type) {
            case 'STEAM_FARM_PING':
                // Check service status
                const status = await checkServiceStatus();

                sendResponse({
                    type: 'STEAM_FARM_PONG',
                    source: 'cardharvest-extension',
                    data: {
                        extensionId: chrome.runtime.id,
                        serviceRunning: isServiceRunning,
                        hasSession: isLoggedIn,
                        version: VERSION,
                        serviceVersion: status?.version
                    }
                });

                // If service is running, establish WebSocket connection
                if (isServiceRunning) {
                    connectWebSocket();
                }
                break;

            case 'STEAM_FARM_LOGIN':
                await sendToService({
                    type: 'LOGIN',
                    data: message.data
                });
                sendResponse({ success: true });
                break;

            case 'STEAM_FARM_STEAM_GUARD_CODE':
                await sendToService({
                    type: 'STEAM_GUARD_CODE',
                    data: message.data
                });
                sendResponse({ success: true });
                break;

            case 'STEAM_FARM_LOGOUT':
                await sendToService({ type: 'LOGOUT' });
                isLoggedIn = false;
                currentUser = null;
                farmingGames = [];
                sendResponse({ success: true });
                break;

            case 'STEAM_FARM_RESTORE_SESSION':
                await sendToService({ type: 'RESTORE_SESSION' });
                sendResponse({ success: true });
                break;

            case 'STEAM_FARM_CHECK_VAULT_STATUS':
                await sendToService({ type: 'CHECK_VAULT_STATUS' });
                sendResponse({ success: true });
                break;

            case 'STEAM_FARM_CREATE_VAULT':
                await sendToService({
                    type: 'CREATE_VAULT',
                    data: message.data
                });
                sendResponse({ success: true });
                break;

            case 'STEAM_FARM_UNLOCK_VAULT':
                await sendToService({
                    type: 'UNLOCK_VAULT',
                    data: message.data
                });
                sendResponse({ success: true });
                break;

            case 'STEAM_FARM_DELETE_VAULT':
                await sendToService({ type: 'DELETE_VAULT' });
                sendResponse({ success: true });
                break;

            case 'STEAM_FARM_GET_GAMES':
                await sendToService({ type: 'GET_GAMES' });
                sendResponse({ success: true });
                break;

            case 'STEAM_FARM_GET_CARDS':
                await sendToService({ type: 'GET_CARDS' });
                sendResponse({ success: true });
                break;

            case 'STEAM_FARM_START_FARMING':
                await sendToService({
                    type: 'START_FARMING',
                    data: message.data
                });
                sendResponse({ success: true });
                break;

            case 'STEAM_FARM_STOP_FARMING':
                await sendToService({ type: 'STOP_FARMING' });
                farmingGames = [];
                sendResponse({ success: true });
                break;

            case 'STEAM_FARM_UPDATE_FARMING':
                await sendToService({
                    type: 'UPDATE_FARMING',
                    data: message.data
                });
                sendResponse({ success: true });
                break;
        }
    })();

    return true; // Keep message channel open for async response
});

// Handle tab close
chrome.tabs.onRemoved.addListener((tabId) => {
    connectedTabs.delete(tabId);
});

// Initialize - try to connect to service
checkServiceStatus().then(status => {
    if (status) {
        connectWebSocket();
    }
});

console.log('[SteamFarm] Background service worker started v' + VERSION);
