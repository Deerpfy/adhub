/**
 * PDF Editor - Signature Module
 * Handles drawn, uploaded, and text-based signatures using SignaturePad
 */

const PDFSigner = {
    // SignaturePad instance
    signaturePad: null,

    // Current signature data
    currentSignature: null,

    // Signature type
    signatureType: 'draw', // 'draw', 'upload', 'text'

    // Settings
    settings: {
        penColor: '#000000',
        backgroundColor: 'rgba(0,0,0,0)',
        minWidth: 0.5,
        maxWidth: 2.5,
        font: 'Dancing Script',
        fontSize: 48
    },

    // Available script fonts
    fonts: [
        { name: 'Dancing Script', display: 'Dancing Script' },
        { name: 'Great Vibes', display: 'Great Vibes' },
        { name: 'Pacifico', display: 'Pacifico' },
        { name: 'Sacramento', display: 'Sacramento' },
        { name: 'Allura', display: 'Allura' }
    ],

    // Callbacks
    onSignatureReady: null,
    onSignatureCleared: null,

    /**
     * Initialize the signature pad
     * @param {HTMLCanvasElement} canvas - Canvas element for signature drawing
     */
    init(canvas) {
        if (!canvas) {
            console.error('Canvas element is required');
            return;
        }

        // Store canvas reference
        this.canvas = canvas;

        // First resize the canvas
        this._resizeCanvas(canvas);

        // Create SignaturePad instance
        this.signaturePad = new SignaturePad(canvas, {
            backgroundColor: this.settings.backgroundColor,
            penColor: this.settings.penColor,
            minWidth: this.settings.minWidth,
            maxWidth: this.settings.maxWidth,
            velocityFilterWeight: 0.7,
            throttle: 16
        });

        // Handle resize with debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this._resizeCanvas(canvas), 100);
        });

        // Handle signature end
        this.signaturePad.addEventListener('endStroke', () => {
            if (!this.signaturePad.isEmpty() && this.onSignatureReady) {
                this.onSignatureReady(this.getSignatureData());
            }
        });

        console.log('Signature Pad initialized');
    },

    /**
     * Resize canvas to maintain quality
     * Uses a simpler approach that works reliably with SignaturePad
     */
    _resizeCanvas(canvas) {
        // Get the display size from CSS
        const displayWidth = canvas.offsetWidth || canvas.clientWidth;
        const displayHeight = canvas.offsetHeight || canvas.clientHeight;

        // Only resize if dimensions are valid
        if (displayWidth === 0 || displayHeight === 0) {
            // Canvas not visible yet, try again later
            setTimeout(() => this._resizeCanvas(canvas), 50);
            return;
        }

        // Use device pixel ratio for high DPI displays
        const ratio = Math.max(window.devicePixelRatio || 1, 1);

        // Set the canvas internal size to match display size * ratio
        canvas.width = displayWidth * ratio;
        canvas.height = displayHeight * ratio;

        // Scale the canvas context to counter the size increase
        const ctx = canvas.getContext('2d');
        ctx.scale(ratio, ratio);

        // Clear with white background for visibility (signature drawing area)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        // Restore signature if exists
        if (this.signaturePad && !this.signaturePad.isEmpty()) {
            const data = this.signaturePad.toData();
            this.signaturePad.clear();
            this.signaturePad.fromData(data);
        }
    },

    /**
     * Set pen color
     * @param {string} color - CSS color value
     */
    setPenColor(color) {
        this.settings.penColor = color;
        if (this.signaturePad) {
            this.signaturePad.penColor = color;
        }
    },

    /**
     * Set pen width
     * @param {number} minWidth - Minimum width
     * @param {number} maxWidth - Maximum width
     */
    setPenWidth(minWidth, maxWidth) {
        this.settings.minWidth = minWidth;
        this.settings.maxWidth = maxWidth;
        if (this.signaturePad) {
            this.signaturePad.minWidth = minWidth;
            this.signaturePad.maxWidth = maxWidth;
        }
    },

    /**
     * Clear signature pad
     */
    clear() {
        if (this.signaturePad) {
            this.signaturePad.clear();
        }
        this.currentSignature = null;

        if (this.onSignatureCleared) {
            this.onSignatureCleared();
        }
    },

    /**
     * Check if signature pad is empty
     * @returns {boolean}
     */
    isEmpty() {
        return this.signaturePad ? this.signaturePad.isEmpty() : true;
    },

    /**
     * Get signature as data URL (PNG)
     * @returns {string}
     */
    getSignatureData() {
        if (this.signaturePad && !this.signaturePad.isEmpty()) {
            return this.signaturePad.toDataURL('image/png');
        }
        return this.currentSignature;
    },

    /**
     * Get signature as SVG
     * @returns {string}
     */
    getSignatureSVG() {
        if (this.signaturePad && !this.signaturePad.isEmpty()) {
            return this.signaturePad.toSVG();
        }
        return null;
    },

    /**
     * Load fonts for text signatures
     * @returns {Promise<void>}
     */
    async loadFonts() {
        const fontPromises = this.fonts.map(font => {
            const fontFace = new FontFace(
                font.name,
                `url(https://fonts.googleapis.com/css2?family=${font.name.replace(' ', '+')}&display=swap)`
            );

            // Alternative: Load from Google Fonts directly
            return new Promise((resolve) => {
                const link = document.createElement('link');
                link.href = `https://fonts.googleapis.com/css2?family=${font.name.replace(' ', '+')}&display=swap`;
                link.rel = 'stylesheet';
                link.onload = resolve;
                link.onerror = resolve; // Continue even if font fails
                document.head.appendChild(link);
            });
        });

        await Promise.all(fontPromises);
        console.log('Signature fonts loaded');
    },

    /**
     * Create text signature
     * @param {string} text - Signature text
     * @param {string} fontFamily - Font family name
     * @param {string} color - Text color
     * @param {number} fontSize - Font size
     * @returns {string} - Data URL of signature image
     */
    createTextSignature(text, fontFamily = null, color = null, fontSize = null) {
        const font = fontFamily || this.settings.font;
        const textColor = color || this.settings.penColor;
        const size = fontSize || this.settings.fontSize;

        // Create temporary canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set font and measure text
        ctx.font = `${size}px "${font}"`;
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = size * 1.2;

        // Set canvas size with padding
        const padding = 20;
        canvas.width = textWidth + padding * 2;
        canvas.height = textHeight + padding * 2;

        // Clear canvas (transparent)
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw text
        ctx.font = `${size}px "${font}"`;
        ctx.fillStyle = textColor;
        ctx.textBaseline = 'middle';
        ctx.fillText(text, padding, canvas.height / 2);

        // Get data URL
        const dataUrl = canvas.toDataURL('image/png');
        this.currentSignature = dataUrl;
        this.signatureType = 'text';

        return dataUrl;
    },

    /**
     * Process uploaded image
     * @param {File} file - Image file
     * @returns {Promise<string>} - Processed image data URL
     */
    async processUploadedImage(file) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('File must be an image'));
                return;
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    // Create canvas for processing
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Scale image if too large
                    const maxSize = 500;
                    let width = img.width;
                    let height = img.height;

                    if (width > maxSize || height > maxSize) {
                        const scale = Math.min(maxSize / width, maxSize / height);
                        width *= scale;
                        height *= scale;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // Draw image
                    ctx.drawImage(img, 0, 0, width, height);

                    // Remove white background
                    const imageData = ctx.getImageData(0, 0, width, height);
                    const data = imageData.data;
                    const threshold = 240; // White threshold

                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];

                        // Check if pixel is near-white
                        if (r > threshold && g > threshold && b > threshold) {
                            data[i + 3] = 0; // Set alpha to 0 (transparent)
                        }
                    }

                    ctx.putImageData(imageData, 0, 0);

                    // Trim transparent pixels
                    const trimmedCanvas = this._trimCanvas(canvas);
                    const dataUrl = trimmedCanvas.toDataURL('image/png');

                    this.currentSignature = dataUrl;
                    this.signatureType = 'upload';

                    resolve(dataUrl);
                };

                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    },

    /**
     * Trim transparent pixels from canvas
     * @param {HTMLCanvasElement} canvas - Source canvas
     * @returns {HTMLCanvasElement} - Trimmed canvas
     */
    _trimCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let top = canvas.height;
        let bottom = 0;
        let left = canvas.width;
        let right = 0;

        // Find bounds
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const alpha = data[(y * canvas.width + x) * 4 + 3];
                if (alpha > 0) {
                    if (y < top) top = y;
                    if (y > bottom) bottom = y;
                    if (x < left) left = x;
                    if (x > right) right = x;
                }
            }
        }

        // Add padding
        const padding = 10;
        top = Math.max(0, top - padding);
        bottom = Math.min(canvas.height - 1, bottom + padding);
        left = Math.max(0, left - padding);
        right = Math.min(canvas.width - 1, right + padding);

        // Create trimmed canvas
        const trimmedWidth = right - left + 1;
        const trimmedHeight = bottom - top + 1;

        const trimmedCanvas = document.createElement('canvas');
        trimmedCanvas.width = trimmedWidth;
        trimmedCanvas.height = trimmedHeight;

        const trimmedCtx = trimmedCanvas.getContext('2d');
        trimmedCtx.drawImage(
            canvas,
            left, top, trimmedWidth, trimmedHeight,
            0, 0, trimmedWidth, trimmedHeight
        );

        return trimmedCanvas;
    },

    /**
     * Apply color tint to signature
     * @param {string} dataUrl - Signature data URL
     * @param {string} color - New color (hex)
     * @returns {Promise<string>} - Tinted signature data URL
     */
    async applyColorTint(dataUrl, color) {
        return new Promise((resolve) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                // Get image data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Parse target color
                const hex = color.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);

                // Apply tint to non-transparent pixels
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] > 0) {
                        data[i] = r;
                        data[i + 1] = g;
                        data[i + 2] = b;
                    }
                }

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };

            img.src = dataUrl;
        });
    },

    /**
     * Create signature preview element
     * @param {string} dataUrl - Signature data URL
     * @returns {HTMLImageElement}
     */
    createPreviewElement(dataUrl) {
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '150px';
        return img;
    },

    /**
     * Save signature to storage
     * @param {string} name - Signature name
     * @returns {Promise<number>} - Signature ID
     */
    async saveSignature(name = 'My Signature') {
        const dataUrl = this.getSignatureData();
        if (!dataUrl) {
            throw new Error('No signature to save');
        }

        return await PDFStorage.saveSignature({
            type: this.signatureType,
            data: dataUrl,
            name: name,
            color: this.settings.penColor,
            font: this.signatureType === 'text' ? this.settings.font : null
        });
    },

    /**
     * Load saved signatures
     * @returns {Promise<Array>}
     */
    async loadSavedSignatures() {
        return await PDFStorage.getSignatures();
    },

    /**
     * Delete saved signature
     * @param {number} id - Signature ID
     * @returns {Promise<void>}
     */
    async deleteSavedSignature(id) {
        return await PDFStorage.deleteSignature(id);
    },

    /**
     * Set current signature from saved
     * @param {Object} savedSignature - Saved signature object
     */
    setFromSaved(savedSignature) {
        this.currentSignature = savedSignature.data;
        this.signatureType = savedSignature.type;

        if (savedSignature.color) {
            this.settings.penColor = savedSignature.color;
        }
        if (savedSignature.font) {
            this.settings.font = savedSignature.font;
        }
    },

    /**
     * Get signature dimensions
     * @param {string} dataUrl - Signature data URL
     * @returns {Promise<Object>}
     */
    async getSignatureDimensions(dataUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height,
                    aspectRatio: img.width / img.height
                });
            };
            img.src = dataUrl || this.currentSignature;
        });
    },

    /**
     * Dispose of resources
     */
    dispose() {
        if (this.signaturePad) {
            this.signaturePad.off();
            this.signaturePad = null;
        }
        this.currentSignature = null;
    }
};

// Export for use in other modules
window.PDFSigner = PDFSigner;
