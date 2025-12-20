/**
 * 1337x Scraper
 * Scrapes torrent listings from 1337x
 */

const { BaseScraper } = require('./base');

class Scraper1337x extends BaseScraper {
    constructor(proxyManager) {
        super(proxyManager, {
            name: '1337x',
            baseUrl: 'https://1337x.to',
            searchPath: '/search',
            rateLimit: 1500
        });

        // Fallback mirrors
        this.mirrors = [
            'https://1337x.to',
            'https://1337x.st',
            'https://x1337x.ws',
            'https://1337x.gd'
        ];
        this.currentMirror = 0;
    }

    getBaseUrl() {
        return this.mirrors[this.currentMirror];
    }

    async tryNextMirror() {
        this.currentMirror = (this.currentMirror + 1) % this.mirrors.length;
        console.log(`[1337x] Switching to mirror: ${this.getBaseUrl()}`);
    }

    async search(query, options = {}) {
        const { category, page = 1 } = options;

        // Build search URL
        const encodedQuery = encodeURIComponent(query);
        let url = `${this.getBaseUrl()}/search/${encodedQuery}/${page}/`;

        // Add category filter for audio/music
        if (category) {
            url = `${this.getBaseUrl()}/category-search/${encodedQuery}/Music/${page}/`;
        }

        try {
            const html = await this.fetch(url);
            return this.parseSearchResults(html);
        } catch (error) {
            // Try next mirror on failure
            await this.tryNextMirror();
            throw error;
        }
    }

    parseSearchResults(html) {
        const $ = this.parseHTML(html);
        const results = [];

        $('table.table-list tbody tr').each((i, elem) => {
            try {
                const row = $(elem);
                const nameCell = row.find('td.name');
                const link = nameCell.find('a:nth-child(2)');

                const title = link.text().trim();
                const href = link.attr('href');
                const id = href ? href.split('/').filter(Boolean)[1] : null;

                const seeders = this.parseNumber(row.find('td.seeds').text());
                const leechers = this.parseNumber(row.find('td.leeches').text());
                const size = row.find('td.size').clone().children().remove().end().text().trim();
                const uploadDate = row.find('td.coll-date').text().trim();
                const uploader = row.find('td.coll-5 a').text().trim();

                if (title && id) {
                    results.push({
                        id,
                        title,
                        url: `${this.getBaseUrl()}${href}`,
                        seeders,
                        leechers,
                        size: this.formatSize(size),
                        sizeHuman: size,
                        uploadDate,
                        uploader,
                        source: '1337x'
                    });
                }
            } catch (error) {
                console.error('[1337x] Error parsing row:', error.message);
            }
        });

        return results;
    }

    async getDetails(id) {
        const url = `${this.getBaseUrl()}/torrent/${id}/`;

        try {
            const html = await this.fetch(url);
            return this.parseDetails(html, id);
        } catch (error) {
            await this.tryNextMirror();
            throw error;
        }
    }

    parseDetails(html, id) {
        const $ = this.parseHTML(html);

        const title = $('div.box-info-heading h1').text().trim();
        const magnetLink = $('a[href^="magnet:"]').attr('href');
        const infoHash = this.extractInfoHash(magnetLink || html);

        // Parse info list
        const info = {};
        $('div.torrent-detail-page ul.list li').each((i, elem) => {
            const label = $(elem).find('strong').text().replace(':', '').trim().toLowerCase();
            const value = $(elem).find('span').text().trim();
            info[label] = value;
        });

        // Parse file list
        const files = [];
        $('div.file-content ul li').each((i, elem) => {
            const fileName = $(elem).text().trim();
            // Extract size from filename if present
            const sizeMatch = fileName.match(/\(([\d.]+\s*[KMGT]?B)\)$/i);
            files.push({
                name: sizeMatch ? fileName.replace(sizeMatch[0], '').trim() : fileName,
                size: sizeMatch ? this.formatSize(sizeMatch[1]) : 0,
                index: i
            });
        });

        return {
            id,
            title,
            magnetUri: magnetLink,
            infoHash,
            size: this.formatSize(info.size || '0'),
            sizeHuman: info.size || 'Unknown',
            seeders: this.parseNumber(info.seeders),
            leechers: this.parseNumber(info.leechers),
            uploadDate: info['date uploaded'],
            uploader: info['uploaded by'],
            category: info.category,
            files,
            fileCount: files.length,
            source: '1337x'
        };
    }
}

module.exports = { Scraper1337x };
