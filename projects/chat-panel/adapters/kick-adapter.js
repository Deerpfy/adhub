/**
 * AdHub Multistream Chat v2
 * Kick Adapter - Pusher WebSocket připojení
 *
 * Kick používá interně Pusher pro real-time chat.
 * Tento adapter se připojuje přímo k Pusher WebSocket.
 *
 * DŮLEŽITÉ: Kick API má CORS restrikce a nelze volat z browseru.
 * Proto používáme:
 * 1. Automatickou detekci Pusher API klíče
 * 2. Databázi známých chatroom IDs
 * 3. Manuální zadání chatroom_id uživatelem
 * 4. Cache v localStorage
 */

class KickAdapter extends BaseAdapter {
    /**
     * Seznam známých Pusher API klíčů (historické + aktuální)
     * Kick občas mění klíče, proto máme zálohy
     */
    static PUSHER_KEYS = [
        '32cbd69e4b950bf97679',  // Aktuální (Prosinec 2024)
        'eb1d5f283081a78b932c',  // Předchozí
        'c5f8c0a3a2b5c0a3a2b5',  // Záloha
    ];

    /**
     * Možné Pusher clustery
     */
    static PUSHER_CLUSTERS = ['us2', 'us3', 'eu', 'ap1'];

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

        // Pusher konfigurace - bude nastavena automaticky
        this.pusherKey = null;
        this.pusherCluster = null;
        this.ws = null;

        // Channel info
        this.chatroomId = config.chatroomId || null;
        this.channelInfo = null;

        // Pusher stav
        this.activityTimeout = null;
        this.lastActivity = Date.now();

        // Emotes cache
        this.emotes = {};

        // Channel ID (odlišný od chatroomId, potřebný pro channel events)
        this.channelId = config.channelId || null;
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
            // 1. Získat chatroom ID
            await this._resolveChatroomId();

            if (!this.chatroomId) {
                throw new Error(
                    `Chatroom ID pro "${this.channel}" není známé. ` +
                    `Zadejte chatroom ID manuálně (formát: název:ID, např. trainwreckstv:4807295)`
                );
            }

            // 2. Najít funkční Pusher konfiguraci
            await this._findWorkingPusherConfig();

            this._setState({
                connected: true,
                connecting: false,
                reconnectAttempts: 0,
            });

