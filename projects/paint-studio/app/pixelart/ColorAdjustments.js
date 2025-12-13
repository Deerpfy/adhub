/**
 * ColorAdjustments - Image color manipulation utilities
 * Provides HSB adjustments, posterize, threshold, invert, etc.
 */

export class ColorAdjustments {
    constructor(app) {
        this.app = app;

        // Preview state
        this.previewCanvas = null;
        this.originalImageData = null;
        this.previewActive = false;
    }

    /**
     * Start preview mode
     */
    startPreview(layerIndex = null) {
        const layer = layerIndex !== null
            ? this.app.layers.getLayer(layerIndex)
            : this.app.layers.getActiveLayer();

        if (!layer) return null;

        const ctx = layer.canvas.getContext('2d');
        this.originalImageData = ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
        this.previewActive = true;

        return this.originalImageData;
    }

    /**
     * Apply preview to canvas
     */
    applyPreview(imageData) {
        if (!this.previewActive) return;

        const layer = this.app.layers.getActiveLayer();
        if (!layer) return;

        const ctx = layer.canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        this.app.canvas.render();
    }

    /**
     * Cancel preview and restore original
     */
    cancelPreview() {
        if (!this.previewActive || !this.originalImageData) return;

        const layer = this.app.layers.getActiveLayer();
        if (!layer) return;

        const ctx = layer.canvas.getContext('2d');
        ctx.putImageData(this.originalImageData, 0, 0);
        this.app.canvas.render();

        this.previewActive = false;
        this.originalImageData = null;
    }

    /**
     * Confirm preview changes
     */
    confirmPreview() {
        this.previewActive = false;
        this.originalImageData = null;
    }

    // ==========================================
    // COLOR SPACE CONVERSIONS
    // ==========================================

    /**
     * RGB to HSL
     */
    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    /**
     * HSL to RGB
     */
    hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;

        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    /**
     * RGB to HSV
     */
    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;

        let h, s, v = max;

