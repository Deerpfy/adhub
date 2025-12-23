/**
 * UIController - Manages all UI interactions
 */

import { PixelArtUI } from './PixelArtUI.js';

export class UIController {
    constructor(app) {
        this.app = app;
        this.notificationTimeout = null;
        this.contextMenu = null;
        this.layerContextMenu = null;
        this.isFullscreen = false;
        this.draggedLayerIndex = null;
        this.selectedLayers = new Set(); // Multi-select support
        this.pixelArtUI = null; // Pixel Art UI controller

        // Keyboard shortcuts presets
        this.keyboardPresets = {
            'paintnook': {
                name: 'PaintNook (Výchozí)',
                shortcuts: {
                    brush: 'B', pencil: 'P', eraser: 'E', line: 'L',
                    rectangle: 'U', ellipse: 'O', fill: 'G', eyedropper: 'I',
                    move: 'V', text: 'T', undo: 'Ctrl+Z', redo: 'Ctrl+Y', save: 'Ctrl+S',
                    zoomIn: 'Ctrl++', zoomOut: 'Ctrl+-', fitView: 'Ctrl+0',
                    fullscreen: 'F', swapColors: 'X'
                }
            },
            'photoshop': {
                name: 'Adobe Photoshop',
                shortcuts: {
                    brush: 'B', pencil: 'B', eraser: 'E', line: 'U',
                    rectangle: 'U', ellipse: 'U', fill: 'G', eyedropper: 'I',
                    move: 'V', text: 'T', undo: 'Ctrl+Z', redo: 'Ctrl+Shift+Z', save: 'Ctrl+S',
                    zoomIn: 'Ctrl++', zoomOut: 'Ctrl+-', fitView: 'Ctrl+0',
                    fullscreen: 'F', swapColors: 'X'
                }
            },
            'photopea': {
                name: 'Photopea',
                shortcuts: {
                    brush: 'B', pencil: 'N', eraser: 'E', line: 'L',
                    rectangle: 'U', ellipse: 'U', fill: 'G', eyedropper: 'I',
                    move: 'V', text: 'T', undo: 'Ctrl+Z', redo: 'Ctrl+Y', save: 'Ctrl+S',
                    zoomIn: 'Ctrl++', zoomOut: 'Ctrl+-', fitView: 'Ctrl+0',
                    fullscreen: 'F', swapColors: 'X'
                }
            },
            'procreate': {
                name: 'Procreate Style',
                shortcuts: {
                    brush: 'B', pencil: 'P', eraser: 'E', line: 'L',
                    rectangle: 'R', ellipse: 'O', fill: 'G', eyedropper: 'I',
                    move: 'M', text: 'T', undo: 'Ctrl+Z', redo: 'Ctrl+Shift+Z', save: 'Ctrl+S',
                    zoomIn: 'Ctrl++', zoomOut: 'Ctrl+-', fitView: 'Ctrl+0',
                    fullscreen: 'F', swapColors: 'X'
                }
            }
        };

        // Current keyboard shortcuts (load from storage or use default)
        this.currentShortcuts = { ...this.keyboardPresets['paintnook'].shortcuts };
        this.currentPreset = 'paintnook';
    }

    /**
     * Initialize UI controller
     */
    init() {
        this.setupHeaderButtons();
        this.setupMenuButtons();
        this.setupModals();
        this.setupBrushSettings();
        this.setupLayerControls();
        this.setupFloatingLayersControls();
        this.setupZoomControls();
        this.setupPanelCollapse();
        this.setupContextMenu();
        this.setupFullscreen();
        this.createFullscreenHint();

        // Initialize Pixel Art UI
        this.pixelArtUI = new PixelArtUI(this.app);
        this.pixelArtUI.init();
        this.loadKeyboardPreset();
        this.setupCollaboration();
        this.setupBgRemover();
        this.setupLayerContextMenu();

        // Initialize Ruler & Guide UI
        this.setupRulerGuideUI();

        // Initialize Code Generator UI
        this.setupCodeGenerator();
    }

    /**
     * Setup Ruler & Guide UI controls
     */
    setupRulerGuideUI() {
        // Rulers toggle
        const rulersToggle = document.getElementById('rulersEnabled');
        if (rulersToggle) {
            rulersToggle.addEventListener('change', (e) => {
                this.app.rulerGuide?.setRulersEnabled(e.target.checked);
            });
        }

        // Guides toggle
        const guidesToggle = document.getElementById('guidesEnabled');
        if (guidesToggle) {
            guidesToggle.addEventListener('change', (e) => {
                this.app.rulerGuide?.setGuidesEnabled(e.target.checked);
            });
        }

        // Snapping toggle
        const snappingToggle = document.getElementById('snappingEnabled');
        const snapOptions = document.getElementById('snapOptions');
        if (snappingToggle) {
            snappingToggle.addEventListener('change', (e) => {
                this.app.rulerGuide?.setSnappingEnabled(e.target.checked);
                // Show/hide snap options
                if (snapOptions) {
                    snapOptions.style.display = e.target.checked ? 'flex' : 'none';
                }
            });
        }

        // Snap options
        document.getElementById('snapToEdges')?.addEventListener('change', (e) => {
            if (this.app.rulerGuide) {
                this.app.rulerGuide.snapping.toEdges = e.target.checked;
            }
        });

        document.getElementById('snapToCenter')?.addEventListener('change', (e) => {
            if (this.app.rulerGuide) {
                this.app.rulerGuide.snapping.toCenter = e.target.checked;
            }
        });

        document.getElementById('snapToHalves')?.addEventListener('change', (e) => {
            if (this.app.rulerGuide) {
                this.app.rulerGuide.snapping.toHalves = e.target.checked;
            }
        });

        document.getElementById('snapToGuides')?.addEventListener('change', (e) => {
            if (this.app.rulerGuide) {
                this.app.rulerGuide.snapping.toGuides = e.target.checked;
            }
        });

        // Clear guides button
        document.getElementById('clearGuidesBtn')?.addEventListener('click', () => {
            this.app.rulerGuide?.clearGuides();
            this.showNotification('Vodítka smazána', 'success');
        });
    }

    /**
     * Setup Code Generator UI
     */
    setupCodeGenerator() {
        const generateBtn = document.getElementById('generateCodeBtn');
        const formatSelect = document.getElementById('codeFormatSelect');
        const sourceSelect = document.getElementById('codeSourceSelect');
        const modal = document.getElementById('codeGeneratorModal');
        const modalFormatSelect = document.getElementById('codeModalFormatSelect');
        const codeOutput = document.getElementById('generatedCodeContent');
        const filenameEl = document.getElementById('codeFilename');
        const copyBtn = document.getElementById('copyCodeBtn');
        const downloadBtn = document.getElementById('downloadCodeBtn');
        const regenerateBtn = document.getElementById('regenerateCodeBtn');

        // Store current settings
        let currentFormat = 'canvas';
        let currentSource = 'active';

        // Generate code button
        generateBtn?.addEventListener('click', () => {
            currentFormat = formatSelect?.value || 'canvas';
            currentSource = sourceSelect?.value || 'active';
            this.generateAndShowCode(currentFormat, currentSource);
        });

        // Format change in modal
        modalFormatSelect?.addEventListener('change', (e) => {
            currentFormat = e.target.value;
            this.generateAndShowCode(currentFormat, currentSource);
        });

        // Sync format selects
        formatSelect?.addEventListener('change', (e) => {
            currentFormat = e.target.value;
            if (modalFormatSelect) {
                modalFormatSelect.value = e.target.value;
            }
        });

        // Copy code button
        copyBtn?.addEventListener('click', async () => {
            const code = codeOutput?.textContent;
            if (code) {
                try {
                    await navigator.clipboard.writeText(code);
                    this.showNotification('Kód zkopírován do schránky', 'success');
                } catch (err) {
                    this.showNotification('Nepodařilo se zkopírovat kód', 'error');
                }
            }
        });

        // Download code button
        downloadBtn?.addEventListener('click', () => {
            const code = codeOutput?.textContent;
            const filename = filenameEl?.textContent || 'output.js';
            if (code) {
                this.downloadCode(code, filename);
            }
        });

        // Regenerate button
        regenerateBtn?.addEventListener('click', () => {
            this.generateAndShowCode(currentFormat, currentSource);
        });
    }

    /**
     * Generate and display code in modal
     */
    generateAndShowCode(format, source) {
        const codeGenerator = this.app.codeGenerator;
        if (!codeGenerator) return;

        let code = '';
        const filenameEl = document.getElementById('codeFilename');
        const codeOutput = document.getElementById('generatedCodeContent');
        const extensions = { html: 'html', css: 'css', canvas: 'js', cpp: 'cpp' };

        try {
            if (source === 'active') {
                const activeLayer = this.app.layers.getActiveLayer();
                if (activeLayer) {
                    code = codeGenerator.generateCode(activeLayer, format);
                } else {
                    code = '// Žádná aktivní vrstva';
                }
            } else if (source === 'visible') {
                code = codeGenerator.generateAllLayers(format);
            } else {
                // All layers
                const allLayers = this.app.layers.getLayers().filter(l => l.type !== 'folder');
                const codes = allLayers.map(layer => {
                    const layerCode = codeGenerator.generateCode(layer, format);
                    return `// Layer: ${layer.name}\n${layerCode}`;
                });
                code = codes.join('\n\n');
            }

            if (codeOutput) {
                codeOutput.textContent = code;
            }
            if (filenameEl) {
                filenameEl.textContent = `output.${extensions[format] || 'txt'}`;
            }

            this.showModal('codeGeneratorModal');

        } catch (err) {
            console.error('Code generation error:', err);
            if (codeOutput) {
                codeOutput.textContent = `// Chyba při generování kódu:\n// ${err.message}`;
            }
            this.showModal('codeGeneratorModal');
        }
    }

    /**
     * Download code as file
     */
    downloadCode(code, filename) {
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showNotification(`Soubor ${filename} stažen`, 'success');
    }

