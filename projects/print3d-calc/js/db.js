/**
 * IndexedDB Database Module
 * Handles offline data storage for printers, materials, settings, and history
 */

const DB = {
    dbName: 'Print3DCalculator',
    dbVersion: 1,
    db: null,

    // Default materials based on analysis
    defaultMaterials: [
        { id: 'pla', name: 'PLA', density: 1.24, pricePerKg: 500, color: '#4ade80' },
        { id: 'petg', name: 'PETG', density: 1.27, pricePerKg: 600, color: '#60a5fa' },
        { id: 'abs', name: 'ABS', density: 1.04, pricePerKg: 550, color: '#fbbf24' },
        { id: 'tpu', name: 'TPU', density: 1.21, pricePerKg: 1000, color: '#f472b6' },
        { id: 'asa', name: 'ASA', density: 1.07, pricePerKg: 750, color: '#a78bfa' },
        { id: 'nylon', name: 'Nylon', density: 1.14, pricePerKg: 1500, color: '#94a3b8' },
        { id: 'pc', name: 'Polykarbonat', density: 1.20, pricePerKg: 1200, color: '#e2e8f0' }
    ],

    // Default printer
    defaultPrinters: [
        {
            id: 'default',
            name: 'Vychozi tiskarna',
            power: 120,
            cost: 20000,
            lifetime: 5000,
            bedX: 250,
            bedY: 210,
            bedZ: 210
        }
    ],

    // Default settings based on Czech market analysis
    defaultSettings: {
        electricityPrice: 7,      // Kc/kWh
        laborRate: 300,           // Kc/h
        maintenanceRate: 2,       // Kc/h of printing
        failureRate: 5,           // %
        markupRate: 30,           // %
        currency: 'CZK'
    },

    /**
     * Initialize the database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains('printers')) {
                    db.createObjectStore('printers', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('materials')) {
                    db.createObjectStore('materials', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains('history')) {
                    const historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('date', 'date', { unique: false });
                }
            };
        });
    },

    /**
     * Ensure defaults are loaded
     */
    async ensureDefaults() {
        // Check and load default printers
        const printers = await this.getAll('printers');
        if (printers.length === 0) {
            for (const printer of this.defaultPrinters) {
                await this.put('printers', printer);
            }
        }

        // Check and load default materials
        const materials = await this.getAll('materials');
        if (materials.length === 0) {
            for (const material of this.defaultMaterials) {
                await this.put('materials', material);
            }
        }

        // Check and load default settings
        const settings = await this.getSettings();
        if (!settings.electricityPrice) {
            for (const [key, value] of Object.entries(this.defaultSettings)) {
                await this.setSetting(key, value);
            }
        }
    },

    /**
     * Generic get all from store
     */
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Generic get by ID
     */
    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Generic put (add or update)
     */
    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Generic delete
     */
    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Clear all data from a store
     */
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    // ========== Printers ==========

    async getPrinters() {
        return this.getAll('printers');
    },

    async getPrinter(id) {
        return this.get('printers', id);
    },

    async savePrinter(printer) {
        if (!printer.id) {
            printer.id = 'printer_' + Date.now();
        }
        return this.put('printers', printer);
    },

    async deletePrinter(id) {
        return this.delete('printers', id);
    },

    // ========== Materials ==========

    async getMaterials() {
        return this.getAll('materials');
    },

    async getMaterial(id) {
        return this.get('materials', id);
    },

    async saveMaterial(material) {
        if (!material.id) {
            material.id = 'material_' + Date.now();
        }
        return this.put('materials', material);
    },

    async deleteMaterial(id) {
        return this.delete('materials', id);
    },

    // ========== Settings ==========

    async getSettings() {
        const settingsArray = await this.getAll('settings');
        const settings = {};
        settingsArray.forEach(item => {
            settings[item.key] = item.value;
        });
        return settings;
    },

    async getSetting(key) {
        const result = await this.get('settings', key);
        return result ? result.value : this.defaultSettings[key];
    },

    async setSetting(key, value) {
        return this.put('settings', { key, value });
    },

    // ========== History ==========

    async getHistory() {
        const history = await this.getAll('history');
        return history.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    async addToHistory(entry) {
        entry.date = new Date().toISOString();
        return this.put('history', entry);
    },

    async clearHistory() {
        return this.clear('history');
    },

    async deleteHistoryItem(id) {
        return this.delete('history', id);
    },

    // ========== Export/Import ==========

    async exportAll() {
        const data = {
            version: 1,
            exportDate: new Date().toISOString(),
            printers: await this.getAll('printers'),
            materials: await this.getAll('materials'),
            settings: await this.getSettings(),
            history: await this.getAll('history')
        };
        return data;
    },

    async importAll(data) {
        if (!data.version) {
            throw new Error('Invalid data format');
        }

        // Clear existing data
        await this.clear('printers');
        await this.clear('materials');
        await this.clear('settings');
        await this.clear('history');

        // Import new data
        for (const printer of data.printers || []) {
            await this.put('printers', printer);
        }

        for (const material of data.materials || []) {
            await this.put('materials', material);
        }

        for (const [key, value] of Object.entries(data.settings || {})) {
            await this.setSetting(key, value);
        }

        for (const entry of data.history || []) {
            await this.put('history', entry);
        }

        return true;
    },

    async resetAll() {
        await this.clear('printers');
        await this.clear('materials');
        await this.clear('settings');
        await this.clear('history');
        await this.ensureDefaults();
        return true;
    }
};

// Export for use in other modules
window.DB = DB;
