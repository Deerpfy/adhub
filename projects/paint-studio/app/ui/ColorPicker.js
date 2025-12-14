/**
 * ColorPicker - Color selection and management
 */

export class ColorPicker {
    constructor(app) {
        this.app = app;

        // Colors - default to black primary (more common for drawing)
        this.primaryColor = '#000000';
        this.secondaryColor = '#ffffff';

        // HSV values for picker (matches black default)
        this.hue = 0;
        this.saturation = 0;
        this.value = 0;

        // DOM elements
        this.gradient = null;
        this.gradientPicker = null;
        this.hueSlider = null;
        this.hexInput = null;
        this.rInput = null;
        this.gInput = null;
        this.bInput = null;

        // Dragging state
        this.isDraggingGradient = false;

        // Popup state
        this.popupColorPicker = null;
        this.isEditingSecondary = false;
        this.popupDragging = false;
    }

    /**
     * Initialize color picker
     */
    init() {
        // Get DOM elements
        this.gradient = document.getElementById('colorGradient');
        this.gradientPicker = document.getElementById('colorGradientPicker');
        this.hueSlider = document.getElementById('hueSlider');
        this.hexInput = document.getElementById('colorHex');
        this.rInput = document.getElementById('colorR');
        this.gInput = document.getElementById('colorG');
        this.bInput = document.getElementById('colorB');

        // Setup event listeners
        this.setupEventListeners();

        // Initialize display
        this.updateFromColor(this.primaryColor);
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Gradient picker
        if (this.gradient) {
            this.gradient.addEventListener('mousedown', this.handleGradientMouseDown.bind(this));
            document.addEventListener('mousemove', this.handleGradientMouseMove.bind(this));
            document.addEventListener('mouseup', this.handleGradientMouseUp.bind(this));

            // Touch support
            this.gradient.addEventListener('touchstart', this.handleGradientTouchStart.bind(this), { passive: false });
            document.addEventListener('touchmove', this.handleGradientTouchMove.bind(this), { passive: false });
            document.addEventListener('touchend', this.handleGradientTouchEnd.bind(this));
        }

        // Hue slider
        if (this.hueSlider) {
            this.hueSlider.addEventListener('input', this.handleHueChange.bind(this));
        }

        // Text inputs
        if (this.hexInput) {
            this.hexInput.addEventListener('change', this.handleHexInput.bind(this));
        }
        if (this.rInput) {
            this.rInput.addEventListener('change', this.handleRgbInput.bind(this));
        }
        if (this.gInput) {
            this.gInput.addEventListener('change', this.handleRgbInput.bind(this));
        }
        if (this.bInput) {
            this.bInput.addEventListener('change', this.handleRgbInput.bind(this));
        }

        // Color swatches - show popup picker
        const primarySwatch = document.getElementById('primaryColor');
        const secondarySwatch = document.getElementById('secondaryColor');
        const swapBtn = document.getElementById('swapColorsBtn');

        if (primarySwatch) {
            primarySwatch.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showColorPopup(false, primarySwatch);
            });
        }
        if (secondarySwatch) {
            secondarySwatch.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showColorPopup(true, secondarySwatch);
            });
        }
        if (swapBtn) {
            swapBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.swapColors();
            });
        }

        // Close popup on outside click
        document.addEventListener('click', (e) => {
            if (this.popupColorPicker && !this.popupColorPicker.contains(e.target)) {
                this.hideColorPopup();
            }
        });

        // Color presets
        document.querySelectorAll('.preset-color').forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                if (color) {
                    this.setPrimaryColor(color);
                }
            });
        });
    }

    /**
     * Handle gradient mouse down
     */
    handleGradientMouseDown(e) {
        this.isDraggingGradient = true;
        this.updateGradientPosition(e.clientX, e.clientY);
    }

    /**
     * Handle gradient mouse move
     */
    handleGradientMouseMove(e) {
        if (this.isDraggingGradient) {
            this.updateGradientPosition(e.clientX, e.clientY);
        }
    }

    /**
     * Handle gradient mouse up
     */
    handleGradientMouseUp() {
        this.isDraggingGradient = false;
    }

    /**
     * Handle gradient touch start
     */
    handleGradientTouchStart(e) {
        e.preventDefault();
        this.isDraggingGradient = true;
        const touch = e.touches[0];
        this.updateGradientPosition(touch.clientX, touch.clientY);
    }

    /**
     * Handle gradient touch move
     */
    handleGradientTouchMove(e) {
        if (this.isDraggingGradient) {
            e.preventDefault();
            const touch = e.touches[0];
            this.updateGradientPosition(touch.clientX, touch.clientY);
        }
    }

    /**
     * Handle gradient touch end
     */
    handleGradientTouchEnd() {
        this.isDraggingGradient = false;
    }

    /**
     * Update gradient position and color
     */
    updateGradientPosition(clientX, clientY) {
        const rect = this.gradient.getBoundingClientRect();
        let x = (clientX - rect.left) / rect.width;
        let y = (clientY - rect.top) / rect.height;

        // Clamp values
        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));

        // Update saturation and value
        this.saturation = x * 100;
        this.value = (1 - y) * 100;

        // Update picker position
        if (this.gradientPicker) {
            this.gradientPicker.style.left = `${x * 100}%`;
            this.gradientPicker.style.top = `${y * 100}%`;
        }

        // Update color
        this.updateColorFromHsv();
    }

    /**
     * Handle hue slider change
     */
    handleHueChange(e) {
        this.hue = parseInt(e.target.value);
        this.updateGradientBackground();
        this.updateColorFromHsv();
    }

    /**
     * Handle hex input
     */
    handleHexInput(e) {
        let hex = e.target.value;
        if (!hex.startsWith('#')) {
            hex = '#' + hex;
        }
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            this.setPrimaryColor(hex);
        }
    }

    /**
     * Handle RGB input
     */
    handleRgbInput() {
        const r = parseInt(this.rInput.value) || 0;
        const g = parseInt(this.gInput.value) || 0;
        const b = parseInt(this.bInput.value) || 0;

        const hex = this.rgbToHex(
            Math.max(0, Math.min(255, r)),
            Math.max(0, Math.min(255, g)),
            Math.max(0, Math.min(255, b))
        );

        this.setPrimaryColor(hex);
    }

    /**
     * Update gradient background based on hue
     */
    updateGradientBackground() {
        if (this.gradient) {
            const hueColor = `hsl(${this.hue}, 100%, 50%)`;
            this.gradient.style.background = `
                linear-gradient(to bottom, transparent, black),
                linear-gradient(to right, white, ${hueColor})
            `;
        }
    }

    /**
     * Update color from current HSV values
     */
    updateColorFromHsv() {
        const rgb = this.hsvToRgb(this.hue, this.saturation, this.value);
        const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);

        this.primaryColor = hex;
        this.updateInputs(hex, rgb);
        this.updateSwatches();
    }

    /**
     * Update from hex color
     */
    updateFromColor(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return;

        const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);

        this.hue = hsv.h;
        this.saturation = hsv.s;
        this.value = hsv.v;

        // Update hue slider
        if (this.hueSlider) {
            this.hueSlider.value = this.hue;
        }

        // Update gradient
        this.updateGradientBackground();

        // Update picker position
        if (this.gradientPicker) {
            this.gradientPicker.style.left = `${this.saturation}%`;
            this.gradientPicker.style.top = `${100 - this.value}%`;
        }

        // Update inputs
        this.updateInputs(hex, rgb);
    }

    /**
     * Update input values
     */
    updateInputs(hex, rgb) {
        if (this.hexInput) this.hexInput.value = hex;
        if (this.rInput) this.rInput.value = rgb.r;
        if (this.gInput) this.gInput.value = rgb.g;
        if (this.bInput) this.bInput.value = rgb.b;
    }

    /**
     * Update color swatches
     */
    updateSwatches() {
        const primarySwatch = document.getElementById('primaryColor');
        const secondarySwatch = document.getElementById('secondaryColor');

        if (primarySwatch) {
            primarySwatch.style.background = this.primaryColor;
        }
        if (secondarySwatch) {
            secondarySwatch.style.background = this.secondaryColor;
        }
    }

    /**
     * Set primary color
     */
    setPrimaryColor(hex) {
        this.primaryColor = hex;
        this.updateFromColor(hex);
        this.updateSwatches();
    }

    /**
     * Get primary color
     */
    getPrimaryColor() {
        return this.primaryColor;
    }

    /**
     * Get secondary color
     */
    getSecondaryColor() {
        return this.secondaryColor;
    }

    /**
     * Swap primary and secondary colors
     */
    swapColors() {
        const temp = this.primaryColor;
        this.primaryColor = this.secondaryColor;
        this.secondaryColor = temp;

        this.updateFromColor(this.primaryColor);
        this.updateSwatches();
    }

    /**
     * Show color popup picker
     */
    showColorPopup(isSecondary, anchorElement) {
        // Remove existing popup
        this.hideColorPopup();

        this.isEditingSecondary = isSecondary;
        const currentColor = isSecondary ? this.secondaryColor : this.primaryColor;

        // Create popup element
        this.popupColorPicker = document.createElement('div');
        this.popupColorPicker.className = 'color-popup-picker';
        this.popupColorPicker.innerHTML = `
            <div class="color-popup-header">
                <span class="color-popup-title">${isSecondary ? 'Sekundární barva' : 'Primární barva'}</span>
                <button class="color-popup-close" title="Zavřít">×</button>
            </div>
            <div class="color-popup-body">
                <div class="color-popup-gradient" id="popupGradient">
                    <div class="color-popup-gradient-picker" id="popupGradientPicker"></div>
                </div>
                <div class="color-popup-hue-slider">
                    <input type="range" id="popupHueSlider" min="0" max="360" value="0" class="hue-slider">
                </div>
                <div class="color-popup-inputs">
                    <div class="color-popup-input-group">
                        <label>Hex</label>
                        <input type="text" id="popupColorHex" value="${currentColor}" maxlength="7">
                    </div>
                </div>
                <div class="color-popup-presets">
                    <div class="popup-preset-color" style="background: #ffffff;" data-color="#ffffff"></div>
                    <div class="popup-preset-color" style="background: #000000;" data-color="#000000"></div>
                    <div class="popup-preset-color" style="background: #ef4444;" data-color="#ef4444"></div>
                    <div class="popup-preset-color" style="background: #f97316;" data-color="#f97316"></div>
                    <div class="popup-preset-color" style="background: #eab308;" data-color="#eab308"></div>
                    <div class="popup-preset-color" style="background: #22c55e;" data-color="#22c55e"></div>
                    <div class="popup-preset-color" style="background: #06b6d4;" data-color="#06b6d4"></div>
                    <div class="popup-preset-color" style="background: #3b82f6;" data-color="#3b82f6"></div>
                    <div class="popup-preset-color" style="background: #8b5cf6;" data-color="#8b5cf6"></div>
                    <div class="popup-preset-color" style="background: #ec4899;" data-color="#ec4899"></div>
                </div>
            </div>
        `;

        document.body.appendChild(this.popupColorPicker);

        // Position popup near anchor
        const rect = anchorElement.getBoundingClientRect();
        this.popupColorPicker.style.left = `${rect.right + 10}px`;
        this.popupColorPicker.style.top = `${rect.top}px`;

        // Make sure popup is visible
        const popupRect = this.popupColorPicker.getBoundingClientRect();
        if (popupRect.bottom > window.innerHeight) {
            this.popupColorPicker.style.top = `${window.innerHeight - popupRect.height - 10}px`;
        }

        // Setup popup event listeners
        this.setupPopupEventListeners(currentColor);
    }

    /**
     * Setup popup event listeners
     */
    setupPopupEventListeners(initialColor) {
        const popup = this.popupColorPicker;
        if (!popup) return;

        // Close button
        popup.querySelector('.color-popup-close')?.addEventListener('click', () => {
            this.hideColorPopup();
        });

        // Gradient picker
        const gradient = popup.querySelector('#popupGradient');
        const gradientPicker = popup.querySelector('#popupGradientPicker');
        const hueSlider = popup.querySelector('#popupHueSlider');
        const hexInput = popup.querySelector('#popupColorHex');

        // Initialize from color
        const rgb = this.hexToRgb(initialColor);
        if (rgb) {
            const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
            this.popupHue = hsv.h;
            this.popupSaturation = hsv.s;
            this.popupValue = hsv.v;

            if (hueSlider) hueSlider.value = hsv.h;
            this.updatePopupGradient(gradient, hsv.h);
            if (gradientPicker) {
                gradientPicker.style.left = `${hsv.s}%`;
                gradientPicker.style.top = `${100 - hsv.v}%`;
            }
        }

        // Gradient mouse events
        if (gradient) {
            const handleGradientMove = (clientX, clientY) => {
                const rect = gradient.getBoundingClientRect();
                let x = (clientX - rect.left) / rect.width;
                let y = (clientY - rect.top) / rect.height;
                x = Math.max(0, Math.min(1, x));
                y = Math.max(0, Math.min(1, y));

                this.popupSaturation = x * 100;
                this.popupValue = (1 - y) * 100;

                if (gradientPicker) {
                    gradientPicker.style.left = `${x * 100}%`;
                    gradientPicker.style.top = `${y * 100}%`;
                }

                this.updatePopupColor(hexInput);
            };

            gradient.addEventListener('mousedown', (e) => {
                this.popupDragging = true;
                handleGradientMove(e.clientX, e.clientY);
            });

            document.addEventListener('mousemove', (e) => {
                if (this.popupDragging) {
                    handleGradientMove(e.clientX, e.clientY);
                }
            });

            document.addEventListener('mouseup', () => {
                this.popupDragging = false;
            });

            // Touch support
            gradient.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.popupDragging = true;
                handleGradientMove(e.touches[0].clientX, e.touches[0].clientY);
            }, { passive: false });

            document.addEventListener('touchmove', (e) => {
                if (this.popupDragging) {
                    e.preventDefault();
                    handleGradientMove(e.touches[0].clientX, e.touches[0].clientY);
                }
            }, { passive: false });

            document.addEventListener('touchend', () => {
                this.popupDragging = false;
            });
        }

        // Hue slider
        if (hueSlider) {
            hueSlider.addEventListener('input', (e) => {
                this.popupHue = parseInt(e.target.value);
                this.updatePopupGradient(gradient, this.popupHue);
                this.updatePopupColor(hexInput);
            });
        }

        // Hex input
        if (hexInput) {
            hexInput.addEventListener('change', (e) => {
                let hex = e.target.value;
                if (!hex.startsWith('#')) hex = '#' + hex;
                if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                    this.setPopupColor(hex);
                    const rgb = this.hexToRgb(hex);
                    if (rgb) {
                        const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
                        this.popupHue = hsv.h;
                        this.popupSaturation = hsv.s;
                        this.popupValue = hsv.v;

                        if (hueSlider) hueSlider.value = hsv.h;
                        this.updatePopupGradient(gradient, hsv.h);
                        if (gradientPicker) {
                            gradientPicker.style.left = `${hsv.s}%`;
                            gradientPicker.style.top = `${100 - hsv.v}%`;
                        }
                    }
                }
            });
        }

        // Preset colors
        popup.querySelectorAll('.popup-preset-color').forEach(preset => {
            preset.addEventListener('click', (e) => {
                e.stopPropagation();
                const color = preset.dataset.color;
                if (color) {
                    this.setPopupColor(color);
                    const rgb = this.hexToRgb(color);
                    if (rgb) {
                        const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
                        this.popupHue = hsv.h;
                        this.popupSaturation = hsv.s;
                        this.popupValue = hsv.v;

                        if (hueSlider) hueSlider.value = hsv.h;
                        this.updatePopupGradient(gradient, hsv.h);
                        if (gradientPicker) {
                            gradientPicker.style.left = `${hsv.s}%`;
                            gradientPicker.style.top = `${100 - hsv.v}%`;
                        }
                        if (hexInput) hexInput.value = color;
                    }
                }
            });
        });

        // Prevent popup from closing when clicking inside
        popup.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * Update popup gradient background
     */
    updatePopupGradient(gradient, hue) {
        if (gradient) {
            const hueColor = `hsl(${hue}, 100%, 50%)`;
            gradient.style.background = `
                linear-gradient(to bottom, transparent, black),
                linear-gradient(to right, white, ${hueColor})
            `;
        }
    }

    /**
     * Update popup color
     */
    updatePopupColor(hexInput) {
        const rgb = this.hsvToRgb(this.popupHue, this.popupSaturation, this.popupValue);
        const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);

        if (hexInput) hexInput.value = hex;
        this.setPopupColor(hex);
    }

    /**
     * Set color from popup
     */
    setPopupColor(hex) {
        if (this.isEditingSecondary) {
            this.secondaryColor = hex;
        } else {
            this.primaryColor = hex;
            // Also update main picker
            this.updateFromColor(hex);
        }
        this.updateSwatches();
    }

    /**
     * Hide color popup
     */
    hideColorPopup() {
        if (this.popupColorPicker) {
            this.popupColorPicker.remove();
            this.popupColorPicker = null;
        }
        this.popupDragging = false;
    }

    // Color conversion utilities

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;

        let h = 0;
        const s = max === 0 ? 0 : d / max * 100;
        const v = max * 100;

        if (d !== 0) {
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
                case g: h = ((b - r) / d + 2) * 60; break;
                case b: h = ((r - g) / d + 4) * 60; break;
            }
        }

        return { h, s, v };
    }

    hsvToRgb(h, s, v) {
        s /= 100;
        v /= 100;

        const i = Math.floor(h / 60);
        const f = h / 60 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        let r, g, b;
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
}
