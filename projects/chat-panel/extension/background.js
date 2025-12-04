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
  backgroundWindowId: null, // ID skryteho okna pro vsechny chaty
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
      handleChatConnected(request.videoId, sender);
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

function handleChatConnected(videoId, sender) {
  if (sender.tab) {
    state.activeSessions.set(videoId, {
      tabId: sender.tab.id,
      channelName: '',
      startTime: Date.now(),
    });
  }

  broadcastToAdHub({
    type: 'youtube-chat-connected',
    videoId: videoId,
  });
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

/**
 * Ziskani nebo vytvoreni skryteho okna pro chat taby
 */
async function getOrCreateBackgroundWindow() {
  // Zkontroluj jestli okno jeste existuje
  if (state.backgroundWindowId) {
    try {
      await chrome.windows.get(state.backgroundWindowId);
      return state.backgroundWindowId;
    } catch (e) {
      // Okno uz neexistuje
      state.backgroundWindowId = null;
    }
  }

  // Vytvor nove minimalizovane okno
  const window = await chrome.windows.create({
    url: 'about:blank',
    type: 'popup',
    width: 400,
    height: 600,
    left: -2000, // Posun mimo obrazovku
    top: 0,
  });

  // Minimalizuj okno po vytvoreni
  try {
    await chrome.windows.update(window.id, { state: 'minimized' });
  } catch (e) {
    console.warn('[AdHub Chat Reader] Could not minimize window:', e);
  }

  state.backgroundWindowId = window.id;
  console.log('[AdHub Chat Reader] Created background window:', window.id);

  // Zavri prazdny tab
  if (window.tabs && window.tabs[0]) {
    await chrome.tabs.remove(window.tabs[0].id).catch(() => {});
  }

  return window.id;
}

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

  // Ziskej nebo vytvor skryte okno
  const windowId = await getOrCreateBackgroundWindow();

  // Otevri novy tab s chatem ve skrytem okne
  const chatUrl = `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=deerpfy.github.io`;

  try {
    const tab = await chrome.tabs.create({
      url: chatUrl,
      windowId: windowId,
      active: false,
    });

    state.activeSessions.set(videoId, {
      tabId: tab.id,
      windowId: windowId,
      channelName: channelName || '',
      startTime: Date.now(),
    });

    console.log('[AdHub Chat Reader] Opened chat in background tab:', tab.id);
    return { success: true, tabId: tab.id, windowId: windowId };
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

    // Zavri background okno pokud je prazdne
    await cleanupBackgroundWindowIfEmpty();

    return { success: true };
  } catch (error) {
    // Tab uz mozna neexistuje
    state.activeSessions.delete(videoId);
    await cleanupBackgroundWindowIfEmpty();
    return { success: true, note: 'Tab was already closed' };
  }
}

// ============================================================================
// TAB & WINDOW CLEANUP
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

  // Pokud nezbyly zadne sessions, zavri background okno
  cleanupBackgroundWindowIfEmpty();
});

chrome.windows.onRemoved.addListener((windowId) => {
  // Pokud bylo zavreno background okno, vymaz vsechny sessions z neho
  if (windowId === state.backgroundWindowId) {
    console.log('[AdHub Chat Reader] Background window closed');
    state.backgroundWindowId = null;

    // Oznac vsechny sessions jako odpojene
    for (const [videoId, session] of state.activeSessions) {
      if (session.windowId === windowId) {
        state.activeSessions.delete(videoId);
        broadcastToAdHub({
          type: 'youtube-chat-disconnected',
          videoId: videoId,
        });
      }
    }
  }
});

/**
 * Zavre background okno pokud neobsahuje zadne aktivni sessions
 */
async function cleanupBackgroundWindowIfEmpty() {
  if (!state.backgroundWindowId) return;

  // Zkontroluj jestli jsou nejake aktivni sessions
  let hasActiveSessions = false;
  for (const [, session] of state.activeSessions) {
    if (session.windowId === state.backgroundWindowId) {
      hasActiveSessions = true;
      break;
    }
  }

  if (!hasActiveSessions) {
    try {
      await chrome.windows.remove(state.backgroundWindowId);
      console.log('[AdHub Chat Reader] Closed empty background window');
    } catch (e) {
      // Okno uz mozna neexistuje
    }
    state.backgroundWindowId = null;
  }
}
