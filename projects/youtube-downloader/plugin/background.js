/**
 * AdHub Youtube Downloader - Background Service Worker
 * Verze: 2.3.0
 *
 * Tento soubor obsahuje hlavni logiku pro stahovaní YouTube videí.
 * Kazdy krok je logovany pro snadne debugovani.
 *
 * DULEZITE: Zadne cykly, zadne intervaly, zadne memory leaky!
 */

// Import DownloadService
importScripts('download-service.js');

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

    case 'saveBlob':
      handleSaveBlob(request, sendResponse, sender);
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
// HANDLER: Get Download Links - Ziskani odkazu ke stazeni (NOVÁ VERZE)
// ============================================================================

async function handleGetDownloadLinks(videoId, sendResponse) {
  log('DOWNLOAD_LINKS', `=== ZAČÁTEK: Získávám odkazy pro video: ${videoId} ===`);

  try {
    // Krok 1: Validace
    if (!videoId || typeof videoId !== 'string') {
      throw new Error('Neplatne video ID');
    }
    log('DOWNLOAD_LINKS', 'Krok 1: Video ID validovano');

    // Krok 2: Použití nové DownloadService s více metodami
    log('DOWNLOAD_LINKS', 'Krok 2: Volám DownloadService (Cobalt → Invidious → Direct)');

    const result = await DownloadService.getDownloadLinks(videoId);

    log('DOWNLOAD_LINKS', 'Krok 3: DownloadService odpověděl', {
      success: result.success,
      method: result.method,
      formatsCount: DownloadService.countFormats(result.formats),
      errors: result.errors,
      debug: result.debug
    });

    if (result.success) {
      log('DOWNLOAD_LINKS', `=== ÚSPĚCH: Metoda "${result.method}" ===`);
      sendResponse({
        success: true,
        videoId: videoId,
        formats: result.formats,
        method: result.method,
        errors: result.errors || [],  // Zahrnout i errory z predchozich pokusu
        videoInfo: result.videoInfo,
        debug: result.debug
      });
    } else {
      log('DOWNLOAD_LINKS', '=== SELHÁNÍ: Všechny metody selhaly ===');
      sendResponse({
        success: false,
        error: `Všechny metody selhaly: ${result.errors.join('; ')}`,
        debug: result.debug
      });
    }

  } catch (error) {
    logError('DOWNLOAD_LINKS', 'Kritická chyba', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// ============================================================================
// HANDLER: Get Download Links (LEGACY - pro zpětnou kompatibilitu)
// ============================================================================

async function handleGetDownloadLinksLegacy(videoId, sendResponse) {
  log('DOWNLOAD_LINKS_LEGACY', `Ziskavam odkazy pro video: ${videoId}`);

  try {
    if (!videoId || typeof videoId !== 'string') {
      throw new Error('Neplatne video ID');
    }

    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!pageResponse.ok) {
      throw new Error(`Stazeni stranky selhalo: ${pageResponse.status}`);
    }

    const pageHtml = await pageResponse.text();
    const formats = extractFormats(pageHtml);
    const categorizedFormats = categorizeFormats(formats);

    sendResponse({
      success: true,
      videoId: videoId,
      formats: categorizedFormats,
      method: 'legacy'
    });

  } catch (error) {
    logError('DOWNLOAD_LINKS_LEGACY', 'Chyba', error);
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
    // Hledani ytInitialPlayerResponse s lepsim regexem
    // YouTube muze mit ruzne formaty, zkusime vice patternu
    let playerData = null;

    // Pattern 1: ytInitialPlayerResponse = {...};
    const patterns = [
      /ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var|let|const|<\/script>)/s,
      /ytInitialPlayerResponse\s*=\s*(\{.+?\});/s,
      /var\s+ytInitialPlayerResponse\s*=\s*(\{.+?\});/s
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          // Zkusime najit konec JSON objektu spravne
          const jsonStr = extractCompleteJson(html, match.index + match[0].indexOf('{'));
          if (jsonStr) {
            playerData = JSON.parse(jsonStr);
            log('EXTRACT', 'ytInitialPlayerResponse nalezeno a parsovano');
            break;
          }
        } catch (e) {
          log('EXTRACT', `Pattern nefungoval: ${e.message}`);
        }
      }
    }

    if (!playerData) {
      log('EXTRACT', 'ytInitialPlayerResponse nenalezeno, zkousim alternativni metodu');
      return extractFormatsAlternative(html);
    }

    // Ziskani streamingData
    const streamingData = playerData.streamingData;
    if (!streamingData) {
      log('EXTRACT', 'StreamingData nenalezeno, zkousim alternativni metodu');
      return extractFormatsAlternative(html);
    }

    // Extrahuj base.js URL pro decipher (pokud potreba)
    const baseJsUrl = extractBaseJsUrl(html);
    log('EXTRACT', 'Base.js URL:', baseJsUrl);

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
// HELPER: Extract Complete JSON - Extrakce kompletniho JSON objektu
// ============================================================================

function extractCompleteJson(str, startIndex) {
  let depth = 0;
  let inString = false;
  let escape = false;
  let start = startIndex;

  for (let i = startIndex; i < str.length && i < startIndex + 500000; i++) {
    const char = str[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    if (char === '"' && !escape) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) {
          return str.substring(start, i + 1);
        }
      }
    }
  }

  return null;
}

