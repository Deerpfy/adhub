# Technicka analyza rozsireni Video DownloadHelper

Video DownloadHelper je jedno z nejkomplexnejsich browserovych rozsireni pro stahovani videi, ktere kombinuje **sofistikovanou sitovou analyzu s nativni desktop aplikaci**. Rozsireni funguje na principu zachytavani HTTP pozadavku pomoci webRequest API a rekonstrukce streamovaneho obsahu prostrednictvim companion aplikace s integrovanym ffmpeg. Klicove zjisteni: Chrome verze pouziva Manifest V3 s omezenymi moznostmi, zatimco Firefox verze zustava na Manifest V2 s plnou funkcionalitou vcetne stahovani z YouTube.

## Architektura rozsireni a rozdily mezi prohlizeci

Video DownloadHelper pouziva **odlisne manifest verze** podle platformy. Chrome a Edge verze (10.x) bezi na **Manifest V3** s deklarativnim pristupem k sitovym pozadavkum, zatimco Firefox verze (9.5.x) zustava na **Manifest V2** s plnym pristupem k webRequestBlocking API. Tento rozdil ma zasadni dopad na funkcnost.

Architektura rozsireni zahrnuje tri hlavni komponenty: background skripty (service worker v Chrome), content skripty injektovane do webovych stranek a popup UI pro interakci s uzivatelem. Chrome verze vyuziva `offscreen` API pro operace vyzadujici DOM pristup z pozadi, coz je workaround pro omezeni service workeru.

**Deklarovane permissions v manifest.json zahrnuji:**

- `webRequest` a `declarativeNetRequest` - zachytavani sitoveho provozu
- `<all_urls>` - pristup ke vsem webovym strankam
- `nativeMessaging` - komunikace s desktop aplikaci coApp
- `downloads` - sprava stahovani
- `tabs` a `webNavigation` - sledovani aktivnich zalozek
- `storage` a `unlimitedStorage` - ukladani nastaveni a cache

Komunikace mezi castmi rozsireni probiha pres `chrome.runtime.sendMessage` pro popup-background interakci a content skripty pouzivaji stejne messaging API. Pro komunikaci s nativni aplikaci se vyuziva Native Messaging Protocol s JSON zpravami pres stdin/stdout.

## Detekce video streamu funguje na vice urovnich

Rozsireni implementuje **vicevrstovou detekcni strategii** kombinujici sitovou analyzu s DOM inspekci. Primarni metodou je monitoring HTTP odpovedi pomoci `webRequest.onHeadersReceived` listeneru, ktery analyzuje Content-Type hlavicky pro identifikaci medialniho obsahu.

Detekovane MIME typy zahrnuji standardni video formaty (`video/mp4`, `video/webm`, `video/x-flv`), streamovaci manifesty (`application/x-mpegURL` pro HLS, `application/dash+xml` pro DASH) a transport stream segmenty (`video/MP2T`). Kdyz Content-Type chybi nebo je nejednoznacny, rozsireni analyzuje URL patterns hledajici pripony `.mp4`, `.m3u8`, `.mpd` nebo `.ts`.

**DOM analyza probiha paralelne** prostrednictvim content skriptu, ktere vyhledavaji `<video>` a `<audio>` elementy, extrahuji atributy `src` a `currentSrc`, a skenuji `<source>` child elementy pro varianty kvality. Rozsireni take detekuje embedded prehravace v iframe, object a embed elementech.

Pro weby pouzivajici dynamicke nacitani obsahu pres JavaScript, VDH monitoruje XMLHttpRequest a Fetch pozadavky. Vyvojari popisuji detekcni logiku jako "komplexni heuristiky" - prohlizec explicitne neoznamuje pritomnost videa, takze rozsireni musi analyzovat tisice signalu pro spolehlivou detekci.

## HLS a DASH protokoly vyzaduji sofistikovane parsovani

**HTTP Live Streaming (HLS)** pouziva hierarchickou strukturu manifestu. Master playlist (.m3u8) obsahuje odkazy na varianty ruzne kvality s informacemi o bitrate a rozliseni. Media playlisty pak definuji sekvenci `.ts` segmentu s relativnimi nebo absolutnimi URL.

Rozsireni parsuje manifesty extrahovani `#EXT-X-STREAM-INF` direktiv pro identifikaci kvalitativnich variant a `#EXTINF` direktiv pro casovani segmentu. Podporuje i sifrovane streamy pomoci `#EXT-X-KEY` direktiv s AES-128 sifrovani, ackoli DRM-chraneny obsah (Widevine, FairPlay) neni mozne obejit.

**DASH (Dynamic Adaptive Streaming over HTTP)** vyuziva XML-based MPD manifesty podle ISO/IEC 23009-1. Rozsireni parsuje `<Period>`, `<AdaptationSet>` a `<Representation>` elementy pro extrakci dostupnych streamu. DASH typicky oddeluje video a audio do separatnich AdaptationSets, coz vyzaduje nasledny muxing.

