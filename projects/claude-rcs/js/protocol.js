/**
 * Claude RCS Workspace - Protocol
 * Message creation and validation for RCS communication
 */

import { MessageType } from './constants.js';

/**
 * Generate unique ID
 */
export function generateId() {
    return crypto.randomUUID ? crypto.randomUUID() :
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
}

/**
 * Generate short peer ID
 */
export function generatePeerId() {
    return generateId().substring(0, 8);
}

/**
 * Create base message structure
 */
export function createMessage(type, payload = {}) {
    return {
        type,
        payload,
        timestamp: Date.now(),
        id: generateId()
    };
}

/**
 * Create handshake message
 */
export function createHandshake(peerId, peerName, role) {
    return createMessage(MessageType.HANDSHAKE, {
        peerId,
        peerName,
        role,
        version: '1.0'
    });
}

/**
 * Create handshake acknowledgment
 */
export function createHandshakeAck(peerId, peerName, role) {
    return createMessage(MessageType.HANDSHAKE_ACK, {
        peerId,
        peerName,
        role,
        version: '1.0'
    });
}

/**
 * Create ping message
 */
export function createPing() {
    return createMessage(MessageType.PING, {
        sentAt: Date.now()
    });
}

/**
 * Create pong message
 */
export function createPong(pingId) {
    return createMessage(MessageType.PONG, {
        pingId,
        receivedAt: Date.now()
    });
}

/**
 * Create prompt submit message
 */
export function createPromptSubmit(text, sender, senderId) {
    return createMessage(MessageType.PROMPT_SUBMIT, {
        text,
        sender,
        senderId,
        promptId: generateId()
    });
}

/**
 * Create prompt approved message
 */
export function createPromptApproved(promptId, editedText = null) {
    return createMessage(MessageType.PROMPT_APPROVED, {
        promptId,
        editedText,
        approvedAt: Date.now()
    });
}

/**
 * Create prompt rejected message
 */
export function createPromptRejected(promptId, reason = '') {
    return createMessage(MessageType.PROMPT_REJECTED, {
        promptId,
        reason,
        rejectedAt: Date.now()
    });
}

/**
 * Create output start message
 */
export function createOutputStart(promptId) {
    return createMessage(MessageType.OUTPUT_START, {
        promptId,
        startedAt: Date.now()
    });
}

/**
 * Create output chunk message
 */
export function createOutputChunk(chunk, promptId, index) {
    return createMessage(MessageType.OUTPUT_CHUNK, {
        chunk,
        promptId,
        index
    });
}

/**
 * Create output end message
 */
export function createOutputEnd(promptId, totalChunks) {
    return createMessage(MessageType.OUTPUT_END, {
        promptId,
        totalChunks,
        endedAt: Date.now()
    });
}

/**
 * Create workspace update message
 */
export function createWorkspaceUpdate(content, cursor = null) {
    return createMessage(MessageType.WORKSPACE_UPDATE, {
        content,
        cursor,
        updatedAt: Date.now()
    });
}

/**
 * Create workspace sync request
 */
export function createWorkspaceSync() {
    return createMessage(MessageType.WORKSPACE_SYNC, {
        requestedAt: Date.now()
    });
}

/**
 * Create cursor update message
 */
export function createCursorUpdate(position, selection = null) {
    return createMessage(MessageType.CURSOR_UPDATE, {
        position,
        selection
    });
}

/**
 * Create peer joined notification
 */
export function createPeerJoined(peerId, peerName, role) {
    return createMessage(MessageType.PEER_JOINED, {
        peerId,
        peerName,
        role,
        joinedAt: Date.now()
    });
}

/**
 * Create peer left notification
 */
export function createPeerLeft(peerId, peerName) {
    return createMessage(MessageType.PEER_LEFT, {
        peerId,
        peerName,
        leftAt: Date.now()
    });
}

/**
 * Validate incoming message
 */
export function validateMessage(message) {
    if (!message || typeof message !== 'object') {
        return { valid: false, error: 'Message must be an object' };
    }

    if (!message.type) {
        return { valid: false, error: 'Message type is required' };
    }

    if (!Object.values(MessageType).includes(message.type)) {
        return { valid: false, error: `Unknown message type: ${message.type}` };
    }

    if (!message.timestamp || typeof message.timestamp !== 'number') {
        return { valid: false, error: 'Valid timestamp is required' };
    }

    if (!message.id) {
        return { valid: false, error: 'Message ID is required' };
    }

    return { valid: true };
}

/**
 * Serialize message for transmission
 */
export function serializeMessage(message) {
    try {
        return JSON.stringify(message);
    } catch (error) {
        console.error('[Protocol] Failed to serialize message:', error);
        return null;
    }
}

/**
 * Deserialize received message
 */
export function deserializeMessage(data) {
    try {
        return JSON.parse(data);
    } catch (error) {
        console.error('[Protocol] Failed to deserialize message:', error);
        return null;
    }
}

/**
 * Check if message is a response to another message
 */
export function isResponseTo(message, originalId) {
    return message.payload && message.payload.replyTo === originalId;
}

/**
 * Get message age in milliseconds
 */
export function getMessageAge(message) {
    return Date.now() - message.timestamp;
}

/**
 * Check if message is expired (older than maxAge)
 */
export function isMessageExpired(message, maxAge = 60000) {
    return getMessageAge(message) > maxAge;
}
