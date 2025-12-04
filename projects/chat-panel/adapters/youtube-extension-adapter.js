/**
 * YouTube Extension Adapter
 *
 * Adapter pro YouTube chat pres browser extension.
 * Extension otevre YouTube chat na pozadi a posila zpravy.
 */

class YouTubeExtensionAdapter extends BaseAdapter {
    static EXTENSION_CHECK_TIMEOUT = 3000;

    constructor(options) {
        super('youtube-extension', options);

        this.videoId = this._extractVideoId(options.channel);
        this.channelName = options.channelName || options.channel;
        this.requestCounter = 0;
        this.pendingRequests = new Map();

        // Bind event handlers
        this._handleMessage = this._handleMessage.bind(this);
        this._handleConnected = this._handleConnected.bind(this);
        this._handleDisconnected = this._handleDisconnected.bind(this);

        console.log('[YouTubeExtensionAdapter] Created for:', this.videoId);
    }

    // =========================================================================
    // STATIC METHODS - Extension detection
    // =========================================================================

    /**
     * Zkontroluje zda je extension nainstalovana a aktivni
     */
    static async checkExtension() {
        return new Promise((resolve) => {
            // Nejprve zkontroluj localStorage s aktualnim timestamp
            const timestamp = localStorage.getItem('adhub_chat_reader_timestamp');
            const now = Date.now();
            const maxAge = 60 * 1000; // 60 sekund

            if (timestamp && (now - parseInt(timestamp, 10)) < maxAge) {
                const active = localStorage.getItem('adhub_chat_reader_active');
                const version = localStorage.getItem('adhub_chat_reader_version');

                if (active === 'true' && version) {
                    console.log('[YouTubeExtensionAdapter] Extension detected from localStorage');
                    resolve({ available: true, version });
                    return;
                }
            }

            // Zkus event-based detekci
            const timeout = setTimeout(() => {
                window.removeEventListener('adhub-chat-reader-ready', readyHandler);
                window.removeEventListener('adhub-chat-reader-response', responseHandler);
                resolve({ available: false, version: null });
            }, this.EXTENSION_CHECK_TIMEOUT);

            const readyHandler = (event) => {
                clearTimeout(timeout);
                window.removeEventListener('adhub-chat-reader-ready', readyHandler);
                window.removeEventListener('adhub-chat-reader-response', responseHandler);
                resolve({
                    available: true,
                    version: event.detail?.version || null,
                });
            };

            const responseHandler = (event) => {
                if (!event.detail?.requestId) {
                    clearTimeout(timeout);
                    window.removeEventListener('adhub-chat-reader-ready', readyHandler);
                    window.removeEventListener('adhub-chat-reader-response', responseHandler);
                    resolve({
                        available: true,
                        version: event.detail?.version || null,
                    });
                }
            };

            window.addEventListener('adhub-chat-reader-ready', readyHandler);
            window.addEventListener('adhub-chat-reader-response', responseHandler);

            // Pozadej extension o odpoved
            window.dispatchEvent(new CustomEvent('adhub-chat-reader-check'));
        });
    }

    /**
     * Vymaze stare localStorage signaly
     */
    static clearStaleSignals() {
        const timestamp = localStorage.getItem('adhub_chat_reader_timestamp');
        const now = Date.now();
        const maxAge = 60 * 1000;

        if (timestamp) {
            const age = now - parseInt(timestamp, 10);
            if (age > maxAge) {
                localStorage.removeItem('adhub_chat_reader_active');
                localStorage.removeItem('adhub_chat_reader_version');
                localStorage.removeItem('adhub_chat_reader_timestamp');
            }
        } else {
            localStorage.removeItem('adhub_chat_reader_active');
            localStorage.removeItem('adhub_chat_reader_version');
        }
    }

    /**
     * Ziska verzi extension
     */
    static getVersion() {
        return localStorage.getItem('adhub_chat_reader_version');
    }

    // =========================================================================
    // INSTANCE METHODS
    // =========================================================================

