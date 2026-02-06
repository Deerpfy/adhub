/**
 * AdHub Multistream Chat v2
 * Twitch EventSub Adapter - Volitelny OAuth pro pokrocile alerty
 *
 * DULEZITE: Tento adapter je VOLITELNY.
 * Zakladni chat i alerty (sub, resub, gift, raid) funguji BEZ autentizace
 * pres IRC USERNOTICE v hlavnim TwitchAdapter.
 *
 * EventSub pridava:
 * - channel.follow (jinak nedostupne)
 * - channel.cheer (bits)
 * - channel.channel_points_custom_reward_redemption.add
 * - Presnejsi data pro sub/resub/gift
 *
 * Pouziti:
 *   const esub = new TwitchEventSubManager();
 *   esub.setCredentials(clientId, accessToken);
 *   esub.on('alert', (alert) => handleAlert(alert));
 *   await esub.connect(broadcasterId);
 */

class TwitchEventSubManager {
    constructor() {
        this.clientId = null;
        this.accessToken = null;
        this.broadcasterId = null;
        this.ws = null;
        this.sessionId = null;
        this.connected = false;
        this._listeners = { alert: [], connect: [], disconnect: [], error: [] };
        this._keepaliveTimeout = null;
        this._keepaliveTimeoutSeconds = 10;
    }

    // =========================================================================
    // EVENT SYSTEM
    // =========================================================================

    on(event, callback) {
        if (this._listeners[event]) {
            this._listeners[event].push(callback);
        }
    }

    _emit(event, data) {
        (this._listeners[event] || []).forEach(cb => {
            try { cb(data); } catch (e) { console.error('[EventSub] Listener error:', e); }
        });
    }

    // =========================================================================
    // OAUTH
    // =========================================================================

    /**
     * Nastaveni kredencialu (z localStorage nebo z OAuth flow)
     */
    setCredentials(clientId, accessToken) {
        this.clientId = clientId;
        this.accessToken = accessToken;
    }

    /**
     * Zahajeni OAuth Implicit Grant flow
     * Otevre popup pro autorizaci na Twitch
     */
    startOAuth(clientId, redirectUri) {
        this.clientId = clientId;

        const scopes = [
            'channel:read:subscriptions',
            'moderator:read:followers',
            'bits:read',
            'channel:read:redemptions',
        ].join('+');

        const state = Math.random().toString(36).substring(2);
        sessionStorage.setItem('twitch_oauth_state', state);

        const authUrl = 'https://id.twitch.tv/oauth2/authorize'
            + `?response_type=token`
            + `&client_id=${encodeURIComponent(clientId)}`
            + `&redirect_uri=${encodeURIComponent(redirectUri)}`
            + `&scope=${scopes}`
            + `&state=${state}`;

        // Otevrit popup (ne redirect - zachovame hlavni okno)
        const popup = window.open(authUrl, 'twitch-oauth', 'width=500,height=700,menubar=no,toolbar=no');

        return new Promise((resolve, reject) => {
            // Listener pro zpravu z popup okna
            const handler = (event) => {
                if (event.data?.type === 'twitch_oauth_callback') {
                    window.removeEventListener('message', handler);

                    if (event.data.access_token) {
                        this.accessToken = event.data.access_token;
                        // Ulozit token
                        try {
                            localStorage.setItem('adhub_twitch_eventsub', JSON.stringify({
                                clientId: this.clientId,
                                accessToken: this.accessToken,
                                timestamp: Date.now(),
                            }));
                        } catch (e) {}
                        resolve(this.accessToken);
                    } else {
                        reject(new Error(event.data.error || 'OAuth failed'));
                    }
                }
            };

            window.addEventListener('message', handler);

            // Timeout
            setTimeout(() => {
                window.removeEventListener('message', handler);
                reject(new Error('OAuth timeout'));
            }, 120000); // 2 minuty
        });
    }

