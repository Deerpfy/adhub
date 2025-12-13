/**
 * CollaborationManager - P2P real-time collaboration using PeerJS
 * Handles live sessions with password protection
 */
export class CollaborationManager {
    constructor(app) {
        this.app = app;
        this.peer = null;
        this.connections = new Map(); // peerId -> connection
        this.isHost = false;
        this.hostConnection = null; // Connection to host (for guests)
        this.roomId = null;
        this.password = null;
        this.allowDraw = true;
        this.participants = new Map(); // peerId -> {name, color, canDraw}
        this.myColor = this.generateColor();
        this.myName = 'Uživatel ' + Math.floor(Math.random() * 1000);
        this.remoteCursors = new Map(); // peerId -> cursor element
        this.isJoining = false; // Prevent multiple join attempts

        // Check if joining a room from URL
        this.checkUrlForRoom();
    }

    /**
     * Generate a random color for cursor/identification
     */
    generateColor() {
        const colors = [
            '#ef4444', '#f97316', '#eab308', '#22c55e',
            '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Generate a short room ID
     */
    generateRoomId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Check URL for room parameter
     */
    checkUrlForRoom() {
        const params = new URLSearchParams(window.location.search);
        const roomId = params.get('room');
        if (roomId) {
            this.roomId = roomId;
            // Show join modal
            setTimeout(() => {
                this.showJoinModal();
            }, 500);
        }
    }

    /**
     * Start a new session as host
     */
    async startSession(password = '', allowDraw = true) {
        this.roomId = this.generateRoomId();
        this.password = password;
        this.allowDraw = allowDraw;
        this.isHost = true;

        return new Promise((resolve, reject) => {
            // Create peer with room ID as the peer ID
            this.peer = new Peer('paint-studio-' + this.roomId, {
                debug: 1
            });

            this.peer.on('open', (id) => {
                console.log('[Collab] Session started with ID:', this.roomId);

                // Listen for incoming connections
                this.peer.on('connection', (conn) => {
                    this.handleIncomingConnection(conn);
                });

                resolve(this.roomId);
            });

            this.peer.on('error', (err) => {
                console.error('[Collab] Peer error:', err);
                if (err.type === 'unavailable-id') {
                    reject(new Error('Relace s tímto ID již existuje. Zkuste to znovu.'));
                } else {
                    reject(err);
                }
            });
        });
    }

    /**
     * Handle incoming connection from a guest
     */
    handleIncomingConnection(conn) {
        console.log('[Collab] Incoming connection from:', conn.peer);

        conn.on('open', () => {
            // Wait for authentication message
            conn.once('data', (data) => {
                if (data.type === 'auth') {
                    if (this.password && data.password !== this.password) {
                        conn.send({ type: 'auth-failed', reason: 'Nesprávné heslo' });
                        conn.close();
                        return;
                    }

                    // Authentication successful
                    const participant = {
                        name: data.name || 'Host',
                        color: data.color || '#888888',
                        canDraw: this.allowDraw
                    };

                    this.participants.set(conn.peer, participant);
                    this.connections.set(conn.peer, conn);

                    // Send auth success with current canvas state
                    conn.send({
                        type: 'auth-success',
                        canDraw: this.allowDraw,
                        canvasState: this.getCanvasState(),
                        participants: Array.from(this.participants.entries())
                    });

                    // Notify all other participants
                    this.broadcast({
                        type: 'participant-joined',
                        peerId: conn.peer,
                        participant: participant
                    }, conn.peer);

                    // Set up message handler
                    conn.on('data', (msg) => this.handleMessage(msg, conn.peer));

                    // Handle disconnect
                    conn.on('close', () => {
                        this.handleParticipantLeft(conn.peer);
                    });

                    // Update UI
                    this.updateParticipantUI();
                }
            });
        });
    }

    /**
     * Join an existing session as guest
     */
    async joinSession(roomId, password = '') {
        // Prevent multiple simultaneous join attempts
        if (this.isJoining) {
            console.log('[Collab] Already joining, ignoring...');
            return Promise.reject(new Error('Připojování již probíhá'));
        }

        // Cleanup any existing peer
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }

        this.isJoining = true;
        this.roomId = roomId;
        this.isHost = false;

        const CONNECTION_TIMEOUT = 15000; // 15 seconds timeout

        return new Promise((resolve, reject) => {
            let timeoutId = null;
            let resolved = false;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                this.isJoining = false;
            };

            const doReject = (error) => {
                if (resolved) return;
                resolved = true;
                cleanup();
                if (this.peer) {
                    this.peer.destroy();
                    this.peer = null;
                }
                reject(error);
            };

            const doResolve = (result) => {
                if (resolved) return;
                resolved = true;
                cleanup();
                resolve(result);
            };

            // Set timeout
            timeoutId = setTimeout(() => {
                doReject(new Error('Připojení vypršelo. Host neodpovídá.'));
            }, CONNECTION_TIMEOUT);

            this.peer = new Peer({
                debug: 0 // Reduce debug noise
            });

            this.peer.on('open', (myId) => {
                console.log('[Collab] My peer ID:', myId);

                // Connect to host
                const conn = this.peer.connect('paint-studio-' + roomId, {
                    reliable: true
                });

                conn.on('open', () => {
                    console.log('[Collab] Connection opened, sending auth...');

                    // Send authentication
                    conn.send({
                        type: 'auth',
                        password: password,
                        name: this.myName,
                        color: this.myColor
                    });

                    // Wait for response
                    conn.once('data', (data) => {
                        console.log('[Collab] Received response:', data.type);

                        if (data.type === 'auth-failed') {
                            conn.close();
                            doReject(new Error(data.reason || 'Připojení odmítnuto'));
                        } else if (data.type === 'auth-success') {
                            this.hostConnection = conn;
                            this.allowDraw = data.canDraw;

                            // Load canvas state
                            if (data.canvasState) {
                                this.loadCanvasState(data.canvasState);
                            }

                            // Load participants
                            if (data.participants) {
                                data.participants.forEach(([peerId, participant]) => {
                                    this.participants.set(peerId, participant);
                                });
                            }

                            // Set up message handler
                            conn.on('data', (msg) => this.handleMessage(msg, 'host'));

                            // Handle disconnect
                            conn.on('close', () => {
                                this.handleHostDisconnected();
                            });

                            doResolve({ canDraw: this.allowDraw });
                        }
                    });
                });

                conn.on('error', (err) => {
                    console.error('[Collab] Connection error:', err);
                    doReject(new Error('Nepodařilo se připojit k relaci'));
                });
            });

            this.peer.on('error', (err) => {
                console.error('[Collab] Peer error:', err);
                if (err.type === 'peer-unavailable') {
                    doReject(new Error('Relace neexistuje nebo host není dostupný'));
                } else {
                    doReject(new Error('Chyba připojení: ' + err.message));
                }
            });
        });
    }

