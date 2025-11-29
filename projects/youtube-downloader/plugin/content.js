/**
 * AdHub Youtube Downloader - Content Script
 * Verze: 2.0.0
 *
 * Tento skript se spousti na YouTube strankach a pridava tlacitko "Stahnout".
 * Kazdy krok je logovany pro snadne debugovani.
 *
 * DULEZITE: Zadne cykly, zadne intervaly, zadne memory leaky!
 * Pouzivame MutationObserver misto setInterval.
 */

(function() {
  'use strict';

  // ============================================================================
  // DEBUG LOGGER
  // ============================================================================

  const DEBUG = true;
  const PREFIX = '[AdHub YT Content]';

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
  // STATE - Stav aplikace
  // ============================================================================

  const state = {
    initialized: false,
    currentVideoId: null,
    buttonInserted: false,
    modalOpen: false,
    observer: null
  };

  // ============================================================================
  // STYLES - CSS styly pro tlacitko a modal
  // ============================================================================

  const STYLES = `
    .adhub-download-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 16px;
      height: 36px;
      margin-right: 8px;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      color: white;
      border: none;
      border-radius: 18px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: 'Roboto', 'Arial', sans-serif;
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
      white-space: nowrap;
    }

    .adhub-download-btn:hover {
      filter: brightness(1.1);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5);
    }

    .adhub-download-btn:active {
      transform: scale(0.98);
    }

    .adhub-download-btn svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }

    .adhub-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      animation: adhub-fade-in 0.2s ease;
    }

    @keyframes adhub-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .adhub-modal {
      background: #1a1a2e;
      border-radius: 16px;
      padding: 24px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      color: white;
      box-shadow: 0 20px 60px rgba(139, 92, 246, 0.3);
      animation: adhub-slide-up 0.3s ease;
    }

    @keyframes adhub-slide-up {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .adhub-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .adhub-modal-title {
      font-size: 20px;
      font-weight: 600;
      color: #8b5cf6;
    }

    .adhub-modal-close {
      background: none;
      border: none;
      color: #888;
      font-size: 24px;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
    }

    .adhub-modal-close:hover {
      color: white;
    }

    .adhub-video-info {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }

    .adhub-video-thumbnail {
      width: 160px;
      height: 90px;
      object-fit: cover;
      border-radius: 8px;
    }

    .adhub-video-details {
      flex: 1;
    }

    .adhub-video-title {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 4px;
      line-height: 1.4;
    }

    .adhub-video-author {
      font-size: 13px;
      color: #888;
    }

    .adhub-format-section {
      margin-bottom: 20px;
    }

    .adhub-format-section-title {
      font-size: 14px;
      color: #888;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .adhub-format-list {
      display: grid;
      gap: 8px;
    }

    .adhub-format-btn {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .adhub-format-btn:hover {
      background: rgba(139, 92, 246, 0.2);
      border-color: #8b5cf6;
    }

    .adhub-format-btn.video {
      border-left: 3px solid #22c55e;
    }

    .adhub-format-btn.audio {
      border-left: 3px solid #3b82f6;
    }

    .adhub-format-btn.combined {
      border-left: 3px solid #8b5cf6;
    }

    .adhub-format-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .adhub-format-quality {
      font-weight: 500;
    }

    .adhub-format-codec {
      font-size: 12px;
      color: #888;
    }

    .adhub-format-size {
      font-size: 13px;
      color: #888;
    }

    .adhub-loading {
      text-align: center;
      padding: 40px;
      color: #888;
    }

    .adhub-loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(139, 92, 246, 0.2);
      border-top-color: #8b5cf6;
      border-radius: 50%;
      animation: adhub-spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes adhub-spin {
      to { transform: rotate(360deg); }
    }

    .adhub-error {
      text-align: center;
      padding: 24px;
      color: #ef4444;
    }

    .adhub-status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #888;
      margin-top: 4px;
    }

    .adhub-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
    }
  `;

  // ============================================================================
  // INIT - Inicializace
  // ============================================================================

  function init() {
    if (state.initialized) {
      log('INIT', 'Uz inicializovano, preskakuji');
      return;
    }

    log('INIT', 'Zacinam inicializaci');

    // Krok 1: Vlozeni stylu
    injectStyles();
    log('INIT', 'Krok 1: Styly vlozeny');

    // Krok 1.5: Vlozeni page scriptu pro stahovani
    injectPageScript();
    log('INIT', 'Krok 1.5: Page script vlozeny');

    // Krok 2: Nastaveni signalu pro webovou stranku
    setExtensionSignal();
    log('INIT', 'Krok 2: Signal nastaven');

    // Krok 3: Kontrola aktualni stranky
    checkCurrentPage();
    log('INIT', 'Krok 3: Aktualni stranka zkontrolovana');

    // Krok 4: Nastaveni observeru pro zmeny URL (SPA navigace)
    setupNavigationObserver();
    log('INIT', 'Krok 4: Navigation observer nastaven');

    state.initialized = true;
    log('INIT', 'Inicializace dokoncena');
  }

  // ============================================================================
  // INJECT STYLES - Vlozeni CSS
  // ============================================================================

  function injectStyles() {
    if (document.getElementById('adhub-yt-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'adhub-yt-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  // ============================================================================
  // SET EXTENSION SIGNAL - Signal pro webovou stranku
  // ============================================================================

  function setExtensionSignal() {
    try {
      localStorage.setItem('adhub_extension_active', 'true');
      localStorage.setItem('adhub_extension_id', chrome.runtime.id);
      localStorage.setItem('adhub_extension_version', chrome.runtime.getManifest().version);
      log('SIGNAL', 'Extension signal nastaven v localStorage');
    } catch (e) {
      logError('SIGNAL', 'Nelze nastavit localStorage signal', e);
    }
  }

  // ============================================================================
  // CHECK CURRENT PAGE - Kontrola aktualni stranky
  // ============================================================================

  function checkCurrentPage() {
    const videoId = getVideoIdFromUrl(window.location.href);

    if (videoId) {
      log('PAGE', `Video stranka detekovana: ${videoId}`);

      if (state.currentVideoId !== videoId) {
        state.currentVideoId = videoId;
        state.buttonInserted = false;
        // Pouzijeme requestAnimationFrame misto setTimeout
        requestAnimationFrame(() => {
          insertDownloadButton();
        });
      }
    } else {
      log('PAGE', 'Neni video stranka');
      state.currentVideoId = null;
      state.buttonInserted = false;
    }
  }

  // ============================================================================
  // GET VIDEO ID FROM URL - Extrakce video ID
  // ============================================================================

  function getVideoIdFromUrl(url) {
    try {
      const urlObj = new URL(url);

      // Standard watch page
      if (urlObj.pathname === '/watch') {
        return urlObj.searchParams.get('v');
      }

      // Shorts
      const shortsMatch = urlObj.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) {
        return shortsMatch[1];
      }

      // Embedded
      const embedMatch = urlObj.pathname.match(/\/embed\/([a-zA-Z0-9_-]+)/);
      if (embedMatch) {
        return embedMatch[1];
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  // ============================================================================
  // SETUP NAVIGATION OBSERVER - Sledovani zmeny URL
  // ============================================================================

  function setupNavigationObserver() {
    // Pouzivame MutationObserver misto setInterval pro sledovani zmeny URL
    // YouTube je SPA, takze se URL meni bez reload stranky

    let lastUrl = window.location.href;

    // Observer pro zmeny v titulu (coz indikuje novou stranku)
    const titleObserver = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        log('NAVIGATION', `URL zmenena: ${lastUrl} -> ${currentUrl}`);
        lastUrl = currentUrl;
        state.buttonInserted = false;
        checkCurrentPage();
      }
    });

    // Sledujeme zmeny titulu stranky
    const titleElement = document.querySelector('title');
    if (titleElement) {
      titleObserver.observe(titleElement, { childList: true });
    }

    // Taky sledujeme history API
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      log('NAVIGATION', 'pushState zavolan');
      requestAnimationFrame(() => {
        checkCurrentPage();
      });
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      log('NAVIGATION', 'replaceState zavolan');
      requestAnimationFrame(() => {
        checkCurrentPage();
      });
    };

    window.addEventListener('popstate', () => {
      log('NAVIGATION', 'popstate event');
      requestAnimationFrame(() => {
        checkCurrentPage();
      });
    });
  }

  // ============================================================================
  // INSERT DOWNLOAD BUTTON - Vlozeni tlacitka Stahnout
  // ============================================================================

  function insertDownloadButton() {
    if (state.buttonInserted) {
      log('BUTTON', 'Tlacitko uz existuje');
      return;
    }

    log('BUTTON', 'Hledam misto pro tlacitko');

    // Primarni kontejner pro tlacitka - YTD akce
    const containerSelectors = [
      '#top-level-buttons-computed',
      'ytd-watch-metadata #actions #top-level-buttons-computed',
      'ytd-watch-metadata #actions-inner #top-level-buttons-computed',
      '#actions #top-level-buttons-computed',
      'ytd-menu-renderer #top-level-buttons-computed',
      '#info #menu-container #top-level-buttons-computed',
      // Fallback pro starsi layout
      'ytd-video-primary-info-renderer #top-level-buttons-computed',
      '#menu-container ytd-menu-renderer'
    ];

    let container = null;
    for (const selector of containerSelectors) {
      container = document.querySelector(selector);
      if (container && container.children.length > 0) {
        log('BUTTON', `Kontejner nalezen: ${selector}`);
        break;
      }
    }

    if (!container) {
      log('BUTTON', 'Kontejner nenalezen, cekam na DOM...');
      waitForElement(containerSelectors, (foundContainer) => {
        if (foundContainer && !state.buttonInserted) {
          insertButtonIntoContainer(foundContainer);
        }
      });
      return;
    }

    insertButtonIntoContainer(container);
  }

  // ============================================================================
  // WAIT FOR ELEMENT - Cekani na element pomoci MutationObserver
  // ============================================================================

  function waitForElement(selectors, callback) {
    // Maximalni pocet pokusu (zabranuji nekonecnemu cekani)
    let attempts = 0;
    const maxAttempts = 50;

    const observer = new MutationObserver((mutations, obs) => {
      attempts++;

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          log('WAIT', `Element nalezen po ${attempts} pokusech: ${selector}`);
          obs.disconnect();
          callback(element);
          return;
        }
      }

      if (attempts >= maxAttempts) {
        log('WAIT', `Element nenalezen po ${maxAttempts} pokusech, ukoncuji`);
        obs.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // ============================================================================
  // INSERT BUTTON INTO CONTAINER - Vlozeni tlacitka do kontejneru
  // ============================================================================

  function insertButtonIntoContainer(container) {
    // Kontrola, ze tlacitko uz neexistuje
    if (document.querySelector('.adhub-download-btn')) {
      log('BUTTON', 'Tlacitko uz existuje na strance');
      state.buttonInserted = true;
      return;
    }

    const button = document.createElement('button');
    button.className = 'adhub-download-btn';
    button.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
      <span>Stáhnout</span>
    `;

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      log('BUTTON', 'Tlacitko kliknuto');
      openDownloadModal();
    });

    // Vlozit na zacatek kontejneru (pred ostatni tlacitka)
    container.insertBefore(button, container.firstChild);
    log('BUTTON', 'Tlacitko vlozeno na zacatek kontejneru');

    state.buttonInserted = true;
    log('BUTTON', 'Tlacitko uspesne vlozeno');
  }

  // ============================================================================
  // OPEN DOWNLOAD MODAL - Otevreni modalniho okna
  // ============================================================================

  async function openDownloadModal() {
    if (state.modalOpen) {
      log('MODAL', 'Modal uz je otevreny');
      return;
    }

    if (!state.currentVideoId) {
      logError('MODAL', 'Zadne video ID');
      return;
    }

    log('MODAL', `Otviram modal pro video: ${state.currentVideoId}`);
    state.modalOpen = true;

    // Vytvoreni overlay
    const overlay = document.createElement('div');
    overlay.className = 'adhub-modal-overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay);
      }
    });

    // Vytvoreni modalu s loading stavem
    overlay.innerHTML = `
      <div class="adhub-modal">
        <div class="adhub-modal-header">
          <span class="adhub-modal-title">AdHub Youtube Downloader</span>
          <button class="adhub-modal-close">&times;</button>
        </div>
        <div class="adhub-loading">
          <div class="adhub-loading-spinner"></div>
          <div>Nacitam informace o videu...</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Nastaveni close tlacitka
    overlay.querySelector('.adhub-modal-close').addEventListener('click', () => {
      closeModal(overlay);
    });

    // Escape pro zavreni
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal(overlay);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    try {
      // Krok 1: Ziskani informaci o videu
      log('MODAL', 'Krok 1: Ziskavam info o videu');
      const videoInfo = await sendMessage({
        action: 'getVideoInfo',
        videoId: state.currentVideoId
      });

      if (!videoInfo.success) {
        throw new Error(videoInfo.error || 'Nelze ziskat info o videu');
      }

      log('MODAL', 'Krok 2: Info ziskano', videoInfo);

      // Krok 2: Ziskani odkazu
      log('MODAL', 'Krok 3: Ziskavam odkazy');
      const linksResult = await sendMessage({
        action: 'getDownloadLinks',
        videoId: state.currentVideoId
      });

      if (!linksResult.success) {
        throw new Error(linksResult.error || 'Nelze ziskat odkazy');
      }

      log('MODAL', 'Krok 4: Odkazy ziskany', linksResult);

      // Krok 3: Aktualizace modalu
      updateModalWithData(overlay, videoInfo, linksResult.formats);

    } catch (error) {
      logError('MODAL', 'Chyba pri nacitani', error);
      overlay.querySelector('.adhub-modal').innerHTML = `
        <div class="adhub-modal-header">
          <span class="adhub-modal-title">AdHub Youtube Downloader</span>
          <button class="adhub-modal-close">&times;</button>
        </div>
        <div class="adhub-error">
          <p>Chyba: ${error.message}</p>
          <p style="margin-top: 12px; color: #888; font-size: 13px;">
            Zkuste obnovit stranku nebo kontaktujte podporu.
          </p>
        </div>
      `;
      overlay.querySelector('.adhub-modal-close').addEventListener('click', () => {
        closeModal(overlay);
      });
    }
  }

  // ============================================================================
  // UPDATE MODAL WITH DATA - Aktualizace modalu s daty
  // ============================================================================

  function updateModalWithData(overlay, videoInfo, formats) {
    const modal = overlay.querySelector('.adhub-modal');

    let formatsHtml = '';

    // Combined formaty (video + audio)
    const combinedFormats = [...(formats.combined?.mp4 || []), ...(formats.combined?.webm || [])];
    if (combinedFormats.length > 0) {
      formatsHtml += `
        <div class="adhub-format-section">
          <div class="adhub-format-section-title">Video + Audio (doporuceno)</div>
          <div class="adhub-format-list">
            ${combinedFormats.map(f => createFormatButton(f, 'combined', videoInfo.title)).join('')}
          </div>
        </div>
      `;
    }

    // Video only formaty
    const videoFormats = [...(formats.video?.mp4 || []), ...(formats.video?.webm || [])];
    if (videoFormats.length > 0) {
      formatsHtml += `
        <div class="adhub-format-section">
          <div class="adhub-format-section-title">Pouze video</div>
          <div class="adhub-format-list">
            ${videoFormats.slice(0, 6).map(f => createFormatButton(f, 'video', videoInfo.title)).join('')}
          </div>
        </div>
      `;
    }

    // Audio only formaty
    const audioFormats = [...(formats.audio?.m4a || []), ...(formats.audio?.webm || [])];
    if (audioFormats.length > 0) {
      formatsHtml += `
        <div class="adhub-format-section">
          <div class="adhub-format-section-title">Pouze audio</div>
          <div class="adhub-format-list">
            ${audioFormats.slice(0, 4).map(f => createFormatButton(f, 'audio', videoInfo.title)).join('')}
          </div>
        </div>
      `;
    }

    if (!formatsHtml) {
      formatsHtml = `
        <div class="adhub-error">
          <p>Zadne dostupne formaty</p>
          <p style="margin-top: 12px; color: #888; font-size: 13px;">
            Toto video mozna neni dostupne ke stazeni.
          </p>
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="adhub-modal-header">
        <span class="adhub-modal-title">AdHub Youtube Downloader</span>
        <button class="adhub-modal-close">&times;</button>
      </div>
      <div class="adhub-video-info">
        <img class="adhub-video-thumbnail" src="${videoInfo.thumbnail}" alt="Thumbnail"
             onerror="this.src='${videoInfo.thumbnailMedium}'">
        <div class="adhub-video-details">
          <div class="adhub-video-title">${escapeHtml(videoInfo.title)}</div>
          <div class="adhub-video-author">${escapeHtml(videoInfo.author)}</div>
          <div class="adhub-status-indicator">
            <span class="adhub-status-dot"></span>
            <span>Plugin aktivni</span>
          </div>
        </div>
      </div>
      ${formatsHtml}
    `;

    // Nastaveni event listeneru
    modal.querySelector('.adhub-modal-close').addEventListener('click', () => {
      closeModal(overlay);
    });

    // Event listenery pro format tlacitka
    modal.querySelectorAll('.adhub-format-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const url = btn.dataset.url;
        const filename = btn.dataset.filename;
        const itag = btn.dataset.itag;

        log('DOWNLOAD', `Stahuji format: ${itag}`);
        btn.textContent = 'Stahuji...';
        btn.disabled = true;

        try {
          // Stazeni primo z content scriptu - mame pristup k YouTube cookies
          const result = await downloadVideoDirectly(url, filename, state.currentVideoId);

          if (result.success) {
            btn.textContent = 'Stazeno!';
            btn.style.background = 'rgba(34, 197, 94, 0.2)';
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          logError('DOWNLOAD', 'Chyba pri stahovani', error);
          btn.textContent = 'Chyba!';
          btn.style.background = 'rgba(239, 68, 68, 0.2)';

          // Zkusime fallback pres background script
          log('DOWNLOAD', 'Zkousim fallback pres background...');
          try {
            const fallbackResult = await sendMessage({
              action: 'downloadVideo',
              url: url,
              filename: filename,
              videoId: state.currentVideoId,
              itag: itag
            });

            if (fallbackResult.success) {
              btn.textContent = 'Stazeno!';
              btn.style.background = 'rgba(34, 197, 94, 0.2)';
            }
          } catch (fallbackError) {
            logError('DOWNLOAD', 'Fallback take selhal', fallbackError);
          }
        }
      });
    });
  }

  // ============================================================================
  // DOWNLOAD VIDEO DIRECTLY - Stazeni videa primo z content scriptu
  // ============================================================================

  async function downloadVideoDirectly(url, filename, videoId) {
    log('DIRECT_DOWNLOAD', 'Zacinam prime stahovani', { filename, videoId });

    try {
      // Pouzijeme injektovany skript v kontextu stranky pro obejiti CORS
      const result = await downloadViaPageContext(url, filename);
      return result;
    } catch (error) {
      logError('DIRECT_DOWNLOAD', 'Chyba', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // DOWNLOAD VIA PAGE CONTEXT - Stahovani pres injektovany skript
  // ============================================================================

  function downloadViaPageContext(url, filename) {
    return new Promise((resolve, reject) => {
      const requestId = 'dl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      log('PAGE_DOWNLOAD', `Posilam pozadavek do page kontextu: ${requestId}`);

      // Listener pro odpoved z page kontextu
      const responseHandler = (event) => {
        if (event.source !== window) return;
        if (!event.data || event.data.type !== 'ADHUB_DOWNLOAD_RESPONSE') return;
        if (event.data.requestId !== requestId) return;

        window.removeEventListener('message', responseHandler);

        if (event.data.success) {
          log('PAGE_DOWNLOAD', 'Stahovani uspesne');

          // Blob URL z page kontextu - pouzijeme <a> tag pro stahovani
          if (event.data.blobUrl) {
            downloadViaAnchor(event.data.blobUrl, filename)
              .then(resolve)
              .catch(reject);
          } else {
            resolve({ success: true });
          }
        } else {
          logError('PAGE_DOWNLOAD', 'Chyba z page kontextu:', event.data.error);
          reject(new Error(event.data.error || 'Download failed'));
        }
      };

      window.addEventListener('message', responseHandler);

      // Timeout
      setTimeout(() => {
        window.removeEventListener('message', responseHandler);
        reject(new Error('Page download timeout'));
      }, 120000); // 2 minuty timeout pro velke soubory

      // Posli pozadavek do page kontextu
      window.postMessage({
        type: 'ADHUB_DOWNLOAD_REQUEST',
        requestId: requestId,
        url: url,
        filename: filename
      }, '*');
    });
  }

  // ============================================================================
  // INJECT PAGE SCRIPT - Vlozeni skriptu do kontextu stranky
  // ============================================================================

  function injectPageScript() {
    if (document.getElementById('adhub-page-script')) {
      return;
    }

    // Pouzijeme externi soubor misto inline scriptu kvuli YouTube CSP
    const script = document.createElement('script');
    script.id = 'adhub-page-script';
    script.src = chrome.runtime.getURL('page-downloader.js');

    // Vlozit na zacatek <head> nebo <body>
    (document.head || document.documentElement).appendChild(script);
    log('INJECT', 'Page script vlozeny via src');
  }

  // ============================================================================
  // DOWNLOAD VIA ANCHOR - Fallback stahovani pres <a> tag
  // ============================================================================

  async function downloadViaAnchor(blobUrl, filename) {
    log('ANCHOR_DOWNLOAD', 'Stahuji pres <a> element');

    try {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      log('ANCHOR_DOWNLOAD', 'Download spusten');
      return { success: true };
    } catch (error) {
      logError('ANCHOR_DOWNLOAD', 'Chyba', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // CREATE FORMAT BUTTON - Vytvoreni tlacitka pro format
  // ============================================================================

  function createFormatButton(format, type, videoTitle) {
    const quality = format.quality || format.audioQuality || 'Neznama kvalita';
    const container = format.container.toUpperCase();
    const codec = format.codec.split('.')[0];
    const size = format.fileSize ? formatFileSize(format.fileSize) : 'Neznama velikost';

    // Sanitizace nazvu souboru
    const safeTitle = videoTitle
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);

    const extension = format.container === 'webm' && type === 'audio' ? 'webm' : format.container;
    const filename = `${safeTitle}_${quality}.${extension}`;

    return `
      <button class="adhub-format-btn ${type}"
              data-url="${escapeHtml(format.url)}"
              data-filename="${escapeHtml(filename)}"
              data-itag="${format.itag}">
        <div class="adhub-format-info">
          <span class="adhub-format-quality">${quality}</span>
          <span class="adhub-format-codec">${container} / ${codec}</span>
        </div>
        <span class="adhub-format-size">${size}</span>
      </button>
    `;
  }

  // ============================================================================
  // CLOSE MODAL - Zavreni modalu
  // ============================================================================

  function closeModal(overlay) {
    log('MODAL', 'Zaviram modal');
    overlay.remove();
    state.modalOpen = false;
  }

  // ============================================================================
  // SEND MESSAGE - Odeslani zpravy do background scriptu
  // ============================================================================

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      log('MESSAGE', 'Odesilam zpravu', message);

      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          logError('MESSAGE', 'Chyba pri odesilani zpravy', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        log('MESSAGE', 'Odpoved prijata', response);
        resolve(response);
      });
    });
  }

  // ============================================================================
  // HELPER: Format File Size - Formatovani velikosti souboru
  // ============================================================================

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return 'Neznama';

    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  // ============================================================================
  // HELPER: Escape HTML - Ochrana proti XSS
  // ============================================================================

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================================================
  // START - Spusteni skriptu
  // ============================================================================

  // Cekame na DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  log('SCRIPT', 'Content script nacten');

})();