Pro rekonstrukci kompletniho videa z fragmentu rozsireni:
1. Stahne a naparsuje master manifest
2. Identifikuje vsechny segmenty pro vybranou kvalitu
3. Sekvencne stahne jednotlive fragmenty
4. Preda seznam segmentu companion aplikaci
5. FFmpeg provede concatenaci do vysledneho souboru

## YouTube stahovani narazi na vyznamna omezeni

**Chrome Web Store explicitne zakazuje** rozsireni stahujici z YouTube. Google tuto policy aktivne vynucuje, takze Chrome verze Video DownloadHelper nema YouTube funkcionalitu vubec implementovanou. Firefox verze teoreticky YouTube podporuje, ale prakticka spolehlivost je nizka.

YouTube implementuje nekolik ochrannych mechanismu. **Signature cipher** sifruje video URL parametrem `s`, ktery musi byt desifrovany pomoci JavaScript funkci z player kodu. **N-sig throttling** omezuje rychlost stahovani na ~50-100 KB/s bez spravne transformace parametru `n`. YouTube tyto funkce pravidelne meni, coz vyzaduje neustale aktualizace downloaderu.

Zatimco DownloadHelper detekuje HLS stream verze videi na YouTube, mnoho videi (zejmena soukroma) nabizi pouze adaptive formaty, ktere rozsireni aktualne nepodporuje. Uzivatele reportuji geograficke blokace a rate limiting po stazeni nekolika videi.

**Srovnani s yt-dlp** ukazuje fundamentalni rozdily v pristupu. Yt-dlp je command-line nastroj s vlastnim JavaScript interpreterem pro dekodovani signatur, podporou vice player klientu (web, android, ios, tv) jako fallback, a extremne rychlymi aktualizacemi diky aktivni komunite (nightly builds). Video DownloadHelper ma vyhodu automatickeho pristupu k browser sessions a cookies, ale nedokaze reagovat na YouTube zmeny dostatecne rychle.

## Companion aplikace coApp rozsiruje moznosti rozsireni

**CoApp existuje kvuli omezenim browser sandboxu.** WebExtensions API neumoznuje primy zapis velkych souboru na disk - downloads API pouze prenasi data z URL do downloads adresare. Pro HLS/DASH streamy je nutne stahnout tisice segmentu a slozit je do jednoho souboru, coz vyzaduje primy filesystem pristup.

Architektura coApp je postavena na **Node.js 18** (bundled jako standalone executable, ~40MB). Aplikace komunikuje s rozsirenim pres Native Messaging Protocol - standardizovane API pro extension-to-desktop komunikaci. Zpravy jsou JSON formatovane, UTF-8 kodovane, s 32-bit prefixem delky. Maximalni velikost zpravy je 1MB z aplikace do rozsireni.

**Instalace vytvari manifest soubory** v browser-specifickych lokacich:
- Windows: Registry klice v `HKEY_LOCAL_MACHINE\SOFTWARE\...\NativeMessagingHosts`
- Linux: `~/.config/google-chrome/NativeMessagingHosts/` nebo `/etc/opt/chrome/`
- macOS: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`

CoApp obsahuje bundled ffmpeg a ffprobe binarky (kazda ~47MB). Pro Linux existuji "noffmpeg" buildy vyuzivajici systemovy ffmpeg. Hlavni moduly zahrnuji `converter.js` pro media konverzi, `file.js` pro filesystem operace a `downloads.js` pro spravu stahovani.

## Konverzni pipeline vyuziva ffmpeg pro vsechny operace

**Muxing separatnich DASH streamu** je nejcastejsi operaci - YouTube a mnoho dalsich sluzeb oddeluje video a audio do separatnich streamu pro efektivnejsi adaptive bitrate. FFmpeg prikaz:

```bash
ffmpeg -i video.mp4 -i audio.m4a -c:v copy -c:a copy output.mp4
```

**HLS rekonstrukce** vyuziva ffmpeg's built-in HLS demuxer:

```bash
ffmpeg -i "https://example.com/playlist.m3u8" -c copy -bsf:a aac_adtstoasc output.mp4
```

Konverze do ruznych formatu (MP4, MKV, WebM) a audio extrakce do MP3 jsou dalsi podporovane operace. Bez coApp jsou tyto funkce nedostupne - rozsireni muze pouze stahovat prime linky pomoci browser downloads API.

**Watermark omezeni**: Free verze bez licence pridava QR code watermark na agregovana/konvertovana videa. Pro HLS/DASH streamy je navic limit 1 stazeni za 2 hodiny bez premium licence.

## Live stream recording celi specifickym vyzvam

Nahravani zivych streamu vyzaduje kontinualni monitoring m3u8 playlistu, ktere se prubezne aktualizuji o nove segmenty. Rozsireni detekuje `#EXT-X-ENDLIST` absenci indikujici live stream a prepne do recording modu.

