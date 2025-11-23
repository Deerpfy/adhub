import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import cors from 'cors';
import tmi from 'tmi.js';
import { spawn, exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Use native fetch if available (Node 18+), otherwise use node-fetch
let fetch = globalThis.fetch || null;
if (!fetch) {
    try {
        // Fallback to node-fetch for older Node versions
        const nodeFetchModule = await import('node-fetch');
        fetch = nodeFetchModule.default;
    } catch (e) {
        console.warn('Fetch not available, Kick chat may not work');
    }
}

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Get directory path for credentials file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CREDENTIALS_FILE = join(__dirname, 'credentials.json');

// Load credentials from file if exists, otherwise use environment variables
let credentials = {};
let credentialsLastModified = 0; // Track when credentials file was last modified

function loadCredentials() {
    try {
        if (fs.existsSync(CREDENTIALS_FILE)) {
            // Check file modification time to avoid unnecessary reloads
            const stats = fs.statSync(CREDENTIALS_FILE);
            const fileModified = stats.mtimeMs;
            
            // Only reload if file was actually modified
            if (fileModified === credentialsLastModified) {
                // File hasn't changed, skip reload
                return;
            }
            
            const data = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
            credentials = JSON.parse(data);
            credentialsLastModified = fileModified;
            console.log('[Config] Loaded credentials from file');
        } else {
            // File doesn't exist, reset modification time
            credentialsLastModified = 0;
            if (Object.keys(credentials).length > 0) {
                console.log('[Config] Credentials file removed, clearing credentials');
                credentials = {};
            }
        }
    } catch (error) {
        console.error('[Config] Error loading credentials:', error.message);
        credentials = {};
    }
}

// Save credentials to file
function saveCredentialsToFile(newCredentials) {
    try {
        // Merge with existing credentials
        credentials = { ...credentials, ...newCredentials };
        // Remove empty values
        Object.keys(credentials).forEach(key => {
            if (!credentials[key] || credentials[key].trim() === '') {
                delete credentials[key];
            }
        });
        fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), 'utf8');
        console.log('[Config] Credentials saved to file');
        return true;
    } catch (error) {
        console.error('[Config] Error saving credentials:', error.message);
        return false;
    }
}

// Load credentials on startup
loadCredentials();

// Store active chat connections
// chatClients: maps panelId -> Set of WebSocket connections
const chatClients = new Map();
// wsConnections: maps WebSocket -> panelId for cleanup
const wsConnections = new Map();
const twitchClients = new Map();
const kickConnections = new Map();
const youtubeConnections = new Map();

// YouTube API configuration
// Priority: credentials file > environment variable > default
const YOUTUBE_API_KEY = credentials.youtubeApiKey || process.env.YOUTUBE_API_KEY || 'YOUR_YOUTUBE_API_KEY_HERE';
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Log API key status (without revealing the full key)
if (YOUTUBE_API_KEY) {
    console.log(`[YouTube] API Key configured: ${YOUTUBE_API_KEY.substring(0, 10)}...${YOUTUBE_API_KEY.substring(YOUTUBE_API_KEY.length - 4)}`);
} else {
    console.warn('[YouTube] WARNING: API Key not configured! YouTube chat will not work.');
}

// Kick Developer API configuration for OAuth 2.0
// Priority: credentials file > environment variable
const KICK_CLIENT_ID = credentials.kickClientId || process.env.KICK_CLIENT_ID || null;
const KICK_CLIENT_SECRET = credentials.kickClientSecret || process.env.KICK_CLIENT_SECRET || null;

// Twitch Channel Name (optional - for future features)
const TWITCH_CHANNEL_NAME = credentials.twitchChannelName || process.env.TWITCH_CHANNEL_NAME || null;

// OAuth 2.0 configuration
const KICK_REDIRECT_URI = process.env.KICK_REDIRECT_URI || 'http://localhost:3001/auth/kick/callback';
const KICK_AUTHORIZE_URL = 'https://kick.com/api/v2/oauth/authorize';
const KICK_TOKEN_URL = 'https://kick.com/api/v2/oauth/token';
const KICK_SCOPES = 'read_user subscribe_to_events'; // Required scopes for chat access

// Rate limiting for Kick API calls (prevent DDoS-like behavior)
const KICK_RATE_LIMIT = {
    minInterval: 2000, // Minimum 2 seconds between connection attempts per channel
    maxInterval: 30000, // Maximum 30 seconds delay after multiple failures
    maxAttemptsPerMinute: 3, // Max 3 connection attempts per minute per channel
    backoffMultiplier: 2 // Exponential backoff multiplier
};

// Track last connection attempt time per channel
const kickLastConnectionAttempt = new Map();
// Track connection attempt count per channel (for rate limiting)
const kickConnectionAttemptCounts = new Map();
// Track failed attempts for exponential backoff
const kickFailedAttempts = new Map();

// Store OAuth access tokens (in production, use secure storage)
// Format: Map<userId, { access_token, refresh_token?, expires_at }>
const kickAccessTokens = new Map();

// Store OAuth state for CSRF protection
const oauthStates = new Map();

// Log Kick API status - moved after helper functions are defined (see below)

// Normalized message format
function normalizeMessage(platform, data) {
    return {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        platform: platform,
        username: data.username || data.user || 'Unknown',
        message: data.message || data.content || '',
        color: data.color || getPlatformColor(platform),
        timestamp: new Date(data.timestamp || Date.now()).toISOString(),
        badges: data.badges || [],
        emotes: data.emotes || []
    };
}

function getPlatformColor(platform) {
    const colors = {
        twitch: '#9146FF',
        kick: '#53FC18',
        youtube: '#FF0000'
    };
    return colors[platform] || '#FFFFFF';
}

// Generate color from username (Twitch algorithm)
function generateColorFromUsername(username) {
    // Twitch uses a specific algorithm to generate colors
    // This is a simplified version that generates consistent colors
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Twitch color palette (known colors from Twitch)
    const twitchColors = [
        '#FF0000', '#0000FF', '#00FF00', '#B22222', '#FF7F50',
        '#9ACD32', '#FF4500', '#2E8B57', '#DAA520', '#D2691E',
        '#5F9EA0', '#1E90FF', '#FF69B4', '#8A2BE2', '#00FA9A',
        '#FF1493', '#00CED1', '#000080', '#FF8C00', '#32CD32',
        '#BA55D3', '#9370DB', '#3CB371', '#7B68EE', '#48D1CC',
        '#C71585', '#191970', '#FF4500', '#228B22', '#DA70D6'
    ];
    
    // Use hash to pick a color from the palette
    const colorIndex = Math.abs(hash) % twitchColors.length;
    return twitchColors[colorIndex];
}

// Parse Twitch badges to structured format
function parseTwitchBadges(badges) {
    const badgeInfo = {
        broadcaster: false,
        moderator: false,
        vip: false,
        subscriber: false,
        subscriberMonths: 0,
        partner: false,
        premium: false,
        staff: false,
        admin: false,
        globalMod: false
    };
    
    if (!badges || typeof badges !== 'object') {
        return badgeInfo;
    }
    
    // Twitch badges format: { "badge-name": "version" }
    if (badges.broadcaster) {
        badgeInfo.broadcaster = true;
    }
    if (badges.moderator) {
        badgeInfo.moderator = true;
    }
    if (badges.vip) {
        badgeInfo.vip = true;
    }
    if (badges.subscriber) {
        badgeInfo.subscriber = true;
        // Subscriber badge version indicates months (but simplified)
        badgeInfo.subscriberMonths = parseInt(badges.subscriber) || 0;
    }
    if (badges.partner) {
        badgeInfo.partner = true;
    }
    if (badges.premium) {
        badgeInfo.premium = true;
    }
    if (badges.staff) {
        badgeInfo.staff = true;
    }
    if (badges.admin) {
        badgeInfo.admin = true;
    }
    if (badges.global_mod) {
        badgeInfo.globalMod = true;
    }
    
    return badgeInfo;
}

