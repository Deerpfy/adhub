/**
 * AdHub Multistream Chat Extension - Background Service Worker
 * Version 2.0.0
 *
 * Unified extension combining:
 * - YouTube Chat Reader: Relay messages from YouTube Live Chat to AdHub
 * - Twitch Moderator: Manage Twitch chat popups for moderation commands
 *
 * No OAuth required - uses existing user sessions.
 */

const VERSION = '2.0.0';

console.log(`[AdHub Extension] Background service worker started v${VERSION}`);

// ============================================================================
// STATE
// ============================================================================

const state = {
  // YouTube
  youtubeSessions: new Map(), // videoId -> { tabId, windowId, channelName, startTime }
  backgroundWindowId: null, // ID skrytého okna pro YouTube chat taby

  // Twitch
  twitchPopups: new Map(), // channel -> { tabId, windowId, ready }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`[AdHub Extension] Installed v${VERSION}`, details.reason);

  // Initialize Twitch mod stats
  const data = await chrome.storage.local.get('mod_stats');
  if (!data.mod_stats) {
    await chrome.storage.local.set({
      mod_stats: { bans: 0, timeouts: 0, deletes: 0 }
    });
  }
});

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[AdHub Extension] Message:', request.action, 'from:', sender.tab?.id || 'extension');

  switch (request.action) {
    // ========== YOUTUBE ==========
    case 'chatMessage':
      handleYouTubeChatMessage(request.message, sender);
      sendResponse({ received: true });
      break;

    case 'chatConnected':
      handleYouTubeChatConnected(request.videoId, request.channelName, sender);
      sendResponse({ success: true });
      break;

    case 'openYouTubeChat':
      openYouTubeChat(request.videoId, request.channelName)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'closeYouTubeChat':
      closeYouTubeChat(request.videoId)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'getActiveSessions':
      sendResponse({
        sessions: Array.from(state.youtubeSessions.entries()).map(([videoId, data]) => ({
          videoId,
          channelName: data.channelName,
          startTime: data.startTime,
        })),
      });
      break;

    // ========== TWITCH ==========
    case 'openChatPopup':
      handleOpenTwitchPopup(request.channel, sendResponse);
      return true;

    case 'closeChatPopup':
      handleCloseTwitchPopup(request.channel, sendResponse);
      return true;

    case 'getChatPopups':
      sendResponse({
        popups: Array.from(state.twitchPopups.entries()).map(([channel, data]) => ({
          channel,
          ready: data.ready
        }))
      });
      return false;

    case 'sendModAction':
      handleSendModAction(request, sendResponse);
      return true;

    case 'getStats':
      chrome.storage.local.get('mod_stats', (data) => {
        sendResponse({ stats: data.mod_stats || { bans: 0, timeouts: 0, deletes: 0 } });
      });
      return true;

    case 'chatInjectorReady':
      // Twitch chat injector reports ready
      const channel = request.channel?.toLowerCase();
      if (channel && state.twitchPopups.has(channel)) {
        state.twitchPopups.get(channel).ready = true;
        updateTwitchChannelStatus(channel, true);
        console.log(`[AdHub Extension] Twitch chat injector ready: ${channel}`);
      }
      sendResponse({ ok: true });
      return false;

    // ========== GENERAL ==========
    case 'ping':
      sendResponse({ pong: true, version: VERSION });
      break;

    case 'getVersion':
      sendResponse({ version: VERSION });
      break;

    default:
      sendResponse({ error: 'Unknown action' });
  }

  return false;
});

// ============================================================================
// YOUTUBE CHAT HANDLING
// ============================================================================

function handleYouTubeChatMessage(message, sender) {
  broadcastToAdHub({
    type: 'youtube-chat-message',
    message: message,
  });
}

async function handleYouTubeChatConnected(videoId, channelName, sender) {
  console.log('[AdHub Extension] YouTube chat connected:', videoId, 'channel:', channelName);

  let finalChannelName = channelName;
  if (!finalChannelName) {
    finalChannelName = await fetchChannelNameFromOEmbed(videoId);
  }

  if (sender.tab) {
    state.youtubeSessions.set(videoId, {
      tabId: sender.tab.id,
      channelName: finalChannelName || '',
      startTime: Date.now(),
    });
  }

  broadcastToAdHub({
    type: 'youtube-chat-connected',
    videoId: videoId,
    channelName: finalChannelName || '',
  });
}

