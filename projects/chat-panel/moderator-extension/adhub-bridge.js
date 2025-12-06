/**
 * AdHub Multistream Chat Moderator
 * Bridge Script - Komunikace mezi extensi a AdHub webem
 *
 * Bezi na AdHub strankach a poskytuje moderacni funkce do Multistream Chat.
 */

(function() {
    'use strict';

    const VERSION = '1.0.0';
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

    // Cache pro moderovane kanaly
    let cachedChannels = [];
    let isAuthenticated = false;

    /**
     * Ziskat stav autentizace a kanaly
     */
    async function refreshAuthStatus() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getAuthStatus' });

            isAuthenticated = response.authenticated;

            if (isAuthenticated) {
                cachedChannels = response.channels || [];
                console.log('[AdHub Mod Bridge] Authenticated, channels:', cachedChannels.length);

                // Aktualizovat localStorage
                localStorage.setItem('adhub_mod_authenticated', 'true');
                localStorage.setItem('adhub_mod_user', JSON.stringify(response.user));
                localStorage.setItem('adhub_mod_channels', JSON.stringify(cachedChannels));
            } else {
                localStorage.setItem('adhub_mod_authenticated', 'false');
                localStorage.removeItem('adhub_mod_user');
                localStorage.removeItem('adhub_mod_channels');
            }

            // Dispatch event pro aplikaci
            document.dispatchEvent(new CustomEvent('adhub-mod-auth-changed', {
                detail: {
                    authenticated: isAuthenticated,
                    user: response.user,
                    channels: cachedChannels
                }
            }));

        } catch (error) {
            console.error('[AdHub Mod Bridge] Auth check error:', error);
        }
    }

    /**
     * Zkontrolovat moderatorsky status pro kanal
     */
    function checkModeratorForChannel(channelLogin) {
        const normalizedLogin = channelLogin?.toLowerCase();

        const channel = cachedChannels.find(
            c => c.broadcaster_login?.toLowerCase() === normalizedLogin
        );

        return {
            isModerator: channel ? (channel.role === 'moderator' || channel.role === 'broadcaster') : false,
            role: channel?.role || null,
            broadcasterId: channel?.broadcaster_id || null
        };
    }

    /**
     * Provest moderacni akci
     */
    async function performModAction(action, data) {
        try {
            let response;

            switch (action) {
                case 'ban':
                    response = await chrome.runtime.sendMessage({
                        action: 'banUser',
                        broadcasterId: data.broadcasterId,
                        userId: data.userId,
                        reason: data.reason
                    });
                    break;

                case 'timeout':
                    response = await chrome.runtime.sendMessage({
                        action: 'timeoutUser',
                        broadcasterId: data.broadcasterId,
                        userId: data.userId,
                        duration: data.duration || 600,
                        reason: data.reason
                    });
                    break;

                case 'delete':
                    response = await chrome.runtime.sendMessage({
                        action: 'deleteMessage',
                        broadcasterId: data.broadcasterId,
                        messageId: data.messageId
                    });
                    break;

                case 'unban':
                    response = await chrome.runtime.sendMessage({
                        action: 'unbanUser',
                        broadcasterId: data.broadcasterId,
                        userId: data.userId
                    });
                    break;

                default:
                    return { success: false, error: 'Unknown action' };
            }

            return response;
        } catch (error) {
            console.error('[AdHub Mod Bridge] Action error:', error);
            return { success: false, error: error.message };
        }
    }

    // Exponovat API pro Multistream Chat
    window.AdHubModExtension = {
        version: VERSION,
        isAuthenticated: () => isAuthenticated,
        getChannels: () => cachedChannels,
        checkModerator: checkModeratorForChannel,
        performAction: performModAction,
        refresh: refreshAuthStatus
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
                response.authenticated = isAuthenticated;
                break;

            case 'check-mod-status':
                response.data = checkModeratorForChannel(payload.channel);
                break;

            case 'perform-mod-action':
                response.data = await performModAction(payload.action, payload.data);
                break;

            case 'refresh-auth':
                await refreshAuthStatus();
                response.data = {
                    authenticated: isAuthenticated,
                    channels: cachedChannels
                };
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

    // Naslouchat na zmeny v storage (treba novy login)
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.twitch_token || changes.twitch_user || changes.mod_channels) {
                console.log('[AdHub Mod Bridge] Storage changed, refreshing...');
                refreshAuthStatus();
            }
        }
    });

    // Inicializace
    refreshAuthStatus();

    // Periodicky refresh (kazdych 5 minut)
    setInterval(refreshAuthStatus, 5 * 60 * 1000);

})();
