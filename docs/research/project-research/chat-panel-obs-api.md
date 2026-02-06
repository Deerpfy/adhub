# Chat Panel - OBS Browser Source API Endpoint

> **Projekt:** AdHub Multistream Chat v2
> **Účel:** Návrh OBS-compatible endpointu pro zobrazení chatu jako browser source
> **Datum:** 2026-02-06
> **Souvisí s:** `chat-panel-analyza.md`, `chat-panel-streamlabs-import.md`

---

## 1. Koncept

### Cíl

Vytvořit dedicovanou stránku/endpoint, která:
1. Přebírá konfiguraci z hlavního Chat Panelu
2. Zobrazuje chat optimalizovaný pro OBS browser source
3. Podporuje průhledné pozadí
4. Má minimalistické UI (žádné ovládací prvky, jen chat)
5. Podporuje custom CSS/HTML stylizaci (viz `chat-panel-streamlabs-import.md`)
6. Zobrazuje i event alerty (sub, follow, donate, raid)

### URL struktura

```
https://deerpfy.github.io/adhub/projects/chat-panel/obs/
```

**Proč ne `/api/obs/`:**
GitHub Pages jsou statický hosting - nemůžeme mít skutečné API endpointy. Místo toho vytvoříme dedicovanou HTML stránku `obs/index.html` která se chová jako "endpoint" - přijímá konfiguraci přes URL parametry nebo localStorage.

### Alternativní URL schéma

```
# Základní OBS view
/projects/chat-panel/obs/

# S konfigurací v URL
/projects/chat-panel/obs/?channels=twitch:xqc,kick:trainwreckstv&theme=dark

# S custom stylem
/projects/chat-panel/obs/?channels=twitch:xqc&style=streamlabs

# S minimálním UI
/projects/chat-panel/obs/?channels=twitch:xqc&minimal=true&transparent=true
```

---

## 2. Architektura

### 2.1 Sdílení konfigurace

Hlavní Chat Panel a OBS view sdílejí konfiguraci přes **dva mechanismy**:

```
┌─────────────────────┐     localStorage      ┌─────────────────────┐
│   Hlavní Chat Panel  │ ◄─────────────────► │   OBS View           │
│   /chat-panel/       │  (stejná doména)     │   /chat-panel/obs/   │
│                      │                      │                      │
│  - Spravuje kanály   │     URL parametry    │  - Read-only config  │
│  - Nastavení         │ ──────────────────►  │  - Optimalizované UI │
│  - Alert konfig.     │                      │  - Průhledné pozadí  │
└──────────────────────┘                      └──────────────────────┘
```

**Mechanismus 1: localStorage (primární)**

Oba jsou na stejné doméně (`deerpfy.github.io`), takže sdílejí localStorage. OBS view čte:
- `adhub_channels` → seznam kanálů k připojení
- `adhub_settings` → nastavení (font size, theme, atd.)
- `adhub_obs_config` → OBS-specifická nastavení (custom CSS, layout)

**Mechanismus 2: URL parametry (override)**

Pro případy kdy chceme OBS view nakonfigurovat nezávisle:

```
?channels=twitch:xqc,kick:trainwreckstv,youtube-iframe:dQw4w9WgXcQ
&theme=dark|light|transparent
&fontSize=14
&showTimestamps=false
&showBadges=true
&showEmotes=true
&showAlerts=true
&maxMessages=100
&compact=true
&direction=bottom-up|top-down
&animation=fade|slide|none
&style=default|streamlabs|custom
&customCSS=base64encodedCSS
```

**Priorita:** URL parametry > localStorage > výchozí hodnoty

### 2.2 Konfigurace z hlavního panelu

V hlavním Chat Panelu přidat tlačítko "OBS Link":

