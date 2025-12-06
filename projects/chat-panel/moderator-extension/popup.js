/**
 * AdHub Multistream Chat Moderator
 * Popup Script - UI pro prihlaseni a spravu
 */

// Twitch OAuth klient ID - DULEZITE: Uzivatele musi zaregistrovat vlastni aplikaci
// Navod: https://dev.twitch.tv/console/apps
const TWITCH_CLIENT_ID = 'YOUR_TWITCH_CLIENT_ID'; // Uzivatel musi nahradit svym ID
const TWITCH_REDIRECT_URI = chrome.identity.getRedirectURL('twitch');
const TWITCH_SCOPES = [
    'user:read:email',
    'moderator:manage:banned_users',
    'moderator:manage:chat_messages',
    'moderator:read:chatters',
    'chat:read',
    'chat:edit'
].join(' ');

// DOM Elements
const loadingState = document.getElementById('loadingState');
const loggedOutState = document.getElementById('loggedOutState');
const loggedInState = document.getElementById('loggedInState');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

// User elements
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userChannelCount = document.getElementById('userChannelCount');
const channelsList = document.getElementById('channelsList');
const chatStatus = document.getElementById('chatStatus');

// Stats
const statBans = document.getElementById('statBans');
const statTimeouts = document.getElementById('statTimeouts');
const statDeletes = document.getElementById('statDeletes');

/**
 * Initialize popup
 */
async function init() {
    showState('loading');

    try {
        // Check if we have a valid token
        const data = await chrome.storage.local.get(['twitch_token', 'twitch_user', 'mod_stats', 'mod_channels']);

        if (data.twitch_token && data.twitch_user) {
            // Verify token is still valid
            const isValid = await verifyToken(data.twitch_token);

            if (isValid) {
                displayUserInfo(data.twitch_user, data.mod_channels || [], data.mod_stats || {});
                showState('loggedIn');

                // Refresh moderated channels in background
                refreshModeratedChannels(data.twitch_token, data.twitch_user.id);
            } else {
                // Token expired, need to re-authenticate
                await chrome.storage.local.remove(['twitch_token', 'twitch_user']);
                showState('loggedOut');
            }
        } else {
            showState('loggedOut');
        }
    } catch (error) {
        console.error('[Popup] Init error:', error);
        showState('loggedOut');
    }
}

/**
 * Show specific state
 */
function showState(state) {
    loadingState.classList.add('hidden');
    loggedOutState.classList.add('hidden');
    loggedInState.classList.add('hidden');

    switch (state) {
        case 'loading':
            loadingState.classList.remove('hidden');
            break;
        case 'loggedOut':
            loggedOutState.classList.remove('hidden');
            break;
        case 'loggedIn':
            loggedInState.classList.remove('hidden');
            break;
    }
}

/**
 * Verify Twitch token
 */
async function verifyToken(token) {
    try {
        const response = await fetch('https://id.twitch.tv/oauth2/validate', {
            headers: {
                'Authorization': `OAuth ${token}`
            }
        });
        return response.ok;
    } catch (error) {
        console.error('[Popup] Token validation error:', error);
        return false;
    }
}

/**
 * Display user info
 */
function displayUserInfo(user, channels, stats) {
    userAvatar.src = user.profile_image_url || 'icons/icon48.png';
    userName.textContent = user.display_name || user.login;

    const modChannelCount = channels.filter(c => c.role === 'moderator' || c.role === 'broadcaster').length;
    userChannelCount.textContent = `Moderator v ${modChannelCount} kanalech`;

    // Display stats
    statBans.textContent = stats.bans || 0;
    statTimeouts.textContent = stats.timeouts || 0;
    statDeletes.textContent = stats.deletes || 0;

    // Display channels
    displayChannels(channels);
}

/**
 * Display moderated channels
 */
function displayChannels(channels) {
    if (!channels || channels.length === 0) {
        channelsList.innerHTML = `
            <div class="channel-item">
                <span class="channel-name">Zadne kanaly</span>
            </div>
        `;
        return;
    }

    channelsList.innerHTML = channels.map(channel => `
        <div class="channel-item">
            <span class="channel-name">
                <span>#${channel.broadcaster_login || channel.name}</span>
            </span>
            <span class="channel-role ${channel.role}">${getRoleName(channel.role)}</span>
        </div>
    `).join('');
}

/**
 * Get Czech role name
 */
function getRoleName(role) {
    switch (role) {
        case 'broadcaster': return 'Vlastnik';
        case 'moderator': return 'Moderator';
        case 'vip': return 'VIP';
        default: return role;
    }
}

/**
 * Initiate Twitch OAuth login
 */