// Twitch Chat Connection
function connectTwitchChannel(channel, connectionId) {
    // Check if already connected for this panel
    if (twitchClients.has(connectionId)) {
        const existingClient = twitchClients.get(connectionId);
        console.log(`[Twitch ${channel}] Using existing client for panel ${connectionId}`);
        // tmi.js client doesn't have readyState, so we assume it's valid if it exists
        // It will reconnect automatically if needed
        return existingClient;
    }

    console.log(`[Twitch ${channel}] Creating new client for panel ${connectionId}`);
    
    const client = new tmi.Client({
        options: { 
            debug: false,
            skipUpdatingEmotesets: false
        },
        connection: {
            secure: true,
            reconnect: true,
            maxReconnectAttempts: 5,
            maxReconnectInterval: 30000
        },
        channels: [channel.toLowerCase()]
    });
    
    // Log all events for debugging
    client.on('*', (event, ...args) => {
        if (event !== 'message') { // Don't log every message event, handled separately
            console.log(`[Twitch ${channel}] Event: ${event}`, args.length > 0 ? args[0] : '');
        }
    });

    client.connect().catch(err => {
        console.error(`[Twitch ${channel}] Connection error:`, err);
        broadcastMessage(connectionId, {
            type: 'error',
            platform: 'twitch',
            channel: channel,
            connectionId: connectionId,
            message: `Failed to connect: ${err.message}`
        });
    });

    client.on('message', (channelName, tags, message, self) => {
        // Ignore own messages
        if (self) {
            console.log(`[Twitch ${channelName}] Ignoring own message`);
            return;
        }
        
        console.log(`[Twitch ${channelName}] Raw message received:`, {
            username: tags['display-name'] || tags.username,
            message: message.substring(0, 100),
            panelId: connectionId
        });
        
        // Parse badges - Twitch badges come as object like { subscriber: "12", moderator: "1" }
        const badgeInfo = parseTwitchBadges(tags.badges || {});
        
        // Get user color - Twitch provides color in tags.color
        // tags.color can be:
        // - A hex color code (e.g., "#FF0000")
        // - An empty string if user hasn't set a custom color
        // - undefined if not provided
        let userColor = tags.color;
        
        // Convert to string and trim
        if (userColor) {
            userColor = String(userColor).trim();
        }
        
        // Validate and format color
        if (!userColor || userColor === '' || userColor === 'null' || userColor === 'undefined') {
            // No color provided by Twitch - generate from username
            userColor = generateColorFromUsername(tags['display-name'] || tags.username || 'Unknown');
            console.log(`[Twitch ${channelName}] Generated color for ${tags['display-name'] || tags.username}: ${userColor}`);
        } else {
            // Ensure color is in proper hex format
            if (!userColor.startsWith('#')) {
                userColor = '#' + userColor;
            }
            
            // Validate hex color format (should be #RRGGBB)
            const hexRegex = /^#[0-9A-Fa-f]{6}$/;
            if (!hexRegex.test(userColor)) {
                // Invalid format, generate from username
                console.warn(`[Twitch ${channelName}] Invalid color format "${tags.color}", generating from username`);
                userColor = generateColorFromUsername(tags['display-name'] || tags.username || 'Unknown');
            } else {
                console.log(`[Twitch ${channelName}] Using Twitch color for ${tags['display-name'] || tags.username}: ${userColor}`);
            }
        }
        
        const normalized = normalizeMessage('twitch', {
            username: tags['display-name'] || tags.username || 'Unknown',
            message: message,
            color: userColor, // Use the determined color
            badges: tags.badges || {},
            badgeInfo: badgeInfo,
            emotes: tags.emotes || {},
            userType: tags['user-type'] || tags.userType || '',
            subscriber: tags.subscriber === true || tags.subscriber === '1',
            mod: tags.mod === true || tags.mod === '1',
            timestamp: Date.now()
        });
        
        console.log(`[Twitch ${channelName}] Broadcasting message to panel ${connectionId}:`, {
            username: normalized.username,
            message: normalized.message.substring(0, 50)
        });
        
        const messageToSend = {
            type: 'chat',
            connectionId: connectionId,
            ...normalized
        };
        
        console.log(`[Twitch ${channelName}] Sending message object:`, JSON.stringify(messageToSend).substring(0, 200));
        
        broadcastMessage(connectionId, messageToSend);
    });

    client.on('join', (channelName) => {
        console.log(`[Twitch] ✓ Joined channel: ${channelName} (Panel: ${connectionId})`);
        console.log(`[Twitch] Client ready to receive messages for ${channelName}`);
        broadcastMessage(connectionId, {
            type: 'status',
            platform: 'twitch',
            channel: channelName,
            connectionId: connectionId,
            status: 'connected'
        });
    });

    client.on('part', (channelName) => {
        console.log(`[Twitch] Left channel: ${channelName} (Panel: ${connectionId})`);
        broadcastMessage(connectionId, {
            type: 'status',
            platform: 'twitch',
            channel: channelName,
            connectionId: connectionId,
            status: 'disconnected'
        });
    });

    client.on('connected', (addr, port) => {
        console.log(`[Twitch] ✓ Connected to IRC server ${addr}:${port} (Panel: ${connectionId})`);
    });
    
    client.on('connecting', (addr, port) => {
        console.log(`[Twitch] Connecting to IRC server ${addr}:${port} (Panel: ${connectionId})`);
    });
    
    client.on('reconnect', () => {
        console.log(`[Twitch] Reconnecting to IRC (Panel: ${connectionId})`);
    });
    
    client.on('notice', (channel, msgid, message) => {
        console.log(`[Twitch] Notice from ${channel}: ${message} (Panel: ${connectionId})`);
    });

    client.on('disconnected', (reason) => {
        console.log(`[Twitch ${channel}] Disconnected: ${reason} (Panel: ${connectionId})`);
        broadcastMessage(connectionId, {
            type: 'status',
            platform: 'twitch',
            channel: channel,
            connectionId: connectionId,
            status: 'disconnected',
            reason: reason
        });
    });

    twitchClients.set(connectionId, client);
    return client;
}

// YouTube Chat Connection
async function connectYouTubeChannel(videoId, connectionId) {
    if (youtubeConnections.has(connectionId)) {
        console.log(`[YouTube ${videoId}] Connection already exists for panel ${connectionId}`);
        return youtubeConnections.get(connectionId);
    }

    const currentYoutubeApiKey = getYoutubeApiKey();
    if (!currentYoutubeApiKey) {
        const errorMsg = 'YouTube API key not configured. Zadejte ho v nastavení (⚙️ Nastavení) nebo nastavte YOUTUBE_API_KEY environment variable.';
        console.error(`[YouTube ${videoId}] ${errorMsg}`);
        broadcastMessage(connectionId, {
            type: 'status',
            platform: 'youtube',
            channel: videoId,
            connectionId: connectionId,
            status: 'error',
            message: 'YouTube API klíč není nakonfigurován. Viz README-YOUTUBE.md'
        });
        return null;
    }

    try {
        console.log(`[YouTube ${videoId}] Connecting to YouTube Live Chat...`);
        
        // Step 1: Get video details to find live chat ID and channel name
        const videoResponse = await fetch(
            `${YOUTUBE_API_BASE_URL}/videos?id=${videoId}&part=liveStreamingDetails,snippet&key=${getYoutubeApiKey()}`
        );
        
        if (!videoResponse.ok) {
            throw new Error(`Failed to get video details: ${videoResponse.statusText}`);
        }
        
        const videoData = await videoResponse.json();
        
        if (!videoData.items || videoData.items.length === 0) {
            throw new Error('Video not found');
        }
        
        const videoItem = videoData.items[0];
        const liveChatId = videoItem.liveStreamingDetails?.activeLiveChatId;
        const channelId = videoItem.snippet?.channelId;
        const channelTitle = videoItem.snippet?.channelTitle || null;
        
        if (!liveChatId) {
            throw new Error('Video is not live or has no active chat');
        }
        
        console.log(`[YouTube ${videoId}] Found live chat ID: ${liveChatId}, Channel: ${channelTitle || channelId}`);
        
        // If we don't have channel title, try to get it from channels API
        let finalChannelTitle = channelTitle;
        if (!finalChannelTitle && channelId) {
            try {
                const channelResponse = await fetch(
                    `${YOUTUBE_API_BASE_URL}/channels?id=${channelId}&part=snippet&key=${getYoutubeApiKey()}`
                );
                if (channelResponse.ok) {
                    const channelData = await channelResponse.json();
                    if (channelData.items && channelData.items.length > 0) {
                        finalChannelTitle = channelData.items[0].snippet?.title;
                        console.log(`[YouTube ${videoId}] Retrieved channel title: ${finalChannelTitle}`);
                    }
                }
            } catch (err) {
                console.warn(`[YouTube ${videoId}] Failed to get channel title: ${err.message}`);
            }
        }
        
        // Store connection info
        const connection = {
            videoId: videoId,
            liveChatId: liveChatId,
            nextPageToken: null,
            polling: false,
            interval: null
        };
        
        youtubeConnections.set(connectionId, connection);
        
        // Start polling for messages
        pollYouTubeChat(connectionId, liveChatId, connection);
        
        broadcastMessage(connectionId, {
            type: 'status',
            platform: 'youtube',
            channel: videoId,
            channelName: finalChannelTitle || channelId || videoId,
            connectionId: connectionId,
            status: 'connected'
        });
        
        return connection;
        
    } catch (error) {
        console.error(`[YouTube ${videoId}] Connection error:`, error);
        broadcastMessage(connectionId, {
            type: 'status',
            platform: 'youtube',
            channel: videoId,
            connectionId: connectionId,
            status: 'error',
            message: error.message
        });
        return null;
    }
}

