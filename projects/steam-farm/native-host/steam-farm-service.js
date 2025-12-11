#!/usr/bin/env node
/**
 * Steam Farm - WebSocket Service
 * Komunikace se Steam přes steam-user knihovnu
 *
 * Tento service poslouchá na localhost:17532 a poskytuje WebSocket API
 * pro komunikaci s Chrome extensionem bez nutnosti Native Messaging registrace.
 *
 * Bezpečnost: Refresh token je šifrován pomocí AES-256-GCM
 * s klíčem odvozeným z uživatelského hesla přes Argon2id
 */

const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const argon2 = require('argon2-browser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const VERSION = '2.0.0';
const PORT = 17532;
const HOST = '127.0.0.1';

// Data directory
const DATA_DIR = path.join(process.env.APPDATA || process.env.HOME, '.adhub-steam-farm');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// File paths
const SESSION_FILE = path.join(DATA_DIR, 'session.vault');
const VAULT_FILE = path.join(DATA_DIR, 'vault.json');
const LOG_FILE = path.join(DATA_DIR, 'service.log');
const PID_FILE = path.join(DATA_DIR, 'service.pid');

// Encryption constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Argon2 options (secure defaults)
const ARGON2_OPTIONS = {
    type: argon2.ArgonType.Argon2id,
    mem: 65536,             // 64 MB
    time: 3,                // 3 iterations
    parallelism: 4,         // 4 threads
    hashLen: 32             // 256-bit key
};

// State
let client = null;
let isLoggedIn = false;
let currentUser = null;
let farmingGames = [];
let steamGuardCallback = null;
let ownedGames = [];
let cardsData = {};

// Vault state
let vaultUnlocked = false;
let derivedKey = null;
let pendingRefreshToken = null;

// WebSocket connections
let wsConnections = new Set();

// Logging
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logMessage);
    console.log(`[${timestamp}] ${message}`);
}

// ===========================================
// ENCRYPTION FUNCTIONS
// ===========================================

/**
 * Derive encryption key from password using Argon2id
 */
async function deriveKey(password, salt) {
    const result = await argon2.hash({
        pass: password,
        salt: salt,
        ...ARGON2_OPTIONS
    });
    return Buffer.from(result.hash);
}

/**
 * Encrypt data using AES-256-GCM
 */
function encrypt(data, key) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        data: encrypted
    };
}

/**
 * Decrypt data using AES-256-GCM
 */
function decrypt(encryptedData, key) {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
}

/**
 * Hash password for verification (stored separately from encryption key)
 * Returns object with salt and hash for later verification
 */
async function hashPassword(password) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const result = await argon2.hash({
        pass: password,
        salt: salt,
        ...ARGON2_OPTIONS
    });
    return {
        salt: salt.toString('hex'),
        hash: result.hashHex
    };
}

/**
 * Verify password against stored hash
 */
async function verifyPassword(password, storedData) {
    const salt = Buffer.from(storedData.salt, 'hex');
    const result = await argon2.hash({
        pass: password,
        salt: salt,
        ...ARGON2_OPTIONS
    });
    return result.hashHex === storedData.hash;
}

// ===========================================
// VAULT FUNCTIONS
// ===========================================

/**
 * Check if vault exists
 */
function vaultExists() {
    return fs.existsSync(VAULT_FILE);
}

/**
 * Create new vault with password
 */
async function createVault(password) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const passwordHash = await hashPassword(password);

    // Derive encryption key
    derivedKey = await deriveKey(password, salt);

    // Save vault metadata
    const vaultData = {
        salt: salt.toString('hex'),
        passwordHash: passwordHash,
        createdAt: Date.now(),
        version: VERSION
    };

    fs.writeFileSync(VAULT_FILE, JSON.stringify(vaultData, null, 2));
    vaultUnlocked = true;

    log('Vault created');
    return true;
}

/**
 * Unlock existing vault with password
 */
