/**
 * Claude RCS Workspace - Main Application
 * Ties together all modules for the complete offline-first PWA
 */

import { storage } from './storage.js';
import { PeerManager } from './peer-manager.js';
import { UIController } from './ui-controller.js';
import {
    MessageType,
    ConnectionState,
    Role,
    PromptState,
    ToastType,
    DEBUG_AUTO_APPROVE,
    LIMITS
} from './constants.js';
import {
    createPromptSubmit,
    createPromptApproved,
    createPromptRejected,
    createOutputStart,
    createOutputChunk,
    createOutputEnd,
    createWorkspaceUpdate,
    generateId
} from './protocol.js';

/**
 * Main Application Class
 */
class ClaudeRCSApp {
    constructor() {
        this.peer = new PeerManager();
        this.ui = new UIController();

        this.settings = {};
        this.currentPromptId = null;
        this.pendingApproval = null;
        this.outputBuffer = '';

        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        console.log('[App] Initializing Claude RCS Workspace...');

        try {
            // Load settings from storage
            this.settings = await storage.getAllSettings();
            this.ui.setSettings(this.settings);

            // Load saved user name
            const savedName = await storage.getSetting('userName');
            if (savedName) {
                this.ui.setUserName(savedName);
            }

            // Load session history
            const sessions = await storage.getAllSessions();
            this.ui.renderSessionHistory(sessions);

            // Setup peer callbacks
            this.setupPeerCallbacks();

            // Setup UI event listeners
            this.setupUIListeners();

            console.log('[App] Initialization complete');

        } catch (error) {
            console.error('[App] Initialization failed:', error);
            this.ui.showToast('Chyba pri inicializaci', ToastType.ERROR);
        }
    }

    /**
     * Setup peer manager callbacks
     */
    setupPeerCallbacks() {
        this.peer.onStateChange = (state) => {
            console.log('[App] Connection state:', state);
            this.ui.updateConnectionStatus(state);

            if (state === ConnectionState.CONNECTED) {
                this.ui.showView('connected');
                this.ui.setupConnectedView(
                    this.peer.role,
                    this.peer.sessionId,
                    this.peer.peerName
                );
                this.ui.showToast('Spojeni navazano', ToastType.SUCCESS);

                // Save session to history
                this.saveSession();

            } else if (state === ConnectionState.DISCONNECTED) {
                // Handled by disconnect action

            } else if (state === ConnectionState.ERROR) {
                this.ui.showToast('Chyba spojeni', ToastType.ERROR);
            }
        };

        this.peer.onPeerJoined = (peerInfo) => {
            console.log('[App] Peer joined:', peerInfo.peerName);
            this.ui.addPeer(peerInfo);
            this.ui.showToast(`${peerInfo.peerName} se pripojil`, ToastType.INFO);

            if (this.settings.soundEnabled) {
                this.ui.playNotificationSound();
            }
        };

        this.peer.onPeerLeft = (peerInfo) => {
            console.log('[App] Peer left:', peerInfo.peerName);
            this.ui.removePeer(peerInfo.peerId);
            this.ui.showToast(`${peerInfo.peerName} se odpojil`, ToastType.WARNING);
        };

        this.peer.onMessage = (message) => {
            this.handlePeerMessage(message);
        };

        this.peer.onError = (error) => {
            console.error('[App] Peer error:', error);
            this.ui.showToast('Chyba pripojeni: ' + error.message, ToastType.ERROR);
        };
    }