**Mechanismus zahrnuje:**
1. Periodicke stahovani aktualizovaneho playlistu
2. Identifikace novych segmentu (sequence numbering)
3. Download novych segmentu do docasneho uloziste
4. Kontinualni append do vystupniho souboru

Hlavni vyzvy jsou memory management pri dlouhych nahravkach, network interruptions zpusobujici mezery v zaznamu, a variable segment duration ovlivnujici synchronizaci.

## Manifest V3 zasadne meni budoucnost video downloaderu

Chrome 138+ (cerven 2024-2025) plne vynucuje Manifest V3, ktery nahrazuje `webRequestBlocking` deklarativnim `declarativeNetRequest` API. Tento prechod ma **dramaticky dopad na video downloadery**.

| Aspekt | Manifest V2 | Manifest V3 |
|--------|-------------|-------------|
| Request interception | Dynamicke cteni vsech pozadavku | Pouze preddeklarovana pravidla |
| Modifikace | Libovolne upravy headers/body | Omezena header modifikace |
| Limit pravidel | Neomezeno | 30 000 statickych pravidel |
| Background | Persistent background pages | Ephemeral service workers |

Vyvojar Live Stream Downloader vysvetluje: "Firefox umoznuje pouzivat webRequest API, takze add-on muze cist pozadavky a dynamicky je prehravat pri stahovani. Chrome deprecated toto ve prospech declarativeNetRequest - musel bych specifikovat pravidla manualne pro kazdou streamovaci sluzbu, coz je nemozne."

**Firefox zustava preferovanym prohlizecem** pro video stahovani diky zachovani webRequest API i v Manifest V3. Video DownloadHelper adaptoval Chrome verzi na MV3, ale s omezenou funkcionalitou oproti Firefox verzi.

## Srovnani s alternativnimi nastroji

| Kriterium | Video DownloadHelper | SaveFrom.net | yt-dlp |
|-----------|---------------------|--------------|--------|
| Typ | Browser extension + coApp | Extension + web service | Command-line |
| HLS/DASH | Plna podpora | Limitovana | Plna podpora |
| Privacy | Lokalni zpracovani | External servery | Lokalni |
| YouTube | Firefox only, nestabilni | Blokovano | Nejspolehlivejsi |
| Update frekvence | Mesice | Variabilni | Nightly builds |
| Ease of use | Vysoka (GUI) | Vysoka | Nizka (CLI) |
| Batch download | Limitovane | Limitovane | Plna podpora |

**Vyhody browser-based pristupu**: automaticky pristup k authenticated sessions, realny browser kontext obchazejici nektere bot detekce, user-friendly interface bez command-line.

**Nevyhody**: API omezeni prohlizece, store policy restrikce (Chrome zakazuje YouTube), performance impact pri velkych stahovaich, zavislost na aktualizacich rozsireni.

---

## Technicke detaily implementace

### Struktura manifest.json (Chrome MV3)

```json
{
  "manifest_version": 3,
  "name": "Video DownloadHelper",
  "permissions": [
    "webRequest",
    "declarativeNetRequest",
    "nativeMessaging",
    "downloads",
    "tabs",
    "webNavigation",
    "storage",
    "unlimitedStorage",
    "offscreen"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_start"
  }]
}
```

### Native Messaging Host Manifest (net.downloadhelper.coapp.json)

```json
{
  "name": "net.downloadhelper.coapp",
  "description": "Video DownloadHelper companion app",
  "path": "/path/to/vdhcoapp",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://lmjnegcaeklhafolokijcfjliaokphfk/"
  ]
}
```

### Detekce video streamu (JavaScript - Background Script)

