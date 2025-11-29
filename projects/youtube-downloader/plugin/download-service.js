/**
 * AdHub YouTube Downloader - Download Service v3.0
 *
 * DŮLEŽITÉ: Čistě client-side YouTube stahování NENÍ MOŽNÉ v 2024-2025.
 *
 * Důvody:
 * 1. CORS - YouTube servery neposílají Access-Control-Allow-Origin
 * 2. Signature cipher - Šifrování se mění týdně
 * 3. N-parameter throttling - Bez správného n-param je rychlost ~100KB/s
 * 4. PoToken - Nová ochrana vyžadující BotGuard attestation
 *
 * Tato služba proto poskytuje:
 * 1. Metadata o videu (title, thumbnail, délka) přes oEmbed API
 * 2. Přesměrování na cobalt.tools pro skutečné stažení
 * 3. Možnost spuštění lokálního yt-dlp přes Native Messaging
 */

const DownloadService = {
  // ============================================================================
  // KONFIGURACE
  // ============================================================================

  config: {
    // Cobalt web interface (jediná spolehlivá metoda pro běžné uživatele)
    cobalt: {
      webUrl: 'https://cobalt.tools',
      // API vyžaduje autentizaci od 11/2024, web interface stále funguje
      apiDisabled: true
    },

    // Native messaging pro lokální yt-dlp
    nativeMessaging: {
      hostName: 'com.adhub.ytdownloader',
      enabled: false // Vyžaduje instalaci companion app
    },

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
  // HLAVNÍ METODA - getVideoInfo (pouze metadata, ne stahování!)
  // ============================================================================

  async getVideoInfo(videoId) {
    this.log('INFO', `Získávám info pro video: ${videoId}`);

    const result = {
      success: false,
      videoId: videoId,
      title: null,
      author: null,
      thumbnail: null,
      duration: null,
      error: null,
      // Dostupné metody stažení
      downloadMethods: {
        cobaltWeb: true,        // Vždy dostupné - otevře web
        ytdlpLocal: false,      // Vyžaduje companion app
        directDownload: false   // NIKDY - CORS to blokuje
      },
      // Vysvětlení pro uživatele
      explanation: {
        cs: 'YouTube blokuje přímé stahování z prohlížeče. Použijte tlačítko "Otevřít v Cobalt" pro stažení.',
        en: 'YouTube blocks direct browser downloads. Use "Open in Cobalt" button to download.'
      }
    };

    try {
      // Metoda 1: YouTube oEmbed API (vždy funguje, žádné CORS problémy)
      const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

      const response = await fetch(oEmbedUrl);
      if (!response.ok) {
        throw new Error(`oEmbed failed: ${response.status}`);
      }

      const data = await response.json();

      result.success = true;
      result.title = data.title || 'Neznámý název';
      result.author = data.author_name || 'Neznámý autor';
      result.thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      result.thumbnailMedium = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

      // Zkontroluj dostupnost Native Messaging
      result.downloadMethods.ytdlpLocal = await this.checkNativeMessaging();

      this.log('INFO', 'Video info získáno', result);

    } catch (error) {
      this.logError('INFO', 'Chyba při získávání info', error);
      result.error = error.message;

      // Fallback - alespoň základní info
      result.title = `Video ${videoId}`;
      result.thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }

    return result;
  },

  // ============================================================================
  // DOWNLOAD METHODS INFO - Co je dostupné
  // ============================================================================

  getAvailableMethods() {
    return {
      methods: [
        {
          id: 'cobalt_web',
          name: 'Cobalt.tools (Web)',
          description: 'Otevře cobalt.tools v novém tabu pro stažení',
          available: true,
          recommended: true,
          icon: '🌐'
        },
        {
          id: 'copy_url',
          name: 'Kopírovat URL',
          description: 'Zkopíruje YouTube URL pro použití v jiném nástroji',
          available: true,
          recommended: false,
          icon: '📋'
        },
        {
          id: 'ytdlp_local',
          name: 'yt-dlp (Lokální)',
          description: 'Použije lokálně nainstalovaný yt-dlp',
          available: this.config.nativeMessaging.enabled,
          recommended: false,
          icon: '💻',
          requiresSetup: true
        }
      ],
      unavailable: [
        {
          id: 'direct_download',
          name: 'Přímé stažení',
          reason: 'YouTube CORS politika blokuje přímé stahování z prohlížeče',
          technicalDetails: 'googlevideo.com neposílá Access-Control-Allow-Origin header'
        },
        {
          id: 'cobalt_api',
          name: 'Cobalt API',
          reason: 'Od listopadu 2024 vyžaduje autentizaci (API klíč nebo turnstile)',
          technicalDetails: 'https://github.com/imputnet/cobalt/discussions/860'
        },
        {
          id: 'invidious_download',
          name: 'Invidious stahování',
          reason: 'Video URL z Invidious stále vedou na googlevideo.com (CORS blokováno)',
          technicalDetails: 'Invidious poskytuje pouze metadata, ne CORS-kompatibilní streamy'
        }
      ]
    };
  },

  // ============================================================================
  // COBALT WEB - Otevření v novém tabu
  // ============================================================================

  openInCobalt(videoId) {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const cobaltUrl = `${this.config.cobalt.webUrl}/?url=${encodeURIComponent(youtubeUrl)}`;

    this.log('COBALT_WEB', `Otevírám Cobalt pro video: ${videoId}`);

    // Otevřít v novém tabu
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: cobaltUrl });
    } else {
      window.open(cobaltUrl, '_blank');
    }

    return { success: true, url: cobaltUrl };
  },

  // ============================================================================
  // COPY URL - Zkopírování URL do schránky
  // ============================================================================

  async copyUrl(videoId) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    try {
      await navigator.clipboard.writeText(url);
      this.log('COPY', `URL zkopírována: ${url}`);
      return { success: true, url: url };
    } catch (error) {
      this.logError('COPY', 'Chyba při kopírování', error);
      return { success: false, error: error.message };
    }
  },

  // ============================================================================
  // NATIVE MESSAGING - Pro lokální yt-dlp
  // ============================================================================

  async checkNativeMessaging() {
    // Zkontroluj, jestli je Native Messaging dostupné
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendNativeMessage) {
      return false;
    }

    try {
      // Pokus o ping companion app
      return new Promise((resolve) => {
        chrome.runtime.sendNativeMessage(
          this.config.nativeMessaging.hostName,
          { action: 'ping' },
          (response) => {
            if (chrome.runtime.lastError) {
              this.log('NATIVE', 'Companion app není nainstalována');
              resolve(false);
            } else {
              this.log('NATIVE', 'Companion app nalezena', response);
              this.config.nativeMessaging.enabled = true;
              resolve(true);
            }
          }
        );
      });
    } catch (e) {
      return false;
    }
  },

  async downloadViaYtdlp(videoId, options = {}) {
    if (!this.config.nativeMessaging.enabled) {
      return {
        success: false,
        error: 'yt-dlp companion app není nainstalována',
        setupUrl: 'https://github.com/AdhubYoutubeDownloader/companion-app'
      };
    }

    return new Promise((resolve) => {
      chrome.runtime.sendNativeMessage(
        this.config.nativeMessaging.hostName,
        {
          action: 'download',
          videoId: videoId,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          format: options.format || 'best',
          output: options.output || '%(title)s.%(ext)s'
        },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              error: chrome.runtime.lastError.message
            });
          } else {
            resolve(response);
          }
        }
      );
    });
  },

  // ============================================================================
  // LEGACY COMPATIBILITY - Pro zpětnou kompatibilitu s popup.js
  // ============================================================================

  async getDownloadLinks(videoId) {
    // Tato metoda existuje pro zpětnou kompatibilitu
    // Vrací "formáty" ale s vysvětlením že přímé stahování nefunguje

    this.log('LEGACY', 'getDownloadLinks voláno - vrací pouze info o metodách');

    const videoInfo = await this.getVideoInfo(videoId);
    const methods = this.getAvailableMethods();

    return {
      success: true,
      videoId: videoId,
      method: 'info_only',
      formats: {
        // Prázdné - přímé stahování nefunguje
        combined: { mp4: [], webm: [] },
        video: { mp4: [], webm: [] },
        audio: { m4a: [], webm: [] }
      },
      // Nové pole s dostupnými metodami
      availableMethods: methods.methods,
      unavailableMethods: methods.unavailable,
      videoInfo: videoInfo,
      errors: [
        'Přímé stahování z prohlížeče není možné kvůli YouTube CORS politice',
        'Použijte tlačítko "Otevřít v Cobalt" pro stažení videa'
      ],
      debug: {
        reason: 'CORS_BLOCKED',
        documentation: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS',
        youtubeProtection: [
          'CORS (Access-Control-Allow-Origin)',
          'Signature Cipher',
          'N-parameter throttling',
          'PoToken (BotGuard)'
        ]
      }
    };
  },

  // ============================================================================
  // HELPER - Počet formátů (pro kompatibilitu)
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
