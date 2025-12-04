// Chat Panel Application
let chatViews = [];
let isUnifiedView = false;
let chatClients = {}; // Store active chat connections
let wsServer = null; // WebSocket connection to backend server
let wsReady = false; // WebSocket ready state
let pendingConnections = new Set(); // Track which chats are already connecting
let connectedChats = new Set(); // Track which chats are successfully connected
let reconnectTimeout = null; // Track reconnect timeout
const WS_SERVER_URL = 'ws://localhost:3001'; // Backend server URL
const API_SERVER_URL = 'http://localhost:3001'; // Backend server HTTP URL
const HELPER_SERVER_URL = 'http://localhost:3002'; // Helper server URL for remote control

// YouTube API key is stored only in-memory per browser session
let sessionYoutubeApiKey = '';
const youtubeKeyWaitlist = new Set();

// Server control
let serverStatusCheckInterval = null;
let isServerRunning = false;

// Debug object for automatic error reporting
window.chatPanelDebug = {
    state: {
        chatViews: () => chatViews.length,
        connectedChats: () => connectedChats.size,
        pendingConnections: () => pendingConnections.size,
        wsReady: () => wsReady,
        wsState: () => wsServer ? wsServer.readyState : 'null'
    },
    logs: [],
    errors: [],
    getDebugInfo: function() {
        return {
            state: {
                chatViews: chatViews.length,
                connectedChats: connectedChats.size,
                pendingConnections: Array.from(pendingConnections),
                wsReady: wsReady,
                wsState: wsServer ? wsServer.readyState : null,
                chatClients: Object.keys(chatClients)
            },
            recentLogs: this.logs.slice(-20),
            errors: this.errors.slice(-10)
        };
    }
};

// Enhanced console logging with debug tracking
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
    originalLog.apply(console, args);
    if (window.chatPanelDebug) {
        window.chatPanelDebug.logs.push({type: 'log', time: new Date().toISOString(), args: args.map(a => String(a))});
        if (window.chatPanelDebug.logs.length > 100) {
            window.chatPanelDebug.logs.shift();
        }
    }
};

console.error = function(...args) {
    originalError.apply(console, args);
    if (window.chatPanelDebug) {
        window.chatPanelDebug.errors.push({type: 'error', time: new Date().toISOString(), args: args.map(a => String(a))});
        if (window.chatPanelDebug.errors.length > 50) {
            window.chatPanelDebug.errors.shift();
        }
    }
};

console.warn = function(...args) {
    originalWarn.apply(console, args);
    if (window.chatPanelDebug) {
        window.chatPanelDebug.logs.push({type: 'warn', time: new Date().toISOString(), args: args.map(a => String(a))});
        if (window.chatPanelDebug.logs.length > 100) {
            window.chatPanelDebug.logs.shift();
        }
    }
};

