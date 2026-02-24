/**
 * AdHub Chat - OBS Browser Source
 * Optimalizovane zobrazeni chatu pro OBS
 *
 * Pouziti:
 *   /obs/?channels=twitch:xqc,kick:trainwreckstv&theme=transparent
 *
 * Sdili konfiguraci s hlavnim panelem pres localStorage (stejna domena).
 */

class OBSChatView {
    constructor() {
        this.config = {};
        this.adapters = new Map();
        this.messageCount = 0;
        this._recentIds = new Set();
        this.container = document.getElementById('log');
    }

    /**
     * Inicializace - nacteni konfigurace a pripojeni
     */
    async init() {
        this.config = this._loadConfig();
        this._applyTheme();
        this._applyCustomCSS();
        await this._connectChannels();
        console.log('[OBS] Initialized with config:', this.config);
    }

    // =========================================================================
    // KONFIGURACE
    // =========================================================================

    /**
     * Nacteni konfigurace z URL parametru a localStorage
     * Priorita: URL params > localStorage > defaults
     */
    _loadConfig() {
        const params = new URLSearchParams(window.location.search);

        const defaults = {
            channels: [],
            theme: 'transparent',
            fontSize: 14,
            showTimestamps: false,
            showBadges: true,
            showEmotes: true,
            showAlerts: true,
            maxMessages: 100,
            compact: false,
            direction: 'bottom-up',
            animation: 'fade',
            hideAfter: 0,
            customCSS: '',
        };

        // Nacist z localStorage (pokud na stejne domene)
        let lsSettings = {};
        let lsObs = {};
        let lsChannels = [];
        try {
            const s = localStorage.getItem('adhub_chat_settings');
            if (s) lsSettings = JSON.parse(s);
        } catch (e) {}
        try {
            const o = localStorage.getItem('adhub_obs_config');
            if (o) lsObs = JSON.parse(o);
        } catch (e) {}
        try {
            const c = localStorage.getItem('adhub_chat_channels');
            if (c) lsChannels = JSON.parse(c);
        } catch (e) {}

        const config = { ...defaults };

        // Channels
        if (params.has('channels')) {
            config.channels = this._parseChannelParam(params.get('channels'));
        } else if (lsChannels.length > 0) {
            config.channels = lsChannels.map(ch => ({
                platform: ch.platform,
                channel: ch.channel,
            }));
        }

        // Theme
        if (params.has('theme')) config.theme = params.get('theme');
        else if (lsObs.theme) config.theme = lsObs.theme;

        // Font size
        if (params.has('fontSize')) config.fontSize = parseInt(params.get('fontSize'));
        else if (lsSettings.fontSize) config.fontSize = lsSettings.fontSize;

        // Boolean parametry
        const boolParams = ['showTimestamps', 'showBadges', 'showEmotes', 'showAlerts', 'compact'];
        for (const p of boolParams) {
            if (params.has(p)) config[p] = params.get(p) === 'true';
            else if (lsSettings[p] !== undefined) config[p] = lsSettings[p];
        }

        // Numeric parametry
        if (params.has('maxMessages')) config.maxMessages = parseInt(params.get('maxMessages'));
        if (params.has('hideAfter')) config.hideAfter = parseInt(params.get('hideAfter'));

        // Direction, animation
        if (params.has('direction')) config.direction = params.get('direction');
        if (params.has('animation')) config.animation = params.get('animation');

        // Custom CSS
        if (params.has('customCSS')) {
            try { config.customCSS = atob(params.get('customCSS')); } catch (e) {}
        } else if (lsObs.customCSS) {
            config.customCSS = lsObs.customCSS;
        }

        return config;
    }

    /**
     * Parsovani channel parametru z URL
     * Format: "twitch:xqc,kick:trainwreckstv:4807295,youtube-iframe:VIDEO_ID"
     */
    _parseChannelParam(param) {
        return param.split(',').map(ch => {
            const parts = ch.split(':');
            const platform = parts[0];
            const channel = parts[1];
            const extra = parts[2];
            return {
                platform,
                channel,
                chatroomId: extra ? parseInt(extra) : undefined,
            };
        }).filter(ch => ch.platform && ch.channel);
    }