        s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0;
        } else {
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return { h: h * 360, s: s * 100, v: v * 100 };
    }

    /**
     * HSV to RGB
     */
    hsvToRgb(h, s, v) {
        h /= 360;
        s /= 100;
        v /= 100;

        const i = Math.floor(h * 6);
        const f = h * 6 - i;
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

    // ==========================================
    // ADJUSTMENTS
    // ==========================================

    /**
     * Adjust Hue/Saturation/Brightness
     */
    adjustHSB(imageData, hueShift = 0, saturation = 0, brightness = 0) {
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue; // Skip transparent

            const hsv = this.rgbToHsv(data[i], data[i + 1], data[i + 2]);

            // Adjust hue (shift)
            hsv.h = (hsv.h + hueShift + 360) % 360;

            // Adjust saturation (additive percentage)
            hsv.s = Math.max(0, Math.min(100, hsv.s + saturation));

            // Adjust brightness/value (additive percentage)
            hsv.v = Math.max(0, Math.min(100, hsv.v + brightness));

            const rgb = this.hsvToRgb(hsv.h, hsv.s, hsv.v);

            data[i] = rgb.r;
            data[i + 1] = rgb.g;
            data[i + 2] = rgb.b;
        }

        return imageData;
    }

    /**
     * Adjust Brightness/Contrast
     */
    adjustBrightnessContrast(imageData, brightness = 0, contrast = 0) {
        const data = imageData.data;

        // Brightness: -100 to 100
        // Contrast: -100 to 100
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;

            for (let c = 0; c < 3; c++) {
                let value = data[i + c];

                // Apply brightness
                value += brightness * 2.55;

                // Apply contrast
                value = factor * (value - 128) + 128;

                data[i + c] = Math.max(0, Math.min(255, value));
            }
        }

        return imageData;
    }

    /**
     * Posterize - Reduce number of colors
     */
    posterize(imageData, levels = 4) {
        const data = imageData.data;
        levels = Math.max(2, Math.min(256, levels));

        const step = 255 / (levels - 1);

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;

            for (let c = 0; c < 3; c++) {
                data[i + c] = Math.round(Math.round(data[i + c] / step) * step);
            }
        }

        return imageData;
    }

    /**
     * Threshold - Convert to black and white
     */
    threshold(imageData, level = 128) {
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;

            const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const value = luminance >= level ? 255 : 0;

            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
        }

        return imageData;
    }

    /**
     * Invert colors
     */
    invert(imageData) {
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;

            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
        }

        return imageData;
    }

    /**
     * Desaturate (grayscale)
     */
    desaturate(imageData, method = 'luminosity') {
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;

            let gray;
            switch (method) {
                case 'average':
                    gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    break;
                case 'lightness':
                    gray = (Math.max(data[i], data[i + 1], data[i + 2]) +
                           Math.min(data[i], data[i + 1], data[i + 2])) / 2;
                    break;
                case 'luminosity':
                default:
                    gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    break;
            }

            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }

        return imageData;
    }

    /**
     * Sepia tone
     */
    sepia(imageData, intensity = 100) {
        const data = imageData.data;
        const factor = intensity / 100;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Sepia transformation matrix
            const newR = Math.min(255, (r * 0.393 + g * 0.769 + b * 0.189));
            const newG = Math.min(255, (r * 0.349 + g * 0.686 + b * 0.168));
            const newB = Math.min(255, (r * 0.272 + g * 0.534 + b * 0.131));

            // Blend with original based on intensity
            data[i] = r + (newR - r) * factor;
            data[i + 1] = g + (newG - g) * factor;
            data[i + 2] = b + (newB - b) * factor;
        }

        return imageData;
    }

    /**
     * Color balance adjustment
     */
    colorBalance(imageData, shadows = {r: 0, g: 0, b: 0}, midtones = {r: 0, g: 0, b: 0}, highlights = {r: 0, g: 0, b: 0}) {
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;

            const luminance = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;

            // Calculate weights for shadows, midtones, highlights
            let shadowWeight = luminance < 0.33 ? 1 - (luminance / 0.33) : 0;
            let highlightWeight = luminance > 0.67 ? (luminance - 0.67) / 0.33 : 0;
            let midtoneWeight = 1 - shadowWeight - highlightWeight;

            for (let c = 0; c < 3; c++) {
                const channel = ['r', 'g', 'b'][c];
                const adjustment =
                    shadows[channel] * shadowWeight +
                    midtones[channel] * midtoneWeight +
                    highlights[channel] * highlightWeight;

                data[i + c] = Math.max(0, Math.min(255, data[i + c] + adjustment));
            }
        }

        return imageData;
    }

    /**
     * Replace color
     */
    replaceColor(imageData, fromColor, toColor, tolerance = 0) {
        const data = imageData.data;

        const fromR = parseInt(fromColor.substr(1, 2), 16);
        const fromG = parseInt(fromColor.substr(3, 2), 16);
        const fromB = parseInt(fromColor.substr(5, 2), 16);

        const toR = parseInt(toColor.substr(1, 2), 16);
        const toG = parseInt(toColor.substr(3, 2), 16);
        const toB = parseInt(toColor.substr(5, 2), 16);

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;

            const dr = Math.abs(data[i] - fromR);
            const dg = Math.abs(data[i + 1] - fromG);
            const db = Math.abs(data[i + 2] - fromB);

            if (dr <= tolerance && dg <= tolerance && db <= tolerance) {
                data[i] = toR;
                data[i + 1] = toG;
                data[i + 2] = toB;
            }
        }

        return imageData;
    }

    /**
     * Quantize colors to palette
     */
    quantize(imageData, palette) {
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;

            // Find closest palette color
            let minDist = Infinity;
            let closest = { r: 0, g: 0, b: 0 };

            for (const hex of palette) {
                const pr = parseInt(hex.substr(1, 2), 16);
                const pg = parseInt(hex.substr(3, 2), 16);
                const pb = parseInt(hex.substr(5, 2), 16);

                const dist = (data[i] - pr) ** 2 + (data[i + 1] - pg) ** 2 + (data[i + 2] - pb) ** 2;
                if (dist < minDist) {
                    minDist = dist;
                    closest = { r: pr, g: pg, b: pb };
                }
            }

            data[i] = closest.r;
            data[i + 1] = closest.g;
            data[i + 2] = closest.b;
        }

        return imageData;
    }

    /**
     * Auto levels - Stretch histogram
     */
    autoLevels(imageData) {
        const data = imageData.data;

        // Find min/max for each channel
        const min = [255, 255, 255];
        const max = [0, 0, 0];

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;

            for (let c = 0; c < 3; c++) {
                min[c] = Math.min(min[c], data[i + c]);
                max[c] = Math.max(max[c], data[i + c]);
            }
        }

        // Stretch each channel
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;

            for (let c = 0; c < 3; c++) {
                const range = max[c] - min[c];
                if (range > 0) {
                    data[i + c] = ((data[i + c] - min[c]) / range) * 255;
                }
            }
        }

        return imageData;
    }

    /**
     * Auto contrast
     */
    autoContrast(imageData) {
        const data = imageData.data;

        // Find min/max luminance
        let minLum = 255;
        let maxLum = 0;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;

            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            minLum = Math.min(minLum, lum);
            maxLum = Math.max(maxLum, lum);
        }

        const range = maxLum - minLum;
        if (range === 0) return imageData;

        // Stretch
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;

            for (let c = 0; c < 3; c++) {
                data[i + c] = ((data[i + c] - minLum) / range) * 255;
            }
        }

        return imageData;
    }

    /**
     * Colorize - Apply single hue
     */
    colorize(imageData, hue = 0, saturation = 50) {
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;

            // Get luminance
            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

            // Convert to HSL with fixed hue and saturation
            const rgb = this.hslToRgb(hue, saturation, (lum / 255) * 100);

            data[i] = rgb.r;
            data[i + 1] = rgb.g;
            data[i + 2] = rgb.b;
        }

        return imageData;
    }

    /**
     * Gradient map
     */
    gradientMap(imageData, colors) {
        if (colors.length < 2) return imageData;

        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;

            // Get luminance as position in gradient
            const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;

            // Find gradient segment
            const segmentCount = colors.length - 1;
            const segment = Math.min(Math.floor(lum * segmentCount), segmentCount - 1);
            const t = (lum * segmentCount) - segment;

            // Interpolate between colors
            const c1 = colors[segment];
            const c2 = colors[segment + 1];

            const r1 = parseInt(c1.substr(1, 2), 16);
            const g1 = parseInt(c1.substr(3, 2), 16);
            const b1 = parseInt(c1.substr(5, 2), 16);

            const r2 = parseInt(c2.substr(1, 2), 16);
            const g2 = parseInt(c2.substr(3, 2), 16);
            const b2 = parseInt(c2.substr(5, 2), 16);

            data[i] = r1 + (r2 - r1) * t;
            data[i + 1] = g1 + (g2 - g1) * t;
            data[i + 2] = b1 + (b2 - b1) * t;
        }

        return imageData;
    }

    // ==========================================
    // CANVAS OPERATIONS
    // ==========================================

    /**
     * Flip canvas horizontally
     */
    flipHorizontal(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const temp = new Uint8ClampedArray(4);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width / 2; x++) {
                const leftIdx = (y * width + x) * 4;
                const rightIdx = (y * width + (width - 1 - x)) * 4;

                // Swap pixels
                for (let i = 0; i < 4; i++) {
                    temp[i] = data[leftIdx + i];
                    data[leftIdx + i] = data[rightIdx + i];
                    data[rightIdx + i] = temp[i];
                }
            }
        }

        return imageData;
    }

    /**
     * Flip canvas vertically
     */
    flipVertical(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const rowBytes = width * 4;
        const tempRow = new Uint8ClampedArray(rowBytes);

        for (let y = 0; y < height / 2; y++) {
            const topOffset = y * rowBytes;
            const bottomOffset = (height - 1 - y) * rowBytes;

            // Swap rows
            tempRow.set(data.subarray(topOffset, topOffset + rowBytes));
            data.copyWithin(topOffset, bottomOffset, bottomOffset + rowBytes);
            data.set(tempRow, bottomOffset);
        }

        return imageData;
    }

    /**
     * Rotate 90 degrees clockwise
     */
    rotate90CW(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        const newData = new Uint8ClampedArray(data.length);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcIdx = (y * width + x) * 4;
                const dstX = height - 1 - y;
                const dstY = x;
                const dstIdx = (dstY * height + dstX) * 4;

                newData[dstIdx] = data[srcIdx];
                newData[dstIdx + 1] = data[srcIdx + 1];
                newData[dstIdx + 2] = data[srcIdx + 2];
                newData[dstIdx + 3] = data[srcIdx + 3];
            }
        }

        return new ImageData(newData, height, width);
    }

    /**
     * Rotate 90 degrees counter-clockwise
     */
    rotate90CCW(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        const newData = new Uint8ClampedArray(data.length);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcIdx = (y * width + x) * 4;
                const dstX = y;
                const dstY = width - 1 - x;
                const dstIdx = (dstY * height + dstX) * 4;

                newData[dstIdx] = data[srcIdx];
                newData[dstIdx + 1] = data[srcIdx + 1];
                newData[dstIdx + 2] = data[srcIdx + 2];
                newData[dstIdx + 3] = data[srcIdx + 3];
            }
        }

        return new ImageData(newData, height, width);
    }

    /**
     * Rotate 180 degrees
     */
    rotate180(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const temp = new Uint8ClampedArray(4);
        const totalPixels = width * height;

        for (let i = 0; i < totalPixels / 2; i++) {
            const idx1 = i * 4;
            const idx2 = (totalPixels - 1 - i) * 4;

            // Swap pixels
            for (let c = 0; c < 4; c++) {
                temp[c] = data[idx1 + c];
                data[idx1 + c] = data[idx2 + c];
                data[idx2 + c] = temp[c];
            }
        }

        return imageData;
    }

    /**
     * Generate automatic outline
     */
    generateOutline(imageData, color = '#000000', thickness = 1, inside = false) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        const outlineR = parseInt(color.substr(1, 2), 16);
        const outlineG = parseInt(color.substr(3, 2), 16);
        const outlineB = parseInt(color.substr(5, 2), 16);

        const newData = new Uint8ClampedArray(data);

        // Find edge pixels
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                const isOpaque = data[idx + 3] > 128;
                const isEdge = this.isEdgePixel(data, width, height, x, y, thickness);

                if (inside) {
                    // Inside outline: color opaque pixels that are near transparent
                    if (isOpaque && isEdge) {
                        newData[idx] = outlineR;
                        newData[idx + 1] = outlineG;
                        newData[idx + 2] = outlineB;
                    }
                } else {
                    // Outside outline: color transparent pixels near opaque
                    if (!isOpaque && isEdge) {
                        newData[idx] = outlineR;
                        newData[idx + 1] = outlineG;
                        newData[idx + 2] = outlineB;
                        newData[idx + 3] = 255;
                    }
                }
            }
        }

        return new ImageData(newData, width, height);
    }

    /**
     * Check if pixel is on edge
     */
    isEdgePixel(data, width, height, x, y, thickness) {
        const idx = (y * width + x) * 4;
        const isOpaque = data[idx + 3] > 128;

        for (let dy = -thickness; dy <= thickness; dy++) {
            for (let dx = -thickness; dx <= thickness; dx++) {
                if (dx === 0 && dy === 0) continue;

                const nx = x + dx;
                const ny = y + dy;

                if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
                    if (isOpaque) return true;
                    continue;
                }

                const nIdx = (ny * width + nx) * 4;
                const neighborOpaque = data[nIdx + 3] > 128;

                if (isOpaque !== neighborOpaque) return true;
            }
        }

        return false;
    }

    /**
     * Drop shadow effect
     */
    dropShadow(imageData, offsetX = 2, offsetY = 2, color = '#000000', opacity = 0.5) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        const shadowR = parseInt(color.substr(1, 2), 16);
        const shadowG = parseInt(color.substr(3, 2), 16);
        const shadowB = parseInt(color.substr(5, 2), 16);

        // Create new image with shadow
        const newWidth = width + Math.abs(offsetX);
        const newHeight = height + Math.abs(offsetY);
        const newData = new Uint8ClampedArray(newWidth * newHeight * 4);

        const srcOffsetX = offsetX < 0 ? -offsetX : 0;
        const srcOffsetY = offsetY < 0 ? -offsetY : 0;
        const shadowOffsetX = offsetX > 0 ? offsetX : 0;
        const shadowOffsetY = offsetY > 0 ? offsetY : 0;

        // Draw shadow first
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcIdx = (y * width + x) * 4;
                if (data[srcIdx + 3] < 128) continue;

                const nx = x + srcOffsetX + (offsetX > 0 ? offsetX : 0);
                const ny = y + srcOffsetY + (offsetY > 0 ? offsetY : 0);
                const dstIdx = (ny * newWidth + nx) * 4;

                newData[dstIdx] = shadowR;
                newData[dstIdx + 1] = shadowG;
                newData[dstIdx + 2] = shadowB;
                newData[dstIdx + 3] = data[srcIdx + 3] * opacity;
            }
        }

        // Draw original image on top
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcIdx = (y * width + x) * 4;
                const nx = x + srcOffsetX;
                const ny = y + srcOffsetY;
                const dstIdx = (ny * newWidth + nx) * 4;

                if (data[srcIdx + 3] > 0) {
                    newData[dstIdx] = data[srcIdx];
                    newData[dstIdx + 1] = data[srcIdx + 1];
                    newData[dstIdx + 2] = data[srcIdx + 2];
                    newData[dstIdx + 3] = data[srcIdx + 3];
                }
            }
        }

        return new ImageData(newData, newWidth, newHeight);
    }
}
