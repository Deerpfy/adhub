/**
 * AdHub Multistream Chat Extension
 * Popup Script - Manage Twitch chat popup windows
 * Version 2.0.0
 *
 * No OAuth required - uses existing Twitch session.
 */

// DOM Elements
const channelInput = document.getElementById('channelInput');
const addBtn = document.getElementById('addBtn');
const channelsList = document.getElementById('channelsList');
const statBans = document.getElementById('statBans');
const statTimeouts = document.getElementById('statTimeouts');
const statDeletes = document.getElementById('statDeletes');

/**
 * Initialize popup
 */
async function init() {
    // Load stats
    loadStats();

    // Load open channels
    loadChannels();

    // Load saved username
    loadUsername();
}

/**
 * Load saved Twitch username
 */
async function loadUsername() {
    try {
        const data = await chrome.storage.local.get('twitch_username');
        const username = data.twitch_username || '';
        document.getElementById('twitchUsername').value = username;
    } catch (error) {
        console.error('[Popup] Error loading username:', error);
    }
}

/**
 * Save Twitch username
 */
async function saveUsername(username) {
    try {
        await chrome.storage.local.set({ twitch_username: username.trim().toLowerCase() });

        // Notify the AdHub page about the username change
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.url && tab.url.includes('deerpfy.github.io/adhub')) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'username-changed',
                        username: username.trim().toLowerCase()
                    }).catch(() => {});
                }
            });
        });

        return true;
    } catch (error) {
        console.error('[Popup] Error saving username:', error);
        return false;
    }
}

/**
 * Load stats from storage
 */
async function loadStats() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getStats' });
        const stats = response.stats || { bans: 0, timeouts: 0, deletes: 0 };

        statBans.textContent = stats.bans || 0;
        statTimeouts.textContent = stats.timeouts || 0;
        statDeletes.textContent = stats.deletes || 0;
    } catch (error) {
        console.error('[Popup] Error loading stats:', error);
    }
}

/**
 * Load open chat popups
 */
async function loadChannels() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getChatPopups' });
        const popups = response.popups || [];

        displayChannels(popups);
    } catch (error) {
        console.error('[Popup] Error loading channels:', error);
        displayChannels([]);
    }
}

/**
 * Display channels list
 */
function displayChannels(popups) {
    if (!popups || popups.length === 0) {
        channelsList.innerHTML = '<div class="empty-channels">Zadne aktivni chaty</div>';
        return;
    }

    channelsList.innerHTML = popups.map(popup => `
        <div class="channel-item" data-channel="${escapeHtml(popup.channel)}">
            <div class="channel-info">
                <div class="channel-status ${popup.ready ? '' : 'waiting'}"></div>
                <span class="channel-name">#${escapeHtml(popup.channel)}</span>
            </div>
            <button class="btn-close-channel" data-channel="${escapeHtml(popup.channel)}" title="Zavrit">
                ×
            </button>
        </div>
    `).join('');

    // Add close button handlers
    channelsList.querySelectorAll('.btn-close-channel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeChannel(btn.dataset.channel);
        });
    });
}

/**
 * Open chat popup for channel
 */
async function openChannel(channel) {
    if (!channel || channel.trim() === '') {
        return;
    }

    // Normalize channel name
    let normalizedChannel = channel.trim().toLowerCase();

    // Remove @ if present
    if (normalizedChannel.startsWith('@')) {
        normalizedChannel = normalizedChannel.slice(1);
    }

    // Extract channel from URL if pasted
    const urlMatch = normalizedChannel.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
    if (urlMatch) {
        normalizedChannel = urlMatch[1].toLowerCase();
    }

    addBtn.disabled = true;
    addBtn.textContent = '...';

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'openChatPopup',
            channel: normalizedChannel
        });

        if (response.success) {
            channelInput.value = '';
            // Reload channels list
            setTimeout(loadChannels, 500);
        } else {
            alert('Chyba: ' + (response.error || 'Nelze otevrit chat'));
        }
    } catch (error) {
        console.error('[Popup] Error opening channel:', error);
        alert('Chyba pri otevirani chatu');
    } finally {
        addBtn.disabled = false;
        addBtn.textContent = 'Otevrit';
    }
}

