/**
 * AdHub Multistream Chat v2
 * Kick Adapter - Pusher WebSocket připojení
 *
 * Kick používá interně Pusher pro real-time chat.
 * Tento adapter se připojuje přímo k Pusher WebSocket.
 *
 * DŮLEŽITÉ: Kick API má CORS restrikce a nelze volat z browseru.
 * Proto používáme:
 * 1. Databázi známých chatroom IDs
 * 2. Manuální zadání chatroom_id uživatelem
 * 3. Cache v localStorage
 */

class KickAdapter extends BaseAdapter {
    constructor(config) {
        // Extrahovat název kanálu z URL pokud je potřeba
        let channel = config.channel;
        if (channel.includes('kick.com/')) {
            const match = channel.match(/kick\.com\/([^\/\?]+)/);
            if (match) {
                channel = match[1];
            }
        }
        // Odstranit @ pokud je na začátku
        channel = channel.replace(/^@/, '').toLowerCase().trim();

        super({
            ...config,
            channel: channel,
            platform: 'kick',
        });

        // Pusher konfigurace (veřejné hodnoty z kick.com)
        this.pusherKey = 'eb1d5f283081a78b932c';
        this.pusherCluster = 'us2';
        this.ws = null;

        // Channel info
        this.chatroomId = config.chatroomId || null;
        this.channelInfo = null;

        // Pusher stav
        this.activityTimeout = null;
        this.lastActivity = Date.now();

        // Emotes cache
        this.emotes = {};
    }

    /**
     * Databáze známých streamerů a jejich chatroom IDs
     * Aktualizováno: Prosinec 2024
     */
    static KNOWN_CHATROOMS = {
        // Top Kick streamers
        'trainwreckstv': 4807295,
        'trainwrecks': 4807295,
        'xqc': 668,
        'xqcow': 668,
        'adin': 1587977,
        'adinross': 1587977,
        'stake': 4390844,
        'roshtein': 27268,
        'nickmercs': 15577723,
        'amouranth': 139609,
        'hasanabi': 2014334,
        'hasan': 2014334,
        'clix': 17247133,
        'jynxzi': 10525717,
        'plaqueboymax': 14932715,
        'ice': 3714680,
        'iceposeidon': 3714680,
        'mizkif': 5348254,
        'pokimane': 15509501,
        'kai': 16137976,
        'kaicenat': 16137976,
        'fanum': 14739227,
        'aceu': 16016925,
        'symfuhny': 15556313,
        'drake': 17043963,
        'destiny': 5063803,
        'sneako': 16004632,
    };

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
            // Získat chatroom ID
            await this._resolveChatroomId();

            if (!this.chatroomId) {
                throw new Error(
                    `Chatroom ID pro "${this.channel}" není známé. ` +
                    `Zadejte chatroom ID manuálně (formát: název:ID, např. trainwreckstv:4807295)`
                );
            }

            // Připojit k Pusher
            await this._connectPusher();

            this._setState({
                connected: true,
                connecting: false,
                reconnectAttempts: 0,
            });

