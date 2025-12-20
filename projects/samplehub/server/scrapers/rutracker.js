/**
 * RuTracker Scraper
 * Scrapes torrent listings from RuTracker (requires handling of Russian text)
 * Note: RuTracker is one of the best sources for high-quality sample packs
 */

const { BaseScraper } = require('./base');

class ScraperRuTracker extends BaseScraper {
    constructor(proxyManager) {
        super(proxyManager, {
            name: 'rutracker',
            baseUrl: 'https://rutracker.org',
            searchPath: '/forum/tracker.php',
            rateLimit: 2000
        });

        this.mirrors = [
            'https://rutracker.org',
            'https://rutracker.net',
            'https://rutracker.nl'
        ];
        this.currentMirror = 0;

        // RuTracker forum IDs for audio/samples
        this.categories = {
            'all': '',
            'samples': '1760',           // Сэмплы, библиотеки
            'soundfonts': '1782',        // Саундфонты
            'loops': '408',              // Loops и сэмплы
            'drums': '1886',             // Ударные сэмплы
            'kontakt': '557',            // Kontakt библиотеки
            'vst_instruments': '890',    // VST инструменты
            'music_software': '1310'     // Музыкальный софт
        };
    }

    getBaseUrl() {
        return this.mirrors[this.currentMirror];
    }

    async search(query, options = {}) {
        const { category = 'samples', page = 1 } = options;

        const forumId = this.categories[category] || '';
        const encodedQuery = encodeURIComponent(query);
        const start = (page - 1) * 50;

        let url = `${this.getBaseUrl()}/forum/tracker.php?nm=${encodedQuery}&start=${start}`;
        if (forumId) {
            url += `&f=${forumId}`;
        }

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

        // RuTracker uses table#tor-tbl
        $('table#tor-tbl tbody tr').each((i, elem) => {
            try {
                const row = $(elem);

                // Skip header
                if (row.find('th').length > 0) return;

                const forumCell = row.find('td.f-name-col');
                const titleCell = row.find('td.t-title-col');
                const sizeCell = row.find('td.tor-size');
                const seedersCell = row.find('td.seedmed, td.seed');
                const leechersCell = row.find('td.leechmed, td.leech');
                const dateCell = row.find('td:has(p)').last();

                const titleLink = titleCell.find('a.tLink');
                const title = titleLink.text().trim();
                const href = titleLink.attr('href');
                const idMatch = href ? href.match(/t=(\d+)/) : null;
                const id = idMatch ? idMatch[1] : null;

                // RuTracker uses data-ts_text for raw size
                const sizeBytes = sizeCell.attr('data-ts_text');
                const sizeHuman = sizeCell.find('a').text().trim() || sizeCell.text().trim();

                if (title && id) {
                    results.push({
                        id,
                        title,
                        url: `${this.getBaseUrl()}/forum/viewtopic.php?t=${id}`,
                        magnetUri: null, // Need to fetch from detail page
                        torrentUrl: `${this.getBaseUrl()}/forum/dl.php?t=${id}`,
                        seeders: this.parseNumber(seedersCell.text()),
                        leechers: this.parseNumber(leechersCell.text()),
                        size: sizeBytes ? parseInt(sizeBytes) : this.formatSize(sizeHuman),
                        sizeHuman,
                        uploadDate: dateCell.find('p').text().trim(),
                        forum: forumCell.find('a').text().trim(),
                        source: 'rutracker'
                    });
                }
            } catch (error) {
                console.error('[rutracker] Error parsing row:', error.message);
            }
        });

        return results;
    }

    async getDetails(id) {
        const url = `${this.getBaseUrl()}/forum/viewtopic.php?t=${id}`;

        const html = await this.fetch(url);
        return this.parseDetails(html, id);
    }

    parseDetails(html, id) {
        const $ = this.parseHTML(html);

        const title = $('h1.maintitle a#topic-title').text().trim() ||
                     $('a#topic-title').text().trim();

        // Find magnet link
        const magnetLink = $('a[href^="magnet:"]').attr('href');
        const infoHash = this.extractInfoHash(magnetLink || '');

        // Parse torrent info box
        const info = {};
        $('table.attach tbody tr').each((i, elem) => {
            const cells = $(elem).find('td');
            if (cells.length >= 2) {
                const key = $(cells[0]).text().replace(':', '').trim().toLowerCase();
                const value = $(cells[1]).text().trim();
                if (key && value) {
                    info[key] = value;
                }
            }
        });

        // Alternative info parsing from .post_body
        const postBody = $('.post_body').first();

        // Parse file list from spoiler
        const files = [];
        $('div.sp-wrap var.spoiler-body pre, .post_body .sp-body').first().find('span, div').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text && !text.includes('─') && !text.includes('│')) {
                const sizeMatch = text.match(/\((\d[\d.,]+\s*[KMGT]?B)\)/i);
                files.push({
                    name: sizeMatch ? text.replace(sizeMatch[0], '').trim() : text,
                    size: sizeMatch ? this.formatSize(sizeMatch[1]) : 0,
                    index: i
                });
            }
        });

        // Get description/release info
        const description = postBody.text().substring(0, 2000).trim();

        return {
            id,
            title,
            magnetUri: magnetLink,
            torrentUrl: `${this.getBaseUrl()}/forum/dl.php?t=${id}`,
            infoHash,
            size: this.formatSize(info['размер'] || info['size'] || '0'),
            sizeHuman: info['размер'] || info['size'] || 'Unknown',
            seeders: this.parseNumber(info['сиды'] || info['seeders']),
            leechers: this.parseNumber(info['личи'] || info['leechers']),
            uploadDate: info['зарегистрирован'] || info['registered'],
            uploader: info['автор'] || info['author'],
            category: info['форум'] || info['forum'],
            files,
            fileCount: files.length,
            description,
            source: 'rutracker'
        };
    }
}

module.exports = { ScraperRuTracker };