```javascript
function generateOBSUrl() {
    const channels = [];
    for (const [id, data] of AppState.channels) {
        if (data.adapter?.state?.connected) {
            const platform = data.platform;
            const channel = data.channelName;
            let channelStr = `${platform}:${channel}`;

            // Pro Kick přidat chatroom ID
            if (platform === 'kick' && data.adapter.chatroomId) {
                channelStr += `:${data.adapter.chatroomId}`;
            }

            channels.push(channelStr);
        }
    }

    const params = new URLSearchParams();
    params.set('channels', channels.join(','));
    params.set('theme', AppState.settings.theme);
    params.set('fontSize', AppState.settings.fontSize);
    params.set('showTimestamps', AppState.settings.showTimestamps);
    params.set('showBadges', AppState.settings.showPlatformBadges);
    params.set('showEmotes', AppState.settings.showEmotes);
    params.set('showAlerts', AppState.settings.showAlerts ?? true);
    params.set('maxMessages', AppState.settings.maxMessages);
    params.set('compact', AppState.settings.compactMode);

    // Pokud je custom CSS
    const obsConfig = getOBSConfig();
    if (obsConfig.customCSS) {
        params.set('customCSS', btoa(obsConfig.customCSS));
    }

    const baseUrl = window.location.origin + '/adhub/projects/chat-panel/obs/';
    return `${baseUrl}?${params.toString()}`;
}
```

---

## 3. OBS View implementace

### 3.1 Soubory

```
projects/chat-panel/obs/
├── index.html          # OBS optimalizovaná stránka
├── obs-script.js       # Logika pro OBS view
└── obs-styles.css      # Základní OBS styly
```

### 3.2 `obs/index.html`

```html
<!DOCTYPE html>
<html lang="cs" data-theme="transparent">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AdHub Chat - OBS</title>

    <!-- Základní OBS styly -->
    <link rel="stylesheet" href="obs-styles.css">

    <!-- Custom CSS slot (dynamicky naplněn) -->
    <style id="custom-styles"></style>
</head>
<body>
    <!-- Chat kontejner - kompatibilní se Streamlabs strukturou -->
    <div id="log" class="sl__chat__layout">
        <!-- Zprávy budou vkládány sem -->
    </div>

    <!-- Adaptery (sdílené s hlavním panelem) -->
    <script src="../adapters/base-adapter.js"></script>
    <script src="../adapters/twitch-adapter.js"></script>
    <script src="../adapters/kick-adapter.js"></script>
    <script src="../adapters/youtube-iframe-adapter.js"></script>

    <!-- OBS logika -->
    <script src="obs-script.js"></script>
</body>
</html>
```

### 3.3 `obs/obs-script.js` - klíčová logika

