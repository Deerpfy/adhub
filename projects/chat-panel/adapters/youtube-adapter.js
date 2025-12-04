/**
 * AdHub Multistream Chat v2
 * YouTube Adapter - YouTube Data API v3
 *
 * Používá YouTube Data API pro polling živého chatu.
 * Vyžaduje API klíč od uživatele.
 *
 * Poznámka: YouTube neposkytuje WebSocket pro chat,
 * proto používáme polling s dynamickým intervalem.
 */

class YouTubeAdapter extends BaseAdapter {
    constructor(config) {
        super({
            ...config,
            platform: 'youtube',
        });

        // API konfigurace
        this.apiKey = config.apiKey || '';
        this.videoId = config.channel; // videoId je uložen jako "channel"

        // Live chat info
        this.liveChatId = null;
        this.videoInfo = null;

        // Polling
        this.pollingTimer = null;
        this.pollingInterval = 2000; // ms
        this.nextPageToken = null;

        // Rate limiting
        this.quotaUsed = 0;
        this.maxQuotaPerMinute = 100;
    }

    /**
     * Připojení k YouTube Live Chat
     */
    async connect() {
        if (this.state.connected || this.state.connecting) {
            return;
        }

        if (!this.apiKey) {
            this._setState({ error: 'API klíč není nastaven' });
            this.emit('error', { message: 'YouTube API klíč není nastaven', code: 'NO_API_KEY' });
            return;
        }

        this._setState({ connecting: true, error: null });
        this.emit('stateChange', { state: 'connecting' });

        try {
            // Získat info o videu a live chat ID
            await this._loadVideoInfo();

            if (!this.liveChatId) {
                throw new Error('Video nemá aktivní live chat');
            }

            // Spustit polling
            this._startPolling();

            this._setState({
                connected: true,
                connecting: false,
                reconnectAttempts: 0,
            });

            this.emit('connect', { channel: this.videoId });

        } catch (error) {
            console.error('[YouTube] Connection error:', error);
            this._setState({ connecting: false, error: error.message });
            this.emit('error', { message: error.message, code: 'CONNECTION_ERROR' });
        }
    }

    /**
     * Odpojení od YouTube Live Chat
     */
    async disconnect() {
        this._stopPolling();
        await super.disconnect();
        this.emit('disconnect', { channel: this.videoId });
    }

    /**
     * Načtení info o videu
     */
    async _loadVideoInfo() {
        const url = new URL('https://www.googleapis.com/youtube/v3/videos');
        url.searchParams.set('part', 'snippet,liveStreamingDetails');
        url.searchParams.set('id', this.videoId);
        url.searchParams.set('key', this.apiKey);

        const response = await fetch(url.toString());

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            throw new Error('Video nebylo nalezeno');
        }

        const video = data.items[0];
        this.videoInfo = {
            id: video.id,
            title: video.snippet?.title || 'Unknown',
            channelId: video.snippet?.channelId,
            channelTitle: video.snippet?.channelTitle || 'Unknown',
            thumbnail: video.snippet?.thumbnails?.default?.url,
        };

        this.liveChatId = video.liveStreamingDetails?.activeLiveChatId;

        if (!this.liveChatId) {
            // Zkusit alternativní způsob - video může být živé, ale bez activeLiveChatId
            throw new Error('Video nemá aktivní live chat. Ujistěte se, že stream je živý.');
        }

