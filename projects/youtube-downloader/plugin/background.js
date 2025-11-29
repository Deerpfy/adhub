/**
 * AdHub Youtube Downloader - Background Service Worker
 * Verze: 2.0.0
 *
 * Tento soubor obsahuje hlavni logiku pro stahovaní YouTube videí.
 * Kazdy krok je logovany pro snadne debugovani.
 *
 * DULEZITE: Zadne cykly, zadne intervaly, zadne memory leaky!
 */

// ============================================================================
// DEBUG LOGGER - Pro sledovani kazdeho kroku
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
// MESSAGE HANDLER - Centralni zpracovani zprav
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('MESSAGE', `Prijata zprava: ${request.action}`, {
    from: sender.tab ? `tab ${sender.tab.id}` : 'popup/external',
    request
  });

  // Zpracovani jednotlivych akci
  switch (request.action) {
    case 'ping':
      handlePing(sendResponse);
      return true;

    case 'getVideoInfo':
      handleGetVideoInfo(request.videoId, sendResponse);
      return true;

    case 'getDownloadLinks':
      handleGetDownloadLinks(request.videoId, sendResponse);
      return true;

    case 'downloadVideo':
      handleDownloadVideo(request, sendResponse);
      return true;

    case 'checkStatus':
      handleCheckStatus(sendResponse);
      return true;

    case 'getExtensionInfo':
      handleGetExtensionInfo(sendResponse);
      return true;

    default:
      log('MESSAGE', `Neznama akce: ${request.action}`);
      sendResponse({ success: false, error: 'Neznama akce' });
      return false;
  }
});

// ============================================================================
// HANDLER: Ping - Pro kontrolu ze plugin je aktivni
// ============================================================================

function handlePing(sendResponse) {
  log('PING', 'Plugin je aktivni');
  sendResponse({
    success: true,
    active: true,
    version: chrome.runtime.getManifest().version
  });
}

// ============================================================================
// HANDLER: Check Status - Kontrola stavu pluginu
// ============================================================================

function handleCheckStatus(sendResponse) {
  log('STATUS', 'Kontrola stavu pluginu');
  const manifest = chrome.runtime.getManifest();
  sendResponse({
    success: true,
    active: true,
    version: manifest.version,
    name: manifest.name
  });
}

// ============================================================================
// HANDLER: Get Extension Info - Informace o pluginu
// ============================================================================

function handleGetExtensionInfo(sendResponse) {
  log('INFO', 'Ziskavam informace o pluginu');
  const manifest = chrome.runtime.getManifest();
  sendResponse({
    success: true,
    id: chrome.runtime.id,
    version: manifest.version,
    name: manifest.name
  });
}

// ============================================================================
// HANDLER: Get Video Info - Ziskani informaci o videu
// ============================================================================

