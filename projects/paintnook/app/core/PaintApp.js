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
import { VectorManager } from '../vector/VectorManager.js';
import { VectorUI } from '../vector/VectorUI.js';
import { RulerGuideManager } from '../utils/RulerGuideManager.js';

export class PaintApp {
    constructor() {
        // State
        this.isInitialized = false;
        this.isPaused = false;
        this.currentProject = null;
        this.unsavedChanges = false;

        // Version tracking
        this.loadedVersion = null;       // Which version is currently loaded
        this.currentVersion = null;      // Latest version number
        this.isOldVersion = false;       // Whether we're viewing an old version
        this.oldVersionBanner = null;    // Reference to warning banner element

        // Settings
        this.settings = {
            canvasWidth: 1920,
            canvasHeight: 1080,
            backgroundColor: '#ffffff',
            pressureSensitivity: true,
            streamlineEnabled: true,
            streamlineAmount: 0,
            quickshapeEnabled: false,
            quickshapePreview: false,
            pixelArtMode: false,
            vectorMode: false
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

        // Vector modules
        this.vector = null;
        this.vectorUI = null;

        // Google Fonts manager
        this.googleFonts = null;

        // Ruler and Guide manager
        this.rulerGuide = null;
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

            // Initialize ruler and guide manager
            this.rulerGuide = new RulerGuideManager(this);
            this.rulerGuide.init();

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
            // Sync streamline amount from settings
            if (typeof this.settings.streamlineAmount === 'number') {
                this.streamLine.setAmount(this.settings.streamlineAmount);
            }

            // Initialize selection manager
            this.selection = new SelectionManager(this);

            // Initialize Pixel Art modules (before UI so PixelArtUI can access them)
            this.pixelArt = new PixelArtManager(this);
            this.pixelArt.init();

            this.animation = new AnimationManager(this);
            this.animation.init();

            this.colorAdjust = new ColorAdjustments(this);

            // Initialize Vector modules
            this.vector = new VectorManager(this);
            this.vector.init();

            this.vectorUI = new VectorUI(this);
            this.vectorUI.init();

            // Initialize UI controller (after pixel art and vector modules)
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
            backgroundColor = '#ffffff',
            profile = 'digital',
            pixelArtMode = false,
            vectorMode = false,
            gridSize = 16
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

        // Set project info including profile
        this.currentProject = {
            id: Date.now().toString(),
            name,
            width,
            height,
            backgroundColor,
            profile,
            pixelArtMode,
            vectorMode,
            gridSize,
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
     * @param {Object} options - Save options
     * @param {boolean} options.forceNewVersion - Force creating new version even from old version
     */
    async saveProject(options = {}) {
        if (!this.currentProject) return;

        // Check if saving from old version
        if (this.isOldVersion && !options.forceNewVersion) {
            return this.showSaveVersionDialog();
        }

        try {
            // Update modified date
            this.currentProject.modified = new Date().toISOString();

            // Serialize layers
            const layersData = await this.layers.serialize();

            // Create thumbnail from composite canvas
            const thumbnail = this.createThumbnail();

            // Create project data
            const projectData = {
                ...this.currentProject,
                layers: layersData,
                thumbnail
            };

            // Save to storage with versioning
            const savedData = await this.storage.saveProject(projectData, {
                createNewVersion: true
            });

            // Update version tracking
            this.currentVersion = savedData.version || savedData.currentVersion;
            this.loadedVersion = this.currentVersion;
            this.isOldVersion = false;
            this.currentProject.currentVersion = this.currentVersion;

            // Remove old version banner if exists
            this.hideOldVersionBanner();

            this.unsavedChanges = false;
            this.ui.showNotification(`Projekt uložen (v${this.currentVersion})`, 'success');

            return savedData;
        } catch (error) {
            console.error('Save error:', error);
            this.ui.showNotification('Chyba při ukládání', 'error');
            throw error;
        }
    }

    /**
     * Show dialog for saving when in old version
     */
    showSaveVersionDialog() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'welcome-modal';
            modal.innerHTML = `
                <div class="welcome-modal-content save-version-modal">
                    <button class="modal-close" aria-label="Zavřít">&times;</button>
                    <h2>Uložit změny</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 16px;">
                        Prohlížíte starší verzi (v${this.loadedVersion}). Aktuální verze je v${this.currentVersion}.
                        <br>Jak chcete uložit změny?
                    </p>

                    <div class="save-version-options">
                        <label class="save-version-option selected" data-action="new">
                            <input type="radio" name="saveAction" value="new" checked>
                            <div class="save-version-option-content">
                                <div class="save-version-option-title">Uložit jako novou verzi (v${this.currentVersion + 1})</div>
                                <div class="save-version-option-desc">Vytvoří novou verzi a zachová historii. Doporučeno.</div>
                            </div>
                        </label>

                        <label class="save-version-option" data-action="overwrite">
                            <input type="radio" name="saveAction" value="overwrite">
                            <div class="save-version-option-content">
                                <div class="save-version-option-title">Přepsat aktuální verzi (v${this.currentVersion})</div>
                                <div class="save-version-option-desc">Přepíše nejnovější verzi. Původní v${this.currentVersion} bude nahrazena.</div>
                            </div>
                        </label>
                    </div>

                    <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
                        <button type="button" class="btn-cancel" style="padding: 10px 20px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); cursor: pointer;">Zrušit</button>
                        <button type="button" class="btn-save" style="padding: 10px 20px; background: var(--primary-color); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer;">Uložit</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Handle option selection
            modal.querySelectorAll('.save-version-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    modal.querySelectorAll('.save-version-option').forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    opt.querySelector('input').checked = true;
                });
            });

            // Handle save
            modal.querySelector('.btn-save').addEventListener('click', async () => {
                const action = modal.querySelector('input[name="saveAction"]:checked').value;
                modal.remove();

                if (action === 'new') {
                    // Save as new version
                    await this.saveProject({ forceNewVersion: true });
                } else {
                    // Overwrite current version
                    await this.saveProjectOverwrite();
                }
                resolve();
            });

            // Handle close
            const close = () => {
                modal.remove();
                resolve();
            };

            modal.querySelector('.modal-close').addEventListener('click', close);
            modal.querySelector('.btn-cancel').addEventListener('click', close);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) close();
            });
        });
    }

    /**
     * Save project by overwriting current version
     */
    async saveProjectOverwrite() {
        if (!this.currentProject) return;

        try {
            this.currentProject.modified = new Date().toISOString();

            const layersData = await this.layers.serialize();
            const thumbnail = this.createThumbnail();

            const projectData = {
                ...this.currentProject,
                layers: layersData,
                thumbnail
            };

            // Save with overwrite flag
            await this.storage.saveProject(projectData, {
                createNewVersion: false,
                overwriteVersion: true
            });

            // Update state
            this.loadedVersion = this.currentVersion;
            this.isOldVersion = false;
            this.hideOldVersionBanner();

            this.unsavedChanges = false;
            this.ui.showNotification(`Verze v${this.currentVersion} přepsána`, 'success');

        } catch (error) {
            console.error('Save overwrite error:', error);
            this.ui.showNotification('Chyba při ukládání', 'error');
            throw error;
        }
    }

    /**
     * Show banner warning about old version
     */
    showOldVersionBanner() {
        if (this.oldVersionBanner) return;

        this.oldVersionBanner = document.createElement('div');
        this.oldVersionBanner.className = 'old-version-banner';
        this.oldVersionBanner.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/>
            </svg>
            <span class="old-version-banner-text">
                Prohlížíte starší verzi <strong>v${this.loadedVersion}</strong>. Nejnovější verze je v${this.currentVersion}.
            </span>
            <div class="old-version-banner-actions">
                <button class="btn-banner btn-banner--primary" data-action="load-latest">Načíst nejnovější</button>
                <button class="btn-banner btn-banner--secondary" data-action="dismiss">Rozumím</button>
            </div>
        `;

        document.body.appendChild(this.oldVersionBanner);
        document.body.classList.add('has-old-version-banner');

        // Handle actions
        this.oldVersionBanner.querySelector('[data-action="load-latest"]').addEventListener('click', async () => {
            await this.loadProject(this.currentProject.id);
        });

        this.oldVersionBanner.querySelector('[data-action="dismiss"]').addEventListener('click', () => {
            this.hideOldVersionBanner();
        });
    }

    /**
     * Hide old version banner
     */
    hideOldVersionBanner() {
        if (this.oldVersionBanner) {
            this.oldVersionBanner.remove();
            this.oldVersionBanner = null;
            document.body.classList.remove('has-old-version-banner');
        }
    }

    /**
     * Create thumbnail from current canvas state
     * @param {number} maxSize - Maximum dimension for thumbnail
     * @returns {string|null} - Data URL of thumbnail or null
     */
    createThumbnail(maxSize = 400) {
        try {
            // Get composite canvas with all visible layers
            const compositeCanvas = this.canvas.getCompositeCanvas();
            if (!compositeCanvas) return null;

            // Calculate scaled dimensions maintaining aspect ratio
            const { width, height } = compositeCanvas;
            let thumbWidth = width;
            let thumbHeight = height;

            if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize / width, maxSize / height);
                thumbWidth = Math.round(width * ratio);
                thumbHeight = Math.round(height * ratio);
            }

            // Create thumbnail canvas
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = thumbWidth;
            thumbCanvas.height = thumbHeight;
            const ctx = thumbCanvas.getContext('2d');

            // Draw scaled composite
            ctx.drawImage(compositeCanvas, 0, 0, thumbWidth, thumbHeight);

            // Return as data URL (JPEG for smaller size)
            return thumbCanvas.toDataURL('image/jpeg', 0.85);
        } catch (error) {
            console.warn('Failed to create thumbnail:', error);
            return null;
        }
    }