    /**
     * Setup header buttons
     */
    setupHeaderButtons() {
        // Undo/Redo
        document.getElementById('undoBtn')?.addEventListener('click', () => {
            this.app.history.undo();
        });
        document.getElementById('redoBtn')?.addEventListener('click', () => {
            this.app.history.redo();
        });

        // File operations
        document.getElementById('newBtn')?.addEventListener('click', () => {
            this.showModal('newProjectModal');
        });
        document.getElementById('openBtn')?.addEventListener('click', () => {
            this.openProjectsModal();
        });
        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.showExportModal();
        });
        document.getElementById('saveBtn')?.addEventListener('click', () => {
            this.app.saveProject();
        });

        // Menu button
        document.getElementById('menuBtn')?.addEventListener('click', () => {
            this.showMenu();
        });

        // Share button (collaboration)
        document.getElementById('shareBtn')?.addEventListener('click', () => {
            this.showCollabModal();
        });
    }

    /**
     * Setup menu buttons
     */
    setupMenuButtons() {
        // Close menu
        document.getElementById('closeMenuBtn')?.addEventListener('click', () => {
            this.hideMenu();
        });
        document.getElementById('menuOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'menuOverlay') {
                this.hideMenu();
            }
        });

        // Menu items
        document.getElementById('menuNew')?.addEventListener('click', () => {
            this.hideMenu();
            this.showModal('newProjectModal');
        });
        document.getElementById('menuOpen')?.addEventListener('click', () => {
            this.hideMenu();
            this.openProjectsModal();
        });
        document.getElementById('menuSave')?.addEventListener('click', () => {
            this.hideMenu();
            this.app.saveProject();
        });
        document.getElementById('menuExportPng')?.addEventListener('click', () => {
            this.hideMenu();
            this.showExportModal();
        });
        document.getElementById('menuImport')?.addEventListener('click', () => {
            this.hideMenu();
            this.importImage();
        });

        // Back to welcome screen
        document.getElementById('menuBackToWelcome')?.addEventListener('click', () => {
            this.hideMenu();
            this.backToWelcomeScreen();
        });
    }

    /**
     * Navigate back to welcome screen
     */
    backToWelcomeScreen() {
        // Check for unsaved changes
        if (this.app.hasUnsavedChanges && this.app.hasUnsavedChanges()) {
            if (!confirm('Máte neuložené změny. Opravdu chcete odejít?')) {
                return;
            }
        }

        // Hide main app
        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.style.display = 'none';
        }

        // Show welcome screen
        const welcomeScreen = document.getElementById('welcomeScreen');
        if (welcomeScreen) {
            welcomeScreen.style.display = '';
            welcomeScreen.classList.add('visible');
        }

        // Reload welcome screen to refresh project list
        if (window.welcomeScreenInstance) {
            window.welcomeScreenInstance.refreshProjects();
        } else {
            // Fallback: reload page
            window.location.reload();
        }
    }

    /**
     * Setup modal interactions
     */
    setupModals() {
        // Close buttons
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.modal;
                this.hideModal(modalId);
            });
        });

        // Click outside to close
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hideModal(overlay.id);
                }
            });
        });

        // New project form
        document.getElementById('createProjectBtn')?.addEventListener('click', () => {
            this.createNewProject();
        });

        // Preset sizes
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('canvasWidth').value = btn.dataset.width;
                document.getElementById('canvasHeight').value = btn.dataset.height;
            });
        });

        // Export modal
        document.getElementById('exportFormat')?.addEventListener('change', (e) => {
            const qualityGroup = document.getElementById('qualityGroup');
            if (qualityGroup) {
                qualityGroup.style.display = e.target.value === 'png' ? 'none' : 'block';
            }
        });
        document.getElementById('exportQuality')?.addEventListener('input', (e) => {
            document.getElementById('qualityValue').textContent = e.target.value + '%';
        });
        document.getElementById('downloadBtn')?.addEventListener('click', () => {
            this.exportImage();
        });
    }

    /**
     * Setup brush settings
     */
    setupBrushSettings() {
        const syncSlider = (sliderId, inputId, callback) => {
            const slider = document.getElementById(sliderId);
            const input = document.getElementById(inputId);
            if (!slider || !input) return;

            slider.addEventListener('input', () => {
                input.value = slider.value;
                callback(parseInt(slider.value));
                this.updateBrushPreview();
            });
            input.addEventListener('change', () => {
                slider.value = input.value;
                callback(parseInt(input.value));
                this.updateBrushPreview();
            });
        };

        syncSlider('brushSize', 'brushSizeInput', (val) => {
            this.app.brush.size = val;
        });
        syncSlider('brushOpacity', 'brushOpacityInput', (val) => {
            this.app.brush.opacity = val / 100;
        });
        syncSlider('brushHardness', 'brushHardnessInput', (val) => {
            this.app.brush.hardness = val / 100;
            this.app.brush.invalidateCache();
        });
        syncSlider('brushSpacing', 'brushSpacingInput', (val) => {
            this.app.brush.spacing = val / 100;
        });
        syncSlider('streamlineAmount', 'streamlineAmountInput', (val) => {
            this.app.streamLine.setAmount(val);
        });

        // Checkboxes
        document.getElementById('pressureSensitivity')?.addEventListener('change', (e) => {
            this.app.settings.pressureSensitivity = e.target.checked;
        });
        document.getElementById('streamlineEnabled')?.addEventListener('change', (e) => {
            this.app.settings.streamlineEnabled = e.target.checked;
        });
        document.getElementById('quickshapeEnabled')?.addEventListener('change', (e) => {
            this.app.settings.quickshapeEnabled = e.target.checked;
            this.updateQuickShapeToggleButton();
        });
        document.getElementById('quickshapePreview')?.addEventListener('change', (e) => {
            this.app.settings.quickshapePreview = e.target.checked;
        });

        // Floating QuickShape toggle button
        document.getElementById('quickshapeToggleBtn')?.addEventListener('click', () => {
            this.app.settings.quickshapeEnabled = !this.app.settings.quickshapeEnabled;
            this.updateQuickShapeToggleButton();
            // Sync with checkbox in brush settings
            const checkbox = document.getElementById('quickshapeEnabled');
            if (checkbox) checkbox.checked = this.app.settings.quickshapeEnabled;
            // Sync with vector mode checkbox
            const vectorCheckbox = document.getElementById('vectorQuickshapeEnabled');
            if (vectorCheckbox) vectorCheckbox.checked = this.app.settings.quickshapeEnabled;
        });

        // Initialize button state
        this.updateQuickShapeToggleButton();

        // Brush type buttons
        document.querySelectorAll('.brush-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const brushType = btn.dataset.brushType;
                if (brushType) {
                    this.app.brush.setBrushType(brushType);
                    document.querySelectorAll('.brush-type-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.updateBrushPreview();
                }
            });
        });

        // Initial brush preview
        setTimeout(() => this.updateBrushPreview(), 100);
    }

    /**
     * Setup layer controls
     */
    setupLayerControls() {
        document.getElementById('addLayerBtn')?.addEventListener('click', () => {
            this.app.layers.addLayer();
            this.updateLayersList();
        });

        document.getElementById('addFolderBtn')?.addEventListener('click', () => {
            this.app.layers.addFolder();
            this.updateLayersList();
        });

        document.getElementById('deleteLayerBtn')?.addEventListener('click', () => {
            this.app.layers.removeLayer(this.app.layers.activeLayerIndex);
            this.updateLayersList();
        });

        document.getElementById('blendModeSelect')?.addEventListener('change', (e) => {
            this.app.layers.setLayerBlendMode(this.app.layers.activeLayerIndex, e.target.value);
        });
    }

    /**
     * Setup zoom controls
     */
    setupZoomControls() {
        document.getElementById('zoomInBtn')?.addEventListener('click', () => {
            this.app.canvas.zoomIn();
        });
        document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
            this.app.canvas.zoomOut();
        });
        document.getElementById('zoomFitBtn')?.addEventListener('click', () => {
            this.app.canvas.fitToView();
        });
    }

    /**
     * Setup panel collapse
     */
    setupPanelCollapse() {
        document.querySelectorAll('.btn-collapse').forEach(btn => {
            btn.addEventListener('click', () => {
                const sectionId = btn.dataset.collapse;
                const section = document.getElementById(sectionId);
                if (section) {
                    section.classList.toggle('collapsed');
                }
            });
        });
    }

    /**
     * Update layers list UI
     */
    updateLayersList() {
        const list = document.getElementById('layersList');
        if (!list) return;

        list.innerHTML = '';

        // Add TOP/BOTTOM indicator header
        const indicator = document.createElement('div');
        indicator.className = 'layers-header-indicator';
        indicator.innerHTML = '<span class="top-label">↑ TOP (vykreslí se nahoře)</span>';
        list.appendChild(indicator);

        // Get hierarchical layer tree (reversed for UI display)
        const layerTree = [...this.app.layers.getLayerTree()].reverse();
        const allLayers = this.app.layers.getLayers();

        layerTree.forEach((layer, i) => {
            const actualIndex = layer.flatIndex;
            const isFolder = layer.type === 'folder';
            const depth = layer.depth || 0;
            const hasChildren = isFolder && this.app.layers.getFolderChildren(layer.id).length > 0;

            const item = document.createElement('div');
            let className = 'layer-item';
            if (actualIndex === this.app.layers.activeLayerIndex) className += ' active';
            if (isFolder) className += ' is-folder';
            if (isFolder && hasChildren) className += ' has-children';
            if (i === 0) className += ' is-top';
            if (depth > 0) className += ` nested-${Math.min(depth, 4)}`;
            if (layer.locked) className += ' locked';

            item.className = className;
            item.dataset.index = actualIndex;
            item.dataset.id = layer.id;
            item.dataset.type = layer.type || 'layer';
            item.dataset.depth = depth;
            item.draggable = true;

            if (isFolder) {
                // Folder item - get children count
                const childrenCount = this.app.layers.getFolderChildren(layer.id).length;
                const descendantsCount = this.app.layers.getFolderDescendants(layer.id).length;

                // Use open/closed folder icon
                const folderIcon = layer.expanded
                    ? '<path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" fill="currentColor"/>'
                    : '<path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" fill="currentColor"/>';

                item.innerHTML = `
                    <button class="folder-expand-btn" title="${layer.expanded ? 'Sbalit' : 'Rozbalit'}">
                        <svg viewBox="0 0 24 24" width="12" height="12" style="transform: rotate(${layer.expanded ? 90 : 0}deg)">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z" fill="currentColor"/>
                        </svg>
                    </button>
                    <button class="layer-visibility ${layer.visible ? '' : 'hidden'}" title="Viditelnost">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            ${layer.visible ?
                                '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>' :
                                '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/>'
                            }
                        </svg>
                    </button>
                    <div class="folder-icon ${layer.expanded ? 'open' : 'closed'}">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            ${folderIcon}
                        </svg>
                    </div>
                    <div class="layer-info">
                        <span class="layer-name">${layer.name}</span>
                        <span class="folder-count" title="${descendantsCount} položek">${descendantsCount > 0 ? `(${descendantsCount})` : '(prázdná)'}</span>
                    </div>
                `;

                // Folder expand/collapse
                item.querySelector('.folder-expand-btn')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.app.layers.toggleFolderExpand(layer.id);
                });
            } else {
                // Regular layer item
                item.innerHTML = `
                    <div class="layer-drag-handle" title="Přetáhněte pro změnu pořadí">
                        <svg viewBox="0 0 24 24" width="12" height="12">
                            <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/>
                        </svg>
                    </div>
                    <button class="layer-visibility ${layer.visible ? '' : 'hidden'}" title="Viditelnost">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            ${layer.visible ?
                                '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>' :
                                '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/>'
                            }
                        </svg>
                    </button>
                    <div class="layer-thumbnail"></div>
                    <div class="layer-info">
                        <span class="layer-name">${layer.name}</span>
                        <span class="layer-opacity">${Math.round(layer.opacity * 100)}%</span>
                    </div>
                `;

                // Add thumbnail
                const thumbContainer = item.querySelector('.layer-thumbnail');
                if (thumbContainer) {
                    const thumb = this.app.layers.getLayerThumbnail(actualIndex);
                    if (thumb) {
                        thumbContainer.appendChild(thumb);
                    }
                }
            }

            // Click to select (for both layers and folders)
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.layer-visibility') &&
                    !e.target.closest('.folder-expand-btn') &&
                    !e.target.closest('.layer-drag-handle')) {

                    if (e.ctrlKey || e.metaKey) {
                        // Ctrl+click: toggle selection
                        if (this.selectedLayers.has(actualIndex)) {
                            this.selectedLayers.delete(actualIndex);
                        } else {
                            this.selectedLayers.add(actualIndex);
                        }
                        // Also set as active layer
                        this.app.layers.setActiveLayer(actualIndex);
                        this.updateLayerSelection();
                    } else if (e.shiftKey && this.selectedLayers.size > 0) {
                        // Shift+click: select range
                        const lastSelected = Math.max(...this.selectedLayers);
                        const minIndex = Math.min(lastSelected, actualIndex);
                        const maxIndex = Math.max(lastSelected, actualIndex);
                        for (let i = minIndex; i <= maxIndex; i++) {
                            this.selectedLayers.add(i);
                        }
                        this.app.layers.setActiveLayer(actualIndex);
                        this.updateLayerSelection();
                    } else {
                        // Normal click: clear selection, select only this layer
                        this.selectedLayers.clear();
                        this.selectedLayers.add(actualIndex);
                        this.app.layers.setActiveLayer(actualIndex);
                        this.updateLayerSelection();
                    }
                    this.updateBlendModeSelect();
                }
            });

            // Right-click context menu (Procreate/Photoshop style)
            item.addEventListener('contextmenu', (e) => {
                this.showLayerContextMenu(e, actualIndex);
            });

            // Double-click to rename
            item.addEventListener('dblclick', (e) => {
                if (!e.target.closest('.layer-visibility') &&
                    !e.target.closest('.folder-expand-btn') &&
                    !e.target.closest('.layer-drag-handle')) {
                    this.startLayerRename(actualIndex);
                }
            });

            // Visibility toggle
            item.querySelector('.layer-visibility')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.app.layers.toggleVisibility(actualIndex);
            });

            // Drag and drop events
            item.addEventListener('dragstart', (e) => {
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', JSON.stringify({ index: actualIndex, id: layer.id }));
                this.draggedLayerIndex = actualIndex;
                this.draggedLayerId = layer.id;
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                document.querySelectorAll('.layer-item').forEach(el => {
                    el.classList.remove('drag-over', 'drag-over-bottom', 'drag-over-folder');
                });
                this.draggedLayerIndex = null;
                this.draggedLayerId = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                // Remove other drag-over classes
                document.querySelectorAll('.layer-item').forEach(el => {
                    if (el !== item) el.classList.remove('drag-over', 'drag-over-bottom', 'drag-over-folder');
                });

                const rect = item.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;

                // If dropping on a folder, show folder highlight
                if (isFolder && e.clientY > rect.top + 10 && e.clientY < rect.bottom - 10) {
                    item.classList.add('drag-over-folder');
                    item.classList.remove('drag-over', 'drag-over-bottom');
                } else if (e.clientY < midY) {
                    item.classList.add('drag-over');
                    item.classList.remove('drag-over-bottom', 'drag-over-folder');
                } else {
                    item.classList.add('drag-over-bottom');
                    item.classList.remove('drag-over', 'drag-over-folder');
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over', 'drag-over-bottom', 'drag-over-folder');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over', 'drag-over-bottom', 'drag-over-folder');

                const fromIndex = this.draggedLayerIndex;
                const fromId = this.draggedLayerId;
                const toIndex = actualIndex;

                if (fromIndex !== null && fromIndex !== toIndex) {
                    const rect = item.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;

                    // Check if dropping into folder
                    if (isFolder && e.clientY > rect.top + 10 && e.clientY < rect.bottom - 10) {
                        this.app.layers.moveToFolder(fromId, layer.id);
                    } else {
                        const dropAbove = e.clientY < midY;
                        this.moveLayerToPosition(fromIndex, toIndex, dropAbove);
                    }
                }
            });

            list.appendChild(item);
        });

        this.updateBlendModeSelect();
        this.updateFloatingLayersList();
    }

    /**
     * Update floating layers panel in the right corner
     */
    updateFloatingLayersList() {
        const floatingList = document.getElementById('floatingLayersList');
        if (!floatingList) return;

        floatingList.innerHTML = '';

        const layers = this.app.layers.getLayers();
        const activeIndex = this.app.layers.activeLayerIndex;

        // Display layers in reverse order (top layer first)
        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            if (layer.type === 'folder') continue; // Skip folders in floating panel

            const item = document.createElement('div');
            item.className = 'floating-layer-item' + (i === activeIndex ? ' active' : '');
            item.dataset.index = i;

            // Create mini preview
            const preview = document.createElement('div');
            preview.className = 'layer-preview';
            const previewCanvas = document.createElement('canvas');
            previewCanvas.width = 24;
            previewCanvas.height = 24;
            const ctx = previewCanvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            if (layer.canvas) {
                ctx.drawImage(layer.canvas, 0, 0, 24, 24);
            }
            preview.appendChild(previewCanvas);

            // Layer name
            const name = document.createElement('span');
            name.className = 'layer-name';
            name.textContent = layer.name;

            // Icons for locked/hidden
            const icons = document.createElement('div');
            icons.className = 'layer-icons';
            if (layer.locked) {
                icons.innerHTML += `<svg class="layer-icon" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="currentColor"/></svg>`;
            }
            if (!layer.visible) {
                icons.innerHTML += `<svg class="layer-icon" viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27z" fill="currentColor"/></svg>`;
            }

            item.appendChild(preview);
            item.appendChild(name);
            if (icons.innerHTML) item.appendChild(icons);

            // Click to select layer
            item.addEventListener('click', () => {
                this.app.layers.setActiveLayer(i);
                this.updateLayersList();
            });

            floatingList.appendChild(item);
        }
    }

    /**
     * Setup floating layers controls
     */
    setupFloatingLayersControls() {
        // Add layer button in floating panel
        document.getElementById('floatingAddLayerBtn')?.addEventListener('click', () => {
            this.app.layers.addLayer();
            this.updateLayersList();
        });

        // Expand button - scroll to right panel layers section
        document.getElementById('floatingExpandBtn')?.addEventListener('click', () => {
            const rightPanel = document.getElementById('panelRight');
            const layersSection = document.getElementById('layersSection');
            if (rightPanel && layersSection) {
                // Make sure panel is visible
                rightPanel.scrollTop = layersSection.offsetTop - 60;
                // Flash highlight
                layersSection.classList.add('highlight-flash');
                setTimeout(() => layersSection.classList.remove('highlight-flash'), 1000);
            }
        });
    }

    /**
     * Move layer to a specific position (for drag and drop)
     */
    moveLayerToPosition(fromIndex, toIndex, dropAbove) {
        const layers = this.app.layers.layers;

        // Remove layer from current position
        const [layer] = layers.splice(fromIndex, 1);

        // Calculate new position
        // In the UI, dropAbove means we want to place it AFTER (higher index) the target
        // because layers are displayed in reverse order
        let newIndex = dropAbove ? toIndex + 1 : toIndex;

        // Adjust for the removal
        if (fromIndex < newIndex) {
            newIndex--;
        }

        // Ensure bounds
        newIndex = Math.max(0, Math.min(layers.length, newIndex));

        // Insert at new position
        layers.splice(newIndex, 0, layer);

        // Update active layer index if needed
        if (this.app.layers.activeLayerIndex === fromIndex) {
            this.app.layers.activeLayerIndex = newIndex;
        } else if (fromIndex < this.app.layers.activeLayerIndex && newIndex >= this.app.layers.activeLayerIndex) {
            this.app.layers.activeLayerIndex--;
        } else if (fromIndex > this.app.layers.activeLayerIndex && newIndex <= this.app.layers.activeLayerIndex) {
            this.app.layers.activeLayerIndex++;
        }

        // Re-render
        this.app.canvas.render();
        this.updateLayersList();
    }

    /**
     * Update blend mode select
     */
    updateBlendModeSelect() {
        const select = document.getElementById('blendModeSelect');
        const layer = this.app.layers.getActiveLayer();
        if (select && layer) {
            select.value = layer.blendMode;
        }
    }

    /**
     * Update layer selection visual state
     */
    updateLayerSelection() {
        document.querySelectorAll('.layer-item').forEach(item => {
            const index = parseInt(item.dataset.index);
            if (this.selectedLayers.has(index)) {
                item.classList.add('multi-selected');
            } else {
                item.classList.remove('multi-selected');
            }
        });

        // Update selection count indicator if exists
        const countEl = document.getElementById('selectedLayersCount');
        if (countEl) {
            if (this.selectedLayers.size > 1) {
                countEl.textContent = `${this.selectedLayers.size} vrstev vybráno`;
                countEl.style.display = 'block';
            } else {
                countEl.style.display = 'none';
            }
        }
    }

    /**
     * Clear layer selection
     */
    clearLayerSelection() {
        this.selectedLayers.clear();
        this.updateLayerSelection();
    }

    /**
     * Show menu
     */
    showMenu() {
        document.getElementById('menuOverlay').style.display = 'block';
    }

    /**
     * Hide menu
     */
    hideMenu() {
        document.getElementById('menuOverlay').style.display = 'none';
    }

    /**
     * Show modal
     */
    showModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }

    /**
     * Hide modal
     */
    hideModal(modalId) {
        if (!modalId) return;
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Create new project
     */
    async createNewProject() {
        const name = document.getElementById('projectName').value || 'Nový projekt';
        const width = parseInt(document.getElementById('canvasWidth').value) || 1920;
        const height = parseInt(document.getElementById('canvasHeight').value) || 1080;
        const bgColorInput = document.querySelector('input[name="bgColor"]:checked');
        const backgroundColor = bgColorInput?.value || '#ffffff';

        await this.app.newProject({ name, width, height, backgroundColor });

        this.hideModal('newProjectModal');
    }

    /**
     * Open projects modal
     */
    async openProjectsModal() {
        const list = document.getElementById('projectsList');
        if (!list) return;

        const projects = await this.app.storage.listProjects();

        if (projects.length === 0) {
            list.innerHTML = `
                <div class="empty-projects">
                    <svg viewBox="0 0 24 24" width="48" height="48" class="empty-icon">
                        <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" fill="currentColor"/>
                    </svg>
                    <p>Zatím nemáte žádné uložené projekty</p>
                </div>
            `;
        } else {
            list.innerHTML = projects.map(p => `
                <div class="project-card" data-id="${p.id}">
                    <div class="project-thumbnail">
                        <img src="${p.thumbnail || ''}" alt="${p.name}">
                    </div>
                    <div class="project-name">${p.name}</div>
                    <div class="project-date">${new Date(p.modified).toLocaleDateString()}</div>
                    <div class="project-actions">
                        <button class="btn-icon project-open" title="Otevřít">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" fill="currentColor"/>
                            </svg>
                        </button>
                        <button class="btn-icon project-delete" title="Smazat">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('');

            // Add click handlers
            list.querySelectorAll('.project-card').forEach(card => {
                card.querySelector('.project-open')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.app.loadProject(card.dataset.id);
                    this.hideModal('projectsModal');
                });
                card.querySelector('.project-delete')?.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm('Opravdu chcete smazat tento projekt?')) {
                        await this.app.storage.deleteProject(card.dataset.id);
                        this.openProjectsModal();
                    }
                });
                card.addEventListener('click', () => {
                    this.app.loadProject(card.dataset.id);
                    this.hideModal('projectsModal');
                });
            });
        }

        this.showModal('projectsModal');
    }

    /**
     * Show export modal
     */
    showExportModal() {
        // Update preview
        const preview = document.getElementById('exportPreview');
        if (preview) {
            const dataUrl = this.app.canvas.export('png');
            const ctx = preview.getContext('2d');
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(300 / img.width, 200 / img.height, 1);
                preview.width = img.width * scale;
                preview.height = img.height * scale;
                ctx.drawImage(img, 0, 0, preview.width, preview.height);
            };
            img.src = dataUrl;
        }

        // Set default filename
        const filename = document.getElementById('exportFilename');
        if (filename && this.app.currentProject) {
            filename.value = this.app.currentProject.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        }

        this.showModal('exportModal');
    }

    /**
     * Export image
     */
    exportImage() {
        const format = document.getElementById('exportFormat').value;
        const quality = parseInt(document.getElementById('exportQuality').value) / 100;
        const filename = document.getElementById('exportFilename').value || 'muj-obrazek';

        this.app.exportImage(format, quality, filename);
        this.hideModal('exportModal');
    }

    /**
     * Import image file
     */
    importImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.app.importImage(file);
            }
        };
        input.click();
    }

    /**
     * Update zoom level display
     */
    updateZoomLevel(percent) {
        const el = document.getElementById('zoomLevel');
        if (el) {
            el.textContent = percent + '%';
        }
    }

    /**
     * Update cursor position display
     */
    updateCursorPosition(x, y) {
        const el = document.getElementById('cursorPosition');
        if (el) {
            el.textContent = `X: ${x}, Y: ${y}`;
        }
    }

    /**
     * Update pressure display
     */
    updatePressure(percent) {
        const el = document.getElementById('pressureInfo');
        if (el) {
            el.style.display = 'inline';
            el.textContent = `Tlak: ${percent}%`;
        }
    }

    /**
     * Update tool info display
     */
    updateToolInfo(toolName) {
        const el = document.getElementById('toolInfo');
        if (el) {
            el.textContent = toolName;
        }
    }

    /**
     * Update brush size display
     */
    updateBrushSize(size) {
        document.getElementById('brushSize').value = size;
        document.getElementById('brushSizeInput').value = size;
    }

    /**
     * Update brush opacity display
     */
    updateBrushOpacity(opacity) {
        const slider = document.getElementById('brushOpacity');
        const input = document.getElementById('brushOpacityInput');
        if (slider) slider.value = opacity;
        if (input) input.value = opacity;
    }

    /**
     * Update canvas info
     */
    updateCanvasInfo() {
        const el = document.getElementById('canvasSizeStatus');
        if (el && this.app.canvas) {
            el.textContent = `${this.app.canvas.width} x ${this.app.canvas.height}`;
        }
    }

    /**
     * Show QuickShape indicator
     */
    showQuickShapeIndicator(shapeType) {
        const el = document.getElementById('quickshapeIndicator');
        if (el) {
            const names = {
                line: 'Čára',
                circle: 'Kruh',
                ellipse: 'Elipsa',
                square: 'Čtverec',
                rectangle: 'Obdélník',
                triangle: 'Trojúhelník'
            };
            el.querySelector('span').textContent = names[shapeType] || 'QuickShape';
            el.style.display = 'flex';

            setTimeout(() => {
                el.style.display = 'none';
            }, 1500);
        }
    }

    /**
     * Update QuickShape toggle button state
     */
    updateQuickShapeToggleButton() {
        const btn = document.getElementById('quickshapeToggleBtn');
        if (btn) {
            const isEnabled = this.app.settings.quickshapeEnabled;
            btn.classList.toggle('disabled', !isEnabled);
            btn.title = isEnabled
                ? 'QuickShape zapnuto - klikni pro vypnutí'
                : 'QuickShape vypnuto - klikni pro zapnutí';
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Clear existing
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }

        // Create notification element if needed
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.style.cssText = `
                position: fixed;
                bottom: 60px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 0.875rem;
                font-weight: 500;
                z-index: 9999;
                animation: fadeInUp 0.2s ease;
            `;
            document.body.appendChild(notification);
        }

        // Set style based on type
        const colors = {
            success: { bg: 'rgba(16, 185, 129, 0.9)', text: 'white' },
            error: { bg: 'rgba(239, 68, 68, 0.9)', text: 'white' },
            info: { bg: 'rgba(139, 92, 246, 0.9)', text: 'white' }
        };
        const style = colors[type] || colors.info;
        notification.style.background = style.bg;
        notification.style.color = style.text;
        notification.textContent = message;
        notification.style.display = 'block';

        // Auto hide
        this.notificationTimeout = setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    /**
     * Setup context menu
     */
    setupContextMenu() {
        const container = document.getElementById('canvasContainer');
        if (!container) return;

        // Create context menu element
        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'context-menu';
        this.contextMenu.style.display = 'none';
        document.body.appendChild(this.contextMenu);

        // Right-click handler
        container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e.clientX, e.clientY);
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!this.contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideContextMenu();
            }
        });
    }

    /**
     * Show context menu
     */
    showContextMenu(x, y) {
        const menuItems = [
            { icon: 'undo', label: 'Zpět', shortcut: 'Ctrl+Z', action: () => this.app.history.undo() },
            { icon: 'redo', label: 'Vpřed', shortcut: 'Ctrl+Y', action: () => this.app.history.redo() },
            { divider: true },
            { icon: 'copy', label: 'Kopírovat vrstvu', action: () => this.app.layers.duplicateLayer(this.app.layers.activeLayerIndex) },
            { icon: 'paste', label: 'Vložit jako novou vrstvu', action: () => this.pasteAsNewLayer() },
            { divider: true },
            { icon: 'clear', label: 'Vyčistit vrstvu', action: () => this.app.layers.clearActiveLayer() },
            { icon: 'merge', label: 'Sloučit dolů', action: () => this.app.layers.mergeDown(this.app.layers.activeLayerIndex) },
            { divider: true },
            { icon: 'fullscreen', label: this.isFullscreen ? 'Ukončit fullscreen' : 'Fullscreen', shortcut: 'F', action: () => this.toggleFullscreen() },
            { icon: 'fit', label: 'Přizpůsobit zobrazení', shortcut: 'Ctrl+0', action: () => this.app.canvas.fitToView() },
            { divider: true },
            { icon: 'save', label: 'Uložit projekt', shortcut: 'Ctrl+S', action: () => this.app.saveProject() },
            { icon: 'export', label: 'Exportovat', action: () => this.showExportModal() }
        ];

        this.contextMenu.innerHTML = menuItems.map(item => {
            if (item.divider) {
                return '<div class="context-menu-divider"></div>';
            }
            return `
                <button class="context-menu-item" data-action="${item.label}">
                    ${this.getContextMenuIcon(item.icon)}
                    <span>${item.label}</span>
                    ${item.shortcut ? `<span class="shortcut">${item.shortcut}</span>` : ''}
                </button>
            `;
        }).join('');

        // Add click handlers
        this.contextMenu.querySelectorAll('.context-menu-item').forEach((btn, index) => {
            const realIndex = menuItems.filter((item, i) => i <= index && !item.divider).length - 1;
            const nonDividerItems = menuItems.filter(item => !item.divider);
            btn.addEventListener('click', () => {
                nonDividerItems[realIndex]?.action();
                this.hideContextMenu();
            });
        });

        // Position menu
        const menuRect = { width: 200, height: 400 };
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let posX = x;
        let posY = y;

        if (x + menuRect.width > viewportWidth) {
            posX = viewportWidth - menuRect.width - 10;
        }
        if (y + menuRect.height > viewportHeight) {
            posY = viewportHeight - menuRect.height - 10;
        }

        this.contextMenu.style.left = `${posX}px`;
        this.contextMenu.style.top = `${posY}px`;
        this.contextMenu.style.display = 'block';
    }

    /**
     * Get context menu icon SVG
     */
    getContextMenuIcon(type) {
        const icons = {
            undo: '<path d="M12.5 8c-2.65 0-5.05 1.04-6.83 2.73L3 8v9h9l-2.82-2.82C10.48 12.85 11.43 12.5 12.5 12.5c2.33 0 4.31 1.46 5.11 3.5l2.61-.93C19.12 11.98 16.11 8 12.5 8z" fill="currentColor"/>',
            redo: '<path d="M11.5 8c2.65 0 5.05 1.04 6.83 2.73L21 8v9h-9l2.82-2.82C13.52 12.85 12.57 12.5 11.5 12.5c-2.33 0-4.31 1.46-5.11 3.5l-2.61-.93C4.88 11.98 7.89 8 11.5 8z" fill="currentColor"/>',
            copy: '<path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/>',
            paste: '<path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z" fill="currentColor"/>',
            clear: '<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>',
            merge: '<path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" fill="currentColor"/>',
            fullscreen: '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="currentColor"/>',
            fit: '<path d="M5 15H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm0-6H3V5c0-1.1.9-2 2-2h4v2H5v4zm14 8h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zM15 3v2h4v4h2V5c0-1.1-.9-2-2-2h-4z" fill="currentColor"/>',
            save: '<path d="M17 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" fill="currentColor"/>',
            export: '<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/>'
        };
        return `<svg viewBox="0 0 24 24" width="18" height="18">${icons[type] || ''}</svg>`;
    }

    /**
     * Hide context menu
     */
    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.style.display = 'none';
        }
    }

    /**
     * Paste as new layer (placeholder)
     */
    async pasteAsNewLayer() {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                if (item.types.includes('image/png')) {
                    const blob = await item.getType('image/png');
                    const img = new Image();
                    img.onload = () => {
                        const layer = this.app.layers.addLayer('Vložená vrstva');
                        if (layer) {
                            const ctx = layer.canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                            this.app.canvas.render();
                            this.updateLayersList();
                        }
                    };
                    img.src = URL.createObjectURL(blob);
                    return;
                }
            }
            this.showNotification('Schránka neobsahuje obrázek', 'error');
        } catch (error) {
            this.showNotification('Nelze přistoupit ke schránce', 'error');
        }
    }

    /**
     * Setup fullscreen functionality
     */
    setupFullscreen() {
        // Keyboard shortcut F for fullscreen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'f' || e.key === 'F') {
                if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                    const activeElement = document.activeElement;
                    if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        this.toggleFullscreen();
                    }
                }
            }
            // Escape to exit fullscreen
            if (e.key === 'Escape' && this.isFullscreen) {
                this.exitFullscreen();
            }
        });

        // Settings button should open settings modal
        document.getElementById('menuSettings')?.addEventListener('click', () => {
            this.hideMenu();
            this.showSettingsModal();
        });
    }

    /**
     * Show settings modal
     */
    showSettingsModal() {
        const existingModal = document.getElementById('settingsModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Generate preset options
        const presetOptions = Object.entries(this.keyboardPresets)
            .map(([key, preset]) => `<option value="${key}" ${key === this.currentPreset ? 'selected' : ''}>${preset.name}</option>`)
            .join('');

        // Generate shortcuts list
        const shortcutLabels = {
            brush: 'Štětec', pencil: 'Tužka', eraser: 'Guma', line: 'Čára',
            rectangle: 'Obdélník', ellipse: 'Elipsa', fill: 'Výplň', eyedropper: 'Kapátko',
            move: 'Přesun', undo: 'Zpět', redo: 'Vpřed', save: 'Uložit',
            zoomIn: 'Přiblížit', zoomOut: 'Oddálit', fitView: 'Přizpůsobit',
            fullscreen: 'Fullscreen', swapColors: 'Prohodit barvy'
        };

        const shortcutsList = Object.entries(this.currentShortcuts)
            .map(([key, value]) => `
                <div class="shortcut-row">
                    <span class="shortcut-label">${shortcutLabels[key] || key}</span>
                    <span class="shortcut-key">${value}</span>
                </div>
            `).join('');

        const modal = document.createElement('div');
        modal.id = 'settingsModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal modal-large">
                <div class="modal-header">
                    <h2>Nastavení</h2>
                    <button class="btn-icon modal-close">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body settings-modal-body">
                    <!-- General Settings Section -->
                    <div class="settings-section">
                        <h3 class="settings-section-title">Obecné nastavení</h3>
                        <div class="form-group checkbox-row">
                            <label>
                                <input type="checkbox" id="settingPressure" ${this.app.settings.pressureSensitivity ? 'checked' : ''}>
                                Citlivost na tlak pera
                            </label>
                        </div>
                        <div class="form-group checkbox-row">
                            <label>
                                <input type="checkbox" id="settingStreamline" ${this.app.settings.streamlineEnabled ? 'checked' : ''}>
                                StreamLine (vyhlazování tahů)
                            </label>
                        </div>
                        <div class="form-group checkbox-row">
                            <label>
                                <input type="checkbox" id="settingQuickshape" ${this.app.settings.quickshapeEnabled ? 'checked' : ''}>
                                QuickShape (automatická detekce tvarů)
                            </label>
                        </div>
                        <div class="form-group checkbox-row">
                            <label>
                                <input type="checkbox" id="settingQuickshapePreview" ${this.app.settings.quickshapePreview ? 'checked' : ''}>
                                Zobrazit náhled QuickShape při kreslení
                            </label>
                        </div>
                    </div>

                    <!-- Keyboard Shortcuts Section -->
                    <div class="settings-section">
                        <h3 class="settings-section-title">Klávesové zkratky</h3>
                        <div class="form-group">
                            <label for="keyboardPresetSelect">Preset klávesových zkratek</label>
                            <select id="keyboardPresetSelect" class="preset-select">
                                ${presetOptions}
                            </select>
                            <p class="preset-hint">Vyberte preset podle vašich zvyků z jiných programů</p>
                        </div>
                        <div class="shortcuts-list" id="shortcutsList">
                            ${shortcutsList}
                        </div>
                        <div class="shortcuts-extra">
                            <div class="shortcut-row">
                                <span class="shortcut-label">Posun plátna</span>
                                <span class="shortcut-key">Space + Táhnout</span>
                            </div>
                            <div class="shortcut-row">
                                <span class="shortcut-label">Zoom</span>
                                <span class="shortcut-key">Scroll kolečko</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="settingsCancel">Zavřít</button>
                    <button class="btn-primary" id="settingsSave">Uložit</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Preset change handler
        modal.querySelector('#keyboardPresetSelect')?.addEventListener('change', (e) => {
            const presetKey = e.target.value;
            this.previewKeyboardPreset(presetKey, modal);
        });

        // Event listeners
        modal.querySelector('.modal-close')?.addEventListener('click', () => modal.remove());
        modal.querySelector('#settingsCancel')?.addEventListener('click', () => modal.remove());
        modal.querySelector('#settingsSave')?.addEventListener('click', () => {
            // Save general settings
            this.app.settings.pressureSensitivity = document.getElementById('settingPressure')?.checked ?? true;
            this.app.settings.streamlineEnabled = document.getElementById('settingStreamline')?.checked ?? true;
            this.app.settings.quickshapeEnabled = document.getElementById('settingQuickshape')?.checked ?? false;
            this.app.settings.quickshapePreview = document.getElementById('settingQuickshapePreview')?.checked ?? false;

            // Save keyboard preset
            const selectedPreset = document.getElementById('keyboardPresetSelect')?.value || 'paintnook';
            this.applyKeyboardPreset(selectedPreset);

            // Update UI checkboxes
            const pressureCheckbox = document.getElementById('pressureSensitivity');
            if (pressureCheckbox) pressureCheckbox.checked = this.app.settings.pressureSensitivity;
            const streamlineCheckbox = document.getElementById('streamlineEnabled');
            if (streamlineCheckbox) streamlineCheckbox.checked = this.app.settings.streamlineEnabled;
            const quickshapeCheckbox = document.getElementById('quickshapeEnabled');
            if (quickshapeCheckbox) quickshapeCheckbox.checked = this.app.settings.quickshapeEnabled;
            const quickshapePreviewCheckbox = document.getElementById('quickshapePreview');
            if (quickshapePreviewCheckbox) quickshapePreviewCheckbox.checked = this.app.settings.quickshapePreview;

            this.showNotification('Nastavení uloženo', 'success');
            modal.remove();
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    /**
     * Preview keyboard preset in settings modal
     */
    previewKeyboardPreset(presetKey, modal) {
        const preset = this.keyboardPresets[presetKey];
        if (!preset) return;

        const shortcutLabels = {
            brush: 'Štětec', pencil: 'Tužka', eraser: 'Guma', line: 'Čára',
            rectangle: 'Obdélník', ellipse: 'Elipsa', fill: 'Výplň', eyedropper: 'Kapátko',
            move: 'Přesun', undo: 'Zpět', redo: 'Vpřed', save: 'Uložit',
            zoomIn: 'Přiblížit', zoomOut: 'Oddálit', fitView: 'Přizpůsobit',
            fullscreen: 'Fullscreen', swapColors: 'Prohodit barvy'
        };

        const shortcutsList = Object.entries(preset.shortcuts)
            .map(([key, value]) => `
                <div class="shortcut-row">
                    <span class="shortcut-label">${shortcutLabels[key] || key}</span>
                    <span class="shortcut-key">${value}</span>
                </div>
            `).join('');

        const listElement = modal.querySelector('#shortcutsList');
        if (listElement) {
            listElement.innerHTML = shortcutsList;
        }
    }

    /**
     * Apply keyboard preset
     */
    applyKeyboardPreset(presetKey) {
        const preset = this.keyboardPresets[presetKey];
        if (!preset) return;

        this.currentPreset = presetKey;
        this.currentShortcuts = { ...preset.shortcuts };

        // Update shortcut badges in toolbar
        this.updateShortcutBadges();

        // Save to storage
        this.app.storage.setKeyboardPreset(presetKey);
    }

    /**
     * Update shortcut badges in the toolbar
     */
    updateShortcutBadges() {
        const toolShortcuts = {
            brush: this.currentShortcuts.brush,
            pencil: this.currentShortcuts.pencil,
            eraser: this.currentShortcuts.eraser,
            line: this.currentShortcuts.line,
            rectangle: this.currentShortcuts.rectangle,
            ellipse: this.currentShortcuts.ellipse,
            fill: this.currentShortcuts.fill,
            eyedropper: this.currentShortcuts.eyedropper,
            move: this.currentShortcuts.move
        };

        Object.entries(toolShortcuts).forEach(([tool, shortcut]) => {
            const badge = document.querySelector(`.tool-shortcut[data-shortcut="${tool}"]`);
            if (badge) {
                badge.textContent = shortcut;
            }

            // Update tooltip on tool button
            const button = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
            if (button) {
                const toolNames = {
                    brush: 'Štětec', pencil: 'Tužka', eraser: 'Guma', line: 'Čára',
                    rectangle: 'Obdélník', ellipse: 'Elipsa', fill: 'Výplň',
                    eyedropper: 'Kapátko', move: 'Přesun'
                };
                button.title = `${toolNames[tool]} (${shortcut})`;
            }
        });
    }

    /**
     * Load keyboard preset from storage
     */
    async loadKeyboardPreset() {
        try {
            const presetKey = await this.app.storage.getKeyboardPreset();
            if (presetKey && this.keyboardPresets[presetKey]) {
                this.currentPreset = presetKey;
                this.currentShortcuts = { ...this.keyboardPresets[presetKey].shortcuts };
                this.updateShortcutBadges();
            }
        } catch (error) {
            console.warn('Could not load keyboard preset:', error);
        }
    }

    /**
     * Create fullscreen exit hint
     */
    createFullscreenHint() {
        const hint = document.createElement('div');
        hint.className = 'fullscreen-exit-hint';
        hint.textContent = 'Stiskněte Esc nebo F pro ukončení fullscreenu';
        document.getElementById('app')?.appendChild(hint);
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }

    /**
     * Enter fullscreen mode
     */
    enterFullscreen() {
        const app = document.getElementById('app');
        if (app) {
            app.classList.add('fullscreen');
            this.isFullscreen = true;

            // Request browser fullscreen
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            }

            // Recenter canvas
            setTimeout(() => {
                this.app.canvas.centerCanvas();
            }, 100);

            this.showNotification('Fullscreen režim (Esc pro ukončení)', 'info');
        }
    }

    /**
     * Exit fullscreen mode
     */
    exitFullscreen() {
        const app = document.getElementById('app');
        if (app) {
            app.classList.remove('fullscreen');
            this.isFullscreen = false;

            // Exit browser fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }

            // Recenter canvas
            setTimeout(() => {
                this.app.canvas.centerCanvas();
            }, 100);
        }
    }

    /**
     * Setup brush type selection
     */
    setupBrushTypeSelection() {
        document.querySelectorAll('.brush-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const brushType = btn.dataset.brushType;
                if (brushType) {
                    this.app.brush.setBrushType(brushType);
                    document.querySelectorAll('.brush-type-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.updateBrushPreview();
                }
            });
        });
    }

    /**
     * Update brush preview
     * Always uses white color for better visibility on dark background
     */
    updateBrushPreview() {
        const previewCanvas = document.getElementById('brushPreviewCanvas');
        if (!previewCanvas) return;

        const ctx = previewCanvas.getContext('2d');
        const width = previewCanvas.width;
        const height = previewCanvas.height;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Draw preview stroke - always white for visibility
        const color = '#ffffff';
        const points = [];
        for (let i = 0; i <= width; i += 2) {
            const x = i;
            const y = height / 2 + Math.sin(i * 0.05) * 15;
            const pressure = 0.3 + 0.7 * Math.sin(i * 0.03);
            points.push({ x, y, pressure });
        }

        // Draw the stroke
        for (let i = 1; i < points.length; i++) {
            this.app.brush.drawStroke(
                ctx,
                points[i - 1].x, points[i - 1].y,
                points[i].x, points[i].y,
                points[i].pressure,
                color
            );
        }
    }

    // =============================================
    // Collaboration UI
    // =============================================

    /**
     * Setup collaboration event handlers
     */
    setupCollaboration() {
        // Start session button
        document.getElementById('startSessionBtn')?.addEventListener('click', () => {
            this.startCollabSession();
        });

        // End session button
        document.getElementById('endSessionBtn')?.addEventListener('click', () => {
            this.endCollabSession();
        });

        // Join session button
        document.getElementById('joinSessionBtn')?.addEventListener('click', () => {
            this.joinCollabSession();
        });

        // Leave session button
        document.getElementById('leaveSessionBtn')?.addEventListener('click', () => {
            this.leaveCollabSession();
        });

        // Copy link button
        document.getElementById('copyLinkBtn')?.addEventListener('click', () => {
            this.copyCollabLink();
        });
    }

    /**
     * Show collaboration modal
     */
    showCollabModal() {
        const modal = document.getElementById('collabModal');
        if (!modal) return;

        // Update UI based on current connection state
        if (this.app.collab) {
            this.app.collab.updateUI();
        }

        modal.style.display = 'flex';
    }

    /**
     * Start a collaboration session
     */
    async startCollabSession() {
        const nickname = document.getElementById('hostNickname')?.value?.trim();
        const password = document.getElementById('collabPassword')?.value || '';
        const allowDraw = document.getElementById('collabAllowDraw')?.checked ?? true;

        // Set nickname before starting
        if (nickname) {
            this.app.collab.setNickname(nickname);
        }

        try {
            await this.app.collab.startSession(password, allowDraw);
            this.app.collab.updateUI();
            this.showNotification('Relace spuštěna', 'success');
        } catch (error) {
            console.error('[Collab] Start session error:', error);
            this.showNotification(error.message || 'Nepodařilo se spustit relaci', 'error');
        }
    }

    /**
     * End collaboration session (host only)
     */
    endCollabSession() {
        if (this.app.collab) {
            this.app.collab.endSession();
            this.app.collab.updateUI();
            this.showNotification('Relace ukončena', 'info');
        }
    }

    /**
     * Join an existing collaboration session
     */
    async joinCollabSession() {
        const nickname = document.getElementById('guestNickname')?.value?.trim();
        const password = document.getElementById('joinPassword')?.value || '';
        const errorEl = document.getElementById('joinError');

        // Set nickname before joining
        if (nickname) {
            this.app.collab.setNickname(nickname);
        }

        if (errorEl) {
            errorEl.style.display = 'none';
        }

        try {
            const result = await this.app.collab.joinSession(this.app.collab.roomId, password);
            this.app.collab.updateUI();

            if (result.canDraw) {
                this.showNotification('Připojeno - můžete kreslit', 'success');
            } else {
                this.showNotification('Připojeno - pouze sledování', 'info');
            }
        } catch (error) {
            console.error('[Collab] Join session error:', error);
            if (errorEl) {
                errorEl.textContent = error.message || 'Nepodařilo se připojit';
                errorEl.style.display = 'block';
            }
        }
    }

    /**
     * Leave collaboration session (guest only)
     */
    leaveCollabSession() {
        if (this.app.collab) {
            this.app.collab.leaveSession();
            this.app.collab.updateUI();
            this.showNotification('Odpojeno z relace', 'info');
            this.hideModal('collabModal');
        }
    }

    /**
     * Copy collaboration link to clipboard
     */
    async copyCollabLink() {
        const linkInput = document.getElementById('collabLink');
        if (!linkInput) return;

        try {
            await navigator.clipboard.writeText(linkInput.value);
            this.showNotification('Odkaz zkopírován', 'success');
        } catch (error) {
            // Fallback for older browsers
            linkInput.select();
            document.execCommand('copy');
            this.showNotification('Odkaz zkopírován', 'success');
        }
    }

    // =============================================
    // Background Remover UI
    // =============================================

    /**
     * Setup Background Remover event handlers
     */
    setupBgRemover() {
        // Open modal button
        document.getElementById('bgRemoverBtn')?.addEventListener('click', () => {
            this.showBgRemoverModal();
        });

        // Close modal
        document.querySelector('#bgRemoverModal .modal-close')?.addEventListener('click', () => {
            this.hideModal('bgRemoverModal');
        });

        document.querySelector('#bgRemoverModal .btn-secondary[data-modal="bgRemoverModal"]')?.addEventListener('click', () => {
            this.hideModal('bgRemoverModal');
        });

        // Click outside to close
        document.getElementById('bgRemoverModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'bgRemoverModal') {
                this.hideModal('bgRemoverModal');
            }
        });

        // Radio button selection styling
        document.querySelectorAll('#bgRemoverModal input[name="bgRemoverTarget"]').forEach(radio => {
            radio.addEventListener('change', () => {
                document.querySelectorAll('.bg-remover-options label').forEach(label => {
                    label.classList.remove('selected');
                });
                radio.closest('label')?.classList.add('selected');
            });
        });

        // Apply button
        document.getElementById('bgRemoverApplyBtn')?.addEventListener('click', () => {
            this.processBgRemover();
        });
    }

    /**
     * Show BG Remover modal with preview
     */
    showBgRemoverModal() {
        const modal = document.getElementById('bgRemoverModal');
        const form = document.getElementById('bgRemoverForm');
        const processing = document.getElementById('bgRemoverProcessing');
        const previewCanvas = document.getElementById('bgRemoverPreviewCanvas');
        const emptyPreview = document.getElementById('bgRemoverEmptyPreview');
        const applyBtn = document.getElementById('bgRemoverApplyBtn');

        if (!modal) return;

        // Reset state
        form.classList.remove('hidden');
        processing.classList.remove('active');

        // Check if active layer has content
        if (this.app.bgRemover && this.app.bgRemover.hasLayerContent()) {
            // Show preview
            const layer = this.app.layers.getActiveLayer();
            if (layer && layer.canvas && previewCanvas) {
                const ctx = previewCanvas.getContext('2d');
                const maxWidth = 300;
                const maxHeight = 200;
                const scale = Math.min(maxWidth / layer.canvas.width, maxHeight / layer.canvas.height, 1);

                previewCanvas.width = layer.canvas.width * scale;
                previewCanvas.height = layer.canvas.height * scale;
                ctx.drawImage(layer.canvas, 0, 0, previewCanvas.width, previewCanvas.height);

                previewCanvas.style.display = 'block';
                if (emptyPreview) emptyPreview.style.display = 'none';
                if (applyBtn) applyBtn.disabled = false;
            }
        } else {
            // Show empty state
            if (previewCanvas) previewCanvas.style.display = 'none';
            if (emptyPreview) emptyPreview.style.display = 'flex';
            if (applyBtn) applyBtn.disabled = true;
        }

        modal.style.display = 'flex';
    }

    /**
     * Process background removal
     */
    async processBgRemover() {
        const form = document.getElementById('bgRemoverForm');
        const processing = document.getElementById('bgRemoverProcessing');
        const progressText = document.getElementById('bgRemoverProgressText');
        const progressFill = document.getElementById('bgRemoverProgressFill');
        const progressStatus = document.getElementById('bgRemoverProgressStatus');

        if (!this.app.bgRemover) {
            this.showNotification('BG Remover není inicializován', 'error');
            return;
        }

        // Get target option
        const targetValue = document.querySelector('input[name="bgRemoverTarget"]:checked')?.value;
        const applyToNewLayer = targetValue === 'new';

        // Switch to processing state
        form.classList.add('hidden');
        processing.classList.add('active');

        // Reset progress
        if (progressFill) progressFill.style.width = '0%';
        if (progressText) progressText.textContent = 'Zpracovávám...';
        if (progressStatus) progressStatus.textContent = 'Načítám AI model...';

        try {
            await this.app.bgRemover.process({
                applyToNewLayer,
                onProgress: (percent, status) => {
                    if (progressFill) progressFill.style.width = `${percent}%`;
                    if (progressText) progressText.textContent = `${percent}%`;
                    if (progressStatus) progressStatus.textContent = status;
                }
            });

            // Success
            if (progressFill) progressFill.style.width = '100%';
            if (progressText) progressText.textContent = '100%';
            if (progressStatus) progressStatus.textContent = 'Hotovo!';

            setTimeout(() => {
                this.hideModal('bgRemoverModal');
                this.showNotification('Pozadí úspěšně odstraněno', 'success');
            }, 500);

        } catch (error) {
            console.error('BG Remover error:', error);
            this.showNotification(error.message || 'Chyba při odstraňování pozadí', 'error');

            // Return to form
            form.classList.remove('hidden');
            processing.classList.remove('active');
        }
    }

    // =============================================
    // Layer Context Menu (Procreate/Photoshop style)
    // =============================================

    /**
     * Setup Layer Context Menu
     */
    setupLayerContextMenu() {
        this.contextMenuLayerIndex = null;
        this.layerContextMenu = document.getElementById('layerContextMenu');

        if (!this.layerContextMenu) return;

        // Close menu on click outside
        document.addEventListener('click', (e) => {
            if (!this.layerContextMenu.contains(e.target)) {
                this.hideLayerContextMenu();
            }
        });

        // Close menu on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideLayerContextMenu();
            }
        });

        // Setup menu item actions
        this.layerContextMenu.querySelectorAll('.context-menu-item[data-action]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                this.handleLayerContextAction(action);
            });
        });

        // Opacity slider
        const opacitySlider = document.getElementById('contextMenuOpacitySlider');
        const opacityContainer = document.getElementById('opacitySliderContainer');
        const opacityBtn = this.layerContextMenu.querySelector('[data-action="opacity"]');

        if (opacityBtn && opacitySlider) {
            opacityBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                opacityContainer.classList.toggle('visible');
            });

            // Track if we're dragging the slider for undo support
            let opacityDragging = false;

            opacitySlider.addEventListener('mousedown', () => {
                if (this.contextMenuLayerIndex !== null) {
                    opacityDragging = true;
                    this.app.history.startAction();
                }
            });

            opacitySlider.addEventListener('input', (e) => {
                if (this.contextMenuLayerIndex !== null) {
                    const opacity = parseInt(e.target.value) / 100;
                    this.app.layers.setLayerOpacity(this.contextMenuLayerIndex, opacity);
                    document.getElementById('contextMenuOpacity').textContent = `${e.target.value}%`;
                }
            });

            opacitySlider.addEventListener('mouseup', () => {
                if (opacityDragging) {
                    opacityDragging = false;
                    this.app.history.endAction();
                }
            });

            // Also handle if mouse leaves while dragging
            opacitySlider.addEventListener('mouseleave', () => {
                if (opacityDragging) {
                    opacityDragging = false;
                    this.app.history.endAction();
                }
            });
        }

        // Blend mode submenu
        const blendModeBtn = this.layerContextMenu.querySelector('[data-action="blendMode"]');
        const blendModeSubmenu = document.getElementById('blendModeSubmenu');

        if (blendModeBtn && blendModeSubmenu) {
            blendModeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                blendModeSubmenu.classList.toggle('visible');
            });

            blendModeSubmenu.querySelectorAll('[data-blend]').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const blendMode = item.dataset.blend;
                    if (this.contextMenuLayerIndex !== null) {
                        this.app.history.startAction();
                        this.app.layers.setLayerBlendMode(this.contextMenuLayerIndex, blendMode);
                        this.app.history.endAction();
                        this.updateBlendModeDisplay(blendMode);
                        blendModeSubmenu.classList.remove('visible');
                    }
                });
            });
        }
    }

    /**
     * Show layer context menu
     */
    showLayerContextMenu(e, layerIndex) {
        e.preventDefault();
        e.stopPropagation();

        if (!this.layerContextMenu) return;

        this.contextMenuLayerIndex = layerIndex;
        const layer = this.app.layers.getLayer(layerIndex);
        if (!layer) return;

        // Update menu state
        document.getElementById('contextMenuLayerName').textContent = layer.name;
        document.getElementById('contextMenuOpacity').textContent = `${Math.round(layer.opacity * 100)}%`;
        document.getElementById('contextMenuOpacitySlider').value = Math.round(layer.opacity * 100);
        this.updateBlendModeDisplay(layer.blendMode);

        // Update visibility button
        const visibilityText = document.getElementById('contextMenuVisibilityText');
        const visibilityIcon = document.getElementById('contextMenuVisibilityIcon');
        if (visibilityText) {
            visibilityText.textContent = layer.visible ? 'Skrýt vrstvu' : 'Zobrazit vrstvu';
        }
        if (visibilityIcon) {
            visibilityIcon.innerHTML = layer.visible
                ? '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>'
                : '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/>';
        }

        // Update lock button
        const lockText = document.getElementById('contextMenuLockText');
        const lockIcon = document.getElementById('contextMenuLockIcon');
        if (lockText) {
            lockText.textContent = layer.locked ? 'Odemknout vrstvu' : 'Zamknout vrstvu';
        }
        if (lockIcon) {
            lockIcon.innerHTML = layer.locked
                ? '<path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z" fill="currentColor"/>'
                : '<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="currentColor"/>';
        }

        // Disable merge down for first layer
        const mergeDownBtn = this.layerContextMenu.querySelector('[data-action="mergeDown"]');
        if (mergeDownBtn) {
            mergeDownBtn.disabled = layerIndex === 0;
        }

        // Disable delete if only one layer
        const deleteBtn = this.layerContextMenu.querySelector('[data-action="delete"]');
        if (deleteBtn) {
            deleteBtn.disabled = this.app.layers.layers.length <= 1;
        }

        // Handle multi-selection UI
        const mergeSelectedBtn = document.getElementById('mergeSelectedBtn');
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        const deleteSingleBtn = document.getElementById('deleteSingleBtn');
        const multiSelectCount = this.selectedLayers.size;

        if (multiSelectCount > 1) {
            // Show multi-select options
            if (mergeSelectedBtn) {
                mergeSelectedBtn.style.display = 'flex';
                document.getElementById('mergeSelectedText').textContent = `Sloučit vybrané (${multiSelectCount})`;
            }
            if (deleteSelectedBtn) {
                deleteSelectedBtn.style.display = 'flex';
                document.getElementById('deleteSelectedText').textContent = `Smazat vybrané (${multiSelectCount})`;
                // Only enable if we have more layers than selected
                deleteSelectedBtn.disabled = this.app.layers.layers.length <= multiSelectCount;
            }
            if (deleteSingleBtn) {
                deleteSingleBtn.style.display = 'none';
            }
        } else {
            // Hide multi-select options, show single layer options
            if (mergeSelectedBtn) {
                mergeSelectedBtn.style.display = 'none';
            }
            if (deleteSelectedBtn) {
                deleteSelectedBtn.style.display = 'none';
            }
            if (deleteSingleBtn) {
                deleteSingleBtn.style.display = 'flex';
            }
        }

        // Reset submenus
        document.getElementById('opacitySliderContainer')?.classList.remove('visible');
        document.getElementById('blendModeSubmenu')?.classList.remove('visible');

        // Position menu
        const menuWidth = 240;
        const menuHeight = 500;
        let x = e.clientX;
        let y = e.clientY;

        // Adjust if menu would go off screen
        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 10;
        }
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 10;
        }

        this.layerContextMenu.style.left = `${x}px`;
        this.layerContextMenu.style.top = `${y}px`;
        this.layerContextMenu.classList.add('visible');

        // Highlight the layer item
        document.querySelectorAll('.layer-item').forEach(item => item.classList.remove('context-active'));
        const layerItem = document.querySelector(`.layer-item[data-index="${layerIndex}"]`);
        if (layerItem) {
            layerItem.classList.add('context-active');
        }
    }

    /**
     * Hide layer context menu
     */
    hideLayerContextMenu() {
        if (this.layerContextMenu) {
            this.layerContextMenu.classList.remove('visible');
        }
        document.querySelectorAll('.layer-item').forEach(item => item.classList.remove('context-active'));
        this.contextMenuLayerIndex = null;
    }

    /**
     * Update blend mode display in context menu
     */
    updateBlendModeDisplay(blendMode) {
        const blendModeNames = {
            'source-over': 'Normální',
            'multiply': 'Násobit',
            'screen': 'Závoj',
            'overlay': 'Překryv',
            'darken': 'Ztmavit',
            'lighten': 'Zesvětlit',
            'color-dodge': 'Zesvětlit barvy',
            'color-burn': 'Ztmavit barvy',
            'hard-light': 'Tvrdé světlo',
            'soft-light': 'Měkké světlo',
            'difference': 'Rozdíl',
            'exclusion': 'Vyloučení',
            'hue': 'Odstín',
            'saturation': 'Sytost',
            'color': 'Barva',
            'luminosity': 'Světlost'
        };

        const display = document.getElementById('contextMenuBlendMode');
        if (display) {
            display.textContent = blendModeNames[blendMode] || blendMode;
        }

        // Update active state in submenu
        document.querySelectorAll('#blendModeSubmenu [data-blend]').forEach(item => {
            item.classList.toggle('active', item.dataset.blend === blendMode);
        });
    }

    /**
     * Handle layer context menu action
     */
    handleLayerContextAction(action) {
        const index = this.contextMenuLayerIndex;
        if (index === null) return;

        const layer = this.app.layers.getLayer(index);
        if (!layer) return;

        switch (action) {
            case 'rename':
                this.hideLayerContextMenu();
                this.startLayerRename(index);
                break;

            case 'duplicate':
                this.app.history.startAction();
                this.app.layers.duplicateLayer(index);
                this.app.history.endAction();
                this.hideLayerContextMenu();
                this.showNotification('Vrstva duplikována', 'success');
                break;

            case 'toggleVisibility':
                this.app.history.startAction();
                this.app.layers.toggleVisibility(index);
                this.app.history.endAction();
                this.hideLayerContextMenu();
                break;

            case 'toggleLock':
                this.app.history.startAction();
                this.app.layers.toggleLock(index);
                this.app.history.endAction();
                this.hideLayerContextMenu();
                this.showNotification(layer.locked ? 'Vrstva odemknuta' : 'Vrstva zamknuta', 'info');
                break;

            case 'mergeDown':
                if (index > 0) {
                    this.app.history.startAction();
                    this.app.layers.mergeDown(index);
                    this.app.history.endAction();
                    this.hideLayerContextMenu();
                    this.showNotification('Vrstvy sloučeny', 'success');
                }
                break;

            case 'flattenVisible':
                this.app.history.startAction();
                this.mergeVisibleLayers();
                this.app.history.endAction();
                this.hideLayerContextMenu();
                this.showNotification('Viditelné vrstvy sloučeny', 'success');
                break;

            case 'flattenAll':
                this.app.history.startAction();
                this.app.layers.flattenAll();
                this.app.history.endAction();
                this.hideLayerContextMenu();
                this.showNotification('Všechny vrstvy sloučeny', 'success');
                break;

            case 'clearLayer':
                if (!layer.locked) {
                    this.app.history.startAction();
                    this.app.layers.clearLayer(index);
                    this.app.history.endAction();
                    this.hideLayerContextMenu();
                    this.showNotification('Vrstva vymazána', 'success');
                } else {
                    this.showNotification('Vrstva je zamčená', 'error');
                }
                break;

            case 'delete':
                if (this.app.layers.layers.length > 1) {
                    this.app.history.startAction();
                    this.app.layers.removeLayer(index);
                    this.app.history.endAction();
                    this.hideLayerContextMenu();
                    this.showNotification('Vrstva smazána', 'success');
                } else {
                    this.showNotification('Nelze smazat poslední vrstvu', 'error');
                }
                break;

            case 'mergeSelected':
                if (this.selectedLayers.size > 1) {
                    this.app.history.startAction();
                    this.mergeSelectedLayers();
                    this.app.history.endAction();
                    this.hideLayerContextMenu();
                    this.showNotification(`${this.selectedLayers.size} vrstev sloučeno`, 'success');
                    this.clearLayerSelection();
                }
                break;

            case 'deleteSelected':
                if (this.selectedLayers.size > 0 && this.app.layers.layers.length > this.selectedLayers.size) {
                    this.app.history.startAction();
                    this.deleteSelectedLayers();
                    this.app.history.endAction();
                    this.hideLayerContextMenu();
                    this.showNotification(`${this.selectedLayers.size} vrstev smazáno`, 'success');
                    this.clearLayerSelection();
                } else {
                    this.showNotification('Nelze smazat všechny vrstvy', 'error');
                }
                break;
        }
    }

    /**
     * Start renaming a layer
     */
    startLayerRename(index) {
        const layer = this.app.layers.getLayer(index);
        if (!layer) return;

        const layerItem = document.querySelector(`.layer-item[data-index="${index}"]`);
        if (!layerItem) return;

        const nameSpan = layerItem.querySelector('.layer-name');
        if (!nameSpan) return;

        const currentName = layer.name;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'layer-rename-input';
        input.value = currentName;

        nameSpan.replaceWith(input);
        input.focus();
        input.select();

        const finishRename = () => {
            const newName = input.value.trim() || currentName;
            if (newName !== currentName) {
                this.app.history.startAction();
                this.app.layers.renameLayer(index, newName);
                this.app.history.endAction();
            } else {
                this.app.layers.renameLayer(index, newName);
            }
        };

        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            } else if (e.key === 'Escape') {
                input.value = currentName;
                input.blur();
            }
        });
    }

    /**
     * Merge all visible layers
     */
    mergeVisibleLayers() {
        const layers = this.app.layers.layers;
        const visibleLayers = layers.filter(l => l.visible && l.type !== 'folder');

        if (visibleLayers.length <= 1) {
            this.showNotification('Není co sloučit', 'info');
            return;
        }

        // Create temp canvas for merged result
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.app.canvas.width;
        tempCanvas.height = this.app.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Composite visible layers (in correct order - bottom to top)
        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            if (!layer.visible || layer.type === 'folder') continue;

            tempCtx.save();
            tempCtx.globalAlpha = layer.opacity;
            tempCtx.globalCompositeOperation = layer.blendMode;
            tempCtx.drawImage(layer.canvas, 0, 0);
            tempCtx.restore();
        }

        // Remove all visible layers except first, put merged content in first visible
        let firstVisibleIndex = null;
        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            if (layer.visible && layer.type !== 'folder') {
                if (firstVisibleIndex === null) {
                    firstVisibleIndex = i;
                } else {
                    layers.splice(i, 1);
                    if (this.app.layers.activeLayerIndex >= i) {
                        this.app.layers.activeLayerIndex--;
                    }
                }
            }
        }

        // Update first visible layer with merged content
        if (firstVisibleIndex !== null) {
            const targetLayer = this.app.layers.getLayer(firstVisibleIndex);
            if (targetLayer) {
                const ctx = targetLayer.canvas.getContext('2d');
                ctx.clearRect(0, 0, targetLayer.canvas.width, targetLayer.canvas.height);
                ctx.drawImage(tempCanvas, 0, 0);
                targetLayer.name = 'Sloučené vrstvy';
                targetLayer.opacity = 1;
                targetLayer.blendMode = 'source-over';
            }
        }

        this.app.canvas.render();
        this.updateLayersList();
    }

    /**
     * Merge selected layers
     */
    mergeSelectedLayers() {
        if (this.selectedLayers.size <= 1) {
            this.showNotification('Vyberte alespoň 2 vrstvy', 'info');
            return;
        }

        const layers = this.app.layers.layers;
        const selectedIndices = Array.from(this.selectedLayers).sort((a, b) => a - b);

        // Filter out folders and get actual layers
        const selectedLayerData = selectedIndices
            .map(i => ({ index: i, layer: layers[i] }))
            .filter(d => d.layer && d.layer.type !== 'folder');

        if (selectedLayerData.length <= 1) {
            this.showNotification('Vyberte alespoň 2 vrstvy (ne složky)', 'info');
            return;
        }

        // Create temp canvas for merged result
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.app.canvas.width;
        tempCanvas.height = this.app.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Composite selected layers (in correct order - bottom to top)
        for (const { layer } of selectedLayerData) {
            tempCtx.save();
            tempCtx.globalAlpha = layer.opacity;
            tempCtx.globalCompositeOperation = layer.blendMode;
            tempCtx.drawImage(layer.canvas, 0, 0);
            tempCtx.restore();
        }

        // Remove all selected layers except the first one
        const firstIndex = selectedLayerData[0].index;
        for (let i = selectedLayerData.length - 1; i > 0; i--) {
            const idx = selectedLayerData[i].index;
            layers.splice(idx, 1);
            if (this.app.layers.activeLayerIndex >= idx) {
                this.app.layers.activeLayerIndex = Math.max(0, this.app.layers.activeLayerIndex - 1);
            }
        }

        // Update first selected layer with merged content
        const targetLayer = this.app.layers.getLayer(firstIndex);
        if (targetLayer) {
            const ctx = targetLayer.canvas.getContext('2d');
            ctx.clearRect(0, 0, targetLayer.canvas.width, targetLayer.canvas.height);
            ctx.drawImage(tempCanvas, 0, 0);
            targetLayer.name = 'Sloučené vrstvy';
            targetLayer.opacity = 1;
            targetLayer.blendMode = 'source-over';
        }

        this.app.canvas.render();
        this.updateLayersList();
    }

    /**
     * Delete selected layers
     */
    deleteSelectedLayers() {
        if (this.selectedLayers.size === 0) return;

        const layers = this.app.layers.layers;

        // Can't delete all layers
        if (this.selectedLayers.size >= layers.length) {
            this.showNotification('Nelze smazat všechny vrstvy', 'error');
            return;
        }

        // Sort indices in descending order to delete from end first
        const selectedIndices = Array.from(this.selectedLayers).sort((a, b) => b - a);

        for (const idx of selectedIndices) {
            if (layers.length > 1) {
                layers.splice(idx, 1);
                if (this.app.layers.activeLayerIndex >= idx) {
                    this.app.layers.activeLayerIndex = Math.max(0, this.app.layers.activeLayerIndex - 1);
                }
            }
        }

        // Make sure we have a valid active layer
        if (this.app.layers.activeLayerIndex >= layers.length) {
            this.app.layers.activeLayerIndex = layers.length - 1;
        }

        this.app.canvas.render();
        this.updateLayersList();
    }
}
