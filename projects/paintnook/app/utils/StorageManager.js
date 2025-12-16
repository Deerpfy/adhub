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
        this.dbVersion = 3; // Bumped for version history support
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

                // Project versions store (v3)
                if (!db.objectStoreNames.contains('projectVersions')) {
                    const versionsStore = db.createObjectStore('projectVersions', { keyPath: 'id' });
                    versionsStore.createIndex('projectId', 'projectId', { unique: false });
                    versionsStore.createIndex('version', 'version', { unique: false });
                    versionsStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    /**
     * Save project to IndexedDB with version history
     * @param {Object} projectData - Project data to save
     * @param {Object} options - Save options
     * @param {boolean} options.createNewVersion - Whether to create a new version (default: true)
     * @param {boolean} options.overwriteVersion - Whether to overwrite current version (for old version saves)
     */
    async saveProject(projectData, options = {}) {
        const { createNewVersion = true, overwriteVersion = false } = options;

        // Use provided thumbnail or fallback to generation from layer data
        const thumbnail = projectData.thumbnail || this.generateThumbnail(projectData);
        const timestamp = new Date().toISOString();

        // Get existing project to determine version
        const existingProject = await this.loadProject(projectData.id).catch(() => null);
        let currentVersion = existingProject?.currentVersion || 0;
        let newVersion = currentVersion;

        if (createNewVersion && !overwriteVersion) {
            newVersion = currentVersion + 1;
        }

        // Save version to version history
        if (createNewVersion && projectData.layers) {
            await this.saveProjectVersion(projectData.id, newVersion, {
                layers: projectData.layers,
                thumbnail,
                timestamp
            });
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readwrite');
            const store = transaction.objectStore('projects');

            const data = {
                ...projectData,
                thumbnail,
                modified: timestamp,
                currentVersion: newVersion,
                // Ensure tags is an array
                tags: projectData.tags || [],
                // Ensure profile is set
                profile: projectData.profile || 'digital'
            };

            // Remove layers from main project to save space (stored in versions)
            delete data.layers;

            const request = store.put(data);

            request.onsuccess = () => resolve({ ...data, version: newVersion });
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save a specific version of a project
     */
    async saveProjectVersion(projectId, version, versionData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projectVersions'], 'readwrite');
            const store = transaction.objectStore('projectVersions');

            const data = {
                id: `${projectId}_v${version}`,
                projectId,
                version,
                layers: versionData.layers,
                thumbnail: versionData.thumbnail,
                timestamp: versionData.timestamp || new Date().toISOString()
            };

            const request = store.put(data);

            request.onsuccess = () => resolve(data);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all versions of a project
     */
    async getProjectVersions(projectId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projectVersions'], 'readonly');
            const store = transaction.objectStore('projectVersions');
            const index = store.index('projectId');
            const request = index.getAll(projectId);

            request.onsuccess = () => {
                const versions = request.result || [];
                // Sort by version number descending (newest first)
                versions.sort((a, b) => b.version - a.version);
                resolve(versions);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Load a specific version of a project
     */
    async loadProjectVersion(projectId, version) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projectVersions'], 'readonly');
            const store = transaction.objectStore('projectVersions');
            const request = store.get(`${projectId}_v${version}`);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete a specific version of a project
     */
    async deleteProjectVersion(projectId, version) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projectVersions'], 'readwrite');
            const store = transaction.objectStore('projectVersions');
            const request = store.delete(`${projectId}_v${version}`);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete all versions of a project
     */
    async deleteAllProjectVersions(projectId) {
        const versions = await this.getProjectVersions(projectId);
        for (const version of versions) {
            await this.deleteProjectVersion(projectId, version.version);
        }
    }

    /**
     * Load project from IndexedDB
     * @param {string} projectId - Project ID
     * @param {number} version - Optional specific version to load (defaults to current)
     */
    async loadProject(projectId, version = null) {
        return new Promise(async (resolve, reject) => {
            try {
                const transaction = this.db.transaction(['projects'], 'readonly');
                const store = transaction.objectStore('projects');
                const request = store.get(projectId);

                request.onsuccess = async () => {
                    const project = request.result;
                    if (!project) {
                        resolve(null);
                        return;
                    }

                    // Determine which version to load
                    const targetVersion = version !== null ? version : project.currentVersion;

                    // Load layers from version if available
                    if (targetVersion && targetVersion > 0) {
                        try {
                            const versionData = await this.loadProjectVersion(projectId, targetVersion);
                            if (versionData) {
                                project.layers = versionData.layers;
                                project.loadedVersion = targetVersion;
                                project.isOldVersion = version !== null && version < project.currentVersion;
                            }
                        } catch (e) {
                            console.warn('Failed to load project version:', e);
                        }
                    }

                    resolve(project);
                };
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Delete project from IndexedDB (including all versions)
     */
    async deleteProject(projectId) {
        // Delete all versions first
        await this.deleteAllProjectVersions(projectId);

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
                        tags: cursor.value.tags || [],
                        currentVersion: cursor.value.currentVersion || 1
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
            const stores = ['projects', 'settings', 'tags', 'projectVersions'].filter(
                store => this.db.objectStoreNames.contains(store)
            );
            const transaction = this.db.transaction(stores, 'readwrite');

            stores.forEach(store => {
                transaction.objectStore(store).clear();
            });

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
