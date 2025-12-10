/**
 * API Catalog - IndexedDB Database Layer
 *
 * Offline-first databázová vrstva pro ukládání API katalogu.
 * Využívá IndexedDB pro perzistentní lokální úložiště.
 *
 * @version 1.0.0
 * @license MIT
 */

const DB_NAME = 'APICatalogDB';
const DB_VERSION = 1;
const STORES = {
    APIs: 'apis',
    CATEGORIES: 'categories',
    FAVORITES: 'favorites',
    SETTINGS: 'settings',
    SYNC_META: 'syncMeta'
};

/**
 * Singleton instance databáze
 */
let dbInstance = null;

/**
 * Otevře nebo vytvoří IndexedDB databázi
 * @returns {Promise<IDBDatabase>} Database instance
 */
async function openDatabase() {
    if (dbInstance) {
        return dbInstance;
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Failed to open database:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            dbInstance = request.result;

            // Handle connection close
            dbInstance.onclose = () => {
                dbInstance = null;
            };

            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // APIs store - hlavní úložiště API
            if (!db.objectStoreNames.contains(STORES.APIs)) {
                const apiStore = db.createObjectStore(STORES.APIs, { keyPath: 'id' });
                apiStore.createIndex('name', 'name', { unique: false });
                apiStore.createIndex('category', 'category', { unique: false });
                apiStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                apiStore.createIndex('platform', 'platform', { unique: false });
                apiStore.createIndex('createdAt', 'createdAt', { unique: false });
                apiStore.createIndex('updatedAt', 'updatedAt', { unique: false });
            }

            // Categories store - kategorie API
            if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
                const catStore = db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
                catStore.createIndex('name', 'name', { unique: true });
                catStore.createIndex('count', 'count', { unique: false });
            }

            // Favorites store - oblíbené API
            if (!db.objectStoreNames.contains(STORES.FAVORITES)) {
                const favStore = db.createObjectStore(STORES.FAVORITES, { keyPath: 'apiId' });
                favStore.createIndex('addedAt', 'addedAt', { unique: false });
            }

            // Settings store - uživatelské nastavení
            if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
            }

            // Sync metadata store - informace o synchronizaci
            if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
                db.createObjectStore(STORES.SYNC_META, { keyPath: 'key' });
            }
        };
    });
}

/**
 * Generický wrapper pro transakce
 * @param {string} storeName - Název object store
 * @param {string} mode - 'readonly' nebo 'readwrite'
 * @param {Function} callback - Funkce s operacemi
 * @returns {Promise<any>}
 */
