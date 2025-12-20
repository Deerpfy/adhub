/**
 * The Pirate Bay Scraper
 * Scrapes torrent listings from TPB proxies
 */

const { BaseScraper } = require('./base');

class ScraperTPB extends BaseScraper {
    constructor(proxyManager) {
        super(proxyManager, {
            name: 'tpb',
            baseUrl: 'https://thepiratebay.org',
            searchPath: '/search',
            rateLimit: 1500
        });

        // TPB proxies - updated regularly
        this.mirrors = [
            'https://thepiratebay.org',
            'https://thepiratebay10.org',
            'https://piratebay.live',
            'https://thepiratebay.zone',
            'https://tpb.party'
        ];
        this.currentMirror = 0;

        // TPB categories
        this.categories = {
            'all': '0',
            'audio': '100',
            'music': '101',
            'audiobooks': '102',
            'soundclips': '103',
            'flac': '104',
            'other': '199'
        };
    }

    getBaseUrl() {
        return this.mirrors[this.currentMirror];
    }

    async search(query, options = {}) {
        const { category = 'audio', page = 1, orderBy = 'seeders' } = options;

        const categoryCode = this.categories[category] || this.categories.audio;
        const encodedQuery = encodeURIComponent(query);

        // TPB URL format: /search/query/page/orderby/category
        // Order: 7 = seeders desc
        const orderCode = orderBy === 'seeders' ? '7' : '99';
        const pageIndex = Math.max(0, page - 1);

        const url = `${this.getBaseUrl()}/search/${encodedQuery}/${pageIndex}/${orderCode}/${categoryCode}`;

        try {
            const html = await this.fetch(url);
            return this.parseSearchResults(html);
        } catch (error) {
            // Try next mirror
            this.currentMirror = (this.currentMirror + 1) % this.mirrors.length;
            throw error;
        }
    }

    parseSearchResults(html) {
        const $ = this.parseHTML(html);
        const results = [];

        // TPB uses table#searchResult
        $('table#searchResult tbody tr').each((i, elem) => {
            try {
                const row = $(elem);

                // Skip header row
                if (row.find('th').length > 0) return;

                const categoryCell = row.find('td.vertTh');
                const mainCell = row.find('td:nth-child(2)');
                const seedersCell = row.find('td:nth-child(3)');
                const leechersCell = row.find('td:nth-child(4)');

                const titleLink = mainCell.find('a.detLink');
                const title = titleLink.text().trim();
                const href = titleLink.attr('href');
                const id = href ? href.match(/\/torrent\/(\d+)/)?.[1] : null;

                const magnetLink = mainCell.find('a[href^="magnet:"]').attr('href');

                // Parse description for size and date
                const descText = mainCell.find('font.detDesc').text();
                const sizeMatch = descText.match(/Size\s+([\d.]+)\s*(\w+)/i);
                const dateMatch = descText.match(/Uploaded\s+([^,]+)/i);

                const sizeValue = sizeMatch ? sizeMatch[1] : '0';
                const sizeUnit = sizeMatch ? sizeMatch[2] : 'MiB';
                const sizeHuman = sizeMatch ? `${sizeValue} ${sizeUnit}` : 'Unknown';

                if (title && id) {
                    results.push({
                        id,
                        title,
                        url: `${this.getBaseUrl()}/torrent/${id}`,
                        magnetUri: magnetLink,
                        torrentUrl: null, // TPB doesn't provide direct .torrent links
                        seeders: this.parseNumber(seedersCell.text()),
                        leechers: this.parseNumber(leechersCell.text()),
                        size: this.formatSize(sizeHuman),
                        sizeHuman,
                        uploadDate: dateMatch ? dateMatch[1].trim() : null,
                        category: categoryCell.text().trim(),
                        source: 'tpb'
                    });
                }
            } catch (error) {
                console.error('[tpb] Error parsing row:', error.message);
            }
        });

        return results;
    }

    async getDetails(id) {
        const url = `${this.getBaseUrl()}/torrent/${id}`;

        const html = await this.fetch(url);
        return this.parseDetails(html, id);
    }

    parseDetails(html, id) {
        const $ = this.parseHTML(html);

        const title = $('div#title').text().trim();
        const magnetLink = $('a[href^="magnet:"]').first().attr('href');
        const infoHash = this.extractInfoHash(magnetLink || '');

        // Parse details from definition list
        const details = {};
        $('dl.col1 dt, dl.col2 dt').each((i, elem) => {
            const dt = $(elem);
            const dd = dt.next('dd');
            const key = dt.text().replace(':', '').trim().toLowerCase();
            const value = dd.text().trim();
            if (key && value) {
                details[key] = value;
            }
        });

        // Parse file list
        const files = [];
        $('dl.filelist dt').each((i, elem) => {
            const fileName = $(elem).text().trim();
            const fileSize = $(elem).next('dd').text().trim();
            files.push({
                name: fileName,
                size: this.formatSize(fileSize),
                index: i
            });
        });

        // Get description
        const description = $('div.nfo pre').text().trim() ||
                           $('div#description').text().trim();

        return {
            id,
            title,
            magnetUri: magnetLink,
            torrentUrl: null,
            infoHash,
            size: this.formatSize(details['size'] || '0'),
            sizeHuman: details['size'] || 'Unknown',
            seeders: this.parseNumber(details['seeders']),
            leechers: this.parseNumber(details['leechers']),
            uploadDate: details['uploaded'],
            uploader: details['by'],
            category: details['type'],
            files,
            fileCount: files.length || parseInt(details['files']) || 0,
            description,
            source: 'tpb'
        };
    }
}

module.exports = { ScraperTPB };
