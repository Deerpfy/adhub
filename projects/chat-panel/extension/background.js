/**
 * AdHub YouTube Chat Reader - Background Service Worker
 *
 * Relay zprav mezi content scripty a AdHub strankama.
 * Spravuje aktivni chat sessions.
 */

console.log('[AdHub Chat Reader] Background service worker started');

// ============================================================================
// STAV
// ============================================================================

const state = {
  activeSessions: new Map(), // videoId -> { tabId, windowId, channelName, startTime }
  connectedPorts: new Set(), // Ports from AdHub pages
  messageQueue: [], // Fronta zprav pro pripadne odpojene prijemce
  backgroundWindowId: null, // ID skrytého okna pro chat taby
};

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[AdHub Chat Reader] Received message:', request.action, 'from:', sender.tab?.id || 'extension');

  switch (request.action) {
    // Od content scriptu (YouTube chat)
    case 'chatMessage':
      handleChatMessage(request.message, sender);
      sendResponse({ received: true });
      break;

    case 'chatConnected':
      handleChatConnected(request.videoId, request.channelName, sender);
      sendResponse({ success: true });
      break;

    // Od AdHub stranky
    case 'openYouTubeChat':
      openYouTubeChat(request.videoId, request.channelName)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true; // Async response

    case 'closeYouTubeChat':
      closeYouTubeChat(request.videoId)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'getActiveSessions':
      sendResponse({
        sessions: Array.from(state.activeSessions.entries()).map(([videoId, data]) => ({
          videoId,
          channelName: data.channelName,
          startTime: data.startTime,
        })),
      });
      break;

    case 'ping':
      sendResponse({ pong: true, version: chrome.runtime.getManifest().version });
      break;

    case 'getVersion':
      sendResponse({ version: chrome.runtime.getManifest().version });
      break;

    default:
      sendResponse({ error: 'Unknown action' });
  }

  return false;
});

// ============================================================================
// CHAT MESSAGE RELAY
// ============================================================================

function handleChatMessage(message, sender) {
  // Broadcast zpravy na vsechny AdHub stranky
  broadcastToAdHub({
    type: 'youtube-chat-message',
    message: message,
  });
}

async function handleChatConnected(videoId, channelName, sender) {
  console.log('[AdHub Chat Reader] Chat connected:', videoId, 'channel:', channelName);

  // Pokud nemáme název kanálu, získat ho z oEmbed API
  let finalChannelName = channelName;
  if (!finalChannelName) {
    finalChannelName = await fetchChannelNameFromOEmbed(videoId);
  }

  if (sender.tab) {
    state.activeSessions.set(videoId, {
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

/**
 * Získá název kanálu z YouTube oEmbed API
 */
async function fetchChannelNameFromOEmbed(videoId) {
  if (!videoId) return null;

  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (response.ok) {
      const data = await response.json();
      if (data.author_name) {
        console.log('[AdHub Chat Reader] Got channel name from oEmbed:', data.author_name);
        return data.author_name;
      }
    }
  } catch (error) {
    console.log('[AdHub Chat Reader] Failed to fetch from oEmbed:', error);
  }
  return null;
}

function broadcastToAdHub(data) {
  // Posli vsem pripojenym AdHub strankam
  chrome.tabs.query({ url: ['https://deerpfy.github.io/adhub/*'] }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, data).catch(() => {
        // Tab uz neexistuje nebo neni pripraven
      });
    });
  });
}

// ============================================================================
// OTEVIRANI YOUTUBE CHATU
// ============================================================================

async function openYouTubeChat(videoId, channelName) {
  console.log('[AdHub Chat Reader] Opening YouTube chat for:', videoId);

  // Zkontroluj jestli uz neni otevreny
  if (state.activeSessions.has(videoId)) {
    const session = state.activeSessions.get(videoId);
    // Zkontroluj jestli tab jeste existuje
    try {
      await chrome.tabs.get(session.tabId);
      console.log('[AdHub Chat Reader] Chat already open in tab:', session.tabId);
      return { success: true, tabId: session.tabId, alreadyOpen: true };
    } catch (e) {
      // Tab uz neexistuje, odstran session
      state.activeSessions.delete(videoId);
    }
  }

  const chatUrl = `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=deerpfy.github.io`;

  try {
    let tabId;
    let windowId = state.backgroundWindowId;

    // Zkontroluj jestli background okno jeste existuje
    if (windowId) {
      try {
        await chrome.windows.get(windowId);
      } catch (e) {
        windowId = null;
        state.backgroundWindowId = null;
      }
    }

    if (windowId) {
      // Pouzij existujici minimalizovane okno
      const tab = await chrome.tabs.create({
        url: chatUrl,
        windowId: windowId,
        active: false,
      });
      tabId = tab.id;
    } else {
      // Vytvor nove okno primo s chat URL
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

      // Minimalizuj okno OKAMZITE
      chrome.windows.update(windowId, { state: 'minimized' });
      console.log('[AdHub Chat Reader] Created minimized background window:', windowId);
    }

    state.activeSessions.set(videoId, {
      tabId: tabId,
      windowId: windowId,
      channelName: channelName || '',
      startTime: Date.now(),
    });

    console.log('[AdHub Chat Reader] Opened chat in background tab:', tabId);
    return { success: true, tabId: tabId };
  } catch (error) {
    console.error('[AdHub Chat Reader] Error opening chat:', error);
    return { success: false, error: error.message };
  }
}

async function closeYouTubeChat(videoId) {
  console.log('[AdHub Chat Reader] Closing YouTube chat for:', videoId);

  const session = state.activeSessions.get(videoId);
  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  try {
    await chrome.tabs.remove(session.tabId);
    state.activeSessions.delete(videoId);
    return { success: true };
  } catch (error) {
    // Tab uz mozna neexistuje
    state.activeSessions.delete(videoId);
    return { success: true, note: 'Tab was already closed' };
  }
}

// ============================================================================
// TAB CLEANUP
// ============================================================================

chrome.tabs.onRemoved.addListener((tabId) => {
  // Odstran session pokud byl tab zavren
  for (const [videoId, session] of state.activeSessions) {
    if (session.tabId === tabId) {
      state.activeSessions.delete(videoId);
      console.log('[AdHub Chat Reader] Removed session for closed tab:', videoId);

      // Informuj AdHub stranky
      broadcastToAdHub({
        type: 'youtube-chat-disconnected',
        videoId: videoId,
      });
      break;
    }
  }
});

// Sleduj zavreni background okna
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === state.backgroundWindowId) {
    console.log('[AdHub Chat Reader] Background window was closed');
    state.backgroundWindowId = null;

    // Oznac vsechny sessions jako odpojene
    for (const [videoId, session] of state.activeSessions) {
      broadcastToAdHub({
        type: 'youtube-chat-disconnected',
        videoId: videoId,
      });
    }
    state.activeSessions.clear();
  }
});
