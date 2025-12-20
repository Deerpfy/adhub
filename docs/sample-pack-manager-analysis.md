# Analýza: Sample Pack Manager (Torrent-based Splice Alternative)

**Typ projektu**: Desktop aplikace pro agregaci a stahování sample packů
**Datum analýzy**: 2024-12-20
**Cíl**: Nahradit placenou službu Splice ($9.99-$29.99/měsíc) open-source řešením

---

## Shrnutí

Projekt navrhuje desktop aplikaci, která agreguje sample packy z torrent zdrojů (včetně RuTracker), umožňuje procházení obsahu před stažením a selektivní stahování jednotlivých samplů. Technicky je realizovatelný pomocí Tauri/Electron + libtorrent, ale představuje **významná právní rizika** kvůli porušování autorských práv. Doporučuji hybridní přístup kombinující legální zdroje s torrent technologií.

---

## 1. Technická analýza

### 1.1 Referenční služba: Splice

| Funkce | Splice implementace | Relevance pro projekt |
|--------|--------------------|-----------------------|
| **Kreditový systém** | 100-500 kreditů/měsíc, 1 kredit = 1 sample | Nepotřebujeme - stahování zdarma |
| **Knihovna** | 3M+ zvuků, 1000+ packů ročně | Cíl: agregovat podobný rozsah |
| **Preview** | Streaming před stažením | **Kritické** - nutné implementovat |
| **DAW integrace** | Bridge plugin, tempo/key matching | Nice-to-have v2.0 |
| **AI doporučení** | "Rare Finds", similar sounds | Možné pomocí audio fingerprinting |
| **Metadata** | BPM, key, genre, instrument | **Kritické** pro organizaci |

### 1.2 Použité technologie

| Kategorie | Technologie | Zdůvodnění |
|-----------|-------------|------------|
| **Desktop Framework** | Tauri 2.0 | ~2.5MB installer vs 85MB Electron, Rust backend |
| **Frontend** | React + TypeScript | Rychlý vývoj, komponentový přístup |
| **Torrent Engine** | libtorrent (Python binding) | Selective download, piece priority |
| **Audio Processing** | FFmpeg + Web Audio API | Preview, waveform visualization |
| **Database** | SQLite (rusqlite) | Lokální metadata cache |
| **Scraper** | rutracker-api (Node.js) | Neoficiální API pro RuTracker |

### 1.3 Architektura systému

```
┌─────────────────────────────────────────────────────────────────┐
│                        TAURI SHELL                               │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │   React UI      │    │   Rust Backend  │    │   Sidecar    │ │
│  │                 │    │                 │    │              │ │
│  │ - Search        │◄──►│ - IPC Bridge    │◄──►│ - libtorrent │ │
│  │ - Browser       │    │ - SQLite        │    │ - FFmpeg     │ │
│  │ - Player        │    │ - File System   │    │ - yt-dlp     │ │
│  │ - Downloads     │    │ - Config        │    │              │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SOURCES                             │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   RuTracker     │   Open Samples  │   Freesound.org             │
│   (torrent)     │   (GitHub)      │   (API)                     │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

### 1.4 Klíčová technická výzva: Selective File Download

BitTorrent protokol umožňuje stahovat pouze vybrané soubory pomocí **piece priority**:

```python
# Python libtorrent - selective download
import libtorrent as lt

ses = lt.session()
params = {
    'save_path': './downloads',
    'storage_mode': lt.storage_mode_t.storage_mode_sparse,
}

handle = lt.add_magnet_uri(ses, magnet_uri, params)

# Počkat na metadata
while not handle.has_metadata():
    time.sleep(1)

info = handle.get_torrent_info()

# Nastavit prioritu 0 pro všechny soubory (nestahovat)
for i in range(info.num_files()):
    handle.file_priority(i, 0)

# Nastavit prioritu 7 (max) pouze pro vybrané soubory
selected_files = [0, 5, 12]  # indexy souborů
for idx in selected_files:
    handle.file_priority(idx, 7)