async function unlockVault(password) {
    if (!vaultExists()) {
        throw new Error('Vault does not exist');
    }

    const vaultData = JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8'));

    // Verify password
    const isValid = await verifyPassword(password, vaultData.passwordHash);
    if (!isValid) {
        throw new Error('Invalid password');
    }

    // Derive encryption key
    const salt = Buffer.from(vaultData.salt, 'hex');
    derivedKey = await deriveKey(password, salt);
    vaultUnlocked = true;

    log('Vault unlocked');
    return true;
}

/**
 * Delete vault and all session data
 */
function deleteVault() {
    vaultUnlocked = false;
    derivedKey = null;

    try {
        if (fs.existsSync(VAULT_FILE)) {
            fs.unlinkSync(VAULT_FILE);
        }
        if (fs.existsSync(SESSION_FILE)) {
            fs.unlinkSync(SESSION_FILE);
        }
        log('Vault deleted');
        return true;
    } catch (e) {
        log(`Error deleting vault: ${e.message}`);
        return false;
    }
}

// ===========================================
// SESSION FUNCTIONS (ENCRYPTED)
// ===========================================

/**
 * Save encrypted session
 */
function saveSession(refreshToken) {
    if (!vaultUnlocked || !derivedKey) {
        log('Cannot save session: vault is locked');
        pendingRefreshToken = refreshToken;
        return false;
    }

    try {
        const sessionData = {
            refreshToken: refreshToken,
            timestamp: Date.now()
        };

        const encrypted = encrypt(sessionData, derivedKey);
        fs.writeFileSync(SESSION_FILE, JSON.stringify(encrypted));

        log('Session saved (encrypted)');
        pendingRefreshToken = null;
        return true;
    } catch (e) {
        log(`Error saving session: ${e.message}`);
        return false;
    }
}

/**
 * Load and decrypt session
 */
function loadSession() {
    if (!vaultUnlocked || !derivedKey) {
        log('Cannot load session: vault is locked');
        return null;
    }

    try {
        if (!fs.existsSync(SESSION_FILE)) {
            return null;
        }

        const encrypted = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
        const sessionData = decrypt(encrypted, derivedKey);

        // Check if session is not too old (200 days max)
        if (Date.now() - sessionData.timestamp < 200 * 24 * 60 * 60 * 1000) {
            return sessionData.refreshToken;
        }

        log('Session expired');
        return null;
    } catch (e) {
        log(`Error loading session: ${e.message}`);
        return null;
    }
}

/**
 * Check if encrypted session exists
 */
function sessionExists() {
    return fs.existsSync(SESSION_FILE);
}

// ===========================================
// WEBSOCKET BROADCAST
// ===========================================

function broadcast(message) {
    const data = JSON.stringify(message);
    wsConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    });
}

// ===========================================
// STEAM CLIENT
// ===========================================

function initSteamClient() {
    if (client) {
        client.logOff();
    }

    client = new SteamUser({
        autoRelogin: true,
        enablePicsCache: true,
        dataDirectory: DATA_DIR
    });

    client.on('loggedOn', () => {
        log('Logged on to Steam');
        isLoggedIn = true;
        currentUser = {
            steamID: client.steamID.toString(),
            username: client.accountInfo?.name,
            personaName: client.accountInfo?.name
        };

        broadcast({
            type: 'LOGGED_ON',
            data: currentUser
        });

        client.setPersona(SteamUser.EPersonaState.Online);
    });

    client.on('steamGuard', (domain, callback, lastCodeWrong) => {
        log(`Steam Guard requested (domain: ${domain}, lastCodeWrong: ${lastCodeWrong})`);
        steamGuardCallback = callback;

        broadcast({
            type: 'STEAM_GUARD',
            data: { domain, lastCodeWrong }
        });
    });

    client.on('error', (err) => {
        log(`Steam error: ${err.message}`);
        isLoggedIn = false;

        broadcast({
            type: 'ERROR',
            error: err.message
        });
    });

    client.on('disconnected', (eresult, msg) => {
        log(`Disconnected: ${msg} (${eresult})`);
        isLoggedIn = false;
        currentUser = null;
        farmingGames = [];

        broadcast({
            type: 'DISCONNECTED',
            data: { eresult, message: msg }
        });
    });

    client.on('accountInfo', (name) => {
        log(`Account info: ${name}`);
        if (currentUser) {
            currentUser.personaName = name;
        }
    });

    client.on('licenses', (licenses) => {
        log(`Received ${licenses.length} licenses`);
    });

    client.on('appOwnershipCached', () => {
        log('App ownership cached');
    });

    client.on('refreshToken', (token) => {
        log('Received refresh token');
        if (vaultUnlocked && derivedKey) {
            saveSession(token);
        } else {
            // Store temporarily until vault is unlocked
            pendingRefreshToken = token;
            log('Refresh token stored pending vault unlock');
        }
    });
}

