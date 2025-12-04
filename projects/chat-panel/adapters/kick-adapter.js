/**
 * AdHub Multistream Chat v2
 * Kick Adapter - Pusher WebSocket připojení
 *
 * Kick používá interně Pusher pro real-time chat.
 * Tento adapter se připojuje přímo k Pusher WebSocket.
 *
 * Poznámka: Kick API má CORS restrikce, proto používáme:
 * 1. Přímé Pusher WebSocket připojení (funguje v browseru)
 * 2. kick7.tv API pro získání channel info (má CORS headers)
 */

class KickAdapter extends BaseAdapter {
    constructor(config) {
        super({
            ...config,
            platform: 'kick',
        });

        // Pusher konfigurace (veřejné hodnoty z kick.com)
        this.pusherKey = 'eb1d5f283081a78b932c';
        this.pusherCluster = 'us2';
        this.ws = null;

        // Channel info
        this.chatroomId = null;
        this.channelInfo = null;

        // Pusher stav
        this.activityTimeout = null;
        this.lastActivity = Date.now();

        // Emotes cache
        this.emotes = {};
    }

    /**
     * Připojení k Kick chatu
     */
    async connect() {
        if (this.state.connected || this.state.connecting) {
            return;
        }

        this._setState({ connecting: true, error: null });
        this.emit('stateChange', { state: 'connecting' });

        try {
            // Získat channel info
            await this._loadChannelInfo();

            if (!this.chatroomId) {
                throw new Error(`Kanál "${this.channel}" nebyl nalezen nebo je offline`);
            }

            // Připojit k Pusher
            await this._connectPusher();

            this._setState({
                connected: true,
                connecting: false,
                reconnectAttempts: 0,
            });

            this.emit('connect', { channel: this.channel });

        } catch (error) {
            console.error('[Kick] Connection error:', error);
            this._setState({ connecting: false, error: error.message });
            this.emit('error', { message: error.message, code: 'CONNECTION_ERROR' });
            this._attemptReconnect();
        }
    }

    /**
     * Odpojení od Kick chatu
     */
    async disconnect() {
        this._clearActivityTimeout();

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        await super.disconnect();
        this.emit('disconnect', { channel: this.channel });
    }

    /**
     * Načtení info o kanálu
     * Používá kick7.tv API (má CORS headers) nebo fallback metody
     */
    async _loadChannelInfo() {
        const methods = [
            () => this._fetchFromKick7(),
            () => this._fetchFromKickApi(),
            () => this._useKnownChatroomId(),
        ];

        for (const method of methods) {
            try {
                const result = await method();
                if (result) return;
            } catch (error) {
                console.warn('[Kick] Method failed:', error.message);
            }
        }

        throw new Error('Nepodařilo se získat informace o kanálu');
    }