```

### 1.5 Preview bez stažení celého souboru

Streaming torrent technologie umožňuje preview před dokončením:

```typescript
// TypeScript - WebTorrent streaming approach
import WebTorrent from 'webtorrent';

const client = new WebTorrent();

client.add(magnetURI, (torrent) => {
  const file = torrent.files.find(f => f.name.endsWith('.wav'));

  // Prioritizovat první kusy pro rychlý preview
  file.select();

  // Vytvořit readable stream
  const stream = file.createReadStream({ start: 0, end: 44100 * 4 }); // první sekunda

  stream.on('data', (chunk) => {
    // Poslat do Web Audio API pro preview
    audioContext.decodeAudioData(chunk.buffer);
  });
});
```

### 1.6 Výkonnostní metriky (odhad)

| Metrika | Cílová hodnota | Poznámka |
|---------|----------------|----------|
| **Startup time** | < 2s | Tauri cold start |
| **Search response** | < 500ms | SQLite cache + async fetch |
| **Preview load** | < 3s | První 5s audio |
| **Memory usage** | < 200MB | Bez aktivního stahování |
| **Bundle size** | < 15MB | Tauri + assets |

---

## 2. Funkční analýza

### 2.1 Klíčové funkce

| Funkce | Popis | Implementace | Priorita |
|--------|-------|--------------|----------|
| **Multi-source Search** | Vyhledávání napříč zdroji | Agregovaný index + real-time scraping | P0 |
| **Content Browser** | Procházení souborů v torrentu | Metadata extraction z .torrent | P0 |
| **Selective Download** | Stažení jednotlivých souborů | libtorrent file_priority() | P0 |
| **Audio Preview** | Přehrání před stažením | Sequential piece download + FFmpeg | P0 |
| **Metadata Tagging** | BPM, key, genre auto-detect | essentia.js / aubio | P1 |
| **Local Library** | Organizace stažených samplů | SQLite + filesystem watcher | P1 |
| **Waveform Display** | Vizualizace audio | wavesurfer.js | P2 |
| **DAW Drag & Drop** | Export přímo do DAW | Tauri file drag API | P2 |

### 2.2 Uživatelské toky

#### Flow 1: Vyhledání a stažení sample packu

```
┌────────────┐     ┌─────────────┐     ┌──────────────┐
│   Search   │────►│   Results   │────►│  Pack Detail │
│  "dubstep  │     │  - Pack 1   │     │  - Files     │
│   bass"    │     │  - Pack 2   │     │  - Preview   │
└────────────┘     └─────────────┘     └──────────────┘
                                              │
                         ┌────────────────────┴────────────────────┐
                         ▼                                         ▼
                ┌─────────────────┐                      ┌─────────────────┐
                │ Download Single │                      │  Download Pack  │
                │    "bass_01.wav"│                      │   (all files)   │
                └─────────────────┘                      └─────────────────┘
                         │                                         │
                         ▼                                         ▼
                ┌─────────────────────────────────────────────────────────┐
                │                    Local Library                         │
                │   /Samples/Dubstep/Bass/bass_01.wav                     │
                └─────────────────────────────────────────────────────────┘
```

#### Flow 2: Preview před stažením

```
User clicks "Preview" → Request first 5MB of file →
FFmpeg decode → Web Audio API playback →
User decides → Download full / Skip
```

### 2.3 Data model

```typescript
// TypeScript interfaces

interface TorrentSource {
  id: string;
  name: 'rutracker' | 'audioz' | 'github' | 'freesound';
  baseUrl: string;
  authRequired: boolean;
  rateLimitMs: number;
}

interface SamplePack {
  id: string;
  sourceId: string;
  magnetUri?: string;
  torrentUrl?: string;
  title: string;
  artist?: string;
  genre: string[];
  totalSize: number;
  fileCount: number;
  seeders: number;
  leechers: number;
  uploadDate: Date;
  metadata: PackMetadata;
}

