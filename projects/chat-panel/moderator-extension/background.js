/**
 * AdHub Multistream Chat Moderator
 * Background Script - Service Worker
 *
 * Spravuje:
 * - Otevireni Twitch chat popup oken
 * - Komunikaci mezi chat injector a Multistream Chat
 * - Statistiky moderacnich akci
 *
 * Nepouziva OAuth - vyuziva existujici Twitch session uzivatele.
 */

const VERSION = '1.1.0';

// Cache aktivnich chat popup oken
const chatPopups = new Map(); // channel -> { tabId, windowId, ready }

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

// Sledovat zavreni tabu
chrome.tabs.onRemoved.addListener((tabId) => {
    // Odstranit z cache pokud to byl chat popup
    for (const [channel, popup] of chatPopups) {
        if (popup.tabId === tabId) {
            chatPopups.delete(channel);
            console.log(`[Mod Extension] Chat popup closed: ${channel}`);

            // Notifikovat storage
            updateChannelStatus(channel, false);
            break;
        }
    }
});

// Hlavni message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Mod Extension] Message:', message.action);

    switch (message.action) {
        case 'openChatPopup':
            handleOpenChatPopup(message.channel, sendResponse);
            return true;

        case 'closeChatPopup':
            handleCloseChatPopup(message.channel, sendResponse);
            return true;

        case 'getChatPopups':
            sendResponse({
                popups: Array.from(chatPopups.entries()).map(([channel, data]) => ({
                    channel,
                    ready: data.ready
                }))
            });
            return false;

        case 'sendModAction':
            handleSendModAction(message, sendResponse);
            return true;

        case 'getStats':
            chrome.storage.local.get('mod_stats', (data) => {
                sendResponse({ stats: data.mod_stats || { bans: 0, timeouts: 0, deletes: 0 } });
            });
            return true;

        case 'chatInjectorReady':
            // Chat injector hlasi pripravenost
            const channel = message.channel?.toLowerCase();
            if (channel && chatPopups.has(channel)) {
                chatPopups.get(channel).ready = true;
                updateChannelStatus(channel, true);
                console.log(`[Mod Extension] Chat injector ready: ${channel}`);
            }
            sendResponse({ ok: true });
            return false;

        default:
            sendResponse({ error: 'Unknown action' });
            return false;
    }
});

/**
 * Otevrit Twitch chat popup pro kanal
 */
async function handleOpenChatPopup(channel, sendResponse) {
    const normalizedChannel = channel.toLowerCase();

    // Kontrola zda uz neni otevreny
    if (chatPopups.has(normalizedChannel)) {
        const existing = chatPopups.get(normalizedChannel);

        // Zkontrolovat zda tab stale existuje
        try {
            await chrome.tabs.get(existing.tabId);
            // Tab existuje, focus na nej
            await chrome.windows.update(existing.windowId, { focused: true });
            sendResponse({ success: true, alreadyOpen: true });
            return;
        } catch {
            // Tab neexistuje, odstranit z cache
            chatPopups.delete(normalizedChannel);
        }
    }

    try {
        // Otevrit novy popup
        const popupUrl = `https://www.twitch.tv/popout/${normalizedChannel}/chat?popout=`;

        const window = await chrome.windows.create({
            url: popupUrl,
            type: 'popup',
            width: 340,
            height: 600,
            focused: true
        });

        // Ulozit do cache
        chatPopups.set(normalizedChannel, {
            tabId: window.tabs[0].id,
            windowId: window.id,
            ready: false
        });

        console.log(`[Mod Extension] Chat popup opened: ${normalizedChannel}`);
        sendResponse({ success: true, tabId: window.tabs[0].id });

    } catch (error) {
        console.error('[Mod Extension] Error opening popup:', error);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Zavrit chat popup
 */
async function handleCloseChatPopup(channel, sendResponse) {
    const normalizedChannel = channel.toLowerCase();

    if (!chatPopups.has(normalizedChannel)) {
        sendResponse({ success: false, error: 'Popup not found' });
        return;
    }

    try {
        const popup = chatPopups.get(normalizedChannel);
        await chrome.windows.remove(popup.windowId);
        chatPopups.delete(normalizedChannel);
        updateChannelStatus(normalizedChannel, false);
        sendResponse({ success: true });
    } catch (error) {
        chatPopups.delete(normalizedChannel);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Poslat moderacni akci do chat popup
 */
async function handleSendModAction(message, sendResponse) {
    const { channel, action, data } = message;
    const normalizedChannel = channel.toLowerCase();

    if (!chatPopups.has(normalizedChannel)) {
        sendResponse({ success: false, error: 'Chat popup not open for this channel' });
        return;
    }

    const popup = chatPopups.get(normalizedChannel);

    if (!popup.ready) {
        sendResponse({ success: false, error: 'Chat popup not ready' });
        return;
    }

    try {
        // Poslat zpravu do content scriptu
        const response = await chrome.tabs.sendMessage(popup.tabId, {
            action: 'mod-action',
            type: action,
            data: data
        });

        // Aktualizovat statistiky pokud uspech
        if (response.success) {
            await updateStats(action);
        }

        sendResponse(response);
    } catch (error) {
        console.error('[Mod Extension] Error sending mod action:', error);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Aktualizovat status kanalu v storage
 */
async function updateChannelStatus(channel, isOpen) {
    try {
        const data = await chrome.storage.local.get('mod_channels');
        const channels = data.mod_channels || {};

        if (isOpen) {
            channels[channel] = { ready: true, timestamp: Date.now() };
        } else {
            delete channels[channel];
        }

        await chrome.storage.local.set({ mod_channels: channels });
    } catch (error) {
        console.error('[Mod Extension] Error updating channel status:', error);
    }
}

/**
 * Aktualizovat statistiky
 */
async function updateStats(action) {
    try {
        const data = await chrome.storage.local.get('mod_stats');
        const stats = data.mod_stats || { bans: 0, timeouts: 0, deletes: 0 };

        switch (action) {
            case 'ban':
                stats.bans = (stats.bans || 0) + 1;
                break;
            case 'timeout':
                stats.timeouts = (stats.timeouts || 0) + 1;
                break;
            case 'delete':
                stats.deletes = (stats.deletes || 0) + 1;
                break;
        }

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

        case 'getOpenChannels':
            sendResponse({
                channels: Array.from(chatPopups.entries())
                    .filter(([_, data]) => data.ready)
                    .map(([channel]) => channel)
            });
            return false;

        case 'openChat':
            handleOpenChatPopup(message.channel, sendResponse);
            return true;

        case 'closeChat':
            handleCloseChatPopup(message.channel, sendResponse);
            return true;

        case 'modAction':
            handleSendModAction({
                channel: message.channel,
                action: message.type,
                data: message.data
            }, sendResponse);
            return true;

        default:
            sendResponse({ error: 'Unknown action' });
            return false;
    }
});

console.log(`[Mod Extension] Background service worker started v${VERSION}`);
