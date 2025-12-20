/**
 * SampleHub - IndexedDB Database Module
 * Offline-first data storage for sample packs and audio files
 * Version: 1.0
 *
 * Based on analysis requirements:
 * - SamplePack storage with metadata
 * - SampleFile storage with audio data
 * - Favorites tracking
 * - Search indexing
 */

const SampleHubDB = (function() {
    'use strict';

    const DB_NAME = 'SampleHubDB';
    const DB_VERSION = 1;

    // Store names
    const STORES = {
        SAMPLES: 'samples',
        PACKS: 'packs',
        SETTINGS: 'settings',
        AUDIO_CACHE: 'audioCache'
    };

    let db = null;

    /**
     * Initialize the database
     * @returns {Promise<IDBDatabase>}
     */
    async function init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Failed to open database:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                db = request.result;
                console.log('Database opened successfully');
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                // Samples store - individual audio files
                if (!database.objectStoreNames.contains(STORES.SAMPLES)) {
                    const samplesStore = database.createObjectStore(STORES.SAMPLES, {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    // Indexes for searching and filtering
                    samplesStore.createIndex('name', 'name', { unique: false });
                    samplesStore.createIndex('packId', 'packId', { unique: false });
                    samplesStore.createIndex('type', 'type', { unique: false });
                    samplesStore.createIndex('genre', 'genre', { unique: false });
                    samplesStore.createIndex('bpm', 'bpm', { unique: false });
                    samplesStore.createIndex('key', 'key', { unique: false });
                    samplesStore.createIndex('favorite', 'favorite', { unique: false });
                    samplesStore.createIndex('addedAt', 'addedAt', { unique: false });
                    samplesStore.createIndex('format', 'format', { unique: false });

                    console.log('Created samples store with indexes');
                }

                // Packs store - sample pack collections
                if (!database.objectStoreNames.contains(STORES.PACKS)) {
                    const packsStore = database.createObjectStore(STORES.PACKS, {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    packsStore.createIndex('name', 'name', { unique: false });
                    packsStore.createIndex('genre', 'genre', { unique: false });
                    packsStore.createIndex('createdAt', 'createdAt', { unique: false });

                    console.log('Created packs store');
                }

                // Settings store - app configuration
                if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
                    database.createObjectStore(STORES.SETTINGS, {
                        keyPath: 'key'
                    });

                    console.log('Created settings store');
                }

                // Audio cache store - for waveform data and audio blobs
                if (!database.objectStoreNames.contains(STORES.AUDIO_CACHE)) {
                    const cacheStore = database.createObjectStore(STORES.AUDIO_CACHE, {
                        keyPath: 'sampleId'
                    });

                    cacheStore.createIndex('createdAt', 'createdAt', { unique: false });

                    console.log('Created audio cache store');
                }
            };
        });
    }

    /**
     * Ensure database is initialized
     */
    async function ensureDB() {
        if (!db) {
            await init();
        }
        return db;
    }

    // =============================================
    // SAMPLES CRUD
    // =============================================

    /**
     * Add a new sample
     * @param {Object} sample - Sample data
     * @returns {Promise<number>} - Sample ID
     */
    async function addSample(sample) {
        await ensureDB();

        // Remove id from sample - let autoIncrement generate it
        const { id: sampleId, ...sampleWithoutId } = sample;
        const sampleData = {
            ...sampleWithoutId,
            addedAt: sample.addedAt || new Date().toISOString(),
            favorite: sample.favorite || false,
            playCount: sample.playCount || 0
        };

        // Only add id property if it's a valid number, otherwise omit for autoIncrement
        if (typeof sampleId === 'number' && !isNaN(sampleId)) {
            sampleData.id = sampleId;
        }

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.SAMPLES, 'readwrite');
            const store = transaction.objectStore(STORES.SAMPLES);
            const request = store.add(sampleData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Add multiple samples in batch
     * @param {Array} samples - Array of sample objects
     * @returns {Promise<Array>} - Array of sample IDs
     */
    async function addSamples(samples) {
        await ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.SAMPLES, 'readwrite');
            const store = transaction.objectStore(STORES.SAMPLES);
            const ids = [];

            transaction.oncomplete = () => resolve(ids);
            transaction.onerror = () => reject(transaction.error);

            samples.forEach(sample => {
                // Remove id from sample - let autoIncrement generate it
                const { id: sampleId, ...sampleWithoutId } = sample;
                const sampleData = {
                    ...sampleWithoutId,
                    addedAt: sample.addedAt || new Date().toISOString(),
                    favorite: sample.favorite || false,
                    playCount: sample.playCount || 0
                };

                // Only add id property if it's a valid number, otherwise omit for autoIncrement
                if (typeof sampleId === 'number' && !isNaN(sampleId)) {
                    sampleData.id = sampleId;
                }

                const request = store.add(sampleData);
                request.onsuccess = () => ids.push(request.result);
            });
        });
    }

    /**
     * Get a sample by ID
     * @param {number} id - Sample ID
     * @returns {Promise<Object>}
     */
    async function getSample(id) {
        await ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.SAMPLES, 'readonly');
            const store = transaction.objectStore(STORES.SAMPLES);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all samples
     * @param {Object} options - Filter and sort options
     * @returns {Promise<Array>}
     */
    async function getAllSamples(options = {}) {
        await ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.SAMPLES, 'readonly');
            const store = transaction.objectStore(STORES.SAMPLES);
            const request = store.getAll();

            request.onsuccess = () => {
                let samples = request.result;

                // Apply filters
                if (options.packId) {
                    samples = samples.filter(s => s.packId === options.packId);
                }
                if (options.type) {
                    samples = samples.filter(s => s.type === options.type);
                }
                if (options.genre) {
                    samples = samples.filter(s => s.genre === options.genre);
                }
                if (options.favorite) {
                    samples = samples.filter(s => s.favorite === true);
                }
                if (options.bpmMin) {
                    samples = samples.filter(s => s.bpm >= options.bpmMin);
                }
                if (options.bpmMax) {
                    samples = samples.filter(s => s.bpm <= options.bpmMax);
                }
                if (options.key) {
                    samples = samples.filter(s => s.key === options.key);
                }
                if (options.search) {
                    const searchLower = options.search.toLowerCase();
                    samples = samples.filter(s =>
                        s.name.toLowerCase().includes(searchLower) ||
                        (s.packName && s.packName.toLowerCase().includes(searchLower))
                    );
                }

                // Sort
                if (options.sortBy) {
                    const sortOrder = options.sortOrder === 'desc' ? -1 : 1;
                    samples.sort((a, b) => {
                        if (a[options.sortBy] < b[options.sortBy]) return -1 * sortOrder;
                        if (a[options.sortBy] > b[options.sortBy]) return 1 * sortOrder;
                        return 0;
                    });
                }

                resolve(samples);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update a sample
     * @param {number} id - Sample ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<void>}
     */
    async function updateSample(id, updates) {
        await ensureDB();

        const sample = await getSample(id);
        if (!sample) {
            throw new Error(`Sample with ID ${id} not found`);
        }

        const updatedSample = { ...sample, ...updates, updatedAt: new Date().toISOString() };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.SAMPLES, 'readwrite');
            const store = transaction.objectStore(STORES.SAMPLES);
            const request = store.put(updatedSample);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Toggle sample favorite status
     * @param {number} id - Sample ID
     * @returns {Promise<boolean>} - New favorite status
     */
    async function toggleFavorite(id) {
        const sample = await getSample(id);
        if (!sample) {
            throw new Error(`Sample with ID ${id} not found`);
        }

        const newFavorite = !sample.favorite;
        await updateSample(id, { favorite: newFavorite });
        return newFavorite;
    }

    /**
     * Delete a sample
     * @param {number} id - Sample ID
     * @returns {Promise<void>}
     */
    async function deleteSample(id) {
        await ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.SAMPLES, STORES.AUDIO_CACHE], 'readwrite');

            // Delete sample
            const samplesStore = transaction.objectStore(STORES.SAMPLES);
            samplesStore.delete(id);

            // Delete audio cache
            const cacheStore = transaction.objectStore(STORES.AUDIO_CACHE);
            cacheStore.delete(id);

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Get sample count
     * @returns {Promise<number>}
     */
    async function getSampleCount() {
        await ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.SAMPLES, 'readonly');
            const store = transaction.objectStore(STORES.SAMPLES);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get favorites count
     * @returns {Promise<number>}
     */
    async function getFavoritesCount() {
        await ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.SAMPLES, 'readonly');
            const store = transaction.objectStore(STORES.SAMPLES);
            const index = store.index('favorite');
            const request = index.count(IDBKeyRange.only(true));

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // =============================================
    // PACKS CRUD
    // =============================================

    /**
     * Add a new pack
     * @param {Object} pack - Pack data
     * @returns {Promise<number>} - Pack ID
     */
    async function addPack(pack) {
        await ensureDB();

        const packData = {
            ...pack,
            createdAt: pack.createdAt || new Date().toISOString(),
            sampleCount: pack.sampleCount || 0
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.PACKS, 'readwrite');
            const store = transaction.objectStore(STORES.PACKS);
            const request = store.add(packData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a pack by ID
     * @param {number} id - Pack ID
     * @returns {Promise<Object>}
     */
    async function getPack(id) {
        await ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.PACKS, 'readonly');
            const store = transaction.objectStore(STORES.PACKS);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all packs
     * @returns {Promise<Array>}
     */
    async function getAllPacks() {
        await ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.PACKS, 'readonly');
            const store = transaction.objectStore(STORES.PACKS);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update a pack
     * @param {number} id - Pack ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<void>}
     */
    async function updatePack(id, updates) {
        await ensureDB();

        const pack = await getPack(id);
        if (!pack) {
            throw new Error(`Pack with ID ${id} not found`);
        }

        const updatedPack = { ...pack, ...updates };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.PACKS, 'readwrite');
            const store = transaction.objectStore(STORES.PACKS);
            const request = store.put(updatedPack);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete a pack and all its samples
     * @param {number} id - Pack ID
     * @returns {Promise<void>}
     */
    async function deletePack(id) {
        await ensureDB();

        // Get all samples in this pack
        const samples = await getAllSamples({ packId: id });

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.PACKS, STORES.SAMPLES, STORES.AUDIO_CACHE], 'readwrite');

            // Delete pack
            const packsStore = transaction.objectStore(STORES.PACKS);
            packsStore.delete(id);

            // Delete all samples in pack
            const samplesStore = transaction.objectStore(STORES.SAMPLES);
            const cacheStore = transaction.objectStore(STORES.AUDIO_CACHE);

            samples.forEach(sample => {
                samplesStore.delete(sample.id);
                cacheStore.delete(sample.id);
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Get pack count
     * @returns {Promise<number>}
     */
    async function getPackCount() {
        await ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.PACKS, 'readonly');
            const store = transaction.objectStore(STORES.PACKS);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // =============================================
    // AUDIO CACHE
    // =============================================

    /**
     * Cache audio data for a sample
     * @param {number} sampleId - Sample ID
     * @param {Object} data - Audio data (blob, waveform, etc.)
     * @returns {Promise<void>}
     */
    async function cacheAudio(sampleId, data) {
        await ensureDB();

        const cacheData = {
            sampleId,
            ...data,
            createdAt: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.AUDIO_CACHE, 'readwrite');
            const store = transaction.objectStore(STORES.AUDIO_CACHE);
            const request = store.put(cacheData);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get cached audio data
     * @param {number} sampleId - Sample ID
     * @returns {Promise<Object>}
     */
    async function getCachedAudio(sampleId) {
        await ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.AUDIO_CACHE, 'readonly');
            const store = transaction.objectStore(STORES.AUDIO_CACHE);
            const request = store.get(sampleId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // =============================================
    // SETTINGS
    // =============================================

    /**
     * Get a setting value
     * @param {string} key - Setting key
     * @param {*} defaultValue - Default value if not found
     * @returns {Promise<*>}
     */
    async function getSetting(key, defaultValue = null) {
        await ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.SETTINGS, 'readonly');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : defaultValue);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Set a setting value
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     * @returns {Promise<void>}
     */
    async function setSetting(key, value) {
        await ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.SETTINGS, 'readwrite');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.put({ key, value });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all settings
     * @returns {Promise<Object>}
     */
    async function getAllSettings() {
        await ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.SETTINGS, 'readonly');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.getAll();

            request.onsuccess = () => {
                const settings = {};
                request.result.forEach(item => {
                    settings[item.key] = item.value;
                });
                resolve(settings);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // =============================================
    // UTILITIES
    // =============================================

    /**
     * Clear all data from the database
     * @returns {Promise<void>}
     */
    async function clearAllData() {
        await ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(
                [STORES.SAMPLES, STORES.PACKS, STORES.AUDIO_CACHE],
                'readwrite'
            );

            transaction.objectStore(STORES.SAMPLES).clear();
            transaction.objectStore(STORES.PACKS).clear();
            transaction.objectStore(STORES.AUDIO_CACHE).clear();

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Export all data as JSON
     * @returns {Promise<Object>}
     */
    async function exportData() {
        const samples = await getAllSamples();
        const packs = await getAllPacks();
        const settings = await getAllSettings();

        // Remove audio blobs for export (too large)
        const samplesForExport = samples.map(s => {
            const { audioBlob, ...rest } = s;
            return rest;
        });

        return {
            version: DB_VERSION,
            exportedAt: new Date().toISOString(),
            samples: samplesForExport,
            packs,
            settings
        };
    }

    /**
     * Import data from JSON
     * @param {Object} data - Imported data
     * @returns {Promise<Object>} - Import stats
     */
    async function importData(data) {
        if (!data.samples || !data.packs) {
            throw new Error('Invalid import data format');
        }

        await ensureDB();

        const stats = {
            samplesImported: 0,
            packsImported: 0
        };

        // Import packs first
        for (const pack of data.packs) {
            try {
                await addPack(pack);
                stats.packsImported++;
            } catch (error) {
                console.warn('Failed to import pack:', pack.name, error);
            }
        }

        // Import samples
        for (const sample of data.samples) {
            try {
                await addSample(sample);
                stats.samplesImported++;
            } catch (error) {
                console.warn('Failed to import sample:', sample.name, error);
            }
        }

        return stats;
    }

    /**
     * Get database statistics
     * @returns {Promise<Object>}
     */
    async function getStats() {
        const [sampleCount, packCount, favoritesCount] = await Promise.all([
            getSampleCount(),
            getPackCount(),
            getFavoritesCount()
        ]);

        return {
            samples: sampleCount,
            packs: packCount,
            favorites: favoritesCount
        };
    }

    // Public API
    return {
        init,
        // Samples
        addSample,
        addSamples,
        getSample,
        getAllSamples,
        updateSample,
        toggleFavorite,
        deleteSample,
        getSampleCount,
        getFavoritesCount,
        // Packs
        addPack,
        getPack,
        getAllPacks,
        updatePack,
        deletePack,
        getPackCount,
        // Audio Cache
        cacheAudio,
        getCachedAudio,
        // Settings
        getSetting,
        setSetting,
        getAllSettings,
        // Utilities
        clearAllData,
        exportData,
        importData,
        getStats
    };
})();

// Auto-initialize on load
if (typeof window !== 'undefined') {
    window.SampleHubDB = SampleHubDB;
}