/**
 * Close chat popup
 */
async function closeChannel(channel) {
    try {
        await chrome.runtime.sendMessage({
            action: 'closeChatPopup',
            channel: channel
        });

        // Reload channels list
        loadChannels();
    } catch (error) {
        console.error('[Popup] Error closing channel:', error);
    }
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Username save handler
const twitchUsernameInput = document.getElementById('twitchUsername');
const saveUsernameBtn = document.getElementById('saveUsernameBtn');

saveUsernameBtn.addEventListener('click', async () => {
    const username = twitchUsernameInput.value.trim();
    if (await saveUsername(username)) {
        saveUsernameBtn.textContent = 'Ulozeno!';
        saveUsernameBtn.style.background = '#16a34a';
        setTimeout(() => {
            saveUsernameBtn.textContent = 'Ulozit';
            saveUsernameBtn.style.background = '';
        }, 2000);
    }
});

twitchUsernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveUsernameBtn.click();
});

// Event listeners
addBtn.addEventListener('click', () => openChannel(channelInput.value));

channelInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        openChannel(channelInput.value);
    }
});

// Listen for storage changes (stats updates)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.mod_stats) {
            const stats = changes.mod_stats.newValue || {};
            statBans.textContent = stats.bans || 0;
            statTimeouts.textContent = stats.timeouts || 0;
            statDeletes.textContent = stats.deletes || 0;
        }

        if (changes.mod_channels) {
            // Channel status changed, reload list
            loadChannels();
        }
    }
});

// Stream Management
const streamTitle = document.getElementById('streamTitle');
const setTitleBtn = document.getElementById('setTitleBtn');
const streamGame = document.getElementById('streamGame');
const setGameBtn = document.getElementById('setGameBtn');

/**
 * Set stream title for a channel
 */
async function setStreamTitle(channel, title) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'sendModAction',
            channel: channel,
            action: 'title',
            data: { title }
        });

        return response;
    } catch (error) {
        console.error('[Popup] Error setting title:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Set stream game/category for a channel
 */
async function setStreamGame(channel, game) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'sendModAction',
            channel: channel,
            action: 'game',
            data: { game }
        });

        return response;
    } catch (error) {
        console.error('[Popup] Error setting game:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get first active channel
 */
async function getFirstActiveChannel() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getChatPopups' });
        const popups = response.popups || [];
        const activePopup = popups.find(p => p.ready);
        return activePopup?.channel || null;
    } catch (error) {
        return null;
    }
}

// Set title button handler
setTitleBtn.addEventListener('click', async () => {
    const title = streamTitle.value.trim();
    if (!title) return;

    const channel = await getFirstActiveChannel();
    if (!channel) {
        alert('Nejprve otevrete kanal pro ktery chcete nastavit nazev');
        return;
    }

    setTitleBtn.disabled = true;
    const result = await setStreamTitle(channel, title);
    setTitleBtn.disabled = false;

    if (result.success) {
        streamTitle.value = '';
        alert('Nazev streamu nastaven!');
    } else {
        alert('Chyba: ' + (result.error || 'Nelze nastavit nazev. Jste broadcaster?'));
    }
});

// Set game button handler
setGameBtn.addEventListener('click', async () => {
    const game = streamGame.value.trim();
    if (!game) return;

    const channel = await getFirstActiveChannel();
    if (!channel) {
        alert('Nejprve otevrete kanal pro ktery chcete nastavit kategorii');
        return;
    }

    setGameBtn.disabled = true;
    const result = await setStreamGame(channel, game);
    setGameBtn.disabled = false;

    if (result.success) {
        streamGame.value = '';
        alert('Kategorie nastavena!');
    } else {
        alert('Chyba: ' + (result.error || 'Nelze nastavit kategorii. Jste broadcaster?'));
    }
});

// Enter key handlers
streamTitle.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') setTitleBtn.click();
});

streamGame.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') setGameBtn.click();
});

// Initialize
init();