// ============================================================================
// HELPER: Extract Base.js URL - Extrakce URL pro decipher script
// ============================================================================

function extractBaseJsUrl(html) {
  const patterns = [
    /"jsUrl":"(\/s\/player\/[^"]+\/player_ias\.vflset\/[^"]+\/base\.js)"/,
    /"PLAYER_JS_URL":"(\/s\/player\/[^"]+base\.js)"/,
    /src="(\/s\/player\/[^"]+base\.js)"/
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return 'https://www.youtube.com' + match[1];
    }
  }

  return null;
}

// ============================================================================
// HELPER: Extract Formats Alternative - Alternativni metoda extrakce
// ============================================================================

function extractFormatsAlternative(html) {
  log('EXTRACT_ALT', 'Pouzivam alternativni metodu extrakce');
  const formats = [];

  try {
    // Metoda 1: Hledani streamingData primo v HTML
    const streamingMatch = html.match(/"streamingData"\s*:\s*(\{[^}]+(?:\{[^}]*\}[^}]*)*\})/);
    if (streamingMatch) {
      try {
        const streamingData = JSON.parse(streamingMatch[1]);
        log('EXTRACT_ALT', 'Nalezeno streamingData v HTML');

        if (streamingData.formats) {
          for (const format of streamingData.formats) {
            const processed = processFormat(format, true);
            if (processed) formats.push(processed);
          }
        }

        if (streamingData.adaptiveFormats) {
          for (const format of streamingData.adaptiveFormats) {
            const processed = processFormat(format);
            if (processed) formats.push(processed);
          }
        }
      } catch (e) {
        log('EXTRACT_ALT', 'Nelze parsovat streamingData', e.message);
      }
    }

    // Metoda 2: Hledani jednotlivych format URL v HTML
    if (formats.length === 0) {
      const urlPatterns = [
        /https:\/\/[^"]+googlevideo\.com\/videoplayback[^"]+/g,
        /"url"\s*:\s*"(https:\/\/[^"]+googlevideo\.com[^"]+)"/g
      ];

      for (const pattern of urlPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          const url = match[1] || match[0];
          if (url && !formats.some(f => f.url === url)) {
            // Zkusime extrahovat itag z URL
            const itagMatch = url.match(/itag[=\/](\d+)/);
            const itag = itagMatch ? parseInt(itagMatch[1]) : null;

            if (itag) {
              const formatInfo = getFormatInfoByItag(itag);
              formats.push({
                itag: itag,
                url: url.replace(/\\u0026/g, '&'),
                ...formatInfo
              });
              log('EXTRACT_ALT', `Nalezen format z URL: itag=${itag}`);
            }
          }
        }
      }
    }

  } catch (error) {
    logError('EXTRACT_ALT', 'Alternativni metoda selhala', error);
  }

  log('EXTRACT_ALT', `Nalezeno ${formats.length} formatu alternativni metodou`);
  return formats;
}

