/**
 * EyedropperTool - Color picker from canvas
 */

export class EyedropperTool {
    constructor(app) {
        this.app = app;
        this.name = 'eyedropper';
        this.displayName = 'Kapátko';
    }

    activate() {}
    deactivate() {}

    onStart(x, y) {
        this.pickColor(x, y);
    }

    onMove(x, y) {
        this.pickColor(x, y);
    }

    onEnd(x, y) {
        this.pickColor(x, y);
    }

    /**
     * Pick color from canvas at position
     */
    pickColor(x, y) {
        const imageData = this.app.canvas.mainCtx.getImageData(
            Math.floor(x), Math.floor(y), 1, 1
        );

        const data = imageData.data;
        const r = data[0];
        const g = data[1];
        const b = data[2];

        const hex = this.rgbToHex(r, g, b);
        this.app.color.setPrimaryColor(hex);
    }

    /**
     * Convert RGB to hex
     */
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
}
