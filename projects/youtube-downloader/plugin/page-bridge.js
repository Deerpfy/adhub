/**
 * AdHub Youtube Downloader - Page Bridge
 * Verze: 2.0.0
 *
 * Tento skript umoznuje komunikaci mezi webovou strankou a pluginem.
 * Pouziva se na localhost a GitHub Pages.
 *
 * DULEZITE: Zadne cykly, zadne intervaly, zadne memory leaky!
 */

(function() {
  'use strict';

  // ============================================================================
  // DEBUG LOGGER
  // ============================================================================

  const DEBUG = true;
  const PREFIX = '[AdHub YT Bridge]';

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
  // INIT - Inicializace
  // ============================================================================

  function init() {
    log('INIT', 'Zacinam inicializaci page bridge');

    // Krok 1: Nastaveni signalu
    setExtensionSignals();
    log('INIT', 'Krok 1: Signaly nastaveny');

    // Krok 2: Nastaveni message listeneru
    setupMessageListener();
    log('INIT', 'Krok 2: Message listener nastaven');

    // Krok 3: Dispatch ready eventu
    dispatchReadyEvent();
    log('INIT', 'Krok 3: Ready event dispatched');

    log('INIT', 'Inicializace dokoncena');
  }

  // ============================================================================
  // SET EXTENSION SIGNALS - Nastaveni signalu pro stranku
  // ============================================================================

  function setExtensionSignals() {
    try {
      const manifest = chrome.runtime.getManifest();

      // LocalStorage signaly
      localStorage.setItem('adhub_extension_active', 'true');
      localStorage.setItem('adhub_extension_id', chrome.runtime.id);
      localStorage.setItem('adhub_extension_version', manifest.version);
      localStorage.setItem('adhub_extension_name', manifest.name);

      log('SIGNALS', 'LocalStorage signaly nastaveny', {
        id: chrome.runtime.id,
        version: manifest.version
      });

    } catch (error) {
      logError('SIGNALS', 'Chyba pri nastavovani signalu', error);
    }
  }

  // ============================================================================
  // DISPATCH READY EVENT - Odeslani ready eventu
  // ============================================================================

  function dispatchReadyEvent() {
    const manifest = chrome.runtime.getManifest();

    const event = new CustomEvent('adhub-extension-ready', {
      detail: {
        id: chrome.runtime.id,
        version: manifest.version,
        name: manifest.name,
        active: true
      }
    });

    window.dispatchEvent(event);
    log('EVENT', 'Ready event dispatched');
  }

  // ============================================================================
  // SETUP MESSAGE LISTENER - Nastaveni message listeneru
  // ============================================================================

  function setupMessageListener() {
    // Listener pro zpravy z webove stranky
    window.addEventListener('message', async (event) => {
      // Kontrola puvodu
      if (event.source !== window) return;

      // Kontrola typu zpravy
      if (!event.data || event.data.type !== 'ADHUB_REQUEST') return;

      log('MESSAGE', 'Prijata zprava z webove stranky', event.data);

      const { action, payload, requestId } = event.data;

      try {
        // Preposlani zpravy do background scriptu
        const response = await sendToBackground({
          action: action,
          ...payload
        });

        // Odeslani odpovedi zpet na stranku
        window.postMessage({
          type: 'ADHUB_RESPONSE',
          requestId: requestId,
          success: true,
          data: response
        }, '*');

        log('MESSAGE', 'Odpoved odeslana zpet', response);

      } catch (error) {
        logError('MESSAGE', 'Chyba pri zpracovani zpravy', error);

        window.postMessage({
          type: 'ADHUB_RESPONSE',
          requestId: requestId,
          success: false,
          error: error.message
        }, '*');
      }
    });
  }

  // ============================================================================
  // SEND TO BACKGROUND - Odeslani zpravy do background scriptu
  // ============================================================================

  function sendToBackground(message) {
    return new Promise((resolve, reject) => {
      log('BACKGROUND', 'Odesilam zpravu do background', message);

      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          logError('BACKGROUND', 'Chyba', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        log('BACKGROUND', 'Odpoved z background', response);
        resolve(response);
      });
    });
  }

  // ============================================================================
  // START
  // ============================================================================

  init();

})();
