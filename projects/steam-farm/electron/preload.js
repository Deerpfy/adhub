/**
 * Steam Farm - Preload Script
 * Secure bridge between main process and renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('steamFarm', {
    // Get current status
    getStatus: () => ipcRenderer.invoke('get-status'),

    // Steam authentication
    login: (credentials) => ipcRenderer.invoke('steam-login', credentials),
    loginWithToken: () => ipcRenderer.invoke('steam-login-token'),
    logout: () => ipcRenderer.invoke('steam-logout'),
    submitSteamGuard: (code) => ipcRenderer.invoke('steam-guard-code', code),

    // Games
    getGames: () => ipcRenderer.invoke('get-games'),

    // Farming
    startFarming: (appIds) => ipcRenderer.invoke('start-farming', appIds),
    stopFarming: () => ipcRenderer.invoke('stop-farming'),

    // Settings
    updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
    openDataFolder: () => ipcRenderer.invoke('open-data-folder'),

    // Event listeners
    onLoggedIn: (callback) => {
        ipcRenderer.on('steam-logged-in', (event, data) => callback(data));
    },
    onLoggedOut: (callback) => {
        ipcRenderer.on('steam-logged-out', () => callback());
    },
    onSteamGuardRequired: (callback) => {
        ipcRenderer.on('steam-guard-required', (event, data) => callback(data));
    },
    onError: (callback) => {
        ipcRenderer.on('steam-error', (event, message) => callback(message));
    },
    onDisconnected: (callback) => {
        ipcRenderer.on('steam-disconnected', (event, data) => callback(data));
    },
    onUserUpdated: (callback) => {
        ipcRenderer.on('steam-user-updated', (event, data) => callback(data));
    },
    onFarmingStatus: (callback) => {
        ipcRenderer.on('farming-status', (event, data) => callback(data));
    }
});

console.log('Steam Farm preload script loaded');
