/**
 * AdHub Multistream Chat v2
 * YouTube Iframe Adapter - Zobrazení oficiálního YouTube chatu v iframe
 *
 * Nevyžaduje API klíč - používá oficiální YouTube chat widget.
 * Podporuje zadání kanálu (handle/@username) nebo video ID.
 */

class YouTubeIframeAdapter extends BaseAdapter {
    constructor(config) {
        // Parsování vstupu - může být kanál, handle nebo video ID
        let channel = config.channel;
        let videoId = null;
        let channelHandle = null;

        // Detekce typu vstupu
        if (channel.includes('youtube.com/watch')) {
            // Video URL
            const match = channel.match(/[?&]v=([^&]+)/);
            if (match) videoId = match[1];
        } else if (channel.includes('youtube.com/live/')) {
            // Live URL
            const match = channel.match(/live\/([^?&]+)/);
            if (match) videoId = match[1];
        } else if (channel.includes('youtube.com/@')) {
            // Handle URL
            const match = channel.match(/@([^\/\?]+)/);
            if (match) channelHandle = match[1];
        } else if (channel.includes('youtube.com/channel/')) {
            // Channel ID URL
            const match = channel.match(/channel\/([^\/\?]+)/);
            if (match) channelHandle = match[1];
        } else if (channel.startsWith('@')) {
            // Handle bez URL
            channelHandle = channel.substring(1);
        } else if (channel.match(/^UC[\w-]{22}$/)) {
            // Channel ID formát
            channelHandle = channel;
        } else if (channel.match(/^[\w-]{11}$/)) {
            // Video ID formát (11 znaků)
            videoId = channel;
        } else {
            // Předpokládáme handle/username
            channelHandle = channel;
        }

        super({
            ...config,
            channel: channelHandle || videoId || channel,
            platform: 'youtube-iframe',
        });

        this.videoId = videoId;
        this.channelHandle = channelHandle;
        this.iframeElement = null;
        this.containerElement = null;
        this.isLive = false;
    }

    /**
     * Připojení - vytvoření iframe s YouTube chatem
     */
    async connect() {
        if (this.state.connected || this.state.connecting) {
            return;
        }

        this._setState({ connecting: true, error: null });
        this.emit('stateChange', { state: 'connecting' });

        try {
            // Pokud máme kanál, zkusit najít live stream
            if (this.channelHandle && !this.videoId) {
                await this._findLiveStream();
            }

            if (!this.videoId) {
                throw new Error(
                    `Nepodařilo se najít živý stream pro kanál "${this.channelHandle}". ` +
                    `Kanál možná právě nevysílá. Zkuste zadat přímo video ID.`
                );
            }

            // Vytvořit iframe
            this._createIframe();

            this._setState({
                connected: true,
                connecting: false,
                reconnectAttempts: 0,
            });

            this.emit('connect', { channel: this.channel, videoId: this.videoId });
            console.log(`[YouTube Iframe] Connected to ${this.channel} (video: ${this.videoId})`);

        } catch (error) {
            console.error('[YouTube Iframe] Connection error:', error);
            this._setState({ connecting: false, error: error.message });
            this.emit('error', { message: error.message, code: 'CONNECTION_ERROR' });
        }
    }

    /**
     * Odpojení - odstranění iframe
     */
    async disconnect() {
        if (this.iframeElement) {
            this.iframeElement.remove();
            this.iframeElement = null;
        }

        if (this.containerElement) {
            this.containerElement.remove();
            this.containerElement = null;
        }

        await super.disconnect();
        this.emit('disconnect', { channel: this.channel });
    }

    /**
     * Pokus o nalezení živého streamu pro kanál
     * Používá různé metody bez API klíče
     */
    async _findLiveStream() {
        console.log(`[YouTube Iframe] Looking for live stream on channel: ${this.channelHandle}`);

        const methods = [
            () => this._tryLivePageScrape(),
            () => this._tryKnownVideoId(),
        ];

        for (const method of methods) {
            try {
                const result = await method();
                if (result) {
                    this.videoId = result;
                    this.isLive = true;
                    console.log(`[YouTube Iframe] Found live stream: ${this.videoId}`);
                    return;
                }
            } catch (error) {
                console.warn('[YouTube Iframe] Method failed:', error.message);
            }
        }
    }