    /**
     * Nacteni ulozenych kredencialu
     */
    loadSavedCredentials() {
        try {
            const saved = localStorage.getItem('adhub_twitch_eventsub');
            if (saved) {
                const data = JSON.parse(saved);
                // Token platny max 60 dni
                if (data.accessToken && Date.now() - data.timestamp < 60 * 24 * 60 * 60 * 1000) {
                    this.clientId = data.clientId;
                    this.accessToken = data.accessToken;
                    return true;
                }
            }
        } catch (e) {}
        return false;
    }

    /**
     * Validace tokenu
     */
    async validateToken() {
        if (!this.accessToken) return false;

        try {
            const resp = await fetch('https://id.twitch.tv/oauth2/validate', {
                headers: { 'Authorization': `OAuth ${this.accessToken}` },
            });
            if (!resp.ok) {
                this.accessToken = null;
                return false;
            }
            const data = await resp.json();
            this.broadcasterId = data.user_id;
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Odhlaseni - smazani tokenu
     */
    logout() {
        this.accessToken = null;
        this.clientId = null;
        this.broadcasterId = null;
        localStorage.removeItem('adhub_twitch_eventsub');
        this.disconnect();
    }

    // =========================================================================
    // EVENTSUB WEBSOCKET
    // =========================================================================

    /**
     * Pripojeni k EventSub WebSocket
     */
    async connect(broadcasterId) {
        if (!this.accessToken || !this.clientId) {
            throw new Error('Missing credentials. Call setCredentials() or startOAuth() first.');
        }

        this.broadcasterId = broadcasterId || this.broadcasterId;
        if (!this.broadcasterId) {
            // Zkusit ziskat z validace tokenu
            const valid = await this.validateToken();
            if (!valid) throw new Error('Invalid token');
        }

        return new Promise((resolve, reject) => {
            this.ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

            const timeout = setTimeout(() => {
                if (!this.sessionId) {
                    reject(new Error('EventSub welcome timeout'));
                    this.ws.close();
                }
            }, 15000);

            this.ws.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data);
                    await this._handleMessage(data, resolve, reject, timeout);
                } catch (e) {
                    console.error('[EventSub] Parse error:', e);
                }
            };

            this.ws.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('EventSub WebSocket error'));
            };

