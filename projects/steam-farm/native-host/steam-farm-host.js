#!/usr/bin/env node
/**
 * Steam Farm - Native Messaging Host
 * Komunikace se Steam přes steam-user knihovnu
 *
 * Bezpečnost: Refresh token je šifrován pomocí AES-256-GCM
 * s klíčem odvozeným z uživatelského hesla přes Argon2id
 *
 * Chrome Native Messaging používá stdin/stdout s délkovým prefixem (32-bit little-endian)
 */

const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const argon2 = require('argon2');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const VERSION = '1.1.0';

// Data directory
const DATA_DIR = path.join(process.env.APPDATA || process.env.HOME, '.adhub-steam-farm');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// File paths
const SESSION_FILE = path.join(DATA_DIR, 'session.vault');
const VAULT_FILE = path.join(DATA_DIR, 'vault.json');
const LOG_FILE = path.join(DATA_DIR, 'host.log');

// Encryption constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Argon2 options (secure defaults)
const ARGON2_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 65536,      // 64 MB
    timeCost: 3,            // 3 iterations
    parallelism: 4,         // 4 threads
    hashLength: 32          // 256-bit key
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

// Logging
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logMessage);
}

// ===========================================
// ENCRYPTION FUNCTIONS
// ===========================================

/**
 * Derive encryption key from password using Argon2id
 */
async function deriveKey(password, salt) {
    const hash = await argon2.hash(password, {
        ...ARGON2_OPTIONS,
        salt: salt,
        raw: true
    });
    return hash;
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
 */
async function hashPassword(password) {
    return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4
    });
}

/**
 * Verify password against stored hash
 */
async function verifyPassword(password, hash) {
    return await argon2.verify(hash, password);
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
// NATIVE MESSAGING
// ===========================================

function readMessage() {
    return new Promise((resolve) => {
        let buffer = Buffer.alloc(0);

        const onData = (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);

            if (buffer.length < 4) return;

            const messageLength = buffer.readUInt32LE(0);

            if (buffer.length < 4 + messageLength) return;

            const messageBuffer = buffer.slice(4, 4 + messageLength);
            buffer = buffer.slice(4 + messageLength);

            process.stdin.removeListener('data', onData);

            try {
                const message = JSON.parse(messageBuffer.toString());
                resolve(message);
            } catch (e) {
                log(`Error parsing message: ${e.message}`);
                resolve(null);
            }
        };

        process.stdin.on('data', onData);
    });
}

