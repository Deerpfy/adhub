/**
 * AdHub Multistream Chat Moderator
 * Bridge Script - Komunikace mezi extensi a AdHub webem
 *
 * Bezi na AdHub strankach a poskytuje moderacni funkce do Multistream Chat.
 * Verze 1.1 - Popup-based pristup bez OAuth.
 */

(function() {
    'use strict';

    const VERSION = '1.1.0';
    const MARKER = '__ADHUB_MOD_BRIDGE__';

    // Kontrola opakované injekce
    if (window[MARKER]) {
        console.log('[AdHub Mod Bridge] Already injected');
        return;
    }
    window[MARKER] = VERSION;

    console.log(`[AdHub Mod Bridge] Loaded v${VERSION}`);

    // Signalizovat dostupnost extenze
    document.documentElement.dataset.adhubModExtension = VERSION;
    localStorage.setItem('adhub_mod_extension_version', VERSION);
    localStorage.setItem('adhub_mod_extension_active', 'true');

    // Event pro oznameni dostupnosti
    document.dispatchEvent(new CustomEvent('adhub-mod-extension-ready', {
        detail: { version: VERSION }
    }));

    // Cache pro aktivni chat okna
    let openChannels = [];

    /**
     * Refresh seznamu otevrenych kanalu
     */
    async function refreshOpenChannels() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getChatPopups' });
            openChannels = (response.popups || []).filter(p => p.ready).map(p => p.channel);

            // Aktualizovat localStorage
            localStorage.setItem('adhub_mod_open_channels', JSON.stringify(openChannels));

            // Dispatch event pro aplikaci
            document.dispatchEvent(new CustomEvent('adhub-mod-channels-changed', {
                detail: { channels: openChannels }
            }));

            return openChannels;
        } catch (error) {
            console.error('[AdHub Mod Bridge] Error getting channels:', error);
            return [];
        }
    }

    /**
     * Otevrit chat popup pro kanal
     */
    async function openChatForChannel(channel) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'openChatPopup',
                channel: channel
            });

            if (response.success) {
                // Pockej na ready stav
                await new Promise(resolve => setTimeout(resolve, 2000));
                await refreshOpenChannels();
            }

            return response;
        } catch (error) {
            console.error('[AdHub Mod Bridge] Error opening chat:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Zavrit chat popup
     */
    async function closeChatForChannel(channel) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'closeChatPopup',
                channel: channel
            });

            await refreshOpenChannels();
            return response;
        } catch (error) {
            console.error('[AdHub Mod Bridge] Error closing chat:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Zkontrolovat zda je chat otevreny pro kanal
     */
    function isChatOpen(channel) {
        return openChannels.includes(channel?.toLowerCase());
    }

    /**
     * Provest moderacni akci
     */
    async function performModAction(channel, action, data) {
        const normalizedChannel = channel?.toLowerCase();

        // Zkontrolovat zda je chat otevreny
        if (!isChatOpen(normalizedChannel)) {
            // Zkusit otevrit chat
            const openResult = await openChatForChannel(normalizedChannel);
            if (!openResult.success) {
                return { success: false, error: 'Chat neni otevreny a nelze ho otevrit' };
            }
            // Pockej na inicializaci
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'sendModAction',
                channel: normalizedChannel,
                action: action,
                data: data
            });

            return response;
        } catch (error) {
            console.error('[AdHub Mod Bridge] Mod action error:', error);
            return { success: false, error: error.message };
        }
    }

    // Exponovat API pro Multistream Chat
    window.AdHubModExtension = {
        version: VERSION,
        getOpenChannels: () => openChannels,
        isChatOpen: isChatOpen,
        openChat: openChatForChannel,
        closeChat: closeChatForChannel,
        performAction: performModAction,
        refresh: refreshOpenChannels,

        // Pomocne metody pro jednotlive akce
        ban: (channel, username, reason) => performModAction(channel, 'ban', { username, reason }),
        timeout: (channel, username, duration, reason) => performModAction(channel, 'timeout', { username, duration, reason }),
        delete: (channel, messageId) => performModAction(channel, 'delete', { messageId }),
        unban: (channel, username) => performModAction(channel, 'unban', { username })
    };

    // Naslouchat na pozadavky z aplikace
    window.addEventListener('message', async (event) => {
        // Pouze z nasi stranky
        if (event.source !== window) return;
        if (!event.data || event.data.source !== 'adhub-chat') return;

        const { type, payload, requestId } = event.data;

        let response = { requestId };

        switch (type) {
            case 'check-mod-extension':
                response.available = true;
                response.version = VERSION;
                response.openChannels = openChannels;
                break;

            case 'get-open-channels':
                response.data = await refreshOpenChannels();
                break;

            case 'open-chat':
                response.data = await openChatForChannel(payload.channel);
                break;

            case 'close-chat':
                response.data = await closeChatForChannel(payload.channel);
                break;

            case 'is-chat-open':
                response.data = { isOpen: isChatOpen(payload.channel) };
                break;

            case 'perform-mod-action':
                response.data = await performModAction(
                    payload.channel,
                    payload.action,
                    payload.data
                );
                break;

            default:
                response.error = 'Unknown request type';
        }

        // Odeslat odpoved zpet
        window.postMessage({
            source: 'adhub-mod-extension',
            ...response
        }, '*');
    });

    // Naslouchat na zmeny v storage
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.mod_channels) {
            console.log('[AdHub Mod Bridge] Channels changed, refreshing...');
            refreshOpenChannels();
        }
    });

    // Inicializace
    refreshOpenChannels();

    // Periodicky refresh (kazdych 30 sekund)
    setInterval(refreshOpenChannels, 30 * 1000);

})();
