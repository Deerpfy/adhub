/**
 * AdHub Youtube Downloader - Background Service Worker v3.0
 *
 * UPŘÍMNÁ VERZE: Pouze získává metadata o videu.
 * Přímé stahování z prohlížeče NENÍ MOŽNÉ kvůli YouTube ochranám.
 *
 * Tento service worker:
 * 1. Získává info o videu přes YouTube oEmbed API
 * 2. Poskytuje základní funkcionalitu pro popup
 *
 * Pro skutečné stažení videa je potřeba použít:
 * - Cobalt.tools (webová služba)
 * - yt-dlp (lokální nástroj)
 */

// ============================================================================
// LOGGING
// ============================================================================

const DEBUG = true;

function log(category, message, data = null) {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString();
  const prefix = `[AdHub YT] [${timestamp}] [${category}]`;
  if (data) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
}

function logError(category, message, error = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[AdHub YT ERROR] [${timestamp}] [${category}]`;
  if (error) {
    console.error(prefix, message, error);
  } else {
    console.error(prefix, message);
  }
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('MESSAGE', `Přijata zpráva: ${request.action}`, {
    from: sender.tab ? `tab ${sender.tab.id}` : 'popup',
    request
  });

  switch (request.action) {
    case 'ping':
      sendResponse({
        success: true,
        active: true,
        version: chrome.runtime.getManifest().version
      });
      return true;

    case 'getVideoInfo':
      handleGetVideoInfo(request.videoId, sendResponse);
      return true;

    case 'checkStatus':
      sendResponse({
        success: true,
        active: true,
        version: chrome.runtime.getManifest().version,
        capabilities: {
          directDownload: false,  // NIKDY - CORS blokuje
          cobaltWeb: true,        // Vždy - otevře web
          ytdlpNative: false      // Vyžaduje companion app
        }
      });
      return true;

    default:
      log('MESSAGE', `Neznámá akce: ${request.action}`);
      sendResponse({ success: false, error: 'Neznámá akce' });
      return false;
  }
});

// ============================================================================
// GET VIDEO INFO - Jediná funkce která skutečně funguje
// ============================================================================

async function handleGetVideoInfo(videoId, sendResponse) {
  log('VIDEO_INFO', `Získávám info pro video: ${videoId}`);

  try {
    // Validace
    if (!videoId || typeof videoId !== 'string') {
      throw new Error('Neplatné video ID');
    }

    // YouTube oEmbed API - funguje bez CORS problémů
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

    log('VIDEO_INFO', 'Volám oEmbed API:', oEmbedUrl);

    const response = await fetch(oEmbedUrl);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Video neexistuje nebo je soukromé');
      }
      throw new Error(`oEmbed selhalo: HTTP ${response.status}`);
    }

    const data = await response.json();

    log('VIDEO_INFO', 'oEmbed odpověď:', data);

    // Sestavit odpověď
    const result = {
      success: true,
      videoId: videoId,
      title: data.title || 'Neznámý název',
      author: data.author_name || 'Neznámý autor',
      authorUrl: data.author_url,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      thumbnailMedium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      // Informace o metodách stahování
      downloadInfo: {
        directDownloadPossible: false,
        reason: 'YouTube CORS politika blokuje přímé stahování z prohlížeče',
        recommendedMethod: 'cobalt.tools',
        cobaltUrl: `https://cobalt.tools/?url=https://www.youtube.com/watch?v=${videoId}`
      }
    };

    log('VIDEO_INFO', 'Odesílám odpověď:', result);
    sendResponse(result);

  } catch (error) {
    logError('VIDEO_INFO', 'Chyba při získávání info:', error);
    sendResponse({
      success: false,
      error: error.message,
      videoId: videoId
    });
  }
}

// ============================================================================
// STARTUP
// ============================================================================

log('STARTUP', 'AdHub YouTube Downloader v3.0 spuštěn', {
  version: chrome.runtime.getManifest().version,
  id: chrome.runtime.id,
  capabilities: {
    directDownload: '❌ NEDOSTUPNÉ (CORS)',
    cobaltWeb: '✓ Dostupné (webová služba)',
    metadata: '✓ Dostupné (oEmbed API)'
  }
});