function sendMessage(message) {
    const messageStr = JSON.stringify(message);
    const messageBuffer = Buffer.from(messageStr);
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(messageBuffer.length, 0);

    process.stdout.write(lengthBuffer);
    process.stdout.write(messageBuffer);
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

        sendMessage({
            type: 'LOGGED_ON',
            data: currentUser
        });

        client.setPersona(SteamUser.EPersonaState.Online);
    });

    client.on('steamGuard', (domain, callback, lastCodeWrong) => {
        log(`Steam Guard requested (domain: ${domain}, lastCodeWrong: ${lastCodeWrong})`);
        steamGuardCallback = callback;

        sendMessage({
            type: 'STEAM_GUARD',
            data: { domain, lastCodeWrong }
        });
    });

    client.on('error', (err) => {
        log(`Steam error: ${err.message}`);
        isLoggedIn = false;

        sendMessage({
            type: 'ERROR',
            error: err.message
        });
    });

    client.on('disconnected', (eresult, msg) => {
        log(`Disconnected: ${msg} (${eresult})`);
        isLoggedIn = false;
        currentUser = null;
        farmingGames = [];

        sendMessage({
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

async function handleCheckVaultStatus() {
    sendMessage({
        type: 'VAULT_STATUS',
        data: {
            exists: vaultExists(),
            unlocked: vaultUnlocked,
            hasSession: sessionExists()
        }
    });
}

async function handleCreateVault(data) {
    const { password } = data;

    if (!password || password.length < 4) {
        sendMessage({
            type: 'VAULT_ERROR',
            error: 'Heslo musí mít alespoň 4 znaky'
        });
        return;
    }

    try {
        await createVault(password);

        // If we have pending refresh token, save it now
        if (pendingRefreshToken) {
            saveSession(pendingRefreshToken);
        }

        sendMessage({
            type: 'VAULT_CREATED',
            data: { success: true }
        });
    } catch (e) {
        log(`Error creating vault: ${e.message}`);
        sendMessage({
            type: 'VAULT_ERROR',
            error: e.message
        });
    }
}

async function handleUnlockVault(data) {
    const { password } = data;

    try {
        await unlockVault(password);

        // If we have pending refresh token, save it now
        if (pendingRefreshToken) {
            saveSession(pendingRefreshToken);
        }

        sendMessage({
            type: 'VAULT_UNLOCKED',
            data: {
                success: true,
                hasSession: sessionExists()
            }
        });
    } catch (e) {
        log(`Error unlocking vault: ${e.message}`);
        sendMessage({
            type: 'VAULT_ERROR',
            error: e.message === 'Invalid password' ? 'Nesprávné heslo' : e.message
        });
    }
}

async function handleDeleteVault() {
    // Logout first if logged in
    if (client && isLoggedIn) {
        client.logOff();
    }
    isLoggedIn = false;
    currentUser = null;
    farmingGames = [];

    const success = deleteVault();

    sendMessage({
        type: 'VAULT_DELETED',
        data: { success }
    });
}

async function handleLogin(data) {
    const { username, password, sharedSecret } = data;

    if (!vaultUnlocked) {
        sendMessage({
            type: 'ERROR',
            error: 'Vault is locked. Please unlock first.'
        });
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

    sendMessage({
        type: 'LOGIN_RESULT',
        data: { success: true, message: 'Přihlašování...' }
    });
}

function handleSteamGuardCode(data) {
    const { code } = data;

    if (steamGuardCallback) {
        steamGuardCallback(code);
        steamGuardCallback = null;
    } else {
        sendMessage({
            type: 'ERROR',
            error: 'Steam Guard callback not available'
        });
    }
}

function handleLogout() {
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

    sendMessage({
        type: 'DISCONNECTED'
    });
}

async function handleRestoreSession() {
    if (!vaultUnlocked) {
        sendMessage({
            type: 'ERROR',
            error: 'Vault is locked'
        });
        return;
    }

    const refreshToken = loadSession();

    if (!refreshToken) {
        sendMessage({
            type: 'ERROR',
            error: 'No saved session'
        });
        return;
    }

    initSteamClient();
    client.logOn({ refreshToken });
}

async function handleGetGames() {
    if (!isLoggedIn || !client) {
        sendMessage({
            type: 'ERROR',
            error: 'Not logged in'
        });
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

        sendMessage({
            type: 'GAMES_LIST',
            data: { games: ownedGames }
        });
    } catch (e) {
        log(`Error fetching games: ${e.message}`);
        sendMessage({
            type: 'ERROR',
            error: `Failed to fetch games: ${e.message}`
        });
    }
}

async function handleGetCards() {
    const gamesWithCards = {};

    for (const game of ownedGames) {
        if (game.playtimeForever < 120) {
            gamesWithCards[game.appId] = 3;
        }
    }

    cardsData = gamesWithCards;

    sendMessage({
        type: 'CARDS_DATA',
        data: { cards: cardsData }
    });
}

function handleStartFarming(data) {
    const { appIds } = data;

    if (!isLoggedIn || !client) {
        sendMessage({
            type: 'ERROR',
            error: 'Not logged in'
        });
        return;
    }

    const gamesToFarm = appIds.slice(0, 32);
    farmingGames = gamesToFarm;

    client.gamesPlayed(gamesToFarm);

    log(`Started farming ${gamesToFarm.length} games`);

    sendMessage({
        type: 'FARMING_STATUS',
        data: { games: farmingGames }
    });
}

function handleStopFarming() {
    farmingGames = [];
    if (client) {
        client.gamesPlayed([]);
    }

    log('Stopped farming');

    sendMessage({
        type: 'FARMING_STATUS',
        data: { games: [] }
    });
}

function handleUpdateFarming(data) {
    handleStartFarming(data);
}

// ===========================================
// MAIN MESSAGE HANDLER
// ===========================================

async function handleMessage(message) {
    log(`Received: ${message.type}`);

    switch (message.type) {
        case 'PING':
            sendMessage({
                type: 'PONG',
                version: VERSION,
                isLoggedIn,
                username: currentUser?.personaName,
                farmingGames,
                vaultExists: vaultExists(),
                vaultUnlocked
            });
            break;

        case 'CHECK_VAULT_STATUS':
            await handleCheckVaultStatus();
            break;

        case 'CREATE_VAULT':
            await handleCreateVault(message.data);
            break;

        case 'UNLOCK_VAULT':
            await handleUnlockVault(message.data);
            break;

        case 'DELETE_VAULT':
            await handleDeleteVault();
            break;

        case 'LOGIN':
            await handleLogin(message.data);
            break;

        case 'STEAM_GUARD_CODE':
            handleSteamGuardCode(message.data);
            break;

        case 'LOGOUT':
            handleLogout();
            break;

        case 'RESTORE_SESSION':
            await handleRestoreSession();
            break;

        case 'GET_GAMES':
            await handleGetGames();
            break;

        case 'GET_CARDS':
            await handleGetCards();
            break;

        case 'START_FARMING':
            handleStartFarming(message.data);
            break;

        case 'STOP_FARMING':
            handleStopFarming();
            break;

        case 'UPDATE_FARMING':
            handleUpdateFarming(message.data);
            break;

        default:
            log(`Unknown message type: ${message.type}`);
    }
}

// ===========================================
// MAIN
// ===========================================

async function main() {
    log('Steam Farm Native Host started (v' + VERSION + ')');

    while (true) {
        try {
            const message = await readMessage();
            if (message) {
                await handleMessage(message);
            }
        } catch (e) {
            log(`Error in main loop: ${e.message}`);
        }
    }
}

process.on('exit', () => {
    log('Exiting');
    if (client) {
        client.logOff();
    }
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

main();
