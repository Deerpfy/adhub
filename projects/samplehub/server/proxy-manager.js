/**
 * Proxy Manager
 * Manages proxy rotation and Tor integration for anonymous scraping
 */

const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');

class ProxyManager {
    constructor(config = {}) {
        this.enabled = config.enabled || false;
        this.rotateOnRequest = config.rotateOnRequest || false;
        this.currentIndex = 0;

        // Proxy list
        this.proxies = config.proxies || [];

        // Tor configuration
        this.torEnabled = config.torEnabled || false;
        this.torHost = config.torHost || '127.0.0.1';
        this.torPort = config.torPort || 9050;
        this.torControlPort = config.torControlPort || 9051;
        this.torPassword = config.torPassword || '';

        // Statistics
        this.stats = {
            requests: 0,
            rotations: 0,
            failures: {}
        };

        console.log('[ProxyManager] Initialized', {
            enabled: this.enabled,
            torEnabled: this.torEnabled,
            proxyCount: this.proxies.length
        });
    }

    /**
     * Check if proxy is enabled
     */
    isEnabled() {
        return this.enabled || this.torEnabled;
    }

    /**
     * Get current proxy agent for axios/fetch
     */
    getAgent() {
        this.stats.requests++;

        // Tor has priority
        if (this.torEnabled) {
            return this.getTorAgent();
        }

        // No proxies available
        if (this.proxies.length === 0) {
            return null;
        }

        // Rotate if needed
        if (this.rotateOnRequest) {
            this.rotate();
        }

        return this.getProxyAgent(this.proxies[this.currentIndex]);
    }

    /**
     * Get Tor SOCKS5 agent
     */
    getTorAgent() {
        const torUrl = `socks5://${this.torHost}:${this.torPort}`;
        return new SocksProxyAgent(torUrl);
    }

    /**
     * Create agent from proxy string
     * Supports: http://, https://, socks4://, socks5://
     */
    getProxyAgent(proxyUrl) {
        if (!proxyUrl) return null;

        try {
            if (proxyUrl.startsWith('socks')) {
                return new SocksProxyAgent(proxyUrl);
            } else {
                return new HttpsProxyAgent(proxyUrl);
            }
        } catch (error) {
            console.error('[ProxyManager] Failed to create agent:', error.message);
            return null;
        }
    }

    /**
     * Rotate to next proxy
     */
    rotate() {
        if (this.proxies.length === 0) return;

        this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
        this.stats.rotations++;

        console.log(`[ProxyManager] Rotated to proxy ${this.currentIndex + 1}/${this.proxies.length}`);
    }

    /**
     * Mark current proxy as failed
     */
    markFailed(reason = 'unknown') {
        const proxy = this.proxies[this.currentIndex];
        if (!proxy) return;

        if (!this.stats.failures[proxy]) {
            this.stats.failures[proxy] = 0;
        }
        this.stats.failures[proxy]++;

        console.log(`[ProxyManager] Proxy failed (${reason}):`, proxy);

        // Auto-rotate on failure
        this.rotate();
    }

    /**
     * Add proxy to pool
     */
    addProxy(proxyUrl) {
        if (!this.proxies.includes(proxyUrl)) {
            this.proxies.push(proxyUrl);
            console.log(`[ProxyManager] Added proxy: ${proxyUrl}`);
        }
    }

    /**
     * Remove proxy from pool
     */
    removeProxy(proxyUrl) {
        const index = this.proxies.indexOf(proxyUrl);
        if (index > -1) {
            this.proxies.splice(index, 1);
            if (this.currentIndex >= this.proxies.length) {
                this.currentIndex = 0;
            }
            console.log(`[ProxyManager] Removed proxy: ${proxyUrl}`);
        }
    }

