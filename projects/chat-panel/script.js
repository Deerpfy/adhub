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
    DOM.toastContainer = document.getElementById('toastContainer');

    // Načíst nastavení z localStorage
    loadSettings();

    // Načíst uložené kanály
    loadSavedChannels();

    // Inicializovat event listenery
    initEventListeners();

    // Aplikovat nastavení
    applySettings();

    console.log('[AdHub] Multistream Chat v2 initialized');
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

    // Theme Toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

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
        adapter,
        state: 'connecting',
    };

    AppState.channels.set(channelId, channelData);

    // Vytvořit UI element
    renderChannelItem(channelData);

    // Odstranit welcome screen
    hideWelcomeScreen();

    // Event listenery
    adapter.on('connect', () => {
        channelData.state = 'connected';
        updateChannelItemState(channelId, 'connected');
        updateConnectionStatus();
        updateIframeSection();
        showToast(`Připojeno k ${channel}`, 'success');
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
    item.className = `channel-item ${channelData.state}`;
    item.dataset.channelId = channelData.id;

    item.innerHTML = `
        <div class="channel-icon ${channelData.platform}">
            ${getPlatformIcon(channelData.platform)}
        </div>
        <div class="channel-info">
            <div class="channel-name">${escapeHtml(channelData.channel)}</div>
            <div class="channel-platform">${channelData.platform}</div>
        </div>
        <div class="channel-status"></div>
        <button class="channel-remove" title="Odebrat kanál">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;

    item.querySelector('.channel-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        removeChannel(channelData.id);
    });

    DOM.channelList.appendChild(item);
}

/**
 * Aktualizace stavu kanálu v UI
 */
function updateChannelItemState(channelId, state) {
    const element = document.querySelector(`[data-channel-id="${channelId}"]`);
    if (element) {
        element.className = `channel-item ${state}`;
    }
}

/**
 * Získání ikony platformy
 */
function getPlatformIcon(platform) {
    switch (platform) {
        case 'twitch':
            return `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
            </svg>`;
        case 'kick':
            return `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm2.5 16.5l-3-3-3 3H6l4.5-4.5L6 7.5h2.5l3 3 3-3H17l-4.5 4.5L17 16.5h-2.5z"/>
            </svg>`;
        case 'youtube':
        case 'youtube-iframe':
        case 'youtube-extension':
            return `<svg viewBox="0 0 24 24" fill="currentColor">
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

    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${AppState.settings.compactMode ? 'compact' : ''}`;
    messageEl.dataset.messageId = message.id;

    let html = '';

    // Platform badge
    if (AppState.settings.showPlatformBadges) {
        html += `<span class="message-platform-badge ${message.platform}">${message.platform.charAt(0).toUpperCase()}</span>`;
    }

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
    html += '</span>';

    messageEl.innerHTML = html;
    messagesContainer.appendChild(messageEl);
}

/**
 * Nahrazení emotes v textu obrázky
 */
function replaceEmotes(text, emotes) {
    if (!emotes || emotes.length === 0) return escapeHtml(text);

    // Seřadit od konce (emotes jsou už seřazené v adapteru)
    let result = text;
    const replacements = [];

    for (const emote of emotes) {
        const emoteName = text.substring(emote.start, emote.end + 1);
        replacements.push({
            start: emote.start,
            end: emote.end,
            html: `<img class="message-emote" src="${escapeHtml(emote.url)}" alt="${escapeHtml(emote.name)}" title="${escapeHtml(emote.name)}">`,
        });
    }

    // Aplikovat replacements od konce
    for (const r of replacements) {
        const before = result.substring(0, r.start);
        const after = result.substring(r.end + 1);
        result = escapeHtml(before) + r.html + escapeHtml(after);
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

    // Vymazat localStorage
    localStorage.removeItem('adhub_chat_settings');
    localStorage.removeItem('adhub_chat_channels');

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
    const submitBtn = document.getElementById('youtubeExtSubmit');

    if (!statusBox) return;

    // Reset stavu
    statusBox.className = 'extension-status-box checking';
    statusIcon.textContent = '?';
    statusText.innerHTML = 'Kontroluji extension...';
    if (submitBtn) submitBtn.disabled = true;

    // Nacti nejnovejsi verzi z GitHubu
    let latestVersion = null;
    try {
        const manifestUrl = `${GITHUB_RAW_BASE}/${GITHUB_REPO}/${GITHUB_BRANCH}/${EXTENSION_PATH}/manifest.json`;
        const response = await fetch(manifestUrl);
        if (response.ok) {
            const manifest = await response.json();
            latestVersion = manifest.version;
        }
    } catch (e) {
        console.warn('[Extension Check] Cannot fetch latest version:', e);
    }

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
    } catch (error) {
        console.error('[Extension Check] Error:', error);
        statusBox.className = 'extension-status-box unavailable';
        statusIcon.textContent = '!';
        statusText.innerHTML = 'Nelze zkontrolovat extension';
        if (downloadHint) downloadHint.textContent = 'Stahnout rozsireni:';
        if (downloadBtnText) downloadBtnText.textContent = latestVersion ? `Stahnout v${latestVersion}` : 'Stahnout Extension';
        if (versionInfo) versionInfo.classList.add('hidden');
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
        // Seznam souboru k stazeni (vcetne PNG ikon)
        const files = [
            { path: 'manifest.json', binary: false },
            { path: 'content-script.js', binary: false },
            { path: 'background.js', binary: false },
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

        // Stahni
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'adhub-chat-reader-extension.zip';
        a.click();
        URL.revokeObjectURL(downloadUrl);

        progressText.textContent = 'Hotovo! Rozbalte ZIP a nahrajte do chrome://extensions';
        progressBar.style.width = '100%';

        showToast('Extension stazena! Rozbalte a nahrajte do prohlizece.', 'success');

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
// DEBUG
// =============================================================================

window.AdHubChat = {
    state: AppState,
    addChannel,
    removeChannel,
    showToast,
    checkYouTubeExtension,
    downloadChatReaderExtension,
    version: '2.0.0',
};
