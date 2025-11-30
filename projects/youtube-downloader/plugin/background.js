/**
 * AdHub YouTube Downloader v5.6 - Background Script
 *
 * Hybridni rezim:
 * - Zakladni: Prime stahovani pres chrome.downloads (max 720p)
 * - Rozsireny: Native Messaging s yt-dlp/ffmpeg (vse)
 *
 * Nove v5.6:
 * - Opraveno stahovani - vylepsene format selectory a retry logika
 */

console.log('[AdHub BG] YouTube Downloader v5.6 (Hybrid) loaded');

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
  },
  nativePort: null
};

// ============================================================================
// INIT - Nacti nastaveni pri startu
// ============================================================================

(async function init() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      state.settings = { ...state.settings, ...result[STORAGE_KEY] };
      console.log('[AdHub BG] Nastaveni nacteno:', state.settings);
    }
  } catch (e) {
    console.log('[AdHub BG] Chyba pri nacitani nastaveni:', e);
  }
})();

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[AdHub BG] Message:', request.action);

  switch (request.action) {
    case 'ping':
      sendResponse({ success: true, version: '5.6', mode: 'hybrid' });
      return false;

    case 'download':
      handleDownload(request.data)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'downloadAdvanced':
      handleAdvancedDownload(request.data)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({
          success: false,
          error: error.message,
          raw_error: error.raw_error || null
        }));
      return true;

    case 'checkNativeHost':
      checkNativeHost()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ nativeHostAvailable: false, error: error.message }));
      return true;

    case 'testTool':
      testTool(request.tool, request.path)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'checkYtdlpUpdate':
      checkYtdlpUpdate()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'updateYtdlp':
      updateYtdlp()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'updateSettings':
      state.settings = { ...state.settings, ...request.settings };
      console.log('[AdHub BG] Nastaveni aktualizovano:', state.settings);
      sendResponse({ success: true });
      return false;

    case 'getSettings':
      sendResponse({ success: true, settings: state.settings });
      return false;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
      return false;
  }
});

// ============================================================================
// COOKIES - Automaticke ziskavani pro vekove omezena videa
// ============================================================================

async function getYouTubeCookies() {
  try {
    // Ziskat vsechny YouTube cookies (vcetne YouTube Music)
    const cookies = await chrome.cookies.getAll({ domain: '.youtube.com' });
    const musicCookies = await chrome.cookies.getAll({ domain: 'music.youtube.com' });
    const googleCookies = await chrome.cookies.getAll({ domain: '.google.com' });

    const allCookies = [...cookies, ...musicCookies, ...googleCookies];

    if (allCookies.length === 0) {
      console.log('[AdHub BG] Zadne YouTube cookies nenalezeny');
      return null;
    }

    // Konvertovat na Netscape format (pro yt-dlp)
    const netscapeCookies = allCookies.map(cookie => {
      const domain = cookie.domain.startsWith('.') ? cookie.domain : '.' + cookie.domain;
      const flag = cookie.domain.startsWith('.') ? 'TRUE' : 'FALSE';
      const path = cookie.path || '/';
      const secure = cookie.secure ? 'TRUE' : 'FALSE';
      const expires = cookie.expirationDate ? Math.floor(cookie.expirationDate) : 0;
      const name = cookie.name;
      const value = cookie.value;

      return `${domain}\t${flag}\t${path}\t${secure}\t${expires}\t${name}\t${value}`;
    });

    // Pridat hlavicku Netscape formatu
    const cookieFile = [
      '# Netscape HTTP Cookie File',
      '# https://curl.haxx.se/docs/http-cookies.html',
      '# This file was generated by AdHub YouTube Downloader',
      '',
      ...netscapeCookies
    ].join('\n');

    console.log('[AdHub BG] Ziskano', allCookies.length, 'cookies');
    return cookieFile;

  } catch (e) {
    console.error('[AdHub BG] Chyba pri ziskavani cookies:', e);
    return null;
  }
}

// ============================================================================
// ZAKLADNI STAHOVANI (Prime URL pres chrome.downloads)
// ============================================================================

async function handleDownload(data) {
  const { url, filename } = data;

  if (!url) {
    throw new Error('URL is required');
  }

  console.log('[AdHub BG] Starting basic download:', filename);

  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: url,
      filename: filename || 'video.mp4',
      saveAs: false,
      conflictAction: 'uniquify'
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('[AdHub BG] Download error:', chrome.runtime.lastError.message);
        reject(new Error(chrome.runtime.lastError.message));
      } else if (downloadId === undefined) {
        reject(new Error('Download failed to start'));
      } else {
        console.log('[AdHub BG] Download started, ID:', downloadId);
        resolve({ success: true, downloadId: downloadId });
      }
    });
  });
}

