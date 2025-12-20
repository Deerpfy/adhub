/**
 * ClipForge - IndexedDB Database Layer
 *
 * Handles all local storage operations for:
 * - Projects (timeline data, settings)
 * - Media files (videos, audio, images)
 * - User preferences
 *
 * Inspired by: Descript's project structure, DaVinci Resolve's media pool
 */

const ClipForgeDB = {
    name: 'ClipForgeDB',
    version: 1,
    db: null,

    // Store names
    STORES: {
        PROJECTS: 'projects',
        MEDIA: 'media',
        SETTINGS: 'settings',
        HISTORY: 'history'
    },

    /**
     * Initialize the database
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.name, this.version);

            request.onerror = () => {
                console.error('Database error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Projects store
                if (!db.objectStoreNames.contains(this.STORES.PROJECTS)) {
                    const projectsStore = db.createObjectStore(this.STORES.PROJECTS, {
                        keyPath: 'id',
                        autoIncrement: false
                    });
                    projectsStore.createIndex('name', 'name', { unique: false });
                    projectsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    projectsStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Media store (for storing actual file blobs)
                if (!db.objectStoreNames.contains(this.STORES.MEDIA)) {
                    const mediaStore = db.createObjectStore(this.STORES.MEDIA, {
                        keyPath: 'id',
                        autoIncrement: false
                    });
                    mediaStore.createIndex('projectId', 'projectId', { unique: false });
                    mediaStore.createIndex('type', 'type', { unique: false });
                    mediaStore.createIndex('name', 'name', { unique: false });
                }

                // Settings store (user preferences)
                if (!db.objectStoreNames.contains(this.STORES.SETTINGS)) {
                    db.createObjectStore(this.STORES.SETTINGS, {
                        keyPath: 'key'
                    });
                }

                // History store (for undo/redo)
                if (!db.objectStoreNames.contains(this.STORES.HISTORY)) {
                    const historyStore = db.createObjectStore(this.STORES.HISTORY, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    historyStore.createIndex('projectId', 'projectId', { unique: false });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                console.log('Database schema created');
            };
        });
    },

    /**
     * Generate unique ID
     * @returns {string}
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    // =========================================
    // PROJECT OPERATIONS
    // =========================================

    /**
     * Create a new project
     * @param {Object} projectData
     * @returns {Promise<Object>}
     */
    async createProject(projectData = {}) {
        const project = {
            id: this.generateId(),
            name: projectData.name || 'Nový projekt',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            settings: {
                width: projectData.width || 1920,
                height: projectData.height || 1080,
                fps: projectData.fps || 30,
                aspectRatio: projectData.aspectRatio || '16:9'
            },
            tracks: [
                { id: 'video-1', type: 'video', name: 'Video 1', clips: [], muted: false, locked: false },
                { id: 'audio-1', type: 'audio', name: 'Audio 1', clips: [], muted: false, locked: false },
                { id: 'text-1', type: 'text', name: 'Text', clips: [], visible: true, locked: false }
            ],
            duration: 0,
            thumbnail: null
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.PROJECTS], 'readwrite');
            const store = transaction.objectStore(this.STORES.PROJECTS);
            const request = store.add(project);

            request.onsuccess = () => resolve(project);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get a project by ID
     * @param {string} projectId
     * @returns {Promise<Object|null>}
     */
    async getProject(projectId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.PROJECTS], 'readonly');
            const store = transaction.objectStore(this.STORES.PROJECTS);
            const request = store.get(projectId);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get all projects
     * @returns {Promise<Array>}
     */
    async getAllProjects() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.PROJECTS], 'readonly');
            const store = transaction.objectStore(this.STORES.PROJECTS);
            const index = store.index('updatedAt');
            const request = index.getAll();

            request.onsuccess = () => {
                // Sort by updatedAt descending
                const projects = request.result.sort((a, b) => b.updatedAt - a.updatedAt);
                resolve(projects);
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Update a project
     * @param {Object} project
     * @returns {Promise<Object>}
     */
    async updateProject(project) {
        project.updatedAt = Date.now();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.PROJECTS], 'readwrite');
            const store = transaction.objectStore(this.STORES.PROJECTS);
            const request = store.put(project);

            request.onsuccess = () => resolve(project);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Delete a project and its media
     * @param {string} projectId
     * @returns {Promise<void>}
     */
    async deleteProject(projectId) {
        // First delete all associated media
        await this.deleteMediaByProject(projectId);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.PROJECTS], 'readwrite');
            const store = transaction.objectStore(this.STORES.PROJECTS);
            const request = store.delete(projectId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    // =========================================
    // MEDIA OPERATIONS
    // =========================================

    /**
     * Store a media file
     * @param {File} file
     * @param {string} projectId
     * @returns {Promise<Object>}
     */
    async storeMedia(file, projectId) {
        const arrayBuffer = await file.arrayBuffer();

        const media = {
            id: this.generateId(),
            projectId: projectId,
            name: file.name,
            type: this.getMediaType(file.type),
            mimeType: file.type,
            size: file.size,
            data: arrayBuffer,
            duration: 0,
            width: 0,
            height: 0,
            thumbnail: null,
            createdAt: Date.now()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.MEDIA], 'readwrite');
            const store = transaction.objectStore(this.STORES.MEDIA);
            const request = store.add(media);

            request.onsuccess = () => resolve(media);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get media type from MIME type
     * @param {string} mimeType
     * @returns {string}
     */
    getMediaType(mimeType) {
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.startsWith('image/')) return 'image';
        return 'unknown';
    },

    /**
     * Get a media item by ID
     * @param {string} mediaId
     * @returns {Promise<Object|null>}
     */
    async getMedia(mediaId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.MEDIA], 'readonly');
            const store = transaction.objectStore(this.STORES.MEDIA);
            const request = store.get(mediaId);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get all media for a project
     * @param {string} projectId
     * @returns {Promise<Array>}
     */
    async getMediaByProject(projectId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.MEDIA], 'readonly');
            const store = transaction.objectStore(this.STORES.MEDIA);
            const index = store.index('projectId');
            const request = index.getAll(projectId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Update media metadata
     * @param {Object} media
     * @returns {Promise<Object>}
     */
    async updateMedia(media) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.MEDIA], 'readwrite');
            const store = transaction.objectStore(this.STORES.MEDIA);
            const request = store.put(media);

            request.onsuccess = () => resolve(media);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Delete a media item
     * @param {string} mediaId
     * @returns {Promise<void>}
     */
    async deleteMedia(mediaId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.MEDIA], 'readwrite');
            const store = transaction.objectStore(this.STORES.MEDIA);
            const request = store.delete(mediaId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Delete all media for a project
     * @param {string} projectId
     * @returns {Promise<void>}
     */
    async deleteMediaByProject(projectId) {
        const mediaItems = await this.getMediaByProject(projectId);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.MEDIA], 'readwrite');
            const store = transaction.objectStore(this.STORES.MEDIA);

            let pending = mediaItems.length;
            if (pending === 0) {
                resolve();
                return;
            }

            mediaItems.forEach(media => {
                const request = store.delete(media.id);
                request.onsuccess = () => {
                    pending--;
                    if (pending === 0) resolve();
                };
                request.onerror = () => reject(request.error);
            });
        });
    },

    /**
     * Create object URL from stored media
     * @param {Object} media
     * @returns {string}
     */
    createMediaURL(media) {
        const blob = new Blob([media.data], { type: media.mimeType });
        return URL.createObjectURL(blob);
    },

    // =========================================
    // SETTINGS OPERATIONS
    // =========================================

    /**
     * Get a setting
     * @param {string} key
     * @param {*} defaultValue
     * @returns {Promise<*>}
     */
    async getSetting(key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.SETTINGS], 'readonly');
            const store = transaction.objectStore(this.STORES.SETTINGS);
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result ? request.result.value : defaultValue);
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Set a setting
     * @param {string} key
     * @param {*} value
     * @returns {Promise<void>}
     */
    async setSetting(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.SETTINGS], 'readwrite');
            const store = transaction.objectStore(this.STORES.SETTINGS);
            const request = store.put({ key, value });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    // =========================================
    // HISTORY OPERATIONS (Undo/Redo)
    // =========================================

    /**
     * Save a history state
     * @param {string} projectId
     * @param {Object} state
     * @param {string} action
     * @returns {Promise<Object>}
     */
    async saveHistoryState(projectId, state, action) {
        const historyEntry = {
            projectId,
            state: JSON.parse(JSON.stringify(state)),
            action,
            timestamp: Date.now()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.HISTORY], 'readwrite');
            const store = transaction.objectStore(this.STORES.HISTORY);
            const request = store.add(historyEntry);

            request.onsuccess = () => {
                historyEntry.id = request.result;
                resolve(historyEntry);
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get history for a project
     * @param {string} projectId
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    async getHistory(projectId, limit = 50) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.HISTORY], 'readonly');
            const store = transaction.objectStore(this.STORES.HISTORY);
            const index = store.index('projectId');
            const request = index.getAll(projectId);

            request.onsuccess = () => {
                const history = request.result
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, limit);
                resolve(history);
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Clear old history entries
     * @param {string} projectId
     * @param {number} keepCount
     * @returns {Promise<void>}
     */
    async clearOldHistory(projectId, keepCount = 50) {
        const history = await this.getHistory(projectId, 1000);

        if (history.length <= keepCount) return;

        const toDelete = history.slice(keepCount);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.HISTORY], 'readwrite');
            const store = transaction.objectStore(this.STORES.HISTORY);

            let pending = toDelete.length;
            toDelete.forEach(entry => {
                const request = store.delete(entry.id);
                request.onsuccess = () => {
                    pending--;
                    if (pending === 0) resolve();
                };
                request.onerror = () => reject(request.error);
            });
        });
    },

    // =========================================
    // UTILITY METHODS
    // =========================================

    /**
     * Get database storage usage estimate
     * @returns {Promise<Object>}
     */
    async getStorageEstimate() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: estimate.usage,
                quota: estimate.quota,
                usagePercent: ((estimate.usage / estimate.quota) * 100).toFixed(2)
            };
        }
        return { usage: 0, quota: 0, usagePercent: 0 };
    },

    /**
     * Clear all data (factory reset)
     * @returns {Promise<void>}
     */
    async clearAll() {
        const storeNames = Object.values(this.STORES);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeNames, 'readwrite');

            storeNames.forEach(storeName => {
                transaction.objectStore(storeName).clear();
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
};

// Export for use in other modules
window.ClipForgeDB = ClipForgeDB;
