/**
 * Universal Action Format (UAF) - Normalized format for all sync actions
 *
 * Key principle: All coordinates are normalized to 0-1 range relative to canvas dimensions.
 * This allows the same action to be rendered correctly regardless of canvas size or view mode.
 */

export const ActionTypes = {
    STROKE: 'stroke',
    SHAPE: 'shape',
    FILL: 'fill',
    ERASE: 'erase',
    LAYER_ADD: 'layer_add',
    LAYER_REMOVE: 'layer_remove',
    LAYER_MOVE: 'layer_move',
    LAYER_MERGE: 'layer_merge',
    LAYER_VISIBILITY: 'layer_visibility',
    LAYER_OPACITY: 'layer_opacity',
    LAYER_BLEND_MODE: 'layer_blend_mode',
    TRANSFORM: 'transform',
    UNDO: 'undo',
    REDO: 'redo',
    CLEAR_LAYER: 'clear_layer',
    INITIAL_STATE: 'initial_state',
    CURSOR_MOVE: 'cursor_move'
};

export const BlendModes = {
    NORMAL: 'source-over',
    MULTIPLY: 'multiply',
    SCREEN: 'screen',
    OVERLAY: 'overlay',
    DARKEN: 'darken',
    LIGHTEN: 'lighten',
    COLOR_DODGE: 'color-dodge',
    COLOR_BURN: 'color-burn',
    HARD_LIGHT: 'hard-light',
    SOFT_LIGHT: 'soft-light',
    DIFFERENCE: 'difference',
    EXCLUSION: 'exclusion',
    HUE: 'hue',
    SATURATION: 'saturation',
    COLOR: 'color',
    LUMINOSITY: 'luminosity'
};

export const BrushTypes = {
    ROUND: 'round',
    SOFT: 'soft',
    SQUARE: 'square',
    PIXEL: 'pixel',
    AIRBRUSH: 'airbrush',
    MARKER: 'marker',
    CHARCOAL: 'charcoal',
    WATERCOLOR: 'watercolor',
    INK: 'ink',
    CALLIGRAPHY: 'calligraphy',
    SPLATTER: 'splatter',
    CHALK: 'chalk'
};

export const ShapeTypes = {
    LINE: 'line',
    RECTANGLE: 'rectangle',
    ELLIPSE: 'ellipse',
    POLYGON: 'polygon'
};

export const ConflictStrategies = {
    HOST_OVERRIDE: 'host-override',
    CRDT: 'crdt',
    LAST_WRITE_WINS: 'last-write-wins'
};

/**
 * @typedef {Object} Point
 * @property {number} x - Normalized X coordinate (0-1)
 * @property {number} y - Normalized Y coordinate (0-1)
 * @property {number} pressure - Pressure value (0-1)
 * @property {number} timestamp - Timestamp in milliseconds
 */

/**
 * @typedef {Object} Color
 * @property {number} r - Red component (0-255)
 * @property {number} g - Green component (0-255)
 * @property {number} b - Blue component (0-255)
 * @property {number} a - Alpha component (0-1)
 */

/**
 * @typedef {Object} Bounds
 * @property {number} x - Normalized X position (0-1)
 * @property {number} y - Normalized Y position (0-1)
 * @property {number} width - Normalized width (0-1)
 * @property {number} height - Normalized height (0-1)
 */

/**
 * @typedef {Object} StrokeData
 * @property {Point[]} points - Array of normalized points
 * @property {Color} color - Stroke color
 * @property {string} brushType - Brush type identifier
 * @property {number} brushSize - Normalized brush size (0-1 relative to canvas width)
 * @property {number} hardness - Brush hardness (0-1)
 * @property {number} opacity - Stroke opacity (0-1)
 * @property {string} blendMode - Canvas blend mode
 * @property {number} smoothing - Smoothing amount (0-1)
 */

/**
 * @typedef {Object} ShapeData
 * @property {string} shapeType - Shape type identifier
 * @property {Bounds} bounds - Shape bounds
 * @property {Color|null} fill - Fill color or null for no fill
 * @property {Color|null} stroke - Stroke color or null for no stroke
 * @property {number} strokeWidth - Normalized stroke width (0-1)
 * @property {Object} params - Additional shape parameters
 */

/**
 * @typedef {Object} FillData
 * @property {Point} point - Fill starting point
 * @property {Color} color - Fill color
 * @property {number} tolerance - Color tolerance (0-255)
 * @property {boolean} contiguous - Whether to fill contiguous area only
 */

/**
 * @typedef {Object} EraseData
 * @property {Point[]} points - Array of normalized points
 * @property {number} size - Normalized eraser size (0-1)
 * @property {number} hardness - Eraser hardness (0-1)
 */

/**
 * @typedef {Object} UAFAction
 * @property {string} id - Unique action ID (UUID)
 * @property {string} type - Action type from ActionTypes
 * @property {string} authorId - ID of the participant who created this action
 * @property {number} timestamp - Server timestamp
 * @property {number} vectorClock - Vector clock for CRDT ordering
 * @property {string} layerId - ID of the target layer
 * @property {number} priority - Priority level (0=normal, 1=host)
 * @property {Object} data - Action-specific data
 */

