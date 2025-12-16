/**
 * QuickShape - Detect and convert freehand strokes to geometric shapes
 * Inspired by Procreate's QuickShape feature
 */

export class QuickShape {
    constructor(app) {
        this.app = app;

        // Detection thresholds
        this.minPoints = 10;
        this.lineThreshold = 0.95;     // How straight a line must be
        this.circleThreshold = 0.85;   // How circular a shape must be
        this.rectangleThreshold = 0.80; // How rectangular a shape must be

        // Hold duration for activation (ms)
        this.holdDuration = 500;
        this.holdTimer = null;
        this.isHolding = false;
    }

    /**
     * Detect shape from stroke points
     */
    detect(points) {
        if (points.length < this.minPoints) return null;

        // Calculate bounding box
        const bounds = this.getBoundingBox(points);

        // Try to match shapes in order of specificity
        const line = this.detectLine(points);
        if (line) return line;

        const circle = this.detectCircle(points, bounds);
        if (circle) return circle;

        const rectangle = this.detectRectangle(points, bounds);
        if (rectangle) return rectangle;

        const triangle = this.detectTriangle(points);
        if (triangle) return triangle;

        return null;
    }

    /**
     * Get bounding box of points
     */
    getBoundingBox(points) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }

    /**
     * Detect if stroke is a line
     */
    detectLine(points) {
        if (points.length < 2) return null;

        const start = points[0];
        const end = points[points.length - 1];
        const lineLength = this.distance(start, end);

        // Calculate total stroke length
        let strokeLength = 0;
        for (let i = 1; i < points.length; i++) {
            strokeLength += this.distance(points[i - 1], points[i]);
        }

        // Ratio of direct distance to stroke length
        const ratio = lineLength / strokeLength;

        if (ratio > this.lineThreshold && lineLength > 20) {
            return {
                type: 'line',
                startX: start.x,
                startY: start.y,
                endX: end.x,
                endY: end.y
            };
        }

        return null;
    }

    /**
     * Detect if stroke is a circle/ellipse
     */
    detectCircle(points, bounds) {
        // Check if stroke is closed (start near end)
        const start = points[0];
        const end = points[points.length - 1];
        const closedDistance = this.distance(start, end);
        const maxDimension = Math.max(bounds.width, bounds.height);

        if (closedDistance > maxDimension * 0.3) return null;

        // Calculate average distance from center
        const distances = points.map(p =>
            this.distance(p, { x: bounds.centerX, y: bounds.centerY })
        );

        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        const variance = distances.reduce((sum, d) =>
            sum + Math.pow(d - avgDistance, 2), 0
        ) / distances.length;
        const stdDev = Math.sqrt(variance);

        // Circularity score
        const circularity = 1 - (stdDev / avgDistance);

        if (circularity > this.circleThreshold) {
            // Determine if circle or ellipse
            const aspectRatio = bounds.width / bounds.height;
            const isCircle = aspectRatio > 0.85 && aspectRatio < 1.15;

            return {
                type: isCircle ? 'circle' : 'ellipse',
                centerX: bounds.centerX,
                centerY: bounds.centerY,
                radiusX: bounds.width / 2,
                radiusY: bounds.height / 2
            };
        }

        return null;
    }

    /**
     * Detect if stroke is a rectangle
     */
    detectRectangle(points, bounds) {
        // Check if stroke is closed
        const start = points[0];
        const end = points[points.length - 1];
        const closedDistance = this.distance(start, end);
        const perimeter = 2 * (bounds.width + bounds.height);

        if (closedDistance > Math.max(bounds.width, bounds.height) * 0.2) return null;

        // Calculate how many points are near edges
        let edgePoints = 0;
        const edgeThreshold = Math.max(bounds.width, bounds.height) * 0.1;

        points.forEach(p => {
            const distLeft = Math.abs(p.x - bounds.x);
            const distRight = Math.abs(p.x - (bounds.x + bounds.width));
            const distTop = Math.abs(p.y - bounds.y);
            const distBottom = Math.abs(p.y - (bounds.y + bounds.height));

            if (distLeft < edgeThreshold || distRight < edgeThreshold ||
                distTop < edgeThreshold || distBottom < edgeThreshold) {
                edgePoints++;
            }
        });

        const edgeRatio = edgePoints / points.length;

        if (edgeRatio > this.rectangleThreshold) {
            // Check for square
            const aspectRatio = bounds.width / bounds.height;
            const isSquare = aspectRatio > 0.85 && aspectRatio < 1.15;

            return {
                type: isSquare ? 'square' : 'rectangle',
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height
            };
        }

        return null;
    }

    /**
     * Detect if stroke is a triangle
     */
    detectTriangle(points) {
        // Find corners using angle detection
        const corners = this.findCorners(points);

        if (corners.length === 3) {
            // Check if stroke is closed
            const start = points[0];
            const end = points[points.length - 1];
            if (this.distance(start, end) < 50) {
                return {
                    type: 'triangle',
                    points: corners
                };
            }
        }

        return null;
    }

    /**
     * Find corners in stroke using angle changes
     */
    findCorners(points) {
        const corners = [];
        const angleThreshold = Math.PI / 3; // 60 degrees

        for (let i = 2; i < points.length; i++) {
            const p1 = points[i - 2];
            const p2 = points[i - 1];
            const p3 = points[i];

            const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);

            let angleDiff = Math.abs(angle2 - angle1);
            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

            if (angleDiff > angleThreshold) {
                // Check if not too close to last corner
                if (corners.length === 0 ||
                    this.distance(p2, corners[corners.length - 1]) > 30) {
                    corners.push({ x: p2.x, y: p2.y });
                }
            }
        }

        return corners;
    }

    /**
     * Calculate distance between two points
     */
    distance(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    /**
     * Draw detected shape on canvas
     * @param {Object} shape - The detected shape
     * @param {Array} originalPoints - Original stroke points (unused, kept for API compatibility)
     */
    drawShape(shape, originalPoints = null) {
        const ctx = this.app.layers.getActiveContext();
        if (!ctx) return;

        // Restore layer state from history snapshot (before freehand stroke was drawn)
        // This cleanly removes the freehand stroke without affecting other content
        const historySnapshot = this.app.history.currentAction;
        if (historySnapshot && historySnapshot.imageData) {
            ctx.putImageData(historySnapshot.imageData, 0, 0);
        }

        const color = this.app.color.getPrimaryColor();
        const lineWidth = this.app.brush.size;

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (shape.type) {
            case 'line':
                ctx.beginPath();
                ctx.moveTo(shape.startX, shape.startY);
                ctx.lineTo(shape.endX, shape.endY);
                ctx.stroke();
                break;

            case 'circle':
            case 'ellipse':
                ctx.beginPath();
                ctx.ellipse(
                    shape.centerX, shape.centerY,
                    shape.radiusX, shape.radiusY,
                    0, 0, Math.PI * 2
                );
                ctx.stroke();
                break;

            case 'square':
            case 'rectangle':
                ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                break;

            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(shape.points[0].x, shape.points[0].y);
                ctx.lineTo(shape.points[1].x, shape.points[1].y);
                ctx.lineTo(shape.points[2].x, shape.points[2].y);
                ctx.closePath();
                ctx.stroke();
                break;
        }

        this.app.canvas.render();
    }
}
