/**
 * PaintNookSync - Integration wrapper for the sync system
 *
 * This module bridges the existing PaintApp/CollaborationManager with
 * the new sync system components. It handles:
 * - Converting tool events to UAF actions
 * - Rendering received actions using RenderAdapter
 * - Managing session state
 */

import { SyncEngine } from './SyncEngine.js';
import { RenderAdapter } from './RenderAdapter.js';
import { ActionTypes, parseColor } from './types.js';

export class PaintNookSync {
    /**
     * Create PaintNookSync instance
     * @param {Object} paintApp - Reference to PaintApp instance
     */
    constructor(paintApp) {
        this.app = paintApp;
        this.syncEngine = null;
        this.renderAdapter = null;
        this.isActive = false;

        // Bind methods for event handlers
        this.handleRemoteAction = this.handleRemoteAction.bind(this);
        this.handleRetry = this.handleRetry.bind(this);
        this.handleFailed = this.handleFailed.bind(this);
        this.handleParticipantJoined = this.handleParticipantJoined.bind(this);
        this.handleParticipantLeft = this.handleParticipantLeft.bind(this);
        this.handleDisconnected = this.handleDisconnected.bind(this);
    }

    /**
     * Initialize the sync system
     * @param {Object} options - Initialization options
     */
    async init(options = {}) {
        // Determine view mode from app state
        const viewMode = this.app.pixelArt?.enabled ? 'pixel_art' : 'digital';
        const canvasWidth = this.app.canvas?.width || 1920;
        const canvasHeight = this.app.canvas?.height || 1080;

        // Create render adapter
        this.renderAdapter = new RenderAdapter(viewMode, canvasWidth, canvasHeight, {
            pixelSize: this.app.pixelArt?.grid?.size || 1,
            gridSize: this.app.pixelArt?.grid?.subdivisions || 1,
            snapToGrid: this.app.pixelArt?.snap?.toGrid ?? true,
            palette: this.app.pixelArt?.palette?.colors || null,
            pressureSensitivity: this.app.settings?.pressureSensitivity ?? true
        });

        // Create sync engine
        this.syncEngine = new SyncEngine({
            priority: {
                hostOverride: options.hostPriority ?? true,
                conflictWindow: options.conflictWindow || 500,
                mergeStrategy: options.conflictMode || 'host-override'
            }
        });

        this.syncEngine.setCanvasSize(canvasWidth, canvasHeight);

        // Setup event handlers
        this.syncEngine.on('action:received', this.handleRemoteAction);
        this.syncEngine.on('action:retry', this.handleRetry);
        this.syncEngine.on('action:failed', this.handleFailed);
        this.syncEngine.on('participant:joined', this.handleParticipantJoined);
        this.syncEngine.on('participant:left', this.handleParticipantLeft);
        this.syncEngine.on('session:disconnected', this.handleDisconnected);

        console.log('[PaintNookSync] Initialized with view mode:', viewMode);
    }

    /**
     * Create a new collaboration session as host
     * @param {string} nickname - Host nickname
     * @param {string} password - Optional password
     * @param {Object} options - Session options
     * @returns {Promise<Object>} - Session info
     */
    async createSession(nickname, password, options = {}) {
        if (!this.syncEngine) {
            await this.init(options);
        }

        // Use existing CollaborationManager's transport (PeerJS)
        const collab = this.app.collab;
        if (collab) {
            // Set up transport wrapper
            this.syncEngine.setTransport({
                send: async (action) => {
                    // Send through existing collab system
                    const message = {
                        type: 'uaf-action',
                        action: action
                    };
                    collab.send(message);
                },
                close: async () => {
                    // Will be handled by collab manager
                }
            });
        }

        const session = await this.syncEngine.createSession(nickname, password, {
            ...options,
            color: collab?.myColor
        });

        this.isActive = true;
        console.log('[PaintNookSync] Session created:', session.id);

        return session;
    }

    /**
     * Join an existing session as guest
     * @param {string} sessionId - Session ID to join
     * @param {string} nickname - Guest nickname
     * @param {string} password - Optional password
     * @param {Object} options - Join options
     */
    async joinSession(sessionId, nickname, password, options = {}) {
        if (!this.syncEngine) {
            await this.init(options);
        }

        // Use existing CollaborationManager's transport
        const collab = this.app.collab;
        if (collab) {
            this.syncEngine.setTransport({
                send: async (action) => {
                    const message = {
                        type: 'uaf-action',
                        action: action
                    };
                    collab.send(message);
                },
                close: async () => {}
            });
        }

        await this.syncEngine.joinSession(sessionId, nickname, password);
        this.isActive = true;

        console.log('[PaintNookSync] Joined session:', sessionId);
    }