            this.emit('connect', { channel: this.channel });
            console.log(`[Kick] Connected to ${this.channel} (chatroom: ${this.chatroomId}, key: ${this.pusherKey})`);

        } catch (error) {
            console.error('[Kick] Connection error:', error);
            this._setState({ connecting: false, error: error.message });
            this.emit('error', { message: error.message, code: 'CONNECTION_ERROR' });
            // Nepokoušet se o reconnect pokud nemáme chatroom ID
            if (this.chatroomId && this.pusherKey) {
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
     * Automatická detekce funkčního Pusher API klíče
     * Zkouší různé kombinace klíčů a clusterů
     */
    async _findWorkingPusherConfig() {
        // 1. Zkusit cached konfiguraci
        const cached = this._getCachedPusherConfig();
        if (cached) {
            console.log(`[Kick] Trying cached Pusher config: ${cached.key}@${cached.cluster}`);
            try {
                await this._testPusherConfig(cached.key, cached.cluster);
                this.pusherKey = cached.key;
                this.pusherCluster = cached.cluster;
                console.log(`[Kick] Cached config works!`);
                return;
            } catch (error) {
                console.warn(`[Kick] Cached config failed:`, error.message);
            }
        }

        // 2. Zkusit všechny kombinace klíčů a clusterů
        for (const key of KickAdapter.PUSHER_KEYS) {
            for (const cluster of KickAdapter.PUSHER_CLUSTERS) {
                console.log(`[Kick] Testing Pusher config: ${key}@${cluster}`);
                try {
                    await this._testPusherConfig(key, cluster);
                    this.pusherKey = key;
                    this.pusherCluster = cluster;
                    this._savePusherConfig(key, cluster);
                    console.log(`[Kick] Found working config: ${key}@${cluster}`);
                    return;
                } catch (error) {
                    console.warn(`[Kick] Config ${key}@${cluster} failed:`, error.message);
                }
            }
        }

        throw new Error(
            'Nepodařilo se najít funkční Pusher konfiguraci. ' +
            'Kick pravděpodobně změnil API klíč. ' +
            'Navštivte kick.com, otevřete DevTools (F12) → Network → filtrujte "pusher" ' +
            'a najděte nový klíč v URL.'
        );
    }

    /**
     * Test Pusher konfigurace - zkusí se připojit a odebírat
     */
    async _testPusherConfig(key, cluster) {
        return new Promise((resolve, reject) => {
            const wsUrl = `wss://ws-${cluster}.pusher.com/app/${key}?protocol=7&client=js&version=8.4.0-rc2&flash=false`;
            const testWs = new WebSocket(wsUrl);

            const timeout = setTimeout(() => {
                testWs.close();
                reject(new Error('Connection timeout'));
            }, 8000);

            let connectionEstablished = false;

            testWs.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.event === 'pusher:connection_established') {
                        connectionEstablished = true;
                        // Zkusit odebírat chatroom
                        testWs.send(JSON.stringify({
                            event: 'pusher:subscribe',
                            data: {
                                auth: '',
                                channel: `chatrooms.${this.chatroomId}.v2`,
                            },
                        }));
                    }

                    if (data.event === 'pusher_internal:subscription_succeeded') {
                        clearTimeout(timeout);
                        // Close any orphaned WebSocket to prevent duplicate messages
                        if (this.ws && this.ws !== testWs) {
                            this.ws.onmessage = null;
                            this.ws.onclose = null;
                            this.ws.onerror = null;
                            this.ws.close();
                        }
                        this.ws = testWs;
                        this._setupWebSocketHandlers(testWs);
                        resolve();
                    }

                    if (data.event === 'pusher:error') {
                        clearTimeout(timeout);
                        testWs.close();
                        reject(new Error(data.data?.message || 'Pusher error'));
                    }
                } catch (error) {
                    // Ignorovat parse errors
                }
            };

            testWs.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('WebSocket error'));
            };

            testWs.onclose = (event) => {
                clearTimeout(timeout);
                if (!connectionEstablished) {
                    reject(new Error(`Connection closed: ${event.code}`));
                }
            };
        });
    }

    /**
     * Nastavení WebSocket handlerů po úspěšném připojení
     */
    _setupWebSocketHandlers(ws) {
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this._handlePusherEvent(data);
            } catch (error) {
                console.error('[Kick] Error parsing Pusher message:', error);
            }
        };

        ws.onclose = (event) => {
            console.log('[Kick] Pusher WebSocket closed:', event.code);
            this._clearActivityTimeout();

            if (this.state.connected) {
                this._setState({ connected: false });
                this.emit('disconnect', { channel: this.channel });
                this._attemptReconnect();
            }
        };

        ws.onerror = (error) => {
            console.error('[Kick] Pusher WebSocket error:', error);
        };

        this._savePusherConfig(this.pusherKey, this.pusherCluster);
        this._startActivityTimeout();

        // Odebírat channel events (sub, gift, follow, host) pokud máme channelId
        this._subscribeToChannelEvents();
    }

    /**
     * Odběr channel events (sub, gift, follow, raid/host)
     * Používá channel.{channelId} Pusher kanál
     */
    _subscribeToChannelEvents() {
        // channelId může být stejný jako chatroomId u mnoha kanálů
        const channelId = this.channelId || this.chatroomId;
        if (!channelId || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        this.ws.send(JSON.stringify({
            event: 'pusher:subscribe',
            data: {
                auth: '',
                channel: `channel.${channelId}`,
            },
        }));

        console.log(`[Kick] Subscribed to channel events: channel.${channelId}`);
    }

    /**
     * Zpracování Pusher eventů
     */
    _handlePusherEvent(data) {
        this.lastActivity = Date.now();

        switch (data.event) {
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

            // Channel events (sub, gift, follow, host)
            case 'App\\Events\\ChannelSubscriptionEvent':
                this._handleAlertEvent('subscribe', data.data);
                break;

            case 'App\\Events\\GiftedSubscriptionsEvent':
                this._handleAlertEvent('gift_sub', data.data);
                break;

            case 'App\\Events\\LuckyUsersWhoGotGiftSubscriptionsEvent':
                this._handleAlertEvent('gift_sub_received', data.data);
                break;

            case 'App\\Events\\FollowersUpdated':
                this._handleAlertEvent('follow', data.data);
                break;

            case 'App\\Events\\StreamHost':
                this._handleAlertEvent('raid', data.data);
                break;

            case 'App\\Events\\Sub\\SubscriptionEvent':
                this._handleAlertEvent('subscribe', data.data);
                break;

            case 'App\\Events\\Sub\\GiftsLeaderboardUpdated':
                // Leaderboard update, ignorovat
                break;

            case 'pusher:pong':
                // Activity refresh
                break;

            case 'pusher:error':
                console.error('[Kick] Pusher error:', data.data);
                break;
        }
    }

    /**
     * Zpracování channel event alertů
     */
    _handleAlertEvent(alertType, rawData) {
        try {
            const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            const alert = this._createAlert(alertType, data);
            if (alert) {
                this.emit('alert', alert);
            }
        } catch (error) {
            console.error(`[Kick] Error processing ${alertType} event:`, error);
        }
    }

    /**
     * Vytvoření alert objektu z Kick channel eventu
     */
    _createAlert(alertType, data) {
        const base = {
            id: `kick-${alertType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            platform: 'kick',
            channel: this.channel,
            type: 'alert',
            timestamp: new Date(),
            raw: data,
        };

        switch (alertType) {
            case 'subscribe':
                return {
                    ...base,
                    alertType: 'subscribe',
                    author: {
                        id: String(data.user_id || data.subscriber?.id || ''),
                        username: data.username || data.subscriber?.username || 'Someone',
                        displayName: data.username || data.subscriber?.username || 'Someone',
                        color: '#53fc18',
                        badges: [],
                        roles: {},
                    },
                    content: `${data.username || data.subscriber?.username || 'Someone'} just subscribed!`,
                    alertData: {
                        tier: '1000',
                        months: data.months || 1,
                        isGift: false,
                    },
                };

            case 'gift_sub':
                return {
                    ...base,
                    alertType: 'gift_sub',
                    author: {
                        id: String(data.gifter_id || data.gifter?.id || ''),
                        username: data.gifter_username || data.gifter?.username || 'Anonymous',
                        displayName: data.gifter_username || data.gifter?.username || 'Anonymous',
                        color: '#53fc18',
                        badges: [],
                        roles: {},
                    },
                    content: `${data.gifter_username || data.gifter?.username || 'Someone'} gifted ${data.gifted_count || data.quantity || 1} subs!`,
                    alertData: {
                        isGift: true,
                        gifterName: data.gifter_username || data.gifter?.username || 'Anonymous',
                        giftCount: data.gifted_count || data.quantity || 1,
                    },
                };

            case 'gift_sub_received':
                // Příjemci gift subů - může obsahovat pole
                if (Array.isArray(data)) {
                    for (const recipient of data) {
                        this.emit('alert', {
                            ...base,
                            id: `kick-giftrec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                            alertType: 'gift_sub_received',
                            author: {
                                id: String(recipient.id || ''),
                                username: recipient.username || 'Someone',
                                displayName: recipient.username || 'Someone',
                                color: '#53fc18',
                                badges: [],
                                roles: {},
                            },
                            content: `${recipient.username || 'Someone'} received a gift sub!`,
                            alertData: { isGift: true },
                        });
                    }
                    return null; // Už emitováno v cyklu
                }
                return null;

            case 'follow':
                return {
                    ...base,
                    alertType: 'follow',
                    author: {
                        id: '',
                        username: data.username || 'Someone',
                        displayName: data.username || 'Someone',
                        color: '#53fc18',
                        badges: [],
                        roles: {},
                    },
                    content: data.username
                        ? `${data.username} is now following!`
                        : `New follower! (${data.followersCount || data.followers_count || '?'} total)`,
                    alertData: {
                        followedAt: new Date(),
                    },
                };

            case 'raid':
                return {
                    ...base,
                    alertType: 'raid',
                    author: {
                        id: String(data.host_id || data.id || ''),
                        username: data.host_username || data.slug || 'Unknown',
                        displayName: data.host_username || data.slug || 'Unknown',
                        color: '#53fc18',
                        badges: [],
                        roles: {},
                    },
                    content: `${data.host_username || data.slug || 'Someone'} is hosting with ${data.number_viewers || data.viewers_count || '?'} viewers!`,
                    alertData: {
                        viewers: data.number_viewers || data.viewers_count || 0,
                        fromChannel: data.host_username || data.slug || 'Unknown',
                    },
                };

            default:
                return null;
        }
    }

    /**
     * Získání cached Pusher konfigurace
     */
    _getCachedPusherConfig() {
        try {
            const cached = localStorage.getItem('kick_pusher_config');
            if (cached) {
                const data = JSON.parse(cached);
                // Cache platná 24 hodin
                if (data.key && data.cluster && Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
                    return { key: data.key, cluster: data.cluster };
                }
            }
        } catch (error) {}
        return null;
    }

    /**
     * Uložení Pusher konfigurace do cache
     */
    _savePusherConfig(key, cluster) {
        try {
            localStorage.setItem('kick_pusher_config', JSON.stringify({
                key,
                cluster,
                timestamp: Date.now(),
            }));
        } catch (error) {}
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
                this.channelId = data.id || null;
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

    /**
     * Statická metoda pro přidání nového Pusher klíče
     */
    static addPusherKey(key) {
        if (!KickAdapter.PUSHER_KEYS.includes(key)) {
            KickAdapter.PUSHER_KEYS.unshift(key); // Přidat na začátek
            console.log(`[Kick] Added new Pusher key: ${key}`);
        }
    }

    /**
     * Statická metoda pro vyčištění cache
     */
    static clearCache() {
        try {
            localStorage.removeItem('kick_pusher_config');
            // Vyčistit všechny chatroom cache
            for (const key of Object.keys(localStorage)) {
                if (key.startsWith('kick_chatroom_')) {
                    localStorage.removeItem(key);
                }
            }
            console.log('[Kick] Cache cleared');
        } catch (error) {
            console.error('[Kick] Error clearing cache:', error);
        }
    }
}

// Export pro globální použití
window.KickAdapter = KickAdapter;
