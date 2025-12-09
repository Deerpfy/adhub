/**
 * Steam Farm - Background Service Worker
 * Komunikace mezi webem a Native Host přes Native Messaging
 */

const VERSION = '1.0.0';
const NATIVE_HOST_NAME = 'com.adhub.steamfarm';

// State
let nativePort = null;
let connectedTabs = new Set();
let isLoggedIn = false;
let currentUser = null;
let farmingGames = [];

// Connect to native host
function connectToNativeHost() {
    try {
        nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);

        nativePort.onMessage.addListener(handleNativeMessage);

        nativePort.onDisconnect.addListener(() => {
            const error = chrome.runtime.lastError;
            console.log('[SteamFarm] Native host disconnected:', error?.message);
            nativePort = null;
            isLoggedIn = false;
            currentUser = null;
            farmingGames = [];

            // Notify all tabs
            broadcastToTabs({
                type: 'STEAM_FARM_DISCONNECTED',
                error: error?.message
            });
        });

        console.log('[SteamFarm] Connected to native host');
        return true;
    } catch (error) {
        console.error('[SteamFarm] Failed to connect to native host:', error);
        nativePort = null;
        return false;
    }
}

// Handle messages from native host
function handleNativeMessage(message) {
    console.log('[SteamFarm] Native message:', message);

    switch (message.type) {
        case 'PONG':
            // Native host is responsive
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
    }
}

// Send message to native host
function sendToNativeHost(message) {
    if (!nativePort) {
        const connected = connectToNativeHost();
        if (!connected) {
            return false;
        }
    }

    try {
        nativePort.postMessage(message);
        return true;
    } catch (error) {
        console.error('[SteamFarm] Failed to send to native host:', error);
        return false;
    }
}

// Broadcast message to all connected tabs
function broadcastToTabs(message) {
    message.source = 'steam-farm-extension';
    connectedTabs.forEach(tabId => {
        chrome.tabs.sendMessage(tabId, message).catch(() => {
            connectedTabs.delete(tabId);
        });
    });
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.source !== 'steam-farm-web') return;

    const tabId = sender.tab?.id;
    if (tabId) {
        connectedTabs.add(tabId);
    }

    switch (message.type) {
        case 'STEAM_FARM_PING':
            // Check native host connection
            if (!nativePort) {
                connectToNativeHost();
            }

            sendResponse({
                type: 'STEAM_FARM_PONG',
                source: 'steam-farm-extension',
                data: {
                    extensionId: chrome.runtime.id,
                    nativeHostConnected: !!nativePort,
                    hasSession: isLoggedIn,
                    version: VERSION
                }
            });
            break;

        case 'STEAM_FARM_LOGIN':
            sendToNativeHost({
                type: 'LOGIN',
                data: message.data
            });
            sendResponse({ success: true });
            break;

        case 'STEAM_FARM_STEAM_GUARD_CODE':
            sendToNativeHost({
                type: 'STEAM_GUARD_CODE',
                data: message.data
            });
            sendResponse({ success: true });
            break;

        case 'STEAM_FARM_LOGOUT':
            sendToNativeHost({ type: 'LOGOUT' });
            isLoggedIn = false;
            currentUser = null;
            farmingGames = [];
            sendResponse({ success: true });
            break;

        case 'STEAM_FARM_RESTORE_SESSION':
            sendToNativeHost({ type: 'RESTORE_SESSION' });
            sendResponse({ success: true });
            break;

        case 'STEAM_FARM_GET_GAMES':
            sendToNativeHost({ type: 'GET_GAMES' });
            sendResponse({ success: true });
            break;

        case 'STEAM_FARM_GET_CARDS':
            sendToNativeHost({ type: 'GET_CARDS' });
            sendResponse({ success: true });
            break;

        case 'STEAM_FARM_START_FARMING':
            sendToNativeHost({
                type: 'START_FARMING',
                data: message.data
            });
            sendResponse({ success: true });
            break;

        case 'STEAM_FARM_STOP_FARMING':
            sendToNativeHost({ type: 'STOP_FARMING' });
            farmingGames = [];
            sendResponse({ success: true });
            break;

        case 'STEAM_FARM_UPDATE_FARMING':
            sendToNativeHost({
                type: 'UPDATE_FARMING',
                data: message.data
            });
            sendResponse({ success: true });
            break;
    }

    return true; // Keep message channel open for async response
});

// Handle tab close
chrome.tabs.onRemoved.addListener((tabId) => {
    connectedTabs.delete(tabId);
});

// Initialize connection on startup
connectToNativeHost();

console.log('[SteamFarm] Background service worker started v' + VERSION);