// Poll YouTube Live Chat for messages
async function pollYouTubeChat(connectionId, liveChatId, connection) {
    if (connection.polling) {
        return; // Already polling
    }
    
    connection.polling = true;
    
    const poll = async () => {
        try {
            const params = new URLSearchParams({
                liveChatId: liveChatId,
                part: 'snippet,authorDetails',
                key: getYoutubeApiKey(),
                maxResults: '200'
            });
            
            if (connection.nextPageToken) {
                params.append('pageToken', connection.nextPageToken);
            }
            
            const response = await fetch(
                `${YOUTUBE_API_BASE_URL}/liveChat/messages?${params}`
            );
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`YouTube API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
            }
            
            const data = await response.json();
            
            // Update next page token
            connection.nextPageToken = data.nextPageToken;
            
            // Calculate polling interval (YouTube recommends 1-5 seconds)
            const pollInterval = Math.max(1000, (data.pollingIntervalMillis || 5000));
            
            // Process messages
            if (data.items && data.items.length > 0) {
                data.items.forEach(item => {
                    const snippet = item.snippet;
                    const authorDetails = item.authorDetails;
                    
                    // Filter out system messages
                    if (snippet.type === 'textMessageEvent' || snippet.type === 'superChatEvent') {
                        const normalized = normalizeMessage('youtube', {
                            username: authorDetails.displayName || authorDetails.channelId || 'Unknown',
                            message: snippet.textMessageDetails?.messageText || snippet.displayMessage || '',
                            color: authorDetails.badge?.customThumbnail?.url ? null : getDefaultAuthorColor(authorDetails),
                            timestamp: new Date(snippet.publishedAt).getTime(),
                            isModerator: authorDetails.isModerator === true,
                            isOwner: authorDetails.isChatOwner === true,
                            isSponsor: authorDetails.isChatSponsor === true,
                            isVerified: authorDetails.isVerified === true
                        });
                        
                        const messageToSend = {
                            type: 'chat',
                            connectionId: connectionId,
                            ...normalized
                        };
                        
                        broadcastMessage(connectionId, messageToSend);
                    }
                });
            }
            
            // Schedule next poll
            connection.interval = setTimeout(() => {
                poll();
            }, pollInterval);
            
        } catch (error) {
            console.error(`[YouTube] Polling error for ${connectionId}:`, error);
            connection.polling = false;
            
            // Retry after delay
            connection.interval = setTimeout(() => {
                connection.polling = false;
                pollYouTubeChat(connectionId, liveChatId, connection);
            }, 5000);
        }
    };
    
    // Start polling
    poll();
}

// Get default color for YouTube author (based on badges/role)
function getDefaultAuthorColor(authorDetails) {
    if (authorDetails.isChatOwner || authorDetails.isChatSponsor) {
        return '#FFD700'; // Gold for channel owner/sponsor
    }
    if (authorDetails.isModerator) {
        return '#00D4AA'; // Teal for moderator
    }
    if (authorDetails.isVerified) {
        return '#1DA1F2'; // Blue for verified
    }
    // Generate color from username
    return generateColorFromUsername(authorDetails.displayName || authorDetails.channelId || 'user');
}

// Direct Kick WebSocket connection (based on kick-js approach)
// This tries to connect to Kick's chat WebSocket directly using Pusher protocol
async function tryDirectKickWebSocket(channel, chatroomId, channelData, connectionId) {
    return new Promise((resolve, reject) => {
        try {
            // Kick uses Pusher for chat
            // Get Pusher config from channel data or use defaults
            let pusherKey = 'eb1d5f283081a78b932c'; // Default Kick Pusher key
            let pusherCluster = 'us2'; // Default cluster
            
            // Try to extract Pusher config from channel data
            if (channelData.chatroom?.pusher) {
                pusherKey = channelData.chatroom.pusher.key || channelData.chatroom.pusher.pusher_key || pusherKey;
                pusherCluster = channelData.chatroom.pusher.cluster || channelData.chatroom.pusher.pusher_cluster || pusherCluster;
            } else if (channelData.chatroom?.pusher_config) {
                pusherKey = channelData.chatroom.pusher_config.key || pusherKey;
                pusherCluster = channelData.chatroom.pusher_config.cluster || pusherCluster;
            }
            
            const pusherUrl = `wss://ws-${pusherCluster}.pusher.com/app/${pusherKey}?protocol=7&client=js&version=7.4.0&flash=false`;
            
            console.log(`[Kick ${channel}] Connecting directly to Pusher: ${pusherKey.substring(0, 8)}... cluster: ${pusherCluster}`);
            
            const ws = new WebSocket(pusherUrl);
            
            const connection = {
                channel: channel,
                chatroomId: chatroomId,
                ws: ws,
                connected: false,
                subscriptions: new Set(),
                reconnectAttempts: 0,
                maxReconnectAttempts: 5,
                stop: () => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.close();
                    }
                    connection.connected = false;
                }
            };
            
            let connectionEstablished = false;
            let subscribeTimeout;
            
            ws.on('open', () => {
                console.log(`[Kick ${channel}] Direct WebSocket opened, subscribing to chatroom...`);
            });
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    
                    if (message.event === 'pusher:connection_established') {
                        console.log(`[Kick ${channel}] Pusher connection established`);
                        const socketId = message.data?.socket_id;
                        console.log(`[Kick ${channel}] Socket ID: ${socketId}`);
                        
                        // Subscribe to chatroom channel
                        const subscribeMessage = {
                            event: 'pusher:subscribe',
                            data: {
                                channel: `chatrooms.${chatroomId}`
                            }
                        };
                        
                        ws.send(JSON.stringify(subscribeMessage));
                        console.log(`[Kick ${channel}] Sent subscribe to chatrooms.${chatroomId}`);
                        
                        subscribeTimeout = setTimeout(() => {
                            if (!connection.connected) {
                                console.warn(`[Kick ${channel}] Subscribe timeout after 10s`);
                                ws.close();
                                reject(new Error('Subscribe timeout'));
                            }
                        }, 10000);
                        return;
                    }
                    
                    if (message.event === 'pusher_internal:subscription_succeeded') {
                        console.log(`[Kick ${channel}] Successfully subscribed to chatroom!`);
                        connection.connected = true;
                        clearTimeout(subscribeTimeout);
                        
                        if (!connectionEstablished) {
                            connectionEstablished = true;
                            kickConnections.set(connectionId, connection);
                            
                            broadcastMessage(connectionId, {
                                type: 'status',
                                platform: 'kick',
                                channel: channel,
                                connectionId: connectionId,
                                status: 'connected'
                            });
                            
                            resolve(connection);
                        }
                        return;
                    }
                    
                    if (message.event === 'App\\Events\\ChatMessageEvent' || message.event === 'ChatMessageEvent') {
                        // Chat message received
                        try {
                            const msgData = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
                            
                            if (msgData && msgData.content) {
                                const username = msgData.sender?.username || msgData.username || 'Unknown';
                                const content = msgData.content || msgData.message || '';
                                const color = msgData.sender?.color || null;
                                const badges = msgData.sender?.badges || {};
                                
                                console.log(`[Kick ${channel}] Direct WS Message from ${username}: ${content.substring(0, 50)}`);
                                
                                const normalized = normalizeMessage('kick', {
                                    username: username,
                                    message: content,
                                    color: color,
                                    timestamp: Date.now(),
                                    badges: badges,
                                    emotes: {}
                                });
                                
                                const messageToSend = {
                                    type: 'chat',
                                    connectionId: connectionId,
                                    ...normalized
                                };
                                
                                broadcastMessage(connectionId, messageToSend);
                            }
                        } catch (parseErr) {
                            console.error(`[Kick ${channel}] Error parsing chat message:`, parseErr);
                        }
                        return;
                    }
                    
                    // Log other events for debugging (but limit noise)
                    if (message.event && !message.event.startsWith('pusher') && message.event !== 'App\\Events\\ChatMessageEvent') {
                        console.log(`[Kick ${channel}] Received event: ${message.event}`);
                    }
                    
                } catch (parseError) {
                    console.error(`[Kick ${channel}] Error parsing WebSocket message:`, parseError.message);
                }
            });
            
            ws.on('error', (error) => {
                console.error(`[Kick ${channel}] Direct WebSocket error:`, error.message);
                clearTimeout(subscribeTimeout);
                if (!connectionEstablished) {
                    reject(error);
                }
            });
            
            ws.on('close', () => {
                console.log(`[Kick ${channel}] Direct WebSocket closed`);
                connection.connected = false;
                clearTimeout(subscribeTimeout);
                
                // Don't auto-reconnect due to rate limiting concerns
                // User must manually reconnect or wait for rate limit to expire
                incrementKickFailedAttempts(channel);
                console.log(`[Kick ${channel}] Not auto-reconnecting (rate limit protection). Please reconnect manually if needed.`);
            });
            
            // Set timeout for initial connection
            setTimeout(() => {
                if (!connectionEstablished) {
                    console.warn(`[Kick ${channel}] Direct WebSocket connection timeout after 15s`);
                    ws.close();
                    if (!connectionEstablished) {
                        reject(new Error('Connection timeout'));
                    }
                }
            }, 15000);
            
        } catch (error) {
            reject(error);
        }
    });
}

// Check rate limiting before attempting connection
function checkKickRateLimit(channel) {
    const now = Date.now();
    const lastAttempt = kickLastConnectionAttempt.get(channel) || 0;
    const timeSinceLastAttempt = now - lastAttempt;
    
    // Get failed attempts count for this channel
    const failedCount = kickFailedAttempts.get(channel) || 0;
    
    // Calculate delay based on failed attempts (exponential backoff)
    let requiredDelay = KICK_RATE_LIMIT.minInterval;
    if (failedCount > 0) {
        // Exponential backoff: 2s, 4s, 8s, 16s, up to max
        requiredDelay = Math.min(
            KICK_RATE_LIMIT.minInterval * Math.pow(KICK_RATE_LIMIT.backoffMultiplier, failedCount),
            KICK_RATE_LIMIT.maxInterval
        );
    }
    
    // Check if enough time has passed
    if (timeSinceLastAttempt < requiredDelay) {
        const waitTime = requiredDelay - timeSinceLastAttempt;
        console.log(`[Kick ${channel}] Rate limit: waiting ${Math.ceil(waitTime / 1000)}s before connection attempt (${failedCount} previous failures)`);
        return waitTime;
    }
    
    // Check attempts per minute
    const attempts = kickConnectionAttemptCounts.get(channel) || { count: 0, resetAt: now + 60000 };
    if (now > attempts.resetAt) {
        // Reset counter
        kickConnectionAttemptCounts.set(channel, { count: 1, resetAt: now + 60000 });
    } else {
        if (attempts.count >= KICK_RATE_LIMIT.maxAttemptsPerMinute) {
            const waitTime = attempts.resetAt - now;
            console.log(`[Kick ${channel}] Rate limit: too many attempts (${attempts.count}/${KICK_RATE_LIMIT.maxAttemptsPerMinute}), waiting ${Math.ceil(waitTime / 1000)}s`);
            return waitTime;
        }
        attempts.count++;
        kickConnectionAttemptCounts.set(channel, attempts);
    }
    
    // Update last attempt time
    kickLastConnectionAttempt.set(channel, now);
    
    return 0; // No delay needed
}

