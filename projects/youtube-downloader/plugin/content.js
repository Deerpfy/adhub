/**
 * AdHub YouTube Downloader v4.0 - Content Script
 *
 * Běží přímo na YouTube stránce:
 * - Extrahuje video data z ytInitialPlayerResponse
 * - Injektuje tlačítko "Stáhnout" pod video
 * - Komunikuje s background scriptem pro stahování
 */

(function() {
  'use strict';

  // Spustit pouze v hlavním okně (ne v iframe)
  if (window.top !== window.self) {
    return;
  }

  // Prevence dvojité inicializace
  if (window.__ADHUB_YT_DOWNLOADER_LOADED__) return;
  window.__ADHUB_YT_DOWNLOADER_LOADED__ = true;

  console.log('[AdHub YT] Content script v4.0 načten');

  // ============================================================================
  // KONFIGURACE
  // ============================================================================

  const CONFIG = {
    DEBUG: true,
    BUTTON_CHECK_INTERVAL: 1000,
    MAX_RETRIES: 30,
    SELECTORS: {
      // Místa kam vložit tlačítko (v pořadí priority)
      buttonContainers: [
        '#top-level-buttons-computed',           // Nový YouTube layout
        'ytd-menu-renderer #top-level-buttons',  // Starší layout
        '#info-contents #menu',                  // Fallback
        '#actions',                              // Další fallback
      ],
      videoPlayer: '#movie_player',
      videoTitle: 'h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata',
      channelName: '#channel-name a, ytd-channel-name a',
    }
  };

  // ============================================================================
  // LOGGING
  // ============================================================================

  function log(...args) {
    if (CONFIG.DEBUG) console.log('[AdHub YT]', ...args);
  }

  function logError(...args) {
    console.error('[AdHub YT ERROR]', ...args);
  }

  // ============================================================================
  // STAV APLIKACE
  // ============================================================================

  const state = {
    currentVideoId: null,
    videoData: null,
    formats: [],
    buttonInjected: false,
    isDownloading: false,
    downloadProgress: 0,
    lastToggleTime: 0  // Pro debounce
  };

  // ============================================================================
  // EXTRAKCE VIDEO ID
  // ============================================================================

  function getVideoIdFromUrl(url = window.location.href) {
    try {
      const urlObj = new URL(url);

      // /watch?v=XXX
      if (urlObj.searchParams.has('v')) {
        return urlObj.searchParams.get('v');
      }

      // /shorts/XXX
      const shortsMatch = urlObj.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) return shortsMatch[1];

      // /embed/XXX
      const embedMatch = urlObj.pathname.match(/\/embed\/([a-zA-Z0-9_-]+)/);
      if (embedMatch) return embedMatch[1];

    } catch (e) {}
    return null;
  }

  // ============================================================================
  // EXTRAKCE PLAYER RESPONSE
  // ============================================================================

  function extractPlayerResponse() {
    // Metoda 1: Z globální proměnné
    if (window.ytInitialPlayerResponse) {
      log('Player response nalezen v window.ytInitialPlayerResponse');
      return window.ytInitialPlayerResponse;
    }

    // Metoda 2: Z ytplayer.config
    if (window.ytplayer?.config?.args?.player_response) {
      try {
        const parsed = JSON.parse(window.ytplayer.config.args.player_response);
        log('Player response nalezen v ytplayer.config');
        return parsed;
      } catch (e) {}
    }

    // Metoda 3: Ze script tagů v HTML
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent || '';

      // Hledáme ytInitialPlayerResponse
      const match = text.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          log('Player response extrahován ze script tagu');
          return parsed;
        } catch (e) {}
      }

      // Alternativní pattern
      const match2 = text.match(/var\s+ytInitialPlayerResponse\s*=\s*({.+?});/s);
      if (match2) {
        try {
          const parsed = JSON.parse(match2[1]);
          log('Player response extrahován (alternativní pattern)');
          return parsed;
        } catch (e) {}
      }
    }

    log('Player response nenalezen');
    return null;
  }

  // ============================================================================
  // PARSOVÁNÍ FORMÁTŮ
  // ============================================================================

  function parseFormats(playerResponse) {
    if (!playerResponse?.streamingData) {
      log('Žádná streamingData v player response');
      return [];
    }

    const { formats = [], adaptiveFormats = [] } = playerResponse.streamingData;
    const allFormats = [];

    // Progressive formáty (video + audio v jednom)
    for (const format of formats) {
      if (format.url || format.signatureCipher) {
        allFormats.push({
          itag: format.itag,
          quality: format.qualityLabel || format.quality,
          mimeType: format.mimeType,
          type: 'progressive',
          hasAudio: true,
          hasVideo: true,
          url: format.url,
          signatureCipher: format.signatureCipher,
          contentLength: format.contentLength,
          bitrate: format.bitrate,
          width: format.width,
          height: format.height,
          fps: format.fps
        });
      }
    }

    // Adaptive formáty (oddělené video/audio)
    for (const format of adaptiveFormats) {
      if (format.url || format.signatureCipher) {
        const isVideo = format.mimeType?.startsWith('video/');
        const isAudio = format.mimeType?.startsWith('audio/');

        allFormats.push({
          itag: format.itag,
          quality: format.qualityLabel || format.quality || (isAudio ? 'audio' : 'unknown'),
          mimeType: format.mimeType,
          type: 'adaptive',
          hasAudio: isAudio,
          hasVideo: isVideo,
          url: format.url,
          signatureCipher: format.signatureCipher,
          contentLength: format.contentLength,
          bitrate: format.bitrate,
          width: format.width,
          height: format.height,
          fps: format.fps,
          audioQuality: format.audioQuality
        });
      }
    }

    // Seřadit podle kvality
    allFormats.sort((a, b) => {
      const heightA = a.height || 0;
      const heightB = b.height || 0;
      return heightB - heightA;
    });

    log(`Nalezeno ${allFormats.length} formátů:`, allFormats.map(f => `${f.quality} (${f.type})`));
    return allFormats;
  }

  // ============================================================================
  // ZÍSKÁNÍ VIDEO DAT
  // ============================================================================

  async function getVideoData() {
    const videoId = getVideoIdFromUrl();
    if (!videoId) {
      log('Video ID nenalezeno');
      return null;
    }

    // Pokud máme cache pro stejné video, použít ji
    if (state.currentVideoId === videoId && state.videoData) {
      return state.videoData;
    }

    log('Získávám data pro video:', videoId);

    const playerResponse = extractPlayerResponse();
    if (!playerResponse) {
      logError('Nelze získat player response');
      return null;
    }

    const formats = parseFormats(playerResponse);
    const videoDetails = playerResponse.videoDetails || {};

    const data = {
      videoId: videoId,
      title: videoDetails.title || document.title.replace(' - YouTube', ''),
      author: videoDetails.author || 'Neznámý',
      lengthSeconds: parseInt(videoDetails.lengthSeconds) || 0,
      thumbnail: videoDetails.thumbnail?.thumbnails?.pop()?.url || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      formats: formats,
      progressiveFormats: formats.filter(f => f.type === 'progressive'),
      videoFormats: formats.filter(f => f.type === 'adaptive' && f.hasVideo),
      audioFormats: formats.filter(f => f.type === 'adaptive' && f.hasAudio),
    };

    state.currentVideoId = videoId;
    state.videoData = data;
    state.formats = formats;

    log('Video data:', data);
    return data;
  }

  // ============================================================================
  // UI - VYTVOŘENÍ TLAČÍTKA
  // ============================================================================

  function createDownloadButton() {
    const container = document.createElement('div');
    container.id = 'adhub-download-container';

    const wrapper = document.createElement('div');
    wrapper.className = 'adhub-download-wrapper';

    // Vytvořit tlačítko programaticky (ne přes innerHTML) pro lepší event handling
    const btn = document.createElement('button');
    btn.id = 'adhub-download-btn';
    btn.className = 'adhub-btn adhub-btn-primary';
    btn.title = 'Stáhnout video';
    btn.type = 'button';
    btn.innerHTML = `
      <svg class="adhub-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 2h14v2H5v-2z"/>
      </svg>
      <span class="adhub-btn-text">Stáhnout</span>
    `;

    // Přidat více event handlerů pro jistotu
    const handleClick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('[AdHub YT] *** BUTTON CLICKED ***');
      toggleDropdown();
      return false;
    };

    // Použít mousedown (spustí se dříve než click)
    btn.addEventListener('mousedown', handleClick, true);
    btn.addEventListener('click', handleClick, true);
    btn.onclick = handleClick;

    // Debug - ověřit že tlačítko existuje
    console.log('[AdHub YT] Tlačítko vytvořeno, handler přidán');

    const dropdown = document.createElement('div');
    dropdown.id = 'adhub-dropdown';
    dropdown.className = 'adhub-dropdown hidden';
    dropdown.innerHTML = `
      <div class="adhub-dropdown-header">
        <span>Vyberte kvalitu</span>
        <button id="adhub-dropdown-close" class="adhub-dropdown-close" type="button">&times;</button>
      </div>
      <div id="adhub-formats-list" class="adhub-formats-list">
        <div class="adhub-loading">Načítám formáty...</div>
      </div>
      <div id="adhub-progress-container" class="adhub-progress-container hidden">
        <div class="adhub-progress-text">Stahování: <span id="adhub-progress-percent">0%</span></div>
        <div class="adhub-progress-bar">
          <div id="adhub-progress-fill" class="adhub-progress-fill"></div>
        </div>
      </div>
    `;

    wrapper.appendChild(btn);
    wrapper.appendChild(dropdown);
    container.appendChild(wrapper);

    return container;
  }

  function toggleDropdown() {
    // Debounce - ignorovat opakované volání do 300ms
    const now = Date.now();
    if (now - state.lastToggleTime < 300) {
      log('Toggle ignorován (debounce)');
      return;
    }
    state.lastToggleTime = now;

    const dropdown = document.getElementById('adhub-dropdown');
    if (!dropdown) {
      logError('Dropdown nenalezen!');
      return;
    }

    if (dropdown.classList.contains('hidden')) {
      log('Otevírám dropdown...');
      showDropdown();
    } else {
      log('Zavírám dropdown...');
      hideDropdown();
    }
  }

  // ============================================================================
  // UI - RENDEROVÁNÍ FORMÁTŮ
  // ============================================================================

  function renderFormats(formats) {
    const list = document.getElementById('adhub-formats-list');
    if (!list) return;

    if (!formats || formats.length === 0) {
      list.innerHTML = '<div class="adhub-error">Žádné formáty k dispozici</div>';
      return;
    }

    // Filtrovat pouze progressive formáty (video + audio) pro jednoduchost
    const downloadableFormats = formats.filter(f => f.type === 'progressive' && f.url);

    // Přidat i nejlepší adaptive video + audio pro vyšší kvality
    const bestVideo = formats.find(f => f.type === 'adaptive' && f.hasVideo && f.url);
    const bestAudio = formats.find(f => f.type === 'adaptive' && f.hasAudio && f.url);

    let html = '';

    // Progressive formáty (jednoduché stažení)
    if (downloadableFormats.length > 0) {
      html += '<div class="adhub-format-group"><div class="adhub-format-group-title">Video + Audio</div>';

      for (const format of downloadableFormats) {
        const size = format.contentLength ? formatBytes(parseInt(format.contentLength)) : 'neznámá velikost';
        const fps = format.fps ? ` ${format.fps}fps` : '';

        html += `
          <button class="adhub-format-btn" data-itag="${format.itag}" data-type="progressive">
            <span class="adhub-format-quality">${format.quality}${fps}</span>
            <span class="adhub-format-info">${getFormatExtension(format.mimeType)} • ${size}</span>
          </button>
        `;
      }
      html += '</div>';
    }

    // Pokud máme adaptive formáty pro vyšší kvality
    const highQualityVideo = formats.filter(f =>
      f.type === 'adaptive' && f.hasVideo && f.url && (f.height >= 1080)
    );

    if (highQualityVideo.length > 0) {
      html += '<div class="adhub-format-group"><div class="adhub-format-group-title">Vysoká kvalita (pouze video)</div>';

      for (const format of highQualityVideo.slice(0, 3)) {
        const size = format.contentLength ? formatBytes(parseInt(format.contentLength)) : '';
        const fps = format.fps ? ` ${format.fps}fps` : '';

        html += `
          <button class="adhub-format-btn" data-itag="${format.itag}" data-type="adaptive-video">
            <span class="adhub-format-quality">${format.quality}${fps}</span>
            <span class="adhub-format-info">${getFormatExtension(format.mimeType)} • ${size} • bez zvuku</span>
          </button>
        `;
      }
      html += '</div>';
    }

    // Audio only
    const audioFormats = formats.filter(f =>
      f.type === 'adaptive' && f.hasAudio && f.url
    ).slice(0, 2);

    if (audioFormats.length > 0) {
      html += '<div class="adhub-format-group"><div class="adhub-format-group-title">Pouze audio</div>';

      for (const format of audioFormats) {
        const size = format.contentLength ? formatBytes(parseInt(format.contentLength)) : '';
        const quality = format.audioQuality || 'audio';

        html += `
          <button class="adhub-format-btn" data-itag="${format.itag}" data-type="adaptive-audio">
            <span class="adhub-format-quality">${quality}</span>
            <span class="adhub-format-info">${getFormatExtension(format.mimeType)} • ${size}</span>
          </button>
        `;
      }
      html += '</div>';
    }

    if (html === '') {
      html = '<div class="adhub-error">Žádné dostupné formáty pro přímé stažení.<br>Video může být chráněno.</div>';
    }

    list.innerHTML = html;

    // Přidat event listenery
    list.querySelectorAll('.adhub-format-btn').forEach(btn => {
      btn.addEventListener('click', () => handleFormatClick(btn));
    });
  }

  // ============================================================================
  // UI - POMOCNÉ FUNKCE
  // ============================================================================

  function formatBytes(bytes) {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  function getFormatExtension(mimeType) {
    if (!mimeType) return 'mp4';
    if (mimeType.includes('mp4')) return 'MP4';
    if (mimeType.includes('webm')) return 'WebM';
    if (mimeType.includes('audio/mp4')) return 'M4A';
    if (mimeType.includes('audio/webm')) return 'WebM';
    return mimeType.split('/')[1]?.split(';')[0] || 'mp4';
  }

  function sanitizeFilename(name) {
    return name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
  }

  // ============================================================================
  // STAHOVÁNÍ
  // ============================================================================

  async function handleFormatClick(button) {
    const itag = button.dataset.itag;
    const type = button.dataset.type;

    log('Stahování formátu:', itag, type);

    const format = state.formats.find(f => f.itag === parseInt(itag));
    if (!format) {
      logError('Formát nenalezen:', itag);
      return;
    }

    if (!format.url) {
      showNotification('Tento formát vyžaduje dešifrování, což zatím není podporováno.', 'error');
      return;
    }

    // Zobrazit progress
    showProgress(true);
    updateProgress(0, 'Připravuji stahování...');

    try {
      // Odeslat požadavek na background script
      const response = await chrome.runtime.sendMessage({
        action: 'downloadVideo',
        data: {
          url: format.url,
          filename: `${sanitizeFilename(state.videoData?.title || 'video')}.${getFormatExtension(format.mimeType).toLowerCase()}`,
          videoId: state.currentVideoId,
          itag: itag,
          mimeType: format.mimeType
        }
      });

      if (response.success) {
        updateProgress(100, 'Stahování zahájeno!');
        setTimeout(() => {
          showProgress(false);
          hideDropdown();
        }, 2000);
      } else {
        throw new Error(response.error || 'Stahování selhalo');
      }

    } catch (error) {
      logError('Chyba při stahování:', error);
      showProgress(false);
      showNotification(`Chyba: ${error.message}`, 'error');
    }
  }

  function showProgress(show) {
    const container = document.getElementById('adhub-progress-container');
    if (container) {
      container.classList.toggle('hidden', !show);
    }
  }

  function updateProgress(percent, text) {
    const percentEl = document.getElementById('adhub-progress-percent');
    const fillEl = document.getElementById('adhub-progress-fill');

    if (percentEl) percentEl.textContent = text || `${percent}%`;
    if (fillEl) fillEl.style.width = `${percent}%`;
  }

  // ============================================================================
  // UI - DROPDOWN KONTROLA
  // ============================================================================

  function showDropdown() {
    const dropdown = document.getElementById('adhub-dropdown');
    if (dropdown) {
      dropdown.classList.remove('hidden');
      loadFormatsToDropdown();
    }
  }

  function hideDropdown() {
    const dropdown = document.getElementById('adhub-dropdown');
    if (dropdown) {
      dropdown.classList.add('hidden');
    }
  }

  async function loadFormatsToDropdown() {
    const list = document.getElementById('adhub-formats-list');
    if (list) {
      list.innerHTML = '<div class="adhub-loading">Načítám formáty...</div>';
    }

    const data = await getVideoData();
    if (data) {
      renderFormats(data.formats);
    } else {
      if (list) {
        list.innerHTML = '<div class="adhub-error">Nelze načíst video data</div>';
      }
    }
  }

  function showNotification(message, type = 'info') {
    // Vytvořit notifikaci
    const existing = document.querySelector('.adhub-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `adhub-notification adhub-notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  // ============================================================================
  // INJEKCE TLAČÍTKA
  // ============================================================================

  function injectButton() {
    // Pokud už je injektováno, skip
    if (document.getElementById('adhub-download-container')) {
      return true;
    }

    // Najít kontejner pro tlačítko
    let targetContainer = null;
    for (const selector of CONFIG.SELECTORS.buttonContainers) {
      targetContainer = document.querySelector(selector);
      if (targetContainer) break;
    }

    if (!targetContainer) {
      log('Kontejner pro tlačítko nenalezen');
      return false;
    }

    // Vytvořit a vložit tlačítko
    const button = createDownloadButton();
    targetContainer.insertBefore(button, targetContainer.firstChild);

    // Přidat close button handler
    setTimeout(() => {
      const closeBtn = document.getElementById('adhub-dropdown-close');
      if (closeBtn) {
        closeBtn.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          hideDropdown();
          return false;
        };
      }
    }, 50);

    // Zavřít dropdown při kliknutí mimo (s delay)
    setTimeout(() => {
      document.addEventListener('click', (e) => {
        const container = document.getElementById('adhub-download-container');
        if (container && !container.contains(e.target)) {
          hideDropdown();
        }
      }, true);
    }, 200);

    log('Tlačítko úspěšně injektováno');
    state.buttonInjected = true;
    return true;
  }

  // ============================================================================
  // SLEDOVÁNÍ ZMĚN URL (SPA navigace)
  // ============================================================================

  function setupNavigationObserver() {
    let lastUrl = window.location.href;

    // Pozorovat změny URL
    const checkUrl = () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        log('URL změněna:', lastUrl);
        handlePageChange();
      }
    };

    // Interval pro kontrolu URL (YouTube je SPA)
    setInterval(checkUrl, 500);

    // Také sledovat popstate
    window.addEventListener('popstate', () => {
      setTimeout(handlePageChange, 100);
    });

    // Sledovat yt-navigate-finish event (YouTube specifické)
    window.addEventListener('yt-navigate-finish', () => {
      log('YouTube navigace dokončena');
      setTimeout(handlePageChange, 500);
    });
  }

  function handlePageChange() {
    // Reset stavu
    state.currentVideoId = null;
    state.videoData = null;
    state.formats = [];
    state.buttonInjected = false;

    // Odstranit staré tlačítko
    const oldButton = document.getElementById('adhub-download-container');
    if (oldButton) {
      oldButton.remove();
    }

    // Pokud jsme na video stránce, inicializovat
    if (getVideoIdFromUrl()) {
      setTimeout(initForVideoPage, 500);
    }
  }

  // ============================================================================
  // INICIALIZACE
  // ============================================================================

  function initForVideoPage() {
    const videoId = getVideoIdFromUrl();
    if (!videoId) return;

    log('Inicializace pro video:', videoId);

    // Opakovaně zkusit vložit tlačítko
    let attempts = 0;
    const tryInject = () => {
      if (injectButton()) {
        return;
      }
      attempts++;
      if (attempts < CONFIG.MAX_RETRIES) {
        setTimeout(tryInject, CONFIG.BUTTON_CHECK_INTERVAL);
      } else {
        logError('Nepodařilo se vložit tlačítko po', attempts, 'pokusech');
      }
    };

    tryInject();
  }

  // ============================================================================
  // KOMUNIKACE S BACKGROUND SCRIPTEM
  // ============================================================================

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    log('Zpráva od background:', request);

    switch (request.action) {
      case 'downloadProgress':
        updateProgress(request.percent, request.text);
        break;

      case 'getVideoData':
        getVideoData().then(data => {
          sendResponse({ success: true, data: data });
        });
        return true;

      case 'ping':
        sendResponse({ success: true, loaded: true });
        break;
    }
  });

  // ============================================================================
  // KOMUNIKACE S VLASTNÍ STRÁNKOU (postMessage)
  // ============================================================================

  window.addEventListener('message', async (event) => {
    // Pouze zprávy z naší stránky
    if (event.source !== window) return;

    const { type, payload } = event.data || {};

    if (type === 'ADHUB_GET_VIDEO_DATA') {
      log('Požadavek na video data z webové stránky');
      const data = await getVideoData();
      window.postMessage({
        type: 'ADHUB_VIDEO_DATA_RESPONSE',
        payload: data
      }, '*');
    }

    if (type === 'ADHUB_DOWNLOAD_VIDEO') {
      log('Požadavek na stažení z webové stránky:', payload);
      const format = state.formats.find(f => f.itag === payload.itag);
      if (format && format.url) {
        const response = await chrome.runtime.sendMessage({
          action: 'downloadVideo',
          data: {
            url: format.url,
            filename: payload.filename || 'video.mp4',
            videoId: state.currentVideoId,
            itag: payload.itag
          }
        });
        window.postMessage({
          type: 'ADHUB_DOWNLOAD_RESPONSE',
          payload: response
        }, '*');
      }
    }
  });

  // ============================================================================
  // GLOBÁLNÍ CLICK HANDLER (záloha)
  // ============================================================================

  // Zachytit kliknutí na document úrovni
  document.addEventListener('click', function(e) {
    const target = e.target;
    const btn = target.closest('#adhub-download-btn');
    if (btn) {
      console.log('[AdHub YT] Globální handler zachytil klik na tlačítko');
      e.preventDefault();
      e.stopPropagation();
      toggleDropdown();
    }
  }, true);

  document.addEventListener('mousedown', function(e) {
    const target = e.target;
    const btn = target.closest('#adhub-download-btn');
    if (btn) {
      console.log('[AdHub YT] Globální mousedown handler');
      e.preventDefault();
      e.stopPropagation();
      toggleDropdown();
    }
  }, true);

  // ============================================================================
  // START
  // ============================================================================

  function init() {
    log('Inicializace content scriptu');

    // Nastavit sledování navigace
    setupNavigationObserver();

    // Pokud jsme na video stránce, inicializovat
    if (getVideoIdFromUrl()) {
      // Počkat na načtení stránky
      if (document.readyState === 'complete') {
        setTimeout(initForVideoPage, 500);
      } else {
        window.addEventListener('load', () => setTimeout(initForVideoPage, 500));
      }
    }
  }

  // Spustit
  init();

})();
