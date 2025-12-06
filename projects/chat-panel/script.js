/**
 * AdHub Multistream Chat v2
 * Main Script - Hlavní logika aplikace
 *
 * Funguje kompletně v prohlížeči bez serveru.
 * Podporuje: Twitch, Kick, YouTube
 */

// =============================================================================
// GLOBÁLNÍ STAV
// =============================================================================

const AppState = {
    channels: new Map(), // channel_id -> { adapter, info, element }
    messages: [],
    highlightedChannels: new Set(), // Set of channel IDs that are highlighted (priority view)
    settings: {
        showTimestamps: true,
        showPlatformBadges: true,
        showEmotes: true,
        compactMode: false,
        maxMessages: 500,
        fontSize: 14,
        theme: 'dark',
    },
    youtubeApiKey: '', // Uloženo pouze v session
    // Moderator extension stav
    modExtension: {
        available: false,
        version: null,
        authenticated: false,
        user: null,
        channels: [], // Kanaly kde ma uzivatel mod opravneni
    },
};

// =============================================================================
// DOM ELEMENTY
// =============================================================================

const DOM = {
    connectionStatus: null,
    channelList: null,
    chatContainer: null,
    addChannelModal: null,
    settingsModal: null,
    extensionModal: null,
    toastContainer: null,
};

// =============================================================================
// INICIALIZACE
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elementů
    DOM.connectionStatus = document.getElementById('connectionStatus');
    DOM.channelList = document.getElementById('channelList');
    DOM.chatContainer = document.getElementById('chatContainer');
    DOM.addChannelModal = document.getElementById('addChannelModal');
    DOM.settingsModal = document.getElementById('settingsModal');
    DOM.extensionModal = document.getElementById('extensionModal');
    DOM.toastContainer = document.getElementById('toastContainer');

    // Načíst nastavení z localStorage
    loadSettings();

    // Načíst zvýrazněné kanály
    loadHighlightedChannels();

    // Načíst uložené kanály
    loadSavedChannels();

    // Aktualizovat UI pro zvýrazněné kanály
    updateFilterStatusUI();

    // Inicializovat event listenery
    initEventListeners();

    // Aplikovat nastavení
    applySettings();

    // Inicializovat moderator extension
    initModeratorExtension();

    // Event listener pro mod akce (delegated)
    document.addEventListener('click', handleModActionClick);

    console.log('[AdHub] Multistream Chat v2.2 initialized');
});

// =============================================================================
// EVENT LISTENERY
// =============================================================================

function initEventListeners() {
    // Add Channel Modal
    document.getElementById('addChannelBtn').addEventListener('click', () => {
        openModal(DOM.addChannelModal);
    });

    document.getElementById('closeAddModal').addEventListener('click', () => {
        closeModal(DOM.addChannelModal);
    });

    // Settings Modal
    document.getElementById('settingsBtn').addEventListener('click', () => {
        openModal(DOM.settingsModal);
    });

    document.getElementById('closeSettingsModal').addEventListener('click', () => {
        closeModal(DOM.settingsModal);
    });

    // Extension Modal
    document.getElementById('extensionBtn').addEventListener('click', () => {
        openModal(DOM.extensionModal);
        updateExtensionModalStatus();
    });

    document.getElementById('closeExtensionModal').addEventListener('click', () => {
        closeModal(DOM.extensionModal);
    });

    document.getElementById('extensionModalDownloadBtn').addEventListener('click', downloadExtension);

    // Initialize extension status indicator
    initExtensionStatusIndicator();

    // Theme Toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Clear filter button
    document.getElementById('clearFilterBtn')?.addEventListener('click', clearAllHighlights);

    // Platform selector
    document.querySelectorAll('.platform-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const platform = e.currentTarget.dataset.platform;
            switchPlatformForm(platform);
        });
    });

    // Forms
    document.getElementById('twitchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const channel = document.getElementById('twitchChannel').value.trim();
        if (channel) {
            addChannel('twitch', channel);
            closeModal(DOM.addChannelModal);
            document.getElementById('twitchChannel').value = '';
        }
    });

    document.getElementById('kickForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const channel = document.getElementById('kickChannel').value.trim();
        if (channel) {
            addChannel('kick', channel);
            closeModal(DOM.addChannelModal);
            document.getElementById('kickChannel').value = '';
        }
    });

    // YouTube mode selector
    document.querySelectorAll('.youtube-mode-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const mode = e.currentTarget.dataset.mode;

            // Update button states
            document.querySelectorAll('.youtube-mode-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.mode === mode);
            });

            // Show/hide appropriate fields
            document.getElementById('youtubeIframeFields').classList.toggle('hidden', mode !== 'iframe');
            document.getElementById('youtubeApiFields').classList.toggle('hidden', mode !== 'api');
            document.getElementById('youtubeExtensionFields').classList.toggle('hidden', mode !== 'extension');

            // Check extension status when extension mode is selected
            if (mode === 'extension') {
                await checkYouTubeExtension();
            }
        });
    });

    // Download extension button
    document.getElementById('downloadExtensionBtn')?.addEventListener('click', downloadChatReaderExtension);

    document.getElementById('youtubeForm').addEventListener('submit', (e) => {
        e.preventDefault();

        // Determine which mode is active
        const activeMode = document.querySelector('.youtube-mode-btn.active')?.dataset.mode || 'iframe';

        if (activeMode === 'extension') {
            // Extension mode
            const channel = document.getElementById('youtubeExtChannel').value.trim();
            if (channel) {
                addChannel('youtube-extension', channel);
                closeModal(DOM.addChannelModal);
                document.getElementById('youtubeExtChannel').value = '';
            } else {
                showToast('Vyplnte video URL nebo ID', 'error');
            }
        } else if (activeMode === 'iframe') {
            // Iframe mode
            const channel = document.getElementById('youtubeChannel').value.trim();
            if (channel) {
                addChannel('youtube-iframe', channel);
                closeModal(DOM.addChannelModal);
                document.getElementById('youtubeChannel').value = '';
            } else {
                showToast('Vyplnte kanal nebo video ID', 'error');
            }
        } else {
            // API mode
            const videoId = document.getElementById('youtubeVideoId').value.trim();
            const apiKey = document.getElementById('youtubeApiKey').value.trim();

            if (videoId && apiKey) {
                AppState.youtubeApiKey = apiKey;
                addChannel('youtube', videoId, { apiKey });
                closeModal(DOM.addChannelModal);
                document.getElementById('youtubeVideoId').value = '';
            } else {
                showToast('Vyplnte Video ID a API klic', 'error');
            }
        }
    });

    // Settings
    document.getElementById('showTimestamps').addEventListener('change', (e) => {
        AppState.settings.showTimestamps = e.target.checked;
        saveSettings();
        rerenderMessages();
    });

    document.getElementById('showPlatformBadges').addEventListener('change', (e) => {
        AppState.settings.showPlatformBadges = e.target.checked;
        saveSettings();
        rerenderMessages();
    });

    document.getElementById('showEmotes').addEventListener('change', (e) => {
        AppState.settings.showEmotes = e.target.checked;
        saveSettings();
        rerenderMessages();
    });

    document.getElementById('compactMode').addEventListener('change', (e) => {
        AppState.settings.compactMode = e.target.checked;
        saveSettings();
        rerenderMessages();
    });

    document.getElementById('maxMessages').addEventListener('change', (e) => {
        AppState.settings.maxMessages = parseInt(e.target.value) || 500;
        saveSettings();
        trimMessages();
    });

    document.getElementById('fontSize').addEventListener('change', (e) => {
        AppState.settings.fontSize = parseInt(e.target.value);
        saveSettings();
        applySettings();
    });

    // Data management
    document.getElementById('exportSettings').addEventListener('click', exportSettings);
    document.getElementById('importSettings').addEventListener('click', importSettings);
    document.getElementById('clearAllData').addEventListener('click', clearAllData);

    // Modal close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay);
            }
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// =============================================================================
// KANÁLY
// =============================================================================

/**
 * Extrahuje zobrazované jméno z kanálu/URL
 */
function extractDisplayName(platform, channel) {
    // Pro Twitch - extrahovat username z URL
    if (platform === 'twitch') {
        // https://www.twitch.tv/username nebo https://twitch.tv/username
        if (channel.includes('twitch.tv')) {
            const match = channel.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
            if (match) {
                return match[1];
            }
        }
        return channel;
    }

    // Pro Kick - extrahovat username z URL
    if (platform === 'kick') {
        // https://kick.com/username
        if (channel.includes('kick.com')) {
            const match = channel.match(/kick\.com\/([a-zA-Z0-9_-]+)/);
            if (match) {
                return match[1];
            }
        }
        return channel;
    }

    // Pro YouTube extrahovat z URL nebo použít videoId
    if (platform.startsWith('youtube')) {
        // Pokud je to URL, zkusit extrahovat
        if (channel.includes('youtube.com') || channel.includes('youtu.be')) {
            // Zkusit extrahovat video ID z URL
            const urlMatch = channel.match(/(?:v=|\/live\/|youtu\.be\/)([a-zA-Z0-9_-]+)/);
            if (urlMatch) {
                return `YT:${urlMatch[1].substring(0, 8)}...`;
            }
        }
        // Pokud je to krátké ID, použít ho
        if (channel.length <= 15) {
            return channel;
        }
        return `YT:${channel.substring(0, 8)}...`;
    }

    return channel;
}

