/**
 * AdHub YouTube Downloader v5.3 - Background Script
 *
 * Jednoduchý background script pro stahování přes chrome.downloads API.
 * Žádné další závislosti - funguje ihned po instalaci extension.
 */

console.log('[AdHub BG] YouTube Downloader v5.3 loaded');

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[AdHub BG] Message:', request.action);

  if (request.action === 'download') {
    handleDownload(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Async response
  }

  if (request.action === 'ping') {
    sendResponse({ success: true, version: '5.3' });
    return false;
  }

  sendResponse({ success: false, error: 'Unknown action' });
  return false;
});

// ============================================================================
// STAHOVÁNÍ
// ============================================================================

async function handleDownload(data) {
  const { url, filename } = data;

  if (!url) {
    throw new Error('URL is required');
  }

  console.log('[AdHub BG] Starting download:', filename);

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