// Reset failed attempts counter on successful connection
function resetKickFailedAttempts(channel) {
    kickFailedAttempts.delete(channel);
    console.log(`[Kick ${channel}] Connection successful, resetting failed attempts counter`);
}

// Increment failed attempts counter
function incrementKickFailedAttempts(channel) {
    const current = kickFailedAttempts.get(channel) || 0;
    kickFailedAttempts.set(channel, current + 1);
    console.log(`[Kick ${channel}] Connection failed (attempt ${current + 1}), next attempt will have ${KICK_RATE_LIMIT.minInterval * Math.pow(KICK_RATE_LIMIT.backoffMultiplier, current + 1) / 1000}s delay`);
}

// Kick Chat Connection - Attempts multiple methods:
// 1. Direct Kick WebSocket (new method - trying kick-js approach)
// 2. Pusher WebSocket (legacy method)
// 3. HTTP polling (fallback)
// Includes rate limiting to prevent DDoS-like behavior
async function connectKickChannel(channel, connectionId) {
    // Check if existing connection is actually connected
    if (kickConnections.has(connectionId)) {
        const existing = kickConnections.get(connectionId);
        // Only reuse if it's actually connected and working
        if (existing.connected && (existing.ws?.readyState === WebSocket.OPEN || existing.polling)) {
            console.log(`[Kick ${channel}] Using existing active connection for panel ${connectionId}`);
            return existing;
        } else {
            // Existing connection is dead, clean it up
            console.log(`[Kick ${channel}] Existing connection is dead, cleaning up and reconnecting`);
            if (existing.ws) {
                existing.ws.close();
            }
            if (existing.stop) {
                existing.stop();
            }
            kickConnections.delete(connectionId);
        }
    }

    // Check rate limiting before attempting connection
    const waitTime = checkKickRateLimit(channel);
    if (waitTime > 0) {
        // Wait before attempting connection
        await new Promise(resolve => setTimeout(resolve, waitTime));
        // Re-check after wait
        const secondWaitTime = checkKickRateLimit(channel);
        if (secondWaitTime > 0) {
            throw new Error(`Rate limit: too many connection attempts. Please wait ${Math.ceil(secondWaitTime / 1000)}s before trying again.`);
        }
    }

    try {
        console.log(`[Kick ${channel}] Attempting to connect to Kick chat...`);
        
        // Step 1: Get channel data from Kick API
        const channelResponse = await fetch(`https://kick.com/api/v2/channels/${channel}`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!channelResponse.ok) {
            if (channelResponse.status === 404) {
                throw new Error(`Channel not found: ${channel}`);
            }
            throw new Error(`Failed to get channel data: ${channelResponse.statusText} (${channelResponse.status})`);
        }

        const channelData = await channelResponse.json();
        const chatroomId = channelData.chatroom?.id;
        
        if (!chatroomId) {
            throw new Error('Chatroom ID not found - channel may not have an active chatroom');
        }

        console.log(`[Kick ${channel}] Found chatroom ID: ${chatroomId}`);
        
        // Step 2: Try direct Kick WebSocket connection first (new method based on kick-js approach)
        // This method tries to connect directly to Kick's chat WebSocket without Pusher
        try {
            console.log(`[Kick ${channel}] Attempting direct Kick WebSocket connection...`);
            const directWsConnection = await tryDirectKickWebSocket(channel, chatroomId, channelData, connectionId);
            if (directWsConnection) {
                console.log(`[Kick ${channel}] Direct WebSocket connection successful!`);
                resetKickFailedAttempts(channel); // Reset failed attempts on success
                return directWsConnection;
            }
        } catch (directError) {
            console.warn(`[Kick ${channel}] Direct WebSocket failed, trying Pusher:`, directError.message);
            incrementKickFailedAttempts(channel); // Track failed attempt
        }
        
        // Step 3: Try Pusher WebSocket (fallback method)
        // Get Pusher config from channel data if available
        let pusherKey = 'eb1d5f283081a78b932c'; // Default Kick's Pusher key
        let pusherCluster = 'us2'; // Default cluster
        
        // Try to get Pusher config from channel data
        // Kick API may provide pusher config in different places
        let pusherConfig = null;
        
        // Try various paths where Pusher config might be
        if (channelData.chatroom?.pusher) {
            pusherConfig = channelData.chatroom.pusher;
        } else if (channelData.chatroom?.pusher_config) {
            pusherConfig = channelData.chatroom.pusher_config;
        } else if (channelData.pusher) {
            pusherConfig = channelData.pusher;
        }
        
        if (pusherConfig) {
            pusherKey = pusherConfig.key || pusherConfig.pusher_key || pusherKey;
            pusherCluster = pusherConfig.cluster || pusherConfig.pusher_cluster || pusherCluster;
            console.log(`[Kick ${channel}] Using Pusher config from channel data: key=${pusherKey.substring(0, 8)}..., cluster=${pusherCluster}`);
        } else {
            // Log that we're using defaults
            console.log(`[Kick ${channel}] No Pusher config found in channel data, using defaults: key=${pusherKey.substring(0, 8)}..., cluster=${pusherCluster}`);
            console.log(`[Kick ${channel}] Channel data keys:`, Object.keys(channelData));
            if (channelData.chatroom) {
                console.log(`[Kick ${channel}] Chatroom keys:`, Object.keys(channelData.chatroom));
            }
        }
        
        // Try Pusher WebSocket connection with the determined cluster
        const pusherUrl = `wss://ws-${pusherCluster}.pusher.com/app/${pusherKey}?protocol=7&client=js&version=7.4.0&flash=false`;
        
        console.log(`[Kick ${channel}] Attempting Pusher WebSocket connection: ${pusherUrl}`);
        
        // Try Pusher WebSocket first (preferred method)
        return new Promise(async (resolve, reject) => {
            let pusherWs;
            try {
                pusherWs = new WebSocket(pusherUrl);
                
                const connection = {
                    channel: channel,
                    chatroomId: chatroomId,
                    ws: pusherWs,
                    connected: false,
                    subscriptions: new Set(),
                    reconnectAttempts: 0,
                    maxReconnectAttempts: 5
                };
                
                kickConnections.set(connectionId, connection);
                
                let connectionTimeout = setTimeout(async () => {
                    if (!connection.connected) {
                        console.warn(`[Kick ${channel}] Pusher connection timeout after 10s, falling back to HTTP polling`);
                        if (pusherWs && pusherWs.readyState === WebSocket.OPEN) {
                            pusherWs.close();
                        }
                        // Clean up connection
                        kickConnections.delete(connectionId);
                        // Fall through to HTTP polling method
                        try {
                            const pollingConnection = await startHttpPolling();
                            resolve(pollingConnection);
                        } catch (pollingError) {
                            console.error(`[Kick ${channel}] HTTP polling fallback also failed:`, pollingError);
                            reject(pollingError);
                        }
                    }
                }, 8000); // 8 second timeout (reduced from 10s for faster fallback)
                
                pusherWs.on('open', () => {
                    console.log(`[Kick ${channel}] Pusher WebSocket connected`);
                    clearTimeout(connectionTimeout);
                    connection.connected = true;
                });
                
                pusherWs.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        
                        if (message.event === 'pusher:connection_established') {
                            console.log(`[Kick ${channel}] Pusher connection established`);
                            connection.connected = true;
                            clearTimeout(connectionTimeout);
                            
                            // Subscribe to chatroom
                            const subscribeMsg = {
                                event: 'pusher:subscribe',
                                data: {
                                    channel: `chatrooms.${chatroomId}`
                                }
                            };
                            pusherWs.send(JSON.stringify(subscribeMsg));
                            console.log(`[Kick ${channel}] Subscribed to chatrooms.${chatroomId}`);
                            
                            resetKickFailedAttempts(channel); // Reset failed attempts on success
                            
                            broadcastMessage(connectionId, {
                                type: 'status',
                                platform: 'kick',
                                channel: channel,
                                connectionId: connectionId,
                                status: 'connected'
                            });
                            
                            resolve(connection);
                            
                        } else if (message.event === 'pusher_internal:subscription_succeeded') {
                            console.log(`[Kick ${channel}] Subscription succeeded`);
                            connection.subscriptions.add(`chatrooms.${chatroomId}`);
                            
                        } else if (message.event === 'App\\Events\\ChatMessageEvent') {
                            try {
                                const msgData = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
                                const content = msgData.content || '';
                                const user = msgData.sender || {};
                                const username = user.username || user.name || 'Unknown';
                                
                                if (content && content.trim()) {
                                    console.log(`[Kick ${channel}] Message from ${username}: ${content.substring(0, 50)}`);
                                    
                                    const normalized = normalizeMessage('kick', {
                                        username: username,
                                        message: content,
                                        color: null,
                                        timestamp: Date.now(),
                                        badges: {},
                                        emotes: {}
                                    });
                                    
                                    broadcastMessage(connectionId, {
                                        type: 'chat',
                                        connectionId: connectionId,
                                        ...normalized
                                    });
                                }
                            } catch (parseErr) {
                                console.error(`[Kick ${channel}] Error parsing chat message:`, parseErr);
                            }
                        }
                    } catch (error) {
                        console.error(`[Kick ${channel}] Error processing Pusher message:`, error);
                    }
                });
                
                pusherWs.on('error', async (error) => {
                    console.error(`[Kick ${channel}] Pusher WebSocket error:`, error.message || error);
                    clearTimeout(connectionTimeout);
                    
                    // If connection fails, try HTTP polling fallback
                    if (!connection.connected) {
                        console.log(`[Kick ${channel}] Pusher connection failed, trying HTTP polling fallback`);
                        if (pusherWs) pusherWs.close();
                        try {
                            const pollingConnection = await startHttpPolling();
                            resolve(pollingConnection);
                        } catch (pollingError) {
                            reject(pollingError);
                        }
                    }
                });
                
                pusherWs.on('close', async (code, reason) => {
                    console.log(`[Kick ${channel}] Pusher WebSocket closed: ${code} ${reason}`);
                    clearTimeout(connectionTimeout);
                    connection.connected = false;
                    
                    // Track failed attempt
                    if (code !== 1000) {
                        incrementKickFailedAttempts(channel);
                    }
                    
                    // Clean up connection from map
                    kickConnections.delete(connectionId);
                    
                    // Check if it's a cluster error (4001) - means wrong cluster for this app key
                    if (code === 4001 || (reason && (reason.includes('not in this cluster') || reason.includes('App key')))) {
                        console.log(`[Kick ${channel}] Pusher cluster error (${code}): ${reason}`);
                        console.log(`[Kick ${channel}] Not auto-reconnecting due to rate limiting - manual reconnect required`);
                        broadcastMessage(connectionId, {
                            type: 'status',
                            platform: 'kick',
                            channel: channel,
                            connectionId: connectionId,
                            status: 'disconnected',
                            error: 'Cluster error - manual reconnect required'
                        });
                        reject(new Error('Pusher cluster error - manual reconnect required'));
                        return;
                    }
                    
                    // For other errors, don't auto-reconnect due to rate limiting
                    if (code !== 1000 && !connection.connected) {
                        console.log(`[Kick ${channel}] Pusher closed with error (${code}), not auto-reconnecting (rate limit protection)`);
                        broadcastMessage(connectionId, {
                            type: 'status',
                            platform: 'kick',
                            channel: channel,
                            connectionId: connectionId,
                            status: 'disconnected',
                            error: `Connection error (${code}) - manual reconnect required`
                        });
                        reject(new Error(`Connection error (${code}) - manual reconnect required`));
                        return;
                    }
                    
                    // Normal close (code 1000) - just cleanup
                    broadcastMessage(connectionId, {
                        type: 'status',
                        platform: 'kick',
                        channel: channel,
                        connectionId: connectionId,
                        status: 'disconnected'
                    });
                });
                
            } catch (wsError) {
                console.error(`[Kick ${channel}] Failed to create Pusher WebSocket:`, wsError);
                // Fall back to HTTP polling
                try {
                    const pollingConnection = await startHttpPolling();
                    resolve(pollingConnection);
                } catch (pollingError) {
                    reject(pollingError);
                }
            }
        });
        
        // HTTP Polling method - improved with better endpoints
        async function startHttpPolling() {
            console.log(`[Kick ${channel}] Starting HTTP polling method...`);
            
            // Try multiple endpoints in order of reliability
            // Note: Kick API endpoints may require authentication and return HTML
            // We try various known endpoint formats that might work
            const possibleEndpoints = [
                // Try with pagination first (sometimes works better)
                `https://kick.com/api/v2/chatrooms/${chatroomId}/messages?page=1&per_page=50`,
                // Standard endpoints
                `https://kick.com/api/v2/chatrooms/${chatroomId}/messages`,
                `https://kick.com/api/v1/chatrooms/${chatroomId}/messages`,
                `https://kick.com/api/v2/channels/${channel}/chat-messages`,
                // Alternative formats
                `https://kick.com/api/v1/channels/${channel}/chat-messages`,
            ];
            
            let workingEndpointIndex = 0;
            let chatMessagesUrl = possibleEndpoints[0];
            const seenMessageIds = new Set();
            let pollingInterval = null;
            let isPolling = false;
            let consecutiveErrors = 0;
            const MAX_CONSECUTIVE_ERRORS = 5;
            
            const pollChatMessages = async () => {
            if (isPolling) return; // Prevent concurrent polls
            isPolling = true;
            
            try {
                // Fetch recent chat messages - try current endpoint first
                let response;
                
                // Prepare headers - add OAuth token if available
                const headers = {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': `https://kick.com/${channel}`,
                    'Origin': 'https://kick.com'
                };
                
                // Add OAuth Bearer token if available
                if (kickAccessTokens.size > 0) {
                    // Get the first available token (in production, match with user/session)
                    const [userId, tokenData] = Array.from(kickAccessTokens.entries())[0];
                    
                    // Check if token is expired
                    if (tokenData.expires_at && tokenData.expires_at < Date.now()) {
                        console.warn(`[Kick ${channel}] OAuth token expired, removing...`);
                        kickAccessTokens.delete(userId);
                    } else {
                        headers['Authorization'] = `${tokenData.token_type || 'Bearer'} ${tokenData.access_token}`;
                        console.log(`[Kick ${channel}] Using OAuth token for authenticated request`);
                    }
                }
                
                try {
                    response = await fetch(chatMessagesUrl, {
                        headers: headers,
                        signal: AbortSignal.timeout(5000) // 5 second timeout
                    });
                
                } catch (fetchError) {
                    // If fetch fails, try next endpoint
                    if (workingEndpointIndex < possibleEndpoints.length - 1) {
                        workingEndpointIndex++;
                        chatMessagesUrl = possibleEndpoints[workingEndpointIndex];
                        console.log(`[Kick ${channel}] Endpoint failed, trying: ${chatMessagesUrl}`);
                        isPolling = false;
                        return; // Will retry on next poll
                    }
                    throw fetchError;
                }
                
                if (!response.ok) {
                    // If 404 or similar, try next endpoint
                    if (response.status === 404 && workingEndpointIndex < possibleEndpoints.length - 1) {
                        workingEndpointIndex++;
                        chatMessagesUrl = possibleEndpoints[workingEndpointIndex];
                        console.log(`[Kick ${channel}] Endpoint returned 404, trying: ${chatMessagesUrl}`);
                        isPolling = false;
                        return; // Will retry on next poll
                    }
                    
                    console.warn(`[Kick ${channel}] Chat messages API returned: ${response.status}`);
                    consecutiveErrors++;
                    
                    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                        console.error(`[Kick ${channel}] Too many consecutive errors, stopping polling`);
                        broadcastMessage(connectionId, {
                            type: 'status',
                            platform: 'kick',
                            channel: channel,
                            connectionId: connectionId,
                            status: 'error',
                            message: `API error: ${response.status} ${response.statusText}`
                        });
                        isPolling = false;
                        return;
                    }
                    isPolling = false;
                    return;
                }
                
                // Get response text first to handle potential non-JSON responses
                const responseText = await response.text();
                
                // Check if response is actually JSON
                let messagesData;
                try {
                    messagesData = JSON.parse(responseText);
                } catch (parseError) {
                    console.error(`[Kick ${channel}] Failed to parse JSON response:`, parseError.message);
                    console.error(`[Kick ${channel}] Response preview (first 500 chars):`, responseText.substring(0, 500));
                    
                    // Check if it's an HTML error page
                    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
                        console.error(`[Kick ${channel}] API returned HTML instead of JSON - endpoint may not exist or require auth`);
                        
                        // Try next endpoint if available
                        if (workingEndpointIndex < possibleEndpoints.length - 1) {
                            workingEndpointIndex++;
                            chatMessagesUrl = possibleEndpoints[workingEndpointIndex];
                            console.log(`[Kick ${channel}] HTML response, trying next endpoint: ${chatMessagesUrl}`);
                            consecutiveErrors = 0; // Reset counter when trying new endpoint
                            isPolling = false;
                            return; // Will retry with new endpoint
                        }
                        
                        // All endpoints failed - Kick chat API requires authentication
                        // Note: Kick chat is not publicly accessible via HTTP polling
                        consecutiveErrors++;
                        
                        // If we've tried all endpoints and they all return HTML, stop immediately
                        if (workingEndpointIndex >= possibleEndpoints.length - 1) {
                            console.error(`[Kick ${channel}] All ${possibleEndpoints.length} endpoints returned HTML - Kick chat requires authentication`);
                            console.error(`[Kick ${channel}] Tried endpoints:`, possibleEndpoints.join(', '));
                            
                            // Stop polling immediately
                            const failedConnection = kickConnections.get(connectionId);
                            
                            if (failedConnection) {
                                if (failedConnection.stop) {
                                    failedConnection.stop();
                                }
                                if (failedConnection.interval) {
                                    clearInterval(failedConnection.interval);
                                    failedConnection.interval = null;
                                }
                                failedConnection.polling = false;
                            }
                            
                            kickConnections.delete(connectionId);
                            
                            // Send clear error message
                            broadcastMessage(connectionId, {
                                type: 'status',
                                platform: 'kick',
                                channel: channel,
                                connectionId: connectionId,
                                status: 'error',
                                message: 'Kick chat není dostupný: API endpointy vyžadují autentizaci (vrací HTML místo JSON). Momentálně není podporováno bez OAuth.'
                            });
                            
                            isPolling = false;
                            return;
                        }
                        
                        // If we haven't reached max errors yet, continue trying
                        isPolling = false;
                        return;
                    }
                    
                    // If it's not HTML, it might be empty or malformed
                    consecutiveErrors++;
                    isPolling = false;
                    return;
                }
                
                consecutiveErrors = 0; // Reset error counter on success
                
                // Check response structure - Kick API might have different formats
                let messages = [];
                
                if (messagesData && Array.isArray(messagesData.data)) {
                    messages = messagesData.data;
                } else if (messagesData && Array.isArray(messagesData)) {
                    // Response might be direct array
                    messages = messagesData;
                } else if (messagesData && messagesData.messages && Array.isArray(messagesData.messages)) {
                    messages = messagesData.messages;
                } else if (messagesData && messagesData.chat && Array.isArray(messagesData.chat)) {
                    messages = messagesData.chat;
                } else {
                    console.warn(`[Kick ${channel}] Unexpected response format:`, {
                        hasData: !!messagesData?.data,
                        hasMessages: !!messagesData?.messages,
                        isArray: Array.isArray(messagesData),
                        keys: Object.keys(messagesData || {})
                    });
                    console.warn(`[Kick ${channel}] Full response (first 1000 chars):`, JSON.stringify(messagesData || {}).substring(0, 1000));
                    isPolling = false;
                    return;
                }
                
                if (messages.length > 0) {
                    // Reverse to process oldest first (to maintain chronological order)
                    messages = messages.reverse();
                    let newMessagesFound = false;
                    
                    for (const msg of messages) {
                        // Skip if we've already seen this message
                        if (seenMessageIds.has(msg.id)) {
                            continue;
                        }
                        
                        seenMessageIds.add(msg.id);
                        newMessagesFound = true;
                        
                        // Update last message timestamp
                        const msgTimestamp = new Date(msg.created_at || Date.now()).getTime();
                        if (!lastMessageTimestamp || msgTimestamp > lastMessageTimestamp) {
                            lastMessageTimestamp = msgTimestamp;
                        }
                        
                        // Extract message details
                        const content = msg.content || '';
                        const username = msg.user?.username || msg.sender?.username || msg.username || 'Unknown';
                        
                        // Skip empty messages
                        if (!content || content.trim() === '') {
                            continue;
                        }
                        
                        console.log(`[Kick ${channel}] Message from ${username}: ${content.substring(0, 50)}`);
                        
                        // Normalize and broadcast
                        const normalized = normalizeMessage('kick', {
                            username: username,
                            message: content,
                            color: null, // Kick doesn't provide user colors in polling API
                            timestamp: msgTimestamp,
                            badges: {},
                            emotes: {}
                        });
                        
                        const messageToSend = {
                            type: 'chat',
                            connectionId: connectionId,
                            ...normalized
                        };
                        
                        broadcastMessage(connectionId, messageToSend);
                    }
                    
                    if (!newMessagesFound && seenMessageIds.size > 0) {
                        // No new messages in this poll (normal behavior)
                        console.log(`[Kick ${channel}] No new messages in this poll (${seenMessageIds.size} total seen)`);
                    }
                    
                    // Keep only last 1000 message IDs to prevent memory issues
                    if (seenMessageIds.size > 1000) {
                        const idsArray = Array.from(seenMessageIds);
                        const toRemove = idsArray.slice(0, idsArray.length - 1000);
                        toRemove.forEach(id => seenMessageIds.delete(id));
                    }
                } else {
                    // Empty messages array is OK - channel might not have messages yet
                    console.log(`[Kick ${channel}] No messages in response (channel may be empty or slow)`);
                }
                
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.warn(`[Kick ${channel}] Polling request timed out`);
                } else {
                    console.error(`[Kick ${channel}] Error polling chat messages:`, error.message);
                    console.error(`[Kick ${channel}] Error stack:`, error.stack?.substring(0, 200));
                }
                consecutiveErrors++;
                
                if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                    console.error(`[Kick ${channel}] Too many consecutive errors (${consecutiveErrors}), stopping polling`);
                    
                    // Try to provide more helpful error message
                    let errorMsg = `Polling error: ${error.message || 'Unknown error'}`;
                    if (error.message && error.message.includes('Unexpected token')) {
                        errorMsg = 'API returned invalid JSON - Kick API may have changed or endpoint is unavailable';
                    } else if (error.message && error.message.includes('JSON')) {
                        errorMsg = `JSON parsing error: ${error.message}`;
                    }
                    
                    broadcastMessage(connectionId, {
                        type: 'status',
                        platform: 'kick',
                        channel: channel,
                        connectionId: connectionId,
                        status: 'error',
                        message: errorMsg
                    });
                } else {
                    // Log warning but continue trying
                    console.warn(`[Kick ${channel}] Error ${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}, will retry...`);
                }
            } finally {
                isPolling = false;
            }
        };
        
        // Create connection object for HTTP polling
        const connection = {
            channel: channel,
            chatroomId: chatroomId,
            connected: false, // Will be set to true on first successful poll
            polling: true,
            interval: null,
            seenMessageIds: seenMessageIds,
            stop: () => {
                if (connection.interval) {
                    clearInterval(connection.interval);
                    connection.interval = null;
                }
                connection.polling = false;
            }
        };
        
        kickConnections.set(connectionId, connection);
        
        // Get initial messages (this will also send connected status if successful)
        await pollChatMessages();
        
        // If still not connected after first poll, it means all endpoints failed
        // But we'll keep trying, so don't set error status yet
        
        // Start polling every 2.5 seconds
        connection.interval = setInterval(() => {
            pollChatMessages();
        }, 2500);
        
        console.log(`[Kick ${channel}] Started HTTP polling every 2.5 seconds`);
        
        // Send initial "connecting" status
        broadcastMessage(connectionId, {
            type: 'status',
            platform: 'kick',
            channel: channel,
            connectionId: connectionId,
            status: 'connecting'
        });
        
        // Connected status will be sent by pollChatMessages() on first successful poll
        
        return connection;
        }
        
    } catch (error) {
        console.error(`[Kick ${channel}] Connection error:`, error);
        
        // Clean up if connection was created
        if (kickConnections.has(connectionId)) {
            const conn = kickConnections.get(connectionId);
            if (conn && conn.interval) {
                clearInterval(conn.interval);
            }
            if (conn && conn.stop) {
                conn.stop();
            }
            kickConnections.delete(connectionId);
        }
        
        broadcastMessage(connectionId, {
            type: 'status',
            platform: 'kick',
            channel: channel,
            connectionId: connectionId,
            status: 'error',
            message: error.message || 'Failed to connect to Kick chat'
        });
        
        return null;
    }
}

