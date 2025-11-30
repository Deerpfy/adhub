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

    // Zobraz extension ID
    displayExtensionId();

    // Zkontroluj status nastroju
    await checkToolsStatus();
  }

  function displayExtensionId() {
    const extIdEl = document.getElementById('extension-id');
    if (extIdEl) {
      extIdEl.textContent = chrome.runtime.id;
    }
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
        hideNativeHostError();
      } else {
        state.settings.nativeHostInstalled = false;
        updateToolStatus('ytdlp', false);
        updateToolStatus('ffmpeg', false);
        showNativeHostError(response?.error);
      }
    } catch (e) {
      console.log('[Popup] Native host neni dostupny:', e.message);
      state.settings.nativeHostInstalled = false;
      updateToolStatus('ytdlp', false);
      updateToolStatus('ffmpeg', false);
      showNativeHostError(e.message);
    }
  }

  function showNativeHostError(errorMsg) {
    const errorBox = document.getElementById('native-host-error');
    if (errorBox) {
      errorBox.style.display = 'block';

      // Detekovat typ chyby
      const errorText = document.getElementById('native-host-error-text');
      if (errorText) {
        if (errorMsg && errorMsg.includes('forbidden')) {
          errorText.innerHTML = '<strong>Registry nesedi s extension ID!</strong><br>Spustte znovu instalator pro opravu.';
        } else if (errorMsg && errorMsg.includes('not found')) {
          errorText.innerHTML = '<strong>Native Host neni nainstalovan!</strong><br>Stisknete tlacitko nize pro instalaci.';
        } else {
          errorText.innerHTML = '<strong>Native Host neni dostupny</strong><br>Spustte instalator pro aktivaci HD rezimu.';
        }
      }
    }
  }

  function hideNativeHostError() {
    const errorBox = document.getElementById('native-host-error');
    if (errorBox) {
      errorBox.style.display = 'none';
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

    // Auto-detect tlacitka
    $('#autodetect-paths')?.addEventListener('click', autoDetectPaths);

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

    // Kopirovat extension ID
    $('#copy-ext-id')?.addEventListener('click', copyExtensionId);
  }

  async function autoDetectPaths() {
    showToast('Hledam nastroje...');

    // Zkusit ziskat defaultni cesty z native hostu
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'checkNativeHost'
      });

      if (response?.nativeHostAvailable) {
        // Native host funguje, cesty jsou OK
        if (response.ytdlpAvailable && response.ytdlp?.path) {
          $('#ytdlp-path').value = '';  // Prazdne = autodetekce
        }
        if (response.ffmpegAvailable && response.ffmpeg?.path) {
          $('#ffmpeg-path').value = '';  // Prazdne = autodetekce
        }
        showToast('Nastroje nalezeny automaticky!');
        await saveSettings();
        return;
      }
    } catch (e) {
      console.log('[Popup] Nelze kontaktovat native host:', e);
    }

    // Nabidnout typicke cesty
    const isWindows = navigator.platform.toLowerCase().includes('win');
    if (isWindows) {
      const ytdlpInput = $('#ytdlp-path');
      const ffmpegInput = $('#ffmpeg-path');

      // Nabidnout AdHub cesty pro Windows
      const username = '%LOCALAPPDATA%';  // Prohlizec nema pristup k env vars
      ytdlpInput.placeholder = 'C:\\Users\\VASE_JMENO\\AppData\\Local\\AdHub\\yt-dlp\\yt-dlp.exe';
      ffmpegInput.placeholder = 'C:\\Users\\VASE_JMENO\\AppData\\Local\\AdHub\\ffmpeg\\ffmpeg.exe';

      showToast('Spustte instalator pro automaticke nastaveni');
    } else {
      showToast('Spustte instalator pro automaticke nastaveni');
    }
  }

  async function copyExtensionId() {
    try {
      await navigator.clipboard.writeText(chrome.runtime.id);
      showToast('Extension ID zkopirovano!');
    } catch (e) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = chrome.runtime.id;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('Extension ID zkopirovano!');
    }
  }

  // ============================================================================
  // INSTALATOR - STAZENI
  // ============================================================================

  async function downloadInstaller(platform) {
    showToast('Stahuji instalator...');

    // URL instalatoru na GitHubu
    const GITHUB_BASE = 'https://raw.githubusercontent.com/Deerpfy/adhub/main/projects/youtube-downloader/native-host';
    const urls = {
      windows: `${GITHUB_BASE}/adhub-install.bat`,
      unix: `${GITHUB_BASE}/adhub-install.sh`
    };

    const ext = platform === 'windows' ? 'bat' : 'sh';
    const url = urls[platform];

    try {
      // Ziskat posledni commit hash pro soubor
      let commitHash = 'unknown';
      try {
        const apiUrl = `https://api.github.com/repos/Deerpfy/adhub/commits?path=projects/youtube-downloader/native-host/adhub-install.${ext}&per_page=1`;
        const commitResp = await fetch(apiUrl);
        if (commitResp.ok) {
          const commits = await commitResp.json();
          if (commits.length > 0) {
            commitHash = commits[0].sha.substring(0, 7); // Kratky hash (7 znaku)
          }
        }
      } catch (e) {
        console.log('[Popup] Nelze ziskat commit hash:', e);
      }

      // Stahnout instalator
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const content = await response.text();
      const blob = new Blob([content], { type: 'text/plain' });
      const blobUrl = URL.createObjectURL(blob);

      // Nazev souboru s commit hashem
      const filename = `adhub-install_${commitHash}.${ext}`;

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      // Zobrazit instrukce
      if (platform === 'windows') {
        showToast(`Stazeno ${commitHash}! Dvakrat kliknete`);
      } else {
        showToast(`Stazeno ${commitHash}! ./adhub-install_${commitHash}.sh`);
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