/**
 * Přidání nového kanálu
 */
async function addChannel(platform, channel, options = {}) {
    const channelId = `${platform}-${channel.toLowerCase()}`;

    // Kontrola duplicity
    if (AppState.channels.has(channelId)) {
        showToast(`Kanál ${channel} je již přidán`, 'warning');
        return;
    }

    // Vytvořit adapter
    let adapter;
    try {
        switch (platform) {
            case 'twitch':
                adapter = new TwitchAdapter({ channel });
                break;
            case 'kick':
                adapter = new KickAdapter({ channel });
                break;
            case 'youtube':
                adapter = new YouTubeAdapter({
                    channel, // videoId
                    apiKey: options.apiKey || AppState.youtubeApiKey,
                });
                break;
            case 'youtube-iframe':
                adapter = new YouTubeIframeAdapter({ channel });
                break;
            case 'youtube-extension':
                adapter = new YouTubeExtensionAdapter({ channel });
                break;
            default:
                throw new Error(`Neznama platforma: ${platform}`);
        }
    } catch (error) {
        showToast(`Chyba při vytváření adapteru: ${error.message}`, 'error');
        return;
    }

    // Přidat do stavu
    const channelData = {
        id: channelId,
        platform,
        channel,
        displayName: extractDisplayName(platform, channel),
        adapter,
        state: 'connecting',
    };

    AppState.channels.set(channelId, channelData);

    // Vytvořit UI element
    renderChannelItem(channelData);

    // Odstranit welcome screen
    hideWelcomeScreen();

    // Event listenery
    adapter.on('connect', (data) => {
        channelData.state = 'connected';

        // Pokud přišel channelName (např. z YouTube extension), aktualizovat displayName
        if (data?.channelName && platform.startsWith('youtube')) {
            channelData.displayName = data.channelName;
            updateChannelItemName(channelId, data.channelName);
        }

        updateChannelItemState(channelId, 'connected');
        updateConnectionStatus();
        updateIframeSection();
        showToast(`Připojeno k ${channelData.displayName || channel}`, 'success');
        saveChannels();
    });

    adapter.on('disconnect', () => {
        channelData.state = 'disconnected';
        updateChannelItemState(channelId, 'disconnected');
        updateConnectionStatus();
        updateIframeSection();
    });

    adapter.on('error', (error) => {
        channelData.state = 'error';
        updateChannelItemState(channelId, 'error');
        showToast(`${channel}: ${error.message}`, 'error');
    });

    adapter.on('message', (message) => {
        handleMessage(message);
    });

    // Připojit
    updateConnectionStatus();
    adapter.connect();
}

/**
 * Odstranění kanálu
 */
function removeChannel(channelId) {
    const channelData = AppState.channels.get(channelId);
    if (!channelData) return;

    // Odpojit adapter
    channelData.adapter.disconnect();

    // Odstranit z mapy
    AppState.channels.delete(channelId);

    // Odstranit UI element
    const element = document.querySelector(`[data-channel-id="${channelId}"]`);
    if (element) {
        element.remove();
    }

    // Aktualizovat stav
    updateConnectionStatus();
    updateIframeSection();
    saveChannels();

    // Zobrazit welcome screen pokud není žádný kanál
    if (AppState.channels.size === 0) {
        showWelcomeScreen();
    }

    // Odstranit prázdnou iframe sekci
    const iframeSection = DOM.chatContainer.querySelector('.iframe-section');
    if (iframeSection && iframeSection.children.length === 0) {
        iframeSection.remove();
    }

    showToast(`Kanál ${channelData.channel} odstraněn`, 'info');
}

/**
 * Vykreslení položky kanálu v sidebaru
 */
function renderChannelItem(channelData) {
    const emptyState = DOM.channelList.querySelector('.channel-empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const item = document.createElement('div');
    const isHighlighted = AppState.highlightedChannels.has(channelData.id);
    item.className = `channel-item ${channelData.state}${isHighlighted ? ' highlighted' : ''}`;
    item.dataset.channelId = channelData.id;

    // Zobrazit kratsi nazev platformy
    const platformDisplay = channelData.platform.replace('youtube-', 'yt-');

    item.innerHTML = `
        <div class="channel-icon ${channelData.platform.split('-')[0]}">
            ${getPlatformIcon(channelData.platform)}
        </div>
        <div class="channel-info">
            <div class="channel-name">${escapeHtml(channelData.displayName || channelData.channel)}</div>
            <div class="channel-platform">${platformDisplay}</div>
        </div>
        <div class="channel-status"></div>
        <div class="channel-actions">
            <button class="channel-action-btn channel-reconnect" title="Obnovit spojeni">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 4v6h-6"></path>
                    <path d="M1 20v-6h6"></path>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
            </button>
            <button class="channel-action-btn channel-remove" title="Odebrat kanal">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `;

    // Click on channel item to toggle highlight
    item.addEventListener('click', (e) => {
        // Don't toggle if clicking on action buttons
        if (e.target.closest('.channel-actions')) return;
        toggleChannelHighlight(channelData.id);
    });

    item.querySelector('.channel-reconnect').addEventListener('click', (e) => {
        e.stopPropagation();
        reconnectChannel(channelData.id);
    });

    item.querySelector('.channel-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        removeChannel(channelData.id);
    });

    DOM.channelList.appendChild(item);
}

/**
 * Obnoveni spojeni kanalu
 */
function reconnectChannel(channelId) {
    const channelData = AppState.channels.get(channelId);
    if (!channelData) return;

    console.log('[Reconnect] Reconnecting channel:', channelId);

    // Odpojit
    channelData.adapter.disconnect();
    channelData.state = 'connecting';
    updateChannelItemState(channelId, 'connecting');

    // Znovu pripojit
    setTimeout(() => {
        channelData.adapter.connect();
        showToast(`Obnovuji ${channelData.channel}...`, 'info');
    }, 500);
}

/**
 * Toggle channel highlight (priority view)
 */
function toggleChannelHighlight(channelId) {
    const isHighlighted = AppState.highlightedChannels.has(channelId);

    if (isHighlighted) {
        AppState.highlightedChannels.delete(channelId);
    } else {
        AppState.highlightedChannels.add(channelId);
    }

    // Update channel item UI
    updateChannelHighlightUI(channelId, !isHighlighted);

    // Update all messages visibility
    updateMessagesHighlight();

    // Update filter status UI
    updateFilterStatusUI();

    // Save to localStorage
    saveHighlightedChannels();
}

/**
 * Clear all channel highlights
 */
function clearAllHighlights() {
    // Remove highlighted class from all channel items
    AppState.highlightedChannels.forEach(channelId => {
        updateChannelHighlightUI(channelId, false);
    });

    // Clear the set
    AppState.highlightedChannels.clear();

    // Update messages
    updateMessagesHighlight();

    // Update filter status UI
    updateFilterStatusUI();

    // Save to localStorage
    saveHighlightedChannels();
}

/**
 * Update filter status UI (show/hide filter bar)
 */
function updateFilterStatusUI() {
    const filterActive = document.getElementById('channelFilterActive');
    const filterCount = document.getElementById('filterCount');
    const filterHint = document.querySelector('.channel-filter-hint');

    if (!filterActive || !filterCount) return;

    const count = AppState.highlightedChannels.size;

    if (count > 0) {
        filterActive.classList.remove('hidden');
        filterCount.textContent = count;
        if (filterHint) filterHint.classList.add('hidden');
    } else {
        filterActive.classList.add('hidden');
        if (filterHint) filterHint.classList.remove('hidden');
    }
}

/**
 * Update channel item highlight UI
 */
function updateChannelHighlightUI(channelId, highlighted) {
    const element = document.querySelector(`[data-channel-id="${channelId}"]`);
    if (element) {
        element.classList.toggle('highlighted', highlighted);
    }
}

/**
 * Extract video ID from YouTube URL or return as-is
 */