    /**
     * Pokus o získání dat z kick7.tv API
     */
    async _fetchFromKick7() {
        // kick7.tv je neoficiální API s CORS support
        const response = await fetch(
            `https://kick.com/api/v2/channels/${this.channel.toLowerCase()}`,
            {
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data && data.chatroom && data.chatroom.id) {
            this.chatroomId = data.chatroom.id;
            this.channelInfo = {
                id: data.id,
                slug: data.slug,
                username: data.user?.username || this.channel,
                displayName: data.user?.username || this.channel,
                avatar: data.user?.profile_pic || null,
                verified: data.verified || false,
            };

            // Načíst emotes
            if (data.chatroom?.emotes) {
                this._processEmotes(data.chatroom.emotes);
            }

            console.log(`[Kick] Channel info loaded: chatroom=${this.chatroomId}`);
            return true;
        }

        return false;
    }

    /**
     * Fallback - přímé Kick API (může být blokováno CORS)
     */
    async _fetchFromKickApi() {
        // Tento endpoint může být blokován CORS v prohlížeči
        const response = await fetch(
            `https://kick.com/api/v1/channels/${this.channel.toLowerCase()}`,
            {
                mode: 'cors',
                credentials: 'omit',
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data && data.chatroom && data.chatroom.id) {
            this.chatroomId = data.chatroom.id;
            this.channelInfo = {
                id: data.id,
                slug: data.slug,
                username: data.user?.username || this.channel,
            };
            return true;
        }

        return false;
    }

    /**
     * Fallback - použít známé chatroom ID z localStorage
     */
    async _useKnownChatroomId() {
        const cached = localStorage.getItem(`kick_chatroom_${this.channel.toLowerCase()}`);
        if (cached) {
            const data = JSON.parse(cached);
            if (data.chatroomId && Date.now() - data.timestamp < 86400000) { // 24h cache
                this.chatroomId = data.chatroomId;
                this.channelInfo = data.channelInfo || { username: this.channel };
                console.log(`[Kick] Using cached chatroom ID: ${this.chatroomId}`);
                return true;
            }
        }
        return false;
    }

    /**
     * Uložení chatroom ID do cache
     */
    _saveChatroomCache() {
        if (this.chatroomId) {
            localStorage.setItem(`kick_chatroom_${this.channel.toLowerCase()}`, JSON.stringify({
                chatroomId: this.chatroomId,
                channelInfo: this.channelInfo,
                timestamp: Date.now(),
            }));
        }
    }

    /**
     * Zpracování emotes z API
     */
    _processEmotes(emotesList) {
        if (!Array.isArray(emotesList)) return;

        for (const emote of emotesList) {
            this.emotes[emote.name] = {
                id: emote.id,
                name: emote.name,
                url: emote.images?.url || `https://files.kick.com/emotes/${emote.id}/fullsize`,
            };
        }
    }

    /**
     * Připojení k Pusher WebSocket
     */
    async _connectPusher() {
        return new Promise((resolve, reject) => {
            const wsUrl = `wss://ws-${this.pusherCluster}.pusher.com/app/${this.pusherKey}?protocol=7&client=js&version=8.3.0&flash=false`;

            this.ws = new WebSocket(wsUrl);

            const timeout = setTimeout(() => {
                reject(new Error('Pusher connection timeout'));
                this.ws.close();
            }, 15000);

            this.ws.onopen = () => {
                console.log('[Kick] Pusher WebSocket connected');
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this._handlePusherEvent(data, resolve, reject, timeout);
                } catch (error) {
                    console.error('[Kick] Error parsing Pusher message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[Kick] Pusher WebSocket error:', error);
                clearTimeout(timeout);
                reject(new Error('WebSocket error'));
            };

            this.ws.onclose = (event) => {
                console.log('[Kick] Pusher WebSocket closed:', event.code);
                this._clearActivityTimeout();

                if (this.state.connected) {
                    this._setState({ connected: false });
                    this.emit('disconnect', { channel: this.channel });
                    this._attemptReconnect();
                }
            };
        });
    }

    /**
     * Zpracování Pusher eventů
     */
    _handlePusherEvent(data, resolve, reject, timeout) {
        this.lastActivity = Date.now();

        switch (data.event) {
            case 'pusher:connection_established':
                console.log('[Kick] Pusher connection established');
                this._subscribeToChatroom();
                break;

            case 'pusher_internal:subscription_succeeded':
                console.log('[Kick] Subscribed to chatroom');
                clearTimeout(timeout);
                this._saveChatroomCache();
                this._startActivityTimeout();
                resolve();
                break;

            case 'pusher:error':
                console.error('[Kick] Pusher error:', data.data);
                if (data.data?.code === 4001) {
                    clearTimeout(timeout);
                    reject(new Error('Pusher subscription failed'));
                }
                break;

            case 'App\\Events\\ChatMessageEvent':
                this._handleChatMessage(data.data);
                break;

            case 'App\\Events\\ChatMessageDeletedEvent':
                // Zpráva byla smazána
                this.emit('messageDeleted', { id: JSON.parse(data.data || '{}').id });
                break;

            case 'App\\Events\\UserBannedEvent':
                // Uživatel byl zabanován
                break;

            case 'pusher:pong':
                // Activity refresh
                break;
        }
    }

    /**
     * Subscribe na chatroom kanál
     */
    _subscribeToChatroom() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const subscribeMessage = JSON.stringify({
            event: 'pusher:subscribe',
            data: {
                auth: '',
                channel: `chatrooms.${this.chatroomId}.v2`,
            },
        });

        this.ws.send(subscribeMessage);
    }

    /**
     * Zpracování chat zprávy
     */
    _handleChatMessage(rawData) {
        try {
            const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            const normalized = this.normalizeMessage(data);
            this.emit('message', normalized);

        } catch (error) {
            console.error('[Kick] Error processing chat message:', error);
        }
    }

    /**
     * Normalizace zprávy do společného formátu
     */
    normalizeMessage(data) {
        const sender = data.sender || {};
        const identity = sender.identity || {};

        // Parsování badges
        const badges = this._parseBadges(identity.badges || []);

        // Parsování emotes v textu
        const emotes = this._parseEmotes(data.content || '');

        // Detekce rolí
        const roles = {
            broadcaster: badges.some(b => b.type === 'broadcaster'),
            moderator: badges.some(b => b.type === 'moderator'),
            vip: badges.some(b => b.type === 'vip' || b.type === 'og'),
            subscriber: badges.some(b => b.type === 'subscriber' || b.type === 'sub_gifter'),
        };

        // Barva jména
        const color = identity.color || this._generateColor(sender.username || sender.id);

        return {
            id: data.id || `kick-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            platform: 'kick',
            channel: this.channel,
            author: {
                id: String(sender.id || ''),
                username: sender.username || 'Anonymous',
                displayName: sender.username || 'Anonymous',
                color: color,
                badges: badges,
                roles: roles,
            },
            content: data.content || '',
            emotes: emotes,
            timestamp: new Date(data.created_at || Date.now()),
            raw: data,
        };
    }

    /**
     * Parsování badges
     */
    _parseBadges(badgesList) {
        if (!Array.isArray(badgesList)) return [];

        return badgesList.map(badge => ({
            type: badge.type || badge.badge_type || 'unknown',
            id: String(badge.id || badge.badge_id || ''),
            url: badge.badge_image?.src || badge.image_url || '',
            title: badge.badge_text || badge.text || badge.type || 'Badge',
        }));
    }

    /**
     * Parsování emotes v textu
     */
    _parseEmotes(content) {
        const emotes = [];

        // Hledání [emote:ID:name] pattern (Kick formát)
        const emoteRegex = /\[emote:(\d+):([^\]]+)\]/g;
        let match;

        while ((match = emoteRegex.exec(content)) !== null) {
            emotes.push({
                id: match[1],
                name: match[2],
                url: `https://files.kick.com/emotes/${match[1]}/fullsize`,
                start: match.index,
                end: match.index + match[0].length - 1,
            });
        }