// DOM Elements
const addChatBtn = document.getElementById('addChatBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const chatModal = document.getElementById('chatModal');
const chatForm = document.getElementById('chatForm');
const editChatModal = document.getElementById('editChatModal');
const editChatForm = document.getElementById('editChatForm');
const chatContainer = document.getElementById('chatContainer');
const emptyState = document.getElementById('emptyState');
const cancelBtn = document.getElementById('cancelBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const closeBtn = document.querySelector('.close');
const closeEditBtn = document.querySelector('.close-edit');
const youtubeKeyBtn = document.getElementById('youtubeKeyBtn');
const youtubeKeyBubble = document.getElementById('youtubeKeyBubble');
const youtubeKeyInput = document.getElementById('youtubeKeyInput');
const youtubeKeyNote = document.getElementById('youtubeKeyNote');
const youtubeKeyStatus = document.getElementById('youtubeKeyStatus');
const youtubeKeyApplyBtn = document.getElementById('applyYoutubeKeyBtn');
const youtubeKeyClearBtn = document.getElementById('clearYoutubeKeyBtn');
const closeYoutubeKeyBubbleBtn = document.getElementById('closeYoutubeKeyBubble');

const scheduleRenderFrame = typeof window !== 'undefined' && window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : (cb) => setTimeout(cb, 16);
let renderQueued = false;
function requestRender(options = {}) {
    const { immediate = false } = options;
    if (immediate) {
        renderQueued = false;
        renderChats();
        return;
    }
    if (renderQueued) return;
    renderQueued = true;
    scheduleRenderFrame(() => {
        renderQueued = false;
        renderChats();
    });
}

// Load saved chats from localStorage
function loadSavedChats() {
    const saved = localStorage.getItem('chatPanels');
    if (saved) {
        chatViews = JSON.parse(saved);
        // Ensure all chats have paused property (backward compatibility)
        chatViews.forEach(chat => {
            if (chat.paused === undefined) {
                chat.paused = false;
            }
        });
        requestRender({ immediate: true });
    }
    
    // Always use divided mode (removed unified mode toggle)
    isUnifiedView = false;
}

// Save chats to localStorage
function saveChats() {
    try {
        localStorage.setItem('chatPanels', JSON.stringify(chatViews));
        // Removed chatStyle - we only use Streamlabs style now
    } catch (error) {
        console.error('[UI] Error saving chats:', error);
    }
}

// Generate unique ID for chat panel
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

const YOUTUBE_KEY_DEFAULT_NOTE = 'API klíč se drží jen v této bublině a v paměti vašeho prohlížeče. Po obnovení nebo na jiném zařízení jej budete muset zadat znovu.';

function getSessionYoutubeKey() {
    return sessionYoutubeApiKey.trim();
}

function updateYoutubeKeyStatus(customText) {
    if (!youtubeKeyStatus) return;
    if (sessionYoutubeApiKey) {
        youtubeKeyStatus.textContent = customText || 'Aktivní v této relaci';
        youtubeKeyStatus.classList.add('active');
    } else {
        youtubeKeyStatus.textContent = customText || 'Neaktivní – klíč zadáváte ručně pouze zde';
        youtubeKeyStatus.classList.remove('active');
    }
}

function setSessionYoutubeApiKey(keyValue) {
    sessionYoutubeApiKey = (keyValue || '').trim();
    if (sessionYoutubeApiKey) {
        console.log('[YouTube] Session API key nastaven (uloženo pouze v paměti prohlížeče).');
    } else {
        console.log('[YouTube] Session API key byl vymazán.');
    }
    updateYoutubeKeyStatus();
    
    if (sessionYoutubeApiKey && youtubeKeyWaitlist.size > 0) {
        const pending = Array.from(youtubeKeyWaitlist);
        youtubeKeyWaitlist.clear();
        pending.forEach(panelId => {
            const chat = chatViews.find(c => c.id === panelId && c.platform === 'youtube');
            if (!chat) return;
            const channel = extractChannel(chat.originalUrl || chat.url, chat.platform);
            if (channel) {
                console.log(`[YouTube] Retrying connection for ${panelId} po zadání API klíče.`);
                connectYouTubeChat(channel, panelId);
            }
        });
    }
}

function openYoutubeKeyBubble(customMessage = null) {
    if (!youtubeKeyBubble) return;
    youtubeKeyBubble.classList.add('visible');
    if (youtubeKeyNote) {
        youtubeKeyNote.textContent = customMessage || youtubeKeyNote?.dataset?.defaultMessage || YOUTUBE_KEY_DEFAULT_NOTE;
    }
    if (youtubeKeyInput) {
        youtubeKeyInput.value = sessionYoutubeApiKey;
        youtubeKeyInput.focus();
        youtubeKeyInput.select();
    }
    updateYoutubeKeyStatus();
}

function closeYoutubeKeyBubble() {
    if (!youtubeKeyBubble) return;
    youtubeKeyBubble.classList.remove('visible');
}

function requireYoutubeApiKey(panelId, contextualMessage) {
    youtubeKeyWaitlist.add(panelId);
    const message = contextualMessage || 'Zadejte YouTube API klíč kliknutím na tlačítko „🔑 YouTube API“. Klíč se nikam neposílá, zůstává jen v tomto okně.';
    openYoutubeKeyBubble(message);
}

// Extract channel name from Twitch URL
function extractTwitchChannel(url) {
    if (!url) return null;
    
    // Remove trailing slash and query parameters for cleaner matching
    const cleanUrl = url.split('?')[0].replace(/\/$/, '');
    
    const patterns = [
        /twitch\.tv\/popout\/([^\/\?]+)/i,
        /twitch\.tv\/embed\/([^\/\?]+)/i,
        /twitch\.tv\/([^\/\?]+)/i,
        /embed\.twitch\.tv\/([^\/\?]+)/i
    ];
    
    for (const pattern of patterns) {
        const match = cleanUrl.match(pattern);
        if (match && match[1]) {
            const channel = match[1];
            // Skip common non-channel paths
            if (!['popout', 'embed', 'directory', 'p', 'videos', 'settings', 'dashboard'].includes(channel.toLowerCase())) {
                return channel;
            }
        }
    }
    return null;
}

// Get chat embed URL based on platform and original URL
function getEmbedUrl(url, platform) {
    try {
        const urlObj = new URL(url);
        
        switch (platform) {
            case 'twitch':
                // Extract channel name from URL
                const channel = extractTwitchChannel(url);
                if (channel) {
                    // Use Twitch embed chat with parent parameter
                    // This allows embedding if the parent domain is whitelisted
                    const parentDomain = window.location.hostname || 'localhost';
                    return `https://www.twitch.tv/embed/${channel}/chat?parent=${parentDomain}&darkpopout`;
                }
                return url;
                
            case 'youtube':
                // YouTube chat embed
                if (url.includes('/live_chat')) {
                    return url;
                }
                // Extract video ID from various YouTube URL formats
                const ytPatterns = [
                    /(?:youtube\.com\/live\/|youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?#\/]+)/,
                    /youtube\.com\/.*[?&]v=([^&\?#\/]+)/
                ];
                
                let videoId = null;
                for (const pattern of ytPatterns) {
                    const match = url.match(pattern);
                    if (match && match[1]) {
                        videoId = match[1];
                        break;
                    }
                }
                
                if (videoId) {
                    return `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${window.location.hostname}`;
                }
                return url;
                
            case 'kick':
                // Kick chat URL - extract channel name
                const kickMatch = url.match(/kick\.com\/([^\/\?]+)/);
                if (kickMatch) {
                    const channel = kickMatch[1];
                    // Kick chatroom URL - use the full page URL which works better in iframe
                    // The chatroom endpoint sometimes requires the full channel page
                    return `https://kick.com/${channel}/chatroom`;
                }
                // If already a chatroom URL, return as is
                if (url.includes('/chatroom')) {
                    return url;
                }
                return url;
                
            default:
                return url;
        }
    } catch (e) {
        return url; // Return original URL if parsing fails
    }
}

// Generate chat name based on platform and channel
function generateChatName(platform, url) {
    const channel = extractChannel(url, platform);
    
    if (channel) {
        // Capitalize channel name (first letter of each word)
        const formattedChannel = channel
            .split(/[-_\s]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        
        // Format: "ChannelName - Platform"
        const platformNames = {
            'twitch': 'Twitch',
            'kick': 'Kick',
            'youtube': 'YouTube'
        };
        
        return `${formattedChannel} - ${platformNames[platform] || platform}`;
    }
    
    // Fallback if channel cannot be extracted
    return `${platform.charAt(0).toUpperCase() + platform.slice(1)} Chat`;
}

// Add new chat panel
function addChat(url, name, platform) {
    console.log('[UI] Adding new chat:', { url, name, platform });
    
    // Close modal immediately
    closeModal();
    
    const embedUrl = getEmbedUrl(url, platform);
    
    // Generate automatic name if not provided
    const chatName = name || generateChatName(platform, url);
    
    const chatPanel = {
        id: generateId(),
        url: embedUrl,
        originalUrl: url,
        name: chatName,
        platform: platform,
        paused: false, // Track if chat is paused (not receiving new messages)
        createdAt: new Date().toISOString()
    };
    
    chatViews.push(chatPanel);
    saveChats();
    
    // Check OAuth status if this is a Kick chat
    if (platform === 'kick') {
        setTimeout(() => {
            checkKickOAuthStatus(true); // Force check when adding Kick chat
        }, 500);
    }
    
    // Render chats on next animation frame to avoid blocking updates
    requestRender();
    ensureWebSocketConnection(true);
    
    console.log(`[UI] Chat added with name: ${chatName}`);
}

// Remove chat panel
function removeChat(id) {
    console.log(`[UI] removeChat called for: ${id}`);
    
    // Remove from connected set first
    connectedChats.delete(id);
    pendingConnections.delete(id);
    
    // Disconnect from server
    disconnectChat(id);
    
    // Remove from chatViews
    const beforeCount = chatViews.length;
    chatViews = chatViews.filter(chat => chat.id !== id);
    const removed = beforeCount !== chatViews.length;
    
    if (removed) {
        console.log(`[UI] Chat ${id} removed from chatViews`);
        // Save and render
        saveChats();
        requestRender();
        closeIdleWebSocketConnection();
    } else {
        console.warn(`[UI] Chat ${id} not found in chatViews`);
    }
}

// Clear all chats
function clearAllChats() {
    if (confirm('Opravdu chcete vymazat všechny chaty?')) {
        console.log('[UI] Clearing all chats');
        // Disconnect all chat clients
        Object.keys(chatClients).forEach(id => {
            disconnectChat(id);
        });
        // Clear all pending connections
        pendingConnections.clear();
        youtubeKeyWaitlist.clear();
        // Clear chat views
        chatViews = [];
        // Save and render
        saveChats();
        requestRender({ immediate: true });
        closeIdleWebSocketConnection();
    }
}

function hasConnectableChats() {
    return chatViews.some(chat => !chat.permanentError);
}

function ensureWebSocketConnection(force = false) {
    if (!hasConnectableChats()) {
        return null;
    }
    if (!force && !isServerRunning) {
        return null;
    }
    if (wsServer && (wsServer.readyState === WebSocket.OPEN || wsServer.readyState === WebSocket.CONNECTING)) {
        return wsServer;
    }
    return connectWebSocketServer();
}

function closeIdleWebSocketConnection() {
    if (!hasConnectableChats() && wsServer) {
        console.log('[WS] Closing idle WebSocket connection - no chat panels remain');
        wsServer.close(1000, 'No chats active');
        wsServer = null;
        wsReady = false;
    }
}

// Removed toggle view functionality - always use divided mode

// Connect to WebSocket server
function connectWebSocketServer() {
    // If already connected and open, return existing connection
    if (wsServer && wsServer.readyState === WebSocket.OPEN) {
        console.log('[WS] Using existing connection');
        return wsServer;
    }
    
    // If connecting, wait for it to complete
    if (wsServer && wsServer.readyState === WebSocket.CONNECTING) {
        console.log('[WS] Connection already in progress, waiting...');
        return wsServer;
    }
    
    try {
        // Close existing connection if it exists (but only if not already closed)
        if (wsServer && (wsServer.readyState === WebSocket.OPEN || wsServer.readyState === WebSocket.CONNECTING)) {
            console.log('[WS] Closing existing connection before creating new one');
            wsServer.onclose = null; // Prevent reconnect loop
            wsServer.close();
        }
        
        const connectionId = generateId();
        console.log(`[WS] Creating new WebSocket connection: ${connectionId}`);
        wsServer = new WebSocket(WS_SERVER_URL + '?id=' + connectionId);
        
        wsServer.onopen = () => {
            console.log(`[WS] Connected to backend server (${connectionId})`);
            wsReady = true;
            
            // Clear any reconnect timeout
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
            
            // Connect all saved chats after WebSocket is ready (with delay to ensure ready)
            setTimeout(() => {
                reconnectAllChats();
            }, 100);
        };
        
        wsServer.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('[WS] Received message:', message.type, message.connectionId || 'no-id');
                handleServerMessage(message);
            } catch (e) {
                console.error('[WS] Error parsing message:', e, event.data);
            }
        };
        
        wsServer.onerror = (error) => {
            console.error('[WS] Connection error:', error);
        };
        
        wsServer.onclose = (event) => {
            console.log(`[WS] Connection closed (code: ${event.code}, reason: ${event.reason || 'none'})`);
            wsReady = false;
            wsServer = null; // Clear reference
            
            // Only reconnect if not intentionally closed (code 1000 = normal closure)
            if (event.code !== 1000) {
                // Clear any existing reconnect timeout
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                }
                
                // Attempt to reconnect after 3 seconds
                reconnectTimeout = setTimeout(() => {
                    console.log('[WS] Attempting to reconnect...');
                    if ((!wsServer || !wsServer.readyState || wsServer.readyState !== WebSocket.OPEN) && hasConnectableChats()) {
                        ensureWebSocketConnection(true);
                    }
                }, 3000);
            }
        };
        
        return wsServer;
    } catch (error) {
        console.error('[WS] Failed to connect:', error);
        wsReady = false;
        return null;
    }
}

// Handle messages from server
function handleServerMessage(message) {
    const { type, platform, connectionId } = message;
    
    console.log(`[WS] handleServerMessage called:`, { type, platform, connectionId, hasUsername: !!message.username, messagePreview: message.message?.substring(0, 30) });
    
    // connectionId from server is the panelId
    const panelId = connectionId;
    
    if (!panelId && type !== 'connected') {
        console.warn('[WS] Received message without connectionId:', message);
        return;
    }
    
    // Find panel by connection ID (connectionId from server matches panel ID)
    const chatView = chatViews.find(c => c.id === panelId);
    
    if (!chatView && type !== 'connected') {
        console.warn(`[WS] Panel not found for connectionId: ${panelId}. Available panels:`, chatViews.map(c => c.id));
        return;
    }
    
    switch (type) {
        case 'chat':
            if (panelId) {
                // Check if chat is paused - skip messages if paused
                if (chatView && chatView.paused) {
                    console.log(`[WS] Chat ${panelId} is paused, skipping message`);
                    return;
                }
                
                console.log(`[WS] Received chat message for panel ${panelId}:`, {
                    username: message.username,
                    message: message.message?.substring(0, 50),
                    color: message.color,
                    fullMessage: message
                });
                
                // Verify panel exists in DOM
                const panel = document.querySelector(`[data-id="${panelId}"]`);
                if (!panel) {
                    console.error(`[WS] Panel ${panelId} not found in DOM!`);
                    return;
                }
                
                addChatMessage(panelId, message);
            } else {
                console.error(`[WS] Chat message received but panelId is null!`, message);
            }
            break;
            
        case 'status':
            if (panelId) {
                console.log(`[WS] Status update for panel ${panelId}:`, message.status);
                
                // Update YouTube chat name if channel name is provided
                if (message.platform === 'youtube' && message.channelName) {
                    const chatView = chatViews.find(c => c.id === panelId);
                    if (chatView && chatView.name && chatView.name.includes(message.channel || '')) {
                        // Update chat name with channel name
                        chatView.name = `${message.channelName} - YouTube`;
                        saveChats();
                        // Update panel title if in divided mode
                        if (!isUnifiedView) {
                            const panel = document.querySelector(`[data-id="${panelId}"]`);
                            if (panel) {
                                const titleElement = panel.querySelector('h3');
                                if (titleElement) {
                                    titleElement.textContent = chatView.name;
                                }
                            }
                        }
                    }
                }
                
                // Check if chat is paused - if so, don't process status updates except to disconnect
                const chatView = chatViews.find(c => c.id === panelId);
                if (chatView && chatView.paused && message.status === 'connected') {
                    console.log(`[WS] Chat ${panelId} connected but is paused, disconnecting to save resources`);
                    // Disconnect immediately if paused
                    setTimeout(() => {
                        if (chatView && chatView.paused) {
                            disconnectChat(panelId);
                            updateChatStatus(panelId, 'paused');
                        }
                    }, 100);
                    return;
                }
                
                // Don't update status if chat is paused (it's intentionally disconnected)
                if (!chatView || !chatView.paused) {
                    // Pass error message if status is error
                    const errorMessage = message.status === 'error' ? message.message : null;
                    updateChatStatus(panelId, message.status, errorMessage);
                }
                
                if (message.status === 'connected') {
                    pendingConnections.delete(panelId);
                    // Only mark as connected if not paused
                    if (!chatView || !chatView.paused) {
                        connectedChats.add(panelId); // Mark as connected
                        console.log(`[WS] Chat ${panelId} marked as connected`);
                    }
                } else if (message.status === 'error' || message.status === 'disconnected') {
                    pendingConnections.delete(panelId);
                    connectedChats.delete(panelId); // Remove from connected set
                    console.log(`[WS] Chat ${panelId} removed from connected set (${message.status})`);
                    
                    // Mark Kick chats with authentication errors as permanent failures to prevent reconnection attempts
                    if (chatView && chatView.platform === 'kick' && message.message && 
                        (message.message.includes('autentizaci') || message.message.includes('authentication') || 
                         message.message.includes('HTML místo JSON') || message.message.includes('Kick chat není'))) {
                        chatView.permanentError = true;
                        chatView.lastErrorMessage = message.message; // Store error message in chat object
                        chatErrorMessages.set(panelId, message.message); // Also store in Map for immediate access
                        console.log(`[UI] Marking Kick chat ${panelId} as permanent error - API requires authentication, will not reconnect`);
                        console.log(`[UI] Error message stored: ${message.message}`);
                    }
                }
            }
            break;
            
        case 'error':
            if (panelId) {
                console.error(`[${platform}] Error for panel ${panelId}:`, message.message);
                updateChatStatus(panelId, 'error', message.message);
                pendingConnections.delete(panelId);
                if (platform === 'youtube') {
                    const msg = (message.message || '').toLowerCase();
                    if (msg.includes('key') || msg.includes('klíč')) {
                        requireYoutubeApiKey(panelId, message.message);
                    }
                }
            }
            break;
            
        case 'connected':
            console.log('[WS] Server connection confirmed');
            break;
            
        default:
            console.log('[WS] Unknown message type:', type);
    }
}

// Reconnect all chats after WebSocket is ready
function reconnectAllChats() {
    console.log(`[WS] Reconnecting ${chatViews.length} chats...`);
    
    if (!wsReady || !wsServer || wsServer.readyState !== WebSocket.OPEN) {
        console.warn('[WS] Cannot reconnect - WebSocket not ready');
        return;
    }
    
    // Small delay to ensure WebSocket is fully ready
    setTimeout(() => {
        let reconnectCount = 0;
        const chatsToReconnect = chatViews.filter(c => 
            (c.platform === 'twitch' || c.platform === 'kick' || c.platform === 'youtube') && 
            !c.paused && // Skip paused chats
            !c.permanentError // Skip chats with permanent errors (e.g., Kick API auth required)
        );
        
        chatsToReconnect.forEach((chat, index) => {
            const channel = extractChannel(chat.originalUrl || chat.url, chat.platform);
            if (channel) {
                // Only reconnect if not already connected
                if (!connectedChats.has(chat.id)) {
                    // Reset pending state to allow reconnection
                    pendingConnections.delete(chat.id);
                    
                    // Small delay between connections to avoid overwhelming server
                    setTimeout(() => {
                        reconnectCount++;
                        console.log(`[WS] Reconnecting chat ${reconnectCount}/${chatsToReconnect.length}: ${chat.platform} - ${chat.id}`);
                        if (chat.platform === 'twitch') {
                            connectTwitchChat(channel, chat.id);
                        } else if (chat.platform === 'kick') {
                            connectKickChat(channel, chat.id);
                        } else if (chat.platform === 'youtube') {
                            connectYouTubeChat(channel, chat.id);
                        }
                    }, index * 300); // Stagger connections
                } else {
                    console.log(`[WS] Chat ${chat.id} already connected, skipping`);
                }
            }
        });
        
        // Set paused status for paused chats
        chatViews.forEach(chat => {
            if (chat.paused) {
                updateChatStatus(chat.id, 'paused');
            }
        });
    }, 200);
}

// Connect to Twitch chat via backend server
function connectTwitchChat(channel, panelId) {
    // Check if chat is paused
    const chatView = chatViews.find(c => c.id === panelId);
    if (chatView && chatView.paused) {
        console.log(`[Twitch] Skipping connection for chat ${panelId} - chat is paused`);
        updateChatStatus(panelId, 'paused');
        return;
    }
    
    // Prevent duplicate connections
    if (pendingConnections.has(panelId)) {
        console.log(`[Twitch] Already connecting: ${panelId}`);
        return;
    }
    
    if (!wsReady || !wsServer || wsServer.readyState !== WebSocket.OPEN) {
        console.log('[Twitch] WebSocket not ready, waiting...');
        updateChatStatus(panelId, 'connecting');
        // Wait for WebSocket to be ready (max 10 seconds)
        let attempts = 0;
        const maxAttempts = 10;
        const checkInterval = setInterval(() => {
            attempts++;
            if (wsReady && wsServer && wsServer.readyState === WebSocket.OPEN) {
                clearInterval(checkInterval);
                connectTwitchChat(channel, panelId);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                updateChatStatus(panelId, 'error');
                console.error('[Twitch] WebSocket connection timeout');
            }
        }, 1000);
        return;
    }
    
    pendingConnections.add(panelId);
    chatClients[panelId] = panelId;
    
    // Send connect message to server
    wsServer.send(JSON.stringify({
        type: 'connect',
        platform: 'twitch',
        channel: channel.toLowerCase(),
        connectionId: panelId
    }));
    
    updateChatStatus(panelId, 'connecting');
}

// Connect to Kick chat via backend server
async function connectKickChat(channel, panelId) {
    // Check if this chat has a permanent error
    const chatView = chatViews.find(c => c.id === panelId);
    if (!chatView) {
        console.warn(`[Kick] Cannot connect - chat view not found: ${panelId}`);
        return;
    }
    
    // Don't connect if chat is paused
    if (chatView.paused) {
        console.log(`[Kick] Skipping connection for chat ${panelId} - chat is paused`);
        updateChatStatus(panelId, 'paused');
        return;
    }
    
    if (chatView.permanentError) {
        // Only log once per session to avoid spam
        if (!chatView._permanentErrorLogged) {
            console.log(`[UI] Skipping connection for Kick chat ${panelId} - permanent error (API requires authentication)`);
            chatView._permanentErrorLogged = true;
        }
        updateChatStatus(panelId, 'error');
        return;
    }
    
    // Prevent duplicate connections
    if (pendingConnections.has(panelId)) {
        console.log(`[Kick] Already connecting: ${panelId}`);
        return;
    }
    
    if (!wsReady || !wsServer || wsServer.readyState !== WebSocket.OPEN) {
        console.log('[Kick] WebSocket not ready, waiting...');
        updateChatStatus(panelId, 'connecting');
        // Wait for WebSocket to be ready (max 10 seconds)
        let attempts = 0;
        const maxAttempts = 10;
        const checkInterval = setInterval(() => {
            attempts++;
            if (wsReady && wsServer && wsServer.readyState === WebSocket.OPEN) {
                clearInterval(checkInterval);
                connectKickChat(channel, panelId);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                updateChatStatus(panelId, 'error');
                console.error('[Kick] WebSocket connection timeout');
            }
        }, 1000);
        return;
    }
    
    pendingConnections.add(panelId);
    chatClients[panelId] = panelId;
    
    // Send connect message to server
    wsServer.send(JSON.stringify({
        type: 'connect',
        platform: 'kick',
        channel: channel.toLowerCase(),
        connectionId: panelId
    }));
    
    updateChatStatus(panelId, 'connecting');
}

// Connect to YouTube chat via backend
function connectYouTubeChat(videoId, panelId) {
    // Prevent duplicate connections
    if (pendingConnections.has(panelId)) {
        console.log(`[YouTube] Already connecting: ${panelId}`);
        return;
    }
    
    if (!wsReady || !wsServer || wsServer.readyState !== WebSocket.OPEN) {
        console.log('[YouTube] WebSocket not ready, waiting...');
        updateChatStatus(panelId, 'connecting');
        // Wait for WebSocket to be ready (max 10 seconds)
        let attempts = 0;
        const maxAttempts = 10;
        const checkInterval = setInterval(() => {
            attempts++;
            if (wsReady && wsServer && wsServer.readyState === WebSocket.OPEN) {
                clearInterval(checkInterval);
                connectYouTubeChat(videoId, panelId);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                updateChatStatus(panelId, 'error');
                console.error('[YouTube] WebSocket connection timeout');
            }
        }, 1000);
        return;
    }
    
    if (!videoId) {
        console.error(`[YouTube] No video ID provided for YouTube chat (Panel: ${panelId})`);
        updateChatStatus(panelId, 'error');
        return;
    }
    
    const apiKey = getSessionYoutubeKey();
    if (!apiKey) {
        const chatView = chatViews.find(c => c.id === panelId);
        const friendlyName = chatView?.name || `YouTube (${videoId})`;
        const warningMessage = `YouTube API klíč chybí – klikněte na „🔑 YouTube API“ a zadejte ho pro ${friendlyName}. Klíč zůstává pouze ve vašem prohlížeči.`;
        pendingConnections.delete(panelId);
        updateChatStatus(panelId, 'error', warningMessage);
        requireYoutubeApiKey(panelId, warningMessage);
        return;
    }
    
    pendingConnections.add(panelId);
    console.log(`[YouTube] Connecting to YouTube chat: ${videoId} (Panel: ${panelId})`);
    
    if (wsServer && wsServer.readyState === WebSocket.OPEN) {
        const connectMessage = {
            type: 'connect',
            platform: 'youtube',
            channel: videoId,
            connectionId: panelId,
            youtubeApiKey: apiKey
        };
        youtubeKeyWaitlist.delete(panelId);
        
        console.log(`[YouTube] Sending connect message:`, connectMessage);
        wsServer.send(JSON.stringify(connectMessage));
        console.log(`[YouTube] ✓ Connect message sent for panel ${panelId} with video ID: ${videoId}`);
        updateChatStatus(panelId, 'connecting');
    } else {
        console.error(`[YouTube] WebSocket not ready (state: ${wsServer?.readyState}) for YouTube connection`);
        pendingConnections.delete(panelId);
        updateChatStatus(panelId, 'error');
    }
}

// Disconnect chat client
function disconnectChat(panelId) {
    // Check if chat exists (might have been removed already)
    const chatView = chatViews.find(c => c.id === panelId);
    youtubeKeyWaitlist.delete(panelId);
    
    if (!chatView) {
        // Chat might already be removed, just clean up locally
        console.log(`[UI] Chat view not found for disconnect (already removed?): ${panelId}`);
        connectedChats.delete(panelId);
        pendingConnections.delete(panelId);
        delete chatClients[panelId];
        return;
    }
    
    console.log(`[UI] Disconnecting chat: ${panelId} (${chatView.platform})`);
    
    // Remove from connected set
    connectedChats.delete(panelId);
    pendingConnections.delete(panelId);
    
    // Send disconnect message to server if WebSocket is ready
    const ws = wsServer; // Use existing connection, don't create new one
    if (ws && ws.readyState === WebSocket.OPEN) {
        try {
            // Send disconnect message to server
            ws.send(JSON.stringify({
                type: 'disconnect',
                platform: chatView.platform,
                channel: extractChannel(chatView.originalUrl || chatView.url, chatView.platform),
                connectionId: panelId
            }));
            console.log(`[UI] Disconnect message sent for ${panelId}`);
        } catch (error) {
            console.error(`[UI] Error sending disconnect message:`, error);
        }
    } else {
        console.log(`[UI] WebSocket not ready, skipping disconnect message for ${panelId}`);
    }
    
    delete chatClients[panelId];
}

// Track message IDs to prevent duplicates
const receivedMessageIds = new Set();

// Get default user color based on badges/role (Twitch standard colors)
// NOTE: This is used as fallback if messageData.color is not available
function getDefaultUserColor(messageData) {
    // First priority: Badge-based colors (only if no custom color from Twitch)
    if (messageData.badgeInfo) {
        if (messageData.badgeInfo.broadcaster) return '#E91916'; // Red for broadcaster (Twitch standard)
        if (messageData.badgeInfo.moderator) return '#00D4AA'; // Teal for mod
        if (messageData.badgeInfo.vip) return '#9C27B0'; // Purple for VIP
        // Note: Subscriber and other badges don't override user's chosen color
    }
    
    // Note: messageData.color should already be validated in addChatMessage()
    // This fallback should rarely be needed
    
    // Last resort: Generate color from username hash (same as Twitch does)
    return generateColorFromString(messageData.username || 'user');
}

// Generate consistent color from string
function generateColorFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    // Use vibrant colors (saturation 70-100%, lightness 50-60%)
    const saturation = 70 + (Math.abs(hash) % 30);
    const lightness = 50 + (Math.abs(hash) % 10);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Render Twitch badges with images from Twitch CDN
function renderTwitchBadges(badgeInfo) {
    const container = document.createDocumentFragment();
    const badges = [];
    
    // Handle both parsed badgeInfo and raw badges object
    const badgesObj = typeof badgeInfo === 'object' && badgeInfo !== null ? badgeInfo : {};
    
    // Badge priority: broadcaster > mod > vip > partner > subscriber > premium > staff/admin
    if (badgesObj.broadcaster || badgesObj.broadcaster === true || badgesObj.broadcaster === '1') {
        badges.push(createBadgeImage('broadcaster', badgesObj.broadcaster, '#E91E63', 'Broadcaster'));
    }
    if (badgesObj.moderator || badgesObj.moderator === true || badgesObj.moderator === '1') {
        badges.push(createBadgeImage('moderator', badgesObj.moderator, '#00D4AA', 'Moderator'));
    }
    if (badgesObj.vip || badgesObj.vip === true || badgesObj.vip === '1') {
        badges.push(createBadgeImage('vip', badgesObj.vip, '#9C27B0', 'VIP'));
    }
    if (badgesObj.partner || badgesObj.partner === true || badgesObj.partner === '1') {
        badges.push(createBadgeImage('partner', badgesObj.partner, '#00ADB5', 'Partner'));
    }
    if (badgesObj.subscriber || badgesObj.subscriber === true || badgesObj.subscriber) {
        const months = badgesObj.subscriberMonths || badgesObj.subscriber;
        badges.push(createBadgeImage('subscriber', months, '#C9C9C9', months ? `Subscriber ${months} months` : 'Subscriber'));
    }
    if (badgesObj.premium || badgesObj.premium === true || badgesObj.premium === '1') {
        badges.push(createBadgeImage('premium', badgesObj.premium, '#9146FF', 'Prime'));
    }
    if (badgesObj.staff || badgesObj.staff === true || badgesObj.staff === '1') {
        badges.push(createBadgeImage('staff', badgesObj.staff, '#FFD700', 'Staff'));
    }
    if (badgesObj.admin || badgesObj.admin === true || badgesObj.admin === '1') {
        badges.push(createBadgeImage('admin', badgesObj.admin, '#FF0000', 'Admin'));
    }
    if (badgesObj.globalMod || badgesObj.globalMod === true || badgesObj.globalMod === '1') {
        badges.push(createBadgeImage('global_mod', badgesObj.globalMod, '#00D4AA', 'Global Mod'));
    }
    
    badges.forEach(badge => {
        if (badge) container.appendChild(badge);
    });
    return container.childNodes.length > 0 ? container : null;
}

// Create badge element with image from Twitch CDN and fallback to emoji
function createBadgeImage(type, version, color, title) {
    const badge = document.createElement('img');
    badge.className = `chat-badge chat-badge-${type}`;
    
    // Twitch badge CDN URL format: https://static-cdn.jtvnw.net/badges/v1/{badge-id}/{version}/1
    const badgeIds = {
        'broadcaster': 'broadcaster',
        'moderator': 'moderator',
        'vip': 'vip',
        'partner': 'partner',
        'subscriber': 'subscriber',
        'premium': 'premium',
        'staff': 'staff',
        'admin': 'admin',
        'global_mod': 'global-mod'
    };
    
    // Badge descriptions for tooltips
    const badgeDescriptions = {
        'broadcaster': 'Streamer (Vlastník kanálu)',
        'moderator': 'Moderátor',
        'vip': 'VIP',
        'partner': 'Twitch Partner',
        'subscriber': 'Odběratel',
        'premium': 'Twitch Prime',
        'staff': 'Twitch Staff',
        'admin': 'Twitch Admin',
        'global_mod': 'Globální moderátor'
    };
    
    const badgeId = badgeIds[type] || type;
    const versionStr = version && version !== true && version !== '1' ? version : '1';
    const description = badgeDescriptions[type] || title;
    
    // Use Twitch CDN for badge images
    badge.src = `https://static-cdn.jtvnw.net/badges/v1/${badgeId}/${versionStr}/1`;
    badge.alt = description;
    badge.title = description + (version && version !== true && version !== '1' ? ` (${version})` : '');
    badge.loading = 'lazy';
    
    // Fallback to emoji with tooltip if image fails
    badge.onerror = function() {
        this.style.display = 'none';
        const fallback = document.createElement('span');
        fallback.className = this.className + ' badge-fallback';
        fallback.textContent = getBadgeEmoji(type);
        fallback.title = description + (version && version !== true && version !== '1' ? ` (${version})` : '');
        fallback.setAttribute('data-badge-type', type);
        fallback.setAttribute('data-badge-title', description);
        fallback.style.cssText = `
            display: inline-block;
            margin-right: 2px;
            font-size: 14px;
            vertical-align: middle;
            cursor: help;
            filter: drop-shadow(0 0 3px ${color});
            position: relative;
        `;
        
        // Enhanced tooltip on hover
        fallback.addEventListener('mouseenter', function(e) {
            showBadgeTooltip(e.target, description, type);
        });
        fallback.addEventListener('mouseleave', function() {
            hideBadgeTooltip();
        });
        
        this.parentNode?.replaceChild(fallback, this);
    };
    
    // Enhanced tooltip for loaded images too
    badge.addEventListener('mouseenter', function(e) {
        showBadgeTooltip(e.target, description, type);
    });
    badge.addEventListener('mouseleave', function() {
        hideBadgeTooltip();
    });
    
    badge.style.cssText = `
        height: 18px;
        width: auto;
        margin-right: 2px;
        vertical-align: middle;
        display: inline-block;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
        cursor: help;
    `;
    
    return badge;
}

// Show enhanced badge tooltip
let badgeTooltip = null;
function showBadgeTooltip(element, description, type) {
    if (badgeTooltip) {
        badgeTooltip.remove();
    }
    
    badgeTooltip = document.createElement('div');
    badgeTooltip.className = 'badge-tooltip';
    badgeTooltip.textContent = description;
    badgeTooltip.style.cssText = `
        position: absolute;
        background: rgba(20, 20, 30, 0.95);
        color: #FFFFFF;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 10000;
        pointer-events: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transform: translateY(-100%);
        margin-bottom: 5px;
    `;
    
    document.body.appendChild(badgeTooltip);
    
    const rect = element.getBoundingClientRect();
    badgeTooltip.style.left = rect.left + (rect.width / 2) - (badgeTooltip.offsetWidth / 2) + 'px';
    badgeTooltip.style.bottom = window.innerHeight - rect.top + 5 + 'px';
}

function hideBadgeTooltip() {
    if (badgeTooltip) {
        badgeTooltip.remove();
        badgeTooltip = null;
    }
}

// Get emoji fallback for badge
function getBadgeEmoji(type) {
    const emojis = {
        'broadcaster': '🔴', // Red circle for broadcaster
        'moderator': '🛡️', // Shield for mod
        'vip': '💜', // Purple heart for VIP
        'partner': '✅', // Checkmark for partner
        'subscriber': '⭐', // Star for subscriber
        'premium': '💎', // Diamond for Prime
        'staff': '👑', // Crown for staff
        'admin': '⚙️', // Gear for admin
        'global_mod': '🌐' // Globe for global mod
    };
    return emojis[type] || '•';
}

// Reconnect chat
function reconnectChat(panelId) {
    const chatView = chatViews.find(c => c.id === panelId);
    if (!chatView) {
        console.warn(`[UI] Cannot reconnect - chat not found: ${panelId}`);
        return;
    }
    
    // Don't reconnect if chat is paused
    if (chatView.paused) {
        console.log(`[UI] Skipping reconnect for chat ${panelId} - chat is paused`);
        updateChatStatus(panelId, 'paused');
        return;
    }
    
    // Don't reconnect chats with permanent errors
    if (chatView.permanentError) {
        // Only log once per session to avoid spam
        if (!chatView._permanentErrorLogged) {
            console.log(`[UI] Skipping reconnect for chat ${panelId} - permanent error (API requires authentication)`);
            chatView._permanentErrorLogged = true;
        }
        updateChatStatus(panelId, 'error');
        return;
    }
    
    console.log(`[UI] Reconnecting chat: ${panelId}`);
    
    // Remove from connected set to force reconnection
    connectedChats.delete(panelId);
    pendingConnections.delete(panelId);
    
    // Disconnect first
    disconnectChat(panelId);
    
    // Reconnect after a short delay
    setTimeout(() => {
        const channel = extractChannel(chatView.originalUrl || chatView.url, chatView.platform);
        if (channel && wsReady && wsServer && wsServer.readyState === WebSocket.OPEN) {
            if (chatView.platform === 'twitch') {
                connectTwitchChat(channel, panelId);
            } else if (chatView.platform === 'kick') {
                connectKickChat(channel, panelId);
            } else if (chatView.platform === 'youtube') {
                connectYouTubeChat(channel, panelId);
            }
        } else {
            updateChatStatus(panelId, 'error');
        }
    }, 500);
}

// Clear messages from specific chat
function clearChatMessages(panelId) {
    const panel = document.querySelector(`[data-id="${panelId}"]`);
    if (!panel) {
        console.warn(`[UI] Cannot clear messages - panel not found: ${panelId}`);
        return;
    }
    
    const messagesContainer = panel.querySelector('.streamlabs-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
        console.log(`[UI] Cleared messages for panel ${panelId}`);
    }
}

// Toggle chat pause/resume
function toggleChatPause(chatId) {
    const chatView = chatViews.find(c => c.id === chatId);
    if (!chatView) {
        console.warn(`[UI] Cannot toggle pause - chat not found: ${chatId}`);
        return;
    }
    
    // Check current state
    const wasPaused = chatView.paused;
    
    // Toggle paused state
    chatView.paused = !chatView.paused;
    
    // Save state
    saveChats();
    
    // If pausing: disconnect from server to save resources
    if (chatView.paused && !wasPaused) {
        console.log(`[UI] Pausing chat ${chatId} - disconnecting from server`);
        disconnectChat(chatId);
        connectedChats.delete(chatId);
        pendingConnections.delete(chatId);
        updateChatStatus(chatId, 'paused');
    }
    // If resuming: reconnect to server
    else if (!chatView.paused && wasPaused) {
        console.log(`[UI] Resuming chat ${chatId} - reconnecting to server`);
        // Update status to connecting
        updateChatStatus(chatId, 'connecting');
        // Reconnect after a short delay
        setTimeout(() => {
            reconnectChat(chatId);
        }, 300);
    }
    
    // Update UI
    const panel = document.querySelector(`[data-id="${chatId}"]`);
    if (panel) {
        const pauseBtn = panel.querySelector('.chat-pause-btn');
        if (pauseBtn) {
            if (chatView.paused) {
                pauseBtn.innerHTML = '▶';
                pauseBtn.title = 'Obnovit příjem zpráv';
                panel.classList.add('chat-paused');
            } else {
                pauseBtn.innerHTML = '⏸';
                pauseBtn.title = 'Pozastavit příjem zpráv';
                panel.classList.remove('chat-paused');
            }
        }
    }
    
    console.log(`[UI] Chat ${chatId} ${chatView.paused ? 'paused and disconnected' : 'resumed and reconnecting'}`);
}

// Render message with emotes (Twitch emotes + BetterTV/FrankerFaceZ support)
function renderMessageWithEmotes(text, emotes, channelName) {
    const fragment = document.createDocumentFragment();
    
    // Twitch emotes format: { "emote-id": ["start-end", "start-end"] }
    // We'll use Twitch CDN to display emotes
    const emoteMap = new Map();
    Object.keys(emotes).forEach(emoteId => {
        const positions = Array.isArray(emotes[emoteId]) ? emotes[emoteId] : [emotes[emoteId]];
        positions.forEach(pos => {
            const [start, end] = pos.split('-').map(Number);
            emoteMap.set(start, { id: emoteId, end, type: 'twitch' });
        });
    });
    
    if (emoteMap.size === 0) {
        fragment.appendChild(document.createTextNode(' ' + text));
        return fragment;
    }
    
    // Sort emote positions
    const sortedPositions = Array.from(emoteMap.entries()).sort((a, b) => a[0] - b[0]);
    
    let lastIndex = 0;
    sortedPositions.forEach(([start, emote]) => {
        // Add text before emote
        if (start > lastIndex) {
            const beforeText = text.substring(lastIndex === 0 ? 0 : lastIndex + 1, start);
            if (beforeText) {
                fragment.appendChild(document.createTextNode(' ' + beforeText));
            }
        }
        
        // Create emote image based on type
        const emoteImg = document.createElement('img');
        emoteImg.className = 'chat-emote chat-emote-' + emote.type;
        
        // Twitch CDN for emotes
        emoteImg.src = `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/1.0`;
        
        const emoteText = text.substring(start, emote.end + 1);
        emoteImg.alt = emoteText;
        emoteImg.title = emoteText;
        emoteImg.loading = 'lazy'; // Lazy loading for performance
        
        // Error handler for missing emotes
        emoteImg.onerror = function() {
            // Fallback to text if emote fails to load
            const fallback = document.createTextNode(emoteText);
            this.parentNode?.replaceChild(fallback, this);
        };
        
        emoteImg.style.cssText = `
            height: 20px;
            width: auto;
            vertical-align: middle;
            margin: 0 2px;
            display: inline-block;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
        `;
        fragment.appendChild(emoteImg);
        
        lastIndex = emote.end;
    });
    
    // Add remaining text after last emote
    if (lastIndex < text.length - 1) {
        const remainingText = text.substring(lastIndex + 1);
        if (remainingText) {
            fragment.appendChild(document.createTextNode(remainingText));
        }
    }
    
    return fragment;
}

// Create platform badge icon
function createPlatformBadge(platform) {
    const badgeContainer = document.createElement('span');
    badgeContainer.className = 'platform-badge-container';
    badgeContainer.style.cssText = 'display: inline-block; margin-right: 6px; vertical-align: middle;';
    
    const badge = document.createElement('span');
    badge.className = `platform-badge-inline ${platform}`;
    
    // Platform icons/text
    const platformIcons = {
        'twitch': '📺',
        'kick': '🎯',
        'youtube': '▶️'
    };
    
    badge.textContent = platformIcons[platform] || '🌐';
    badge.title = platform.charAt(0).toUpperCase() + platform.slice(1);
    badge.style.cssText = `
        display: inline-block;
        font-size: 14px;
        line-height: 1;
        margin-right: 4px;
    `;
    
    badgeContainer.appendChild(badge);
    return badgeContainer;
}

// Add chat message to panel (Streamlabs style)
function addChatMessage(panelId, messageData) {
    // Create unique message ID for deduplication
    const messageId = `${panelId}-${messageData.id || messageData.timestamp || Date.now()}-${messageData.username}-${messageData.message?.substring(0, 20)}`;
    
    // Check if we already processed this message
    if (receivedMessageIds.has(messageId)) {
        console.log(`[UI] Duplicate message detected, skipping: ${messageId.substring(0, 50)}`);
        return;
    }
    
    // Add to received set (limit size to prevent memory leak)
    receivedMessageIds.add(messageId);
    if (receivedMessageIds.size > 1000) {
        // Keep only last 500 IDs
        const idsArray = Array.from(receivedMessageIds);
        receivedMessageIds.clear();
        idsArray.slice(-500).forEach(id => receivedMessageIds.add(id));
    }
    
    // Find the chat to determine platform
    const chatView = chatViews.find(c => c.id === panelId);
    const platform = chatView ? chatView.platform : messageData.platform || 'unknown';
    
    console.log(`[UI] addChatMessage called for panel ${panelId} (${platform}):`, {
        username: messageData.username,
        message: messageData.message?.substring(0, 50),
        hasPanel: !!document.querySelector(`[data-id="${panelId}"]`),
        isUnified: isUnifiedView
    });
    
    // In unified mode, find unified panel instead of individual panel
    let panel, messagesContainer;
    
    if (isUnifiedView) {
        panel = document.querySelector('[data-unified="true"]');
        if (!panel) {
            console.warn(`[UI] Unified panel not found, creating it...`);
            renderChats();
            panel = document.querySelector('[data-unified="true"]');
            if (!panel) {
                console.error(`[UI] Failed to create unified panel`);
                return;
            }
        }
        messagesContainer = panel.querySelector('.streamlabs-messages');
    } else {
        panel = document.querySelector(`[data-id="${panelId}"]`);
        if (!panel) {
            console.error(`[UI] Panel not found for ${panelId}, available panels:`, Array.from(document.querySelectorAll('[data-id]')).map(p => p.dataset.id));
            return;
        }
        messagesContainer = panel.querySelector('.streamlabs-messages');
    }
    
    if (!messagesContainer) {
        console.error(`[UI] Messages container not found`);
        return;
    }
    
    const username = messageData.username || 'Unknown';
    let messageText = messageData.message || '';
    
    // Clean up invisible characters that might cause issues
    messageText = messageText.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    
    if (!messageText) {
        console.warn(`[UI] Empty message after cleanup, skipping`);
        return;
    }
    
    // Get user color - prioritize messageData.color (from Twitch)
    let color = messageData.color;
    
    // Validate color format and content
    if (color) {
        color = String(color).trim();
        
        // Check if it's a valid hex color
        const hexRegex = /^#[0-9A-Fa-f]{6}$/;
        if (hexRegex.test(color)) {
            // Valid hex color - use it (even if it's #000000, #FFFFFF, etc.)
            // Users might intentionally choose these colors
            console.log(`[UI] Using Twitch color for ${username}: ${color}`);
        } else {
            // Invalid format, use fallback
            console.warn(`[UI] Invalid color format "${color}" for ${username}, using fallback`);
            color = getDefaultUserColor(messageData);
        }
    } else {
        // No color provided, use fallback
        color = getDefaultUserColor(messageData);
        console.log(`[UI] No color provided for ${username}, using fallback: ${color}`);
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = 'streamlabs-message';
    messageEl.style.animation = 'slideInMessage 0.3s ease-out forwards';
    messageEl.style.color = '#FFFFFF'; // Ensure text is white
    messageEl.style.display = 'block'; // Ensure element is displayed
    messageEl.dataset.messageId = messageId; // Store ID for potential removal
    
    // Create badge container
    const badgeContainer = document.createElement('span');
    badgeContainer.className = 'streamlabs-badges';
    
    // Add Twitch badges if available
    if (messageData.badgeInfo || messageData.badges) {
        const badges = renderTwitchBadges(messageData.badgeInfo || messageData.badges);
        if (badges) {
            badgeContainer.appendChild(badges);
        }
    }
    
    // Create username span with color from Twitch
    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'streamlabs-username';
    usernameSpan.textContent = username;
    // Apply color with !important to override any CSS rules
    usernameSpan.style.cssText = `
        color: ${color || '#FFFFFF'} !important;
        display: inline !important;
        font-weight: 600 !important;
        margin-right: 6px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    `;
    
    const colonSpan = document.createElement('span');
    colonSpan.textContent = ':';
    colonSpan.style.color = '#FFFFFF';
    
    // Process message text with emotes if available
    const messageSpan = document.createElement('span');
    messageSpan.className = 'streamlabs-message-text';
    
    if (messageData.emotes && Object.keys(messageData.emotes).length > 0) {
        // Render message with emotes (pass channel name for BetterTV/FFZ support if needed)
        const chatView = chatViews.find(c => c.id === panelId);
        const channelName = chatView ? extractChannel(chatView.originalUrl || chatView.url, chatView.platform) : null;
        messageSpan.appendChild(renderMessageWithEmotes(messageText, messageData.emotes, channelName));
    } else {
        messageSpan.textContent = ' ' + messageText;
    }
    messageSpan.style.color = '#FFFFFF';
    messageSpan.style.display = 'inline';
    
    // Add platform badge for unified mode or if not already present
    const hasPlatformBadge = messageEl.querySelector('.platform-badge-container');
    if ((isUnifiedView || !hasPlatformBadge) && platform) {
        const platformBadge = createPlatformBadge(platform);
        messageEl.appendChild(platformBadge);
        messageEl.dataset.platform = platform;
    }
    
    // Assemble message
    if (badgeContainer.children.length > 0) {
        messageEl.appendChild(badgeContainer);
        messageEl.appendChild(document.createTextNode(' '));
    }
    messageEl.appendChild(usernameSpan);
    messageEl.appendChild(colonSpan);
    messageEl.appendChild(messageSpan);
    
    // In unified mode, just add message directly (all mixed together chronologically)
    messagesContainer.appendChild(messageEl);
    
    // Auto-scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Limit messages (keep last 200)
    const messages = messagesContainer.querySelectorAll('.streamlabs-message');
    if (messages.length > 200) {
        // Remove oldest messages and their IDs
        for (let i = 0; i < messages.length - 200; i++) {
            const oldId = messages[i].dataset.messageId;
            if (oldId) receivedMessageIds.delete(oldId);
            messages[i].remove();
        }
    }
    
    console.log(`[UI] ✓ Successfully added message to panel ${panelId}: ${username}: ${messageText.substring(0, 30)}`);
}

// Store error messages for each chat panel
const chatErrorMessages = new Map();

// Update chat connection status
function updateChatStatus(panelId, status, errorMessage = null) {
    const panel = document.querySelector(`[data-id="${panelId}"]`);
    if (!panel) return;
    
    const statusEl = panel.querySelector('.streamlabs-status');
    if (statusEl) {
        let statusText = '';
        switch (status) {
            case 'connected':
                statusText = '● Připojeno';
                chatErrorMessages.delete(panelId); // Clear error message on success
                break;
            case 'connecting':
                statusText = '○ Připojování...';
                break;
            case 'disconnected':
                statusText = '○ Odpojeno';
                break;
            case 'paused':
                statusText = '⏸ Pozastaveno';
                break;
            case 'error':
                statusText = '✕ Chyba';
                // Store error message if provided
                if (errorMessage) {
                    chatErrorMessages.set(panelId, errorMessage);
                    // Also store in chat object for persistence
                    const chatView = chatViews.find(c => c.id === panelId);
                    if (chatView) {
                        chatView.lastErrorMessage = errorMessage;
                        saveChats(); // Save to persist error message
                    }
                }
                break;
            default:
                statusText = '○ ' + status;
        }
        statusEl.textContent = statusText;
        statusEl.className = 'streamlabs-status ' + status;
        
        // Add error message to status element as data attribute for tooltip
        if (status === 'error' && errorMessage) {
            statusEl.dataset.errorMessage = errorMessage;
            statusEl.title = 'Klikněte pro zobrazení detailů chyby';
            statusEl.style.cursor = 'pointer';
            // Add click handler to show error modal
            statusEl.onclick = (e) => {
                e.stopPropagation();
                showErrorModal(panelId, errorMessage);
            };
        } else if (status === 'error') {
            // Error status but no message - try to get from stored messages or chat object
            const chatView = chatViews.find(c => c.id === panelId);
            const storedError = chatErrorMessages.get(panelId) || (chatView && chatView.lastErrorMessage) || null;
            if (storedError) {
                statusEl.dataset.errorMessage = storedError;
                statusEl.title = 'Klikněte pro zobrazení detailů chyby';
                statusEl.style.cursor = 'pointer';
                statusEl.onclick = (e) => {
                    e.stopPropagation();
                    showErrorModal(panelId, storedError);
                };
            } else {
                // No error message available - make it clickable anyway to show generic message
                statusEl.title = 'Klikněte pro zobrazení detailů chyby';
                statusEl.style.cursor = 'pointer';
                statusEl.onclick = (e) => {
                    e.stopPropagation();
                    showErrorModal(panelId, 'Chyba připojení - žádné další informace nejsou dostupné');
                };
            }
        } else {
            statusEl.removeAttribute('data-error-message');
            statusEl.removeAttribute('title');
            statusEl.style.cursor = '';
            statusEl.onclick = null;
        }
    }
}

// Render all chat panels
let isRendering = false; // Prevent recursive rendering

function renderChats() {
    // Prevent recursive calls
    if (isRendering) {
        console.log('[UI] renderChats already in progress, skipping');
        return;
    }
    
    isRendering = true;
    
    try {
        console.log(`[UI] Rendering ${chatViews.length} chats, unified: ${isUnifiedView}`);
        
        // Check if container exists
        if (!chatContainer) {
            console.error('[UI] chatContainer not found!');
            return;
        }
        
        // Check if we need to re-render or just update existing panels
        const existingPanels = Array.from(chatContainer.querySelectorAll('[data-id]'));
        const existingPanelIds = new Set(existingPanels.map(p => p.dataset.id));
        const neededPanelIds = new Set(chatViews.map(c => c.id));
        
        // If all panels exist and we just need to update layout, don't recreate them
        const panelsMatch = existingPanelIds.size === neededPanelIds.size &&
                           Array.from(existingPanelIds).every(id => neededPanelIds.has(id));
        
        if (panelsMatch && chatViews.length > 0) {
            // Just update container class and existing panels
            console.log('[UI] Panels already exist, updating layout only');
            
            if (isUnifiedView) {
                chatContainer.className = 'chat-container unified';
            } else {
                chatContainer.className = 'chat-container divided';
            }
            
            isRendering = false;
            return;
        }
        
        // Save existing messages before clearing
        const existingMessages = new Map();
        existingPanels.forEach(panel => {
            const panelId = panel.dataset.id;
            const messagesContainer = panel.querySelector('.streamlabs-messages');
            if (messagesContainer && messagesContainer.children.length > 0) {
                // Save all message elements, not just HTML
                const messages = Array.from(messagesContainer.children);
                existingMessages.set(panelId, messages);
                console.log(`[UI] Saving ${messages.length} messages for panel ${panelId}`);
            }
        });
        
        // Clear container first
        chatContainer.innerHTML = '';
        
        if (chatViews.length === 0) {
            emptyState.style.display = 'block';
            chatContainer.appendChild(emptyState);
            chatContainer.className = 'chat-container';
            isRendering = false;
            return;
        }
        
        emptyState.style.display = 'none';
        
        // Update container class based on view mode
        if (isUnifiedView) {
            chatContainer.className = 'chat-container unified';
        } else {
            chatContainer.className = 'chat-container divided';
        }
        
        // Remove duplicates - keep only unique chats by ID
        const uniqueChats = [];
        const seenIds = new Set();
        chatViews.forEach(chat => {
            if (!seenIds.has(chat.id)) {
                seenIds.add(chat.id);
                uniqueChats.push(chat);
            }
        });
        
        // Update chatViews if there were duplicates
        if (uniqueChats.length !== chatViews.length) {
            console.log(`[UI] Removed ${chatViews.length - uniqueChats.length} duplicate chats`);
            chatViews = uniqueChats;
            saveChats();
        }
        
        // In unified mode, create one merged panel with all messages mixed together
        if (isUnifiedView && chatViews.length > 0) {
            // Create unified panel
            const unifiedPanel = document.createElement('div');
            unifiedPanel.className = 'streamlabs-panel unified-panel';
            unifiedPanel.dataset.unified = 'true';
            
            const header = document.createElement('div');
            header.className = 'chat-header';
            
            const title = document.createElement('div');
            title.className = 'chat-title';
            const h3 = document.createElement('h3');
            h3.textContent = 'Sjednocený Chat';
            title.appendChild(h3);
            
            header.appendChild(title);
            unifiedPanel.appendChild(header);
            
            const messagesContainer = document.createElement('div');
            messagesContainer.className = 'streamlabs-messages unified-messages';
            
            // Collect all messages from all chats and sort by timestamp
            const allMessages = [];
            chatViews.forEach(chat => {
                const chatMessages = existingMessages.get(chat.id);
                if (chatMessages && chatMessages.length > 0) {
                    chatMessages.forEach(msg => {
                        const clonedMsg = msg.cloneNode(true);
                        // Add platform info to message if not present
                        if (!clonedMsg.dataset.platform) {
                            clonedMsg.dataset.platform = chat.platform;
                        }
                        // Ensure platform badge is present
                        const badgeContainer = clonedMsg.querySelector('.platform-badge-container');
                        if (!badgeContainer) {
                            const platformBadge = createPlatformBadge(chat.platform);
                            if (platformBadge && clonedMsg.firstChild) {
                                clonedMsg.insertBefore(platformBadge, clonedMsg.firstChild);
                            }
                        }
                        // Extract timestamp from message ID or use current time
                        const timestamp = parseInt(clonedMsg.dataset.messageId?.split('-')[0]) || Date.now();
                        allMessages.push({ msg: clonedMsg, timestamp: timestamp });
                    });
                }
            });
            
            // Sort messages by timestamp (oldest first)
            allMessages.sort((a, b) => a.timestamp - b.timestamp);
            
            // Add sorted messages to container
            allMessages.forEach(({ msg }) => {
                messagesContainer.appendChild(msg);
            });
            
            unifiedPanel.appendChild(messagesContainer);
            chatContainer.appendChild(unifiedPanel);
            
            // Still need to connect all chats
            chatViews.forEach(chat => {
                // Skip chats with permanent errors (e.g., Kick API auth required)
                if (chat.permanentError) {
                    console.log(`[UI] Skipping connection for chat ${chat.id} - permanent error`);
                    return;
                }
                
                const channel = extractChannel(chat.originalUrl || chat.url, chat.platform);
                if (channel && wsReady && wsServer && wsServer.readyState === WebSocket.OPEN) {
                    if (chat.platform === 'twitch' && !connectedChats.has(chat.id)) {
                        connectTwitchChat(channel, chat.id);
                    } else if (chat.platform === 'kick' && !connectedChats.has(chat.id)) {
                        connectKickChat(channel, chat.id);
                    } else if (chat.platform === 'youtube' && !connectedChats.has(chat.id)) {
                        connectYouTubeChat(channel, chat.id);
                    }
                }
            });
            
            isRendering = false;
            return;
        }
        
        // Render each chat panel (divided mode)
        chatViews.forEach((chat, index) => {
            try {
                // Check if we have existing messages to restore
                const hasExistingMessages = existingMessages.has(chat.id);
                const wasConnected = connectedChats.has(chat.id);
                
                const panel = createChatPanel(chat);
                if (panel) {
                    chatContainer.appendChild(panel);
                    
                    // Restore existing messages if any (by cloning nodes, not innerHTML)
                    if (hasExistingMessages) {
                        const messagesContainer = panel.querySelector('.streamlabs-messages');
                        if (messagesContainer) {
                            const savedMessages = existingMessages.get(chat.id);
                            savedMessages.forEach(msg => {
                                messagesContainer.appendChild(msg.cloneNode(true));
                            });
                            
                            console.log(`[UI] Restored ${savedMessages.length} messages for panel ${chat.id}`);
                            
                            // Scroll to bottom after restoring
                            setTimeout(() => {
                                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                            }, 0);
                        }
                    }
                } else {
                    console.error(`[UI] Failed to create panel for chat: ${chat.id}`);
                }
            } catch (error) {
                console.error(`[UI] Error creating panel for chat ${chat.id}:`, error);
            }
        });
        
        console.log(`[UI] Successfully rendered ${chatViews.length} chat panels`);
        
        // Force a repaint to ensure DOM updates are visible
        if (chatContainer.offsetParent !== null) {
            chatContainer.offsetHeight; // Force reflow
        }
    } finally {
        isRendering = false;
    }
}

// Create Streamlabs-style chat panel
function createStreamlabsPanel(chat) {
    const panel = document.createElement('div');
    panel.className = 'chat-panel streamlabs-panel';
    panel.dataset.id = chat.id;
    
    const header = document.createElement('div');
    header.className = 'chat-header';
    
    const title = document.createElement('div');
    title.className = 'chat-title';
    
    const h3 = document.createElement('h3');
    h3.textContent = chat.name;
    
    const badge = document.createElement('span');
    badge.className = `platform-badge ${chat.platform}`;
    badge.textContent = chat.platform;
    
    const status = document.createElement('span');
    // Set initial status based on connection state
    if (chat.permanentError) {
        status.className = 'streamlabs-status error';
        status.textContent = '✕ Chyba';
        // Try to get error message from stored messages, or use default
        const errorMsg = chatErrorMessages.get(chat.id) || chat.lastErrorMessage || 'Chyba připojení';
        status.dataset.errorMessage = errorMsg;
        status.title = 'Klikněte pro zobrazení detailů chyby';
        status.style.cursor = 'pointer';
        // Add click handler to show error modal
        status.addEventListener('click', (e) => {
            e.stopPropagation();
            showErrorModal(chat.id, errorMsg);
        });
    } else if (connectedChats.has(chat.id)) {
        status.className = 'streamlabs-status connected';
        status.textContent = '● Připojeno';
    } else {
        status.className = 'streamlabs-status connecting';
        status.textContent = '○ Připojování...';
    }
    
    title.appendChild(h3);
    title.appendChild(badge);
    title.appendChild(status);
    
    // Pause/Resume button in header (always visible)
    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'chat-pause-btn';
    pauseBtn.dataset.chatId = chat.id;
    pauseBtn.innerHTML = chat.paused ? '▶' : '⏸';
    pauseBtn.title = chat.paused ? 'Obnovit příjem zpráv' : 'Pozastavit příjem zpráv';
    pauseBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleChatPause(chat.id);
    };
    
    // Update pause button state when chat is paused/unpaused
    if (chat.paused) {
        panel.classList.add('chat-paused');
        pauseBtn.innerHTML = '▶';
        pauseBtn.title = 'Obnovit příjem zpráv';
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'chat-remove';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Odebrat chat';
    
    // Use event listener instead of inline onclick to prevent issues
    // Use once option to prevent duplicate calls
    removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const chatId = chat.id;
        console.log(`[UI] Remove button clicked for chat: ${chatId}`);
        
        // Remove chat - this will handle disconnect and cleanup
        removeChat(chatId);
    }, { once: false }); // Keep listener for potential re-renders
    
    // Header controls container
    const headerControls = document.createElement('div');
    headerControls.className = 'chat-header-controls';
    headerControls.appendChild(pauseBtn);
    headerControls.appendChild(removeBtn);
    
    header.appendChild(title);
    header.appendChild(headerControls);
    
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'streamlabs-messages';
    
    // Context menu with actions
    const contextMenu = document.createElement('div');
    contextMenu.className = 'chat-context-menu';
    
    const removeContextBtn = document.createElement('button');
    removeContextBtn.className = 'context-btn context-btn-danger';
    removeContextBtn.innerHTML = '🗑️ Smazat';
    removeContextBtn.title = 'Smazat tento chat';
    removeContextBtn.onclick = (e) => {
        e.stopPropagation();
        removeChat(chat.id);
    };
    
    const reconnectBtn = document.createElement('button');
    reconnectBtn.className = 'context-btn context-btn-secondary';
    reconnectBtn.innerHTML = '🔄 Znovu připojit';
    reconnectBtn.title = 'Znovu připojit tento chat';
    reconnectBtn.onclick = (e) => {
        e.stopPropagation();
        reconnectChat(chat.id);
    };
    
    const clearMessagesBtn = document.createElement('button');
    clearMessagesBtn.className = 'context-btn context-btn-secondary';
    clearMessagesBtn.innerHTML = '🧹 Vymazat zprávy';
    clearMessagesBtn.title = 'Vymazat všechny zprávy z tohoto chatu';
    clearMessagesBtn.onclick = (e) => {
        e.stopPropagation();
        clearChatMessages(chat.id);
    };
    
    const editBtn = document.createElement('button');
    editBtn.className = 'context-btn context-btn-secondary';
    editBtn.innerHTML = '✏️ Upravit';
    editBtn.title = 'Upravit URL a název tohoto chatu';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        openEditModal(chat.id);
    };
    
    contextMenu.appendChild(editBtn);
    contextMenu.appendChild(removeContextBtn);
    contextMenu.appendChild(reconnectBtn);
    contextMenu.appendChild(clearMessagesBtn);
    
    panel.appendChild(header);
    panel.appendChild(messagesContainer);
    panel.appendChild(contextMenu);
    
    // Only connect if not already connected and not paused
    // Wait for WebSocket to be ready before attempting connection
    if (!connectedChats.has(chat.id) && !chat.paused) {
        const channel = extractChannel(chat.originalUrl || chat.url, chat.platform);
        console.log(`[UI] Creating panel for ${chat.platform} chat ${chat.id}, extracted channel: ${channel || 'NONE'}`);
        
        if (channel) {
            // Wait for WebSocket to be ready
            if (wsReady && wsServer && wsServer.readyState === WebSocket.OPEN) {
                console.log(`[UI] Connecting ${chat.platform} chat: ${channel} (Panel: ${chat.id})`);
                if (chat.platform === 'twitch') {
                    connectTwitchChat(channel, chat.id);
                } else if (chat.platform === 'kick') {
                    connectKickChat(channel, chat.id);
                } else if (chat.platform === 'youtube') {
                    console.log(`[UI] Attempting to connect YouTube chat with video ID: ${channel}`);
                    connectYouTubeChat(channel, chat.id);
                } else {
                    status.textContent = '● Nepodporováno v Streamlabs módu';
                    status.className = 'streamlabs-status error';
                }
            } else {
                console.log(`[UI] WebSocket not ready for chat ${chat.id} (platform: ${chat.platform}), will connect when ready`);
                // Status will be updated when connection is established
            }
        } else {
            console.error(`[UI] Failed to extract channel from URL for ${chat.platform}: ${chat.originalUrl || chat.url}`);
            status.textContent = '● Chyba - neplatný kanál';
            status.className = 'streamlabs-status error';
        }
    } else if (chat.paused) {
        // Chat is paused, set status to paused
        console.log(`[UI] Chat ${chat.id} is paused, not connecting`);
        updateChatStatus(chat.id, 'paused');
    } else {
        console.log(`[UI] Chat ${chat.id} (${chat.platform}) already connected, skipping reconnection`);
    }
    
    // Store panel ID for message routing
    panel.dataset.panelId = chat.id;
    
    return panel;
}

// Extract channel name from URL
function extractChannel(url, platform) {
    if (!url) return null;
    
    if (platform === 'twitch') {
        return extractTwitchChannel(url);
    } else if (platform === 'kick') {
        // Handle different Kick URL formats
        // https://kick.com/username
        // https://kick.com/popout/username/chatroom
        // https://kick.com/username/chatroom
        const patterns = [
            /kick\.com\/popout\/([^\/\?]+)/i,  // popout/username
            /kick\.com\/([^\/\?]+)/i          // username
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                const channel = match[1];
                // Skip non-channel paths
                if (!['popout', 'embed', 'api', 'v2'].includes(channel.toLowerCase())) {
                    return channel;
                }
            }
        }
        return null;
    } else if (platform === 'youtube') {
        // Support multiple YouTube URL formats:
        // https://www.youtube.com/watch?v=VIDEO_ID
        // https://youtu.be/VIDEO_ID
        // https://www.youtube.com/embed/VIDEO_ID
        // https://www.youtube.com/live/VIDEO_ID
        const patterns = [
            /(?:youtube\.com\/live\/|youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?#\/]+)/,
            /youtube\.com\/.*[?&]v=([^&\?#\/]+)/  // Fallback for any URL with v= parameter
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }
    return null;
}

// Create individual chat panel element
function createChatPanel(chat) {
    // Always use Streamlabs style for Twitch, Kick, and YouTube
    if (chat.platform === 'twitch' || chat.platform === 'kick' || chat.platform === 'youtube') {
        return createStreamlabsPanel(chat);
    }
    
    // For other platforms - not supported in Streamlabs mode
    const panel = document.createElement('div');
    panel.className = 'chat-panel';
    panel.dataset.id = chat.id;
    
    const header = document.createElement('div');
    header.className = 'chat-header';
    
    const title = document.createElement('div');
    title.className = 'chat-title';
    
    const h3 = document.createElement('h3');
    h3.textContent = chat.name || `${chat.platform} Chat`;
    
    const badge = document.createElement('span');
    badge.className = `platform-badge ${chat.platform}`;
    badge.textContent = chat.platform;
    
    title.appendChild(h3);
    title.appendChild(badge);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'chat-remove';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = () => removeChat(chat.id);
    
    header.appendChild(title);
    header.appendChild(removeBtn);
    
    const errorMsg = document.createElement('div');
    errorMsg.className = 'chat-error';
    errorMsg.style.cssText = 'padding: 40px; text-align: center; color: #666;';
    errorMsg.innerHTML = `<p>${chat.platform} není podporován v aktuálním režimu.</p>`;
    
    panel.appendChild(header);
    panel.appendChild(errorMsg);
    
    return panel;
}

// Show error modal with copy option
function showErrorModal(panelId, errorMessage) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.id = 'errorModal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.maxWidth = '600px';
    
    // Close button
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => modal.remove();
    
    // Title
    const title = document.createElement('h2');
    title.textContent = 'Chybová zpráva';
    title.style.color = '#fff';
    title.style.marginBottom = '20px';
    
    // Error message textarea
    const errorTextarea = document.createElement('textarea');
    errorTextarea.value = errorMessage;
    errorTextarea.readOnly = true;
    errorTextarea.style.cssText = `
        width: 100%;
        min-height: 150px;
        padding: 12px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        color: #fff;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        resize: vertical;
        margin-bottom: 15px;
    `;
    
    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-primary';
    copyBtn.textContent = '📋 Kopírovat zprávu';
    copyBtn.style.marginRight = '10px';
    copyBtn.onclick = () => {
        errorTextarea.select();
        document.execCommand('copy');
        copyBtn.textContent = '✓ Zkopírováno!';
        setTimeout(() => {
            copyBtn.textContent = '📋 Kopírovat zprávu';
        }, 2000);
    };
    
    // Close button for modal
    const closeModalBtn = document.createElement('button');
    closeModalBtn.className = 'btn btn-secondary';
    closeModalBtn.textContent = 'Zavřít';
    closeModalBtn.onclick = () => modal.remove();
    
    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'form-actions';
    buttonContainer.style.marginTop = '15px';
    buttonContainer.appendChild(copyBtn);
    buttonContainer.appendChild(closeModalBtn);
    
    // Assemble modal
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(title);
    modalContent.appendChild(errorTextarea);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    
    // Add to document
    document.body.appendChild(modal);
    
    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    
    // Close on Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// Modal functions
function openModal() {
    console.log('[UI] Opening modal');
    chatModal.style.display = 'block';
    // Reset form and update for selected platform
    if (chatForm) {
        chatForm.reset();
    }
    updateFormForPlatform();
    // Small delay to ensure modal is rendered
    setTimeout(() => {
        const urlInput = document.getElementById('chatUrl');
        if (urlInput) {
            urlInput.focus();
        }
    }, 50);
}

function closeModal() {
    console.log('[UI] Closing modal');
    chatModal.style.display = 'none';
    if (chatForm) {
        chatForm.reset();
    }
}

// Open edit modal for specific chat
function openEditModal(chatId) {
    const chat = chatViews.find(c => c.id === chatId);
    if (!chat) {
        console.error(`[UI] Chat not found for editing: ${chatId}`);
        return;
    }
    
    console.log(`[UI] Opening edit modal for chat: ${chatId}`);
    
    // Populate edit form with current values
    const editUrlInput = document.getElementById('editChatUrl');
    const editNameInput = document.getElementById('editChatName');
    const editPlatformSelect = document.getElementById('editPlatform');
    
    if (editUrlInput && editNameInput && editPlatformSelect) {
        editPlatformSelect.value = chat.platform || 'twitch';
        // Update form first, then set values
        updateEditFormForPlatform();
        
        editUrlInput.value = chat.originalUrl || chat.url || '';
        editNameInput.value = chat.name || '';
        
        // Store chat ID being edited
        if (editChatModal) {
            editChatModal.dataset.editingChatId = chatId;
            editChatModal.style.display = 'block';
            
            // Focus on URL input
            setTimeout(() => {
                editUrlInput.focus();
                editUrlInput.select();
            }, 50);
        }
    }
}

function closeEditModal() {
    console.log('[UI] Closing edit modal');
    if (editChatModal) {
        editChatModal.style.display = 'none';
        if (editChatForm) {
            editChatForm.reset();
        }
        if (editChatModal.dataset) {
            delete editChatModal.dataset.editingChatId;
        }
    }
}

// Update existing chat
function updateChat(chatId, url, name, platform) {
    const chatIndex = chatViews.findIndex(c => c.id === chatId);
    if (chatIndex === -1) {
        console.error(`[UI] Chat not found for update: ${chatId}`);
        return;
    }
    
    const oldChat = chatViews[chatIndex];
    console.log(`[UI] Updating chat ${chatId}:`, { url, name, platform, old: oldChat });
    
    // Disconnect old chat first
    disconnectChat(chatId);
    connectedChats.delete(chatId);
    pendingConnections.delete(chatId);
    
    // Generate new embed URL
    const embedUrl = getEmbedUrl(url, platform);
    
    // Generate automatic name if not provided
    const chatName = name || generateChatName(platform, url);
    
    // Update chat data
    chatViews[chatIndex] = {
        ...oldChat,
        url: embedUrl,
        originalUrl: url,
        name: chatName,
        platform: platform,
        updatedAt: new Date().toISOString()
    };
    
    saveChats();
    
    // Re-render chats
    requestRender();
    ensureWebSocketConnection(true);
    
    console.log(`[UI] Chat ${chatId} updated successfully`);
}

// Event Listeners
if (addChatBtn) addChatBtn.addEventListener('click', openModal);
if (closeBtn) closeBtn.addEventListener('click', closeModal);
if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditModal);
if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);
if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllChats);
if (youtubeKeyBtn) {
    youtubeKeyBtn.addEventListener('click', () => {
        if (youtubeKeyBubble && youtubeKeyBubble.classList.contains('visible')) {
            closeYoutubeKeyBubble();
        } else {
            openYoutubeKeyBubble();
        }
    });
}
if (youtubeKeyApplyBtn) {
    youtubeKeyApplyBtn.addEventListener('click', () => {
        setSessionYoutubeApiKey(youtubeKeyInput?.value || '');
        closeYoutubeKeyBubble();
    });
}
if (youtubeKeyClearBtn) {
    youtubeKeyClearBtn.addEventListener('click', () => {
        setSessionYoutubeApiKey('');
        if (youtubeKeyInput) youtubeKeyInput.value = '';
        updateYoutubeKeyStatus('Neaktivní – klíč byl smazán');
    });
}
if (closeYoutubeKeyBubbleBtn) {
    closeYoutubeKeyBubbleBtn.addEventListener('click', closeYoutubeKeyBubble);
}
document.addEventListener('click', (event) => {
    if (!youtubeKeyBubble || !youtubeKeyBtn) return;
    const isClickInsideBubble = youtubeKeyBubble.contains(event.target);
    const isButton = youtubeKeyBtn.contains(event.target);
    if (!isClickInsideBubble && !isButton) {
        closeYoutubeKeyBubble();
    }
});

// Update form fields based on selected platform
function updateFormForPlatform() {
    const platformSelect = document.getElementById('platform');
    const urlInput = document.getElementById('chatUrl');
    const urlLabel = document.getElementById('chatUrlLabel');
    const urlHint = document.getElementById('chatUrlHint');
    const kickOAuthWarning = document.getElementById('kickOAuthWarning');
    
    if (!platformSelect || !urlInput || !urlLabel || !urlHint) return;
    
    const platform = platformSelect.value;
    
    // Update label and placeholder based on platform
    switch(platform) {
        case 'twitch':
            urlLabel.innerHTML = 'URL kanálu Twitch: <span style="color: #f44336;">*</span>';
            urlInput.placeholder = 'https://www.twitch.tv/USERNAME nebo https://www.twitch.tv/popout/USERNAME/chat';
            urlHint.textContent = 'Zadejte URL kanálu Twitch (např. https://www.twitch.tv/gamezense) nebo přímý chat URL';
            urlHint.style.color = '#aaa';
            if (kickOAuthWarning) kickOAuthWarning.style.display = 'none';
            break;
            
        case 'youtube':
            urlLabel.innerHTML = 'URL YouTube videa nebo livestreamu: <span style="color: #f44336;">*</span>';
            urlInput.placeholder = 'https://www.youtube.com/watch?v=VIDEO_ID nebo https://www.youtube.com/live/VIDEO_ID';
            urlHint.textContent = 'Zadejte URL videa/livestreamu. API klíč se zadává přes tlačítko „🔑 YouTube API“ v horní liště a zůstává jen v aktuálním okně.';
            urlHint.style.color = '#a78bfa';
            if (kickOAuthWarning) kickOAuthWarning.style.display = 'none';
            break;
            
        case 'kick':
            urlLabel.innerHTML = 'URL kanálu Kick: <span style="color: #f44336;">*</span>';
            urlInput.placeholder = 'https://kick.com/USERNAME nebo https://kick.com/USERNAME/chat';
            urlHint.textContent = 'Zadejte URL kanálu Kick (např. https://kick.com/gamezense). POZOR: Pro Kick je nutná OAuth autentizace!';
            urlHint.style.color = '#ff9800';
            if (kickOAuthWarning) kickOAuthWarning.style.display = 'block';
            break;
            
        default:
            urlLabel.innerHTML = 'URL zdroje chatu: <span style="color: #f44336;">*</span>';
            urlInput.placeholder = 'https://example.com/chat';
            urlHint.textContent = 'Zadejte URL zdroje chatu. Podpora pro tuto platformu může být omezená.';
            urlHint.style.color = '#aaa';
            if (kickOAuthWarning) kickOAuthWarning.style.display = 'none';
            break;
    }
}

// Validate URL based on platform
function validateChatUrl(url, platform) {
    if (!url || !url.trim()) {
        return { valid: false, error: 'URL je povinné pole.' };
    }
    
    const trimmedUrl = url.trim();
    
    // Basic URL validation
    try {
        const urlObj = new URL(trimmedUrl);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return { valid: false, error: 'URL musí začínat s http:// nebo https://' };
        }
    } catch (e) {
        return { valid: false, error: 'Neplatná URL adresa.' };
    }
    
    // Platform-specific validation
    switch(platform) {
        case 'twitch':
            if (!trimmedUrl.includes('twitch.tv')) {
                return { valid: false, error: 'URL musí obsahovat twitch.tv (např. https://www.twitch.tv/USERNAME)' };
            }
            break;
            
        case 'youtube':
            if (!trimmedUrl.includes('youtube.com') && !trimmedUrl.includes('youtu.be')) {
                return { valid: false, error: 'URL musí obsahovat youtube.com nebo youtu.be (např. https://www.youtube.com/watch?v=VIDEO_ID)' };
            }
            // Check if it's a video/live URL
            const hasVideoId = trimmedUrl.includes('/watch?v=') || 
                            trimmedUrl.includes('/live/') || 
                            trimmedUrl.includes('/embed/') || 
                            trimmedUrl.includes('youtu.be/');
            if (!hasVideoId) {
                return { valid: false, error: 'URL musí být odkaz na video nebo livestream (obsahovat /watch?v=, /live/, /embed/ nebo youtu.be/)' };
            }
            break;
            
        case 'kick':
            if (!trimmedUrl.includes('kick.com')) {
                return { valid: false, error: 'URL musí obsahovat kick.com (např. https://kick.com/USERNAME)' };
            }
            // Check Kick OAuth status
            return { valid: true, warning: 'kick_oauth_check' }; // Signal that OAuth should be checked
    }
    
    return { valid: true };
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const url = document.getElementById('chatUrl').value.trim();
    const name = document.getElementById('chatName').value.trim();
    const platform = document.getElementById('platform').value;
    
    console.log('[UI] Form submitted:', { url, name, platform });
    
    // Validate platform is selected
    if (!platform) {
        alert('Prosím vyberte platformu.');
        document.getElementById('platform').focus();
        return false;
    }
    
    // Validate URL
    const urlValidation = validateChatUrl(url, platform);
    if (!urlValidation.valid) {
        alert(`❌ ${urlValidation.error}`);
        document.getElementById('chatUrl').focus();
        return false;
    }
    
    // Check Kick OAuth if platform is Kick
    if (platform === 'kick' && urlValidation.warning === 'kick_oauth_check') {
        try {
            const response = await fetch(`${API_SERVER_URL}/api/kick/oauth/status`);
            if (response.ok) {
                const oauthData = await response.json();
                if (!oauthData.authenticated) {
                    const proceed = confirm(
                        '⚠️ Kick OAuth není aktivní!\n\n' +
                        'Pro připojení k Kick chatu je nutné se nejprve přihlásit přes tlačítko "🔐 Kick OAuth" v hlavičce.\n\n' +
                        'Chcete pokračovat bez OAuth? (Chat pravděpodobně nebude fungovat)'
                    );
                    if (!proceed) {
                        return false;
                    }
                }
            }
        } catch (error) {
            console.warn('[UI] Could not check Kick OAuth status:', error);
            const proceed = confirm(
                '⚠️ Nelze ověřit stav Kick OAuth.\n\n' +
                'Chat pravděpodobně nebude fungovat bez OAuth autentizace.\n\n' +
                'Chcete pokračovat?'
            );
            if (!proceed) {
                return false;
            }
        }
    }
    
    // Add chat and close modal
    addChat(url, name || undefined, platform);
    
    return false;
});

