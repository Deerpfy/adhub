/**
 * ColorPicker - Color selection and management
 */

export class ColorPicker {
    constructor(app) {
        this.app = app;

        // Colors
        this.primaryColor = '#ffffff';
        this.secondaryColor = '#000000';

        // HSV values for picker
        this.hue = 0;
        this.saturation = 0;
        this.value = 100;

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

        // Color swatches
        const primarySwatch = document.getElementById('primaryColor');
        const secondarySwatch = document.getElementById('secondaryColor');
        const swapBtn = document.getElementById('swapColorsBtn');

        if (primarySwatch) {
            primarySwatch.addEventListener('click', () => this.updateFromColor(this.primaryColor));
        }
        if (secondarySwatch) {
            secondarySwatch.addEventListener('click', () => {
                // Swap and select secondary
                const temp = this.primaryColor;
                this.primaryColor = this.secondaryColor;
                this.secondaryColor = temp;
                this.updateSwatches();
                this.updateFromColor(this.primaryColor);
            });
        }
        if (swapBtn) {
            swapBtn.addEventListener('click', () => this.swapColors());
        }

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
