/**
 * VectorUI - User interface components for vector editing mode
 * Provides vector-specific tools and controls
 */

export class VectorUI {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.toolPanel = null;
        this.propertiesPanel = null;
        this.exportPanel = null;
    }

    /**
     * Initialize vector UI
     */
    init() {
        this.createUI();
        this.attachEventListeners();
    }

    /**
     * Create all UI components
     */
    createUI() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'vectorUI';
        this.container.className = 'vector-ui';
        this.container.style.display = 'none';

        // Create indicator
        this.createModeIndicator();

        // Create properties panel
        this.createPropertiesPanel();

        // Create export panel
        this.createExportPanel();

        document.body.appendChild(this.container);
    }

    /**
     * Create mode indicator (similar to pixel art indicator)
     */
    createModeIndicator() {
        this.modeIndicator = document.createElement('div');
        this.modeIndicator.className = 'vector-mode-indicator';
        this.modeIndicator.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M15 3l2.3 2.3-2.89 2.87 1.42 1.42L18.7 6.7 21 9V3h-6zM3 9l2.3-2.3 2.87 2.89 1.42-1.42L6.7 5.3 9 3H3v6zm6 12l-2.3-2.3 2.89-2.87-1.42-1.42L5.3 17.3 3 15v6h6zm12-6l-2.3 2.3-2.87-2.89-1.42 1.42 2.89 2.87L15 21h6v-6z" fill="currentColor"/>
            </svg>
            <span>Vektorový režim</span>
        `;
        this.container.appendChild(this.modeIndicator);
    }

    /**
     * Create properties panel
     */
    createPropertiesPanel() {
        this.propertiesPanel = document.createElement('div');
        this.propertiesPanel.className = 'vector-properties-panel';
        this.propertiesPanel.innerHTML = `
            <div class="vector-panel-header">
                <h3>Vlastnosti</h3>
            </div>
            <div class="vector-panel-content">
                <!-- Stroke Color -->
                <div class="vector-property-group">
                    <label>Barva tahu</label>
                    <div class="vector-color-row">
                        <input type="color" id="vectorStrokeColor" value="#000000">
                        <input type="text" id="vectorStrokeColorHex" value="#000000" maxlength="7">
                    </div>
                </div>

                <!-- Stroke Width -->
                <div class="vector-property-group">
                    <label>Tloušťka tahu</label>
                    <div class="vector-slider-row">
                        <input type="range" id="vectorStrokeWidth" min="1" max="50" value="2">
                        <span id="vectorStrokeWidthValue">2px</span>
                    </div>
                </div>

                <!-- Fill Color -->
                <div class="vector-property-group">
                    <label>Barva výplně</label>
                    <small class="vector-hint">Pouze pro tvary (obdélník, elipsa)</small>
                    <div class="vector-color-row">
                        <input type="color" id="vectorFillColor" value="#ffffff">
                        <input type="text" id="vectorFillColorHex" value="none" maxlength="7">
                        <label class="vector-checkbox">
                            <input type="checkbox" id="vectorNoFill" checked>
                            Bez výplně
                        </label>
                    </div>
                </div>

                <!-- Opacity -->
                <div class="vector-property-group">
                    <label>Průhlednost</label>
                    <div class="vector-slider-row">
                        <input type="range" id="vectorOpacity" min="0" max="100" value="100">
                        <span id="vectorOpacityValue">100%</span>
                    </div>
                </div>

                <!-- Line Cap -->
                <div class="vector-property-group">
                    <label>Zakončení čáry</label>
                    <div class="vector-button-group linecap-group">
                        <button class="vector-option-btn active" data-linecap="round" title="Zaoblené zakončení">
                            <svg viewBox="0 0 40 20" width="40" height="20">
                                <line x1="8" y1="10" x2="32" y2="10" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>
                                <circle cx="8" cy="10" r="2" fill="#8b5cf6"/>
                                <circle cx="32" cy="10" r="2" fill="#8b5cf6"/>
                            </svg>
                        </button>
                        <button class="vector-option-btn" data-linecap="square" title="Čtvercové zakončení">
                            <svg viewBox="0 0 40 20" width="40" height="20">
                                <line x1="8" y1="10" x2="32" y2="10" stroke="currentColor" stroke-width="8" stroke-linecap="square"/>
                                <rect x="2" y="6" width="4" height="8" fill="none" stroke="#8b5cf6" stroke-width="1"/>
                                <rect x="34" y="6" width="4" height="8" fill="none" stroke="#8b5cf6" stroke-width="1"/>
                            </svg>
                        </button>
                        <button class="vector-option-btn" data-linecap="butt" title="Rovné zakončení">
                            <svg viewBox="0 0 40 20" width="40" height="20">
                                <line x1="8" y1="10" x2="32" y2="10" stroke="currentColor" stroke-width="8" stroke-linecap="butt"/>
                                <line x1="8" y1="4" x2="8" y2="16" stroke="#8b5cf6" stroke-width="1"/>
                                <line x1="32" y1="4" x2="32" y2="16" stroke="#8b5cf6" stroke-width="1"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Line Join -->
                <div class="vector-property-group">
                    <label>Spojení čar</label>
                    <div class="vector-button-group linejoin-group">
                        <button class="vector-option-btn active" data-linejoin="round" title="Zaoblené spojení">
                            <svg viewBox="0 0 40 24" width="40" height="24">
                                <polyline points="6,20 20,6 34,20" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <button class="vector-option-btn" data-linejoin="miter" title="Ostré spojení">
                            <svg viewBox="0 0 40 24" width="40" height="24">
                                <polyline points="6,20 20,6 34,20" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="miter"/>
                            </svg>
                        </button>
                        <button class="vector-option-btn" data-linejoin="bevel" title="Zkosené spojení">
                            <svg viewBox="0 0 40 24" width="40" height="24">
                                <polyline points="6,20 20,6 34,20" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="bevel"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        this.container.appendChild(this.propertiesPanel);
    }

    /**
     * Create export panel
     */
    createExportPanel() {
        this.exportPanel = document.createElement('div');
        this.exportPanel.className = 'vector-export-panel';
        this.exportPanel.innerHTML = `
            <div class="vector-panel-header">
                <h3>Export</h3>
            </div>
            <div class="vector-panel-content">
                <button class="vector-export-btn" id="exportSVGBtn">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/>
                    </svg>
                    <span>Exportovat SVG</span>
                </button>
                <button class="vector-export-btn" id="exportVectorPNGBtn">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/>
                    </svg>
                    <span>Exportovat PNG</span>
                </button>
                <div class="vector-export-scale">
                    <label>Měřítko PNG</label>
                    <select id="vectorPNGScale">
                        <option value="1">1x (originál)</option>
                        <option value="2" selected>2x</option>
                        <option value="3">3x</option>
                        <option value="4">4x</option>
                    </select>
                </div>
            </div>
        `;
        this.container.appendChild(this.exportPanel);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Stroke color
        const strokeColorInput = this.container.querySelector('#vectorStrokeColor');
        const strokeColorHex = this.container.querySelector('#vectorStrokeColorHex');
        if (strokeColorInput) {
            strokeColorInput.addEventListener('input', (e) => {
                const color = e.target.value;
                strokeColorHex.value = color;
                this.app.vector?.setStrokeColor(color);
            });
        }
        if (strokeColorHex) {
            strokeColorHex.addEventListener('change', (e) => {
                const color = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                    strokeColorInput.value = color;
                    this.app.vector?.setStrokeColor(color);
                }
            });
        }

        // Stroke width
        const strokeWidthInput = this.container.querySelector('#vectorStrokeWidth');
        const strokeWidthValue = this.container.querySelector('#vectorStrokeWidthValue');
        if (strokeWidthInput) {
            strokeWidthInput.addEventListener('input', (e) => {
                const width = parseInt(e.target.value);
                strokeWidthValue.textContent = `${width}px`;
                this.app.vector?.setStrokeWidth(width);
            });
        }

        // Fill color
        const fillColorInput = this.container.querySelector('#vectorFillColor');
        const fillColorHex = this.container.querySelector('#vectorFillColorHex');
        const noFillCheckbox = this.container.querySelector('#vectorNoFill');

        if (noFillCheckbox) {
            noFillCheckbox.addEventListener('change', (e) => {
                const noFill = e.target.checked;
                fillColorInput.disabled = noFill;
                if (noFill) {
                    fillColorHex.value = 'none';
                    this.app.vector?.setFillColor('none');
                } else {
                    fillColorHex.value = fillColorInput.value;
                    this.app.vector?.setFillColor(fillColorInput.value);
                }
            });
        }

        if (fillColorInput) {
            fillColorInput.addEventListener('input', (e) => {
                if (!noFillCheckbox.checked) {
                    const color = e.target.value;
                    fillColorHex.value = color;
                    this.app.vector?.setFillColor(color);
                }
            });
        }

        // Opacity
        const opacityInput = this.container.querySelector('#vectorOpacity');
        const opacityValue = this.container.querySelector('#vectorOpacityValue');
        if (opacityInput) {
            opacityInput.addEventListener('input', (e) => {
                const opacity = parseInt(e.target.value);
                opacityValue.textContent = `${opacity}%`;
                this.app.vector?.setOpacity(opacity / 100);
            });
        }

        // Line cap buttons
        this.container.querySelectorAll('[data-linecap]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const linecap = e.currentTarget.dataset.linecap;
                this.container.querySelectorAll('[data-linecap]').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                if (this.app.vector) {
                    this.app.vector.toolSettings.lineCap = linecap;
                }
            });
        });

        // Line join buttons
        this.container.querySelectorAll('[data-linejoin]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const linejoin = e.currentTarget.dataset.linejoin;
                this.container.querySelectorAll('[data-linejoin]').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                if (this.app.vector) {
                    this.app.vector.toolSettings.lineJoin = linejoin;
                }
            });
        });

        // Export SVG
        const exportSVGBtn = this.container.querySelector('#exportSVGBtn');
        if (exportSVGBtn) {
            exportSVGBtn.addEventListener('click', () => {
                const filename = this.app.currentProject?.name || 'vector-image';
                this.app.vector?.downloadSVG(filename);
            });
        }

        // Export PNG
        const exportPNGBtn = this.container.querySelector('#exportVectorPNGBtn');
        if (exportPNGBtn) {
            exportPNGBtn.addEventListener('click', () => {
                const filename = this.app.currentProject?.name || 'vector-image';
                const scale = parseInt(this.container.querySelector('#vectorPNGScale').value);
                this.app.vector?.downloadPNG(filename, scale);
            });
        }
    }

    /**
     * Show vector UI
     */
    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    /**
     * Hide vector UI
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * Update tool state in UI
     */
    setActiveTool(toolName) {
        // Update tool buttons if they exist
        this.container?.querySelectorAll('.vector-tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === toolName);
        });
    }

    /**
     * Sync UI with current vector manager state
     */
    syncWithVectorManager() {
        const vector = this.app.vector;
        if (!vector) return;

        const settings = vector.toolSettings;

        // Sync stroke color
        const strokeColorInput = this.container.querySelector('#vectorStrokeColor');
        const strokeColorHex = this.container.querySelector('#vectorStrokeColorHex');
        if (strokeColorInput) strokeColorInput.value = settings.stroke;
        if (strokeColorHex) strokeColorHex.value = settings.stroke;

        // Sync stroke width
        const strokeWidthInput = this.container.querySelector('#vectorStrokeWidth');
        const strokeWidthValue = this.container.querySelector('#vectorStrokeWidthValue');
        if (strokeWidthInput) strokeWidthInput.value = settings.strokeWidth;
        if (strokeWidthValue) strokeWidthValue.textContent = `${settings.strokeWidth}px`;

        // Sync fill
        const fillColorInput = this.container.querySelector('#vectorFillColor');
        const noFillCheckbox = this.container.querySelector('#vectorNoFill');
        if (noFillCheckbox) noFillCheckbox.checked = settings.fill === 'none';
        if (fillColorInput) fillColorInput.disabled = settings.fill === 'none';

        // Sync opacity
        const opacityInput = this.container.querySelector('#vectorOpacity');
        const opacityValue = this.container.querySelector('#vectorOpacityValue');
        const opacityPercent = Math.round(settings.opacity * 100);
        if (opacityInput) opacityInput.value = opacityPercent;
        if (opacityValue) opacityValue.textContent = `${opacityPercent}%`;
    }

    /**
     * Update stroke color in UI
     */
    updateStrokeColor(color) {
        const strokeColorInput = this.container.querySelector('#vectorStrokeColor');
        const strokeColorHex = this.container.querySelector('#vectorStrokeColorHex');
        if (strokeColorInput) strokeColorInput.value = color;
        if (strokeColorHex) strokeColorHex.value = color;

        if (this.app.vector) {
            this.app.vector.toolSettings.stroke = color;
        }
    }

    /**
     * Destroy vector UI
     */
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
    }
}