    /**
     * Handle incoming messages
     */
    handleMessage(data, fromPeerId) {
        switch (data.type) {
            case 'stroke-start':
                this.handleRemoteStrokeStart(data, fromPeerId);
                break;
            case 'stroke-move':
                this.handleRemoteStrokeMove(data, fromPeerId);
                break;
            case 'stroke-end':
                this.handleRemoteStrokeEnd(data, fromPeerId);
                break;
            case 'cursor-move':
                this.handleRemoteCursor(data, fromPeerId);
                break;
            case 'layer-change':
                this.handleLayerChange(data);
                break;
            case 'participant-joined':
                this.participants.set(data.peerId, data.participant);
                this.updateParticipantUI();
                break;
            case 'participant-left':
                this.handleParticipantLeft(data.peerId);
                break;
            case 'session-ended':
                this.handleSessionEnded();
                break;
            default:
                console.log('[Collab] Unknown message type:', data.type);
        }

        // If host, relay messages to other participants
        if (this.isHost && fromPeerId !== 'host') {
            this.broadcast(data, fromPeerId);
        }
    }

    /**
     * Broadcast message to all connected peers
     */
    broadcast(data, excludePeerId = null) {
        this.connections.forEach((conn, peerId) => {
            if (peerId !== excludePeerId && conn.open) {
                conn.send(data);
            }
        });
    }

    /**
     * Send message (to host if guest, or broadcast if host)
     */
    send(data) {
        if (this.isHost) {
            this.broadcast(data);
        } else if (this.hostConnection && this.hostConnection.open) {
            this.hostConnection.send(data);
        }
    }

    /**
     * Get current canvas state for syncing
     */
    getCanvasState() {
        return {
            layers: this.app.layers.serialize(),
            width: this.app.canvas.width,
            height: this.app.canvas.height
        };
    }

