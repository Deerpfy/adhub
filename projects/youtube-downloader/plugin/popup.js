/**
 * AdHub YouTube Downloader v5.5 - Popup Script
 * Hybridni rezim: zakladni stahovani + volitelne rozsirene funkce
 * Nove v5.5: Automaticke cookies pro vekove omezena videa
 */

(function() {
  'use strict';

  // ============================================================================
  // KONFIGURACE
  // ============================================================================

  const NATIVE_HOST = 'com.adhub.ytdownloader';
  const STORAGE_KEY = 'adhub_yt_settings';

  // ============================================================================
  // STAV
  // ============================================================================

  const state = {
    settings: {
      ytdlpPath: '',
      ffmpegPath: '',
      nativeHostInstalled: false
    }
  };

  // ============================================================================
  // DOM PRVKY
  // ============================================================================

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ============================================================================
  // INIT
  // ============================================================================

  async function init() {
    console.log('[Popup] Inicializace v5.5');

    // Nacti nastaveni
    await loadSettings();

    // Nastav tab switching
    setupTabs();

    // Nastav event listenery
    setupEventListeners();

    // Zkontroluj status nastroju
    await checkToolsStatus();
  }

  // ============================================================================
  // NASTAVENI - LOAD / SAVE
  // ============================================================================

  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      if (result[STORAGE_KEY]) {
        state.settings = { ...state.settings, ...result[STORAGE_KEY] };
        console.log('[Popup] Nastaveni nacteno:', state.settings);
      }

      // Vyplnit inputy
      const ytdlpInput = $('#ytdlp-path');
      const ffmpegInput = $('#ffmpeg-path');

      if (ytdlpInput && state.settings.ytdlpPath) {
        ytdlpInput.value = state.settings.ytdlpPath;
      }
      if (ffmpegInput && state.settings.ffmpegPath) {
        ffmpegInput.value = state.settings.ffmpegPath;
      }
    } catch (e) {
      console.error('[Popup] Chyba pri nacitani nastaveni:', e);
    }
  }

  async function saveSettings() {
    try {
      const ytdlpPath = $('#ytdlp-path')?.value?.trim() || '';
      const ffmpegPath = $('#ffmpeg-path')?.value?.trim() || '';

      state.settings.ytdlpPath = ytdlpPath;
      state.settings.ffmpegPath = ffmpegPath;

      await chrome.storage.local.set({
        [STORAGE_KEY]: state.settings
      });

      console.log('[Popup] Nastaveni ulozeno:', state.settings);
      showToast('Nastaveni ulozeno!');

      // Posli nastaveni do background scriptu
      await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: state.settings
      });

      // Aktualizuj status
      await checkToolsStatus();

    } catch (e) {
      console.error('[Popup] Chyba pri ukladani:', e);
      showToast('Chyba pri ukladani!', true);
    }
  }

  // ============================================================================
  // STATUS KONTROLA
  // ============================================================================

  async function checkToolsStatus() {
    // Zkontroluj native host
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'checkNativeHost'
      });

      if (response?.nativeHostAvailable) {
        state.settings.nativeHostInstalled = true;
        updateToolStatus('ytdlp', response.ytdlpAvailable, response.ytdlpVersion);
        updateToolStatus('ffmpeg', response.ffmpegAvailable, response.ffmpegVersion);
      } else {
        state.settings.nativeHostInstalled = false;
        updateToolStatus('ytdlp', false);
        updateToolStatus('ffmpeg', false);
      }
    } catch (e) {
      console.log('[Popup] Native host neni dostupny:', e.message);
      updateToolStatus('ytdlp', false);
      updateToolStatus('ffmpeg', false);
    }
  }

  function updateToolStatus(tool, available, version = null) {
    const statusEl = $(`#status-${tool}`);
    if (!statusEl) return;

    if (available) {
      statusEl.className = 'feature-status ok';
      statusEl.textContent = version ? `v${version}` : 'Aktivni';
    } else {
      statusEl.className = 'feature-status missing';
      statusEl.textContent = tool === 'ytdlp' ? 'Chybi yt-dlp' : 'Chybi ffmpeg';
    }
  }

  // ============================================================================
  // TEST NASTROJU
  // ============================================================================

  async function testTool(tool) {
    const pathInput = $(`#${tool}-path`);
    const statusEl = $(`#${tool}-status`);

    if (!pathInput || !statusEl) return;

    const path = pathInput.value.trim();
    if (!path) {
      statusEl.className = 'path-status invalid';
      statusEl.textContent = 'Zadejte cestu k nastroji';
      return;
    }

    statusEl.className = 'path-status';
    statusEl.textContent = 'Testuji...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'testTool',
        tool: tool,
        path: path
      });

      if (response?.success) {
        pathInput.classList.remove('invalid');
        pathInput.classList.add('valid');
        statusEl.className = 'path-status valid';
        statusEl.textContent = `OK - ${response.version || 'nalezeno'}`;
      } else {
        pathInput.classList.remove('valid');
        pathInput.classList.add('invalid');
        statusEl.className = 'path-status invalid';
        statusEl.textContent = response?.error || 'Nastroj nenalezen';
      }
    } catch (e) {
      pathInput.classList.remove('valid');
      pathInput.classList.add('invalid');
      statusEl.className = 'path-status invalid';
      statusEl.textContent = 'Native host neni nainstalovan';
    }
  }

  // ============================================================================
  // TAB SWITCHING
  // ============================================================================

  function setupTabs() {
    $$('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;

        // Aktivni tab
        $$('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Aktivni content
        $$('.tab-content').forEach(c => c.classList.remove('active'));
        $(`#tab-${tabName}`)?.classList.add('active');
      });
    });
  }

  // ============================================================================
  // EVENT LISTENERY
  // ============================================================================

  function setupEventListeners() {
    // Test tlacitka
    $('#test-ytdlp')?.addEventListener('click', () => testTool('ytdlp'));
    $('#test-ffmpeg')?.addEventListener('click', () => testTool('ffmpeg'));

    // Ulozit nastaveni
    $('#save-settings')?.addEventListener('click', saveSettings);

    // Enter v inputech
    $('#ytdlp-path')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') testTool('ytdlp');
    });

    $('#ffmpeg-path')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') testTool('ffmpeg');
    });

    // Stahnout instalator
    $('#download-installer-win')?.addEventListener('click', () => downloadInstaller('windows'));
    $('#download-installer-unix')?.addEventListener('click', () => downloadInstaller('unix'));
  }

  // ============================================================================
  // INSTALATOR - STAZENI
  // ============================================================================

  async function downloadInstaller(platform) {
    showToast('Generuji instalator...');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'generateInstaller',
        platform: platform
      });

      if (response?.success && response?.content) {
        // Stahnout soubor - pro Windows .bat, pro Unix .sh
        const filename = platform === 'windows' ? 'adhub-install.bat' : 'adhub-install.sh';
        const mimeType = 'text/plain';

        const blob = new Blob([response.content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Zobrazit instrukce
        if (platform === 'windows') {
          showToast('Stazeno! Dvakrat kliknete pro spusteni');
        } else {
          showToast('Stazeno! Spustte: ./adhub-install.sh');
        }
      } else {
        showToast(response?.error || 'Chyba pri generovani', true);
      }
    } catch (e) {
      console.error('[Popup] Chyba pri stahovani instalatoru:', e);
      showToast('Chyba: ' + e.message, true);
    }
  }

  // ============================================================================
  // TOAST NOTIFIKACE
  // ============================================================================

  function showToast(message, isError = false) {
    const toast = $('#toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = isError ? 'toast error' : 'toast';

    // Trigger reflow
    toast.offsetHeight;
    toast.classList.add('visible');

    setTimeout(() => {
      toast.classList.remove('visible');
    }, 3000);
  }

  // ============================================================================
  // START
  // ============================================================================

  document.addEventListener('DOMContentLoaded', init);

})();
