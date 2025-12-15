/**
 * FileImporter - Handles importing various file formats into PaintNook
 * Supports images, PDF, PSD, Procreate, and other formats
 */

// Supported format categories
const SUPPORTED_FORMATS = {
    IMAGE: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'],
    PDF: ['pdf'],
    PSD: ['psd'],
    PROCREATE: ['procreate'],
    FIGMA: ['fig'],
    KRITA: ['kra'],
    OPENRASTER: ['ora'],
    GIMP: ['xcf'],
    CLIP_STUDIO: ['clip', 'csp'],
    SAI: ['sai', 'sai2']
};

// Feature status for each format
const FORMAT_SUPPORT = {
    png: { supported: true, layers: false },
    jpg: { supported: true, layers: false },
    jpeg: { supported: true, layers: false },
    gif: { supported: true, layers: true, animated: true },
    webp: { supported: true, layers: false },
    svg: { supported: true, layers: false, vector: true },
    bmp: { supported: true, layers: false },
    ico: { supported: true, layers: false },
    pdf: { supported: 'partial', layers: true, note: 'Renders pages as raster layers' },
    psd: { supported: 'partial', layers: true, note: 'Basic layer support, some features missing' },
    procreate: { supported: false, note: 'Planned for future release' },
    fig: { supported: false, note: 'Requires Figma export to PNG/SVG first' },
    kra: { supported: false, note: 'Planned for future release' },
    ora: { supported: 'partial', layers: true, note: 'OpenRaster basic support' },
    xcf: { supported: false, note: 'Planned for future release' },
    clip: { supported: false, note: 'Planned for future release' },
    csp: { supported: false, note: 'Planned for future release' },
    sai: { supported: false, note: 'Planned for future release' },
    sai2: { supported: false, note: 'Planned for future release' }
};

export class FileImporter {
    constructor(app) {
        this.app = app;
    }