/**
 * Create a new UAF action
 * @param {string} type - Action type
 * @param {string} layerId - Target layer ID
 * @param {Object} data - Action data
 * @param {Object} options - Additional options
 * @returns {UAFAction}
 */
export function createAction(type, layerId, data, options = {}) {
    return {
        id: generateUUID(),
        type,
        authorId: options.authorId || null,
        timestamp: Date.now(),
        vectorClock: options.vectorClock || 0,
        layerId,
        priority: options.priority || 0,
        data
    };
}

/**
 * Create a stroke action
 * @param {string} layerId - Target layer ID
 * @param {StrokeData} strokeData - Stroke data
 * @param {Object} options - Additional options
 * @returns {UAFAction}
 */
export function createStrokeAction(layerId, strokeData, options = {}) {
    return createAction(ActionTypes.STROKE, layerId, strokeData, options);
}

/**
 * Create a shape action
 * @param {string} layerId - Target layer ID
 * @param {ShapeData} shapeData - Shape data
 * @param {Object} options - Additional options
 * @returns {UAFAction}
 */
export function createShapeAction(layerId, shapeData, options = {}) {
    return createAction(ActionTypes.SHAPE, layerId, shapeData, options);
}

/**
 * Create a fill action
 * @param {string} layerId - Target layer ID
 * @param {FillData} fillData - Fill data
 * @param {Object} options - Additional options
 * @returns {UAFAction}
 */
export function createFillAction(layerId, fillData, options = {}) {
    return createAction(ActionTypes.FILL, layerId, fillData, options);
}

/**
 * Create an erase action
 * @param {string} layerId - Target layer ID
 * @param {EraseData} eraseData - Erase data
 * @param {Object} options - Additional options
 * @returns {UAFAction}
 */
export function createEraseAction(layerId, eraseData, options = {}) {
    return createAction(ActionTypes.ERASE, layerId, eraseData, options);
}

/**
 * Parse a color string to Color object
 * @param {string} colorString - Color string (#RRGGBB or rgb/rgba)
 * @returns {Color}
 */
export function parseColor(colorString) {
    if (!colorString) {
        return { r: 0, g: 0, b: 0, a: 1 };
    }

    // Handle hex color
    if (colorString.startsWith('#')) {
        const hex = colorString.slice(1);
        if (hex.length === 3) {
            return {
                r: parseInt(hex[0] + hex[0], 16),
                g: parseInt(hex[1] + hex[1], 16),
                b: parseInt(hex[2] + hex[2], 16),
                a: 1
            };
        }
        if (hex.length === 6) {
            return {
                r: parseInt(hex.slice(0, 2), 16),
                g: parseInt(hex.slice(2, 4), 16),
                b: parseInt(hex.slice(4, 6), 16),
                a: 1
            };
        }
        if (hex.length === 8) {
            return {
                r: parseInt(hex.slice(0, 2), 16),
                g: parseInt(hex.slice(2, 4), 16),
                b: parseInt(hex.slice(4, 6), 16),
                a: parseInt(hex.slice(6, 8), 16) / 255
            };
        }
    }

    // Handle rgb/rgba
    const rgbaMatch = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
        return {
            r: parseInt(rgbaMatch[1]),
            g: parseInt(rgbaMatch[2]),
            b: parseInt(rgbaMatch[3]),
            a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1
        };
    }

    // Default
    return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Convert Color object to CSS string
 * @param {Color} color - Color object
 * @returns {string}
 */
export function colorToString(color) {
    if (!color) return 'rgba(0, 0, 0, 1)';
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a ?? 1})`;
}

/**
 * Convert Color object to hex string
 * @param {Color} color - Color object
 * @returns {string}
 */
export function colorToHex(color) {
    if (!color) return '#000000';
    const r = Math.round(color.r).toString(16).padStart(2, '0');
    const g = Math.round(color.g).toString(16).padStart(2, '0');
    const b = Math.round(color.b).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

/**
 * Generate UUID v4
 * @returns {string}
 */
export function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Validate a UAF action
 * @param {UAFAction} action - Action to validate
 * @returns {boolean}
 */
export function validateAction(action) {
    if (!action || typeof action !== 'object') return false;
    if (!action.id || typeof action.id !== 'string') return false;
    if (!action.type || !Object.values(ActionTypes).includes(action.type)) return false;
    if (action.priority !== undefined && ![0, 1].includes(action.priority)) return false;

    // Type-specific validation
    switch (action.type) {
        case ActionTypes.STROKE:
            if (!action.data?.points || !Array.isArray(action.data.points)) return false;
            break;
        case ActionTypes.SHAPE:
            if (!action.data?.shapeType || !action.data?.bounds) return false;
            break;
        case ActionTypes.FILL:
            if (!action.data?.point || !action.data?.color) return false;
            break;
        case ActionTypes.ERASE:
            if (!action.data?.points || !Array.isArray(action.data.points)) return false;
            break;
    }

    return true;
}

/**
 * Clone a UAF action (deep copy)
 * @param {UAFAction} action - Action to clone
 * @returns {UAFAction}
 */
export function cloneAction(action) {
    return JSON.parse(JSON.stringify(action));
}