    /**
     * Load canvas state from host
     */
    loadCanvasState(state) {
        if (state.layers) {
            this.app.layers.deserialize(state.layers);
            this.app.ui.updateLayersList();
            this.app.canvas.render();
        }
    }

    // Remote stroke handling
    handleRemoteStrokeStart(data, fromPeerId) {
        const participant = this.participants.get(fromPeerId) || { color: '#888888' };
        // Create a temporary layer for remote drawing
        this.app.canvas.startRemoteStroke(data, fromPeerId, participant.color);
    }

    handleRemoteStrokeMove(data, fromPeerId) {
        this.app.canvas.continueRemoteStroke(data, fromPeerId);
    }

    handleRemoteStrokeEnd(data, fromPeerId) {
        this.app.canvas.endRemoteStroke(data, fromPeerId);
    }

    // Remote cursor handling
    handleRemoteCursor(data, fromPeerId) {
        const participant = this.participants.get(fromPeerId);
        if (!participant) return;

        let cursor = this.remoteCursors.get(fromPeerId);

        if (!cursor) {
            cursor = this.createRemoteCursor(fromPeerId, participant);
            this.remoteCursors.set(fromPeerId, cursor);
        }

        // Convert canvas coordinates to screen coordinates
        const wrapper = document.getElementById('canvasWrapper');
        const rect = wrapper.getBoundingClientRect();
        const zoom = this.app.canvas.zoom;
        const pan = this.app.canvas.pan;

        const screenX = rect.left + (data.x * zoom) + pan.x;
        const screenY = rect.top + (data.y * zoom) + pan.y;

        cursor.style.left = screenX + 'px';
        cursor.style.top = screenY + 'px';
        cursor.style.display = 'block';

        // Hide cursor after inactivity
        clearTimeout(cursor.hideTimeout);
        cursor.hideTimeout = setTimeout(() => {
            cursor.style.display = 'none';
        }, 3000);
    }