```javascript
/**
 * AdHub Chat - OBS Browser Source
 * Optimalizované zobrazení chatu pro OBS
 */

class OBSChatView {
    constructor() {
        this.config = {};
        this.adapters = new Map();
        this.messageCount = 0;
        this.container = document.getElementById('log');
    }

    /**
     * Inicializace - načtení konfigurace a připojení
     */
    async init() {
        // 1. Načíst konfiguraci
        this.config = this._loadConfig();

        // 2. Aplikovat theme
        this._applyTheme();

        // 3. Aplikovat custom CSS
        this._applyCustomCSS();

        // 4. Připojit ke kanálům
        await this._connectChannels();

        console.log('[OBS] Initialized with config:', this.config);
    }

    /**
     * Načtení konfigurace z URL parametrů a localStorage
     */
    _loadConfig() {
        const params = new URLSearchParams(window.location.search);

        // Výchozí hodnoty
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
            direction: 'bottom-up',   // Nové zprávy dole (jako Streamlabs)
            animation: 'fade',
            hideAfter: 0,             // Sekund, 0 = nikdy
            customCSS: '',
        };

        // Načíst z localStorage (pokud na stejné doméně)
        let lsConfig = {};
        try {
            const stored = localStorage.getItem('adhub_settings');
            if (stored) lsConfig = JSON.parse(stored);

            const obsStored = localStorage.getItem('adhub_obs_config');
            if (obsStored) lsConfig = { ...lsConfig, ...JSON.parse(obsStored) };
        } catch (e) {}

        // Načíst z localStorage kanály
        let lsChannels = [];
        try {
            const stored = localStorage.getItem('adhub_channels');
            if (stored) lsChannels = JSON.parse(stored);
        } catch (e) {}

        // URL parametry mají nejvyšší prioritu
        const config = { ...defaults };

        // Channels
        if (params.has('channels')) {
            config.channels = this._parseChannelParam(params.get('channels'));
        } else if (lsChannels.length > 0) {
            config.channels = lsChannels;
        }

        // Ostatní parametry
        if (params.has('theme')) config.theme = params.get('theme');
        else if (lsConfig.theme) config.theme = lsConfig.theme;

        if (params.has('fontSize')) config.fontSize = parseInt(params.get('fontSize'));
        else if (lsConfig.fontSize) config.fontSize = lsConfig.fontSize;

        if (params.has('showTimestamps')) config.showTimestamps = params.get('showTimestamps') === 'true';
        if (params.has('showBadges')) config.showBadges = params.get('showBadges') === 'true';
        if (params.has('showEmotes')) config.showEmotes = params.get('showEmotes') === 'true';
        if (params.has('showAlerts')) config.showAlerts = params.get('showAlerts') === 'true';
        if (params.has('maxMessages')) config.maxMessages = parseInt(params.get('maxMessages'));
        if (params.has('compact')) config.compact = params.get('compact') === 'true';
        if (params.has('direction')) config.direction = params.get('direction');
        if (params.has('animation')) config.animation = params.get('animation');
        if (params.has('hideAfter')) config.hideAfter = parseInt(params.get('hideAfter'));

        if (params.has('customCSS')) {
            try {
                config.customCSS = atob(params.get('customCSS'));
            } catch (e) {
                console.warn('[OBS] Invalid base64 customCSS');
            }
        } else if (lsConfig.customCSS) {
            config.customCSS = lsConfig.customCSS;
        }

        return config;
    }

    /**
     * Parsování channel parametru z URL
     * Formát: "twitch:xqc,kick:trainwreckstv:4807295,youtube-iframe:VIDEO_ID"
     */
    _parseChannelParam(param) {
        return param.split(',').map(ch => {
            const parts = ch.split(':');
            const platform = parts[0];
            const channel = parts[1];
            const extra = parts[2]; // chatroom ID pro Kick

            return {
                platform,
                channel,
                chatroomId: extra ? parseInt(extra) : undefined,
            };
        }).filter(ch => ch.platform && ch.channel);
    }

    /**
     * Aplikovat theme
     */
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

    /**
     * Aplikovat custom CSS
     */
    _applyCustomCSS() {
        if (this.config.customCSS) {
            document.getElementById('custom-styles').textContent = this.config.customCSS;
        }
    }

    /**
     * Připojení ke kanálům
     */
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

        switch (channelConfig.platform) {
            case 'twitch':
                adapter = new TwitchAdapter({ channel: channelConfig.channel });
                break;

            case 'kick':
                adapter = new KickAdapter({
                    channel: channelConfig.channel,
                    chatroomId: channelConfig.chatroomId
                });
                break;

            case 'youtube-iframe':
                adapter = new YouTubeIframeAdapter({ channel: channelConfig.channel });
                break;

            default:
                console.warn(`[OBS] Unknown platform: ${channelConfig.platform}`);
                return;
        }

        // Event listeners
        adapter.on('message', (msg) => this._renderMessage(msg));
        adapter.on('alert', (alert) => this._renderAlert(alert));
        adapter.on('connect', () => {
            console.log(`[OBS] Connected to ${channelConfig.platform}:${channelConfig.channel}`);
        });
        adapter.on('error', (err) => {
            console.error(`[OBS] Error on ${channelConfig.platform}:${channelConfig.channel}:`, err);
        });

        this.adapters.set(`${channelConfig.platform}-${channelConfig.channel}`, adapter);
        await adapter.connect();
    }

    /**
     * Renderování zprávy - Streamlabs-kompatibilní HTML struktura
     */
    _renderMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.id = message.id;
        messageEl.className = `wrap animate platform-${message.platform}`;
        messageEl.setAttribute('data-from', message.author.username);
        messageEl.setAttribute('data-id', message.id);

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

        // Timestamp (volitelný)
        if (this.config.showTimestamps) {
            const time = message.timestamp.toLocaleTimeString('cs-CZ', {
                hour: '2-digit', minute: '2-digit'
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

        messageEl.innerHTML = html;
        this.container.appendChild(messageEl);

        // Animace
        if (this.config.animation !== 'none') {
            requestAnimationFrame(() => {
                messageEl.classList.add('visible');
            });
        } else {
            messageEl.classList.add('visible');
        }

        // Auto-hide po čase
        if (this.config.hideAfter > 0) {
            setTimeout(() => {
                messageEl.classList.add('hide');
                setTimeout(() => messageEl.remove(), 500);
            }, this.config.hideAfter * 1000);
        }

        // Limit zpráv
        this._trimMessages();
        this.messageCount++;
    }

    /**
     * Renderování alertu
     */
    _renderAlert(alert) {
        if (!this.config.showAlerts) return;

        const alertEl = document.createElement('div');
        alertEl.id = alert.id;
        alertEl.className = `wrap animate alert alert-${alert.alertType} platform-${alert.platform}`;

        const icon = this._getAlertIcon(alert.alertType);

        let html = '';
        html += `<div class="alert-wrapper">`;
        html += `<span class="alert-icon">${icon}</span>`;
        html += `<span class="alert-text">${this._escapeHtml(alert.content)}</span>`;

        if (alert.alertData?.message) {
            html += `<span class="alert-submessage">"${this._escapeHtml(alert.alertData.message)}"</span>`;
        }

        html += `</div>`;

        alertEl.innerHTML = html;
        this.container.appendChild(alertEl);

        requestAnimationFrame(() => {
            alertEl.classList.add('visible');
        });

        // Alerty vždy zmizí po čase
        const hideDelay = this.config.hideAfter > 0 ? this.config.hideAfter : 10;
        setTimeout(() => {
            alertEl.classList.add('hide');
            setTimeout(() => alertEl.remove(), 500);
        }, hideDelay * 1000);

        this._trimMessages();
    }

    // ─── Utility metody ─────────────────────────────────────────

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
            'subscribe': '⭐', 'resubscribe': '🔄', 'gift_sub': '🎁',
            'follow': '❤️', 'cheer': '💎', 'donation': '💰',
            'raid': '🚀', 'channel_points': '✨'
        };
        return icons[alertType] || '🔔';
    }

    _escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    _escapeAttr(str) {
        return this._escapeHtml(str);
    }
}

// ─── Inicializace ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const obsChat = new OBSChatView();
    obsChat.init();
});
```

