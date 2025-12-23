/**
 * CodeGenerator - Generates code from canvas/layer content
 * Supports HTML/SVG, CSS, JavaScript Canvas API, and C++
 *
 * Architecture:
 * - Analyzes layer content (shapes, paths, pixels)
 * - Converts to intermediate representation
 * - Generates output in requested format
 */

export class CodeGenerator {
    constructor(app) {
        this.app = app;

        // Supported output formats
        this.formats = {
            html: { name: 'HTML/SVG', extension: 'html', generator: this.generateHTML.bind(this) },
            css: { name: 'CSS', extension: 'css', generator: this.generateCSS.bind(this) },
            canvas: { name: 'JavaScript Canvas', extension: 'js', generator: this.generateCanvasJS.bind(this) },
            cpp: { name: 'C++ (Qt)', extension: 'cpp', generator: this.generateCPP.bind(this) }
        };

        // Current format
        this.currentFormat = 'canvas';

        // Cached analysis result
        this.lastAnalysis = null;
    }

    /**
     * Analyze layer content and return intermediate representation
     * @param {Object} layer - Layer to analyze
     * @returns {Object} - Analysis result with shapes, paths, pixels
     */
    analyzeLayer(layer) {
        if (!layer || !layer.canvas) return null;

        const canvas = layer.canvas;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const analysis = {
            width: canvas.width,
            height: canvas.height,
            bounds: this.findContentBounds(imageData),
            type: layer.type || 'layer',
            name: layer.name,
            opacity: layer.opacity,
            blendMode: layer.blendMode,
            elements: []
        };

        // For text layers, use text metadata
        if (layer.type === 'text' && layer.textContent) {
            analysis.elements.push({
                type: 'text',
                content: layer.textContent,
                style: { ...layer.textStyle },
                bounds: { ...layer.textBounds }
            });
        }

        // Analyze pixel content for shapes
        if (analysis.bounds) {
            const shapes = this.detectShapes(imageData, analysis.bounds);
            analysis.elements.push(...shapes);

            // If no shapes detected, treat as raster
            if (shapes.length === 0 && this.hasContent(imageData, analysis.bounds)) {
                analysis.elements.push({
                    type: 'raster',
                    bounds: analysis.bounds,
                    dataURL: this.cropToDataURL(canvas, analysis.bounds)
                });
            }
        }

        this.lastAnalysis = analysis;
        return analysis;
    }