// ===========================================
// MESSAGE HANDLERS
// ===========================================

async function handleCheckVaultStatus(ws) {
    ws.send(JSON.stringify({
        type: 'VAULT_STATUS',
        data: {
            exists: vaultExists(),
            unlocked: vaultUnlocked,
            hasSession: sessionExists()
        }
    }));
}

async function handleCreateVault(ws, data) {
    const { password } = data;

    if (!password || password.length < 4) {
        ws.send(JSON.stringify({
            type: 'VAULT_ERROR',
            error: 'Heslo musí mít alespoň 4 znaky'
        }));
        return;
    }

    try {
        await createVault(password);

        // If we have pending refresh token, save it now
        if (pendingRefreshToken) {
            saveSession(pendingRefreshToken);
        }

        ws.send(JSON.stringify({
            type: 'VAULT_CREATED',
            data: { success: true }
        }));
    } catch (e) {
        log(`Error creating vault: ${e.message}`);
        ws.send(JSON.stringify({
            type: 'VAULT_ERROR',
            error: e.message
        }));
    }
}

async function handleUnlockVault(ws, data) {
    const { password } = data;

    try {
        await unlockVault(password);

        // If we have pending refresh token, save it now
        if (pendingRefreshToken) {
            saveSession(pendingRefreshToken);
        }

        ws.send(JSON.stringify({
            type: 'VAULT_UNLOCKED',
            data: {
                success: true,
                hasSession: sessionExists()
            }
        }));
    } catch (e) {
        log(`Error unlocking vault: ${e.message}`);
        ws.send(JSON.stringify({
            type: 'VAULT_ERROR',
            error: e.message === 'Invalid password' ? 'Nesprávné heslo' : e.message
        }));
    }
}

async function handleDeleteVault(ws) {
    // Logout first if logged in
    if (client && isLoggedIn) {
        client.logOff();
    }
    isLoggedIn = false;
    currentUser = null;
    farmingGames = [];

    const success = deleteVault();

    ws.send(JSON.stringify({
        type: 'VAULT_DELETED',
        data: { success }
    }));
}

async function handleLogin(ws, data) {
    const { username, password, sharedSecret } = data;

    if (!vaultUnlocked) {
        ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'Vault is locked. Please unlock first.'
        }));
        return;
    }

    initSteamClient();

    const loginOptions = {
        accountName: username,
        password: password
    };

    if (sharedSecret) {
        try {
            loginOptions.twoFactorCode = SteamTotp.generateAuthCode(sharedSecret);
        } catch (e) {
            log(`Error generating TOTP: ${e.message}`);
        }
    }

    client.logOn(loginOptions);

    ws.send(JSON.stringify({
        type: 'LOGIN_RESULT',
        data: { success: true, message: 'Přihlašování...' }
    }));
}

function handleSteamGuardCode(ws, data) {
    const { code } = data;

    if (steamGuardCallback) {
        steamGuardCallback(code);
        steamGuardCallback = null;
    } else {
        ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'Steam Guard callback not available'
        }));
    }
}

