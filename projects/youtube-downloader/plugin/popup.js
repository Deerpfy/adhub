/**
 * AdHub Youtube Downloader - Popup Script
 * Verze: 2.0.0
 *
 * Tento skript obsluhuje popup okno pluginu.
 * Kazdy krok je logovany pro snadne debugovani.
 *
 * DULEZITE: Zadne cykly, zadne intervaly, zadne memory leaky!
 */

(function() {
  'use strict';

  // ============================================================================
  // DEBUG LOGGER
  // ============================================================================

  const DEBUG = true;
  const PREFIX = '[AdHub YT Popup]';

  function log(step, message, data = null) {
    if (!DEBUG) return;
    const timestamp = new Date().toLocaleTimeString();
    if (data) {
      console.log(`${PREFIX} [${timestamp}] [${step}]`, message, data);
    } else {
      console.log(`${PREFIX} [${timestamp}] [${step}]`, message);
    }
  }

  function logError(step, message, error = null) {
    const timestamp = new Date().toLocaleTimeString();
    if (error) {
      console.error(`${PREFIX} [${timestamp}] [${step}]`, message, error);
    } else {
      console.error(`${PREFIX} [${timestamp}] [${step}]`, message);
    }
  }

  // ============================================================================
  // DOM ELEMENTS
  // ============================================================================

  const elements = {
    version: document.getElementById('version'),
    videoInput: document.getElementById('videoInput'),
    fetchBtn: document.getElementById('fetchBtn'),
    loading: document.getElementById('loading'),
    videoInfo: document.getElementById('videoInfo'),
    thumbnail: document.getElementById('thumbnail'),
    videoTitle: document.getElementById('videoTitle'),
    videoAuthor: document.getElementById('videoAuthor'),
    error: document.getElementById('error'),
    formatsCombined: document.getElementById('formats-combined'),
    formatsVideo: document.getElementById('formats-video'),
    formatsAudio: document.getElementById('formats-audio'),
    tabs: document.querySelectorAll('.tab'),
    tabContents: document.querySelectorAll('.tab-content')
  };

  // ============================================================================
  // STATE
  // ============================================================================

  const state = {
    currentVideoId: null,
    videoTitle: '',
    formats: null
  };

  // ============================================================================
  // INIT
  // ============================================================================

  function init() {
    log('INIT', 'Zacinam inicializaci popup');

    // Krok 1: Nastaveni verze
    const manifest = chrome.runtime.getManifest();
    elements.version.textContent = `v${manifest.version}`;
    log('INIT', 'Krok 1: Verze nastavena', manifest.version);

    // Krok 2: Nastaveni event listeneru
    setupEventListeners();
    log('INIT', 'Krok 2: Event listenery nastaveny');

    // Krok 3: Kontrola aktualni tab
    checkCurrentTab();
    log('INIT', 'Krok 3: Kontrola aktualni tab spustena');

    log('INIT', 'Inicializace dokoncena');
  }

  // ============================================================================
  // SETUP EVENT LISTENERS
  // ============================================================================

  function setupEventListeners() {
    // Fetch tlacitko
    elements.fetchBtn.addEventListener('click', handleFetch);

    // Enter v inputu
    elements.videoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleFetch();
      }
    });

    // Taby
    elements.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        switchTab(tabId);
      });
    });
  }

  // ============================================================================
  // CHECK CURRENT TAB - Kontrola jestli je otevrena YouTube tab
  // ============================================================================

  async function checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab && tab.url) {
        const videoId = extractVideoId(tab.url);
        if (videoId) {
          log('TAB', `YouTube video detekovano: ${videoId}`);
          elements.videoInput.value = videoId;
          // Automaticky nacti video
          handleFetch();
        }
      }
    } catch (error) {
      logError('TAB', 'Chyba pri kontrole tab', error);
    }
  }

  // ============================================================================
  // EXTRACT VIDEO ID - Extrakce video ID z URL
  // ============================================================================

  function extractVideoId(input) {
    if (!input) return null;

    // Pokud je to uz video ID (11 znaku)
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
      if (shortsMatch) {
        return shortsMatch[1];
      }

      // youtube.com/embed/XXX
      const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]+)/);
      if (embedMatch) {
        return embedMatch[1];
      }

    } catch (e) {
      // Neni validni URL
    }

    return null;
  }

  // ============================================================================
  // HANDLE FETCH - Zpracovani nacitani videa
  // ============================================================================

  async function handleFetch() {
    const input = elements.videoInput.value.trim();

    if (!input) {
      showError('Zadejte YouTube URL nebo Video ID');
      return;
    }

    const videoId = extractVideoId(input);
    if (!videoId) {
      showError('Neplatna YouTube URL nebo Video ID');
      return;
    }

    log('FETCH', `Zacinam nacitat video: ${videoId}`);

    // Reset stavu
    hideError();
    elements.videoInfo.classList.remove('visible');
    elements.loading.classList.add('visible');
    elements.fetchBtn.disabled = true;

    try {
      // Krok 1: Ziskani informaci o videu
      log('FETCH', 'Krok 1: Ziskavam info o videu');
      const videoInfo = await sendMessage({
        action: 'getVideoInfo',
        videoId: videoId
      });

      if (!videoInfo.success) {
        throw new Error(videoInfo.error || 'Nelze ziskat informace o videu');
      }

      log('FETCH', 'Krok 2: Info ziskano', videoInfo);

      // Krok 2: Ziskani formatu
      log('FETCH', 'Krok 3: Ziskavam formaty');
      const formatsResult = await sendMessage({
        action: 'getDownloadLinks',
        videoId: videoId
      });

      if (!formatsResult.success) {
        throw new Error(formatsResult.error || 'Nelze ziskat formaty');
      }

      log('FETCH', 'Krok 4: Formaty ziskany', formatsResult);

      // Krok 3: Ulozeni stavu
      state.currentVideoId = videoId;
      state.videoTitle = videoInfo.title;
      state.formats = formatsResult.formats;

      // Krok 4: Zobrazeni dat
      displayVideoInfo(videoInfo);
      displayFormats(formatsResult.formats);

      elements.loading.classList.remove('visible');
      elements.videoInfo.classList.add('visible');

      log('FETCH', 'Nacitani dokonceno');

    } catch (error) {
      logError('FETCH', 'Chyba pri nacitani', error);
      showError(error.message);
      elements.loading.classList.remove('visible');
    } finally {
      elements.fetchBtn.disabled = false;
    }
  }

  // ============================================================================
  // DISPLAY VIDEO INFO - Zobrazeni informaci o videu
  // ============================================================================

  function displayVideoInfo(info) {
    elements.thumbnail.src = info.thumbnail;
    elements.thumbnail.onerror = () => {
      elements.thumbnail.src = info.thumbnailMedium;
    };
    elements.videoTitle.textContent = info.title;
    elements.videoAuthor.textContent = info.author;
  }

  // ============================================================================
  // DISPLAY FORMATS - Zobrazeni formatu
  // ============================================================================

  function displayFormats(formats) {
    // Combined formaty
    const combined = [...(formats.combined?.mp4 || []), ...(formats.combined?.webm || [])];
    elements.formatsCombined.innerHTML = combined.length > 0
      ? combined.map(f => createFormatButton(f, 'combined')).join('')
      : '<div class="empty-state"><div class="empty-state-icon">📹</div>Zadne kombinovane formaty</div>';

    // Video formaty
    const video = [...(formats.video?.mp4 || []), ...(formats.video?.webm || [])];
    elements.formatsVideo.innerHTML = video.length > 0
      ? video.slice(0, 8).map(f => createFormatButton(f, 'video')).join('')
      : '<div class="empty-state"><div class="empty-state-icon">🎬</div>Zadne video formaty</div>';

    // Audio formaty
    const audio = [...(formats.audio?.m4a || []), ...(formats.audio?.webm || [])];
    elements.formatsAudio.innerHTML = audio.length > 0
      ? audio.slice(0, 6).map(f => createFormatButton(f, 'audio')).join('')
      : '<div class="empty-state"><div class="empty-state-icon">🎵</div>Zadne audio formaty</div>';

    // Nastaveni event listeneru pro format tlacitka
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', () => handleDownload(btn));
    });
  }

  // ============================================================================
  // CREATE FORMAT BUTTON - Vytvoreni HTML pro format tlacitko
  // ============================================================================

  function createFormatButton(format, type) {
    const quality = format.quality || format.audioQuality || 'Neznama';
    const container = format.container.toUpperCase();
    const codec = format.codec.split('.')[0];
    const size = format.fileSize ? formatFileSize(format.fileSize) : '-';

    // Sanitizace nazvu souboru
    const safeTitle = state.videoTitle
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);

    const extension = format.container;
    const filename = `${safeTitle}_${quality}.${extension}`;

    return `
      <button class="format-btn ${type}"
              data-url="${escapeHtml(format.url)}"
              data-filename="${escapeHtml(filename)}"
              data-itag="${format.itag}">
        <div class="format-info">
          <span class="format-quality">${quality}</span>
          <span class="format-codec">${container} / ${codec}</span>
        </div>
        <span class="format-size">${size}</span>
      </button>
    `;
  }

  // ============================================================================
  // HANDLE DOWNLOAD - Zpracovani stahovani
  // ============================================================================

  async function handleDownload(btn) {
    if (btn.classList.contains('downloading')) return;

    const url = btn.dataset.url;
    const filename = btn.dataset.filename;
    const itag = btn.dataset.itag;

    log('DOWNLOAD', `Zacinam stahovani: ${itag}`);

    btn.classList.add('downloading');
    const originalText = btn.querySelector('.format-quality').textContent;
    btn.querySelector('.format-quality').textContent = 'Stahuji...';

    try {
      const result = await sendMessage({
        action: 'downloadVideo',
        url: url,
        filename: filename,
        videoId: state.currentVideoId,
        itag: itag
      });

      if (result.success) {
        log('DOWNLOAD', 'Stahovani uspesne');
        btn.classList.remove('downloading');
        btn.classList.add('success');
        btn.querySelector('.format-quality').textContent = 'Stazeno!';
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      logError('DOWNLOAD', 'Chyba pri stahovani', error);
      btn.classList.remove('downloading');
      btn.classList.add('error');
      btn.querySelector('.format-quality').textContent = 'Chyba!';
    }
  }

  // ============================================================================
  // SWITCH TAB - Prepnuti tabu
  // ============================================================================

  function switchTab(tabId) {
    log('TAB', `Prepinani na tab: ${tabId}`);

    elements.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    elements.tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
  }

  // ============================================================================
  // SEND MESSAGE - Odeslani zpravy do background
  // ============================================================================

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      log('MESSAGE', 'Odesilam zpravu', message);

      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          logError('MESSAGE', 'Chyba', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        log('MESSAGE', 'Odpoved prijata', response);
        resolve(response);
      });
    });
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  function showError(message) {
    elements.error.textContent = message;
    elements.error.classList.add('visible');
  }

  function hideError() {
    elements.error.classList.remove('visible');
  }

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '-';

    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================================================
  // START
  // ============================================================================

  document.addEventListener('DOMContentLoaded', init);

})();
