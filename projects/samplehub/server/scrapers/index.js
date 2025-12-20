/**
 * Scraper Manager - Orchestrates multiple torrent indexer scrapers
 */

const { Scraper1337x } = require('./1337x');
const { ScraperNyaa } = require('./nyaa');
const { ScraperTPB } = require('./tpb');
const { ScraperRuTracker } = require('./rutracker');
const { ScraperSolidTorrents } = require('./solidtorrents');

class ScraperManager {
    constructor(proxyManager) {
        this.proxyManager = proxyManager;
        this.scrapers = {
            '1337x': new Scraper1337x(proxyManager),
            'nyaa': new ScraperNyaa(proxyManager),
            'tpb': new ScraperTPB(proxyManager),
            'rutracker': new ScraperRuTracker(proxyManager),
            'solidtorrents': new ScraperSolidTorrents(proxyManager)
        };

        // Default enabled sources
        this.enabledSources = ['1337x', 'solidtorrents', 'nyaa'];
    }

    getSources() {
        return Object.keys(this.scrapers);
    }

    getEnabledSources() {
        return this.enabledSources;
    }

    enableSource(source) {
        if (this.scrapers[source] && !this.enabledSources.includes(source)) {
            this.enabledSources.push(source);
        }
    }

    disableSource(source) {
        this.enabledSources = this.enabledSources.filter(s => s !== source);
    }

    /**
     * Search across multiple sources
     */
    async search(query, options = {}) {
        const {
            sources = this.enabledSources,
            category,
            page = 1,
            limit = 50
        } = options;

        // Run searches in parallel
        const searchPromises = sources
            .filter(source => this.scrapers[source])
            .map(async (source) => {
                try {
                    const scraper = this.scrapers[source];
                    const results = await scraper.search(query, { category, page });
                    return results.map(r => ({ ...r, source }));
                } catch (error) {
                    console.error(`Search failed for ${source}:`, error.message);
                    return [];
                }
            });

        const allResults = await Promise.all(searchPromises);
        const combined = allResults.flat();

        // Sort by seeders (descending)
        combined.sort((a, b) => (b.seeders || 0) - (a.seeders || 0));

        // Apply limit
        return combined.slice(0, limit);
    }

    /**
     * Get torrent details from specific source
     */
    async getTorrentDetails(source, id) {
        const scraper = this.scrapers[source];
        if (!scraper) {
            throw new Error(`Unknown source: ${source}`);
        }
        return scraper.getDetails(id);
    }
}

function createScraperManager(proxyManager) {
    return new ScraperManager(proxyManager);
}

module.exports = { ScraperManager, createScraperManager };
