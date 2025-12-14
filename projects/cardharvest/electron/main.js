/**
 * CardHarvest - Electron Main Process
 * AdHUB Project
 *
 * Tato aplikace běží na pozadí v system tray a komunikuje se Steam.
 * Uživatel stáhne pouze tuto aplikaci - žádný plugin ani service není potřeba.
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const crypto = require('crypto');
const AutoLaunch = require('auto-launch');

// ============================================
// CONSTANTS
// ============================================

const VERSION = '3.0.0';
const APP_NAME = 'CardHarvest';

// Data directory
const DATA_DIR = path.join(app.getPath('userData'), 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// File paths
const SESSION_FILE = path.join(DATA_DIR, 'session.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const LOG_FILE = path.join(DATA_DIR, 'app.log');

// ============================================
// LOGGING
// ============================================

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    try {
        fs.appendFileSync(LOG_FILE, logMessage + '\n');
    } catch (e) {
        // Ignore
    }
}

// ============================================
// AUTO LAUNCH
// ============================================

const autoLauncher = new AutoLaunch({
    name: APP_NAME,
    path: app.getPath('exe')
});

async function setAutoLaunch(enabled) {
    try {
        if (enabled) {
            await autoLauncher.enable();
            log('Auto-launch enabled');
        } else {
            await autoLauncher.disable();
            log('Auto-launch disabled');
        }
        saveSettings({ autoLaunch: enabled });
    } catch (e) {
        log(`Auto-launch error: ${e.message}`);
    }
}

// ============================================
// SETTINGS
// ============================================

let settings = {
    autoLaunch: true,
    minimizeToTray: true,
    startMinimized: false
};

function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            settings = { ...settings, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) };
        }
    } catch (e) {
        log(`Error loading settings: ${e.message}`);
    }
    return settings;
}

function saveSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    } catch (e) {
        log(`Error saving settings: ${e.message}`);
    }
}

// ============================================
// STEAM CLIENT
// ============================================

let steamClient = null;
let isLoggedIn = false;
let currentUser = null;
let farmingGames = [];
let ownedGames = [];
let steamGuardCallback = null;

function initSteamClient() {
    if (steamClient) {
        try {
            steamClient.logOff();
        } catch (e) {}
    }

    steamClient = new SteamUser({
        autoRelogin: true,
        enablePicsCache: true,
        dataDirectory: DATA_DIR
    });

    steamClient.on('loggedOn', () => {
        log('Logged on to Steam');
        isLoggedIn = true;
        currentUser = {
            steamID: steamClient.steamID.toString(),
            personaName: steamClient.accountInfo?.name || 'User'
        };
        steamClient.setPersona(SteamUser.EPersonaState.Online);
        sendToRenderer('steam-logged-in', currentUser);
    });

    steamClient.on('steamGuard', (domain, callback, lastCodeWrong) => {
        log(`Steam Guard requested (domain: ${domain})`);
        steamGuardCallback = callback;
        sendToRenderer('steam-guard-required', { domain, lastCodeWrong });
    });

    steamClient.on('error', (err) => {
        log(`Steam error: ${err.message}`);
        isLoggedIn = false;
        sendToRenderer('steam-error', err.message);
    });

    steamClient.on('disconnected', (eresult, msg) => {
        log(`Steam disconnected: ${msg}`);
        isLoggedIn = false;
        currentUser = null;
        farmingGames = [];
        sendToRenderer('steam-disconnected', { eresult, message: msg });
    });

    steamClient.on('refreshToken', (token) => {
        log('Received refresh token');
        saveSession({ refreshToken: token, timestamp: Date.now() });
    });

    steamClient.on('accountInfo', (name) => {
        if (currentUser) {
            currentUser.personaName = name;
            sendToRenderer('steam-user-updated', currentUser);
        }
    });
}

// ============================================
// SESSION MANAGEMENT
// ============================================

function saveSession(data) {
    try {
        fs.writeFileSync(SESSION_FILE, JSON.stringify(data));
        log('Session saved');
    } catch (e) {
        log(`Error saving session: ${e.message}`);
    }
}

function loadSession() {
    try {
        if (fs.existsSync(SESSION_FILE)) {
            const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
            // Check if session is not too old (200 days)
            if (Date.now() - data.timestamp < 200 * 24 * 60 * 60 * 1000) {
                return data.refreshToken;
            }
        }
    } catch (e) {
        log(`Error loading session: ${e.message}`);
    }
    return null;
}

function deleteSession() {
    try {
        if (fs.existsSync(SESSION_FILE)) {
            fs.unlinkSync(SESSION_FILE);
        }
    } catch (e) {}
}

// ============================================
// STEAM ACTIONS
// ============================================

async function steamLogin(username, password, sharedSecret) {
    initSteamClient();

    const loginOptions = {
        accountName: username,
        password: password
    };

    if (sharedSecret) {
        try {
            loginOptions.twoFactorCode = SteamTotp.generateAuthCode(sharedSecret);
        } catch (e) {
            log(`TOTP error: ${e.message}`);
        }
    }

    steamClient.logOn(loginOptions);
}

function steamLoginWithToken() {
    const token = loadSession();
    if (token) {
        initSteamClient();
        steamClient.logOn({ refreshToken: token });
        return true;
    }
    return false;
}

function steamLogout() {
    if (steamClient) {
        steamClient.logOff();
    }
    isLoggedIn = false;
    currentUser = null;
    farmingGames = [];
    deleteSession();
    sendToRenderer('steam-logged-out');
}

function submitSteamGuard(code) {
    if (steamGuardCallback) {
        steamGuardCallback(code);
        steamGuardCallback = null;
    }
}

async function getOwnedGames() {
    if (!isLoggedIn || !steamClient) {
        return [];
    }

    try {
        const result = await steamClient.getUserOwnedApps(steamClient.steamID, {
            includePlayedFreeGames: true,
            includeFreeSub: true,
            includeExtendedAppInfo: true
        });

        ownedGames = result.apps.map(app => ({
            appId: app.appid,
            name: app.name,
            playtimeForever: app.playtime_forever || 0,
            playtime2Weeks: app.playtime_2weeks || 0,
            iconUrl: app.img_icon_url
        }));

        log(`Fetched ${ownedGames.length} games`);
        return ownedGames;
    } catch (e) {
        log(`Error fetching games: ${e.message}`);
        return [];
    }
}

function startFarming(appIds) {
    if (!isLoggedIn || !steamClient) return false;

    const gamesToFarm = appIds.slice(0, 32);
    farmingGames = gamesToFarm;
    steamClient.gamesPlayed(gamesToFarm);
    log(`Started farming ${gamesToFarm.length} games`);
    sendToRenderer('farming-status', { games: farmingGames });
    return true;
}

function stopFarming() {
    farmingGames = [];
    if (steamClient) {
        steamClient.gamesPlayed([]);
    }
    log('Stopped farming');
    sendToRenderer('farming-status', { games: [] });
}

// ============================================
// WINDOW MANAGEMENT
// ============================================

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        show: !settings.startMinimized,
        backgroundColor: '#0a0a0f'
    });

    // Load the renderer HTML
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    mainWindow.on('close', (event) => {
        if (!isQuitting && settings.minimizeToTray) {
            event.preventDefault();
            mainWindow.hide();
            return false;
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

function createTray() {
    // Create tray icon - try PNG first, then create programmatically
    const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
    let trayIcon;

    if (fs.existsSync(iconPath)) {
        trayIcon = nativeImage.createFromPath(iconPath);
    } else {
        // Create a simple 16x16 icon programmatically (purple gamepad)
        // Base64 encoded 16x16 PNG
        const iconData = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADQSURBVDiNpZMxDoJAEEX/LBZWNhyBI9hQeARuwBG4AUfgBhzBI1jYWFrYAAUJ7Fjs4hKWkPiTSTaZ+TPz/iwMIiLYIwYA+v7lWesaAIhoc0REEBH8P3z/g1dkIiJYa2GthbUWSilYa+8Zn4QBXdchz3NkWQYiQp7n6LoOfd9fMwYQrLVwzqHrOgghYIyBMQZSSjjnrq8Y0DQNPM+DMQZKKWitkaYp6rq+nhkg13UNIoIQAkIISCnRNA2ICG3bni8Z0LYNY4yPv1JKxHF8Pgbgl1/wAhMfhZb3pgAAAABJRU5ErkJggg==';
        trayIcon = nativeImage.createFromDataURL(`data:image/png;base64,${iconData}`);
    }

    // Resize for different platforms
    if (process.platform === 'darwin') {
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
    }

    tray = new Tray(trayIcon);
    tray.setToolTip(`${APP_NAME} v${VERSION}`);

    updateTrayMenu();

    tray.on('double-click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

function updateTrayMenu() {
    const statusText = isLoggedIn
        ? `Přihlášen: ${currentUser?.personaName || 'User'}`
        : 'Nepřihlášen';

    const farmingText = farmingGames.length > 0
        ? `Farmí: ${farmingGames.length} her`
        : 'Neaktivní';

    const contextMenu = Menu.buildFromTemplate([
        { label: `${APP_NAME} v${VERSION}`, enabled: false },
        { type: 'separator' },
        { label: statusText, enabled: false },
        { label: farmingText, enabled: false },
        { type: 'separator' },
        {
            label: 'Otevřít',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Spouštět při startu',
            type: 'checkbox',
            checked: settings.autoLaunch,
            click: (menuItem) => setAutoLaunch(menuItem.checked)
        },
        { type: 'separator' },
        {
            label: 'Ukončit',
            click: () => {
                isQuitting = true;
                if (steamClient) {
                    steamClient.logOff();
                }
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
}

// ============================================
// IPC COMMUNICATION
// ============================================

function sendToRenderer(channel, data) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(channel, data);
    }
}

// IPC Handlers
ipcMain.handle('get-status', () => ({
    version: VERSION,
    isLoggedIn,
    user: currentUser,
    farmingGames,
    settings
}));

ipcMain.handle('steam-login', async (event, { username, password, sharedSecret }) => {
    await steamLogin(username, password, sharedSecret);
    return { success: true };
});

ipcMain.handle('steam-login-token', () => {
    return steamLoginWithToken();
});

ipcMain.handle('steam-logout', () => {
    steamLogout();
    return { success: true };
});

ipcMain.handle('steam-guard-code', (event, code) => {
    submitSteamGuard(code);
    return { success: true };
});

ipcMain.handle('get-games', async () => {
    return await getOwnedGames();
});

ipcMain.handle('start-farming', (event, appIds) => {
    return startFarming(appIds);
});

ipcMain.handle('stop-farming', () => {
    stopFarming();
    return { success: true };
});

ipcMain.handle('update-settings', (event, newSettings) => {
    saveSettings(newSettings);
    if (newSettings.autoLaunch !== undefined) {
        setAutoLaunch(newSettings.autoLaunch);
    }
    return settings;
});

ipcMain.handle('open-data-folder', () => {
    shell.openPath(DATA_DIR);
});

// ============================================
// APP LIFECYCLE
// ============================================

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });

    app.whenReady().then(async () => {
        log(`${APP_NAME} v${VERSION} starting...`);

        loadSettings();

        // Enable auto-launch on first run
        const isFirstRun = !fs.existsSync(SETTINGS_FILE);
        if (isFirstRun) {
            await setAutoLaunch(true);
        }

        createTray();
        createWindow();

        // Try to restore session
        const hasSession = steamLoginWithToken();
        if (hasSession) {
            log('Attempting to restore session...');
        }

        // Update tray periodically
        setInterval(updateTrayMenu, 5000);
    });

    app.on('window-all-closed', () => {
        // Don't quit on macOS
        if (process.platform !== 'darwin') {
            // Keep running in tray
        }
    });

    app.on('activate', () => {
        if (mainWindow === null) {
            createWindow();
        } else {
            mainWindow.show();
        }
    });

    app.on('before-quit', () => {
        isQuitting = true;
        if (steamClient) {
            steamClient.logOff();
        }
    });
}