### 3.4 `obs/obs-styles.css`

```css
/* ═══════════════════════════════════════════════════════════
   AdHub Chat - OBS Browser Source Styles

   HTML struktura je kompatibilní se Streamlabs chat widgetem.
   Třídy: #log, .wrap, .meta, .badges, .badge, .name, .colon,
          .message, .emote, .timestamp

   Custom CSS z Streamlabs by měl fungovat s minimálními úpravami.
   ═══════════════════════════════════════════════════════════ */

/* Reset */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background: transparent !important;
    font-family: 'Inter', 'Segoe UI', 'Roboto', sans-serif;
    font-size: 14px;
    color: #ffffff;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
}

/* ─── Chat Container ─────────────────────────────────── */

#log {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    padding: 0 10px 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    max-height: 100vh;
}

/* ─── Message Row ────────────────────────────────────── */

.wrap {
    padding: 4px 8px;
    margin-bottom: 2px;
    line-height: 1.4;
    word-wrap: break-word;
    overflow-wrap: break-word;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.wrap.visible {
    opacity: 1;
}

.wrap.hide {
    opacity: 0;
    transition: opacity 0.5s ease;
}

/* Text shadow pro čitelnost na streamu */
.wrap {
    text-shadow:
        0 0 3px rgba(0, 0, 0, 0.9),
        0 0 6px rgba(0, 0, 0, 0.5);
}

/* ─── Username + Badges ──────────────────────────────── */

.meta {
    display: inline;
}

.badges {
    display: inline;
    vertical-align: middle;
    margin-right: 3px;
}

.badge {
    display: inline-block;
    width: 18px;
    height: 18px;
    vertical-align: middle;
    margin-right: 2px;
}

.name {
    font-weight: 700;
}

.name[data-role="broadcaster"] {
    font-weight: 800;
}

.name[data-role="moderator"] {
    font-weight: 700;
}

.colon {
    margin-right: 4px;
}

.timestamp {
    font-size: 0.85em;
    opacity: 0.6;
    margin-right: 4px;
}

/* ─── Message Content ────────────────────────────────── */

.message {
    word-wrap: break-word;
    overflow-wrap: break-word;
}

.emote {
    display: inline-block;
    height: 28px;
    vertical-align: middle;
    margin: -2px 2px;
}

/* ─── Event Alerts ───────────────────────────────────── */

.alert {
    padding: 6px 12px;
    margin: 4px 0;
    border-radius: 4px;
    border-left: 3px solid;
}

.alert-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
}

.alert-icon {
    font-size: 16px;
    flex-shrink: 0;
}

.alert-text {
    font-weight: 600;
    font-size: 0.95em;
}

.alert-submessage {
    display: block;
    margin-top: 2px;
    font-style: italic;
    font-weight: 400;
    opacity: 0.8;
    font-size: 0.9em;
    padding-left: 26px;
}

/* Alert barvy */
.alert-subscribe, .alert-resubscribe {
    background: rgba(138, 43, 226, 0.3);
    border-left-color: #8a2be2;
}

.alert-gift_sub {
    background: rgba(255, 105, 180, 0.3);
    border-left-color: #ff69b4;
}

.alert-follow {
    background: rgba(255, 0, 0, 0.25);
    border-left-color: #ff4444;
}

.alert-cheer, .alert-donation {
    background: rgba(255, 215, 0, 0.3);
    border-left-color: #ffd700;
}

.alert-raid {
    background: rgba(0, 191, 255, 0.3);
    border-left-color: #00bfff;
}

.alert-channel_points {
    background: rgba(0, 255, 127, 0.25);
    border-left-color: #00ff7f;
}

/* ─── Animace ────────────────────────────────────────── */

@keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
}

@keyframes slideInLeft {
    from {
        opacity: 0;
        transform: translateX(-20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes slideInRight {
    from {
        opacity: 0;
        transform: translateX(20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

/* ─── Dark Theme ─────────────────────────────────────── */

[data-theme="dark"] body {
    background: #0e0e10 !important;
}

[data-theme="dark"] .wrap {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
}

/* ─── Light Theme ────────────────────────────────────── */

[data-theme="light"] body {
    background: #ffffff !important;
    color: #0e0e10;
}

[data-theme="light"] .wrap {
    text-shadow: none;
    background: rgba(0, 0, 0, 0.03);
    border-radius: 4px;
}

/* ─── Transparent Theme (default pro OBS) ────────────── */

[data-theme="transparent"] body {
    background: transparent !important;
}

/* ─── Platform indikátory ────────────────────────────── */

.platform-twitch .name { color: #9146ff; }
.platform-kick .name { color: #53fc18; }
.platform-youtube .name { color: #ff0000; }

/* Override pokud uživatel má vlastní barvu */
.meta[style] .name {
    color: inherit;
}

/* ─── Deleted messages ───────────────────────────────── */

.wrap.deleted {
    display: none;
}

/* ─── Responsive ─────────────────────────────────────── */

@media (max-width: 300px) {
    .badge { width: 14px; height: 14px; }
    .emote { height: 22px; }
    body { font-size: 12px; }
}
```