// Update form when platform changes
const platformSelect = document.getElementById('platform');
if (platformSelect) {
    platformSelect.addEventListener('change', updateFormForPlatform);
    // Initialize form on load
    updateFormForPlatform();
}

// Update edit form fields based on selected platform
function updateEditFormForPlatform() {
    const platformSelect = document.getElementById('editPlatform');
    const urlInput = document.getElementById('editChatUrl');
    const urlLabel = document.getElementById('editChatUrlLabel');
    const urlHint = document.getElementById('editChatUrlHint');
    const kickOAuthWarning = document.getElementById('editKickOAuthWarning');
    
    if (!platformSelect || !urlInput || !urlLabel || !urlHint) return;
    
    const platform = platformSelect.value;
    
    // Update label and placeholder based on platform
    switch(platform) {
        case 'twitch':
            urlLabel.innerHTML = 'URL kanálu Twitch: <span style="color: #f44336;">*</span>';
            urlInput.placeholder = 'https://www.twitch.tv/USERNAME nebo https://www.twitch.tv/popout/USERNAME/chat';
            urlHint.textContent = 'Zadejte URL kanálu Twitch (např. https://www.twitch.tv/gamezense) nebo přímý chat URL';
            urlHint.style.color = '#aaa';
            if (kickOAuthWarning) kickOAuthWarning.style.display = 'none';
            break;
            
        case 'youtube':
            urlLabel.innerHTML = 'URL YouTube videa nebo livestreamu: <span style="color: #f44336;">*</span>';
            urlInput.placeholder = 'https://www.youtube.com/watch?v=VIDEO_ID nebo https://www.youtube.com/live/VIDEO_ID';
            urlHint.textContent = 'Zadejte URL videa/livestreamu. API klíč zadáte kliknutím na „🔑 YouTube API“ – zůstává jen ve vaší relaci.';
            urlHint.style.color = '#a78bfa';
            if (kickOAuthWarning) kickOAuthWarning.style.display = 'none';
            break;
            
        case 'kick':
            urlLabel.innerHTML = 'URL kanálu Kick: <span style="color: #f44336;">*</span>';
            urlInput.placeholder = 'https://kick.com/USERNAME nebo https://kick.com/USERNAME/chat';
            urlHint.textContent = 'Zadejte URL kanálu Kick (např. https://kick.com/gamezense). POZOR: Pro Kick je nutná OAuth autentizace!';
            urlHint.style.color = '#ff9800';
            if (kickOAuthWarning) kickOAuthWarning.style.display = 'block';
            break;
            
        default:
            urlLabel.innerHTML = 'URL zdroje chatu: <span style="color: #f44336;">*</span>';
            urlInput.placeholder = 'https://example.com/chat';
            urlHint.textContent = 'Zadejte URL zdroje chatu. Podpora pro tuto platformu může být omezená.';
            urlHint.style.color = '#aaa';
            if (kickOAuthWarning) kickOAuthWarning.style.display = 'none';
            break;
    }
}

