/**
 * AdHub Youtube Downloader - Popup Script v3.0
 *
 * Jednoduchý a upřímný popup:
 * 1. Načte info o videu (metadata)
 * 2. Nabídne stažení přes Cobalt.tools
 * 3. Vysvětlí proč přímé stahování nefunguje
 */

(function() {
  'use strict';

  // ============================================================================
  // DOM ELEMENTS
  // ============================================================================

  const elements = {
    version: document.getElementById('version'),
    videoInput: document.getElementById('videoInput'),
    fetchBtn: document.getElementById('fetchBtn'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    videoCard: document.getElementById('videoCard'),
    thumbnail: document.getElementById('thumbnail'),
    videoTitle: document.getElementById('videoTitle'),
    videoAuthor: document.getElementById('videoAuthor'),
    cobaltBtn: document.getElementById('cobaltBtn'),
    copyUrlBtn: document.getElementById('copyUrlBtn'),
    techToggle: document.getElementById('techToggle'),
    techContent: document.getElementById('techContent')
  };

  // ============================================================================
  // STATE
  // ============================================================================

  const state = {
    currentVideoId: null,
    videoTitle: ''
  };

  // ============================================================================
  // INIT
  // ============================================================================

  function init() {
    console.log('[Popup] Inicializace');

    // Nastavení verze
    const manifest = chrome.runtime.getManifest();
    elements.version.textContent = `v${manifest.version}`;

    // Event listeners
    elements.fetchBtn.addEventListener('click', handleFetch);
    elements.videoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleFetch();
    });

    elements.cobaltBtn.addEventListener('click', handleCobaltClick);
    elements.copyUrlBtn.addEventListener('click', handleCopyUrl);
    elements.techToggle.addEventListener('click', toggleTechInfo);

    // Automaticky načíst pokud jsme na YouTube
    checkCurrentTab();
  }

  // ============================================================================
  // CHECK CURRENT TAB
  // ============================================================================

  async function checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const videoId = extractVideoId(tab.url);
        if (videoId) {
          elements.videoInput.value = videoId;
          handleFetch();
        }
      }
    } catch (e) {
      console.log('[Popup] Nelze zkontrolovat aktuální tab:', e);
    }
  }

  // ============================================================================
  // EXTRACT VIDEO ID
  // ============================================================================

  function extractVideoId(input) {
    if (!input) return null;

    // Přímo Video ID (11 znaků)
    if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) {
      return input.trim();
    }

    try {
      const url = new URL(input);

      // youtube.com/watch?v=XXX
      if (url.hostname.includes('youtube.com') && url.pathname === '/watch') {
        return url.searchParams.get('v');
      }

      // youtu.be/XXX
      if (url.hostname === 'youtu.be') {
        return url.pathname.substring(1);
      }

      // youtube.com/shorts/XXX
      const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) return shortsMatch[1];

      // youtube.com/embed/XXX
      const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]+)/);
      if (embedMatch) return embedMatch[1];

    } catch (e) {}

    return null;
  }

  // ============================================================================
  // HANDLE FETCH
  // ============================================================================

  async function handleFetch() {
    const input = elements.videoInput.value.trim();

    if (!input) {
      showError('Zadejte YouTube URL nebo Video ID');
      return;
    }

    const videoId = extractVideoId(input);
    if (!videoId) {
      showError('Neplatná YouTube URL nebo Video ID');
      return;
    }

    console.log('[Popup] Načítám video:', videoId);

    hideError();
    elements.videoCard.classList.remove('visible');
    elements.loading.classList.add('visible');
    elements.fetchBtn.disabled = true;

    try {
      // Získat info o videu přes background script
      const response = await sendMessage({
        action: 'getVideoInfo',
        videoId: videoId
      });

      if (!response.success) {
        throw new Error(response.error || 'Nelze získat informace o videu');
      }

      // Uložit stav
      state.currentVideoId = videoId;
      state.videoTitle = response.title;

      // Zobrazit info
      elements.thumbnail.src = response.thumbnail;
      elements.thumbnail.onerror = () => {
        elements.thumbnail.src = response.thumbnailMedium || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      };
      elements.videoTitle.textContent = response.title;
      elements.videoAuthor.textContent = response.author;

      elements.loading.classList.remove('visible');
      elements.videoCard.classList.add('visible');

    } catch (error) {
      console.error('[Popup] Chyba:', error);
      showError(error.message);
      elements.loading.classList.remove('visible');
    } finally {
      elements.fetchBtn.disabled = false;
    }
  }

  // ============================================================================
  // HANDLE COBALT CLICK
  // ============================================================================

  function handleCobaltClick() {
    if (!state.currentVideoId) return;

    const youtubeUrl = `https://www.youtube.com/watch?v=${state.currentVideoId}`;
    const cobaltUrl = `https://cobalt.tools/?url=${encodeURIComponent(youtubeUrl)}`;

    console.log('[Popup] Otevírám Cobalt:', cobaltUrl);
    chrome.tabs.create({ url: cobaltUrl });
  }

  // ============================================================================
  // HANDLE COPY URL
  // ============================================================================

  async function handleCopyUrl() {
    if (!state.currentVideoId) return;

    const url = `https://www.youtube.com/watch?v=${state.currentVideoId}`;

    try {
      await navigator.clipboard.writeText(url);

      // Změnit text tlačítka
      const btnText = elements.copyUrlBtn.querySelector('span:last-child');
      const originalText = btnText.textContent;
      btnText.textContent = '✓ Zkopírováno!';

      setTimeout(() => {
        btnText.textContent = originalText;
      }, 2000);

    } catch (e) {
      console.error('[Popup] Chyba při kopírování:', e);
    }
  }

  // ============================================================================
  // TOGGLE TECH INFO
  // ============================================================================

  function toggleTechInfo() {
    const isVisible = elements.techContent.classList.toggle('visible');
    const arrow = elements.techToggle.querySelector('span');
    arrow.textContent = isVisible ? '▼' : '▶';
  }

  // ============================================================================
  // SEND MESSAGE TO BACKGROUND
  // ============================================================================

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

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