            this.emit('connect', { channel: this.channel });
            console.log(`[Kick] Connected to ${this.channel} (chatroom: ${this.chatroomId})`);

        } catch (error) {
            console.error('[Kick] Connection error:', error);
            this._setState({ connecting: false, error: error.message });
            this.emit('error', { message: error.message, code: 'CONNECTION_ERROR' });
            // Nepokoušet se o reconnect pokud nemáme chatroom ID
            if (this.chatroomId) {
                this._attemptReconnect();
            }
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
     * Získání chatroom ID - z různých zdrojů
     */
    async _resolveChatroomId() {
        // 1. Už máme chatroom ID (z konstruktoru nebo manuálního zadání)
        if (this.chatroomId) {
            console.log(`[Kick] Using provided chatroom ID: ${this.chatroomId}`);
            return;
        }

        // 2. Zkusit parsovat manuální formát "channel:chatroomId"
        if (this.channel.includes(':')) {
            const [name, id] = this.channel.split(':');
            if (id && !isNaN(parseInt(id))) {
                this.channel = name.toLowerCase().trim();
                this.chatroomId = parseInt(id);
                console.log(`[Kick] Parsed manual chatroom ID: ${this.chatroomId}`);
                this._saveChatroomCache();
                return;
            }
        }

        // 3. Zkusit známou databázi
        const knownId = KickAdapter.KNOWN_CHATROOMS[this.channel.toLowerCase()];
        if (knownId) {
            this.chatroomId = knownId;
            console.log(`[Kick] Found in known database: ${this.chatroomId}`);
            return;
        }

        // 4. Zkusit cache z localStorage
        const cached = this._getCachedChatroomId();
        if (cached) {
            this.chatroomId = cached;
            console.log(`[Kick] Found in cache: ${this.chatroomId}`);
            return;
        }

        // 5. Pokus o API volání (pravděpodobně selže kvůli CORS)
        try {
            await this._tryFetchFromApi();
            if (this.chatroomId) {
                console.log(`[Kick] Fetched from API: ${this.chatroomId}`);
                this._saveChatroomCache();
                return;
            }
        } catch (error) {
            console.warn('[Kick] API fetch failed (expected due to CORS):', error.message);
        }

        // Chatroom ID nebylo nalezeno
        console.error(`[Kick] Chatroom ID not found for: ${this.channel}`);
    }

    /**
     * Pokus o získání z API (pravděpodobně selže kvůli CORS)
     */
    async _tryFetchFromApi() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch(
                `https://kick.com/api/v2/channels/${this.channel.toLowerCase()}`,
                {
                    signal: controller.signal,
                    headers: { 'Accept': 'application/json' },
                }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Response is not JSON (CORS blocked)');
            }

            const data = await response.json();

            if (data?.chatroom?.id) {
                this.chatroomId = data.chatroom.id;
                this.channelInfo = {
                    id: data.id,
                    slug: data.slug,
                    username: data.user?.username || this.channel,
                };
            }
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Získání chatroom ID z cache
     */
    _getCachedChatroomId() {
        try {
            const cached = localStorage.getItem(`kick_chatroom_${this.channel.toLowerCase()}`);
            if (cached) {
                const data = JSON.parse(cached);
                // Cache platná 7 dní
                if (data.chatroomId && Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
                    return data.chatroomId;
                }
            }
        } catch (error) {
            console.warn('[Kick] Cache read error:', error);
        }
        return null;
    }

    /**
     * Uložení chatroom ID do cache
     */
    _saveChatroomCache() {
        if (this.chatroomId) {
            try {
                localStorage.setItem(`kick_chatroom_${this.channel.toLowerCase()}`, JSON.stringify({
                    chatroomId: this.chatroomId,
                    channelInfo: this.channelInfo,
                    timestamp: Date.now(),
                }));
            } catch (error) {
                console.warn('[Kick] Cache save error:', error);
            }
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
                if (data.data?.code === 4001 || data.data?.code === 4009) {
                    clearTimeout(timeout);
                    reject(new Error(`Pusher error: ${data.data?.message || 'Unknown error'}`));
                }
                break;

            case 'App\\Events\\ChatMessageEvent':
                this._handleChatMessage(data.data);
                break;

            case 'App\\Events\\ChatMessageDeletedEvent':
                try {
                    const deleteData = JSON.parse(data.data || '{}');
                    this.emit('messageDeleted', { id: deleteData.id });
                } catch (e) {}
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

        console.log(`[Kick] Subscribing to chatrooms.${this.chatroomId}.v2`);
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

        // Seřadit podle pozice
        emotes.sort((a, b) => b.start - a.start);

        return emotes;
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
        const seedStr = String(seed);
        for (let i = 0; i < seedStr.length; i++) {
            hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
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

            // Pokud nebyla aktivita 90 sekund, považovat za odpojené
            if (elapsed > 90000) {
                console.warn('[Kick] Activity timeout, reconnecting...');
                this.ws?.close();
            }
        }, 15000);
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

    /**
     * Statická metoda pro získání seznamu známých streamerů
     */
    static getKnownStreamers() {
        return Object.keys(KickAdapter.KNOWN_CHATROOMS);
    }
}

// Export pro globální použití
window.KickAdapter = KickAdapter;