async function fetchChannelNameFromOEmbed(videoId) {
  if (!videoId) return null;

  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (response.ok) {
      const data = await response.json();
      if (data.author_name) {
        console.log('[AdHub Extension] Got channel name from oEmbed:', data.author_name);
        return data.author_name;
      }
    }
  } catch (error) {
    console.log('[AdHub Extension] Failed to fetch from oEmbed:', error);
  }
  return null;
}

function broadcastToAdHub(data) {
  chrome.tabs.query({ url: ['https://deerpfy.github.io/adhub/*'] }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, data).catch(() => {
        // Tab doesn't exist or isn't ready
      });
    });
  });
}

async function openYouTubeChat(videoId, channelName) {
  console.log('[AdHub Extension] Opening YouTube chat for:', videoId);

  if (state.youtubeSessions.has(videoId)) {
    const session = state.youtubeSessions.get(videoId);
    try {
      await chrome.tabs.get(session.tabId);
      console.log('[AdHub Extension] YouTube chat already open in tab:', session.tabId);
      return { success: true, tabId: session.tabId, alreadyOpen: true };
    } catch (e) {
      state.youtubeSessions.delete(videoId);
    }
  }

  const chatUrl = `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=deerpfy.github.io`;

  try {
    let tabId;
    let windowId = state.backgroundWindowId;

    if (windowId) {
      try {
        await chrome.windows.get(windowId);
      } catch (e) {
        windowId = null;
        state.backgroundWindowId = null;
      }
    }

    if (windowId) {
      const tab = await chrome.tabs.create({
        url: chatUrl,
        windowId: windowId,
        active: false,
      });
      tabId = tab.id;
    } else {
      const newWindow = await chrome.windows.create({
        url: chatUrl,
        type: 'popup',
        width: 400,
        height: 300,
        focused: false,
      });

      windowId = newWindow.id;
      state.backgroundWindowId = windowId;
      tabId = newWindow.tabs[0].id;

      chrome.windows.update(windowId, { state: 'minimized' });
      console.log('[AdHub Extension] Created minimized background window:', windowId);
    }

    state.youtubeSessions.set(videoId, {
      tabId: tabId,
      windowId: windowId,
      channelName: channelName || '',
      startTime: Date.now(),
    });

    console.log('[AdHub Extension] Opened YouTube chat in background tab:', tabId);
    return { success: true, tabId: tabId };
  } catch (error) {
    console.error('[AdHub Extension] Error opening YouTube chat:', error);
    return { success: false, error: error.message };
  }
}

async function closeYouTubeChat(videoId) {
  console.log('[AdHub Extension] Closing YouTube chat for:', videoId);

  const session = state.youtubeSessions.get(videoId);
  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  try {
    await chrome.tabs.remove(session.tabId);
    state.youtubeSessions.delete(videoId);
    return { success: true };
  } catch (error) {
    state.youtubeSessions.delete(videoId);
    return { success: true, note: 'Tab was already closed' };
  }
}

// ============================================================================
// TWITCH CHAT HANDLING
// ============================================================================

