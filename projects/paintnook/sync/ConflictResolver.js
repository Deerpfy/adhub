/**
 * ConflictResolver - Handles conflict resolution for simultaneous actions
 *
 * Strategies:
 * - host-override: Host actions always win in conflicts
 * - crdt: All actions are preserved using CRDT merge
 * - last-write-wins: Latest timestamp wins
 */

import { ConflictStrategies } from './types.js';

export class ConflictResolver {
    constructor(config = {}) {
        this.config = {
            hostOverride: config.hostOverride ?? true,
            conflictWindow: config.conflictWindow || 500, // ms
            mergeStrategy: config.mergeStrategy || ConflictStrategies.HOST_OVERRIDE
        };

        // Track recent actions for conflict detection
        this.recentActions = new Map(); // conflictKey -> [actions]
        this.cleanupInterval = null;

        this.startCleanup();
    }

    /**
     * Resolve an incoming action against the current state
     * @param {Object} incomingAction - The incoming UAF action
     * @param {Object} state - Current sync engine state
     * @returns {Object|null} - Resolved action or null if rejected
     */
    resolve(incomingAction, state) {
        switch (this.config.mergeStrategy) {
            case ConflictStrategies.HOST_OVERRIDE:
                return this.resolveHostPriority(incomingAction, state);
            case ConflictStrategies.CRDT:
                return this.resolveCRDT(incomingAction, state);
            case ConflictStrategies.LAST_WRITE_WINS:
            default:
                return this.resolveLastWriteWins(incomingAction, state);
        }
    }

    /**
     * Host priority resolution - host actions override client actions in conflicts
     * @param {Object} action - Incoming action
     * @param {Object} state - Current state
     * @returns {Object|null}
     */
    resolveHostPriority(action, state) {
        const conflictKey = this.getConflictKey(action);
        const recentConflicts = this.recentActions.get(conflictKey) || [];
        const now = Date.now();

        // Filter to only recent conflicts within the window
        const conflicts = recentConflicts.filter(a =>
            now - a.timestamp < this.config.conflictWindow
        );

        // Host actions (priority=1) always pass through
        if (action.priority === 1) {
            // Mark any conflicting client actions as overridden
            conflicts.forEach(c => {
                if (c.priority < 1) {
                    action.overrides = action.overrides || [];
                    action.overrides.push(c.id);
                }
            });
            this.addToRecent(conflictKey, action);
            return action;
        }

        // Client actions (priority=0) - check for host conflicts
        const hostConflict = conflicts.find(c => c.priority === 1);
        if (hostConflict) {
            // Reject client action due to host conflict
            console.log('[ConflictResolver] Rejecting client action due to host conflict:', action.id);
            return null;
        }

        // No host conflict, accept the action
        this.addToRecent(conflictKey, action);
        return action;
    }

    /**
     * CRDT resolution - all actions are preserved, visual merging
     * @param {Object} action - Incoming action
     * @param {Object} state - Current state
     * @returns {Object}
     */
    resolveCRDT(action, state) {
        // In CRDT mode, all actions are accepted and rendered
        // The visual result is the combination of all actions
        this.addToRecent(this.getConflictKey(action), action);
        return action;
    }

    /**
     * Last write wins resolution - latest timestamp wins
     * @param {Object} action - Incoming action
     * @param {Object} state - Current state
     * @returns {Object}
     */
    resolveLastWriteWins(action, state) {
        const conflictKey = this.getConflictKey(action);
        const recentConflicts = this.recentActions.get(conflictKey) || [];
        const now = Date.now();

        // Filter to recent conflicts
        const conflicts = recentConflicts.filter(a =>
            now - a.timestamp < this.config.conflictWindow
        );

        // Check if there's a newer action
        const newerAction = conflicts.find(c => c.timestamp > action.timestamp);
        if (newerAction) {
            // This action is older, but we still apply it (for eventual consistency)
            // The newer action will override visually
            action.supersededBy = newerAction.id;
        }

        this.addToRecent(conflictKey, action);
        return action;
    }

    /**
     * Generate a conflict key for an action
     * Actions with the same key may conflict
     * @param {Object} action - The action
     * @returns {string}
     */
    getConflictKey(action) {
        // For strokes, use spatial partitioning based on starting point
        if (action.type === 'stroke' && action.data?.points?.length > 0) {
            const p = action.data.points[0];
            // Divide canvas into 10x10 grid for conflict detection
            const gridX = Math.floor(p.x * 10);
            const gridY = Math.floor(p.y * 10);
            return `${action.layerId}:stroke:${gridX}:${gridY}`;
        }

        // For fills, use the starting point
        if (action.type === 'fill' && action.data?.point) {
            const p = action.data.point;
            const gridX = Math.floor(p.x * 10);
            const gridY = Math.floor(p.y * 10);
            return `${action.layerId}:fill:${gridX}:${gridY}`;
        }

        // For layer operations, use layer ID
        if (action.type.startsWith('layer_')) {
            return `${action.layerId}:${action.type}`;
        }

        // Default: use layer and type
        return `${action.layerId}:${action.type}:global`;
    }

    /**
     * Add action to recent actions map
     * @param {string} key - Conflict key
     * @param {Object} action - The action
     */
    addToRecent(key, action) {
        if (!this.recentActions.has(key)) {
            this.recentActions.set(key, []);
        }

        const list = this.recentActions.get(key);
        list.push({
            id: action.id,
            timestamp: action.timestamp,
            priority: action.priority,
            authorId: action.authorId
        });

        // Keep only recent actions (2x conflict window)
        const cutoff = Date.now() - (this.config.conflictWindow * 2);
        this.recentActions.set(key,
            list.filter(a => a.timestamp > cutoff)
        );
    }

    /**
     * Start periodic cleanup of old conflict data
     */
    startCleanup() {
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, this.config.conflictWindow * 2);
    }

    /**
     * Clean up old conflict data
     */
    cleanup() {
        const cutoff = Date.now() - (this.config.conflictWindow * 2);

        for (const [key, actions] of this.recentActions.entries()) {
            const filtered = actions.filter(a => a.timestamp > cutoff);
            if (filtered.length === 0) {
                this.recentActions.delete(key);
            } else {
                this.recentActions.set(key, filtered);
            }
        }
    }

    /**
     * Check if two actions conflict
     * @param {Object} action1 - First action
     * @param {Object} action2 - Second action
     * @returns {boolean}
     */
    actionsConflict(action1, action2) {
        // Same conflict key
        if (this.getConflictKey(action1) !== this.getConflictKey(action2)) {
            return false;
        }

        // Within conflict window
        const timeDiff = Math.abs(action1.timestamp - action2.timestamp);
        return timeDiff < this.config.conflictWindow;
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Destroy the resolver
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.recentActions.clear();
    }
}