// ============================================================================
// ROZSIRENE STAHOVANI (pres Native Host s yt-dlp)
// ============================================================================

async function handleAdvancedDownload(data) {
  const { videoUrl, format, quality, audioFormat } = data;

  if (!videoUrl) {
    throw new Error('Video URL is required');
  }

  console.log('[AdHub BG] Starting advanced download via native host');

  // Automaticky ziskat cookies
  const cookies = await getYouTubeCookies();

  return sendNativeMessage({
    action: 'download',
    url: videoUrl,
    format: format || 'mp4',
    quality: quality || 'best',
    audioFormat: audioFormat,
    ytdlpPath: state.settings.ytdlpPath,
    ffmpegPath: state.settings.ffmpegPath,
    cookies: cookies,  // Poslat cookies na native host
    useCookies: true
  });
}

// ============================================================================
// NATIVE MESSAGING
// ============================================================================

function connectNativeHost() {
  if (state.nativePort) {
    return state.nativePort;
  }

  try {
    state.nativePort = chrome.runtime.connectNative(NATIVE_HOST);

    state.nativePort.onDisconnect.addListener(() => {
      console.log('[AdHub BG] Native host disconnected');
      state.nativePort = null;
    });

    console.log('[AdHub BG] Connected to native host');
    return state.nativePort;

  } catch (e) {
    console.error('[AdHub BG] Failed to connect native host:', e);
    state.nativePort = null;
    throw e;
  }
}

async function sendNativeMessage(message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendNativeMessage(NATIVE_HOST, message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[AdHub BG] Native message error:', chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response?.success === false) {
          // Predat celou odpoved vcetne raw_error
          console.error('[AdHub BG] Native host error:', response.error, response.raw_error);
          const error = new Error(response.error || 'Unknown error');
          error.raw_error = response.raw_error;
          error.response = response;
          reject(error);
        } else {
          resolve(response);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function checkNativeHost() {
  try {
    const response = await sendNativeMessage({
      action: 'check',
      ytdlpPath: state.settings.ytdlpPath,
      ffmpegPath: state.settings.ffmpegPath
    });

    return {
      nativeHostAvailable: true,
      ytdlpAvailable: response.ytdlp?.available || false,
      ytdlpVersion: response.ytdlp?.version || null,
      ffmpegAvailable: response.ffmpeg?.available || false,
      ffmpegVersion: response.ffmpeg?.version || null
    };

  } catch (e) {
    console.log('[AdHub BG] Native host check failed:', e.message);
    return {
      nativeHostAvailable: false,
      error: e.message
    };
  }
}

async function testTool(tool, path) {
  try {
    const response = await sendNativeMessage({
      action: 'test',
      tool: tool,
      path: path
    });

    return {
      success: response.available || false,
      version: response.version || null,
      error: response.error || null
    };

  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
}

// ============================================================================
// YT-DLP UPDATE KONTROLA
// ============================================================================

async function checkYtdlpUpdate() {
  try {
    const response = await sendNativeMessage({
      action: 'checkYtdlpUpdate',
      ytdlpPath: state.settings.ytdlpPath
    });

    console.log('[AdHub BG] yt-dlp update check:', response);
    return response;

  } catch (e) {
    console.log('[AdHub BG] yt-dlp update check failed:', e.message);
    return {
      success: false,
      error: e.message
    };
  }
}

async function updateYtdlp() {
  try {
    console.log('[AdHub BG] Starting yt-dlp update...');

    const response = await sendNativeMessage({
      action: 'updateYtdlp',
      ytdlpPath: state.settings.ytdlpPath
    });

    console.log('[AdHub BG] yt-dlp update result:', response);
    return response;

  } catch (e) {
    console.log('[AdHub BG] yt-dlp update failed:', e.message);
    return {
      success: false,
      error: e.message
    };
  }
}

// ============================================================================
// DOWNLOAD STATUS TRACKING
// ============================================================================

chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state) {
    if (delta.state.current === 'complete') {
      console.log('[AdHub BG] Download completed:', delta.id);
    } else if (delta.state.current === 'interrupted') {
      console.log('[AdHub BG] Download interrupted:', delta.id, delta.error);
    }
  }
});
