/**
 * SampleHub Server - Torrent Indexer Scraper
 * Backend for searching and parsing torrents from various indexers
 *
 * Features:
 * - Multi-source search (1337x, RuTracker, TPB, Nyaa)
 * - Torrent file parsing (get file list without downloading)
 * - Magnet link parsing
 * - Proxy/SOCKS5/Tor support for anonymity
 * - Rate limiting and caching
 *
 * LEGAL NOTICE:
 * This tool is for educational purposes and accessing legal content only.
 * Users are responsible for ensuring they have rights to access content.
 */

const express = require('express');
const cors = require('cors');
const { createScraperManager } = require('./scrapers');
const { TorrentParser } = require('./torrent-parser');
const { ProxyManager } = require('./proxy-manager');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// Initialize components
const proxyManager = new ProxyManager();
const scraperManager = createScraperManager(proxyManager);
const torrentParser = new TorrentParser(proxyManager);

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
    const item = cache.get(key);
    if (item && Date.now() - item.timestamp < CACHE_TTL) {
        return item.data;
    }
    cache.delete(key);
    return null;
}

function setCache(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
}

// ===========================================
// API ENDPOINTS
// ===========================================

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '1.0.0',
        sources: scraperManager.getSources(),
        proxyEnabled: proxyManager.isEnabled()
    });
});

/**
 * Get available sources
 */
app.get('/api/sources', (req, res) => {
    res.json({
        sources: scraperManager.getSources(),
        categories: ['samples', 'loops', 'drums', 'synth', 'vocals', 'fx', 'packs']
    });
});

/**
 * Search torrents across all sources
 * GET /api/search?q=dubstep+sample+pack&sources=1337x,rutracker&category=samples
 */
