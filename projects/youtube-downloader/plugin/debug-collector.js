/**
 * AdHub Debug Collector
 *
 * Tento skript sbírá všechny logy z AdHub pluginu a formátuje je pro debugging.
 *
 * POUŽITÍ:
 * 1. Otevři DevTools (F12) na YouTube stránce
 * 2. Jdi do Console
 * 3. Zkopíruj a vlož celý tento skript do konzole a stiskni Enter
 * 4. Interaguj s pluginem (klikni na tlačítko, zkus stáhnout, atd.)
 * 5. Zavolej: getAdHubDebugReport() pro získání reportu
 * 6. Zkopíruj výstup a pošli ho
 */

(function() {
  'use strict';

  // Úložiště pro logy
  window._adhubDebugLogs = window._adhubDebugLogs || [];
  window._adhubDebugErrors = window._adhubDebugErrors || [];
  window._adhubDebugNetwork = window._adhubDebugNetwork || [];

  // Zachycení původních konzolových metod
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  // Přepis console.log
  console.log = function(...args) {
    const msg = args.map(a => {
      try {
        return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a);
      } catch (e) {
        return String(a);
      }
    }).join(' ');

    // Filtruj AdHub logy
    if (msg.includes('[AdHub') || msg.includes('adhub')) {
      window._adhubDebugLogs.push({
        time: new Date().toISOString(),
        type: 'log',
        message: msg
      });
    }

    originalLog.apply(console, args);
  };

  // Přepis console.error
  console.error = function(...args) {
    const msg = args.map(a => {
      try {
        if (a instanceof Error) {
          return `${a.name}: ${a.message}\n${a.stack}`;
        }
        return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a);
      } catch (e) {
        return String(a);
      }
    }).join(' ');

    window._adhubDebugErrors.push({
      time: new Date().toISOString(),
      type: 'error',
      message: msg
    });

    originalError.apply(console, args);
  };

  // Přepis console.warn
  console.warn = function(...args) {
    const msg = args.map(a => {
      try {
        return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a);
      } catch (e) {
        return String(a);
      }
    }).join(' ');

    if (msg.includes('[AdHub') || msg.includes('adhub') || msg.includes('youtube') || msg.includes('CSP')) {
      window._adhubDebugErrors.push({
        time: new Date().toISOString(),
        type: 'warn',
        message: msg
      });
    }

    originalWarn.apply(console, args);
  };

  // Sledování síťových požadavků
  const originalFetch = window.fetch;
  window.fetch = async function(url, options) {
    const startTime = Date.now();
    const urlStr = typeof url === 'string' ? url : url.url;

    try {
      const response = await originalFetch.apply(this, arguments);

      if (urlStr.includes('youtube') || urlStr.includes('googlevideo') || urlStr.includes('ytimg')) {
        window._adhubDebugNetwork.push({
          time: new Date().toISOString(),
          url: urlStr.substring(0, 200),
          method: options?.method || 'GET',
          status: response.status,
          statusText: response.statusText,
          duration: Date.now() - startTime
        });
      }

      return response;
    } catch (error) {
      window._adhubDebugNetwork.push({
        time: new Date().toISOString(),
        url: urlStr.substring(0, 200),
        method: options?.method || 'GET',
        status: 'FAILED',
        error: error.message,
        duration: Date.now() - startTime
      });
      throw error;
    }
  };

  // Funkce pro získání debug reportu
  window.getAdHubDebugReport = function() {
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,

      // DOM info
      dom: {
        hasTopLevelButtons: !!document.querySelector('#top-level-buttons-computed'),
        hasActionsContainer: !!document.querySelector('#actions'),
        hasMenuRenderer: !!document.querySelector('ytd-menu-renderer'),
        hasAdHubButton: !!document.querySelector('.adhub-download-btn'),
        hasAdHubModal: !!document.querySelector('.adhub-modal-overlay'),
        hasPageScript: !!document.getElementById('adhub-page-script'),
        videoId: new URLSearchParams(window.location.search).get('v')
      },

      // LocalStorage
      localStorage: {
        adhub_extension_active: localStorage.getItem('adhub_extension_active'),
        adhub_extension_id: localStorage.getItem('adhub_extension_id'),
        adhub_extension_version: localStorage.getItem('adhub_extension_version')
      },

      // Logy
      logs: window._adhubDebugLogs.slice(-50),
      errors: window._adhubDebugErrors.slice(-30),
      network: window._adhubDebugNetwork.slice(-20)
    };

    // Formátování pro snadné kopírování
    const formatted = `
=== ADHUB DEBUG REPORT ===
Čas: ${report.timestamp}
URL: ${report.url}
Video ID: ${report.dom.videoId}

=== DOM STATUS ===
- #top-level-buttons-computed: ${report.dom.hasTopLevelButtons ? 'ANO' : 'NE'}
- #actions: ${report.dom.hasActionsContainer ? 'ANO' : 'NE'}
- ytd-menu-renderer: ${report.dom.hasMenuRenderer ? 'ANO' : 'NE'}
- AdHub tlačítko: ${report.dom.hasAdHubButton ? 'ANO' : 'NE'}
- AdHub modal: ${report.dom.hasAdHubModal ? 'ANO' : 'NE'}
- Page script: ${report.dom.hasPageScript ? 'ANO' : 'NE'}

=== EXTENSION STATUS ===
- Active: ${report.localStorage.adhub_extension_active}
- ID: ${report.localStorage.adhub_extension_id}
- Version: ${report.localStorage.adhub_extension_version}

=== ERRORS (${report.errors.length}) ===
${report.errors.map(e => `[${e.time}] [${e.type.toUpperCase()}] ${e.message}`).join('\n') || '(žádné errory)'}

=== LOGS (${report.logs.length}) ===
${report.logs.map(l => `[${l.time}] ${l.message}`).join('\n') || '(žádné logy)'}

=== NETWORK (${report.network.length}) ===
${report.network.map(n => `[${n.time}] ${n.method} ${n.status} (${n.duration}ms) ${n.url}${n.error ? ' ERROR: ' + n.error : ''}`).join('\n') || '(žádné požadavky)'}

=== RAW JSON ===
${JSON.stringify(report, null, 2)}
`;

    console.log('%c=== ADHUB DEBUG REPORT ===', 'color: #8b5cf6; font-size: 16px; font-weight: bold;');
    console.log(formatted);

    // Zkopírovat do schránky
    navigator.clipboard.writeText(formatted).then(() => {
      console.log('%cReport zkopírován do schránky!', 'color: #22c55e; font-weight: bold;');
    }).catch(() => {
      console.log('%cNelze zkopírovat - zkopíruj text výše ručně', 'color: #f59e0b;');
    });

    return formatted;
  };

  // Funkce pro vyčištění logů
  window.clearAdHubDebug = function() {
    window._adhubDebugLogs = [];
    window._adhubDebugErrors = [];
    window._adhubDebugNetwork = [];
    console.log('%cAdHub debug logy vyčištěny', 'color: #22c55e;');
  };

  // Funkce pro okamžité info
  window.adhubQuickCheck = function() {
    console.log('%c=== ADHUB QUICK CHECK ===', 'color: #8b5cf6; font-size: 14px; font-weight: bold;');
    console.log('URL:', window.location.href);
    console.log('Video ID:', new URLSearchParams(window.location.search).get('v'));
    console.log('');
    console.log('DOM elementy:');
    console.log('  #top-level-buttons-computed:', !!document.querySelector('#top-level-buttons-computed'));
    console.log('  #actions:', !!document.querySelector('#actions'));
    console.log('  .adhub-download-btn:', !!document.querySelector('.adhub-download-btn'));
    console.log('  #adhub-page-script:', !!document.getElementById('adhub-page-script'));
    console.log('');
    console.log('Extension:');
    console.log('  Active:', localStorage.getItem('adhub_extension_active'));
    console.log('  Version:', localStorage.getItem('adhub_extension_version'));

    // Zjisti všechny kontejnery
    const containers = [
      '#top-level-buttons-computed',
      '#actions',
      '#actions-inner',
      'ytd-menu-renderer',
      '#menu-container'
    ];

    console.log('');
    console.log('Kontejnery:');
    containers.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) {
        console.log(`  ${sel}: ANO (${el.children.length} dětí)`);
      } else {
        console.log(`  ${sel}: NE`);
      }
    });
  };

  console.log('%c✓ AdHub Debug Collector aktivován!', 'color: #22c55e; font-size: 14px; font-weight: bold;');
  console.log('%cPříkazy:', 'color: #8b5cf6; font-weight: bold;');
  console.log('  adhubQuickCheck()     - rychlá kontrola stavu');
  console.log('  getAdHubDebugReport() - kompletní report (zkopíruje se do schránky)');
  console.log('  clearAdHubDebug()     - vyčistit logy');
  console.log('');
  console.log('%cTip: Nejdřív proveď akce (klikni na tlačítko, zkus stáhnout), pak zavolej getAdHubDebugReport()', 'color: #888;');

  // Automaticky spusť quick check
  window.adhubQuickCheck();

})();
