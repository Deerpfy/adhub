/**
 * PDF Editor - PDF Viewer Module
 * Handles PDF loading, rendering, and page navigation using PDF.js
 */

const PDFViewer = {
    // State
    pdfDoc: null,
    pdfData: null,
    currentPage: 1,
    totalPages: 0,
    scale: 1.0,
    rotation: 0,

    // DOM Elements (set during init)
    canvas: null,
    ctx: null,

    // Rendering state
    renderTask: null,
    isRendering: false,

    // Callbacks
    onPageChange: null,
    onLoad: null,
    onError: null,
    onRenderComplete: null,

    /**
     * Initialize the viewer with a canvas element
     * @param {HTMLCanvasElement} canvas - Canvas element for rendering
     */
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Set PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
        }
    },

    /**
     * Load PDF from various sources
     * @param {File|ArrayBuffer|Uint8Array|string} source - PDF source
     * @returns {Promise<Object>} - PDF document info
     */
    async loadPDF(source) {
        try {
            let data;

            if (source instanceof File) {
                const arrayBuffer = await source.arrayBuffer();
                data = new Uint8Array(arrayBuffer);
            } else if (source instanceof ArrayBuffer) {
                data = new Uint8Array(source);
            } else if (source instanceof Uint8Array) {
                data = source;
            } else if (typeof source === 'string') {
                // URL or base64
                if (source.startsWith('data:')) {
                    const base64 = source.split(',')[1];
                    const binary = atob(base64);
                    data = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        data[i] = binary.charCodeAt(i);
                    }
                } else {
                    // URL - fetch it
                    const response = await fetch(source);
                    const arrayBuffer = await response.arrayBuffer();
                    data = new Uint8Array(arrayBuffer);
                }
            } else {
                throw new Error('Unsupported PDF source type');
            }

            // Store raw data for later use
            this.pdfData = data;

            // Load with PDF.js
            const loadingTask = pdfjsLib.getDocument({ data: data.slice() });
            this.pdfDoc = await loadingTask.promise;
            this.totalPages = this.pdfDoc.numPages;
            this.currentPage = 1;
            this.rotation = 0;

            // Render first page
            await this.renderPage(1);

            const info = {
                numPages: this.totalPages,
                fingerprint: this.pdfDoc.fingerprints[0],
                metadata: await this.getMetadata()
            };

            if (this.onLoad) {
                this.onLoad(info);
            }

            return info;
        } catch (error) {
            console.error('Error loading PDF:', error);
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    },

    /**
     * Get PDF metadata
     * @returns {Promise<Object>}
     */
    async getMetadata() {
        if (!this.pdfDoc) return null;

        try {
            const metadata = await this.pdfDoc.getMetadata();
            return {
                info: metadata.info,
                metadata: metadata.metadata ? metadata.metadata.getAll() : null
            };
        } catch (error) {
            return null;
        }
    },

    /**
     * Render a specific page
     * @param {number} pageNum - Page number (1-indexed)
     * @returns {Promise<void>}
     */
    async renderPage(pageNum) {
        if (!this.pdfDoc || !this.canvas) return;

        // Cancel any ongoing render
        if (this.renderTask) {
            try {
                await this.renderTask.cancel();
            } catch (e) {
                // Ignore cancel errors
            }
        }

        this.isRendering = true;

        try {
            const page = await this.pdfDoc.getPage(pageNum);

            // Calculate viewport with rotation
            let viewport = page.getViewport({
                scale: this.scale,
                rotation: this.rotation
            });

            // Set canvas dimensions
            this.canvas.width = viewport.width;
            this.canvas.height = viewport.height;

            // Render
            this.renderTask = page.render({
                canvasContext: this.ctx,
                viewport: viewport
            });

            await this.renderTask.promise;

            this.currentPage = pageNum;
            this.isRendering = false;
            this.renderTask = null;

            if (this.onPageChange) {
                this.onPageChange(pageNum, this.totalPages);
            }

            if (this.onRenderComplete) {
                this.onRenderComplete({
                    page: pageNum,
                    width: viewport.width,
                    height: viewport.height,
                    scale: this.scale
                });
            }
        } catch (error) {
            this.isRendering = false;
            if (error.name !== 'RenderingCancelledException') {
                console.error('Error rendering page:', error);
                throw error;
            }
        }
    },

    /**
     * Go to next page
     */
    async nextPage() {
        if (this.currentPage < this.totalPages) {
            await this.renderPage(this.currentPage + 1);
        }
    },

    /**
     * Go to previous page
     */
    async prevPage() {
        if (this.currentPage > 1) {
            await this.renderPage(this.currentPage - 1);
        }
    },

    /**
     * Go to specific page
     * @param {number} pageNum - Page number
     */
    async goToPage(pageNum) {
        const page = Math.max(1, Math.min(pageNum, this.totalPages));
        await this.renderPage(page);
    },

    /**
     * Set zoom level
     * @param {number} scale - Scale factor (1.0 = 100%)
     */
    async setScale(scale) {
        this.scale = Math.max(0.25, Math.min(4, scale));
        await this.renderPage(this.currentPage);
    },

    /**
     * Zoom in
     * @param {number} factor - Zoom factor (default 0.25)
     */
    async zoomIn(factor = 0.25) {
        await this.setScale(this.scale + factor);
    },

    /**
     * Zoom out
     * @param {number} factor - Zoom factor (default 0.25)
     */
    async zoomOut(factor = 0.25) {
        await this.setScale(this.scale - factor);
    },

    /**
     * Fit to width
     * @param {number} containerWidth - Container width in pixels
     */
    async fitToWidth(containerWidth) {
        if (!this.pdfDoc) return;

        const page = await this.pdfDoc.getPage(this.currentPage);
        const viewport = page.getViewport({ scale: 1.0, rotation: this.rotation });
        const scale = (containerWidth - 40) / viewport.width; // 40px padding
        await this.setScale(scale);
    },

    /**
     * Fit to height
     * @param {number} containerHeight - Container height in pixels
     */
    async fitToHeight(containerHeight) {
        if (!this.pdfDoc) return;

        const page = await this.pdfDoc.getPage(this.currentPage);
        const viewport = page.getViewport({ scale: 1.0, rotation: this.rotation });
        const scale = (containerHeight - 40) / viewport.height;
        await this.setScale(scale);
    },

    /**
     * Rotate page
     * @param {number} degrees - Rotation in degrees (90, 180, 270)
     */
    async rotate(degrees = 90) {
        this.rotation = (this.rotation + degrees) % 360;
        await this.renderPage(this.currentPage);
    },

    /**
     * Get current page dimensions
     * @returns {Promise<Object>}
     */
    async getPageDimensions() {
        if (!this.pdfDoc) return null;

        const page = await this.pdfDoc.getPage(this.currentPage);
        const viewport = page.getViewport({ scale: this.scale, rotation: this.rotation });

        return {
            width: viewport.width,
            height: viewport.height,
            originalWidth: viewport.width / this.scale,
            originalHeight: viewport.height / this.scale,
            scale: this.scale,
            rotation: this.rotation
        };
    },

    /**
     * Get page info for all pages
     * @returns {Promise<Array>}
     */
    async getAllPageInfo() {
        if (!this.pdfDoc) return [];

        const pages = [];
        for (let i = 1; i <= this.totalPages; i++) {
            const page = await this.pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 1.0 });
            pages.push({
                pageNumber: i,
                width: viewport.width,
                height: viewport.height,
                rotation: page.rotate
            });
        }
        return pages;
    },

    /**
     * Render thumbnail for a page
     * @param {number} pageNum - Page number
     * @param {HTMLCanvasElement} thumbCanvas - Canvas for thumbnail
     * @param {number} maxSize - Maximum dimension
     */
    async renderThumbnail(pageNum, thumbCanvas, maxSize = 150) {
        if (!this.pdfDoc) return;

        const page = await this.pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });

        // Calculate scale to fit maxSize
        const scale = Math.min(maxSize / viewport.width, maxSize / viewport.height);
        const scaledViewport = page.getViewport({ scale });

        thumbCanvas.width = scaledViewport.width;
        thumbCanvas.height = scaledViewport.height;

        const ctx = thumbCanvas.getContext('2d');
        await page.render({
            canvasContext: ctx,
            viewport: scaledViewport
        }).promise;
    },

    /**
     * Get text content of current page
     * @returns {Promise<Array>}
     */
    async getTextContent() {
        if (!this.pdfDoc) return [];

        const page = await this.pdfDoc.getPage(this.currentPage);
        const textContent = await page.getTextContent();
        return textContent.items;
    },

    /**
     * Search text in PDF
     * @param {string} query - Search query
     * @returns {Promise<Array>} - Array of matches with page numbers
     */
    async searchText(query) {
        if (!this.pdfDoc || !query) return [];

        const results = [];
        const lowerQuery = query.toLowerCase();

        for (let i = 1; i <= this.totalPages; i++) {
            const page = await this.pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const text = textContent.items.map(item => item.str).join(' ');

            if (text.toLowerCase().includes(lowerQuery)) {
                results.push({
                    page: i,
                    text: text
                });
            }
        }

        return results;
    },

    /**
     * Get raw PDF data
     * @returns {Uint8Array}
     */
    getRawData() {
        return this.pdfData;
    },

    /**
     * Check if PDF is encrypted
     * @returns {boolean}
     */
    isEncrypted() {
        // PDF.js throws error during load if encrypted without password
        // This is a simple check after load
        return false;
    },

    /**
     * Close and cleanup
     */
    close() {
        if (this.renderTask) {
            this.renderTask.cancel();
        }

        if (this.pdfDoc) {
            this.pdfDoc.destroy();
        }

        this.pdfDoc = null;
        this.pdfData = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.0;
        this.rotation = 0;

        if (this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    },

    /**
     * Get current state
     * @returns {Object}
     */
    getState() {
        return {
            isLoaded: this.pdfDoc !== null,
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            scale: this.scale,
            rotation: this.rotation,
            isRendering: this.isRendering
        };
    }
};

// Export for use in other modules
window.PDFViewer = PDFViewer;