    /**
     * Load a project
     * @param {string} projectId - Project ID
     * @param {number|null} version - Optional specific version to load
     */
    async loadProject(projectId, version = null) {
        try {
            const projectData = await this.storage.loadProject(projectId, version);
            if (!projectData) {
                throw new Error('Project not found');
            }

            // Clear history
            this.history.clear();

            // Reset modes before loading new project
            this.resetModes();

            // Hide any existing version banner
            this.hideOldVersionBanner();

            // Setup canvas
            this.canvas.resize(projectData.width, projectData.height);

            // Load layers
            await this.layers.deserialize(projectData.layers);

            // Set project info including profile data
            this.currentProject = {
                id: projectData.id,
                name: projectData.name,
                width: projectData.width,
                height: projectData.height,
                backgroundColor: projectData.backgroundColor,
                profile: projectData.profile || 'digital',
                pixelArtMode: projectData.pixelArtMode || false,
                vectorMode: projectData.vectorMode || false,
                gridSize: projectData.gridSize || 16,
                tags: projectData.tags || [],
                created: projectData.created,
                modified: projectData.modified,
                currentVersion: projectData.currentVersion || 1
            };

            // Update version tracking
            this.currentVersion = projectData.currentVersion || 1;
            this.loadedVersion = projectData.loadedVersion || this.currentVersion;
            this.isOldVersion = projectData.isOldVersion || false;

            // Render
            this.canvas.render();
            this.ui.updateLayersList();
            this.ui.updateCanvasInfo();

            // Apply profile-specific settings after rendering
            this.applyProfileSettings();

            this.unsavedChanges = false;

            // Show notification and banner if loading old version
            if (this.isOldVersion) {
                this.ui.showNotification(`Načtena verze v${this.loadedVersion} (nejnovější: v${this.currentVersion})`, 'warning');
                this.showOldVersionBanner();
            } else {
                this.ui.showNotification(`Projekt načten (v${this.currentVersion})`, 'success');
            }

        } catch (error) {
            console.error('Load error:', error);
            this.ui.showNotification('Chyba při načítání', 'error');
            throw error;
        }
    }

