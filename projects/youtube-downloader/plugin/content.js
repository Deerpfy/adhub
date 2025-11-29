/**
 * AdHub YouTube Downloader v5.3 - Zero Install
 *
 * Funguje IHNED po instalaci extension - žádná další konfigurace!
 *
 * Jak to funguje:
 * 1. Extrahuje video data přímo z YouTube stránky
 * 2. Stahuje přes chrome.downloads API
 * 3. Omezení: pouze formáty s přímým URL (max 720p, žádná konverze)
 */

(function() {
  'use strict';

  if (window.top !== window.self) return;
  if (window.__ADHUB_YT_DL_V53__) return;
  window.__ADHUB_YT_DL_V53__ = true;

  console.log('[AdHub] YouTube Downloader v5.3 (Zero Install)');

  // ============================================================================
  // STAV
  // ============================================================================

  const state = {
    currentVideoId: null,
    videoTitle: '',
    formats: [],
    bestFormat: null,
    isDownloading: false,
  };

  // ============================================================================
  // EXTRAKCE VIDEO DAT
  // ============================================================================

  function getVideoId() {
    const url = new URL(window.location.href);
    if (url.searchParams.has('v')) return url.searchParams.get('v');
    const match = url.pathname.match(/\/(shorts|embed)\/([a-zA-Z0-9_-]+)/);
    return match ? match[2] : null;
  }

  function extractPlayerResponse() {
    // Metoda 1: Globální proměnná
    if (window.ytInitialPlayerResponse) {
      return window.ytInitialPlayerResponse;
    }

    // Metoda 2: Z HTML
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

  function parseFormats(playerResponse) {
    if (!playerResponse?.streamingData) return [];

    const { formats = [], adaptiveFormats = [] } = playerResponse.streamingData;
    const videoDetails = playerResponse.videoDetails || {};
    const allFormats = [];

    state.videoTitle = videoDetails.title || document.title.replace(' - YouTube', '');

    // Progressive formáty (video + audio) - TYTO MAJÍ PŘÍMÉ URL!
    for (const f of formats) {
      if (f.url) { // Pouze pokud má přímé URL (není šifrované)
        allFormats.push({
          itag: f.itag,
          quality: f.qualityLabel || f.quality || 'unknown',
          height: f.height || 0,
          width: f.width || 0,
          mimeType: f.mimeType || 'video/mp4',
          ext: f.mimeType?.includes('webm') ? 'webm' : 'mp4',
          url: f.url,
          filesize: f.contentLength,
          type: 'video+audio',
          hasVideo: true,
          hasAudio: true,
        });
      }
    }

    // Adaptive formáty (odděleně video/audio)
    for (const f of adaptiveFormats) {
      if (f.url) { // Pouze nešifrované
        const isVideo = f.mimeType?.startsWith('video/');
        const isAudio = f.mimeType?.startsWith('audio/');

        allFormats.push({
          itag: f.itag,
          quality: f.qualityLabel || (isAudio ? `${Math.round((f.bitrate || 0) / 1000)}kbps` : 'unknown'),
          height: f.height || 0,
          mimeType: f.mimeType || '',
          ext: isAudio ? (f.mimeType?.includes('webm') ? 'webm' : 'm4a') : (f.mimeType?.includes('webm') ? 'webm' : 'mp4'),
          url: f.url,
          filesize: f.contentLength,
          type: isAudio ? 'audio' : 'video-only',
          hasVideo: isVideo,
          hasAudio: isAudio,
          bitrate: f.bitrate,
        });
      }
    }

    // Seřadit: video+audio první, pak podle kvality
    allFormats.sort((a, b) => {
      if (a.type === 'video+audio' && b.type !== 'video+audio') return -1;
      if (b.type === 'video+audio' && a.type !== 'video+audio') return 1;
      return (b.height || 0) - (a.height || 0);
    });

    return allFormats;
  }

  function loadVideoFormats() {
    const videoId = getVideoId();
    if (!videoId) return [];

    const playerResponse = extractPlayerResponse();
    if (!playerResponse) {
      console.log('[AdHub] Player response nenalezen');
      return [];
    }

    const formats = parseFormats(playerResponse);
    state.formats = formats;
    state.bestFormat = formats.find(f => f.type === 'video+audio') || formats[0];
    state.currentVideoId = videoId;

    console.log('[AdHub] Nalezeno formátů:', formats.length);
    return formats;
  }

  // ============================================================================
  // STAHOVÁNÍ
  // ============================================================================

  async function downloadFormat(format) {
    if (state.isDownloading) {
      showNotification('Stahování již probíhá...', 'warning');
      return;
    }

    if (!format?.url) {
      showNotification('Tento formát není dostupný', 'error');
      return;
    }

    state.isDownloading = true;
    showProgressOverlay();
    updateProgress(10, 'Připravuji stahování...');

    try {
      // Vytvořit název souboru
      const title = sanitizeFilename(state.videoTitle || 'video');
      const quality = format.quality || '';
      const filename = `${title} [${quality}].${format.ext}`;

      updateProgress(30, 'Zahajuji stahování...');

      // Poslat požadavek na background script
      const response = await chrome.runtime.sendMessage({
        action: 'download',
        data: {
          url: format.url,
          filename: filename,
        }
      });

      if (response.success) {
        updateProgress(100, 'Stahování zahájeno!');
        setTimeout(() => {
          hideProgressOverlay();
          showDownloadComplete(filename);
        }, 1500);
      } else {
        throw new Error(response.error || 'Stahování selhalo');
      }

    } catch (e) {
      console.error('[AdHub] Download error:', e);
      hideProgressOverlay();
      showNotification(`Chyba: ${e.message}`, 'error');
    } finally {
      state.isDownloading = false;
    }
  }

  function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '').trim().substring(0, 150);
  }

  function formatBytes(bytes) {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = parseInt(bytes);
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(1)} ${units[i]}`;
  }

  // ============================================================================
  // UI - TLAČÍTKO
  // ============================================================================

  function createDownloadButton() {
    const container = document.createElement('div');
    container.id = 'adhub-yt-downloader';
    container.innerHTML = `
      <div class="adhub-btn-group">
        <button id="adhub-download-main" class="adhub-btn-main" title="Stáhnout video v nejlepší kvalitě">
          <svg class="adhub-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 2h14v2H5v-2z"/>
          </svg>
          <span class="adhub-btn-label">Stáhnout</span>
        </button>
        <button id="adhub-dropdown-toggle" class="adhub-btn-arrow" title="Více možností">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
      </div>

      <div id="adhub-dropdown-menu" class="adhub-dropdown hidden">
        <div class="adhub-dropdown-header">
          <span>Vyberte kvalitu</span>
        </div>
        <div id="adhub-formats-list" class="adhub-formats-list">
          <div class="adhub-loading">Načítám...</div>
        </div>
      </div>
    `;
    return container;
  }

  function injectButton() {
    if (document.getElementById('adhub-yt-downloader')) return true;

    const selectors = [
      '#top-level-buttons-computed',
      'ytd-menu-renderer #top-level-buttons',
      '#actions ytd-menu-renderer',
    ];

    let target = null;
    for (const sel of selectors) {
      target = document.querySelector(sel);
      if (target) break;
    }
    if (!target) return false;

    const button = createDownloadButton();

    // Vložit za like/dislike
    const likeBtn = target.querySelector('ytd-segmented-like-dislike-button-renderer, ytd-toggle-button-renderer');
    if (likeBtn?.nextSibling) {
      target.insertBefore(button, likeBtn.nextSibling);
    } else {
      target.appendChild(button);
    }

    setupEventListeners();
    console.log('[AdHub] Tlačítko injektováno');
    return true;
  }

  function setupEventListeners() {
    // Hlavní tlačítko - stáhne nejlepší dostupný formát
    document.getElementById('adhub-download-main')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      loadVideoFormats();
      if (state.bestFormat) {
        downloadFormat(state.bestFormat);
      } else {
        showNotification('Žádné formáty k dispozici. Zkuste obnovit stránku.', 'error');
      }
    });

    // Dropdown toggle
    document.getElementById('adhub-dropdown-toggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDropdown();
    });

    // Zavřít dropdown při kliknutí mimo
    document.addEventListener('click', (e) => {
      const container = document.getElementById('adhub-yt-downloader');
      if (container && !container.contains(e.target)) {
        closeDropdown();
      }
    });
  }

  function toggleDropdown() {
    const dropdown = document.getElementById('adhub-dropdown-menu');
    if (dropdown) {
      const wasHidden = dropdown.classList.contains('hidden');
      dropdown.classList.toggle('hidden');
      if (wasHidden) {
        renderFormatsList();
      }
    }
  }

  function closeDropdown() {
    document.getElementById('adhub-dropdown-menu')?.classList.add('hidden');
  }

  function renderFormatsList() {
    const list = document.getElementById('adhub-formats-list');
    if (!list) return;

    loadVideoFormats();

    if (state.formats.length === 0) {
      list.innerHTML = `
        <div class="adhub-error">
          Žádné formáty k dispozici.<br>
          <small>Zkuste obnovit stránku (F5)</small>
        </div>
      `;
      return;
    }

    let html = '';

    // Video + Audio formáty
    const videoAudio = state.formats.filter(f => f.type === 'video+audio');
    if (videoAudio.length > 0) {
      html += '<div class="adhub-format-group"><div class="adhub-format-group-title">Video + Audio</div>';
      for (const f of videoAudio) {
        const size = f.filesize ? formatBytes(f.filesize) : '';
        html += `
          <button class="adhub-format-btn" data-itag="${f.itag}">
            <span class="adhub-format-quality">${f.quality}</span>
            <span class="adhub-format-info">${f.ext.toUpperCase()} ${size}</span>
          </button>
        `;
      }
      html += '</div>';
    }

    // Audio formáty
    const audio = state.formats.filter(f => f.type === 'audio');
    if (audio.length > 0) {
      html += '<div class="adhub-format-group"><div class="adhub-format-group-title">Pouze Audio</div>';
      for (const f of audio.slice(0, 5)) {
        const size = f.filesize ? formatBytes(f.filesize) : '';
        const kbps = f.bitrate ? `${Math.round(f.bitrate / 1000)}kbps` : '';
        html += `
          <button class="adhub-format-btn" data-itag="${f.itag}">
            <span class="adhub-format-quality">${kbps || f.quality}</span>
            <span class="adhub-format-info">${f.ext.toUpperCase()} ${size}</span>
          </button>
        `;
      }
      html += '</div>';
    }

    // Video-only formáty
    const videoOnly = state.formats.filter(f => f.type === 'video-only');
    if (videoOnly.length > 0) {
      html += '<div class="adhub-format-group"><div class="adhub-format-group-title">Pouze Video (bez zvuku)</div>';
      for (const f of videoOnly.slice(0, 5)) {
        const size = f.filesize ? formatBytes(f.filesize) : '';
        html += `
          <button class="adhub-format-btn" data-itag="${f.itag}">
            <span class="adhub-format-quality">${f.quality}</span>
            <span class="adhub-format-info">${f.ext.toUpperCase()} ${size}</span>
          </button>
        `;
      }
      html += '</div>';
    }

    if (!html) {
      html = '<div class="adhub-error">Žádné dostupné formáty</div>';
    }

    list.innerHTML = html;

    // Event listenery pro formáty
    list.querySelectorAll('.adhub-format-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const itag = parseInt(btn.dataset.itag);
        const format = state.formats.find(f => f.itag === itag);
        if (format) {
          closeDropdown();
          downloadFormat(format);
        }
      });
    });
  }

  // ============================================================================
  // PROGRESS & NOTIFICATIONS
  // ============================================================================

  function showProgressOverlay() {
    let overlay = document.getElementById('adhub-progress-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'adhub-progress-overlay';
      overlay.innerHTML = `
        <div class="adhub-progress-card">
          <div class="adhub-progress-header">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 2h14v2H5v-2z"/>
            </svg>
            <span>Stahování</span>
          </div>
          <div class="adhub-progress-bar-bg">
            <div id="adhub-progress-bar" class="adhub-progress-bar"></div>
          </div>
          <div id="adhub-progress-text" class="adhub-progress-text">Připravuji...</div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    overlay.classList.add('visible');
  }

  function hideProgressOverlay() {
    document.getElementById('adhub-progress-overlay')?.classList.remove('visible');
  }

  function updateProgress(percent, text) {
    const bar = document.getElementById('adhub-progress-bar');
    const textEl = document.getElementById('adhub-progress-text');
    if (bar) bar.style.width = `${percent}%`;
    if (textEl) textEl.textContent = text;
  }

  function showNotification(message, type = 'info') {
    document.querySelector('.adhub-notification')?.remove();

    const el = document.createElement('div');
    el.className = `adhub-notification adhub-notification-${type}`;
    el.innerHTML = `<span>${message}</span><button class="adhub-notif-close">&times;</button>`;
    document.body.appendChild(el);

    el.querySelector('.adhub-notif-close').onclick = () => el.remove();
    requestAnimationFrame(() => el.classList.add('visible'));
    setTimeout(() => el.remove(), 5000);
  }

  function showDownloadComplete(filename) {
    document.querySelector('.adhub-complete-toast')?.remove();

    const toast = document.createElement('div');
    toast.className = 'adhub-complete-toast';
    toast.innerHTML = `
      <div class="adhub-complete-icon">✓</div>
      <div class="adhub-complete-content">
        <div class="adhub-complete-title">Stahování zahájeno!</div>
        <div class="adhub-complete-file">${filename}</div>
      </div>
      <button class="adhub-complete-close">&times;</button>
    `;
    document.body.appendChild(toast);

    toast.querySelector('.adhub-complete-close').onclick = () => toast.remove();
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => toast.remove(), 6000);
  }

  // ============================================================================
  // NAVIGACE
  // ============================================================================

  function setupNavigationObserver() {
    let lastUrl = window.location.href;

    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        handlePageChange();
      }
    }, 500);

    window.addEventListener('yt-navigate-finish', () => setTimeout(handlePageChange, 500));
  }

  function handlePageChange() {
    state.currentVideoId = null;
    state.formats = [];
    state.bestFormat = null;
    document.getElementById('adhub-yt-downloader')?.remove();

    if (getVideoId()) {
      setTimeout(init, 500);
    }
  }

  // ============================================================================
  // INIT
  // ============================================================================

  function init() {
    if (!getVideoId()) return;

    let attempts = 0;
    const tryInject = () => {
      if (injectButton()) return;
      if (++attempts < 30) setTimeout(tryInject, 1000);
    };
    tryInject();
  }

  setupNavigationObserver();

  if (document.readyState === 'complete') {
    setTimeout(init, 500);
  } else {
    window.addEventListener('load', () => setTimeout(init, 500));
  }

})();