async function handleGetVideoInfo(videoId, sendResponse) {
  log('VIDEO_INFO', `Ziskavam info pro video: ${videoId}`);

  try {
    // Krok 1: Validace video ID
    if (!videoId || typeof videoId !== 'string') {
      throw new Error('Neplatne video ID');
    }
    log('VIDEO_INFO', 'Krok 1: Video ID validovano');

    // Krok 2: Ziskani oEmbed dat
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    log('VIDEO_INFO', 'Krok 2: Stahuji oEmbed data', { url: oEmbedUrl });

    const oEmbedResponse = await fetch(oEmbedUrl);
    if (!oEmbedResponse.ok) {
      throw new Error(`oEmbed request selhal: ${oEmbedResponse.status}`);
    }

    const oEmbedData = await oEmbedResponse.json();
    log('VIDEO_INFO', 'Krok 3: oEmbed data ziskana', oEmbedData);

    // Krok 4: Sestaveni vysledku
    const result = {
      success: true,
      videoId: videoId,
      title: oEmbedData.title || 'Neznamy nazev',
      author: oEmbedData.author_name || 'Neznamy autor',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      thumbnailMedium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    };

    log('VIDEO_INFO', 'Krok 4: Vysledek sestaven', result);
    sendResponse(result);

  } catch (error) {
    logError('VIDEO_INFO', 'Chyba pri ziskavani info', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// ============================================================================
// HANDLER: Get Download Links - Ziskani odkazu ke stazeni
// ============================================================================

async function handleGetDownloadLinks(videoId, sendResponse) {
  log('DOWNLOAD_LINKS', `Ziskavam odkazy pro video: ${videoId}`);

  try {
    // Krok 1: Validace
    if (!videoId || typeof videoId !== 'string') {
      throw new Error('Neplatne video ID');
    }
    log('DOWNLOAD_LINKS', 'Krok 1: Video ID validovano');

    // Krok 2: Stazeni YouTube stranky
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    log('DOWNLOAD_LINKS', 'Krok 2: Stahuji YouTube stranku', { url: pageUrl });

    const pageResponse = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!pageResponse.ok) {
      throw new Error(`Stazeni stranky selhalo: ${pageResponse.status}`);
    }

    const pageHtml = await pageResponse.text();
    log('DOWNLOAD_LINKS', `Krok 3: Stranka stazena (${pageHtml.length} znaku)`);

    // Krok 4: Parsovani ytInitialPlayerResponse
    const formats = extractFormats(pageHtml);
    log('DOWNLOAD_LINKS', `Krok 4: Nalezeno ${formats.length} formatu`);

    // Krok 5: Kategorizace formatu
    const categorizedFormats = categorizeFormats(formats);
    log('DOWNLOAD_LINKS', 'Krok 5: Formaty kategorizovany', categorizedFormats);

    sendResponse({
      success: true,
      videoId: videoId,
      formats: categorizedFormats
    });

  } catch (error) {
    logError('DOWNLOAD_LINKS', 'Chyba pri ziskavani odkazu', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// ============================================================================
// HELPER: Extract Formats - Extrakce formatu z HTML
// ============================================================================

function extractFormats(html) {
  log('EXTRACT', 'Zacinam extrakci formatu');
  const formats = [];

  try {
    // Hledani ytInitialPlayerResponse
    const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);

    if (!playerMatch) {
      log('EXTRACT', 'ytInitialPlayerResponse nenalezeno, zkousim alternativni metodu');
      return extractFormatsAlternative(html);
    }

    const playerData = JSON.parse(playerMatch[1]);
    log('EXTRACT', 'ytInitialPlayerResponse nalezeno a parsovano');

    // Ziskani streamingData
    const streamingData = playerData.streamingData;
    if (!streamingData) {
      throw new Error('StreamingData nenalezeno');
    }

    // Zpracovani adaptivnich formatu (video-only, audio-only)
    if (streamingData.adaptiveFormats) {
      log('EXTRACT', `Zpracovavam ${streamingData.adaptiveFormats.length} adaptivnich formatu`);
      for (const format of streamingData.adaptiveFormats) {
        const processedFormat = processFormat(format);
        if (processedFormat) {
          formats.push(processedFormat);
        }
      }
    }

    // Zpracovani kombinovanych formatu (video + audio)
    if (streamingData.formats) {
      log('EXTRACT', `Zpracovavam ${streamingData.formats.length} kombinovanych formatu`);
      for (const format of streamingData.formats) {
        const processedFormat = processFormat(format, true);
        if (processedFormat) {
          formats.push(processedFormat);
        }
      }
    }

  } catch (error) {
    logError('EXTRACT', 'Chyba pri extrakci', error);
  }

  log('EXTRACT', `Celkem extrahovano ${formats.length} formatu`);
  return formats;
}

// ============================================================================
// HELPER: Extract Formats Alternative - Alternativni metoda extrakce
// ============================================================================

function extractFormatsAlternative(html) {
  log('EXTRACT_ALT', 'Pouzivam alternativni metodu extrakce');
  const formats = [];

  try {
    // Hledani v embedded player config
    const configMatch = html.match(/ytcfg\.set\s*\(\s*(\{.+?\})\s*\)/s);
    if (configMatch) {
      log('EXTRACT_ALT', 'Nalezen ytcfg.set');
    }

    // Dalsi alternativni metody mohou byt pridany zde

  } catch (error) {
    logError('EXTRACT_ALT', 'Alternativni metoda selhala', error);
  }

  return formats;
}

// ============================================================================
// HELPER: Process Format - Zpracovani jednoho formatu
// ============================================================================

function processFormat(format, isCombined = false) {
  try {
    // Ziskani URL
    let url = format.url;

    // Pokud je URL sifrovane, potrebujeme desifrovat
    if (!url && format.signatureCipher) {
      log('FORMAT', 'Format vyzaduje desifrovani');
      // Desifrovani je komplexni a casto se meni, prozatim preskakujeme
      return null;
    }

    if (!url) {
      return null;
    }

    // Urceni typu
    const mimeType = format.mimeType || '';
    const isVideo = mimeType.includes('video/');
    const isAudio = mimeType.includes('audio/');

    // Parsovani codeku
    const codecMatch = mimeType.match(/codecs="([^"]+)"/);
    const codec = codecMatch ? codecMatch[1] : 'unknown';

    // Urceni formatu
    let container = 'unknown';
    if (mimeType.includes('mp4')) container = 'mp4';
    else if (mimeType.includes('webm')) container = 'webm';
    else if (mimeType.includes('3gpp')) container = '3gp';

    // Sestaveni vysledku
    const result = {
      itag: format.itag,
      url: url,
      mimeType: mimeType,
      container: container,
      codec: codec,
      fileSize: format.contentLength ? parseInt(format.contentLength) : null,
      type: isCombined ? 'combined' : (isVideo ? 'video' : 'audio')
    };

    // Pridani video specifickych dat
    if (isVideo || isCombined) {
      result.width = format.width;
      result.height = format.height;
      result.quality = format.qualityLabel || `${format.height}p`;
      result.fps = format.fps;
    }

    // Pridani audio specifickych dat
    if (isAudio) {
      result.audioQuality = format.audioQuality;
      result.bitrate = format.bitrate;
      result.audioSampleRate = format.audioSampleRate;
    }

    log('FORMAT', `Zpracovan format itag=${format.itag}`, result);
    return result;

  } catch (error) {
    logError('FORMAT', 'Chyba pri zpracovani formatu', error);
    return null;
  }
}

// ============================================================================
// HELPER: Categorize Formats - Kategorizace formatu do skupin
// ============================================================================

function categorizeFormats(formats) {
  log('CATEGORIZE', 'Kategorizuji formaty');

  const result = {
    video: {
      mp4: [],
      webm: []
    },
    audio: {
      m4a: [],
      webm: [],
      mp3: [], // MP3 konverze bude potrebovat server
      wav: []  // WAV konverze bude potrebovat server
    },
    combined: {
      mp4: [],
      webm: []
    }
  };

  for (const format of formats) {
    if (format.type === 'combined') {
      if (format.container === 'mp4') {
        result.combined.mp4.push(format);
      } else if (format.container === 'webm') {
        result.combined.webm.push(format);
      }
    } else if (format.type === 'video') {
      if (format.container === 'mp4') {
        result.video.mp4.push(format);
      } else if (format.container === 'webm') {
        result.video.webm.push(format);
      }
    } else if (format.type === 'audio') {
      if (format.container === 'mp4') {
        result.audio.m4a.push(format);
      } else if (format.container === 'webm') {
        result.audio.webm.push(format);
      }
    }
  }

  // Serazeni podle kvality (nejvyssi prvni)
  result.video.mp4.sort((a, b) => (b.height || 0) - (a.height || 0));
  result.video.webm.sort((a, b) => (b.height || 0) - (a.height || 0));
  result.combined.mp4.sort((a, b) => (b.height || 0) - (a.height || 0));
  result.combined.webm.sort((a, b) => (b.height || 0) - (a.height || 0));
  result.audio.m4a.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
  result.audio.webm.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  log('CATEGORIZE', 'Kategorizace dokoncena', {
    videoMp4: result.video.mp4.length,
    videoWebm: result.video.webm.length,
    audioM4a: result.audio.m4a.length,
    audioWebm: result.audio.webm.length,
    combinedMp4: result.combined.mp4.length,
    combinedWebm: result.combined.webm.length
  });

  return result;
}

// ============================================================================
// HANDLER: Download Video - Stazeni videa
// ============================================================================

async function handleDownloadVideo(request, sendResponse) {
  const { url, filename, videoId, itag } = request;
  log('DOWNLOAD', 'Zacinam stahovani', { filename, videoId, itag });

  try {
    // Krok 1: Validace
    if (!url) {
      throw new Error('Chybi URL pro stazeni');
    }
    log('DOWNLOAD', 'Krok 1: Parametry validovany');

    // Krok 2: Stazeni jako blob
    log('DOWNLOAD', 'Krok 2: Stahuji video data...');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Stazeni selhalo: ${response.status}`);
    }

    const blob = await response.blob();
    log('DOWNLOAD', `Krok 3: Data stazena (${blob.size} bytes)`);

    // Krok 4: Vytvoreni object URL
    const objectUrl = URL.createObjectURL(blob);
    log('DOWNLOAD', 'Krok 4: Object URL vytvoreno');

    // Krok 5: Spusteni stahovani
    log('DOWNLOAD', 'Krok 5: Spoustim stahovani do prohlizece');

    const downloadId = await chrome.downloads.download({
      url: objectUrl,
      filename: filename || `youtube-video-${videoId || 'unknown'}.mp4`,
      saveAs: true
    });

    log('DOWNLOAD', `Krok 6: Stahovani spusteno, ID: ${downloadId}`);

    // Krok 7: Cekame na dokonceni a uvolnime object URL
    // Pouzivame jednorazovy listener, ne interval!
    chrome.downloads.onChanged.addListener(function cleanup(delta) {
      if (delta.id === downloadId && delta.state) {
        if (delta.state.current === 'complete' || delta.state.current === 'interrupted') {
          log('DOWNLOAD', `Krok 7: Stahovani dokonceno, uklizim object URL`);
          URL.revokeObjectURL(objectUrl);
          // Odebrani listeneru - DULEZITE pro zabraneni memory leaku!
          chrome.downloads.onChanged.removeListener(cleanup);
        }
      }
    });

    sendResponse({
      success: true,
      downloadId: downloadId,
      message: 'Stahovani bylo uspesne spusteno'
    });

  } catch (error) {
    logError('DOWNLOAD', 'Chyba pri stahovani', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// ============================================================================
// EXTERNAL MESSAGE HANDLER - Pro komunikaci s webovymi strankami
// ============================================================================

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  log('EXTERNAL', `Externi zprava od: ${sender.origin}`, request);

  // Povolene domeny
  const allowedOrigins = [
    'http://localhost',
    'https://deerpfy.github.io'
  ];

  const isAllowed = allowedOrigins.some(origin =>
    sender.origin && sender.origin.startsWith(origin)
  );

  if (!isAllowed) {
    logError('EXTERNAL', `Nepovoleny puvod: ${sender.origin}`);
    sendResponse({ success: false, error: 'Pristup odepren' });
    return false;
  }

  // Zpracovani zpravy stejne jako interni
  switch (request.action) {
    case 'ping':
      handlePing(sendResponse);
      return true;

    case 'getVideoInfo':
      handleGetVideoInfo(request.videoId, sendResponse);
      return true;

    case 'getDownloadLinks':
      handleGetDownloadLinks(request.videoId, sendResponse);
      return true;

    case 'downloadVideo':
      handleDownloadVideo(request, sendResponse);
      return true;

    case 'checkStatus':
      handleCheckStatus(sendResponse);
      return true;

    case 'getExtensionInfo':
      handleGetExtensionInfo(sendResponse);
      return true;

    default:
      sendResponse({ success: false, error: 'Neznama akce' });
      return false;
  }
});

// ============================================================================
// STARTUP LOG - Pro potvrzeni ze service worker bezi
// ============================================================================

log('STARTUP', 'AdHub Youtube Downloader service worker spusten', {
  version: chrome.runtime.getManifest().version,
  id: chrome.runtime.id
});
