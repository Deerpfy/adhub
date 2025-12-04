/**
 * AdHub YouTube Chat Reader - Bridge Script
 *
 * Tento skript bezi na AdHub strankach a poskytuje:
 * - Informace o nainstalovane verzi extension
 * - Rozhrani pro komunikaci s background scriptem
 * - Relay zprav z YouTube chatu do stranky
 */

(function() {
  'use strict';

  // Zabranit vicenasobnemu spusteni
  if (window.__ADHUB_CHAT_READER_BRIDGE__) return;
  window.__ADHUB_CHAT_READER_BRIDGE__ = true;

  console.log('[AdHub Chat Reader Bridge] Loaded on AdHub website');

  // Ziskat informace o rozsireni z manifestu
  const manifest = chrome.runtime.getManifest();
  const extensionInfo = {
    id: chrome.runtime.id,
    version: manifest.version,
    name: manifest.name,
  };

  console.log('[AdHub Chat Reader Bridge] Extension info:', extensionInfo);

  // ============================================================================
  // OZNAMENI PRITOMNOSTI EXTENSION
  // ============================================================================

  function sendExtensionInfo() {
    // Metoda 1: Custom event
    window.dispatchEvent(new CustomEvent('adhub-chat-reader-ready', {
      detail: extensionInfo,
    }));

    // Metoda 2: Data attribute na <html>
    document.documentElement.setAttribute('data-adhub-chat-reader', 'true');
    document.documentElement.setAttribute('data-adhub-chat-reader-version', extensionInfo.version);

    // Metoda 3: Global promenna
    window.adhubChatReaderAvailable = true;
    window.adhubChatReaderVersion = extensionInfo.version;

    // Metoda 4: localStorage (pro perzistenci)
    try {
      localStorage.setItem('adhub_chat_reader_active', 'true');
      localStorage.setItem('adhub_chat_reader_version', extensionInfo.version);
      localStorage.setItem('adhub_chat_reader_timestamp', Date.now().toString());
    } catch (e) {
      console.warn('[AdHub Chat Reader Bridge] Cannot write to localStorage:', e);
    }

    console.log('[AdHub Chat Reader Bridge] Extension info sent to page');
  }

  // Poslat info hned po nacteni
  sendExtensionInfo();

  // Poslat znovu po DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sendExtensionInfo);
  }

  // Periodicky obnovovat timestamp
  setInterval(() => {
    try {
      localStorage.setItem('adhub_chat_reader_timestamp', Date.now().toString());
    } catch (e) {}
  }, 30000);

  // ============================================================================
  // KOMUNIKACE SE STRANKOU
  // ============================================================================

  // Naslouchat na dotazy od stranky
  window.addEventListener('adhub-chat-reader-check', () => {
    console.log('[AdHub Chat Reader Bridge] Received check request');
    window.dispatchEvent(new CustomEvent('adhub-chat-reader-response', {
      detail: extensionInfo,
    }));
  });

  // Naslouchat na prikazy od stranky
  window.addEventListener('adhub-chat-reader-command', async (event) => {
    const { action, data, requestId } = event.detail || {};

    console.log('[AdHub Chat Reader Bridge] Received command:', action, data);

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

      // Poslat odpoved zpet na stranku
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
  // RELAY ZPRAV Z BACKGROUND SCRIPTU NA STRANKU
  // ============================================================================

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[AdHub Chat Reader Bridge] Received from background:', request.type);

    switch (request.type) {
      case 'youtube-chat-message':
        // Poslat zpravu na stranku
        window.dispatchEvent(new CustomEvent('adhub-youtube-chat-message', {
          detail: request.message,
        }));
        break;

      case 'youtube-chat-connected':
        window.dispatchEvent(new CustomEvent('adhub-youtube-chat-connected', {
          detail: { videoId: request.videoId },
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

})();
