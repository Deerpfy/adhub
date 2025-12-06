/**
 * AdHub Multistream Chat Moderator
 * Background Script - Service Worker
 *
 * Spravuje:
 * - OAuth tokeny a jejich validaci
 * - Komunikaci mezi content scripty a popup
 * - Moderacni API volani
 */

const VERSION = '1.0.0';

// Cache pro uzivatelska data
let cachedUser = null;
let cachedToken = null;
let cachedClientId = null;
let cachedChannels = [];

// Inicializace pri spusteni
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log(`[Mod Extension] Installed v${VERSION}`, details.reason);

    // Inicializovat statistiky
    const data = await chrome.storage.local.get('mod_stats');
    if (!data.mod_stats) {
        await chrome.storage.local.set({
            mod_stats: { bans: 0, timeouts: 0, deletes: 0 }
        });
    }
});

// Nacist cachovane data pri startu
chrome.storage.local.get(['twitch_token', 'twitch_user', 'twitch_client_id', 'mod_channels']).then(data => {
    cachedToken = data.twitch_token;
    cachedUser = data.twitch_user;
    cachedClientId = data.twitch_client_id;
    cachedChannels = data.mod_channels || [];
    console.log('[Mod Extension] Cache loaded', { user: cachedUser?.login, channels: cachedChannels.length });
});

// Naslouchat na zmeny v storage
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.twitch_token) cachedToken = changes.twitch_token.newValue;
        if (changes.twitch_user) cachedUser = changes.twitch_user.newValue;
        if (changes.twitch_client_id) cachedClientId = changes.twitch_client_id.newValue;
        if (changes.mod_channels) cachedChannels = changes.mod_channels.newValue || [];
    }
});

// Hlavni message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Mod Extension] Message received:', message.action);

    switch (message.action) {
        case 'getAuthStatus':
            handleGetAuthStatus(sendResponse);
            return true; // Async response

        case 'getModeratedChannels':
            handleGetModeratedChannels(sendResponse);
            return true;

        case 'checkModeratorStatus':
            handleCheckModeratorStatus(message, sendResponse);
            return true;

        case 'banUser':
            handleBanUser(message, sendResponse);
            return true;

        case 'timeoutUser':
            handleTimeoutUser(message, sendResponse);
            return true;

        case 'deleteMessage':
            handleDeleteMessage(message, sendResponse);
            return true;

        case 'unbanUser':
            handleUnbanUser(message, sendResponse);
            return true;

        case 'userLoggedIn':
            cachedUser = message.user;
            console.log('[Mod Extension] User logged in:', cachedUser?.login);
            sendResponse({ success: true });
            return false;

        case 'userLoggedOut':
            cachedUser = null;
            cachedToken = null;
            cachedChannels = [];
            console.log('[Mod Extension] User logged out');
            sendResponse({ success: true });
            return false;

        default:
            sendResponse({ error: 'Unknown action' });
            return false;
    }
});

/**
 * Ziskat stav autentizace
 */
async function handleGetAuthStatus(sendResponse) {
    try {
        const data = await chrome.storage.local.get(['twitch_token', 'twitch_user', 'mod_channels']);

        if (data.twitch_token && data.twitch_user) {
            // Overit token
            const response = await fetch('https://id.twitch.tv/oauth2/validate', {
                headers: { 'Authorization': `OAuth ${data.twitch_token}` }
            });

            if (response.ok) {
                sendResponse({
                    authenticated: true,
                    user: data.twitch_user,
                    channels: data.mod_channels || []
                });
            } else {
                // Token nevalidni
                await chrome.storage.local.remove(['twitch_token', 'twitch_user']);
                sendResponse({ authenticated: false });
            }
        } else {
            sendResponse({ authenticated: false });
        }
    } catch (error) {
        console.error('[Mod Extension] Auth status error:', error);
        sendResponse({ authenticated: false, error: error.message });
    }
}

/**
 * Ziskat seznam moderovanych kanalu
 */
async function handleGetModeratedChannels(sendResponse) {
    try {
        const data = await chrome.storage.local.get(['mod_channels']);
        sendResponse({ channels: data.mod_channels || [] });
    } catch (error) {
        sendResponse({ channels: [], error: error.message });
    }
}

/**
 * Zkontrolovat moderatorsky status pro konkretni kanal
 */
async function handleCheckModeratorStatus(message, sendResponse) {
    const { channelLogin } = message;

    try {
        const channel = cachedChannels.find(
            c => c.broadcaster_login?.toLowerCase() === channelLogin?.toLowerCase()
        );

        if (channel) {
            sendResponse({
                isModerator: channel.role === 'moderator' || channel.role === 'broadcaster',
                role: channel.role,
                broadcasterId: channel.broadcaster_id
            });
        } else {
            sendResponse({ isModerator: false, role: null });
        }
    } catch (error) {
        sendResponse({ isModerator: false, error: error.message });
    }
}