function handleLogout(ws) {
    if (client) {
        client.logOff();
    }
    isLoggedIn = false;
    currentUser = null;
    farmingGames = [];

    // Delete encrypted session
    try {
        if (fs.existsSync(SESSION_FILE)) {
            fs.unlinkSync(SESSION_FILE);
        }
    } catch (e) {
        log(`Error deleting session: ${e.message}`);
    }

    ws.send(JSON.stringify({
        type: 'DISCONNECTED'
    }));
}

async function handleRestoreSession(ws) {
    if (!vaultUnlocked) {
        ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'Vault is locked'
        }));
        return;
    }

    const refreshToken = loadSession();

    if (!refreshToken) {
        ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'No saved session'
        }));
        return;
    }

    initSteamClient();
    client.logOn({ refreshToken });
}

async function handleGetGames(ws) {
    if (!isLoggedIn || !client) {
        ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'Not logged in'
        }));
        return;
    }

    try {
        const result = await client.getUserOwnedApps(client.steamID);
        ownedGames = result.apps.map(app => ({
            appId: app.appid,
            name: app.name,
            playtimeForever: app.playtime_forever || 0,
            playtime2Weeks: app.playtime_2weeks || 0,
            iconUrl: app.img_icon_url
        }));

        log(`Fetched ${ownedGames.length} games`);

        broadcast({
            type: 'GAMES_LIST',
            data: { games: ownedGames }
        });
    } catch (e) {
        log(`Error fetching games: ${e.message}`);
        ws.send(JSON.stringify({
            type: 'ERROR',
            error: `Failed to fetch games: ${e.message}`
        }));
    }
}

async function handleGetCards(ws) {
    const gamesWithCards = {};

    for (const game of ownedGames) {
        if (game.playtimeForever < 120) {
            gamesWithCards[game.appId] = 3;
        }
    }

    cardsData = gamesWithCards;

    broadcast({
        type: 'CARDS_DATA',
        data: { cards: cardsData }
    });
}

function handleStartFarming(ws, data) {
    const { appIds } = data;

    if (!isLoggedIn || !client) {
        ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'Not logged in'
        }));
        return;
    }

    const gamesToFarm = appIds.slice(0, 32);
    farmingGames = gamesToFarm;

    client.gamesPlayed(gamesToFarm);

    log(`Started farming ${gamesToFarm.length} games`);

    broadcast({
        type: 'FARMING_STATUS',
        data: { games: farmingGames }
    });
}

function handleStopFarming(ws) {
    farmingGames = [];
    if (client) {
        client.gamesPlayed([]);
    }

    log('Stopped farming');

    broadcast({
        type: 'FARMING_STATUS',
        data: { games: [] }
    });
}

function handleUpdateFarming(ws, data) {
    handleStartFarming(ws, data);
}

// ===========================================
// MAIN MESSAGE HANDLER
// ===========================================

async function handleMessage(ws, message) {
    log(`Received: ${message.type}`);

    switch (message.type) {
        case 'PING':
            ws.send(JSON.stringify({
                type: 'PONG',
                version: VERSION,
                isLoggedIn,
                username: currentUser?.personaName,
                farmingGames,
                vaultExists: vaultExists(),
                vaultUnlocked
            }));
            break;

        case 'CHECK_VAULT_STATUS':
            await handleCheckVaultStatus(ws);
            break;

        case 'CREATE_VAULT':
            await handleCreateVault(ws, message.data);
            break;

        case 'UNLOCK_VAULT':
            await handleUnlockVault(ws, message.data);
            break;

        case 'DELETE_VAULT':
            await handleDeleteVault(ws);
            break;

        case 'LOGIN':
            await handleLogin(ws, message.data);
            break;

        case 'STEAM_GUARD_CODE':
            handleSteamGuardCode(ws, message.data);
            break;

        case 'LOGOUT':
            handleLogout(ws);
            break;

        case 'RESTORE_SESSION':
            await handleRestoreSession(ws);
            break;

        case 'GET_GAMES':
            await handleGetGames(ws);
            break;

        case 'GET_CARDS':
            await handleGetCards(ws);
            break;

        case 'START_FARMING':
            handleStartFarming(ws, message.data);
            break;

        case 'STOP_FARMING':
            handleStopFarming(ws);
            break;

        case 'UPDATE_FARMING':
            handleUpdateFarming(ws, message.data);
            break;

        default:
            log(`Unknown message type: ${message.type}`);
    }
}