    /**
     * Find content bounding box in image data
     */
    findContentBounds(imageData) {
        const { width, height, data } = imageData;
        let minX = width, minY = height, maxX = 0, maxY = 0;
        let hasContent = false;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const alpha = data[idx + 3];

                if (alpha > 0) {
                    hasContent = true;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        if (!hasContent) return null;

        return {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
        };
    }

    /**
     * Check if bounds contain any content
     */
    hasContent(imageData, bounds) {
        const { width, data } = imageData;

        for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
            for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
                const idx = (y * width + x) * 4;
                if (data[idx + 3] > 0) return true;
            }
        }
        return false;
    }

    /**
     * Detect shapes in image data (lines, rectangles, ellipses)
     */
    detectShapes(imageData, bounds) {
        const shapes = [];
        const { width, data } = imageData;

        // Extract edge pixels for shape detection
        const edgePixels = this.findEdgePixels(imageData, bounds);

        if (edgePixels.length < 3) return shapes;

        // Try to detect line
        const line = this.detectLine(edgePixels);
        if (line) {
            shapes.push(line);
            return shapes;
        }

        // Try to detect rectangle
        const rect = this.detectRectangle(edgePixels, bounds);
        if (rect) {
            shapes.push(rect);
            return shapes;
        }

        // Try to detect ellipse/circle
        const ellipse = this.detectEllipse(edgePixels, bounds);
        if (ellipse) {
            shapes.push(ellipse);
            return shapes;
        }

        // Try to detect path (freeform)
        const path = this.detectPath(edgePixels);
        if (path) {
            shapes.push(path);
            return shapes;
        }

        return shapes;
    }

    /**
     * Find edge pixels (pixels with transparent neighbors)
     */
    findEdgePixels(imageData, bounds) {
        const { width, height, data } = imageData;
        const edges = [];

        for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
            for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
                const idx = (y * width + x) * 4;
                const alpha = data[idx + 3];

                if (alpha > 0) {
                    // Check if this is an edge pixel
                    const isEdge = this.isEdgePixel(imageData, x, y);
                    if (isEdge) {
                        edges.push({
                            x, y,
                            r: data[idx],
                            g: data[idx + 1],
                            b: data[idx + 2],
                            a: alpha
                        });
                    }
                }
            }
        }

        return edges;
    }

    /**
     * Check if pixel is on edge (has transparent neighbor)
     */
    isEdgePixel(imageData, x, y) {
        const { width, height, data } = imageData;

        // Check 4-connected neighbors
        const neighbors = [
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
        ];

        for (const { dx, dy } of neighbors) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
                return true; // Edge of canvas
            }

            const idx = (ny * width + nx) * 4;
            if (data[idx + 3] === 0) {
                return true; // Transparent neighbor
            }
        }

        return false;
    }

    /**
     * Detect if pixels form a line
     */
    detectLine(pixels) {
        if (pixels.length < 2) return null;

        // Find endpoints (pixels with fewest neighbors)
        const endpoints = this.findEndpoints(pixels);
        if (endpoints.length !== 2) return null;

        const [start, end] = endpoints;

        // Check if pixels form a straight line
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length < 2) return null;

        // Check collinearity
        let maxDeviation = 0;
        for (const p of pixels) {
            const dist = this.pointToLineDistance(p, start, end);
            maxDeviation = Math.max(maxDeviation, dist);
        }

        // Allow some deviation for antialiased lines
        if (maxDeviation <= 3) {
            const color = this.getDominantColor(pixels);
            return {
                type: 'line',
                x1: start.x,
                y1: start.y,
                x2: end.x,
                y2: end.y,
                strokeWidth: Math.max(1, Math.ceil(pixels.length / length)),
                color: color
            };
        }

        return null;
    }

    /**
     * Find endpoints in pixel array
     */
    findEndpoints(pixels) {
        if (pixels.length === 0) return [];

        // Simple approach: find extreme points
        let minX = pixels[0], maxX = pixels[0];
        let minY = pixels[0], maxY = pixels[0];

        for (const p of pixels) {
            if (p.x < minX.x) minX = p;
            if (p.x > maxX.x) maxX = p;
            if (p.y < minY.y) minY = p;
            if (p.y > maxY.y) maxY = p;
        }

        // Return the two most distant points
        const candidates = [minX, maxX, minY, maxY];
        let maxDist = 0;
        let endpoints = [candidates[0], candidates[1]];

        for (let i = 0; i < candidates.length; i++) {
            for (let j = i + 1; j < candidates.length; j++) {
                const dist = this.distance(candidates[i], candidates[j]);
                if (dist > maxDist) {
                    maxDist = dist;
                    endpoints = [candidates[i], candidates[j]];
                }
            }
        }

        return endpoints;
    }

    /**
     * Distance between two points
     */
    distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Distance from point to line
     */
    pointToLineDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return this.distance(point, lineStart);

        const t = Math.max(0, Math.min(1,
            ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (length * length)
        ));

        const projX = lineStart.x + t * dx;
        const projY = lineStart.y + t * dy;

        return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
    }

    /**
     * Detect if pixels form a rectangle
     */
    detectRectangle(pixels, bounds) {
        // Check if the shape matches the bounding box closely
        const expectedPerimeter = 2 * (bounds.width + bounds.height);
        const actualPixels = pixels.length;

        // For a rectangle, pixels should be mostly on edges
        const ratio = actualPixels / expectedPerimeter;

        if (ratio < 0.5 || ratio > 2) return null;

        // Check corners
        const corners = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width - 1, y: bounds.y },
            { x: bounds.x, y: bounds.y + bounds.height - 1 },
            { x: bounds.x + bounds.width - 1, y: bounds.y + bounds.height - 1 }
        ];

        let cornersFound = 0;
        for (const corner of corners) {
            if (pixels.some(p => Math.abs(p.x - corner.x) <= 2 && Math.abs(p.y - corner.y) <= 2)) {
                cornersFound++;
            }
        }

        if (cornersFound >= 3) {
            const color = this.getDominantColor(pixels);
            return {
                type: 'rectangle',
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                strokeWidth: Math.max(1, Math.round(actualPixels / expectedPerimeter)),
                color: color,
                filled: this.isFilledShape(pixels, bounds)
            };
        }

        return null;
    }

    /**
     * Detect if pixels form an ellipse
     */
    detectEllipse(pixels, bounds) {
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;
        const rx = bounds.width / 2;
        const ry = bounds.height / 2;

        // Check if pixels roughly follow ellipse equation
        let matchCount = 0;
        for (const p of pixels) {
            const nx = (p.x - cx) / rx;
            const ny = (p.y - cy) / ry;
            const dist = Math.abs(nx * nx + ny * ny - 1);

            if (dist < 0.3) matchCount++;
        }

        const matchRatio = matchCount / pixels.length;

        if (matchRatio > 0.6) {
            const color = this.getDominantColor(pixels);
            return {
                type: 'ellipse',
                cx: cx,
                cy: cy,
                rx: rx,
                ry: ry,
                strokeWidth: 1,
                color: color,
                filled: this.isFilledShape(pixels, bounds)
            };
        }

        return null;
    }

    /**
     * Detect a freeform path
     */
    detectPath(pixels) {
        if (pixels.length < 3) return null;

        // Simplify path using Douglas-Peucker algorithm
        const simplified = this.simplifyPath(pixels, 2);

        if (simplified.length < 2) return null;

        const color = this.getDominantColor(pixels);
        return {
            type: 'path',
            points: simplified.map(p => ({ x: p.x, y: p.y })),
            strokeWidth: 1,
            color: color
        };
    }

    /**
     * Simplify path using Douglas-Peucker algorithm
     */
    simplifyPath(points, epsilon) {
        if (points.length < 3) return points;

        // Find point with maximum distance
        let maxDist = 0;
        let maxIdx = 0;

        const start = points[0];
        const end = points[points.length - 1];

        for (let i = 1; i < points.length - 1; i++) {
            const dist = this.pointToLineDistance(points[i], start, end);
            if (dist > maxDist) {
                maxDist = dist;
                maxIdx = i;
            }
        }

        // If max distance is greater than epsilon, recursively simplify
        if (maxDist > epsilon) {
            const left = this.simplifyPath(points.slice(0, maxIdx + 1), epsilon);
            const right = this.simplifyPath(points.slice(maxIdx), epsilon);
            return [...left.slice(0, -1), ...right];
        }

        return [start, end];
    }

    /**
     * Check if shape is filled (not just outline)
     */
    isFilledShape(pixels, bounds) {
        // If pixel count is significantly more than perimeter, it's filled
        const perimeter = 2 * (bounds.width + bounds.height);
        const area = bounds.width * bounds.height;

        return pixels.length > perimeter * 2 && pixels.length > area * 0.3;
    }

    /**
     * Get dominant color from pixels
     */
    getDominantColor(pixels) {
        if (pixels.length === 0) return '#000000';

        let r = 0, g = 0, b = 0, count = 0;

        for (const p of pixels) {
            if (p.a > 127) {
                r += p.r;
                g += p.g;
                b += p.b;
                count++;
            }
        }

        if (count === 0) return '#000000';

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    /**
     * Crop canvas to bounds and return data URL
     */
    cropToDataURL(canvas, bounds) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = bounds.width;
        tempCanvas.height = bounds.height;

        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(
            canvas,
            bounds.x, bounds.y, bounds.width, bounds.height,
            0, 0, bounds.width, bounds.height
        );

        return tempCanvas.toDataURL('image/png');
    }

    /**
     * Generate code in specified format
     */
    generateCode(layer, format = this.currentFormat) {
        const analysis = this.analyzeLayer(layer);
        if (!analysis) return '// No content to export';

        const generator = this.formats[format]?.generator;
        if (!generator) return '// Unknown format';

        return generator(analysis);
    }

    /**
     * Generate HTML/SVG code
     */
    generateHTML(analysis) {
        const lines = [];
        lines.push('<!-- Generated by PaintNook -->');
        lines.push(`<svg width="${analysis.width}" height="${analysis.height}" xmlns="http://www.w3.org/2000/svg">`);

        if (analysis.opacity !== 1) {
            lines.push(`  <g opacity="${analysis.opacity}">`);
        }

        for (const element of analysis.elements) {
            const indent = analysis.opacity !== 1 ? '    ' : '  ';

            switch (element.type) {
                case 'line':
                    lines.push(`${indent}<line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" stroke="${element.color}" stroke-width="${element.strokeWidth}" stroke-linecap="round"/>`);
                    break;

                case 'rectangle':
                    if (element.filled) {
                        lines.push(`${indent}<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" fill="${element.color}"/>`);
                    } else {
                        lines.push(`${indent}<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" fill="none" stroke="${element.color}" stroke-width="${element.strokeWidth}"/>`);
                    }
                    break;

                case 'ellipse':
                    if (element.filled) {
                        lines.push(`${indent}<ellipse cx="${element.cx}" cy="${element.cy}" rx="${element.rx}" ry="${element.ry}" fill="${element.color}"/>`);
                    } else {
                        lines.push(`${indent}<ellipse cx="${element.cx}" cy="${element.cy}" rx="${element.rx}" ry="${element.ry}" fill="none" stroke="${element.color}" stroke-width="${element.strokeWidth}"/>`);
                    }
                    break;

                case 'path':
                    const d = element.points.map((p, i) =>
                        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
                    ).join(' ');
                    lines.push(`${indent}<path d="${d}" fill="none" stroke="${element.color}" stroke-width="${element.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`);
                    break;

                case 'text':
                    const style = element.style;
                    lines.push(`${indent}<text x="${element.bounds.x}" y="${element.bounds.y}" font-family="${style.fontFamily}" font-size="${style.fontSize}" fill="${style.color}" font-weight="${style.fontWeight}">${this.escapeHTML(element.content)}</text>`);
                    break;

                case 'raster':
                    lines.push(`${indent}<image x="${element.bounds.x}" y="${element.bounds.y}" width="${element.bounds.width}" height="${element.bounds.height}" href="${element.dataURL}"/>`);
                    break;
            }
        }

        if (analysis.opacity !== 1) {
            lines.push('  </g>');
        }

        lines.push('</svg>');
        return lines.join('\n');
    }

    /**
     * Generate CSS code
     */
    generateCSS(analysis) {
        const lines = [];
        lines.push('/* Generated by PaintNook */');
        lines.push(`.layer-${this.sanitizeClassName(analysis.name)} {`);
        lines.push(`  position: relative;`);
        lines.push(`  width: ${analysis.width}px;`);
        lines.push(`  height: ${analysis.height}px;`);

        if (analysis.opacity !== 1) {
            lines.push(`  opacity: ${analysis.opacity};`);
        }

        for (let i = 0; i < analysis.elements.length; i++) {
            const element = analysis.elements[i];

            switch (element.type) {
                case 'rectangle':
                    if (i === 0) {
                        lines.push(`  background-color: ${element.color};`);
                        if (!element.filled) {
                            lines.push(`  background-color: transparent;`);
                            lines.push(`  border: ${element.strokeWidth}px solid ${element.color};`);
                        }
                    }
                    break;

                case 'ellipse':
                    if (element.rx === element.ry) {
                        lines.push(`  border-radius: 50%;`);
                    } else {
                        lines.push(`  border-radius: ${element.rx}px / ${element.ry}px;`);
                    }
                    lines.push(`  background-color: ${element.filled ? element.color : 'transparent'};`);
                    if (!element.filled) {
                        lines.push(`  border: ${element.strokeWidth}px solid ${element.color};`);
                    }
                    break;

                case 'text':
                    const style = element.style;
                    lines.push(`  font-family: '${style.fontFamily}', sans-serif;`);
                    lines.push(`  font-size: ${style.fontSize}px;`);
                    lines.push(`  color: ${style.color};`);
                    lines.push(`  font-weight: ${style.fontWeight};`);
                    break;

                case 'raster':
                    lines.push(`  background-image: url('${element.dataURL}');`);
                    lines.push(`  background-position: ${element.bounds.x}px ${element.bounds.y}px;`);
                    lines.push(`  background-repeat: no-repeat;`);
                    break;
            }
        }

        lines.push('}');

        // Add pseudo-elements for lines and paths
        for (let i = 0; i < analysis.elements.length; i++) {
            const element = analysis.elements[i];

            if (element.type === 'line') {
                const angle = Math.atan2(element.y2 - element.y1, element.x2 - element.x1) * 180 / Math.PI;
                const length = Math.sqrt(Math.pow(element.x2 - element.x1, 2) + Math.pow(element.y2 - element.y1, 2));

                lines.push('');
                lines.push(`.layer-${this.sanitizeClassName(analysis.name)}::after {`);
                lines.push(`  content: '';`);
                lines.push(`  position: absolute;`);
                lines.push(`  left: ${element.x1}px;`);
                lines.push(`  top: ${element.y1}px;`);
                lines.push(`  width: ${length}px;`);
                lines.push(`  height: ${element.strokeWidth}px;`);
                lines.push(`  background-color: ${element.color};`);
                lines.push(`  transform-origin: left center;`);
                lines.push(`  transform: rotate(${angle}deg);`);
                lines.push('}');
            }
        }

        return lines.join('\n');
    }

    /**
     * Generate JavaScript Canvas API code
     */
    generateCanvasJS(analysis) {
        const lines = [];
        lines.push('// Generated by PaintNook');
        lines.push(`const canvas = document.getElementById('myCanvas');`);
        lines.push(`const ctx = canvas.getContext('2d');`);
        lines.push('');
        lines.push(`// Set canvas size`);
        lines.push(`canvas.width = ${analysis.width};`);
        lines.push(`canvas.height = ${analysis.height};`);
        lines.push('');

        if (analysis.opacity !== 1) {
            lines.push(`ctx.globalAlpha = ${analysis.opacity};`);
        }

        if (analysis.blendMode && analysis.blendMode !== 'source-over') {
            lines.push(`ctx.globalCompositeOperation = '${analysis.blendMode}';`);
        }

        for (const element of analysis.elements) {
            lines.push('');

            switch (element.type) {
                case 'line':
                    lines.push(`// Draw line`);
                    lines.push(`ctx.beginPath();`);
                    lines.push(`ctx.moveTo(${element.x1}, ${element.y1});`);
                    lines.push(`ctx.lineTo(${element.x2}, ${element.y2});`);
                    lines.push(`ctx.strokeStyle = '${element.color}';`);
                    lines.push(`ctx.lineWidth = ${element.strokeWidth};`);
                    lines.push(`ctx.lineCap = 'round';`);
                    lines.push(`ctx.stroke();`);
                    break;

                case 'rectangle':
                    lines.push(`// Draw rectangle`);
                    if (element.filled) {
                        lines.push(`ctx.fillStyle = '${element.color}';`);
                        lines.push(`ctx.fillRect(${element.x}, ${element.y}, ${element.width}, ${element.height});`);
                    } else {
                        lines.push(`ctx.strokeStyle = '${element.color}';`);
                        lines.push(`ctx.lineWidth = ${element.strokeWidth};`);
                        lines.push(`ctx.strokeRect(${element.x}, ${element.y}, ${element.width}, ${element.height});`);
                    }
                    break;

                case 'ellipse':
                    lines.push(`// Draw ellipse`);
                    lines.push(`ctx.beginPath();`);
                    lines.push(`ctx.ellipse(${element.cx}, ${element.cy}, ${element.rx}, ${element.ry}, 0, 0, Math.PI * 2);`);
                    if (element.filled) {
                        lines.push(`ctx.fillStyle = '${element.color}';`);
                        lines.push(`ctx.fill();`);
                    } else {
                        lines.push(`ctx.strokeStyle = '${element.color}';`);
                        lines.push(`ctx.lineWidth = ${element.strokeWidth};`);
                        lines.push(`ctx.stroke();`);
                    }
                    break;

                case 'path':
                    lines.push(`// Draw path`);
                    lines.push(`ctx.beginPath();`);
                    element.points.forEach((p, i) => {
                        if (i === 0) {
                            lines.push(`ctx.moveTo(${p.x}, ${p.y});`);
                        } else {
                            lines.push(`ctx.lineTo(${p.x}, ${p.y});`);
                        }
                    });
                    lines.push(`ctx.strokeStyle = '${element.color}';`);
                    lines.push(`ctx.lineWidth = ${element.strokeWidth};`);
                    lines.push(`ctx.lineCap = 'round';`);
                    lines.push(`ctx.lineJoin = 'round';`);
                    lines.push(`ctx.stroke();`);
                    break;

                case 'text':
                    const style = element.style;
                    lines.push(`// Draw text`);
                    lines.push(`ctx.font = '${style.fontWeight} ${style.fontSize}px ${style.fontFamily}';`);
                    lines.push(`ctx.fillStyle = '${style.color}';`);
                    lines.push(`ctx.textAlign = '${style.textAlign}';`);
                    lines.push(`ctx.fillText('${this.escapeJS(element.content)}', ${element.bounds.x}, ${element.bounds.y});`);
                    break;

                case 'raster':
                    lines.push(`// Draw image`);
                    lines.push(`const img = new Image();`);
                    lines.push(`img.onload = () => {`);
                    lines.push(`  ctx.drawImage(img, ${element.bounds.x}, ${element.bounds.y});`);
                    lines.push(`};`);
                    lines.push(`img.src = '${element.dataURL.substring(0, 50)}...'; // Base64 image data`);
                    break;
            }
        }

        return lines.join('\n');
    }

    /**
     * Generate C++ code (Qt/QPainter)
     */
    generateCPP(analysis) {
        const lines = [];
        lines.push('// Generated by PaintNook');
        lines.push('// Requires Qt framework');
        lines.push('#include <QPainter>');
        lines.push('#include <QWidget>');
        lines.push('');
        lines.push('void paintLayer(QPainter& painter) {');

        if (analysis.opacity !== 1) {
            lines.push(`    painter.setOpacity(${analysis.opacity});`);
        }

        for (const element of analysis.elements) {
            lines.push('');

            switch (element.type) {
                case 'line':
                    lines.push('    // Draw line');
                    lines.push(`    QPen pen(QColor("${element.color}"));`);
                    lines.push(`    pen.setWidth(${element.strokeWidth});`);
                    lines.push(`    pen.setCapStyle(Qt::RoundCap);`);
                    lines.push(`    painter.setPen(pen);`);
                    lines.push(`    painter.drawLine(${element.x1}, ${element.y1}, ${element.x2}, ${element.y2});`);
                    break;

                case 'rectangle':
                    lines.push('    // Draw rectangle');
                    if (element.filled) {
                        lines.push(`    painter.setBrush(QColor("${element.color}"));`);
                        lines.push(`    painter.setPen(Qt::NoPen);`);
                    } else {
                        lines.push(`    painter.setBrush(Qt::NoBrush);`);
                        lines.push(`    QPen rectPen(QColor("${element.color}"));`);
                        lines.push(`    rectPen.setWidth(${element.strokeWidth});`);
                        lines.push(`    painter.setPen(rectPen);`);
                    }
                    lines.push(`    painter.drawRect(${element.x}, ${element.y}, ${element.width}, ${element.height});`);
                    break;

                case 'ellipse':
                    lines.push('    // Draw ellipse');
                    if (element.filled) {
                        lines.push(`    painter.setBrush(QColor("${element.color}"));`);
                        lines.push(`    painter.setPen(Qt::NoPen);`);
                    } else {
                        lines.push(`    painter.setBrush(Qt::NoBrush);`);
                        lines.push(`    QPen ellipsePen(QColor("${element.color}"));`);
                        lines.push(`    ellipsePen.setWidth(${element.strokeWidth});`);
                        lines.push(`    painter.setPen(ellipsePen);`);
                    }
                    lines.push(`    painter.drawEllipse(QPointF(${element.cx}, ${element.cy}), ${element.rx}, ${element.ry});`);
                    break;

                case 'path':
                    lines.push('    // Draw path');
                    lines.push(`    QPainterPath path;`);
                    element.points.forEach((p, i) => {
                        if (i === 0) {
                            lines.push(`    path.moveTo(${p.x}, ${p.y});`);
                        } else {
                            lines.push(`    path.lineTo(${p.x}, ${p.y});`);
                        }
                    });
                    lines.push(`    QPen pathPen(QColor("${element.color}"));`);
                    lines.push(`    pathPen.setWidth(${element.strokeWidth});`);
                    lines.push(`    pathPen.setCapStyle(Qt::RoundCap);`);
                    lines.push(`    pathPen.setJoinStyle(Qt::RoundJoin);`);
                    lines.push(`    painter.setPen(pathPen);`);
                    lines.push(`    painter.setBrush(Qt::NoBrush);`);
                    lines.push(`    painter.drawPath(path);`);
                    break;

                case 'text':
                    const style = element.style;
                    lines.push('    // Draw text');
                    lines.push(`    QFont font("${style.fontFamily}", ${style.fontSize});`);
                    lines.push(`    font.setWeight(QFont::${style.fontWeight === 'bold' ? 'Bold' : 'Normal'});`);
                    lines.push(`    painter.setFont(font);`);
                    lines.push(`    painter.setPen(QColor("${style.color}"));`);
                    lines.push(`    painter.drawText(${element.bounds.x}, ${element.bounds.y}, "${this.escapeCPP(element.content)}");`);
                    break;

                case 'raster':
                    lines.push('    // Draw image');
                    lines.push(`    QImage img;`);
                    lines.push(`    img.loadFromData(QByteArray::fromBase64("...")); // Base64 data`);
                    lines.push(`    painter.drawImage(${element.bounds.x}, ${element.bounds.y}, img);`);
                    break;
            }
        }

        lines.push('}');
        return lines.join('\n');
    }

    /**
     * Utility: Escape HTML special characters
     */
    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Utility: Escape JavaScript string
     */
    escapeJS(str) {
        return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
    }

    /**
     * Utility: Escape C++ string
     */
    escapeCPP(str) {
        return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    }

    /**
     * Utility: Sanitize class name
     */
    sanitizeClassName(name) {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    }

    /**
     * Get all available formats
     */
    getFormats() {
        return Object.entries(this.formats).map(([key, value]) => ({
            id: key,
            name: value.name,
            extension: value.extension
        }));
    }

    /**
     * Set current format
     */
    setFormat(format) {
        if (this.formats[format]) {
            this.currentFormat = format;
        }
    }

    /**
     * Generate code for all visible layers
     */
    generateAllLayers(format = this.currentFormat) {
        const layers = this.app.layers.getLayers().filter(l => l.visible && l.type !== 'folder');
        const codes = [];

        for (const layer of layers) {
            const code = this.generateCode(layer, format);
            codes.push(`// Layer: ${layer.name}\n${code}`);
        }

        return codes.join('\n\n');
    }
}