/**
 * Zabanovat uzivatele
 */
async function handleBanUser(message, sendResponse) {
    const { broadcasterId, userId, reason } = message;

    try {
        if (!cachedToken || !cachedClientId || !cachedUser) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(
            `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${cachedUser.id}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${cachedToken}`,
                    'Client-ID': cachedClientId,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: {
                        user_id: userId,
                        reason: reason || 'Banned via AdHub Moderator'
                    }
                })
            }
        );

        if (response.ok) {
            // Aktualizovat statistiky
            await updateStats('bans');
            sendResponse({ success: true });
        } else {
            const error = await response.json();
            sendResponse({ success: false, error: error.message || 'Ban failed' });
        }
    } catch (error) {
        console.error('[Mod Extension] Ban error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Dat timeout uzivateli
 */
async function handleTimeoutUser(message, sendResponse) {
    const { broadcasterId, userId, duration, reason } = message;

    try {
        if (!cachedToken || !cachedClientId || !cachedUser) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(
            `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${cachedUser.id}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${cachedToken}`,
                    'Client-ID': cachedClientId,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: {
                        user_id: userId,
                        duration: duration || 600, // Default 10 minut
                        reason: reason || 'Timeout via AdHub Moderator'
                    }
                })
            }
        );

        if (response.ok) {
            await updateStats('timeouts');
            sendResponse({ success: true });
        } else {
            const error = await response.json();
            sendResponse({ success: false, error: error.message || 'Timeout failed' });
        }
    } catch (error) {
        console.error('[Mod Extension] Timeout error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Smazat zpravu
 */
async function handleDeleteMessage(message, sendResponse) {
    const { broadcasterId, messageId } = message;

    try {
        if (!cachedToken || !cachedClientId || !cachedUser) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(
            `https://api.twitch.tv/helix/moderation/chat?broadcaster_id=${broadcasterId}&moderator_id=${cachedUser.id}&message_id=${messageId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${cachedToken}`,
                    'Client-ID': cachedClientId
                }
            }
        );

        if (response.ok || response.status === 204) {
            await updateStats('deletes');
            sendResponse({ success: true });
        } else {
            const error = await response.json();
            sendResponse({ success: false, error: error.message || 'Delete failed' });
        }
    } catch (error) {
        console.error('[Mod Extension] Delete error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Odbanovat uzivatele
 */
async function handleUnbanUser(message, sendResponse) {
    const { broadcasterId, userId } = message;

    try {
        if (!cachedToken || !cachedClientId || !cachedUser) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(
            `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${cachedUser.id}&user_id=${userId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${cachedToken}`,
                    'Client-ID': cachedClientId
                }
            }
        );

        if (response.ok || response.status === 204) {
            sendResponse({ success: true });
        } else {
            const error = await response.json();
            sendResponse({ success: false, error: error.message || 'Unban failed' });
        }
    } catch (error) {
        console.error('[Mod Extension] Unban error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Aktualizovat statistiky
 */
async function updateStats(type) {
    try {
        const data = await chrome.storage.local.get('mod_stats');
        const stats = data.mod_stats || { bans: 0, timeouts: 0, deletes: 0 };
        stats[type] = (stats[type] || 0) + 1;
        await chrome.storage.local.set({ mod_stats: stats });
    } catch (error) {
        console.error('[Mod Extension] Stats update error:', error);
    }
}

// Externí komunikace s AdHub webem
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    // Pouze z adhub domeny
    if (!sender.origin || !sender.origin.includes('deerpfy.github.io')) {
        sendResponse({ error: 'Unauthorized origin' });
        return false;
    }

    switch (message.action) {
        case 'ping':
            sendResponse({ pong: true, version: VERSION });
            return false;

        case 'getModStatus':
            handleCheckModeratorStatus(message, sendResponse);
            return true;

        case 'performModAction':
            if (message.type === 'ban') {
                handleBanUser(message, sendResponse);
            } else if (message.type === 'timeout') {
                handleTimeoutUser(message, sendResponse);
            } else if (message.type === 'delete') {
                handleDeleteMessage(message, sendResponse);
            } else {
                sendResponse({ error: 'Unknown action type' });
            }
            return true;

        default:
            sendResponse({ error: 'Unknown action' });
            return false;
    }
});

console.log(`[Mod Extension] Background service worker started v${VERSION}`);
