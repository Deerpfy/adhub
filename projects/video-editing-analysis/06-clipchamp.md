# Analýza: Clipchamp (Microsoft)

**URL**: https://clipchamp.com/
**Datum analýzy**: 20. prosince 2025
**Typ**: Browser-based + Windows app

---

## Shrnutí

Clipchamp je video editor od Microsoftu, integrovaný do Windows 11 jako výchozí video aplikace. Je ideální pro začátečníky a business uživatele v Microsoft 365 ekosystému. Hlavní výhodou je jednoduchý interface, bezplatný 1080p export bez vodoznaku a integrace s OneDrive a Microsoft 365.

---

## 1. Technická analýza

### Použité technologie

| Kategorie | Technologie | Poznámka |
|-----------|-------------|----------|
| **Frontend** | React/TypeScript | PWA architektura |
| **Rendering** | WebCodecs API | Browser-native |
| **Storage** | OneDrive integration | Microsoft Cloud |
| **AI** | Azure AI Services | Auto captions, TTS |
| **Platform** | Web + Windows App | UWP + PWA hybrid |
| **Authentication** | Microsoft Identity | SSO s M365 |

### Integrace s Microsoft 365

```
MICROSOFT ECOSYSTEM INTEGRATION
┌─────────────────────────────────────────────────────────────────┐
│                        CLIPCHAMP                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ OneDrive │  │  Teams  │  │ Outlook │  │ Stream  │            │
│  │ (storage)│  │ (share) │  │ (embed) │  │ (host)  │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                         │
│  │PowerPoint│  │  Word   │  │ Excel   │                         │
│  │ (export) │  │ (embed) │  │ (data)  │                         │
│  └─────────┘  └─────────┘  └─────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Systémové požadavky

| Aspekt | Minimum | Doporučeno |
|--------|---------|------------|
| **Prohlížeč** | Edge/Chrome 91+ | Edge latest |
| **OS** | Windows 10 1909+ | Windows 11 |
| **RAM** | 4 GB | 8+ GB |
| **Připojení** | Stabilní internet | 10+ Mbps |
| **Storage** | OneDrive | 5 GB free |

### Omezení

```
TECHNICKÁ OMEZENÍ
├── Video délka: Bez explicitního limitu, ale...
│   └── Prakticky max ~30 min (browser memory)
├── File size: Závisí na OneDrive storage
├── Rozlišení: Až 4K (Essentials only)
├── Frame rate: Až 60 fps
├── Formáty: MP4, MOV, WEBM (export MP4)
├── Offline: Částečně (Windows app)
└── Multicam: ❌ Nepodporováno
```

---

## 2. Funkční analýza

### Klíčové funkce

| Funkce | Popis | Free | Essentials | Hodnocení |
|--------|-------|------|------------|-----------|
| **Timeline Editing** | Multi-track | ✅ | ✅ | ⭐⭐⭐⭐ |
| **Auto Captions** | AI titulky | ✅ | ✅ | ⭐⭐⭐⭐ |
| **Text-to-Speech** | AI hlasy | ✅ Limited | ✅ | ⭐⭐⭐⭐ |
| **Screen Recording** | Built-in | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Webcam Recording** | Built-in | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Stock Library** | Assets | ✅ Limited | ✅ Unlimited | ⭐⭐⭐⭐ |
| **Brand Kit** | Barvy, loga | ❌ | ✅ | ⭐⭐⭐⭐ |
| **Export 1080p** | HD | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Export 4K** | UHD | ❌ | ✅ | ⭐⭐⭐⭐ |
| **Watermark** | Bez vodoznaku | ✅ | ✅ | ⭐⭐⭐⭐⭐ |

### Auto Compose (AI)

```
AUTO COMPOSE FEATURE
┌─────────────────────────────────────────────────────────────────┐
│ 1. UPLOAD CLIPS                                                 │
│    └── Nahrajte více video/foto souborů                         │
│                                                                 │
│ 2. SELECT STYLE                                                 │
│    ├── Corporate                                                │
│    ├── Social Media                                             │
│    ├── Celebration                                              │
│    └── Custom                                                   │
│                                                                 │
│ 3. AI PROCESSING                                                │
│    ├── Scene detection                                          │
│    ├── Best moments selection                                   │
│    ├── Music matching                                           │
│    └── Transition placement                                     │
│                                                                 │
│ 4. OUTPUT                                                       │
│    └── Ready-to-export video (editovatelný)                     │
└─────────────────────────────────────────────────────────────────┘
```

### Screen & Webcam Recording

```
RECORDING MODES
┌─────────────────────────────────────────────────────────────────┐
│  Screen Only                                                    │
│  ├── Full screen                                                │
│  ├── Window                                                     │
│  └── Browser tab                                                │
├─────────────────────────────────────────────────────────────────┤
│  Webcam Only                                                    │
│  ├── Circle/Square/Rectangle                                   │
│  ├── Background blur                                            │
│  └── Virtual backgrounds                                        │
├─────────────────────────────────────────────────────────────────┤
│  Screen + Webcam (PIP)                                          │
│  ├── Position: corner selection                                 │
│  ├── Size: adjustable                                           │
│  └── Shape: circle/rectangle                                    │
├─────────────────────────────────────────────────────────────────┤
│  Audio Options                                                  │
│  ├── System audio                                               │
│  ├── Microphone                                                 │
│  └── Both                                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. UX/Design analýza

