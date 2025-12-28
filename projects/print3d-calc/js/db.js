/**
 * IndexedDB Database Module
 * Handles offline data storage for printers, materials, settings, and history
 */

const DB = {
    dbName: 'Print3DCalculator',
    dbVersion: 1,
    db: null,

    // Default materials based on analysis with extended properties
    defaultMaterials: [
        { id: 'pla', name: 'PLA', density: 1.24, pricePerKg: 500, color: '#4ade80', tempNozzle: 200, tempBed: 60, printSpeed: 60 },
        { id: 'petg', name: 'PETG', density: 1.27, pricePerKg: 600, color: '#60a5fa', tempNozzle: 230, tempBed: 80, printSpeed: 50 },
        { id: 'abs', name: 'ABS', density: 1.04, pricePerKg: 550, color: '#fbbf24', tempNozzle: 240, tempBed: 100, printSpeed: 50 },
        { id: 'tpu', name: 'TPU', density: 1.21, pricePerKg: 1000, color: '#f472b6', tempNozzle: 220, tempBed: 50, printSpeed: 25 },
        { id: 'asa', name: 'ASA', density: 1.07, pricePerKg: 750, color: '#a78bfa', tempNozzle: 250, tempBed: 100, printSpeed: 50 },
        { id: 'nylon', name: 'Nylon', density: 1.14, pricePerKg: 1500, color: '#94a3b8', tempNozzle: 250, tempBed: 80, printSpeed: 40 },
        { id: 'pc', name: 'Polykarbonát', density: 1.20, pricePerKg: 1200, color: '#e2e8f0', tempNozzle: 270, tempBed: 110, printSpeed: 40 }
    ],

    // Default printers - popular models from major manufacturers
    defaultPrinters: [
        // Bambu Lab
        {
            id: 'bambu_x1c',
            name: 'Bambu Lab X1 Carbon',
            power: 350,
            cost: 35000,
            lifetime: 8000,
            bedX: 256,
            bedY: 256,
            bedZ: 256
        },
        {
            id: 'bambu_p1s',
            name: 'Bambu Lab P1S',
            power: 350,
            cost: 22000,
            lifetime: 6000,
            bedX: 256,
            bedY: 256,
            bedZ: 256
        },
        {
            id: 'bambu_a1',
            name: 'Bambu Lab A1',
            power: 150,
            cost: 10000,
            lifetime: 5000,
            bedX: 256,
            bedY: 256,
            bedZ: 256
        },
        // Prusa Research
        {
            id: 'prusa_mk4',
            name: 'Prusa MK4',
            power: 120,
            cost: 23000,
            lifetime: 8000,
            bedX: 250,
            bedY: 210,
            bedZ: 220
        },
        {
            id: 'prusa_mini',
            name: 'Prusa MINI+',
            power: 80,
            cost: 12000,
            lifetime: 6000,
            bedX: 180,
            bedY: 180,
            bedZ: 180
        },
        {
            id: 'prusa_xl',
            name: 'Prusa XL (5 nástrojů)',
            power: 350,
            cost: 90000,
            lifetime: 10000,
            bedX: 360,
            bedY: 360,
            bedZ: 360
        },
        // Creality
        {
            id: 'creality_ender3_v3',
            name: 'Creality Ender-3 V3',
            power: 350,
            cost: 8000,
            lifetime: 4000,
            bedX: 220,
            bedY: 220,
            bedZ: 250
        },
        {
            id: 'creality_k1_max',
            name: 'Creality K1 Max',
            power: 350,
            cost: 22000,
            lifetime: 5000,
            bedX: 300,
            bedY: 300,
            bedZ: 300
        },
        {
            id: 'creality_ender5_s1',
            name: 'Creality Ender-5 S1',
            power: 350,
            cost: 14000,
            lifetime: 5000,
            bedX: 220,
            bedY: 220,
            bedZ: 280
        },
        // Anycubic
        {
            id: 'anycubic_kobra2_pro',
            name: 'Anycubic Kobra 2 Pro',
            power: 400,
            cost: 9000,
            lifetime: 4000,
            bedX: 220,
            bedY: 220,
            bedZ: 250
        },
        // Elegoo
        {
            id: 'elegoo_neptune4_pro',
            name: 'Elegoo Neptune 4 Pro',
            power: 310,
            cost: 8500,
            lifetime: 4000,
            bedX: 225,
            bedY: 225,
            bedZ: 265
        },
        // Voron (DIY)
        {
            id: 'voron_2_4',
            name: 'Voron 2.4 (350mm)',
            power: 500,
            cost: 50000,
            lifetime: 10000,
            bedX: 350,
            bedY: 350,
            bedZ: 350
        },
        // Generic / Custom
        {
            id: 'custom',
            name: 'Vlastní tiskárna',
            power: 120,
            cost: 15000,
            lifetime: 5000,
            bedX: 220,
            bedY: 220,
            bedZ: 250
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
