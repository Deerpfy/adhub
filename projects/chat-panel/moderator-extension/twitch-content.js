/**
 * AdHub Multistream Chat Moderator
 * Twitch Content Script
 *
 * Injektuje se na Twitch stranky a pridava moderacni tlacitka
 * k chatovym zpravam pokud ma uzivatel opravneni.
 */

(function() {
    'use strict';

    const VERSION = '1.0.0';
    const ADHUB_MARKER = '__ADHUB_MOD_EXT__';

    // Kontrola opakované injekce
    if (window[ADHUB_MARKER]) {
        console.log('[AdHub Mod] Already injected');
        return;
    }
    window[ADHUB_MARKER] = VERSION;

    console.log(`[AdHub Mod] Content script loaded v${VERSION}`);

    // Stav
    let isAuthenticated = false;
    let currentChannel = null;
    let isModerator = false;
    let broadcasterId = null;
    let userCache = new Map(); // Cache pro user IDs

    /**
     * Ziskat aktualni kanal z URL
     */
    function getCurrentChannel() {
        const match = window.location.pathname.match(/^\/([a-zA-Z0-9_]+)/);
        if (match) {
            const channel = match[1].toLowerCase();
            // Ignorovat systemove cesty
            if (['directory', 'settings', 'videos', 'clips', 'moderator', 'dashboard'].includes(channel)) {
                return null;
            }
            return channel;
        }
        return null;
    }

    /**
     * Zkontrolovat autentizaci a moderatorsky status
     */
    async function checkAuthAndModStatus() {
        const channel = getCurrentChannel();
        if (!channel) {
            console.log('[AdHub Mod] No channel detected');
            return;
        }

        currentChannel = channel;

        try {
            // Zkontrolovat autentizaci
            const authResponse = await chrome.runtime.sendMessage({ action: 'getAuthStatus' });

            if (authResponse.authenticated) {
                isAuthenticated = true;

                // Zkontrolovat moderatorsky status pro tento kanal
                const modResponse = await chrome.runtime.sendMessage({
                    action: 'checkModeratorStatus',
                    channelLogin: channel
                });

                isModerator = modResponse.isModerator;
                broadcasterId = modResponse.broadcasterId;

                console.log(`[AdHub Mod] Channel: ${channel}, Moderator: ${isModerator}`);

                if (isModerator) {
                    // Pridat indicator
                    addModeratorIndicator();
                    // Zacit sledovat chat
                    observeChat();
                }
            } else {
                console.log('[AdHub Mod] Not authenticated');
            }
        } catch (error) {
            console.error('[AdHub Mod] Auth check error:', error);
        }
    }

    /**
     * Pridat indikator moderatora
     */
    function addModeratorIndicator() {
        // Odstranit stary indikator
        const existing = document.querySelector('.adhub-mod-indicator');
        if (existing) existing.remove();

        const indicator = document.createElement('div');
        indicator.className = 'adhub-mod-indicator';
        indicator.innerHTML = `
            <span class="adhub-mod-icon">🛡️</span>
            <span class="adhub-mod-text">AdHub Mod</span>
        `;
        indicator.title = 'AdHub Moderator aktivni';
        document.body.appendChild(indicator);
    }

    /**
     * Sledovat chat pro nove zpravy
     */
    function observeChat() {
        // Najit chat kontejner
        const chatContainer = document.querySelector('[data-test-selector="chat-scrollable-area__message-container"]') ||
                              document.querySelector('.chat-scrollable-area__message-container') ||
                              document.querySelector('[class*="chat-list"]');

        if (!chatContainer) {
            console.log('[AdHub Mod] Chat container not found, retrying...');
            setTimeout(observeChat, 2000);
            return;
        }

        console.log('[AdHub Mod] Observing chat');

        // Observer pro nove zpravy
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Najit chat zpravy v pridanem nodu
                        const messages = node.matches('[data-a-target="chat-line-message"]') ?
                            [node] :
                            node.querySelectorAll('[data-a-target="chat-line-message"]');

                        for (const message of messages) {
                            addModButtonsToMessage(message);
                        }
                    }
                }
            }
        });

        observer.observe(chatContainer, {
            childList: true,
            subtree: true
        });

        // Pridat tlacitka k existujicim zpravam
        const existingMessages = chatContainer.querySelectorAll('[data-a-target="chat-line-message"]');
        existingMessages.forEach(msg => addModButtonsToMessage(msg));
    }

    /**
     * Pridat moderacni tlacitka ke zprave
     */
    function addModButtonsToMessage(messageEl) {
        // Kontrola zda uz ma tlacitka
        if (messageEl.querySelector('.adhub-mod-actions')) return;

        // Ziskat username
        const usernameEl = messageEl.querySelector('[data-a-target="chat-message-username"]') ||
                          messageEl.querySelector('.chat-author__display-name');

        if (!usernameEl) return;

        const username = usernameEl.textContent?.toLowerCase();
        if (!username) return;

        // Nekontrolovat vlastni zpravy (broadcaster nebo self)
        // TODO: Ziskat aktualni prihlaseneho uzivatele

        // Vytvorit kontejner pro tlacitka
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'adhub-mod-actions';

        // Tlacitko pro smazani zpravy
        const deleteBtn = createModButton('delete', 'Smazat zpravu', '🗑️', async () => {
            const messageId = getMessageId(messageEl);
            if (!messageId) {
                showToast('Nelze ziskat ID zpravy', 'error');
                return;
            }

            const result = await chrome.runtime.sendMessage({
                action: 'deleteMessage',
                broadcasterId: broadcasterId,
                messageId: messageId
            });

            if (result.success) {
                showToast('Zprava smazana', 'success');
                messageEl.style.opacity = '0.3';
            } else {
                showToast(result.error || 'Smazani selhalo', 'error');
            }
        });

        // Tlacitko pro timeout
        const timeoutBtn = createModButton('timeout', 'Timeout 10min', '⏱️', async () => {
            const userId = await getUserId(username);
            if (!userId) {
                showToast('Nelze ziskat ID uzivatele', 'error');
                return;
            }

            const result = await chrome.runtime.sendMessage({
                action: 'timeoutUser',
                broadcasterId: broadcasterId,
                userId: userId,
                duration: 600
            });

            if (result.success) {
                showToast(`${username} dostal timeout`, 'success');
            } else {
                showToast(result.error || 'Timeout selhal', 'error');
            }
        });

        // Tlacitko pro ban
        const banBtn = createModButton('ban', 'Zabanovat', '🚫', async () => {
            if (!confirm(`Opravdu chcete zabanovat uzivatele ${username}?`)) return;

            const userId = await getUserId(username);
            if (!userId) {
                showToast('Nelze ziskat ID uzivatele', 'error');
                return;
            }

            const result = await chrome.runtime.sendMessage({
                action: 'banUser',
                broadcasterId: broadcasterId,
                userId: userId
            });

            if (result.success) {
                showToast(`${username} byl zabanovany`, 'success');
            } else {
                showToast(result.error || 'Ban selhal', 'error');
            }
        });

        actionsContainer.appendChild(deleteBtn);
        actionsContainer.appendChild(timeoutBtn);
        actionsContainer.appendChild(banBtn);

        // Vlozit tlacitka do zpravy
        messageEl.appendChild(actionsContainer);
    }

    /**
     * Vytvorit moderacni tlacitko
     */
    function createModButton(type, title, icon, onClick) {
        const btn = document.createElement('button');
        btn.className = `adhub-mod-btn adhub-mod-btn-${type}`;
        btn.title = title;
        btn.textContent = icon;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        });
        return btn;
    }

    /**
     * Ziskat message ID z Twitch elementu
     */
    function getMessageId(messageEl) {
        // Twitch uklada message ID v data atributech
        const msgId = messageEl.dataset.messageId ||
                      messageEl.getAttribute('data-message-id');
        if (msgId) return msgId;

        // Zkusit najit v parent elementech
        const parent = messageEl.closest('[data-message-id]');
        if (parent) return parent.getAttribute('data-message-id');

        return null;
    }

    /**
     * Ziskat user ID podle username
     */
    async function getUserId(username) {
        // Zkontrolovat cache
        if (userCache.has(username)) {
            return userCache.get(username);
        }

        try {
            // Potrebujeme zavolat Twitch API
            const response = await chrome.runtime.sendMessage({
                action: 'getUserId',
                username: username
            });

            if (response.userId) {
                userCache.set(username, response.userId);
                return response.userId;
            }
        } catch (error) {
            console.error('[AdHub Mod] Get user ID error:', error);
        }

        // Fallback: Zkusit ziskat z DOM
        // Twitch nekdy uklada user ID v data atributech
        const userEl = document.querySelector(`[data-a-user="${username}"]`);
        if (userEl) {
            const userId = userEl.dataset.userId || userEl.getAttribute('data-user-id');
            if (userId) {
                userCache.set(username, userId);
                return userId;
            }
        }

        return null;
    }

    /**
     * Zobrazit toast notifikaci
     */
    function showToast(message, type = 'info') {
        // Odstranit stary toast
        const existing = document.querySelector('.adhub-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `adhub-toast adhub-toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Animace
        setTimeout(() => toast.classList.add('visible'), 10);
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Sledovat zmeny URL (SPA navigace)
     */
    function observeUrlChanges() {
        let lastUrl = window.location.href;

        const observer = new MutationObserver(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                console.log('[AdHub Mod] URL changed:', lastUrl);

                // Reset stavu
                isModerator = false;
                broadcasterId = null;

                // Odstranit stary indikator
                const indicator = document.querySelector('.adhub-mod-indicator');
                if (indicator) indicator.remove();

                // Znovu zkontrolovat status
                setTimeout(checkAuthAndModStatus, 1000);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Inicializace
    function init() {
        console.log('[AdHub Mod] Initializing...');

        // Pockat na nacteni stranky
        if (document.readyState === 'complete') {
            checkAuthAndModStatus();
            observeUrlChanges();
        } else {
            window.addEventListener('load', () => {
                checkAuthAndModStatus();
                observeUrlChanges();
            });
        }
    }

    init();
})();
