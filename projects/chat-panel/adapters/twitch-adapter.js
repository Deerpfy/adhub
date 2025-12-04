/**
 * AdHub Multistream Chat v2
 * Twitch Adapter - IRC WebSocket připojení
 *
 * Funguje kompletně v prohlížeči bez serveru.
 * Používá anonymní IRC připojení (justinfan) pro čtení chatu.
 */

class TwitchAdapter extends BaseAdapter {
    constructor(config) {
        super({
            ...config,
            platform: 'twitch',
        });

        // Twitch IRC WebSocket
        this.ws = null;
        this.wsUrl = 'wss://irc-ws.chat.twitch.tv:443';

        // Badge cache
        this.globalBadges = {};
        this.channelBadges = {};
        this.channelId = null;

        // Emote sets
        this.globalEmotes = {};

        // Ping/Pong
        this.pingTimer = null;
        this.pongTimeout = null;
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
            // Načíst badge a info o kanálu paralelně
            await Promise.all([
                this._loadGlobalBadges(),
                this._loadChannelInfo(),
            ]);

            // Připojit k IRC
            await this._connectIrc();

            this._setState({
                connected: true,
                connecting: false,
                reconnectAttempts: 0,
            });

            this.emit('connect', { channel: this.channel });

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
            this.ws = new WebSocket(this.wsUrl);

            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
                this.ws.close();
            }, 10000);

            this.ws.onopen = () => {
                console.log('[Twitch] WebSocket connected');

                // Anonymní přihlášení
                this.ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
                this.ws.send('PASS SCHMOOPIIE');
                this.ws.send(`NICK justinfan${Math.floor(Math.random() * 80000 + 1000)}`);
                this.ws.send(`JOIN #${this.channel.toLowerCase()}`);
            };

            this.ws.onmessage = (event) => {
                const messages = event.data.split('\r\n');

                for (const message of messages) {
                    if (!message) continue;

                    // PING/PONG
                    if (message.startsWith('PING')) {
                        this.ws.send('PONG :tmi.twitch.tv');
                        continue;
                    }

                    // Úspěšné připojení
                    if (message.includes('366')) {
                        clearTimeout(timeout);
                        this._startPingTimer();
                        resolve();
                        continue;
                    }

                    // Chat zpráva
                    if (message.includes('PRIVMSG')) {
                        this._handlePrivmsg(message);
                    }
                }
            };

            this.ws.onerror = (error) => {
                console.error('[Twitch] WebSocket error:', error);
                clearTimeout(timeout);
                reject(new Error('WebSocket error'));
            };

            this.ws.onclose = () => {
                console.log('[Twitch] WebSocket closed');
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
        const tagMatch = raw.match(/^@([^ ]+) /);
        const tags = {};

        if (tagMatch) {
            tagMatch[1].split(';').forEach(tag => {
                const [key, value] = tag.split('=');
                tags[key] = value || '';
            });
        }

        const messageMatch = raw.match(/PRIVMSG #\w+ :(.+)$/);
        if (!messageMatch) return null;

        return {
            tags,
            content: messageMatch[1],
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
        let color = tags.color || this._generateColor(tags['display-name'] || tags['user-id']);

        return {
            id: tags.id || `twitch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            platform: 'twitch',
            channel: this.channel,
            author: {
                id: tags['user-id'] || '',
                username: tags['display-name']?.toLowerCase() || '',
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

        for (const pair of badgePairs) {
            const [type, version] = pair.split('/');
            if (!type) continue;

            // Hledání v channel badges
            let badgeInfo = this.channelBadges[type]?.[version];

            // Fallback na global badges
            if (!badgeInfo) {
                badgeInfo = this.globalBadges[type]?.[version];
            }

            badges.push({
                type: type,
                id: `${type}/${version}`,
                url: badgeInfo?.image_url_1x || badgeInfo?.image_url_2x || '',
                title: badgeInfo?.title || type,
            });
        }

        return badges;
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

        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }

        return colors[Math.abs(hash) % colors.length];
    }

    /**
     * Načtení globálních badges z Twitch API
     */
    async _loadGlobalBadges() {
        try {
            // Používáme veřejný endpoint bez autentizace
            const response = await fetch('https://badges.twitch.tv/v1/badges/global/display');

            if (!response.ok) {
                console.warn('[Twitch] Failed to load global badges');
                return;
            }

            const data = await response.json();
            this.globalBadges = data.badge_sets || {};

            console.log('[Twitch] Global badges loaded');

        } catch (error) {
            console.warn('[Twitch] Error loading global badges:', error);
        }
    }

    /**
     * Načtení info o kanálu a channel badges
     */
    async _loadChannelInfo() {
        try {
            // Pro channel badges potřebujeme channel ID
            // Zkusíme získat z veřejného API
            const response = await fetch(`https://badges.twitch.tv/v1/badges/channels/${this.channel}/display`);

            if (response.ok) {
                const data = await response.json();
                this.channelBadges = data.badge_sets || {};
                console.log('[Twitch] Channel badges loaded');
            }

        } catch (error) {
            console.warn('[Twitch] Error loading channel info:', error);
        }
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
        }, 300000); // 5 minut
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