    /**
     * Setup UI event listeners
     */
    setupUIListeners() {
        // Setup View - Create Session (Host)
        this.ui.elements.btnCreateSession?.addEventListener('click', () => {
            this.createSession();
        });

        // Setup View - Join Session (Client)
        this.ui.elements.btnJoinSession?.addEventListener('click', () => {
            this.ui.showView('clientSetup');
        });

        // Host Setup - Copy Invite Code
        this.ui.elements.btnCopyInvite?.addEventListener('click', () => {
            const code = this.ui.elements.inviteCode?.value;
            if (code) {
                this.ui.copyToClipboard(code);
            }
        });

        // Host Setup - Complete Connection
        this.ui.elements.btnCompleteConnection?.addEventListener('click', () => {
            this.completeHostConnection();
        });

        // Host Setup - Cancel
        this.ui.elements.btnCancelHost?.addEventListener('click', () => {
            this.cancelSetup();
        });

        // Client Setup - Connect to Host
        this.ui.elements.btnConnectToHost?.addEventListener('click', () => {
            this.connectToHost();
        });

        // Client Setup - Copy Answer Code
        this.ui.elements.btnCopyAnswer?.addEventListener('click', () => {
            const code = this.ui.elements.clientAnswerCode?.value;
            if (code) {
                this.ui.copyToClipboard(code);
            }
        });

        // Client Setup - Cancel
        this.ui.elements.btnCancelClient?.addEventListener('click', () => {
            this.cancelSetup();
        });

        // Connected View - Send Prompt (Client)
        this.ui.elements.btnSendPrompt?.addEventListener('click', () => {
            this.sendPrompt();
        });

        // Connected View - Keyboard shortcut for sending
        this.ui.elements.promptInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.sendPrompt();
            }
        });

        // Connected View - Clear Output
        this.ui.elements.btnClearOutput?.addEventListener('click', () => {
            this.ui.clearOutput();
        });

        // Connected View - Disconnect
        this.ui.elements.btnDisconnect?.addEventListener('click', () => {
            this.disconnect();
        });

        // Approval Queue - Click to review
        this.ui.elements.approvalQueue?.addEventListener('click', (e) => {
            const queueItem = e.target.closest('.queue-item');
            if (queueItem) {
                const promptId = queueItem.dataset.promptId;
                this.reviewPrompt(promptId);
            }
        });

        // Approval Modal - Actions
        this.ui.elements.btnApprove?.addEventListener('click', () => {
            this.approvePrompt();
        });

        this.ui.elements.btnReject?.addEventListener('click', () => {
            this.rejectPrompt();
        });

        this.ui.elements.btnEdit?.addEventListener('click', () => {
            this.ui.toggleEditMode(true);
        });

        // Approval Modal - Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.pendingApproval && !this.ui.elements.approvalModal?.classList.contains('hidden')) {
                const isEditing = !this.ui.elements.modalEditSection?.classList.contains('hidden');

                if (!isEditing) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.approvePrompt();
                    } else if (e.key === 'e' || e.key === 'E') {
                        e.preventDefault();
                        this.ui.toggleEditMode(true);
                    }
                } else {
                    if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault();
                        this.approvePrompt();
                    }
                }
            }
        });

        // Workspace - Sync on change
        let workspaceTimeout;
        this.ui.elements.workspaceEditor?.addEventListener('input', () => {
            clearTimeout(workspaceTimeout);
            workspaceTimeout = setTimeout(() => {
                this.syncWorkspace();
            }, 500);
        });

        // Settings - Sound toggle
        this.ui.elements.soundEnabled?.addEventListener('change', (e) => {
            this.settings.soundEnabled = e.target.checked;
            storage.setSetting('soundEnabled', e.target.checked);
        });

        // Settings - Debug auto-approve
        this.ui.elements.debugAutoApprove?.addEventListener('change', (e) => {
            this.settings.debugAutoApprove = e.target.checked;
            storage.setSetting('debugAutoApprove', e.target.checked);
        });

        // Settings - Clear data
        this.ui.elements.btnClearData?.addEventListener('click', async () => {
            if (confirm('Opravdu chces vymazat vsechna data?')) {
                await storage.clearAllData();
                this.ui.showToast('Data vymazana', ToastType.SUCCESS);
                this.ui.renderSessionHistory([]);
            }
        });

        // Settings - Export data
        this.ui.elements.btnExportData?.addEventListener('click', async () => {
            const data = await storage.exportAllData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `claude-rcs-backup-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.ui.showToast('Data exportovana', ToastType.SUCCESS);
        });

        // Session History - Click to load (future feature)
        this.ui.elements.sessionList?.addEventListener('click', (e) => {
            const sessionItem = e.target.closest('.session-item');
            if (sessionItem) {
                this.ui.showToast('Obnoveni session zatim neni podporovano', ToastType.INFO);
            }
        });

        // User name change - save to storage
        this.ui.elements.userName?.addEventListener('blur', () => {
            const name = this.ui.getUserName();
            if (name) {
                storage.setSetting('userName', name);
            }
        });
    }

    /**
     * Create new session as host
     */
    async createSession() {
        const name = this.ui.getUserName() || 'Host';
        this.peer.setName(name);

        try {
            this.ui.showView('hostSetup');
            this.ui.setButtonEnabled('btnCompleteConnection', false);

            const inviteCode = await this.peer.initAsHost();
            this.ui.setInviteCode(inviteCode);
            this.ui.setButtonEnabled('btnCompleteConnection', true);

            this.ui.showToast('Session vytvorena', ToastType.SUCCESS);

        } catch (error) {
            console.error('[App] Failed to create session:', error);
            this.ui.showToast('Nepodarilo se vytvorit session', ToastType.ERROR);
            this.ui.showView('setup');
        }
    }

    /**
     * Complete host connection with client's answer
     */
    async completeHostConnection() {
        const answerCode = this.ui.getAnswerCodeInput();

        if (!answerCode) {
            this.ui.showToast('Vloz answer kod od klienta', ToastType.WARNING);
            return;
        }

        try {
            this.ui.setButtonEnabled('btnCompleteConnection', false);
            const success = await this.peer.completeConnection(answerCode);

            if (!success) {
                this.ui.showToast('Neplatny answer kod', ToastType.ERROR);
                this.ui.setButtonEnabled('btnCompleteConnection', true);
            }

        } catch (error) {
            console.error('[App] Failed to complete connection:', error);
            this.ui.showToast('Chyba pri spojeni', ToastType.ERROR);
            this.ui.setButtonEnabled('btnCompleteConnection', true);
        }
    }

    /**
     * Connect to host as client
     */
    async connectToHost() {
        const inviteCode = this.ui.getInviteCodeInput();

        if (!inviteCode) {
            this.ui.showToast('Vloz invite kod od hosta', ToastType.WARNING);
            return;
        }

        const name = this.ui.getUserName() || 'Client';
        this.peer.setName(name);

        try {
            this.ui.setButtonEnabled('btnConnectToHost', false);

            const answerCode = await this.peer.initAsClient(inviteCode);
            this.ui.setClientAnswerCode(answerCode);

            this.ui.showToast('Posli answer kod hostovi', ToastType.INFO);

        } catch (error) {
            console.error('[App] Failed to connect:', error);
            this.ui.showToast('Neplatny invite kod', ToastType.ERROR);
            this.ui.setButtonEnabled('btnConnectToHost', true);
        }
    }

    /**
     * Cancel setup and return to main view
     */
    cancelSetup() {
        this.peer.disconnect();
        this.ui.reset();
    }

    /**
     * Disconnect from session
     */
    disconnect() {
        this.peer.disconnect();
        this.ui.reset();
        this.ui.showToast('Odpojeno', ToastType.INFO);
    }

    /**
     * Send prompt to host for approval (client)
     */
    async sendPrompt() {
        if (this.peer.role !== Role.CLIENT) {
            return;
        }

        const text = this.ui.getPromptText();

        if (!text) {
            this.ui.showToast('Napis prompt', ToastType.WARNING);
            return;
        }

        if (text.length > LIMITS.maxPromptLength) {
            this.ui.showToast('Prompt je prilis dlouhy', ToastType.WARNING);
            return;
        }

        // Create and send prompt message
        const message = createPromptSubmit(text, this.peer.peerName, this.peer.peerId);
        this.currentPromptId = message.payload.promptId;

        if (this.peer.send(message)) {
            this.ui.clearPromptInput();
            this.ui.showPromptStatus('pending', 'Cekam na schvaleni...');

            // Save prompt to local storage
            await storage.savePrompt({
                id: this.currentPromptId,
                sessionId: this.peer.sessionId,
                text,
                sender: this.peer.peerName,
                state: PromptState.PENDING,
                timestamp: Date.now()
            });

        } else {
            this.ui.showToast('Nepodarilo se odeslat prompt', ToastType.ERROR);
        }
    }

    /**
     * Handle incoming peer message
     */
    handlePeerMessage(message) {
        console.log('[App] Received message:', message.type);

        switch (message.type) {
            case MessageType.PROMPT_SUBMIT:
                this.handlePromptReceived(message.payload);
                break;

            case MessageType.PROMPT_APPROVED:
                this.handlePromptApproved(message.payload);
                break;

            case MessageType.PROMPT_REJECTED:
                this.handlePromptRejected(message.payload);
                break;

            case MessageType.OUTPUT_START:
                this.handleOutputStart(message.payload);
                break;

            case MessageType.OUTPUT_CHUNK:
                this.handleOutputChunk(message.payload);
                break;

            case MessageType.OUTPUT_END:
                this.handleOutputEnd(message.payload);
                break;

            case MessageType.WORKSPACE_UPDATE:
                this.handleWorkspaceUpdate(message.payload);
                break;
        }
    }

    /**
     * Handle received prompt (host)
     */
    async handlePromptReceived(payload) {
        if (this.peer.role !== Role.HOST) return;

        const { promptId, text, sender, senderId } = payload;

        // Save to storage
        await storage.savePrompt({
            id: promptId,
            sessionId: this.peer.sessionId,
            text,
            sender,
            senderId,
            state: PromptState.PENDING,
            timestamp: Date.now()
        });

        // Add to approval queue
        this.ui.addToApprovalQueue({
            promptId,
            sender,
            text,
            timestamp: Date.now()
        });

        // Play notification sound
        if (this.settings.soundEnabled) {
            this.ui.playNotificationSound();
        }

        // Auto-approve in debug mode
        if (DEBUG_AUTO_APPROVE || this.settings.debugAutoApprove) {
            console.warn('[App] DEBUG: Auto-approving prompt');
            this.pendingApproval = { promptId, text, sender, senderId };
            setTimeout(() => this.approvePrompt(), 100);
            return;
        }

        // Flash tab title if not focused
        if (!document.hasFocus()) {
            this.flashTabTitle(sender);
        }
    }

    /**
     * Review prompt (open approval modal)
     */
    async reviewPrompt(promptId) {
        const prompt = await storage.getPrompt(promptId);

        if (!prompt) {
            this.ui.showToast('Prompt nenalezen', ToastType.ERROR);
            return;
        }

        this.pendingApproval = prompt;

        this.ui.showApprovalModal({
            sender: prompt.sender,
            text: prompt.text,
            timestamp: prompt.timestamp
        });
    }

    /**
     * Approve pending prompt
     */
    async approvePrompt() {
        if (!this.pendingApproval) return;

        const { id: promptId, text, sender } = this.pendingApproval;

        // Get possibly edited text
        const editedText = this.ui.getEditedText();
        const finalText = editedText || text;

        // Update prompt state
        await storage.savePrompt({
            ...this.pendingApproval,
            state: PromptState.APPROVED,
            approvedText: finalText,
            approvedAt: Date.now()
        });

        // Send approval to client
        this.peer.send(createPromptApproved(promptId, editedText !== text ? finalText : null));

        // Remove from queue
        this.ui.removeFromApprovalQueue(promptId);
        this.ui.closeModal('approval');

        // Simulate output (in real extension this would come from Claude)
        this.simulateOutput(finalText, sender);

        this.pendingApproval = null;
        this.ui.showToast('Prompt schvalen', ToastType.SUCCESS);
    }

    /**
     * Reject pending prompt
     */
    async rejectPrompt() {
        if (!this.pendingApproval) return;

        const { id: promptId } = this.pendingApproval;

        // Update prompt state
        await storage.savePrompt({
            ...this.pendingApproval,
            state: PromptState.REJECTED,
            rejectedAt: Date.now()
        });

        // Send rejection to client
        this.peer.send(createPromptRejected(promptId));

        // Remove from queue
        this.ui.removeFromApprovalQueue(promptId);
        this.ui.closeModal('approval');

        this.pendingApproval = null;
        this.ui.showToast('Prompt zamitnut', ToastType.INFO);
    }

    /**
     * Handle prompt approved (client)
     */
    handlePromptApproved(payload) {
        if (this.peer.role !== Role.CLIENT) return;

        const { promptId } = payload;

        if (promptId === this.currentPromptId) {
            this.ui.showPromptStatus('approved', 'Prompt schvalen, generuji odpoved...');
        }
    }

    /**
     * Handle prompt rejected (client)
     */
    handlePromptRejected(payload) {
        if (this.peer.role !== Role.CLIENT) return;

        const { promptId } = payload;

        if (promptId === this.currentPromptId) {
            this.ui.showPromptStatus('rejected', 'Prompt zamitnut hostem');
            setTimeout(() => this.ui.hidePromptStatus(), 5000);
        }
    }

    /**
     * Handle output start
     */
    handleOutputStart(payload) {
        this.outputBuffer = '';
        this.ui.addOutputMessage({
            sender: 'Claude',
            content: '...',
            timestamp: Date.now()
        });
    }

    /**
     * Handle output chunk (streaming)
     */
    handleOutputChunk(payload) {
        this.outputBuffer += payload.chunk;
        this.ui.updateLastOutputMessage(this.outputBuffer);
    }

    /**
     * Handle output end
     */
    handleOutputEnd(payload) {
        if (this.peer.role === Role.CLIENT && payload.promptId === this.currentPromptId) {
            this.ui.hidePromptStatus();
            this.currentPromptId = null;
        }
    }

    /**
     * Simulate output response (demo mode)
     * In a real extension, this would come from Claude.ai
     */
    simulateOutput(promptText, sender) {
        const promptId = generateId();

        // Notify output start
        this.peer.send(createOutputStart(promptId));

        // Add local output message
        this.ui.addOutputMessage({
            sender: 'Claude',
            content: '',
            timestamp: Date.now()
        });

        // Simulate streaming response
        const response = this.generateDemoResponse(promptText);
        let index = 0;
        this.outputBuffer = '';

        const streamInterval = setInterval(() => {
            if (index < response.length) {
                const chunk = response.substring(index, index + 3);
                this.outputBuffer += chunk;
                index += 3;

                // Send chunk to peers
                this.peer.send(createOutputChunk(chunk, promptId, index));

                // Update local display
                this.ui.updateLastOutputMessage(this.outputBuffer);

            } else {
                clearInterval(streamInterval);
                this.peer.send(createOutputEnd(promptId, index));

                // Save message to storage
                storage.saveMessage({
                    id: generateId(),
                    sessionId: this.peer.sessionId,
                    promptId,
                    sender: 'Claude',
                    content: this.outputBuffer,
                    timestamp: Date.now()
                });
            }
        }, 20);
    }

    /**
     * Generate demo response
     */
    generateDemoResponse(prompt) {
        const responses = [
            `Dekuji za vas dotaz ohledne "${prompt.substring(0, 50)}..."\n\nToto je demo odpoved z Claude RCS Workspace. V realne aplikaci by tato odpoved prisla primo z Claude.ai.\n\nKlicove body:\n1. Offline-first architektura\n2. P2P komunikace pres WebRTC\n3. Plna synchronizace dat\n\nMate dalsi otazky?`,
            `Rozumim vasemu pozadavku.\n\nAnalyzuji: "${prompt.substring(0, 30)}..."\n\nZde je moje odpoved:\n\nClaude RCS Workspace je navrzeny pro kolaborativni praci, kde host schvaluje prompty pred odeslanim. To zajistuje kontrolu nad obsahem a bezpecnost komunikace.\n\nFunkcionalita zahrnuje:\n- Real-time streaming odpovedi\n- Sdileny workspace\n- Offline uloziste`,
            `Vas prompt byl uspesne zpracovan.\n\nV kontextu "${prompt.substring(0, 40)}..." mohu rici:\n\nTato aplikace demonstruje moznosti moderni webove technologie:\n\n* Service Worker pro offline funkcionalitu\n* IndexedDB pro persistentni ulozeni\n* WebRTC pro peer-to-peer komunikaci\n\nVse funguje bez potreby serveru!`
        ];

        return responses[Math.floor(Math.random() * responses.length)];
    }

    /**
     * Handle workspace update from peer
     */
    handleWorkspaceUpdate(payload) {
        const { content } = payload;
        this.ui.setWorkspaceContent(content);
    }

    /**
     * Sync workspace content to peers
     */
    syncWorkspace() {
        const content = this.ui.getWorkspaceContent();

        if (content.length > LIMITS.maxWorkspaceSize) {
            this.ui.showToast('Workspace obsah je prilis velky', ToastType.WARNING);
            return;
        }

        // Send to peers
        this.peer.send(createWorkspaceUpdate(content));

        // Save locally
        storage.saveWorkspace({
            id: this.peer.sessionId || 'local',
            sessionId: this.peer.sessionId,
            content
        });
    }

    /**
     * Save session to history
     */
    async saveSession() {
        if (!this.peer.sessionId) return;

        await storage.saveSession({
            id: this.peer.sessionId,
            name: `Session s ${this.peer.connectedPeers.size} ucastniky`,
            role: this.peer.role,
            timestamp: Date.now()
        });
    }

    /**
     * Flash tab title for notification
     */
    flashTabTitle(sender) {
        const originalTitle = document.title;
        let flip = true;

        const interval = setInterval(() => {
            document.title = flip ? `[${sender}] Novy prompt!` : originalTitle;
            flip = !flip;
        }, 800);

        // Stop flashing when focused
        const stopFlash = () => {
            clearInterval(interval);
            document.title = originalTitle;
            window.removeEventListener('focus', stopFlash);
        };

        window.addEventListener('focus', stopFlash);

        // Auto-stop after 30 seconds
        setTimeout(stopFlash, 30000);
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ClaudeRCSApp();
    console.log('[App] Claude RCS Workspace ready');
});

// Export for debugging
export { ClaudeRCSApp };
