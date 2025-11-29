/**
 * AdHub Page Context Downloader
 * Verze: 2.0.0
 *
 * Tento skript bezi primo v kontextu YouTube stranky
 * a ma pristup k YouTube cookies a origin.
 *
 * Je injektovany jako externi soubor kvuli YouTube CSP.
 */

(function() {
  'use strict';

  // Listener pro pozadavky na stahovani
  window.addEventListener('message', async function(event) {
    if (event.source !== window) return;
    if (!event.data || event.data.type !== 'ADHUB_DOWNLOAD_REQUEST') return;

    const { requestId, url, filename } = event.data;
    console.log('[AdHub Page] Prijat pozadavek na stahovani:', requestId);

    try {
      // Fetch s plnym YouTube kontextem
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'cs,en;q=0.9'
        }
      });

      console.log('[AdHub Page] Response status:', response.status);

      if (!response.ok) {
        throw new Error('HTTP error: ' + response.status);
      }

      // Cist jako blob
      const blob = await response.blob();
      console.log('[AdHub Page] Blob vytvoren:', blob.size, 'bytes');

      if (blob.size === 0) {
        throw new Error('Prazdny soubor');
      }

      // Vytvorit blob URL a stahnout primo
      const blobUrl = URL.createObjectURL(blob);

      // Stahnout pres <a> element primo v page kontextu
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Uvolnit blob URL po chvili
      setTimeout(function() {
        URL.revokeObjectURL(blobUrl);
      }, 60000);

      window.postMessage({
        type: 'ADHUB_DOWNLOAD_RESPONSE',
        requestId: requestId,
        success: true
      }, '*');

    } catch (error) {
      console.error('[AdHub Page] Chyba:', error);
      window.postMessage({
        type: 'ADHUB_DOWNLOAD_RESPONSE',
        requestId: requestId,
        success: false,
        error: error.message
      }, '*');
    }
  });

  console.log('[AdHub Page] Page context downloader nainstalovany');
})();
