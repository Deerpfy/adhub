/**
 * Claude RCS Workspace - Constants
 * Shared constants and configuration
 */

// =====================================================
// DEBUG FLAG - PRO TESTOVANI
// Nastav na TRUE pro automaticke schvalovani promptu
// PRED PRODUKCNIM NASAZENIM NASTAVIT NA FALSE
// =====================================================
export const DEBUG_AUTO_APPROVE = false;
// =====================================================

// Application version
export const APP_VERSION = '1.0.0';

// Message types for RCS protocol
export const MessageType = {
    // Connection management
    HANDSHAKE: 'handshake',
    HANDSHAKE_ACK: 'handshake_ack',
    PEER_JOINED: 'peer_joined',
    PEER_LEFT: 'peer_left',
    PING: 'ping',
    PONG: 'pong',

    // Prompt relay
    PROMPT_SUBMIT: 'prompt_submit',
    PROMPT_APPROVED: 'prompt_approved',
    PROMPT_REJECTED: 'prompt_rejected',
    PROMPT_EDITED: 'prompt_edited',

    // Output streaming
    OUTPUT_START: 'output_start',
    OUTPUT_CHUNK: 'output_chunk',
    OUTPUT_END: 'output_end',

    // Workspace sync
    WORKSPACE_UPDATE: 'workspace_update',
    WORKSPACE_SYNC: 'workspace_sync',
    CURSOR_UPDATE: 'cursor_update',

    // Role management
    ROLE_REQUEST: 'role_request',
    ROLE_CHANGE: 'role_change'
};

// Role types
export const Role = {
    HOST: 'host',
    CLIENT: 'client'
};

// Connection states
export const ConnectionState = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    ERROR: 'error'
};

// Prompt states
export const PromptState = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SENT: 'sent'
};

// IndexedDB configuration
export const DB_CONFIG = {
    name: 'ClaudeRCSDB',
    version: 1,
    stores: {
        sessions: 'sessions',
        prompts: 'prompts',
        messages: 'messages',
        settings: 'settings',
        workspace: 'workspace'
    }
};

// WebRTC configuration
export const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
};

// Default settings
export const DEFAULT_SETTINGS = {
    soundEnabled: true,
    debugAutoApprove: false,
    userName: '',
    theme: 'dark'
};

// Toast types
export const ToastType = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

// Maximum limits
export const LIMITS = {
    maxPromptLength: 100000,
    maxWorkspaceSize: 500000,
    maxPeers: 3,
    maxSessionHistory: 10,
    maxOutputMessages: 50
};

// Timeouts (in milliseconds)
export const TIMEOUTS = {
    iceGathering: 5000,
    connectionTimeout: 30000,
    pingInterval: 10000,
    reconnectDelay: 3000
};
