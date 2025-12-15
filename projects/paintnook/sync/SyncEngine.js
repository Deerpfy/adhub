/**
 * SyncEngine - Main synchronization engine with retry logic
 *
 * Features:
 * - Session management (create, join, leave)
 * - Action normalization to UAF format
 * - Retry logic with exponential backoff
 * - Event-based architecture
 */

import { ActionTypes, createAction, parseColor, generateUUID, validateAction } from './types.js';
import { ConflictResolver } from './ConflictResolver.js';
import { ActionQueue } from './ActionQueue.js';

const DEFAULT_CONFIG = {
    retry: {
        maxAttempts: 5,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitter: 0.1
    },
    batch: {
        maxSize: 50,
        flushInterval: 16,
        maxLatency: 100
    },
    priority: {
        hostOverride: true,
        conflictWindow: 500,
        mergeStrategy: 'host-override'
    },
    heartbeat: {
        interval: 5000,
        timeout: 15000
    }
};

export class SyncEngine {
    constructor(config = {}) {
        this.config = this.mergeConfig(DEFAULT_CONFIG, config);

        this.state = {
            connected: false,
            role: null, // 'host' | 'client'
            sessionId: null,
            localParticipantId: null,
            participants: new Map(),
            vectorClock: 0,
            pendingActions: [],
            acknowledgedActions: new Set()
        };

        this.listeners = new Map();
        this.actionQueue = new ActionQueue(this.config.batch);
        this.conflictResolver = new ConflictResolver(this.config.priority);
        this.transport = null;
        this.retryState = new Map();
        this.heartbeatTimer = null;

        // Canvas dimensions for normalization
        this.canvasWidth = 1920;
        this.canvasHeight = 1080;

        // Setup action queue flush callback
        this.actionQueue.setFlushCallback((actions) => {
            this.sendBatch(actions);
        });
    }

    /**
     * Deep merge configuration objects
     */
    mergeConfig(defaults, overrides) {
        const result = { ...defaults };
        for (const key in overrides) {
            if (typeof overrides[key] === 'object' && !Array.isArray(overrides[key])) {
                result[key] = this.mergeConfig(defaults[key] || {}, overrides[key]);
            } else {
                result[key] = overrides[key];
            }
        }
        return result;
    }

    /**
     * Set canvas dimensions for coordinate normalization
     */
    setCanvasSize(width, height) {
        this.canvasWidth = width || 1;
        this.canvasHeight = height || 1;
    }

