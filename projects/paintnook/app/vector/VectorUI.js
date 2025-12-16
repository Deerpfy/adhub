/**
 * VectorUI - User interface components for vector editing mode
 * Provides vector-specific tools and controls in the right panel
 */

export class VectorUI {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.vectorSection = null;
        this.modeIndicator = null;
        this.toolbox = null;
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
        // Create container for mode indicator only
        this.container = document.createElement('div');
        this.container.id = 'vectorUI';
        this.container.className = 'vector-ui';
        this.container.style.display = 'none';

        // Create indicator (shown in canvas area)
        this.createModeIndicator();

        // Create toolbox (left side)
        this.createToolbox();

        document.body.appendChild(this.container);

        // Create vector section for the right panel
        this.createVectorSection();
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
     * Create vector toolbox (left side)
     */
    createToolbox() {
        this.toolbox = document.createElement('div');
        this.toolbox.id = 'vectorToolbox';
        this.toolbox.className = 'vector-toolbox';
        this.toolbox.innerHTML = `
            <div class="vector-toolbox-section">
                <button class="vector-tool-btn active" data-tool="select" title="Výběr (V)">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
                <button class="vector-tool-btn" data-tool="pen" title="Pero (P)">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                    </svg>
                </button>
            </div>
            <div class="vector-toolbox-divider"></div>
            <div class="vector-toolbox-section">
                <button class="vector-tool-btn" data-tool="line" title="Čára (L)">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
                <button class="vector-tool-btn" data-tool="arrow" title="Šipka (A)">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <line x1="5" y1="19" x2="16" y2="8" stroke="currentColor" stroke-width="2"/>
                        <polygon points="19,5 12,7 17,12" fill="currentColor"/>
                    </svg>
                </button>
                <button class="vector-tool-btn" data-tool="rectangle" title="Obdélník (R)">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <rect x="4" y="6" width="16" height="12" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
                <button class="vector-tool-btn" data-tool="ellipse" title="Elipsa (E)">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <ellipse cx="12" cy="12" rx="8" ry="6" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
                <button class="vector-tool-btn" data-tool="polygon" title="Mnohoúhelník (G)">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <polygon points="12,3 21,10 18,21 6,21 3,10" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
                <button class="vector-tool-btn" data-tool="star" title="Hvězda (S)">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            </div>
            <div class="vector-toolbox-divider"></div>
            <div class="vector-toolbox-section">
                <button class="vector-tool-btn" data-tool="gradient" title="Přechod (D)">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <defs>
                            <linearGradient id="gradIcon" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" style="stop-color:currentColor;stop-opacity:1"/>
                                <stop offset="100%" style="stop-color:currentColor;stop-opacity:0.2"/>
                            </linearGradient>
                        </defs>
                        <rect x="3" y="6" width="18" height="12" rx="2" fill="url(#gradIcon)" stroke="currentColor" stroke-width="1"/>
                    </svg>
                </button>
                <button class="vector-tool-btn" data-tool="text" title="Text (T)">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <text x="6" y="18" font-size="16" font-weight="bold" fill="currentColor">T</text>
                    </svg>
                </button>
            </div>
        `;
        this.container.appendChild(this.toolbox);
    }

