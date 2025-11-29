/**
 * AdHub YouTube Downloader v5.1 - Content Script
 *
 * Funkce:
 * - Tlačítko "Stáhnout" vedle like/dislike
 * - Dropdown šipka s preferencemi formátu
 * - Automatická detekce nejvyšší kvality
 * - Neviditelné stahování na pozadí
 * - Status bar průběhu
 */

(function() {
  'use strict';

  if (window.top !== window.self) return;
  if (window.__ADHUB_YT_DL_V51__) return;
  window.__ADHUB_YT_DL_V51__ = true;

  console.log('[AdHub] YouTube Downloader v5.1 loaded');

  // ============================================================================
  // KONFIGURACE
  // ============================================================================

  const CONFIG = {
    SERVER_URL: 'http://127.0.0.1:8765',
    BUTTON_SELECTORS: [
      '#top-level-buttons-computed',
      'ytd-menu-renderer #top-level-buttons',
      '#actions ytd-menu-renderer',
      '#info #menu-container',
    ],
    DEFAULT_FORMAT: 'mp4',
    DEFAULT_QUALITY: 'best', // 'best' = nejvyšší dostupná
  };

  // ============================================================================
  // STAV APLIKACE
  // ============================================================================

  const state = {
    serverOnline: false,
    currentVideoId: null,
    videoInfo: null,
    bestQuality: null,
    availableQualities: [],
    preferences: {
      format: 'mp4',
      quality: 'best',
      audioFormat: 'mp3',
    },
    isDownloading: false,
    downloadProgress: 0,
  };

  // ============================================================================
  // UTILITY FUNKCE
  // ============================================================================

  const log = (...args) => console.log('[AdHub]', ...args);
  const logError = (...args) => console.error('[AdHub ERROR]', ...args);

  function getVideoId() {
    const url = new URL(window.location.href);
    if (url.searchParams.has('v')) return url.searchParams.get('v');
    const match = url.pathname.match(/\/(shorts|embed)\/([a-zA-Z0-9_-]+)/);
    return match ? match[2] : null;
  }

  function formatBytes(bytes) {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    return `${bytes.toFixed(1)} ${units[i]}`;
  }

  function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '').trim().substring(0, 150);
  }

  // ============================================================================
  // SERVER KOMUNIKACE
  // ============================================================================

  async function checkServer() {
    try {
      const res = await fetch(`${CONFIG.SERVER_URL}/api/status`, { mode: 'cors' });
      const data = await res.json();
      state.serverOnline = data.status === 'running' && data.yt_dlp_available;
      updateServerIndicator();
      return state.serverOnline;
    } catch (e) {
      state.serverOnline = false;
      updateServerIndicator();
      return false;
    }
  }

  async function getVideoInfo(videoId) {
    if (!state.serverOnline) return null;

    try {
      const res = await fetch(`${CONFIG.SERVER_URL}/api/info?url=https://www.youtube.com/watch?v=${videoId}`);
      const data = await res.json();

      if (data.error) {
        logError('Server error:', data.error);
        return null;
      }

      // Extrahovat dostupné kvality
      const qualities = new Set();
      ['video', 'video_only'].forEach(type => {
        (data.formats?.[type] || []).forEach(f => {
          if (f.height) qualities.add(f.height);
        });
      });

      state.availableQualities = Array.from(qualities).sort((a, b) => b - a);
      state.bestQuality = state.availableQualities[0] || 1080;
      state.videoInfo = data;

      log('Video info loaded:', data.title, 'Best quality:', state.bestQuality);
      return data;
    } catch (e) {
      logError('Failed to get video info:', e);
      return null;
    }
  }

  async function startDownload(videoId, format, quality, audioFormat = null) {
    if (!state.serverOnline) {
      showNotification('Server není spuštěn! Spusťte: python yt_server.py', 'error');
      return false;
    }

    state.isDownloading = true;
    showProgressOverlay();
    updateProgress(0, 'Připravuji stahování...');

    try {
      const body = {
        url: `https://www.youtube.com/watch?v=${videoId}`,
        format_type: audioFormat ? 'audio' : 'video',
        quality: quality === 'best' ? null : quality,
        audio_format: audioFormat,
      };

      const res = await fetch(`${CONFIG.SERVER_URL}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.task_id) {
        await pollProgress(data.task_id);
      }

      return true;
    } catch (e) {
      logError('Download failed:', e);
      showNotification(`Chyba: ${e.message}`, 'error');
      hideProgressOverlay();
      return false;
    } finally {
      state.isDownloading = false;
    }
  }

  async function pollProgress(taskId) {
    const maxAttempts = 600; // 10 minut max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const res = await fetch(`${CONFIG.SERVER_URL}/api/progress/${taskId}`);
        const data = await res.json();

        if (data.status === 'downloading') {
          updateProgress(data.progress || 0, `Stahování: ${data.progress || 0}%`);
        } else if (data.status === 'processing') {
          updateProgress(90, 'Zpracovávám a konvertuji...');
        } else if (data.status === 'completed') {
          updateProgress(100, 'Dokončeno!');

          const filename = data.filename || 'video';
          const filepath = data.filepath || '~/Downloads';

          setTimeout(() => {
            hideProgressOverlay();
            showNotification(`✓ Staženo: ${filename}`, 'success', 5000);
            showDownloadComplete(filename, filepath);
          }, 1000);

          return;
        } else if (data.status === 'error') {
          throw new Error(data.error || 'Stahování selhalo');
        }
      } catch (e) {
        logError('Progress poll error:', e);
      }

      await new Promise(r => setTimeout(r, 1000));
      attempts++;
    }

    throw new Error('Timeout - stahování trvá příliš dlouho');
  }

  // ============================================================================
  // UI - HLAVNÍ TLAČÍTKO
  // ============================================================================

  function createDownloadButton() {
    const container = document.createElement('div');
    container.id = 'adhub-yt-downloader';
    container.innerHTML = `
      <div class="adhub-btn-group">
        <button id="adhub-download-main" class="adhub-btn-main" title="Stáhnout video">
          <svg class="adhub-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 2h14v2H5v-2z"/>
          </svg>
          <span class="adhub-btn-label">Stáhnout</span>
        </button>
        <button id="adhub-dropdown-toggle" class="adhub-btn-arrow" title="Možnosti stahování">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
        <span id="adhub-server-dot" class="adhub-server-dot offline" title="Server offline"></span>
      </div>

      <div id="adhub-dropdown-menu" class="adhub-dropdown hidden">
        <div class="adhub-dropdown-header">
          <span class="adhub-dropdown-title">Preference stahování</span>
        </div>

        <div class="adhub-dropdown-section">
          <label class="adhub-label">Formát videa</label>
          <div class="adhub-format-options" id="adhub-video-formats">
            <button class="adhub-format-btn active" data-format="mp4">MP4</button>
            <button class="adhub-format-btn" data-format="webm">WebM</button>
            <button class="adhub-format-btn" data-format="mkv">MKV</button>
          </div>
        </div>

        <div class="adhub-dropdown-section">
          <label class="adhub-label">Kvalita</label>
          <div class="adhub-quality-options" id="adhub-quality-options">
            <button class="adhub-quality-btn active" data-quality="best">Nejlepší</button>
          </div>
        </div>

        <div class="adhub-dropdown-divider"></div>

        <div class="adhub-dropdown-section">
          <label class="adhub-label">Pouze audio</label>
          <div class="adhub-format-options" id="adhub-audio-formats">
            <button class="adhub-audio-btn" data-audio="mp3">MP3</button>
            <button class="adhub-audio-btn" data-audio="wav">WAV</button>
            <button class="adhub-audio-btn" data-audio="m4a">M4A</button>
            <button class="adhub-audio-btn" data-audio="flac">FLAC</button>
          </div>
        </div>

        <div class="adhub-dropdown-footer">
          <span id="adhub-video-info" class="adhub-video-info"></span>
        </div>
      </div>
    `;

    return container;
  }

  function injectButton() {
    if (document.getElementById('adhub-yt-downloader')) return true;

    let target = null;
    for (const selector of CONFIG.BUTTON_SELECTORS) {
      target = document.querySelector(selector);
      if (target) break;
    }

    if (!target) return false;

    const button = createDownloadButton();

    // Vložit za like/dislike tlačítka
    const likeBtn = target.querySelector('ytd-toggle-button-renderer, ytd-segmented-like-dislike-button-renderer');
    if (likeBtn && likeBtn.nextSibling) {
      target.insertBefore(button, likeBtn.nextSibling);
    } else {
      target.appendChild(button);
    }

    setupEventListeners();
    loadVideoInfo();

    log('Button injected');
    return true;
  }

  // ============================================================================
  // EVENT LISTENERY
  // ============================================================================

  function setupEventListeners() {
    // Hlavní tlačítko - stáhnout s aktuálními preferencemi
    const mainBtn = document.getElementById('adhub-download-main');
    if (mainBtn) {
      mainBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleDownload();
      });
    }

    // Dropdown toggle
    const toggleBtn = document.getElementById('adhub-dropdown-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleDropdown();
      });
    }

    // Video formát tlačítka
    document.querySelectorAll('#adhub-video-formats .adhub-format-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('#adhub-video-formats .adhub-format-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.preferences.format = btn.dataset.format;
      });
    });

    // Audio formát tlačítka
    document.querySelectorAll('#adhub-audio-formats .adhub-audio-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleAudioDownload(btn.dataset.audio);
      });
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
      dropdown.classList.toggle('hidden');
      if (!dropdown.classList.contains('hidden')) {
        loadVideoInfo();
      }
    }
  }

  function closeDropdown() {
    const dropdown = document.getElementById('adhub-dropdown-menu');
    if (dropdown) dropdown.classList.add('hidden');
  }

  // ============================================================================
  // STAHOVÁNÍ
  // ============================================================================

  async function handleDownload() {
    if (state.isDownloading) {
      showNotification('Stahování již probíhá...', 'warning');
      return;
    }

    const videoId = getVideoId();
    if (!videoId) {
      showNotification('Video nenalezeno', 'error');
      return;
    }

    closeDropdown();

    const quality = state.preferences.quality === 'best' ? state.bestQuality : state.preferences.quality;
    const format = state.preferences.format;

    log(`Starting download: ${videoId}, ${format}, ${quality}p`);
    await startDownload(videoId, format, quality);
  }

  async function handleAudioDownload(audioFormat) {
    if (state.isDownloading) {
      showNotification('Stahování již probíhá...', 'warning');
      return;
    }

    const videoId = getVideoId();
    if (!videoId) {
      showNotification('Video nenalezeno', 'error');
      return;
    }

    closeDropdown();

    log(`Starting audio download: ${videoId}, ${audioFormat}`);
    await startDownload(videoId, null, null, audioFormat);
  }

  // ============================================================================
  // UI AKTUALIZACE
  // ============================================================================

  async function loadVideoInfo() {
    const videoId = getVideoId();
    if (!videoId || videoId === state.currentVideoId) return;

    state.currentVideoId = videoId;

    if (state.serverOnline) {
      await getVideoInfo(videoId);
      updateQualityOptions();
      updateVideoInfoDisplay();
    }
  }

  function updateQualityOptions() {
    const container = document.getElementById('adhub-quality-options');
    if (!container) return;

    let html = '<button class="adhub-quality-btn active" data-quality="best">Nejlepší</button>';

    state.availableQualities.forEach(q => {
      const label = q >= 2160 ? '4K' : q >= 1440 ? '2K' : `${q}p`;
      html += `<button class="adhub-quality-btn" data-quality="${q}">${label}</button>`;
    });

    container.innerHTML = html;

    // Event listenery pro kvalitu
    container.querySelectorAll('.adhub-quality-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        container.querySelectorAll('.adhub-quality-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.preferences.quality = btn.dataset.quality;
      });
    });
  }

  function updateVideoInfoDisplay() {
    const infoEl = document.getElementById('adhub-video-info');
    if (!infoEl || !state.videoInfo) return;

    const duration = state.videoInfo.duration_str || '';
    const best = state.bestQuality ? `${state.bestQuality}p` : '';

    infoEl.textContent = `${best} • ${duration}`;
  }

  function updateServerIndicator() {
    const dot = document.getElementById('adhub-server-dot');
    if (dot) {
      dot.classList.toggle('online', state.serverOnline);
      dot.classList.toggle('offline', !state.serverOnline);
      dot.title = state.serverOnline ? 'Server aktivní' : 'Server offline - spusťte yt_server.py';
    }
  }

  // ============================================================================
  // PROGRESS OVERLAY
  // ============================================================================

  function showProgressOverlay() {
    let overlay = document.getElementById('adhub-progress-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'adhub-progress-overlay';
      overlay.innerHTML = `
        <div class="adhub-progress-card">
          <div class="adhub-progress-header">
            <svg class="adhub-progress-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 2h14v2H5v-2z"/>
            </svg>
            <span>Stahování</span>
          </div>
          <div class="adhub-progress-bar-container">
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
    const overlay = document.getElementById('adhub-progress-overlay');
    if (overlay) overlay.classList.remove('visible');
  }

  function updateProgress(percent, text) {
    const bar = document.getElementById('adhub-progress-bar');
    const textEl = document.getElementById('adhub-progress-text');

    if (bar) bar.style.width = `${percent}%`;
    if (textEl) textEl.textContent = text;
  }

  // ============================================================================
  // NOTIFIKACE
  // ============================================================================

  function showNotification(message, type = 'info', duration = 4000) {
    const existing = document.querySelector('.adhub-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `adhub-notification adhub-notification-${type}`;
    notification.innerHTML = `
      <span class="adhub-notification-text">${message}</span>
      <button class="adhub-notification-close">&times;</button>
    `;

    document.body.appendChild(notification);

    notification.querySelector('.adhub-notification-close').addEventListener('click', () => {
      notification.classList.remove('visible');
      setTimeout(() => notification.remove(), 300);
    });

    requestAnimationFrame(() => notification.classList.add('visible'));

    if (duration > 0) {
      setTimeout(() => {
        notification.classList.remove('visible');
        setTimeout(() => notification.remove(), 300);
      }, duration);
    }
  }

  function showDownloadComplete(filename, filepath) {
    const existing = document.querySelector('.adhub-complete-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'adhub-complete-toast';
    toast.innerHTML = `
      <div class="adhub-complete-icon">✓</div>
      <div class="adhub-complete-content">
        <div class="adhub-complete-title">Stahování dokončeno</div>
        <div class="adhub-complete-filename">${filename}</div>
        <div class="adhub-complete-path">Uloženo: ${filepath}</div>
      </div>
      <button class="adhub-complete-close">&times;</button>
    `;

    document.body.appendChild(toast);

    toast.querySelector('.adhub-complete-close').addEventListener('click', () => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    });

    requestAnimationFrame(() => toast.classList.add('visible'));

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 8000);
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
    window.addEventListener('yt-navigate-finish', () => setTimeout(handlePageChange, 500));
  }

  function handlePageChange() {
    state.currentVideoId = null;
    state.videoInfo = null;
    state.bestQuality = null;
    state.availableQualities = [];

    const old = document.getElementById('adhub-yt-downloader');
    if (old) old.remove();

    if (getVideoId()) {
      setTimeout(init, 500);
    }
  }

  // ============================================================================
  // INICIALIZACE
  // ============================================================================

  async function init() {
    if (!getVideoId()) return;

    // Zkontrolovat server
    await checkServer();

    // Injektovat tlačítko
    let attempts = 0;
    const tryInject = () => {
      if (injectButton()) return;
      attempts++;
      if (attempts < 30) setTimeout(tryInject, 1000);
    };
    tryInject();

    // Periodická kontrola serveru
    setInterval(checkServer, 30000);
  }

  // Start
  setupNavigationObserver();

  if (document.readyState === 'complete') {
    setTimeout(init, 500);
  } else {
    window.addEventListener('load', () => setTimeout(init, 500));
  }

})();