    createRemoteCursor(peerId, participant) {
        const container = document.getElementById('remoteCursors');
        const cursor = document.createElement('div');
        cursor.className = 'remote-cursor';
        cursor.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" style="fill: ${participant.color}">
                <path d="M3,3 L21,12 L12,12 L12,21 Z"/>
            </svg>
            <span class="remote-cursor-name" style="background: ${participant.color}">${participant.name}</span>
        `;
        container.appendChild(cursor);
        return cursor;
    }

    /**
     * Broadcast local stroke events
     */
    broadcastStrokeStart(point, tool, settings) {
        if (!this.isConnected() || (!this.isHost && !this.allowDraw)) return;

        this.send({
            type: 'stroke-start',
            point: point,
            tool: tool,
            settings: settings
        });
    }

    broadcastStrokeMove(point) {
        if (!this.isConnected() || (!this.isHost && !this.allowDraw)) return;

        this.send({
            type: 'stroke-move',
            point: point
        });
    }

    broadcastStrokeEnd() {
        if (!this.isConnected() || (!this.isHost && !this.allowDraw)) return;

        this.send({
            type: 'stroke-end'
        });
    }

    broadcastCursor(x, y) {
        if (!this.isConnected()) return;

        this.send({
            type: 'cursor-move',
            x: x,
            y: y
        });
    }

    /**
     * Handle layer changes
     */
    handleLayerChange(data) {
        // Sync layer changes from host
        if (!this.isHost && data.layers) {
            this.app.layers.deserialize(data.layers);
            this.app.ui.updateLayersList();
            this.app.canvas.render();
        }
    }

    broadcastLayerChange() {
        if (!this.isHost || !this.isConnected()) return;

        this.broadcast({
            type: 'layer-change',
            layers: this.app.layers.serialize()
        });
    }

    /**
     * Handle participant leaving
     */
    handleParticipantLeft(peerId) {
        this.participants.delete(peerId);
        this.connections.delete(peerId);

        // Remove cursor
        const cursor = this.remoteCursors.get(peerId);
        if (cursor) {
            cursor.remove();
            this.remoteCursors.delete(peerId);
        }

        this.updateParticipantUI();

        // If host, notify others
        if (this.isHost) {
            this.broadcast({
                type: 'participant-left',
                peerId: peerId
            });
        }
    }

    /**
     * Handle host disconnecting
     */
    handleHostDisconnected() {
        this.showNotification('Host ukončil relaci', 'error');
        this.cleanup();
        this.updateUI();
    }

    /**
     * Handle session ended by host
     */
    handleSessionEnded() {
        this.showNotification('Relace byla ukončena', 'info');
        this.cleanup();
        this.updateUI();
    }

    /**
     * End the session (host only)
     */
    endSession() {
        if (!this.isHost) return;

        // Notify all participants
        this.broadcast({ type: 'session-ended' });

        this.cleanup();
    }

    /**
     * Leave session (guest only)
     */
    leaveSession() {
        if (this.hostConnection) {
            this.hostConnection.close();
        }
        this.cleanup();
    }

    /**
     * Cleanup connections
     */
    cleanup() {
        // Close all connections
        this.connections.forEach(conn => conn.close());
        this.connections.clear();

        if (this.hostConnection) {
            this.hostConnection.close();
            this.hostConnection = null;
        }

        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }

        // Remove remote cursors
        this.remoteCursors.forEach(cursor => cursor.remove());
        this.remoteCursors.clear();

        this.participants.clear();
        this.isHost = false;
        this.roomId = null;
        this.password = null;

        // Remove room from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('room');
        window.history.replaceState({}, '', url);
    }

    /**
     * Check if connected
     */
    isConnected() {
        if (this.isHost) {
            return this.peer && !this.peer.destroyed;
        }
        return this.hostConnection && this.hostConnection.open;
    }

    /**
     * Get share URL
     */
    getShareUrl() {
        const url = new URL(window.location.href);
        url.searchParams.set('room', this.roomId);
        return url.toString();
    }

    /**
     * Show join modal (when coming from URL)
     */
    showJoinModal() {
        const modal = document.getElementById('collabModal');
        const hostView = document.getElementById('collabHostView');
        const activeView = document.getElementById('collabActiveView');
        const joinView = document.getElementById('collabJoinView');
        const guestView = document.getElementById('collabGuestView');
        const title = document.getElementById('collabModalTitle');

        hostView.style.display = 'none';
        activeView.style.display = 'none';
        joinView.style.display = 'block';
        guestView.style.display = 'none';
        title.textContent = 'Připojit k relaci';

        modal.style.display = 'flex';
    }

    /**
     * Update participant UI
     */
    updateParticipantUI() {
        const countEl = document.getElementById('participantCount');
        const listEl = document.getElementById('participantList');

        if (countEl) {
            countEl.textContent = this.participants.size;
        }

        if (listEl) {
            listEl.innerHTML = '';
            this.participants.forEach((participant, peerId) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="participant-color" style="background: ${participant.color}"></span>
                    <span class="participant-name">${participant.name}</span>
                    ${participant.canDraw ? '<span class="participant-badge">Může kreslit</span>' : ''}
                `;
                listEl.appendChild(li);
            });
        }
    }

    /**
     * Update UI based on connection state
     */
    updateUI() {
        const hostView = document.getElementById('collabHostView');
        const activeView = document.getElementById('collabActiveView');
        const joinView = document.getElementById('collabJoinView');
        const guestView = document.getElementById('collabGuestView');
        const title = document.getElementById('collabModalTitle');

        if (this.isHost && this.isConnected()) {
            hostView.style.display = 'none';
            activeView.style.display = 'block';
            joinView.style.display = 'none';
            guestView.style.display = 'none';
            title.textContent = 'Živá relace';

            // Update share link
            const linkInput = document.getElementById('collabLink');
            if (linkInput) {
                linkInput.value = this.getShareUrl();
            }

            this.updateParticipantUI();
        } else if (!this.isHost && this.isConnected()) {
            hostView.style.display = 'none';
            activeView.style.display = 'none';
            joinView.style.display = 'none';
            guestView.style.display = 'block';
            title.textContent = 'Připojeno';

            const infoEl = document.getElementById('collabGuestInfo');
            if (infoEl) {
                infoEl.textContent = this.allowDraw
                    ? 'Jste připojeni jako host. Můžete kreslit.'
                    : 'Jste připojeni jako host (pouze sledování).';
            }
        } else {
            hostView.style.display = 'block';
            activeView.style.display = 'none';
            joinView.style.display = 'none';
            guestView.style.display = 'none';
            title.textContent = 'Sdílet živě';
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Use app's notification system if available
        if (this.app.ui && this.app.ui.showNotification) {
            this.app.ui.showNotification(message, type);
        } else {
            console.log(`[Collab] ${type}: ${message}`);
        }
    }
}