interface PackMetadata {
  bpmRange?: [number, number];
  keySignatures?: string[];
  instruments?: string[];
  description?: string;
  previewUrl?: string;
}

interface SampleFile {
  packId: string;
  index: number;
  path: string;
  filename: string;
  size: number;
  format: 'wav' | 'mp3' | 'flac' | 'aiff';
  duration?: number;
  bpm?: number;
  key?: string;
  waveformData?: number[];
}

interface DownloadTask {
  id: string;
  packId: string;
  selectedFiles: number[]; // file indices
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'error';
  progress: number;
  downloadSpeed: number;
  eta: number;
}
```

### 2.4 API integrace

#### RuTracker (neoficiální API)

```javascript
// Node.js - rutracker-api usage
const RuTracker = require('rutracker-api');

const rutracker = new RuTracker();

// Login required
await rutracker.login({
  username: process.env.RUTRACKER_USER,
  password: process.env.RUTRACKER_PASS
});

// Search
const results = await rutracker.search({
  query: 'sample pack dubstep',
  forum: 1760 // Audio production forum
});

// Get magnet
const magnet = await rutracker.getMagnet(results[0].id);
```

#### Freesound.org (legální API)

```javascript
// Legální zdroj - Freesound API
const FREESOUND_API_KEY = process.env.FREESOUND_KEY;

async function searchFreesound(query: string) {
  const response = await fetch(
    `https://freesound.org/apiv2/search/text/?query=${query}&token=${FREESOUND_API_KEY}`
  );
  return response.json();
}
```

---

## 3. UX/Design analýza

### 3.1 Vizuální hierarchie

```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌─────────┐  ┌─────────────────────────────────────────────────┐  │
│  │ SIDEBAR │  │                    MAIN CONTENT                  │  │
│  │         │  │  ┌───────────────────────────────────────────┐  │  │
│  │ □ Search│  │  │              SEARCH BAR                    │  │  │
│  │ □ Browse│  │  └───────────────────────────────────────────┘  │  │
│  │ □ Library│  │                                                 │  │
│  │ □ Downloads│ │  ┌─────────────────────────────────────────┐  │  │
│  │         │  │  │           RESULTS GRID                    │  │  │
│  │─────────│  │  │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐      │  │  │
│  │ SOURCES │  │  │  │Pack1│  │Pack2│  │Pack3│  │Pack4│      │  │  │
│  │ ☑ RuTracker│ │  │  └─────┘  └─────┘  └─────┘  └─────┘      │  │  │
│  │ ☑ Freesound│ │  │                                          │  │  │
│  │ ☑ GitHub│  │  └─────────────────────────────────────────┘  │  │
│  │         │  │                                                 │  │
│  └─────────┘  │  ┌─────────────────────────────────────────┐  │  │
│               │  │           AUDIO PLAYER BAR              │  │  │
│               │  │  ▶ ══════════════════════ 0:15/0:45    │  │  │
│               │  └─────────────────────────────────────────┘  │  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Barevné schéma (Dark mode - standard pro DAW tools)

```css
:root {
  /* Background layers */
  --bg-primary: #0D0D0D;      /* Main background */
  --bg-secondary: #1A1A1A;    /* Cards, panels */
  --bg-tertiary: #262626;     /* Hover states */

  /* Accent colors */
  --accent-primary: #7C3AED;  /* Purple - main actions */
  --accent-secondary: #10B981; /* Green - success, download */
  --accent-warning: #F59E0B;   /* Orange - in progress */

  /* Text */
  --text-primary: #FAFAFA;
  --text-secondary: #A3A3A3;
  --text-muted: #525252;

  /* Waveform */
  --waveform-bg: #262626;
  --waveform-wave: #7C3AED;
  --waveform-progress: #A78BFA;
}
```

### 3.3 Komponenty UI

#### Sample Pack Card