```javascript
// Background script - webRequest listener
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    const contentType = details.responseHeaders
      .find(h => h.name.toLowerCase() === 'content-type')?.value;
    
    const videoMimeTypes = [
      'video/mp4', 'video/webm', 'video/x-flv',
      'application/x-mpegURL', 'application/dash+xml',
      'video/MP2T'
    ];
    
    if (videoMimeTypes.some(mime => contentType?.includes(mime))) {
      registerDetectedVideo(details.url, contentType, details.tabId);
    }
    
    // URL pattern fallback
    const videoExtensions = /\.(mp4|m3u8|mpd|ts|webm)(\?|$)/i;
    if (videoExtensions.test(details.url)) {
      registerDetectedVideo(details.url, 'unknown', details.tabId);
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Content script - DOM scanning
function scanForVideoElements() {
  const videos = document.querySelectorAll('video, audio');
  const sources = [];
  
  videos.forEach(el => {
    if (el.src) sources.push(el.src);
    if (el.currentSrc) sources.push(el.currentSrc);
    
    el.querySelectorAll('source').forEach(source => {
      if (source.src) sources.push(source.src);
    });
  });
  
  // Scan iframes
  document.querySelectorAll('iframe').forEach(iframe => {
    try {
      const iframeDoc = iframe.contentDocument;
      if (iframeDoc) {
        iframeDoc.querySelectorAll('video, audio').forEach(el => {
          if (el.src) sources.push(el.src);
        });
      }
    } catch (e) {
      // Cross-origin iframe - cannot access
    }
  });
  
  return [...new Set(sources)];
}

// Monitor dynamic content
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeName === 'VIDEO' || node.nodeName === 'AUDIO') {
        chrome.runtime.sendMessage({
          type: 'VIDEO_DETECTED',
          url: node.src || node.currentSrc
        });
      }
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });
```

### HLS Manifest Parser (JavaScript)

```javascript
class HLSParser {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }
  
  resolveUrl(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return new URL(url, this.baseUrl).href;
  }
  
  parseAttributes(line) {
    const attrs = {};
    const regex = /([A-Z-]+)=(?:"([^"]+)"|([^,]+))/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      attrs[match[1]] = match[2] || match[3];
    }
    return attrs;
  }
  
  parse(content) {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    const result = {
      isMaster: false,
      isLive: true,
      variants: [],
      segments: [],
      encryption: null,
      targetDuration: 0
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Master playlist detection
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        result.isMaster = true;
        const attrs = this.parseAttributes(line);
        const url = this.resolveUrl(lines[++i]);
        result.variants.push({
          bandwidth: parseInt(attrs.BANDWIDTH) || 0,
          resolution: attrs.RESOLUTION || 'unknown',
          codecs: attrs.CODECS || '',
          url: url
        });
      }
      
      // Media playlist - segment info
      if (line.startsWith('#EXTINF:')) {
        const duration = parseFloat(line.split(':')[1].split(',')[0]);
        const url = this.resolveUrl(lines[++i]);
        result.segments.push({ duration, url });
      }
      
      // Target duration
      if (line.startsWith('#EXT-X-TARGETDURATION:')) {
        result.targetDuration = parseInt(line.split(':')[1]);
      }
      
      // Encryption key
      if (line.startsWith('#EXT-X-KEY:')) {
        const attrs = this.parseAttributes(line);
        if (attrs.METHOD && attrs.METHOD !== 'NONE') {
          result.encryption = {
            method: attrs.METHOD,
            uri: attrs.URI ? this.resolveUrl(attrs.URI) : null,
            iv: attrs.IV || null
          };
        }
      }
      
      // VOD detection (not live)
      if (line === '#EXT-X-ENDLIST') {
        result.isLive = false;
      }
      
      // Discontinuity marker
      if (line === '#EXT-X-DISCONTINUITY') {
        if (result.segments.length > 0) {
          result.segments[result.segments.length - 1].discontinuity = true;
        }
      }
    }
    
    return result;
  }
}

// Usage
async function fetchAndParseHLS(url) {
  const response = await fetch(url);
  const content = await response.text();
  const parser = new HLSParser(url);
  return parser.parse(content);
}
```

### DASH MPD Parser (JavaScript)