// ============================================================================
// HELPER: Get Format Info By Itag - Informace o formatu podle itag
// ============================================================================

function getFormatInfoByItag(itag) {
  // Mapa znamych YouTube itag hodnot
  const itagMap = {
    // Combined (video + audio)
    18: { container: 'mp4', codec: 'avc1/mp4a', quality: '360p', type: 'combined' },
    22: { container: 'mp4', codec: 'avc1/mp4a', quality: '720p', type: 'combined' },
    // Video only
    137: { container: 'mp4', codec: 'avc1', quality: '1080p', type: 'video' },
    136: { container: 'mp4', codec: 'avc1', quality: '720p', type: 'video' },
    135: { container: 'mp4', codec: 'avc1', quality: '480p', type: 'video' },
    134: { container: 'mp4', codec: 'avc1', quality: '360p', type: 'video' },
    133: { container: 'mp4', codec: 'avc1', quality: '240p', type: 'video' },
    160: { container: 'mp4', codec: 'avc1', quality: '144p', type: 'video' },
    298: { container: 'mp4', codec: 'avc1', quality: '720p60', type: 'video' },
    299: { container: 'mp4', codec: 'avc1', quality: '1080p60', type: 'video' },
    264: { container: 'mp4', codec: 'avc1', quality: '1440p', type: 'video' },
    266: { container: 'mp4', codec: 'avc1', quality: '2160p', type: 'video' },
    // WebM video
    248: { container: 'webm', codec: 'vp9', quality: '1080p', type: 'video' },
    247: { container: 'webm', codec: 'vp9', quality: '720p', type: 'video' },
    244: { container: 'webm', codec: 'vp9', quality: '480p', type: 'video' },
    243: { container: 'webm', codec: 'vp9', quality: '360p', type: 'video' },
    242: { container: 'webm', codec: 'vp9', quality: '240p', type: 'video' },
    278: { container: 'webm', codec: 'vp9', quality: '144p', type: 'video' },
    302: { container: 'webm', codec: 'vp9', quality: '720p60', type: 'video' },
    303: { container: 'webm', codec: 'vp9', quality: '1080p60', type: 'video' },
    308: { container: 'webm', codec: 'vp9', quality: '1440p60', type: 'video' },
    315: { container: 'webm', codec: 'vp9', quality: '2160p60', type: 'video' },
    // Audio only
    140: { container: 'mp4', codec: 'mp4a', audioQuality: '128kbps', type: 'audio' },
    141: { container: 'mp4', codec: 'mp4a', audioQuality: '256kbps', type: 'audio' },
    171: { container: 'webm', codec: 'vorbis', audioQuality: '128kbps', type: 'audio' },
    249: { container: 'webm', codec: 'opus', audioQuality: '50kbps', type: 'audio' },
    250: { container: 'webm', codec: 'opus', audioQuality: '70kbps', type: 'audio' },
    251: { container: 'webm', codec: 'opus', audioQuality: '160kbps', type: 'audio' }
  };

  return itagMap[itag] || {
    container: 'unknown',
    codec: 'unknown',
    quality: 'unknown',
    type: 'unknown'
  };
}

// ============================================================================
// HELPER: Process Format - Zpracovani jednoho formatu
// ============================================================================

