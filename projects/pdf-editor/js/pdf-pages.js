/**
 * PDF Editor - Page Management Module
 * Handles page reordering, deletion, rotation, and extraction
 */

const PDFPages = {
    // PDF document reference
    pdfDoc: null,
    pdfData: null,

    // Page order (array of original page indices)
    pageOrder: [],

    // Page rotations (object: pageIndex -> rotation degrees)
    pageRotations: {},

    // Deleted pages (set of original page indices)
    deletedPages: new Set(),

    // Callbacks
    onPageOrderChange: null,
    onProgress: null,

    /**
     * Initialize with PDF data
     * @param {Uint8Array} data - PDF file data
     * @returns {Promise<Object>} - PDF info
     */
    async init(data) {
        this.pdfData = data;

        // Load with PDF.js for previews
        const loadingTask = pdfjsLib.getDocument({ data: data.slice() });
        this.pdfDoc = await loadingTask.promise;

        const numPages = this.pdfDoc.numPages;

        // Initialize page order (0-indexed)
        this.pageOrder = Array.from({ length: numPages }, (_, i) => i);
        this.pageRotations = {};
        this.deletedPages = new Set();

        return {
            pageCount: numPages,
            pages: await this.getPageInfo()
        };
    },

    /**
     * Get information about all pages
     * @returns {Promise<Array>}
     */
    async getPageInfo() {
        const pages = [];

        for (let i = 0; i < this.pageOrder.length; i++) {
            const originalIndex = this.pageOrder[i];

            if (this.deletedPages.has(originalIndex)) continue;

            const page = await this.pdfDoc.getPage(originalIndex + 1);
            const viewport = page.getViewport({ scale: 1.0 });

            pages.push({
                displayIndex: i,
                originalIndex: originalIndex,
                pageNumber: originalIndex + 1,
                width: viewport.width,
                height: viewport.height,
                rotation: this.pageRotations[originalIndex] || 0
            });
        }

        return pages;
    },

    /**
     * Get current page count (excluding deleted)
     * @returns {number}
     */
    getPageCount() {
        return this.pageOrder.filter(i => !this.deletedPages.has(i)).length;
    },

    /**
     * Render page thumbnail
     * @param {number} originalIndex - Original page index (0-based)
     * @param {HTMLCanvasElement} canvas - Target canvas
     * @param {number} maxSize - Maximum dimension
     */
    async renderThumbnail(originalIndex, canvas, maxSize = 150) {
        const page = await this.pdfDoc.getPage(originalIndex + 1);
        const rotation = this.pageRotations[originalIndex] || 0;

        let viewport = page.getViewport({ scale: 1.0, rotation: rotation });

        // Calculate scale to fit maxSize
        const scale = Math.min(maxSize / viewport.width, maxSize / viewport.height);
        viewport = page.getViewport({ scale, rotation });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;
    },

    /**
     * Move page from one position to another
     * @param {number} fromIndex - Current display index (0-based)
     * @param {number} toIndex - Target display index (0-based)
     */
    movePage(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;

        // Získat aktivní stránky (bez smazaných)
        const activePages = this.pageOrder.filter(i => !this.deletedPages.has(i));

        // Kontrola platnosti indexů
        if (fromIndex < 0 || fromIndex >= activePages.length) return;
        if (toIndex < 0 || toIndex >= activePages.length) return;

        // Získat originální index přesouvané stránky
        const movingPageOriginal = activePages[fromIndex];

        // Vytvořit nové pořadí aktivních stránek
        const newActiveOrder = [...activePages];
        newActiveOrder.splice(fromIndex, 1); // Odstranit z původní pozice
        newActiveOrder.splice(toIndex, 0, movingPageOriginal); // Vložit na novou pozici

        // Rekonstruovat celé pageOrder pole (včetně smazaných)
        // Smazané stránky zůstávají na svých pozicích
        const newPageOrder = [];
        let activeIndex = 0;

        for (let i = 0; i < this.pageOrder.length; i++) {
            const originalIndex = this.pageOrder[i];
            if (this.deletedPages.has(originalIndex)) {
                // Smazaná stránka - zachovat
                newPageOrder.push(originalIndex);
            } else {
                // Aktivní stránka - použít nové pořadí
                newPageOrder.push(newActiveOrder[activeIndex]);
                activeIndex++;
            }
        }

        this.pageOrder = newPageOrder;

        console.log(`Page moved: ${fromIndex} → ${toIndex}`, this.pageOrder);

        this._notifyChange();
    },

    /**
     * Reorder pages by drag-drop
     * @param {Array} newOrder - Array of original page indices in new order
     */
    setPageOrder(newOrder) {
        this.pageOrder = newOrder;
        this._notifyChange();
    },

    /**
     * Delete a page
     * @param {number} displayIndex - Display index of page to delete
     */
    deletePage(displayIndex) {
        const activePages = this.pageOrder.filter(i => !this.deletedPages.has(i));
        const originalIndex = activePages[displayIndex];

        if (originalIndex !== undefined) {
            this.deletedPages.add(originalIndex);
            this._notifyChange();
        }
    },

    /**
     * Restore a deleted page
     * @param {number} originalIndex - Original page index to restore
     */
    restorePage(originalIndex) {
        this.deletedPages.delete(originalIndex);
        this._notifyChange();
    },

    /**
     * Rotate a page
     * @param {number} displayIndex - Display index of page
     * @param {number} degrees - Rotation in degrees (90, 180, 270, or -90)
     */
    rotatePage(displayIndex, degrees = 90) {
        const activePages = this.pageOrder.filter(i => !this.deletedPages.has(i));
        const originalIndex = activePages[displayIndex];

        if (originalIndex !== undefined) {
            const currentRotation = this.pageRotations[originalIndex] || 0;
            this.pageRotations[originalIndex] = (currentRotation + degrees + 360) % 360;
            this._notifyChange();
        }
    },

    /**
     * Rotate all pages
     * @param {number} degrees - Rotation in degrees
     */
    rotateAllPages(degrees = 90) {
        for (const originalIndex of this.pageOrder) {
            if (!this.deletedPages.has(originalIndex)) {
                const currentRotation = this.pageRotations[originalIndex] || 0;
                this.pageRotations[originalIndex] = (currentRotation + degrees + 360) % 360;
            }
        }
        this._notifyChange();
    },

    /**
     * Select range of pages
     * @param {number} start - Start display index
     * @param {number} end - End display index
     * @returns {Array} - Array of original indices in range
     */
    selectRange(start, end) {
        const activePages = this.pageOrder.filter(i => !this.deletedPages.has(i));
        const minIndex = Math.min(start, end);
        const maxIndex = Math.max(start, end);

        return activePages.slice(minIndex, maxIndex + 1);
    },

    /**
     * Delete multiple pages
     * @param {Array} displayIndices - Array of display indices to delete
     */
    deletePages(displayIndices) {
        const activePages = this.pageOrder.filter(i => !this.deletedPages.has(i));

        for (const displayIndex of displayIndices) {
            const originalIndex = activePages[displayIndex];
            if (originalIndex !== undefined) {
                this.deletedPages.add(originalIndex);
            }
        }

        this._notifyChange();
    },

    /**
     * Extract pages to new PDF
     * @param {Array} displayIndices - Array of display indices to extract
     * @returns {Promise<Uint8Array>} - New PDF data
     */
    async extractPages(displayIndices) {
        const { PDFDocument } = PDFLib;

        // Load source PDF
        const srcDoc = await PDFDocument.load(this.pdfData);

        // Create new PDF
        const newDoc = await PDFDocument.create();

        // Get original indices
        const activePages = this.pageOrder.filter(i => !this.deletedPages.has(i));
        const originalIndices = displayIndices.map(di => activePages[di]);

        // Copy pages
        for (const originalIndex of originalIndices) {
            const [page] = await newDoc.copyPages(srcDoc, [originalIndex]);

            // Apply rotation if any
            const rotation = this.pageRotations[originalIndex] || 0;
            if (rotation !== 0) {
                page.setRotation({ type: 'degrees', angle: rotation });
            }

            newDoc.addPage(page);
        }

        return await newDoc.save();
    },

    /**
     * Apply changes and create new PDF
     * @returns {Promise<Uint8Array>} - Modified PDF data
     */
    async applyChanges() {
        const { PDFDocument } = PDFLib;

        this._reportProgress(0, 'Loading PDF...');

        // Load source PDF
        const srcDoc = await PDFDocument.load(this.pdfData);

        // Create new PDF
        const newDoc = await PDFDocument.create();

        // Get active pages in order
        const activePages = this.pageOrder.filter(i => !this.deletedPages.has(i));
        const totalPages = activePages.length;

        this._reportProgress(10, 'Processing pages...');

        // Copy pages in new order
        for (let i = 0; i < activePages.length; i++) {
            const originalIndex = activePages[i];

            this._reportProgress(
                10 + (i / totalPages) * 80,
                `Processing page ${i + 1} of ${totalPages}...`
            );

            const [page] = await newDoc.copyPages(srcDoc, [originalIndex]);

            // Apply rotation if any
            const rotation = this.pageRotations[originalIndex] || 0;
            if (rotation !== 0) {
                page.setRotation({ type: 'degrees', angle: rotation });
            }

            newDoc.addPage(page);
        }

        this._reportProgress(95, 'Saving PDF...');

        const result = await newDoc.save();

        this._reportProgress(100, 'Complete!');

        return result;
    },

    /**
     * Check if there are pending changes
     * @returns {boolean}
     */
    hasChanges() {
        // Check if any pages deleted
        if (this.deletedPages.size > 0) return true;

        // Check if any rotations
        if (Object.keys(this.pageRotations).some(k => this.pageRotations[k] !== 0)) {
            return true;
        }

        // Check if order changed
        const originalOrder = Array.from({ length: this.pageOrder.length }, (_, i) => i);
        return !this.pageOrder.every((v, i) => v === originalOrder[i]);
    },

    /**
     * Reset all changes
     */
    reset() {
        if (!this.pdfDoc) return;

        const numPages = this.pdfDoc.numPages;
        this.pageOrder = Array.from({ length: numPages }, (_, i) => i);
        this.pageRotations = {};
        this.deletedPages = new Set();

        this._notifyChange();
    },

    /**
     * Get change summary
     * @returns {Object}
     */
    getChangeSummary() {
        const originalCount = this.pdfDoc ? this.pdfDoc.numPages : 0;
        const activeCount = this.getPageCount();
        const deletedCount = this.deletedPages.size;
        const rotatedCount = Object.values(this.pageRotations).filter(r => r !== 0).length;

        const isReordered = !this.pageOrder.every((v, i) => v === i);

        return {
            originalPageCount: originalCount,
            currentPageCount: activeCount,
            deletedPages: deletedCount,
            rotatedPages: rotatedCount,
            isReordered: isReordered,
            hasChanges: this.hasChanges()
        };
    },

    /**
     * Get undo state (for implementing undo/redo)
     * @returns {Object}
     */
    getState() {
        return {
            pageOrder: [...this.pageOrder],
            pageRotations: { ...this.pageRotations },
            deletedPages: new Set(this.deletedPages)
        };
    },

    /**
     * Restore state
     * @param {Object} state - State object from getState()
     */
    setState(state) {
        this.pageOrder = [...state.pageOrder];
        this.pageRotations = { ...state.pageRotations };
        this.deletedPages = new Set(state.deletedPages);
        this._notifyChange();
    },

    /**
     * Notify of changes
     */
    _notifyChange() {
        if (this.onPageOrderChange) {
            this.onPageOrderChange(this.getChangeSummary());
        }
    },

    /**
     * Report progress
     */
    _reportProgress(percent, message) {
        if (this.onProgress) {
            this.onProgress({ percent, message });
        }
    },

    /**
     * Cleanup
     */
    dispose() {
        if (this.pdfDoc) {
            this.pdfDoc.destroy();
            this.pdfDoc = null;
        }
        this.pdfData = null;
        this.pageOrder = [];
        this.pageRotations = {};
        this.deletedPages = new Set();
    }
};

// Export for use in other modules
window.PDFPages = PDFPages;