```javascript
class DASHParser {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }
  
  resolveUrl(url) {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return new URL(url, this.baseUrl).href;
  }
  
  parse(xmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'application/xml');
    const mpd = doc.querySelector('MPD');
    
    const result = {
      type: mpd.getAttribute('type') || 'static', // static = VOD, dynamic = live
      mediaPresentationDuration: this.parseDuration(mpd.getAttribute('mediaPresentationDuration')),
      minBufferTime: this.parseDuration(mpd.getAttribute('minBufferTime')),
      periods: []
    };
    
    // Parse periods
    doc.querySelectorAll('Period').forEach(period => {
      const periodData = {
        id: period.getAttribute('id'),
        start: this.parseDuration(period.getAttribute('start')),
        duration: this.parseDuration(period.getAttribute('duration')),
        adaptationSets: []
      };
      
      // Parse adaptation sets
      period.querySelectorAll('AdaptationSet').forEach(as => {
        const asData = {
          id: as.getAttribute('id'),
          mimeType: as.getAttribute('mimeType'),
          contentType: as.getAttribute('contentType'),
          lang: as.getAttribute('lang'),
          representations: []
        };
        
        // Determine content type
        if (!asData.contentType) {
          if (asData.mimeType?.includes('video')) asData.contentType = 'video';
          else if (asData.mimeType?.includes('audio')) asData.contentType = 'audio';
          else if (asData.mimeType?.includes('text')) asData.contentType = 'text';
        }
        
        // Parse representations
        as.querySelectorAll('Representation').forEach(rep => {
          const repData = {
            id: rep.getAttribute('id'),
            bandwidth: parseInt(rep.getAttribute('bandwidth')) || 0,
            width: parseInt(rep.getAttribute('width')) || 0,
            height: parseInt(rep.getAttribute('height')) || 0,
            codecs: rep.getAttribute('codecs') || as.getAttribute('codecs'),
            mimeType: rep.getAttribute('mimeType') || asData.mimeType,
            segments: []
          };
          
          // Base URL
          const baseUrl = rep.querySelector('BaseURL')?.textContent || 
                         as.querySelector('BaseURL')?.textContent ||
                         period.querySelector('BaseURL')?.textContent;
          
          // Segment template
          const segTemplate = rep.querySelector('SegmentTemplate') || 
                             as.querySelector('SegmentTemplate');
          
          if (segTemplate) {
            repData.segmentTemplate = {
              initialization: this.resolveUrl(segTemplate.getAttribute('initialization')),
              media: segTemplate.getAttribute('media'),
              timescale: parseInt(segTemplate.getAttribute('timescale')) || 1,
              duration: parseInt(segTemplate.getAttribute('duration')) || 0,
              startNumber: parseInt(segTemplate.getAttribute('startNumber')) || 1
            };
            
            // Segment timeline
            const timeline = segTemplate.querySelector('SegmentTimeline');
            if (timeline) {
              repData.segmentTimeline = [];
              timeline.querySelectorAll('S').forEach(s => {
                repData.segmentTimeline.push({
                  t: parseInt(s.getAttribute('t')) || null,
                  d: parseInt(s.getAttribute('d')),
                  r: parseInt(s.getAttribute('r')) || 0
                });
              });
            }
          }
          
          // Segment list
          const segList = rep.querySelector('SegmentList');
          if (segList) {
            const initUrl = segList.querySelector('Initialization')?.getAttribute('sourceURL');
            repData.initialization = this.resolveUrl(initUrl);
            
            segList.querySelectorAll('SegmentURL').forEach(seg => {
              repData.segments.push({
                url: this.resolveUrl(seg.getAttribute('media')),
                mediaRange: seg.getAttribute('mediaRange')
              });
            });
          }
          
          asData.representations.push(repData);
        });
        
        // Sort by bandwidth (quality)
        asData.representations.sort((a, b) => b.bandwidth - a.bandwidth);
        periodData.adaptationSets.push(asData);
      });
      
      result.periods.push(periodData);
    });
    
    return result;
  }
  
  parseDuration(iso8601) {
    if (!iso8601) return 0;
    const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseFloat(match[3]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  generateSegmentUrls(representation) {
    const urls = [];
    const template = representation.segmentTemplate;
    
    if (!template) return representation.segments.map(s => s.url);
    
    if (representation.segmentTimeline) {
      let time = 0;
      let number = template.startNumber;
      
      representation.segmentTimeline.forEach(s => {
        if (s.t !== null) time = s.t;
        
        for (let i = 0; i <= s.r; i++) {
          const url = template.media
            .replace('$Number$', number)
            .replace('$Time$', time)
            .replace('$Bandwidth$', representation.bandwidth);
          urls.push(this.resolveUrl(url));
          time += s.d;
          number++;
        }
      });
    } else if (template.duration) {
      // Calculate number of segments from duration
      const totalDuration = this.mediaPresentationDuration * template.timescale;
      const segmentCount = Math.ceil(totalDuration / template.duration);
      
      for (let i = 0; i < segmentCount; i++) {
        const number = template.startNumber + i;
        const url = template.media
          .replace('$Number$', number)
          .replace('$Bandwidth$', representation.bandwidth);
        urls.push(this.resolveUrl(url));
      }
    }
    
    return urls;
  }
}
```

### Native Messaging Communication (JavaScript)

