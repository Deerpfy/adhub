/**
 * UIController - Manages all UI interactions
 */

export class UIController {
    constructor(app) {
        this.app = app;
        this.notificationTimeout = null;
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
        this.setupZoomControls();
        this.setupPanelCollapse();
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

        // Menu button
        document.getElementById('menuBtn')?.addEventListener('click', () => {
            this.showMenu();
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
            });
            input.addEventListener('change', () => {
                slider.value = input.value;
                callback(parseInt(input.value));
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
        });
    }

    /**
     * Setup layer controls
     */
    setupLayerControls() {
        document.getElementById('addLayerBtn')?.addEventListener('click', () => {
            this.app.layers.addLayer();
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

        // Reverse order so top layer is at top
        const layers = [...this.app.layers.getLayers()].reverse();

        layers.forEach((layer, i) => {
            const actualIndex = this.app.layers.getLayers().length - 1 - i;

            const item = document.createElement('div');
            item.className = 'layer-item' + (actualIndex === this.app.layers.activeLayerIndex ? ' active' : '');
            item.dataset.index = actualIndex;

            item.innerHTML = `
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

            // Click to select
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.layer-visibility')) {
                    this.app.layers.setActiveLayer(actualIndex);
                    this.updateBlendModeSelect();
                }
            });

            // Visibility toggle
            item.querySelector('.layer-visibility')?.addEventListener('click', () => {
                this.app.layers.toggleVisibility(actualIndex);
            });

            // Add thumbnail
            const thumbContainer = item.querySelector('.layer-thumbnail');
            if (thumbContainer) {
                const thumb = this.app.layers.getLayerThumbnail(actualIndex);
                if (thumb) {
                    thumbContainer.appendChild(thumb);
                }
            }

            list.appendChild(item);
        });

        this.updateBlendModeSelect();
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
        document.getElementById(modalId).style.display = 'none';
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
}