function extractVideoId(input) {
    if (!input) return '';
    // Try to extract from URL
    const urlMatch = input.match(/(?:v=|\/live\/|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];
    // Already a video ID or channel name
    return input;
}

/**
 * Extract channel name from Twitch/Kick URL or return as-is
 */
function extractChannelName(platform, input) {
    if (!input) return '';

    // Twitch URL: twitch.tv/username
    if (platform === 'twitch' && input.includes('twitch.tv')) {
        const match = input.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
        if (match) return match[1];
    }

    // Kick URL: kick.com/username
    if (platform === 'kick' && input.includes('kick.com')) {
        const match = input.match(/kick\.com\/([a-zA-Z0-9_-]+)/);
        if (match) return match[1];
    }

    // Remove @ prefix
    return input.replace(/^@/, '');
}

/**
 * Normalize channel ID for comparison
 */
function normalizeChannelId(platform, channel) {
    // Remove # prefix (from IRC), trim whitespace, lowercase
    let normalizedChannel = (channel || '').replace(/^#/, '').trim().toLowerCase();

    // For YouTube, extract video ID if it's a URL
    if (platform.startsWith('youtube')) {
        normalizedChannel = extractVideoId(normalizedChannel).toLowerCase();
    }

    return `${platform}-${normalizedChannel}`;
}

/**
 * Check if a message belongs to a highlighted channel
 */
function isMessageHighlighted(message) {
    if (AppState.highlightedChannels.size === 0) return false;

    const msgChannel = (message.channel || '').toLowerCase();
    const msgPlatform = message.platform;
    const basePlatform = msgPlatform.split('-')[0]; // twitch, kick, youtube

    // Check all highlighted channels
    for (const highlightedId of AppState.highlightedChannels) {
        // Parse highlighted ID - format: "platform-channel" or "platform-subtype-channel"
        // Examples: "twitch-moonmoon", "youtube-extension-videoId", "kick-xqc"
        let hPlatform, hChannel;

        if (highlightedId.startsWith('youtube-extension-')) {
            hPlatform = 'youtube-extension';
            hChannel = highlightedId.substring('youtube-extension-'.length);
        } else if (highlightedId.startsWith('youtube-iframe-')) {
            hPlatform = 'youtube-iframe';
            hChannel = highlightedId.substring('youtube-iframe-'.length);
        } else {
            // Simple format: platform-channel
            const firstDash = highlightedId.indexOf('-');
            hPlatform = highlightedId.substring(0, firstDash);
            hChannel = highlightedId.substring(firstDash + 1);
        }

        const hBasePlatform = hPlatform.split('-')[0]; // twitch, kick, youtube

        // Extract actual channel name/ID based on platform
        let normalizedHChannel;
        if (hBasePlatform === 'youtube') {
            normalizedHChannel = extractVideoId(hChannel).toLowerCase();
        } else {
            // Twitch, Kick - extract username from URL if needed
            normalizedHChannel = extractChannelName(hBasePlatform, hChannel).toLowerCase();
        }

        // Match conditions:
        // 1. Same base platform (twitch, kick, youtube)
        // 2. Channel matches (direct or extracted)
        if (basePlatform === hBasePlatform) {
            if (msgChannel === hChannel.toLowerCase() ||
                msgChannel === normalizedHChannel) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Update all messages based on highlighted channels
 */
function updateMessagesHighlight() {
    const messagesContainer = DOM.chatContainer.querySelector('.chat-messages');
    if (!messagesContainer) return;

    const hasHighlights = AppState.highlightedChannels.size > 0;

    // Get all messages
    const messages = messagesContainer.querySelectorAll('.chat-message');
    messages.forEach(msgEl => {
        const messageId = msgEl.dataset.messageId;
        const message = AppState.messages.find(m => m.id === messageId);

        if (message) {
            const isHighlighted = isMessageHighlighted(message);

            // If there are highlights, dim non-highlighted messages
            if (hasHighlights) {
                msgEl.classList.toggle('dimmed', !isHighlighted);
            } else {
                // No highlights = show all normally
                msgEl.classList.remove('dimmed');
            }
        }
    });
}

/**
 * Save highlighted channels to localStorage
 */
function saveHighlightedChannels() {
    const highlighted = Array.from(AppState.highlightedChannels);
    localStorage.setItem('adhub_chat_highlighted', JSON.stringify(highlighted));
}

/**
 * Load highlighted channels from localStorage
 */
function loadHighlightedChannels() {
    try {
        const saved = localStorage.getItem('adhub_chat_highlighted');
        if (saved) {
            const highlighted = JSON.parse(saved);
            AppState.highlightedChannels = new Set(highlighted);
        }
    } catch (error) {
        console.error('[Highlights] Load error:', error);
    }
}

/**
 * Aktualizace stavu kanálu v UI
 */
function updateChannelItemState(channelId, state) {
    const element = document.querySelector(`[data-channel-id="${channelId}"]`);
    if (element) {
        // Preserve highlighted class when updating state
        const isHighlighted = element.classList.contains('highlighted');
        element.className = `channel-item ${state}${isHighlighted ? ' highlighted' : ''}`;
    }
}

/**
 * Aktualizace názvu kanálu v UI
 */
function updateChannelItemName(channelId, name) {
    const element = document.querySelector(`[data-channel-id="${channelId}"]`);
    if (element) {
        const nameEl = element.querySelector('.channel-name');
        if (nameEl) {
            nameEl.textContent = name;
        }
    }
}

/**
 * Získání ikony platformy (vylepšené SVG ikonky)
 */
function getPlatformIcon(platform) {
    switch (platform) {
        case 'twitch':
            // Twitch Glitch logo - vylepšená verze
            return `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M4.5 0L0 4.5v15h5.25V24l4.5-4.5h3.5L22.5 12V0zm15.75 11.25l-3.25 3.25h-3.5l-2.88 2.88V14.5h-4V2.25h13.63z"/>
            </svg>`;
        case 'kick':
            // Kick logo - stylizované K
            return `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.5 3h3v7.5L15 3h4l-6.5 9L19 21h-4l-5.5-7.5V21h-3V3z"/>
            </svg>`;
        case 'youtube':
        case 'youtube-iframe':
        case 'youtube-extension':
            // YouTube logo - play button v obdélníku
            return `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>`;
        default:
            return '💬';
    }
}

/**
 * Získání malé ikony platformy pro zprávy (kompaktnější verze)
 */
function getPlatformIconSmall(platform) {
    switch (platform) {
        case 'twitch':
            return `<svg viewBox="0 0 24 24" fill="currentColor" class="platform-icon-sm">
                <path d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M4.5 0L0 4.5v15h5.25V24l4.5-4.5h3.5L22.5 12V0zm15.75 11.25l-3.25 3.25h-3.5l-2.88 2.88V14.5h-4V2.25h13.63z"/>
            </svg>`;
        case 'kick':
            return `<svg viewBox="0 0 24 24" fill="currentColor" class="platform-icon-sm">
                <path d="M6.5 3h3v7.5L15 3h4l-6.5 9L19 21h-4l-5.5-7.5V21h-3V3z"/>
            </svg>`;
        case 'youtube':
        case 'youtube-iframe':
        case 'youtube-extension':
            return `<svg viewBox="0 0 24 24" fill="currentColor" class="platform-icon-sm">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>`;
        default:
            return '💬';
    }
}

// =============================================================================
// ZPRÁVY
// =============================================================================

/**
 * Zpracování nové zprávy
 */
function handleMessage(message) {
    // Přidat do pole
    AppState.messages.push(message);

    // Oříznout pole pokud je moc velké
    trimMessages();

    // Vykreslit zprávu
    renderMessage(message);

    // Auto-scroll
    scrollToBottom();
}

/**
 * Vykreslení zprávy
 */
function renderMessage(message) {
    // Zajistit že existuje kontejner pro zprávy
    let messagesContainer = DOM.chatContainer.querySelector('.chat-messages');
    if (!messagesContainer) {
        messagesContainer = document.createElement('div');
        messagesContainer.className = 'chat-messages';
        DOM.chatContainer.innerHTML = '';
        DOM.chatContainer.appendChild(messagesContainer);
    }

    // Zjistit display name kanálu
    const channelName = message.channel || 'unknown';
    const channelId = `${message.platform}-${channelName.toLowerCase()}`;
    const channelData = AppState.channels.get(channelId);
    const channelDisplayName = channelData?.displayName || channelName;
    const basePlatform = message.platform.split('-')[0]; // twitch, kick, youtube

    // Determine if message should be dimmed (use centralized function)
    const hasHighlights = AppState.highlightedChannels.size > 0;
    const isHighlighted = isMessageHighlighted(message);
    const isDimmed = hasHighlights && !isHighlighted;

    const messageEl = document.createElement('div');
    messageEl.className = `chat-message platform-${basePlatform}${AppState.settings.compactMode ? ' compact' : ''}${isDimmed ? ' dimmed' : ''}`;
    messageEl.dataset.messageId = message.id;

    let html = '';

    // Streamer label (ikona platformy + název kanálu)
    html += `<div class="message-streamer-label ${basePlatform}">`;
    html += `<span class="streamer-icon">${getPlatformIcon(message.platform)}</span>`;
    html += `<span class="streamer-name">${escapeHtml(channelDisplayName)}</span>`;
    html += '</div>';

    // Message body
    html += '<div class="message-body">';

    // Timestamp
    if (AppState.settings.showTimestamps) {
        const time = message.timestamp.toLocaleTimeString('cs-CZ', {
            hour: '2-digit',
            minute: '2-digit',
        });
        html += `<span class="message-timestamp">${time}</span>`;
    }

    // Content
    html += '<span class="message-content">';

    // Author badges
    if (message.author.badges && message.author.badges.length > 0) {
        html += '<span class="user-badges">';
        for (const badge of message.author.badges) {
            if (badge.url) {
                html += `<img class="user-badge" src="${escapeHtml(badge.url)}" alt="${escapeHtml(badge.title)}" title="${escapeHtml(badge.title)}">`;
            }
        }
        html += '</span>';
    }

    // Author name
    const roleClass = getRoleClass(message.author.roles);
    html += `<span class="message-author ${roleClass}" style="color: ${escapeHtml(message.author.color)}">${escapeHtml(message.author.displayName)}</span>`;

    // Message text with emotes
    let content = escapeHtml(message.content);

    if (AppState.settings.showEmotes && message.emotes && message.emotes.length > 0) {
        content = replaceEmotes(message.content, message.emotes);
    }

    html += `<span class="message-text">${content}</span>`;
    html += '</span>'; // Close message-content

    // Moderacni tlacitka (pokud ma uzivatel opravneni)
    html += generateModActionsHtml(message);

    html += '</div>'; // Close message-body

    messageEl.innerHTML = html;
    messagesContainer.appendChild(messageEl);
}

/**
 * Nahrazení emotes v textu obrázky
 */
function replaceEmotes(text, emotes) {
    if (!emotes || emotes.length === 0) return escapeHtml(text);

    // Seřadit emotes podle pozice (od začátku)
    const sortedEmotes = [...emotes].sort((a, b) => a.start - b.start);

    let result = '';
    let lastEnd = 0;

    for (const emote of sortedEmotes) {
        // Přidat text před tímto emotem (escapovaný)
        if (emote.start > lastEnd) {
            result += escapeHtml(text.substring(lastEnd, emote.start));
        }

        // Přidat emote obrázek
        result += `<img class="message-emote" src="${escapeHtml(emote.url)}" alt="${escapeHtml(emote.name)}" title="${escapeHtml(emote.name)}">`;

        lastEnd = emote.end + 1;
    }

    // Přidat zbývající text za posledním emotem (escapovaný)
    if (lastEnd < text.length) {
        result += escapeHtml(text.substring(lastEnd));
    }

    return result;
}

/**
 * Získání CSS třídy podle role
 */
function getRoleClass(roles) {
    if (!roles) return '';
    if (roles.broadcaster) return 'broadcaster';
    if (roles.moderator) return 'moderator';
    if (roles.vip) return 'vip';
    if (roles.subscriber) return 'subscriber';
    return '';
}

/**
 * Oříznutí pole zpráv
 */
function trimMessages() {
    const max = AppState.settings.maxMessages;
    if (AppState.messages.length > max) {
        const toRemove = AppState.messages.length - max;
        AppState.messages.splice(0, toRemove);

        // Odstranit z DOM
        const messagesContainer = DOM.chatContainer.querySelector('.chat-messages');
        if (messagesContainer) {
            const children = messagesContainer.children;
            for (let i = 0; i < toRemove && children.length > 0; i++) {
                children[0].remove();
            }
        }
    }
}

/**
 * Překreslení všech zpráv
 */
function rerenderMessages() {
    const messagesContainer = DOM.chatContainer.querySelector('.chat-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
        for (const message of AppState.messages) {
            renderMessage(message);
        }
    }
}

/**
 * Auto-scroll na konec
 */
function scrollToBottom() {
    DOM.chatContainer.scrollTop = DOM.chatContainer.scrollHeight;
}

// =============================================================================
// UI HELPERS
// =============================================================================

/**
 * Escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Otevření modalu
 */
function openModal(modal) {
    modal.classList.add('active');
}

/**
 * Zavření modalu
 */
function closeModal(modal) {
    modal.classList.remove('active');
}

/**
 * Zavření všech modalů
 */
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        closeModal(modal);
    });
}

/**
 * Přepnutí platformy v modalu
 */
function switchPlatformForm(platform) {
    // Aktivovat button
    document.querySelectorAll('.platform-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.platform === platform);
    });

    // Zobrazit form
    document.querySelectorAll('.platform-form').forEach(form => {
        form.classList.add('hidden');
    });
    document.getElementById(`${platform}Form`).classList.remove('hidden');
}

/**
 * Zobrazení welcome screen
 */
function showWelcomeScreen() {
    DOM.chatContainer.innerHTML = `
        <div class="chat-welcome">
            <div class="welcome-icon">🎮</div>
            <h2>Vítejte v Multistream Chat v2</h2>
            <p>Přidejte kanály z Twitch, Kick nebo YouTube pro zobrazení chatu.</p>
            <div class="platform-badges">
                <span class="platform-badge twitch">Twitch</span>
                <span class="platform-badge kick">Kick</span>
                <span class="platform-badge youtube">YouTube</span>
            </div>
            <p class="note">Tato verze funguje kompletně v prohlížeči - žádný server není potřeba!</p>
        </div>
    `;
}

/**
 * Skrytí welcome screen
 */
function hideWelcomeScreen() {
    const welcome = DOM.chatContainer.querySelector('.chat-welcome');
    if (welcome) {
        welcome.remove();
    }
}

/**
 * Aktualizace stavu iframe sekce
 */
function updateIframeSection() {
    const hasIframe = Array.from(AppState.channels.values())
        .some(c => c.platform === 'youtube-iframe');

    DOM.chatContainer.classList.toggle('has-iframe', hasIframe);

    // Aktualizovat počet iframes v sekci
    const iframeSection = DOM.chatContainer.querySelector('.iframe-section');
    if (iframeSection) {
        const iframeCount = iframeSection.querySelectorAll('.youtube-iframe-container').length;
        iframeSection.classList.toggle('multi', iframeCount > 1);
    }
}

/**
 * Přepnutí tématu
 */
function toggleTheme() {
    const currentTheme = document.documentElement.dataset.theme || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = newTheme;
    AppState.settings.theme = newTheme;
    saveSettings();
}

/**
 * Aktualizace connection status
 */
function updateConnectionStatus() {
    const total = AppState.channels.size;
    const connected = Array.from(AppState.channels.values())
        .filter(c => c.state === 'connected').length;

    const statusEl = DOM.connectionStatus;
    const textEl = statusEl.querySelector('.status-text');

    if (total === 0) {
        statusEl.className = 'connection-status';
        textEl.textContent = 'Nepřipojeno';
    } else if (connected === total) {
        statusEl.className = 'connection-status connected';
        textEl.textContent = `${connected}/${total} připojeno`;
    } else if (connected > 0) {
        statusEl.className = 'connection-status connecting';
        textEl.textContent = `${connected}/${total} připojeno`;
    } else {
        statusEl.className = 'connection-status connecting';
        textEl.textContent = 'Připojování...';
    }
}

/**
 * Zobrazení toast notifikace
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ',
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
        removeToast(toast);
    });

    DOM.toastContainer.appendChild(toast);

    // Auto-remove po 5 sekundách
    setTimeout(() => {
        removeToast(toast);
    }, 5000);
}

/**
 * Odstranění toast notifikace
 */
function removeToast(toast) {
    toast.classList.add('removing');
    setTimeout(() => {
        toast.remove();
    }, 300);
}

// =============================================================================
// NASTAVENÍ A PERSISTENCE
// =============================================================================

/**
 * Uložení nastavení do localStorage
 */
function saveSettings() {
    localStorage.setItem('adhub_chat_settings', JSON.stringify(AppState.settings));
}

/**
 * Načtení nastavení z localStorage
 */
function loadSettings() {
    try {
        const saved = localStorage.getItem('adhub_chat_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            AppState.settings = { ...AppState.settings, ...parsed };
        }
    } catch (error) {
        console.error('[Settings] Load error:', error);
    }

    // Aktualizovat UI
    document.getElementById('showTimestamps').checked = AppState.settings.showTimestamps;
    document.getElementById('showPlatformBadges').checked = AppState.settings.showPlatformBadges;
    document.getElementById('showEmotes').checked = AppState.settings.showEmotes;
    document.getElementById('compactMode').checked = AppState.settings.compactMode;
    document.getElementById('maxMessages').value = AppState.settings.maxMessages;
    document.getElementById('fontSize').value = AppState.settings.fontSize;
}

/**
 * Aplikování nastavení
 */
function applySettings() {
    // Téma
    document.documentElement.dataset.theme = AppState.settings.theme;

    // Font size
    document.documentElement.style.setProperty('--font-size-base', `${AppState.settings.fontSize}px`);
}

/**
 * Uložení kanálů do localStorage
 */
function saveChannels() {
    const channels = [];
    for (const [id, data] of AppState.channels) {
        channels.push({
            platform: data.platform,
            channel: data.channel,
        });
    }
    localStorage.setItem('adhub_chat_channels', JSON.stringify(channels));
}

/**
 * Načtení uložených kanálů
 */
function loadSavedChannels() {
    try {
        const saved = localStorage.getItem('adhub_chat_channels');
        if (saved) {
            const channels = JSON.parse(saved);
            for (const ch of channels) {
                // YouTube API kanály nepřidávat automaticky (potřebují API klíč)
                // YouTube iframe kanály načíst
                if (ch.platform !== 'youtube') {
                    addChannel(ch.platform, ch.channel);
                }
            }
        }
    } catch (error) {
        console.error('[Channels] Load error:', error);
    }
}

/**
 * Export nastavení
 */
function exportSettings() {
    const data = {
        settings: AppState.settings,
        channels: Array.from(AppState.channels.values()).map(c => ({
            platform: c.platform,
            channel: c.channel,
        })),
        highlightedChannels: Array.from(AppState.highlightedChannels),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'adhub-chat-settings.json';
    a.click();
    URL.revokeObjectURL(url);

    showToast('Nastavení exportováno', 'success');
}

/**
 * Import nastavení
 */
function importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (data.settings) {
                AppState.settings = { ...AppState.settings, ...data.settings };
                saveSettings();
                loadSettings();
                applySettings();
            }

            if (data.channels) {
                for (const ch of data.channels) {
                    if (ch.platform !== 'youtube') {
                        addChannel(ch.platform, ch.channel);
                    }
                }
            }

            if (data.highlightedChannels) {
                AppState.highlightedChannels = new Set(data.highlightedChannels);
                saveHighlightedChannels();
                // Update UI for highlighted channels
                data.highlightedChannels.forEach(channelId => {
                    updateChannelHighlightUI(channelId, true);
                });
            }

            showToast('Nastavení importováno', 'success');
        } catch (error) {
            showToast('Chyba při importu: ' + error.message, 'error');
        }
    };

    input.click();
}