```javascript
// Extension side - Native Messaging handler
class CoAppConnection {
  constructor() {
    this.port = null;
    this.pendingRequests = new Map();
    this.requestId = 0;
  }
  
  connect() {
    if (this.port) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      try {
        this.port = chrome.runtime.connectNative('net.downloadhelper.coapp');
        
        this.port.onMessage.addListener((response) => {
          this.handleResponse(response);
        });
        
        this.port.onDisconnect.addListener(() => {
          const error = chrome.runtime.lastError;
          console.error('CoApp disconnected:', error?.message);
          this.port = null;
          
          // Reject all pending requests
          this.pendingRequests.forEach((req, id) => {
            req.reject(new Error('CoApp disconnected'));
          });
          this.pendingRequests.clear();
        });
        
        // Send ping to verify connection
        this.sendRequest({ action: 'ping' })
          .then(resolve)
          .catch(reject);
          
      } catch (e) {
        reject(e);
      }
    });
  }
  
  sendRequest(message) {
    return new Promise((resolve, reject) => {
      if (!this.port) {
        reject(new Error('Not connected to CoApp'));
        return;
      }
      
      const id = ++this.requestId;
      message.id = id;
      
      this.pendingRequests.set(id, { resolve, reject });
      this.port.postMessage(message);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }
  
  handleResponse(response) {
    const { id, error, result } = response;
    const pending = this.pendingRequests.get(id);
    
    if (pending) {
      this.pendingRequests.delete(id);
      if (error) {
        pending.reject(new Error(error));
      } else {
        pending.resolve(result);
      }
    }
  }
  
  // Download single file
  async downloadFile(url, filename, options = {}) {
    return this.sendRequest({
      action: 'download',
      url,
      filename,
      directory: options.directory,
      headers: options.headers || {},
      overwrite: options.overwrite || false
    });
  }
  
  // Aggregate HLS segments
  async aggregateHLS(segments, outputPath, options = {}) {
    return this.sendRequest({
      action: 'aggregate',
      type: 'hls',
      segments,
      output: outputPath,
      headers: options.headers || {},
      encryption: options.encryption || null
    });
  }
  
  // Mux video and audio streams
  async muxStreams(videoUrl, audioUrl, outputPath, options = {}) {
    return this.sendRequest({
      action: 'mux',
      video: videoUrl,
      audio: audioUrl,
      output: outputPath,
      format: options.format || 'mp4',
      headers: options.headers || {}
    });
  }
  
  // Convert media file
  async convert(inputPath, outputPath, options = {}) {
    return this.sendRequest({
      action: 'convert',
      input: inputPath,
      output: outputPath,
      format: options.format,
      videoCodec: options.videoCodec,
      audioCodec: options.audioCodec,
      videoBitrate: options.videoBitrate,
      audioBitrate: options.audioBitrate
    });
  }
  
  // Extract audio
  async extractAudio(inputPath, outputPath, options = {}) {
    return this.sendRequest({
      action: 'extract-audio',
      input: inputPath,
      output: outputPath,
      format: options.format || 'mp3',
      bitrate: options.bitrate || '192k'
    });
  }
  
  // Get media info
  async getMediaInfo(url) {
    return this.sendRequest({
      action: 'probe',
      url
    });
  }
}

// Usage
const coApp = new CoAppConnection();

async function downloadHLSVideo(m3u8Url, outputFilename) {
  await coApp.connect();
  
  // Parse manifest
  const manifest = await fetchAndParseHLS(m3u8Url);
  
  if (manifest.isMaster) {
    // Select best quality
    const bestVariant = manifest.variants.reduce((best, v) => 
      v.bandwidth > best.bandwidth ? v : best
    );
    
    // Fetch media playlist
    const mediaManifest = await fetchAndParseHLS(bestVariant.url);
    
    return coApp.aggregateHLS(
      mediaManifest.segments.map(s => s.url),
      outputFilename,
      { encryption: mediaManifest.encryption }
    );
  } else {
    return coApp.aggregateHLS(
      manifest.segments.map(s => s.url),
      outputFilename,
      { encryption: manifest.encryption }
    );
  }
}
```

### CoApp Server Side (Node.js)