// ===========================================
// HTTP SERVER FOR STATUS CHECK
// ===========================================

const httpServer = http.createServer((req, res) => {
    // CORS headers for browser access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            running: true,
            version: VERSION,
            isLoggedIn,
            username: currentUser?.personaName,
            farmingCount: farmingGames.length,
            vaultExists: vaultExists(),
            vaultUnlocked
        }));
    } else if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// ===========================================
// WEBSOCKET SERVER
// ===========================================

const wss = new WebSocket.Server({ server: httpServer });

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;

    // Only allow localhost connections
    if (clientIp !== '127.0.0.1' && clientIp !== '::1' && clientIp !== '::ffff:127.0.0.1') {
        log(`Rejected connection from non-localhost: ${clientIp}`);
        ws.close(1008, 'Only localhost connections allowed');
        return;
    }

    log(`WebSocket client connected from ${clientIp}`);
    wsConnections.add(ws);

    // Send initial status
    ws.send(JSON.stringify({
        type: 'CONNECTED',
        version: VERSION,
        isLoggedIn,
        username: currentUser?.personaName,
        farmingGames,
        vaultExists: vaultExists(),
        vaultUnlocked
    }));

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            await handleMessage(ws, message);
        } catch (e) {
            log(`Error parsing message: ${e.message}`);
            ws.send(JSON.stringify({
                type: 'ERROR',
                error: 'Invalid message format'
            }));
        }
    });

    ws.on('close', () => {
        log('WebSocket client disconnected');
        wsConnections.delete(ws);
    });

    ws.on('error', (error) => {
        log(`WebSocket error: ${error.message}`);
        wsConnections.delete(ws);
    });
});

// ===========================================
// MAIN
// ===========================================

function checkAlreadyRunning() {
    if (fs.existsSync(PID_FILE)) {
        try {
            const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
            // Check if process is running
            process.kill(pid, 0);
            return true;
        } catch (e) {
            // Process not running, remove stale PID file
            fs.unlinkSync(PID_FILE);
        }
    }
    return false;
}

function savePidFile() {
    fs.writeFileSync(PID_FILE, process.pid.toString());
}

function removePidFile() {
    try {
        if (fs.existsSync(PID_FILE)) {
            fs.unlinkSync(PID_FILE);
        }
    } catch (e) {
        // Ignore
    }
}

function startServer() {
    if (checkAlreadyRunning()) {
        console.log(`Steam Farm Service is already running.`);
        console.log(`If this is incorrect, delete ${PID_FILE} and try again.`);
        process.exit(1);
    }

    savePidFile();

    httpServer.listen(PORT, HOST, () => {
        log(`Steam Farm Service v${VERSION} started`);
        log(`HTTP/WebSocket server listening on ws://${HOST}:${PORT}`);
        log(`Status endpoint: http://${HOST}:${PORT}/status`);
        console.log(`\nSteam Farm Service v${VERSION}`);
        console.log(`WebSocket: ws://${HOST}:${PORT}`);
        console.log(`Status: http://${HOST}:${PORT}/status`);
        console.log(`\nService is running. Press Ctrl+C to stop.`);
    });

    httpServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            log(`Port ${PORT} is already in use. Service may already be running.`);
            console.error(`\nError: Port ${PORT} is already in use.`);
            console.error(`Steam Farm Service may already be running.`);
            removePidFile();
            process.exit(1);
        }
        log(`Server error: ${err.message}`);
        console.error(`Server error: ${err.message}`);
    });
}

// Cleanup on exit
process.on('exit', () => {
    log('Service stopping');
    removePidFile();
    if (client) {
        client.logOff();
    }
});

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down...');
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    log(`Uncaught exception: ${err.message}`);
    console.error('Uncaught exception:', err);
    process.exit(1);
});

// Start the server
startServer();