        // Hledání známých channel emotes
        for (const [name, emote] of Object.entries(this.emotes)) {
            const regex = new RegExp(`\\b${this._escapeRegex(name)}\\b`, 'g');
            while ((match = regex.exec(content)) !== null) {
                // Zkontrolovat, že to není uvnitř [emote:...] patternu
                const alreadyMatched = emotes.some(e =>
                    match.index >= e.start && match.index <= e.end
                );

                if (!alreadyMatched) {
                    emotes.push({
                        id: emote.id,
                        name: emote.name,
                        url: emote.url,
                        start: match.index,
                        end: match.index + name.length - 1,
                    });
                }
            }
        }

        // Seřadit podle pozice
        emotes.sort((a, b) => b.start - a.start);

        return emotes;
    }

    /**
     * Escape speciálních znaků pro regex
     */
    _escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Generování barvy pro uživatele
     */
    _generateColor(seed) {
        const colors = [
            '#53fc18', '#18fc90', '#18b8fc', '#5c18fc', '#fc18d4',
            '#fc1818', '#fc9018', '#fcfc18', '#18fc18', '#18fcfc',
        ];

        if (!seed) return colors[0];

        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }

        return colors[Math.abs(hash) % colors.length];
    }

    /**
     * Activity timeout pro detekci ztráty spojení
     */
    _startActivityTimeout() {
        this._clearActivityTimeout();

        this.activityTimeout = setInterval(() => {
            const elapsed = Date.now() - this.lastActivity;

            // Pokud nebyla aktivita 30 sekund, odeslat ping
            if (elapsed > 30000 && this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
            }

            // Pokud nebyla aktivita 60 sekund, považovat za odpojené
            if (elapsed > 60000) {
                console.warn('[Kick] Activity timeout, reconnecting...');
                this.ws?.close();
            }
        }, 10000);
    }

    /**
     * Zrušení activity timeout
     */
    _clearActivityTimeout() {
        if (this.activityTimeout) {
            clearInterval(this.activityTimeout);
            this.activityTimeout = null;
        }
    }
}

// Export pro globální použití
window.KickAdapter = KickAdapter;