            this.ws.onclose = () => {
                this._clearKeepalive();
                if (this.connected) {
                    this.connected = false;
                    this._emit('disconnect', {});
                    // Auto-reconnect po 5s
                    setTimeout(() => {
                        if (this.accessToken) {
                            this.connect().catch(e => console.error('[EventSub] Reconnect failed:', e));
                        }
                    }, 5000);
                }
            };
        });
    }

    async _handleMessage(data, resolve, reject, timeout) {
        switch (data.metadata?.message_type) {
            case 'session_welcome':
                this.sessionId = data.payload.session.id;
                this._keepaliveTimeoutSeconds = data.payload.session.keepalive_timeout_seconds || 10;
                clearTimeout(timeout);

                // Registrovat odbery (do 10 sekund!)
                try {
                    await this._registerSubscriptions();
                    this.connected = true;
                    this._resetKeepalive();
                    this._emit('connect', { broadcasterId: this.broadcasterId });
                    resolve();
                } catch (e) {
                    reject(e);
                }
                break;

            case 'session_keepalive':
                this._resetKeepalive();
                break;

            case 'notification':
                this._resetKeepalive();
                this._handleNotification(data);
                break;

            case 'session_reconnect':
                this._handleReconnect(data.payload.session.reconnect_url);
                break;

            case 'revocation':
                console.warn('[EventSub] Subscription revoked:', data.payload.subscription.type);
                break;
        }
    }

    /**
     * Registrace EventSub odberu pres Helix API
     */
    async _registerSubscriptions() {
        const eventTypes = [
            { type: 'channel.follow', version: '2', condition: { broadcaster_user_id: this.broadcasterId, moderator_user_id: this.broadcasterId } },
            { type: 'channel.cheer', version: '1', condition: { broadcaster_user_id: this.broadcasterId } },
            { type: 'channel.subscribe', version: '1', condition: { broadcaster_user_id: this.broadcasterId } },
            { type: 'channel.subscription.gift', version: '1', condition: { broadcaster_user_id: this.broadcasterId } },
            { type: 'channel.subscription.message', version: '1', condition: { broadcaster_user_id: this.broadcasterId } },
            { type: 'channel.raid', version: '1', condition: { to_broadcaster_user_id: this.broadcasterId } },
            { type: 'channel.channel_points_custom_reward_redemption.add', version: '1', condition: { broadcaster_user_id: this.broadcasterId } },
        ];

        let successCount = 0;
        for (const sub of eventTypes) {
            try {
                const resp = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Client-Id': this.clientId,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...sub,
                        transport: {
                            method: 'websocket',
                            session_id: this.sessionId,
                        },
                    }),
                });

                if (resp.ok || resp.status === 409) {
                    // 409 = uz existuje, coz je OK
                    successCount++;
                } else {
                    const err = await resp.text();
                    console.warn(`[EventSub] Failed to subscribe to ${sub.type}:`, resp.status, err);
                }
            } catch (e) {
                console.error(`[EventSub] Error subscribing to ${sub.type}:`, e);
            }
        }

        console.log(`[EventSub] Subscribed to ${successCount}/${eventTypes.length} events`);

        if (successCount === 0) {
            throw new Error('Failed to subscribe to any events');
        }
    }

    /**
     * Zpracovani EventSub notifikace
     */
    _handleNotification(data) {
        const eventType = data.metadata.subscription_type;
        const event = data.payload.event;

        const alert = this._normalizeEvent(eventType, event);
        if (alert) {
            this._emit('alert', alert);
        }
    }

    /**
     * Normalizace EventSub eventu na NormalizedAlert format
     */
    _normalizeEvent(eventType, event) {
        const base = {
            id: `twitch-es-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            platform: 'twitch',
            channel: event.broadcaster_user_login || '',
            type: 'alert',
            timestamp: new Date(),
            raw: event,
        };

        switch (eventType) {
            case 'channel.follow':
                return {
                    ...base,
                    alertType: 'follow',
                    author: {
                        id: event.user_id,
                        username: event.user_login,
                        displayName: event.user_name,
                        color: '#ff4444',
                        badges: [], roles: {},
                    },
                    content: `${event.user_name} is now following!`,
                    alertData: {
                        followedAt: new Date(event.followed_at),
                    },
                };

            case 'channel.cheer':
                return {
                    ...base,
                    alertType: 'cheer',
                    author: {
                        id: event.user_id || '',
                        username: event.user_login || 'Anonymous',
                        displayName: event.user_name || 'Anonymous',
                        color: '#ffd700',
                        badges: [], roles: {},
                    },
                    content: `${event.user_name || 'Anonymous'} cheered ${event.bits} bits!`,
                    alertData: {
                        amount: event.bits,
                        currency: 'bits',
                        donateMessage: event.message || '',
                    },
                };

            case 'channel.subscribe':
                return {
                    ...base,
                    alertType: event.is_gift ? 'gift_sub_received' : 'subscribe',
                    author: {
                        id: event.user_id,
                        username: event.user_login,
                        displayName: event.user_name,
                        color: '#8a2be2',
                        badges: [], roles: {},
                    },
                    content: event.is_gift
                        ? `${event.user_name} received a gift sub!`
                        : `${event.user_name} subscribed (Tier ${this._tierName(event.tier)})!`,
                    alertData: {
                        tier: event.tier,
                        isGift: event.is_gift,
                    },
                };

            case 'channel.subscription.gift':
                return {
                    ...base,
                    alertType: 'gift_sub',
                    author: {
                        id: event.user_id || '',
                        username: event.user_login || 'Anonymous',
                        displayName: event.user_name || 'Anonymous',
                        color: '#ff69b4',
                        badges: [], roles: {},
                    },
                    content: `${event.user_name || 'Anonymous'} gifted ${event.total} subs (Tier ${this._tierName(event.tier)})!`,
                    alertData: {
                        tier: event.tier,
                        isGift: true,
                        gifterName: event.user_name || 'Anonymous',
                        giftCount: event.total,
                    },
                };

            case 'channel.subscription.message':
                return {
                    ...base,
                    alertType: 'resubscribe',
                    author: {
                        id: event.user_id,
                        username: event.user_login,
                        displayName: event.user_name,
                        color: '#8a2be2',
                        badges: [], roles: {},
                    },
                    content: `${event.user_name} resubscribed for ${event.cumulative_months} months (Tier ${this._tierName(event.tier)})!`,
                    alertData: {
                        tier: event.tier,
                        months: event.cumulative_months,
                        streak: event.streak_months || 0,
                        message: event.message?.text || '',
                        isGift: false,
                    },
                };

            case 'channel.raid':
                return {
                    ...base,
                    alertType: 'raid',
                    author: {
                        id: event.from_broadcaster_user_id,
                        username: event.from_broadcaster_user_login,
                        displayName: event.from_broadcaster_user_name,
                        color: '#00bfff',
                        badges: [], roles: {},
                    },
                    content: `${event.from_broadcaster_user_name} is raiding with ${event.viewers} viewers!`,
                    alertData: {
                        viewers: event.viewers,
                        fromChannel: event.from_broadcaster_user_name,
                    },
                };

            case 'channel.channel_points_custom_reward_redemption.add':
                return {
                    ...base,
                    alertType: 'channel_points',
                    author: {
                        id: event.user_id,
                        username: event.user_login,
                        displayName: event.user_name,
                        color: '#00ff7f',
                        badges: [], roles: {},
                    },
                    content: `${event.user_name} redeemed "${event.reward.title}" (${event.reward.cost} pts)`,
                    alertData: {
                        rewardTitle: event.reward.title,
                        rewardCost: event.reward.cost,
                        userInput: event.user_input || '',
                    },
                };

            default:
                return null;
        }
    }

    _tierName(tier) {
        const tiers = { '1000': '1', '2000': '2', '3000': '3' };
        return tiers[tier] || tier;
    }

    // =========================================================================
    // KEEPALIVE & RECONNECT
    // =========================================================================

    _resetKeepalive() {
        this._clearKeepalive();
        // Pokud nedostaneme zpravu do keepalive_timeout + buffer, odpojit
        this._keepaliveTimeout = setTimeout(() => {
            console.warn('[EventSub] Keepalive timeout, reconnecting...');
            if (this.ws) this.ws.close();
        }, (this._keepaliveTimeoutSeconds + 5) * 1000);
    }

    _clearKeepalive() {
        if (this._keepaliveTimeout) {
            clearTimeout(this._keepaliveTimeout);
            this._keepaliveTimeout = null;
        }
    }

    _handleReconnect(newUrl) {
        console.log('[EventSub] Reconnecting to new URL');
        const oldWs = this.ws;
        const newWs = new WebSocket(newUrl);

        newWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.metadata?.message_type === 'session_welcome') {
                    this.sessionId = data.payload.session.id;
                    this.ws = newWs;
                    this._setupNewWs(newWs);
                    // Zavrít staré spojení
                    oldWs.close();
                }
            } catch (e) {}
        };
    }

    _setupNewWs(ws) {
        ws.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                await this._handleMessage(data, () => {}, () => {}, null);
            } catch (e) {}
        };
        ws.onclose = this.ws?.onclose;
    }

    disconnect() {
        this._clearKeepalive();
        this.connected = false;
        this.sessionId = null;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// Export
window.TwitchEventSubManager = TwitchEventSubManager;
