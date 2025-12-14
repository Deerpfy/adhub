/**
 * BackgroundRemover - AI-powered background removal for PaintNook
 * Uses @imgly/background-removal for 100% client-side processing
 */

export class BackgroundRemover {
    constructor(app) {
        this.app = app;
        this.removeBackground = null;
        this.isLoaded = false;
        this.isProcessing = false;
        this.translations = {
            cs: {
                title: 'Odstranit pozadí',
                subtitle: 'AI odstraní pozadí z aktivní vrstvy',
                processing: 'Zpracovávám...',
                loading_model: 'Stahuji AI model (~40 MB)...',
                downloading: 'Stahování modelu',
                removing_bg: 'Odstraňuji pozadí...',
                finalizing: 'Dokončuji...',
                success: 'Pozadí úspěšně odstraněno',
                error: 'Chyba při odstraňování pozadí',
                no_layer: 'Vyberte vrstvu s obrázkem',
                empty_layer: 'Aktivní vrstva je prázdná',
                apply_to: 'Aplikovat na:',
                current_layer: 'Aktuální vrstvu',
                new_layer: 'Novou vrstvu',
                cancel: 'Zrušit',
                apply: 'Aplikovat',
                first_load: 'První zpracování stáhne AI model (~40 MB)',
                free: 'FREE',
                free_tooltip: 'Zdarma, bez vodoznaku, 100% offline'
            },
            en: {
                title: 'Remove Background',
                subtitle: 'AI will remove background from active layer',
                processing: 'Processing...',
                loading_model: 'Downloading AI model (~40 MB)...',
                downloading: 'Downloading model',
                removing_bg: 'Removing background...',
                finalizing: 'Finalizing...',
                success: 'Background successfully removed',
                error: 'Error removing background',
                no_layer: 'Select a layer with an image',
                empty_layer: 'Active layer is empty',
                apply_to: 'Apply to:',
                current_layer: 'Current layer',
                new_layer: 'New layer',
                cancel: 'Cancel',
                apply: 'Apply',
                first_load: 'First processing downloads AI model (~40 MB)',
                free: 'FREE',
                free_tooltip: 'Free, no watermark, 100% offline'
            }
        };
        this.lang = 'cs';
    }

    /**
     * Get translation
     */
    t(key) {
        return this.translations[this.lang]?.[key] || this.translations.en[key] || key;
    }

    /**
     * Set language
     */
    setLanguage(lang) {
        this.lang = lang === 'en' ? 'en' : 'cs';
    }

    /**
     * Initialize the background removal library
     */
    async init() {
        if (this.isLoaded) return true;

        try {
            const module = await import('../../vendor/background-removal.js');
            this.removeBackground = module.removeBackground;
            this.isLoaded = true;
            console.log('Background removal library loaded successfully');
            return true;
        } catch (error) {
            console.error('Failed to load background removal library:', error);
            return false;
        }
    }

    /**
     * Check if active layer has content
     */
    hasLayerContent() {
        const layer = this.app.layers.getActiveLayer();
        if (!layer || !layer.canvas) return false;

        const ctx = layer.canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);

        // Check if there are any non-transparent pixels
        for (let i = 3; i < imageData.data.length; i += 4) {
            if (imageData.data[i] > 0) return true;
        }
        return false;
    }

    /**
     * Get active layer as blob
     */
    async getLayerBlob() {
        const layer = this.app.layers.getActiveLayer();
        if (!layer || !layer.canvas) return null;

        return new Promise(resolve => {
            layer.canvas.toBlob(resolve, 'image/png');
        });
    }

    /**
     * Remove background from active layer
     */
    async process(options = {}) {
        const { applyToNewLayer = false, onProgress = null } = options;

        if (this.isProcessing) {
            throw new Error('Already processing');
        }

        if (!this.hasLayerContent()) {
            throw new Error(this.t('empty_layer'));
        }

        // Load library if not loaded
        if (!this.isLoaded) {
            const loaded = await this.init();
            if (!loaded) {
                throw new Error(this.t('error'));
            }
        }

        this.isProcessing = true;

        try {
            // Get layer as blob
            const blob = await this.getLayerBlob();
            if (!blob) {
                throw new Error(this.t('no_layer'));
            }

            let lastProgressUpdate = 0;

            // Process with background removal
            const baseUrl = new URL('../../models/', import.meta.url).href;
            const resultBlob = await this.removeBackground(blob, {
                publicPath: baseUrl,
                progress: (key, current, total) => {
                    if (!onProgress) return;

                    const now = Date.now();
                    if (now - lastProgressUpdate < 100) return;
                    lastProgressUpdate = now;

                    let percent, status;

                    if (key.includes('model') || key.includes('fetch') || key.includes('download')) {
                        percent = 10 + Math.round((current / total) * 40);
                        status = `${this.t('downloading')} ${Math.round((current / total) * 100)}%`;
                    } else if (key.includes('compute') || key.includes('inference') || key.includes('process')) {
                        percent = 50 + Math.round((current / total) * 40);
                        status = this.t('removing_bg');
                    } else {
                        percent = Math.min(90, 20 + Math.round((current / total) * 60));
                        status = this.t('removing_bg');
                    }

                    onProgress(Math.min(percent, 95), status);
                },
                output: {
                    format: 'image/png',
                    quality: 1
                }
            });

            onProgress?.(95, this.t('finalizing'));

            // Load result as image
            const resultImg = await this.blobToImage(resultBlob);

            // Apply to canvas
            await this.applyResult(resultImg, applyToNewLayer);

            this.isProcessing = false;
            return true;

        } catch (error) {
            this.isProcessing = false;
            throw error;
        }
    }

    /**
     * Convert blob to image
     */
    blobToImage(blob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(img.src);
                resolve(img);
            };
            img.onerror = () => {
                URL.revokeObjectURL(img.src);
                reject(new Error('Failed to load result image'));
            };
            img.src = URL.createObjectURL(blob);
        });
    }

    /**
     * Apply result to canvas
     */
    async applyResult(resultImg, applyToNewLayer) {
        // Start recording for undo
        this.app.history.startAction();

        if (applyToNewLayer) {
            // Create new layer with result
            const newLayer = this.app.layers.addLayer('Bez pozadí');
            if (newLayer) {
                const ctx = newLayer.canvas.getContext('2d');
                // Center the image
                const x = (newLayer.canvas.width - resultImg.width) / 2;
                const y = (newLayer.canvas.height - resultImg.height) / 2;
                ctx.drawImage(resultImg, x, y);
            }
        } else {
            // Replace content of active layer
            const layer = this.app.layers.getActiveLayer();
            if (layer && !layer.locked) {
                const ctx = layer.canvas.getContext('2d');
                ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
                // Center the image
                const x = (layer.canvas.width - resultImg.width) / 2;
                const y = (layer.canvas.height - resultImg.height) / 2;
                ctx.drawImage(resultImg, x, y);
            }
        }

        // End recording for undo
        this.app.history.endAction();

        // Render and update UI
        this.app.canvas.render();
        this.app.ui.updateLayersList();
        this.app.markUnsaved();
    }

    /**
     * Cancel processing (if possible)
     */
    cancel() {
        // Note: The library doesn't support cancellation, but we can prevent the result from being applied
        this.isProcessing = false;
    }
}
