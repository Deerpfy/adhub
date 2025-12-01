/**
 * AdHub Bridge - Content Script pro komunikaci s AdHub webem (Firefox)
 *
 * Tento skript bezi na AdHub strankach a poskytuje informace
 * o nainstalovane verzi pluginu.
 */

(function() {
  'use strict';

  // Zabranit vicenasobnemu spusteni
  if (window.__ADHUB_BRIDGE_LOADED__) return;
  window.__ADHUB_BRIDGE_LOADED__ = true;

  console.log('[AdHub Bridge] Loaded on AdHub website (Firefox)');

  // Kompatibilita s Chrome API
  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

  // Ziskat informace o rozsireni z manifestu
  const manifest = browserAPI.runtime.getManifest();
  const extensionInfo = {
    version: manifest.version,
    name: manifest.name,
    browser: 'firefox'
  };

  console.log('[AdHub Bridge] Extension info:', extensionInfo);

  // Funkce pro odeslani informaci na stranku
  function sendExtensionInfo() {
    // Metoda 1: Custom event
    window.dispatchEvent(new CustomEvent('adhub-extension-ready', {
      detail: extensionInfo
    }));

    // Metoda 2: Data attribute na <html>
    document.documentElement.setAttribute('data-adhub-extension', 'true');
    document.documentElement.setAttribute('data-adhub-extension-version', extensionInfo.version);
    document.documentElement.setAttribute('data-adhub-extension-browser', 'firefox');

    // Metoda 3: Global promenna
    window.adhubExtensionAvailable = true;
    window.adhubExtensionVersion = extensionInfo.version;
    window.adhubExtensionBrowser = 'firefox';

    // Metoda 4: localStorage (pro perzistenci mezi reloady)
    try {
      localStorage.setItem('adhub_extension_active', 'true');
      localStorage.setItem('adhub_extension_version', extensionInfo.version);
      localStorage.setItem('adhub_extension_name', extensionInfo.name);
      localStorage.setItem('adhub_extension_browser', 'firefox');
      localStorage.setItem('adhub_extension_timestamp', Date.now().toString());
    } catch (e) {
      console.warn('[AdHub Bridge] Cannot write to localStorage:', e);
    }

    console.log('[AdHub Bridge] Extension info sent to page');
  }

  // Poslat info hned po nacteni
  sendExtensionInfo();

  // Poslat znovu po DOMContentLoaded (pro jistotu)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sendExtensionInfo);
  }

  // Naslouchat na dotazy od stranky
  window.addEventListener('adhub-extension-check', () => {
    console.log('[AdHub Bridge] Received check request');
    window.dispatchEvent(new CustomEvent('adhub-extension-response', {
      detail: extensionInfo
    }));
  });

  // Periodicky obnovovat localStorage timestamp (indikace ze plugin je aktivni)
  setInterval(() => {
    try {
      localStorage.setItem('adhub_extension_timestamp', Date.now().toString());
    } catch (e) {}
  }, 30000); // Kazdych 30 sekund

})();