function processFormat(format, isCombined = false) {
  try {
    // Ziskani URL
    let url = format.url;

    // Pokud je URL sifrovane v signatureCipher
    if (!url && format.signatureCipher) {
      log('FORMAT', `Format itag=${format.itag} ma signatureCipher`);
      const cipherUrl = decodeSignatureCipher(format.signatureCipher);
      if (cipherUrl) {
        url = cipherUrl;
        log('FORMAT', 'SignatureCipher dekodovano (bez signature)');
      }
    }

    // Pokud je URL sifrovane v cipher (starsi format)
    if (!url && format.cipher) {
      log('FORMAT', `Format itag=${format.itag} ma cipher`);
      const cipherUrl = decodeSignatureCipher(format.cipher);
      if (cipherUrl) {
        url = cipherUrl;
        log('FORMAT', 'Cipher dekodovano (bez signature)');
      }
    }

    if (!url) {
      log('FORMAT', `Format itag=${format.itag} nema URL, preskakuji`);
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
// HELPER: Decode Signature Cipher - Dekodovani signature cipher
// ============================================================================

function decodeSignatureCipher(cipher) {
  try {
    const params = new URLSearchParams(cipher);
    const url = params.get('url');
    const sig = params.get('s');
    const sp = params.get('sp') || 'sig';

    if (!url) {
      return null;
    }

    // Pokud neni signature, vrat jen URL (nekdy funguje)
    if (!sig) {
      return url;
    }

    // Vrat URL i s nezpracovanym signature parametrem
    // Nektera videa mohou fungovat i bez spravne desifrovane signature
    // Pro plnou podporu by bylo potreba implementovat signature deobfuscation
    const urlObj = new URL(url);
    urlObj.searchParams.set(sp, sig);

    return urlObj.toString();

  } catch (error) {
    logError('CIPHER', 'Chyba pri dekodovani cipher', error);
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

    // Krok 2: Priprava Referer URL pro YouTube
    const refererUrl = videoId
      ? `https://www.youtube.com/watch?v=${videoId}`
      : 'https://www.youtube.com/';
    log('DOWNLOAD', 'Krok 2: Pouzivam Referer:', refererUrl);

    // Krok 3: Stazeni jako blob
    log('DOWNLOAD', 'Krok 3: Stahuji video data...');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Referer': refererUrl,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      log('DOWNLOAD', 'Chyba odpovedi:', { status: response.status, text: errorText.substring(0, 200) });
      throw new Error(`Stazeni selhalo: ${response.status}`);
    }

    const blob = await response.blob();
    log('DOWNLOAD', `Krok 4: Data stazena (${blob.size} bytes, typ: ${blob.type})`);

    // Kontrola prazdneho blobu
    if (blob.size === 0) {
      throw new Error('Stazeny soubor je prazdny');
    }

    // Krok 5: Vytvoreni object URL
    const objectUrl = URL.createObjectURL(blob);
    log('DOWNLOAD', 'Krok 5: Object URL vytvoreno');

    // Krok 6: Spusteni stahovani
    log('DOWNLOAD', 'Krok 6: Spoustim stahovani do prohlizece');

    const downloadId = await chrome.downloads.download({
      url: objectUrl,
      filename: filename || `youtube-video-${videoId || 'unknown'}.mp4`,
      saveAs: false,
      conflictAction: 'uniquify'
    });

    log('DOWNLOAD', `Krok 7: Stahovani spusteno, ID: ${downloadId}`);

    // Krok 8: Cekame na dokonceni a uvolnime object URL
    // Pouzivame jednorazovy listener, ne interval!
    chrome.downloads.onChanged.addListener(function cleanup(delta) {
      if (delta.id === downloadId && delta.state) {
        if (delta.state.current === 'complete' || delta.state.current === 'interrupted') {
          log('DOWNLOAD', `Krok 8: Stahovani dokonceno, uklizim object URL`);
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
// HANDLER: Save Blob - Ulozeni blobu z content scriptu
// ============================================================================

async function handleSaveBlob(request, sendResponse, sender) {
  const { blobUrl, filename } = request;
  log('SAVE_BLOB', 'Ukladam blob z content scriptu', { filename });

  try {
    // Stahnout pres chrome.downloads API
    const downloadId = await chrome.downloads.download({
      url: blobUrl,
      filename: filename,
      saveAs: false,
      conflictAction: 'uniquify'
    });

    log('SAVE_BLOB', `Stahovani spusteno, ID: ${downloadId}`);

    // Listener pro cleanup
    chrome.downloads.onChanged.addListener(function cleanup(delta) {
      if (delta.id === downloadId && delta.state) {
        if (delta.state.current === 'complete' || delta.state.current === 'interrupted') {
          log('SAVE_BLOB', `Stahovani dokonceno`);
          chrome.downloads.onChanged.removeListener(cleanup);
        }
      }
    });

    sendResponse({
      success: true,
      downloadId: downloadId
    });

  } catch (error) {
    logError('SAVE_BLOB', 'Chyba pri ukladani', error);
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
