/**
 * AdHub YouTube Downloader - Download Service
 *
 * Hybridní služba pro stahování s více metodami a fallbacky.
 *
 * Metody (v pořadí priority):
 * 1. Cobalt API - nejspolehlivější
 * 2. Invidious API - fallback
 * 3. Přímá extrakce - poslední možnost
 */

const DownloadService = {
  // ============================================================================
  // KONFIGURACE
  // ============================================================================

  config: {
    // Cobalt API
    cobalt: {
      apiUrl: 'https://api.cobalt.tools/',
      timeout: 30000
    },

    // Invidious instance (seřazené podle spolehlivosti)
    invidious: {
      instances: [
        'https://invidious.nerdvpn.de',
        'https://yewtu.be',
        'https://vid.puffyan.us',
        'https://invidious.namazso.eu',
        'https://inv.nadeko.net',
        'https://invidious.private.coffee'
      ],
      timeout: 15000
    },

    // Debug mode
    debug: true
  },

  // ============================================================================
  // LOGGING
  // ============================================================================

  log(method, message, data = null) {
    if (!this.config.debug) return;
    const timestamp = new Date().toISOString();
    const prefix = `[DownloadService] [${timestamp}] [${method}]`;
    if (data) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  },

  logError(method, message, error = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[DownloadService ERROR] [${timestamp}] [${method}]`;
    if (error) {
      console.error(prefix, message, error);
    } else {
      console.error(prefix, message);
    }
  },

  // ============================================================================
  // HLAVNÍ METODA - getDownloadLinks
  // ============================================================================

  async getDownloadLinks(videoId) {
    this.log('MAIN', `Začínám získávat odkazy pro video: ${videoId}`);

    const results = {
      success: false,
      videoId: videoId,
      method: null,
      formats: {
        combined: { mp4: [], webm: [] },
        video: { mp4: [], webm: [] },
        audio: { m4a: [], webm: [] }
      },
      errors: [],
      debug: {
        attempts: [],
        totalTime: 0
      }
    };

    const startTime = Date.now();

    // METODA 1: Cobalt API
    try {
      this.log('MAIN', 'Zkouším Cobalt API...');
      results.debug.attempts.push({ method: 'cobalt', status: 'started' });

      const cobaltResult = await this.tryCobalt(videoId);
      if (cobaltResult.success && cobaltResult.formats) {
        results.success = true;
        results.method = 'cobalt';
        results.formats = cobaltResult.formats;
        results.videoInfo = cobaltResult.videoInfo;
        results.debug.attempts[results.debug.attempts.length - 1].status = 'success';
        results.debug.totalTime = Date.now() - startTime;

        this.log('MAIN', 'Cobalt úspěšný!', { formatsCount: this.countFormats(results.formats) });
        return results;
      }

      results.debug.attempts[results.debug.attempts.length - 1].status = 'failed';
      results.debug.attempts[results.debug.attempts.length - 1].error = cobaltResult.error;
      results.errors.push(`Cobalt: ${cobaltResult.error}`);
    } catch (e) {
      this.logError('MAIN', 'Cobalt selhal', e);
      results.errors.push(`Cobalt exception: ${e.message}`);
    }

    // METODA 2: Invidious API
    try {
      this.log('MAIN', 'Zkouším Invidious API...');
      results.debug.attempts.push({ method: 'invidious', status: 'started' });

      const invidiousResult = await this.tryInvidious(videoId);
      if (invidiousResult.success && invidiousResult.formats) {
        results.success = true;
        results.method = 'invidious';
        results.formats = invidiousResult.formats;
        results.videoInfo = invidiousResult.videoInfo;
        results.debug.attempts[results.debug.attempts.length - 1].status = 'success';
        results.debug.attempts[results.debug.attempts.length - 1].instance = invidiousResult.instance;
        results.debug.totalTime = Date.now() - startTime;

        this.log('MAIN', 'Invidious úspěšný!', { instance: invidiousResult.instance });
        return results;
      }

      results.debug.attempts[results.debug.attempts.length - 1].status = 'failed';
      results.errors.push(`Invidious: ${invidiousResult.error}`);
    } catch (e) {
      this.logError('MAIN', 'Invidious selhal', e);
      results.errors.push(`Invidious exception: ${e.message}`);
    }

    // METODA 3: Přímá extrakce (fallback)
    try {
      this.log('MAIN', 'Zkouším přímou extrakci...');
      results.debug.attempts.push({ method: 'direct', status: 'started' });

      const directResult = await this.tryDirectExtraction(videoId);
      if (directResult.success && this.countFormats(directResult.formats) > 0) {
        results.success = true;
        results.method = 'direct';
        results.formats = directResult.formats;
        results.videoInfo = directResult.videoInfo;
        results.debug.attempts[results.debug.attempts.length - 1].status = 'success';
        results.debug.totalTime = Date.now() - startTime;

        this.log('MAIN', 'Přímá extrakce úspěšná!');
        return results;
      }

      results.debug.attempts[results.debug.attempts.length - 1].status = 'failed';
      results.errors.push(`Direct: ${directResult.error || 'Žádné formáty'}`);
    } catch (e) {
      this.logError('MAIN', 'Přímá extrakce selhala', e);
      results.errors.push(`Direct exception: ${e.message}`);
    }

    results.debug.totalTime = Date.now() - startTime;
    this.logError('MAIN', 'Všechny metody selhaly', results.errors);

    return results;
  },

  // ============================================================================
  // METODA 1: Cobalt API
  // ============================================================================

  async tryCobalt(videoId) {
    this.log('COBALT', `Volám Cobalt API pro ${videoId}`);

    const result = {
      success: false,
      error: null,
      formats: null,
      videoInfo: null
    };

    try {
      // Cobalt API požadavek
      const response = await fetch(this.config.cobalt.apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: `https://youtube.com/watch?v=${videoId}`,
          downloadMode: 'auto',
          filenameStyle: 'pretty',
          videoQuality: 'max'
        })
      });

      this.log('COBALT', `Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        result.error = `HTTP ${response.status}: ${errorText.substring(0, 100)}`;
        return result;
      }

      const data = await response.json();
      this.log('COBALT', 'Response data:', data);

      // Cobalt vrací různé statusy
      if (data.status === 'error') {
        result.error = data.text || 'Cobalt error';
        return result;
      }

      if (data.status === 'redirect' || data.status === 'tunnel' || data.status === 'stream') {
        // Máme přímý download link
        result.success = true;
        result.formats = {
          combined: {
            mp4: [{
              itag: 'cobalt',
              url: data.url,
              quality: 'Auto (nejlepší)',
              container: 'mp4',
              codec: 'h264/aac',
              type: 'combined',
              source: 'cobalt',
              filename: data.filename || `${videoId}.mp4`
            }],
            webm: []
          },
          video: { mp4: [], webm: [] },
          audio: { m4a: [], webm: [] }
        };

        // Pokud Cobalt vrací picker (více možností)
        if (data.status === 'picker' && data.picker) {
          result.formats = this.parseCobaltPicker(data.picker, videoId);
        }

        return result;
      }

      result.error = `Neznámý Cobalt status: ${data.status}`;
      return result;

    } catch (error) {
      this.logError('COBALT', 'Exception', error);
      result.error = error.message;
      return result;
    }
  },

  parseCobaltPicker(picker, videoId) {
    const formats = {
      combined: { mp4: [], webm: [] },
      video: { mp4: [], webm: [] },
      audio: { m4a: [], webm: [] }
    };

    for (const item of picker) {
      const format = {
        itag: `cobalt_${item.type || 'unknown'}`,
        url: item.url,
        quality: item.type || 'Unknown',
        container: 'mp4',
        codec: 'h264/aac',
        source: 'cobalt'
      };

      if (item.type === 'video') {
        format.type = 'combined';
        formats.combined.mp4.push(format);
      } else if (item.type === 'audio') {
        format.type = 'audio';
        formats.audio.m4a.push(format);
      }
    }

    return formats;
  },

  // ============================================================================
  // METODA 2: Invidious API
  // ============================================================================

  async tryInvidious(videoId) {
    this.log('INVIDIOUS', `Zkouším Invidious instance pro ${videoId}`);

    const result = {
      success: false,
      error: null,
      formats: null,
      videoInfo: null,
      instance: null
    };

    const errors = [];

    for (const instance of this.config.invidious.instances) {
      try {
        this.log('INVIDIOUS', `Zkouším instanci: ${instance}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.invidious.timeout);

        const response = await fetch(`${instance}/api/v1/videos/${videoId}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          errors.push(`${instance}: HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();
        this.log('INVIDIOUS', `Instance ${instance} odpověděla`, {
          title: data.title,
          formatsCount: data.formatStreams?.length || 0,
          adaptiveCount: data.adaptiveFormats?.length || 0
        });

        // Parsování formátů
        const formats = this.parseInvidiousFormats(data, instance);

        if (this.countFormats(formats) === 0) {
          errors.push(`${instance}: Žádné formáty`);
          continue;
        }

        result.success = true;
        result.formats = formats;
        result.instance = instance;
        result.videoInfo = {
          title: data.title,
          author: data.author,
          lengthSeconds: data.lengthSeconds,
          thumbnail: data.videoThumbnails?.[0]?.url
        };

        return result;

      } catch (error) {
        const errorMsg = error.name === 'AbortError' ? 'Timeout' : error.message;
        errors.push(`${instance}: ${errorMsg}`);
        this.log('INVIDIOUS', `Instance ${instance} selhala: ${errorMsg}`);
      }
    }

    result.error = errors.join('; ');
    return result;
  },

  parseInvidiousFormats(data, instance) {
    const formats = {
      combined: { mp4: [], webm: [] },
      video: { mp4: [], webm: [] },
      audio: { m4a: [], webm: [] }
    };

    // Kombinované formáty (formatStreams)
    if (data.formatStreams) {
      for (const f of data.formatStreams) {
        const format = {
          itag: f.itag,
          url: f.url,
          quality: f.qualityLabel || f.quality,
          container: f.container || 'mp4',
          codec: f.encoding || 'unknown',
          type: 'combined',
          source: 'invidious',
          instance: instance,
          resolution: f.resolution
        };

        if (format.container === 'mp4') {
          formats.combined.mp4.push(format);
        } else if (format.container === 'webm') {
          formats.combined.webm.push(format);
        }
      }
    }

    // Adaptivní formáty (adaptiveFormats)
    if (data.adaptiveFormats) {
      for (const f of data.adaptiveFormats) {
        const isAudio = f.type?.startsWith('audio/');
        const isVideo = f.type?.startsWith('video/');

        const format = {
          itag: f.itag,
          url: f.url,
          quality: f.qualityLabel || f.audioQuality || f.bitrate,
          container: f.container || (f.type?.includes('webm') ? 'webm' : 'mp4'),
          codec: f.encoding || 'unknown',
          source: 'invidious',
          instance: instance,
          bitrate: f.bitrate,
          resolution: f.resolution
        };

        if (isAudio) {
          format.type = 'audio';
          format.audioQuality = f.audioQuality;
          if (f.container === 'webm' || f.type?.includes('webm')) {
            formats.audio.webm.push(format);
          } else {
            formats.audio.m4a.push(format);
          }
        } else if (isVideo) {
          format.type = 'video';
          if (f.container === 'webm' || f.type?.includes('webm')) {
            formats.video.webm.push(format);
          } else {
            formats.video.mp4.push(format);
          }
        }
      }
    }

    // Seřadit podle kvality
    formats.combined.mp4.sort((a, b) => this.parseQuality(b.quality) - this.parseQuality(a.quality));
    formats.combined.webm.sort((a, b) => this.parseQuality(b.quality) - this.parseQuality(a.quality));
    formats.video.mp4.sort((a, b) => this.parseQuality(b.quality) - this.parseQuality(a.quality));
    formats.video.webm.sort((a, b) => this.parseQuality(b.quality) - this.parseQuality(a.quality));
    formats.audio.m4a.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    formats.audio.webm.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

    return formats;
  },

  parseQuality(quality) {
    if (!quality) return 0;
    const match = String(quality).match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  },

  // ============================================================================
  // METODA 3: Přímá extrakce (stávající metoda jako fallback)
  // ============================================================================

  async tryDirectExtraction(videoId) {
    this.log('DIRECT', `Přímá extrakce pro ${videoId}`);

    const result = {
      success: false,
      error: null,
      formats: null,
      videoInfo: null
    };

    try {
      // Toto volá stávající implementaci v background.js
      // Zde jen delegujeme na existující kód

      const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        result.error = `HTTP ${response.status}`;
        return result;
      }

      const html = await response.text();
      this.log('DIRECT', `Staženo ${html.length} znaků HTML`);

      // Zkusíme najít ytInitialPlayerResponse
      const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var|let|const|<\/script>)/s);

      if (!playerMatch) {
        result.error = 'ytInitialPlayerResponse nenalezeno';
        return result;
      }

      // Extrahovat JSON
      const jsonStr = this.extractCompleteJson(html, playerMatch.index + playerMatch[0].indexOf('{'));
      if (!jsonStr) {
        result.error = 'Nelze extrahovat JSON';
        return result;
      }

      const playerData = JSON.parse(jsonStr);
      const streamingData = playerData.streamingData;

      if (!streamingData) {
        result.error = 'StreamingData nenalezeno';
        return result;
      }

      this.log('DIRECT', 'StreamingData nalezeno', {
        formatsCount: streamingData.formats?.length || 0,
        adaptiveCount: streamingData.adaptiveFormats?.length || 0
      });

      // Parsování formátů
      const formats = {
        combined: { mp4: [], webm: [] },
        video: { mp4: [], webm: [] },
        audio: { m4a: [], webm: [] }
      };

      // Kombinované formáty
      if (streamingData.formats) {
        for (const f of streamingData.formats) {
          const processed = this.processDirectFormat(f, true);
          if (processed) {
            if (processed.container === 'mp4') {
              formats.combined.mp4.push(processed);
            } else if (processed.container === 'webm') {
              formats.combined.webm.push(processed);
            }
          }
        }
      }

      // Adaptivní formáty
      if (streamingData.adaptiveFormats) {
        for (const f of streamingData.adaptiveFormats) {
          const processed = this.processDirectFormat(f, false);
          if (processed) {
            if (processed.type === 'video') {
              if (processed.container === 'mp4') {
                formats.video.mp4.push(processed);
              } else {
                formats.video.webm.push(processed);
              }
            } else if (processed.type === 'audio') {
              if (processed.container === 'webm') {
                formats.audio.webm.push(processed);
              } else {
                formats.audio.m4a.push(processed);
              }
            }
          }
        }
      }

      result.success = true;
      result.formats = formats;
      result.videoInfo = {
        title: playerData.videoDetails?.title,
        author: playerData.videoDetails?.author,
        lengthSeconds: playerData.videoDetails?.lengthSeconds
      };

      return result;

    } catch (error) {
      this.logError('DIRECT', 'Exception', error);
      result.error = error.message;
      return result;
    }
  },

  processDirectFormat(format, isCombined) {
    // Získání URL
    let url = format.url;

    // SignatureCipher
    if (!url && format.signatureCipher) {
      const params = new URLSearchParams(format.signatureCipher);
      url = params.get('url');
      // Bez správné signature to pravděpodobně nebude fungovat,
      // ale zkusíme to jako poslední možnost
    }

    if (!url) {
      return null;
    }

    const mimeType = format.mimeType || '';
    const isVideo = mimeType.includes('video/');
    const isAudio = mimeType.includes('audio/');

    let container = 'unknown';
    if (mimeType.includes('mp4')) container = 'mp4';
    else if (mimeType.includes('webm')) container = 'webm';

    const codecMatch = mimeType.match(/codecs="([^"]+)"/);
    const codec = codecMatch ? codecMatch[1] : 'unknown';

    return {
      itag: format.itag,
      url: url,
      quality: format.qualityLabel || format.audioQuality || `${format.height}p`,
      container: container,
      codec: codec,
      type: isCombined ? 'combined' : (isVideo ? 'video' : 'audio'),
      source: 'direct',
      fileSize: format.contentLength ? parseInt(format.contentLength) : null,
      width: format.width,
      height: format.height,
      bitrate: format.bitrate
    };
  },

  extractCompleteJson(str, startIndex) {
    let depth = 0;
    let inString = false;
    let escape = false;

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
            return str.substring(startIndex, i + 1);
          }
        }
      }
    }

    return null;
  },

  // ============================================================================
  // POMOCNÉ METODY
  // ============================================================================

  countFormats(formats) {
    if (!formats) return 0;
    let count = 0;
    count += formats.combined?.mp4?.length || 0;
    count += formats.combined?.webm?.length || 0;
    count += formats.video?.mp4?.length || 0;
    count += formats.video?.webm?.length || 0;
    count += formats.audio?.m4a?.length || 0;
    count += formats.audio?.webm?.length || 0;
    return count;
  }
};

// Export pro použití v background.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DownloadService;
}