// Broadcast message to all WebSocket clients for a connection (panelId)
function broadcastMessage(panelId, message) {
    console.log(`[WS] Broadcasting message to panel ${panelId}:`, message.type);
    
    const clients = chatClients.get(panelId);
    if (!clients) {
        console.warn(`[WS] No clients found for panel ${panelId}. Available panels:`, Array.from(chatClients.keys()));
        return;
    }
    
    if (clients.size === 0) {
        console.warn(`[WS] Client set is empty for panel ${panelId}`);
        return;
    }
    
    let sent = false;
    let sentCount = 0;
    
    clients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            try {
                const messageToSend = {
                    ...message,
                    connectionId: panelId  // Ensure panelId is included
                };
                
                ws.send(JSON.stringify(messageToSend));
                sent = true;
                sentCount++;
                console.log(`[WS] Message sent successfully to panel ${panelId} (${sentCount}/${clients.size})`);
            } catch (error) {
                console.error(`[WS] Error sending message to ${panelId}:`, error);
            }
        } else {
            console.warn(`[WS] Client for panel ${panelId} not ready (state: ${ws.readyState})`);
        }
    });
    
    if (!sent && clients.size > 0) {
        console.error(`[WS] Failed to send message to any client for panel ${panelId} (${clients.size} clients, none ready)`);
    } else if (sent) {
        console.log(`[WS] Successfully broadcasted to ${sentCount} client(s) for panel ${panelId}`);
    }
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const wsConnectionId = url.searchParams.get('id') || 'default';
    
    console.log(`[WS] New connection: ${wsConnectionId}`);
    
    // Store WebSocket connection
    wsConnections.set(ws, null); // Will be set when connect message is received

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            
            switch (message.type) {
                case 'connect':
                    let { platform, channel, connectionId: panelId } = message;
                    
                    // Use panelId from message, fallback to wsConnectionId
                    const panelConnectionId = panelId || wsConnectionId;
                    
                    // Clean up channel name (remove popout, etc.)
                    if (platform === 'kick' && channel) {
                        // If channel contains /popout/, extract the actual channel name
                        if (channel.includes('/')) {
                            const parts = channel.split('/');
                            // Find the part after 'popout' or use the last meaningful part
                            const popoutIndex = parts.findIndex(p => p.toLowerCase() === 'popout');
                            if (popoutIndex !== -1 && popoutIndex < parts.length - 1) {
                                channel = parts[popoutIndex + 1];
                            } else {
                                // Use last non-empty part that's not a reserved word
                                const reserved = ['popout', 'embed', 'api', 'v2', 'chatroom'];
                                for (let i = parts.length - 1; i >= 0; i--) {
                                    if (parts[i] && !reserved.includes(parts[i].toLowerCase())) {
                                        channel = parts[i];
                                        break;
                                    }
                                }
                            }
                        }
                        // Remove any query parameters
                        channel = channel.split('?')[0].split('#')[0];
                    }
                    
                    console.log(`[${platform}] Connecting to: ${channel} (Panel ID: ${panelConnectionId})`);
                    
                    // Map this WebSocket to the panelId
                    if (!chatClients.has(panelConnectionId)) {
                        chatClients.set(panelConnectionId, new Set());
                    }
                    chatClients.get(panelConnectionId).add(ws);
                    wsConnections.set(ws, panelConnectionId);
                    
                    // Connect to chat platform
                    if (platform === 'twitch') {
                        connectTwitchChannel(channel.toLowerCase(), panelConnectionId);
                    } else if (platform === 'kick') {
                        await connectKickChannel(channel.toLowerCase(), panelConnectionId);
                    } else if (platform === 'youtube') {
                        await connectYouTubeChannel(channel, panelConnectionId);
                    }
                    break;
                    
                case 'disconnect':
                    const { platform: discPlatform, channel: discChannel, connectionId: discPanelId } = message;
                    const disconnectPanelId = discPanelId || wsConnections.get(ws);
                    
                    console.log(`[${discPlatform}] Disconnecting from: ${discChannel} (Panel ID: ${disconnectPanelId})`);
                    
                    if (disconnectPanelId) {
                        if (discPlatform === 'twitch' && twitchClients.has(disconnectPanelId)) {
                            const client = twitchClients.get(disconnectPanelId);
                            await client.disconnect();
                            twitchClients.delete(disconnectPanelId);
                        }
                        
                        if (discPlatform === 'kick' && kickConnections.has(disconnectPanelId)) {
                            const conn = kickConnections.get(disconnectPanelId);
                            if (conn) {
                                if (conn.stop) {
                                    conn.stop();
                                } else if (conn.interval) {
                                    clearInterval(conn.interval);
                                } else if (conn.ws) {
                                    conn.ws.close();
                                }
                            }
                            kickConnections.delete(disconnectPanelId);
                            console.log(`[Kick] Disconnected from: ${discChannel} (Panel: ${disconnectPanelId})`);
                        }
                        
                        if (discPlatform === 'youtube' && youtubeConnections.has(disconnectPanelId)) {
                            const conn = youtubeConnections.get(disconnectPanelId);
                            if (conn && conn.interval) {
                                clearTimeout(conn.interval);
                                conn.polling = false;
                            }
                            youtubeConnections.delete(disconnectPanelId);
                            console.log(`[YouTube] Disconnected from: ${discChannel} (Panel: ${disconnectPanelId})`);
                        }
                        
                        // Remove WebSocket from panel clients
                        const panelClients = chatClients.get(disconnectPanelId);
                        if (panelClients) {
                            panelClients.delete(ws);
                            if (panelClients.size === 0) {
                                chatClients.delete(disconnectPanelId);
                            }
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error('[WS] Error processing message:', error);
        }
    });

    ws.on('close', () => {
        const panelId = wsConnections.get(ws);
        console.log(`[WS] Connection closed: ${wsConnectionId} (Panel: ${panelId || 'unknown'})`);
        
        if (panelId) {
            const clients = chatClients.get(panelId);
            if (clients) {
                clients.delete(ws);
                if (clients.size === 0) {
                    chatClients.delete(panelId);
                    // Cleanup chat connections
                    if (twitchClients.has(panelId)) {
                        const client = twitchClients.get(panelId);
                        client.disconnect().catch(() => {});
                        twitchClients.delete(panelId);
                    }
                    if (kickConnections.has(panelId)) {
                        const conn = kickConnections.get(panelId);
                        if (conn) {
                            if (conn.stop) {
                                conn.stop();
                            } else if (conn.interval) {
                                clearInterval(conn.interval);
                            } else if (conn.ws) {
                                conn.ws.close();
                            }
                        }
                        kickConnections.delete(panelId);
                    }
                    if (youtubeConnections.has(panelId)) {
                        const conn = youtubeConnections.get(panelId);
                        if (conn && conn.interval) {
                            clearTimeout(conn.interval);
                            conn.polling = false;
                        }
                        youtubeConnections.delete(panelId);
                    }
                }
            }
        }
        wsConnections.delete(ws);
    });

    ws.on('error', (error) => {
        console.error(`[WS] Error for ${wsConnectionId}:`, error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connected',
        connectionId: wsConnectionId,
        timestamp: new Date().toISOString()
    }));
});