    /**
     * Process a message from CollaborationManager
     * @param {Object} data - Message data
     */
    handleCollabMessage(data) {
        if (data.type === 'uaf-action' && data.action) {
            this.syncEngine.handleRemoteAction(data.action);
        }
    }

    /**
     * Send a stroke action
     * @param {Object} strokeData - Stroke data from the tool
     */
    sendStroke(strokeData) {
        if (!this.isActive) return;

        const action = {
            type: ActionTypes.STROKE,
            layerId: this.getActiveLayerId(),
            points: strokeData.points || [],
            color: strokeData.color,
            brushType: strokeData.brushType || this.app.brush?.currentBrushType || 'round',
            brushSize: strokeData.brushSize || this.app.brush?.size || 10,
            hardness: strokeData.hardness ?? this.app.brush?.hardness ?? 1,
            opacity: strokeData.opacity ?? this.app.brush?.opacity ?? 1,
            blendMode: strokeData.blendMode || 'source-over',
            smoothing: strokeData.smoothing ?? 0
        };

        this.syncEngine.sendAction(action);
    }

    /**
     * Send a shape action
     * @param {Object} shapeData - Shape data
     */
    sendShape(shapeData) {
        if (!this.isActive) return;

        const action = {
            type: ActionTypes.SHAPE,
            layerId: this.getActiveLayerId(),
            shapeType: shapeData.shapeType,
            bounds: shapeData.bounds,
            fill: shapeData.fill,
            stroke: shapeData.stroke,
            strokeWidth: shapeData.strokeWidth || 1,
            filled: shapeData.filled ?? false,
            params: shapeData.params || {}
        };

        this.syncEngine.sendAction(action);
    }

    /**
     * Send a fill action
     * @param {Object} fillData - Fill data
     */
    sendFill(fillData) {
        if (!this.isActive) return;

        const action = {
            type: ActionTypes.FILL,
            layerId: this.getActiveLayerId(),
            point: fillData.point,
            color: fillData.color,
            tolerance: fillData.tolerance ?? 0,
            contiguous: fillData.contiguous ?? true
        };

        this.syncEngine.sendAction(action);
    }

    /**
     * Send an erase action
     * @param {Object} eraseData - Erase data
     */
    sendErase(eraseData) {
        if (!this.isActive) return;

        const action = {
            type: ActionTypes.ERASE,
            layerId: this.getActiveLayerId(),
            points: eraseData.points || [],
            size: eraseData.size || this.app.brush?.size || 10,
            hardness: eraseData.hardness ?? 1
        };

        this.syncEngine.sendAction(action);
    }

    /**
     * Send a layer change action
     * @param {string} changeType - Type of change
     * @param {Object} data - Change data
     */
    sendLayerChange(changeType, data) {
        if (!this.isActive || !this.syncEngine.isHost()) return;

        const action = {
            type: changeType,
            layerId: data.layerId || this.getActiveLayerId(),
            data: data
        };

        this.syncEngine.sendAction(action);
    }

    // ==========================================
    // EVENT HANDLERS
    // ==========================================

    /**
     * Handle remote action from sync engine
     * @param {Object} action - UAF action
     */
    handleRemoteAction(action) {
        // Find the target layer
        const layer = this.findLayerById(action.layerId);
        if (!layer) {
            console.warn('[PaintNookSync] Layer not found:', action.layerId);
            // Fall back to active layer
            const activeLayer = this.app.layers?.getActiveLayer();
            if (!activeLayer) return;
            action.layerId = activeLayer.id;
        }

        const targetLayer = layer || this.app.layers?.getActiveLayer();
        if (!targetLayer || targetLayer.locked) return;

        const ctx = targetLayer.canvas.getContext('2d');

        // Update render adapter dimensions if needed
        this.updateRenderAdapter();

        // Render the action using the adapter
        this.renderAdapter.render(ctx, action);

        // Trigger canvas re-render
        this.app.canvas?.render();
    }

    /**
     * Handle retry event
     * @param {Object} info - Retry info
     */
    handleRetry(info) {
        console.log(`[PaintNookSync] Retry ${info.attempt}/5 for action ${info.action.id}`);
    }

    /**
     * Handle failed action
     * @param {Object} info - Failure info
     */
    handleFailed(info) {
        console.error('[PaintNookSync] Action failed:', info.action.id, info.error);
        this.app.ui?.showNotification?.('Akce se nepodařila odeslat', 'error');
    }

