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

    document.getElementById('youtubeForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const videoId = document.getElementById('youtubeVideoId').value.trim();
        const apiKey = document.getElementById('youtubeApiKey').value.trim();

        if (videoId && apiKey) {
            AppState.youtubeApiKey = apiKey;
            addChannel('youtube', videoId, { apiKey });
            closeModal(DOM.addChannelModal);
            document.getElementById('youtubeVideoId').value = '';
        } else {
            showToast('Vyplňte Video ID a API klíč', 'error');
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
            default:
                throw new Error(`Neznámá platforma: ${platform}`);
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
        showToast(`Připojeno k ${channel}`, 'success');
        saveChannels();
    });

    adapter.on('disconnect', () => {
        channelData.state = 'disconnected';
        updateChannelItemState(channelId, 'disconnected');
        updateConnectionStatus();
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
    saveChannels();

    // Zobrazit welcome screen pokud není žádný kanál
    if (AppState.channels.size === 0) {
        showWelcomeScreen();
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
                // YouTube kanály nepřidávat automaticky (potřebují API klíč)
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
// DEBUG
// =============================================================================

window.AdHubChat = {
    state: AppState,
    addChannel,
    removeChannel,
    showToast,
    version: '2.0.0',
};
