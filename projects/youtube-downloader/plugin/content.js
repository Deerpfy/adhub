/**
 * AdHub YouTube Downloader v5.5 - Content Script
 *
 * Hybridni rezim s kompletnim pokrytim vsech typu videi:
 * - Zakladni: Formaty s primym URL (max 720p)
 * - Rozsireny: Vsechny formaty pres native host (4K, MP3, atd.)
 *
 * Podporovane typy:
 * - Bezna videa, Shorts, Embedovana videa
 * - Vekove omezena (s cookies)
 * - Zive prenosy (pouze pres yt-dlp)
 * - YouTube Music
 */

(function() {
  'use strict';

  if (window.top !== window.self) return;
  if (window.__ADHUB_YT_DL_V55__) return;
  window.__ADHUB_YT_DL_V55__ = true;

  console.log('[AdHub] YouTube Downloader v5.5 (Hybrid)');

  // ============================================================================
  // KONSTANTY
  // ============================================================================

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

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
    advancedModeChecked: false, // Zabrání opakovanému checkování
    videoType: 'regular', // regular, shorts, live, premiere, music, unavailable
    videoStatus: null,    // playable, age_restricted, private, unavailable
    isYouTubeMusic: window.location.hostname === 'music.youtube.com',
  };

  // ============================================================================
  // INIT - DETEKCE REZIMU
  // ============================================================================

  async function checkAdvancedMode() {
    // Zkontroluj pouze jednou za session
    if (state.advancedModeChecked) {
      return state.advancedMode;
    }

    try {
      const response = await chrome.runtime.sendMessage({ action: 'checkNativeHost' });
      state.advancedMode = response?.nativeHostAvailable && response?.ytdlpAvailable;
      state.advancedModeChecked = true;
      console.log('[AdHub] Advanced mode:', state.advancedMode);
      return state.advancedMode;
    } catch (e) {
      state.advancedMode = false;
      state.advancedModeChecked = true;
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

  function detectVideoType() {
    const url = window.location.href;
    if (state.isYouTubeMusic) return 'music';
    if (url.includes('/shorts/')) return 'shorts';
    if (url.includes('/embed/')) return 'embed';
    if (url.includes('/live/')) return 'live';
    return 'regular';
  }

  function extractPlayerResponse() {
    // Metoda 1: Globalni promenna
    if (window.ytInitialPlayerResponse) {
      return window.ytInitialPlayerResponse;
    }

    // Metoda 2: ytplayer.config
    if (window.ytplayer?.config?.args?.player_response) {
      try {
        return JSON.parse(window.ytplayer.config.args.player_response);
      } catch (e) {}
    }

    // Metoda 3: Z HTML scriptu
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent || '';

      // Varianta A: ytInitialPlayerResponse
      let match = text.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch (e) {}
      }

      // Varianta B: var ytInitialPlayerResponse
      match = text.match(/var\s+ytInitialPlayerResponse\s*=\s*({.+?});/s);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch (e) {}
      }
    }

    return null;
  }

  function analyzeVideoStatus(playerResponse) {
    if (!playerResponse) {
      return { status: 'unavailable', reason: 'no_data', message: 'Data videa nejsou dostupna' };
    }

    const playability = playerResponse.playabilityStatus || {};
    const status = playability.status;

    // Zive vysilani
    if (playerResponse.videoDetails?.isLive) {
      return { status: 'live', reason: 'live_stream', message: 'Zive vysilani - pouzijte yt-dlp' };
    }

    // Premiery
    if (playerResponse.videoDetails?.isUpcoming) {
      return { status: 'premiere', reason: 'upcoming', message: 'Video jeste nezacalo' };
    }

    switch (status) {
      case 'OK':
        return { status: 'playable', reason: null, message: null };

      case 'LOGIN_REQUIRED':
        if (playability.reason?.includes('age')) {
          return { status: 'age_restricted', reason: 'age', message: 'Vekove omezene - pouzijte yt-dlp s cookies' };
        }
        return { status: 'login_required', reason: 'login', message: 'Vyzaduje prihlaseni' };

      case 'UNPLAYABLE':
        return { status: 'unavailable', reason: 'unplayable', message: playability.reason || 'Video nelze prehrat' };

      case 'ERROR':
        return { status: 'unavailable', reason: 'error', message: playability.reason || 'Video neni dostupne' };

      case 'LIVE_STREAM_OFFLINE':
        return { status: 'unavailable', reason: 'offline', message: 'Zivy prenos skoncil' };

      default:
        if (playability.reason) {
          return { status: 'unavailable', reason: 'unknown', message: playability.reason };
        }
        return { status: 'playable', reason: null, message: null };
    }
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

    // Detekce typu videa
    state.videoType = detectVideoType();

    const playerResponse = extractPlayerResponse();

    // Analyzuj status videa
    const statusInfo = analyzeVideoStatus(playerResponse);
    state.videoStatus = statusInfo;

    console.log('[AdHub] Video type:', state.videoType, 'Status:', statusInfo.status);

    // Pokud video neni prehravatelne, zkontroluj jestli muzeme pouzit advanced mode
    if (statusInfo.status !== 'playable') {
      if (state.advancedMode) {
        // V advanced mode muzeme stahnout i problematicka videa
        console.log('[AdHub] Video neni primo prehravatelne, pouzije se yt-dlp');
      } else {
        console.log('[AdHub] Video neni dostupne:', statusInfo.message);
      }
    }

    if (!playerResponse) {
      console.log('[AdHub] Player response nenalezen');
      return [];
    }

    const formats = parseFormats(playerResponse);
    state.formats = formats;
    state.bestFormat = formats.find(f => f.type === 'video+audio') || formats[0];
    state.currentVideoId = videoId;
    state.videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

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
      { id: '720p', label: 'HD (720p)', type: 'video', quality: '720', requiresNative: true },
      { id: '480p', label: 'SD (480p)', type: 'video', quality: '480', requiresNative: true },
      { id: 'mp3', label: 'MP3 Audio', type: 'audio', audioFormat: 'mp3', requiresNative: true },
      { id: 'wav', label: 'WAV Audio', type: 'audio', audioFormat: 'wav', requiresNative: true },
      { id: 'flac', label: 'FLAC Audio', type: 'audio', audioFormat: 'flac', requiresNative: true },
      { id: 'ogg', label: 'OGG Audio', type: 'audio', audioFormat: 'ogg', requiresNative: true },
    ];
  }

  // ============================================================================
  // STAHOVANI
  // ============================================================================

  async function downloadFormat(format, retryCount = 0) {
    if (state.isDownloading && retryCount === 0) {
      showNotification('Stahovani jiz probiha...', 'warning');
      return;
    }

    state.isDownloading = true;
    showProgressOverlay();

    // Kontrola statusu videa
    if (state.videoStatus?.status !== 'playable' && !format.requiresNative && !state.advancedMode) {
      hideProgressOverlay();
      state.isDownloading = false;

      const msg = state.videoStatus?.message || 'Video neni dostupne';
      if (state.videoStatus?.status === 'age_restricted' || state.videoStatus?.status === 'live') {
        showNotification(`${msg}. Nainstalujte yt-dlp pro rozsireny rezim.`, 'warning');
      } else {
        showNotification(msg, 'error');
      }
      return;
    }

    updateProgress(10, 'Pripravuji stahovani...');

    try {
      if (format.requiresNative) {
        await downloadAdvanced(format);
      } else if (format.url) {
        await downloadBasic(format);
      } else if (state.advancedMode) {
        // Zkus stahnout pres yt-dlp pokud neni prime URL
        console.log('[AdHub] Zadne prime URL, zkousim yt-dlp');
        await downloadAdvanced({ ...format, requiresNative: true, quality: 'best' });
      } else {
        throw new Error('Tento format neni dostupny. Zkuste rozsireny rezim (yt-dlp).');
      }
    } catch (e) {
      console.error('[AdHub] Download error:', e);

      // Retry logika
      if (retryCount < MAX_RETRIES && shouldRetry(e.message)) {
        console.log(`[AdHub] Retry ${retryCount + 1}/${MAX_RETRIES}...`);
        updateProgress(10, `Zkousim znovu (${retryCount + 1}/${MAX_RETRIES})...`);
        await sleep(RETRY_DELAY);
        return downloadFormat(format, retryCount + 1);
      }

      hideProgressOverlay();
      showNotification(`Chyba: ${e.message}`, 'error');
    } finally {
      if (retryCount === 0 || retryCount >= MAX_RETRIES) {
        state.isDownloading = false;
      }
    }
  }

  function shouldRetry(errorMessage) {
    const retryableErrors = [
      'network', 'timeout', 'connection', 'ECONNRESET',
      'fetch', 'Failed to fetch', 'NetworkError'
    ];
    return retryableErrors.some(err => errorMessage.toLowerCase().includes(err.toLowerCase()));
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

    if (!response) {
      throw new Error('Zadna odpoved od extension');
    }

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

    if (!response) {
      throw new Error('Zadna odpoved od extension');
    }

    if (response.success) {
      updateProgress(100, 'Stahovani zahajeno!');
      const filename = response.filename || `${state.videoTitle}.${format.audioFormat || 'mp4'}`;
      setTimeout(() => {
        hideProgressOverlay();
        showDownloadComplete(filename);
      }, 1500);
    } else {
      // Zobrazit vice detailu pro ladeni
      const errorMsg = response.error || 'Stahovani selhalo';
      if (response.raw_error) {
        console.error('[AdHub] Raw yt-dlp error:', response.raw_error);
      }
      throw new Error(errorMsg);
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
    // Pokud tlacitko uz existuje, nic nedelej
    if (document.getElementById('adhub-yt-downloader')) {
      return true;
    }

    let target = null;

    if (state.isYouTubeMusic) {
      // YouTube Music selektory - preferuj right-controls pro lepsi pozici
      const musicSelectors = [
        'ytmusic-player-bar .right-controls-buttons',
        'ytmusic-player-bar .middle-controls-buttons',
        '.ytmusic-player-bar .right-controls',
        'ytmusic-player-bar',
      ];

      for (const sel of musicSelectors) {
        target = document.querySelector(sel);
        if (target) break;
      }
    } else {
      // Standardni YouTube selektory
      const selectors = [
        '#top-level-buttons-computed',
        'ytd-menu-renderer #top-level-buttons',
        '#actions ytd-menu-renderer',
      ];

      for (const sel of selectors) {
        target = document.querySelector(sel);
        if (target) break;
      }
    }

    if (!target) return false;

    const button = createDownloadButton();

    if (state.isYouTubeMusic) {
      // Pro YouTube Music vlozit na zacatek (prepend) pro lepsi viditelnost
      target.prepend(button);
    } else {
      const likeBtn = target.querySelector('ytd-segmented-like-dislike-button-renderer, ytd-toggle-button-renderer');
      if (likeBtn?.nextSibling) {
        target.insertBefore(button, likeBtn.nextSibling);
      } else {
        target.appendChild(button);
      }
    }

    setupEventListeners();

    // Zkontroluj advanced mode (pouze jednou)
    await checkAdvancedMode();
    updateModeIndicator();

    // Log jen pri prvnim vytvoreni
    if (!state.advancedModeChecked || state.advancedMode !== undefined) {
      console.log('[AdHub] Tlacitko injektovano', state.isYouTubeMusic ? '(YouTube Music)' : '');
    }

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
    let lastMusicTitle = ''; // Pro detekci zmeny skladby na YouTube Music

    // Sledovani URL
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        handlePageChange(false);
      }
    }, 500);

    // YouTube eventy
    window.addEventListener('yt-navigate-finish', () => setTimeout(() => handlePageChange(false), 500));

    // YouTube Music - specialni handling
    if (state.isYouTubeMusic) {
      // Sleduj zmenu skladby podle titulku v player baru
      setInterval(() => {
        const titleEl = document.querySelector('ytmusic-player-bar .title');
        const currentTitle = titleEl?.textContent?.trim() || '';

        if (currentTitle && currentTitle !== lastMusicTitle) {
          lastMusicTitle = currentTitle;
          console.log('[AdHub] YouTube Music - nova skladba:', currentTitle);

          // Resetuj formaty ale NEZMAZEJ tlacitko
          state.formats = [];
          state.bestFormat = null;
          state.currentVideoId = getVideoId();

          // Pokud tlacitko neexistuje, vytvor ho
          if (!document.getElementById('adhub-yt-downloader')) {
            init();
          }
        }
      }, 1000);

      // Zajisti ze tlacitko existuje kdyz je player bar viditelny
      setInterval(() => {
        const playerBar = document.querySelector('ytmusic-player-bar');
        const hasButton = document.getElementById('adhub-yt-downloader');

        if (playerBar && !hasButton) {
          init();
        }
      }, 2000);
    }
  }

  function handlePageChange(removeButton = true) {
    state.currentVideoId = null;
    state.formats = [];
    state.bestFormat = null;

    // Na YouTube Music nemazeme tlacitko pri kazde zmene
    if (removeButton && !state.isYouTubeMusic) {
      document.getElementById('adhub-yt-downloader')?.remove();
    }

    const videoId = getVideoId();
    if (videoId || state.isYouTubeMusic) {
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
