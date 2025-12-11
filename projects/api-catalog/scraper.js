/**
 * API Catalog - GitHub Scraper
 *
 * Scraper pro extrakci API dat z repozitare cporter202/API-mega-list
 * Parsuje README.md soubory z jednotlivych kategorii a extrahuje:
 * - Nazev API
 * - URL (Apify link)
 * - Popis
 * - Kategorii
 * - Autora (z URL)
 * - Tagy (extrahovane z popisu)
 *
 * @version 1.0.0
 * @license MIT
 */

const APIScraper = {
    // GitHub raw URL base
    GITHUB_RAW_BASE: 'https://raw.githubusercontent.com/cporter202/API-mega-list/main',

    // CORS proxy pro browser (potrebne pro cross-origin requesty)
    CORS_PROXIES: [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest='
    ],

    // Kategorie s jejich slozkami
    CATEGORIES: [
        { id: 'agents', folder: 'agents-apis-697', name: 'Agents', count: 697 },
        { id: 'ai', folder: 'ai-apis-1208', name: 'AI', count: 1208 },
        { id: 'automation', folder: 'automation-apis-4825', name: 'Automation', count: 4825 },
        { id: 'business', folder: 'business-apis-2', name: 'Business', count: 2 },
        { id: 'developer-tools', folder: 'developer-tools-apis-2652', name: 'Developer Tools', count: 2652 },
        { id: 'ecommerce', folder: 'ecommerce-apis-2440', name: 'E-commerce', count: 2440 },
        { id: 'integrations', folder: 'integrations-apis-890', name: 'Integrations', count: 890 },
        { id: 'jobs', folder: 'jobs-apis-848', name: 'Jobs', count: 848 },
        { id: 'lead-generation', folder: 'lead-generation-apis-3452', name: 'Lead Generation', count: 3452 },
        { id: 'mcp-servers', folder: 'mcp-servers-apis-131', name: 'MCP Servers', count: 131 },
        { id: 'news', folder: 'news-apis-590', name: 'News', count: 590 },
        { id: 'open-source', folder: 'open-source-apis-768', name: 'Open Source', count: 768 },
        { id: 'other', folder: 'other-apis-1297', name: 'Other', count: 1297 },
        { id: 'real-estate', folder: 'real-estate-apis-851', name: 'Real Estate', count: 851 },
        { id: 'seo-tools', folder: 'seo-tools-apis-710', name: 'SEO Tools', count: 710 },
        { id: 'social-media', folder: 'social-media-apis-3268', name: 'Social Media', count: 3268 },
        { id: 'travel', folder: 'travel-apis-397', name: 'Travel', count: 397 },
        { id: 'videos', folder: 'videos-apis-979', name: 'Videos', count: 979 }
    ],

    // Aktualni index CORS proxy
    currentProxyIndex: 0,

    /**
     * Ziska URL s CORS proxy
     */
    getProxiedUrl(url) {
        return this.CORS_PROXIES[this.currentProxyIndex] + encodeURIComponent(url);
    },

    /**
     * Prepne na dalsi CORS proxy
     */
    nextProxy() {
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.CORS_PROXIES.length;
    },

    /**
     * Stahne obsah URL s retry logikou
     */
    async fetchWithRetry(url, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                // Zkus primo (funguje v Node.js nebo s CORS povolenim)
                let response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                return await response.text();
            } catch (directError) {
                // Zkus s CORS proxy (pro browser)
                try {
                    const proxiedUrl = this.getProxiedUrl(url);
                    const response = await fetch(proxiedUrl);

                    if (response.ok) {
                        return await response.text();
                    }
                } catch (proxyError) {
                    this.nextProxy();
                }
            }

            // Pockej pred dalsim pokusem
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }

        throw new Error(`Failed to fetch: ${url}`);
    },

    /**
     * Parsuje markdown tabulku z README
     */
    parseMarkdownTable(markdown, categoryId) {
        const apis = [];

        // Regex pro markdown linky v tabulce
        // Format: | [Name](url) | Description |
        const linkRegex = /\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]+)\s*\|/g;

        let match;
        while ((match = linkRegex.exec(markdown)) !== null) {
            const [, rawName, url, description] = match;

            // Ocisti nazev od emoji
            const name = this.cleanName(rawName);

            // Extrahuj autora z URL
            const author = this.extractAuthor(url);

            // Extrahuj tagy z popisu
            const tags = this.extractTags(description, categoryId);

            // Ocisti URL (odstran referral parametr)
            const cleanUrl = this.cleanUrl(url);

            // Urcit platformu
            const platform = this.detectPlatform(url);

            apis.push({
                id: this.generateId(name, author),
                name: name,
                description: this.cleanDescription(description),
                category: categoryId,
                url: cleanUrl,
                author: author,
                platform: platform,
                tags: tags,
                sourceUrl: url,
                scrapedAt: new Date().toISOString()
            });
        }

        return apis;
    },

    /**
     * Ocisti nazev od emoji a prebytecnych znaku
     */
    cleanName(name) {
        return name
            // Odstran emoji
            .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '')
            // Odstran specialni znaky na zacatku
            .replace(/^[✨🔍🚀🤖🎯🌐📍🌸💼🔗⚡🛠️📊💡🎬📱🏠✈️📰🎮]+\s*/, '')
            .trim();
    },

    /**
     * Extrahuj autora z Apify URL
     */
    extractAuthor(url) {
        const match = url.match(/apify\.com\/([^\/]+)\//);
        return match ? match[1] : 'unknown';
    },

    /**
     * Ocisti URL od referral parametru
     */
    cleanUrl(url) {
        try {
            const urlObj = new URL(url);
            urlObj.searchParams.delete('fpr');
            return urlObj.toString();
        } catch {
            return url;
        }
    },

    /**
     * Detekuj platformu z URL
     */
    detectPlatform(url) {
        if (url.includes('apify.com')) return 'Apify';
        if (url.includes('github.com')) return 'GitHub';
        if (url.includes('rapidapi.com')) return 'RapidAPI';
        return 'REST API';
    },

    /**
     * Extrahuj tagy z popisu
     */
    extractTags(description, categoryId) {
        const tags = new Set();
        const desc = description.toLowerCase();

        // Pridej kategorii jako tag
        tags.add(categoryId);

        // Klicova slova pro tagy
        const keywords = {
            'scraper': ['scraper', 'scrape', 'scraping', 'extract'],
            'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'gpt', 'llm'],
            'automation': ['automat', 'bot', 'workflow'],
            'data': ['data', 'dataset', 'database'],
            'api': ['api', 'rest', 'endpoint'],
            'social': ['social', 'twitter', 'facebook', 'instagram', 'linkedin', 'tiktok'],
            'ecommerce': ['amazon', 'ebay', 'shopify', 'product', 'price'],
            'seo': ['seo', 'keyword', 'serp', 'ranking', 'backlink'],
            'video': ['video', 'youtube', 'stream', 'media'],
            'email': ['email', 'mail', 'newsletter'],
            'leads': ['lead', 'contact', 'prospect'],
            'analytics': ['analytics', 'metrics', 'statistics', 'tracking'],
            'search': ['search', 'google', 'bing'],
            'real-time': ['real-time', 'realtime', 'live', 'instant'],
            'bulk': ['bulk', 'batch', 'mass'],
            'free': ['free', 'no cost']
        };

        for (const [tag, patterns] of Object.entries(keywords)) {
            if (patterns.some(p => desc.includes(p))) {
                tags.add(tag);
            }
        }

        return Array.from(tags).slice(0, 8); // Max 8 tagu
    },

    /**
     * Ocisti popis
     */
    cleanDescription(description) {
        return description
            .replace(/\s+/g, ' ')
            .replace(/^\s*[-–—]\s*/, '')
            .trim();
    },

    /**
     * Generuj unikatni ID
     */
    generateId(name, author) {
        const slug = (name + '-' + author)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50);
        return `api_${slug}_${Date.now().toString(36)}`;
    },

    /**
     * Scrapuj jednu kategorii
     */
    async scrapeCategory(category, onProgress) {
        const url = `${this.GITHUB_RAW_BASE}/${category.folder}/README.md`;

        if (onProgress) {
            onProgress({
                type: 'category_start',
                category: category.name,
                expectedCount: category.count
            });
        }

        try {
            const markdown = await this.fetchWithRetry(url);
            const apis = this.parseMarkdownTable(markdown, category.id);

            if (onProgress) {
                onProgress({
                    type: 'category_done',
                    category: category.name,
                    count: apis.length
                });
            }

            return apis;
        } catch (error) {
            if (onProgress) {
                onProgress({
                    type: 'category_error',
                    category: category.name,
                    error: error.message
                });
            }
            return [];
        }
    },

    /**
     * Scrapuj vsechny kategorie
     */
    async scrapeAll(onProgress) {
        const allApis = [];
        const stats = {
            total: 0,
            categories: 0,
            errors: 0
        };

        for (const category of this.CATEGORIES) {
            const apis = await this.scrapeCategory(category, onProgress);
            allApis.push(...apis);

            if (apis.length > 0) {
                stats.categories++;
                stats.total += apis.length;
            } else {
                stats.errors++;
            }

            // Rate limiting - pockej mezi requesty
            await new Promise(r => setTimeout(r, 500));
        }

        if (onProgress) {
            onProgress({
                type: 'complete',
                stats: stats
            });
        }

        return {
            apis: allApis,
            stats: stats,
            scrapedAt: new Date().toISOString()
        };
    },

    /**
     * Scrapuj vybranou podmnozinu kategorii
     */
    async scrapeCategories(categoryIds, onProgress) {
        const categories = this.CATEGORIES.filter(c => categoryIds.includes(c.id));
        const allApis = [];

        for (const category of categories) {
            const apis = await this.scrapeCategory(category, onProgress);
            allApis.push(...apis);
            await new Promise(r => setTimeout(r, 500));
        }

        return allApis;
    },

    /**
     * Rychle scrapovani - pouze hlavni kategorie
     */
    async scrapeQuick(onProgress) {
        // Vyber reprezentativni vzorek kategorii
        const quickCategories = ['ai', 'seo-tools', 'developer-tools', 'social-media', 'ecommerce', 'mcp-servers'];
        return this.scrapeCategories(quickCategories, onProgress);
    },

    /**
     * Export do JSON formatu pro import
     */
    exportToJSON(apis) {
        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            source: 'cporter202/API-mega-list',
            data: {
                apis: apis,
                categories: this.CATEGORIES.map(c => ({
                    id: c.id,
                    name: c.name,
                    icon: this.getCategoryIcon(c.id),
                    color: this.getCategoryColor(c.id),
                    count: apis.filter(a => a.category === c.id).length
                }))
            },
            meta: {
                apiCount: apis.length,
                categoryCount: this.CATEGORIES.length
            }
        };
    },

    /**
     * Ziskej ikonu kategorie
     */
    getCategoryIcon(categoryId) {
        const icons = {
            'agents': '&#129302;',
            'ai': '&#129302;',
            'automation': '&#9881;',
            'business': '&#128188;',
            'developer-tools': '&#128187;',
            'ecommerce': '&#128722;',
            'integrations': '&#128279;',
            'jobs': '&#128188;',
            'lead-generation': '&#128200;',
            'mcp-servers': '&#9889;',
            'news': '&#128240;',
            'open-source': '&#128736;',
            'other': '&#128206;',
            'real-estate': '&#127968;',
            'seo-tools': '&#128270;',
            'social-media': '&#128242;',
            'travel': '&#9992;',
            'videos': '&#127909;'
        };
        return icons[categoryId] || '&#128206;';
    },

    /**
     * Ziskej barvu kategorie
     */
    getCategoryColor(categoryId) {
        const colors = {
            'agents': '#ec4899',
            'ai': '#8b5cf6',
            'automation': '#8b5cf6',
            'business': '#64748b',
            'developer-tools': '#10b981',
            'ecommerce': '#f59e0b',
            'integrations': '#6366f1',
            'jobs': '#f97316',
            'lead-generation': '#ec4899',
            'mcp-servers': '#8b5cf6',
            'news': '#3b82f6',
            'open-source': '#22c55e',
            'other': '#6b7280',
            'real-estate': '#14b8a6',
            'seo-tools': '#a855f7',
            'social-media': '#06b6d4',
            'travel': '#06b6d4',
            'videos': '#ef4444'
        };
        return colors[categoryId] || '#6b7280';
    }
};

// Export pro pouziti
window.APIScraper = APIScraper;
