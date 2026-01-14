/**
 * Claude RCS Workspace - Peer Manager
 * WebRTC P2P connection management
 */

import { MessageType, ConnectionState, Role, RTC_CONFIG, TIMEOUTS } from './constants.js';
import { SignalingManager } from './signaling.js';
import {
    createMessage,
    createHandshake,
    createHandshakeAck,
    createPing,
    createPong,
    validateMessage,
    serializeMessage,
    deserializeMessage,
    generatePeerId
} from './protocol.js';

/**
 * Manages P2P connections via WebRTC
 */
export class PeerManager {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.signaling = new SignalingManager();

        this.role = null;
        this.peerId = generatePeerId();
        this.peerName = 'User-' + this.peerId;
        this.sessionId = null;

        this.connectedPeers = new Map();
        this.state = ConnectionState.DISCONNECTED;

        // Ping/pong for connection health
        this.pingInterval = null;
        this.lastPong = null;

        // Event callbacks
        this.onStateChange = null;
        this.onMessage = null;
        this.onPeerJoined = null;
        this.onPeerLeft = null;
        this.onError = null;
    }

    /**
     * Set user name
     */
    setName(name) {
        if (name && name.trim()) {
            this.peerName = name.trim().substring(0, 20);
        }
    }

    /**
     * Get current state info
     */
    getStateInfo() {
        return {
            state: this.state,
            role: this.role,
            peerId: this.peerId,
            peerName: this.peerName,
            sessionId: this.sessionId,
            peers: Array.from(this.connectedPeers.entries()).map(([id, info]) => ({
                id,
                ...info
            }))
        };
    }

    /**
     * Initialize as HOST
     * @returns {Promise<string>} Invite code to share
     */
    async initAsHost() {
        console.log('[PeerManager] Initializing as HOST');

        this.role = Role.HOST;
        this.sessionId = generatePeerId();
        this.setState(ConnectionState.CONNECTING);

        try {
            this.createPeerConnection();

            // Host creates the data channel
            this.dataChannel = this.peerConnection.createDataChannel('rcs', {
                ordered: true,
                maxRetransmits: 10
            });

            this.setupDataChannel();

            // Generate invite code
            const inviteCode = await this.signaling.generateInviteCode(this.peerConnection);

            console.log('[PeerManager] Host initialized, invite code ready');
            return inviteCode;

        } catch (error) {
            console.error('[PeerManager] Failed to initialize as host:', error);
            this.setState(ConnectionState.ERROR);
            throw error;
        }
    }

    /**
     * Initialize as CLIENT
     * @param {string} inviteCode Invite code from host
     * @returns {Promise<string>} Answer code to send back
     */
    async initAsClient(inviteCode) {
        console.log('[PeerManager] Initializing as CLIENT');

        this.role = Role.CLIENT;
        this.setState(ConnectionState.CONNECTING);

        try {
            this.createPeerConnection();

            // Client waits for data channel from host
            this.peerConnection.ondatachannel = (event) => {
                console.log('[PeerManager] Data channel received');
                this.dataChannel = event.channel;
                this.setupDataChannel();
            };

            // Generate answer code
            const answerCode = await this.signaling.generateAnswerCode(this.peerConnection, inviteCode);

            console.log('[PeerManager] Client initialized, answer code ready');
            return answerCode;

        } catch (error) {
            console.error('[PeerManager] Failed to initialize as client:', error);
            this.setState(ConnectionState.ERROR);
            throw error;
        }
    }

    /**
     * Complete connection (HOST applies client's answer)
     * @param {string} answerCode Answer code from client
     */
    async completeConnection(answerCode) {
        if (this.role !== Role.HOST) {
            console.error('[PeerManager] Only host can complete connection');
            return false;
        }

        try {
            const success = await this.signaling.applyAnswer(this.peerConnection, answerCode);

            if (success) {
                console.log('[PeerManager] Connection completing...');
            }

            return success;

        } catch (error) {
            console.error('[PeerManager] Failed to complete connection:', error);
            this.setState(ConnectionState.ERROR);
            return false;
        }
    }

    /**
     * Create RTCPeerConnection with configuration
     */
    createPeerConnection() {
        console.log('[PeerManager] Creating peer connection');

        this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

        // ICE connection state changes
        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection.iceConnectionState;
            console.log('[PeerManager] ICE connection state:', state);

            switch (state) {
                case 'connected':
                case 'completed':
                    // Connection established via ICE
                    break;

                case 'failed':
                    console.error('[PeerManager] ICE connection failed');
                    this.handleConnectionFailure();
                    break;

                case 'disconnected':
                    console.warn('[PeerManager] ICE disconnected');
                    // May reconnect, wait a bit
                    setTimeout(() => {
                        if (this.peerConnection?.iceConnectionState === 'disconnected') {
                            this.handleConnectionFailure();
                        }
                    }, 5000);
                    break;

                case 'closed':
                    this.setState(ConnectionState.DISCONNECTED);
                    break;
            }
        };

        // Connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log('[PeerManager] Connection state:', state);

            if (state === 'failed') {
                this.handleConnectionFailure();
            }
        };

        // ICE candidate errors
        this.peerConnection.onicecandidateerror = (event) => {
            console.warn('[PeerManager] ICE candidate error:', event.errorCode, event.errorText);
        };
    }

    /**
     * Setup data channel event handlers
     */
    setupDataChannel() {
        if (!this.dataChannel) {
            console.error('[PeerManager] No data channel to setup');
            return;
        }

        this.dataChannel.onopen = () => {
            console.log('[PeerManager] Data channel opened');
            this.setState(ConnectionState.CONNECTED);

            // Send handshake
            this.send(createHandshake(this.peerId, this.peerName, this.role));

            // Start ping interval
            this.startPingInterval();
        };

        this.dataChannel.onclose = () => {
            console.log('[PeerManager] Data channel closed');
            this.stopPingInterval();
            this.setState(ConnectionState.DISCONNECTED);
        };

        this.dataChannel.onerror = (error) => {
            console.error('[PeerManager] Data channel error:', error);
            if (this.onError) {
                this.onError(error);
            }
        };

        this.dataChannel.onmessage = (event) => {
            this.handleIncomingMessage(event.data);
        };
    }

    /**
     * Handle incoming message from data channel
     */
    handleIncomingMessage(data) {
        const message = deserializeMessage(data);

        if (!message) {
            console.warn('[PeerManager] Failed to parse message');
            return;
        }

        const validation = validateMessage(message);
        if (!validation.valid) {
            console.warn('[PeerManager] Invalid message:', validation.error);
            return;
        }

        // Handle internal messages
        switch (message.type) {
            case MessageType.HANDSHAKE:
                this.handleHandshake(message.payload);
                return;

            case MessageType.HANDSHAKE_ACK:
                this.handleHandshakeAck(message.payload);
                return;

            case MessageType.PING:
                this.handlePing(message);
                return;

            case MessageType.PONG:
                this.handlePong(message);
                return;
        }

        // Forward other messages to callback
        if (this.onMessage) {
            this.onMessage(message);
        }
    }

    /**
     * Handle handshake message
     */
    handleHandshake(payload) {
        console.log('[PeerManager] Handshake received from:', payload.peerName);

        // Store peer info
        this.connectedPeers.set(payload.peerId, {
            name: payload.peerName,
            role: payload.role,
            connectedAt: Date.now()
        });

        // If host, set session ID from peer
        if (this.role === Role.CLIENT && !this.sessionId) {
            this.sessionId = payload.peerId;
        }

        // Send acknowledgment
        this.send(createHandshakeAck(this.peerId, this.peerName, this.role));

        // Notify callback
        if (this.onPeerJoined) {
            this.onPeerJoined(payload);
        }
    }

    /**
     * Handle handshake acknowledgment
     */
    handleHandshakeAck(payload) {
        console.log('[PeerManager] Handshake ACK from:', payload.peerName);

        // Store peer info
        this.connectedPeers.set(payload.peerId, {
            name: payload.peerName,
            role: payload.role,
            connectedAt: Date.now()
        });

        // Notify callback
        if (this.onPeerJoined) {
            this.onPeerJoined(payload);
        }
    }

    /**
     * Handle ping message
     */
    handlePing(message) {
        this.send(createPong(message.id));
    }

    /**
     * Handle pong message
     */
    handlePong(message) {
        this.lastPong = Date.now();
        const latency = this.lastPong - message.payload.receivedAt;
        console.log('[PeerManager] Pong received, latency:', latency, 'ms');
    }

    /**
     * Start ping interval for connection health check
     */
    startPingInterval() {
        this.stopPingInterval();

        this.pingInterval = setInterval(() => {
            if (this.state === ConnectionState.CONNECTED) {
                this.send(createPing());
            }
        }, TIMEOUTS.pingInterval);
    }

    /**
     * Stop ping interval
     */
    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    /**
     * Send message through data channel
     * @param {Object} message Message object
     * @returns {boolean} Success
     */
    send(message) {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            console.warn('[PeerManager] Cannot send - data channel not open');
            return false;
        }

        try {
            const serialized = serializeMessage(message);
            if (!serialized) {
                return false;
            }

            this.dataChannel.send(serialized);
            return true;

        } catch (error) {
            console.error('[PeerManager] Failed to send message:', error);
            return false;
        }
    }

    /**
     * Handle connection failure
     */
    handleConnectionFailure() {
        console.error('[PeerManager] Connection failed');

        this.stopPingInterval();

        // Notify about peers leaving
        for (const [peerId, peerInfo] of this.connectedPeers) {
            if (this.onPeerLeft) {
                this.onPeerLeft({ peerId, peerName: peerInfo.name });
            }
        }

        this.connectedPeers.clear();
        this.setState(ConnectionState.ERROR);

        if (this.onError) {
            this.onError(new Error('Connection failed'));
        }
    }

    /**
     * Update state and notify callback
     */
    setState(newState) {
        if (this.state === newState) return;

        const oldState = this.state;
        this.state = newState;

        console.log('[PeerManager] State changed:', oldState, '->', newState);

        if (this.onStateChange) {
            this.onStateChange(newState, oldState);
        }
    }

    /**
     * Disconnect and cleanup
     */
    disconnect() {
        console.log('[PeerManager] Disconnecting...');

        this.stopPingInterval();

        // Close data channel
        if (this.dataChannel) {
            try {
                this.dataChannel.close();
            } catch (e) {
                console.warn('[PeerManager] Error closing data channel:', e);
            }
            this.dataChannel = null;
        }

        // Close peer connection
        if (this.peerConnection) {
            try {
                this.peerConnection.close();
            } catch (e) {
                console.warn('[PeerManager] Error closing peer connection:', e);
            }
            this.peerConnection = null;
        }

        // Clear state
        this.connectedPeers.clear();
        this.role = null;
        this.sessionId = null;

        this.setState(ConnectionState.DISCONNECTED);

        console.log('[PeerManager] Disconnected');
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.state === ConnectionState.CONNECTED &&
               this.dataChannel?.readyState === 'open';
    }

    /**
     * Get connected peer count
     */
    getPeerCount() {
        return this.connectedPeers.size;
    }
}
