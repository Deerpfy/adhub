/**
 * PDF Editor - IndexedDB Storage Manager
 * Handles persistent storage for recent files, preferences, and signatures
 */

const PDFStorage = {
    DB_NAME: 'PDFEditorDB',
    DB_VERSION: 1,
    db: null,

    // Store names
    STORES: {
        FILES: 'recentFiles',
        PREFERENCES: 'preferences',
        SIGNATURES: 'signatures'
    },

    /**
     * Initialize the database
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Recent files store
                if (!db.objectStoreNames.contains(this.STORES.FILES)) {
                    const filesStore = db.createObjectStore(this.STORES.FILES, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    filesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    filesStore.createIndex('name', 'name', { unique: false });
                }

                // Preferences store
                if (!db.objectStoreNames.contains(this.STORES.PREFERENCES)) {
                    db.createObjectStore(this.STORES.PREFERENCES, { keyPath: 'key' });
                }

                // Signatures store
                if (!db.objectStoreNames.contains(this.STORES.SIGNATURES)) {
                    const sigStore = db.createObjectStore(this.STORES.SIGNATURES, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    sigStore.createIndex('type', 'type', { unique: false });
                    sigStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    },

    /**
     * Ensure database is initialized
     */
    async ensureDB() {
        if (!this.db) {
            await this.init();
        }
        return this.db;
    },

    // =========================================
    // Recent Files Management
    // =========================================

    /**
     * Save a recent file reference
     * @param {Object} fileInfo - File information object
     * @returns {Promise<number>} - File ID
     */
    async saveRecentFile(fileInfo) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.FILES], 'readwrite');
            const store = transaction.objectStore(this.STORES.FILES);

            const record = {
                name: fileInfo.name,
                size: fileInfo.size,
                pageCount: fileInfo.pageCount || null,
                thumbnail: fileInfo.thumbnail || null, // Base64 thumbnail
                data: fileInfo.data || null, // Optional: store actual file data
                timestamp: Date.now()
            };

            const request = store.add(record);

            request.onsuccess = () => {
                // Cleanup old files (keep only last 10)
                this.cleanupOldFiles();
                resolve(request.result);
            };

            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get recent files
     * @param {number} limit - Maximum number of files to return
     * @returns {Promise<Array>}
     */
    async getRecentFiles(limit = 10) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.FILES], 'readonly');
            const store = transaction.objectStore(this.STORES.FILES);
            const index = store.index('timestamp');

            const files = [];
            const request = index.openCursor(null, 'prev'); // Descending order

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && files.length < limit) {
                    files.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(files);
                }
            };

            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Delete a recent file
     * @param {number} id - File ID
     * @returns {Promise<void>}
     */
    async deleteRecentFile(id) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.FILES], 'readwrite');
            const store = transaction.objectStore(this.STORES.FILES);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Clear all recent files
     * @returns {Promise<void>}
     */
    async clearRecentFiles() {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.FILES], 'readwrite');
            const store = transaction.objectStore(this.STORES.FILES);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Cleanup old files (keep only last 10)
     */
    async cleanupOldFiles() {
        const files = await this.getRecentFiles(100);
        if (files.length > 10) {
            const toDelete = files.slice(10);
            for (const file of toDelete) {
                await this.deleteRecentFile(file.id);
            }
        }
    },

    // =========================================
    // Preferences Management
    // =========================================

    /**
     * Save a preference
     * @param {string} key - Preference key
     * @param {any} value - Preference value
     * @returns {Promise<void>}
     */
    async setPreference(key, value) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.PREFERENCES], 'readwrite');
            const store = transaction.objectStore(this.STORES.PREFERENCES);
            const request = store.put({ key, value, timestamp: Date.now() });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get a preference
     * @param {string} key - Preference key
     * @param {any} defaultValue - Default value if not found
     * @returns {Promise<any>}
     */
    async getPreference(key, defaultValue = null) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.PREFERENCES], 'readonly');
            const store = transaction.objectStore(this.STORES.PREFERENCES);
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result ? request.result.value : defaultValue);
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get all preferences
     * @returns {Promise<Object>}
     */
    async getAllPreferences() {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.PREFERENCES], 'readonly');
            const store = transaction.objectStore(this.STORES.PREFERENCES);
            const request = store.getAll();

            request.onsuccess = () => {
                const prefs = {};
                request.result.forEach(item => {
                    prefs[item.key] = item.value;
                });
                resolve(prefs);
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Delete a preference
     * @param {string} key - Preference key
     * @returns {Promise<void>}
     */
    async deletePreference(key) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.PREFERENCES], 'readwrite');
            const store = transaction.objectStore(this.STORES.PREFERENCES);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    // =========================================
    // Signatures Management
    // =========================================

    /**
     * Save a signature
     * @param {Object} signature - Signature object
     * @returns {Promise<number>} - Signature ID
     */
    async saveSignature(signature) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.SIGNATURES], 'readwrite');
            const store = transaction.objectStore(this.STORES.SIGNATURES);

            const record = {
                type: signature.type, // 'draw', 'upload', 'text'
                data: signature.data, // Base64 image or text
                font: signature.font || null, // Font family for text signatures
                color: signature.color || '#000000',
                name: signature.name || 'Signature',
                timestamp: Date.now()
            };

            const request = store.add(record);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get all signatures
     * @returns {Promise<Array>}
     */
    async getSignatures() {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.SIGNATURES], 'readonly');
            const store = transaction.objectStore(this.STORES.SIGNATURES);
            const index = store.index('timestamp');
            const request = index.getAll();

            request.onsuccess = () => resolve(request.result.reverse());
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get signatures by type
     * @param {string} type - Signature type ('draw', 'upload', 'text')
     * @returns {Promise<Array>}
     */
    async getSignaturesByType(type) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.SIGNATURES], 'readonly');
            const store = transaction.objectStore(this.STORES.SIGNATURES);
            const index = store.index('type');
            const request = index.getAll(type);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Delete a signature
     * @param {number} id - Signature ID
     * @returns {Promise<void>}
     */
    async deleteSignature(id) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.SIGNATURES], 'readwrite');
            const store = transaction.objectStore(this.STORES.SIGNATURES);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Clear all signatures
     * @returns {Promise<void>}
     */
    async clearSignatures() {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.SIGNATURES], 'readwrite');
            const store = transaction.objectStore(this.STORES.SIGNATURES);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    // =========================================
    // Utility Methods
    // =========================================

    /**
     * Export all data as JSON
     * @returns {Promise<Object>}
     */
    async exportData() {
        const files = await this.getRecentFiles(100);
        const prefs = await this.getAllPreferences();
        const signatures = await this.getSignatures();

        return {
            recentFiles: files,
            preferences: prefs,
            signatures: signatures,
            exportedAt: new Date().toISOString()
        };
    },

    /**
     * Clear all data
     * @returns {Promise<void>}
     */
    async clearAll() {
        await this.clearRecentFiles();
        await this.clearSignatures();

        // Clear preferences
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.PREFERENCES], 'readwrite');
            const store = transaction.objectStore(this.STORES.PREFERENCES);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get storage usage estimate
     * @returns {Promise<Object>}
     */
    async getStorageUsage() {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: estimate.usage,
                quota: estimate.quota,
                usagePercent: ((estimate.usage / estimate.quota) * 100).toFixed(2)
            };
        }
        return null;
    }
};

// Default preferences
const DEFAULT_PREFERENCES = {
    language: 'cs',
    defaultCompression: 'medium',
    signatureColor: '#000000',
    signatureFont: 'Dancing Script',
    autoSaveSignatures: true,
    showThumbnails: true,
    zoomLevel: 100
};

/**
 * Initialize storage with default preferences
 */
async function initializeStorage() {
    try {
        await PDFStorage.init();

        // Set default preferences if not already set
        for (const [key, value] of Object.entries(DEFAULT_PREFERENCES)) {
            const existing = await PDFStorage.getPreference(key);
            if (existing === null) {
                await PDFStorage.setPreference(key, value);
            }
        }

        console.log('PDF Editor Storage initialized');
        return true;
    } catch (error) {
        console.error('Failed to initialize storage:', error);
        return false;
    }
}

// Export for use in other modules
window.PDFStorage = PDFStorage;
window.initializeStorage = initializeStorage;
window.DEFAULT_PREFERENCES = DEFAULT_PREFERENCES;
