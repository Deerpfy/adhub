/**
 * Torrent Parser
 * Parses magnet URIs and .torrent files to extract metadata and file lists
 */

const parseTorrent = require('parse-torrent');
const axios = require('axios');

class TorrentParser {
    constructor() {
        // Audio file extensions to identify sample packs
        this.audioExtensions = [
            '.wav', '.mp3', '.flac', '.aiff', '.aif', '.ogg',
            '.m4a', '.wma', '.ape', '.alac', '.opus'
        ];

        // Sample pack specific extensions
        this.samplePackExtensions = [
            '.nki', '.nkm', '.nkc', '.nkx',  // Kontakt
            '.exs', '.esx',                   // EXS24
            '.sf2', '.sfz', '.gig',          // Soundfonts
            '.fxp', '.fxb',                  // VST presets
            '.adg', '.als',                  // Ableton
            '.sesx', '.ptx',                 // Pro Tools/Audition
        ];
    }

    /**
     * Parse magnet URI
     */
    parseMagnet(magnetUri) {
        try {
            const parsed = parseTorrent(magnetUri);

            return {
                success: true,
                infoHash: parsed.infoHash,
                name: parsed.name || 'Unknown',
                announce: parsed.announce || [],
                urlList: parsed.urlList || [],
                xt: parsed.xt,
                // Note: magnet URIs don't contain file list
                files: null,
                isComplete: false
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Parse .torrent file buffer
     */
    parseTorrentBuffer(buffer) {
        try {
            const parsed = parseTorrent(buffer);

            const files = (parsed.files || []).map((file, index) => ({
                name: file.name,
                path: file.path,
                length: file.length,
                offset: file.offset,
                index,
                isAudio: this.isAudioFile(file.name),
                isSamplePack: this.isSamplePackFile(file.name)
            }));

            // Calculate audio statistics
            const audioFiles = files.filter(f => f.isAudio);
            const samplePackFiles = files.filter(f => f.isSamplePack);
            const totalAudioSize = audioFiles.reduce((sum, f) => sum + f.length, 0);

            return {
                success: true,
                infoHash: parsed.infoHash,
                name: parsed.name || 'Unknown',
                announce: parsed.announce || [],
                urlList: parsed.urlList || [],
                pieceLength: parsed.pieceLength,
                lastPieceLength: parsed.lastPieceLength,
                pieces: parsed.pieces?.length || 0,
                length: parsed.length,
                files,
                fileCount: files.length,
                audioFileCount: audioFiles.length,
                samplePackFileCount: samplePackFiles.length,
                totalAudioSize,
                created: parsed.created,
                createdBy: parsed.createdBy,
                comment: parsed.comment,
                isComplete: true,
                // Content type detection
                contentType: this.detectContentType(files)
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Fetch and parse .torrent file from URL
     */
    async parseTorrentUrl(url, options = {}) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: options.timeout || 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                httpsAgent: options.agent
            });

            return this.parseTorrentBuffer(Buffer.from(response.data));
        } catch (error) {
            return {
                success: false,
                error: `Failed to fetch torrent: ${error.message}`
            };
        }
    }

    /**
     * Check if file is an audio file
     */
    isAudioFile(filename) {
        const ext = this.getExtension(filename);
        return this.audioExtensions.includes(ext);
    }

    /**
     * Check if file is a sample pack specific file
     */
    isSamplePackFile(filename) {
        const ext = this.getExtension(filename);
        return this.samplePackExtensions.includes(ext);
    }

    /**
     * Get file extension
     */
    getExtension(filename) {
        const match = filename.match(/\.[a-zA-Z0-9]+$/);
        return match ? match[0].toLowerCase() : '';
    }

    /**
     * Detect content type based on files
     */
    detectContentType(files) {
        if (!files || files.length === 0) return 'unknown';

        const audioFiles = files.filter(f => f.isAudio);
        const samplePackFiles = files.filter(f => f.isSamplePack);

        // Mostly audio files = sample pack
        const audioRatio = audioFiles.length / files.length;

        if (samplePackFiles.length > 0) {
            return 'sample-library'; // Kontakt, EXS24, etc.
        } else if (audioRatio > 0.5) {
            return 'sample-pack'; // Raw audio samples
        } else if (audioRatio > 0.1) {
            return 'mixed'; // Contains some audio
        } else {
            return 'other';
        }
    }

    /**
     * Extract file tree structure
     */
    buildFileTree(files) {
        const tree = {};

        for (const file of files) {
            const parts = file.path.split('/');
            let current = tree;

            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part]) {
                    current[part] = { _type: 'folder', _children: {} };
                }
                current = current[part]._children;
            }

            // Add file
            const fileName = parts[parts.length - 1];
            current[fileName] = {
                _type: 'file',
                ...file
            };
        }