### Rozhraní

```
CLIPCHAMP INTERFACE
┌─────────────────────────────────────────────────────────────────┐
│  [← Home] [My Videos ▼]                    [Record ▼] [Export]  │
├─────────────┬───────────────────────────────┬───────────────────┤
│  Your media │         Preview               │                   │
│  ──────────│                               │   Right panel     │
│  📁 Import  │   ┌─────────────────────┐     │   (context)       │
│             │   │                     │     │                   │
│  Stock      │   │   [video preview]   │     │   - Text options  │
│  ──────────│   │                     │     │   - Audio options │
│  📷 Photos  │   └─────────────────────┘     │   - Filters       │
│  🎵 Music   │                               │   - Speed         │
│  🎬 Videos  │   [⏮] [◀] [⏸] [▶] [⏭]        │   - Colors        │
│  📊 Graphics│   00:15 / 02:30               │                   │
├─────────────┴───────────────────────────────┴───────────────────┤
│  Templates │ Text │ Graphics │ Transitions │ Filters │ Audio   │
├─────────────────────────────────────────────────────────────────┤
│  Timeline                                                       │
│  V1: [clip    ][clip    ][clip    ][clip    ]                   │
│  V2: [text         ][graphic    ]                               │
│  A1: [audio track                                    ]          │
│  🎵: [background music                               ]          │
└─────────────────────────────────────────────────────────────────┘
```

### Hodnocení UX

| Aspekt | Hodnocení | Poznámka |
|--------|-----------|----------|
| **Jednoduchost** | ⭐⭐⭐⭐⭐ | Nejjednodušší z porovnávaných |
| **Křivka učení** | ⭐⭐⭐⭐⭐ | Zero learning curve |
| **Windows integrace** | ⭐⭐⭐⭐⭐ | Native feel |
| **M365 integrace** | ⭐⭐⭐⭐⭐ | OneDrive, Teams seamless |
| **Mobile support** | ⭐⭐ | Pouze web (omezené) |
| **Power user features** | ⭐⭐ | Chybí pokročilé nástroje |

### Templates

```
TEMPLATE CATEGORIES
├── Social Media
│   ├── YouTube Intro/Outro
│   ├── TikTok
│   ├── Instagram (Reels, Stories, Feed)
│   └── Facebook
├── Business
│   ├── Presentations
│   ├── Product demos
│   ├── Training videos
│   └── Company updates
├── Education
│   ├── Tutorials
│   ├── Lectures
│   └── Student projects
├── Personal
│   ├── Birthday
│   ├── Wedding
│   ├── Travel
│   └── Family
└── Seasonal
    ├── Holiday
    ├── New Year
    └── Special events
```

---

## 4. Cenová analýza

### Pricing (2025)

| Plán | Cena | Klíčové funkce |
|------|------|----------------|
| **Free** | $0 | 1080p, bez vodoznaku, omezený stock |
| **Essentials** | $11.99/měs | 4K, premium stock, brand kit |
| **M365 Personal** | Included | Jako Essentials |
| **M365 Family** | Included | Jako Essentials |
| **M365 Business** | Included | + admin controls |

### Hodnota pro M365 uživatele

```
HODNOTA PRO STÁVAJÍCÍ M365 PŘEDPLATITELE

Microsoft 365 Personal: $6.99/měs
├── Clipchamp Essentials: INCLUDED ✅
├── 1 TB OneDrive: INCLUDED
├── Office apps: INCLUDED
└── → Clipchamp je "zdarma"

Microsoft 365 Family: $9.99/měs (až 6 uživatelů)
├── Clipchamp Essentials: INCLUDED ✅
├── 1 TB OneDrive per user: INCLUDED
└── → Nejlepší hodnota pro rodiny

STANDALONE Clipchamp Essentials: $11.99/měs
└── → Dražší než celý M365 Personal!
```

---

## 5. Právní a bezpečnostní analýza

### Compliance

| Aspekt | Status |
|--------|--------|
| **GDPR** | ✅ Microsoft compliant |
| **SOC 2** | ✅ Azure certifikace |
| **HIPAA** | ✅ S BAA (Business) |
| **FERPA** | ✅ Edu compliant |
| **Data residency** | Volitelné (EU, US, etc.) |

### Privacy

```
DATA HANDLING (Microsoft Standards)
├── Processing: Azure cloud
├── Storage: OneDrive (user-controlled)
├── Encryption: AES-256, TLS 1.3
├── Data sharing: Microsoft ecosystem only
├── AI training: Opt-out available
└── Retention: User-controlled

ENTERPRISE CONTROLS
├── Admin center management
├── DLP policies
├── Audit logs
├── Conditional access
└── Azure AD integration
```

