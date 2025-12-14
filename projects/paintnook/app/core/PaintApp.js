/**
 * PaintApp - Main Application Controller
 * Coordinates all painting functionality
 */

import { CanvasManager } from './CanvasManager.js';
import { LayerManager } from './LayerManager.js';
import { ToolManager } from '../tools/ToolManager.js';
import { BrushEngine } from '../tools/BrushEngine.js';
import { ColorPicker } from '../ui/ColorPicker.js';
import { HistoryManager } from './HistoryManager.js';
import { StorageManager } from '../utils/StorageManager.js';
import { QuickShape } from '../tools/QuickShape.js';
import { StreamLine } from '../tools/StreamLine.js';
import { UIController } from '../ui/UIController.js';
import { SelectionManager } from '../tools/SelectionManager.js';
import { CollaborationManager } from './CollaborationManager.js';
import { BackgroundRemover } from '../utils/BackgroundRemover.js';
import { PixelArtManager } from '../pixelart/PixelArtManager.js';
import { AnimationManager } from '../pixelart/AnimationManager.js';
import { ColorAdjustments } from '../pixelart/ColorAdjustments.js';
import { GoogleFontsManager } from '../utils/GoogleFontsManager.js';

export class PaintApp {
    constructor() {
        // State
        this.isInitialized = false;
        this.isPaused = false;
        this.currentProject = null;
        this.unsavedChanges = false;

        // Settings
        this.settings = {
            canvasWidth: 1920,
            canvasHeight: 1080,
            backgroundColor: '#ffffff',
            pressureSensitivity: true,
            streamlineEnabled: true,
            streamlineAmount: 50,
            quickshapeEnabled: true,
            quickshapePreview: true,
            pixelArtMode: false
        };

        // Managers will be initialized in init()
        this.canvas = null;
        this.layers = null;
        this.tools = null;
        this.brush = null;
        this.color = null;
        this.history = null;
        this.storage = null;
        this.quickShape = null;
        this.streamLine = null;
        this.ui = null;
        this.selection = null;
        this.collab = null;
        this.bgRemover = null;

        // Pixel Art modules
        this.pixelArt = null;
        this.animation = null;
        this.colorAdjust = null;

        // Google Fonts manager
        this.googleFonts = null;
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Initialize storage first
            this.storage = new StorageManager();
            await this.storage.init();

            // Load saved settings
            const savedSettings = await this.storage.getSettings();
            if (savedSettings) {
                this.settings = { ...this.settings, ...savedSettings };
            }

            // Initialize canvas manager
            this.canvas = new CanvasManager(this);
            await this.canvas.init();

            // Initialize layer manager
            this.layers = new LayerManager(this);
            this.layers.init();

            // Initialize history (undo/redo)
            this.history = new HistoryManager(this);

            // Initialize brush engine
            this.brush = new BrushEngine(this);

            // Initialize tool manager
            this.tools = new ToolManager(this);
            this.tools.init();

            // Initialize color picker
            this.color = new ColorPicker(this);
            this.color.init();

            // Initialize QuickShape detection
            this.quickShape = new QuickShape(this);

            // Initialize StreamLine smoothing
            this.streamLine = new StreamLine(this);

            // Initialize selection manager
            this.selection = new SelectionManager(this);

            // Initialize Pixel Art modules (before UI so PixelArtUI can access them)
            this.pixelArt = new PixelArtManager(this);
            this.pixelArt.init();

            this.animation = new AnimationManager(this);
            this.animation.init();

            this.colorAdjust = new ColorAdjustments(this);

            // Initialize UI controller (after pixel art modules)
            this.ui = new UIController(this);
            this.ui.init();

            // Initialize collaboration manager
            this.collab = new CollaborationManager(this);

            // Initialize background remover (lazy loading)
            this.bgRemover = new BackgroundRemover(this);

            // Initialize Google Fonts manager (async loading in background)
            this.googleFonts = new GoogleFontsManager(this);
            this.googleFonts.init().catch(err => {
                console.warn('Google Fonts initialization failed:', err);
            });

            // Create default project
            await this.newProject({
                name: 'Nový projekt',
                width: this.settings.canvasWidth,
                height: this.settings.canvasHeight,
                backgroundColor: this.settings.backgroundColor
            });

            this.isInitialized = true;
            console.log('PaintNook initialized');

        } catch (error) {
            console.error('Initialization error:', error);
            throw error;
        }
    }

    /**
     * Create a new project
     */
    async newProject(options = {}) {
        const {
            name = 'Nový projekt',
            width = 1920,
            height = 1080,
            backgroundColor = '#ffffff'
        } = options;

        // Clear history
        this.history.clear();

        // Setup canvas
        this.canvas.resize(width, height);

        // Clear and setup layers
        this.layers.clear();

        // Create background layer
        const bgLayer = this.layers.addLayer('Pozadí');
        if (backgroundColor !== 'transparent') {
            const ctx = bgLayer.canvas.getContext('2d');
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);
        }
        bgLayer.locked = true;

        // Create initial drawing layer
        this.layers.addLayer('Vrstva 1');
        this.layers.setActiveLayer(1);

        // Set project info
        this.currentProject = {
            id: Date.now().toString(),
            name,
            width,
            height,
            backgroundColor,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };

        // Update canvas and UI
        this.canvas.render();
        this.ui.updateLayersList();
        this.ui.updateCanvasInfo();

        this.unsavedChanges = false;
    }

    /**
     * Save current project
     */
    async saveProject() {
        if (!this.currentProject) return;

        try {
            // Update modified date
            this.currentProject.modified = new Date().toISOString();

            // Serialize layers
            const layersData = await this.layers.serialize();

            // Create project data
            const projectData = {
                ...this.currentProject,
                layers: layersData
            };

            // Save to storage
            await this.storage.saveProject(projectData);

            this.unsavedChanges = false;
            this.ui.showNotification('Projekt uložen', 'success');

            return projectData;
        } catch (error) {
            console.error('Save error:', error);
            this.ui.showNotification('Chyba při ukládání', 'error');
            throw error;
        }
    }

    /**
     * Load a project
     */
    async loadProject(projectId) {
        try {
            const projectData = await this.storage.loadProject(projectId);
            if (!projectData) {
                throw new Error('Project not found');
            }

            // Clear history
            this.history.clear();

            // Setup canvas
            this.canvas.resize(projectData.width, projectData.height);

            // Load layers
            await this.layers.deserialize(projectData.layers);

            // Set project info
            this.currentProject = {
                id: projectData.id,
                name: projectData.name,
                width: projectData.width,
                height: projectData.height,
                backgroundColor: projectData.backgroundColor,
                created: projectData.created,
                modified: projectData.modified
            };

            // Render
            this.canvas.render();
            this.ui.updateLayersList();
            this.ui.updateCanvasInfo();

            this.unsavedChanges = false;
            this.ui.showNotification('Projekt načten', 'success');

        } catch (error) {
            console.error('Load error:', error);
            this.ui.showNotification('Chyba při načítání', 'error');
            throw error;
        }
    }

    /**
     * Export canvas as image
     */
    async exportImage(format = 'png', quality = 0.92, filename = 'muj-obrazek') {
        try {
            const dataUrl = this.canvas.export(format, quality);

            // Create download link
            const link = document.createElement('a');
            link.download = `${filename}.${format}`;
            link.href = dataUrl;
            link.click();

            this.ui.showNotification('Export dokončen', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.ui.showNotification('Chyba při exportu', 'error');
            throw error;
        }
    }

    /**
     * Import image to new layer
     */
    async importImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Create new layer with imported image
                    const layer = this.layers.addLayer(file.name);
                    const ctx = layer.canvas.getContext('2d');

                    // Center the image
                    const x = (this.canvas.width - img.width) / 2;
                    const y = (this.canvas.height - img.height) / 2;
                    ctx.drawImage(img, x, y);

                    this.canvas.render();
                    this.ui.updateLayersList();
                    this.markUnsaved();

                    resolve(layer);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Mark project as having unsaved changes
     */
    markUnsaved() {
        this.unsavedChanges = true;
    }

    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges() {
        return this.unsavedChanges;
    }

    /**
     * Pause the application (when tab is hidden)
     */
    pause() {
        this.isPaused = true;
    }

    /**
     * Resume the application
     */
    resume() {
        this.isPaused = false;
        this.canvas.render();
    }

    /**
     * Get current brush settings
     */
    getBrushSettings() {
        return {
            size: this.brush.size,
            opacity: this.brush.opacity,
            hardness: this.brush.hardness,
            color: this.color.getPrimaryColor(),
            pressureSensitivity: this.settings.pressureSensitivity
        };
    }

    /**
     * Update brush settings
     */
    updateBrushSettings(settings) {
        if (settings.size !== undefined) this.brush.size = settings.size;
        if (settings.opacity !== undefined) this.brush.opacity = settings.opacity;
        if (settings.hardness !== undefined) this.brush.hardness = settings.hardness;
    }

    /**
     * Get current tool
     */
    getCurrentTool() {
        return this.tools.currentTool;
    }

    /**
     * Set current tool
     */
    setTool(toolName) {
        this.tools.setTool(toolName);
    }

    /**
     * Paste image from clipboard to new layer
     */
    async pasteFromClipboard() {
        try {
            const clipboardItems = await navigator.clipboard.read();

            for (const item of clipboardItems) {
                // Look for image types
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        const img = new Image();

                        return new Promise((resolve, reject) => {
                            img.onload = () => {
                                // Create new layer with pasted image
                                const layer = this.layers.addLayer('Vložený obrázek');
                                if (!layer) {
                                    reject(new Error('Cannot create layer'));
                                    return;
                                }

                                const ctx = layer.canvas.getContext('2d');

                                // Center the image
                                const x = (this.canvas.width - img.width) / 2;
                                const y = (this.canvas.height - img.height) / 2;
                                ctx.drawImage(img, x, y);

                                this.canvas.render();
                                this.ui.updateLayersList();
                                this.markUnsaved();
                                this.ui.showNotification('Obrázek vložen', 'success');

                                URL.revokeObjectURL(img.src);
                                resolve(layer);
                            };

                            img.onerror = () => {
                                URL.revokeObjectURL(img.src);
                                reject(new Error('Failed to load image'));
                            };

                            img.src = URL.createObjectURL(blob);
                        });
                    }
                }
            }

            this.ui.showNotification('Ve schránce není obrázek', 'warning');
        } catch (error) {
            console.error('Paste error:', error);
            if (error.name === 'NotAllowedError') {
                this.ui.showNotification('Přístup ke schránce zamítnut', 'error');
            } else {
                this.ui.showNotification('Chyba při vkládání', 'error');
            }
        }
    }

    /**
     * Copy active layer to clipboard
     */
    async copyToClipboard() {
        try {
            const layer = this.layers.getActiveLayer();
            if (!layer) return;

            const blob = await new Promise(resolve => {
                layer.canvas.toBlob(resolve, 'image/png');
            });

            await navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': blob
                })
            ]);

            this.ui.showNotification('Zkopírováno do schránky', 'success');
        } catch (error) {
            console.error('Copy error:', error);
            this.ui.showNotification('Chyba při kopírování', 'error');
        }
    }

    /**
     * Cut active layer content to clipboard
     */
    async cutToClipboard() {
        try {
            await this.copyToClipboard();

            const layer = this.layers.getActiveLayer();
            if (layer && !layer.locked) {
                const ctx = layer.canvas.getContext('2d');
                ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
                this.canvas.render();
                this.markUnsaved();
            }
        } catch (error) {
            console.error('Cut error:', error);
        }
    }
}
