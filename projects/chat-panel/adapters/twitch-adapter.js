/**
 * AdHub Multistream Chat v2
 * Twitch Adapter - IRC WebSocket připojení
 *
 * Funguje kompletně v prohlížeči bez serveru.
 * Používá anonymní IRC připojení (justinfan) pro čtení chatu.
 */

class TwitchAdapter extends BaseAdapter {
    constructor(config) {
        // Extrahovat název kanálu z URL pokud je potřeba
        let channel = config.channel;
        if (channel.includes('twitch.tv/')) {
            const match = channel.match(/twitch\.tv\/([^\/\?]+)/);
            if (match) {
                channel = match[1];
            }
        }
        // Odstranit @ pokud je na začátku
        channel = channel.replace(/^@/, '').toLowerCase().trim();

        super({
            ...config,
            channel: channel,
            platform: 'twitch',
        });

        // Twitch IRC WebSocket
        this.ws = null;
        this.wsUrl = 'wss://irc-ws.chat.twitch.tv:443';

        // Badge cache (volitelné - chat funguje i bez nich)
        this.globalBadges = {};
        this.channelBadges = {};

        // Ping/Pong
        this.pingTimer = null;
        this.pongTimeout = null;

        // Connection state
        this.joinConfirmed = false;
    }

    /**
     * Připojení k Twitch IRC
     */
    async connect() {
        if (this.state.connected || this.state.connecting) {
            return;
        }

        this._setState({ connecting: true, error: null });
        this.emit('stateChange', { state: 'connecting' });

        try {
            // Připojit k IRC (badges jsou volitelné, nenačítáme je)
            await this._connectIrc();

            this._setState({
                connected: true,
                connecting: false,
                reconnectAttempts: 0,
            });

            this.emit('connect', { channel: this.channel });
            console.log(`[Twitch] Connected to #${this.channel}`);

        } catch (error) {
            console.error('[Twitch] Connection error:', error);
            this._setState({ connecting: false, error: error.message });
            this.emit('error', { message: error.message, code: 'CONNECTION_ERROR' });
            this._attemptReconnect();
        }
    }

    /**
     * Odpojení od Twitch IRC
     */
    async disconnect() {
        this._clearPingTimer();

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        await super.disconnect();
        this.emit('disconnect', { channel: this.channel });
    }

    /**
     * Připojení k IRC WebSocket
     */
    async _connectIrc() {
        return new Promise((resolve, reject) => {
            this.joinConfirmed = false;
            this.ws = new WebSocket(this.wsUrl);

            const timeout = setTimeout(() => {
                if (!this.joinConfirmed) {
                    reject(new Error('Connection timeout - kanál možná neexistuje'));
                    this.ws.close();
                }
            }, 15000);

            this.ws.onopen = () => {
                console.log('[Twitch] WebSocket connected, authenticating...');

                // Anonymní přihlášení - pořadí je důležité!
                this.ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
                this.ws.send('PASS SCHMOOPIIE');
                this.ws.send(`NICK justinfan${Math.floor(Math.random() * 80000 + 1000)}`);
            };

            this.ws.onmessage = (event) => {
                const messages = event.data.split('\r\n');

                for (const message of messages) {
                    if (!message) continue;

                    // Debug log
                    // console.log('[Twitch IRC]', message);

                    // PING/PONG
                    if (message.startsWith('PING')) {
                        this.ws.send(message.replace('PING', 'PONG'));
                        continue;
                    }

                    // Úspěšná autentizace (001 = Welcome)
                    if (message.includes(' 001 ')) {
                        console.log('[Twitch] Authenticated, joining channel...');
                        this.ws.send(`JOIN #${this.channel}`);
                        continue;
                    }

                    // Úspěšné připojení ke kanálu (366 = End of /NAMES list)
                    if (message.includes(' 366 ')) {
                        console.log('[Twitch] Joined channel successfully');
                        this.joinConfirmed = true;
                        clearTimeout(timeout);
                        this._startPingTimer();
                        resolve();
                        continue;
                    }

                    // Chyba - kanál neexistuje nebo je zabanovaný
                    if (message.includes(' 403 ') || message.includes('NOTICE') && message.includes('suspended')) {
                        clearTimeout(timeout);
                        reject(new Error(`Kanál #${this.channel} neexistuje nebo je nedostupný`));
                        continue;
                    }

                    // Chat zpráva
                    if (message.includes('PRIVMSG')) {
                        this._handlePrivmsg(message);
                    }

                    // PONG odpověď
                    if (message.startsWith('PONG') || message.includes('PONG')) {
                        if (this.pongTimeout) {
                            clearTimeout(this.pongTimeout);
                            this.pongTimeout = null;
                        }
                    }
                }
            };

            this.ws.onerror = (error) => {
                console.error('[Twitch] WebSocket error:', error);
                clearTimeout(timeout);
                reject(new Error('WebSocket connection error'));
            };

            this.ws.onclose = (event) => {
                console.log('[Twitch] WebSocket closed:', event.code, event.reason);
                this._clearPingTimer();

                if (this.state.connected) {
                    this._setState({ connected: false });
                    this.emit('disconnect', { channel: this.channel });
                    this._attemptReconnect();
                }
            };
        });
    }

    /**
     * Zpracování PRIVMSG zprávy
     */
    _handlePrivmsg(raw) {
        try {
            const parsed = this._parseIrcMessage(raw);
            if (!parsed) return;

            const normalized = this.normalizeMessage(parsed);
            this.emit('message', normalized);

        } catch (error) {
            console.error('[Twitch] Error parsing message:', error);
        }
    }

