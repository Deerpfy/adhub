/**
 * Scribblix - Database Layer
 * Uses Dexie.js (IndexedDB wrapper) for offline-first storage
 * Apache 2.0 License
 */

// Database instance
const db = new Dexie('ScribblixDB');

// Database schema version 1
db.version(1).stores({
    // Spaces (collections/projects)
    spaces: '++id, name, slug, icon, description, createdAt, updatedAt, order',

    // Pages (documents)
    pages: '++id, spaceId, parentId, title, slug, content, order, createdAt, updatedAt',

    // History (for undo/redo)
    history: '++id, pageId, content, title, timestamp',

    // Settings
    settings: 'key'
});

/**
 * Database Operations - Spaces
 */
const SpaceDB = {
    /**
     * Create a new space
     */
    async create(data) {
        const now = new Date().toISOString();
        const space = {
            name: data.name || 'Untitled Space',
            slug: data.slug || this.generateSlug(data.name),
            icon: data.icon || '📁',
            description: data.description || '',
            createdAt: now,
            updatedAt: now,
            order: data.order ?? await this.getNextOrder()
        };

        const id = await db.spaces.add(space);
        return { ...space, id };
    },

    /**
     * Get all spaces
     */
    async getAll() {
        return await db.spaces.orderBy('order').toArray();
    },

    /**
     * Get space by ID
     */
    async getById(id) {
        return await db.spaces.get(id);
    },

    /**
     * Get space by slug
     */
    async getBySlug(slug) {
        return await db.spaces.where('slug').equals(slug).first();
    },

    /**
     * Update space
     */
    async update(id, data) {
        data.updatedAt = new Date().toISOString();
        if (data.name && !data.slug) {
            data.slug = this.generateSlug(data.name);
        }
        await db.spaces.update(id, data);
        return await this.getById(id);
    },

    /**
     * Delete space and all its pages
     */
    async delete(id) {
        await db.transaction('rw', db.spaces, db.pages, db.history, async () => {
            // Get all pages in this space
            const pages = await db.pages.where('spaceId').equals(id).toArray();

            // Delete history for all pages
            for (const page of pages) {
                await db.history.where('pageId').equals(page.id).delete();
            }

            // Delete all pages
            await db.pages.where('spaceId').equals(id).delete();

            // Delete the space
            await db.spaces.delete(id);
        });
    },

    /**
     * Get next order number
     */
    async getNextOrder() {
        const lastSpace = await db.spaces.orderBy('order').last();
        return lastSpace ? lastSpace.order + 1 : 0;
    },

    /**
     * Reorder spaces
     */
    async reorder(orderedIds) {
        await db.transaction('rw', db.spaces, async () => {
            for (let i = 0; i < orderedIds.length; i++) {
                await db.spaces.update(orderedIds[i], { order: i });
            }
        });
    },

    /**
     * Generate URL-friendly slug
     */
    generateSlug(name) {
        if (!name) return 'untitled';
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    },

    /**
     * Count spaces
     */
    async count() {
        return await db.spaces.count();
    }
};

/**
 * Database Operations - Pages
 */