async function withTransaction(storeName, mode, callback) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);

        let result;

        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);

        try {
            result = callback(store);
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * API CRUD Operations
 */
const APIStore = {
    /**
     * Získá všechna API
     * @returns {Promise<Array>}
     */
    async getAll() {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.APIs, 'readonly');
            const store = transaction.objectStore(STORES.APIs);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Získá API podle ID
     * @param {string} id
     * @returns {Promise<Object|null>}
     */
    async getById(id) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.APIs, 'readonly');
            const store = transaction.objectStore(STORES.APIs);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Získá API podle kategorie
     * @param {string} category
     * @returns {Promise<Array>}
     */
    async getByCategory(category) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.APIs, 'readonly');
            const store = transaction.objectStore(STORES.APIs);
            const index = store.index('category');
            const request = index.getAll(category);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Vyhledá API podle textu
     * @param {string} query
     * @returns {Promise<Array>}
     */
    async search(query) {
        const apis = await this.getAll();
        const normalizedQuery = query.toLowerCase().trim();

        if (!normalizedQuery) return apis;

        return apis.filter(api => {
            const searchableText = [
                api.name,
                api.description,
                api.category,
                ...(api.tags || [])
            ].join(' ').toLowerCase();

            return searchableText.includes(normalizedQuery);
        });
    },

    /**
     * Přidá nebo aktualizuje API
     * @param {Object} api
     * @returns {Promise<string>} ID přidaného/aktualizovaného API
     */
    async put(api) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.APIs, 'readwrite');
            const store = transaction.objectStore(STORES.APIs);

            // Přidáme timestamp pokud chybí
            const apiData = {
                ...api,
                id: api.id || this.generateId(),
                createdAt: api.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const request = store.put(apiData);

            request.onsuccess = () => resolve(apiData.id);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Hromadné přidání API
     * @param {Array} apis
     * @returns {Promise<number>} Počet přidaných API
     */
    async bulkPut(apis) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.APIs, 'readwrite');
            const store = transaction.objectStore(STORES.APIs);
            let count = 0;

            transaction.oncomplete = () => resolve(count);
            transaction.onerror = () => reject(transaction.error);

            apis.forEach(api => {
                const apiData = {
                    ...api,
                    id: api.id || this.generateId(),
                    createdAt: api.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                store.put(apiData);
                count++;
            });
        });
    },

    /**
     * Smaže API podle ID
     * @param {string} id
     * @returns {Promise<void>}
     */
    async delete(id) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.APIs, 'readwrite');
            const store = transaction.objectStore(STORES.APIs);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Smaže všechna API
     * @returns {Promise<void>}
     */
    async clear() {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.APIs, 'readwrite');
            const store = transaction.objectStore(STORES.APIs);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Získá počet API
     * @returns {Promise<number>}
     */
    async count() {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.APIs, 'readonly');
            const store = transaction.objectStore(STORES.APIs);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Generuje unikátní ID
     * @returns {string}
     */
    generateId() {
        return 'api_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
};

/**
 * Category Operations
 */
const CategoryStore = {
    async getAll() {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.CATEGORIES, 'readonly');
            const store = transaction.objectStore(STORES.CATEGORIES);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    async put(category) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.CATEGORIES, 'readwrite');
            const store = transaction.objectStore(STORES.CATEGORIES);
            const request = store.put(category);

            request.onsuccess = () => resolve(category.id);
            request.onerror = () => reject(request.error);
        });
    },

    async bulkPut(categories) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.CATEGORIES, 'readwrite');
            const store = transaction.objectStore(STORES.CATEGORIES);

            transaction.oncomplete = () => resolve(categories.length);
            transaction.onerror = () => reject(transaction.error);

            categories.forEach(cat => store.put(cat));
        });
    },

    async clear() {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.CATEGORIES, 'readwrite');
            const store = transaction.objectStore(STORES.CATEGORIES);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Přepočítá počty API v kategoriích
     */
    async recalculateCounts() {
        const apis = await APIStore.getAll();
        const counts = {};

        apis.forEach(api => {
            const cat = api.category || 'other';
            counts[cat] = (counts[cat] || 0) + 1;
        });

        const categories = await this.getAll();
        const updatedCategories = categories.map(cat => ({
            ...cat,
            count: counts[cat.id] || 0
        }));

        return this.bulkPut(updatedCategories);
    }
};

/**
 * Favorites Operations
 */
const FavoritesStore = {
    async getAll() {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.FAVORITES, 'readonly');
            const store = transaction.objectStore(STORES.FAVORITES);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    async add(apiId) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.FAVORITES, 'readwrite');
            const store = transaction.objectStore(STORES.FAVORITES);
            const request = store.put({
                apiId,
                addedAt: new Date().toISOString()
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async remove(apiId) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.FAVORITES, 'readwrite');
            const store = transaction.objectStore(STORES.FAVORITES);
            const request = store.delete(apiId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async isFavorite(apiId) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.FAVORITES, 'readonly');
            const store = transaction.objectStore(STORES.FAVORITES);
            const request = store.get(apiId);

            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async toggle(apiId) {
        const isFav = await this.isFavorite(apiId);
        if (isFav) {
            await this.remove(apiId);
            return false;
        } else {
            await this.add(apiId);
            return true;
        }
    }
};