```javascript
// coApp main entry - net.downloadhelper.coapp
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// Native messaging protocol
class NativeMessaging {
  constructor() {
    this.buffer = Buffer.alloc(0);
  }
  
  // Read message from stdin
  readMessage(callback) {
    process.stdin.on('readable', () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        this.processBuffer(callback);
      }
    });
  }
  
  processBuffer(callback) {
    while (this.buffer.length >= 4) {
      const messageLength = this.buffer.readUInt32LE(0);
      
      if (this.buffer.length >= 4 + messageLength) {
        const messageBytes = this.buffer.slice(4, 4 + messageLength);
        this.buffer = this.buffer.slice(4 + messageLength);
        
        try {
          const message = JSON.parse(messageBytes.toString('utf8'));
          callback(message);
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      } else {
        break;
      }
    }
  }
  
  // Write message to stdout
  writeMessage(message) {
    const messageBytes = Buffer.from(JSON.stringify(message), 'utf8');
    const header = Buffer.alloc(4);
    header.writeUInt32LE(messageBytes.length, 0);
    
    process.stdout.write(header);
    process.stdout.write(messageBytes);
  }
}

// FFmpeg wrapper
class FFmpegWrapper {
  constructor() {
    this.ffmpegPath = path.join(__dirname, 'bin', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    this.ffprobePath = path.join(__dirname, 'bin', process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
  }
  
  // Run ffmpeg command
  run(args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.ffmpegPath, args);
      let stderr = '';
      
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          reject(new Error(`FFmpeg error (code ${code}): ${stderr}`));
        }
      });
      
      proc.on('error', reject);
    });
  }
  
  // Probe media file
  async probe(input) {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        input
      ];
      
      const proc = spawn(this.ffprobePath, args);
      let stdout = '';
      
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(stdout));
          } catch (e) {
            reject(new Error('Failed to parse ffprobe output'));
          }
        } else {
          reject(new Error(`FFprobe error (code ${code})`));
        }
      });
    });
  }
  
  // Mux video and audio
  async mux(videoInput, audioInput, output) {
    const args = [
      '-i', videoInput,
      '-i', audioInput,
      '-c:v', 'copy',
      '-c:a', 'copy',
      '-y',
      output
    ];
    return this.run(args);
  }
  
  // Download and convert HLS
  async downloadHLS(m3u8Url, output, headers = {}) {
    const args = ['-y'];
    
    // Add headers if provided
    if (headers['User-Agent']) {
      args.push('-user_agent', headers['User-Agent']);
    }
    if (headers['Referer']) {
      args.push('-referer', headers['Referer']);
    }
    
    args.push(
      '-i', m3u8Url,
      '-c', 'copy',
      '-bsf:a', 'aac_adtstoasc',
      output
    );
    
    return this.run(args);
  }
  
  // Concatenate segments
  async concatenate(segmentListFile, output) {
    const args = [
      '-f', 'concat',
      '-safe', '0',
      '-i', segmentListFile,
      '-c', 'copy',
      '-y',
      output
    ];
    return this.run(args);
  }
  
  // Convert format
  async convert(input, output, options = {}) {
    const args = ['-i', input];
    
    if (options.videoCodec) {
      args.push('-c:v', options.videoCodec);
    }
    if (options.audioCodec) {
      args.push('-c:a', options.audioCodec);
    }
    if (options.videoBitrate) {
      args.push('-b:v', options.videoBitrate);
    }
    if (options.audioBitrate) {
      args.push('-b:a', options.audioBitrate);
    }
    
    args.push('-y', output);
    return this.run(args);
  }
  
  // Extract audio to MP3
  async extractAudio(input, output, bitrate = '192k') {
    const args = [
      '-i', input,
      '-vn',
      '-acodec', 'libmp3lame',
      '-ab', bitrate,
      '-y',
      output
    ];
    return this.run(args);
  }
}

// Download manager
class Downloader {
  download(url, outputPath, headers = {}) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(outputPath);
      const protocol = url.startsWith('https') ? https : http;
      
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...headers
        }
      };
      
      protocol.get(url, options, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Follow redirect
          this.download(response.headers.location, outputPath, headers)
            .then(resolve)
            .catch(reject);
          return;
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve({ path: outputPath, size: fs.statSync(outputPath).size });
        });
      }).on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
    });
  }
  
  async downloadSegments(segments, tempDir, headers = {}) {
    const paths = [];
    
    for (let i = 0; i < segments.length; i++) {
      const segmentPath = path.join(tempDir, `segment_${i.toString().padStart(5, '0')}.ts`);
      await this.download(segments[i], segmentPath, headers);
      paths.push(segmentPath);
    }
    
    return paths;
  }
}

// Main handler
async function main() {
  const messaging = new NativeMessaging();
  const ffmpeg = new FFmpegWrapper();
  const downloader = new Downloader();
  
  messaging.readMessage(async (message) => {
    const { id, action } = message;
    
    try {
      let result;
      
      switch (action) {
        case 'ping':
          result = { status: 'ok', version: '2.0.0' };
          break;
          
        case 'download':
          result = await downloader.download(
            message.url,
            path.join(message.directory || process.env.HOME, message.filename),
            message.headers
          );
          break;
          
        case 'aggregate':
          if (message.type === 'hls') {
            const tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'vdh-'));
            const segmentPaths = await downloader.downloadSegments(
              message.segments,
              tempDir,
              message.headers
            );
            
            // Create concat file
            const concatFile = path.join(tempDir, 'concat.txt');
            const concatContent = segmentPaths.map(p => `file '${p}'`).join('\n');
            fs.writeFileSync(concatFile, concatContent);
            
            await ffmpeg.concatenate(concatFile, message.output);
            
            // Cleanup
            fs.rmSync(tempDir, { recursive: true });
            result = { path: message.output };
          }
          break;
          
        case 'mux':
          await ffmpeg.mux(message.video, message.audio, message.output);
          result = { path: message.output };
          break;
          
        case 'convert':
          await ffmpeg.convert(message.input, message.output, message);
          result = { path: message.output };
          break;
          
        case 'extract-audio':
          await ffmpeg.extractAudio(message.input, message.output, message.bitrate);
          result = { path: message.output };
          break;
          
        case 'probe':
          result = await ffmpeg.probe(message.url);
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      messaging.writeMessage({ id, result });
      
    } catch (error) {
      messaging.writeMessage({ id, error: error.message });
    }
  });
}

main();
```