async function handleOpenTwitchPopup(channel, sendResponse) {
  const normalizedChannel = channel.toLowerCase();

  if (state.twitchPopups.has(normalizedChannel)) {
    const existing = state.twitchPopups.get(normalizedChannel);

    try {
      await chrome.tabs.get(existing.tabId);
      await chrome.windows.update(existing.windowId, { focused: true });
      sendResponse({ success: true, alreadyOpen: true });
      return;
    } catch {
      state.twitchPopups.delete(normalizedChannel);
    }
  }

  try {
    const popupUrl = `https://www.twitch.tv/popout/${normalizedChannel}/chat?popout=`;

    const window = await chrome.windows.create({
      url: popupUrl,
      type: 'popup',
      width: 340,
      height: 600,
      focused: true
    });

    state.twitchPopups.set(normalizedChannel, {
      tabId: window.tabs[0].id,
      windowId: window.id,
      ready: false
    });

    console.log(`[AdHub Extension] Twitch chat popup opened: ${normalizedChannel}`);
    sendResponse({ success: true, tabId: window.tabs[0].id });

  } catch (error) {
    console.error('[AdHub Extension] Error opening Twitch popup:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleCloseTwitchPopup(channel, sendResponse) {
  const normalizedChannel = channel.toLowerCase();

  if (!state.twitchPopups.has(normalizedChannel)) {
    sendResponse({ success: false, error: 'Popup not found' });
    return;
  }

  try {
    const popup = state.twitchPopups.get(normalizedChannel);
    await chrome.windows.remove(popup.windowId);
    state.twitchPopups.delete(normalizedChannel);
    updateTwitchChannelStatus(normalizedChannel, false);
    sendResponse({ success: true });
  } catch (error) {
    state.twitchPopups.delete(normalizedChannel);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSendModAction(message, sendResponse) {
  const { channel, action, data } = message;
  const normalizedChannel = channel.toLowerCase();

  if (!state.twitchPopups.has(normalizedChannel)) {
    sendResponse({ success: false, error: 'Chat popup not open for this channel' });
    return;
  }

  const popup = state.twitchPopups.get(normalizedChannel);

  if (!popup.ready) {
    sendResponse({ success: false, error: 'Chat popup not ready' });
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(popup.tabId, {
      action: 'mod-action',
      type: action,
      data: data
    });

    if (response.success) {
      await updateModStats(action);
    }

    sendResponse(response);
  } catch (error) {
    console.error('[AdHub Extension] Error sending mod action:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function updateTwitchChannelStatus(channel, isOpen) {
  try {
    const data = await chrome.storage.local.get('mod_channels');
    const channels = data.mod_channels || {};

    if (isOpen) {
      channels[channel] = { ready: true, timestamp: Date.now() };
    } else {
      delete channels[channel];
    }

    await chrome.storage.local.set({ mod_channels: channels });
  } catch (error) {
    console.error('[AdHub Extension] Error updating channel status:', error);
  }
}

async function updateModStats(action) {
  try {
    const data = await chrome.storage.local.get('mod_stats');
    const stats = data.mod_stats || { bans: 0, timeouts: 0, deletes: 0 };

    switch (action) {
      case 'ban':
        stats.bans = (stats.bans || 0) + 1;
        break;
      case 'timeout':
        stats.timeouts = (stats.timeouts || 0) + 1;
        break;
      case 'delete':
        stats.deletes = (stats.deletes || 0) + 1;
        break;
    }

    await chrome.storage.local.set({ mod_stats: stats });
  } catch (error) {
    console.error('[AdHub Extension] Stats update error:', error);
  }
}

// ============================================================================
// TAB CLEANUP
// ============================================================================

chrome.tabs.onRemoved.addListener((tabId) => {
  // YouTube sessions
  for (const [videoId, session] of state.youtubeSessions) {
    if (session.tabId === tabId) {
      state.youtubeSessions.delete(videoId);
      console.log('[AdHub Extension] Removed YouTube session for closed tab:', videoId);

      broadcastToAdHub({
        type: 'youtube-chat-disconnected',
        videoId: videoId,
      });
      break;
    }
  }

  // Twitch popups
  for (const [channel, popup] of state.twitchPopups) {
    if (popup.tabId === tabId) {
      state.twitchPopups.delete(channel);
      console.log(`[AdHub Extension] Twitch chat popup closed: ${channel}`);
      updateTwitchChannelStatus(channel, false);
      break;
    }
  }
});

chrome.windows.onRemoved.addListener((windowId) => {
  // YouTube background window
  if (windowId === state.backgroundWindowId) {
    console.log('[AdHub Extension] YouTube background window was closed');
    state.backgroundWindowId = null;

    for (const [videoId, session] of state.youtubeSessions) {
      broadcastToAdHub({
        type: 'youtube-chat-disconnected',
        videoId: videoId,
      });
    }
    state.youtubeSessions.clear();
  }
});

// ============================================================================
// EXTERNAL COMMUNICATION (from AdHub website)
// ============================================================================

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  // Only from adhub domain
  if (!sender.origin || !sender.origin.includes('deerpfy.github.io')) {
    sendResponse({ error: 'Unauthorized origin' });
    return false;
  }

  switch (message.action) {
    case 'ping':
      sendResponse({ pong: true, version: VERSION });
      return false;

    case 'getOpenChannels':
      sendResponse({
        channels: Array.from(state.twitchPopups.entries())
          .filter(([_, data]) => data.ready)
          .map(([channel]) => channel)
      });
      return false;

    case 'openChat':
      handleOpenTwitchPopup(message.channel, sendResponse);
      return true;

    case 'closeChat':
      handleCloseTwitchPopup(message.channel, sendResponse);
      return true;

    case 'modAction':
      handleSendModAction({
        channel: message.channel,
        action: message.type,
        data: message.data
      }, sendResponse);
      return true;

    default:
      sendResponse({ error: 'Unknown action' });
      return false;
  }
});