// Edit chat form submit handler
if (editChatForm) {
    editChatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const chatId = editChatModal.dataset.editingChatId;
        if (!chatId) {
            console.error('[UI] No chat ID in edit modal');
            return false;
        }
        
        const url = document.getElementById('editChatUrl').value.trim();
        const name = document.getElementById('editChatName').value.trim();
        const platform = document.getElementById('editPlatform').value;
        
        console.log('[UI] Edit form submitted:', { chatId, url, name, platform });
        
        // Validate platform is selected
        if (!platform) {
            alert('Prosím vyberte platformu.');
            document.getElementById('editPlatform').focus();
            return false;
        }
        
        // Validate URL
        const urlValidation = validateChatUrl(url, platform);
        if (!urlValidation.valid) {
            alert(`❌ ${urlValidation.error}`);
            document.getElementById('editChatUrl').focus();
            return false;
        }
        
        // Check Kick OAuth if platform is Kick
        if (platform === 'kick' && urlValidation.warning === 'kick_oauth_check') {
            try {
                const response = await fetch(`${API_SERVER_URL}/api/kick/oauth/status`);
                if (response.ok) {
                    const oauthData = await response.json();
                    if (!oauthData.authenticated) {
                        const proceed = confirm(
                            '⚠️ Kick OAuth není aktivní!\n\n' +
                            'Pro připojení k Kick chatu je nutné se nejprve přihlásit přes tlačítko "🔐 Kick OAuth" v hlavičce.\n\n' +
                            'Chcete pokračovat bez OAuth? (Chat pravděpodobně nebude fungovat)'
                        );
                        if (!proceed) {
                            return false;
                        }
                    }
                }
            } catch (error) {
                console.warn('[UI] Could not check Kick OAuth status:', error);
                const proceed = confirm(
                    '⚠️ Nelze ověřit stav Kick OAuth.\n\n' +
                    'Chat pravděpodobně nebude fungovat bez OAuth autentizace.\n\n' +
                    'Chcete pokračovat?'
                );
                if (!proceed) {
                    return false;
                }
            }
        }
        
        // Update chat and close modal
        updateChat(chatId, url, name || undefined, platform);
        closeEditModal();
        
        return false;
    });
}

