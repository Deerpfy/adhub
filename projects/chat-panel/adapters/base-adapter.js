/**
 * AdHub Multistream Chat v2
 * Base Adapter - Základ pro všechny platformové adaptery
 *
 * Tento adaptér definuje společné rozhraní pro komunikaci s chat platformami.
 * Všechny platformové adaptery (Twitch, Kick, YouTube) dědí z této třídy.
 */

class BaseAdapter {
    /**
     * @param {Object} config - Konfigurace adapteru
     * @param {string} config.channel - Název kanálu
     * @param {string} config.platform - Identifikátor platformy
     */
    constructor(config) {
        this.config = config;
        this.channel = config.channel;
        this.platform = config.platform;
        this.connectionId = `${config.platform}-${config.channel}-${Date.now()}`;

        // Stav připojení
        this.state = {
            connected: false,
            connecting: false,
            error: null,
            reconnectAttempts: 0,
            maxReconnectAttempts: 5,
            reconnectDelay: 1000, // ms
        };

        // Event listeners
        this._listeners = {
            message: [],
            connect: [],
            disconnect: [],
            error: [],
            stateChange: [],
        };

        // Reconnect timer
        this._reconnectTimer = null;
    }

    /**
     * Připojení k chat platformě
     * @returns {Promise<void>}
     */
    async connect() {
        throw new Error('connect() must be implemented by subclass');
    }

    /**
     * Odpojení od chat platformy
     * @returns {Promise<void>}
     */
    async disconnect() {
        this._clearReconnectTimer();
        this._setState({ connected: false, connecting: false });
    }

    /**
     * Odeslání zprávy do chatu (pokud je podporováno)
     * @param {string} content - Obsah zprávy
     * @returns {Promise<void>}
     */
    async send(content) {
        throw new Error('send() not supported by this adapter');
    }

    /**
     * Registrace event listeneru
     * @param {string} event - Název eventu (message, connect, disconnect, error, stateChange)
     * @param {Function} callback - Callback funkce
     */
    on(event, callback) {
        if (this._listeners[event]) {
            this._listeners[event].push(callback);
        }
    }

    /**
     * Odstranění event listeneru
     * @param {string} event - Název eventu
     * @param {Function} callback - Callback funkce
     */
    off(event, callback) {
        if (this._listeners[event]) {
            this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
        }
    }

    /**
     * Emitování eventu
     * @param {string} event - Název eventu
     * @param {*} data - Data k předání
     */
    emit(event, data) {
        if (this._listeners[event]) {
            this._listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} listener:`, error);
                }
            });
        }
    }

    /**
     * Nastavení stavu a emitování změny
     * @param {Object} newState - Nový stav
     */
    _setState(newState) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        this.emit('stateChange', { oldState, newState: this.state });
    }

    /**
     * Normalizace zprávy do společného formátu
     * @param {Object} rawMessage - Surová zpráva z platformy
     * @returns {NormalizedMessage}
     */
    normalizeMessage(rawMessage) {
        throw new Error('normalizeMessage() must be implemented by subclass');
    }

    /**
     * Pokus o reconnect
     */
    async _attemptReconnect() {
        if (this.state.reconnectAttempts >= this.state.maxReconnectAttempts) {
            this._setState({ error: 'Max reconnect attempts reached' });
            this.emit('error', { message: 'Max reconnect attempts reached', code: 'MAX_RECONNECT' });
            return;
        }

        this._setState({ reconnectAttempts: this.state.reconnectAttempts + 1 });

        const delay = this.state.reconnectDelay * Math.pow(2, this.state.reconnectAttempts - 1);
        console.log(`[${this.platform}] Reconnecting in ${delay}ms (attempt ${this.state.reconnectAttempts})`);

        this._reconnectTimer = setTimeout(async () => {
            try {
                await this.connect();
            } catch (error) {
                console.error(`[${this.platform}] Reconnect failed:`, error);
                this._attemptReconnect();
            }
        }, delay);
    }

    /**
     * Zrušení reconnect timeru
     */
    _clearReconnectTimer() {
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }
    }

    /**
     * Získání info o adapteru
     * @returns {Object}
     */
    getInfo() {
        return {
            platform: this.platform,
            channel: this.channel,
            connectionId: this.connectionId,
            state: this.state,
        };
    }
}

/**
 * Normalizovaný formát zprávy
 * @typedef {Object} NormalizedMessage
 * @property {string} id - Unikátní ID zprávy
 * @property {string} platform - Platforma (twitch, kick, youtube)
 * @property {string} channel - Kanál
 * @property {Object} author - Informace o autorovi
 * @property {string} author.id - ID autora
 * @property {string} author.username - Uživatelské jméno
 * @property {string} author.displayName - Zobrazované jméno
 * @property {string} author.color - Barva jména (#RRGGBB)
 * @property {Array<Badge>} author.badges - Badge uživatele
 * @property {Object} author.roles - Role uživatele
 * @property {boolean} author.roles.broadcaster - Je broadcaster
 * @property {boolean} author.roles.moderator - Je moderátor
 * @property {boolean} author.roles.vip - Je VIP
 * @property {boolean} author.roles.subscriber - Je subscriber
 * @property {string} content - Textový obsah zprávy
 * @property {Array<Emote>} emotes - Emotes ve zprávě
 * @property {Date} timestamp - Časové razítko
 * @property {Object} raw - Původní data z platformy
 */

/**
 * Badge uživatele
 * @typedef {Object} Badge
 * @property {string} type - Typ badge (broadcaster, moderator, subscriber, vip, etc.)
 * @property {string} id - ID badge
 * @property {string} url - URL obrázku badge
 * @property {string} title - Název badge
 */

/**
 * Emote ve zprávě
 * @typedef {Object} Emote
 * @property {string} id - ID emote
 * @property {string} name - Název emote
 * @property {string} url - URL obrázku emote
 * @property {number} start - Začátek pozice v textu
 * @property {number} end - Konec pozice v textu
 */

// Export pro globální použití
window.BaseAdapter = BaseAdapter;
