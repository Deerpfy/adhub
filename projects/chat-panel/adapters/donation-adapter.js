/**
 * AdHub Multistream Chat v2
 * Donation Adapter - Streamlabs & StreamElements donace
 *
 * DULEZITE: Tento adapter je VOLITELNY.
 * Vyzaduje Socket API token od Streamlabs nebo StreamElements.
 * Token si uzivatel ziska ve svem uctu na prislusne sluzbe.
 *
 * Podporovane sluzby:
 * - Streamlabs: Pouziva Socket.IO (v2) pro real-time donace
 * - StreamElements: Pouziva WebSocket pro real-time donace (tips, cheers, subs)
 *
 * Pouziti:
 *   const dm = new DonationManager();
 *   dm.on('alert', (alert) => handleAlert(alert));
 *   dm.connectStreamlabs('socket_api_token_here');
 *   dm.connectStreamElements('jwt_token_here');
 */

class DonationManager {
    constructor() {
        this._listeners = { alert: [], connect: [], disconnect: [], error: [] };
        this._streamlabsWs = null;
        this._streamelementsWs = null;
        this._streamlabsConnected = false;
        this._streamelementsConnected = false;
        this._streamlabsReconnectTimer = null;
        this._streamlabsPingInterval = null;
        this._streamelementsReconnectTimer = null;
        this._streamlabsToken = null;
        this._streamelementsToken = null;
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
            try { cb(data); } catch (e) { console.error('[Donations] Listener error:', e); }
        });
    }

    // =========================================================================
    // STREAMLABS
    // =========================================================================

    /**
     * Pripojeni k Streamlabs Socket API
     * Token: Nastaveni -> API Settings -> Socket API Token (na streamlabs.com)
     *
     * Streamlabs pouziva Socket.IO (Engine.IO v3) protokol.
     * Pripojujeme primo pres WebSocket (bez HTTP polling handshake,
     * ktery neni mozny z browseru kvuli CORS). Handshake probiha
     * jako prvni zprava ("0{...}") po WebSocket otevreni.
     */
    connectStreamlabs(token) {
        this._streamlabsToken = token;

        // Primo WebSocket — token v URL query, EIO=3 = Engine.IO v3
        const wsUrl = `wss://sockets.streamlabs.com/socket.io/?EIO=3&transport=websocket&token=${encodeURIComponent(token)}`;
        this._streamlabsWs = new WebSocket(wsUrl);

        this._streamlabsWs.onopen = () => {
            console.log('[Streamlabs] WebSocket opened, waiting for handshake...');
        };

        this._streamlabsWs.onmessage = (event) => {
            this._handleStreamlabsMessage(event.data);
        };

        this._streamlabsWs.onerror = () => {
            this._emit('error', { service: 'streamlabs', message: 'WebSocket error' });
        };

        this._streamlabsWs.onclose = () => {
            this._streamlabsConnected = false;
            this._emit('disconnect', { service: 'streamlabs' });
            // Auto-reconnect po 10s
            this._streamlabsReconnectTimer = setTimeout(() => {
                if (this._streamlabsToken) {
                    this.connectStreamlabs(this._streamlabsToken);
                }
            }, 10000);
        };
    }

    _handleStreamlabsMessage(raw) {
        // Engine.IO v3 protocol over WebSocket:
        // "0{...}" = handshake (sid, pingInterval, pingTimeout)
        // "2" = ping from server
        // "3" = pong response
        // "40" = Socket.IO connect (namespace /)
        // "42[event, data]" = event message

        // Handshake — server sends session config
        if (raw.startsWith('0')) {
            try {
                const data = JSON.parse(raw.substring(1));
                console.log('[Streamlabs] Handshake OK, sid:', data.sid);
                // Set up ping interval based on server config
                if (data.pingInterval) {
                    this._streamlabsPingInterval = setInterval(() => {
                        if (this._streamlabsWs?.readyState === WebSocket.OPEN) {
                            this._streamlabsWs.send('2');
                        }
                    }, data.pingInterval);
                }
            } catch (e) {}
            return;
        }

        // Socket.IO connect ack on namespace /
        if (raw === '40') {
            this._streamlabsConnected = true;
            this._emit('connect', { service: 'streamlabs' });
            console.log('[Streamlabs] Connected via Socket.IO');
            return;
        }

        // Ping from server -> pong
        if (raw === '2') {
            this._streamlabsWs.send('3');
            return;
        }

        // Pong ack (response to our ping)
        if (raw === '3') {
            return;
        }

        if (!raw.startsWith('42')) return;

        try {
            const jsonStr = raw.substring(2);
            const [eventName, eventData] = JSON.parse(jsonStr);

            if (eventName === 'event') {
                this._handleStreamlabsEvent(eventData);
            }
        } catch (e) {
            // Not a parseable message
        }
    }

    _handleStreamlabsEvent(eventData) {
        const type = eventData.type;
        const messages = eventData.message || [];

        if (!Array.isArray(messages)) return;

        for (const msg of messages) {
            let alert = null;

            switch (type) {
                case 'donation':
                    alert = this._createDonationAlert(msg, 'streamlabs');
                    break;
                case 'subscription':
                    alert = this._createSubAlert(msg, 'streamlabs');
                    break;
                case 'follow':
                    alert = this._createFollowAlert(msg, 'streamlabs');
                    break;
                case 'bits':
                case 'cheer':
                    alert = this._createCheerAlert(msg, 'streamlabs');
                    break;
                case 'raid':
                    alert = this._createRaidAlert(msg, 'streamlabs');
                    break;
            }

            if (alert) {
                this._emit('alert', alert);
            }
        }
    }

    disconnectStreamlabs() {
        this._streamlabsToken = null;
        this._streamlabsConnected = false;
        if (this._streamlabsReconnectTimer) {
            clearTimeout(this._streamlabsReconnectTimer);
            this._streamlabsReconnectTimer = null;
        }
        if (this._streamlabsPingInterval) {
            clearInterval(this._streamlabsPingInterval);
            this._streamlabsPingInterval = null;
        }
        if (this._streamlabsWs) {
            this._streamlabsWs.close();
            this._streamlabsWs = null;
        }
    }

    // =========================================================================
    // STREAMELEMENTS
    // =========================================================================

    /**
     * Pripojeni k StreamElements WebSocket
     * Token: Profil -> Channels -> Show Secrets -> JWT Token
     */
    connectStreamElements(token) {
        this._streamelementsToken = token;

        this._streamelementsWs = new WebSocket('wss://realtime.streamelements.com/socket.io/?EIO=3&transport=websocket');

        this._streamelementsWs.onopen = () => {
            console.log('[StreamElements] WebSocket opened, waiting for handshake...');
        };

        this._streamelementsWs.onmessage = (event) => {
            this._handleStreamElementsMessage(event.data, token);
        };

        this._streamelementsWs.onerror = () => {
            this._emit('error', { service: 'streamelements', message: 'WebSocket error' });
        };

        this._streamelementsWs.onclose = () => {
            this._streamelementsConnected = false;
            this._emit('disconnect', { service: 'streamelements' });
            // Auto-reconnect po 10s
            this._streamelementsReconnectTimer = setTimeout(() => {
                if (this._streamelementsToken) {
                    this.connectStreamElements(this._streamelementsToken);
                }
            }, 10000);
        };
    }

    _handleStreamElementsMessage(raw, token) {
        // Socket.IO handshake
        if (raw.startsWith('0')) {
            try {
                const data = JSON.parse(raw.substring(1));
                // Po handshaku se autentizovat
                this._streamelementsWs.send(`42["authenticate",{"method":"jwt","token":"${token}"}]`);
            } catch (e) {}
            return;
        }

        if (raw === '2') {
            // Ping -> pong
            this._streamelementsWs.send('3');
            return;
        }

        if (!raw.startsWith('42')) return;

        try {
            const jsonStr = raw.substring(2);
            const parsed = JSON.parse(jsonStr);
            const [eventName, eventData] = parsed;

            if (eventName === 'authenticated') {
                this._streamelementsConnected = true;
                this._emit('connect', { service: 'streamelements' });
                console.log('[StreamElements] Authenticated successfully');
                return;
            }

            if (eventName === 'event') {
                this._handleStreamElementsEvent(eventData);
            }
        } catch (e) {}
    }

    _handleStreamElementsEvent(eventData) {
        const type = eventData.type;
        const data = eventData.data || eventData;
        let alert = null;

        switch (type) {
            case 'tip':
                alert = this._createDonationAlert(data, 'streamelements');
                break;
            case 'subscriber':
                alert = this._createSubAlert(data, 'streamelements');
                break;
            case 'follow':
                alert = this._createFollowAlert(data, 'streamelements');
                break;
            case 'cheer':
                alert = this._createCheerAlert(data, 'streamelements');
                break;
            case 'raid':
                alert = this._createRaidAlert(data, 'streamelements');
                break;
        }

        if (alert) {
            this._emit('alert', alert);
        }
    }

    disconnectStreamElements() {
        this._streamelementsToken = null;
        this._streamelementsConnected = false;
        if (this._streamelementsReconnectTimer) {
            clearTimeout(this._streamelementsReconnectTimer);
            this._streamelementsReconnectTimer = null;
        }
        if (this._streamelementsWs) {
            this._streamelementsWs.close();
            this._streamelementsWs = null;
        }
    }

    // =========================================================================
    // ALERT NORMALIZATION
    // =========================================================================

    _createBaseAlert(service) {
        return {
            id: `${service}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            platform: service,
            channel: service,
            type: 'alert',
            timestamp: new Date(),
        };
    }

    _createDonationAlert(msg, service) {
        const name = msg.name || msg.username || msg.from || 'Anonymous';
        const amount = parseFloat(msg.amount || msg.formattedAmount || 0);
        const currency = msg.currency || 'USD';
        const message = msg.message || msg.comment || '';

        return {
            ...this._createBaseAlert(service),
            alertType: 'donation',
            author: {
                id: name.toLowerCase(),
                username: name.toLowerCase(),
                displayName: name,
                color: '#ffd700',
                badges: [],
                roles: {},
            },
            content: `${name} donated ${amount} ${currency}!`,
            alertData: {
                amount,
                currency,
                formattedAmount: msg.formattedAmount || `${amount} ${currency}`,
                donateMessage: message,
            },
            raw: msg,
        };
    }

    _createSubAlert(msg, service) {
        const name = msg.name || msg.username || msg.displayName || 'Someone';
        const months = msg.months || msg.amount || 1;
        const tier = msg.tier || msg.sub_plan || '1000';
        const gifter = msg.gifter || msg.gifterDisplayName || null;

        const alertType = gifter ? 'gift_sub' : (months > 1 ? 'resubscribe' : 'subscribe');
        let content;
        if (gifter) {
            content = `${gifter} gifted a sub to ${name}!`;
        } else if (months > 1) {
            content = `${name} resubscribed for ${months} months!`;
        } else {
            content = `${name} subscribed!`;
        }

        return {
            ...this._createBaseAlert(service),
            alertType,
            author: {
                id: name.toLowerCase(),
                username: name.toLowerCase(),
                displayName: name,
                color: '#8a2be2',
                badges: [],
                roles: {},
            },
            content,
            alertData: {
                tier,
                months,
                isGift: !!gifter,
                gifterName: gifter,
                message: msg.message || '',
            },
            raw: msg,
        };
    }

    _createFollowAlert(msg, service) {
        const name = msg.name || msg.username || msg.displayName || 'Someone';

        return {
            ...this._createBaseAlert(service),
            alertType: 'follow',
            author: {
                id: name.toLowerCase(),
                username: name.toLowerCase(),
                displayName: name,
                color: '#ff4444',
                badges: [],
                roles: {},
            },
            content: `${name} is now following!`,
            alertData: {},
            raw: msg,
        };
    }

    _createCheerAlert(msg, service) {
        const name = msg.name || msg.username || msg.displayName || 'Anonymous';
        const bits = parseInt(msg.amount || msg.bits || 0);

        return {
            ...this._createBaseAlert(service),
            alertType: 'cheer',
            author: {
                id: name.toLowerCase(),
                username: name.toLowerCase(),
                displayName: name,
                color: '#ffd700',
                badges: [],
                roles: {},
            },
            content: `${name} cheered ${bits} bits!`,
            alertData: {
                amount: bits,
                currency: 'bits',
                donateMessage: msg.message || '',
            },
            raw: msg,
        };
    }

    _createRaidAlert(msg, service) {
        const name = msg.name || msg.username || msg.displayName || 'Someone';
        const viewers = parseInt(msg.viewers || msg.amount || 0);

        return {
            ...this._createBaseAlert(service),
            alertType: 'raid',
            author: {
                id: name.toLowerCase(),
                username: name.toLowerCase(),
                displayName: name,
                color: '#00bfff',
                badges: [],
                roles: {},
            },
            content: `${name} is raiding with ${viewers} viewers!`,
            alertData: {
                viewers,
                fromChannel: name,
            },
            raw: msg,
        };
    }

    // =========================================================================
    // STATUS
    // =========================================================================

    get streamlabsConnected() { return this._streamlabsConnected; }
    get streamelementsConnected() { return this._streamelementsConnected; }

    disconnectAll() {
        this.disconnectStreamlabs();
        this.disconnectStreamElements();
    }
}

// Export
window.DonationManager = DonationManager;