    // =========================================================================
    // THEME A CSS
    // =========================================================================

    _applyTheme() {
        document.documentElement.setAttribute('data-theme', this.config.theme);
        document.body.style.fontSize = `${this.config.fontSize}px`;

        if (this.config.direction === 'bottom-up') {
            this.container.style.display = 'flex';
            this.container.style.flexDirection = 'column';
            this.container.style.justifyContent = 'flex-end';
            this.container.style.height = '100vh';
        }
    }

    _applyCustomCSS() {
        if (this.config.customCSS) {
            document.getElementById('custom-styles').textContent = this.config.customCSS;
        }
    }

    // =========================================================================
    // PRIPOJENI
    // =========================================================================

    async _connectChannels() {
        for (const ch of this.config.channels) {
            try {
                await this._connectChannel(ch);
            } catch (error) {
                console.error(`[OBS] Failed to connect to ${ch.platform}:${ch.channel}:`, error);
            }
        }
    }

    async _connectChannel(channelConfig) {
        let adapter;
        const platform = channelConfig.platform;
        const channel = channelConfig.channel;

        switch (platform) {
            case 'twitch':
                adapter = new TwitchAdapter({ channel });
                break;
            case 'kick':
                adapter = new KickAdapter({
                    channel,
                    chatroomId: channelConfig.chatroomId,
                });
                break;
            case 'youtube-iframe':
                if (typeof YouTubeIframeAdapter !== 'undefined') {
                    adapter = new YouTubeIframeAdapter({ channel });
                } else {
                    console.warn('[OBS] YouTubeIframeAdapter not available');
                    return;
                }
                break;
            default:
                console.warn(`[OBS] Unknown platform: ${platform}`);
                return;
        }

        adapter.on('message', (msg) => {
            // Deduplicate by message ID (prevents double messages on reconnect)
            if (msg.id && this._recentIds.has(msg.id)) return;
            if (msg.id) {
                this._recentIds.add(msg.id);
                if (this._recentIds.size > 200) {
                    this._recentIds.delete(this._recentIds.values().next().value);
                }
            }
            this._renderMessage(msg);
        });
        adapter.on('alert', (alert) => this._renderAlert(alert));
        adapter.on('connect', () => {
            console.log(`[OBS] Connected to ${platform}:${channel}`);
        });
        adapter.on('error', (err) => {
            console.error(`[OBS] Error on ${platform}:${channel}:`, err);
        });

        this.adapters.set(`${platform}-${channel}`, adapter);
        await adapter.connect();
    }

    // =========================================================================
    // RENDEROVANI ZPRAV (Streamlabs-kompatibilni HTML)
    // =========================================================================

    _renderMessage(message) {
        const msgEl = document.createElement('div');
        msgEl.id = message.id;
        msgEl.className = `wrap animate platform-${message.platform}`;
        msgEl.setAttribute('data-from', message.author.username);
        msgEl.setAttribute('data-id', message.id);

        let html = '';

        // Meta (badges + username) - Streamlabs compatible
        html += `<div class="meta" style="color: ${this._escapeAttr(message.author.color)}">`;

        // Badges
        if (this.config.showBadges && message.author.badges?.length > 0) {
            html += '<span class="badges">';
            for (const badge of message.author.badges) {
                if (badge.url) {
                    html += `<img class="badge" src="${this._escapeAttr(badge.url)}" alt="${this._escapeAttr(badge.title)}">`;
                }
            }
            html += '</span>';
        }

        // Timestamp
        if (this.config.showTimestamps) {
            const time = message.timestamp.toLocaleTimeString('cs-CZ', {
                hour: '2-digit', minute: '2-digit',
            });
            html += `<span class="timestamp">${time}</span> `;
        }

        // Username
        html += `<span class="name" data-role="${this._getRole(message.author.roles)}">${this._escapeHtml(message.author.displayName)}</span>`;
        html += '<span class="colon">: </span>';
        html += '</div>';

        // Message content
        let content = this._escapeHtml(message.content);
        if (this.config.showEmotes && message.emotes?.length > 0) {
            content = this._renderEmotes(message.content, message.emotes);
        }
        html += `<span class="message">${content}</span>`;

        msgEl.innerHTML = html;
        this.container.appendChild(msgEl);

        // Animace
        requestAnimationFrame(() => {
            msgEl.classList.add('visible');
        });

        // Auto-hide po case
        if (this.config.hideAfter > 0) {
            setTimeout(() => {
                msgEl.classList.add('hide');
                setTimeout(() => msgEl.remove(), 500);
            }, this.config.hideAfter * 1000);
        }

        this._trimMessages();
        this.messageCount++;
    }