    async connect() {
        this._setState('connecting');
        console.log('[YouTubeExtensionAdapter] Connecting to:', this.videoId);

        // Zkontroluj extension
        const extensionStatus = await YouTubeExtensionAdapter.checkExtension();

        if (!extensionStatus.available) {
            this.emit('error', { message: 'YouTube Chat Reader extension neni nainstalovana', code: 'EXTENSION_NOT_FOUND' });
            return;
        }

        // Nastav event listenery
        window.addEventListener('adhub-youtube-chat-message', this._handleMessage);
        window.addEventListener('adhub-youtube-chat-connected', this._handleConnected);
        window.addEventListener('adhub-youtube-chat-disconnected', this._handleDisconnected);

        // Otevri YouTube chat
        try {
            const response = await this._sendCommand('openYouTubeChat', {
                videoId: this.videoId,
                channelName: this.channelName,
            });

            if (response.success) {
                console.log('[YouTubeExtensionAdapter] Chat opened successfully');
                // Connected event prijde z extension
            } else {
                throw new Error(response.error || 'Failed to open chat');
            }
        } catch (error) {
            this.emit('error', { message: error.message, code: 'CONNECTION_ERROR' });
        }
    }

    disconnect() {
        console.log('[YouTubeExtensionAdapter] Disconnecting');

        // Odstran event listenery
        window.removeEventListener('adhub-youtube-chat-message', this._handleMessage);
        window.removeEventListener('adhub-youtube-chat-connected', this._handleConnected);
        window.removeEventListener('adhub-youtube-chat-disconnected', this._handleDisconnected);

        // Zavri chat
        this._sendCommand('closeYouTubeChat', {
            videoId: this.videoId,
        }).catch(() => {});

        this._setState('disconnected');
        this.emit('disconnect');
    }

    // =========================================================================
    // PRIVATE METHODS
    // =========================================================================

    _extractVideoId(input) {
        if (!input) return null;

        // Uz je to video ID
        if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
            return input;
        }

        // URL
        try {
            const url = new URL(input.includes('://') ? input : `https://${input}`);

            // youtube.com/watch?v=ID
            if (url.searchParams.has('v')) {
                return url.searchParams.get('v');
            }

            // youtube.com/live/ID
            const liveMatch = url.pathname.match(/\/live\/([a-zA-Z0-9_-]+)/);
            if (liveMatch) {
                return liveMatch[1];
            }

            // youtu.be/ID
            if (url.hostname === 'youtu.be') {
                return url.pathname.slice(1);
            }
        } catch (e) {}

        // Vrat jako je
        return input;
    }

    _handleMessage(event) {
        const message = event.detail;

        if (!message || message.videoId !== this.videoId) {
            return;
        }

        // Konvertuj do standardniho formatu
        const standardMessage = {
            id: message.id,
            platform: 'youtube-extension',
            channel: this.videoId,
            author: message.author,
            content: message.content,
            emotes: message.emotes,
            timestamp: new Date(message.timestamp),
        };

        this.emit('message', standardMessage);
    }

    _handleConnected(event) {
        if (event.detail?.videoId === this.videoId) {
            const channelName = event.detail?.channelName;
            if (channelName) {
                this.channelName = channelName;
            }
            this._setState('connected');
            this.emit('connect', { channelName: channelName || null });
        }
    }

    _handleDisconnected(event) {
        if (event.detail?.videoId === this.videoId) {
            this._setState('disconnected');
            this.emit('disconnect');
        }
    }

    _sendCommand(action, data) {
        return new Promise((resolve, reject) => {
            const requestId = `req-${++this.requestCounter}-${Date.now()}`;

            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error('Command timeout'));
            }, 10000);

            const handler = (event) => {
                if (event.detail?.requestId === requestId) {
                    clearTimeout(timeout);
                    this.pendingRequests.delete(requestId);
                    window.removeEventListener('adhub-chat-reader-response', handler);

                    if (event.detail.success) {
                        resolve(event.detail.data || {});
                    } else {
                        reject(new Error(event.detail.error || 'Unknown error'));
                    }
                }
            };

            this.pendingRequests.set(requestId, { handler, timeout });
            window.addEventListener('adhub-chat-reader-response', handler);

            window.dispatchEvent(new CustomEvent('adhub-chat-reader-command', {
                detail: { action, data, requestId },
            }));
        });
    }
}

// Export pro pouziti v prohlizeci
if (typeof window !== 'undefined') {
    window.YouTubeExtensionAdapter = YouTubeExtensionAdapter;
}
