/**
 * StorageManager - IndexedDB storage for offline projects with tags support
 */

// Predefined tag colors (matching AI Prompt Formatter style)
const TAG_COLORS = [
    { id: 'blue', bg: '#1e40af', text: '#93c5fd' },
    { id: 'purple', bg: '#6b21a8', text: '#d8b4fe' },
    { id: 'pink', bg: '#9d174d', text: '#f9a8d4' },
    { id: 'red', bg: '#991b1b', text: '#fca5a5' },
    { id: 'orange', bg: '#9a3412', text: '#fdba74' },
    { id: 'yellow', bg: '#854d0e', text: '#fde047' },
    { id: 'green', bg: '#166534', text: '#86efac' },
    { id: 'teal', bg: '#115e59', text: '#5eead4' },
    { id: 'gray', bg: '#374151', text: '#d1d5db' }
];

export class StorageManager {
    constructor() {
        this.dbName = 'PaintStudioDB';
        this.dbVersion = 2; // Bumped for tags support
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
                const oldVersion = event.oldVersion;

                // Projects store (v1)
                if (!db.objectStoreNames.contains('projects')) {
                    const projectsStore = db.createObjectStore('projects', { keyPath: 'id' });
                    projectsStore.createIndex('name', 'name', { unique: false });
                    projectsStore.createIndex('modified', 'modified', { unique: false });
                    projectsStore.createIndex('profile', 'profile', { unique: false });
                }

                // Settings store (v1)
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Tags store (v2)
                if (!db.objectStoreNames.contains('tags')) {
                    const tagsStore = db.createObjectStore('tags', { keyPath: 'id' });
                    tagsStore.createIndex('name', 'name', { unique: false });
                }

                // Add profile index if upgrading from v1
                if (oldVersion < 2 && db.objectStoreNames.contains('projects')) {
                    const transaction = event.target.transaction;
                    const projectsStore = transaction.objectStore('projects');
                    if (!projectsStore.indexNames.contains('profile')) {
                        projectsStore.createIndex('profile', 'profile', { unique: false });
                    }
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

            // Use provided thumbnail or fallback to generation from layer data
            const thumbnail = projectData.thumbnail || this.generateThumbnail(projectData);

            const data = {
                ...projectData,
                thumbnail,
                modified: new Date().toISOString(),
                // Ensure tags is an array
                tags: projectData.tags || [],
                // Ensure profile is set
                profile: projectData.profile || 'digital'
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
     * List all projects with full metadata
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
                        height: cursor.value.height,
                        profile: cursor.value.profile || 'digital',
                        tags: cursor.value.tags || []
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
     * List projects filtered by profile type
     */
    async listProjectsByProfile(profile) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readonly');
            const store = transaction.objectStore('projects');
            const index = store.index('profile');
            const request = index.getAll(profile);

            request.onsuccess = () => {
                const projects = request.result.map(project => ({
                    id: project.id,
                    name: project.name,
                    thumbnail: project.thumbnail,
                    created: project.created,
                    modified: project.modified,
                    width: project.width,
                    height: project.height,
                    profile: project.profile || 'digital',
                    tags: project.tags || []
                }));
                // Sort by modified date (newest first)
                projects.sort((a, b) => new Date(b.modified) - new Date(a.modified));
                resolve(projects);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update project tags
     */
    async updateProjectTags(projectId, tags) {
        const project = await this.loadProject(projectId);
        if (project) {
            project.tags = tags;
            return this.saveProject(project);
        }
        return null;
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

    // ==================== TAGS CRUD ====================

    /**
     * Get all tags
     */
    async getAllTags() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tags'], 'readonly');
            const store = transaction.objectStore('tags');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Create a new tag
     */
    async createTag(name, color = 'blue') {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tags'], 'readwrite');
            const store = transaction.objectStore('tags');

            const tag = {
                id: crypto.randomUUID(),
                name: name.trim(),
                color,
                created: new Date().toISOString()
            };

            const request = store.add(tag);

            request.onsuccess = () => resolve(tag);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update a tag
     */
    async updateTag(tagId, name, color) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tags'], 'readwrite');
            const store = transaction.objectStore('tags');

            const getRequest = store.get(tagId);
            getRequest.onsuccess = () => {
                const tag = getRequest.result;
                if (tag) {
                    tag.name = name.trim();
                    tag.color = color;
                    const putRequest = store.put(tag);
                    putRequest.onsuccess = () => resolve(tag);
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    reject(new Error('Tag not found'));
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Delete a tag (and remove from all projects)
     */
    async deleteTag(tagId) {
        // First remove tag from all projects
        const projects = await this.listProjects();
        for (const project of projects) {
            if (project.tags && project.tags.includes(tagId)) {
                const fullProject = await this.loadProject(project.id);
                if (fullProject) {
                    fullProject.tags = fullProject.tags.filter(t => t !== tagId);
                    await this.saveProject(fullProject);
                }
            }
        }

        // Then delete the tag
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tags'], 'readwrite');
            const store = transaction.objectStore('tags');
            const request = store.delete(tagId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get tag color info
     */
    static getTagColor(colorId) {
        return TAG_COLORS.find(c => c.id === colorId) || TAG_COLORS[0];
    }

    /**
     * Get all available tag colors
     */
    static getTagColors() {
        return TAG_COLORS;
    }

    // ==================== SETTINGS ====================

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
     * Generic get method for any setting
     */
    async get(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    // Return value without key property
                    const { key: _, ...data } = result;
                    resolve(Object.keys(data).length === 1 && data.value !== undefined ? data.value : data);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic set method for any setting
     */
    async set(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const data = typeof value === 'object' ? { key, ...value } : { key, value };
            const request = store.put(data);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all data
     */
    async clearAll() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects', 'settings', 'tags'], 'readwrite');

            transaction.objectStore('projects').clear();
            transaction.objectStore('settings').clear();
            if (this.db.objectStoreNames.contains('tags')) {
                transaction.objectStore('tags').clear();
            }

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