const PageDB = {
    /**
     * Create a new page
     */
    async create(data) {
        const now = new Date().toISOString();
        const page = {
            spaceId: data.spaceId,
            parentId: data.parentId || null,
            title: data.title || 'Untitled Page',
            slug: data.slug || SpaceDB.generateSlug(data.title),
            content: data.content || '',
            createdAt: now,
            updatedAt: now,
            order: data.order ?? await this.getNextOrder(data.spaceId, data.parentId)
        };

        const id = await db.pages.add(page);
        return { ...page, id };
    },

    /**
     * Get all pages for a space
     */
    async getBySpace(spaceId) {
        return await db.pages.where('spaceId').equals(spaceId).sortBy('order');
    },

    /**
     * Get pages by parent
     */
    async getByParent(spaceId, parentId) {
        return await db.pages
            .where({ spaceId, parentId: parentId || null })
            .sortBy('order');
    },

    /**
     * Get page by ID
     */
    async getById(id) {
        return await db.pages.get(id);
    },

    /**
     * Get page with space info
     */
    async getWithSpace(id) {
        const page = await db.pages.get(id);
        if (!page) return null;

        const space = await db.spaces.get(page.spaceId);
        return { ...page, space };
    },

    /**
     * Update page
     */
    async update(id, data) {
        data.updatedAt = new Date().toISOString();
        if (data.title && !data.slug) {
            data.slug = SpaceDB.generateSlug(data.title);
        }
        await db.pages.update(id, data);
        return await this.getById(id);
    },

    /**
     * Delete page and its children
     */
    async delete(id) {
        await db.transaction('rw', db.pages, db.history, async () => {
            // Recursively delete children
            const children = await db.pages.where('parentId').equals(id).toArray();
            for (const child of children) {
                await this.delete(child.id);
            }

            // Delete history
            await db.history.where('pageId').equals(id).delete();

            // Delete the page
            await db.pages.delete(id);
        });
    },

    /**
     * Get next order number
     */
    async getNextOrder(spaceId, parentId) {
        const pages = await db.pages
            .where({ spaceId, parentId: parentId || null })
            .toArray();

        if (pages.length === 0) return 0;
        return Math.max(...pages.map(p => p.order)) + 1;
    },

    /**
     * Reorder pages
     */
    async reorder(orderedIds) {
        await db.transaction('rw', db.pages, async () => {
            for (let i = 0; i < orderedIds.length; i++) {
                await db.pages.update(orderedIds[i], { order: i });
            }
        });
    },

    /**
     * Move page to different parent/space
     */
    async move(id, newSpaceId, newParentId) {
        const page = await this.getById(id);
        if (!page) return null;

        const order = await this.getNextOrder(newSpaceId, newParentId);

        await db.pages.update(id, {
            spaceId: newSpaceId,
            parentId: newParentId || null,
            order,
            updatedAt: new Date().toISOString()
        });

        return await this.getById(id);
    },

    /**
     * Get page tree for a space (hierarchical structure)
     */
    async getTree(spaceId) {
        const allPages = await this.getBySpace(spaceId);
        return this.buildTree(allPages, null);
    },

    /**
     * Build hierarchical tree from flat array
     */
    buildTree(pages, parentId) {
        return pages
            .filter(p => p.parentId === parentId)
            .sort((a, b) => a.order - b.order)
            .map(page => ({
                ...page,
                children: this.buildTree(pages, page.id)
            }));
    },

    /**
     * Search pages by content/title
     */
    async search(query) {
        if (!query || query.length < 2) return [];

        const queryLower = query.toLowerCase();
        const allPages = await db.pages.toArray();

        return allPages
            .filter(page =>
                page.title.toLowerCase().includes(queryLower) ||
                page.content.toLowerCase().includes(queryLower)
            )
            .map(page => {
                // Find excerpt with match
                let excerpt = '';
                const contentLower = page.content.toLowerCase();
                const matchIndex = contentLower.indexOf(queryLower);

                if (matchIndex !== -1) {
                    const start = Math.max(0, matchIndex - 50);
                    const end = Math.min(page.content.length, matchIndex + query.length + 50);
                    excerpt = (start > 0 ? '...' : '') +
                              page.content.substring(start, end) +
                              (end < page.content.length ? '...' : '');
                } else {
                    excerpt = page.content.substring(0, 100) + '...';
                }

                return { ...page, excerpt };
            });
    },

    /**
     * Count pages
     */
    async count() {
        return await db.pages.count();
    },

    /**
     * Get all pages (for export)
     */
    async getAll() {
        return await db.pages.toArray();
    }
};

/**
 * Database Operations - History (Undo/Redo)
 */