// Update edit form when platform changes
const editPlatformSelect = document.getElementById('editPlatform');
if (editPlatformSelect) {
    editPlatformSelect.addEventListener('change', updateEditFormForPlatform);
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === chatModal) {
        closeModal();
    }
    if (editChatModal && e.target === editChatModal) {
        closeEditModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC to close modal
    if (e.key === 'Escape') {
        if (chatModal.style.display === 'block') {
            closeModal();
        } else if (editChatModal && editChatModal.style.display === 'block') {
            closeEditModal();
        }
    }
    // Ctrl/Cmd + N to add new chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openModal();
    }
});

// Initialize
loadSavedChats();

// Server control functions
function initServerControls() {
    const serverToggleBtn = document.getElementById('serverToggleBtn');
    const serverStatus = document.getElementById('serverStatus');
    
    if (!serverToggleBtn || !serverStatus) {
        console.warn('[UI] Server control elements not found');
        return;
    }
    
    // Check server status on load
    checkServerStatus();
    
    // Check server status periodically
    serverStatusCheckInterval = setInterval(checkServerStatus, 3000); // Every 3 seconds
    
    // Toggle server (start/stop)
    serverToggleBtn.addEventListener('click', async () => {
        if (isServerRunning) {
            await stopServer();
        } else {
            await startServer();
        }
    });
    
    // Restart functionality removed - button no longer exists
}