    /**
     * Pokus o scraping live stránky (pravděpodobně selže kvůli CORS)
     */
    async _tryLivePageScrape() {
        // Toto pravděpodobně selže kvůli CORS, ale zkusíme
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            // Zkusit různé URL formáty
            const urls = [
                `https://www.youtube.com/@${this.channelHandle}/live`,
                `https://www.youtube.com/channel/${this.channelHandle}/live`,
                `https://www.youtube.com/c/${this.channelHandle}/live`,
            ];

            for (const url of urls) {
                try {
                    const response = await fetch(url, {
                        signal: controller.signal,
                        mode: 'cors',
                    });

                    if (response.ok) {
                        const html = await response.text();
                        // Hledat video ID v HTML
                        const videoIdMatch = html.match(/"videoId":"([^"]+)"/);
                        if (videoIdMatch) {
                            clearTimeout(timeoutId);
                            return videoIdMatch[1];
                        }
                    }
                } catch (e) {
                    // Pokračovat na další URL
                }
            }
        } catch (error) {
            clearTimeout(timeoutId);
        }

        clearTimeout(timeoutId);
        return null;
    }

    /**
     * Zkusit známé video ID z cache
     */
    async _tryKnownVideoId() {
        const cached = localStorage.getItem(`youtube_live_${this.channelHandle?.toLowerCase()}`);
        if (cached) {
            const data = JSON.parse(cached);
            // Cache platná 1 hodinu
            if (data.videoId && Date.now() - data.timestamp < 60 * 60 * 1000) {
                return data.videoId;
            }
        }
        return null;
    }

    /**
     * Uložení video ID do cache
     */
    _saveVideoIdCache() {
        if (this.videoId && this.channelHandle) {
            localStorage.setItem(`youtube_live_${this.channelHandle.toLowerCase()}`, JSON.stringify({
                videoId: this.videoId,
                timestamp: Date.now(),
            }));
        }
    }

    /**
     * Vytvoření iframe s YouTube chatem
     */
    _createIframe() {
        // Najít chat kontejner
        const chatContainer = document.getElementById('chatContainer');
        if (!chatContainer) {
            throw new Error('Chat container not found');
        }

        // Vytvořit kontejner pro tento iframe
        this.containerElement = document.createElement('div');
        this.containerElement.className = 'youtube-iframe-container';
        this.containerElement.dataset.channelId = this.connectionId;
        this.containerElement.innerHTML = `
            <div class="iframe-header">
                <span class="iframe-platform-badge youtube">YT</span>
                <span class="iframe-channel-name">${this._escapeHtml(this.channelHandle || this.videoId)}</span>
                ${this.isLive ? '<span class="iframe-live-badge">LIVE</span>' : ''}
            </div>
            <div class="iframe-wrapper"></div>
        `;

        // Vytvořit iframe
        this.iframeElement = document.createElement('iframe');
        this.iframeElement.src = this._buildChatUrl();
        this.iframeElement.className = 'youtube-chat-iframe';
        this.iframeElement.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        this.iframeElement.allowFullscreen = true;
        this.iframeElement.loading = 'lazy';

        // Event handlers
        this.iframeElement.onload = () => {
            console.log('[YouTube Iframe] Chat loaded');
            this._saveVideoIdCache();
        };

        this.iframeElement.onerror = () => {
            console.error('[YouTube Iframe] Failed to load chat');
            this.emit('error', { message: 'Failed to load YouTube chat', code: 'IFRAME_ERROR' });
        };

        // Přidat iframe do kontejneru
        this.containerElement.querySelector('.iframe-wrapper').appendChild(this.iframeElement);

        // Přidat do DOM
        // Odstranit welcome screen pokud existuje
        const welcome = chatContainer.querySelector('.chat-welcome');
        if (welcome) welcome.remove();

        // Přidat nebo najít iframe sekci
        let iframeSection = chatContainer.querySelector('.iframe-section');
        if (!iframeSection) {
            iframeSection = document.createElement('div');
            iframeSection.className = 'iframe-section';
            chatContainer.appendChild(iframeSection);
        }

        iframeSection.appendChild(this.containerElement);
    }

    /**
     * Sestavení URL pro chat iframe
     */
    _buildChatUrl() {
        const params = new URLSearchParams({
            v: this.videoId,
            embed_domain: window.location.hostname || 'localhost',
        });

        return `https://www.youtube.com/live_chat?${params.toString()}`;
    }

    /**
     * Escape HTML
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Normalizace zprávy - není použito pro iframe režim
     */
    normalizeMessage(data) {
        // Iframe režim nedostává zprávy přímo
        return null;
    }

    /**
     * Získání info o adapteru
     */
    getInfo() {
        return {
            ...super.getInfo(),
            videoId: this.videoId,
            channelHandle: this.channelHandle,
            isLive: this.isLive,
            mode: 'iframe',
        };
    }
}

// Export pro globální použití
window.YouTubeIframeAdapter = YouTubeIframeAdapter;
