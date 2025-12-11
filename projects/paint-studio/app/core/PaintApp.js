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
            quickshapeEnabled: true
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

            // Initialize UI controller
            this.ui = new UIController(this);
            this.ui.init();

            // Create default project
            await this.newProject({
                name: 'Nový projekt',
                width: this.settings.canvasWidth,
                height: this.settings.canvasHeight,
                backgroundColor: this.settings.backgroundColor
            });

            this.isInitialized = true;
            console.log('Paint Studio initialized');

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
}
