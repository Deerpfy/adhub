/**
 * TextTool - Text layer creation and editing tool
 * Supports Google Fonts, custom styling, and rasterization
 */

export class TextTool {
    constructor(app) {
        this.app = app;
        this.name = 'text';
        this.displayName = 'Text';

        // Text settings
        this.fontSize = 48;
        this.fontFamily = 'Inter';
        this.fontWeight = 'normal';
        this.fontStyle = 'normal';
        this.textAlign = 'left';
        this.lineHeight = 1.2;

        // Currently editing text layer
        this.editingLayer = null;
        this.textInput = null;
        this.textOverlay = null;
    }

    activate() {
        this.app.canvas.container.style.cursor = 'text';
    }

    deactivate() {
        this.finishEditing();
        this.app.canvas.container.style.cursor = 'default';
    }

    /**
     * Handle click to create or edit text
     */
    onStart(x, y, pressure) {
        // Check if clicking on existing text layer
        const textLayer = this.findTextLayerAt(x, y);

        if (textLayer) {
            // Edit existing text layer
            this.startEditing(textLayer);
        } else {
            // Create new text layer
            this.createTextLayer(x, y);
        }
    }

    onMove(x, y, pressure, lastX, lastY) {
        // No action during move for text tool
    }

    onEnd(x, y) {
        // No action on end for text tool
    }

    /**
     * Find text layer at coordinates
     */
    findTextLayerAt(x, y) {
        const layers = this.app.layers.getLayers();

        for (const layer of layers) {
            if (layer.type === 'text' && layer.visible && !layer.locked) {
                const bounds = layer.textBounds;
                if (bounds &&
                    x >= bounds.x && x <= bounds.x + bounds.width &&
                    y >= bounds.y && y <= bounds.y + bounds.height) {
                    return layer;
                }
            }
        }

        return null;
    }

    /**
     * Create new text layer
     */
    createTextLayer(x, y) {
        const layer = this.app.layers.addTextLayer('Text', x, y, {
            text: '',
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            fontWeight: this.fontWeight,
            fontStyle: this.fontStyle,
            textAlign: this.textAlign,
            lineHeight: this.lineHeight,
            color: this.app.color.getPrimaryColor()
        });

        if (layer) {
            this.app.layers.setActiveLayer(layer.id);
            this.startEditing(layer);
        }
    }

    /**
     * Start editing a text layer
     */
    startEditing(layer) {
        this.finishEditing(); // Close any existing editor

        this.editingLayer = layer;

        // Create text input overlay
        this.createTextEditor(layer);
    }

