/**
 * AdHub Multistream Chat Extension - Bridge Script
 * Version 2.0.0
 *
 * This script runs on AdHub pages and provides:
 * - Extension presence detection
 * - YouTube Chat Reader interface (relay messages from YouTube Live Chat)
 * - Twitch Moderator interface (manage chat popups for mod commands)
 *
 * No OAuth required - uses existing user sessions.
 */

(function() {
  'use strict';

  const VERSION = '2.1.0';
  const MARKER = '__ADHUB_EXTENSION_BRIDGE__';

  // Prevent double injection
  if (window[MARKER]) {
    console.log('[AdHub Extension Bridge] Already injected');
    return;
  }
  window[MARKER] = VERSION;

  console.log(`[AdHub Extension Bridge] Loaded v${VERSION}`);

  // Get extension info from manifest
  const manifest = chrome.runtime.getManifest();
  const extensionInfo = {
    id: chrome.runtime.id,
    version: manifest.version,
    name: manifest.name,
  };

  // ============================================================================
  // STATE
  // ============================================================================

  // Twitch open channels cache
  let openTwitchChannels = [];

  // ============================================================================
  // EXTENSION PRESENCE NOTIFICATION
  // ============================================================================

  function sendExtensionInfo() {
    // Method 1: Custom event
    window.dispatchEvent(new CustomEvent('adhub-extension-ready', {
      detail: extensionInfo,
    }));

    // Legacy events for backwards compatibility
    window.dispatchEvent(new CustomEvent('adhub-chat-reader-ready', {
      detail: extensionInfo,
    }));
    window.dispatchEvent(new CustomEvent('adhub-mod-extension-ready', {
      detail: { version: VERSION },
    }));

    // Method 2: Data attributes on <html>
    document.documentElement.setAttribute('data-adhub-extension', 'true');
    document.documentElement.setAttribute('data-adhub-extension-version', extensionInfo.version);
    // Legacy attributes
    document.documentElement.setAttribute('data-adhub-chat-reader', 'true');
    document.documentElement.setAttribute('data-adhub-chat-reader-version', extensionInfo.version);
    document.documentElement.dataset.adhubModExtension = VERSION;

    // Method 3: Global variables
    window.adhubExtensionAvailable = true;
    window.adhubExtensionVersion = extensionInfo.version;
    // Legacy globals
    window.adhubChatReaderAvailable = true;
    window.adhubChatReaderVersion = extensionInfo.version;

    // Method 4: localStorage (for persistence)
    try {
      localStorage.setItem('adhub_extension_active', 'true');
      localStorage.setItem('adhub_extension_version', extensionInfo.version);
      localStorage.setItem('adhub_extension_timestamp', Date.now().toString());
      // Legacy keys
      localStorage.setItem('adhub_chat_reader_active', 'true');
      localStorage.setItem('adhub_chat_reader_version', extensionInfo.version);
      localStorage.setItem('adhub_chat_reader_timestamp', Date.now().toString());
      localStorage.setItem('adhub_mod_extension_version', VERSION);
      localStorage.setItem('adhub_mod_extension_active', 'true');
    } catch (e) {
      console.warn('[AdHub Extension Bridge] Cannot write to localStorage:', e);
    }

    console.log('[AdHub Extension Bridge] Extension info sent to page');
  }

  // Send info immediately
  sendExtensionInfo();

  // Send again after DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sendExtensionInfo);
  }

  // Periodically update timestamp
  setInterval(() => {
    try {
      localStorage.setItem('adhub_extension_timestamp', Date.now().toString());
      localStorage.setItem('adhub_chat_reader_timestamp', Date.now().toString());
    } catch (e) {}
  }, 30000);

  // ============================================================================
  // YOUTUBE CHAT READER - PAGE COMMUNICATION
  // ============================================================================

  // Listen for check requests
  window.addEventListener('adhub-chat-reader-check', () => {
    console.log('[AdHub Extension Bridge] Received YouTube check request');
    window.dispatchEvent(new CustomEvent('adhub-chat-reader-response', {
      detail: extensionInfo,
    }));
  });

  // Listen for commands from page (YouTube)
  window.addEventListener('adhub-chat-reader-command', async (event) => {
    const { action, data, requestId } = event.detail || {};

    console.log('[AdHub Extension Bridge] Received YouTube command:', action, data);

    try {
      let response;

      switch (action) {
        case 'openYouTubeChat':
          response = await chrome.runtime.sendMessage({
            action: 'openYouTubeChat',
            videoId: data.videoId,
            channelName: data.channelName,
          });
          break;

        case 'closeYouTubeChat':
          response = await chrome.runtime.sendMessage({
            action: 'closeYouTubeChat',
            videoId: data.videoId,
          });
          break;

        case 'getActiveSessions':
          response = await chrome.runtime.sendMessage({
            action: 'getActiveSessions',
          });
          break;

        case 'ping':
          response = await chrome.runtime.sendMessage({
            action: 'ping',
          });
          break;

        default:
          response = { error: 'Unknown action' };
      }

      // Send response back to page
      window.dispatchEvent(new CustomEvent('adhub-chat-reader-response', {
        detail: {
          requestId,
          success: true,
          data: response,
        },
      }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('adhub-chat-reader-response', {
        detail: {
          requestId,
          success: false,
          error: error.message,
        },
      }));
    }
  });

  // ============================================================================
  // TWITCH MODERATOR - FUNCTIONS
  // ============================================================================

  /**
   * Refresh list of open Twitch channels
   */
  async function refreshOpenTwitchChannels() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getChatPopups' });
      openTwitchChannels = (response.popups || []).filter(p => p.ready).map(p => p.channel);

      // Update localStorage
      localStorage.setItem('adhub_mod_open_channels', JSON.stringify(openTwitchChannels));

      // Dispatch event for app
      document.dispatchEvent(new CustomEvent('adhub-mod-channels-changed', {
        detail: { channels: openTwitchChannels }
      }));

      return openTwitchChannels;
    } catch (error) {
      console.error('[AdHub Extension Bridge] Error getting Twitch channels:', error);
      return [];
    }
  }

  /**
   * Open Twitch chat popup for channel
   */
  async function openTwitchChat(channel) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'openChatPopup',
        channel: channel
      });

      if (response.success) {
        // Wait for ready state
        await new Promise(resolve => setTimeout(resolve, 2000));
        await refreshOpenTwitchChannels();
      }

      return response;
    } catch (error) {
      console.error('[AdHub Extension Bridge] Error opening Twitch chat:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Close Twitch chat popup
   */
  async function closeTwitchChat(channel) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'closeChatPopup',
        channel: channel
      });

      await refreshOpenTwitchChannels();
      return response;
    } catch (error) {
      console.error('[AdHub Extension Bridge] Error closing Twitch chat:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if Twitch chat is open for channel
   */
  function isTwitchChatOpen(channel) {
    return openTwitchChannels.includes(channel?.toLowerCase());
  }

  /**
   * Perform Twitch mod action
   */
  async function performModAction(channel, action, data) {
    const normalizedChannel = channel?.toLowerCase();

    // Check if chat is open
    if (!isTwitchChatOpen(normalizedChannel)) {
      // Try to open chat
      const openResult = await openTwitchChat(normalizedChannel);
      if (!openResult.success) {
        return { success: false, error: 'Chat neni otevreny a nelze ho otevrit' };
      }
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'sendModAction',
        channel: normalizedChannel,
        action: action,
        data: data
      });

      return response;
    } catch (error) {
      console.error('[AdHub Extension Bridge] Mod action error:', error);
      return { success: false, error: error.message };
    }
  }

  // Saved Twitch username for self-detection
  let savedTwitchUsername = null;

  /**
   * Load saved Twitch username from storage
   */
  async function loadTwitchUsername() {
    try {
      const data = await chrome.storage.local.get('twitch_username');
      savedTwitchUsername = data.twitch_username || null;

      // Notify the app about the username
      if (savedTwitchUsername) {
        window.dispatchEvent(new CustomEvent('adhub-user-identified', {
          detail: { login: savedTwitchUsername, displayName: savedTwitchUsername }
        }));
      }

      return savedTwitchUsername;
    } catch (e) {
      console.warn('[AdHub Extension Bridge] Error loading username:', e);
      return null;
    }
  }

  // Load username on init
  loadTwitchUsername();

  // Listen for username changes from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'username-changed') {
      savedTwitchUsername = request.username;
      window.dispatchEvent(new CustomEvent('adhub-user-identified', {
        detail: { login: savedTwitchUsername, displayName: savedTwitchUsername }
      }));
    }
    return false;
  });

  // Expose Twitch Mod API for Multistream Chat
  window.AdHubModExtension = {
    version: VERSION,
    getOpenChannels: () => openTwitchChannels,
    isChatOpen: isTwitchChatOpen,
    openChat: openTwitchChat,
    closeChat: closeTwitchChat,
    performAction: performModAction,
    refresh: refreshOpenTwitchChannels,
    getCurrentUser: () => savedTwitchUsername ? { login: savedTwitchUsername, displayName: savedTwitchUsername } : null,

    // Helper methods for individual actions
    ban: (channel, username, reason) => performModAction(channel, 'ban', { username, reason }),
    timeout: (channel, username, duration, reason) => performModAction(channel, 'timeout', { username, duration, reason }),
    delete: (channel, messageId) => performModAction(channel, 'delete', { messageId }),
    unban: (channel, username) => performModAction(channel, 'unban', { username })
  };

  // ============================================================================
  // TWITCH MODERATOR - PAGE COMMUNICATION
  // ============================================================================

  // Listen for requests from app (postMessage)
  window.addEventListener('message', async (event) => {
    // Only from our page
    if (event.source !== window) return;
    if (!event.data || event.data.source !== 'adhub-chat') return;

    const { type, payload, requestId } = event.data;

    let response = { requestId };

    switch (type) {
      case 'check-mod-extension':
        response.available = true;
        response.version = VERSION;
        response.openChannels = openTwitchChannels;
        break;

      case 'get-open-channels':
        response.data = await refreshOpenTwitchChannels();
        break;

      case 'open-chat':
        response.data = await openTwitchChat(payload.channel);
        break;

      case 'close-chat':
        response.data = await closeTwitchChat(payload.channel);
        break;

      case 'is-chat-open':
        response.data = { isOpen: isTwitchChatOpen(payload.channel) };
        break;

      case 'perform-mod-action':
        response.data = await performModAction(
          payload.channel,
          payload.action,
          payload.data
        );
        break;

      default:
        response.error = 'Unknown request type';
    }

    // Send response back
    window.postMessage({
      source: 'adhub-mod-extension',
      ...response
    }, '*');
  });

  // ============================================================================
  // BACKGROUND SCRIPT MESSAGE RELAY
  // ============================================================================

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[AdHub Extension Bridge] Received from background:', request.type);

    switch (request.type) {
      // YouTube messages
      case 'youtube-chat-message':
        window.dispatchEvent(new CustomEvent('adhub-youtube-chat-message', {
          detail: request.message,
        }));
        break;

      case 'youtube-chat-connected':
        window.dispatchEvent(new CustomEvent('adhub-youtube-chat-connected', {
          detail: { videoId: request.videoId, channelName: request.channelName },
        }));
        break;

      case 'youtube-chat-disconnected':
        window.dispatchEvent(new CustomEvent('adhub-youtube-chat-disconnected', {
          detail: { videoId: request.videoId },
        }));
        break;
    }

    sendResponse({ received: true });
    return false;
  });

  // Listen for storage changes (Twitch channels)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.mod_channels) {
      console.log('[AdHub Extension Bridge] Twitch channels changed, refreshing...');
      refreshOpenTwitchChannels();
    }
  });

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  // Initial refresh of Twitch channels
  refreshOpenTwitchChannels();

  // Periodic refresh (every 30 seconds)
  setInterval(refreshOpenTwitchChannels, 30 * 1000);

})();