async function checkServerStatus() {
    const serverStatusText = document.getElementById('serverStatusText');
    if (serverStatusText) {
        // Text is permanently hidden via CSS
        serverStatusText.textContent = 'Kontroluji...';
    }
    
    // Only check OAuth status if there are Kick chats (to avoid unnecessary pings)
    const hasKickChat = chatViews.some(chat => chat.platform === 'kick');
    if (hasKickChat) {
        checkKickOAuthStatus(false); // Use throttling
    }
    
    // Try helper server first
    try {
        const helperResponse = await fetch(`${HELPER_SERVER_URL}/status`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(2000)
        });
        
        if (helperResponse.ok) {
            const helperData = await helperResponse.json();
            if (helperData.helper && helperData.mainServer) {
                // Helper says server is running, check main server
                try {
                    const response = await fetch(`${API_SERVER_URL}/api/server/status`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        signal: AbortSignal.timeout(2000)
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        isServerRunning = data.running !== false;
                        updateServerUI(isServerRunning, data);
                        
                        if (isServerRunning && !wsReady) {
                            console.log('[UI] Server is back online, reconnecting WebSocket...');
                            ensureWebSocketConnection();
                        }
                        return;
                    }
                } catch (e) {
                    // Main server not responding yet
                }
            }
        }
    } catch (helperError) {
        // Helper not available, continue to main server check
    }
    
    // Fallback to main server check
    try {
        const response = await fetch(`${API_SERVER_URL}/api/server/status`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
            const data = await response.json();
            isServerRunning = data.running !== false;
            updateServerUI(isServerRunning, data);
            
            if (isServerRunning && !wsReady) {
                console.log('[UI] Server is back online, reconnecting WebSocket...');
                ensureWebSocketConnection();
            }
        } else {
            isServerRunning = false;
            updateServerUI(false);
            if (serverStatusText) {
                serverStatusText.style.display = ''; // Show text for error status
                serverStatusText.textContent = 'Nedostupný (HTTP ' + response.status + ')';
            }
        }
    } catch (error) {
        isServerRunning = false;
        updateServerUI(false);
        if (serverStatusText) {
            serverStatusText.style.display = ''; // Show text for error status
            serverStatusText.textContent = 'Neběží (nelze se připojit)';
        }
        console.log('[UI] Server status check failed:', error.message);
    }
}

