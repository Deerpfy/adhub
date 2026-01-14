/**
 * Claude RCS Workspace - UI Controller
 * Handles all DOM interactions and UI state
 */

import { ToastType, ConnectionState, Role, LIMITS } from './constants.js';

/**
 * UI Controller class
 */
export class UIController {
    constructor() {
        this.elements = {};
        this.currentView = 'setup';
        this.cacheElements();
        this.setupBaseListeners();
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        // Banners
        this.elements.offlineBanner = document.getElementById('offlineBanner');

        // Header
        this.elements.connectionStatus = document.getElementById('connectionStatus');
        this.elements.settingsBtn = document.getElementById('settingsBtn');

        // Views
        this.elements.setupView = document.getElementById('setupView');
        this.elements.hostSetupView = document.getElementById('hostSetupView');
        this.elements.clientSetupView = document.getElementById('clientSetupView');
        this.elements.connectedView = document.getElementById('connectedView');

        // Setup View
        this.elements.userName = document.getElementById('userName');
        this.elements.btnCreateSession = document.getElementById('btnCreateSession');
        this.elements.btnJoinSession = document.getElementById('btnJoinSession');
        this.elements.sessionHistory = document.getElementById('sessionHistory');
        this.elements.sessionList = document.getElementById('sessionList');

        // Host Setup View
        this.elements.inviteCode = document.getElementById('inviteCode');
        this.elements.btnCopyInvite = document.getElementById('btnCopyInvite');
        this.elements.answerCodeInput = document.getElementById('answerCodeInput');
        this.elements.btnCompleteConnection = document.getElementById('btnCompleteConnection');
        this.elements.btnCancelHost = document.getElementById('btnCancelHost');

        // Client Setup View
        this.elements.inviteCodeInput = document.getElementById('inviteCodeInput');
        this.elements.btnConnectToHost = document.getElementById('btnConnectToHost');
        this.elements.clientAnswerSection = document.getElementById('clientAnswerSection');
        this.elements.clientAnswerCode = document.getElementById('clientAnswerCode');
        this.elements.btnCopyAnswer = document.getElementById('btnCopyAnswer');
        this.elements.btnCancelClient = document.getElementById('btnCancelClient');

        // Connected View - Sidebar
        this.elements.peerCount = document.getElementById('peerCount');
        this.elements.peersList = document.getElementById('peersList');
        this.elements.roleBadge = document.getElementById('roleBadge');
        this.elements.sessionId = document.getElementById('sessionId');
        this.elements.btnDisconnect = document.getElementById('btnDisconnect');

        // Connected View - Host Approval Area
        this.elements.hostApprovalArea = document.getElementById('hostApprovalArea');
        this.elements.queueCount = document.getElementById('queueCount');
        this.elements.approvalQueue = document.getElementById('approvalQueue');

        // Connected View - Client Prompt Area
        this.elements.clientPromptArea = document.getElementById('clientPromptArea');
        this.elements.promptInput = document.getElementById('promptInput');
        this.elements.charCount = document.getElementById('charCount');
        this.elements.btnSendPrompt = document.getElementById('btnSendPrompt');
        this.elements.promptStatus = document.getElementById('promptStatus');

        // Connected View - Output Area
        this.elements.outputArea = document.getElementById('outputArea');
        this.elements.btnClearOutput = document.getElementById('btnClearOutput');
        this.elements.outputDisplay = document.getElementById('outputDisplay');

        // Connected View - Workspace
        this.elements.workspaceArea = document.getElementById('workspaceArea');
        this.elements.workspaceEditor = document.getElementById('workspaceEditor');
        this.elements.workspacePreview = document.getElementById('workspacePreview');
        this.elements.editorTab = document.getElementById('editorTab');
        this.elements.previewTab = document.getElementById('previewTab');

        // Modals
        this.elements.approvalModal = document.getElementById('approvalModal');
        this.elements.modalSender = document.getElementById('modalSender');
        this.elements.modalTime = document.getElementById('modalTime');
        this.elements.modalPromptText = document.getElementById('modalPromptText');
        this.elements.modalEditSection = document.getElementById('modalEditSection');
        this.elements.modalEditText = document.getElementById('modalEditText');
        this.elements.btnReject = document.getElementById('btnReject');
        this.elements.btnEdit = document.getElementById('btnEdit');
        this.elements.btnApprove = document.getElementById('btnApprove');

        this.elements.settingsModal = document.getElementById('settingsModal');
        this.elements.btnCloseSettings = document.getElementById('btnCloseSettings');
        this.elements.soundEnabled = document.getElementById('soundEnabled');
        this.elements.debugAutoApprove = document.getElementById('debugAutoApprove');
        this.elements.btnClearData = document.getElementById('btnClearData');
        this.elements.btnExportData = document.getElementById('btnExportData');

        // Toast Container
        this.elements.toastContainer = document.getElementById('toastContainer');
    }