        console.log(`[YouTube] Video info loaded: ${this.videoInfo.title}`);
        console.log(`[YouTube] Live chat ID: ${this.liveChatId}`);
    }

    /**
     * Spuštění pollingu
     */
    _startPolling() {
        this._stopPolling();

        const poll = async () => {
            try {
                await this._fetchMessages();
            } catch (error) {
                console.error('[YouTube] Polling error:', error);

                // Pokud je quota překročena, zpomalit
                if (error.message.includes('quota')) {
                    this.pollingInterval = Math.min(this.pollingInterval * 2, 10000);
                    console.warn(`[YouTube] Quota limit, slowing down to ${this.pollingInterval}ms`);
                }
            }

            // Naplánovat další poll
            if (this.state.connected) {
                this.pollingTimer = setTimeout(poll, this.pollingInterval);
            }
        };

        poll();
    }

    /**
     * Zastavení pollingu
     */
    _stopPolling() {
        if (this.pollingTimer) {
            clearTimeout(this.pollingTimer);
            this.pollingTimer = null;
        }
    }

    /**
     * Načtení zpráv z live chatu
     */
    async _fetchMessages() {
        const url = new URL('https://www.googleapis.com/youtube/v3/liveChat/messages');
        url.searchParams.set('part', 'snippet,authorDetails');
        url.searchParams.set('liveChatId', this.liveChatId);
        url.searchParams.set('maxResults', '200');
        url.searchParams.set('key', this.apiKey);

        if (this.nextPageToken) {
            url.searchParams.set('pageToken', this.nextPageToken);
        }

        const response = await fetch(url.toString());

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            const message = error.error?.message || `HTTP ${response.status}`;

            // Kontrola specifických chyb
            if (response.status === 403) {
                if (message.includes('liveChatEnded')) {
                    this._setState({ connected: false, error: 'Live chat byl ukončen' });
                    this.emit('disconnect', { channel: this.videoId, reason: 'chat_ended' });
                    this._stopPolling();
                    return;
                }
            }

            throw new Error(message);
        }

        const data = await response.json();

        // Aktualizovat polling interval podle doporučení API
        if (data.pollingIntervalMillis) {
            this.pollingInterval = Math.max(data.pollingIntervalMillis, 1000);
        }

        // Uložit next page token
        this.nextPageToken = data.nextPageToken;

        // Zpracovat zprávy
        if (data.items && data.items.length > 0) {
            for (const item of data.items) {
                // Filtrovat pouze textové zprávy
                if (item.snippet?.type === 'textMessageEvent') {
                    const normalized = this.normalizeMessage(item);
                    this.emit('message', normalized);
                }
            }
        }
    }

    /**
     * Normalizace zprávy do společného formátu
     */
    normalizeMessage(item) {
        const snippet = item.snippet || {};
        const author = item.authorDetails || {};

        // Parsování badges
        const badges = this._parseBadges(author);

        // Detekce rolí
        const roles = {
            broadcaster: author.isChatOwner || false,
            moderator: author.isChatModerator || false,
            vip: false, // YouTube nemá VIP
            subscriber: author.isChatSponsor || false,
        };

        // Generování barvy
        const color = this._generateColor(author.channelId || author.displayName);

        return {
            id: item.id || `yt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            platform: 'youtube',
            channel: this.videoId,
            author: {
                id: author.channelId || '',
                username: author.displayName || 'Anonymous',
                displayName: author.displayName || 'Anonymous',
                color: color,
                badges: badges,
                roles: roles,
                profileImage: author.profileImageUrl,
            },
            content: snippet.displayMessage || snippet.textMessageDetails?.messageText || '',
            emotes: [], // YouTube emotes jsou přímo v textu jako Unicode
            timestamp: new Date(snippet.publishedAt || Date.now()),
            raw: item,
        };
    }

    /**
     * Parsování badges z author details
     */
    _parseBadges(author) {
        const badges = [];

        if (author.isChatOwner) {
            badges.push({
                type: 'broadcaster',
                id: 'owner',
                url: '',
                title: 'Channel Owner',
            });
        }

        if (author.isChatModerator) {
            badges.push({
                type: 'moderator',
                id: 'moderator',
                url: '',
                title: 'Moderator',
            });
        }

        if (author.isChatSponsor) {
            badges.push({
                type: 'subscriber',
                id: 'member',
                url: '',
                title: 'Member',
            });
        }

        if (author.isVerified) {
            badges.push({
                type: 'verified',
                id: 'verified',
                url: '',
                title: 'Verified',
            });
        }

        return badges;
    }

    /**
     * Generování barvy pro uživatele
     */
    _generateColor(seed) {
        const colors = [
            '#FF0000', '#FF4500', '#FF8C00', '#FFD700', '#32CD32',
            '#00CED1', '#1E90FF', '#9370DB', '#FF69B4', '#DC143C',
        ];

        if (!seed) return colors[0];

        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }

        return colors[Math.abs(hash) % colors.length];
    }

    /**
     * Aktualizace API klíče
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }
}

// Export pro globální použití
window.YouTubeAdapter = YouTubeAdapter;