const HistoryDB = {
    MAX_HISTORY_PER_PAGE: 50,

    /**
     * Save page state to history
     */
    async save(pageId, content, title) {
        // Don't save if content is identical to last entry
        const lastEntry = await db.history
            .where('pageId').equals(pageId)
            .reverse()
            .first();

        if (lastEntry && lastEntry.content === content) {
            return;
        }

        await db.history.add({
            pageId,
            content,
            title,
            timestamp: new Date().toISOString()
        });

        // Cleanup old history entries
        await this.cleanup(pageId);
    },

    /**
     * Get history for a page
     */
    async getByPage(pageId) {
        return await db.history
            .where('pageId').equals(pageId)
            .reverse()
            .toArray();
    },

    /**
     * Cleanup old history entries
     */
    async cleanup(pageId) {
        const entries = await db.history
            .where('pageId').equals(pageId)
            .sortBy('timestamp');

        if (entries.length > this.MAX_HISTORY_PER_PAGE) {
            const toDelete = entries.slice(0, entries.length - this.MAX_HISTORY_PER_PAGE);
            await db.history.bulkDelete(toDelete.map(e => e.id));
        }
    },

    /**
     * Clear history for a page
     */
    async clearByPage(pageId) {
        await db.history.where('pageId').equals(pageId).delete();
    }
};

/**
 * Database Operations - Settings
 */
const SettingsDB = {
    DEFAULTS: {
        autoSave: true,
        autoSaveInterval: 30000, // 30 seconds
        spellcheck: false,
        fontSize: 16,
        editorMode: 'split', // 'edit', 'preview', 'split'
        sidebarCollapsed: false,
        tocCollapsed: false,
        lastOpenedSpace: null,
        lastOpenedPage: null
    },

    /**
     * Get setting value
     */
    async get(key) {
        const setting = await db.settings.get(key);
        return setting ? setting.value : this.DEFAULTS[key];
    },

    /**
     * Set setting value
     */
    async set(key, value) {
        await db.settings.put({ key, value });
    },

    /**
     * Get all settings
     */
    async getAll() {
        const settings = await db.settings.toArray();
        const result = { ...this.DEFAULTS };

        for (const setting of settings) {
            result[setting.key] = setting.value;
        }

        return result;
    },

    /**
     * Reset to defaults
     */
    async reset() {
        await db.settings.clear();
    }
};

/**
 * Database Utilities
 */
const DBUtils = {
    /**
     * Export all data
     */
    async exportAll() {
        const spaces = await db.spaces.toArray();
        const pages = await db.pages.toArray();
        const settings = await db.settings.toArray();

        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            spaces,
            pages,
            settings
        };
    },

    /**
     * Import data (replaces existing)
     */
    async importAll(data) {
        if (!data || data.version !== 1) {
            throw new Error('Invalid data format');
        }

        await db.transaction('rw', db.spaces, db.pages, db.history, db.settings, async () => {
            // Clear existing data
            await db.spaces.clear();
            await db.pages.clear();
            await db.history.clear();
            await db.settings.clear();

            // Import new data
            if (data.spaces && data.spaces.length > 0) {
                await db.spaces.bulkAdd(data.spaces);
            }
            if (data.pages && data.pages.length > 0) {
                await db.pages.bulkAdd(data.pages);
            }
            if (data.settings && data.settings.length > 0) {
                await db.settings.bulkAdd(data.settings);
            }
        });
    },

    /**
     * Clear all data
     */
    async clearAll() {
        await db.transaction('rw', db.spaces, db.pages, db.history, db.settings, async () => {
            await db.spaces.clear();
            await db.pages.clear();
            await db.history.clear();
            await db.settings.clear();
        });
    },

    /**
     * Get database size estimate (rough)
     */
    async getStorageEstimate() {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            return {
                used: estimate.usage || 0,
                quota: estimate.quota || 0
            };
        }
        return { used: 0, quota: 0 };
    },

    /**
     * Get statistics
     */
    async getStats() {
        const [spacesCount, pagesCount, storage] = await Promise.all([
            SpaceDB.count(),
            PageDB.count(),
            this.getStorageEstimate()
        ]);

        return {
            spaces: spacesCount,
            pages: pagesCount,
            storageUsed: storage.used,
            storageQuota: storage.quota
        };
    }
};

// Export for global access
window.ScribblixDB = {
    db,
    SpaceDB,
    PageDB,
    HistoryDB,
    SettingsDB,
    DBUtils
};

console.log('[Scribblix] Database module loaded');