function updateServerUI(running, statusData = null) {
    const serverToggleBtn = document.getElementById('serverToggleBtn');
    const serverStatus = document.getElementById('serverStatus');
    const serverStatusText = document.getElementById('serverStatusText');
    
    if (!serverToggleBtn || !serverStatus || !serverStatusText) return;
    
    if (running && statusData) {
        serverToggleBtn.textContent = 'Vypnout Server';
        serverToggleBtn.className = 'btn btn-server-toggle btn-server-stop';
        serverToggleBtn.disabled = false;
        
        serverStatus.textContent = '';
        serverStatus.className = 'server-status server-status-on';
        serverStatus.title = 'Server běží';
        
        // Text is permanently hidden via CSS - show only status circle
    } else if (running) {
        serverToggleBtn.textContent = 'Vypnout Server';
        serverToggleBtn.className = 'btn btn-server-toggle btn-server-stop';
        serverToggleBtn.disabled = false;
        
        serverStatus.textContent = '';
        serverStatus.className = 'server-status server-status-on';
        serverStatus.title = 'Server běží';
        
        // Text is permanently hidden via CSS - show only status circle
    } else {
        serverToggleBtn.textContent = 'Zapnout Server';
        serverToggleBtn.className = 'btn btn-server-toggle btn-server-start';
        serverToggleBtn.disabled = false;
        
        serverStatus.textContent = '';
        serverStatus.className = 'server-status server-status-off';
        serverStatus.title = 'Server neběží';
        
        // Text is permanently hidden via CSS - show only status circle
    }
}

async function startServer() {
    console.log('[UI] startServer() called');
    
    const serverToggleBtn = document.getElementById('serverToggleBtn');
    const serverStatusText = document.getElementById('serverStatusText');
    
    if (!serverToggleBtn) {
        console.error('[UI] serverToggleBtn element not found!');
        return;
    }
    
    if (serverToggleBtn) {
        serverToggleBtn.disabled = true;
        serverToggleBtn.textContent = 'Spouštění...';
    }
    if (serverStatusText) {
        serverStatusText.style.display = ''; // Show text for starting status
        serverStatusText.textContent = 'Spouštění serveru...';
    }
    
    // First try helper server (if available)
    try {
        console.log('[UI] Trying helper server first:', `${HELPER_SERVER_URL}/start`);
        const helperResponse = await fetch(`${HELPER_SERVER_URL}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(3000)
        });
        
        if (helperResponse.ok) {
            const helperData = await helperResponse.json();
            console.log('[UI] Helper server response:', helperData);
            
            if (helperData.success) {
                if (serverStatusText) {
                    serverStatusText.textContent = 'Čekání na spuštění...';
                }
                // Wait and check main server status
                setTimeout(() => {
                    checkServerStatus();
                }, 2000);
                
                setTimeout(() => {
                    checkServerStatus();
                }, 4000);
                
                if (serverToggleBtn) {
                    serverToggleBtn.disabled = false;
                }
                return;
            }
        }
    } catch (helperError) {
        console.log('[UI] Helper server not available, trying direct API:', helperError.message);
    }
    
    // Fallback to direct API
    try {
        console.log('[UI] Attempting to fetch:', `${API_SERVER_URL}/api/server/start`);
        const response = await fetch(`${API_SERVER_URL}/api/server/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000)
        });
        
        console.log('[UI] Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[UI] Server start response:', data);
        
        if (data.success) {
            console.log('[UI] Server start requested:', data);
            
            if (data.running) {
                if (serverStatusText) {
                    serverStatusText.textContent = 'Server již běží';
                }
                setTimeout(() => {
                    checkServerStatus();
                }, 1000);
            } else {
                if (serverStatusText) {
                    serverStatusText.textContent = 'Čekání na spuštění...';
                }
                setTimeout(() => {
                    checkServerStatus();
                }, 2000);
                setTimeout(() => {
                    checkServerStatus();
                }, 5000);
            }
        } else {
            const errorMsg = `Chyba při spouštění serveru: ${data.error || 'Neznámá chyba'}`;
            console.error('[UI]', errorMsg);
            alert(errorMsg);
            if (serverStatusText) {
                serverStatusText.textContent = 'Chyba: ' + (data.error || 'Neznámá chyba');
            }
        }
    } catch (error) {
        console.error('[UI] Error starting server:', error);
        
        // Show message with helper option
        const useHelper = confirm(
            `Server není dostupný.\n\n` +
            `Chcete použít Server Helper pro automatické ovládání?\n\n` +
            `(Pokud ano, spusťte: chat-panel\\server\\start-helper.bat)\n\n` +
            `Klikněte Zrušit pro ruční spuštění.`
        );
        
        if (!useHelper) {
            alert(
                `📁 Otevřete složku:\n` +
                `H:\\CursorProjects\\Test\\chat-panel\\server\n\n` +
                `🚀 Dvakrát klikněte na: start.bat\n\n` +
                `Nebo v CMD:\n` +
                `cd chat-panel\\server && npm start`
            );
        } else {
            alert(
                `Pro automatické ovládání spusťte:\n\n` +
                `📁 chat-panel\\server\\start-helper.bat\n\n` +
                `Helper běží na pozadí a umožní ovládat server z webu.\n\n` +
                `Po spuštění helperu zkuste znovu kliknout na "Zapnout Server".`
            );
        }
        
        if (serverStatusText) {
            serverStatusText.textContent = 'Neběží - spusťte ručně';
        }
    } finally {
        if (serverToggleBtn) {
            serverToggleBtn.disabled = false;
        }
    }
}