    /**
     * Import files based on type
     * @param {File[]} files - Array of files to import
     * @param {string} importType - Type hint from welcome screen
     * @returns {Promise<Object>} Import result
     */
    async importFiles(files, importType = 'auto') {
        const results = {
            success: [],
            failed: [],
            warnings: []
        };

        for (const file of files) {
            try {
                const result = await this.importFile(file, importType);
                results.success.push({
                    file: file.name,
                    ...result
                });
            } catch (error) {
                console.error(`Failed to import ${file.name}:`, error);
                results.failed.push({
                    file: file.name,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Import a single file
     * @param {File} file - File to import
     * @param {string} importType - Type hint
     * @returns {Promise<Object>} Import result
     */
    async importFile(file, importType = 'auto') {
        const extension = this.getFileExtension(file.name);
        const formatInfo = FORMAT_SUPPORT[extension];

        // Check if format is supported
        if (!formatInfo) {
            throw new Error(`Nepodporovaný formát: .${extension}`);
        }

        if (formatInfo.supported === false) {
            console.warn(`[FileImporter] Format .${extension} is not yet supported: ${formatInfo.note}`);
            throw new Error(`Formát .${extension} zatím není podporován. ${formatInfo.note}`);
        }

        // Route to appropriate importer
        if (SUPPORTED_FORMATS.IMAGE.includes(extension)) {
            return await this.importImage(file);
        }

        if (SUPPORTED_FORMATS.PDF.includes(extension)) {
            return await this.importPDF(file);
        }

        if (SUPPORTED_FORMATS.PSD.includes(extension)) {
            return await this.importPSD(file);
        }

        if (SUPPORTED_FORMATS.OPENRASTER.includes(extension)) {
            return await this.importOpenRaster(file);
        }

        // Unsupported but recognized format
        console.warn(`[FileImporter] Format .${extension} recognized but not implemented: ${formatInfo.note}`);
        throw new Error(`Import formátu .${extension} bude přidán v budoucí verzi.`);
    }

    /**
     * Import standard image formats
     */
    async importImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    // Determine if we need to resize canvas or just add layer
                    const needsResize = img.width > this.app.canvas.width ||
                                       img.height > this.app.canvas.height;

                    if (needsResize) {
                        // Resize canvas to fit image
                        this.app.canvas.resize(
                            Math.max(img.width, this.app.canvas.width),
                            Math.max(img.height, this.app.canvas.height)
                        );
                    }

                    // Create new layer with image
                    const layerName = this.sanitizeLayerName(file.name);
                    const layer = this.app.layers.addLayer(layerName);

                    if (!layer) {
                        reject(new Error('Nepodařilo se vytvořit vrstvu'));
                        return;
                    }

                    const ctx = layer.canvas.getContext('2d');

                    // Center the image if canvas is larger
                    const x = (this.app.canvas.width - img.width) / 2;
                    const y = (this.app.canvas.height - img.height) / 2;

                    ctx.drawImage(img, x, y);

                    // Update UI
                    this.app.canvas.render();
                    this.app.ui.updateLayersList();
                    this.app.markUnsaved();

                    resolve({
                        type: 'image',
                        width: img.width,
                        height: img.height,
                        layers: 1
                    });
                };

                img.onerror = () => reject(new Error('Nepodařilo se načíst obrázek'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('Nepodařilo se přečíst soubor'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Import PDF files (renders pages as layers)
     */
    async importPDF(file) {
        // Check if PDF.js is available
        if (typeof pdfjsLib === 'undefined') {
            console.warn('[FileImporter] PDF.js not loaded, attempting dynamic import');

            // PDF.js is not included by default - log feature request
            console.info('[FileImporter] PDF import requires PDF.js library. Feature planned for future release.');

            throw new Error(
                'Import PDF vyžaduje knihovnu PDF.js, která není načtena. ' +
                'Tato funkce bude přidána v budoucí verzi. ' +
                'Prozatím můžete PDF exportovat jako obrázky a ty naimportovat.'
            );
        }

        // If PDF.js is available, use it
        return await this.importPDFWithPdfjs(file);
    }

    /**
     * Import PDF using PDF.js (when available)
     */
    async importPDFWithPdfjs(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const numPages = pdf.numPages;
        console.info(`[FileImporter] PDF has ${numPages} pages`);

        // Get first page dimensions
        const firstPage = await pdf.getPage(1);
        const viewport = firstPage.getViewport({ scale: 2 }); // 2x for quality

        // Resize canvas if needed
        if (viewport.width > this.app.canvas.width || viewport.height > this.app.canvas.height) {
            this.app.canvas.resize(
                Math.max(Math.ceil(viewport.width), this.app.canvas.width),
                Math.max(Math.ceil(viewport.height), this.app.canvas.height)
            );
        }

        // Render each page as a layer
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const pageViewport = page.getViewport({ scale: 2 });

            // Create canvas for rendering
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = Math.ceil(pageViewport.width);
            tempCanvas.height = Math.ceil(pageViewport.height);
            const tempCtx = tempCanvas.getContext('2d');

            await page.render({
                canvasContext: tempCtx,
                viewport: pageViewport
            }).promise;

            // Create layer from rendered page
            const layerName = `${this.sanitizeLayerName(file.name)} - Strana ${i}`;
            const layer = this.app.layers.addLayer(layerName);
            const ctx = layer.canvas.getContext('2d');

            // Center on canvas
            const x = (this.app.canvas.width - tempCanvas.width) / 2;
            const y = (this.app.canvas.height - tempCanvas.height) / 2;
            ctx.drawImage(tempCanvas, x, y);
        }

        this.app.canvas.render();
        this.app.ui.updateLayersList();
        this.app.markUnsaved();

        return {
            type: 'pdf',
            pages: numPages,
            layers: numPages
        };
    }

    /**
     * Import PSD files (basic support)
     */
    async importPSD(file) {
        // Check if ag-psd library is available
        if (typeof agPsd === 'undefined') {
            console.warn('[FileImporter] ag-psd not loaded');
            console.info('[FileImporter] PSD import requires ag-psd library. Feature planned for future release.');

            // Attempt to at least extract the composite image
            return await this.importPSDAsImage(file);
        }

        return await this.importPSDWithAgPsd(file);
    }

    /**
     * Import PSD as flat image (fallback)
     */
    async importPSDAsImage(file) {
        console.warn('[FileImporter] Falling back to flat PSD import (no layers)');

        // Try to load as image - some browsers/tools can render PSD
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();

            img.onload = () => {
                URL.revokeObjectURL(url);

                const layerName = this.sanitizeLayerName(file.name);
                const layer = this.app.layers.addLayer(layerName);
                const ctx = layer.canvas.getContext('2d');

                if (img.width > this.app.canvas.width || img.height > this.app.canvas.height) {
                    this.app.canvas.resize(img.width, img.height);
                }

                const x = (this.app.canvas.width - img.width) / 2;
                const y = (this.app.canvas.height - img.height) / 2;
                ctx.drawImage(img, x, y);

                this.app.canvas.render();
                this.app.ui.updateLayersList();
                this.app.markUnsaved();

                console.info('[FileImporter] PSD imported as flat image. Layer data not extracted.');

                resolve({
                    type: 'psd',
                    layers: 1,
                    warning: 'PSD importován jako jeden obrázek. Pro podporu vrstev bude přidána knihovna ag-psd.'
                });
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error(
                    'Nepodařilo se načíst PSD soubor. ' +
                    'Plná podpora PSD s vrstvami bude přidána v budoucí verzi.'
                ));
            };

            img.src = url;
        });
    }

    /**
     * Import PSD with ag-psd library (when available)
     */
    async importPSDWithAgPsd(file) {
        const arrayBuffer = await file.arrayBuffer();
        const psd = agPsd.readPsd(arrayBuffer);

        console.info('[FileImporter] PSD structure:', {
            width: psd.width,
            height: psd.height,
            layers: psd.children?.length || 0
        });

        // Resize canvas
        if (psd.width > this.app.canvas.width || psd.height > this.app.canvas.height) {
            this.app.canvas.resize(
                Math.max(psd.width, this.app.canvas.width),
                Math.max(psd.height, this.app.canvas.height)
            );
        }

        let layerCount = 0;

        // Process layers recursively
        const processLayers = (children, parentName = '') => {
            if (!children) return;

            for (const child of children) {
                if (child.children) {
                    // It's a group - process recursively
                    processLayers(child.children, child.name || 'Group');
                } else if (child.canvas) {
                    // It's a layer with content
                    const layerName = parentName
                        ? `${parentName}/${child.name}`
                        : (child.name || `Layer ${layerCount + 1}`);

                    const layer = this.app.layers.addLayer(this.sanitizeLayerName(layerName));
                    const ctx = layer.canvas.getContext('2d');

                    // Draw at layer position
                    const x = child.left || 0;
                    const y = child.top || 0;
                    ctx.drawImage(child.canvas, x, y);

                    // Set layer properties
                    if (child.opacity !== undefined) {
                        layer.opacity = child.opacity / 255;
                    }
                    if (child.blendMode) {
                        layer.blendMode = this.mapPsdBlendMode(child.blendMode);
                    }
                    if (child.hidden) {
                        layer.visible = false;
                    }

                    layerCount++;
                }
            }
        };

        // If PSD has layers, import them
        if (psd.children && psd.children.length > 0) {
            processLayers(psd.children);
        } else if (psd.canvas) {
            // Just composite image
            const layer = this.app.layers.addLayer(this.sanitizeLayerName(file.name));
            const ctx = layer.canvas.getContext('2d');
            ctx.drawImage(psd.canvas, 0, 0);
            layerCount = 1;
        }

        this.app.canvas.render();
        this.app.ui.updateLayersList();
        this.app.markUnsaved();

        return {
            type: 'psd',
            width: psd.width,
            height: psd.height,
            layers: layerCount
        };
    }

    /**
     * Import OpenRaster format (.ora)
     */
    async importOpenRaster(file) {
        console.info('[FileImporter] Attempting OpenRaster import');

        // ORA is a ZIP file containing layers and metadata
        if (typeof JSZip === 'undefined') {
            console.warn('[FileImporter] JSZip not available for ORA import');
            throw new Error('Import OpenRaster vyžaduje knihovnu JSZip. Funkce bude přidána v budoucí verzi.');
        }

        const zip = await JSZip.loadAsync(file);

        // Read stack.xml for layer structure
        const stackXml = await zip.file('stack.xml')?.async('text');
        if (!stackXml) {
            throw new Error('Neplatný ORA soubor - chybí stack.xml');
        }

        // Parse XML
        const parser = new DOMParser();
        const doc = parser.parseFromString(stackXml, 'text/xml');
        const image = doc.querySelector('image');

        const width = parseInt(image.getAttribute('w'));
        const height = parseInt(image.getAttribute('h'));

        // Resize canvas
        if (width > this.app.canvas.width || height > this.app.canvas.height) {
            this.app.canvas.resize(
                Math.max(width, this.app.canvas.width),
                Math.max(height, this.app.canvas.height)
            );
        }

        // Extract layers
        const layers = doc.querySelectorAll('layer');
        let layerCount = 0;

        for (const layerNode of layers) {
            const src = layerNode.getAttribute('src');
            const name = layerNode.getAttribute('name') || `Layer ${layerCount + 1}`;
            const opacity = parseFloat(layerNode.getAttribute('opacity') || 1);
            const visible = layerNode.getAttribute('visibility') !== 'hidden';

            const imageFile = zip.file(src);
            if (!imageFile) continue;

            const blob = await imageFile.async('blob');
            const img = await this.loadImageFromBlob(blob);

            const layer = this.app.layers.addLayer(this.sanitizeLayerName(name));
            const ctx = layer.canvas.getContext('2d');

            const x = parseInt(layerNode.getAttribute('x') || 0);
            const y = parseInt(layerNode.getAttribute('y') || 0);
            ctx.drawImage(img, x, y);

            layer.opacity = opacity;
            layer.visible = visible;
            layerCount++;
        }

        this.app.canvas.render();
        this.app.ui.updateLayersList();
        this.app.markUnsaved();

        return {
            type: 'ora',
            width,
            height,
            layers: layerCount
        };
    }

    /**
     * Load image from blob
     */
    loadImageFromBlob(blob) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(blob);
            const img = new Image();

            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };

            img.src = url;
        });
    }

    /**
     * Get file extension
     */
    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    /**
     * Sanitize layer name
     */
    sanitizeLayerName(name) {
        // Remove extension and limit length
        return name
            .replace(/\.[^/.]+$/, '')
            .substring(0, 50)
            .trim() || 'Imported Layer';
    }

    /**
     * Map PSD blend mode to CSS blend mode
     */
    mapPsdBlendMode(psdMode) {
        const modeMap = {
            'normal': 'source-over',
            'multiply': 'multiply',
            'screen': 'screen',
            'overlay': 'overlay',
            'darken': 'darken',
            'lighten': 'lighten',
            'color dodge': 'color-dodge',
            'color burn': 'color-burn',
            'hard light': 'hard-light',
            'soft light': 'soft-light',
            'difference': 'difference',
            'exclusion': 'exclusion',
            'hue': 'hue',
            'saturation': 'saturation',
            'color': 'color',
            'luminosity': 'luminosity'
        };

        return modeMap[psdMode?.toLowerCase()] || 'source-over';
    }

    /**
     * Get format support info
     */
    static getFormatSupport() {
        return FORMAT_SUPPORT;
    }

    /**
     * Check if format is supported
     */
    static isFormatSupported(extension) {
        const info = FORMAT_SUPPORT[extension.toLowerCase()];
        return info && info.supported !== false;
    }
}

// Export constants
export { SUPPORTED_FORMATS, FORMAT_SUPPORT };