async function login() {
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> Prihlasovani...';

    try {
        // Build OAuth URL
        const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
        authUrl.searchParams.set('client_id', TWITCH_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', TWITCH_REDIRECT_URI);
        authUrl.searchParams.set('response_type', 'token');
        authUrl.searchParams.set('scope', TWITCH_SCOPES);
        authUrl.searchParams.set('force_verify', 'true');

        // Launch OAuth flow
        const redirectUrl = await chrome.identity.launchWebAuthFlow({
            url: authUrl.toString(),
            interactive: true
        });

        // Parse token from redirect URL
        const hashParams = new URLSearchParams(redirectUrl.split('#')[1]);
        const accessToken = hashParams.get('access_token');

        if (!accessToken) {
            throw new Error('No access token received');
        }

        // Get user info
        const userResponse = await fetch('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Client-ID': TWITCH_CLIENT_ID
            }
        });

        if (!userResponse.ok) {
            throw new Error('Failed to get user info');
        }

        const userData = await userResponse.json();
        const user = userData.data[0];

        // Save token and user
        await chrome.storage.local.set({
            twitch_token: accessToken,
            twitch_user: user,
            twitch_client_id: TWITCH_CLIENT_ID
        });

        // Notify background script
        chrome.runtime.sendMessage({ action: 'userLoggedIn', user });

        // Refresh moderated channels
        const channels = await refreshModeratedChannels(accessToken, user.id);

        // Display user info
        displayUserInfo(user, channels, {});
        showState('loggedIn');

    } catch (error) {
        console.error('[Popup] Login error:', error);
        alert('Prihlaseni selhalo: ' + error.message);
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = `
            <svg class="twitch-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M4.5 0L0 4.5v15h5.25V24l4.5-4.5h3.5L22.5 12V0zm15.75 11.25l-3.25 3.25h-3.5l-2.88 2.88V14.5h-4V2.25h13.63z"/>
            </svg>
            Prihlasit se pres Twitch
        `;
    }
}

/**
 * Refresh list of moderated channels
 */
async function refreshModeratedChannels(token, userId) {
    try {
        // Get channels where user is moderator
        const response = await fetch(`https://api.twitch.tv/helix/moderation/channels?user_id=${userId}&first=100`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Client-ID': TWITCH_CLIENT_ID
            }
        });

        if (!response.ok) {
            console.warn('[Popup] Failed to get moderated channels');
            return [];
        }

        const data = await response.json();
        const channels = data.data.map(ch => ({
            broadcaster_id: ch.broadcaster_id,
            broadcaster_login: ch.broadcaster_login,
            broadcaster_name: ch.broadcaster_name,
            role: 'moderator'
        }));

        // Add own channel as broadcaster
        const userData = await chrome.storage.local.get('twitch_user');
        if (userData.twitch_user) {
            channels.unshift({
                broadcaster_id: userData.twitch_user.id,
                broadcaster_login: userData.twitch_user.login,
                broadcaster_name: userData.twitch_user.display_name,
                role: 'broadcaster'
            });
        }

        // Save channels
        await chrome.storage.local.set({ mod_channels: channels });

        // Update display
        displayChannels(channels);

        return channels;
    } catch (error) {
        console.error('[Popup] Error fetching moderated channels:', error);
        return [];
    }
}

/**
 * Logout
 */
async function logout() {
    try {
        // Revoke token
        const data = await chrome.storage.local.get('twitch_token');
        if (data.twitch_token) {
            await fetch(`https://id.twitch.tv/oauth2/revoke?client_id=${TWITCH_CLIENT_ID}&token=${data.twitch_token}`, {
                method: 'POST'
            });
        }
    } catch (error) {
        console.error('[Popup] Revoke error:', error);
    }

    // Clear storage
    await chrome.storage.local.remove(['twitch_token', 'twitch_user', 'mod_channels']);

    // Notify background
    chrome.runtime.sendMessage({ action: 'userLoggedOut' });

    showState('loggedOut');
}

/**
 * Check Multistream Chat connection
 */
async function checkChatConnection() {
    try {
        const tabs = await chrome.tabs.query({ url: '*://deerpfy.github.io/adhub/*' });

        if (tabs.length > 0) {
            chatStatus.innerHTML = `
                <span class="status-dot connected"></span>
                Pripojeno
            `;
        } else {
            chatStatus.innerHTML = `
                <span class="status-dot disconnected"></span>
                Neni otevreno
            `;
        }
    } catch (error) {
        chatStatus.innerHTML = `
            <span class="status-dot error"></span>
            Chyba
        `;
    }
}

// Event listeners
loginBtn.addEventListener('click', login);
logoutBtn.addEventListener('click', logout);

// Initialize
init();
checkChatConnection();

// Listen for storage changes (stats updates from content script)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.mod_stats) {
        const stats = changes.mod_stats.newValue || {};
        statBans.textContent = stats.bans || 0;
        statTimeouts.textContent = stats.timeouts || 0;
        statDeletes.textContent = stats.deletes || 0;
    }
});