// REST API endpoints
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/status', (req, res) => {
    res.json({
        twitch: twitchClients.size,
        kick: kickConnections.size,
        youtube: youtubeConnections.size,
        websocket: Array.from(chatClients.keys()).length,
        youtubeApiConfigured: !!getYoutubeApiKey()
    });
});

// Server control state
let isServerRunning = true; // Current server instance is running

// Reload credentials (used after saving or when explicitly needed)
// Only actually reloads if file was modified
function reloadCredentials(force = false) {
    if (force) {
        // Force reload by resetting modification time
        credentialsLastModified = 0;
    }
    loadCredentials();
    // Only log if we actually reloaded (file was modified)
    if (force || credentialsLastModified > 0) {
        console.log('[Config] Credentials reloaded');
    }
}

// Helper functions to get current credential values (for dynamic access)
function getKickClientId() {
    return credentials.kickClientId || process.env.KICK_CLIENT_ID || null;
}

function getKickClientSecret() {
    return credentials.kickClientSecret || process.env.KICK_CLIENT_SECRET || null;
}

function getYoutubeApiKey() {
    return credentials.youtubeApiKey || process.env.YOUTUBE_API_KEY || 'YOUR_YOUTUBE_API_KEY_HERE';
}

function getTwitchChannelName() {
    return credentials.twitchChannelName || process.env.TWITCH_CHANNEL_NAME || null;
}