---

## 4. Integrace do hlavního Chat Panelu

### 4.1 "OBS Link" tlačítko v UI

V hlavním Chat Panelu přidat do sidebaru nebo settings:

```html
<!-- V settings modal nebo sidebar -->
<div class="obs-link-section">
    <h3>OBS Browser Source</h3>
    <p class="obs-description">Copy the URL below and paste it into OBS as a Browser Source.</p>
    <div class="obs-url-container">
        <input type="text" id="obsUrlInput" readonly>
        <button id="obsUrlCopy" title="Copy URL">📋</button>
    </div>
    <div class="obs-settings">
        <label>
            <span>Recommended size:</span>
            <span>400 × 600 px</span>
        </label>
        <label>
            <input type="checkbox" id="obsShowAlerts" checked>
            <span>Show alerts in OBS</span>
        </label>
        <label>
            <input type="number" id="obsHideAfter" value="0" min="0" max="300">
            <span>Hide messages after (s, 0 = never)</span>
        </label>
    </div>
    <button id="obsGenerateUrl">Generate OBS URL</button>
</div>
```

### 4.2 JavaScript pro generování URL

```javascript
document.getElementById('obsGenerateUrl').addEventListener('click', () => {
    const url = generateOBSUrl();
    document.getElementById('obsUrlInput').value = url;
});

document.getElementById('obsUrlCopy').addEventListener('click', () => {
    const input = document.getElementById('obsUrlInput');
    navigator.clipboard.writeText(input.value).then(() => {
        showToast('OBS URL copied to clipboard!');
    });
});
```

