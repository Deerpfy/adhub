/**
 * SolidTorrents Scraper
 * Modern torrent meta-search engine with clean API-like responses
 */

const { BaseScraper } = require('./base');

class ScraperSolidTorrents extends BaseScraper {
    constructor(proxyManager) {
        super(proxyManager, {
            name: 'solidtorrents',
            baseUrl: 'https://solidtorrents.to',
            searchPath: '/search',
            rateLimit: 1000
        });

        this.mirrors = [
            'https://solidtorrents.to',
            'https://solidtorrents.eu',
            'https://solidtorrents.net'
        ];
        this.currentMirror = 0;

        // SolidTorrents categories
        this.categories = {
            'all': 'all',
            'audio': 'Audio',
            'music': 'Audio'
        };
    }

    getBaseUrl() {
        return this.mirrors[this.currentMirror];
    }

    async search(query, options = {}) {
        const { category = 'audio', page = 1, sort = 'seeders' } = options;

        const categoryFilter = this.categories[category] || '';
        const encodedQuery = encodeURIComponent(query);

        // SolidTorrents has a nice search page
        const url = `${this.getBaseUrl()}/search?q=${encodedQuery}&category=${categoryFilter}&sort=${sort}&page=${page}`;

        try {
            const html = await this.fetch(url);
            return this.parseSearchResults(html);
        } catch (error) {
            this.currentMirror = (this.currentMirror + 1) % this.mirrors.length;
            throw error;
        }
    }

    parseSearchResults(html) {
        const $ = this.parseHTML(html);
        const results = [];

        // SolidTorrents uses search-result cards
        $('li.search-result, div.search-result, .card.search-result').each((i, elem) => {
            try {
                const card = $(elem);

                const titleLink = card.find('h5 a, a.title, .card-title a').first();
                const title = titleLink.text().trim();
                const href = titleLink.attr('href');
                const idMatch = href ? href.match(/\/torrents\/([^/]+)/) : null;
                const id = idMatch ? idMatch[1] : null;

                const magnetLink = card.find('a[href^="magnet:"]').attr('href');

                // Stats parsing
                const statsText = card.find('.stats, .card-footer').text();
                const seedersMatch = statsText.match(/(\d+)\s*seeder/i);
                const leechersMatch = statsText.match(/(\d+)\s*leech/i);
                const sizeMatch = statsText.match(/([\d.]+\s*[KMGT]?i?B)/i);

                // Alternative stats from specific elements
                const seeders = seedersMatch ? parseInt(seedersMatch[1]) :
                               this.parseNumber(card.find('.seeders, .seed').text());
                const leechers = leechersMatch ? parseInt(leechersMatch[1]) :
                                this.parseNumber(card.find('.leechers, .leech').text());
                const sizeHuman = sizeMatch ? sizeMatch[1] :
                                 card.find('.size').text().trim() || 'Unknown';

                // Date
                const dateText = card.find('.date, time, .uploaded').text().trim() ||
                               card.find('[datetime]').attr('datetime');

                if (title && (id || magnetLink)) {
                    results.push({
                        id: id || this.extractInfoHash(magnetLink),
                        title,
                        url: href ? `${this.getBaseUrl()}${href}` : null,
                        magnetUri: magnetLink,
                        torrentUrl: null,
                        seeders,
                        leechers,
                        size: this.formatSize(sizeHuman),
                        sizeHuman,
                        uploadDate: dateText,
                        source: 'solidtorrents'
                    });
                }
            } catch (error) {
                console.error('[solidtorrents] Error parsing card:', error.message);
            }
        });

        return results;
    }

    async getDetails(id) {
        const url = `${this.getBaseUrl()}/torrents/${id}`;

        const html = await this.fetch(url);
        return this.parseDetails(html, id);
    }

    parseDetails(html, id) {
        const $ = this.parseHTML(html);

        const title = $('h1, .torrent-title').first().text().trim();
        const magnetLink = $('a[href^="magnet:"]').first().attr('href');
        const infoHash = this.extractInfoHash(magnetLink || '');

        // Parse info table
        const info = {};
        $('table.info-table tr, dl dt').each((i, elem) => {
            const row = $(elem);
            let key, value;

            if (row.is('tr')) {
                key = row.find('td:first-child, th').text().trim().toLowerCase();
                value = row.find('td:last-child').text().trim();
            } else {
                key = row.text().trim().toLowerCase();
                value = row.next('dd').text().trim();
            }

            if (key && value) {
                info[key.replace(':', '')] = value;
            }
        });

        // Parse file list
        const files = [];
        $('.file-list li, .files-list tr').each((i, elem) => {
            const item = $(elem);
            const fileName = item.find('.file-name, td:first-child').text().trim() ||
                           item.text().split(/\s{2,}/)[0];
            const fileSize = item.find('.file-size, td:last-child').text().trim() ||
                           item.text().match(/([\d.]+\s*[KMGT]?i?B)/i)?.[1];

            if (fileName) {
                files.push({
                    name: fileName,
                    size: fileSize ? this.formatSize(fileSize) : 0,
                    index: i
                });
            }
        });

        // Description
        const description = $('.description, .torrent-description').text().trim();

        return {
            id,
            title,
            magnetUri: magnetLink,
            torrentUrl: null,
            infoHash,
            size: this.formatSize(info['size'] || info['total size'] || '0'),
            sizeHuman: info['size'] || info['total size'] || 'Unknown',
            seeders: this.parseNumber(info['seeders']),
            leechers: this.parseNumber(info['leechers']),
            uploadDate: info['uploaded'] || info['date'],
            uploader: info['uploader'] || info['user'],
            category: info['category'],
            files,
            fileCount: files.length || parseInt(info['files']) || 0,
            description,
            source: 'solidtorrents'
        };
    }
}

module.exports = { ScraperSolidTorrents };