    /**
     * Create vector section for right panel (like Pixel Art section)
     */
    createVectorSection() {
        const panelRight = document.getElementById('panelRight');
        if (!panelRight) return;

        this.vectorSection = document.createElement('section');
        this.vectorSection.className = 'panel-section vector-section';
        this.vectorSection.id = 'vectorSection';
        this.vectorSection.style.display = 'none';
        this.vectorSection.innerHTML = `
            <div class="panel-header">
                <h3>Vektor - Vlastnosti</h3>
                <button class="btn-icon btn-collapse" data-collapse="vectorSection">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" fill="currentColor"/>
                    </svg>
                </button>
            </div>
            <div class="panel-content">
                <!-- Stroke Color -->
                <div class="setting-row">
                    <label>Barva tahu</label>
                    <div class="color-input-row" style="gap: 8px;">
                        <input type="color" id="vectorStrokeColor" value="#000000" style="width: 40px; height: 30px;">
                        <input type="text" id="vectorStrokeColorHex" value="#000000" maxlength="7" class="slider-input" style="width: 80px;">
                    </div>
                </div>

                <!-- Stroke Width -->
                <div class="setting-row">
                    <label>Tloušťka tahu</label>
                    <div class="slider-group">
                        <input type="range" id="vectorStrokeWidth" min="1" max="50" value="2" class="slider">
                        <span id="vectorStrokeWidthValue" class="slider-input" style="width: 50px; text-align: center;">2px</span>
                    </div>
                </div>

                <!-- Fill Color -->
                <div class="setting-row">
                    <label>Barva výplně</label>
                    <div class="color-input-row" style="gap: 8px; flex-wrap: wrap;">
                        <input type="color" id="vectorFillColor" value="#ffffff" style="width: 40px; height: 30px;">
                        <input type="text" id="vectorFillColorHex" value="none" maxlength="7" class="slider-input" style="width: 80px;">
                    </div>
                    <label class="checkbox-row" style="margin-top: 4px;">
                        <input type="checkbox" id="vectorNoFill" checked>
                        Bez výplně
                    </label>
                </div>

                <!-- Opacity -->
                <div class="setting-row">
                    <label>Průhlednost</label>
                    <div class="slider-group">
                        <input type="range" id="vectorOpacity" min="0" max="100" value="100" class="slider">
                        <span id="vectorOpacityValue" class="slider-input" style="width: 50px; text-align: center;">100%</span>
                    </div>
                </div>

                <!-- Line Cap -->
                <div class="setting-row">
                    <label>Zakončení čáry</label>
                    <div class="vector-button-group linecap-group">
                        <button class="vector-option-btn active" data-linecap="round" title="Zaoblené">
                            <svg viewBox="0 0 40 20" width="32" height="16">
                                <line x1="8" y1="10" x2="32" y2="10" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
                            </svg>
                        </button>
                        <button class="vector-option-btn" data-linecap="square" title="Čtvercové">
                            <svg viewBox="0 0 40 20" width="32" height="16">
                                <line x1="8" y1="10" x2="32" y2="10" stroke="currentColor" stroke-width="6" stroke-linecap="square"/>
                            </svg>
                        </button>
                        <button class="vector-option-btn" data-linecap="butt" title="Rovné">
                            <svg viewBox="0 0 40 20" width="32" height="16">
                                <line x1="8" y1="10" x2="32" y2="10" stroke="currentColor" stroke-width="6" stroke-linecap="butt"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Line Join -->
                <div class="setting-row">
                    <label>Spojení čar</label>
                    <div class="vector-button-group linejoin-group">
                        <button class="vector-option-btn active" data-linejoin="round" title="Zaoblené">
                            <svg viewBox="0 0 40 24" width="32" height="18">
                                <polyline points="6,20 20,6 34,20" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <button class="vector-option-btn" data-linejoin="miter" title="Ostré">
                            <svg viewBox="0 0 40 24" width="32" height="18">
                                <polyline points="6,20 20,6 34,20" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="miter"/>
                            </svg>
                        </button>
                        <button class="vector-option-btn" data-linejoin="bevel" title="Zkosené">
                            <svg viewBox="0 0 40 24" width="32" height="18">
                                <polyline points="6,20 20,6 34,20" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="bevel"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- QuickShape Toggle -->
                <div class="setting-row checkbox-row" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-border);">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="vectorQuickshapeEnabled">
                        <svg viewBox="0 0 24 24" width="16" height="16" style="opacity: 0.7;">
                            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" fill="currentColor"/>
                        </svg>
                        QuickShape (auto-detekce tvarů)
                    </label>
                </div>
            </div>

            <!-- Tool-specific Settings -->
            <div class="panel-header" style="margin-top: 8px; border-top: 1px solid var(--color-border);">
                <h3>Nastavení nástroje</h3>
            </div>
            <div class="panel-content" id="toolSpecificSettings">
                <!-- Polygon Settings -->
                <div class="tool-settings" id="polygonSettings" style="display: none;">
                    <div class="setting-row">
                        <label>Počet stran</label>
                        <div class="slider-group">
                            <input type="range" id="polygonSides" min="3" max="12" value="6" class="slider">
                            <span id="polygonSidesValue" class="slider-input" style="width: 40px; text-align: center;">6</span>
                        </div>
                    </div>
                </div>

                <!-- Star Settings -->
                <div class="tool-settings" id="starSettings" style="display: none;">
                    <div class="setting-row">
                        <label>Počet cípů</label>
                        <div class="slider-group">
                            <input type="range" id="starPoints" min="3" max="20" value="5" class="slider">
                            <span id="starPointsValue" class="slider-input" style="width: 40px; text-align: center;">5</span>
                        </div>
                    </div>
                    <div class="setting-row">
                        <label>Vnitřní poloměr</label>
                        <div class="slider-group">
                            <input type="range" id="starInnerRadius" min="10" max="90" value="40" class="slider">
                            <span id="starInnerRadiusValue" class="slider-input" style="width: 45px; text-align: center;">40%</span>
                        </div>
                    </div>
                </div>

                <!-- Arrow Settings -->
                <div class="tool-settings" id="arrowSettings" style="display: none;">
                    <div class="setting-row">
                        <label>Velikost hlavičky</label>
                        <div class="slider-group">
                            <input type="range" id="arrowHeadSize" min="5" max="100" value="20" class="slider">
                            <span id="arrowHeadSizeValue" class="slider-input" style="width: 45px; text-align: center;">20px</span>
                        </div>
                    </div>
                </div>

                <!-- Gradient Settings -->
                <div class="tool-settings" id="gradientSettings" style="display: none;">
                    <div class="setting-row">
                        <label>Typ přechodu</label>
                        <div class="vector-button-group gradient-type-group">
                            <button class="vector-option-btn active" data-gradient-type="linear" title="Lineární">
                                <svg viewBox="0 0 32 20" width="28" height="16">
                                    <defs>
                                        <linearGradient id="linGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" style="stop-color:#666"/>
                                            <stop offset="100%" style="stop-color:#ddd"/>
                                        </linearGradient>
                                    </defs>
                                    <rect x="2" y="2" width="28" height="16" rx="2" fill="url(#linGrad)"/>
                                </svg>
                            </button>
                            <button class="vector-option-btn" data-gradient-type="radial" title="Radiální">
                                <svg viewBox="0 0 32 20" width="28" height="16">
                                    <defs>
                                        <radialGradient id="radGrad" cx="50%" cy="50%" r="50%">
                                            <stop offset="0%" style="stop-color:#ddd"/>
                                            <stop offset="100%" style="stop-color:#666"/>
                                        </radialGradient>
                                    </defs>
                                    <rect x="2" y="2" width="28" height="16" rx="2" fill="url(#radGrad)"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="setting-row">
                        <label>Barva 1</label>
                        <div class="color-input-row" style="gap: 8px;">
                            <input type="color" id="gradientColor1" value="#000000" style="width: 40px; height: 30px;">
                            <input type="text" id="gradientColor1Hex" value="#000000" maxlength="7" class="slider-input" style="width: 80px;">
                        </div>
                    </div>
                    <div class="setting-row">
                        <label>Barva 2</label>
                        <div class="color-input-row" style="gap: 8px;">
                            <input type="color" id="gradientColor2" value="#ffffff" style="width: 40px; height: 30px;">
                            <input type="text" id="gradientColor2Hex" value="#ffffff" maxlength="7" class="slider-input" style="width: 80px;">
                        </div>
                    </div>
                </div>

                <!-- Default message when no tool-specific settings -->
                <div class="tool-settings" id="defaultToolMessage">
                    <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0;">
                        Vyberte nástroj pro zobrazení jeho nastavení.
                    </p>
                </div>
            </div>

            <!-- Export Section -->
            <div class="panel-header" style="margin-top: 8px; border-top: 1px solid var(--color-border);">
                <h3>Export</h3>
            </div>
            <div class="panel-content">
                <div class="setting-row" style="flex-direction: column; gap: 8px;">
                    <button class="btn-secondary" id="exportSVGBtn" style="width: 100%; justify-content: center;">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/>
                        </svg>
                        <span>Exportovat SVG</span>
                    </button>
                    <button class="btn-secondary" id="exportVectorPNGBtn" style="width: 100%; justify-content: center;">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/>
                        </svg>
                        <span>Exportovat PNG</span>
                    </button>
                </div>
                <div class="setting-row">
                    <label>Měřítko PNG</label>
                    <select id="vectorPNGScale" class="slider-input" style="width: 100px;">
                        <option value="1">1x</option>
                        <option value="2" selected>2x</option>
                        <option value="3">3x</option>
                        <option value="4">4x</option>
                    </select>
                </div>
            </div>
        `;

        // Insert after pixel art toggle section
        const pixelArtToggle = document.getElementById('pixelArtToggleSection');
        if (pixelArtToggle && pixelArtToggle.nextSibling) {
            panelRight.insertBefore(this.vectorSection, pixelArtToggle.nextSibling);
        } else {
            panelRight.insertBefore(this.vectorSection, panelRight.firstChild);
        }
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Wait for vectorSection to be created
        if (!this.vectorSection) return;

        // Stroke color
        const strokeColorInput = this.vectorSection.querySelector('#vectorStrokeColor');
        const strokeColorHex = this.vectorSection.querySelector('#vectorStrokeColorHex');
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
        const strokeWidthInput = this.vectorSection.querySelector('#vectorStrokeWidth');
        const strokeWidthValue = this.vectorSection.querySelector('#vectorStrokeWidthValue');
        if (strokeWidthInput) {
            strokeWidthInput.addEventListener('input', (e) => {
                const width = parseInt(e.target.value);
                strokeWidthValue.textContent = `${width}px`;
                this.app.vector?.setStrokeWidth(width);
            });
        }

        // Fill color
        const fillColorInput = this.vectorSection.querySelector('#vectorFillColor');
        const fillColorHex = this.vectorSection.querySelector('#vectorFillColorHex');
        const noFillCheckbox = this.vectorSection.querySelector('#vectorNoFill');

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
        const opacityInput = this.vectorSection.querySelector('#vectorOpacity');
        const opacityValue = this.vectorSection.querySelector('#vectorOpacityValue');
        if (opacityInput) {
            opacityInput.addEventListener('input', (e) => {
                const opacity = parseInt(e.target.value);
                opacityValue.textContent = `${opacity}%`;
                this.app.vector?.setOpacity(opacity / 100);
            });
        }

        // Line cap buttons
        this.vectorSection.querySelectorAll('[data-linecap]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const linecap = e.currentTarget.dataset.linecap;
                this.vectorSection.querySelectorAll('[data-linecap]').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                if (this.app.vector) {
                    this.app.vector.toolSettings.lineCap = linecap;
                }
            });
        });

        // Line join buttons
        this.vectorSection.querySelectorAll('[data-linejoin]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const linejoin = e.currentTarget.dataset.linejoin;
                this.vectorSection.querySelectorAll('[data-linejoin]').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                if (this.app.vector) {
                    this.app.vector.toolSettings.lineJoin = linejoin;
                }
            });
        });

        // Export SVG
        const exportSVGBtn = this.vectorSection.querySelector('#exportSVGBtn');
        if (exportSVGBtn) {
            exportSVGBtn.addEventListener('click', () => {
                const filename = this.app.currentProject?.name || 'vector-image';
                this.app.vector?.downloadSVG(filename);
            });
        }

        // Export PNG
        const exportPNGBtn = this.vectorSection.querySelector('#exportVectorPNGBtn');
        if (exportPNGBtn) {
            exportPNGBtn.addEventListener('click', () => {
                const filename = this.app.currentProject?.name || 'vector-image';
                const scale = parseInt(this.vectorSection.querySelector('#vectorPNGScale').value);
                this.app.vector?.downloadPNG(filename, scale);
            });
        }

        // QuickShape toggle
        const quickshapeCheckbox = this.vectorSection.querySelector('#vectorQuickshapeEnabled');
        if (quickshapeCheckbox) {
            // Sync with app settings on init
            quickshapeCheckbox.checked = this.app.settings?.quickshapeEnabled ?? false;

            quickshapeCheckbox.addEventListener('change', (e) => {
                if (this.app.settings) {
                    this.app.settings.quickshapeEnabled = e.target.checked;
                }
                // Sync with floating QS button (left side)
                this.app.ui?.updateQuickShapeToggleButton?.();
                // Sync with brush settings checkbox
                const brushCheckbox = document.getElementById('quickshapeEnabled');
                if (brushCheckbox) brushCheckbox.checked = e.target.checked;
            });
        }

        // Toolbox tool buttons
        if (this.toolbox) {
            this.toolbox.querySelectorAll('.vector-tool-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tool = e.currentTarget.dataset.tool;
                    this.setActiveTool(tool);
                    this.app.vector?.setTool(tool);
                    this.showToolSettings(tool);
                });
            });
        }

        // Polygon settings
        const polygonSidesInput = this.vectorSection.querySelector('#polygonSides');
        const polygonSidesValue = this.vectorSection.querySelector('#polygonSidesValue');
        if (polygonSidesInput) {
            polygonSidesInput.addEventListener('input', (e) => {
                const sides = parseInt(e.target.value);
                polygonSidesValue.textContent = sides.toString();
                this.app.vector?.setPolygonSides(sides);
            });
        }

        // Star settings
        const starPointsInput = this.vectorSection.querySelector('#starPoints');
        const starPointsValue = this.vectorSection.querySelector('#starPointsValue');
        if (starPointsInput) {
            starPointsInput.addEventListener('input', (e) => {
                const points = parseInt(e.target.value);
                starPointsValue.textContent = points.toString();
                this.app.vector?.setStarPoints(points);
            });
        }

        const starInnerRadiusInput = this.vectorSection.querySelector('#starInnerRadius');
        const starInnerRadiusValue = this.vectorSection.querySelector('#starInnerRadiusValue');
        if (starInnerRadiusInput) {
            starInnerRadiusInput.addEventListener('input', (e) => {
                const ratio = parseInt(e.target.value);
                starInnerRadiusValue.textContent = `${ratio}%`;
                this.app.vector?.setStarInnerRadius(ratio / 100);
            });
        }

        // Arrow settings
        const arrowHeadSizeInput = this.vectorSection.querySelector('#arrowHeadSize');
        const arrowHeadSizeValue = this.vectorSection.querySelector('#arrowHeadSizeValue');
        if (arrowHeadSizeInput) {
            arrowHeadSizeInput.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                arrowHeadSizeValue.textContent = `${size}px`;
                this.app.vector?.setArrowHeadSize(size);
            });
        }

        // Gradient settings - type buttons
        this.vectorSection.querySelectorAll('[data-gradient-type]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.gradientType;
                this.vectorSection.querySelectorAll('[data-gradient-type]').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.app.vector?.setGradientType(type);
            });
        });

        // Gradient color 1
        const gradientColor1Input = this.vectorSection.querySelector('#gradientColor1');
        const gradientColor1Hex = this.vectorSection.querySelector('#gradientColor1Hex');
        if (gradientColor1Input) {
            gradientColor1Input.addEventListener('input', (e) => {
                const color = e.target.value;
                gradientColor1Hex.value = color;
                this.updateGradientColors();
            });
        }
        if (gradientColor1Hex) {
            gradientColor1Hex.addEventListener('change', (e) => {
                const color = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                    gradientColor1Input.value = color;
                    this.updateGradientColors();
                }
            });
        }

        // Gradient color 2
        const gradientColor2Input = this.vectorSection.querySelector('#gradientColor2');
        const gradientColor2Hex = this.vectorSection.querySelector('#gradientColor2Hex');
        if (gradientColor2Input) {
            gradientColor2Input.addEventListener('input', (e) => {
                const color = e.target.value;
                gradientColor2Hex.value = color;
                this.updateGradientColors();
            });
        }
        if (gradientColor2Hex) {
            gradientColor2Hex.addEventListener('change', (e) => {
                const color = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                    gradientColor2Input.value = color;
                    this.updateGradientColors();
                }
            });
        }
    }

    /**
     * Update gradient colors in VectorManager
     */
    updateGradientColors() {
        const color1 = this.vectorSection.querySelector('#gradientColor1')?.value || '#000000';
        const color2 = this.vectorSection.querySelector('#gradientColor2')?.value || '#ffffff';
        this.app.vector?.setGradientColors(color1, color2);
    }

    /**
     * Show tool-specific settings based on selected tool
     */
    showToolSettings(toolName) {
        // Hide all tool settings
        this.vectorSection.querySelectorAll('.tool-settings').forEach(el => {
            el.style.display = 'none';
        });

        // Show specific settings based on tool
        switch (toolName) {
            case 'polygon':
                this.vectorSection.querySelector('#polygonSettings').style.display = '';
                break;
            case 'star':
                this.vectorSection.querySelector('#starSettings').style.display = '';
                break;
            case 'arrow':
                this.vectorSection.querySelector('#arrowSettings').style.display = '';
                break;
            case 'gradient':
                this.vectorSection.querySelector('#gradientSettings').style.display = '';
                break;
            default:
                this.vectorSection.querySelector('#defaultToolMessage').style.display = '';
                break;
        }
    }

    /**
     * Show vector UI - hide raster sections, show vector section
     */
    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }

        // Show vector section in right panel
        if (this.vectorSection) {
            this.vectorSection.style.display = '';
        }

        // Hide raster-specific sections
        const colorPickerSection = document.getElementById('colorPickerSection');
        const brushSettings = document.getElementById('brushSettings');
        const pixelArtToggleSection = document.getElementById('pixelArtToggleSection');

        if (colorPickerSection) colorPickerSection.style.display = 'none';
        if (brushSettings) brushSettings.style.display = 'none';
        if (pixelArtToggleSection) pixelArtToggleSection.style.display = 'none';
    }

    /**
     * Hide vector UI - show raster sections, hide vector section
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }

        // Hide vector section in right panel
        if (this.vectorSection) {
            this.vectorSection.style.display = 'none';
        }

        // Show raster-specific sections
        const colorPickerSection = document.getElementById('colorPickerSection');
        const brushSettings = document.getElementById('brushSettings');
        const pixelArtToggleSection = document.getElementById('pixelArtToggleSection');

        if (colorPickerSection) colorPickerSection.style.display = '';
        if (brushSettings) brushSettings.style.display = '';
        if (pixelArtToggleSection) pixelArtToggleSection.style.display = '';
    }

    /**
     * Update tool state in UI
     */
    setActiveTool(toolName) {
        // Update tool buttons in toolbox
        if (this.toolbox) {
            this.toolbox.querySelectorAll('.vector-tool-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tool === toolName);
            });
        }
        // Also update any other tool buttons in container
        this.container?.querySelectorAll('.vector-tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === toolName);
        });
    }

    /**
     * Sync UI with current vector manager state
     */
    syncWithVectorManager() {
        const vector = this.app.vector;
        if (!vector || !this.vectorSection) return;

        const settings = vector.toolSettings;

        // Sync stroke color
        const strokeColorInput = this.vectorSection.querySelector('#vectorStrokeColor');
        const strokeColorHex = this.vectorSection.querySelector('#vectorStrokeColorHex');
        if (strokeColorInput) strokeColorInput.value = settings.stroke;
        if (strokeColorHex) strokeColorHex.value = settings.stroke;

        // Sync stroke width
        const strokeWidthInput = this.vectorSection.querySelector('#vectorStrokeWidth');
        const strokeWidthValue = this.vectorSection.querySelector('#vectorStrokeWidthValue');
        if (strokeWidthInput) strokeWidthInput.value = settings.strokeWidth;
        if (strokeWidthValue) strokeWidthValue.textContent = `${settings.strokeWidth}px`;

        // Sync fill
        const fillColorInput = this.vectorSection.querySelector('#vectorFillColor');
        const noFillCheckbox = this.vectorSection.querySelector('#vectorNoFill');
        if (noFillCheckbox) noFillCheckbox.checked = settings.fill === 'none';
        if (fillColorInput) fillColorInput.disabled = settings.fill === 'none';

        // Sync opacity
        const opacityInput = this.vectorSection.querySelector('#vectorOpacity');
        const opacityValue = this.vectorSection.querySelector('#vectorOpacityValue');
        const opacityPercent = Math.round(settings.opacity * 100);

        // Sync QuickShape checkbox
        const quickshapeCheckbox = this.vectorSection.querySelector('#vectorQuickshapeEnabled');
        if (quickshapeCheckbox) {
            quickshapeCheckbox.checked = this.app.settings?.quickshapeEnabled ?? false;
        }
        if (opacityInput) opacityInput.value = opacityPercent;
        if (opacityValue) opacityValue.textContent = `${opacityPercent}%`;
    }

    /**
     * Update stroke color in UI
     */
    updateStrokeColor(color) {
        if (!this.vectorSection) return;

        const strokeColorInput = this.vectorSection.querySelector('#vectorStrokeColor');
        const strokeColorHex = this.vectorSection.querySelector('#vectorStrokeColorHex');
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
        if (this.vectorSection && this.vectorSection.parentNode) {
            this.vectorSection.parentNode.removeChild(this.vectorSection);
        }
        this.container = null;
        this.vectorSection = null;
    }
}
