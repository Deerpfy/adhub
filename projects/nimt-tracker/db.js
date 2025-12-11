/**
 * AI Visibility Tracker - IndexedDB Database Module
 *
 * Offline-first database wrapper using IndexedDB
 * Stores all tracking data locally with no server dependencies
 */

const DB_NAME = 'AIVisibilityTrackerDB';
const DB_VERSION = 1;

// Object store names
const STORES = {
    BRANDS: 'brands',
    PROMPTS: 'prompts',
    SOURCES: 'sources',
    COMPETITORS: 'competitors',
    ACTIVITY: 'activity',
    SETTINGS: 'settings'
};

class Database {
    constructor() {
        this.db = null;
        this.isReady = false;
    }

    /**
     * Initialize the database
     * Creates object stores and indexes on first run
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isReady = true;
                console.log('Database initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('Upgrading database schema...');

                // Brands store
                if (!db.objectStoreNames.contains(STORES.BRANDS)) {
                    const brandsStore = db.createObjectStore(STORES.BRANDS, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    brandsStore.createIndex('name', 'name', { unique: false });
                    brandsStore.createIndex('isPrimary', 'isPrimary', { unique: false });
                    brandsStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Prompts store
                if (!db.objectStoreNames.contains(STORES.PROMPTS)) {
                    const promptsStore = db.createObjectStore(STORES.PROMPTS, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    promptsStore.createIndex('brandId', 'brandId', { unique: false });
                    promptsStore.createIndex('aiModel', 'aiModel', { unique: false });
                    promptsStore.createIndex('createdAt', 'createdAt', { unique: false });
                    promptsStore.createIndex('mentioned', 'mentioned', { unique: false });
                }

                // Sources store
                if (!db.objectStoreNames.contains(STORES.SOURCES)) {
                    const sourcesStore = db.createObjectStore(STORES.SOURCES, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    sourcesStore.createIndex('type', 'type', { unique: false });
                    sourcesStore.createIndex('brandId', 'brandId', { unique: false });
                    sourcesStore.createIndex('citations', 'citations', { unique: false });
                    sourcesStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Competitors store
                if (!db.objectStoreNames.contains(STORES.COMPETITORS)) {
                    const competitorsStore = db.createObjectStore(STORES.COMPETITORS, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    competitorsStore.createIndex('name', 'name', { unique: false });
                    competitorsStore.createIndex('sov', 'sov', { unique: false });
                    competitorsStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Activity log store
                if (!db.objectStoreNames.contains(STORES.ACTIVITY)) {
                    const activityStore = db.createObjectStore(STORES.ACTIVITY, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    activityStore.createIndex('type', 'type', { unique: false });
                    activityStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Settings store
                if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                    db.createObjectStore(STORES.SETTINGS, {
                        keyPath: 'key'
                    });
                }
            };
        });
    }

    /**
     * Generic method to add an item to a store
     */
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            // Add timestamps
            data.createdAt = data.createdAt || Date.now();
            data.updatedAt = Date.now();

            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic method to update an item in a store
     */
    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            // Update timestamp
            data.updatedAt = Date.now();

            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic method to get an item by ID
     */
    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic method to get all items from a store
     */
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic method to delete an item by ID
     */
    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get items by index value
     */
    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Count items in a store
     */
    async count(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all items from a store
     */
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // =============================================
    // BRAND SPECIFIC METHODS
    // =============================================

    async addBrand(brand) {
        const id = await this.add(STORES.BRANDS, brand);
        await this.logActivity('brand_add', `Přidána značka "${brand.name}"`);
        return id;
    }

    async updateBrand(brand) {
        await this.update(STORES.BRANDS, brand);
        await this.logActivity('brand_update', `Aktualizována značka "${brand.name}"`);
    }

    async getBrand(id) {
        return this.get(STORES.BRANDS, id);
    }

    async getAllBrands() {
        return this.getAll(STORES.BRANDS);
    }

    async deleteBrand(id) {
        const brand = await this.get(STORES.BRANDS, id);
        await this.delete(STORES.BRANDS, id);
        if (brand) {
            await this.logActivity('brand_delete', `Smazána značka "${brand.name}"`);
        }
    }

    async getPrimaryBrand() {
        const brands = await this.getByIndex(STORES.BRANDS, 'isPrimary', true);
        return brands[0] || null;
    }

    // =============================================
    // PROMPT SPECIFIC METHODS
    // =============================================

    async addPrompt(prompt) {
        const id = await this.add(STORES.PROMPTS, prompt);
        await this.logActivity('prompt_add', `Přidán nový prompt pro sledování`);
        return id;
    }

    async updatePrompt(prompt) {
        await this.update(STORES.PROMPTS, prompt);
        await this.logActivity('prompt_update', `Aktualizován prompt`);
    }

    async getPrompt(id) {
        return this.get(STORES.PROMPTS, id);
    }

    async getAllPrompts() {
        return this.getAll(STORES.PROMPTS);
    }

    async deletePrompt(id) {
        await this.delete(STORES.PROMPTS, id);
        await this.logActivity('prompt_delete', `Smazán prompt`);
    }

    async getPromptsByBrand(brandId) {
        return this.getByIndex(STORES.PROMPTS, 'brandId', brandId);
    }

    async getPromptsByAiModel(aiModel) {
        return this.getByIndex(STORES.PROMPTS, 'aiModel', aiModel);
    }

    async getMentionedPrompts() {
        return this.getByIndex(STORES.PROMPTS, 'mentioned', true);
    }

    // =============================================
    // SOURCE SPECIFIC METHODS
    // =============================================

    async addSource(source) {
        const id = await this.add(STORES.SOURCES, source);
        await this.logActivity('source_add', `Přidán zdroj "${source.name}"`);
        return id;
    }

    async updateSource(source) {
        await this.update(STORES.SOURCES, source);
        await this.logActivity('source_update', `Aktualizován zdroj "${source.name}"`);
    }

    async getSource(id) {
        return this.get(STORES.SOURCES, id);
    }

    async getAllSources() {
        return this.getAll(STORES.SOURCES);
    }

    async deleteSource(id) {
        const source = await this.get(STORES.SOURCES, id);
        await this.delete(STORES.SOURCES, id);
        if (source) {
            await this.logActivity('source_delete', `Smazán zdroj "${source.name}"`);
        }
    }

    async getSourcesByType(type) {
        return this.getByIndex(STORES.SOURCES, 'type', type);
    }

    async getSourceStats() {
        const sources = await this.getAllSources();
        const stats = {
            editorial: 0,
            'own-web': 0,
            reviews: 0,
            other: 0,
            total: 0,
            totalCitations: 0
        };

        sources.forEach(source => {
            const citations = source.citations || 1;
            stats[source.type] = (stats[source.type] || 0) + citations;
            stats.total += citations;
            stats.totalCitations += citations;
        });

        return stats;
    }

    // =============================================
    // COMPETITOR SPECIFIC METHODS
    // =============================================

    async addCompetitor(competitor) {
        const id = await this.add(STORES.COMPETITORS, competitor);
        await this.logActivity('competitor_add', `Přidán konkurent "${competitor.name}"`);
        return id;
    }

    async updateCompetitor(competitor) {
        await this.update(STORES.COMPETITORS, competitor);
        await this.logActivity('competitor_update', `Aktualizován konkurent "${competitor.name}"`);
    }

    async getCompetitor(id) {
        return this.get(STORES.COMPETITORS, id);
    }

    async getAllCompetitors() {
        return this.getAll(STORES.COMPETITORS);
    }

    async deleteCompetitor(id) {
        const competitor = await this.get(STORES.COMPETITORS, id);
        await this.delete(STORES.COMPETITORS, id);
        if (competitor) {
            await this.logActivity('competitor_delete', `Smazán konkurent "${competitor.name}"`);
        }
    }

    // =============================================
    // ACTIVITY LOG METHODS
    // =============================================

    async logActivity(type, message) {
        const activity = {
            type,
            message,
            timestamp: Date.now()
        };
        return this.add(STORES.ACTIVITY, activity);
    }

    async getRecentActivity(limit = 10) {
        const activities = await this.getAll(STORES.ACTIVITY);
        return activities
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    async clearOldActivity(daysToKeep = 30) {
        const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
        const activities = await this.getAll(STORES.ACTIVITY);

        for (const activity of activities) {
            if (activity.timestamp < cutoff) {
                await this.delete(STORES.ACTIVITY, activity.id);
            }
        }
    }

    // =============================================
    // SETTINGS METHODS
    // =============================================

    async getSetting(key) {
        const result = await this.get(STORES.SETTINGS, key);
        return result ? result.value : null;
    }

    async setSetting(key, value) {
        return this.update(STORES.SETTINGS, { key, value });
    }

    // =============================================
    // STATISTICS & ANALYTICS
    // =============================================

    async getOverviewStats() {
        const [brands, prompts, sources, competitors] = await Promise.all([
            this.getAllBrands(),
            this.getAllPrompts(),
            this.getAllSources(),
            this.getAllCompetitors()
        ]);

        // Calculate mentions
        const totalMentions = prompts.filter(p => p.mentioned).length;

        // Calculate total prompts with mentions
        const mentionRate = prompts.length > 0
            ? Math.round((totalMentions / prompts.length) * 100)
            : 0;

        // Calculate SoV
        const primaryBrand = brands.find(b => b.isPrimary);
        let shareOfVoice = 0;

        if (primaryBrand && competitors.length > 0) {
            const totalSov = competitors.reduce((sum, c) => sum + (c.sov || 0), 0);
            const myMentions = prompts.filter(p => p.brandId === primaryBrand.id && p.mentioned).length;
            const totalCompetitorMentions = competitors.reduce((sum, c) => sum + (c.mentions || 0), 0);
            const totalAllMentions = myMentions + totalCompetitorMentions;

            if (totalAllMentions > 0) {
                shareOfVoice = Math.round((myMentions / totalAllMentions) * 100);
            }
        } else if (totalMentions > 0) {
            shareOfVoice = 100; // If we have mentions but no competitors, we have 100%
        }

        // Total citations
        const totalCitations = sources.reduce((sum, s) => sum + (s.citations || 1), 0);

        return {
            totalMentions,
            mentionRate,
            shareOfVoice,
            totalSources: sources.length,
            totalCitations,
            totalPrompts: prompts.length,
            totalBrands: brands.length,
            totalCompetitors: competitors.length
        };
    }

    async getAiModelStats() {
        const prompts = await this.getAllPrompts();
        const stats = {};

        prompts.forEach(prompt => {
            const model = prompt.aiModel || 'unknown';
            if (!stats[model]) {
                stats[model] = { total: 0, mentioned: 0 };
            }
            stats[model].total++;
            if (prompt.mentioned) {
                stats[model].mentioned++;
            }
        });

        return stats;
    }

    async getTrendData(days = 30) {
        const prompts = await this.getAllPrompts();
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

        // Group by date
        const trendData = {};

        prompts
            .filter(p => p.createdAt >= cutoff)
            .forEach(prompt => {
                const date = new Date(prompt.createdAt).toISOString().split('T')[0];
                if (!trendData[date]) {
                    trendData[date] = { mentions: 0, total: 0 };
                }
                trendData[date].total++;
                if (prompt.mentioned) {
                    trendData[date].mentions++;
                }
            });

        return trendData;
    }

    // =============================================
    // EXPORT & IMPORT
    // =============================================

    async exportData() {
        const [brands, prompts, sources, competitors, activities, settings] = await Promise.all([
            this.getAllBrands(),
            this.getAllPrompts(),
            this.getAllSources(),
            this.getAllCompetitors(),
            this.getAll(STORES.ACTIVITY),
            this.getAll(STORES.SETTINGS)
        ]);

        return {
            version: DB_VERSION,
            exportedAt: new Date().toISOString(),
            data: {
                brands,
                prompts,
                sources,
                competitors,
                activities,
                settings
            }
        };
    }

    async importData(exportedData) {
        if (!exportedData || !exportedData.data) {
            throw new Error('Invalid export data format');
        }

        const { brands, prompts, sources, competitors, activities, settings } = exportedData.data;

        // Clear existing data
        await Promise.all([
            this.clear(STORES.BRANDS),
            this.clear(STORES.PROMPTS),
            this.clear(STORES.SOURCES),
            this.clear(STORES.COMPETITORS),
            this.clear(STORES.ACTIVITY),
            this.clear(STORES.SETTINGS)
        ]);

        // Import new data
        const transaction = this.db.transaction(Object.values(STORES), 'readwrite');

        const addItems = (storeName, items) => {
            const store = transaction.objectStore(storeName);
            items.forEach(item => store.add(item));
        };

        if (brands) addItems(STORES.BRANDS, brands);
        if (prompts) addItems(STORES.PROMPTS, prompts);
        if (sources) addItems(STORES.SOURCES, sources);
        if (competitors) addItems(STORES.COMPETITORS, competitors);
        if (activities) addItems(STORES.ACTIVITY, activities);
        if (settings) addItems(STORES.SETTINGS, settings);

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                this.logActivity('import', 'Data úspěšně importována');
                resolve();
            };
            transaction.onerror = () => reject(transaction.error);
        });
    }
}

// Create and export singleton instance
const db = new Database();

// Export for use in other modules
window.Database = Database;
window.db = db;
window.DB_STORES = STORES;