/**
 * Vymazání všech dat
 */
function clearAllData() {
    if (!confirm('Opravdu chcete vymazat všechna data?')) {
        return;
    }

    // Odpojit všechny kanály
    for (const [id, data] of AppState.channels) {
        data.adapter.disconnect();
    }
    AppState.channels.clear();

    // Vymazat zprávy
    AppState.messages = [];

    // Vymazat zvýrazněné kanály
    AppState.highlightedChannels.clear();

    // Vymazat localStorage
    localStorage.removeItem('adhub_chat_settings');
    localStorage.removeItem('adhub_chat_channels');
    localStorage.removeItem('adhub_chat_highlighted');

    // Reset UI
    DOM.channelList.innerHTML = `
        <div class="channel-empty-state">
            <p>Zatím nemáte žádné kanály.</p>
            <p class="hint">Klikněte na "Přidat" pro připojení k chatu.</p>
        </div>
    `;

    showWelcomeScreen();
    updateConnectionStatus();

    showToast('Všechna data vymazána', 'info');

    // Reload stránky pro reset
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// =============================================================================
// YOUTUBE EXTENSION
// =============================================================================

const GITHUB_REPO = 'Deerpfy/adhub';
const GITHUB_BRANCH = 'main';
const EXTENSION_PATH = 'projects/chat-panel/extension';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';
const GITHUB_API_BASE = 'https://api.github.com';
const EXTENSION_COMMIT_KEY = 'adhub_chat_reader_commit';

/**
 * Ziska posledni commit pro extension slozku z GitHub API
 * @returns {Promise<{sha: string, shortSha: string, message: string, date: string}|null>}
 */
async function getLatestExtensionCommit() {
    try {
        const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/commits?path=${EXTENSION_PATH}&per_page=1`;
        const response = await fetch(url);
        if (!response.ok) {
            console.warn('[Extension] Cannot fetch commits:', response.status);
            return null;
        }
        const commits = await response.json();
        if (commits.length === 0) return null;

        const commit = commits[0];
        return {
            sha: commit.sha,
            shortSha: commit.sha.substring(0, 7),
            message: commit.commit.message.split('\n')[0],
            date: new Date(commit.commit.committer.date).toLocaleDateString('cs-CZ'),
        };
    } catch (e) {
        console.warn('[Extension] Error fetching commits:', e);
        return null;
    }
}

/**
 * Ziska ulozeny commit z localStorage (stazena verze)
 */
function getStoredExtensionCommit() {
    try {
        const stored = localStorage.getItem(EXTENSION_COMMIT_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {}
    return null;
}

/**
 * Ulozi commit do localStorage (pri stazeni)
 */
function storeExtensionCommit(commitInfo) {
    try {
        localStorage.setItem(EXTENSION_COMMIT_KEY, JSON.stringify(commitInfo));
    } catch (e) {
        console.warn('[Extension] Cannot store commit info:', e);
    }
}

/**
 * Kontrola YouTube Chat Reader extension
 */
async function checkYouTubeExtension() {
    const statusBox = document.getElementById('extensionStatusBox');
    const statusIcon = document.getElementById('extensionStatusIcon');
    const statusText = document.getElementById('extensionStatusText');
    const downloadHint = document.getElementById('extensionDownloadHint');
    const downloadBtnText = document.getElementById('downloadExtensionBtnText');
    const versionInfo = document.getElementById('extensionVersionInfo');
    const commitInfo = document.getElementById('extensionCommitInfo');
    const submitBtn = document.getElementById('youtubeExtSubmit');

    if (!statusBox) return;

    // Reset stavu
    statusBox.className = 'extension-status-box checking';
    statusIcon.textContent = '?';
    statusText.innerHTML = 'Kontroluji extension...';
    if (submitBtn) submitBtn.disabled = true;
    if (commitInfo) commitInfo.classList.add('hidden');

    // Nacti nejnovejsi verzi a commit z GitHubu paralelne
    let latestVersion = null;
    let latestCommit = null;

    const [versionResult, commitResult] = await Promise.allSettled([
        fetch(`${GITHUB_RAW_BASE}/${GITHUB_REPO}/${GITHUB_BRANCH}/${EXTENSION_PATH}/manifest.json`)
            .then(r => r.ok ? r.json() : null),
        getLatestExtensionCommit(),
    ]);

    if (versionResult.status === 'fulfilled' && versionResult.value) {
        latestVersion = versionResult.value.version;
    }
    if (commitResult.status === 'fulfilled') {
        latestCommit = commitResult.value;
    }

    // Ziskej ulozeny commit (stazena verze)
    const storedCommit = getStoredExtensionCommit();

    try {
        // Zkontroluj zda je YouTubeExtensionAdapter definovan
        if (typeof YouTubeExtensionAdapter === 'undefined') {
            throw new Error('Adapter not loaded');
        }

        const result = await YouTubeExtensionAdapter.checkExtension();

        if (result.available) {
            const installedVersion = result.version || '?';
            const isOutdated = latestVersion && installedVersion !== '?' &&
                               compareVersions(installedVersion, latestVersion) < 0;

            statusBox.className = 'extension-status-box available';
            statusIcon.textContent = '✓';

            if (isOutdated) {
                statusText.innerHTML = `Extension aktivni <span class="version outdated">v${installedVersion} (zastarala)</span>`;
                if (downloadHint) downloadHint.textContent = 'K dispozici je nova verze:';
                if (downloadBtnText) downloadBtnText.textContent = `Aktualizovat na v${latestVersion}`;
                if (versionInfo) {
                    versionInfo.innerHTML = `Vase verze: <strong>v${installedVersion}</strong> → Nejnovejsi: <strong>v${latestVersion}</strong>`;
                    versionInfo.classList.remove('hidden');
                }
            } else {
                statusText.innerHTML = `Extension aktivni <span class="version">v${installedVersion}</span>`;
                if (downloadHint) downloadHint.textContent = 'Stahnout znovu nebo aktualizovat:';
                if (downloadBtnText) downloadBtnText.textContent = latestVersion ? `Stahnout v${latestVersion}` : 'Stahnout Extension';
                if (versionInfo) versionInfo.classList.add('hidden');
            }

            if (submitBtn) submitBtn.disabled = false;
        } else {
            statusBox.className = 'extension-status-box unavailable';
            statusIcon.textContent = '✕';
            statusText.innerHTML = 'Extension neni nainstalovana';
            if (downloadHint) downloadHint.textContent = 'Pro pouziti Extension rezimu nainstalujte rozsireni:';
            if (downloadBtnText) downloadBtnText.textContent = latestVersion ? `Stahnout v${latestVersion}` : 'Stahnout Extension';
            if (versionInfo) versionInfo.classList.add('hidden');
            if (submitBtn) submitBtn.disabled = true;
        }

        // Zobraz commit info
        if (commitInfo && latestCommit) {
            const hasUpdate = storedCommit && storedCommit.sha !== latestCommit.sha;
            let commitHtml = '';

            if (storedCommit) {
                commitHtml += `<span class="commit-label">Stazeno:</span> <code class="commit-sha">${storedCommit.shortSha}</code>`;
                if (hasUpdate) {
                    commitHtml += ` <span class="commit-arrow">→</span> `;
                }
            }

            if (!storedCommit || hasUpdate) {
                commitHtml += `<span class="commit-label">Nejnovejsi:</span> <code class="commit-sha ${hasUpdate ? 'new' : ''}">${latestCommit.shortSha}</code>`;
            }

            if (latestCommit.message) {
                commitHtml += `<span class="commit-message" title="${escapeHtml(latestCommit.message)}">${escapeHtml(latestCommit.message.substring(0, 40))}${latestCommit.message.length > 40 ? '...' : ''}</span>`;
            }

            commitInfo.innerHTML = commitHtml;
            commitInfo.classList.remove('hidden');
        }
    } catch (error) {
        console.error('[Extension Check] Error:', error);
        statusBox.className = 'extension-status-box unavailable';
        statusIcon.textContent = '!';
        statusText.innerHTML = 'Nelze zkontrolovat extension';
        if (downloadHint) downloadHint.textContent = 'Stahnout rozsireni:';
        if (downloadBtnText) downloadBtnText.textContent = latestVersion ? `Stahnout v${latestVersion}` : 'Stahnout Extension';
        if (versionInfo) versionInfo.classList.add('hidden');
        if (commitInfo) commitInfo.classList.add('hidden');
        if (submitBtn) submitBtn.disabled = true;
    }
}

/**
 * Porovnani semver verzi: -1 = a < b, 0 = a == b, 1 = a > b
 */
function compareVersions(a, b) {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    const len = Math.max(partsA.length, partsB.length);

    for (let i = 0; i < len; i++) {
        const numA = partsA[i] || 0;
        const numB = partsB[i] || 0;
        if (numA < numB) return -1;
        if (numA > numB) return 1;
    }
    return 0;
}

/**
 * Stazeni Chat Reader extension jako ZIP
 */
async function downloadChatReaderExtension() {
    const downloadBtn = document.getElementById('downloadExtensionBtn');
    const downloadSection = document.getElementById('extensionDownloadSection');

    if (!downloadBtn) return;

    // Zobraz progress
    const originalContent = downloadBtn.innerHTML;
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = 'Stahuji...';

    // Pridej progress element
    let progressEl = downloadSection.querySelector('.extension-download-progress');
    if (!progressEl) {
        progressEl = document.createElement('div');
        progressEl.className = 'extension-download-progress';
        progressEl.innerHTML = `
            <div class="extension-progress-bar-bg">
                <div class="extension-progress-bar" id="extProgressBar"></div>
            </div>
            <div class="extension-progress-text" id="extProgressText">Pripravuji...</div>
        `;
        downloadSection.appendChild(progressEl);
    }
    progressEl.classList.remove('hidden');

    const progressBar = document.getElementById('extProgressBar');
    const progressText = document.getElementById('extProgressText');

    try {
        // Ziskej nejnovejsi commit pred stazenim
        progressText.textContent = 'Ziskavam informace o verzi...';
        const latestCommit = await getLatestExtensionCommit();

        // Seznam souboru k stazeni (vcetne PNG ikon)
        const files = [
            { path: 'manifest.json', binary: false },
            { path: 'background.js', binary: false },
            { path: 'popup.html', binary: false },
            { path: 'popup.js', binary: false },
            { path: 'youtube-content.js', binary: false },
            { path: 'twitch-injector.js', binary: false },
            { path: 'twitch-injector.css', binary: false },
            { path: 'adhub-bridge.js', binary: false },
            { path: 'icons/icon.svg', binary: false },
            { path: 'icons/icon16.png', binary: true },
            { path: 'icons/icon32.png', binary: true },
            { path: 'icons/icon48.png', binary: true },
            { path: 'icons/icon128.png', binary: true },
        ];

        const zip = new JSZip();
        const total = files.length;
        let loaded = 0;

        for (const file of files) {
            progressText.textContent = `Stahuji ${file.path}...`;
            progressBar.style.width = `${(loaded / total) * 100}%`;

            const url = `${GITHUB_RAW_BASE}/${GITHUB_REPO}/${GITHUB_BRANCH}/${EXTENSION_PATH}/${file.path}`;

            try {
                const response = await fetch(url);
                if (response.ok) {
                    if (file.binary) {
                        const content = await response.arrayBuffer();
                        zip.file(file.path, content);
                    } else {
                        const content = await response.text();
                        zip.file(file.path, content);
                    }
                } else {
                    console.warn(`[Extension Download] Failed to fetch ${file.path}:`, response.status);
                }
            } catch (e) {
                console.warn(`[Extension Download] Error fetching ${file.path}:`, e);
            }

            loaded++;
        }

        progressText.textContent = 'Generuji ZIP...';
        progressBar.style.width = '90%';

        // Generuj ZIP
        const blob = await zip.generateAsync({ type: 'blob' });

        // Stahni - nazev souboru s commit ID
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const commitSuffix = latestCommit ? `-${latestCommit.shortSha}` : '';
        a.download = `adhub-multistream-chat-extension${commitSuffix}.zip`;
        a.click();
        URL.revokeObjectURL(downloadUrl);

        // Uloz commit info pri uspesnem stazeni
        if (latestCommit) {
            storeExtensionCommit(latestCommit);
            console.log('[Extension Download] Stored commit:', latestCommit.shortSha);
        }

        progressText.textContent = 'Hotovo! Rozbalte ZIP a nahrajte do chrome://extensions';
        progressBar.style.width = '100%';

        showToast('Extension stazena! Rozbalte a nahrajte do prohlizece.', 'success');

        // Obnov zobrazeni commit info
        setTimeout(() => checkYouTubeExtension(), 500);

    } catch (error) {
        console.error('[Extension Download] Error:', error);
        progressText.textContent = `Chyba: ${error.message}`;
        showToast('Chyba pri stahovani extension', 'error');
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = originalContent;
    }
}

// =============================================================================
// MODERATOR EXTENSION
// =============================================================================

/**
 * Inicializace a detekce moderatorske extenze
 */
function initModeratorExtension() {
    // Kontrola zda je extension dostupna pres localStorage (nastaveno bridge skriptem)
    const extActive = localStorage.getItem('adhub_mod_extension_active');
    const extVersion = localStorage.getItem('adhub_mod_extension_version');

    if (extActive === 'true') {
        AppState.modExtension.available = true;
        AppState.modExtension.version = extVersion;

        // Nacist autentizaci
        const authStatus = localStorage.getItem('adhub_mod_authenticated');
        if (authStatus === 'true') {
            AppState.modExtension.authenticated = true;
            try {
                AppState.modExtension.user = JSON.parse(localStorage.getItem('adhub_mod_user') || 'null');
                AppState.modExtension.channels = JSON.parse(localStorage.getItem('adhub_mod_channels') || '[]');
            } catch (e) {
                console.error('[Mod Extension] Parse error:', e);
            }
        }

        console.log('[Mod Extension] Detected:', AppState.modExtension);
        updateModIndicator();
    }

    // Naslouchat na zmeny autentizace
    document.addEventListener('adhub-mod-auth-changed', (event) => {
        const { authenticated, user, channels } = event.detail;
        AppState.modExtension.authenticated = authenticated;
        AppState.modExtension.user = user;
        AppState.modExtension.channels = channels || [];

        console.log('[Mod Extension] Auth changed:', authenticated, channels?.length);
        updateModIndicator();
        rerenderMessages(); // Prekreslit zpravy pro aktualizaci mod tlacitek
    });

    // Naslouchat na ready event
    document.addEventListener('adhub-mod-extension-ready', (event) => {
        AppState.modExtension.available = true;
        AppState.modExtension.version = event.detail.version;
        console.log('[Mod Extension] Ready:', event.detail);
        updateModIndicator();
    });

    // Naslouchat na identifikaci uzivatele (pro rozpoznani vlastnich zprav)
    window.addEventListener('adhub-user-identified', (event) => {
        const { login, displayName } = event.detail;
        AppState.modExtension.user = { login, displayName };
        console.log('[Mod Extension] User identified:', login);
        rerenderMessages(); // Prekreslit zpravy pro aktualizaci mod tlacitek
    });

    // Zkusit ziskat uzivatele z extension API
    setTimeout(() => {
        if (window.AdHubModExtension && window.AdHubModExtension.getCurrentUser) {
            const user = window.AdHubModExtension.getCurrentUser();
            if (user) {
                AppState.modExtension.user = user;
                console.log('[Mod Extension] User from API:', user.login);
            }
        }
    }, 1000);
}

/**
 * Aktualizace indikatoru moderatora v UI
 */
function updateModIndicator() {
    let indicator = document.getElementById('modExtensionIndicator');

    if (!AppState.modExtension.available) {
        if (indicator) indicator.remove();
        return;
    }

    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'modExtensionIndicator';
        indicator.className = 'mod-extension-indicator';

        // Vlozit do header
        const header = document.querySelector('.header');
        if (header) {
            header.appendChild(indicator);
        }
    }

    if (AppState.modExtension.authenticated) {
        const modCount = AppState.modExtension.channels.filter(c =>
            c.role === 'moderator' || c.role === 'broadcaster'
        ).length;

        indicator.innerHTML = `
            <span class="mod-indicator-icon">🛡️</span>
            <span class="mod-indicator-text">Mod (${modCount})</span>
        `;
        indicator.className = 'mod-extension-indicator active';
        indicator.title = `Moderator v ${modCount} kanalech`;
    } else {
        indicator.innerHTML = `
            <span class="mod-indicator-icon">🛡️</span>
            <span class="mod-indicator-text">Neprihlaseno</span>
        `;
        indicator.className = 'mod-extension-indicator inactive';
        indicator.title = 'Klikni pro prihlaseni';
    }
}

/**
 * Zkontrolovat zda ma uzivatel mod opravneni pro dany kanal
 * S popup-based pristupem zobrazime tlacitka vzdy pro Twitch kdyz je extension dostupny
 * Skutecna opravneni overi Twitch pri odeslani prikazu
 */
function hasModeratorPermission(platform, channelLogin) {
    // Pouze pro Twitch
    if (platform !== 'twitch') return false;

    // Zobrazit tlacitka pokud je extension dostupny
    // Skutecna opravneni overi Twitch pri odeslani prikazu
    if (AppState.modExtension.available) {
        return true;
    }

    // Fallback na stary system s autentikaci
    if (!AppState.modExtension.authenticated) return false;

    const normalizedLogin = channelLogin?.toLowerCase();

    const channel = AppState.modExtension.channels.find(
        c => c.broadcaster_login?.toLowerCase() === normalizedLogin
    );

    return channel && (channel.role === 'moderator' || channel.role === 'broadcaster');
}

/**
 * Ziskat info o moderatorskem statusu
 */
function getModeratorInfo(platform, channelLogin) {
    if (platform !== 'twitch') return null;

    const normalizedLogin = channelLogin?.toLowerCase();

    // S popup-based pristupem vracime info pro kazdy Twitch kanal
    if (AppState.modExtension.available) {
        return {
            isModerator: true, // Predpokladame - Twitch overi skutecna opravneni
            role: 'unknown',
            broadcasterId: normalizedLogin, // Pouzijeme login jako ID pro popup pristup
            channelLogin: normalizedLogin
        };
    }

    // Fallback na stary system
    const channel = AppState.modExtension.channels.find(
        c => c.broadcaster_login?.toLowerCase() === normalizedLogin
    );

    if (!channel) return null;

    return {
        isModerator: channel.role === 'moderator' || channel.role === 'broadcaster',
        role: channel.role,
        broadcasterId: channel.broadcaster_id
    };
}

/**
 * Provest moderacni akci
 */
async function performModAction(action, data) {
    if (!window.AdHubModExtension) {
        showToast('Moderator extension neni dostupna', 'error');
        return { success: false };
    }

    try {
        const result = await window.AdHubModExtension.performAction(action, data);

        if (result.success) {
            switch (action) {
                case 'ban':
                    showToast(`Uzivatel zabanovany`, 'success');
                    break;
                case 'timeout':
                    showToast(`Timeout udelen`, 'success');
                    break;
                case 'delete':
                    showToast(`Zprava smazana`, 'success');
                    break;
            }
        } else {
            showToast(result.error || 'Akce selhala', 'error');
        }

        return result;
    } catch (error) {
        console.error('[Mod Action] Error:', error);
        showToast('Chyba pri provedeni akce', 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Check if message is from the current user (self)
 */
function isOwnMessage(message) {
    const platform = message.platform.split('-')[0];

    // For Twitch, check if author matches logged-in user
    if (platform === 'twitch') {
        const currentUser = AppState.modExtension.user;
        if (currentUser) {
            // Compare by username (case-insensitive)
            const authorName = (message.author.displayName || message.author.id || '').toLowerCase();
            const currentName = (currentUser.login || currentUser.displayName || '').toLowerCase();
            if (authorName === currentName) {
                return true;
            }
        }
    }

    // Check author roles - if broadcaster, it's likely the streamer viewing their own chat
    if (message.author.roles && message.author.roles.includes('broadcaster')) {
        // This could be the streamer's own message - we'll show buttons anyway
        // but mark it so CSS can style differently if needed
        return false;
    }

    return false;
}

/**
 * Vygenerovat HTML pro moderacni tlacitka
 */
function generateModActionsHtml(message) {
    const platform = message.platform.split('-')[0]; // twitch, kick, youtube
    const channelLogin = message.channel;

    if (!hasModeratorPermission(platform, channelLogin)) {
        return '';
    }

    const modInfo = getModeratorInfo(platform, channelLogin);
    if (!modInfo) return '';

    // Skip own messages - can't mod yourself
    if (isOwnMessage(message)) {
        return '';
    }

    // Ulozit data do message pro pozdejsi pouziti
    message._modInfo = modInfo;

    const username = escapeHtml(message.author.displayName || message.author.id || '');
    const authorId = escapeHtml(message.author.id || '');
    const messageId = escapeHtml(message.id);

    return `
        <button class="message-mod-trigger" data-message-id="${messageId}" title="Moznosti moderace">
            <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="12" cy="19" r="2"/>
            </svg>
        </button>
        <div class="message-mod-actions" data-message-id="${messageId}" data-user-id="${authorId}" data-username="${username}" data-channel="${escapeHtml(channelLogin)}">
            <div class="mod-menu-section">
                <div class="mod-menu-label">Timeout</div>
                <button class="mod-action-btn mod-timeout" data-action="timeout" data-duration="60">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    1 minuta
                </button>
                <button class="mod-action-btn mod-timeout" data-action="timeout" data-duration="600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    10 minut
                </button>
                <button class="mod-action-btn mod-timeout" data-action="timeout" data-duration="3600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    1 hodina
                </button>
                <button class="mod-action-btn mod-timeout" data-action="timeout" data-duration="86400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    1 den
                </button>
                <button class="mod-action-btn mod-timeout" data-action="timeout" data-duration="604800">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    1 tyden
                </button>
            </div>
            <div class="mod-menu-section">
                <div class="mod-menu-label">Akce</div>
                <button class="mod-action-btn mod-ban" data-action="ban">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                    </svg>
                    Zabanovat
                </button>
                <button class="mod-action-btn mod-unban mod-positive" data-action="unban">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                        <path d="M9 12l2 2 4-4"/>
                    </svg>
                    Odbanovat
                </button>
            </div>
            <div class="mod-menu-section">
                <div class="mod-menu-label">Specialni</div>
                <button class="mod-action-btn mod-vip" data-action="vip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/>
                    </svg>
                    Pridat VIP
                </button>
                <button class="mod-action-btn mod-unvip" data-action="unvip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/>
                        <line x1="2" y1="2" x2="22" y2="22"/>
                    </svg>
                    Odebrat VIP
                </button>
                <button class="mod-action-btn mod-positive" data-action="shoutout">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 2L11 13"/>
                        <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                    Shoutout
                </button>
            </div>
        </div>
    `;
}

/**
 * Toggle mod menu visibility
 */
function toggleModMenu(trigger) {
    const messageBody = trigger.closest('.message-body');
    const menu = messageBody?.querySelector('.message-mod-actions');

    if (!menu) return;

    // Close any other open menus
    document.querySelectorAll('.message-mod-actions.visible').forEach(m => {
        if (m !== menu) m.classList.remove('visible');
    });

    // Toggle this menu
    menu.classList.toggle('visible');
}

/**
 * Close all mod menus
 */
function closeAllModMenus() {
    document.querySelectorAll('.message-mod-actions.visible').forEach(m => {
        m.classList.remove('visible');
    });
}

/**
 * Handler pro kliknuti na mod trigger nebo akci
 */
function handleModActionClick(event) {
    // Handle trigger button click
    const trigger = event.target.closest('.message-mod-trigger');
    if (trigger) {
        event.stopPropagation();
        toggleModMenu(trigger);
        return;
    }

    // Handle action button click
    const btn = event.target.closest('.mod-action-btn');
    if (btn) {
        const container = btn.closest('.message-mod-actions');
        if (!container) return;

        event.stopPropagation();

        const action = btn.dataset.action;
        const username = container.dataset.username;
        const channel = container.dataset.channel;
        const duration = btn.dataset.duration ? parseInt(btn.dataset.duration) : null;

        // Close the menu
        closeAllModMenus();

        // Execute action
        executeModAction(channel, action, username, duration);
        return;
    }

    // If clicked somewhere else, close all menus
    const clickedOnMenu = event.target.closest('.message-mod-actions');
    if (!clickedOnMenu) {
        closeAllModMenus();
    }
}

/**
 * Execute moderation action
 */
async function executeModAction(channel, action, username, duration) {
    switch (action) {
        case 'timeout':
            const durationText = formatDuration(duration);
            performModActionPopup(channel, 'timeout', { username, duration });
            break;

        case 'ban':
            if (confirm(`Opravdu chcete zabanovat uzivatele ${username}?`)) {
                performModActionPopup(channel, 'ban', { username });
            }
            break;

        case 'unban':
            performModActionPopup(channel, 'unban', { username });
            break;

        case 'vip':
            performModActionPopup(channel, 'vip', { username });
            break;

        case 'unvip':
            performModActionPopup(channel, 'unvip', { username });
            break;

        case 'shoutout':
            performModActionPopup(channel, 'shoutout', { username });
            break;

        default:
            showToast('Neznama akce', 'error');
    }
}

/**
 * Format duration for display
 */
function formatDuration(seconds) {
    if (seconds < 60) return `${seconds} sekund`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minut`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hodin`;
    return `${Math.floor(seconds / 86400)} dni`;
}

/**
 * Provest moderacni akci pres popup
 */
async function performModActionPopup(channel, action, data) {
    if (!window.AdHubModExtension) {
        showToast('Extension neni dostupna', 'error');
        return { success: false };
    }

    try {
        let result;
        switch (action) {
            case 'ban':
                result = await window.AdHubModExtension.ban(channel, data.username, data.reason);
                break;
            case 'timeout':
                result = await window.AdHubModExtension.timeout(channel, data.username, data.duration, data.reason);
                break;
            case 'unban':
                result = await window.AdHubModExtension.unban(channel, data.username);
                break;
            case 'vip':
                result = await window.AdHubModExtension.performAction(channel, 'vip', { username: data.username });
                break;
            case 'unvip':
                result = await window.AdHubModExtension.performAction(channel, 'unvip', { username: data.username });
                break;
            case 'shoutout':
                result = await window.AdHubModExtension.performAction(channel, 'shoutout', { username: data.username });
                break;
            default:
                result = { success: false, error: 'Neznama akce' };
        }

        if (result.success) {
            switch (action) {
                case 'ban':
                    showToast(`Uzivatel ${data.username} zabanovany`, 'success');
                    break;
                case 'timeout':
                    showToast(`Timeout pro ${data.username} (${formatDuration(data.duration)})`, 'success');
                    break;
                case 'unban':
                    showToast(`Uzivatel ${data.username} odbanovany`, 'success');
                    break;
                case 'vip':
                    showToast(`Uzivatel ${data.username} ziskal VIP`, 'success');
                    break;
                case 'unvip':
                    showToast(`Uzivateli ${data.username} odebrany VIP`, 'success');
                    break;
                case 'shoutout':
                    showToast(`Shoutout pro ${data.username}!`, 'success');
                    break;
            }
        } else {
            showToast(result.error || 'Akce selhala', 'error');
        }

        return result;
    } catch (error) {
        console.error('[Mod Action] Error:', error);
        showToast('Chyba pri provedeni akce', 'error');
        return { success: false, error: error.message };
    }
}

// =============================================================================
// EXTENSION STATUS INDICATOR
// =============================================================================

/**
 * Initialize extension status indicator in header
 */
function initExtensionStatusIndicator() {
    const statusDot = document.getElementById('extensionStatusDot');
    if (!statusDot) return;

    // Check extension status
    checkExtensionStatus().then(status => {
        updateExtensionStatusDot(status);
        // Update AppState when extension is detected
        if (status.installed) {
            AppState.modExtension.available = true;
            AppState.modExtension.version = status.version;
        }
    });

    // Listen for extension ready events
    window.addEventListener('adhub-extension-ready', (e) => {
        const status = { installed: true, version: e.detail?.version };
        updateExtensionStatusDot(status);
        AppState.modExtension.available = true;
        AppState.modExtension.version = e.detail?.version;
        rerenderMessages(); // Refresh mod buttons
    });

    window.addEventListener('adhub-chat-reader-ready', (e) => {
        const status = { installed: true, version: e.detail?.version };
        updateExtensionStatusDot(status);
        AppState.modExtension.available = true;
        AppState.modExtension.version = e.detail?.version;
        rerenderMessages(); // Refresh mod buttons
    });

    // Listen for mod extension ready event
    window.addEventListener('adhub-mod-extension-ready', (e) => {
        const status = { installed: true, version: e.detail?.version };
        updateExtensionStatusDot(status);
        AppState.modExtension.available = true;
        AppState.modExtension.version = e.detail?.version;
        rerenderMessages(); // Refresh mod buttons
    });

    // Periodic check
    setInterval(() => {
        checkExtensionStatus().then(status => {
            updateExtensionStatusDot(status);
            if (status.installed && !AppState.modExtension.available) {
                AppState.modExtension.available = true;
                AppState.modExtension.version = status.version;
                rerenderMessages();
            }
        });
    }, 30000);
}

/**
 * Check if extension is installed
 */
async function checkExtensionStatus() {
    // Check localStorage markers
    const timestamp = localStorage.getItem('adhub_extension_timestamp') ||
                      localStorage.getItem('adhub_chat_reader_timestamp');
    const version = localStorage.getItem('adhub_extension_version') ||
                    localStorage.getItem('adhub_chat_reader_version');

    if (timestamp) {
        const age = Date.now() - parseInt(timestamp, 10);
        if (age < 60000) { // Less than 1 minute old
            return { installed: true, version };
        }
    }

    // Check data attribute
    if (document.documentElement.hasAttribute('data-adhub-extension') ||
        document.documentElement.hasAttribute('data-adhub-chat-reader')) {
        return { installed: true, version };
    }

    // Check global variable
    if (window.adhubExtensionAvailable || window.adhubChatReaderAvailable) {
        return { installed: true, version: window.adhubExtensionVersion || window.adhubChatReaderVersion };
    }

    return { installed: false, version: null };
}

/**
 * Update extension status dot in header
 */
function updateExtensionStatusDot(status) {
    const statusDot = document.getElementById('extensionStatusDot');
    const extensionBtn = document.getElementById('extensionBtn');
    if (!statusDot || !extensionBtn) return;

    if (status.installed) {
        statusDot.classList.add('connected');
        statusDot.classList.remove('disconnected');
        extensionBtn.title = `Extension v${status.version || '?'} - Připojeno`;
    } else {
        statusDot.classList.add('disconnected');
        statusDot.classList.remove('connected');
        extensionBtn.title = 'Extension - Není nainstalováno';
    }
}

/**
 * Update extension modal status
 */
async function updateExtensionModalStatus() {
    const status = await checkExtensionStatus();

    const icon = document.getElementById('extensionModalIcon');
    const title = document.getElementById('extensionModalTitle');
    const version = document.getElementById('extensionModalVersion');
    const downloadBtn = document.getElementById('extensionModalDownloadBtn');
    const downloadText = document.getElementById('extensionModalDownloadText');

    if (status.installed) {
        icon.textContent = '✓';
        icon.className = 'extension-status-icon-large connected';
        title.textContent = 'Rozšíření je nainstalováno';
        version.textContent = `Verze ${status.version || 'neznámá'}`;
        downloadText.textContent = 'Aktualizovat rozšíření';
    } else {
        icon.textContent = '!';
        icon.className = 'extension-status-icon-large disconnected';
        title.textContent = 'Rozšíření není nainstalováno';
        version.textContent = 'Stáhněte a nainstalujte pro plnou funkčnost';
        downloadText.textContent = 'Stáhnout rozšíření';
    }
}

/**
 * Download extension ZIP
 */
async function downloadExtension() {
    const btn = document.getElementById('extensionModalDownloadBtn');
    const originalText = document.getElementById('extensionModalDownloadText').textContent;

    btn.disabled = true;
    document.getElementById('extensionModalDownloadText').textContent = 'Stahuji...';

    try {
        await downloadChatReaderExtension();
        document.getElementById('extensionModalDownloadText').textContent = 'Staženo!';
        setTimeout(() => {
            btn.disabled = false;
            document.getElementById('extensionModalDownloadText').textContent = originalText;
        }, 3000);
    } catch (error) {
        console.error('Download error:', error);
        document.getElementById('extensionModalDownloadText').textContent = 'Chyba - zkuste znovu';
        setTimeout(() => {
            btn.disabled = false;
            document.getElementById('extensionModalDownloadText').textContent = originalText;
        }, 3000);
    }
}

// =============================================================================
// DEBUG
// =============================================================================

window.AdHubChat = {
    state: AppState,
    addChannel,
    removeChannel,
    showToast,
    checkYouTubeExtension,
    downloadChatReaderExtension,
    toggleChannelHighlight,
    clearAllHighlights,
    // Moderator API
    hasModeratorPermission,
    performModAction,
    initModeratorExtension,
    version: '2.2.0',
};
