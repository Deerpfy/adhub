#!/usr/bin/env node
/**
 * Steam Farm - Native Messaging Host
 * Komunikace se Steam přes steam-user knihovnu
 *
 * Chrome Native Messaging používá stdin/stdout s délkovým prefixem (32-bit little-endian)
 */

const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const fs = require('fs');
const path = require('path');

const VERSION = '1.0.0';

// Data directory
const DATA_DIR = path.join(process.env.APPDATA || process.env.HOME, '.adhub-steam-farm');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// State
let client = null;
let isLoggedIn = false;
let currentUser = null;
let farmingGames = [];
let steamGuardCallback = null;
let ownedGames = [];
let cardsData = {};

// Session file path
const SESSION_FILE = path.join(DATA_DIR, 'session.json');

// Logging
const LOG_FILE = path.join(DATA_DIR, 'host.log');
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logMessage);
}

// Native Messaging: Read message from stdin
function readMessage() {
    return new Promise((resolve) => {
        let buffer = Buffer.alloc(0);

        const onData = (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);

            // Need at least 4 bytes for length
            if (buffer.length < 4) return;

            // Read message length (32-bit little-endian)
            const messageLength = buffer.readUInt32LE(0);

            // Wait for complete message
            if (buffer.length < 4 + messageLength) return;

            // Extract message
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

// Native Messaging: Write message to stdout
function sendMessage(message) {
    const messageStr = JSON.stringify(message);
    const messageBuffer = Buffer.from(messageStr);
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(messageBuffer.length, 0);

    process.stdout.write(lengthBuffer);
    process.stdout.write(messageBuffer);
}

// Initialize Steam client
function initSteamClient() {
    if (client) {
        client.logOff();
    }

    client = new SteamUser({
        autoRelogin: true,
        enablePicsCache: true,
        dataDirectory: DATA_DIR
    });

    // Event handlers
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

        // Set online status
        client.setPersona(SteamUser.EPersonaState.Online);
    });

    client.on('steamGuard', (domain, callback, lastCodeWrong) => {
        log(`Steam Guard requested (domain: ${domain}, lastCodeWrong: ${lastCodeWrong})`);
        steamGuardCallback = callback;

        sendMessage({
            type: 'STEAM_GUARD',
            data: {
                domain,
                lastCodeWrong
            }
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

    client.on('accountInfo', (name, country, authedMachines, flags, facebookID, facebookName) => {
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
        saveSession(token);
    });
}

// Save session
function saveSession(refreshToken) {
    try {
        const sessionData = {
            refreshToken,
            timestamp: Date.now()
        };
        fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData));
        log('Session saved');
    } catch (e) {
        log(`Error saving session: ${e.message}`);
    }
}

// Load session
function loadSession() {
    try {
        if (fs.existsSync(SESSION_FILE)) {
            const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
            // Check if session is not too old (200 days max)
            if (Date.now() - data.timestamp < 200 * 24 * 60 * 60 * 1000) {
                return data.refreshToken;
            }
        }
    } catch (e) {
        log(`Error loading session: ${e.message}`);
    }
    return null;
}

// Handle login
async function handleLogin(data) {
    const { username, password, sharedSecret } = data;

    initSteamClient();

    const loginOptions = {
        accountName: username,
        password: password
    };

    // Add 2FA code if shared secret provided
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

// Handle Steam Guard code
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

// Handle logout
function handleLogout() {
    if (client) {
        client.logOff();
    }
    isLoggedIn = false;
    currentUser = null;
    farmingGames = [];

    // Delete session
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

// Handle restore session
async function handleRestoreSession() {
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

// Get owned games
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

// Get cards data (simplified - would need web API for accurate data)
async function handleGetCards() {
    // Note: Getting accurate card drop data requires Steam web API
    // This is a simplified version that estimates based on playtime
    // For accurate data, you'd need to use the Steam community badges API

    const gamesWithCards = {};

    for (const game of ownedGames) {
        // Games typically need 2 hours of playtime before cards start dropping
        // Each game can drop up to half of its card set
        // This is an estimation - real implementation would query Steam badges API
        if (game.playtimeForever < 120) { // Less than 2 hours
            // Estimate 3 cards remaining (average)
            gamesWithCards[game.appId] = 3;
        }
    }

    cardsData = gamesWithCards;

    sendMessage({
        type: 'CARDS_DATA',
        data: { cards: cardsData }
    });
}

// Start farming games
function handleStartFarming(data) {
    const { appIds } = data;

    if (!isLoggedIn || !client) {
        sendMessage({
            type: 'ERROR',
            error: 'Not logged in'
        });
        return;
    }

    // Limit to 32 games
    const gamesToFarm = appIds.slice(0, 32);
    farmingGames = gamesToFarm;

    // Start "playing" the games
    client.gamesPlayed(gamesToFarm);

    log(`Started farming ${gamesToFarm.length} games`);

    sendMessage({
        type: 'FARMING_STATUS',
        data: { games: farmingGames }
    });
}

// Stop farming
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

// Update farming games
function handleUpdateFarming(data) {
    const { appIds } = data;
    handleStartFarming({ appIds });
}

// Main message handler
async function handleMessage(message) {
    log(`Received: ${message.type}`);

    switch (message.type) {
        case 'PING':
            sendMessage({
                type: 'PONG',
                version: VERSION,
                isLoggedIn,
                username: currentUser?.personaName,
                farmingGames
            });
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

// Main loop
async function main() {
    log('Steam Farm Native Host started');

    // Process messages
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

// Handle process exit
process.on('exit', () => {
    log('Exiting');
    if (client) {
        client.logOff();
    }
});

process.on('SIGINT', () => {
    process.exit(0);
});

process.on('SIGTERM', () => {
    process.exit(0);
});

// Start
main();
