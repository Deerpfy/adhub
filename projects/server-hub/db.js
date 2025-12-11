/**
 * Server Hub - IndexedDB Database Layer
 *
 * Offline-first databazovy wrapper pro spravu serveru, webu a zaloh.
 * Inspirovano xCloud control panel architekturou.
 *
 * Schema:
 * - servers: Zaznamy o serverech
 * - sites: Weby/WordPress instalace
 * - backups: Zalohy
 * - sshKeys: SSH klice
 * - settings: Aplikacni nastaveni
 *
 * @license MIT
 * @version 1.0.0
 */

const ServerHubDB = (function() {
    'use strict';

    const DB_NAME = 'ServerHubDB';
    const DB_VERSION = 1;
    let db = null;

    // Generovani UUID
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Inicializace databaze
    function init() {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve(db);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(new Error('Failed to open database: ' + request.error));
            };

            request.onsuccess = () => {
                db = request.result;
                console.log('[ServerHubDB] Database initialized successfully');
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                console.log('[ServerHubDB] Upgrading database schema...');

                // Servers store
                if (!database.objectStoreNames.contains('servers')) {
                    const serversStore = database.createObjectStore('servers', { keyPath: 'id' });
                    serversStore.createIndex('name', 'name', { unique: false });
                    serversStore.createIndex('provider', 'provider', { unique: false });
                    serversStore.createIndex('status', 'status', { unique: false });
                    serversStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Sites store
                if (!database.objectStoreNames.contains('sites')) {
                    const sitesStore = database.createObjectStore('sites', { keyPath: 'id' });
                    sitesStore.createIndex('serverId', 'serverId', { unique: false });
                    sitesStore.createIndex('domain', 'domain', { unique: false });
                    sitesStore.createIndex('type', 'type', { unique: false });
                    sitesStore.createIndex('status', 'status', { unique: false });
                    sitesStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Backups store
                if (!database.objectStoreNames.contains('backups')) {
                    const backupsStore = database.createObjectStore('backups', { keyPath: 'id' });
                    backupsStore.createIndex('siteId', 'siteId', { unique: false });
                    backupsStore.createIndex('serverId', 'serverId', { unique: false });
                    backupsStore.createIndex('type', 'type', { unique: false });
                    backupsStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // SSH Keys store
                if (!database.objectStoreNames.contains('sshKeys')) {
                    const sshKeysStore = database.createObjectStore('sshKeys', { keyPath: 'id' });
                    sshKeysStore.createIndex('name', 'name', { unique: false });
                    sshKeysStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Settings store
                if (!database.objectStoreNames.contains('settings')) {
                    database.createObjectStore('settings', { keyPath: 'key' });
                }

                // Activity log store
                if (!database.objectStoreNames.contains('activityLog')) {
                    const activityStore = database.createObjectStore('activityLog', { keyPath: 'id' });
                    activityStore.createIndex('type', 'type', { unique: false });
                    activityStore.createIndex('entityType', 'entityType', { unique: false });
                    activityStore.createIndex('entityId', 'entityId', { unique: false });
                    activityStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                console.log('[ServerHubDB] Database schema created');
            };
        });
    }

    // Obecna CRUD operace - Create
    function create(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            const item = {
                ...data,
                id: data.id || generateUUID(),
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const request = store.add(item);

            request.onsuccess = () => {
                logActivity('create', storeName, item.id, item);
                resolve(item);
            };

            request.onerror = () => {
                reject(new Error(`Failed to create ${storeName}: ${request.error}`));
            };
        });
    }

    // Obecna CRUD operace - Read (single)
    function read(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => {
                reject(new Error(`Failed to read ${storeName}: ${request.error}`));
            };
        });
    }

    // Obecna CRUD operace - Read All
    function readAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(new Error(`Failed to read all ${storeName}: ${request.error}`));
            };
        });
    }

    // Obecna CRUD operace - Read by Index
    function readByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(new Error(`Failed to read by index ${indexName}: ${request.error}`));
            };
        });
    }

    // Obecna CRUD operace - Update
    function update(storeName, id, data) {
        return new Promise(async (resolve, reject) => {
            try {
                const existing = await read(storeName, id);
                if (!existing) {
                    reject(new Error(`${storeName} with id ${id} not found`));
                    return;
                }

                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);

                const item = {
                    ...existing,
                    ...data,
                    id: id,
                    createdAt: existing.createdAt,
                    updatedAt: new Date().toISOString()
                };

                const request = store.put(item);

                request.onsuccess = () => {
                    logActivity('update', storeName, id, item);
                    resolve(item);
                };

                request.onerror = () => {
                    reject(new Error(`Failed to update ${storeName}: ${request.error}`));
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    // Obecna CRUD operace - Delete
    function remove(storeName, id) {
        return new Promise(async (resolve, reject) => {
            try {
                const existing = await read(storeName, id);

                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(id);

                request.onsuccess = () => {
                    if (existing) {
                        logActivity('delete', storeName, id, existing);
                    }
                    resolve(true);
                };

                request.onerror = () => {
                    reject(new Error(`Failed to delete ${storeName}: ${request.error}`));
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    // Activity log
    function logActivity(type, entityType, entityId, data) {
        const transaction = db.transaction(['activityLog'], 'readwrite');
        const store = transaction.objectStore('activityLog');

        store.add({
            id: generateUUID(),
            type: type,
            entityType: entityType,
            entityId: entityId,
            data: data,
            createdAt: new Date().toISOString()
        });
    }

    // Settings API
    const Settings = {
        get: function(key) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['settings'], 'readonly');
                const store = transaction.objectStore('settings');
                const request = store.get(key);

                request.onsuccess = () => {
                    resolve(request.result ? request.result.value : null);
                };

                request.onerror = () => {
                    reject(new Error(`Failed to get setting ${key}`));
                };
            });
        },

        set: function(key, value) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['settings'], 'readwrite');
                const store = transaction.objectStore('settings');
                const request = store.put({ key, value, updatedAt: new Date().toISOString() });

                request.onsuccess = () => {
                    resolve(true);
                };

                request.onerror = () => {
                    reject(new Error(`Failed to set setting ${key}`));
                };
            });
        },

        getAll: function() {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['settings'], 'readonly');
                const store = transaction.objectStore('settings');
                const request = store.getAll();

                request.onsuccess = () => {
                    const settings = {};
                    (request.result || []).forEach(item => {
                        settings[item.key] = item.value;
                    });
                    resolve(settings);
                };

                request.onerror = () => {
                    reject(new Error('Failed to get all settings'));
                };
            });
        }
    };

    // Servers API
    const Servers = {
        create: (data) => create('servers', {
            name: data.name || 'New Server',
            provider: data.provider || 'custom',
            ipAddress: data.ipAddress || '',
            status: data.status || 'pending',
            region: data.region || '',
            size: data.size || '',
            webServer: data.webServer || 'nginx',
            phpVersion: data.phpVersion || '8.3',
            os: data.os || 'Ubuntu 22.04 LTS',
            cpu: data.cpu || 0,
            ram: data.ram || 0,
            disk: data.disk || 0,
            metadata: data.metadata || {}
        }),
        read: (id) => read('servers', id),
        readAll: () => readAll('servers'),
        update: (id, data) => update('servers', id, data),
        delete: (id) => remove('servers', id),

        // Specialni metody
        getByProvider: (provider) => readByIndex('servers', 'provider', provider),
        getByStatus: (status) => readByIndex('servers', 'status', status),

        // Statistiky
        getStats: async function() {
            const servers = await this.readAll();
            return {
                total: servers.length,
                active: servers.filter(s => s.status === 'active').length,
                pending: servers.filter(s => s.status === 'pending').length,
                stopped: servers.filter(s => s.status === 'stopped').length,
                byProvider: servers.reduce((acc, s) => {
                    acc[s.provider] = (acc[s.provider] || 0) + 1;
                    return acc;
                }, {})
            };
        }
    };

    // Sites API
    const Sites = {
        create: (data) => create('sites', {
            serverId: data.serverId || null,
            name: data.name || 'New Site',
            domain: data.domain || '',
            type: data.type || 'wordpress',
            status: data.status || 'pending',
            phpVersion: data.phpVersion || null,
            sslEnabled: data.sslEnabled || false,
            sslExpiry: data.sslExpiry || null,
            isStaging: data.isStaging || false,
            parentSiteId: data.parentSiteId || null,
            wpVersion: data.wpVersion || null,
            wpAdmin: data.wpAdmin || '',
            dbName: data.dbName || '',
            settings: data.settings || {}
        }),
        read: (id) => read('sites', id),
        readAll: () => readAll('sites'),
        update: (id, data) => update('sites', id, data),
        delete: (id) => remove('sites', id),

        // Specialni metody
        getByServer: (serverId) => readByIndex('sites', 'serverId', serverId),
        getByType: (type) => readByIndex('sites', 'type', type),
        getByStatus: (status) => readByIndex('sites', 'status', status),

        // Statistiky
        getStats: async function() {
            const sites = await this.readAll();
            return {
                total: sites.length,
                active: sites.filter(s => s.status === 'active').length,
                wordpress: sites.filter(s => s.type === 'wordpress').length,
                withSSL: sites.filter(s => s.sslEnabled).length,
                staging: sites.filter(s => s.isStaging).length
            };
        }
    };

    // Backups API
    const Backups = {
        create: (data) => create('backups', {
            siteId: data.siteId || null,
            serverId: data.serverId || null,
            name: data.name || 'Backup ' + new Date().toLocaleDateString(),
            type: data.type || 'full', // full, database, files
            size: data.size || 0,
            status: data.status || 'completed',
            storage: data.storage || 'local',
            notes: data.notes || ''
        }),
        read: (id) => read('backups', id),
        readAll: () => readAll('backups'),
        update: (id, data) => update('backups', id, data),
        delete: (id) => remove('backups', id),

        // Specialni metody
        getBySite: (siteId) => readByIndex('backups', 'siteId', siteId),
        getByServer: (serverId) => readByIndex('backups', 'serverId', serverId),
        getByType: (type) => readByIndex('backups', 'type', type),

        // Statistiky
        getStats: async function() {
            const backups = await this.readAll();
            const totalSize = backups.reduce((sum, b) => sum + (b.size || 0), 0);
            return {
                total: backups.length,
                totalSize: totalSize,
                byType: backups.reduce((acc, b) => {
                    acc[b.type] = (acc[b.type] || 0) + 1;
                    return acc;
                }, {})
            };
        }
    };

    // SSH Keys API
    const SSHKeys = {
        create: (data) => create('sshKeys', {
            name: data.name || 'SSH Key',
            publicKey: data.publicKey || '',
            fingerprint: data.fingerprint || '',
            isDefault: data.isDefault || false
        }),
        read: (id) => read('sshKeys', id),
        readAll: () => readAll('sshKeys'),
        update: (id, data) => update('sshKeys', id, data),
        delete: (id) => remove('sshKeys', id)
    };

    // Activity Log API
    const ActivityLog = {
        readAll: () => readAll('activityLog'),
        getRecent: async function(limit = 50) {
            const all = await this.readAll();
            return all
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, limit);
        },
        getByEntity: (entityType, entityId) => {
            return new Promise(async (resolve) => {
                const all = await readAll('activityLog');
                resolve(all.filter(a => a.entityType === entityType && a.entityId === entityId));
            });
        },
        clear: function() {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['activityLog'], 'readwrite');
                const store = transaction.objectStore('activityLog');
                const request = store.clear();

                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(new Error('Failed to clear activity log'));
            });
        }
    };

    // Export/Import funkcionalita
    const DataManager = {
        exportAll: async function() {
            const data = {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                servers: await Servers.readAll(),
                sites: await Sites.readAll(),
                backups: await Backups.readAll(),
                sshKeys: await SSHKeys.readAll(),
                settings: await Settings.getAll()
            };
            return JSON.stringify(data, null, 2);
        },

        importAll: async function(jsonString) {
            try {
                const data = JSON.parse(jsonString);

                if (!data.version) {
                    throw new Error('Invalid export file format');
                }

                // Import servers
                if (data.servers && Array.isArray(data.servers)) {
                    for (const server of data.servers) {
                        try {
                            await create('servers', server);
                        } catch (e) {
                            // Might already exist, try update
                            await update('servers', server.id, server);
                        }
                    }
                }

                // Import sites
                if (data.sites && Array.isArray(data.sites)) {
                    for (const site of data.sites) {
                        try {
                            await create('sites', site);
                        } catch (e) {
                            await update('sites', site.id, site);
                        }
                    }
                }

                // Import backups
                if (data.backups && Array.isArray(data.backups)) {
                    for (const backup of data.backups) {
                        try {
                            await create('backups', backup);
                        } catch (e) {
                            await update('backups', backup.id, backup);
                        }
                    }
                }

                // Import SSH keys
                if (data.sshKeys && Array.isArray(data.sshKeys)) {
                    for (const key of data.sshKeys) {
                        try {
                            await create('sshKeys', key);
                        } catch (e) {
                            await update('sshKeys', key.id, key);
                        }
                    }
                }

                // Import settings
                if (data.settings && typeof data.settings === 'object') {
                    for (const [key, value] of Object.entries(data.settings)) {
                        await Settings.set(key, value);
                    }
                }

                return { success: true, message: 'Data imported successfully' };
            } catch (error) {
                return { success: false, message: error.message };
            }
        },

        clearAll: async function() {
            const stores = ['servers', 'sites', 'backups', 'sshKeys', 'activityLog'];

            for (const storeName of stores) {
                await new Promise((resolve, reject) => {
                    const transaction = db.transaction([storeName], 'readwrite');
                    const store = transaction.objectStore(storeName);
                    const request = store.clear();
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject();
                });
            }

            return true;
        }
    };

    // Dashboard Stats
    const Dashboard = {
        getStats: async function() {
            const [serverStats, siteStats, backupStats] = await Promise.all([
                Servers.getStats(),
                Sites.getStats(),
                Backups.getStats()
            ]);

            return {
                servers: serverStats,
                sites: siteStats,
                backups: backupStats
            };
        }
    };

    // Public API
    return {
        init,
        generateUUID,
        Servers,
        Sites,
        Backups,
        SSHKeys,
        Settings,
        ActivityLog,
        DataManager,
        Dashboard
    };
})();

// Auto-inicializace pri nacteni
if (typeof window !== 'undefined') {
    window.ServerHubDB = ServerHubDB;
}