    /**
     * Parsování IRC zprávy
     */
    _parseIrcMessage(raw) {
        // Parsování tagů
        const tagMatch = raw.match(/^@([^ ]+) /);
        const tags = {};

        if (tagMatch) {
            tagMatch[1].split(';').forEach(tag => {
                const idx = tag.indexOf('=');
                if (idx !== -1) {
                    const key = tag.substring(0, idx);
                    const value = tag.substring(idx + 1);
                    tags[key] = value || '';
                }
            });
        }

        // Parsování obsahu zprávy - podporuje speciální znaky v názvu kanálu
        const messageMatch = raw.match(/PRIVMSG #([^ ]+) :(.+)$/);
        if (!messageMatch) return null;

        return {
            tags,
            channel: messageMatch[1],
            content: messageMatch[2],
        };
    }

    /**
     * Normalizace zprávy do společného formátu
     */
    normalizeMessage(parsed) {
        const { tags, content } = parsed;

        // Parsování badges
        const badges = this._parseBadges(tags.badges || '');

        // Parsování emotes
        const emotes = this._parseEmotes(tags.emotes || '', content);

        // Detekce rolí
        const roles = {
            broadcaster: badges.some(b => b.type === 'broadcaster'),
            moderator: badges.some(b => b.type === 'moderator'),
            vip: badges.some(b => b.type === 'vip'),
            subscriber: badges.some(b => b.type === 'subscriber'),
        };

        // Barva jména
        let color = tags.color || this._generateColor(tags['display-name'] || tags['user-id'] || 'anonymous');

        return {
            id: tags.id || `twitch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            platform: 'twitch',
            channel: this.channel,
            author: {
                id: tags['user-id'] || '',
                username: (tags['display-name'] || 'Anonymous').toLowerCase(),
                displayName: tags['display-name'] || 'Anonymous',
                color: color,
                badges: badges,
                roles: roles,
            },
            content: content,
            emotes: emotes,
            timestamp: new Date(parseInt(tags['tmi-sent-ts']) || Date.now()),
            raw: parsed,
        };
    }

    /**
     * Parsování badges
     */
    _parseBadges(badgesStr) {
        if (!badgesStr) return [];

        const badges = [];
        const badgePairs = badgesStr.split(',');

        // Známé badge URL (statické)
        const badgeUrls = {
            'broadcaster': 'https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/2',
            'moderator': 'https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/2',
            'vip': 'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744f6a20e/2',
            'subscriber': 'https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/2',
            'premium': 'https://static-cdn.jtvnw.net/badges/v1/bbbe0db0-a598-423e-86d0-f9fb98ca1933/2',
            'partner': 'https://static-cdn.jtvnw.net/badges/v1/d12a2e27-16f6-41d0-ab77-b780518f00a3/2',
            'verified': 'https://static-cdn.jtvnw.net/badges/v1/d12a2e27-16f6-41d0-ab77-b780518f00a3/2',
        };

        for (const pair of badgePairs) {
            const [type, version] = pair.split('/');
            if (!type) continue;

            badges.push({
                type: type,
                id: `${type}/${version}`,
                url: badgeUrls[type] || '',
                title: this._getBadgeTitle(type),
            });
        }

        return badges;
    }

    /**
     * Získání názvu badge
     */
    _getBadgeTitle(type) {
        const titles = {
            'broadcaster': 'Broadcaster',
            'moderator': 'Moderator',
            'vip': 'VIP',
            'subscriber': 'Subscriber',
            'premium': 'Twitch Prime',
            'partner': 'Partner',
            'verified': 'Verified',
            'bits': 'Bits',
            'sub-gifter': 'Sub Gifter',
        };
        return titles[type] || type;
    }

    /**
     * Parsování emotes
     */
    _parseEmotes(emotesStr, content) {
        if (!emotesStr) return [];

        const emotes = [];
        const emoteParts = emotesStr.split('/');

        for (const part of emoteParts) {
            const [id, positions] = part.split(':');
            if (!id || !positions) continue;

            const positionList = positions.split(',');
            for (const pos of positionList) {
                const [start, end] = pos.split('-').map(Number);
                const name = content.substring(start, end + 1);

                emotes.push({
                    id: id,
                    name: name,
                    url: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`,
                    start: start,
                    end: end,
                });
            }
        }

        // Seřadit podle pozice (od konce kvůli nahrazování)
        emotes.sort((a, b) => b.start - a.start);

        return emotes;
    }

    /**
     * Generování barvy pro uživatele bez nastavené barvy
     */
    _generateColor(seed) {
        const colors = [
            '#FF0000', '#0000FF', '#008000', '#B22222', '#FF7F50',
            '#9ACD32', '#FF4500', '#2E8B57', '#DAA520', '#D2691E',
            '#5F9EA0', '#1E90FF', '#FF69B4', '#8A2BE2', '#00FF7F',
        ];

        if (!seed) return colors[0];

        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }

        return colors[Math.abs(hash) % colors.length];
    }

    /**
     * Ping timer pro udržení spojení
     */
    _startPingTimer() {
        this._clearPingTimer();

        this.pingTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send('PING :tmi.twitch.tv');

                // Timeout pro PONG odpověď
                this.pongTimeout = setTimeout(() => {
                    console.warn('[Twitch] PONG timeout, reconnecting...');
                    this.ws.close();
                }, 10000);
            }
        }, 240000); // 4 minuty (Twitch vyžaduje PING každých 5 minut)
    }

    /**
     * Zrušení ping timeru
     */
    _clearPingTimer() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
        if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = null;
        }
    }
}

// Export pro globální použití
window.TwitchAdapter = TwitchAdapter;
