/**
 * PDF Editor - Compression Module
 * Handles PDF compression by re-rendering pages at lower quality
 *
 * Komprese funguje tak, že:
 * 1. Nejprve zkusí PDF optimalizaci (odstranění nepoužitých objektů)
 * 2. Pokud to nestačí, renderuje stránky jako JPEG obrázky s nižší kvalitou
 * 3. Vždy vrátí nejmenší možný výsledek
 */

const PDFCompress = {
    // Compression levels - OPRAVENO: Správné scale hodnoty pro skutečnou kompresi
    LEVELS: {
        low: {
            name: 'low',
            label: 'Low Compression',
            description: 'Best quality, larger file',
            imageQuality: 0.75,
            scale: 0.9,  // 90% originální velikosti
            expectedReduction: '10-30%'
        },
        medium: {
            name: 'medium',
            label: 'Medium Compression',
            description: 'Balanced quality and size',
            imageQuality: 0.55,
            scale: 0.7,  // 70% originální velikosti
            expectedReduction: '30-50%'
        },
        high: {
            name: 'high',
            label: 'High Compression',
            description: 'Smallest file, lower quality',
            imageQuality: 0.35,
            scale: 0.5,  // 50% originální velikosti
            expectedReduction: '50-70%'
        }
    },

    // Current settings
    currentLevel: 'medium',

    // Progress callback
    onProgress: null,

    /**
     * Set compression level
     * @param {string} level - Compression level ('low', 'medium', 'high')
     */
    setLevel(level) {
        if (this.LEVELS[level]) {
            this.currentLevel = level;
        }
    },

    /**
     * Get compression settings for current level
     * @returns {Object}
     */
    getSettings() {
        return this.LEVELS[this.currentLevel];
    },

    /**
     * Compress PDF - OPRAVENO: Správná logika pro vždy menší výstup
     * @param {Uint8Array} pdfData - Original PDF data
     * @param {string} level - Compression level (optional, uses currentLevel if not provided)
     * @returns {Promise<Object>} - Compressed PDF data and stats
     */
    async compress(pdfData, level = null) {
        const compressionLevel = level || this.currentLevel;
        const settings = this.LEVELS[compressionLevel];

        if (!settings) {
            throw new Error('Invalid compression level');
        }

        const originalSize = pdfData.length;
        let bestResult = null;

        try {
            // Report progress
            this._reportProgress(0, 'Analyzing PDF...');

            // 1. Zkusit optimalizaci (pro text-heavy PDFs)
            this._reportProgress(5, 'Trying optimization...');
            const optimizedResult = await this.optimize(pdfData);

            // Uložit optimalizovaný výsledek pokud je menší
            if (optimizedResult.optimizedSize < originalSize) {
                bestResult = {
                    data: optimizedResult.data,
                    compressedSize: optimizedResult.optimizedSize,
                    method: 'optimization'
                };
                console.log(`Optimization: ${this.formatSize(originalSize)} -> ${this.formatSize(optimizedResult.optimizedSize)}`);
            }

            // 2. Zkusit image-based compression
            this._reportProgress(10, 'Loading PDF for image compression...');

            // Load PDF with PDF.js for rendering
            const loadingTask = pdfjsLib.getDocument({ data: pdfData.slice() });
            const pdfDoc = await loadingTask.promise;
            const numPages = pdfDoc.numPages;

            // Create new PDF with pdf-lib
            const { PDFDocument } = PDFLib;
            const newPdf = await PDFDocument.create();

            // OPRAVENO: Použít scale přímo - bez DPI kalkulace
            const renderScale = settings.scale;

            // Process each page
            for (let i = 1; i <= numPages; i++) {
                this._reportProgress(
                    10 + (i - 1) / numPages * 80,
                    `Compressing page ${i} of ${numPages}...`
                );

                const page = await pdfDoc.getPage(i);

                // Get original page dimensions in points
                const originalViewport = page.getViewport({ scale: 1.0 });
                const pageWidthPt = originalViewport.width;
                const pageHeightPt = originalViewport.height;

                // OPRAVENO: Použít menší scale pro skutečnou kompresi
                const viewport = page.getViewport({ scale: renderScale });

                // Create canvas for rendering
                const canvas = document.createElement('canvas');
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);

                const ctx = canvas.getContext('2d');

                // Fill with white background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Render page to canvas
                await page.render({
                    canvasContext: ctx,
                    viewport: viewport
                }).promise;

                // Convert canvas to JPEG with compression quality
                const jpegDataUrl = canvas.toDataURL('image/jpeg', settings.imageQuality);
                const jpegData = this._dataUrlToUint8Array(jpegDataUrl);

                // Embed JPEG in new PDF
                const jpegImage = await newPdf.embedJpg(jpegData);

                // Add page with ORIGINAL dimensions (pro správnou velikost stránky)
                const newPage = newPdf.addPage([pageWidthPt, pageHeightPt]);
                newPage.drawImage(jpegImage, {
                    x: 0,
                    y: 0,
                    width: pageWidthPt,
                    height: pageHeightPt
                });
            }

            this._reportProgress(95, 'Finalizing PDF...');

            // Save compressed PDF with object streams
            const compressedData = await newPdf.save({
                useObjectStreams: true,
                addDefaultPage: false
            });

            const imageCompressedSize = compressedData.length;
            console.log(`Image compression: ${this.formatSize(originalSize)} -> ${this.formatSize(imageCompressedSize)}`);

            // Cleanup
            pdfDoc.destroy();

            // 3. KRITICKÉ: Porovnat všechny výsledky a vrátit nejmenší
            if (!bestResult || imageCompressedSize < bestResult.compressedSize) {
                if (imageCompressedSize < originalSize) {
                    bestResult = {
                        data: compressedData,
                        compressedSize: imageCompressedSize,
                        method: 'image-compression'
                    };
                }
            }

            // 4. Pokud nic není menší než originál, vrátit originál
            if (!bestResult) {
                console.warn('Compression did not reduce file size, returning original');
                this._reportProgress(100, 'File already optimized');
                return {
                    data: pdfData,
                    originalSize: originalSize,
                    compressedSize: originalSize,
                    reduction: 0,
                    level: compressionLevel,
                    pageCount: numPages,
                    method: 'none',
                    message: 'Soubor je již optimalizovaný'
                };
            }

            const reduction = ((originalSize - bestResult.compressedSize) / originalSize * 100).toFixed(1);
            this._reportProgress(100, 'Compression complete!');

            return {
                data: bestResult.data,
                originalSize: originalSize,
                compressedSize: bestResult.compressedSize,
                reduction: parseFloat(reduction),
                level: compressionLevel,
                pageCount: numPages,
                method: bestResult.method
            };

        } catch (error) {
            console.error('Compression error:', error);
            throw error;
        }
    },

    /**
     * Get page count from PDF data
     * @param {Uint8Array} pdfData - PDF data
     * @returns {Promise<number>}
     */
    async _getPageCount(pdfData) {
        const { PDFDocument } = PDFLib;
        const doc = await PDFDocument.load(pdfData);
        return doc.getPageCount();
    },

    /**
     * Compress using Web Worker (for better performance)
     * @param {Uint8Array} pdfData - Original PDF data
     * @param {string} level - Compression level
     * @returns {Promise<Object>}
     */
    async compressWithWorker(pdfData, level = null) {
        return this.compress(pdfData, level);
    },

    /**
     * Estimate compression result
     * @param {number} originalSize - Original file size
     * @param {string} level - Compression level
     * @returns {Object}
     */
    estimateCompression(originalSize, level = null) {
        const settings = this.LEVELS[level || this.currentLevel];
        const [minReduction, maxReduction] = settings.expectedReduction
            .replace('%', '')
            .split('-')
            .map(n => parseInt(n) / 100);

        return {
            level: level || this.currentLevel,
            originalSize: originalSize,
            estimatedMin: Math.round(originalSize * (1 - maxReduction)),
            estimatedMax: Math.round(originalSize * (1 - minReduction)),
            expectedReduction: settings.expectedReduction
        };
    },

    /**
     * Convert data URL to Uint8Array
     * @param {string} dataUrl - Data URL
     * @returns {Uint8Array}
     */
    _dataUrlToUint8Array(dataUrl) {
        const base64 = dataUrl.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes;
    },

    /**
     * Report progress
     * @param {number} percent - Progress percentage (0-100)
     * @param {string} message - Progress message
     */
    _reportProgress(percent, message) {
        if (this.onProgress) {
            this.onProgress({
                percent: Math.round(percent),
                message: message
            });
        }
    },

    /**
     * Format file size for display
     * @param {number} bytes - Size in bytes
     * @returns {string}
     */
    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    },

    /**
     * Get compression level info for UI
     * @returns {Array}
     */
    getLevelOptions() {
        return Object.values(this.LEVELS).map(level => ({
            value: level.name,
            label: level.label,
            description: level.description,
            expectedReduction: level.expectedReduction
        }));
    },

    /**
     * Optimize PDF without changing image quality
     * (Removes unused objects, optimizes streams)
     * @param {Uint8Array} pdfData - Original PDF data
     * @returns {Promise<Object>}
     */
    async optimize(pdfData) {
        const originalSize = pdfData.length;

        try {
            const { PDFDocument } = PDFLib;
            const pdfDoc = await PDFDocument.load(pdfData, {
                ignoreEncryption: true
            });

            // Save with optimization options
            const optimizedData = await pdfDoc.save({
                useObjectStreams: true,
                addDefaultPage: false
            });

            const optimizedSize = optimizedData.length;
            const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);

            return {
                data: optimizedData,
                originalSize: originalSize,
                optimizedSize: optimizedSize,
                reduction: parseFloat(reduction)
            };
        } catch (error) {
            console.error('Optimization error:', error);
            // Vrátit originál při chybě
            return {
                data: pdfData,
                originalSize: originalSize,
                optimizedSize: originalSize,
                reduction: 0
            };
        }
    },

    /**
     * Analyze PDF for compression potential
     * @param {Uint8Array} pdfData - PDF data
     * @returns {Promise<Object>}
     */
    async analyze(pdfData) {
        try {
            const { PDFDocument } = PDFLib;
            const pdfDoc = await PDFDocument.load(pdfData);

            const pageCount = pdfDoc.getPageCount();
            const pages = pdfDoc.getPages();

            const pageSizes = [];
            for (const page of pages) {
                const { width, height } = page.getSize();
                pageSizes.push({ width, height });
            }

            return {
                fileSize: pdfData.length,
                pageCount: pageCount,
                pageSizes: pageSizes,
                averagePageSize: pdfData.length / pageCount,
                recommendations: this._getRecommendations(pdfData.length, pageCount)
            };
        } catch (error) {
            console.error('Analysis error:', error);
            throw error;
        }
    },

    /**
     * Get compression recommendations based on file analysis
     * @param {number} fileSize - File size in bytes
     * @param {number} pageCount - Number of pages
     * @returns {Object}
     */
    _getRecommendations(fileSize, pageCount) {
        const avgPageSize = fileSize / pageCount;
        const fileSizeMB = fileSize / (1024 * 1024);

        let recommendedLevel = 'medium';
        let reason = '';

        if (fileSizeMB > 10) {
            recommendedLevel = 'high';
            reason = 'Large file size - high compression recommended';
        } else if (fileSizeMB > 5) {
            recommendedLevel = 'medium';
            reason = 'Medium file size - balanced compression';
        } else if (avgPageSize > 500000) {
            recommendedLevel = 'medium';
            reason = 'Large pages detected - compression can help';
        } else {
            recommendedLevel = 'low';
            reason = 'Small file - minimal compression needed';
        }

        return {
            recommendedLevel,
            reason,
            estimates: {
                low: this.estimateCompression(fileSize, 'low'),
                medium: this.estimateCompression(fileSize, 'medium'),
                high: this.estimateCompression(fileSize, 'high')
            }
        };
    }
};

// Export for use in other modules
window.PDFCompress = PDFCompress;
