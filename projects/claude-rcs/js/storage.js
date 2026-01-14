/**
 * Claude RCS Workspace - Storage Layer
 * IndexedDB wrapper for offline-first data persistence
 */

import { DB_CONFIG, DEFAULT_SETTINGS } from './constants.js';

class StorageManager {
    constructor() {
        this.db = null;
        this.isReady = false;
        this.readyPromise = this.init();
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

            request.onerror = () => {
                console.error('[Storage] Failed to open database:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isReady = true;
                console.log('[Storage] Database opened successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('[Storage] Upgrading database...');

                // Sessions store
                if (!db.objectStoreNames.contains(DB_CONFIG.stores.sessions)) {
                    const sessionsStore = db.createObjectStore(DB_CONFIG.stores.sessions, {
                        keyPath: 'id'
                    });
                    sessionsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    sessionsStore.createIndex('role', 'role', { unique: false });
                }

                // Prompts store
                if (!db.objectStoreNames.contains(DB_CONFIG.stores.prompts)) {
                    const promptsStore = db.createObjectStore(DB_CONFIG.stores.prompts, {
                        keyPath: 'id'
                    });
                    promptsStore.createIndex('sessionId', 'sessionId', { unique: false });
                    promptsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    promptsStore.createIndex('state', 'state', { unique: false });
                }

                // Messages store (output)
                if (!db.objectStoreNames.contains(DB_CONFIG.stores.messages)) {
                    const messagesStore = db.createObjectStore(DB_CONFIG.stores.messages, {
                        keyPath: 'id'
                    });
                    messagesStore.createIndex('sessionId', 'sessionId', { unique: false });
                    messagesStore.createIndex('promptId', 'promptId', { unique: false });
                    messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Settings store
                if (!db.objectStoreNames.contains(DB_CONFIG.stores.settings)) {
                    db.createObjectStore(DB_CONFIG.stores.settings, {
                        keyPath: 'key'
                    });
                }

                // Workspace store
                if (!db.objectStoreNames.contains(DB_CONFIG.stores.workspace)) {
                    const workspaceStore = db.createObjectStore(DB_CONFIG.stores.workspace, {
                        keyPath: 'id'
                    });
                    workspaceStore.createIndex('sessionId', 'sessionId', { unique: false });
                }

                console.log('[Storage] Database upgraded successfully');
            };
        });
    }

    /**
     * Ensure database is ready
     */
    async ensureReady() {
        if (!this.isReady) {
            await this.readyPromise;
        }
    }

    /**
     * Generic get operation
     */
    async get(storeName, key) {
        await this.ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic getAll operation
     */
    async getAll(storeName) {
        await this.ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic put operation
     */
    async put(storeName, data) {
        await this.ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic delete operation
     */
    async delete(storeName, key) {
        await this.ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear entire store
     */
    async clear(storeName) {
        await this.ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Query by index
     */
    async getByIndex(storeName, indexName, value) {
        await this.ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // =============================================
    // SESSIONS
    // =============================================

    async saveSession(session) {
        session.timestamp = session.timestamp || Date.now();
        return this.put(DB_CONFIG.stores.sessions, session);
    }

    async getSession(id) {
        return this.get(DB_CONFIG.stores.sessions, id);
    }

    async getAllSessions() {
        const sessions = await this.getAll(DB_CONFIG.stores.sessions);
        return sessions.sort((a, b) => b.timestamp - a.timestamp);
    }

    async deleteSession(id) {
        return this.delete(DB_CONFIG.stores.sessions, id);
    }

    // =============================================
    // PROMPTS
    // =============================================

    async savePrompt(prompt) {
        prompt.timestamp = prompt.timestamp || Date.now();
        return this.put(DB_CONFIG.stores.prompts, prompt);
    }

    async getPrompt(id) {
        return this.get(DB_CONFIG.stores.prompts, id);
    }

    async getPromptsBySession(sessionId) {
        return this.getByIndex(DB_CONFIG.stores.prompts, 'sessionId', sessionId);
    }

    async getPendingPrompts(sessionId) {
        const prompts = await this.getPromptsBySession(sessionId);
        return prompts.filter(p => p.state === 'pending');
    }

    async deletePrompt(id) {
        return this.delete(DB_CONFIG.stores.prompts, id);
    }

    // =============================================
    // MESSAGES (OUTPUT)
    // =============================================

    async saveMessage(message) {
        message.timestamp = message.timestamp || Date.now();
        return this.put(DB_CONFIG.stores.messages, message);
    }

    async getMessage(id) {
        return this.get(DB_CONFIG.stores.messages, id);
    }

    async getMessagesBySession(sessionId) {
        const messages = await this.getByIndex(DB_CONFIG.stores.messages, 'sessionId', sessionId);
        return messages.sort((a, b) => a.timestamp - b.timestamp);
    }

    async getMessagesByPrompt(promptId) {
        return this.getByIndex(DB_CONFIG.stores.messages, 'promptId', promptId);
    }

    async deleteMessage(id) {
        return this.delete(DB_CONFIG.stores.messages, id);
    }

    async clearMessagesBySession(sessionId) {
        const messages = await this.getMessagesBySession(sessionId);
        for (const message of messages) {
            await this.deleteMessage(message.id);
        }
    }

    // =============================================
    // SETTINGS
    // =============================================

    async getSetting(key) {
        const result = await this.get(DB_CONFIG.stores.settings, key);
        return result ? result.value : DEFAULT_SETTINGS[key];
    }

    async setSetting(key, value) {
        return this.put(DB_CONFIG.stores.settings, { key, value });
    }

    async getAllSettings() {
        const settings = await this.getAll(DB_CONFIG.stores.settings);
        const result = { ...DEFAULT_SETTINGS };

        for (const setting of settings) {
            result[setting.key] = setting.value;
        }

        return result;
    }

    async resetSettings() {
        await this.clear(DB_CONFIG.stores.settings);
    }

    // =============================================
    // WORKSPACE
    // =============================================

    async saveWorkspace(workspace) {
        workspace.timestamp = Date.now();
        return this.put(DB_CONFIG.stores.workspace, workspace);
    }

    async getWorkspace(id) {
        return this.get(DB_CONFIG.stores.workspace, id);
    }

    async getWorkspaceBySession(sessionId) {
        const workspaces = await this.getByIndex(DB_CONFIG.stores.workspace, 'sessionId', sessionId);
        return workspaces[0] || null;
    }

    // =============================================
    // UTILITY
    // =============================================

    async clearAllData() {
        await this.ensureReady();

        const storeNames = Object.values(DB_CONFIG.stores);
        for (const storeName of storeNames) {
            await this.clear(storeName);
        }

        console.log('[Storage] All data cleared');
    }

    async exportAllData() {
        await this.ensureReady();

        const data = {};
        const storeNames = Object.values(DB_CONFIG.stores);

        for (const storeName of storeNames) {
            data[storeName] = await this.getAll(storeName);
        }

        return data;
    }

    async importData(data) {
        await this.ensureReady();

        for (const [storeName, items] of Object.entries(data)) {
            if (DB_CONFIG.stores[storeName]) {
                for (const item of items) {
                    await this.put(storeName, item);
                }
            }
        }

        console.log('[Storage] Data imported');
    }
}

// Export singleton instance
export const storage = new StorageManager();