        return tree;
    }

    /**
     * Get audio file summary
     */
    getAudioSummary(files) {
        const audioFiles = files.filter(f => f.isAudio);

        // Group by extension
        const byExtension = {};
        for (const file of audioFiles) {
            const ext = this.getExtension(file.name);
            if (!byExtension[ext]) {
                byExtension[ext] = { count: 0, size: 0 };
            }
            byExtension[ext].count++;
            byExtension[ext].size += file.length;
        }

        // Detect quality indicators
        const hasLossless = audioFiles.some(f => {
            const ext = this.getExtension(f.name);
            return ['.wav', '.flac', '.aiff', '.aif'].includes(ext);
        });

        const hasHighRes = audioFiles.some(f => {
            // Large WAV files might be 24/32-bit or high sample rate
            return f.name.includes('24bit') ||
                   f.name.includes('32bit') ||
                   f.name.includes('96k') ||
                   f.name.includes('192k');
        });

        return {
            totalFiles: audioFiles.length,
            totalSize: audioFiles.reduce((sum, f) => sum + f.length, 0),
            byExtension,
            hasLossless,
            hasHighRes,
            formats: Object.keys(byExtension).map(ext => ext.replace('.', '').toUpperCase())
        };
    }

    /**
     * Filter files by pattern
     */
    filterFiles(files, options = {}) {
        let filtered = files;

        // Filter by extension
        if (options.extensions && options.extensions.length > 0) {
            const exts = options.extensions.map(e => e.toLowerCase().startsWith('.') ? e : `.${e}`);
            filtered = filtered.filter(f => exts.includes(this.getExtension(f.name)));
        }

        // Filter by audio only
        if (options.audioOnly) {
            filtered = filtered.filter(f => f.isAudio);
        }

        // Filter by sample pack files only
        if (options.samplePackOnly) {
            filtered = filtered.filter(f => f.isSamplePack);
        }

        // Filter by minimum size
        if (options.minSize) {
            filtered = filtered.filter(f => f.length >= options.minSize);
        }

        // Filter by maximum size
        if (options.maxSize) {
            filtered = filtered.filter(f => f.length <= options.maxSize);
        }

        // Filter by name pattern
        if (options.pattern) {
            const regex = new RegExp(options.pattern, 'i');
            filtered = filtered.filter(f => regex.test(f.name));
        }

        return filtered;
    }

    /**
     * Create magnet URI from info hash
     */
    createMagnetUri(infoHash, name = '', trackers = []) {
        let magnet = `magnet:?xt=urn:btih:${infoHash}`;

        if (name) {
            magnet += `&dn=${encodeURIComponent(name)}`;
        }

        for (const tracker of trackers) {
            magnet += `&tr=${encodeURIComponent(tracker)}`;
        }

        return magnet;
    }

    /**
     * Get default trackers for music/sample content
     */
    getDefaultTrackers() {
        return [
            'udp://tracker.opentrackr.org:1337/announce',
            'udp://open.stealth.si:80/announce',
            'udp://tracker.torrent.eu.org:451/announce',
            'udp://tracker.bittor.pw:1337/announce',
            'udp://public.popcorn-tracker.org:6969/announce',
            'udp://tracker.dler.org:6969/announce',
            'udp://exodus.desync.com:6969/announce',
            'udp://open.demonii.com:1337/announce'
        ];
    }
}

module.exports = { TorrentParser };
