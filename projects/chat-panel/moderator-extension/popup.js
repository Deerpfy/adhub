/**
 * AdHub Multistream Chat Moderator
 * Popup Script - Sprava chat popup oken
 *
 * Nepouziva OAuth - vyuziva existujici Twitch session.
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

// Initialize
init();
