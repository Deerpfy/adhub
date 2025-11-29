/**
 * AdHub YouTube Downloader v5.0 - Content Script
 *
 * Běží přímo na YouTube stránce:
 * - Detekuje lokální server (yt_server.py)
 * - Pokud server běží, používá ho pro všechny formáty a kvality
 * - Fallback na přímé stahování (omezené formáty)
 */

(function() {
  'use strict';

  // Spustit pouze v hlavním okně
  if (window.top !== window.self) return;

  // Prevence dvojité inicializace
  if (window.__ADHUB_YT_DOWNLOADER_V5__) return;
  window.__ADHUB_YT_DOWNLOADER_V5__ = true;

  console.log('[AdHub YT] Content script v5.0 načten');

  // ============================================================================
  // KONFIGURACE
  // ============================================================================

  const CONFIG = {
    DEBUG: true,
    SERVER_URL: 'http://127.0.0.1:8765',
    SERVER_CHECK_INTERVAL: 30000,
    BUTTON_RETRY_INTERVAL: 1000,
    MAX_BUTTON_RETRIES: 30,
  };

  // ============================================================================
  // STAV
  // ============================================================================

  const state = {
    serverAvailable: false,
    currentVideoId: null,
    videoData: null,
    formats: null,
    buttonInjected: false,
    downloadInProgress: false,
  };

  // ============================================================================
  // LOGGING
  // ============================================================================

  const log = (...args) => CONFIG.DEBUG && console.log('[AdHub YT]', ...args);
  const logError = (...args) => console.error('[AdHub YT ERROR]', ...args);

  // ============================================================================
  // SERVER KOMUNIKACE
  // ============================================================================

  async function checkServer() {
    try {
      const response = await fetch(`${CONFIG.SERVER_URL}/api/status`, {
        method: 'GET',
        mode: 'cors',
      });
      const data = await response.json();
      state.serverAvailable = data.status === 'running' && data.yt_dlp_available;
      log('Server status:', state.serverAvailable ? 'DOSTUPNÝ' : 'NEDOSTUPNÝ');
      return state.serverAvailable;
    } catch (e) {
      state.serverAvailable = false;
      log('Server nedostupný:', e.message);
      return false;
    }
  }

  async function getVideoInfoFromServer(videoId) {
    if (!state.serverAvailable) return null;

    try {
      const url = `${CONFIG.SERVER_URL}/api/info?url=https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        logError('Server error:', data.error);
        return null;
      }

      return data;
    } catch (e) {
      logError('Chyba při komunikaci se serverem:', e);
      return null;
    }
  }

  async function downloadFromServer(videoId, formatType, quality, audioFormat) {
    if (!state.serverAvailable) {
      showNotification('Server není dostupný. Spusťte yt_server.py', 'error');
      return null;
    }

    try {
      const response = await fetch(`${CONFIG.SERVER_URL}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          format_type: formatType,
          quality: quality,
          audio_format: audioFormat,
        }),
      });

      const data = await response.json();

      if (data.error) {
        logError('Download error:', data.error);
        return null;
      }

      return data;
    } catch (e) {
      logError('Chyba při stahování:', e);
      return null;
    }
  }

  async function checkDownloadProgress(taskId) {
    try {
      const response = await fetch(`${CONFIG.SERVER_URL}/api/progress/${taskId}`);
      return await response.json();
    } catch (e) {
      return null;
    }
  }

  // ============================================================================
  // VIDEO ID EXTRAKCE
  // ============================================================================

  function getVideoIdFromUrl(url = window.location.href) {
    try {
      const urlObj = new URL(url);

      if (urlObj.searchParams.has('v')) {
        return urlObj.searchParams.get('v');
      }

      const match = urlObj.pathname.match(/\/(shorts|embed|v)\/([a-zA-Z0-9_-]+)/);
      if (match) return match[2];

    } catch (e) {}
    return null;
  }

  // ============================================================================
  // FALLBACK - PŘÍMÁ EXTRAKCE Z YOUTUBE
  // ============================================================================

  function extractPlayerResponse() {
    if (window.ytInitialPlayerResponse) {
      return window.ytInitialPlayerResponse;
    }

    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent || '';
      const match = text.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch (e) {}
      }
    }

    return null;
  }

  function parseLocalFormats(playerResponse) {
    if (!playerResponse?.streamingData) return [];

    const { formats = [], adaptiveFormats = [] } = playerResponse.streamingData;
    const allFormats = [];

    // Progressive formáty (mají přímé URL)
    for (const f of formats) {
      if (f.url) {
        allFormats.push({
          format_id: f.itag,
          quality: f.qualityLabel || f.quality,
          ext: f.mimeType?.includes('webm') ? 'webm' : 'mp4',
          height: f.height,
          type: 'progressive',
          hasAudio: true,
          hasVideo: true,
          url: f.url,
          filesize: f.contentLength,
        });
      }
    }

    // Adaptive formáty (většina vyžaduje dešifrování)
    for (const f of adaptiveFormats) {
      if (f.url) {
        const isVideo = f.mimeType?.startsWith('video/');
        const isAudio = f.mimeType?.startsWith('audio/');

        allFormats.push({
          format_id: f.itag,
          quality: f.qualityLabel || (isAudio ? `${Math.round((f.bitrate || 0) / 1000)}kbps` : 'unknown'),
          ext: f.mimeType?.includes('webm') ? 'webm' : (isAudio ? 'm4a' : 'mp4'),
          height: f.height,
          type: isAudio ? 'audio' : 'video_only',
          hasAudio: isAudio,
          hasVideo: isVideo,
          url: f.url,
          filesize: f.contentLength,
          abr: f.bitrate ? Math.round(f.bitrate / 1000) : null,
        });
      }
    }

    return allFormats;
  }

  // ============================================================================
  // UI - HLAVNÍ TLAČÍTKO
  // ============================================================================

  function createDownloadButton() {
    const container = document.createElement('div');
    container.id = 'adhub-download-container';

    const serverIndicator = state.serverAvailable
      ? '<span class="adhub-server-indicator adhub-server-on" title="Server aktivní"></span>'
      : '<span class="adhub-server-indicator adhub-server-off" title="Server offline - omezené formáty"></span>';

    container.innerHTML = `
      <div class="adhub-download-wrapper">
        <button id="adhub-download-btn" class="adhub-btn adhub-btn-primary" type="button">
          ${serverIndicator}
          <svg class="adhub-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 2h14v2H5v-2z"/>
          </svg>
          <span class="adhub-btn-text">Stáhnout</span>
        </button>
        <div id="adhub-dropdown" class="adhub-dropdown hidden">
          <div class="adhub-dropdown-header">
            <span>Vyberte formát a kvalitu</span>
            <button id="adhub-dropdown-close" class="adhub-dropdown-close" type="button">&times;</button>
          </div>
          <div id="adhub-formats-list" class="adhub-formats-list">
            <div class="adhub-loading">Načítám formáty...</div>
          </div>
          <div id="adhub-progress-container" class="adhub-progress-container hidden">
            <div class="adhub-progress-text">
              <span id="adhub-progress-status">Stahování</span>:
              <span id="adhub-progress-percent">0%</span>
            </div>
            <div class="adhub-progress-bar">
              <div id="adhub-progress-fill" class="adhub-progress-fill"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    return container;
  }

  // ============================================================================
  // UI - FORMÁTY DROPDOWN
  // ============================================================================

  async function loadFormats() {
    const list = document.getElementById('adhub-formats-list');
    if (!list) return;

    list.innerHTML = '<div class="adhub-loading">Načítám formáty...</div>';

    const videoId = getVideoIdFromUrl();
    if (!videoId) {
      list.innerHTML = '<div class="adhub-error">Video nenalezeno</div>';
      return;
    }

    let formats = null;
    let videoTitle = document.title.replace(' - YouTube', '');

    // Zkusit server
    if (state.serverAvailable) {
      const serverData = await getVideoInfoFromServer(videoId);
      if (serverData && serverData.formats) {
        formats = serverData.formats;
        videoTitle = serverData.title || videoTitle;
        state.videoData = serverData;
        log('Formáty ze serveru:', formats);
      }
    }

    // Fallback na lokální extrakci
    if (!formats) {
      log('Používám fallback - lokální extrakce');
      const playerResponse = extractPlayerResponse();
      if (playerResponse) {
        const localFormats = parseLocalFormats(playerResponse);
        formats = {
          video: localFormats.filter(f => f.type === 'progressive'),
          video_only: localFormats.filter(f => f.type === 'video_only'),
          audio: localFormats.filter(f => f.type === 'audio'),
        };
        state.formats = localFormats;
      }
    }

    if (!formats) {
      list.innerHTML = '<div class="adhub-error">Nelze načíst formáty. Zkuste obnovit stránku.</div>';
      return;
    }

    renderFormats(formats, videoId, videoTitle);
  }

  function renderFormats(formats, videoId, videoTitle) {
    const list = document.getElementById('adhub-formats-list');
    if (!list) return;

    let html = '';

    // Pokud máme server, přidat konverzní formáty
    if (state.serverAvailable) {
      html += `
        <div class="adhub-format-group">
          <div class="adhub-format-group-title">🎵 Audio (konverze přes server)</div>
          <button class="adhub-format-btn adhub-format-audio" data-type="audio" data-format="mp3">
            <span class="adhub-format-quality">MP3 320kbps</span>
            <span class="adhub-format-info">Nejlepší kvalita</span>
          </button>
          <button class="adhub-format-btn adhub-format-audio" data-type="audio" data-format="wav">
            <span class="adhub-format-quality">WAV</span>
            <span class="adhub-format-info">Bezztrátový</span>
          </button>
          <button class="adhub-format-btn adhub-format-audio" data-type="audio" data-format="m4a">
            <span class="adhub-format-quality">M4A 256kbps</span>
            <span class="adhub-format-info">AAC kodek</span>
          </button>
          <button class="adhub-format-btn adhub-format-audio" data-type="audio" data-format="flac">
            <span class="adhub-format-quality">FLAC</span>
            <span class="adhub-format-info">Bezztrátový</span>
          </button>
          <button class="adhub-format-btn adhub-format-audio" data-type="audio" data-format="ogg">
            <span class="adhub-format-quality">OGG Vorbis</span>
            <span class="adhub-format-info">Open-source</span>
          </button>
        </div>
      `;

      // Video kvality přes server (všechny dostupné)
      const qualities = [2160, 1440, 1080, 720, 480, 360, 240, 144];
      html += `
        <div class="adhub-format-group">
          <div class="adhub-format-group-title">🎬 Video MP4 (přes server - všechny kvality)</div>
      `;
      for (const q of qualities) {
        const label = q === 2160 ? '4K' : q === 1440 ? '2K' : `${q}p`;
        html += `
          <button class="adhub-format-btn" data-type="video" data-quality="${q}">
            <span class="adhub-format-quality">${label}</span>
            <span class="adhub-format-info">MP4 • Video + Audio</span>
          </button>
        `;
      }
      html += '</div>';
    }

    // Progressive formáty (přímé URL - funguje vždy)
    if (formats.video && formats.video.length > 0) {
      html += `
        <div class="adhub-format-group">
          <div class="adhub-format-group-title">📥 Přímé stažení (bez serveru)</div>
      `;
      for (const f of formats.video) {
        const size = f.filesize ? formatBytes(parseInt(f.filesize)) : '';
        html += `
          <button class="adhub-format-btn adhub-format-direct" data-type="direct" data-url="${encodeURIComponent(f.url)}" data-ext="${f.ext}">
            <span class="adhub-format-quality">${f.quality || f.height + 'p'}</span>
            <span class="adhub-format-info">${f.ext?.toUpperCase()} ${size}</span>
          </button>
        `;
      }
      html += '</div>';
    }

    // Audio přímé (pokud není server)
    if (!state.serverAvailable && formats.audio && formats.audio.length > 0) {
      html += `
        <div class="adhub-format-group">
          <div class="adhub-format-group-title">🔊 Audio (přímé)</div>
      `;
      for (const f of formats.audio.slice(0, 3)) {
        const size = f.filesize ? formatBytes(parseInt(f.filesize)) : '';
        html += `
          <button class="adhub-format-btn adhub-format-direct" data-type="direct" data-url="${encodeURIComponent(f.url)}" data-ext="${f.ext}">
            <span class="adhub-format-quality">${f.quality || f.abr + 'kbps'}</span>
            <span class="adhub-format-info">${f.ext?.toUpperCase()} ${size}</span>
          </button>
        `;
      }
      html += '</div>';
    }

    if (!html) {
      html = '<div class="adhub-error">Žádné formáty k dispozici</div>';
    }

    // Pokud není server, přidat info
    if (!state.serverAvailable) {
      html += `
        <div class="adhub-server-notice">
          <p>⚠️ Pro více formátů (MP3, WAV, 4K) spusťte lokální server:</p>
          <code>python yt_server.py</code>
        </div>
      `;
    }

    list.innerHTML = html;

    // Event listenery
    list.querySelectorAll('.adhub-format-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleDownload(btn, videoId, videoTitle);
      });
    });
  }

  // ============================================================================
  // STAHOVÁNÍ
  // ============================================================================

  async function handleDownload(button, videoId, videoTitle) {
    const type = button.dataset.type;

    if (state.downloadInProgress) {
      showNotification('Stahování již probíhá', 'warning');
      return;
    }

    state.downloadInProgress = true;
    showProgress(true);
    updateProgress(0, 'Připravuji...');

    try {
      if (type === 'direct') {
        // Přímé stažení (fallback)
        const url = decodeURIComponent(button.dataset.url);
        const ext = button.dataset.ext || 'mp4';
        const filename = `${sanitizeFilename(videoTitle)}.${ext}`;

        updateProgress(50, 'Zahajuji stahování...');

        await chrome.runtime.sendMessage({
          action: 'downloadVideo',
          data: { url, filename, videoId }
        });

        updateProgress(100, 'Stahování zahájeno!');

      } else if (type === 'video') {
        // Video přes server
        const quality = parseInt(button.dataset.quality);
        const result = await downloadFromServer(videoId, 'video', quality, null);

        if (result && result.task_id) {
          await trackProgress(result.task_id);
        } else {
          throw new Error('Server neodpověděl');
        }

      } else if (type === 'audio') {
        // Audio přes server
        const format = button.dataset.format;
        const result = await downloadFromServer(videoId, 'audio', null, format);

        if (result && result.task_id) {
          await trackProgress(result.task_id);
        } else {
          throw new Error('Server neodpověděl');
        }
      }

      showNotification('Stahování úspěšně zahájeno!', 'success');

    } catch (error) {
      logError('Download error:', error);
      showNotification(`Chyba: ${error.message}`, 'error');
    } finally {
      state.downloadInProgress = false;
      setTimeout(() => showProgress(false), 3000);
    }
  }

  async function trackProgress(taskId) {
    const maxAttempts = 300; // 5 minut
    let attempts = 0;

    while (attempts < maxAttempts) {
      const progress = await checkDownloadProgress(taskId);

      if (!progress) break;

      if (progress.status === 'downloading') {
        updateProgress(progress.progress || 0, `Stahování: ${progress.progress || 0}%`);
      } else if (progress.status === 'processing') {
        updateProgress(95, 'Zpracovávám...');
      } else if (progress.status === 'completed') {
        updateProgress(100, 'Hotovo!');
        if (progress.filename) {
          showNotification(`Staženo: ${progress.filename}`, 'success');
        }
        break;
      } else if (progress.status === 'error') {
        throw new Error(progress.error || 'Stahování selhalo');
      }

      await new Promise(r => setTimeout(r, 1000));
      attempts++;
    }
  }

  // ============================================================================
  // UI HELPERS
  // ============================================================================

  function showDropdown() {
    const dropdown = document.getElementById('adhub-dropdown');
    if (dropdown) {
      dropdown.classList.remove('hidden');
      loadFormats();
    }
  }

  function hideDropdown() {
    const dropdown = document.getElementById('adhub-dropdown');
    if (dropdown) {
      dropdown.classList.add('hidden');
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
    const statusEl = document.getElementById('adhub-progress-status');

    if (percentEl) percentEl.textContent = `${percent}%`;
    if (fillEl) fillEl.style.width = `${percent}%`;
    if (statusEl && text) statusEl.textContent = text;
  }

  function showNotification(message, type = 'info') {
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

  function formatBytes(bytes) {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 10) / 10 + ' ' + sizes[i];
  }

  function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '').trim().substring(0, 200);
  }

  // ============================================================================
  // INJEKCE TLAČÍTKA
  // ============================================================================

  function injectButton() {
    if (document.getElementById('adhub-download-container')) return true;

    const selectors = [
      '#top-level-buttons-computed',
      'ytd-menu-renderer #top-level-buttons',
      '#info-contents #menu',
      '#actions',
    ];

    let target = null;
    for (const sel of selectors) {
      target = document.querySelector(sel);
      if (target) break;
    }

    if (!target) return false;

    const button = createDownloadButton();
    target.insertBefore(button, target.firstChild);

    // Event handlers
    setTimeout(() => {
      const closeBtn = document.getElementById('adhub-dropdown-close');
      if (closeBtn) {
        closeBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          hideDropdown();
        };
      }
    }, 50);

    log('Tlačítko injektováno');
    state.buttonInjected = true;
    return true;
  }

  // ============================================================================
  // NAVIGACE (SPA)
  // ============================================================================

  function setupNavigationObserver() {
    let lastUrl = window.location.href;

    const checkUrl = () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        handlePageChange();
      }
    };

    setInterval(checkUrl, 500);

    window.addEventListener('yt-navigate-finish', () => {
      setTimeout(handlePageChange, 500);
    });
  }

  function handlePageChange() {
    state.currentVideoId = null;
    state.videoData = null;
    state.formats = null;
    state.buttonInjected = false;

    const old = document.getElementById('adhub-download-container');
    if (old) old.remove();

    if (getVideoIdFromUrl()) {
      setTimeout(initForVideoPage, 500);
    }
  }

  // ============================================================================
  // INICIALIZACE
  // ============================================================================

  async function initForVideoPage() {
    const videoId = getVideoIdFromUrl();
    if (!videoId) return;

    log('Inicializace pro video:', videoId);
    state.currentVideoId = videoId;

    // Zkontrolovat server
    await checkServer();

    // Injektovat tlačítko
    let attempts = 0;
    const tryInject = () => {
      if (injectButton()) return;
      attempts++;
      if (attempts < CONFIG.MAX_BUTTON_RETRIES) {
        setTimeout(tryInject, CONFIG.BUTTON_RETRY_INTERVAL);
      }
    };
    tryInject();
  }

  // Globální click handler pro tlačítko
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#adhub-download-btn');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();

      const dropdown = document.getElementById('adhub-dropdown');
      if (dropdown) {
        if (dropdown.classList.contains('hidden')) {
          showDropdown();
        } else {
          hideDropdown();
        }
      }
    }
  }, true);

  // Zavřít dropdown při kliknutí mimo
  document.addEventListener('click', (e) => {
    const container = document.getElementById('adhub-download-container');
    if (container && !container.contains(e.target)) {
      hideDropdown();
    }
  });

  // ============================================================================
  // START
  // ============================================================================

  function init() {
    log('Inicializace...');
    setupNavigationObserver();

    if (getVideoIdFromUrl()) {
      if (document.readyState === 'complete') {
        setTimeout(initForVideoPage, 500);
      } else {
        window.addEventListener('load', () => setTimeout(initForVideoPage, 500));
      }
    }

    // Periodicky kontrolovat server
    setInterval(checkServer, CONFIG.SERVER_CHECK_INTERVAL);
  }

  init();

})();