    /**
     * Create text editor overlay
     */
    createTextEditor(layer) {
        const canvas = this.app.canvas;
        const containerRect = canvas.container.getBoundingClientRect();

        // Calculate screen position
        const screenX = layer.textBounds.x * canvas.zoom + canvas.panX + containerRect.left;
        const screenY = layer.textBounds.y * canvas.zoom + canvas.panY + containerRect.top;

        // Create overlay container
        this.textOverlay = document.createElement('div');
        this.textOverlay.className = 'text-editor-overlay';
        this.textOverlay.style.cssText = `
            position: fixed;
            left: ${screenX}px;
            top: ${screenY}px;
            z-index: 1000;
            min-width: 200px;
        `;

        // Create textarea
        this.textInput = document.createElement('textarea');
        this.textInput.className = 'text-editor-input';
        this.textInput.value = layer.textContent || '';
        this.textInput.placeholder = 'Zadejte text...';
        this.textInput.style.cssText = `
            font-family: '${layer.textStyle.fontFamily}', sans-serif;
            font-size: ${layer.textStyle.fontSize * canvas.zoom}px;
            font-weight: ${layer.textStyle.fontWeight};
            font-style: ${layer.textStyle.fontStyle};
            color: ${layer.textStyle.color};
            text-align: ${layer.textStyle.textAlign};
            line-height: ${layer.textStyle.lineHeight};
            background: transparent;
            border: 2px dashed var(--primary-color);
            padding: 8px;
            outline: none;
            resize: both;
            min-width: 100px;
            min-height: 50px;
            overflow: hidden;
        `;

        this.textOverlay.appendChild(this.textInput);

        // Create toolbar
        const toolbar = this.createTextToolbar(layer);
        this.textOverlay.appendChild(toolbar);

        document.body.appendChild(this.textOverlay);

        // Focus and select all
        setTimeout(() => {
            this.textInput.focus();
            this.textInput.select();
        }, 10);

        // Handle input changes
        this.textInput.addEventListener('input', () => {
            this.updateTextContent();
        });

        // Handle blur - finish editing
        this.textInput.addEventListener('blur', (e) => {
            // Don't close if clicking on toolbar
            if (e.relatedTarget && this.textOverlay.contains(e.relatedTarget)) {
                return;
            }
            setTimeout(() => this.finishEditing(), 100);
        });

        // Handle Escape key
        this.textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.finishEditing();
            }
        });
    }

    /**
     * Create text formatting toolbar
     */
    createTextToolbar(layer) {
        const toolbar = document.createElement('div');
        toolbar.className = 'text-editor-toolbar';
        toolbar.style.cssText = `
            display: flex;
            gap: 8px;
            padding: 8px;
            background: rgba(30, 30, 40, 0.95);
            border-radius: 8px;
            margin-top: 8px;
            flex-wrap: wrap;
            align-items: center;
        `;

        // Font family select
        const fontSelect = document.createElement('select');
        fontSelect.className = 'text-toolbar-select';
        fontSelect.innerHTML = this.getFontOptions();
        fontSelect.value = layer.textStyle.fontFamily;
        fontSelect.addEventListener('change', (e) => {
            layer.textStyle.fontFamily = e.target.value;
            this.textInput.style.fontFamily = `'${e.target.value}', sans-serif`;
            this.updateTextContent();
        });
        toolbar.appendChild(fontSelect);

        // Font size input
        const sizeInput = document.createElement('input');
        sizeInput.type = 'number';
        sizeInput.className = 'text-toolbar-input';
        sizeInput.value = layer.textStyle.fontSize;
        sizeInput.min = 8;
        sizeInput.max = 500;
        sizeInput.style.width = '60px';
        sizeInput.addEventListener('change', (e) => {
            const size = parseInt(e.target.value) || 48;
            layer.textStyle.fontSize = size;
            this.textInput.style.fontSize = `${size * this.app.canvas.zoom}px`;
            this.updateTextContent();
        });
        toolbar.appendChild(sizeInput);

        // Bold button
        const boldBtn = document.createElement('button');
        boldBtn.className = 'text-toolbar-btn' + (layer.textStyle.fontWeight === 'bold' ? ' active' : '');
        boldBtn.innerHTML = '<b>B</b>';
        boldBtn.title = 'Tučné';
        boldBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isBold = layer.textStyle.fontWeight === 'bold';
            layer.textStyle.fontWeight = isBold ? 'normal' : 'bold';
            this.textInput.style.fontWeight = layer.textStyle.fontWeight;
            boldBtn.classList.toggle('active', !isBold);
            this.updateTextContent();
        });
        toolbar.appendChild(boldBtn);

        // Italic button
        const italicBtn = document.createElement('button');
        italicBtn.className = 'text-toolbar-btn' + (layer.textStyle.fontStyle === 'italic' ? ' active' : '');
        italicBtn.innerHTML = '<i>I</i>';
        italicBtn.title = 'Kurzíva';
        italicBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isItalic = layer.textStyle.fontStyle === 'italic';
            layer.textStyle.fontStyle = isItalic ? 'normal' : 'italic';
            this.textInput.style.fontStyle = layer.textStyle.fontStyle;
            italicBtn.classList.toggle('active', !isItalic);
            this.updateTextContent();
        });
        toolbar.appendChild(italicBtn);

        // Rasterize button
        const rasterizeBtn = document.createElement('button');
        rasterizeBtn.className = 'text-toolbar-btn rasterize-btn';
        rasterizeBtn.innerHTML = '⬜ Rastrovat';
        rasterizeBtn.title = 'Převést text na rastrovou vrstvu';
        rasterizeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.rasterizeTextLayer(layer);
        });
        toolbar.appendChild(rasterizeBtn);

        return toolbar;
    }

    /**
     * Get font options HTML
     */
    getFontOptions() {
        const fonts = this.app.googleFonts?.getLoadedFonts() || [];
        const systemFonts = [
            'Inter', 'Arial', 'Helvetica', 'Times New Roman', 'Georgia',
            'Courier New', 'Verdana', 'Trebuchet MS', 'Impact'
        ];

        let options = '<optgroup label="Systémové fonty">';
        systemFonts.forEach(font => {
            options += `<option value="${font}" style="font-family: '${font}'">${font}</option>`;
        });
        options += '</optgroup>';

        if (fonts.length > 0) {
            options += '<optgroup label="Google Fonts">';
            fonts.forEach(font => {
                options += `<option value="${font}" style="font-family: '${font}'">${font}</option>`;
            });
            options += '</optgroup>';
        }

        return options;
    }

    /**
     * Update text content on the layer
     */
    updateTextContent() {
        if (!this.editingLayer || !this.textInput) return;

        this.editingLayer.textContent = this.textInput.value;
        this.renderTextLayer(this.editingLayer);
        this.app.canvas.render();
    }

    /**
     * Render text layer to its canvas
     */
    renderTextLayer(layer) {
        if (layer.type !== 'text') return;

        const canvas = layer.canvas;
        const ctx = canvas.getContext('2d');

        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!layer.textContent) return;

        const style = layer.textStyle;

        // Set text properties
        ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px '${style.fontFamily}', sans-serif`;
        ctx.fillStyle = style.color;
        ctx.textAlign = style.textAlign;
        ctx.textBaseline = 'top';

        // Calculate text position
        let textX = layer.textBounds.x;
        if (style.textAlign === 'center') {
            textX += layer.textBounds.width / 2;
        } else if (style.textAlign === 'right') {
            textX += layer.textBounds.width;
        }

        // Draw text lines
        const lines = layer.textContent.split('\n');
        const lineHeightPx = style.fontSize * style.lineHeight;

        lines.forEach((line, index) => {
            const y = layer.textBounds.y + index * lineHeightPx;
            ctx.fillText(line, textX, y);
        });

        // Update bounds based on actual text size
        this.updateTextBounds(layer, lines, ctx);
    }

    /**
     * Update text layer bounds
     */
    updateTextBounds(layer, lines, ctx) {
        const style = layer.textStyle;
        const lineHeightPx = style.fontSize * style.lineHeight;

        let maxWidth = 0;
        lines.forEach(line => {
            const metrics = ctx.measureText(line);
            maxWidth = Math.max(maxWidth, metrics.width);
        });

        layer.textBounds.width = Math.max(100, maxWidth + 20);
        layer.textBounds.height = Math.max(50, lines.length * lineHeightPx + 20);
    }

    /**
     * Finish editing text
     */
    finishEditing() {
        if (this.textInput) {
            this.updateTextContent();
        }

        if (this.textOverlay) {
            this.textOverlay.remove();
            this.textOverlay = null;
        }

        this.textInput = null;
        this.editingLayer = null;

        // Re-render canvas
        this.app.canvas?.render();
    }

    /**
     * Rasterize text layer to regular layer
     */
    rasterizeTextLayer(layer) {
        if (!layer || layer.type !== 'text') return;

        // Start history action
        this.app.history.startAction('rasterize');

        // Render text to canvas one final time
        this.renderTextLayer(layer);

        // Convert to regular layer
        layer.type = 'layer';
        delete layer.textContent;
        delete layer.textStyle;
        delete layer.textBounds;

        // Update layer name
        layer.name = layer.name + ' (rastrováno)';

        // End history action
        this.app.history.endAction();

        // Finish editing
        this.finishEditing();

        // Update UI
        this.app.ui?.updateLayersList();
        this.app.ui?.showNotification('Text rastrován', 'success');
    }
}
