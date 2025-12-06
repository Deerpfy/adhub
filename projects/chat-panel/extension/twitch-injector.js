/**
 * AdHub Multistream Chat Moderator
 * Chat Injector - Bezi v Twitch chat popup/embed okne
 *
 * Prijima prikazy z Multistream Chat a posila je do Twitch chatu.
 * Pouziva existujici Twitch session - neni potreba OAuth.
 */

(function() {
    'use strict';

    const VERSION = '1.1.0';
    const MARKER = '__ADHUB_CHAT_INJECTOR__';

    // Kontrola opakované injekce
    if (window[MARKER]) {
        console.log('[AdHub Chat Injector] Already injected');
        return;
    }
    window[MARKER] = VERSION;

    // Ziskat kanal z URL
    const channelMatch = window.location.pathname.match(/\/(?:popout|embed)\/([^\/]+)\/chat/);
    const channel = channelMatch ? channelMatch[1].toLowerCase() : null;

    if (!channel) {
        console.log('[AdHub Chat Injector] Cannot detect channel from URL');
        return;
    }

    console.log(`[AdHub Chat Injector] Loaded v${VERSION} for channel: ${channel}`);

    // Stav
    let chatInput = null;
    let chatButton = null;
    let isReady = false;

    /**
     * Najit chat input a tlacitko
     */
    function findChatElements() {
        // Chat input
        chatInput = document.querySelector('[data-a-target="chat-input"]') ||
                    document.querySelector('textarea[placeholder*="Send a message"]') ||
                    document.querySelector('.chat-input textarea');

        // Chat send button
        chatButton = document.querySelector('[data-a-target="chat-send-button"]') ||
                     document.querySelector('button[data-a-target="chat-send-button"]');

        if (chatInput && chatButton) {
            isReady = true;
            console.log('[AdHub Chat Injector] Chat elements found, ready for commands');
            notifyReady();
        }

        return isReady;
    }

    /**
     * Oznamit pripojeni do Multistream Chat
     */
    function notifyReady() {
        // Poslat zpravu do parent window (pokud jsme v iframe)
        if (window.parent !== window) {
            window.parent.postMessage({
                source: 'adhub-chat-injector',
                type: 'ready',
                channel: channel,
                version: VERSION
            }, '*');
        }

        // Poslat zpravu do opener window (pokud jsme v popup)
        if (window.opener) {
            window.opener.postMessage({
                source: 'adhub-chat-injector',
                type: 'ready',
                channel: channel,
                version: VERSION
            }, '*');
        }

        // Ulozit do storage pro background script
        chrome.storage.local.get('mod_channels', (data) => {
            const channels = data.mod_channels || {};
            channels[channel] = {
                ready: true,
                timestamp: Date.now()
            };
            chrome.storage.local.set({ mod_channels: channels });
        });
    }

    /**
     * Poslat prikaz do chatu
     */
    function sendCommand(command) {
        if (!isReady || !chatInput || !chatButton) {
            console.error('[AdHub Chat Injector] Not ready to send commands');
            return { success: false, error: 'Chat not ready' };
        }

        try {
            // Nastavit hodnotu inputu
            // Twitch pouziva React, takze musime simulovat spravne eventy
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype, 'value'
            ).set;

            nativeInputValueSetter.call(chatInput, command);

            // Dispatch input event
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            chatInput.dispatchEvent(inputEvent);

            // Male zpozdeni pred odeslanim
            setTimeout(() => {
                // Kliknout na send button
                chatButton.click();
                console.log('[AdHub Chat Injector] Command sent:', command);
            }, 100);

            return { success: true };

        } catch (error) {
            console.error('[AdHub Chat Injector] Error sending command:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Zpracovat moderacni akci
     */
    function handleModAction(action, data) {
        let command = '';

        switch (action) {
            case 'ban':
                command = `/ban ${data.username}`;
                if (data.reason) {
                    command += ` ${data.reason}`;
                }
                break;

            case 'unban':
                command = `/unban ${data.username}`;
                break;

            case 'timeout':
                const duration = data.duration || 600; // Default 10 minut
                command = `/timeout ${data.username} ${duration}`;
                if (data.reason) {
                    command += ` ${data.reason}`;
                }
                break;

            case 'delete':
                // Pro smazani zpravy potrebujeme message ID
                if (data.messageId) {
                    command = `/delete ${data.messageId}`;
                } else {
                    return { success: false, error: 'Message ID required for delete' };
                }
                break;

            case 'clear':
                command = '/clear';
                break;

            case 'slow':
                command = `/slow ${data.duration || 30}`;
                break;

            case 'slowoff':
                command = '/slowoff';
                break;

            case 'followers':
                command = `/followers ${data.duration || '0'}`;
                break;

            case 'followersoff':
                command = '/followersoff';
                break;

            case 'subscribers':
                command = '/subscribers';
                break;

            case 'subscribersoff':
                command = '/subscribersoff';
                break;

            case 'emoteonly':
                command = '/emoteonly';
                break;

            case 'emoteonlyoff':
                command = '/emoteonlyoff';
                break;

            case 'vip':
                command = `/vip ${data.username}`;
                break;

            case 'unvip':
                command = `/unvip ${data.username}`;
                break;

            case 'mod':
                command = `/mod ${data.username}`;
                break;

            case 'unmod':
                command = `/unmod ${data.username}`;
                break;

            case 'shoutout':
                command = `/shoutout ${data.username}`;
                break;

            case 'raid':
                command = `/raid ${data.username}`;
                break;

            case 'announce':
                command = `/announce ${data.message || ''}`;
                break;

            case 'announceblue':
                command = `/announceblue ${data.message || ''}`;
                break;

            case 'announcegreen':
                command = `/announcegreen ${data.message || ''}`;
                break;

            case 'announceorange':
                command = `/announceorange ${data.message || ''}`;
                break;

            case 'announcepurple':
                command = `/announcepurple ${data.message || ''}`;
                break;

            // Broadcaster-only commands
            case 'title':
                if (data.title) {
                    command = `/title ${data.title}`;
                } else {
                    return { success: false, error: 'Title required' };
                }
                break;

            case 'game':
                if (data.game) {
                    command = `/game ${data.game}`;
                } else {
                    return { success: false, error: 'Game/category required' };
                }
                break;

            case 'marker':
                command = data.description ? `/marker ${data.description}` : '/marker';
                break;

            case 'commercial':
                const duration = data.duration || 30;
                command = `/commercial ${duration}`;
                break;

            case 'uniquechat':
                command = '/uniquechat';
                break;

            case 'uniquechatoff':
                command = '/uniquechatoff';
                break;

            default:
                return { success: false, error: `Unknown action: ${action}` };
        }

        return sendCommand(command);
    }

    /**
     * Naslouchat na zpravy z Multistream Chat
     */
    window.addEventListener('message', (event) => {
        // Prijmout zpravy z libovolneho zdroje (parent/opener)
        if (!event.data || event.data.source !== 'adhub-multistream-chat') {
            return;
        }

        const { type, action, data, requestId } = event.data;

        let response = {
            source: 'adhub-chat-injector',
            requestId: requestId,
            channel: channel
        };

        switch (type) {
            case 'ping':
                response.type = 'pong';
                response.ready = isReady;
                break;

            case 'mod-action':
                const result = handleModAction(action, data);
                response.type = 'mod-action-result';
                response.success = result.success;
                response.error = result.error;
                break;

            default:
                response.type = 'error';
                response.error = 'Unknown message type';
        }

        // Odpovedet zpet
        event.source.postMessage(response, '*');
    });

    // Naslouchat na zpravy z background scriptu
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'mod-action') {
            const result = handleModAction(message.type, message.data);
            sendResponse(result);
        } else if (message.action === 'ping') {
            sendResponse({ ready: isReady, channel: channel });
        }
        return true;
    });

    /**
     * Sledovat DOM pro nalezeni chat elementu
     */
    function observeForChat() {
        if (findChatElements()) {
            return;
        }

        const observer = new MutationObserver(() => {
            if (findChatElements()) {
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Timeout - zkusit znovu za chvili
        setTimeout(() => {
            if (!isReady) {
                findChatElements();
            }
        }, 2000);
    }

    // Inicializace
    if (document.readyState === 'complete') {
        observeForChat();
    } else {
        window.addEventListener('load', observeForChat);
    }

})();