```tsx
// React component
interface PackCardProps {
  pack: SamplePack;
  onPreview: () => void;
  onDownload: () => void;
}

const PackCard: React.FC<PackCardProps> = ({ pack, onPreview, onDownload }) => (
  <div className="pack-card">
    <div className="pack-cover">
      <img src={pack.coverUrl || '/default-cover.svg'} alt={pack.title} />
      <button className="preview-btn" onClick={onPreview}>
        <PlayIcon />
      </button>
    </div>
    <div className="pack-info">
      <h3 className="pack-title">{pack.title}</h3>
      <p className="pack-meta">
        <span className="file-count">{pack.fileCount} files</span>
        <span className="size">{formatSize(pack.totalSize)}</span>
      </p>
      <div className="pack-tags">
        {pack.genre.map(g => <span key={g} className="tag">{g}</span>)}
      </div>
    </div>
    <div className="pack-actions">
      <span className="seeders">
        <SeedIcon /> {pack.seeders}
      </span>
      <button className="download-btn" onClick={onDownload}>
        <DownloadIcon />
      </button>
    </div>
  </div>
);
```

#### Waveform Player

```tsx
// Waveform visualization component
import WaveSurfer from 'wavesurfer.js';

const WaveformPlayer: React.FC<{ audioUrl: string }> = ({ audioUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      wavesurfer.current = WaveSurfer.create({
        container: containerRef.current,
        waveColor: '#7C3AED',
        progressColor: '#A78BFA',
        cursorColor: '#FAFAFA',
        barWidth: 2,
        barGap: 1,
        height: 60,
        responsive: true,
      });
      wavesurfer.current.load(audioUrl);
    }
    return () => wavesurfer.current?.destroy();
  }, [audioUrl]);

  return (
    <div className="waveform-container">
      <div ref={containerRef} />
      <div className="controls">
        <button onClick={() => wavesurfer.current?.playPause()}>
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>
    </div>
  );
};
```

### 3.4 Responzivita

| Breakpoint | Layout |
|------------|--------|
| < 768px | Hidden sidebar, bottom nav, single column |
| 768-1024px | Collapsed sidebar, 2 columns |
| > 1024px | Full sidebar, 3-4 columns |

---

## 4. Bezpečnostní analýza

### 4.1 Rizika torrent stahování

| Riziko | Závažnost | Mitigace |
|--------|-----------|----------|
| **Malware v souborech** | Vysoká | Sandbox execution, hash verification |
| **IP exposure** | Střední | Podpora VPN/proxy v nastavení |
| **Fake seeders** | Nízká | Peer reputation system |
| **DMCA notices** | Vysoká | User responsibility disclaimer |

### 4.2 Implementace bezpečnosti

```rust
// Rust - File hash verification
use sha2::{Sha256, Digest};
use std::fs::File;
use std::io::Read;

fn verify_file_hash(path: &str, expected_hash: &str) -> Result<bool, std::io::Error> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];

    loop {
        let bytes_read = file.read(&mut buffer)?;
        if bytes_read == 0 { break; }
        hasher.update(&buffer[..bytes_read]);
    }

    let result = format!("{:x}", hasher.finalize());
    Ok(result == expected_hash)
}
```

```typescript
// TypeScript - Safe file type checking
const ALLOWED_EXTENSIONS = ['.wav', '.mp3', '.flac', '.aiff', '.ogg', '.mid', '.midi'];

function isAllowedFileType(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')  // Remove illegal characters
    .replace(/\.{2,}/g, '.')         // Remove path traversal
    .slice(0, 255);                   // Limit length
}
```

---

## 5. Právní analýza

### 5.1 Právní status

| Aspekt | Status | Detail |
|--------|--------|--------|
| **Torrent technologie** | ✅ Legální | BitTorrent protokol sám o sobě je legální |
| **Sample packy z RuTracker** | ❌ Nelegální | Většina obsahu porušuje autorská práva |
| **Freesound.org** | ✅ Legální | Creative Commons licence |
| **Open Samples (GitHub)** | ✅ Legální | Royalty-free, open source |

