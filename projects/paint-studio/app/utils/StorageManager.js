/**
 * StorageManager - IndexedDB storage for offline projects
 */

export class StorageManager {
    constructor() {
        this.dbName = 'PaintStudioDB';
        this.dbVersion = 1;
        this.db = null;
    }

    /**
     * Initialize IndexedDB
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
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Projects store
                if (!db.objectStoreNames.contains('projects')) {
                    const projectsStore = db.createObjectStore('projects', { keyPath: 'id' });
                    projectsStore.createIndex('name', 'name', { unique: false });
                    projectsStore.createIndex('modified', 'modified', { unique: false });
                }

                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Save project to IndexedDB
     */
    async saveProject(projectData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readwrite');
            const store = transaction.objectStore('projects');

            // Generate thumbnail
            const thumbnail = this.generateThumbnail(projectData);

            const data = {
                ...projectData,
                thumbnail,
                modified: new Date().toISOString()
            };

            const request = store.put(data);

            request.onsuccess = () => resolve(data);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Load project from IndexedDB
     */
    async loadProject(projectId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readonly');
            const store = transaction.objectStore('projects');
            const request = store.get(projectId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete project from IndexedDB
     */
    async deleteProject(projectId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readwrite');
            const store = transaction.objectStore('projects');
            const request = store.delete(projectId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * List all projects
     */
    async listProjects() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readonly');
            const store = transaction.objectStore('projects');
            const index = store.index('modified');
            const request = index.openCursor(null, 'prev'); // Newest first

            const projects = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    projects.push({
                        id: cursor.value.id,
                        name: cursor.value.name,
                        thumbnail: cursor.value.thumbnail,
                        created: cursor.value.created,
                        modified: cursor.value.modified,
                        width: cursor.value.width,
                        height: cursor.value.height
                    });
                    cursor.continue();
                } else {
                    resolve(projects);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generate thumbnail from project data
     */
    generateThumbnail(projectData) {
        try {
            if (!projectData.layers || projectData.layers.length === 0) {
                return null;
            }

            // Use first layer's data URL as thumbnail base
            // In a real implementation, we'd composite all layers
            const firstLayerWithContent = projectData.layers.find(l => l.data);
            return firstLayerWithContent?.data || null;
        } catch (error) {
            console.warn('Failed to generate thumbnail:', error);
            return null;
        }
    }

    /**
     * Save settings
     */
    async saveSettings(settings) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key: 'userSettings', ...settings });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get settings
     */
    async getSettings() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get('userSettings');

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    delete result.key;
                }
                resolve(result || null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Set keyboard preset
     */
    async setKeyboardPreset(presetKey) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key: 'keyboardPreset', preset: presetKey });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get keyboard preset
     */
    async getKeyboardPreset() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get('keyboardPreset');

            request.onsuccess = () => {
                resolve(request.result?.preset || null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all data
     */
    async clearAll() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects', 'settings'], 'readwrite');

            transaction.objectStore('projects').clear();
            transaction.objectStore('settings').clear();

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Get storage usage estimate
     */
    async getStorageEstimate() {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: estimate.usage,
                quota: estimate.quota,
                usagePercent: Math.round((estimate.usage / estimate.quota) * 100)
            };
        }
        return null;
    }
}
