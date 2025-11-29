/**
 * AdHub YouTube Downloader v4.0 - Popup Script
 */

(function() {
  'use strict';

  // ============================================================================
  // DOM ELEMENTS
  // ============================================================================

  const elements = {
    version: document.getElementById('version'),
    statusSection: document.getElementById('statusSection'),
    videoInput: document.getElementById('videoInput'),
    goBtn: document.getElementById('goBtn'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    videoCard: document.getElementById('videoCard'),
    thumbnail: document.getElementById('thumbnail'),
    videoTitle: document.getElementById('videoTitle'),
    videoAuthor: document.getElementById('videoAuthor')
  };

  // ============================================================================
  // INIT
  // ============================================================================

  async function init() {
    console.log('[Popup] Inicializace');

    // Nastavení verze
    const manifest = chrome.runtime.getManifest();
    if (elements.version) {
      elements.version.textContent = `v${manifest.version}`;
    }

    // Event listeners
    if (elements.goBtn) {
      elements.goBtn.addEventListener('click', handleGo);
    }

    if (elements.videoInput) {
      elements.videoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGo();
      });
    }

    // Kontrola stavu
    await checkStatus();

    // Zkontrolovat aktuální tab
    checkCurrentTab();
  }

  // ============================================================================
  // CHECK STATUS
  // ============================================================================

  async function checkStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'ping' });

      if (response?.success) {
        updateStatus(true, 'Plugin aktivní - Přímé stahování povoleno');
      } else {
        updateStatus(false, 'Plugin není aktivní');
      }
    } catch (error) {
      console.error('[Popup] Chyba při kontrole stavu:', error);
      updateStatus(false, 'Chyba komunikace s pluginem');
    }
  }

  function updateStatus(isActive, text) {
    if (!elements.statusSection) return;

    const statusText = elements.statusSection.querySelector('.status-text');
    if (statusText) {
      statusText.innerHTML = `<strong>${text}</strong>`;
    }

    if (isActive) {
      elements.statusSection.classList.remove('error');
    } else {
      elements.statusSection.classList.add('error');
    }
  }

  // ============================================================================
  // CHECK CURRENT TAB
  // ============================================================================

  async function checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab?.url && isYouTubeUrl(tab.url)) {
        const videoId = extractVideoId(tab.url);
        if (videoId) {
          elements.videoInput.value = tab.url;
          loadVideoInfo(videoId);
        }
      }
    } catch (e) {
      console.log('[Popup] Nelze zkontrolovat aktuální tab:', e);
    }
  }

  // ============================================================================
  // HANDLE GO BUTTON
  // ============================================================================

  async function handleGo() {
    const input = elements.videoInput.value.trim();

    if (!input) {
      showError('Zadejte YouTube URL');
      return;
    }

    hideError();

    // Pokud je to YouTube URL, otevřít stránku
    if (isYouTubeUrl(input)) {
      chrome.tabs.create({ url: input });
      window.close();
      return;
    }

    // Pokud je to video ID, vytvořit URL
    if (isVideoId(input)) {
      chrome.tabs.create({ url: `https://www.youtube.com/watch?v=${input}` });
      window.close();
      return;
    }

    showError('Neplatná YouTube URL nebo Video ID');
  }

  // ============================================================================
  // LOAD VIDEO INFO
  // ============================================================================

  async function loadVideoInfo(videoId) {
    elements.loading.classList.add('visible');
    elements.videoCard.classList.remove('visible');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getVideoInfo',
        videoId: videoId
      });

      if (response?.success) {
        elements.thumbnail.src = response.thumbnail;
        elements.thumbnail.onerror = () => {
          elements.thumbnail.src = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
        };
        elements.videoTitle.textContent = response.title || 'Neznámý název';
        elements.videoAuthor.textContent = response.author || '';

        elements.videoCard.classList.add('visible');
      }
    } catch (error) {
      console.error('[Popup] Chyba při načítání info:', error);
    } finally {
      elements.loading.classList.remove('visible');
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  function isYouTubeUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('youtube.com') || urlObj.hostname === 'youtu.be';
    } catch (e) {
      return false;
    }
  }

  function isVideoId(str) {
    return /^[a-zA-Z0-9_-]{11}$/.test(str);
  }

  function extractVideoId(url) {
    try {
      const urlObj = new URL(url);

      if (urlObj.searchParams.has('v')) {
        return urlObj.searchParams.get('v');
      }

      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.substring(1);
      }

      const shortsMatch = urlObj.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) return shortsMatch[1];

    } catch (e) {}
    return null;
  }

  function showError(message) {
    elements.error.textContent = message;
    elements.error.classList.add('visible');
  }

  function hideError() {
    elements.error.classList.remove('visible');
  }

  // ============================================================================
  // START
  // ============================================================================

  document.addEventListener('DOMContentLoaded', init);

})();