    /**
     * Handle participant joined
     * @param {Object} participant - Participant info
     */
    handleParticipantJoined(participant) {
        console.log('[PaintNookSync] Participant joined:', participant.nickname);
        this.app.ui?.showNotification?.(`${participant.nickname} se připojil`, 'success');

        // If host, send current state to new participant
        if (this.syncEngine.isHost()) {
            this.sendCurrentState();
        }
    }

    /**
     * Handle participant left
     * @param {Object} info - Participant info
     */
    handleParticipantLeft(info) {
        console.log('[PaintNookSync] Participant left:', info.id);
        if (info.participant) {
            this.app.ui?.showNotification?.(`${info.participant.nickname} odešel`, 'info');
        }
    }

    /**
     * Handle disconnection
     */
    handleDisconnected() {
        console.log('[PaintNookSync] Disconnected');
        this.isActive = false;
        this.app.ui?.showNotification?.('Odpojeno od relace', 'warning');
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Get active layer ID
     * @returns {string}
     */
    getActiveLayerId() {
        const activeLayer = this.app.layers?.getActiveLayer();
        return activeLayer?.id || 'default';
    }

    /**
     * Find layer by ID
     * @param {string} id - Layer ID
     * @returns {Object|null}
     */
    findLayerById(id) {
        const layers = this.app.layers?.getLayers() || [];
        return layers.find(l => l.id === id) || null;
    }

    /**
     * Get layer context by ID
     * @param {string} layerId - Layer ID
     * @returns {CanvasRenderingContext2D|null}
     */
    getLayerContext(layerId) {
        const layer = this.findLayerById(layerId);
        return layer ? layer.canvas.getContext('2d') : null;
    }

    /**
     * Update render adapter with current settings
     */
    updateRenderAdapter() {
        if (!this.renderAdapter) return;

        const canvasWidth = this.app.canvas?.width || 1920;
        const canvasHeight = this.app.canvas?.height || 1080;

        this.renderAdapter.setCanvasSize(canvasWidth, canvasHeight);

        const viewMode = this.app.pixelArt?.enabled ? 'pixel_art' : 'digital';
        this.renderAdapter.setViewMode(viewMode, {
            pixelSize: this.app.pixelArt?.grid?.size || 1,
            gridSize: this.app.pixelArt?.grid?.subdivisions || 1,
            snapToGrid: this.app.pixelArt?.snap?.toGrid ?? true,
            palette: this.app.pixelArt?.palette?.colors || null
        });

        // Also update sync engine canvas size
        this.syncEngine?.setCanvasSize(canvasWidth, canvasHeight);
    }

    /**
     * Change view mode
     * @param {string} mode - New view mode
     * @param {Object} options - Mode options
     */
    changeViewMode(mode, options = {}) {
        if (this.renderAdapter) {
            this.renderAdapter.setViewMode(mode, options);
        }
    }

    /**
     * Send current canvas state to new participants
     */
    async sendCurrentState() {
        if (!this.app.layers) return;

        try {
            const state = await this.app.layers.serialize();
            const action = {
                type: ActionTypes.INITIAL_STATE,
                layerId: 'global',
                data: {
                    layers: state,
                    width: this.app.canvas?.width,
                    height: this.app.canvas?.height
                }
            };

            this.syncEngine?.sendAction(action);
        } catch (error) {
            console.error('[PaintNookSync] Failed to send state:', error);
        }
    }

    /**
     * Request initial state from host
     */
    async requestInitialState() {
        // The host will send state when participant joins
        // This is handled automatically by handleParticipantJoined
    }

    /**
     * Check if sync is active
     * @returns {boolean}
     */
    isConnected() {
        return this.isActive && this.syncEngine?.isConnected();
    }

    /**
     * Check if current user is host
     * @returns {boolean}
     */
    isHost() {
        return this.syncEngine?.isHost() ?? false;
    }

    /**
     * Get session ID
     * @returns {string|null}
     */
    getSessionId() {
        return this.syncEngine?.getSessionId();
    }

    /**
     * Disconnect from session
     */
    async disconnect() {
        if (this.syncEngine) {
            await this.syncEngine.disconnect();
        }
        this.isActive = false;
    }

    /**
     * Destroy the sync system
     */
    destroy() {
        this.disconnect();
        this.syncEngine?.destroy();
        this.syncEngine = null;
        this.renderAdapter = null;
    }
}

// Export as default for convenience
export default PaintNookSync;