### 5.2 Právní rizika

⚠️ **DŮLEŽITÉ VAROVÁNÍ**:

1. **Porušení autorských práv**: Stahování komerčních sample packů bez licence je nelegální ve většině jurisdikcí.

2. **DMCA/Notice and Takedown**: ISP může obdržet žádost o identifikaci uživatele.

3. **Občanskoprávní odpovědnost**: Hudební vydavatelé aktivně stíhají porušování autorských práv.

4. **Komerční použití**: Použití pirátských samplů v komerční hudbě může vést k žalobám.

### 5.3 Disclaimer (povinný)

```text
PRÁVNÍ UPOZORNĚNÍ

Tato aplikace je nástroj pro stahování souborů pomocí BitTorrent protokolu.
Uživatel je plně odpovědný za legálnost stahovaného obsahu.

Stahování materiálů chráněných autorským právem bez povolení je nelegální.
Autoři aplikace nenesou odpovědnost za nelegální použití.

Doporučujeme používat pouze legální zdroje:
- Freesound.org (Creative Commons)
- Open Samples (GitHub)
- Vlastní sample packy
```

---

## 6. Legální alternativy

### 6.1 Doporučené legální zdroje

| Zdroj | Licence | Obsah | URL |
|-------|---------|-------|-----|
| **Freesound.org** | CC0/BY/BY-NC | 500k+ zvuků | freesound.org |
| **Open Samples** | Royalty-free | Kvalitní instrumenty | github.com/pumodi/open-samples |
| **SampleSwap** | Free | 19k+ zvuků | sampleswap.org |
| **NASA Audio** | Public domain | Space sounds | soundcloud.com/nasa |
| **Free-Sample-Packs.com** | Royalty-free | Curated packs | free-sample-packs.com |
| **Cymatics Free** | Royalty-free | Producer packs | cymatics.fm/free |

### 6.2 Hybridní přístup (doporučeno)

```
┌─────────────────────────────────────────────────────────────┐
│                    SAMPLE PACK MANAGER                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │ LEGAL SOURCES   │    │ TORRENT SOURCES │                 │
│  │ (Primary)       │    │ (User risk)     │                 │
│  │                 │    │                 │                 │
│  │ ✓ Freesound API │    │ ⚠ RuTracker     │                 │
│  │ ✓ GitHub repos  │    │ ⚠ User magnets  │                 │
│  │ ✓ Internet Archive│   │                 │                 │
│  └─────────────────┘    └─────────────────┘                 │
│           │                      │                           │
│           └──────────┬───────────┘                           │
│                      ▼                                       │
│          ┌─────────────────────┐                            │
│          │  UNIFIED SEARCH     │                            │
│          │  & LIBRARY          │                            │
│          └─────────────────────┘                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Implementační plán

### 7.1 Fáze vývoje

| Fáze | Funkce | Čas (odhad) |
|------|--------|-------------|
| **MVP (v0.1)** | Local library manager, Freesound integration | - |
| **Alpha (v0.2)** | Basic torrent support, file preview | - |
| **Beta (v0.3)** | Multi-source search, selective download | - |
| **v1.0** | Full UI, waveform, metadata detection | - |
| **v1.x** | DAW integration, AI recommendations | - |

### 7.2 Tech stack finální

```yaml
# Doporučený stack
frontend:
  framework: React 18 + TypeScript
  ui: TailwindCSS + shadcn/ui
  audio: wavesurfer.js, tone.js
  state: Zustand

backend:
  framework: Tauri 2.0 (Rust)
  database: SQLite (rusqlite)

sidecars:
  - libtorrent (Python binding)
  - FFmpeg (audio processing)

apis:
  - Freesound.org (legální)
  - GitHub API (open samples)
  - RuTracker-api (user responsibility)
