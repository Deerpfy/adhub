/**
 * AdHub YouTube Chat Reader - Content Script
 *
 * Tento skript bezi na YouTube Live Chat strankach a extrahuje zpravy.
 * Zpravy jsou odesilany do background scriptu, ktery je predava do chat-panel.
 */

(function() {
  'use strict';

  // Zabranit vicenasobnemu spusteni
  if (window.__ADHUB_YT_CHAT_READER__) return;
  window.__ADHUB_YT_CHAT_READER__ = true;

  console.log('[AdHub Chat Reader] Content script loaded on:', window.location.href);

  // ============================================================================
  // STAV
  // ============================================================================

  const state = {
    isActive: false,
    videoId: null,
    channelName: null,
    processedMessageIds: new Set(),
    observer: null,
    lastCheck: 0,
  };

  // ============================================================================
  // EXTRAKCE VIDEO ID
  // ============================================================================

  function getVideoIdFromUrl() {
    const url = new URL(window.location.href);
    return url.searchParams.get('v');
  }

  /**
   * Získá název kanálu z YouTube oEmbed API (primární a nejspolehlivější metoda)
   */
  async function fetchChannelNameFromOEmbed() {
    if (!state.videoId) return null;

    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${state.videoId}&format=json`);
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

  /**
   * Načte a aktualizuje název kanálu
   */
  async function loadChannelName() {
    if (!state.videoId) return;

    // Použít oEmbed API jako primární zdroj (spolehlivé)
    const channelName = await fetchChannelNameFromOEmbed();

    if (channelName) {
      state.channelName = channelName;
      chrome.runtime.sendMessage({
        action: 'chatConnected',
        videoId: state.videoId,
        channelName: channelName,
      }).catch(() => {});
    }
  }

  // ============================================================================
  // PARSOVANI ZPRAV
  // ============================================================================

  function parseMessage(messageElement) {
    try {
      // Ziskej unikatni ID zpravy
      const messageId = messageElement.id ||
                        messageElement.getAttribute('id') ||
                        `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Preskoc pokud jsme tuto zpravu uz zpracovali
      if (state.processedMessageIds.has(messageId)) {
        return null;
      }

      // Autor
      const authorElement = messageElement.querySelector('#author-name');
      const authorName = authorElement?.textContent?.trim() || 'Unknown';

      // Barva autora (pokud je k dispozici)
      const authorColor = authorElement?.style?.color || '#ffffff';

      // Badge autora (owner, moderator, member)
      const badges = [];
      const badgeElements = messageElement.querySelectorAll('#chat-badges img, yt-live-chat-author-badge-renderer img');
      badgeElements.forEach(badge => {
        const title = badge.getAttribute('alt') || badge.getAttribute('aria-label') || '';
        const url = badge.src;
        if (title || url) {
          badges.push({ title, url });
        }
      });

      // Role autora
      const roles = {
        broadcaster: messageElement.querySelector('[type="owner"]') !== null,
        moderator: messageElement.querySelector('[type="moderator"]') !== null,
        member: messageElement.querySelector('[type="member"]') !== null,
        verified: messageElement.querySelector('[type="verified"]') !== null,
      };

      // Obsah zpravy
      const messageContent = messageElement.querySelector('#message');
      let content = '';
      const emotes = [];

      if (messageContent) {
        // Projdi vsechny child nodes
        let textIndex = 0;
        messageContent.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            content += node.textContent;
            textIndex += node.textContent.length;
          } else if (node.nodeName === 'IMG') {
            // Emote
            const emoteName = node.alt || node.getAttribute('aria-label') || ':emote:';
            const emoteUrl = node.src;
            const start = content.length;
            content += emoteName;
            emotes.push({
              name: emoteName,
              url: emoteUrl,
              start: start,
              end: content.length - 1,
            });
          } else if (node.nodeName === 'A') {
            content += node.textContent;
          } else if (node.nodeName === 'SPAN') {
            content += node.textContent;
          }
        });
      }

      // Timestamp
      const timestampElement = messageElement.querySelector('#timestamp');
      const timestamp = timestampElement?.textContent?.trim() || null;

      // Oznac jako zpracovanou
      state.processedMessageIds.add(messageId);

      // Omez velikost setu (pamet)
      if (state.processedMessageIds.size > 5000) {
        const idsArray = Array.from(state.processedMessageIds);
        state.processedMessageIds = new Set(idsArray.slice(-2500));
      }

      return {
        id: messageId,
        platform: 'youtube',
        author: {
          id: authorName.toLowerCase().replace(/\s+/g, '_'),
          displayName: authorName,
          color: authorColor,
          badges: badges,
          roles: roles,
        },
        content: content.trim(),
        emotes: emotes,
        timestamp: new Date(),
        rawTimestamp: timestamp,
        videoId: state.videoId,
        channelName: state.channelName,
      };
    } catch (error) {
      console.error('[AdHub Chat Reader] Error parsing message:', error);
      return null;
    }
  }

  // ============================================================================
  // SLEDOVANI CHATU
  // ============================================================================

  function startObserving() {
    if (state.observer) {
      console.log('[AdHub Chat Reader] Observer already running');
      return;
    }

    // Najdi chat kontejner
    const chatContainer = document.querySelector('#items.yt-live-chat-item-list-renderer') ||
                          document.querySelector('#item-list #items') ||
                          document.querySelector('yt-live-chat-item-list-renderer #items');

    if (!chatContainer) {
      console.log('[AdHub Chat Reader] Chat container not found, retrying...');
      setTimeout(startObserving, 1000);
      return;
    }

    console.log('[AdHub Chat Reader] Found chat container, starting observer');

    // Zpracuj existujici zpravy
    const existingMessages = chatContainer.querySelectorAll('yt-live-chat-text-message-renderer');
    console.log('[AdHub Chat Reader] Found', existingMessages.length, 'existing messages');

    existingMessages.forEach(el => {
      const message = parseMessage(el);
      if (message) {
        sendMessage(message);
      }
    });

    // Sleduj nove zpravy
    state.observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Zpracuj primo pridany element
            if (node.tagName === 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER') {
              const message = parseMessage(node);
              if (message) {
                sendMessage(message);
              }
            }

            // Nebo najdi zpravy uvnitr pridaneho elementu
            const messages = node.querySelectorAll?.('yt-live-chat-text-message-renderer');
            messages?.forEach(el => {
              const message = parseMessage(el);
              if (message) {
                sendMessage(message);
              }
            });
          }
        });
      });
    });

    state.observer.observe(chatContainer, {
      childList: true,
      subtree: true,
    });

    state.isActive = true;
    console.log('[AdHub Chat Reader] Observer started for video:', state.videoId);

    // Informuj background script (bez názvu kanálu - pošleme později)
    chrome.runtime.sendMessage({
      action: 'chatConnected',
      videoId: state.videoId,
      channelName: null,
    });

    // Načti název kanálu z oEmbed API (spolehlivé)
    loadChannelName();
  }

  function stopObserving() {
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
      state.isActive = false;
      console.log('[AdHub Chat Reader] Observer stopped');
    }
  }

  // ============================================================================
  // KOMUNIKACE S BACKGROUND
  // ============================================================================

  function sendMessage(message) {
    chrome.runtime.sendMessage({
      action: 'chatMessage',
      message: message,
    }).catch(err => {
      // Ignoruj chyby kdyz neni prijemce
    });
  }

  // Poslouchej prikazy z background scriptu
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[AdHub Chat Reader] Received message:', request);

    switch (request.action) {
      case 'startReading':
        state.videoId = request.videoId || getVideoIdFromUrl();
        state.channelName = request.channelName || '';
        startObserving();
        sendResponse({ success: true, videoId: state.videoId });
        break;

      case 'stopReading':
        stopObserving();
        sendResponse({ success: true });
        break;

      case 'getStatus':
        sendResponse({
          isActive: state.isActive,
          videoId: state.videoId,
          processedCount: state.processedMessageIds.size,
        });
        break;

      case 'ping':
        sendResponse({ pong: true, isActive: state.isActive });
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }

    return true; // Async response
  });

  // ============================================================================
  // INICIALIZACE
  // ============================================================================

  function init() {
    state.videoId = getVideoIdFromUrl();
    console.log('[AdHub Chat Reader] Initialized for video:', state.videoId);

    // Automaticky zacni sledovat chat
    // Pockej na nacteni stranky
    if (document.readyState === 'complete') {
      setTimeout(startObserving, 1000);
    } else {
      window.addEventListener('load', () => setTimeout(startObserving, 1000));
    }
  }

  init();

})();