---

## Silné stránky

1. **M365 integrace** - Nejlepší pro Microsoft ekosystém
2. **Free 1080p export** - Bez vodoznaku, bez omezení
3. **Windows native** - Integrován do OS
4. **Screen recording** - Profesionální kvalita built-in
5. **Business ready** - Enterprise compliance
6. **Jednoduchost** - Nejnižší vstupní bariéra

## Slabé stránky a doporučení

| Problém | Závažnost | Doporučení | Priorita |
|---------|-----------|------------|----------|
| Chybí pokročilé funkce | Střední | Pro komplexní projekty jiný NLE | P2 |
| Browser dependency | Střední | Používat Windows app pro stabilitu | P2 |
| Pomalé exporty | Střední | Plánovat export s rezervou času | P2 |
| Omezená audio editace | Střední | Externí audio editing (Audacity) | P3 |
| Žádný multicam | Vysoká | Pro multicam DaVinci/Premiere | P1 |
| Občasné bugy | Střední | Časté ukládání, auto-recovery | P2 |

---

## Technické detaily

### Export nastavení

```javascript
// Clipchamp export konfigurace
const exportSettings = {
  format: "mp4",
  codec: "h264",
  resolutions: {
    free: ["480p", "720p", "1080p"],
    essentials: ["480p", "720p", "1080p", "4K"]
  },
  frameRates: [24, 25, 30, 50, 60],
  quality: {
    standard: "10 Mbps",
    high: "20 Mbps",
    maximum: "40 Mbps" // 4K
  },
  audio: {
    codec: "aac",
    sampleRate: 48000,
    bitrate: "192 kbps"
  }
};
```

### OneDrive API integrace

```javascript
// Clipchamp OneDrive integration example
async function importFromOneDrive() {
  const graphClient = await getGraphClient();

  // Browse OneDrive
  const files = await graphClient
    .api('/me/drive/root/children')
    .filter("file/mimeType eq 'video/mp4'")
    .get();

  // Import to Clipchamp
  const selectedFile = files.value[0];
  const downloadUrl = await graphClient
    .api(`/me/drive/items/${selectedFile.id}`)
    .select('*,@microsoft.graph.downloadUrl')
    .get();

  return downloadUrl['@microsoft.graph.downloadUrl'];
}

// Save to OneDrive
async function exportToOneDrive(videoBlob, filename) {
  const graphClient = await getGraphClient();

  await graphClient
    .api(`/me/drive/root:/${filename}:/content`)
    .put(videoBlob);
}
```

### Keyboard shortcuts

```
CLIPCHAMP SHORTCUTS
─────────────────────
PLAYBACK
Space       - Play/Pause
← →         - Frame by frame
Home/End    - Jump to start/end

EDITING
Ctrl+C      - Copy
Ctrl+V      - Paste
Ctrl+Z      - Undo
Ctrl+Y      - Redo
Delete      - Delete selected
S           - Split at playhead

TIMELINE
Ctrl+Plus   - Zoom in
Ctrl+Minus  - Zoom out
Ctrl+0      - Fit to screen

EXPORT
Ctrl+E      - Export video
```

### CSS - Clipchamp-like styling

```css
/* Clipchamp-inspired UI styling */
:root {
  --clipchamp-bg: #1a1a2e;
  --clipchamp-panel: #232342;
  --clipchamp-accent: #9b5de5;
  --clipchamp-text: #ffffff;
  --clipchamp-secondary: #a0a0a0;
}

.clipchamp-panel {
  background: var(--clipchamp-panel);
  border-radius: 8px;
  padding: 16px;
}

.clipchamp-button {
  background: var(--clipchamp-accent);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.clipchamp-button:hover {
  background: #7b3dc5;
}

.clipchamp-timeline {
  background: var(--clipchamp-bg);
  border-top: 1px solid #333;
  padding: 8px;
}

.clipchamp-track {
  height: 48px;
  background: rgba(155, 93, 229, 0.1);
  border-radius: 4px;
  margin-bottom: 4px;
}

.clipchamp-clip {
  background: linear-gradient(135deg, var(--clipchamp-accent), #00bbf9);
  border-radius: 4px;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 8px;
  color: white;
  font-size: 12px;
}
```

---

## Zdroje

- [Clipchamp Official](https://clipchamp.com/)
- [Clipchamp Review - TechRadar](https://www.techradar.com/reviews/clipchamp-review)
- [Clipchamp Review 2025 - Aiarty](https://www.aiarty.com/edit-video/clipchamp-review.htm)
- [Clipchamp vs CapCut - VEED](https://www.veed.io/learn/clipchamp-vs-capcut)
- [Microsoft 365 Clipchamp](https://www.microsoft.com/en-us/microsoft-365/clipchamp)