    /**
     * Setup base event listeners
     */
    setupBaseListeners() {
        // Offline detection
        window.addEventListener('online', () => this.setOfflineStatus(false));
        window.addEventListener('offline', () => this.setOfflineStatus(true));

        // Initial offline check
        this.setOfflineStatus(!navigator.onLine);

        // Workspace tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchWorkspaceTab(e.target.dataset.tab);
            });
        });

        // Prompt input character count
        this.elements.promptInput?.addEventListener('input', () => {
            this.updateCharCount();
        });

        // Modal backdrop clicks
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', () => {
                this.closeAllModals();
            });
        });

        // Settings modal
        this.elements.settingsBtn?.addEventListener('click', () => {
            this.openModal('settings');
        });

        this.elements.btnCloseSettings?.addEventListener('click', () => {
            this.closeModal('settings');
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    /**
     * Show/hide offline banner
     */
    setOfflineStatus(isOffline) {
        if (isOffline) {
            this.elements.offlineBanner?.classList.remove('hidden');
        } else {
            this.elements.offlineBanner?.classList.add('hidden');
        }
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(state) {
        const el = this.elements.connectionStatus;
        if (!el) return;

        el.className = 'connection-status ' + state;

        const statusTexts = {
            [ConnectionState.DISCONNECTED]: 'Odpojeno',
            [ConnectionState.CONNECTING]: 'Pripojuji...',
            [ConnectionState.CONNECTED]: 'Pripojeno',
            [ConnectionState.ERROR]: 'Chyba'
        };

        const statusText = el.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = statusTexts[state] || state;
        }
    }

    /**
     * Switch between views
     */
    showView(viewName) {
        // Hide all views
        const views = ['setup', 'hostSetup', 'clientSetup', 'connected'];
        views.forEach(view => {
            const el = this.elements[view + 'View'];
            if (el) {
                el.classList.remove('active');
            }
        });

        // Show requested view
        const viewEl = this.elements[viewName + 'View'];
        if (viewEl) {
            viewEl.classList.add('active');
            this.currentView = viewName;
        }
    }

    /**
     * Get user name from input
     */
    getUserName() {
        return this.elements.userName?.value.trim() || '';
    }

    /**
     * Set user name in input
     */
    setUserName(name) {
        if (this.elements.userName) {
            this.elements.userName.value = name;
        }
    }

    /**
     * Set invite code in host view
     */
    setInviteCode(code) {
        if (this.elements.inviteCode) {
            this.elements.inviteCode.value = code;
        }
    }

    /**
     * Get invite code from client input
     */
    getInviteCodeInput() {
        return this.elements.inviteCodeInput?.value.trim() || '';
    }

    /**
     * Get answer code from host input
     */
    getAnswerCodeInput() {
        return this.elements.answerCodeInput?.value.trim() || '';
    }

    /**
     * Set answer code in client view
     */
    setClientAnswerCode(code) {
        if (this.elements.clientAnswerCode) {
            this.elements.clientAnswerCode.value = code;
        }
        this.elements.clientAnswerSection?.classList.remove('hidden');
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Zkopírovano do schranky', ToastType.SUCCESS);
            return true;
        } catch (error) {
            console.error('[UI] Failed to copy:', error);
            this.showToast('Nepodarilo se zkopirovat', ToastType.ERROR);
            return false;
        }
    }

    /**
     * Update connected view for role
     */
    setupConnectedView(role, sessionId, peerName) {
        // Set role badge
        if (this.elements.roleBadge) {
            this.elements.roleBadge.textContent = role.toUpperCase();
            this.elements.roleBadge.className = 'role-badge ' + role;
        }

        // Set session ID
        if (this.elements.sessionId) {
            this.elements.sessionId.textContent = 'Session: ' + (sessionId || 'N/A');
        }

        // Show/hide role-specific areas
        if (role === Role.HOST) {
            this.elements.hostApprovalArea?.classList.remove('hidden');
            this.elements.clientPromptArea?.classList.add('hidden');
        } else {
            this.elements.hostApprovalArea?.classList.add('hidden');
            this.elements.clientPromptArea?.classList.remove('hidden');
        }
    }

    /**
     * Add peer to list
     */
    addPeer(peerInfo) {
        const { peerId, peerName, role } = peerInfo;

        // Create peer item
        const peerEl = document.createElement('div');
        peerEl.className = 'peer-item';
        peerEl.dataset.peerId = peerId;

        peerEl.innerHTML = `
            <div class="peer-avatar">${this.escapeHtml(peerName[0].toUpperCase())}</div>
            <div class="peer-info">
                <span class="peer-name">${this.escapeHtml(peerName)}</span>
                <span class="peer-role">${role}</span>
            </div>
            <div class="peer-status"></div>
        `;

        this.elements.peersList?.appendChild(peerEl);
        this.updatePeerCount();
    }

    /**
     * Remove peer from list
     */
    removePeer(peerId) {
        const peerEl = this.elements.peersList?.querySelector(`[data-peer-id="${peerId}"]`);
        if (peerEl) {
            peerEl.remove();
        }
        this.updatePeerCount();
    }

    /**
     * Clear all peers from list
     */
    clearPeers() {
        if (this.elements.peersList) {
            this.elements.peersList.innerHTML = '';
        }
        this.updatePeerCount();
    }

    /**
     * Update peer count badge
     */
    updatePeerCount() {
        const count = this.elements.peersList?.children.length || 0;
        if (this.elements.peerCount) {
            this.elements.peerCount.textContent = count;
        }
    }

    /**
     * Get prompt text from input
     */
    getPromptText() {
        return this.elements.promptInput?.value.trim() || '';
    }

    /**
     * Clear prompt input
     */
    clearPromptInput() {
        if (this.elements.promptInput) {
            this.elements.promptInput.value = '';
            this.updateCharCount();
        }
    }

    /**
     * Update character count
     */
    updateCharCount() {
        const length = this.elements.promptInput?.value.length || 0;
        if (this.elements.charCount) {
            this.elements.charCount.textContent = `${length} znaku`;
            this.elements.charCount.style.color = length > LIMITS.maxPromptLength ? 'var(--danger-color)' : '';
        }
    }

    /**
     * Show prompt status
     */
    showPromptStatus(state, message) {
        const statusEl = this.elements.promptStatus;
        if (!statusEl) return;

        statusEl.classList.remove('hidden', 'approved', 'rejected');

        if (state === 'approved') {
            statusEl.classList.add('approved');
        } else if (state === 'rejected') {
            statusEl.classList.add('rejected');
        }

        const icons = {
            pending: '⏳',
            approved: '✅',
            rejected: '❌'
        };

        statusEl.innerHTML = `
            <div class="status-content">
                <span class="status-icon">${icons[state] || '⏳'}</span>
                <span class="status-message">${this.escapeHtml(message)}</span>
            </div>
        `;
    }

    /**
     * Hide prompt status
     */
    hidePromptStatus() {
        this.elements.promptStatus?.classList.add('hidden');
    }

    /**
     * Add item to approval queue
     */
    addToApprovalQueue(promptData) {
        const { promptId, sender, text, timestamp } = promptData;

        // Remove empty state
        const emptyQueue = this.elements.approvalQueue?.querySelector('.empty-queue');
        if (emptyQueue) {
            emptyQueue.remove();
        }

        // Create queue item
        const itemEl = document.createElement('div');
        itemEl.className = 'queue-item';
        itemEl.dataset.promptId = promptId;

        const preview = text.length > 100 ? text.substring(0, 100) + '...' : text;
        const time = new Date(timestamp).toLocaleTimeString('cs-CZ', {
            hour: '2-digit',
            minute: '2-digit'
        });

        itemEl.innerHTML = `
            <div class="queue-item-content">
                <div class="queue-item-sender">${this.escapeHtml(sender)}</div>
                <div class="queue-item-preview">${this.escapeHtml(preview)}</div>
            </div>
            <div class="queue-item-time">${time}</div>
        `;

        this.elements.approvalQueue?.appendChild(itemEl);
        this.updateQueueCount();

        return itemEl;
    }

    /**
     * Remove item from approval queue
     */
    removeFromApprovalQueue(promptId) {
        const itemEl = this.elements.approvalQueue?.querySelector(`[data-prompt-id="${promptId}"]`);
        if (itemEl) {
            itemEl.remove();
        }

        // Show empty state if queue is empty
        if (this.elements.approvalQueue?.children.length === 0) {
            this.showEmptyQueue();
        }

        this.updateQueueCount();
    }

    /**
     * Show empty queue state
     */
    showEmptyQueue() {
        if (!this.elements.approvalQueue) return;

        this.elements.approvalQueue.innerHTML = `
            <div class="empty-queue">
                <span>✨</span>
                <p>Zadne prompty ke schvaleni</p>
            </div>
        `;
    }

    /**
     * Update queue count badge
     */
    updateQueueCount() {
        const items = this.elements.approvalQueue?.querySelectorAll('.queue-item');
        const count = items?.length || 0;
        if (this.elements.queueCount) {
            this.elements.queueCount.textContent = count;
        }
    }

    /**
     * Show approval modal
     */
    showApprovalModal(promptData) {
        const { sender, text, timestamp } = promptData;

        if (this.elements.modalSender) {
            this.elements.modalSender.textContent = sender;
        }

        if (this.elements.modalTime) {
            this.elements.modalTime.textContent = new Date(timestamp).toLocaleTimeString('cs-CZ', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        if (this.elements.modalPromptText) {
            this.elements.modalPromptText.textContent = text;
        }

        // Reset edit section
        this.elements.modalEditSection?.classList.add('hidden');
        if (this.elements.modalEditText) {
            this.elements.modalEditText.value = text;
        }

        this.openModal('approval');
    }

    /**
     * Toggle edit mode in approval modal
     */
    toggleEditMode(show) {
        if (show) {
            this.elements.modalEditSection?.classList.remove('hidden');
            this.elements.modalEditText?.focus();
        } else {
            this.elements.modalEditSection?.classList.add('hidden');
        }
    }

    /**
     * Get edited text from modal
     */
    getEditedText() {
        return this.elements.modalEditText?.value.trim() || '';
    }

    /**
     * Add output message
     */
    addOutputMessage(messageData) {
        const { sender, content, timestamp } = messageData;

        // Remove empty state
        const emptyOutput = this.elements.outputDisplay?.querySelector('.empty-output');
        if (emptyOutput) {
            emptyOutput.remove();
        }

        // Create message element
        const msgEl = document.createElement('div');
        msgEl.className = 'output-message';

        const time = new Date(timestamp).toLocaleTimeString('cs-CZ', {
            hour: '2-digit',
            minute: '2-digit'
        });

        msgEl.innerHTML = `
            <div class="output-message-header">
                <span class="output-message-sender">${this.escapeHtml(sender)}</span>
                <span class="output-message-time">${time}</span>
            </div>
            <div class="output-message-content">${this.escapeHtml(content)}</div>
        `;

        this.elements.outputDisplay?.appendChild(msgEl);

        // Scroll to bottom
        if (this.elements.outputDisplay) {
            this.elements.outputDisplay.scrollTop = this.elements.outputDisplay.scrollHeight;
        }
    }

    /**
     * Update last output message (for streaming)
     */
    updateLastOutputMessage(content) {
        const lastMsg = this.elements.outputDisplay?.querySelector('.output-message:last-child .output-message-content');
        if (lastMsg) {
            lastMsg.textContent = content;
            if (this.elements.outputDisplay) {
                this.elements.outputDisplay.scrollTop = this.elements.outputDisplay.scrollHeight;
            }
        }
    }

    /**
     * Clear all output messages
     */
    clearOutput() {
        if (this.elements.outputDisplay) {
            this.elements.outputDisplay.innerHTML = `
                <div class="empty-output">
                    <span>💭</span>
                    <p>Zatim zadne odpovedi</p>
                </div>
            `;
        }
    }

    /**
     * Get workspace content
     */
    getWorkspaceContent() {
        return this.elements.workspaceEditor?.value || '';
    }

    /**
     * Set workspace content
     */
    setWorkspaceContent(content) {
        if (this.elements.workspaceEditor) {
            this.elements.workspaceEditor.value = content;
        }
        this.updateWorkspacePreview(content);
    }

    /**
     * Update workspace preview
     */
    updateWorkspacePreview(content) {
        if (this.elements.workspacePreview) {
            // Simple markdown-like preview
            let html = this.escapeHtml(content);

            // Basic formatting
            html = html
                .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/`(.+?)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>');

            this.elements.workspacePreview.innerHTML = html;
        }
    }

    /**
     * Switch workspace tab
     */
    switchWorkspaceTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        this.elements.editorTab?.classList.toggle('active', tabName === 'editor');
        this.elements.previewTab?.classList.toggle('active', tabName === 'preview');

        if (tabName === 'preview') {
            this.updateWorkspacePreview(this.getWorkspaceContent());
        }
    }

    /**
     * Open modal
     */
    openModal(modalName) {
        const modalEl = this.elements[modalName + 'Modal'];
        if (modalEl) {
            modalEl.classList.remove('hidden');
            modalEl.classList.add('active');
        }
    }

    /**
     * Close modal
     */
    closeModal(modalName) {
        const modalEl = this.elements[modalName + 'Modal'];
        if (modalEl) {
            modalEl.classList.remove('active');
            modalEl.classList.add('hidden');
        }
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        this.closeModal('approval');
        this.closeModal('settings');
    }

    /**
     * Show toast notification
     */
    showToast(message, type = ToastType.INFO, duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            [ToastType.SUCCESS]: '✅',
            [ToastType.ERROR]: '❌',
            [ToastType.WARNING]: '⚠️',
            [ToastType.INFO]: 'ℹ️'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || '📌'}</span>
            <span class="toast-message">${this.escapeHtml(message)}</span>
        `;

        this.elements.toastContainer?.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Render session history
     */
    renderSessionHistory(sessions) {
        if (!sessions || sessions.length === 0) {
            this.elements.sessionHistory?.classList.add('hidden');
            return;
        }

        this.elements.sessionHistory?.classList.remove('hidden');

        if (this.elements.sessionList) {
            this.elements.sessionList.innerHTML = sessions.slice(0, 5).map(session => {
                const date = new Date(session.timestamp).toLocaleDateString('cs-CZ');
                return `
                    <div class="session-item" data-session-id="${session.id}">
                        <span class="session-name">${this.escapeHtml(session.name || 'Session')}</span>
                        <span class="session-date">${date}</span>
                    </div>
                `;
            }).join('');
        }
    }

    /**
     * Get settings values
     */
    getSettings() {
        return {
            soundEnabled: this.elements.soundEnabled?.checked ?? true,
            debugAutoApprove: this.elements.debugAutoApprove?.checked ?? false
        };
    }

    /**
     * Set settings values
     */
    setSettings(settings) {
        if (this.elements.soundEnabled) {
            this.elements.soundEnabled.checked = settings.soundEnabled ?? true;
        }
        if (this.elements.debugAutoApprove) {
            this.elements.debugAutoApprove.checked = settings.debugAutoApprove ?? false;
        }
    }

    /**
     * Enable/disable button
     */
    setButtonEnabled(buttonName, enabled) {
        const btn = this.elements[buttonName];
        if (btn) {
            btn.disabled = !enabled;
        }
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
        try {
            // Create simple beep using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.1;

            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.stop(audioContext.currentTime + 0.3);

        } catch (error) {
            console.log('[UI] Could not play sound:', error);
        }
    }

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Reset UI to initial state
     */
    reset() {
        this.showView('setup');
        this.updateConnectionStatus(ConnectionState.DISCONNECTED);
        this.clearPeers();
        this.clearOutput();
        this.clearPromptInput();
        this.hidePromptStatus();
        this.showEmptyQueue();
        this.setWorkspaceContent('');
        this.closeAllModals();

        // Clear inputs
        if (this.elements.inviteCode) this.elements.inviteCode.value = '';
        if (this.elements.inviteCodeInput) this.elements.inviteCodeInput.value = '';
        if (this.elements.answerCodeInput) this.elements.answerCodeInput.value = '';
        if (this.elements.clientAnswerCode) this.elements.clientAnswerCode.value = '';

        this.elements.clientAnswerSection?.classList.add('hidden');
    }
}
