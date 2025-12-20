/**
 * Base Scraper Class
 * Common functionality for all torrent indexer scrapers
 */

const axios = require('axios');
const cheerio = require('cheerio');

class BaseScraper {
    constructor(proxyManager, config = {}) {
        this.proxyManager = proxyManager;
        this.name = config.name || 'BaseScraper';
        this.baseUrl = config.baseUrl || '';
        this.searchPath = config.searchPath || '/search';
        this.rateLimit = config.rateLimit || 1000; // ms between requests
        this.lastRequest = 0;
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
        ];
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    async rateLimitedRequest() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequest;

        if (timeSinceLastRequest < this.rateLimit) {
            await this.sleep(this.rateLimit - timeSinceLastRequest);
        }

        this.lastRequest = Date.now();
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fetch(url, options = {}) {
        await this.rateLimitedRequest();

        const config = {
            headers: {
                'User-Agent': this.getRandomUserAgent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                ...options.headers
            },
            timeout: 15000,
            maxRedirects: 5,
            ...options
        };

        // Add proxy agent if configured
        if (this.proxyManager && this.proxyManager.isEnabled()) {
            config.httpsAgent = this.proxyManager.getAgent();
            config.httpAgent = this.proxyManager.getAgent();
        }

        try {
            const response = await axios.get(url, config);
            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
            }
            throw error;
        }
    }

    parseHTML(html) {
        return cheerio.load(html);
    }

    formatSize(sizeStr) {
        if (!sizeStr) return 0;

        const match = sizeStr.match(/([\d.]+)\s*(KB|MB|GB|TB|B)/i);
        if (!match) return 0;

        const value = parseFloat(match[1]);
        const unit = match[2].toUpperCase();

        const multipliers = {
            'B': 1,
            'KB': 1024,
            'MB': 1024 * 1024,
            'GB': 1024 * 1024 * 1024,
            'TB': 1024 * 1024 * 1024 * 1024
        };

        return Math.round(value * (multipliers[unit] || 1));
    }

    formatSizeHuman(bytes) {
        if (bytes === 0) return '0 B';

        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));

        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
    }

    parseNumber(str) {
        if (!str) return 0;
        const cleaned = str.replace(/[,\s]/g, '');
        return parseInt(cleaned, 10) || 0;
    }

    extractMagnet(html) {
        const match = html.match(/magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^"'\s]*/);
        return match ? match[0] : null;
    }

    extractInfoHash(magnetOrHtml) {
        const match = magnetOrHtml.match(/btih:([a-fA-F0-9]{40})/i) ||
                      magnetOrHtml.match(/btih:([a-zA-Z0-9]{32})/i);
        return match ? match[1].toLowerCase() : null;
    }

    /**
     * Abstract methods - must be implemented by subclasses
     */
    async search(query, options = {}) {
        throw new Error('search() must be implemented');
    }

    async getDetails(id) {
        throw new Error('getDetails() must be implemented');
    }
}

module.exports = { BaseScraper };