app.get('/api/search', async (req, res) => {
    try {
        const { q, sources, category, page = 1, limit = 50 } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({ error: 'Query must be at least 2 characters' });
        }

        // Check cache
        const cacheKey = `search:${q}:${sources}:${category}:${page}`;
        const cached = getCached(cacheKey);
        if (cached) {
            return res.json({ ...cached, cached: true });
        }

        // Parse sources
        const sourceList = sources ? sources.split(',') : scraperManager.getEnabledSources();

        // Search
        const results = await scraperManager.search(q, {
            sources: sourceList,
            category,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        // Filter for audio-related content
        const audioResults = filterAudioContent(results);

        const response = {
            query: q,
            sources: sourceList,
            total: audioResults.length,
            results: audioResults,
            cached: false
        };

        setCache(cacheKey, response);
        res.json(response);

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed', message: error.message });
    }
});

/**
 * Get torrent details and file list
 * GET /api/torrent/:source/:id
 */
app.get('/api/torrent/:source/:id', async (req, res) => {
    try {
        const { source, id } = req.params;

        const cacheKey = `torrent:${source}:${id}`;
        const cached = getCached(cacheKey);
        if (cached) {
            return res.json({ ...cached, cached: true });
        }

        const details = await scraperManager.getTorrentDetails(source, id);

        if (!details) {
            return res.status(404).json({ error: 'Torrent not found' });
        }

        setCache(cacheKey, details);
        res.json({ ...details, cached: false });

    } catch (error) {
        console.error('Torrent details error:', error);
        res.status(500).json({ error: 'Failed to get torrent details', message: error.message });
    }
});

/**
 * Parse magnet link and get file list
 * POST /api/parse-magnet
 * Body: { magnetUri: "magnet:?xt=..." }
 */
app.post('/api/parse-magnet', async (req, res) => {
    try {
        const { magnetUri } = req.body;

        if (!magnetUri || !magnetUri.startsWith('magnet:')) {
            return res.status(400).json({ error: 'Invalid magnet URI' });
        }

        const parsed = await torrentParser.parseMagnet(magnetUri);
        res.json(parsed);

    } catch (error) {
        console.error('Parse magnet error:', error);
        res.status(500).json({ error: 'Failed to parse magnet', message: error.message });
    }
});

/**
 * Parse torrent file and get file list
 * POST /api/parse-torrent
 * Body: { torrentUrl: "https://..." } or { torrentData: "base64..." }
 */
app.post('/api/parse-torrent', async (req, res) => {
    try {
        const { torrentUrl, torrentData } = req.body;

        let parsed;
        if (torrentUrl) {
            parsed = await torrentParser.parseFromUrl(torrentUrl);
        } else if (torrentData) {
            const buffer = Buffer.from(torrentData, 'base64');
            parsed = await torrentParser.parseFromBuffer(buffer);
        } else {
            return res.status(400).json({ error: 'Provide torrentUrl or torrentData' });
        }

        res.json(parsed);

    } catch (error) {
        console.error('Parse torrent error:', error);
        res.status(500).json({ error: 'Failed to parse torrent', message: error.message });
    }
});

/**
 * Get file list from torrent without downloading content
 * POST /api/files
 * Body: { magnetUri: "magnet:?..." } or { torrentUrl: "..." }
 */
app.post('/api/files', async (req, res) => {
    try {
        const { magnetUri, torrentUrl, infoHash } = req.body;

        let files;
        if (magnetUri) {
            files = await torrentParser.getFilesFromMagnet(magnetUri);
        } else if (torrentUrl) {
            files = await torrentParser.getFilesFromUrl(torrentUrl);
        } else if (infoHash) {
            files = await torrentParser.getFilesFromHash(infoHash);
        } else {
            return res.status(400).json({ error: 'Provide magnetUri, torrentUrl, or infoHash' });
        }

        // Filter audio files
        const audioFiles = files.filter(f => isAudioFile(f.name));

        res.json({
            totalFiles: files.length,
            audioFiles: audioFiles.length,
            files: audioFiles,
            allFiles: files
        });

    } catch (error) {
        console.error('Get files error:', error);
        res.status(500).json({ error: 'Failed to get files', message: error.message });
    }
});

/**
 * Configure proxy settings
 * POST /api/proxy/config
 */
app.post('/api/proxy/config', (req, res) => {
    try {
        const { type, host, port, username, password } = req.body;
        proxyManager.configure({ type, host, port, username, password });
        res.json({ success: true, enabled: proxyManager.isEnabled() });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * Get proxy status
 */
app.get('/api/proxy/status', async (req, res) => {
    try {
        const status = await proxyManager.testConnection();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Disable proxy
 */
app.post('/api/proxy/disable', (req, res) => {
    proxyManager.disable();
    res.json({ success: true, enabled: false });
});

// ===========================================
// HELPER FUNCTIONS
// ===========================================

const AUDIO_EXTENSIONS = [
    '.wav', '.mp3', '.flac', '.aiff', '.aif', '.ogg',
    '.m4a', '.wma', '.opus', '.mid', '.midi'
];

function isAudioFile(filename) {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return AUDIO_EXTENSIONS.includes(ext);
}

function filterAudioContent(results) {
    // Filter results that likely contain audio samples
    const keywords = [
        'sample', 'loop', 'drum', 'synth', 'bass', 'vocal',
        'fx', 'sound', 'kit', 'pack', 'wav', 'flac', 'audio',
        'producer', 'beat', 'instrument', 'splice', 'cymatics',
        'vengeance', 'production', 'music'
    ];

    return results.filter(result => {
        const title = result.title.toLowerCase();
        const hasKeyword = keywords.some(kw => title.includes(kw));
        const hasAudioExt = AUDIO_EXTENSIONS.some(ext =>
            title.includes(ext.substring(1))
        );
        return hasKeyword || hasAudioExt;
    });
}

// ===========================================
// ERROR HANDLING
// ===========================================

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// ===========================================
// START SERVER
// ===========================================

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║           SampleHub Server v1.0.0                         ║
║═══════════════════════════════════════════════════════════║
║  API running on: http://localhost:${PORT}                   ║
║  Sources: ${scraperManager.getSources().join(', ').substring(0, 35)}...           ║
║  Proxy: ${proxyManager.isEnabled() ? 'Enabled' : 'Disabled'}                                        ║
╠═══════════════════════════════════════════════════════════╣
║  LEGAL NOTICE:                                            ║
║  This tool is for educational purposes only.              ║
║  Users must ensure they have rights to access content.    ║
╚═══════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