// Log Kick API status (after helper functions are defined)
const initialKickClientId = getKickClientId();
const initialKickClientSecret = getKickClientSecret();
if (initialKickClientId && initialKickClientSecret) {
    console.log(`[Kick] Developer API configured: Client ID ${initialKickClientId.substring(0, 8)}...`);
    console.log(`[Kick] OAuth 2.0 enabled - redirect URI: ${KICK_REDIRECT_URI}`);
} else {
    console.log(`[Kick] Using public API (HTTP polling method)`);
    console.log(`[Kick] Tip: Configure Kick Client ID a Secret v nastavení (⚙️ Nastavení) nebo přes KICK_CLIENT_ID a KICK_CLIENT_SECRET`);
}

// Server control endpoints
app.get('/api/server/status', (req, res) => {
    const PORT = process.env.PORT || 3001;
    res.json({
        running: isServerRunning,
        timestamp: new Date().toISOString(),
        port: PORT,
        connections: {
            twitch: twitchClients.size,
            kick: kickConnections.size,
            youtube: youtubeConnections.size,
            websocket: Array.from(chatClients.keys()).length
        },
        youtubeApiConfigured: !!getYoutubeApiKey(),
        kickOAuthConfigured: !!(getKickClientId() && getKickClientSecret()),
        kickOAuthTokensCount: kickAccessTokens.size
    });
});