```

### 7.3 Adresářová struktura

```
sample-pack-manager/
├── src/
│   ├── components/           # React komponenty
│   │   ├── PackCard.tsx
│   │   ├── WaveformPlayer.tsx
│   │   ├── SearchBar.tsx
│   │   └── DownloadQueue.tsx
│   ├── hooks/                # Custom hooks
│   │   ├── useTorrent.ts
│   │   ├── useAudioPlayer.ts
│   │   └── useSearch.ts
│   ├── store/                # Zustand stores
│   │   ├── library.ts
│   │   ├── downloads.ts
│   │   └── settings.ts
│   ├── lib/                  # Utility functions
│   │   ├── api/
│   │   │   ├── freesound.ts
│   │   │   └── rutracker.ts
│   │   ├── audio/
│   │   │   └── metadata.ts
│   │   └── torrent/
│   │       └── client.ts
│   └── pages/                # Page components
├── src-tauri/
│   ├── src/
│   │   ├── main.rs           # Tauri entry
│   │   ├── commands/         # IPC commands
│   │   ├── db/               # SQLite logic
│   │   └── torrent/          # libtorrent bridge
│   └── Cargo.toml
├── sidecars/
│   ├── torrent-engine/       # Python libtorrent
│   └── ffmpeg/               # Audio processing
└── package.json
```

---

## 8. Silné stránky návrhu

1. **Tauri 2.0** - Minimální footprint (~15MB), nativní výkon, Rust bezpečnost
2. **Hybridní zdroje** - Kombinace legálních API + torrent pro flexibilitu
3. **Selective download** - Stažení pouze potřebných souborů šetří bandwidth
4. **Streaming preview** - UX srovnatelný se Splice bez plného stažení
5. **Offline-first** - Lokální SQLite databáze, funguje bez internetu

---

## 9. Slabé stránky a doporučení

| Problém | Závažnost | Doporučení | Priorita |
|---------|-----------|------------|----------|
| **Právní rizika torrentů** | Kritická | Prominent disclaimer, opt-in pro torrent zdroje | P0 |
| **Malware riziko** | Vysoká | Sandboxed preview, hash verification | P0 |
| **RuTracker blokace** | Střední | Proxy/VPN nastavení v app | P1 |
| **Metadata kvalita** | Střední | AI auto-tagging (essentia.js) | P1 |
| **UX komplexita** | Nízká | Onboarding wizard | P2 |
| **DAW integrace** | Nízká | Plugin systém v v2.0 | P3 |

---

## 10. Závěr a doporučení

### Pro uživatele:

1. **Zvažte Splice** - $9.99/měsíc je férová cena za legální, kvalitní obsah s AI features
2. **Používejte legální zdroje** - Freesound, SampleSwap, Open Samples jsou zdarma a legální
3. **Pokud stavíte aplikaci** - Implementujte primárně legální zdroje, torrent jako opt-in

### Pro vývojáře:

1. **Start s legálními zdroji** - Freesound API je skvělý starting point
2. **Tauri > Electron** - Pro audio app je nižší RAM footprint kritický
3. **libtorrent je robustní** - Python binding má všechny potřebné features
4. **UI/UX je klíč** - Splice uspěl díky UX, ne jen díky obsahu

---

## Zdroje

- [Splice Plans & Pricing](https://splice.com/plans)
- [Splice 2024 Features](https://splice.com/blog/letter-from-our-ceo-december-2024/)
- [WebTorrent Documentation](https://webtorrent.io/docs)
- [libtorrent Python Binding](https://www.libtorrent.org/python_binding.html)
- [RuTracker API (neoficiální)](https://github.com/joybiswas007/rutracker-api)
- [Tauri vs Electron 2025](https://applicationize.me/tauri-vs-electron-2025-which-desktop-app-framework-wins-on-speed-security-and-features/)
- [Open Samples GitHub](https://github.com/pumodi/open-samples)
- [SampleSwap](https://sampleswap.org/)
- [Freesound.org](https://freesound.org/)
- [Tracklib - Royalty-Free Guide](https://www.tracklib.com/blog/royaltyfree-music-guide-samples)