/**
 * Settings Operations
 */
const SettingsStore = {
    async get(key, defaultValue = null) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.SETTINGS, 'readonly');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result ? request.result.value : defaultValue);
            };
            request.onerror = () => reject(request.error);
        });
    },

    async set(key, value) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.SETTINGS, 'readwrite');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.put({ key, value });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async remove(key) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.SETTINGS, 'readwrite');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};

/**
 * Sync Metadata Operations
 */
const SyncStore = {
    async getLastSync() {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.SYNC_META, 'readonly');
            const store = transaction.objectStore(STORES.SYNC_META);
            const request = store.get('lastSync');

            request.onsuccess = () => {
                resolve(request.result ? request.result.value : null);
            };
            request.onerror = () => reject(request.error);
        });
    },

    async setLastSync(timestamp = new Date().toISOString()) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.SYNC_META, 'readwrite');
            const store = transaction.objectStore(STORES.SYNC_META);
            const request = store.put({ key: 'lastSync', value: timestamp });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};

/**
 * Export/Import Functions
 */
const DataExport = {
    /**
     * Exportuje všechna data do JSON
     * @returns {Promise<Object>}
     */
    async exportAll() {
        const [apis, categories, favorites, lastSync] = await Promise.all([
            APIStore.getAll(),
            CategoryStore.getAll(),
            FavoritesStore.getAll(),
            SyncStore.getLastSync()
        ]);

        return {
            version: DB_VERSION,
            exportedAt: new Date().toISOString(),
            data: {
                apis,
                categories,
                favorites
            },
            meta: {
                lastSync,
                apiCount: apis.length,
                categoryCount: categories.length,
                favoriteCount: favorites.length
            }
        };
    },

    /**
     * Importuje data z JSON
     * @param {Object} exportData
     * @param {boolean} clearExisting - Smazat existující data před importem
     * @returns {Promise<Object>} Statistiky importu
     */
    async importAll(exportData, clearExisting = false) {
        const stats = { apis: 0, categories: 0, favorites: 0 };

        if (!exportData || !exportData.data) {
            throw new Error('Invalid export data format');
        }

        const { apis = [], categories = [], favorites = [] } = exportData.data;

        if (clearExisting) {
            await Promise.all([
                APIStore.clear(),
                CategoryStore.clear()
            ]);
        }

        if (categories.length > 0) {
            stats.categories = await CategoryStore.bulkPut(categories);
        }

        if (apis.length > 0) {
            stats.apis = await APIStore.bulkPut(apis);
        }

        // Import favorites
        for (const fav of favorites) {
            await FavoritesStore.add(fav.apiId);
            stats.favorites++;
        }

        await SyncStore.setLastSync();

        return stats;
    },

    /**
     * Stáhne export jako soubor
     */
    async downloadExport() {
        const data = await this.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `api-catalog-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

/**
 * Database Statistics
 */
const DBStats = {
    async getStats() {
        const [apis, categories, favorites] = await Promise.all([
            APIStore.getAll(),
            CategoryStore.getAll(),
            FavoritesStore.getAll()
        ]);

        // Počty podle kategorií
        const byCategory = {};
        apis.forEach(api => {
            const cat = api.category || 'other';
            byCategory[cat] = (byCategory[cat] || 0) + 1;
        });

        // Počty podle platformy
        const byPlatform = {};
        apis.forEach(api => {
            const platform = api.platform || 'unknown';
            byPlatform[platform] = (byPlatform[platform] || 0) + 1;
        });

        return {
            totalApis: apis.length,
            totalCategories: categories.length,
            totalFavorites: favorites.length,
            byCategory,
            byPlatform
        };
    }
};

// Export pro použití v aplikaci
window.APICatalogDB = {
    openDatabase,
    STORES,
    APIStore,
    CategoryStore,
    FavoritesStore,
    SettingsStore,
    SyncStore,
    DataExport,
    DBStats
};
