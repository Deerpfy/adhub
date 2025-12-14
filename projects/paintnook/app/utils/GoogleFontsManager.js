/**
 * GoogleFontsManager - Manages Google Fonts loading and caching
 * Supports offline-first approach with IndexedDB caching
 */

export class GoogleFontsManager {
    constructor(app) {
        this.app = app;
        this.loadedFonts = new Set();
        this.fontCache = null;
        this.DB_NAME = 'paintnook-fonts';
        this.STORE_NAME = 'fonts';

        // Popular Google Fonts for design/art applications
        this.popularFonts = [
            // Sans-serif
            'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
            'Nunito', 'Raleway', 'Inter', 'Work Sans', 'Outfit',
            // Display
            'Bebas Neue', 'Oswald', 'Playfair Display', 'Anton', 'Righteous',
            'Pacifico', 'Lobster', 'Bangers', 'Permanent Marker', 'Press Start 2P',
            // Handwriting
            'Dancing Script', 'Great Vibes', 'Satisfy', 'Sacramento', 'Caveat',
            // Serif
            'Merriweather', 'Lora', 'PT Serif', 'Bitter', 'Source Serif Pro',
            // Monospace
            'Roboto Mono', 'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Space Mono',
            // Decorative/Artistic
            'Abril Fatface', 'Fredoka One', 'Courgette', 'Paytone One', 'Titan One'
        ];
    }

    /**
     * Initialize the font manager
     */
    async init() {
        try {
            await this.initDatabase();
            await this.loadCachedFonts();
            await this.loadPopularFonts();
        } catch (error) {
            console.warn('Failed to initialize Google Fonts Manager:', error);
        }
    }

    /**
     * Initialize IndexedDB for font caching
     */
    initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.fontCache = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME, { keyPath: 'family' });
                }
            };
        });
    }

    /**
     * Load fonts from cache
     */
    async loadCachedFonts() {
        if (!this.fontCache) return;

        return new Promise((resolve) => {
            const transaction = this.fontCache.transaction(this.STORE_NAME, 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const fonts = request.result;
                fonts.forEach(font => {
                    this.applyFontStyle(font.family, font.css);
                    this.loadedFonts.add(font.family);
                });
                resolve();
            };

            request.onerror = () => resolve();
        });
    }

    /**
     * Load popular fonts
     */
    async loadPopularFonts() {
        // Load fonts in batches to avoid overwhelming the browser
        const batchSize = 5;

        for (let i = 0; i < this.popularFonts.length; i += batchSize) {
            const batch = this.popularFonts.slice(i, i + batchSize);
            await Promise.all(batch.map(font => this.loadFont(font)));
        }
    }

    /**
     * Load a specific font
     */
    async loadFont(fontFamily) {
        if (this.loadedFonts.has(fontFamily)) {
            return true;
        }

        try {
            // Try to fetch from Google Fonts API
            const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;700&display=swap`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch font: ${fontFamily}`);
            }

            const css = await response.text();

            // Apply the font
            this.applyFontStyle(fontFamily, css);

            // Cache the font
            await this.cacheFont(fontFamily, css);

            this.loadedFonts.add(fontFamily);
            return true;
        } catch (error) {
            console.warn(`Failed to load font ${fontFamily}:`, error);
            return false;
        }
    }

    /**
     * Apply font CSS to document
     */
    applyFontStyle(fontFamily, css) {
        const styleId = `google-font-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;

        // Skip if already applied
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
    }

    /**
     * Cache font in IndexedDB
     */
    async cacheFont(fontFamily, css) {
        if (!this.fontCache) return;

        return new Promise((resolve) => {
            const transaction = this.fontCache.transaction(this.STORE_NAME, 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);

            store.put({
                family: fontFamily,
                css: css,
                timestamp: Date.now()
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => resolve();
        });
    }

    /**
     * Get list of loaded fonts
     */
    getLoadedFonts() {
        return Array.from(this.loadedFonts).sort();
    }

    /**
     * Get all available fonts (loaded + system)
     */
    getAllFonts() {
        const systemFonts = [
            'Arial', 'Helvetica', 'Times New Roman', 'Georgia',
            'Courier New', 'Verdana', 'Trebuchet MS', 'Impact',
            'Comic Sans MS', 'Palatino Linotype', 'Lucida Console'
        ];

        return {
            system: systemFonts,
            google: this.getLoadedFonts()
        };
    }

    /**
     * Search for fonts by name
     */
    searchFonts(query) {
        const lowerQuery = query.toLowerCase();
        return this.getLoadedFonts().filter(font =>
            font.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Load a custom font from URL or file
     */
    async loadCustomFont(fontFamily, url) {
        try {
            const fontFace = new FontFace(fontFamily, `url(${url})`);
            await fontFace.load();
            document.fonts.add(fontFace);
            this.loadedFonts.add(fontFamily);
            return true;
        } catch (error) {
            console.error(`Failed to load custom font ${fontFamily}:`, error);
            return false;
        }
    }

    /**
     * Load font from file (offline support)
     */
    async loadFontFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const fontName = file.name.replace(/\.[^.]+$/, '');
                    const fontFace = new FontFace(fontName, e.target.result);
                    await fontFace.load();
                    document.fonts.add(fontFace);
                    this.loadedFonts.add(fontName);
                    resolve(fontName);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }
}
