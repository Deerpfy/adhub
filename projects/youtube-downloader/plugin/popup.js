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
    tabContents: document.querySelectorAll('.tab-content'),
    // Method info elements
    methodInfo: document.getElementById('methodInfo'),
    methodBadge: document.getElementById('methodBadge'),
    methodDetailsBtn: document.getElementById('methodDetailsBtn'),
    methodErrors: document.getElementById('methodErrors')
  };

  // ============================================================================
  // STATE
  // ============================================================================

  const state = {
    currentVideoId: null,
    videoTitle: '',
    formats: null,
    method: null,
    errors: [],
    debug: null
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
      state.method = formatsResult.method || 'unknown';
      state.errors = formatsResult.errors || [];
      state.debug = formatsResult.debug || null;

      // Krok 4: Zobrazeni dat
      displayVideoInfo(videoInfo);
      displayFormats(formatsResult.formats);
      displayMethodInfo(state.method, state.errors);

      elements.loading.classList.remove('visible');
      elements.videoInfo.classList.add('visible');

      log('FETCH', 'Nacitani dokonceno');

    } catch (error) {
      logError('FETCH', 'Chyba pri nacitani', error);
      showError(error.message);
      elements.loading.classList.remove('visible');
      // Reset method info
      if (elements.methodBadge) {
        elements.methodBadge.textContent = 'Chyba';
        elements.methodBadge.className = 'method-badge error';
      }
      if (elements.methodErrors) {
        elements.methodErrors.classList.remove('visible');
      }
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
  // DISPLAY METHOD INFO - Zobrazeni pouzite metody a chyb
  // ============================================================================

  function displayMethodInfo(method, errors) {
    const methodNames = {
      'cobalt': 'Cobalt API',
      'invidious': 'Invidious',
      'direct': 'Primá extrakce',
      'unknown': 'Neznámá'
    };

    const badge = elements.methodBadge;
    badge.textContent = methodNames[method] || method;
    badge.className = 'method-badge ' + (method || 'unknown');

    // Zobrazit varovani pro direct metodu
    if (method === 'direct') {
      badge.title = 'Varovani: Primá extrakce nemusí fungovat spolehlivě';
    } else {
      badge.title = '';
    }

    // Zobrazit chyby, pokud nejake byly
    if (errors && errors.length > 0) {
      elements.methodErrors.innerHTML = `
        <div class="method-errors-title">Některé metody selhaly:</div>
        ${errors.map(e => `<div class="method-error-item">${escapeHtml(e)}</div>`).join('')}
      `;
      elements.methodErrors.classList.add('visible');
    } else {
      elements.methodErrors.classList.remove('visible');
    }

    // Nastavit event listener pro details button
    elements.methodDetailsBtn.onclick = () => {
      elements.methodErrors.classList.toggle('visible');
    };
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
  // DEBUG PANEL
  // ============================================================================

  const debugElements = {
    btn: document.getElementById('debugBtn'),
    panel: document.getElementById('debugPanel'),
    close: document.getElementById('debugClose'),
    content: document.getElementById('debugContent'),
    copy: document.getElementById('debugCopy'),
    refresh: document.getElementById('debugRefresh')
  };

  let debugReport = '';

  function setupDebugPanel() {
    debugElements.btn.addEventListener('click', () => {
      debugElements.panel.classList.add('visible');
      refreshDebugInfo();
    });

    debugElements.close.addEventListener('click', () => {
      debugElements.panel.classList.remove('visible');
    });

    debugElements.copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(debugReport);
        debugElements.copy.textContent = '✓ Zkopírovano!';
        setTimeout(() => {
          debugElements.copy.textContent = '📋 Kopírovat do schránky';
        }, 2000);
      } catch (e) {
        debugElements.copy.textContent = '✗ Chyba';
      }
    });

    debugElements.refresh.addEventListener('click', refreshDebugInfo);
  }

  async function refreshDebugInfo() {
    debugElements.content.textContent = 'Načítám debug informace...';

    const info = {
      timestamp: new Date().toISOString(),
      extension: {},
      tab: {},
      contentScript: {},
      youtube: {},
      errors: []
    };

    try {
      // Extension info
      const manifest = chrome.runtime.getManifest();
      info.extension = {
        id: chrome.runtime.id,
        version: manifest.version,
        name: manifest.name
      };

      // Current tab info
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        info.tab = {
          id: tab.id,
          url: tab.url,
          title: tab.title?.substring(0, 50),
          isYouTube: tab.url?.includes('youtube.com')
        };

        // Try to get info from content script
        if (info.tab.isYouTube) {
          try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getDebugInfo' });
            info.contentScript = response || { error: 'No response' };
          } catch (e) {
            info.contentScript = { error: e.message };
            info.errors.push(`Content script error: ${e.message}`);
          }

          // Execute script to check DOM
          try {
            const results = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                return {
                  url: window.location.href,
                  videoId: new URLSearchParams(window.location.search).get('v'),
                  dom: {
                    topLevelButtons: !!document.querySelector('#top-level-buttons-computed'),
                    topLevelButtonsChildren: document.querySelector('#top-level-buttons-computed')?.children.length || 0,
                    actions: !!document.querySelector('#actions'),
                    actionsInner: !!document.querySelector('#actions-inner'),
                    menuRenderer: !!document.querySelector('ytd-menu-renderer'),
                    adhubButton: !!document.querySelector('.adhub-download-btn'),
                    adhubModal: !!document.querySelector('.adhub-modal-overlay'),
                    pageScript: !!document.getElementById('adhub-page-script'),
                    adhubStyles: !!document.getElementById('adhub-yt-styles')
                  },
                  localStorage: {
                    active: localStorage.getItem('adhub_extension_active'),
                    id: localStorage.getItem('adhub_extension_id'),
                    version: localStorage.getItem('adhub_extension_version')
                  },
                  // Check all possible button containers
                  containers: [
                    '#top-level-buttons-computed',
                    '#actions',
                    '#actions-inner',
                    'ytd-menu-renderer',
                    '#menu-container',
                    'ytd-watch-metadata #actions'
                  ].map(sel => ({
                    selector: sel,
                    exists: !!document.querySelector(sel),
                    children: document.querySelector(sel)?.children.length || 0
                  }))
                };
              }
            });
            info.youtube = results[0]?.result || {};
          } catch (e) {
            info.youtube = { error: e.message };
            info.errors.push(`Script execution error: ${e.message}`);
          }
        }
      }

      // Test background connection
      try {
        const bgResponse = await sendMessage({ action: 'checkStatus' });
        info.background = bgResponse;
      } catch (e) {
        info.background = { error: e.message };
        info.errors.push(`Background error: ${e.message}`);
      }

    } catch (e) {
      info.errors.push(`General error: ${e.message}`);
    }

    // Format the report
    debugReport = formatDebugReport(info);
    debugElements.content.innerHTML = formatDebugReportHtml(info);
  }

  function formatDebugReport(info) {
    return `=== ADHUB DEBUG REPORT ===
Čas: ${info.timestamp}
Extension: ${info.extension.name} v${info.extension.version}
Extension ID: ${info.extension.id}

=== TAB ===
URL: ${info.tab.url || 'N/A'}
Je YouTube: ${info.tab.isYouTube ? 'ANO' : 'NE'}
Video ID: ${info.youtube.videoId || 'N/A'}

=== DOM STATUS ===
#top-level-buttons-computed: ${info.youtube.dom?.topLevelButtons ? 'ANO' : 'NE'} (${info.youtube.dom?.topLevelButtonsChildren || 0} dětí)
#actions: ${info.youtube.dom?.actions ? 'ANO' : 'NE'}
#actions-inner: ${info.youtube.dom?.actionsInner ? 'ANO' : 'NE'}
ytd-menu-renderer: ${info.youtube.dom?.menuRenderer ? 'ANO' : 'NE'}
AdHub tlačítko: ${info.youtube.dom?.adhubButton ? 'ANO' : 'NE'}
AdHub styly: ${info.youtube.dom?.adhubStyles ? 'ANO' : 'NE'}
Page script: ${info.youtube.dom?.pageScript ? 'ANO' : 'NE'}

=== KONTEJNERY ===
${(info.youtube.containers || []).map(c => `${c.selector}: ${c.exists ? 'ANO' : 'NE'} (${c.children} dětí)`).join('\n')}

=== LOCALSTORAGE ===
adhub_extension_active: ${info.youtube.localStorage?.active || 'N/A'}
adhub_extension_version: ${info.youtube.localStorage?.version || 'N/A'}

=== BACKGROUND ===
Status: ${info.background?.success ? 'OK' : 'ERROR'}
${info.background?.error || ''}

=== CONTENT SCRIPT ===
${JSON.stringify(info.contentScript, null, 2)}

=== ERRORS (${info.errors.length}) ===
${info.errors.join('\n') || '(žádné)'}

=== RAW DATA ===
${JSON.stringify(info, null, 2)}`;
  }

  function formatDebugReportHtml(info) {
    const ok = (val) => val ? '<span class="debug-ok">ANO</span>' : '<span class="debug-err">NE</span>';
    const dom = info.youtube.dom || {};
    const ls = info.youtube.localStorage || {};

    return `<div class="debug-section">
<div class="debug-section-title">EXTENSION</div>
${info.extension.name} v${info.extension.version}
ID: ${info.extension.id}
</div>

<div class="debug-section">
<div class="debug-section-title">TAB</div>
URL: ${info.tab.url || 'N/A'}
Je YouTube: ${ok(info.tab.isYouTube)}
Video ID: ${info.youtube.videoId || '<span class="debug-warn">N/A</span>'}
</div>

<div class="debug-section">
<div class="debug-section-title">DOM STATUS</div>
#top-level-buttons-computed: ${ok(dom.topLevelButtons)} (${dom.topLevelButtonsChildren || 0} dětí)
#actions: ${ok(dom.actions)}
#actions-inner: ${ok(dom.actionsInner)}
ytd-menu-renderer: ${ok(dom.menuRenderer)}
<strong>AdHub tlačítko: ${ok(dom.adhubButton)}</strong>
AdHub styly: ${ok(dom.adhubStyles)}
Page script: ${ok(dom.pageScript)}
</div>

<div class="debug-section">
<div class="debug-section-title">KONTEJNERY</div>
${(info.youtube.containers || []).map(c => `${c.selector}: ${ok(c.exists)} (${c.children} dětí)`).join('\n')}
</div>

<div class="debug-section">
<div class="debug-section-title">LOCALSTORAGE</div>
active: ${ls.active || '<span class="debug-warn">N/A</span>'}
version: ${ls.version || '<span class="debug-warn">N/A</span>'}
</div>

<div class="debug-section">
<div class="debug-section-title">BACKGROUND</div>
Status: ${info.background?.success ? '<span class="debug-ok">OK</span>' : '<span class="debug-err">ERROR</span>'}
${info.background?.error ? `<span class="debug-err">${info.background.error}</span>` : ''}
</div>

<div class="debug-section">
<div class="debug-section-title">ERRORS (${info.errors.length})</div>
${info.errors.length ? info.errors.map(e => `<span class="debug-err">${e}</span>`).join('\n') : '<span class="debug-ok">(žádné)</span>'}
</div>`;
  }

  // ============================================================================
  // START
  // ============================================================================

  document.addEventListener('DOMContentLoaded', () => {
    init();
    setupDebugPanel();
  });

})();