    /**
     * Reset all modes (pixel art, vector) to default state
     */
    resetModes() {
        // Disable pixel art mode if active
        if (this.settings.pixelArtMode && this.ui?.pixelArtUI) {
            this.ui.pixelArtUI.togglePixelArtMode(false);
            const toggle = document.getElementById('pixelArtModeToggle');
            if (toggle) toggle.checked = false;
        }
        this.settings.pixelArtMode = false;

        // Disable vector mode if active
        if (this.settings.vectorMode && this.vector) {
            this.vector.disable();
            if (this.vectorUI) {
                this.vectorUI.hide();
            }
        }
        this.settings.vectorMode = false;
    }

    /**
     * Apply profile-specific settings based on currentProject
     */
    applyProfileSettings() {
        if (!this.currentProject) return;

        const { profile, pixelArtMode, vectorMode, gridSize, backgroundColor, width, height } = this.currentProject;

        // Apply Pixel Art mode
        if (pixelArtMode && this.ui?.pixelArtUI) {
            this.settings.pixelArtMode = true;

            // Update toggle checkbox
            const toggle = document.getElementById('pixelArtModeToggle');
            if (toggle) toggle.checked = true;

            // Enable pixel art mode
            this.ui.pixelArtUI.togglePixelArtMode(true);

            // Update grid options and set grid size
            this.ui.pixelArtUI.updateGridSizeOptions();
            if (gridSize && this.pixelArt) {
                const maxAllowed = this.ui.pixelArtUI.getMaxGridSize();
                const validGridSize = Math.min(gridSize, maxAllowed);
                this.pixelArt.setGridSize(validGridSize);
                this.pixelArt.grid.size = validGridSize;

                const gridSizeSelect = document.getElementById('gridSize');
                if (gridSizeSelect) gridSizeSelect.value = validGridSize.toString();
            }

            // Set grid color based on background
            if (this.pixelArt) {
                const isTransparent = !backgroundColor || backgroundColor === 'transparent';
                const gridColor = isTransparent ? '#ffffff' : '#000000';
                this.pixelArt.grid.color = gridColor;

                const gridColorInput = document.getElementById('gridColor');
                if (gridColorInput) gridColorInput.value = gridColor;

                this.ui.pixelArtUI.updateGridOverlay();
                this.pixelArt.saveSettings();
            }
        }

        // Apply Vector mode
        if (vectorMode && this.vector) {
            this.settings.vectorMode = true;

            // Enable vector mode
            this.vector.enable(width, height);

            // Set background color
            if (backgroundColor) {
                this.vector.setBackgroundColor(backgroundColor);
            }

            // Show vector UI
            if (this.vectorUI) {
                this.vectorUI.show();
                this.vectorUI.syncWithVectorManager();
            }

            // Hide left toolbar in vector mode (vector has its own tools)
            // Note: panelRight stays visible - VectorUI.show() swaps its sections
            const toolbarLeft = document.getElementById('toolbarLeft');
            if (toolbarLeft) toolbarLeft.style.display = 'none';

            // Hide pixel art sections (already handled by VectorUI.show(), but ensure it)
            const pixelArtSection = document.getElementById('pixelArtSection');
            const paletteSection = document.getElementById('paletteSection');
            if (pixelArtSection) pixelArtSection.style.display = 'none';
            if (paletteSection) paletteSection.style.display = 'none';
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