    /**
     * Test proxy connectivity
     */
    async testProxy(proxyUrl, testUrl = 'https://httpbin.org/ip') {
        const axios = require('axios');
        const agent = this.getProxyAgent(proxyUrl);

        try {
            const response = await axios.get(testUrl, {
                httpsAgent: agent,
                timeout: 10000
            });

            return {
                success: true,
                ip: response.data.origin,
                latency: response.headers['x-response-time']
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Test all proxies in pool
     */
    async testAllProxies() {
        const results = [];

        for (const proxy of this.proxies) {
            const result = await this.testProxy(proxy);
            results.push({
                proxy,
                ...result
            });
        }

        // Also test Tor if enabled
        if (this.torEnabled) {
            const torUrl = `socks5://${this.torHost}:${this.torPort}`;
            const result = await this.testProxy(torUrl);
            results.push({
                proxy: 'tor',
                ...result
            });
        }

        return results;
    }

    /**
     * Request new Tor identity (requires control port access)
     */
    async newTorIdentity() {
        if (!this.torEnabled) {
            throw new Error('Tor is not enabled');
        }

        const net = require('net');

        return new Promise((resolve, reject) => {
            const client = new net.Socket();

            client.connect(this.torControlPort, this.torHost, () => {
                // Authenticate
                if (this.torPassword) {
                    client.write(`AUTHENTICATE "${this.torPassword}"\r\n`);
                } else {
                    client.write('AUTHENTICATE\r\n');
                }
            });

            let response = '';
            let authenticated = false;

            client.on('data', (data) => {
                response += data.toString();

                if (!authenticated && response.includes('250 OK')) {
                    authenticated = true;
                    client.write('SIGNAL NEWNYM\r\n');
                } else if (authenticated && response.includes('250 OK')) {
                    client.destroy();
                    console.log('[ProxyManager] New Tor identity requested');
                    resolve({ success: true });
                } else if (response.includes('515') || response.includes('551')) {
                    client.destroy();
                    reject(new Error('Tor authentication failed'));
                }
            });

            client.on('error', (error) => {
                reject(error);
            });

            client.setTimeout(5000, () => {
                client.destroy();
                reject(new Error('Tor control connection timeout'));
            });
        });
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            currentProxy: this.proxies[this.currentIndex] || (this.torEnabled ? 'tor' : null),
            proxyCount: this.proxies.length,
            torEnabled: this.torEnabled
        };
    }

    /**
     * Update configuration
     */
    configure(config) {
        if (config.enabled !== undefined) this.enabled = config.enabled;
        if (config.torEnabled !== undefined) this.torEnabled = config.torEnabled;
        if (config.torHost) this.torHost = config.torHost;
        if (config.torPort) this.torPort = config.torPort;
        if (config.torControlPort) this.torControlPort = config.torControlPort;
        if (config.torPassword !== undefined) this.torPassword = config.torPassword;
        if (config.proxies) this.proxies = config.proxies;
        if (config.rotateOnRequest !== undefined) this.rotateOnRequest = config.rotateOnRequest;

        console.log('[ProxyManager] Configuration updated');
    }
}

/**
 * Factory function for creating pre-configured proxy managers
 */
function createProxyManager(type = 'none', options = {}) {
    switch (type) {
        case 'tor':
            return new ProxyManager({
                enabled: true,
                torEnabled: true,
                torHost: options.torHost || '127.0.0.1',
                torPort: options.torPort || 9050,
                torControlPort: options.torControlPort || 9051,
                torPassword: options.torPassword || ''
            });

        case 'proxy-list':
            return new ProxyManager({
                enabled: true,
                proxies: options.proxies || [],
                rotateOnRequest: options.rotateOnRequest || false
            });

        case 'hybrid':
            return new ProxyManager({
                enabled: true,
                torEnabled: true,
                torHost: options.torHost || '127.0.0.1',
                torPort: options.torPort || 9050,
                proxies: options.proxies || [],
                rotateOnRequest: options.rotateOnRequest || false
            });

        default:
            return new ProxyManager({ enabled: false });
    }
}

module.exports = { ProxyManager, createProxyManager };
