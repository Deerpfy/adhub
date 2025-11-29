/**
 * AdHub YouTube Downloader v5.4 - Content Script
 *
 * Hybridni rezim:
 * - Zakladni: Formaty s primym URL (max 720p)
 * - Rozsireny: Vsechny formaty pres native host (4K, MP3, atd.)
 */

(function() {
  'use strict';

  if (window.top !== window.self) return;
  if (window.__ADHUB_YT_DL_V54__) return;
  window.__ADHUB_YT_DL_V54__ = true;

  console.log('[AdHub] YouTube Downloader v5.4 (Hybrid)');

  // ============================================================================
  // STAV
  // ============================================================================

  const state = {
    currentVideoId: null,
    videoTitle: '',
    videoUrl: '',
    formats: [],
    bestFormat: null,
    isDownloading: false,
    advancedMode: false,
  };

  // ============================================================================
  // INIT - DETEKCE REZIMU
  // ============================================================================

  async function checkAdvancedMode() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'checkNativeHost' });
      state.advancedMode = response?.nativeHostAvailable && response?.ytdlpAvailable;
      console.log('[AdHub] Advanced mode:', state.advancedMode);
      return state.advancedMode;
    } catch (e) {
      state.advancedMode = false;
      return false;
    }
  }

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

  function parseFormats(playerResponse) {
    if (!playerResponse?.streamingData) return [];

    const { formats = [], adaptiveFormats = [] } = playerResponse.streamingData;
    const videoDetails = playerResponse.videoDetails || {};
    const allFormats = [];

    state.videoTitle = videoDetails.title || document.title.replace(' - YouTube', '');
    state.videoUrl = `https://www.youtube.com/watch?v=${videoDetails.videoId || getVideoId()}`;

    // Progressive formaty (video + audio)
    for (const f of formats) {
      if (f.url) {
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
          requiresNative: false,
        });
      }
    }

    // Adaptive formaty (oddelene video/audio)
    for (const f of adaptiveFormats) {
      if (f.url) {
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
          requiresNative: false,
        });
      }
    }

    // Seradit
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

    console.log('[AdHub] Nalezeno formatu:', formats.length, 'Advanced:', state.advancedMode);
    return formats;
  }

  // ============================================================================
  // ROZSIRENE FORMATY (pro advanced mode)
  // ============================================================================

  function getAdvancedFormats() {
    return [
      { id: 'best', label: 'Nejlepsi kvalita', type: 'video', quality: 'best', requiresNative: true },
      { id: '4k', label: '4K (2160p)', type: 'video', quality: '2160', requiresNative: true },
      { id: '1440p', label: '2K (1440p)', type: 'video', quality: '1440', requiresNative: true },
      { id: '1080p', label: 'Full HD (1080p)', type: 'video', quality: '1080', requiresNative: true },
      { id: 'mp3', label: 'MP3 Audio', type: 'audio', audioFormat: 'mp3', requiresNative: true },
      { id: 'wav', label: 'WAV Audio', type: 'audio', audioFormat: 'wav', requiresNative: true },
      { id: 'flac', label: 'FLAC Audio', type: 'audio', audioFormat: 'flac', requiresNative: true },
    ];
  }

  // ============================================================================
  // STAHOVANI
  // ============================================================================

  async function downloadFormat(format) {
    if (state.isDownloading) {
      showNotification('Stahovani jiz probiha...', 'warning');
      return;
    }

    state.isDownloading = true;
    showProgressOverlay();
    updateProgress(10, 'Pripravuji stahovani...');

    try {
      if (format.requiresNative) {
        await downloadAdvanced(format);
      } else if (format.url) {
        await downloadBasic(format);
      } else {
        throw new Error('Tento format neni dostupny');
      }
    } catch (e) {
      console.error('[AdHub] Download error:', e);
      hideProgressOverlay();
      showNotification(`Chyba: ${e.message}`, 'error');
    } finally {
      state.isDownloading = false;
    }
  }

  async function downloadBasic(format) {
    const title = sanitizeFilename(state.videoTitle || 'video');
    const quality = format.quality || '';
    const filename = `${title} [${quality}].${format.ext}`;

    updateProgress(30, 'Zahajuji stahovani...');

    const response = await chrome.runtime.sendMessage({
      action: 'download',
      data: {
        url: format.url,
        filename: filename,
      }
    });

    if (response.success) {
      updateProgress(100, 'Stahovani zahajeno!');
      setTimeout(() => {
        hideProgressOverlay();
        showDownloadComplete(filename);
      }, 1500);
    } else {
      throw new Error(response.error || 'Stahovani selhalo');
    }
  }

  async function downloadAdvanced(format) {
    updateProgress(20, 'Pripojuji k native host...');

    const response = await chrome.runtime.sendMessage({
      action: 'downloadAdvanced',
      data: {
        videoUrl: state.videoUrl,
        format: format.type === 'audio' ? 'audio' : 'video',
        quality: format.quality || 'best',
        audioFormat: format.audioFormat,
      }
    });

    if (response.success) {
      updateProgress(100, 'Stahovani zahajeno!');
      const filename = response.filename || `${state.videoTitle}.${format.audioFormat || 'mp4'}`;
      setTimeout(() => {
        hideProgressOverlay();
        showDownloadComplete(filename);
      }, 1500);
    } else {
      throw new Error(response.error || 'Stahovani selhalo');
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
  // UI - TLACITKO
  // ============================================================================

  function createDownloadButton() {
    const container = document.createElement('div');
    container.id = 'adhub-yt-downloader';
    container.innerHTML = `
      <div class="adhub-btn-group">
        <button id="adhub-download-main" class="adhub-btn-main" title="Stahnout video">
          <svg class="adhub-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 2h14v2H5v-2z"/>
          </svg>
          <span class="adhub-btn-label">Stahnout</span>
          <span class="adhub-mode-badge" id="adhub-mode-badge" style="display:none">HD</span>
        </button>
        <button id="adhub-dropdown-toggle" class="adhub-btn-arrow" title="Vice moznosti">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
      </div>

      <div id="adhub-dropdown-menu" class="adhub-dropdown hidden">
        <div class="adhub-dropdown-header">
          <span>Vyberte kvalitu</span>
          <span class="adhub-mode-label" id="adhub-mode-label">Zakladni</span>
        </div>
        <div id="adhub-formats-list" class="adhub-formats-list">
          <div class="adhub-loading">Nacitam...</div>
        </div>
      </div>
    `;
    return container;
  }

  async function injectButton() {
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

    const likeBtn = target.querySelector('ytd-segmented-like-dislike-button-renderer, ytd-toggle-button-renderer');
    if (likeBtn?.nextSibling) {
      target.insertBefore(button, likeBtn.nextSibling);
    } else {
      target.appendChild(button);
    }

    setupEventListeners();

    // Zkontroluj advanced mode
    await checkAdvancedMode();
    updateModeIndicator();

    console.log('[AdHub] Tlacitko injektovano');
    return true;
  }

  function updateModeIndicator() {
    const badge = document.getElementById('adhub-mode-badge');
    const label = document.getElementById('adhub-mode-label');

    if (state.advancedMode) {
      if (badge) {
        badge.style.display = 'inline-block';
        badge.textContent = 'HD';
      }
      if (label) {
        label.textContent = 'Rozsireny';
        label.style.color = '#4ade80';
      }
    } else {
      if (badge) badge.style.display = 'none';
      if (label) {
        label.textContent = 'Zakladni';
        label.style.color = '#888';
      }
    }
  }

  function setupEventListeners() {
    document.getElementById('adhub-download-main')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      loadVideoFormats();

      if (state.advancedMode) {
        downloadFormat({ id: 'best', type: 'video', quality: 'best', requiresNative: true });
      } else if (state.bestFormat) {
        downloadFormat(state.bestFormat);
      } else {
        showNotification('Zadne formaty k dispozici. Zkuste obnovit stranku.', 'error');
      }
    });

    document.getElementById('adhub-dropdown-toggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDropdown();
    });

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
    let html = '';

    // V advanced mode pridej rozsirene formaty
    if (state.advancedMode) {
      html += '<div class="adhub-format-group"><div class="adhub-format-group-title">HD Video (yt-dlp)</div>';

      const advFormats = getAdvancedFormats().filter(f => f.type === 'video');
      for (const f of advFormats) {
        html += `
          <button class="adhub-format-btn adhub-format-advanced" data-advanced="${f.id}" data-quality="${f.quality}">
            <span class="adhub-format-quality">${f.label}</span>
            <span class="adhub-format-info">MP4</span>
          </button>
        `;
      }
      html += '</div>';

      html += '<div class="adhub-format-group"><div class="adhub-format-group-title">Audio (yt-dlp)</div>';
      const audioFormats = getAdvancedFormats().filter(f => f.type === 'audio');
      for (const f of audioFormats) {
        html += `
          <button class="adhub-format-btn adhub-format-advanced" data-advanced="${f.id}" data-audio="${f.audioFormat}">
            <span class="adhub-format-quality">${f.label}</span>
            <span class="adhub-format-info">${f.audioFormat.toUpperCase()}</span>
          </button>
        `;
      }
      html += '</div>';
    }

    // Zakladni formaty
    const videoAudio = state.formats.filter(f => f.type === 'video+audio');
    if (videoAudio.length > 0) {
      html += `<div class="adhub-format-group"><div class="adhub-format-group-title">Video + Audio${state.advancedMode ? ' (prime)' : ''}</div>`;
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

    // Audio formaty
    const audio = state.formats.filter(f => f.type === 'audio');
    if (audio.length > 0 && !state.advancedMode) {
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

    if (!html) {
      html = '<div class="adhub-error">Zadne dostupne formaty</div>';
    }

    list.innerHTML = html;

    // Event listenery pro zakladni formaty
    list.querySelectorAll('.adhub-format-btn:not(.adhub-format-advanced)').forEach(btn => {
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

    // Event listenery pro advanced formaty
    list.querySelectorAll('.adhub-format-advanced').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.advanced;
        const quality = btn.dataset.quality;
        const audioFormat = btn.dataset.audio;

        closeDropdown();
        downloadFormat({
          id: id,
          type: audioFormat ? 'audio' : 'video',
          quality: quality || 'best',
          audioFormat: audioFormat,
          requiresNative: true
        });
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
            <span>Stahovani</span>
          </div>
          <div class="adhub-progress-bar-bg">
            <div id="adhub-progress-bar" class="adhub-progress-bar"></div>
          </div>
          <div id="adhub-progress-text" class="adhub-progress-text">Pripravuji...</div>
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
      <div class="adhub-complete-icon">OK</div>
      <div class="adhub-complete-content">
        <div class="adhub-complete-title">Stahovani zahajeno!</div>
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

  async function init() {
    if (!getVideoId()) return;

    let attempts = 0;
    const tryInject = async () => {
      if (await injectButton()) return;
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