app.post('/api/server/restart', async (req, res) => {
    try {
        console.log('[Server] Restart requested via API');
        res.json({ 
            success: true, 
            message: 'Server se restartuje...',
            timestamp: new Date().toISOString()
        });
        
        // Give response time to send, then restart
        setTimeout(() => {
            console.log('[Server] Restarting...');
            process.exit(0); // Exit with code 0
        }, 500);
    } catch (error) {
        console.error('[Server] Restart error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/server/stop', async (req, res) => {
    try {
        console.log('[Server] Stop requested via API');
        res.json({ 
            success: true, 
            message: 'Server se vypíná...',
            timestamp: new Date().toISOString()
        });
        
        // Disconnect all clients gracefully
        wss.clients.forEach(client => {
            client.close();
        });
        
        // Close all Twitch clients
        twitchClients.forEach((client, id) => {
            client.disconnect();
        });
        
        // Give response time to send, then exit
        setTimeout(() => {
            console.log('[Server] Shutting down...');
            process.exit(0);
        }, 1000);
    } catch (error) {
        console.error('[Server] Stop error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/server/start', async (req, res) => {
    try {
        // Check if server is already running
        if (isServerRunning) {
            return res.json({ 
                success: true, 
                message: 'Server již běží',
                running: true
            });
        }
        
        console.log('[Server] Start requested via API');
        
        // Start new server instance
        const serverPath = join(__dirname, 'server.js');
        const isWindows = process.platform === 'win32';
        
        if (isWindows) {
            // Windows: spawn node process
            const startScript = spawn('node', [serverPath], {
                detached: true,
                stdio: 'ignore',
                cwd: __dirname
            });
            
            startScript.unref();
            isServerRunning = true;
            
            res.json({ 
                success: true, 
                message: 'Server se spouští...',
                timestamp: new Date().toISOString()
            });
        } else {
            // Unix/Linux: use nohup or similar
            res.status(501).json({ 
                success: false, 
                error: 'Start endpoint currently only supports Windows' 
            });
        }
    } catch (error) {
        console.error('[Server] Start error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==================== Kick OAuth 2.0 Endpoints ====================

// Initiate OAuth flow - redirect user to Kick authorization page
app.get('/auth/kick', (req, res) => {
    reloadCredentials();
    const currentKickClientId = getKickClientId();
    const currentKickClientSecret = getKickClientSecret();
    
    if (!currentKickClientId || !currentKickClientSecret) {
        return res.status(400).json({
            error: 'Kick OAuth not configured',
            message: 'KICK_CLIENT_ID and KICK_CLIENT_SECRET must be set. Zadejte je v nastavení (⚙️ Nastavení).'
        });
    }

    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    oauthStates.set(state, {
        created: Date.now(),
        expires: Date.now() + 600000 // 10 minutes
    });

    // Build authorization URL
    const authUrl = new URL(KICK_AUTHORIZE_URL);
    authUrl.searchParams.set('client_id', currentKickClientId);
    authUrl.searchParams.set('redirect_uri', KICK_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', KICK_SCOPES);
    authUrl.searchParams.set('state', state);

    console.log(`[Kick OAuth] Initiating OAuth flow with state: ${state.substring(0, 8)}...`);
    res.redirect(authUrl.toString());
});

// OAuth callback - exchange authorization code for access token
app.get('/auth/kick/callback', async (req, res) => {
    const { code, state, error } = req.query;

    // Get frontend URL from environment or use default
    // Try to get from origin/referer header if available, otherwise use default
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    let FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Prefer origin over referer
    if (origin) {
        try {
            const originUrl = new URL(origin);
            FRONTEND_URL = `${originUrl.protocol}//${originUrl.host}`;
            console.log(`[Kick OAuth] Using origin for redirect: ${FRONTEND_URL}`);
        } catch (e) {
            console.warn(`[Kick OAuth] Failed to parse origin: ${origin}`);
        }
    } else if (referer) {
        try {
            const refererUrl = new URL(referer);
            FRONTEND_URL = `${refererUrl.protocol}//${refererUrl.host}`;
            console.log(`[Kick OAuth] Using referer for redirect: ${FRONTEND_URL}`);
        } catch (e) {
            console.warn(`[Kick OAuth] Failed to parse referer: ${referer}`);
        }
    }
    
    // If still using default, try to get from request host (for file:// or localhost scenarios)
    if (FRONTEND_URL === 'http://localhost:3000' && req.headers.host) {
        // Don't use server host, keep default or use file protocol detection
        console.log(`[Kick OAuth] Using default frontend URL: ${FRONTEND_URL}`);
    }

    // Helper function to create redirect URL
    // Try to use full URL with correct origin, but fall back to relative if needed
    const createRedirectUrl = (path) => {
        // Try to construct full URL if we have a valid frontend URL
        if (FRONTEND_URL && FRONTEND_URL !== 'http://localhost:3000') {
            try {
                // Ensure path starts with /
                const cleanPath = path.startsWith('/') ? path : '/' + path;
                // Remove query params from FRONTEND_URL if present, then add path
                const frontendUrl = new URL(FRONTEND_URL);
                frontendUrl.pathname = cleanPath;
                const fullUrl = frontendUrl.toString();
                console.log(`[Kick OAuth] Redirecting to full URL: ${fullUrl}`);
                return fullUrl;
            } catch (e) {
                console.warn(`[Kick OAuth] Failed to construct full URL, using relative: ${e.message}`);
            }
        }
        // Fall back to relative path for file:// protocol or when origin is unclear
        const relativePath = path.startsWith('/') ? path : '/' + path;
        console.log(`[Kick OAuth] Redirecting to relative path: ${relativePath}`);
        return relativePath;
    };

    if (error) {
        console.error(`[Kick OAuth] Authorization error: ${error}`);
        return res.redirect(createRedirectUrl(`/index.html?kick_oauth_error=${encodeURIComponent(error)}`));
    }

    if (!code || !state) {
        return res.redirect(createRedirectUrl('/index.html?kick_oauth_error=missing_code_or_state'));
    }

    // Verify state (CSRF protection)
    const storedState = oauthStates.get(state);
    if (!storedState) {
        console.error(`[Kick OAuth] Invalid state: ${state}`);
        return res.redirect(createRedirectUrl('/index.html?kick_oauth_error=invalid_state'));
    }

    if (storedState.expires < Date.now()) {
        console.error(`[Kick OAuth] Expired state: ${state}`);
        oauthStates.delete(state);
        return res.redirect(createRedirectUrl('/index.html?kick_oauth_error=expired_state'));
    }

    // State is valid, remove it
    oauthStates.delete(state);

    try {
        // Exchange authorization code for access token
        console.log(`[Kick OAuth] Exchanging code for token...`);
        
        const tokenResponse = await fetch(KICK_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: getKickClientId(),
                client_secret: getKickClientSecret(),
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: KICK_REDIRECT_URI
            })
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error(`[Kick OAuth] Token exchange failed: ${tokenResponse.status} - ${errorText}`);
            return res.redirect(createRedirectUrl('/index.html?kick_oauth_error=token_exchange_failed'));
        }

        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
            console.error(`[Kick OAuth] No access token in response:`, tokenData);
            return res.redirect(createRedirectUrl('/index.html?kick_oauth_error=no_access_token'));
        }

        // Get user info to identify the user
        let userId = 'default'; // Default user ID if we can't fetch user info
        try {
            const userResponse = await fetch('https://kick.com/api/v2/user', {
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'Accept': 'application/json'
                }
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();
                userId = userData.id?.toString() || userData.username || 'default';
                console.log(`[Kick OAuth] User identified: ${userId}`);
            }
        } catch (userError) {
            console.warn(`[Kick OAuth] Could not fetch user info:`, userError.message);
        }

        // Store access token
        kickAccessTokens.set(userId, {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || null,
            expires_at: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : null,
            token_type: tokenData.token_type || 'Bearer'
        });

        console.log(`[Kick OAuth] Access token stored for user: ${userId}`);
        console.log(`[Kick OAuth] Token expires in: ${tokenData.expires_in || 'unknown'} seconds`);

        // Redirect back to frontend with success
        const redirectUrl = createRedirectUrl('/index.html?kick_oauth=success');
        console.log(`[Kick OAuth] Redirecting to: ${redirectUrl}`);
        res.redirect(redirectUrl);

    } catch (error) {
        console.error(`[Kick OAuth] Error during token exchange:`, error);
        const errorRedirect = createRedirectUrl(`/index.html?kick_oauth_error=${encodeURIComponent(error.message)}`);
        res.redirect(errorRedirect);
    }
});

// Get OAuth status (check if user is authenticated)
app.get('/api/kick/oauth/status', (req, res) => {
    // Check if reload is needed (file may have changed)
    reloadCredentials(false); // Don't force, only reload if file changed
    const currentKickClientId = getKickClientId();
    const currentKickClientSecret = getKickClientSecret();
    
    // For now, return if OAuth is configured and if we have any tokens
    // In a real app, you'd check for a specific user's token
    const hasTokens = kickAccessTokens.size > 0;
    const tokenKeys = Array.from(kickAccessTokens.keys());
    
    res.json({
        configured: !!(currentKickClientId && currentKickClientSecret),
        authenticated: hasTokens,
        tokenCount: kickAccessTokens.size,
        userIds: tokenKeys,
        authUrl: currentKickClientId ? `/auth/kick` : null
    });
});

// Get access token for current user (for frontend use)
// Note: In production, this should be protected and user-specific
app.get('/api/kick/oauth/token', (req, res) => {
    // For simplicity, return the first token (in production, use session/user identification)
    if (kickAccessTokens.size === 0) {
        return res.status(401).json({
            error: 'Not authenticated',
            message: 'No OAuth tokens available. Please authenticate first.',
            authUrl: getKickClientId() ? `/auth/kick` : null
        });
    }

    // Get the first token (in production, match with user session)
    const [userId, tokenData] = Array.from(kickAccessTokens.entries())[0];
    
    // Check if token is expired
    if (tokenData.expires_at && tokenData.expires_at < Date.now()) {
        console.log(`[Kick OAuth] Token expired for user: ${userId}`);
        
        // Try to refresh if refresh_token is available
        if (tokenData.refresh_token) {
            // TODO: Implement token refresh
            kickAccessTokens.delete(userId);
            return res.status(401).json({
                error: 'Token expired',
                message: 'Token has expired. Please re-authenticate.',
                authUrl: `/auth/kick`
            });
        } else {
            kickAccessTokens.delete(userId);
            return res.status(401).json({
                error: 'Token expired',
                message: 'Token has expired. Please re-authenticate.',
                authUrl: `/auth/kick`
            });
        }
    }

    // Return token info (but not the actual token for security)
    res.json({
        authenticated: true,
        userId: userId,
        expires_at: tokenData.expires_at,
        has_refresh_token: !!tokenData.refresh_token
    });
});

// ==================== API Credentials Management ====================

// Get current credentials (without secrets)
app.get('/api/config/credentials', (req, res) => {
    // Check if reload is needed (file may have changed)
    reloadCredentials(false); // Don't force, only reload if file changed
    res.json({
        kickClientId: credentials.kickClientId || process.env.KICK_CLIENT_ID || null,
        kickClientSecret: credentials.kickClientSecret ? '***' : (process.env.KICK_CLIENT_SECRET ? '***' : null), // Don't reveal secret
        youtubeApiKey: credentials.youtubeApiKey || process.env.YOUTUBE_API_KEY || null,
        twitchChannelName: credentials.twitchChannelName || process.env.TWITCH_CHANNEL_NAME || null,
        configured: {
            kick: !!(getKickClientId() && getKickClientSecret()),
            youtube: !!getYoutubeApiKey(),
            twitch: !!(credentials.twitchChannelName || process.env.TWITCH_CHANNEL_NAME)
        }
    });
});

// Save credentials
app.post('/api/config/credentials', (req, res) => {
    try {
        const { kickClientId, kickClientSecret, youtubeApiKey, twitchChannelName } = req.body;
        
        const newCredentials = {};
        if (kickClientId !== undefined) newCredentials.kickClientId = kickClientId?.trim() || null;
        if (kickClientSecret !== undefined) newCredentials.kickClientSecret = kickClientSecret?.trim() || null;
        if (youtubeApiKey !== undefined) newCredentials.youtubeApiKey = youtubeApiKey?.trim() || null;
        if (twitchChannelName !== undefined) newCredentials.twitchChannelName = twitchChannelName?.trim() || null;
        
        if (saveCredentialsToFile(newCredentials)) {
            // Force reload credentials after saving
            reloadCredentials(true); // Force reload after save
            
            res.json({
                success: true,
                message: 'Přihlašovací údaje uloženy. Restartujte server, aby se změny projevily.',
                requiresRestart: true
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Chyba při ukládání přihlašovacích údajů'
            });
        }
    } catch (error) {
        console.error('[API] Error saving credentials:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Multistream Chat Server running on port ${PORT}`);
    console.log(`📡 WebSocket server: ws://localhost:${PORT}`);
    console.log(`🌐 HTTP server: http://localhost:${PORT}`);
    if (fs.existsSync(CREDENTIALS_FILE)) {
        console.log(`📝 Credentials file: ${CREDENTIALS_FILE}`);
    }
});

