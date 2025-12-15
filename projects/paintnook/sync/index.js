/**
 * PaintNook Sync System - Main exports
 *
 * This module provides real-time collaboration with cross-mode rendering,
 * allowing host in digital mode and client in pixel art mode to see the same results.
 */

// Core types and utilities
export {
    ActionTypes,
    BlendModes,
    BrushTypes,
    ShapeTypes,
    ConflictStrategies,
    createAction,
    createStrokeAction,
    createShapeAction,
    createFillAction,
    createEraseAction,
    parseColor,
    colorToString,
    colorToHex,
    generateUUID,
    validateAction,
    cloneAction
} from './types.js';

// Core components
export { SyncEngine } from './SyncEngine.js';
export { ConflictResolver } from './ConflictResolver.js';
export { ActionQueue } from './ActionQueue.js';
export { RenderAdapter } from './RenderAdapter.js';

// Integration
export { PaintNookSync } from './PaintNookSync.js';
export { default as PaintNookSyncDefault } from './PaintNookSync.js';

// Test utilities
export { runTests } from './tests.js';
