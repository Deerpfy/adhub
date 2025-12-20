/**
 * Nyaa Scraper
 * Scrapes torrent listings from Nyaa (primarily anime/Asian content but has music)
 */

const { BaseScraper } = require('./base');

class ScraperNyaa extends BaseScraper {
    constructor(proxyManager) {
        super(proxyManager, {
            name: 'nyaa',
            baseUrl: 'https://nyaa.si',
            searchPath: '/',
            rateLimit: 1000
        });

        this.mirrors = [
            'https://nyaa.si',
            'https://nyaa.land'
        ];
        this.currentMirror = 0;

        // Nyaa categories
        this.categories = {
            'all': '0_0',
            'audio': '2_0',
            'music': '2_2'
        };
    }

    getBaseUrl() {
        return this.mirrors[this.currentMirror];
    }

    async search(query, options = {}) {
        const { category = 'audio', page = 1 } = options;

        const categoryCode = this.categories[category] || this.categories.audio;
        const encodedQuery = encodeURIComponent(query);

        const url = `${this.getBaseUrl()}/?f=0&c=${categoryCode}&q=${encodedQuery}&p=${page}`;

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

        $('table.torrent-list tbody tr').each((i, elem) => {
            try {
                const row = $(elem);

                const categoryCell = row.find('td:nth-child(1)');
                const titleCell = row.find('td:nth-child(2)');
                const linksCell = row.find('td:nth-child(3)');
                const sizeCell = row.find('td:nth-child(4)');
                const dateCell = row.find('td:nth-child(5)');
                const seedersCell = row.find('td:nth-child(6)');
                const leechersCell = row.find('td:nth-child(7)');

                const titleLink = titleCell.find('a:not(.comments)').last();
                const title = titleLink.text().trim();
                const href = titleLink.attr('href');
                const id = href ? href.replace('/view/', '') : null;

                const magnetLink = linksCell.find('a[href^="magnet:"]').attr('href');
                const torrentLink = linksCell.find('a[href$=".torrent"]').attr('href');

                if (title && id) {
                    results.push({
                        id,
                        title,
                        url: `${this.getBaseUrl()}${href}`,
                        magnetUri: magnetLink,
                        torrentUrl: torrentLink ? `${this.getBaseUrl()}${torrentLink}` : null,
                        seeders: this.parseNumber(seedersCell.text()),
                        leechers: this.parseNumber(leechersCell.text()),
                        size: this.formatSize(sizeCell.text()),
                        sizeHuman: sizeCell.text().trim(),
                        uploadDate: dateCell.text().trim(),
                        source: 'nyaa'
                    });
                }
            } catch (error) {
                console.error('[nyaa] Error parsing row:', error.message);
            }
        });

        return results;
    }

    async getDetails(id) {
        const url = `${this.getBaseUrl()}/view/${id}`;

        const html = await this.fetch(url);
        return this.parseDetails(html, id);
    }

    parseDetails(html, id) {
        const $ = this.parseHTML(html);

        const title = $('h3.panel-title').first().text().trim();
        const magnetLink = $('a[href^="magnet:"]').attr('href');
        const torrentLink = $('a[href$=".torrent"]').attr('href');
        const infoHash = this.extractInfoHash(magnetLink || '');

        // Parse info from panel
        const info = {};
        $('div.panel-body div.row').each((i, elem) => {
            const label = $(elem).find('div.col-md-5').text().replace(':', '').trim().toLowerCase();
            const value = $(elem).find('div.col-md-7').text().trim();
            if (label && value) {
                info[label] = value;
            }
        });

        // Parse file list
        const files = [];
        $('div.torrent-file-list ul li').each((i, elem) => {
            const text = $(elem).text().trim();
            const sizeMatch = text.match(/\(([\d.]+\s*[KMGT]iB)\)$/i);
            files.push({
                name: sizeMatch ? text.replace(sizeMatch[0], '').trim() : text,
                size: sizeMatch ? this.formatSize(sizeMatch[1].replace('iB', 'B')) : 0,
                index: i
            });
        });

        return {
            id,
            title,
            magnetUri: magnetLink,
            torrentUrl: torrentLink ? `${this.getBaseUrl()}${torrentLink}` : null,
            infoHash,
            size: this.formatSize(info['file size'] || '0'),
            sizeHuman: info['file size'] || 'Unknown',
            seeders: this.parseNumber(info.seeders),
            leechers: this.parseNumber(info.leechers),
            uploadDate: info.date,
            uploader: info.submitter,
            category: info.category,
            files,
            fileCount: files.length,
            source: 'nyaa'
        };
    }
}

module.exports = { ScraperNyaa };