    // ==========================================
    // EVENT SYSTEM
    // ==========================================

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} - Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return () => this.listeners.get(event).delete(callback);
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => {
                try {
                    cb(data);
                } catch (error) {
                    console.error(`[SyncEngine] Event handler error for ${event}:`, error);
                }
            });
        }
    }

    // ==========================================
    // SESSION MANAGEMENT
    // ==========================================

    /**
     * Create a new session as host
     * @param {string} nickname - Host nickname
     * @param {string} password - Optional password
     * @param {Object} options - Session options
     * @returns {Promise<Object>} - Session info
     */
    async createSession(nickname, password = null, options = {}) {
        this.state.role = 'host';
        this.state.sessionId = this.generateSessionId();
        this.state.localParticipantId = generateUUID();

        const host = {
            id: this.state.localParticipantId,
            nickname: nickname || 'Host',
            role: 'host',
            color: options.color || this.generateColor()
        };

        this.state.participants.set(host.id, host);

        const sessionConfig = {
            id: this.state.sessionId,
            host,
            password: password ? await this.hashPassword(password) : null,
            options: {
                allowGuestDraw: options.allowGuestDraw ?? true,
                hostPriority: options.hostPriority ?? true,
                conflictMode: options.conflictMode ?? 'host-override'
            },
            created: Date.now()
        };

        this.state.connected = true;
        this.startHeartbeat();

        this.emit('session:created', sessionConfig);
        return sessionConfig;
    }

    /**
     * Join an existing session as guest
     * @param {string} sessionId - Session ID to join
     * @param {string} nickname - Guest nickname
     * @param {string} password - Optional password
     * @returns {Promise<Object>} - Participant info
     */
    async joinSession(sessionId, nickname, password = null) {
        this.state.role = 'client';
        this.state.sessionId = sessionId;
        this.state.localParticipantId = generateUUID();

        const participant = {
            id: this.state.localParticipantId,
            nickname: nickname || 'Guest',
            role: 'client',
            color: this.generateColor()
        };

        this.state.participants.set(participant.id, participant);
        this.state.connected = true;
        this.startHeartbeat();

        this.emit('session:joined', { sessionId, participant });
        return participant;
    }

    /**
     * Disconnect from the current session
     */
    async disconnect() {
        this.stopHeartbeat();
        this.actionQueue.clear();

        if (this.transport) {
            try {
                await this.transport.close?.();
            } catch (e) {
                console.warn('[SyncEngine] Transport close error:', e);
            }
        }

        this.state.connected = false;
        this.state.role = null;
        this.state.sessionId = null;
        this.state.participants.clear();
        this.state.acknowledgedActions.clear();
        this.retryState.clear();

        this.emit('session:disconnected');
    }

    // ==========================================
    // ACTION SENDING
    // ==========================================

    /**
     * Send an action with automatic normalization and retry
     * @param {Object} localAction - Local action in app format
     * @returns {Promise<Object>} - Result with success status
     */
    async sendAction(localAction) {
        if (!this.state.connected) {
            return { success: false, error: 'Not connected' };
        }

        // Normalize to UAF
        const uafAction = this.normalizeAction(localAction);
        uafAction.vectorClock = ++this.state.vectorClock;
        uafAction.authorId = this.state.localParticipantId;
        uafAction.priority = this.state.role === 'host' && this.config.priority.hostOverride ? 1 : 0;

        // Optimistic local update
        this.emit('action:local', uafAction);

        // Queue for sending
        this.actionQueue.enqueue(uafAction);

        return { success: true, action: uafAction };
    }

    /**
     * Send a batch of actions
     * @param {Array} actions - Array of actions to send
     */
    async sendBatch(actions) {
        if (!this.state.connected || !this.transport) {
            return;
        }

        for (const action of actions) {
            this.sendWithRetry(action).catch(error => {
                console.error('[SyncEngine] Failed to send action:', error);
            });
        }
    }

    /**
     * Send action with exponential backoff retry
     * @param {Object} action - UAF action
     * @param {number} attempt - Current attempt number
     * @returns {Promise<Object>}
     */
    async sendWithRetry(action, attempt = 0) {
        const { maxAttempts, baseDelay, maxDelay, backoffMultiplier, jitter } = this.config.retry;

        try {
            if (!this.transport) {
                throw new Error('Transport not available');
            }

            await this.transport.send(action);

            this.state.acknowledgedActions.add(action.id);
            this.retryState.delete(action.id);
            this.emit('action:acknowledged', action);

            return { success: true, action };

        } catch (error) {
            if (attempt >= maxAttempts) {
                this.emit('action:failed', { action, error, attempts: attempt });
                this.retryState.delete(action.id);
                return { success: false, action, error };
            }

            // Calculate delay with exponential backoff and jitter
            const delay = Math.min(
                baseDelay * Math.pow(backoffMultiplier, attempt),
                maxDelay
            );
            const jitteredDelay = delay * (1 + (Math.random() - 0.5) * 2 * jitter);

            this.retryState.set(action.id, attempt + 1);
            this.emit('action:retry', { action, attempt: attempt + 1, delay: jitteredDelay });

            await this.sleep(jitteredDelay);
            return this.sendWithRetry(action, attempt + 1);
        }
    }

    // ==========================================
    // ACTION RECEIVING
    // ==========================================

    /**
     * Handle incoming action from transport
     * @param {Object|string} rawAction - Raw action data
     */
    handleRemoteAction(rawAction) {
        const action = typeof rawAction === 'string' ? JSON.parse(rawAction) : rawAction;

        // Validate
        if (!validateAction(action)) {
            console.warn('[SyncEngine] Invalid action received:', action);
            this.emit('action:invalid', action);
            return;
        }

        // Deduplicate
        if (this.state.acknowledgedActions.has(action.id)) {
            return;
        }

        // Skip own actions
        if (action.authorId === this.state.localParticipantId) {
            return;
        }

        // Resolve conflicts
        const resolvedAction = this.conflictResolver.resolve(action, this.state);

        if (resolvedAction) {
            this.state.acknowledgedActions.add(action.id);
            this.state.vectorClock = Math.max(this.state.vectorClock, action.vectorClock);

            // Update participant info if not known
            if (!this.state.participants.has(action.authorId)) {
                this.state.participants.set(action.authorId, {
                    id: action.authorId,
                    nickname: 'Unknown',
                    role: 'client'
                });
            }

            this.emit('action:received', resolvedAction);
        } else {
            this.emit('action:rejected', { action, reason: 'conflict' });
        }
    }

    /**
     * Handle participant joining
     * @param {Object} participant - Participant info
     */
    handleParticipantJoined(participant) {
        this.state.participants.set(participant.id, participant);
        this.emit('participant:joined', participant);
    }

    /**
     * Handle participant leaving
     * @param {string} participantId - Participant ID
     */
    handleParticipantLeft(participantId) {
        const participant = this.state.participants.get(participantId);
        this.state.participants.delete(participantId);
        this.emit('participant:left', { id: participantId, participant });
    }

    // ==========================================
    // ACTION NORMALIZATION
    // ==========================================

    /**
     * Normalize a local action to UAF format
     * @param {Object} localAction - Action in app format
     * @returns {Object} - UAF action
     */
    normalizeAction(localAction) {
        return {
            id: generateUUID(),
            type: localAction.type,
            authorId: null,
            timestamp: Date.now(),
            vectorClock: 0,
            layerId: localAction.layerId,
            priority: 0,
            data: this.normalizeActionData(localAction)
        };
    }

    /**
     * Normalize action data based on type
     * @param {Object} action - Local action
     * @returns {Object} - Normalized data
     */
    normalizeActionData(action) {
        const w = this.canvasWidth;
        const h = this.canvasHeight;

        switch (action.type) {
            case ActionTypes.STROKE:
                return {
                    points: (action.points || []).map(p => ({
                        x: p.x / w,
                        y: p.y / h,
                        pressure: p.pressure ?? 1,
                        timestamp: p.timestamp || Date.now()
                    })),
                    color: typeof action.color === 'string' ? parseColor(action.color) : action.color,
                    brushType: action.brushType || 'round',
                    brushSize: (action.brushSize || 10) / w,
                    hardness: action.hardness ?? 1,
                    opacity: action.opacity ?? 1,
                    blendMode: action.blendMode || 'source-over',
                    smoothing: action.smoothing ?? 0
                };

            case ActionTypes.SHAPE:
                return {
                    shapeType: action.shapeType,
                    bounds: {
                        x: action.bounds.x / w,
                        y: action.bounds.y / h,
                        width: action.bounds.width / w,
                        height: action.bounds.height / h
                    },
                    fill: action.fill ? (typeof action.fill === 'string' ? parseColor(action.fill) : action.fill) : null,
                    stroke: action.stroke ? (typeof action.stroke === 'string' ? parseColor(action.stroke) : action.stroke) : null,
                    strokeWidth: (action.strokeWidth || 1) / w,
                    filled: action.filled ?? false,
                    params: action.params || {}
                };

            case ActionTypes.FILL:
                return {
                    point: {
                        x: action.point.x / w,
                        y: action.point.y / h,
                        pressure: 1,
                        timestamp: Date.now()
                    },
                    color: typeof action.color === 'string' ? parseColor(action.color) : action.color,
                    tolerance: action.tolerance ?? 0,
                    contiguous: action.contiguous ?? true
                };

            case ActionTypes.ERASE:
                return {
                    points: (action.points || []).map(p => ({
                        x: p.x / w,
                        y: p.y / h,
                        pressure: p.pressure ?? 1,
                        timestamp: p.timestamp || Date.now()
                    })),
                    size: (action.size || 10) / w,
                    hardness: action.hardness ?? 1
                };

            case ActionTypes.LAYER_VISIBILITY:
            case ActionTypes.LAYER_OPACITY:
            case ActionTypes.LAYER_BLEND_MODE:
            case ActionTypes.LAYER_ADD:
            case ActionTypes.LAYER_REMOVE:
            case ActionTypes.LAYER_MOVE:
                return action.data || action;

            default:
                return action.data || action;
        }
    }

    /**
     * Denormalize UAF action to canvas coordinates
     * @param {Object} action - UAF action
     * @returns {Object} - Action with canvas coordinates
     */
    denormalizeAction(action) {
        const w = this.canvasWidth;
        const h = this.canvasHeight;

        const denormalized = { ...action };

        switch (action.type) {
            case ActionTypes.STROKE:
                denormalized.data = {
                    ...action.data,
                    points: action.data.points.map(p => ({
                        x: p.x * w,
                        y: p.y * h,
                        pressure: p.pressure,
                        timestamp: p.timestamp
                    })),
                    brushSize: action.data.brushSize * w
                };
                break;

            case ActionTypes.SHAPE:
                denormalized.data = {
                    ...action.data,
                    bounds: {
                        x: action.data.bounds.x * w,
                        y: action.data.bounds.y * h,
                        width: action.data.bounds.width * w,
                        height: action.data.bounds.height * h
                    },
                    strokeWidth: action.data.strokeWidth * w
                };
                break;

            case ActionTypes.FILL:
                denormalized.data = {
                    ...action.data,
                    point: {
                        x: action.data.point.x * w,
                        y: action.data.point.y * h
                    }
                };
                break;

            case ActionTypes.ERASE:
                denormalized.data = {
                    ...action.data,
                    points: action.data.points.map(p => ({
                        x: p.x * w,
                        y: p.y * h,
                        pressure: p.pressure,
                        timestamp: p.timestamp
                    })),
                    size: action.data.size * w
                };
                break;
        }

        return denormalized;
    }

    // ==========================================
    // TRANSPORT
    // ==========================================

    /**
     * Set the transport layer
     * @param {Object} transport - Transport with send/close methods
     */
    setTransport(transport) {
        this.transport = transport;
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Generate a short session ID
     * @returns {string}
     */
    generateSessionId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Generate a random color for participant identification
     * @returns {string}
     */
    generateColor() {
        const colors = [
            '#ef4444', '#f97316', '#eab308', '#22c55e',
            '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Hash a password for session protection
     * @param {string} password - Plain text password
     * @returns {Promise<string>}
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Sleep helper
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Start heartbeat
     */
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            if (this.transport && this.state.connected) {
                this.transport.send?.({ type: 'heartbeat', timestamp: Date.now() }).catch(() => {});
            }
        }, this.config.heartbeat.interval);
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * Get local participant ID
     * @returns {string|null}
     */
    getLocalParticipantId() {
        return this.state.localParticipantId;
    }

    /**
     * Check if connected
     * @returns {boolean}
     */
    isConnected() {
        return this.state.connected;
    }

    /**
     * Check if host
     * @returns {boolean}
     */
    isHost() {
        return this.state.role === 'host';
    }

    /**
     * Get session ID
     * @returns {string|null}
     */
    getSessionId() {
        return this.state.sessionId;
    }

    /**
     * Get all participants
     * @returns {Map}
     */
    getParticipants() {
        return this.state.participants;
    }

    /**
     * Destroy the engine
     */
    destroy() {
        this.disconnect();
        this.actionQueue.destroy();
        this.conflictResolver.destroy();
        this.listeners.clear();
    }
}