---

## 5. OBS Browser Source nastavení

### Doporučené nastavení pro uživatele

| Parametr | Hodnota | Popis |
|----------|---------|-------|
| **URL** | (generovaná) | Z hlavního panelu |
| **Width** | 400 | Šířka chatu |
| **Height** | 600 | Výška chatu |
| **FPS** | 30 | Dostatečné pro text |
| **Custom CSS** | (prázdné) | Nebo vlastní override |
| **Shutdown source when not visible** | ❌ Vypnout | Zachovat chat při přepnutí scény |

### OBS Custom CSS (volitelný override)

```css
/* Toto se přidává v OBS Browser Source properties */
body {
    background-color: rgba(0, 0, 0, 0) !important;
    margin: 0px auto;
    overflow: hidden;
}
```

---

## 6. Pokročilé funkce

### 6.1 Multi-chat layout

OBS view může podporovat různé layouty:

```
?layout=single          Jeden sloupec (default)
?layout=split           Dva sloupce (Twitch | Kick)
?layout=platform-tabs   Záložky podle platformy
```

### 6.2 Filtrování zpráv

```
?filter=mods-only       Jen moderátoři a broadcaster
?filter=subs-only       Jen subscribery
?filter=no-bots         Filtrovat známé boty
?blacklist=Nightbot,StreamElements    Ignorovat specifické uživatele
```

### 6.3 Animace vstupu zpráv

```
?animation=fade          Postupné zjevení (default)
?animation=slide-left    Příjezd zleva
?animation=slide-right   Příjezd zprava
?animation=bounce        Bounce efekt
?animation=none          Bez animace
```

### 6.4 Auto-hide zpráv

```
?hideAfter=10            Zpráva zmizí po 10 sekundách
?hideAfter=30            Po 30 sekundách
?hideAfter=0             Nikdy (default)
```

Toto je důležité pro OBS - streamery často chtějí aby staré zprávy zmizely.

---

## 7. Zabezpečení

### 7.1 Custom CSS injection

Custom CSS je aplikován přes `<style>` element, ne přes inline styles. Rizika:
- CSS nemůže spustit JavaScript (bezpečné)
- CSS nemůže číst data z DOM (bezpečné)
- CSS může měnit vizuální podobu (záměr)

### 7.2 URL parametry

- Všechny hodnoty jsou sanitizovány před použitím
- Base64 encoded CSS je dekódován v try/catch
- Channel names jsou escaped
- Žádný user input se nedostane do `eval()` nebo `innerHTML` bez escapování

### 7.3 CORS

OBS Browser Source běží jako Chromium instance s výchozí CORS politikou. Adaptéry (Twitch IRC, Kick Pusher) používají WebSocket, který CORS neomezuje.

---

## 8. Testování

### Lokální testování

```bash
# Spustit lokální server
cd /home/user/adhub
python -m http.server 8000

# OBS URL pro lokální testování:
# http://localhost:8000/projects/chat-panel/obs/?channels=twitch:xqc&theme=transparent
```

### OBS testování

1. Přidat Browser Source v OBS
2. Vložit URL
3. Nastavit 400×600
4. Ověřit transparentní pozadí
5. Ověřit že zprávy přicházejí

---

## 9. Shrnutí souborů k vytvoření

| Soubor | Účel |
|--------|------|
| `obs/index.html` | OBS stránka - HTML |
| `obs/obs-script.js` | OBS logika - načtení config, adaptéry, rendering |
| `obs/obs-styles.css` | Výchozí OBS styly (Streamlabs-kompatibilní) |

Plus úpravy v hlavním panelu:
- `script.js` → funkce `generateOBSUrl()`, tlačítko v UI
- `index.html` → OBS sekce v settings
- `styles.css` → styly pro OBS settings sekci
