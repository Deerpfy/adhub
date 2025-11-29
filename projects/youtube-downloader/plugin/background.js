/**
 * AdHub YouTube Downloader v4.0 - Background Service Worker
 *
 * Hlavní funkce:
 * - Stahování video streamů (má host_permissions pro googlevideo.com)
 * - Komunikace s content scriptem
 * - Správa stahování přes chrome.downloads API
 */

// ============================================================================
// KONFIGURACE
// ============================================================================

const CONFIG = {
  DEBUG: true,
  MAX_CHUNK_SIZE: 10 * 1024 * 1024, // 10MB chunks pro velká videa
  TIMEOUT: 60000, // 60s timeout
};

// ============================================================================
// LOGGING
// ============================================================================

function log(...args) {
  if (CONFIG.DEBUG) console.log('[AdHub BG]', ...args);
}

function logError(...args) {
  console.error('[AdHub BG ERROR]', ...args);
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('Přijata zpráva:', request.action, request);

  switch (request.action) {
    case 'downloadVideo':
      handleDownload(request.data, sender.tab?.id)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Async response

    case 'getVideoInfo':
      handleGetVideoInfo(request.videoId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'ping':
      sendResponse({
        success: true,
        version: chrome.runtime.getManifest().version,
        active: true
      });
      return false;

    case 'checkStatus':
      sendResponse({
        success: true,
        version: chrome.runtime.getManifest().version,
        capabilities: {
          directDownload: true,
          progressiveFormats: true,
          adaptiveFormats: true
        }
      });
      return false;

    default:
      sendResponse({ success: false, error: 'Neznámá akce' });
      return false;
  }
});

// ============================================================================
// STAHOVÁNÍ VIDEA
// ============================================================================

async function handleDownload(data, tabId) {
  const { url, filename, videoId, itag, mimeType } = data;

  log('Zahajuji stahování:', { url: url?.substring(0, 100), filename, videoId, itag });

  if (!url) {
    throw new Error('Chybí URL pro stažení');
  }

  try {
    // Metoda 1: Přímé stažení přes chrome.downloads API
    // Toto funguje protože máme host_permissions pro googlevideo.com
    const downloadId = await initiateDownload(url, filename);

    log('Stahování zahájeno, ID:', downloadId);

    // Notifikovat tab o úspěchu
    if (tabId) {
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: 'downloadProgress',
          percent: 100,
          text: 'Stahování zahájeno v prohlížeči'
        });
      } catch (e) {}
    }

    return {
      success: true,
      downloadId: downloadId,
      message: 'Stahování zahájeno'
    };

  } catch (error) {
    logError('Chyba při stahování:', error);

    // Fallback: Zkusit blob metodu
    try {
      log('Zkouším blob metodu...');
      return await downloadViaBlob(url, filename, tabId);
    } catch (blobError) {
      logError('Blob metoda také selhala:', blobError);
      throw new Error(`Stahování selhalo: ${error.message}`);
    }
  }
}

// ============================================================================
// PŘÍMÉ STAHOVÁNÍ PŘES CHROME.DOWNLOADS
// ============================================================================

async function initiateDownload(url, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false, // Automaticky uložit do Downloads
      conflictAction: 'uniquify' // Přejmenovat pokud existuje
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (downloadId === undefined) {
        reject(new Error('Stahování nebylo zahájeno'));
      } else {
        resolve(downloadId);
      }
    });
  });
}

// ============================================================================
// BLOB METODA (FALLBACK)
// ============================================================================

async function downloadViaBlob(url, filename, tabId) {
  log('Stahování přes blob:', url?.substring(0, 100));

  // Fetch video data
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Range': 'bytes=0-', // Celý soubor
    },
    credentials: 'omit'
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const totalSize = contentLength ? parseInt(contentLength) : 0;

  log('Velikost souboru:', totalSize, 'bytes');

  // Pro velké soubory použít streaming
  if (totalSize > 50 * 1024 * 1024) { // > 50MB
    log('Velký soubor, používám chunked download');
    return await downloadLargeFile(url, filename, totalSize, tabId);
  }

  // Pro menší soubory načíst celý do paměti
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  const downloadId = await initiateDownload(blobUrl, filename);

  // Vyčistit blob URL po stažení
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

  return {
    success: true,
    downloadId: downloadId,
    method: 'blob'
  };
}

// ============================================================================
// STAHOVÁNÍ VELKÝCH SOUBORŮ (CHUNKED)
// ============================================================================

async function downloadLargeFile(url, filename, totalSize, tabId) {
  const chunks = [];
  let downloaded = 0;
  const chunkSize = CONFIG.MAX_CHUNK_SIZE;

  while (downloaded < totalSize) {
    const end = Math.min(downloaded + chunkSize - 1, totalSize - 1);
    const rangeHeader = `bytes=${downloaded}-${end}`;

    log(`Stahuji chunk: ${rangeHeader}`);

    const response = await fetch(url, {
      headers: { 'Range': rangeHeader },
      credentials: 'omit'
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`Chunk download failed: ${response.status}`);
    }

    const chunk = await response.arrayBuffer();
    chunks.push(chunk);

    downloaded += chunk.byteLength;

    // Update progress
    const percent = Math.round((downloaded / totalSize) * 100);
    if (tabId) {
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: 'downloadProgress',
          percent: percent,
          text: `Stahování: ${percent}%`
        });
      } catch (e) {}
    }

    log(`Progress: ${percent}% (${downloaded}/${totalSize})`);
  }

  // Sestavit blob z chunks
  const blob = new Blob(chunks);
  const blobUrl = URL.createObjectURL(blob);

  const downloadId = await initiateDownload(blobUrl, filename);

  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

  return {
    success: true,
    downloadId: downloadId,
    method: 'chunked'
  };
}

// ============================================================================
// ZÍSKÁNÍ INFO O VIDEU (OEMBED FALLBACK)
// ============================================================================

async function handleGetVideoInfo(videoId) {
  log('Získávám info pro:', videoId);

  if (!videoId) {
    throw new Error('Chybí video ID');
  }

  // Použít oEmbed API pro základní info
  const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

  const response = await fetch(oEmbedUrl);
  if (!response.ok) {
    throw new Error(`oEmbed selhalo: ${response.status}`);
  }

  const data = await response.json();

  return {
    success: true,
    videoId: videoId,
    title: data.title,
    author: data.author_name,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
  };
}

// ============================================================================
// SLEDOVÁNÍ STAHOVÁNÍ
// ============================================================================

chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state) {
    log('Download state změněn:', delta.id, delta.state.current);

    if (delta.state.current === 'complete') {
      log('Stahování dokončeno:', delta.id);
    } else if (delta.state.current === 'interrupted') {
      logError('Stahování přerušeno:', delta.id, delta.error);
    }
  }
});

// ============================================================================
// INSTALACE / AKTUALIZACE
// ============================================================================

chrome.runtime.onInstalled.addListener((details) => {
  log('Extension nainstalována/aktualizována:', details.reason);

  if (details.reason === 'install') {
    // První instalace
    log('První instalace - verze:', chrome.runtime.getManifest().version);
  } else if (details.reason === 'update') {
    // Aktualizace
    log('Aktualizace z verze:', details.previousVersion);
  }
});

// ============================================================================
// STARTUP
// ============================================================================

log('AdHub YouTube Downloader v4.0 - Background script načten');
log('Verze:', chrome.runtime.getManifest().version);