async function stopServer() {
    if (!confirm('Opravdu chcete vypnout server? Všechny chat připojení budou ukončena.')) {
        return;
    }
    
    const serverToggleBtn = document.getElementById('serverToggleBtn');
    if (serverToggleBtn) {
        serverToggleBtn.disabled = true;
        serverToggleBtn.textContent = 'Vypínání...';
    }
    
    try {
        const response = await fetch(`${API_SERVER_URL}/api/server/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('[UI] Server stop requested');
            isServerRunning = false;
            updateServerUI(false);
            
            // Close WebSocket connection
            if (wsServer) {
                wsServer.close();
                wsServer = null;
                wsReady = false;
            }
        } else {
            alert(`Chyba při vypínání serveru: ${data.error || 'Neznámá chyba'}`);
        }
    } catch (error) {
        console.error('[UI] Error stopping server:', error);
        alert('Chyba při komunikaci se serverem. Server může být již vypnutý.');
        isServerRunning = false;
        updateServerUI(false);
    } finally {
        if (serverToggleBtn) {
            serverToggleBtn.disabled = false;
        }
    }
}

async function restartServer() {
    if (!confirm('Opravdu chcete restartovat server? Všechny chat připojení budou dočasně přerušena.')) {
        return;
    }
    
    const serverStatusText = document.getElementById('serverStatusText');
    
    if (serverStatusText) {
        serverStatusText.style.display = ''; // Show text for restart status
        serverStatusText.textContent = 'Restartování serveru...';
    }
    
    try {
        const response = await fetch(`${API_SERVER_URL}/api/server/restart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('[UI] Server restart requested:', data);
            isServerRunning = false;
            updateServerUI(false);
            
            // Close WebSocket connection
            if (wsServer) {
                wsServer.close();
                wsServer = null;
                wsReady = false;
            }
            
            if (serverStatusText) {
                serverStatusText.style.display = ''; // Show text for restart status
                serverStatusText.textContent = 'Čekání na restart...';
            }
            
            // Wait and check if server came back - try multiple times
            setTimeout(() => {
                checkServerStatus();
            }, 2000);
            
            setTimeout(() => {
                checkServerStatus();
            }, 4000);
            
            setTimeout(() => {
                checkServerStatus();
            }, 6000);
        } else {
            alert(`Chyba při restartování serveru: ${data.error || 'Neznámá chyba'}`);
            if (serverStatusText) {
                serverStatusText.style.display = ''; // Show text for error status
                serverStatusText.textContent = 'Chyba při restartu';
            }
        }
    } catch (error) {
        console.error('[UI] Error restarting server:', error);
        
        const errorMsg = `Chyba při komunikaci se serverem.\n\n` +
            `Server může být již vypnutý nebo neběží správně.\n\n` +
            `Zkuste:\n` +
            `1. Spustit server ručně pomocí start.bat\n` +
            `2. Zkontrolovat, zda server běží na portu 3001\n` +
            `3. Zkontrolovat konzoli serveru pro chyby`;
        
        alert(errorMsg);
        
        isServerRunning = false;
        updateServerUI(false);
    }
}

// Initialize Kick OAuth controls
function initKickOAuth() {
    const kickAuthBtn = document.getElementById('kickAuthBtn');
    if (!kickAuthBtn) {
        console.error('[UI] Kick OAuth button not found!');
        return;
    }

    console.log('[UI] Kick OAuth button found, setting up...');

    // Check OAuth status on load only if there are Kick chats
    const hasKickChat = chatViews.some(chat => chat.platform === 'kick');
    if (hasKickChat) {
        checkKickOAuthStatus(false);
    }

    // Handle OAuth button click
    kickAuthBtn.addEventListener('click', () => {
        if (kickAuthBtn.disabled) {
            alert('Kick OAuth není dostupný. Zkontrolujte, zda je server spuštěný a OAuth správně nakonfigurován.');
            return;
        }
        window.location.href = `${API_SERVER_URL}/auth/kick`;
    });

    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const oauthResult = urlParams.get('kick_oauth');
    const oauthError = urlParams.get('kick_oauth_error');

    if (oauthResult === 'success') {
        alert('✅ Kick OAuth úspěšné! Nyní můžete používat Kick chat.');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        checkKickOAuthStatus();
        
        // Auto-reconnect all Kick chats after successful OAuth
        setTimeout(() => {
            console.log('[UI] Reconnecting Kick chats after OAuth success...');
            chatViews.forEach(chat => {
                if (chat.platform === 'kick' && chat.permanentError) {
                    // Reset permanent error flag since OAuth is now available
                    chat.permanentError = false;
                    delete chat._permanentErrorLogged;
                    saveChats();
                    // Reconnect the chat
                    const channel = extractChannel(chat.originalUrl || chat.url, chat.platform);
                    if (channel) {
                        connectKickChat(channel, chat.id);
                    }
                }
            });
        }, 1000);
    } else if (oauthError) {
        alert(`❌ Kick OAuth chyba: ${decodeURIComponent(oauthError)}`);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Check Kick OAuth status (with throttling to avoid excessive calls)
let lastOAuthCheck = 0;
const OAUTH_CHECK_THROTTLE = 5000; // Only check once per 5 seconds
let oAuthStatusCache = null;
let oAuthStatusPromise = null; // Track ongoing request to avoid duplicates

async function checkKickOAuthStatus(force = false) {
    const kickAuthBtn = document.getElementById('kickAuthBtn');
    if (!kickAuthBtn) {
        console.warn('[UI] Kick OAuth button not found in DOM');
        return;
    }

    // Throttle: don't check too frequently
    const now = Date.now();
    if (!force && (now - lastOAuthCheck) < OAUTH_CHECK_THROTTLE) {
        // Use cached result if available
        if (oAuthStatusCache) {
            updateOAuthButtonUI(oAuthStatusCache);
        }
        return;
    }

    // If there's already a pending request, wait for it
    if (oAuthStatusPromise && !force) {
        try {
            const cachedData = await oAuthStatusPromise;
            updateOAuthButtonUI(cachedData);
            return;
        } catch (e) {
            // Continue with new request if cached one fails
        }
    }

    // Mark that we're checking
    lastOAuthCheck = now;
    
    // Create promise for this check
    oAuthStatusPromise = (async () => {
        try {
            const response = await fetch(`${API_SERVER_URL}/api/kick/oauth/status`, {
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            
            if (response.ok) {
                const data = await response.json();
                // Cache the result
                oAuthStatusCache = data;
                return data;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('[UI] OAuth status check timed out');
            } else {
                console.warn('[UI] Failed to check Kick OAuth status:', error.message);
            }
            throw error;
        } finally {
            // Clear promise after a short delay
            setTimeout(() => {
                oAuthStatusPromise = null;
            }, 100);
        }
    })();

    // Wait for the promise and handle UI updates
    try {
        const data = await oAuthStatusPromise;
        updateOAuthButtonUI(data);
        return data;
    } catch (error) {
        // Handle errors - show disabled button or retry
        kickAuthBtn.textContent = '🔐 Kick OAuth (Čekání...)';
        kickAuthBtn.classList.remove('btn-success');
        kickAuthBtn.classList.add('btn-secondary');
        kickAuthBtn.title = 'Čekání na server...';
        kickAuthBtn.disabled = true;
        kickAuthBtn.style.opacity = '0.6';
        
        // Try to check if server is running via server status endpoint
        try {
            const serverStatusResponse = await fetch(`${API_SERVER_URL}/health`, {
                signal: AbortSignal.timeout(2000)
            });
            if (!serverStatusResponse.ok) {
                kickAuthBtn.style.display = 'none';
            } else {
                // Server is running, but OAuth check failed - retry later
                setTimeout(() => checkKickOAuthStatus(false), 5000);
            }
        } catch (e) {
            // Server not responding - show disabled button
            kickAuthBtn.textContent = '🔐 Kick OAuth (Server nedostupný)';
            kickAuthBtn.classList.remove('btn-success');
            kickAuthBtn.classList.add('btn-secondary');
            kickAuthBtn.title = 'Server není dostupný. Zkontrolujte, zda běží na http://localhost:3001';
            kickAuthBtn.disabled = true;
            kickAuthBtn.style.opacity = '0.6';
        }
    }
}

// Update OAuth button UI based on status data
function updateOAuthButtonUI(data) {
    const kickAuthBtn = document.getElementById('kickAuthBtn');
    if (!kickAuthBtn) return;
    
    kickAuthBtn.style.display = 'inline-block';
    
    if (data.configured) {
        if (data.authenticated) {
            kickAuthBtn.textContent = '✅ Kick OAuth (Přihlášeno)';
            kickAuthBtn.classList.remove('btn-secondary');
            kickAuthBtn.classList.add('btn-success');
            kickAuthBtn.title = `Kick OAuth je aktivní (${data.tokenCount} token${data.tokenCount !== 1 ? 'y' : ''})`;
            kickAuthBtn.disabled = false;
            kickAuthBtn.style.opacity = '1';
        } else {
            kickAuthBtn.textContent = '🔐 Kick OAuth (Přihlásit)';
            kickAuthBtn.classList.remove('btn-success');
            kickAuthBtn.classList.add('btn-secondary');
            kickAuthBtn.title = 'Klikněte pro přihlášení do Kick účtu';
            kickAuthBtn.disabled = false;
            kickAuthBtn.style.opacity = '1';
        }
    } else {
        console.log('[UI] Kick OAuth not configured on server');
        kickAuthBtn.textContent = '⚠️ Kick OAuth (Neaktivní)';
        kickAuthBtn.classList.remove('btn-success');
        kickAuthBtn.classList.add('btn-secondary');
        kickAuthBtn.title = 'Kick OAuth není nakonfigurován na serveru. Zkontrolujte KICK_CLIENT_ID a KICK_CLIENT_SECRET.';
        kickAuthBtn.disabled = true;
        kickAuthBtn.style.opacity = '0.6';
    }
}

// Settings modal handling
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsForm = document.getElementById('settingsForm');
const closeSettingsBtn = document.querySelector('.close-settings');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');

function openSettingsModal() {
    console.log('[UI] Opening settings modal');
    if (!settingsModal) {
        console.error('[UI] Settings modal not found');
        return;
    }
    
    settingsModal.style.display = 'block';
    
    // Load current credentials
    loadCurrentCredentials();
}

function closeSettingsModal() {
    console.log('[UI] Closing settings modal');
    if (settingsModal) {
        settingsModal.style.display = 'none';
    }
    if (settingsForm) {
        settingsForm.reset();
    }
}

async function loadCurrentCredentials() {
    try {
        const response = await fetch(`${API_SERVER_URL}/api/config/credentials`);
        if (response.ok) {
            const data = await response.json();
            
            const kickClientIdInput = document.getElementById('kickClientId');
            const kickClientSecretInput = document.getElementById('kickClientSecret');
            const twitchChannelNameInput = document.getElementById('twitchChannelName');
            
            if (kickClientIdInput) kickClientIdInput.value = data.kickClientId || '';
            if (kickClientSecretInput) kickClientSecretInput.value = data.kickClientSecret === '***' ? '' : (data.kickClientSecret || '');
            if (twitchChannelNameInput) twitchChannelNameInput.value = data.twitchChannelName || '';
        }
    } catch (error) {
        console.error('[UI] Failed to load credentials:', error);
    }
}

async function saveCredentials() {
    const kickClientId = document.getElementById('kickClientId')?.value.trim() || '';
    const kickClientSecret = document.getElementById('kickClientSecret')?.value.trim() || '';
    const twitchChannelName = document.getElementById('twitchChannelName')?.value.trim() || '';
    
    // Check if server is running first
    try {
        const statusCheck = await fetch(`${API_SERVER_URL}/api/server/status`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000)
        });
        
        if (!statusCheck.ok) {
            throw new Error('Server není dostupný');
        }
    } catch (statusError) {
        console.error('[UI] Server status check failed:', statusError);
        alert(`❌ Server není spuštěn!\n\nSpusťte server přes tlačítko "Zapnout Server" nebo pomocí start.bat v složce chat-panel/server/`);
        return;
    }
    
    try {
        const response = await fetch(`${API_SERVER_URL}/api/config/credentials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                kickClientId: kickClientId || null,
                kickClientSecret: kickClientSecret || null,
                twitchChannelName: twitchChannelName || null
            }),
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.requiresRestart) {
                alert('✅ Přihlašovací údaje uloženy!\n\n⚠️ Restartujte server, aby se změny projevily.');
                // Refresh OAuth status after save if there are Kick chats
                const hasKickChat = chatViews.some(chat => chat.platform === 'kick');
                if (hasKickChat) {
                    setTimeout(() => {
                        checkKickOAuthStatus(true); // Force check after saving credentials
                    }, 1000);
                }
            }
            closeSettingsModal();
        } else {
            let errorMessage = 'Neznámá chyba';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (parseError) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            alert(`❌ Chyba při ukládání: ${errorMessage}`);
        }
    } catch (error) {
        console.error('[UI] Error saving credentials:', error);
        
        let errorMessage = error.message;
        
        if (error.name === 'AbortError') {
            errorMessage = 'Časový limit překročen - server neodpovídá';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Nepodařilo se připojit k serveru. Ujistěte se, že server běží na http://localhost:3001';
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'Síťová chyba - zkontrolujte připojení k serveru';
        }
        
        alert(`❌ Chyba při ukládání: ${errorMessage}\n\nUjistěte se, že:\n- Server běží (http://localhost:3001)\n- Nemáte blokované CORS požadavky`);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('[UI] DOM loaded, initializing...');
    loadSavedChats();
    initServerControls();
    updateYoutubeKeyStatus();
    
    // Initialize Kick OAuth controls
    console.log('[UI] Initializing Kick OAuth...');
    initKickOAuth();
    
    // Settings modal event listeners
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettingsModal);
    }
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettingsModal);
    }
    if (cancelSettingsBtn) {
        cancelSettingsBtn.addEventListener('click', closeSettingsModal);
    }
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveCredentials();
        });
    }
    
    // Close settings modal on outside click
    if (settingsModal) {
        window.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                closeSettingsModal();
            }
        });
    }
    
    // Only check OAuth status if there are Kick chats (to avoid unnecessary pings)
    const hasKickChatOnLoad = chatViews.some(chat => chat.platform === 'kick');
    if (hasKickChatOnLoad) {
        setTimeout(() => {
            checkKickOAuthStatus(false);
        }, 2000);
    }
    // Don't connect immediately if server is not running
    setTimeout(() => {
        checkServerStatus().then(() => {
            ensureWebSocketConnection();
        });
    }, 500);
});