    // =========================================================================
    // RENDEROVANI ALERTU
    // =========================================================================

    _renderAlert(alert) {
        if (!this.config.showAlerts) return;

        const alertEl = document.createElement('div');
        alertEl.id = alert.id;
        alertEl.className = `wrap animate alert alert-${alert.alertType} platform-${alert.platform}`;

        const icon = this._getAlertIcon(alert.alertType);

        let html = '';
        html += '<div class="alert-wrapper">';
        html += `<span class="alert-icon">${icon}</span>`;
        html += `<span class="alert-text">${this._escapeHtml(alert.content)}</span>`;
        html += '</div>';

        if (alert.alertData?.message) {
            html += `<span class="alert-submessage">"${this._escapeHtml(alert.alertData.message)}"</span>`;
        }

        alertEl.innerHTML = html;
        this.container.appendChild(alertEl);

        requestAnimationFrame(() => {
            alertEl.classList.add('visible');
        });

        // Alerty vzdy zmizi po case
        const hideDelay = this.config.hideAfter > 0 ? this.config.hideAfter : 10;
        setTimeout(() => {
            alertEl.classList.add('hide');
            setTimeout(() => alertEl.remove(), 500);
        }, hideDelay * 1000);

        this._trimMessages();
    }

    // =========================================================================
    // UTILITY
    // =========================================================================

    _renderEmotes(text, emotes) {
        if (!emotes || emotes.length === 0) return this._escapeHtml(text);

        const sorted = [...emotes].sort((a, b) => a.start - b.start);
        let result = '';
        let lastEnd = 0;

        for (const emote of sorted) {
            if (emote.start > lastEnd) {
                result += this._escapeHtml(text.substring(lastEnd, emote.start));
            }
            result += `<img class="emote" src="${this._escapeAttr(emote.url)}" alt="${this._escapeAttr(emote.name)}" title="${this._escapeAttr(emote.name)}">`;
            lastEnd = emote.end + 1;
        }

        if (lastEnd < text.length) {
            result += this._escapeHtml(text.substring(lastEnd));
        }

        return result;
    }

    _trimMessages() {
        const children = this.container.children;
        while (children.length > this.config.maxMessages) {
            children[0].remove();
        }
    }

    _getRole(roles) {
        if (!roles) return '';
        if (roles.broadcaster) return 'broadcaster';
        if (roles.moderator) return 'moderator';
        if (roles.vip) return 'vip';
        if (roles.subscriber) return 'subscriber';
        return '';
    }

    _getAlertIcon(alertType) {
        const icons = {
            'subscribe': '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
            'resubscribe': '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
            'gift_sub': '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2a3 3 0 0 0-3 3c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/></svg>',
            'follow': '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
            'cheer': '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>',
            'donation': '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>',
            'raid': '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4z"/></svg>',
        };
        return icons[alertType] || '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>';
    }

    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    _escapeAttr(str) {
        return this._escapeHtml(str);
    }
}

// =========================================================================
// INICIALIZACE
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const obsChat = new OBSChatView();
    obsChat.init();
});