### Live Stream Recorder (JavaScript)

```javascript
class LiveStreamRecorder {
  constructor(m3u8Url, outputPath, options = {}) {
    this.m3u8Url = m3u8Url;
    this.outputPath = outputPath;
    this.options = options;
    this.isRecording = false;
    this.downloadedSequences = new Set();
    this.segments = [];
    this.pollInterval = options.pollInterval || 2000;
  }
  
  async start() {
    this.isRecording = true;
    console.log('Starting live stream recording...');
    
    while (this.isRecording) {
      try {
        await this.pollPlaylist();
        await this.sleep(this.pollInterval);
      } catch (error) {
        console.error('Error polling playlist:', error);
        if (this.options.stopOnError) {
          this.stop();
        }
      }
    }
    
    // Finalize recording
    await this.finalize();
  }
  
  stop() {
    console.log('Stopping recording...');
    this.isRecording = false;
  }
  
  async pollPlaylist() {
    const response = await fetch(this.m3u8Url);
    const content = await response.text();
    
    const parser = new HLSParser(this.m3u8Url);
    const manifest = parser.parse(content);
    
    // Check for end of stream
    if (!manifest.isLive) {
      console.log('Stream ended (ENDLIST detected)');
      this.stop();
      return;
    }
    
    // Extract media sequence number
    const sequenceMatch = content.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/);
    const baseSequence = sequenceMatch ? parseInt(sequenceMatch[1]) : 0;
    
    // Download new segments
    for (let i = 0; i < manifest.segments.length; i++) {
      const sequence = baseSequence + i;
      
      if (!this.downloadedSequences.has(sequence)) {
        const segment = manifest.segments[i];
        
        try {
          const segmentData = await this.downloadSegment(segment.url);
          this.segments.push({
            sequence,
            data: segmentData,
            duration: segment.duration
          });
          this.downloadedSequences.add(sequence);
          console.log(`Downloaded segment ${sequence}`);
        } catch (error) {
          console.error(`Failed to download segment ${sequence}:`, error);
        }
      }
    }
  }
  
  async downloadSegment(url) {
    const response = await fetch(url);
    return await response.arrayBuffer();
  }
  
  async finalize() {
    console.log(`Finalizing ${this.segments.length} segments...`);
    
    // Sort segments by sequence number
    this.segments.sort((a, b) => a.sequence - b.sequence);
    
    // Concatenate all segments
    const totalSize = this.segments.reduce((sum, s) => sum + s.data.byteLength, 0);
    const combined = new Uint8Array(totalSize);
    
    let offset = 0;
    for (const segment of this.segments) {
      combined.set(new Uint8Array(segment.data), offset);
      offset += segment.data.byteLength;
    }
    
    // Write to file (via coApp)
    // This would be sent to coApp for processing with ffmpeg
    console.log(`Recording complete: ${totalSize} bytes`);
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const recorder = new LiveStreamRecorder(
  'https://example.com/live/stream.m3u8',
  'recording.mp4',
  { pollInterval: 3000 }
);

// Start recording
recorder.start();

// Stop after 1 hour
setTimeout(() => recorder.stop(), 3600000);
```

---

## Zaver a prakticka doporuceni

Video DownloadHelper predstavuje **nejkomplexnejsi browser-based reseni** pro stahovani videi s podporou HLS, DASH a progresivniho downloadu. Jeho architektura elegantne obchazi omezeni browser sandboxu prostrednictvim Native Messaging komunikace s coApp a integrovanym ffmpeg.

Klicova omezeni zahrnuji Chrome Web Store policy zakazujici YouTube stahovani, narustajici restrikce Manifest V3 limitujici detekcni schopnosti, a inherentni zavislost na aktualizacich pro reakci na zmeny cilovych webu.

Pro maximalni funkcionalitu doporucuji **Firefox s nainstalovanym coApp**. Pro YouTube stahovani je **yt-dlp spolehlivejsi volbou** diky aktivni komunite a rychlym aktualizacim. Budoucnost browser-based video downloaderu je nejista vzhledem k pokracujicimu zprisnovani Manifest V3 restrictions.

### Shrnuti klicovych technickych bodu:

1. **Detekce**: webRequest API + DOM scanning + URL pattern matching
2. **Protokoly**: HLS (m3u8 + TS segmenty), DASH (MPD + fragmenty), Progressive
3. **Zpracovani**: coApp s Node.js + ffmpeg pro muxing/konverzi
4. **Komunikace**: Native Messaging Protocol (JSON pres stdin/stdout)
5. **Omezeni**: MV3 declarativeNetRequest, Chrome store policy, DRM
